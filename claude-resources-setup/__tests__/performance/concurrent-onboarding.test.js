/**
 * Performance tests for concurrent user onboarding scenarios
 * Tests system behavior under high load and concurrent operations
 */

import { jest } from '@jest/globals'
import { performance } from 'perf_hooks'

// Performance test configuration
const PERFORMANCE_CONFIG = {
  // Load test scenarios
  scenarios: {
    light: { users: 10, duration: 30000 }, // 10 users over 30s
    medium: { users: 50, duration: 60000 }, // 50 users over 1m
    heavy: { users: 100, duration: 120000 }, // 100 users over 2m
    stress: { users: 500, duration: 300000 } // 500 users over 5m
  },

  // Performance thresholds
  thresholds: {
    maxResponseTime: 2000, // 2 seconds
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxCpuUsage: 80, // 80%
    minThroughput: 10, // 10 requests/sec
    maxErrorRate: 5 // 5%
  },

  // Database connection pool
  database: {
    maxConnections: 100,
    connectionTimeout: 5000,
    idleTimeout: 30000
  }
}

// Mock performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: [],
      errors: [],
      memory: [],
      cpu: [],
      database: []
    }
    this.startTime = performance.now()
  }

  recordRequest(duration, success = true, operation = 'unknown') {
    this.metrics.requests.push({
      timestamp: performance.now() - this.startTime,
      duration,
      success,
      operation
    })

    if (!success) {
      this.metrics.errors.push({
        timestamp: performance.now() - this.startTime,
        operation
      })
    }
  }

  recordMemoryUsage(usage) {
    this.metrics.memory.push({
      timestamp: performance.now() - this.startTime,
      usage
    })
  }

  recordCpuUsage(usage) {
    this.metrics.cpu.push({
      timestamp: performance.now() - this.startTime,
      usage
    })
  }

  recordDatabaseMetrics(activeConnections, queueLength, avgQueryTime) {
    this.metrics.database.push({
      timestamp: performance.now() - this.startTime,
      activeConnections,
      queueLength,
      avgQueryTime
    })
  }

  getReport() {
    const totalRequests = this.metrics.requests.length
    const successfulRequests = this.metrics.requests.filter(r => r.success).length
    const errorRate = ((totalRequests - successfulRequests) / totalRequests) * 100 || 0

    const responseTimes = this.metrics.requests.map(r => r.duration)
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0
    const maxResponseTime = Math.max(...responseTimes) || 0
    const p95ResponseTime = this.percentile(responseTimes, 95)

    const memoryUsages = this.metrics.memory.map(m => m.usage)
    const maxMemoryUsage = Math.max(...memoryUsages) || 0
    const avgMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length || 0

    const cpuUsages = this.metrics.cpu.map(c => c.usage)
    const maxCpuUsage = Math.max(...cpuUsages) || 0
    const avgCpuUsage = cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length || 0

    const testDuration = (performance.now() - this.startTime) / 1000
    const throughput = totalRequests / testDuration

    return {
      summary: {
        totalRequests,
        successfulRequests,
        errorRate,
        testDuration,
        throughput
      },
      responseTime: {
        avg: avgResponseTime,
        max: maxResponseTime,
        p95: p95ResponseTime
      },
      resources: {
        memory: {
          avg: avgMemoryUsage,
          max: maxMemoryUsage
        },
        cpu: {
          avg: avgCpuUsage,
          max: maxCpuUsage
        }
      },
      database: this.getDatabaseReport()
    }
  }

  getDatabaseReport() {
    if (this.metrics.database.length === 0) return null

    const avgConnections = this.metrics.database.reduce((sum, d) => sum + d.activeConnections, 0) / this.metrics.database.length
    const maxConnections = Math.max(...this.metrics.database.map(d => d.activeConnections))
    const avgQueueLength = this.metrics.database.reduce((sum, d) => sum + d.queueLength, 0) / this.metrics.database.length
    const avgQueryTime = this.metrics.database.reduce((sum, d) => sum + d.avgQueryTime, 0) / this.metrics.database.length

    return {
      avgConnections,
      maxConnections,
      avgQueueLength,
      avgQueryTime
    }
  }

  percentile(arr, p) {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[index]
  }
}

