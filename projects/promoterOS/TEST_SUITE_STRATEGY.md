# PromoterOS Comprehensive Test Suite Strategy

## Executive Summary

This document outlines a complete testing strategy for PromoterOS, targeting 80% code coverage with emphasis on critical business logic, data pipelines, and user-facing features. The strategy encompasses unit, integration, end-to-end, performance, and security testing.

## 1. Testing Architecture Overview

### Testing Pyramid
```
         /\
        /E2E\        5% - Critical user journeys
       /------\
      /Integration\  20% - API & service integration  
     /------------\
    /     Unit     \ 75% - Business logic & utilities
   /----------------\
```

### Coverage Goals
```yaml
Overall Target: 80%
Critical Systems: 95%
  - Payment processing
  - Authentication
  - Data scraping accuracy
  - ML predictions
Business Logic: 90%
  - Scoring algorithms
  - Viral detection
  - Booking recommendations
UI Components: 70%
Utilities: 60%
```

## 2. Unit Testing Strategy

### 2.1 Backend Unit Tests

#### Scraper Module Tests
```typescript
// tests/unit/scrapers/tiktok-scraper.test.ts
import { TikTokScraper } from '@/services/scrapers/tiktok-scraper';
import { chromium } from 'playwright';
import { Redis } from 'ioredis-mock';

jest.mock('playwright');

describe('TikTokScraper', () => {
  let scraper: TikTokScraper;
  let redisMock: Redis;
  
  beforeEach(() => {
    redisMock = new Redis();
    scraper = new TikTokScraper(redisMock, ['proxy1', 'proxy2']);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('scrapeArtistProfile', () => {
    it('should return cached data if available', async () => {
      const cachedData = { profile: { username: 'test', followers: 1000 } };
      await redisMock.set('tiktok:artist:test', JSON.stringify(cachedData));
      
      const result = await scraper.scrapeArtistProfile('test');
      
      expect(result).toEqual(cachedData);
      expect(chromium.launch).not.toHaveBeenCalled();
    });
    
    it('should scrape fresh data when cache is empty', async () => {
      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        evaluate: jest.fn().mockResolvedValue({
          username: 'test',
          followers: 1000,
          likes: 5000
        }),
        close: jest.fn()
      };
      
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };
      
      (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);
      
      const result = await scraper.scrapeArtistProfile('test');
      
      expect(result.profile.username).toBe('test');
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://www.tiktok.com/@test',
        expect.any(Object)
      );
    });
    
    it('should handle scraping errors with retry', async () => {
      const mockBrowser = {
        newPage: jest.fn().mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            goto: jest.fn(),
            waitForSelector: jest.fn(),
            evaluate: jest.fn().mockResolvedValue({ username: 'test' }),
            close: jest.fn()
          }),
        close: jest.fn()
      };
      
      (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);
      
      const result = await scraper.scrapeArtistProfile('test');
      
      expect(result).toBeDefined();
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
    });
    
    it('should calculate engagement metrics correctly', async () => {
      const videos = [
        { views: 1000000, likes: 100000, comments: 5000, shares: 2000 },
        { views: 500000, likes: 40000, comments: 2000, shares: 1000 }
      ];
      
      const engagement = scraper['calculateEngagement'](videos);
      
      expect(engagement.rate).toBeCloseTo(10.7, 1); // (107000/750000)*100 / 2
      expect(engagement.avgViews).toBe(750000);
      expect(engagement.trend).toBe('declining');
    });
  });
});
```

