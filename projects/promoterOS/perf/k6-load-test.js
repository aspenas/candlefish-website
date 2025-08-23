// k6 Load Test for PromoterOS API
// Target: 10k concurrent users, p99 < 200ms

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const bookingLatency = new Trend('booking_latency');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Warm up
    { duration: '5m', target: 1000 },  // Ramp to 1k users
    { duration: '10m', target: 5000 }, // Ramp to 5k users
    { duration: '15m', target: 10000 }, // Ramp to 10k users
    { duration: '10m', target: 10000 }, // Stay at 10k
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(99)<200'], // 99% of requests under 200ms
    'http_req_failed': ['rate<0.01'],   // Error rate under 1%
    'errors': ['rate<0.01'],
    'api_latency': ['p(99)<200'],
    'booking_latency': ['p(99)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.promoteros.candlefish.ai';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Test data
const ARTIST_IDS = [
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
];

const VENUE_IDS = [
  'v1a2b3c4-d5e6-f789-0abc-def123456789',
  'v2b3c4d5-e6f7-8901-abcd-ef2345678901',
];

export function setup() {
  // Verify API is responding
  let res = http.get(`${BASE_URL}/health/ready`);
  check(res, {
    'API is ready': (r) => r.status === 200,
  });
  
  if (res.status !== 200) {
    throw new Error('API is not ready');
  }
  
  return { startTime: Date.now() };
}

export default function() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
  
  // Scenario 1: Health checks (10% of traffic)
  if (Math.random() < 0.1) {
    group('Health Checks', () => {
      let res = http.get(`${BASE_URL}/health/live`, { headers });
      check(res, {
        'health check status 200': (r) => r.status === 200,
        'health check fast': (r) => r.timings.duration < 50,
      });
      errorRate.add(res.status !== 200);
    });
  }
  
  // Scenario 2: Artist lookup (40% of traffic)
  if (Math.random() < 0.4) {
    group('Artist Lookup', () => {
      const artistId = randomItem(ARTIST_IDS);
      let res = http.get(`${BASE_URL}/api/v1/artists/${artistId}`, { headers });
      
      check(res, {
        'artist lookup status 200': (r) => r.status === 200,
        'artist lookup has data': (r) => r.json('artist') !== null,
        'artist lookup fast': (r) => r.timings.duration < 200,
      });
      
      apiLatency.add(res.timings.duration);
      errorRate.add(res.status !== 200);
    });
  }
  
  // Scenario 3: Search artists (30% of traffic)
  if (Math.random() < 0.3) {
    group('Search Artists', () => {
      const genres = ['rock', 'pop', 'electronic', 'hip-hop'];
      const genre = randomItem(genres);
      
      let res = http.get(`${BASE_URL}/api/v1/artists/search?genre=${genre}&limit=20`, { 
        headers,
        tags: { name: 'SearchArtists' },
      });
      
      check(res, {
        'search status 200': (r) => r.status === 200,
        'search returns results': (r) => r.json('artists.length') > 0,
        'search pagination': (r) => r.json('pagination') !== null,
        'search fast': (r) => r.timings.duration < 300,
      });
      
      apiLatency.add(res.timings.duration);
      errorRate.add(res.status !== 200);
    });
  }
  
  // Scenario 4: Get recommendations (15% of traffic)
  if (Math.random() < 0.15) {
    group('Get Recommendations', () => {
      const venueId = randomItem(VENUE_IDS);
      const payload = JSON.stringify({
        venue_id: venueId,
        event_date: '2025-06-15',
        capacity: 2500,
        genres: ['rock', 'alternative'],
        budget_min: 5000,
        budget_max: 25000,
      });
      
      let res = http.post(`${BASE_URL}/api/v1/recommendations`, payload, { 
        headers,
        tags: { name: 'GetRecommendations' },
      });
      
      check(res, {
        'recommendations status 200': (r) => r.status === 200,
        'recommendations has results': (r) => r.json('recommendations.length') > 0,
        'recommendations has scores': (r) => r.json('recommendations.0.score') > 0,
        'recommendations fast': (r) => r.timings.duration < 500,
      });
      
      bookingLatency.add(res.timings.duration);
      errorRate.add(res.status !== 200);
    });
  }
  
  // Scenario 5: Create booking (5% of traffic)
  if (Math.random() < 0.05) {
    group('Create Booking', () => {
      const payload = JSON.stringify({
        artist_id: randomItem(ARTIST_IDS),
        venue_id: randomItem(VENUE_IDS),
        event_date: '2025-07-20',
        ticket_price: 35.00,
        capacity: 2000,
        contract_terms: {
          guarantee: 15000,
          door_split: 80,
          merch_split: 85,
        },
      });
      
      let res = http.post(`${BASE_URL}/api/v1/bookings`, payload, { 
        headers,
        tags: { name: 'CreateBooking' },
        timeout: '10s',
      });
      
      check(res, {
        'booking status 201': (r) => r.status === 201,
        'booking has number': (r) => r.json('booking_number') !== null,
        'booking has id': (r) => r.json('id') !== null,
        'booking idempotent': (r) => r.headers['X-Idempotency-Key'] !== null,
      });
      
      bookingLatency.add(res.timings.duration);
      errorRate.add(res.status >= 400);
      
      // If booking created, verify it's retrievable
      if (res.status === 201) {
        const bookingId = res.json('id');
        sleep(1);
        
        let getRes = http.get(`${BASE_URL}/api/v1/bookings/${bookingId}`, { headers });
        check(getRes, {
          'booking retrievable': (r) => r.status === 200,
          'booking data matches': (r) => r.json('id') === bookingId,
        });
      }
    });
  }
  
  // Think time between requests
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  // Calculate test duration
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Test completed in ${duration} seconds`);
  
  // Final health check
  let res = http.get(`${BASE_URL}/health/ready`);
  check(res, {
    'API still healthy after load test': (r) => r.status === 200,
  });
}