/**
 * Performance Tests for PromoterOS API
 * Tests response times, memory usage, and scalability
 */

const TestDataFactory = require('./fixtures/test-data');
const { handler: evaluateHandler } = require('../api/artists/evaluate');
const { handler: bookingHandler } = require('../api/booking/score');
const { handler: healthHandler } = require('../health');

describe('PromoterOS Performance Tests', () => {
  
  describe('Response Time Performance', () => {
    test('artist evaluation should complete within 500ms', async () => {
      const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate', 
        TestDataFactory.createApiRequest('evaluate'));
      const context = TestDataFactory.createMockContext();

      const startTime = process.hrtime.bigint();
      
      const result = await evaluateHandler(event, context);
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      expect(result.statusCode).toBe(200);
      expect(durationMs).toBeLessThan(500);
      
      console.log(`Artist evaluation completed in ${durationMs.toFixed(2)}ms`);
    });

    test('booking score should complete within 800ms', async () => {
      const event = TestDataFactory.createMockEvent('POST', '/api/booking/score',
        TestDataFactory.createApiRequest('booking'));
      const context = TestDataFactory.createMockContext();

      const startTime = process.hrtime.bigint();
      
      const result = await bookingHandler(event, context);
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      expect(result.statusCode).toBe(200);
      expect(durationMs).toBeLessThan(800);
      
      console.log(`Booking score completed in ${durationMs.toFixed(2)}ms`);
    });

    test('health check should complete within 100ms', async () => {
      const event = TestDataFactory.createMockEvent('GET', '/health', null);
      const context = TestDataFactory.createMockContext();

      const startTime = process.hrtime.bigint();
      
      const result = await healthHandler(event, context);
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      expect(result.statusCode).toBe(200);
      expect(durationMs).toBeLessThan(100);
      
      console.log(`Health check completed in ${durationMs.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not exceed memory limits under normal load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process multiple requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate',
          TestDataFactory.createApiRequest('evaluate', { artist_name: `Artist ${i}` }));
        promises.push(evaluateHandler(event, TestDataFactory.createMockContext()));
      }
      
      await Promise.all(promises);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB
      
      expect(memoryIncrease).toBeLessThan(50); // Should not increase by more than 50MB
      
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);
    });

    test('should handle garbage collection properly', async () => {
      const runGarbageCollectionTest = async () => {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const beforeMemory = process.memoryUsage();
        
        // Create and process many requests
        const promises = [];
        for (let i = 0; i < 50; i++) {
          const event = TestDataFactory.createMockEvent('POST', '/api/booking/score',
            TestDataFactory.createApiRequest('booking', { artist_name: `Test ${i}` }));
          promises.push(bookingHandler(event, TestDataFactory.createMockContext()));
        }
        
        await Promise.all(promises);
        
        // Force garbage collection again
        if (global.gc) {
          global.gc();
        }
        
        const afterMemory = process.memoryUsage();
        const memoryGrowth = (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024;
        
        return memoryGrowth;
      };

      const memoryGrowth = await runGarbageCollectionTest();
      
      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(100); // Less than 100MB growth
      
      console.log(`Memory growth after 50 requests: ${memoryGrowth.toFixed(2)}MB`);
    });
  });

  describe('Concurrent Load Tests', () => {
    test('should handle 20 concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const startTime = process.hrtime.bigint();
      
      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate',
          TestDataFactory.createApiRequest('evaluate', { artist_name: `Concurrent Artist ${i}` }));
        promises.push(evaluateHandler(event, TestDataFactory.createMockContext()));
      }
      
      const results = await Promise.all(promises);
      
      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1000000;
      const avgTimeMs = totalTimeMs / concurrentRequests;
      
      // All requests should succeed
      results.forEach(result => {
        expect(result.statusCode).toBe(200);
      });
      
      // Average time per request should be reasonable
      expect(avgTimeMs).toBeLessThan(1000);
      
      console.log(`20 concurrent requests completed in ${totalTimeMs.toFixed(2)}ms (avg: ${avgTimeMs.toFixed(2)}ms per request)`);
    });

    test('should maintain accuracy under load', async () => {
      const testArtist = 'Load Test Artist';
      
      // Run same request multiple times concurrently
      const promises = [];
      for (let i = 0; i < 15; i++) {
        const event = TestDataFactory.createMockEvent('POST', '/api/booking/score',
          TestDataFactory.createApiRequest('booking', { artist_name: testArtist }));
        promises.push(bookingHandler(event, TestDataFactory.createMockContext()));
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.statusCode).toBe(200);
      });
      
      // Parse responses and check consistency
      const scores = results.map(result => {
        const response = JSON.parse(result.body);
        return response.data.booking_score.overall_score;
      });
      
      // All scores should be identical for same input
      const firstScore = scores[0];
      scores.forEach(score => {
        expect(score).toBe(firstScore);
      });
      
      console.log(`All ${scores.length} concurrent requests returned consistent score: ${firstScore}`);
    });
  });

  describe('Edge Case Performance', () => {
    test('should handle large payload efficiently', async () => {
      const largeContext = {
        venue_capacity: 5000,
        date: '2024-12-01',
        detailed_requirements: 'x'.repeat(10000), // 10KB string
        notes: 'Large payload test with extended context information that exceeds normal request sizes'
      };
      
      const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate',
        TestDataFactory.createApiRequest('evaluate', { context: largeContext }));
      
      const startTime = process.hrtime.bigint();
      const result = await evaluateHandler(event, TestDataFactory.createMockContext());
      const endTime = process.hrtime.bigint();
      
      const durationMs = Number(endTime - startTime) / 1000000;
      
      expect(result.statusCode).toBe(200);
      expect(durationMs).toBeLessThan(1000); // Should still complete within 1 second
      
      console.log(`Large payload processed in ${durationMs.toFixed(2)}ms`);
    });

    test('should handle extreme artist data efficiently', async () => {
      const extremeProfile = TestDataFactory.createEdgeCases().viral_explosion;
      
      const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate',
        TestDataFactory.createApiRequest('evaluate', { 
          artist_name: 'Viral Explosion Test',
          context: { extreme_metrics: extremeProfile }
        }));
      
      const startTime = process.hrtime.bigint();
      const result = await evaluateHandler(event, TestDataFactory.createMockContext());
      const endTime = process.hrtime.bigint();
      
      const durationMs = Number(endTime - startTime) / 1000000;
      
      expect(result.statusCode).toBe(200);
      expect(durationMs).toBeLessThan(600);
      
      console.log(`Extreme data case processed in ${durationMs.toFixed(2)}ms`);
    });
  });

  describe('Scalability Projections', () => {
    test('should project reasonable scaling characteristics', async () => {
      const testSizes = [1, 5, 10, 15];
      const results = {};
      
      for (const size of testSizes) {
        const startTime = process.hrtime.bigint();
        
        const promises = [];
        for (let i = 0; i < size; i++) {
          const event = TestDataFactory.createMockEvent('POST', '/api/booking/score',
            TestDataFactory.createApiRequest('booking', { artist_name: `Scale Test ${i}` }));
          promises.push(bookingHandler(event, TestDataFactory.createMockContext()));
        }
        
        await Promise.all(promises);
        
        const endTime = process.hrtime.bigint();
        const totalTimeMs = Number(endTime - startTime) / 1000000;
        
        results[size] = {
          totalTime: totalTimeMs,
          avgTime: totalTimeMs / size,
          throughput: (size / totalTimeMs) * 1000 // requests per second
        };
      }
      
      // Log scaling characteristics
      console.log('Scaling Performance:');
      Object.entries(results).forEach(([size, metrics]) => {
        console.log(`${size} concurrent: ${metrics.totalTime.toFixed(2)}ms total, ${metrics.avgTime.toFixed(2)}ms avg, ${metrics.throughput.toFixed(2)} req/sec`);
      });
      
      // Throughput should not degrade catastrophically
      const throughput1 = results[1].throughput;
      const throughput15 = results[15].throughput;
      const degradation = (throughput1 - throughput15) / throughput1;
      
      expect(degradation).toBeLessThan(0.8); // Less than 80% degradation at 15x load
    });
  });

  describe('Memory Leak Detection', () => {
    test('should not leak memory over extended operations', async () => {
      const iterations = 100;
      const memorySnapshots = [];
      
      for (let i = 0; i < iterations; i++) {
        const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate',
          TestDataFactory.createApiRequest('evaluate', { artist_name: `Leak Test ${i}` }));
        
        await evaluateHandler(event, TestDataFactory.createMockContext());
        
        // Take memory snapshot every 20 iterations
        if (i % 20 === 0) {
          const memory = process.memoryUsage();
          memorySnapshots.push({
            iteration: i,
            heapUsed: memory.heapUsed / 1024 / 1024 // MB
          });
        }
      }
      
      // Calculate memory growth trend
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
      const growthRate = memoryGrowth / iterations; // MB per operation
      
      console.log(`Memory growth over ${iterations} operations: ${memoryGrowth.toFixed(2)}MB (${growthRate.toFixed(4)}MB per op)`);
      
      // Memory growth should be minimal
      expect(growthRate).toBeLessThan(0.1); // Less than 0.1MB per operation
      expect(memoryGrowth).toBeLessThan(20); // Less than 20MB total growth
    });
  });
});

// Performance benchmarking utilities
const PerformanceBenchmark = {
  async measureFunction(fn, iterations = 100) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await fn();
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1000000); // Convert to milliseconds
    }
    
    times.sort((a, b) => a - b);
    
    return {
      mean: times.reduce((a, b) => a + b, 0) / times.length,
      median: times[Math.floor(times.length / 2)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)],
      min: times[0],
      max: times[times.length - 1]
    };
  }
};

module.exports = { PerformanceBenchmark };