// Mock services with performance simulation
const mockServices = {
  onboardingService: {
    startUserOnboarding: jest.fn(),
    completeOnboardingStep: jest.fn(),
    getUserProgress: jest.fn(),
    updateUserProgress: jest.fn()
  },

  deploymentService: {
    startPhase: jest.fn(),
    updatePhaseStatus: jest.fn(),
    getPhaseMetrics: jest.fn()
  },

  databaseService: {
    query: jest.fn(),
    transaction: jest.fn(),
    getConnectionStatus: jest.fn()
  },

  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn()
  }
}

// Simulated database connection pool
class DatabaseConnectionPool {
  constructor(maxConnections = 100) {
    this.maxConnections = maxConnections
    this.activeConnections = 0
    this.waitingQueue = []
  }

  async getConnection() {
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++
      return { id: this.activeConnections, inUse: true }
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection pool timeout'))
      }, PERFORMANCE_CONFIG.database.connectionTimeout)

      this.waitingQueue.push({ resolve, reject, timeout })
    })
  }

  releaseConnection(connection) {
    this.activeConnections--

    if (this.waitingQueue.length > 0) {
      const { resolve, timeout } = this.waitingQueue.shift()
      clearTimeout(timeout)
      this.activeConnections++
      resolve({ id: this.activeConnections, inUse: true })
    }
  }

  getStatus() {
    return {
      active: this.activeConnections,
      waiting: this.waitingQueue.length,
      available: this.maxConnections - this.activeConnections
    }
  }
}

