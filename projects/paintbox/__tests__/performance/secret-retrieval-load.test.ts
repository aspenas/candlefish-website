import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { performance } from 'perf_hooks'

// Mock AWS SDK
const mockSend = jest.fn()
const mockSecretsManagerClient = jest.fn(() => ({
  send: mockSend
}))

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: mockSecretsManagerClient,
  GetSecretValueCommand: jest.fn((params) => ({ input: params })),
}))

// Mock Redis client
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  disconnect: jest.fn(),
}

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis)
})

// Import after mocks are set up
import { SecretsManager } from '../../lib/services/secrets-manager'

describe('Secret Retrieval Performance Tests', () => {
  let secretsManager: SecretsManager

  beforeEach(() => {
    jest.clearAllMocks()
    secretsManager = new SecretsManager()

    // Default mock response
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({
        api_key: 'test-api-key',
        client_secret: 'test-client-secret'
      }),
      VersionId: 'version-123',
      CreatedDate: new Date()
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Single Secret Retrieval Performance', () => {
    it('should retrieve a single secret within performance threshold', async () => {
      const startTime = performance.now()

      const result = await secretsManager.getSecret('test/performance/secret')

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(result).toHaveProperty('api_key')
      expect(duration).toBeLessThan(500) // Should complete within 500ms
    })

    it('should handle cached secret retrieval efficiently', async () => {
      // Prime the cache
      mockRedis.get.mockResolvedValueOnce(null) // Cache miss
      mockRedis.set.mockResolvedValueOnce('OK')

      const startTime1 = performance.now()
      await secretsManager.getSecretCached('test/cached/secret', 300)
      const endTime1 = performance.now()
      const firstDuration = endTime1 - startTime1

      // Second call should hit cache
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({
        data: { api_key: 'cached-key' },
        timestamp: Date.now()
      }))

      const startTime2 = performance.now()
      await secretsManager.getSecretCached('test/cached/secret', 300)
      const endTime2 = performance.now()
      const cachedDuration = endTime2 - startTime2

      expect(cachedDuration).toBeLessThan(firstDuration / 2) // Cache should be much faster
      expect(cachedDuration).toBeLessThan(50) // Cached retrieval should be under 50ms
    })

    it('should maintain performance under simulated network latency', async () => {
      // Simulate network delay
      mockSend.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              SecretString: JSON.stringify({ key: 'value' }),
              VersionId: 'version-123'
            })
          }, 200) // 200ms latency
        })
      )

      const startTime = performance.now()
      const result = await secretsManager.getSecret('test/latency/secret')
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(result).toHaveProperty('key')
      expect(duration).toBeGreaterThan(200) // Should include the simulated latency
      expect(duration).toBeLessThan(300) // But not too much overhead
    })
  })

  describe('Concurrent Secret Retrieval Performance', () => {
    it('should handle moderate concurrent load efficiently', async () => {
      const concurrentRequests = 10
      const secretNames = Array.from({ length: concurrentRequests }, (_, i) =>
        `test/concurrent/secret-${i}`
      )

      const startTime = performance.now()

      const promises = secretNames.map(name =>
        secretsManager.getSecret(name)
      )

      const results = await Promise.all(promises)

      const endTime = performance.now()
      const totalDuration = endTime - startTime

      expect(results).toHaveLength(concurrentRequests)
      expect(results.every(result => result.api_key === 'test-api-key')).toBe(true)

      // Should complete all requests within reasonable time
      expect(totalDuration).toBeLessThan(2000) // 2 seconds for 10 concurrent requests

      // Average time per request should be reasonable
      const avgDuration = totalDuration / concurrentRequests
      expect(avgDuration).toBeLessThan(200) // Average under 200ms per request
    })

    it('should handle high concurrent load with connection pooling', async () => {
      const highConcurrentRequests = 50
      const secretNames = Array.from({ length: highConcurrentRequests }, (_, i) =>
        `test/high-load/secret-${i}`
      )

      const startTime = performance.now()

      const promises = secretNames.map(name =>
        secretsManager.getSecret(name)
      )

      const results = await Promise.all(promises)

      const endTime = performance.now()
      const totalDuration = endTime - startTime

      expect(results).toHaveLength(highConcurrentRequests)

      // Should handle high load without timing out
      expect(totalDuration).toBeLessThan(10000) // 10 seconds for 50 concurrent requests

      // Should not overwhelm the connection pool
      expect(mockSend).toHaveBeenCalledTimes(highConcurrentRequests)
    })

    it('should implement backpressure for extreme load', async () => {
      const extremeLoad = 100
      const secretNames = Array.from({ length: extremeLoad }, (_, i) =>
        `test/extreme-load/secret-${i}`
      )

      // Mock some requests to fail due to throttling
      let callCount = 0
      mockSend.mockImplementation(() => {
        callCount++
        if (callCount > 20) {
          return Promise.reject({
            name: 'ThrottlingException',
            message: 'Rate exceeded'
          })
        }
        return Promise.resolve({
          SecretString: JSON.stringify({ key: 'value' }),
          VersionId: 'version-123'
        })
      })

      const startTime = performance.now()

      const promises = secretNames.map(name =>
        secretsManager.getSecretWithBackoff(name, 3, 100)
      )

      const results = await Promise.allSettled(promises)

      const endTime = performance.now()
      const totalDuration = endTime - startTime

      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      console.log(`Extreme load test: ${successful.length} succeeded, ${failed.length} failed in ${totalDuration}ms`)

      // Should have some successful requests despite throttling
      expect(successful.length).toBeGreaterThan(10)

      // Should complete within reasonable time even with retries
      expect(totalDuration).toBeLessThan(30000) // 30 seconds max
    })
  })

  describe('Cache Performance Tests', () => {
    it('should demonstrate significant performance improvement with caching', async () => {
      const secretName = 'test/cache-performance/secret'
      const iterations = 20

      // Measure uncached performance
      mockRedis.get.mockResolvedValue(null) // Always cache miss

      const uncachedTimes = []
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        await secretsManager.getSecret(secretName)
        const endTime = performance.now()
        uncachedTimes.push(endTime - startTime)
      }

      const avgUncachedTime = uncachedTimes.reduce((a, b) => a + b, 0) / iterations

      // Measure cached performance
      mockRedis.get.mockResolvedValue(JSON.stringify({
        data: { api_key: 'cached-key' },
        timestamp: Date.now()
      }))

      const cachedTimes = []
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        await secretsManager.getSecretCached(secretName, 300)
        const endTime = performance.now()
        cachedTimes.push(endTime - startTime)
      }

      const avgCachedTime = cachedTimes.reduce((a, b) => a + b, 0) / iterations

      console.log(`Avg uncached time: ${avgUncachedTime.toFixed(2)}ms`)
      console.log(`Avg cached time: ${avgCachedTime.toFixed(2)}ms`)
      console.log(`Cache performance improvement: ${(avgUncachedTime / avgCachedTime).toFixed(2)}x`)

      // Cache should be significantly faster
      expect(avgCachedTime).toBeLessThan(avgUncachedTime / 5) // At least 5x faster
      expect(avgCachedTime).toBeLessThan(10) // Cached should be very fast
    })

    it('should handle cache stampede scenarios', async () => {
      const secretName = 'test/cache-stampede/secret'
      const concurrentRequests = 20

      // Simulate cache miss for all requests initially
      let cacheCallCount = 0
      mockRedis.get.mockImplementation(() => {
        cacheCallCount++
        return Promise.resolve(null) // Cache miss
      })

      let awsCallCount = 0
      mockSend.mockImplementation(() => {
        awsCallCount++
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              SecretString: JSON.stringify({ key: 'value' }),
              VersionId: 'version-123'
            })
          }, 100) // 100ms delay to simulate AWS call
        })
      })

      const startTime = performance.now()

      const promises = Array.from({ length: concurrentRequests }, () =>
        secretsManager.getSecretWithCacheStampedeProtection(secretName, 300)
      )

      const results = await Promise.all(promises)

      const endTime = performance.now()
      const totalDuration = endTime - startTime

      expect(results).toHaveLength(concurrentRequests)
      expect(results.every(result => result.key === 'value')).toBe(true)

      // Should have made far fewer AWS calls than concurrent requests
      // due to stampede protection
      expect(awsCallCount).toBeLessThan(concurrentRequests / 2)

      console.log(`Cache stampede test: ${concurrentRequests} requests, ${awsCallCount} AWS calls in ${totalDuration}ms`)
    })
  })

  describe('Memory and Resource Performance', () => {
    it('should not leak memory during repeated secret retrievals', async () => {
      const initialMemory = process.memoryUsage()

      const iterations = 100
      for (let i = 0; i < iterations; i++) {
        await secretsManager.getSecret(`test/memory/secret-${i}`)

        // Force garbage collection periodically
        if (i % 20 === 0 && global.gc) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage()

      // Memory usage should not grow excessively
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      const heapGrowthMB = heapGrowth / (1024 * 1024)

      console.log(`Memory growth: ${heapGrowthMB.toFixed(2)}MB over ${iterations} iterations`)

      // Should not grow more than 50MB for 100 iterations
      expect(heapGrowthMB).toBeLessThan(50)
    })

    it('should manage connection pool efficiently', async () => {
      const poolSize = 10
      const totalRequests = 50

      // Track connection creation
      let connectionCount = 0
      mockSecretsManagerClient.mockImplementation(() => {
        connectionCount++
        return { send: mockSend }
      })

      const startTime = performance.now()

      const promises = Array.from({ length: totalRequests }, (_, i) =>
        secretsManager.getSecretWithPooling(`test/pool/secret-${i}`, poolSize)
      )

      await Promise.all(promises)

      const endTime = performance.now()
      const totalDuration = endTime - startTime

      // Should reuse connections from pool
      expect(connectionCount).toBeLessThanOrEqual(poolSize)

      console.log(`Connection pool test: ${totalRequests} requests, ${connectionCount} connections created in ${totalDuration}ms`)
    })
  })

  describe('Error Handling Performance', () => {
    it('should handle transient errors efficiently with retry', async () => {
      let callCount = 0
      mockSend.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject({
            name: 'InternalServiceError',
            message: 'Temporary failure'
          })
        }
        return Promise.resolve({
          SecretString: JSON.stringify({ key: 'value' }),
          VersionId: 'version-123'
        })
      })

      const startTime = performance.now()

      const result = await secretsManager.getSecretWithRetry('test/retry/secret', 3, 50)

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(result).toHaveProperty('key', 'value')
      expect(callCount).toBe(2) // One failure, one success

      // Should complete quickly with minimal retry delay
      expect(duration).toBeLessThan(200) // Under 200ms including retry
    })

    it('should timeout gracefully on slow responses', async () => {
      mockSend.mockImplementation(() =>
        new Promise((resolve) => {
          // Never resolve - simulate hanging request
          setTimeout(() => {
            resolve({
              SecretString: JSON.stringify({ key: 'value' }),
              VersionId: 'version-123'
            })
          }, 10000) // 10 second delay
        })
      )

      const startTime = performance.now()

      try {
        await secretsManager.getSecretWithTimeout('test/timeout/secret', 1000) // 1 second timeout
        fail('Should have timed out')
      } catch (error) {
        const endTime = performance.now()
        const duration = endTime - startTime

        expect(error.message).toMatch(/timeout/i)
        expect(duration).toBeLessThan(1500) // Should timeout around 1 second
        expect(duration).toBeGreaterThan(900) // But close to the timeout value
      }
    })
  })

  describe('Batch Operations Performance', () => {
    it('should efficiently retrieve multiple secrets in batch', async () => {
      const secretNames = Array.from({ length: 10 }, (_, i) =>
        `test/batch/secret-${i}`
      )

      const startTime = performance.now()

      const results = await secretsManager.getSecretsInBatch(secretNames, 5) // Batch size 5

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(Object.keys(results)).toHaveLength(10)
      expect(Object.values(results).every(secret => secret.api_key === 'test-api-key')).toBe(true)

      // Batch operation should be faster than individual calls
      expect(duration).toBeLessThan(1000) // Under 1 second for 10 secrets

      console.log(`Batch retrieval: 10 secrets in ${duration.toFixed(2)}ms`)
    })

    it('should optimize batch size for best performance', async () => {
      const secretNames = Array.from({ length: 20 }, (_, i) =>
        `test/batch-optimization/secret-${i}`
      )

      const batchSizes = [1, 5, 10, 20]
      const results = []

      for (const batchSize of batchSizes) {
        const startTime = performance.now()

        await secretsManager.getSecretsInBatch(secretNames, batchSize)

        const endTime = performance.now()
        const duration = endTime - startTime

        results.push({ batchSize, duration })
        console.log(`Batch size ${batchSize}: ${duration.toFixed(2)}ms`)
      }

      // Find optimal batch size (usually medium batch sizes perform best)
      const optimal = results.reduce((best, current) =>
        current.duration < best.duration ? current : best
      )

      console.log(`Optimal batch size: ${optimal.batchSize} (${optimal.duration.toFixed(2)}ms)`)

      // Optimal should be better than batch size 1
      const singleBatch = results.find(r => r.batchSize === 1)
      expect(optimal.duration).toBeLessThan(singleBatch!.duration)
    })
  })

  describe('Load Testing Scenarios', () => {
    it('should maintain performance under sustained load', async () => {
      const duration = 5000 // 5 seconds
      const requestsPerSecond = 20
      const totalRequests = Math.floor((duration * requestsPerSecond) / 1000)

      let completedRequests = 0
      let totalResponseTime = 0
      const errors = []

      const startTime = performance.now()
      const endTime = startTime + duration

      const makeRequest = async (index: number) => {
        const reqStartTime = performance.now()
        try {
          await secretsManager.getSecret(`test/sustained-load/secret-${index}`)
          const reqEndTime = performance.now()
          totalResponseTime += (reqEndTime - reqStartTime)
          completedRequests++
        } catch (error) {
          errors.push(error)
        }
      }

      // Start requests at regular intervals
      const promises = []
      for (let i = 0; i < totalRequests; i++) {
        const delay = (i * 1000) / requestsPerSecond
        promises.push(
          new Promise(resolve => {
            setTimeout(() => {
              resolve(makeRequest(i))
            }, delay)
          })
        )
      }

      await Promise.all(promises)

      const actualDuration = performance.now() - startTime
      const actualRPS = (completedRequests * 1000) / actualDuration
      const avgResponseTime = totalResponseTime / completedRequests

      console.log(`Sustained load test results:`)
      console.log(`- Duration: ${actualDuration.toFixed(0)}ms`)
      console.log(`- Completed requests: ${completedRequests}/${totalRequests}`)
      console.log(`- Actual RPS: ${actualRPS.toFixed(2)}`)
      console.log(`- Average response time: ${avgResponseTime.toFixed(2)}ms`)
      console.log(`- Errors: ${errors.length}`)

      // Performance expectations
      expect(completedRequests).toBeGreaterThan(totalRequests * 0.9) // 90% success rate
      expect(avgResponseTime).toBeLessThan(200) // Average under 200ms
      expect(errors.length).toBeLessThan(totalRequests * 0.1) // Less than 10% errors
    })

    it('should handle traffic spikes gracefully', async () => {
      // Simulate traffic spike pattern
      const phases = [
        { requests: 5, name: 'baseline' },
        { requests: 50, name: 'spike' },
        { requests: 5, name: 'cooldown' }
      ]

      const results = []

      for (const phase of phases) {
        const startTime = performance.now()

        const promises = Array.from({ length: phase.requests }, (_, i) =>
          secretsManager.getSecret(`test/traffic-spike/${phase.name}-${i}`)
        )

        const phaseResults = await Promise.allSettled(promises)

        const endTime = performance.now()
        const duration = endTime - startTime

        const successful = phaseResults.filter(r => r.status === 'fulfilled').length
        const failed = phaseResults.filter(r => r.status === 'rejected').length

        results.push({
          phase: phase.name,
          requests: phase.requests,
          successful,
          failed,
          duration,
          avgTime: duration / phase.requests
        })

        console.log(`${phase.name} phase: ${successful}/${phase.requests} successful in ${duration.toFixed(2)}ms`)
      }

      // Should handle spike without complete failure
      const spikePhase = results.find(r => r.phase === 'spike')!
      expect(spikePhase.successful).toBeGreaterThan(spikePhase.requests * 0.7) // 70% success during spike

      // Should recover after spike
      const cooldownPhase = results.find(r => r.phase === 'cooldown')!
      expect(cooldownPhase.successful).toBeGreaterThan(cooldownPhase.requests * 0.9) // 90% success after spike
    })
  })
})