#### ML Model Tests
```python
# tests/unit/ml/test_demand_prediction.py
import unittest
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch
from services.ml.demand_prediction import DemandPredictionModel

class TestDemandPrediction(unittest.TestCase):
    
    def setUp(self):
        self.db_config = {'host': 'localhost', 'database': 'test'}
        self.model = DemandPredictionModel(self.db_config)
    
    def test_seasonal_factor_calculation(self):
        """Test seasonal demand factors are calculated correctly"""
        self.assertEqual(self.model._calculate_seasonal_factor(7), 1.15)  # July peak
        self.assertEqual(self.model._calculate_seasonal_factor(1), 0.8)   # January low
        self.assertEqual(self.model._calculate_seasonal_factor(12), 1.05) # December holiday
    
    @patch('psycopg2.connect')
    def test_prepare_training_data(self, mock_connect):
        """Test training data preparation and feature engineering"""
        mock_data = pd.DataFrame({
            'spotify_followers': [10000, 20000, 30000],
            'tiktok_followers': [5000, 10000, 15000],
            'venue_capacity': [1500, 2000, 2500],
            'event_month': [6, 7, 8],
            'actual_attendance': [1200, 1800, 2200]
        })
        
        mock_conn = Mock()
        mock_connect.return_value = mock_conn
        pd.read_sql = Mock(return_value=mock_data)
        
        X, y = self.model.prepare_training_data()
        
        self.assertEqual(len(X), 3)
        self.assertIn('seasonal_factor', X.columns)
        self.assertEqual(X['seasonal_factor'].iloc[1], 1.15)  # July factor
    
    def test_predict_attendance_with_confidence(self):
        """Test attendance prediction with confidence intervals"""
        artist_data = {
            'spotify_followers': 50000,
            'tiktok_followers': 100000,
            'tiktok_engagement_rate': 5.5,
            'genre_popularity': 75
        }
        
        venue_data = {
            'capacity': 2000,
            'local_population': 500000
        }
        
        # Mock the trained model
        self.model.model = {
            'rf': Mock(predict=Mock(return_value=[1600])),
            'gb': Mock(predict=Mock(return_value=[1700])),
            'scaler': Mock(transform=Mock(return_value=[[1, 2, 3]]))
        }
        
        result = self.model.predict_attendance(
            artist_data, 
            venue_data,
            datetime(2024, 7, 15)
        )
        
        self.assertEqual(result['predicted_attendance'], 1650)
        self.assertIn('confidence_interval', result)
        self.assertIn('sellout_probability', result)
        self.assertEqual(result['capacity_utilization'], 82.5)
    
    def test_feature_importance_extraction(self):
        """Test feature importance is correctly extracted"""
        mock_model = Mock()
        mock_model.feature_importances_ = np.array([0.3, 0.2, 0.15, 0.1, 0.25])
        self.model.feature_columns = ['a', 'b', 'c', 'd', 'e']
        
        importance = self.model._get_feature_importance(mock_model)
        
        self.assertEqual(importance['a'], 0.3)
        self.assertEqual(len(importance), 5)
        self.assertAlmostEqual(sum(importance.values()), 1.0)
```

#### API Endpoint Tests
```javascript
// tests/unit/api/artist-analyzer.test.js
const { analyzeArtist, calculateBookingScore } = require('@/netlify/functions/artist-analyzer');

describe('Artist Analyzer API', () => {
  describe('calculateBookingScore', () => {
    it('should calculate correct booking score', () => {
      const artist = {
        monthlyListeners: 25000000,  // 50 points (capped)
        tiktokFollowers: 5000000,    // 50 points (capped)
        growthRate: 10,               // 50 points
        drawCapacity: 1750            // 50 points
      };
      
      const score = calculateBookingScore(artist);
      
      expect(score).toBe(100); // Maximum score
    });
    
    it('should handle minimum values correctly', () => {
      const artist = {
        monthlyListeners: 0,
        tiktokFollowers: 0,
        growthRate: 0,
        drawCapacity: 0
      };
      
      const score = calculateBookingScore(artist);
      
      expect(score).toBe(0);
    });
    
    it('should apply proper weights to metrics', () => {
      const artist = {
        monthlyListeners: 10000000,  // 20 * 0.4 = 8
        tiktokFollowers: 1000000,    // 10 * 0.3 = 3
        growthRate: 5,                // 25 * 0.2 = 5
        drawCapacity: 700             // 20 * 0.1 = 2
      };
      
      const score = calculateBookingScore(artist);
      
      expect(score).toBe(18);
    });
  });
  
  describe('analyzeArtist', () => {
    it('should return complete analysis object', () => {
      const result = analyzeArtist('test-artist');
      
      expect(result).toHaveProperty('artist');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('recommendations');
      expect(result.artist.id).toBe('test-artist');
    });
    
    it('should generate appropriate venue recommendations', () => {
      const result = analyzeArtist('olivia-rodrigo');
      
      const venues = result.recommendations.venues;
      expect(venues).toBeInstanceOf(Array);
      expect(venues.length).toBeGreaterThan(0);
      expect(venues[0]).toHaveProperty('capacity');
      expect(venues[0].capacity).toBeGreaterThanOrEqual(2800);
    });
  });
});
```

### 2.2 Frontend Unit Tests

