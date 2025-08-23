// Comprehensive k6 Load Test - VALIDATION for production readiness
// Tests: 10k concurrent users, p99 < 200ms, WebSocket stability

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import encoding from 'k6/encoding';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency_ms');
const wsConnections = new Gauge('ws_active_connections');
const wsMessages = new Counter('ws_messages_received');
const bookingSuccess = new Rate('booking_success_rate');
const paymentSuccess = new Rate('payment_success_rate');
const authSuccess = new Rate('auth_success_rate');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.promoteros.candlefish.ai';
const WS_URL = __ENV.WS_URL || 'wss://ws.promoteros.candlefish.ai';

// Test scenarios with realistic load distribution
export let options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up to 10k users
    main_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Warm up
        { duration: '3m', target: 1000 },  // Ramp to 1k users
        { duration: '5m', target: 5000 },  // Ramp to 5k users
        { duration: '10m', target: 10000 }, // Ramp to 10k users
        { duration: '20m', target: 10000 }, // Stay at 10k for 20 min
        { duration: '5m', target: 5000 },   // Scale down
        { duration: '5m', target: 0 },      // Cool down
      ],
      gracefulRampDown: '30s',
    },
    
    // Scenario 2: WebSocket soak test (1k connections for 60 min)
    websocket_soak: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '60m',
      exec: 'websocketTest',
      startTime: '5m', // Start after initial ramp-up
    },
    
    // Scenario 3: Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 0 },
        { duration: '10s', target: 2000 }, // Sudden spike
        { duration: '30s', target: 2000 }, // Hold
        { duration: '10s', target: 0 },    // Drop
      ],
      startTime: '30m', // Run after main load stabilizes
    },
    
    // Scenario 4: Scraper concurrency test
    scraper_test: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 200,
      exec: 'scraperTest',
      startTime: '10m',
    },
  },
  
  thresholds: {
    // Core SLOs
    'http_req_duration{type:api}': ['p(99)<200'], // p99 < 200ms
    'http_req_failed': ['rate<0.01'],              // Error rate < 1%
    'errors': ['rate<0.01'],                        // Custom error rate < 1%
    
    // Service-specific thresholds
    'booking_success_rate': ['rate>0.995'],         // Booking success > 99.5%
    'payment_success_rate': ['rate>0.9995'],        // Payment success > 99.95%
    'auth_success_rate': ['rate>0.99'],             // Auth success > 99%
    
    // WebSocket thresholds
    'ws_connecting': ['p(95)<1000'],                // WS connection < 1s
    'ws_messages_received': ['count>50000'],        // At least 50k messages
    
    // Capacity thresholds
    'vus': ['value<=10500'],                        // Support 10k+ users
    'http_reqs': ['count>1000000'],                 // Handle 1M+ requests
  },
  
  // Tags for filtering metrics
  tags: {
    environment: 'production',
    test_type: 'comprehensive_load',
  },
};

// Test data
const testUsers = generateTestUsers(1000);
const testArtists = generateTestArtists(100);
const testVenues = generateTestVenues(50);

// Main test scenario
export default function() {
  // Get or create auth token
  let authToken = authenticate();
  
  group('Browse Artists', () => {
    browseArtists(authToken);
  });
  
  group('Analyze Artist', () => {
    analyzeArtist(authToken);
  });
  
  group('Create Booking', () => {
    createBooking(authToken);
  });
  
  group('Process Payment', () => {
    processPayment(authToken);
  });
  
  group('Check Metrics', () => {
    checkMetrics(authToken);
  });
  
  sleep(randomBetween(1, 3));
}

// WebSocket test scenario
export function websocketTest() {
  const url = WS_URL;
  const params = {
    tags: { type: 'websocket' },
    headers: { 'Origin': BASE_URL },
  };
  
  const response = ws.connect(url, params, function(socket) {
    wsConnections.add(1);
    
    socket.on('open', () => {
      console.log('WebSocket connected');
      
      // Subscribe to metrics channel
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'metrics',
        auth: getAuthToken(),
      }));
      
      // Send heartbeat every 30 seconds
      socket.setInterval(() => {
        socket.send(JSON.stringify({ type: 'ping' }));
      }, 30000);
    });
    
    socket.on('message', (data) => {
      wsMessages.add(1);
      const message = JSON.parse(data);
      
      check(message, {
        'WS message has type': (msg) => msg.type !== undefined,
        'WS message has timestamp': (msg) => msg.timestamp !== undefined,
      });
      
      // Respond to different message types
      switch(message.type) {
        case 'pong':
          // Heartbeat acknowledged
          break;
        case 'metrics_update':
          // Process metrics update
          check(message, {
            'Metrics update has data': (msg) => msg.data !== undefined,
          });
          break;
        case 'error':
          console.error('WebSocket error:', message.error);
          errorRate.add(1);
          break;
      }
    });
    
    socket.on('close', () => {
      wsConnections.add(-1);
      console.log('WebSocket disconnected');
    });
    
    socket.on('error', (err) => {
      console.error('WebSocket error:', err);
      errorRate.add(1);
    });
    
    // Keep connection open for duration
    socket.setTimeout(() => {
      socket.close();
    }, 3600000); // 60 minutes
  });
  
  check(response, {
    'WS connection established': (r) => r && r.status === 101,
  });
}

