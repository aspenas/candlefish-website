package services

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

// WebSocketHub manages all WebSocket connections efficiently
type WebSocketHub struct {
	// Connection pools by type
	clients    map[string]*ClientConnection
	rooms      map[string]map[string]*ClientConnection
	
	// Message handling
	broadcast  chan *BroadcastMessage
	register   chan *ClientConnection
	unregister chan *ClientConnection
	
	// Performance optimization
	messageBuffer    *RingBuffer
	compressionPool  sync.Pool
	rateLimiter      *RateLimiter
	
	// Metrics
	metrics *WebSocketMetrics
	mu      sync.RWMutex
}

// ClientConnection represents an optimized WebSocket client
type ClientConnection struct {
	ID            string
	conn          *websocket.Conn
	send          chan []byte
	rooms         map[string]bool
	lastPing      time.Time
	rateLimiter   *TokenBucket
	compression   bool
	mu            sync.Mutex
}

// BroadcastMessage represents a message to broadcast
type BroadcastMessage struct {
	Room    string
	Type    string
	Data    interface{}
	Exclude []string
}

// RingBuffer provides efficient message buffering
type RingBuffer struct {
	buffer   [][]byte
	size     int
	head     int
	tail     int
	mu       sync.Mutex
}

// RateLimiter implements token bucket algorithm
type RateLimiter struct {
	tokens   int
	capacity int
	refill   int
	ticker   *time.Ticker
	mu       sync.Mutex
}

// TokenBucket for per-client rate limiting
type TokenBucket struct {
	tokens   int
	capacity int
	lastRefill time.Time
	mu       sync.Mutex
}

// WebSocketMetrics tracks performance metrics
type WebSocketMetrics struct {
	TotalConnections   int64
	ActiveConnections  int64
	MessagesSent       int64
	MessagesReceived   int64
	BytesSent          int64
	BytesReceived      int64
	Errors             int64
	mu                 sync.RWMutex
}

// NewWebSocketHub creates an optimized WebSocket hub
func NewWebSocketHub() *WebSocketHub {
	hub := &WebSocketHub{
		clients:    make(map[string]*ClientConnection),
		rooms:      make(map[string]map[string]*ClientConnection),
		broadcast:  make(chan *BroadcastMessage, 256),
		register:   make(chan *ClientConnection, 16),
		unregister: make(chan *ClientConnection, 16),
		messageBuffer: NewRingBuffer(1024),
		rateLimiter: NewRateLimiter(1000, 1000, 100), // 1000 msg/sec global
		metrics:    &WebSocketMetrics{},
	}
	
	// Initialize compression pool
	hub.compressionPool = sync.Pool{
		New: func() interface{} {
			return make([]byte, 4096)
		},
	}
	
	return hub
}

// Run starts the hub's main event loop
func (h *WebSocketHub) Run() {
	// Start cleanup routine
	go h.cleanupRoutine()
	
	// Start metrics routine
	go h.metricsRoutine()
	
	for {
		select {
		case client := <-h.register:
			h.handleRegister(client)
			
		case client := <-h.unregister:
			h.handleUnregister(client)
			
		case message := <-h.broadcast:
			h.handleBroadcast(message)
		}
	}
}

// handleRegister registers a new client
func (h *WebSocketHub) handleRegister(client *ClientConnection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	h.clients[client.ID] = client
	
	// Update metrics
	h.metrics.mu.Lock()
	h.metrics.TotalConnections++
	h.metrics.ActiveConnections++
	h.metrics.mu.Unlock()
	
	log.Printf("Client registered: %s", client.ID)
}

// handleUnregister removes a client
func (h *WebSocketHub) handleUnregister(client *ClientConnection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	if _, ok := h.clients[client.ID]; ok {
		delete(h.clients, client.ID)
		
		// Remove from all rooms
		for room := range client.rooms {
			if roomClients, ok := h.rooms[room]; ok {
				delete(roomClients, client.ID)
				if len(roomClients) == 0 {
					delete(h.rooms, room)
				}
			}
		}
		
		close(client.send)
		
		// Update metrics
		h.metrics.mu.Lock()
		h.metrics.ActiveConnections--
		h.metrics.mu.Unlock()
		
		log.Printf("Client unregistered: %s", client.ID)
	}
}