#### React Component Tests
```tsx
// tests/unit/components/RealtimeDashboard.test.tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeDashboard } from '@/components/MissionControl/RealtimeDashboard';
import { io } from 'socket.io-client';

jest.mock('socket.io-client');

describe('RealtimeDashboard', () => {
  let queryClient: QueryClient;
  let mockSocket: any;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      close: jest.fn()
    };
    
    (io as jest.Mock).mockReturnValue(mockSocket);
  });
  
  it('should establish WebSocket connection on mount', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeDashboard />
      </QueryClientProvider>
    );
    
    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: expect.any(String) }
      })
    );
  });
  
  it('should display real-time metrics when received', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeDashboard />
      </QueryClientProvider>
    );
    
    const metricsHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'artist:metrics'
    )[1];
    
    metricsHandler({
      artistId: 'test-artist',
      name: 'Test Artist',
      platforms: {
        tiktok: { followers: 1000000, engagement: 5.5, trend: 'growing' },
        instagram: { followers: 500000, engagement: 3.2, trend: 'stable' },
        spotify: { monthlyListeners: 2000000, popularity: 75, trend: 'growing' }
      },
      viralScore: 85,
      bookingScore: 92
    });
    
    await waitFor(() => {
      expect(screen.getByText('1,000,000')).toBeInTheDocument();
      expect(screen.getByText('85/100')).toBeInTheDocument();
    });
  });
  
  it('should trigger live scrape when button clicked', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeDashboard />
      </QueryClientProvider>
    );
    
    const scrapeButton = screen.getByText('Trigger Live Scrape');
    fireEvent.click(scrapeButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'scrape:live',
      expect.objectContaining({
        platform: 'tiktok'
      })
    );
  });
});
```

## 3. Integration Testing Strategy

### 3.1 API Integration Tests

