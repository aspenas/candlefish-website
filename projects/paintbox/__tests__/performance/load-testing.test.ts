import { performance } from 'perf_hooks';
import axios from 'axios';

describe('Paintbox Load Testing Suite', () => {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

  describe('API Endpoint Performance', () => {
    test('should handle concurrent estimate creations', async () => {
      const concurrentRequests = 50;
      const results: any[] = [];

      const createEstimate = async (index: number) => {
        const startTime = performance.now();
        
        try {
          const response = await axios.post(`${baseURL}/api/v1/estimates`, {
            customerId: `customer${index}`,
            projectId: `project${index}`,
            measurements: {
              kitchen: {
                totalArea: 200 + (index * 10),
                walls: [
                  { length: 12, height: 9 },
                  { length: 10, height: 9 },
                ],
              },
            },
            materialType: 'STANDARD',
            complexity: 'MODERATE',
          }, {
            timeout: 10000,
            headers: {
              'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`,
            },
          });

          const endTime = performance.now();
          
          return {
            index,
            duration: endTime - startTime,
            statusCode: response.status,
            success: true,
          };
        } catch (error: any) {
          const endTime = performance.now();
          
          return {
            index,
            duration: endTime - startTime,
            statusCode: error.response?.status || 0,
            success: false,
            error: error.message,
          };
        }
      };

      // Execute concurrent requests
      const promises = Array.from({ length: concurrentRequests }, (_, i) => createEstimate(i));
      const allResults = await Promise.all(promises);
      
      results.push(...allResults);

      // Analyze results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const avgResponseTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      const maxResponseTime = Math.max(...successful.map(r => r.duration));
      const successRate = successful.length / results.length;

      console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Max response time: ${maxResponseTime.toFixed(2)}ms`);

      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds
      expect(maxResponseTime).toBeLessThan(5000); // Max under 5 seconds

    }, 60000); // 1 minute timeout

    test('should handle GraphQL query load', async () => {
      const concurrentQueries = 100;
      const query = `
        query GetEstimates($limit: Int) {
          estimates(limit: $limit) {
            totalCount
            edges {
              node {
                id
                goodPrice
                betterPrice
                bestPrice
                status
                totalSquareFootage
              }
            }
          }
        }
      `;

      const executeQuery = async (index: number) => {
        const startTime = performance.now();
        
        try {
          const response = await axios.post(`${baseURL}/api/graphql`, {
            query,
            variables: { limit: 20 },
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`,
            },
            timeout: 10000,
          });

          const endTime = performance.now();
          
          return {
            index,
            duration: endTime - startTime,
            statusCode: response.status,
            hasData: !!response.data.data,
            hasErrors: !!response.data.errors,
          };
        } catch (error: any) {
          return {
            index,
            duration: performance.now() - startTime,
            statusCode: error.response?.status || 0,
            hasData: false,
            hasErrors: true,
            error: error.message,
          };
        }
      };

      const results = await Promise.all(
        Array.from({ length: concurrentQueries }, (_, i) => executeQuery(i))
      );

      const successful = results.filter(r => r.hasData && !r.hasErrors);
      const avgResponseTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      const successRate = successful.length / results.length;

      expect(successRate).toBeGreaterThan(0.95);
      expect(avgResponseTime).toBeLessThan(1000); // GraphQL should be fast

    }, 30000);
  });

  describe('Pricing Calculation Performance', () => {
    test('should handle complex pricing calculations efficiently', async () => {
      const testCases = [
        {
          name: 'Simple residential',
          input: {
            squareFootage: 1200,
            laborHours: 16,
            materialType: 'STANDARD',
            complexity: 'SIMPLE',
          },
        },
        {
          name: 'Complex commercial',
          input: {
            squareFootage: 5000,
            laborHours: 80,
            materialType: 'PREMIUM',
            complexity: 'HIGHLY_COMPLEX',
          },
        },
        {
          name: 'Large estate',
          input: {
            squareFootage: 15000,
            laborHours: 200,
            materialType: 'LUXURY',
            complexity: 'COMPLEX',
          },
        },
      ];

      for (const testCase of testCases) {
        const iterations = 100;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          
          await axios.post(`${baseURL}/api/v1/pricing/calculate`, testCase.input, {
            headers: {
              'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`,
            },
          });
          
          const endTime = performance.now();
          times.push(endTime - startTime);
        }

        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const maxTime = Math.max(...times);
        const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

        console.log(`${testCase.name}: avg=${avgTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms, p95=${p95Time.toFixed(2)}ms`);

        expect(avgTime).toBeLessThan(500); // Should average under 500ms
        expect(p95Time).toBeLessThan(1000); // 95th percentile under 1s
      }
    });

    test('should handle Excel formula validation at scale', async () => {
      // Test with the validated Excel cases
      const excelTestCases = [
        {
          name: 'Paul Sakry Case',
          squareFootage: 2800,
          laborHours: 28,
          materialType: 'STANDARD',
          complexity: 'MODERATE',
        },
        {
          name: 'Delores Huss Case',
          squareFootage: 3200,
          laborHours: 35,
          materialType: 'PREMIUM',
          complexity: 'COMPLEX',
        },
        {
          name: 'Grant Norell Case',
          squareFootage: 1800,
          laborHours: 22,
          materialType: 'STANDARD',
          complexity: 'SIMPLE',
        },
      ];

      const batchSize = 50; // Process in batches to avoid overwhelming
      const batches = Math.ceil(excelTestCases.length * 100 / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        const batchStart = performance.now();
        
        const batchPromises = Array.from({ length: batchSize }, async (_, i) => {
          const testCase = excelTestCases[i % excelTestCases.length];
          
          return axios.post(`${baseURL}/api/v1/pricing/calculate`, testCase, {
            headers: { 'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}` },
          });
        });

        const results = await Promise.all(batchPromises);
        const batchTime = performance.now() - batchStart;
        
        // Verify all calculations completed successfully
        const successCount = results.filter(r => r.status === 200).length;
        expect(successCount).toBe(batchSize);
        
        // Verify performance
        const avgTimePerCalculation = batchTime / batchSize;
        expect(avgTimePerCalculation).toBeLessThan(200); // Under 200ms average per calculation
        
        console.log(`Batch ${batch + 1}: ${batchTime.toFixed(2)}ms total, ${avgTimePerCalculation.toFixed(2)}ms per calculation`);
      }
    });
  });

  describe('Database Query Performance', () => {
    test('should handle complex estimate queries efficiently', async () => {
      const queryTests = [
        {
          name: 'Paginated estimates with filters',
          endpoint: '/api/v1/estimates?status=SENT&limit=50&offset=0',
          maxTime: 200,
        },
        {
          name: 'Customer search with fuzzy matching',
          endpoint: '/api/v1/customers/search?q=john&limit=20',
          maxTime: 300,
        },
        {
          name: 'Project analytics dashboard',
          endpoint: '/api/v1/analytics/projects?timeframe=30d',
          maxTime: 500,
        },
        {
          name: 'Pricing trends report',
          endpoint: '/api/v1/reports/pricing-trends?months=6',
          maxTime: 800,
        },
      ];

      for (const test of queryTests) {
        const iterations = 50;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          
          await axios.get(`${baseURL}${test.endpoint}`, {
            headers: { 'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}` },
          });
          
          times.push(performance.now() - startTime);
        }

        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const maxTime = Math.max(...times);
        const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

        console.log(`${test.name}: avg=${avgTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms, p95=${p95Time.toFixed(2)}ms`);

        expect(avgTime).toBeLessThan(test.maxTime);
        expect(p95Time).toBeLessThan(test.maxTime * 1.5);
      }
    });
  });

  describe('File Upload Performance', () => {
    test('should handle multiple photo uploads efficiently', async () => {
      const photoSizes = [
        { name: 'Small (1MB)', size: 1024 * 1024 },
        { name: 'Medium (5MB)', size: 5 * 1024 * 1024 },
        { name: 'Large (10MB)', size: 10 * 1024 * 1024 },
      ];

      for (const photoSize of photoSizes) {
        const concurrentUploads = 10;
        const mockPhotoData = Buffer.alloc(photoSize.size, 'test-photo-data');

        const uploadPromises = Array.from({ length: concurrentUploads }, async (_, i) => {
          const startTime = performance.now();
          const formData = new FormData();
          
          formData.append('photo', new Blob([mockPhotoData]), `test-photo-${i}.jpg`);
          formData.append('estimateId', `estimate${i}`);
          formData.append('roomId', 'kitchen');
          formData.append('wwTag', `WW15-${String(i + 1).padStart(3, '0')}`);

          try {
            const response = await axios.post(`${baseURL}/api/v1/photos/upload`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`,
              },
              timeout: 30000, // 30 second timeout for uploads
            });

            return {
              success: true,
              duration: performance.now() - startTime,
              size: photoSize.size,
              statusCode: response.status,
            };
          } catch (error: any) {
            return {
              success: false,
              duration: performance.now() - startTime,
              size: photoSize.size,
              error: error.message,
            };
          }
        });

        const results = await Promise.all(uploadPromises);
        const successful = results.filter(r => r.success);
        const avgUploadTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        const successRate = successful.length / results.length;

        console.log(`${photoSize.name}: ${(successRate * 100).toFixed(1)}% success, avg ${(avgUploadTime / 1000).toFixed(2)}s`);

        expect(successRate).toBeGreaterThan(0.9); // 90% success rate
        
        // Upload time expectations based on size
        const expectedMaxTime = Math.max(5000, photoSize.size / (1024 * 1024) * 2000); // 2s per MB minimum
        expect(avgUploadTime).toBeLessThan(expectedMaxTime);
      }
    });
  });

  describe('Cache Performance', () => {
    test('should demonstrate effective caching', async () => {
      const cacheableEndpoints = [
        '/api/v1/pricing/rates',
        '/api/v1/materials/types',
        '/api/v1/estimates/templates',
      ];

      for (const endpoint of cacheableEndpoints) {
        // Clear any existing cache
        await axios.delete(`${baseURL}${endpoint}/cache`, {
          headers: { 'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}` },
        }).catch(() => {}); // Ignore errors if cache clear not implemented

        // First request (cache miss)
        const firstStart = performance.now();
        const firstResponse = await axios.get(`${baseURL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}` },
        });
        const firstTime = performance.now() - firstStart;

        // Second request (should hit cache)
        const secondStart = performance.now();
        const secondResponse = await axios.get(`${baseURL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}` },
        });
        const secondTime = performance.now() - secondStart;

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);
        expect(secondResponse.data).toEqual(firstResponse.data);

        // Cached response should be significantly faster
        const improvementRatio = firstTime / secondTime;
        console.log(`${endpoint}: ${firstTime.toFixed(2)}ms → ${secondTime.toFixed(2)}ms (${improvementRatio.toFixed(1)}x faster)`);

        expect(improvementRatio).toBeGreaterThan(2); // At least 2x faster
      }
    });
  });

  describe('Memory Usage', () => {
    test('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      console.log(`Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

      // Simulate heavy API usage
      const operations = 500;
      for (let i = 0; i < operations; i++) {
        await axios.get(`${baseURL}/api/v1/estimates?limit=10&offset=${i}`, {
          headers: { 'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}` },
        }).catch(() => {}); // Ignore individual failures

        if (i % 50 === 0) {
          const currentMemory = process.memoryUsage();
          const heapGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
          
          console.log(`Operation ${i}: Heap growth ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);
          
          // Memory growth should be reasonable
          expect(heapGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const totalGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Final memory growth: ${(totalGrowth / 1024 / 1024).toFixed(2)}MB`);
      
      // Total memory growth should be reasonable
      expect(totalGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total
    });
  });
});