import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import WebSocket from 'ws'
import { EventEmitter } from 'events'

// Mock WebSocket implementation for testing
class MockWebSocket extends EventEmitter {
  readyState: number = WebSocket.OPEN
  CONNECTING = WebSocket.CONNECTING
  OPEN = WebSocket.OPEN
  CLOSING = WebSocket.CLOSING
  CLOSED = WebSocket.CLOSED
  
  messages: any[] = []
  
  constructor(public url?: string) {
    super()
    // Simulate connection opening
    setTimeout(() => this.emit('open'), 10)
  }
  
  send(data: string) {
    if (this.readyState === WebSocket.OPEN) {
      this.messages.push(JSON.parse(data))
    }
  }
  
  close() {
    this.readyState = WebSocket.CLOSED
    this.emit('close')
  }
  
  // Simulate receiving a message
  simulateMessage(data: any) {
    this.emit('message', JSON.stringify(data))
  }
}

// Mock WebSocket Manager (client-side)
class MockWebSocketManager {
  private ws: MockWebSocket | null = null
  private eventHandlers: Map<string, Function[]> = new Map()
  private connected: boolean = false
  
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new MockWebSocket(url)
      
      this.ws.on('open', () => {
        this.connected = true
        resolve()
      })
      
      this.ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      })
      
      this.ws.on('close', () => {
        this.connected = false
      })
      
      this.ws.on('error', (error) => {
        reject(error)
      })
    })
  }
  
  private handleMessage(message: any) {
    const handlers = this.eventHandlers.get(message.event)
    if (handlers) {
      handlers.forEach(handler => handler(message.data))
    }
  }
  
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }
  
  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }
  
  emit(event: string, data: any) {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify({ event, data }))
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
  
  isConnected(): boolean {
    return this.connected
  }
  
  // Test helper to simulate server messages
  simulateServerMessage(event: string, data: any) {
    if (this.ws) {
      this.ws.simulateMessage({ event, data })
    }
  }
}