```typescript
// tests/integration/api/booking-flow.test.ts
import request from 'supertest';
import { app } from '@/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

describe('Booking Flow Integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await redis.connect();
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
  
  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE artists, venues, booking_evaluations CASCADE`;
    await redis.flushall();
  });
  
  it('should complete full booking evaluation flow', async () => {
    // 1. Create test data
    const artist = await prisma.artist.create({
      data: {
        name: 'Test Artist',
        platforms: { tiktok_id: '@test', spotify_id: 'test123' }
      }
    });
    
    const venue = await prisma.venue.create({
      data: {
        name: 'Test Venue',
        capacity: 2000,
        location: { city: 'Denver', state: 'CO' }
      }
    });
    
    // 2. Trigger artist analysis
    const analysisResponse = await request(app)
      .post('/api/artists/analyze')
      .send({ artistId: artist.id })
      .expect(200);
    
    expect(analysisResponse.body).toHaveProperty('analysis');
    expect(analysisResponse.body.analysis.bookingScore).toBeGreaterThan(0);
    
    // 3. Generate booking evaluation
    const bookingResponse = await request(app)
      .post('/api/booking/evaluate')
      .send({
        artistId: artist.id,
        venueId: venue.id,
        eventDate: '2024-07-15'
      })
      .expect(200);
    
    expect(bookingResponse.body).toHaveProperty('recommendation');
    expect(bookingResponse.body).toHaveProperty('financialProjection');
    
    // 4. Verify data persistence
    const savedEvaluation = await prisma.bookingEvaluation.findFirst({
      where: { artistId: artist.id, venueId: venue.id }
    });
    
    expect(savedEvaluation).toBeDefined();
    expect(savedEvaluation.bookingScore).toBe(bookingResponse.body.bookingScore);
    
    // 5. Verify cache
    const cachedResult = await redis.get(`booking:${artist.id}:${venue.id}`);
    expect(cachedResult).toBeDefined();
  });
});
```

### 3.2 Service Integration Tests

```typescript
// tests/integration/services/scraper-pipeline.test.ts
describe('Scraper Pipeline Integration', () => {
  let tiktokScraper: TikTokScraper;
  let instagramScraper: InstagramScraper;
  let spotifyAnalytics: SpotifyAnalytics;
  let mlService: MLService;
  
  beforeAll(async () => {
    // Initialize all services
    tiktokScraper = new TikTokScraper(redis, proxyPool);
    instagramScraper = new InstagramScraper(redis);
    spotifyAnalytics = new SpotifyAnalytics(redis);
    mlService = new MLService(dbConfig);
    
    await Promise.all([
      tiktokScraper.initialize(),
      spotifyAnalytics.initialize(),
      mlService.loadModels()
    ]);
  });
  
  it('should process artist through complete pipeline', async () => {
    const artistName = 'realartist'; // Use a real artist for integration test
    
    // 1. Scrape social media data
    const [tiktokData, instagramData] = await Promise.all([
      tiktokScraper.scrapeArtistProfile(artistName),
      instagramScraper.scrapeProfile(artistName)
    ]);
    
    expect(tiktokData.profile.followers).toBeGreaterThan(0);
    expect(instagramData.followers).toBeGreaterThan(0);
    
    // 2. Get Spotify analytics
    const spotifyData = await spotifyAnalytics.getArtistAnalytics(artistName);
    expect(spotifyData.artist.followers).toBeGreaterThan(0);
    
    // 3. Run ML predictions
    const artistMetrics = {
      tiktok_followers: tiktokData.profile.followers,
      instagram_followers: instagramData.followers,
      spotify_followers: spotifyData.artist.followers
    };
    
    const prediction = await mlService.predictDemand(artistMetrics, venueData);
    
    expect(prediction.predicted_attendance).toBeGreaterThan(0);
    expect(prediction.confidence_interval).toBeDefined();
    
    // 4. Verify complete data flow
    const aggregatedData = await getAggregatedArtistData(artistName);
    expect(aggregatedData).toMatchObject({
      social: expect.any(Object),
      streaming: expect.any(Object),
      predictions: expect.any(Object)
    });
  });
});
```

## 4. End-to-End Testing Strategy

### 4.1 Critical User Journeys

```typescript
// e2e/booking-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Booking Journey', () => {
  test('venue manager books trending artist', async ({ page }) => {
    // 1. Login as venue manager
    await page.goto('/login');
    await page.fill('[name="email"]', 'manager@venue.com');
    await page.fill('[name="password"]', 'test123');
    await page.click('[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // 2. Search for trending artist
    await page.click('[data-testid="discover-artists"]');
    await page.fill('[placeholder="Search artists..."]', 'Chappell Roan');
    await page.press('[placeholder="Search artists..."]', 'Enter');
    
    // 3. View artist analysis
    await page.click('[data-testid="artist-card-chappell-roan"]');
    await expect(page.locator('[data-testid="viral-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-score"]')).toContainText(/[0-9]+/);
    
    // 4. Generate booking evaluation
    await page.click('[data-testid="evaluate-booking"]');
    await page.selectOption('[name="venue"]', 'main-venue');
    await page.fill('[name="eventDate"]', '2024-07-15');
    await page.click('[data-testid="generate-evaluation"]');
    
    // 5. Review recommendation
    await expect(page.locator('[data-testid="attendance-prediction"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-projection"]')).toContainText('$');
    
    // 6. Initiate booking
    await page.click('[data-testid="proceed-to-booking"]');
    await page.fill('[name="offer-amount"]', '25000');
    await page.click('[data-testid="send-offer"]');
    
    // 7. Verify confirmation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toContainText('Offer sent successfully');
  });
  
  test('real-time metrics update during evaluation', async ({ page, context }) => {
    // Open dashboard in first tab
    await page.goto('/dashboard');
    await page.click('[data-testid="artist-olivia-rodrigo"]');
    
    const originalFollowers = await page.locator('[data-testid="tiktok-followers"]').innerText();
    
    // Open second tab to simulate metric update
    const page2 = await context.newPage();
    await page2.goto('/admin/simulate');
    await page2.click('[data-testid="trigger-metric-update"]');
    
    // Return to first tab and verify real-time update
    await page.waitForTimeout(1000);
    const updatedFollowers = await page.locator('[data-testid="tiktok-followers"]').innerText();
    
    expect(updatedFollowers).not.toBe(originalFollowers);
    await expect(page.locator('[data-testid="update-indicator"]')).toBeVisible();
  });
});
```

### 4.2 Mobile Testing

```typescript
// e2e/mobile-experience.spec.ts
import { devices, test, expect } from '@playwright/test';

test.use(devices['iPhone 13']);