// handleBroadcast sends message to relevant clients
func (h *WebSocketHub) handleBroadcast(message *BroadcastMessage) {
	// Apply rate limiting
	if !h.rateLimiter.Allow() {
		log.Println("Global rate limit exceeded, dropping message")
		return
	}
	
	data, err := h.encodeMessage(message)
	if err != nil {
		log.Printf("Failed to encode message: %v", err)
		return
	}
	
	// Buffer message for replay
	h.messageBuffer.Add(data)
	
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	// Determine target clients
	var targets map[string]*ClientConnection
	
	if message.Room != "" {
		targets = h.rooms[message.Room]
	} else {
		targets = h.clients
	}
	
	// Send to targets with exclusions
	excludeMap := make(map[string]bool)
	for _, id := range message.Exclude {
		excludeMap[id] = true
	}
	
	for id, client := range targets {
		if excludeMap[id] {
			continue
		}
		
		// Non-blocking send with timeout
		select {
		case client.send <- data:
			h.metrics.mu.Lock()
			h.metrics.MessagesSent++
			h.metrics.BytesSent += int64(len(data))
			h.metrics.mu.Unlock()
		case <-time.After(100 * time.Millisecond):
			// Client is slow, skip this message
			log.Printf("Client %s is slow, skipping message", id)
		}
	}
}

// ServeWebSocket handles WebSocket connections with optimizations
func (h *WebSocketHub) ServeWebSocket(c *websocket.Conn) {
	clientID := uuid.New().String()
	
	client := &ClientConnection{
		ID:          clientID,
		conn:        c,
		send:        make(chan []byte, 256), // Buffered channel
		rooms:       make(map[string]bool),
		lastPing:    time.Now(),
		rateLimiter: NewTokenBucket(10, 10), // 10 msg/sec per client
		compression: true,
	}
	
	h.register <- client
	
	// Start goroutines for this client
	go client.writePump(h)
	go client.readPump(h)
}

// writePump handles writing to client
func (c *ClientConnection) writePump(h *WebSocketHub) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	
	// Set write deadline and compression
	c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	c.conn.EnableWriteCompression(c.compression)
	
	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			
			// Reset deadline
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			
			// Write message
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
			
			// Coalesce multiple messages if available
			n := len(c.send)
			for i := 0; i < n && i < 10; i++ {
				additionalMsg := <-c.send
				if err := c.conn.WriteMessage(websocket.TextMessage, additionalMsg); err != nil {
					return
				}
			}
			
		case <-ticker.C:
			// Send ping to keep connection alive
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump handles reading from client
func (c *ClientConnection) readPump(h *WebSocketHub) {
	defer func() {
		h.unregister <- c
		c.conn.Close()
	}()
	
	// Configure connection
	c.conn.SetReadLimit(512 * 1024) // 512KB max message size
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	
	// Set pong handler
	c.conn.SetPongHandler(func(string) error {
		c.lastPing = time.Now()
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	
	for {
		messageType, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		
		// Apply rate limiting
		if !c.rateLimiter.Allow() {
			log.Printf("Client %s exceeded rate limit", c.ID)
			continue
		}
		
		// Update metrics
		h.metrics.mu.Lock()
		h.metrics.MessagesReceived++
		h.metrics.BytesReceived += int64(len(message))
		h.metrics.mu.Unlock()
		
		// Process message based on type
		if messageType == websocket.TextMessage {
			h.processMessage(c, message)
		}
	}
}

// processMessage handles incoming messages
func (h *WebSocketHub) processMessage(client *ClientConnection, message []byte) {
	var msg map[string]interface{}
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Invalid message format: %v", err)
		return
	}
	
	msgType, ok := msg["type"].(string)
	if !ok {
		return
	}
	
	switch msgType {
	case "join_room":
		if room, ok := msg["room"].(string); ok {
			h.joinRoom(client, room)
		}
		
	case "leave_room":
		if room, ok := msg["room"].(string); ok {
			h.leaveRoom(client, room)
		}
		
	case "broadcast":
		h.broadcast <- &BroadcastMessage{
			Room: msg["room"].(string),
			Type: "message",
			Data: msg["data"],
			Exclude: []string{client.ID},
		}
	}
}

// joinRoom adds client to a room
func (h *WebSocketHub) joinRoom(client *ClientConnection, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	if _, ok := h.rooms[room]; !ok {
		h.rooms[room] = make(map[string]*ClientConnection)
	}
	
	h.rooms[room][client.ID] = client
	client.rooms[room] = true
	
	log.Printf("Client %s joined room %s", client.ID, room)
}

// leaveRoom removes client from a room
func (h *WebSocketHub) leaveRoom(client *ClientConnection, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	if roomClients, ok := h.rooms[room]; ok {
		delete(roomClients, client.ID)
		delete(client.rooms, room)
		
		if len(roomClients) == 0 {
			delete(h.rooms, room)
		}
	}
	
	log.Printf("Client %s left room %s", client.ID, room)
}

// encodeMessage efficiently encodes a message
func (h *WebSocketHub) encodeMessage(msg *BroadcastMessage) ([]byte, error) {
	envelope := map[string]interface{}{
		"type":      msg.Type,
		"data":      msg.Data,
		"timestamp": time.Now().Unix(),
	}
	
	return json.Marshal(envelope)
}

// cleanupRoutine periodically cleans up stale connections
func (h *WebSocketHub) cleanupRoutine() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for range ticker.C {
		h.mu.Lock()
		now := time.Now()
		
		for id, client := range h.clients {
			if now.Sub(client.lastPing) > 90*time.Second {
				log.Printf("Removing stale client: %s", id)
				h.unregister <- client
			}
		}
		
		h.mu.Unlock()
	}
}