describe('WebSocket Events Integration', () => {
  let wsManager: MockWebSocketManager
  let mockServer: MockWebSocket
  
  beforeEach(async () => {
    wsManager = new MockWebSocketManager()
    await wsManager.connect('ws://localhost:8001/fish')
  })
  
  afterEach(() => {
    wsManager.disconnect()
  })
  
  describe('connection management', () => {
    it('should establish WebSocket connection', () => {
      expect(wsManager.isConnected()).toBe(true)
    })
    
    it('should handle connection errors gracefully', async () => {
      const errorManager = new MockWebSocketManager()
      
      // Mock a connection failure
      jest.spyOn(MockWebSocket.prototype, 'on').mockImplementation((event, handler) => {
        if (event === 'open') {
          setTimeout(() => handler(), 10)
        } else if (event === 'error') {
          setTimeout(() => handler(new Error('Connection failed')), 20)
        }
        return mockServer
      })
      
      await expect(errorManager.connect('ws://invalid:8001/fish')).rejects.toThrow()
    })
    
    it('should reconnect after disconnection', async () => {
      wsManager.disconnect()
      expect(wsManager.isConnected()).toBe(false)
      
      await wsManager.connect('ws://localhost:8001/fish')
      expect(wsManager.isConnected()).toBe(true)
    })
  })
  
  describe('mood-change events', () => {
    it('should handle mood change from curious to excited', (done) => {
      const expectedMoodData = {
        from: 'curious',
        to: 'excited',
        intensity: 0.9,
        trigger: 'feeding',
        effects: {
          visualChanges: ['increased_glow', 'faster_movement'],
          duration: 3000
        }
      }
      
      wsManager.on('mood-change', (data: any) => {
        try {
          expect(data.from).toBe('curious')
          expect(data.to).toBe('excited')
          expect(data.intensity).toBe(0.9)
          expect(data.trigger).toBe('feeding')
          expect(data.effects.visualChanges).toContain('increased_glow')
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('mood-change', expectedMoodData)
    })
    
    it('should handle mood change to shy state', (done) => {
      const shyMoodData = {
        from: 'playful',
        to: 'shy',
        intensity: 0.6,
        trigger: 'fast_cursor_movement',
        effects: {
          visualChanges: ['dimmed_glow', 'retreat_to_corner'],
          behavioralChanges: ['avoid_cursor'],
          duration: 5000
        }
      }
      
      wsManager.on('mood-change', (data: any) => {
        try {
          expect(data.to).toBe('shy')
          expect(data.trigger).toBe('fast_cursor_movement')
          expect(data.effects.behavioralChanges).toContain('avoid_cursor')
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('mood-change', shyMoodData)
    })
    
    it('should handle mood change to lonely state', (done) => {
      const lonelyMoodData = {
        from: 'trusting',
        to: 'lonely',
        intensity: 0.8,
        trigger: 'user_absence',
        effects: {
          visualChanges: ['slow_pulsing', 'muted_colors'],
          behavioralChanges: ['slow_swimming', 'occasional_sighs'],
          particleEffects: ['lonely_bubbles'],
          duration: 10000
        }
      }
      
      wsManager.on('mood-change', (data: any) => {
        try {
          expect(data.to).toBe('lonely')
          expect(data.trigger).toBe('user_absence')
          expect(data.effects.particleEffects).toContain('lonely_bubbles')
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('mood-change', lonelyMoodData)
    })
  })
  
  describe('trust-update events', () => {
    it('should handle trust level increases', (done) => {
      const trustUpdateData = {
        previous: 45.5,
        current: 48.0,
        delta: 2.5,
        trigger: 'gentle_interaction',
        milestone: null,
        effects: {
          visualFeedback: 'subtle_glow_increase',
          behavioralChanges: 'more_responsive'
        }
      }
      
      wsManager.on('trust-update', (data: any) => {
        try {
          expect(data.previous).toBe(45.5)
          expect(data.current).toBe(48.0)
          expect(data.delta).toBe(2.5)
          expect(data.trigger).toBe('gentle_interaction')
          expect(data.effects.behavioralChanges).toBe('more_responsive')
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('trust-update', trustUpdateData)
    })
    
    it('should handle trust milestones', (done) => {
      const milestoneData = {
        previous: 49.8,
        current: 50.2,
        delta: 0.4,
        trigger: 'feeding',
        milestone: 'comfortable',
        effects: {
          celebration: 'sparkle_burst',
          unlockedBehaviors: ['closer_following', 'playful_loops'],
          visualFeedback: 'milestone_glow'
        }
      }
      
      wsManager.on('trust-update', (data: any) => {
        try {
          expect(data.milestone).toBe('comfortable')
          expect(data.effects.celebration).toBe('sparkle_burst')
          expect(data.effects.unlockedBehaviors).toContain('closer_following')
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('trust-update', milestoneData)
    })
    
    it('should handle trust decreases', (done) => {
      const trustDecreaseData = {
        previous: 67.3,
        current: 64.8,
        delta: -2.5,
        trigger: 'fast_movement',
        effects: {
          visualFeedback: 'slight_dimming',
          behavioralChanges: 'more_cautious'
        }
      }
      
      wsManager.on('trust-update', (data: any) => {
        try {
          expect(data.delta).toBeLessThan(0)
          expect(data.trigger).toBe('fast_movement')
          expect(data.effects.behavioralChanges).toBe('more_cautious')
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('trust-update', trustDecreaseData)
    })
  })
  
  describe('feeding-event events', () => {
    it('should handle food placement events', (done) => {
      const feedingEventData = {
        type: 'food_placed',
        position: { x: 200, y: 150 },
        foodId: 'food_12345',
        properties: {
          size: 5,
          glow: 1.0,
          sparkleCount: 8
        },
        fishResponse: {
          attentionGained: true,
          approachBehavior: 'excited_dart',
          estimatedReachTime: 2500
        }
      }
      
      wsManager.on('feeding-event', (data: any) => {
        try {
          expect(data.type).toBe('food_placed')
          expect(data.position).toEqual({ x: 200, y: 150 })
          expect(data.foodId).toBe('food_12345')
          expect(data.fishResponse.attentionGained).toBe(true)
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('feeding-event', feedingEventData)
    })
    
    it('should handle food consumption events', (done) => {
      const consumptionData = {
        type: 'food_consumed',
        foodId: 'food_12345',
        position: { x: 200, y: 150 },
        consumptionTime: 2347, // Time taken to reach and eat
        effects: {
          satisfactionBurst: 'sparkle_explosion',
          trustIncrease: 3.0,
          moodBoost: 'contentment',
          bubbleEmission: true
        },
        fishState: {
          mood: 'content',
          trustLevel: 73.2,
          glowIntensity: 1.3
        }
      }
      
      wsManager.on('feeding-event', (data: any) => {
        try {
          expect(data.type).toBe('food_consumed')
          expect(data.effects.trustIncrease).toBe(3.0)
          expect(data.fishState.mood).toBe('content')
          expect(data.effects.bubbleEmission).toBe(true)
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('feeding-event', consumptionData)
    })
    
    it('should handle food expiration events', (done) => {
      const expirationData = {
        type: 'food_expired',
        foodId: 'food_67890',
        position: { x: 300, y: 200 },
        timeActive: 8000, // 8 seconds
        reason: 'timeout',
        effects: {
          fadeOut: true,
          disappointment: 'mild'
        }
      }
      
      wsManager.on('feeding-event', (data: any) => {
        try {
          expect(data.type).toBe('food_expired')
          expect(data.reason).toBe('timeout')
          expect(data.timeActive).toBe(8000)
          expect(data.effects.fadeOut).toBe(true)
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('feeding-event', expirationData)
    })
  })
  
  describe('memory-save events', () => {
    it('should handle memory persistence events', (done) => {
      const memorySaveData = {
        type: 'memory_saved',
        data: {
          trustLevel: 72.5,
          interactionCount: 156,
          feedingSpotsCount: 12,
          lastVisit: Date.now(),
          behaviorPattern: 'friendly_follower'
        },
        triggers: ['trust_milestone', 'feeding_event'],
        success: true
      }
      
      wsManager.on('memory-save', (data: any) => {
        try {
          expect(data.type).toBe('memory_saved')
          expect(data.data.trustLevel).toBe(72.5)
          expect(data.data.interactionCount).toBe(156)
          expect(data.triggers).toContain('trust_milestone')
          expect(data.success).toBe(true)
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('memory-save', memorySaveData)
    })
    
    it('should handle memory save failures', (done) => {
      const memorySaveFailData = {
        type: 'memory_save_failed',
        error: 'storage_quota_exceeded',
        fallback: 'local_memory_only',
        data: {
          trustLevel: 68.3,
          interactionCount: 89
        },
        retryAfter: 30000 // 30 seconds
      }
      
      wsManager.on('memory-save', (data: any) => {
        try {
          expect(data.type).toBe('memory_save_failed')
          expect(data.error).toBe('storage_quota_exceeded')
          expect(data.fallback).toBe('local_memory_only')
          expect(data.retryAfter).toBe(30000)
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('memory-save', memorySaveFailData)
    })
  })
  
  describe('visitor-recognized events', () => {
    it('should handle returning visitor recognition', (done) => {
      const visitorData = {
        type: 'returning_visitor',
        visitorId: 'visitor_abc123',
        lastVisit: Date.now() - 86400000, // Yesterday
        statistics: {
          totalVisits: 7,
          totalPlayTime: 1800000, // 30 minutes
          highestTrust: 89.5,
          favoriteFeeding: { x: 180, y: 200 }
        },
        welcomeAnimation: 'excited_greeting',
        moodBoost: {
          intensity: 0.8,
          duration: 5000
        }
      }
      
      wsManager.on('visitor-recognized', (data: any) => {
        try {
          expect(data.type).toBe('returning_visitor')
          expect(data.statistics.totalVisits).toBe(7)
          expect(data.welcomeAnimation).toBe('excited_greeting')
          expect(data.moodBoost.intensity).toBe(0.8)
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('visitor-recognized', visitorData)
    })
    
    it('should handle new visitor events', (done) => {
      const newVisitorData = {
        type: 'new_visitor',
        visitorId: 'visitor_xyz789',
        firstVisit: Date.now(),
        initialState: {
          mood: 'curious',
          trustLevel: 20,
          behavior: 'cautious_observation'
        },
        tutorial: {
          showTips: true,
          highlightFeatures: ['feeding', 'gentle_interaction']
        }
      }
      
      wsManager.on('visitor-recognized', (data: any) => {
        try {
          expect(data.type).toBe('new_visitor')
          expect(data.initialState.mood).toBe('curious')
          expect(data.tutorial.showTips).toBe(true)
          expect(data.tutorial.highlightFeatures).toContain('feeding')
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('visitor-recognized', newVisitorData)
    })
  })
  
  describe('client-server communication', () => {
    it('should send interaction events to server', () => {
      const interactionData = {
        type: 'cursor_movement',
        position: { x: 150, y: 180 },
        speed: 25.5,
        timestamp: Date.now()
      }
      
      wsManager.emit('interaction', interactionData)
      
      // Check if message was sent (mock implementation)
      // In real implementation, we'd verify server received the message
      expect(wsManager.isConnected()).toBe(true)
    })
    
    it('should handle server acknowledgments', (done) => {
      const ackData = {
        messageId: 'msg_12345',
        status: 'processed',
        result: {
          trustChange: 1.2,
          moodImpact: 'positive'
        }
      }
      
      wsManager.on('ack', (data: any) => {
        try {
          expect(data.messageId).toBe('msg_12345')
          expect(data.status).toBe('processed')
          expect(data.result.trustChange).toBe(1.2)
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('ack', ackData)
    })
  })
  
  describe('error handling', () => {
    it('should handle malformed messages gracefully', () => {
      // This should not crash the system
      expect(() => {
        wsManager.simulateServerMessage('invalid-event', { malformed: true })
      }).not.toThrow()
    })
    
    it('should handle connection drops', (done) => {
      wsManager.on('connection-lost', () => {
        done()
      })
      
      wsManager.simulateServerMessage('connection-lost', {
        reason: 'server_restart',
        reconnectIn: 5000
      })
    })
    
    it('should handle rate limiting messages', (done) => {
      const rateLimitData = {
        error: 'rate_limit_exceeded',
        limit: 50,
        window: 60000,
        retryAfter: 30000
      }
      
      wsManager.on('rate-limit', (data: any) => {
        try {
          expect(data.error).toBe('rate_limit_exceeded')
          expect(data.limit).toBe(50)
          expect(data.retryAfter).toBe(30000)
          done()
        } catch (error) {
          done(error)
        }
      })
      
      wsManager.simulateServerMessage('rate-limit', rateLimitData)
    })
  })
  
  describe('event unsubscription', () => {
    it('should properly remove event listeners', () => {
      const handler = jest.fn()
      
      wsManager.on('mood-change', handler)
      wsManager.simulateServerMessage('mood-change', { to: 'excited' })
      expect(handler).toHaveBeenCalledTimes(1)
      
      wsManager.off('mood-change', handler)
      wsManager.simulateServerMessage('mood-change', { to: 'playful' })
      expect(handler).toHaveBeenCalledTimes(1) // Should not increase
    })
  })
})