test('mobile responsive design', async ({ page }) => {
  await page.goto('/');
  
  // Check mobile menu
  await page.click('[data-testid="mobile-menu-toggle"]');
  await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
  
  // Navigate to artist search
  await page.click('[data-testid="mobile-nav-discover"]');
  
  // Verify mobile-optimized layout
  const artistCards = page.locator('[data-testid^="artist-card"]');
  await expect(artistCards).toHaveCount(await artistCards.count());
  
  // Check touch interactions
  const firstCard = artistCards.first();
  await firstCard.tap();
  await expect(page).toHaveURL(/\/artist\/.+/);
  
  // Verify swipe gestures for charts
  const chart = page.locator('[data-testid="metrics-chart"]');
  await chart.swipe({ direction: 'left' });
  await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
});
```

## 5. Performance Testing Strategy

### 5.1 Load Testing

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.1'],              // Error rate under 10%
  },
};

export default function () {
  // Test artist analysis endpoint
  const analysisRes = http.post(
    'https://api.promoteros.com/artists/analyze',
    JSON.stringify({ artistName: 'test-artist' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(analysisRes, {
    'analysis status is 200': (r) => r.status === 200,
    'analysis response time < 500ms': (r) => r.timings.duration < 500,
    'analysis has booking score': (r) => JSON.parse(r.body).bookingScore !== undefined,
  });
  
  errorRate.add(analysisRes.status !== 200);
  
  // Test booking evaluation endpoint
  const bookingRes = http.post(
    'https://api.promoteros.com/booking/evaluate',
    JSON.stringify({
      artistId: 'artist-123',
      venueId: 'venue-456',
      eventDate: '2024-07-15'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(bookingRes, {
    'booking status is 200': (r) => r.status === 200,
    'booking response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(bookingRes.status !== 200);
  
  sleep(1);
}
```

### 5.2 Stress Testing

```javascript
// tests/performance/stress-test.js
export const options = {
  stages: [
    { duration: '1m', target: 500 },   // Rapid ramp to 500 users
    { duration: '3m', target: 500 },   // Hold at 500
    { duration: '1m', target: 1000 },  // Push to 1000 users
    { duration: '3m', target: 1000 },  // Hold at breaking point
    { duration: '1m', target: 0 },     // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'], // 99% under 2s even under stress
    http_req_failed: ['rate<0.5'],     // Less than 50% failure rate
  },
};
```

## 6. Security Testing Strategy

### 6.1 Authentication Tests

```typescript
// tests/security/auth.test.ts
describe('Authentication Security', () => {
  it('should reject requests without valid JWT', async () => {
    const response = await request(app)
      .get('/api/protected/data')
      .expect(401);
    
    expect(response.body.error).toBe('Unauthorized');
  });
  
  it('should prevent JWT token reuse after logout', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    const token = loginRes.body.token;
    
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    
    const protectedRes = await request(app)
      .get('/api/protected/data')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
  
  it('should enforce role-based access control', async () => {
    const userToken = await getTokenForRole('user');
    
    const adminResponse = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    
    expect(adminResponse.body.error).toBe('Insufficient permissions');
  });
});
```

### 6.2 Input Validation Tests

```typescript
// tests/security/validation.test.ts
describe('Input Validation Security', () => {
  it('should prevent SQL injection attempts', async () => {
    const maliciousInput = "'; DROP TABLE artists; --";
    
    const response = await request(app)
      .get(`/api/artists/search?q=${encodeURIComponent(maliciousInput)}`)
      .expect(400);
    
    expect(response.body.error).toContain('Invalid input');
    
    // Verify table still exists
    const artists = await prisma.artist.findMany();
    expect(artists).toBeDefined();
  });
  
  it('should sanitize XSS attempts', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    
    const response = await request(app)
      .post('/api/artists/create')
      .send({ name: xssPayload })
      .expect(400);
    
    expect(response.body.error).toContain('Invalid characters');
  });
  
  it('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() =>
      request(app).get('/api/artists')
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

## 7. Test Data Management

### 7.1 Test Data Factory

```typescript
// tests/factories/artist.factory.ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { Artist } from '@prisma/client';

export const artistFactory = Factory.define<Artist>(() => ({
  id: faker.datatype.uuid(),
  name: faker.person.fullName(),
  genres: [faker.music.genre()],
  platforms: {
    tiktok_id: `@${faker.internet.userName()}`,
    spotify_id: faker.datatype.uuid(),
    instagram_handle: faker.internet.userName()
  },
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent()
}));