// metricsRoutine periodically logs metrics
func (h *WebSocketHub) metricsRoutine() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	
	for range ticker.C {
		h.metrics.mu.RLock()
		log.Printf("WebSocket Metrics - Active: %d, Total: %d, Sent: %d, Received: %d, Errors: %d",
			h.metrics.ActiveConnections,
			h.metrics.TotalConnections,
			h.metrics.MessagesSent,
			h.metrics.MessagesReceived,
			h.metrics.Errors)
		h.metrics.mu.RUnlock()
	}
}

// NewRingBuffer creates a new ring buffer
func NewRingBuffer(size int) *RingBuffer {
	return &RingBuffer{
		buffer: make([][]byte, size),
		size:   size,
		head:   0,
		tail:   0,
	}
}

// Add adds a message to the ring buffer
func (rb *RingBuffer) Add(data []byte) {
	rb.mu.Lock()
	defer rb.mu.Unlock()
	
	rb.buffer[rb.head] = data
	rb.head = (rb.head + 1) % rb.size
	
	if rb.head == rb.tail {
		rb.tail = (rb.tail + 1) % rb.size
	}
}

// GetRecent returns recent messages
func (rb *RingBuffer) GetRecent(count int) [][]byte {
	rb.mu.Lock()
	defer rb.mu.Unlock()
	
	result := make([][]byte, 0, count)
	idx := rb.tail
	
	for i := 0; i < count && i < rb.size; i++ {
		if rb.buffer[idx] != nil {
			result = append(result, rb.buffer[idx])
		}
		idx = (idx + 1) % rb.size
		
		if idx == rb.head {
			break
		}
	}
	
	return result
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(capacity, refill int, refillInterval time.Duration) *RateLimiter {
	rl := &RateLimiter{
		tokens:   capacity,
		capacity: capacity,
		refill:   refill,
		ticker:   time.NewTicker(refillInterval),
	}
	
	go func() {
		for range rl.ticker.C {
			rl.mu.Lock()
			rl.tokens = min(rl.tokens+rl.refill, rl.capacity)
			rl.mu.Unlock()
		}
	}()
	
	return rl
}

// Allow checks if a request is allowed
func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	if rl.tokens > 0 {
		rl.tokens--
		return true
	}
	
	return false
}

// NewTokenBucket creates a new token bucket
func NewTokenBucket(capacity, refillRate int) *TokenBucket {
	return &TokenBucket{
		tokens:     capacity,
		capacity:   capacity,
		lastRefill: time.Now(),
	}
}

// Allow checks if a request is allowed
func (tb *TokenBucket) Allow() bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	
	now := time.Now()
	elapsed := now.Sub(tb.lastRefill)
	
	// Refill tokens based on elapsed time
	tokensToAdd := int(elapsed.Seconds()) * 10 // 10 tokens per second
	tb.tokens = min(tb.tokens+tokensToAdd, tb.capacity)
	tb.lastRefill = now
	
	if tb.tokens > 0 {
		tb.tokens--
		return true
	}
	
	return false
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}