// Scraper concurrency test
export function scraperTest() {
  const artist = randomItem(testArtists);
  const authToken = getAuthToken();
  
  const payload = JSON.stringify({
    artist_id: artist.id,
    platforms: ['tiktok', 'instagram', 'spotify'],
    force_refresh: true,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { type: 'scraper' },
    timeout: '30s',
  };
  
  const response = http.post(`${BASE_URL}/api/scraper/collect`, payload, params);
  
  check(response, {
    'Scraper status 200': (r) => r.status === 200,
    'Scraper has job_id': (r) => r.json('job_id') !== undefined,
    'Scraper response time < 5s': (r) => r.timings.duration < 5000,
  });
  
  if (response.status !== 200) {
    errorRate.add(1);
  }
}

// Helper functions
function authenticate() {
  const user = randomItem(testUsers);
  
  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'auth' },
  };
  
  const response = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  
  const success = check(response, {
    'Auth status 200': (r) => r.status === 200,
    'Auth has token': (r) => r.json('token') !== undefined,
    'Auth response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  authSuccess.add(success);
  
  if (!success) {
    errorRate.add(1);
    return null;
  }
  
  return response.json('token');
}

function browseArtists(authToken) {
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { type: 'api', endpoint: 'browse' },
  };
  
  const response = http.get(`${BASE_URL}/api/artists?limit=20&offset=0`, params);
  
  apiLatency.add(response.timings.duration);
  
  check(response, {
    'Browse status 200': (r) => r.status === 200,
    'Browse has artists': (r) => r.json('artists') !== undefined,
    'Browse response < 200ms': (r) => r.timings.duration < 200,
  });
  
  if (response.status !== 200) {
    errorRate.add(1);
  }
}

function analyzeArtist(authToken) {
  const artist = randomItem(testArtists);
  
  const payload = JSON.stringify({
    artist_name: artist.name,
    platforms: ['tiktok', 'instagram'],
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { type: 'api', endpoint: 'analyze' },
  };
  
  const response = http.post(`${BASE_URL}/api/artists/analyze`, payload, params);
  
  apiLatency.add(response.timings.duration);
  
  check(response, {
    'Analyze status 200': (r) => r.status === 200,
    'Analyze has score': (r) => r.json('score') !== undefined,
    'Analyze response < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (response.status !== 200) {
    errorRate.add(1);
  }
}

function createBooking(authToken) {
  const artist = randomItem(testArtists);
  const venue = randomItem(testVenues);
  const idempotencyKey = `booking_${Date.now()}_${randomString(8)}`;
  
  const payload = JSON.stringify({
    artist_id: artist.id,
    venue_id: venue.id,
    date: '2025-06-15',
    guarantee: 15000,
    ticket_price: 35,
    capacity: venue.capacity,
    idempotency_key: idempotencyKey,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'Idempotency-Key': idempotencyKey,
    },
    tags: { type: 'api', endpoint: 'booking' },
  };
  
  const response = http.post(`${BASE_URL}/api/bookings/create`, payload, params);
  
  apiLatency.add(response.timings.duration);
  
  const success = check(response, {
    'Booking status 201': (r) => r.status === 201,
    'Booking has id': (r) => r.json('booking_id') !== undefined,
    'Booking response < 500ms': (r) => r.timings.duration < 500,
  });
  
  bookingSuccess.add(success);
  
  if (!success) {
    errorRate.add(1);
  }
  
  return response.json('booking_id');
}

function processPayment(authToken) {
  const idempotencyKey = `payment_${Date.now()}_${randomString(8)}`;
  
  const payload = JSON.stringify({
    amount: 15000,
    currency: 'usd',
    payment_method: 'pm_card_visa',
    booking_id: `booking_${randomString(8)}`,
    idempotency_key: idempotencyKey,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'Idempotency-Key': idempotencyKey,
    },
    tags: { type: 'api', endpoint: 'payment' },
  };
  
  const response = http.post(`${BASE_URL}/api/payments/process`, payload, params);
  
  apiLatency.add(response.timings.duration);
  
  const success = check(response, {
    'Payment status 200': (r) => r.status === 200,
    'Payment has transaction_id': (r) => r.json('transaction_id') !== undefined,
    'Payment response < 2s': (r) => r.timings.duration < 2000,
  });
  
  paymentSuccess.add(success);
  
  if (!success) {
    errorRate.add(1);
  }
}

function checkMetrics(authToken) {
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { type: 'api', endpoint: 'metrics' },
  };
  
  const response = http.get(`${BASE_URL}/api/metrics/summary`, params);
  
  apiLatency.add(response.timings.duration);
  
  check(response, {
    'Metrics status 200': (r) => r.status === 200,
    'Metrics has data': (r) => r.json('metrics') !== undefined,
    'Metrics fresh < 5min': (r) => {
      const data = r.json();
      if (!data || !data.last_updated) return false;
      const age = Date.now() - new Date(data.last_updated).getTime();
      return age < 300000; // 5 minutes
    },
  });
  
  if (response.status !== 200) {
    errorRate.add(1);
  }
}

// Test data generators
function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      email: `user${i}@test.promoteros.io`,
      password: 'Test123!@#',
    });
  }
  return users;
}

function generateTestArtists(count) {
  const artists = [];
  const genres = ['rock', 'pop', 'hip-hop', 'electronic', 'indie'];
  
  for (let i = 0; i < count; i++) {
    artists.push({
      id: `artist_${i}`,
      name: `Test Artist ${i}`,
      genre: randomItem(genres),
      monthly_listeners: randomBetween(10000, 1000000),
    });
  }
  return artists;
}

function generateTestVenues(count) {
  const venues = [];
  
  for (let i = 0; i < count; i++) {
    venues.push({
      id: `venue_${i}`,
      name: `Test Venue ${i}`,
      capacity: randomBetween(1200, 3500),
      city: `City ${i}`,
    });
  }
  return venues;
}

function getAuthToken() {
  // In real test, implement token caching/rotation
  return 'cached_auth_token';
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}