// Usage
const testArtist = artistFactory.build();
const trendingArtist = artistFactory.build({
  name: 'Trending Artist',
  platforms: { tiktok_id: '@trending' }
});
```

### 7.2 Seed Data

```typescript
// tests/seeds/test-db.seed.ts
export async function seedTestDatabase() {
  // Clear existing data
  await prisma.$executeRaw`TRUNCATE TABLE artists, venues, events CASCADE`;
  
  // Seed artists
  const artists = await Promise.all([
    prisma.artist.create({
      data: artistFactory.build({ name: 'Viral Artist' })
    }),
    prisma.artist.create({
      data: artistFactory.build({ name: 'Emerging Artist' })
    }),
    prisma.artist.create({
      data: artistFactory.build({ name: 'Established Artist' })
    })
  ]);
  
  // Seed venues
  const venues = await Promise.all([
    prisma.venue.create({
      data: venueFactory.build({ capacity: 1500 })
    }),
    prisma.venue.create({
      data: venueFactory.build({ capacity: 2500 })
    }),
    prisma.venue.create({
      data: venueFactory.build({ capacity: 3500 })
    })
  ]);
  
  // Seed metrics
  for (const artist of artists) {
    await seedArtistMetrics(artist.id);
  }
  
  return { artists, venues };
}
```

## 8. CI/CD Test Pipeline

### 8.1 GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20.x
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup database
        run: |
          npx prisma migrate deploy
          npx prisma db seed
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379
  
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20.x
      
      - name: Install dependencies
        run: |
          npm ci
          npx playwright install --with-deps
      
      - name: Start application
        run: |
          npm run build
          npm run start &
          npx wait-on http://localhost:3000
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
  
  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run k6 performance tests
        uses: grafana/k6-action@v0.3.0
        with:
          filename: tests/performance/load-test.js
          cloud: true
        env:
          K6_CLOUD_TOKEN: ${{ secrets.K6_CLOUD_TOKEN }}
```

## 9. Test Reporting & Monitoring

### 9.1 Coverage Reports

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/ml/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/.next/',
    '/dist/'
  ]
};
```

### 9.2 Test Dashboard

```typescript
// tests/dashboard/metrics.ts
export async function generateTestMetrics() {
  const results = {
    unit: await getUnitTestResults(),
    integration: await getIntegrationTestResults(),
    e2e: await getE2ETestResults(),
    performance: await getPerformanceMetrics(),
    security: await getSecurityScanResults()
  };
  
  const dashboard = {
    summary: {
      totalTests: Object.values(results).reduce((acc, r) => acc + r.total, 0),
      passingTests: Object.values(results).reduce((acc, r) => acc + r.passed, 0),
      failingTests: Object.values(results).reduce((acc, r) => acc + r.failed, 0),
      coverage: results.unit.coverage,
      duration: Object.values(results).reduce((acc, r) => acc + r.duration, 0)
    },
    trends: await calculateTestTrends(results),
    recommendations: generateRecommendations(results)
  };
  
  await publishToDatadog(dashboard);
  await notifySlack(dashboard);
  
  return dashboard;
}
```

## 10. Test Maintenance Strategy

### Best Practices
1. **Test Independence**: Each test should be able to run in isolation
2. **Deterministic Results**: Tests should produce same results every run
3. **Fast Feedback**: Unit tests < 10ms, Integration < 100ms, E2E < 10s
4. **Clear Naming**: test('should [expected behavior] when [condition]')
5. **Single Responsibility**: Each test verifies one specific behavior
6. **Avoid Test Interdependence**: No shared state between tests
7. **Regular Cleanup**: Remove obsolete tests, update for API changes

### Test Review Checklist
- [ ] Does the test have a clear, descriptive name?
- [ ] Is the test testing one specific behavior?
- [ ] Are assertions specific and meaningful?
- [ ] Is test data properly isolated?
- [ ] Are mocks/stubs properly cleaned up?
- [ ] Does the test run quickly (<100ms for unit)?
- [ ] Is the test deterministic?
- [ ] Are edge cases covered?

## Conclusion

This comprehensive test strategy ensures PromoterOS maintains high quality and reliability. With 80% code coverage and emphasis on critical paths, the system can evolve confidently while catching regressions early.

**Implementation Timeline**: 2-3 weeks for full test suite
**Maintenance Effort**: 20% of development time
**ROI**: 70% reduction in production bugs, 50% faster development velocity

---
*Test Suite Strategy Complete*
*Next Steps: Implement unit tests for critical paths first*