describe('Concurrent User Onboarding Performance Tests', () => {
  let performanceMonitor
  let dbPool

  beforeEach(() => {
    jest.clearAllMocks()
    performanceMonitor = new PerformanceMonitor()
    dbPool = new DatabaseConnectionPool()

    // Setup service mocks with performance simulation
    setupServiceMocks()
  })

  afterEach(() => {
    if (performanceMonitor) {
      const report = performanceMonitor.getReport()
      console.log('📊 Performance Test Report:', JSON.stringify(report, null, 2))
    }
  })

  describe('Light Load Tests', () => {
    test('should handle 10 concurrent user onboardings efficiently', async () => {
      const scenario = PERFORMANCE_CONFIG.scenarios.light
      console.log(`🚀 Starting light load test: ${scenario.users} users over ${scenario.duration/1000}s`)

      const userPromises = []
      const startTime = performance.now()

      // Start concurrent user onboardings
      for (let i = 0; i < scenario.users; i++) {
        const userId = `light-test-user-${i}`
        const promise = simulateUserOnboarding(userId, 'phase-2', performanceMonitor)
        userPromises.push(promise)

        // Stagger user starts slightly to simulate real-world behavior
        if (i < scenario.users - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Wait for all users to complete
      const results = await Promise.allSettled(userPromises)
      const duration = performance.now() - startTime

      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      const successRate = (successful / scenario.users) * 100

      console.log(`✅ Light load test completed in ${duration}ms`)
      console.log(`📈 Success rate: ${successRate}% (${successful}/${scenario.users})`)

      // Performance assertions
      expect(successRate).toBeGreaterThanOrEqual(95) // 95% success rate
      expect(duration).toBeLessThan(scenario.duration) // Complete within time limit

      const report = performanceMonitor.getReport()
      expect(report.responseTime.avg).toBeLessThan(PERFORMANCE_CONFIG.thresholds.maxResponseTime)
      expect(report.summary.errorRate).toBeLessThan(PERFORMANCE_CONFIG.thresholds.maxErrorRate)
    })

    test('should maintain database performance under light concurrent load', async () => {
      const scenario = PERFORMANCE_CONFIG.scenarios.light
      console.log('🗄️ Testing database performance under light load')

      // Simulate database monitoring
      const dbMonitoringInterval = setInterval(() => {
        const status = dbPool.getStatus()
        performanceMonitor.recordDatabaseMetrics(
          status.active,
          status.waiting,
          Math.random() * 50 + 10 // Simulate query time 10-60ms
        )
      }, 100)

      const startTime = performance.now()
      const promises = []

      for (let i = 0; i < scenario.users; i++) {
        promises.push(simulateDatabaseIntensiveOperation(i))
      }

      await Promise.allSettled(promises)
      clearInterval(dbMonitoringInterval)

      const report = performanceMonitor.getReport()

      // Database performance assertions
      expect(report.database.maxConnections).toBeLessThanOrEqual(dbPool.maxConnections)
      expect(report.database.avgQueueLength).toBeLessThan(5) // Low queue length
      expect(report.database.avgQueryTime).toBeLessThan(100) // Fast queries

      console.log(`📊 Database performance: ${report.database.avgConnections} avg connections, ${report.database.avgQueryTime}ms avg query time`)
    })
  })

  describe('Medium Load Tests', () => {
    test('should handle 50 concurrent user onboardings with acceptable performance', async () => {
      const scenario = PERFORMANCE_CONFIG.scenarios.medium
      console.log(`🚀 Starting medium load test: ${scenario.users} users over ${scenario.duration/1000}s`)

      const batchSize = 10
      const batches = []

      // Process users in batches to simulate realistic load patterns
      for (let i = 0; i < scenario.users; i += batchSize) {
        const batchUsers = []
        for (let j = 0; j < batchSize && (i + j) < scenario.users; j++) {
          const userId = `medium-test-user-${i + j}`
          batchUsers.push(simulateUserOnboarding(userId, 'phase-2', performanceMonitor))
        }
        batches.push(batchUsers)
      }

      const startTime = performance.now()
      const allResults = []

      // Process batches with intervals
      for (const batch of batches) {
        const batchResults = await Promise.allSettled(batch)
        allResults.push(...batchResults)

        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      const duration = performance.now() - startTime
      const successful = allResults.filter(r => r.status === 'fulfilled').length
      const successRate = (successful / scenario.users) * 100

      console.log(`✅ Medium load test completed in ${duration}ms`)
      console.log(`📈 Success rate: ${successRate}% (${successful}/${scenario.users})`)

      // Performance assertions for medium load
      expect(successRate).toBeGreaterThanOrEqual(90) // 90% success rate under medium load
      expect(duration).toBeLessThan(scenario.duration * 1.2) // Allow 20% buffer

      const report = performanceMonitor.getReport()
      expect(report.responseTime.avg).toBeLessThan(PERFORMANCE_CONFIG.thresholds.maxResponseTime * 1.5)
      expect(report.summary.errorRate).toBeLessThan(PERFORMANCE_CONFIG.thresholds.maxErrorRate * 2)
      expect(report.summary.throughput).toBeGreaterThan(PERFORMANCE_CONFIG.thresholds.minThroughput * 0.8)
    })

    test('should handle memory efficiently under medium load', async () => {
      const scenario = PERFORMANCE_CONFIG.scenarios.medium
      console.log('💾 Testing memory efficiency under medium load')

      // Memory monitoring
      const memoryMonitoringInterval = setInterval(() => {
        const memUsage = process.memoryUsage()
        performanceMonitor.recordMemoryUsage(memUsage.heapUsed)
      }, 250)

      const promises = Array.from({ length: scenario.users }, (_, i) =>
        simulateMemoryIntensiveOnboarding(`memory-test-user-${i}`)
      )

      await Promise.allSettled(promises)
      clearInterval(memoryMonitoringInterval)

      const report = performanceMonitor.getReport()

      // Memory assertions
      expect(report.resources.memory.max).toBeLessThan(PERFORMANCE_CONFIG.thresholds.maxMemoryUsage)
      expect(report.resources.memory.avg).toBeLessThan(PERFORMANCE_CONFIG.thresholds.maxMemoryUsage * 0.7)

      console.log(`💾 Memory usage: ${Math.round(report.resources.memory.avg / 1024 / 1024)}MB avg, ${Math.round(report.resources.memory.max / 1024 / 1024)}MB max`)
    })
  })

  describe('Heavy Load Tests', () => {
    test('should handle 100 concurrent user onboardings under stress', async () => {
      const scenario = PERFORMANCE_CONFIG.scenarios.heavy
      console.log(`🚀 Starting heavy load test: ${scenario.users} users over ${scenario.duration/1000}s`)

      // Implement circuit breaker pattern for heavy load
      let circuitBreakerOpen = false
      let failureCount = 0
      const maxFailures = 10

      const createUserOnboarding = async (userId) => {
        if (circuitBreakerOpen) {
          throw new Error('Circuit breaker open - service temporarily unavailable')
        }

        try {
          return await simulateUserOnboarding(userId, 'phase-2', performanceMonitor)
        } catch (error) {
          failureCount++
          if (failureCount >= maxFailures) {
            circuitBreakerOpen = true
            console.warn('🔴 Circuit breaker opened due to high failure rate')
          }
          throw error
        }
      }

      // Process users in waves to simulate real-world load patterns
      const waves = 5
      const usersPerWave = scenario.users / waves
      const allResults = []

      for (let wave = 0; wave < waves; wave++) {
        console.log(`🌊 Processing wave ${wave + 1}/${waves}`)

        const wavePromises = []
        for (let i = 0; i < usersPerWave; i++) {
          const userId = `heavy-test-user-${wave * usersPerWave + i}`
          wavePromises.push(createUserOnboarding(userId))
        }

        const waveResults = await Promise.allSettled(wavePromises)
        allResults.push(...waveResults)

        // Analyze wave performance
        const waveSuccess = waveResults.filter(r => r.status === 'fulfilled').length
        const waveSuccessRate = (waveSuccess / usersPerWave) * 100
        console.log(`📊 Wave ${wave + 1} success rate: ${waveSuccessRate}%`)

        // Brief pause between waves
        await new Promise(resolve => setTimeout(resolve, 500))

        // Reset circuit breaker if it was opened
        if (circuitBreakerOpen && failureCount < maxFailures * 0.5) {
          circuitBreakerOpen = false
          failureCount = 0
          console.log('🟢 Circuit breaker reset')
        }
      }

      const successful = allResults.filter(r => r.status === 'fulfilled').length
      const successRate = (successful / scenario.users) * 100

      console.log(`✅ Heavy load test completed`)
      console.log(`📈 Overall success rate: ${successRate}% (${successful}/${scenario.users})`)

      // Heavy load assertions - more lenient thresholds
      expect(successRate).toBeGreaterThanOrEqual(80) // 80% success rate under heavy load

      const report = performanceMonitor.getReport()
      expect(report.summary.errorRate).toBeLessThan(PERFORMANCE_CONFIG.thresholds.maxErrorRate * 4)
      expect(report.responseTime.p95).toBeLessThan(PERFORMANCE_CONFIG.thresholds.maxResponseTime * 3)
    })

    test('should maintain database connection pool under heavy load', async () => {
      const scenario = PERFORMANCE_CONFIG.scenarios.heavy
      console.log('🗄️ Testing database connection pool under heavy load')

      // Enhanced database monitoring
      const dbMonitoringInterval = setInterval(() => {
        const status = dbPool.getStatus()
        performanceMonitor.recordDatabaseMetrics(
          status.active,
          status.waiting,
          Math.random() * 200 + 50 // Simulate slower queries under load
        )
      }, 50)

      const promises = Array.from({ length: scenario.users }, (_, i) =>
        simulateDatabaseIntensiveOperation(i, true) // Heavy operations
      )

      const results = await Promise.allSettled(promises)
      clearInterval(dbMonitoringInterval)

      const successful = results.filter(r => r.status === 'fulfilled').length
      const report = performanceMonitor.getReport()

      // Database heavy load assertions
      expect(successful / scenario.users).toBeGreaterThan(0.85) // 85% success rate
      expect(report.database.maxConnections).toBeLessThanOrEqual(dbPool.maxConnections)
      expect(report.database.avgQueueLength).toBeLessThan(20) // Higher queue acceptable under heavy load

      console.log(`📊 Heavy DB load: ${report.database.avgConnections} avg connections, ${report.database.avgQueueLength} avg queue length`)
    })
  })

  describe('Stress Tests', () => {
    test('should gracefully degrade under extreme load (500 concurrent users)', async () => {
      const scenario = PERFORMANCE_CONFIG.scenarios.stress
      console.log(`🔥 Starting stress test: ${scenario.users} users - testing system limits`)

      // Implement backpressure and rate limiting
      const rateLimiter = {
        tokens: 50, // Start with 50 tokens
        maxTokens: 50,
        refillRate: 10, // Refill 10 tokens per second
        lastRefill: Date.now()
      }

      const refillTokens = () => {
        const now = Date.now()
        const timePassed = (now - rateLimiter.lastRefill) / 1000
        const tokensToAdd = Math.floor(timePassed * rateLimiter.refillRate)

        rateLimiter.tokens = Math.min(rateLimiter.maxTokens, rateLimiter.tokens + tokensToAdd)
        rateLimiter.lastRefill = now
      }

      const acquireToken = () => {
        refillTokens()
        if (rateLimiter.tokens > 0) {
          rateLimiter.tokens--
          return true
        }
        return false
      }

      let acceptedRequests = 0
      let rejectedRequests = 0
      const promises = []

      for (let i = 0; i < scenario.users; i++) {
        if (acquireToken()) {
          const userId = `stress-test-user-${i}`
          promises.push(simulateUserOnboarding(userId, 'phase-2', performanceMonitor))
          acceptedRequests++
        } else {
          rejectedRequests++
          // Record rate limit rejection
          performanceMonitor.recordRequest(0, false, 'rate_limited')
        }

        // Small delay to simulate request arrival pattern
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      console.log(`🎯 Accepted: ${acceptedRequests}, Rate Limited: ${rejectedRequests}`)

      const results = await Promise.allSettled(promises)
      const successful = results.filter(r => r.status === 'fulfilled').length

      const report = performanceMonitor.getReport()

      // Stress test assertions - focus on graceful degradation
      expect(acceptedRequests).toBeGreaterThan(0) // System should accept some requests
      expect(successful / acceptedRequests).toBeGreaterThan(0.7) // 70% of accepted requests should succeed
      expect(report.summary.errorRate).toBeLessThan(50) // Up to 50% error rate acceptable under stress

      console.log(`🔥 Stress test results: ${successful}/${acceptedRequests} accepted requests succeeded`)
      console.log(`📊 System demonstrated graceful degradation under extreme load`)
    })

    test('should recover after stress load is removed', async () => {
      console.log('🔄 Testing system recovery after stress')

      // First, apply some stress
      const stressPromises = Array.from({ length: 100 }, (_, i) =>
        simulateUserOnboarding(`recovery-stress-user-${i}`, 'phase-2', performanceMonitor)
      )

      await Promise.allSettled(stressPromises)
      console.log('✅ Stress load completed, testing recovery...')

      // Wait for system to recover
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Test normal operations after stress
      const recoveryPromises = Array.from({ length: 10 }, (_, i) =>
        simulateUserOnboarding(`recovery-test-user-${i}`, 'phase-2', performanceMonitor)
      )

      const recoveryResults = await Promise.allSettled(recoveryPromises)
      const recoverySuccess = recoveryResults.filter(r => r.status === 'fulfilled').length
      const recoveryRate = (recoverySuccess / 10) * 100

      // Recovery assertions
      expect(recoveryRate).toBeGreaterThanOrEqual(90) // Should recover to 90% success rate

      console.log(`🔄 Recovery success rate: ${recoveryRate}%`)
      console.log('✅ System successfully recovered from stress load')
    })
  })

  // Helper functions
  function setupServiceMocks() {
    // Simulate realistic response times and occasional failures
    mockServices.onboardingService.startUserOnboarding.mockImplementation(async (userId, phaseId) => {
      const startTime = performance.now()

      // Simulate processing time (50-200ms base + load factor)
      const baseTime = Math.random() * 150 + 50
      const loadFactor = Math.min(dbPool.getStatus().waiting * 10, 500) // Increase time with queue length
      const processingTime = baseTime + loadFactor

      await new Promise(resolve => setTimeout(resolve, processingTime))

      // Simulate occasional failures (2% failure rate)
      if (Math.random() < 0.02) {
        performanceMonitor.recordRequest(performance.now() - startTime, false, 'start_onboarding')
        throw new Error('Service temporarily unavailable')
      }

      performanceMonitor.recordRequest(performance.now() - startTime, true, 'start_onboarding')

      return {
        userId,
        phaseId,
        status: 'in_progress',
        progress: 0,
        startedAt: new Date().toISOString()
      }
    })

    mockServices.onboardingService.completeOnboardingStep.mockImplementation(async (userId, stepId) => {
      const startTime = performance.now()
      const processingTime = Math.random() * 100 + 25

      await new Promise(resolve => setTimeout(resolve, processingTime))

      // Slightly higher failure rate for step completion (3%)
      if (Math.random() < 0.03) {
        performanceMonitor.recordRequest(performance.now() - startTime, false, 'complete_step')
        throw new Error('Step completion failed')
      }

      performanceMonitor.recordRequest(performance.now() - startTime, true, 'complete_step')

      return {
        userId,
        stepId,
        status: 'completed',
        completedAt: new Date().toISOString()
      }
    })

    // Database service simulation
    mockServices.databaseService.query.mockImplementation(async (query) => {
      const connection = await dbPool.getConnection()
      const startTime = performance.now()

      try {
        // Simulate query processing time
        const queryTime = Math.random() * 50 + 10
        await new Promise(resolve => setTimeout(resolve, queryTime))

        performanceMonitor.recordRequest(performance.now() - startTime, true, 'database_query')
        return { success: true, data: [] }
      } finally {
        dbPool.releaseConnection(connection)
      }
    })
  }

  async function simulateUserOnboarding(userId, phaseId, monitor) {
    try {
      // Start onboarding
      await mockServices.onboardingService.startUserOnboarding(userId, phaseId)

      // Complete steps
      const steps = ['step-1', 'step-2', 'step-3', 'step-4']
      for (const stepId of steps) {
        await mockServices.onboardingService.completeOnboardingStep(userId, stepId)

        // Small delay between steps
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
      }

      return { userId, status: 'completed' }
    } catch (error) {
      throw new Error(`Onboarding failed for ${userId}: ${error.message}`)
    }
  }

  async function simulateDatabaseIntensiveOperation(operationId, heavy = false) {
    const queries = heavy ? 10 : 3

    for (let i = 0; i < queries; i++) {
      await mockServices.databaseService.query(`SELECT * FROM users WHERE operation_id = ${operationId}`)

      if (heavy) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
      }
    }

    return { operationId, queries }
  }

  async function simulateMemoryIntensiveOnboarding(userId) {
    // Simulate memory-intensive operations
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      userId,
      timestamp: Date.now(),
      data: `test-data-${i}`.repeat(10)
    }))

    // Process the data
    const processed = largeData.map(item => ({
      ...item,
      processed: true,
      hash: Math.random().toString(36)
    }))

    // Simulate cleanup
    await new Promise(resolve => setTimeout(resolve, 100))

    return { userId, itemsProcessed: processed.length }
  }
})
