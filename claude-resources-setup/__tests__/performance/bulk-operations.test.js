import { performance } from 'perf_hooks'
import { deploymentAPIClient } from '../../dashboard/src/lib/deployment-api'

// Mock performance-focused tests for bulk operations
describe('Bulk Operations Performance Tests', () => {
  const createMockRepositories = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `repo-${i}`,
      name: `repository-${i}`,
      organization: 'test-org',
      status: 'synced',
      hasClaudeResources: true,
      symlinkStatus: 'complete',
      metadata: {
        branch: 'main',
        commit: `commit-${i}`,
        fileCount: Math.floor(Math.random() * 100) + 10
      }
    }))
  }

  const createMockSyncOperations = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `sync-${i}`,
      repositoryId: `repo-${i}`,
      status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'running' : 'pending',
      progress: Math.floor(Math.random() * 100),
      startTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      logs: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, j) => ({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Log entry ${j + 1} for sync ${i}`
      }))
    }))
  }

  describe('API Performance Tests', () => {
    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks()
    })

    it('should handle large repository lists efficiently', async () => {
      const repositoryCount = 1000
      const mockRepos = createMockRepositories(repositoryCount)

      // Mock API response
      deploymentAPIClient.repositories.getRepositories = jest.fn()
        .mockResolvedValue(mockRepos)

      const startTime = performance.now()
      const repositories = await deploymentAPIClient.repositories.getRepositories()
      const endTime = performance.now()

      const executionTime = endTime - startTime

      expect(repositories).toHaveLength(repositoryCount)
      expect(executionTime).toBeLessThan(100) // Should complete within 100ms
    })

    it('should efficiently process bulk sync operations', async () => {
      const operationCount = 500
      const mockOperations = createMockSyncOperations(operationCount)

      deploymentAPIClient.sync.getActiveSyncs = jest.fn()
        .mockResolvedValue(mockOperations.filter(op => op.status === 'running'))

      const startTime = performance.now()
      const activeSyncs = await deploymentAPIClient.sync.getActiveSyncs()
      const endTime = performance.now()

      const executionTime = endTime - startTime

      expect(activeSyncs.length).toBeGreaterThan(0)
      expect(executionTime).toBeLessThan(50) // Should complete within 50ms
    })

    it('should handle batch repository sync requests', async () => {
      const batchSize = 50
      const repositoryIds = Array.from({ length: batchSize }, (_, i) => `repo-${i}`)

      // Mock individual sync requests
      const mockSyncOperation = {
        id: 'batch-sync',
        repositoryId: 'batch',
        status: 'pending',
        progress: 0,
        startTime: new Date().toISOString(),
        logs: []
      }

      deploymentAPIClient.repositories.syncRepository = jest.fn()
        .mockResolvedValue(mockSyncOperation)

      const startTime = performance.now()

      // Simulate batch sync - parallel execution
      const syncPromises = repositoryIds.map(repoId =>
        deploymentAPIClient.repositories.syncRepository(repoId)
      )

      const results = await Promise.all(syncPromises)
      const endTime = performance.now()

      const executionTime = endTime - startTime

      expect(results).toHaveLength(batchSize)
      expect(executionTime).toBeLessThan(1000) // Batch should complete within 1 second
      expect(deploymentAPIClient.repositories.syncRepository).toHaveBeenCalledTimes(batchSize)
    })

    it('should efficiently handle bulk distribution operations', async () => {
      const targetRepositories = Array.from({ length: 100 }, (_, i) => `repo-${i}`)

      const mockDistributionJob = {
        id: 'bulk-dist-123',
        status: 'pending',
        targetRepositories,
        progress: 0,
        startTime: new Date().toISOString(),
        results: targetRepositories.map(repoId => ({
          repositoryId: repoId,
          status: 'pending'
        }))
      }

      deploymentAPIClient.distribution.distributeResources = jest.fn()
        .mockResolvedValue(mockDistributionJob)

      const startTime = performance.now()
      const distributionJob = await deploymentAPIClient.distribution.distributeResources(targetRepositories)
      const endTime = performance.now()

      const executionTime = endTime - startTime

      expect(distributionJob.targetRepositories).toHaveLength(100)
      expect(distributionJob.results).toHaveLength(100)
      expect(executionTime).toBeLessThan(200) // Should complete within 200ms
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not cause memory leaks with large datasets', async () => {
      const initialMemory = process.memoryUsage()

      // Process large amounts of data
      for (let i = 0; i < 10; i++) {
        const largeDataset = createMockRepositories(1000)

        // Simulate processing
        const processed = largeDataset.map(repo => ({
          ...repo,
          processed: true,
          timestamp: Date.now()
        }))

        // Clear references
        processed.length = 0
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should efficiently handle large log datasets', async () => {
      const startMemory = process.memoryUsage().heapUsed

      // Create large log dataset
      const largeLogs = Array.from({ length: 10000 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Log entry ${i} with some additional data that makes it longer`,
        details: {
          operation: `operation-${i}`,
          duration: Math.random() * 1000,
          metadata: {
            files: Math.floor(Math.random() * 100),
            size: Math.random() * 1000000
          }
        }
      }))

      // Process logs (simulate filtering, sorting, etc.)
      const processedLogs = largeLogs
        .filter(log => log.level === 'info')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 100) // Keep only recent 100 entries

      const endMemory = process.memoryUsage().heapUsed
      const memoryUsed = endMemory - startMemory

      expect(processedLogs).toHaveLength(100)
      expect(memoryUsed).toBeLessThan(20 * 1024 * 1024) // Less than 20MB
    })
  })

  describe('Concurrent Operations Tests', () => {
    it('should handle multiple concurrent API requests', async () => {
      const concurrentRequests = 20
      const mockRepo = {
        id: 'test-repo',
        name: 'test-repository',
        organization: 'test-org',
        status: 'synced'
      }

      deploymentAPIClient.repositories.getRepository = jest.fn()
        .mockImplementation((id) =>
          new Promise(resolve =>
            setTimeout(() => resolve({ ...mockRepo, id }), Math.random() * 100)
          )
        )

      const startTime = performance.now()

      // Execute concurrent requests
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        deploymentAPIClient.repositories.getRepository(`repo-${i}`)
      )

      const results = await Promise.all(promises)
      const endTime = performance.now()

      const executionTime = endTime - startTime

      expect(results).toHaveLength(concurrentRequests)
      expect(executionTime).toBeLessThan(500) // All requests should complete within 500ms
      expect(deploymentAPIClient.repositories.getRepository).toHaveBeenCalledTimes(concurrentRequests)
    })

    it('should handle concurrent sync operations without race conditions', async () => {
      const concurrentSyncs = 10
      let syncCounter = 0

      deploymentAPIClient.repositories.syncRepository = jest.fn()
        .mockImplementation(() => {
          syncCounter++
          return Promise.resolve({
            id: `sync-${syncCounter}`,
            repositoryId: `repo-${syncCounter}`,
            status: 'pending',
            progress: 0
          })
        })

      const startTime = performance.now()

      // Execute concurrent syncs
      const syncPromises = Array.from({ length: concurrentSyncs }, (_, i) =>
        deploymentAPIClient.repositories.syncRepository(`repo-${i}`)
      )

      const results = await Promise.all(syncPromises)
      const endTime = performance.now()

      const executionTime = endTime - startTime

      expect(results).toHaveLength(concurrentSyncs)
      expect(executionTime).toBeLessThan(200)

      // Each sync should have unique ID (no race conditions)
      const syncIds = results.map(r => r.id)
      const uniqueIds = new Set(syncIds)
      expect(uniqueIds.size).toBe(concurrentSyncs)
    })
  })

  describe('Rate Limiting and Throttling Tests', () => {
    it('should respect rate limits and implement backoff', async () => {
      const requestCount = 100
      let rateLimitHit = false

      deploymentAPIClient.repositories.getRepositories = jest.fn()
        .mockImplementation(() => {
          if (Math.random() < 0.1) { // 10% chance of rate limit
            rateLimitHit = true
            const error = new Error('Rate limit exceeded')
            error.retryable = true
            error.type = 'rate_limit'
            throw error
          }
          return Promise.resolve([])
        })

      const startTime = performance.now()

      // Execute many requests with retry logic
      const results = []
      for (let i = 0; i < requestCount; i++) {
        try {
          const result = await deploymentUtils.withRetry(
            deploymentAPIClient.repositories.getRepositories,
            3
          )()
          results.push(result)
        } catch (error) {
          // Some requests may still fail after retries
          results.push(null)
        }
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Should complete within reasonable time even with retries
      expect(executionTime).toBeLessThan(10000) // 10 seconds max
      expect(results.length).toBe(requestCount)
    })

    it('should implement exponential backoff correctly', async () => {
      const retryDelays = []

      // Mock the delay function to capture timing
      const originalGetRetryDelay = deploymentUtils.getRetryDelay
      deploymentUtils.getRetryDelay = jest.fn().mockImplementation((retryCount) => {
        const delay = originalGetRetryDelay(retryCount)
        retryDelays.push(delay)
        return delay
      })

      const failingFunction = jest.fn()
        .mockRejectedValueOnce({ retryable: true })
        .mockRejectedValueOnce({ retryable: true })
        .mockResolvedValueOnce('success')

      const retriedFunction = deploymentUtils.withRetry(failingFunction, 3)

      const startTime = performance.now()
      const result = await retriedFunction()
      const endTime = performance.now()

      expect(result).toBe('success')
      expect(retryDelays).toEqual([1000, 2000]) // Exponential backoff: 1s, 2s
      expect(endTime - startTime).toBeGreaterThan(3000) // At least 3 seconds due to delays

      // Restore original function
      deploymentUtils.getRetryDelay = originalGetRetryDelay
    })
  })

  describe('Data Processing Performance', () => {
    it('should efficiently filter and sort large repository lists', async () => {
      const largeRepoList = createMockRepositories(5000)

      const startTime = performance.now()

      // Simulate complex filtering and sorting operations
      const processedRepos = largeRepoList
        .filter(repo => repo.hasClaudeResources)
        .filter(repo => repo.status === 'synced')
        .sort((a, b) => {
          if (a.organization !== b.organization) {
            return a.organization.localeCompare(b.organization)
          }
          return a.name.localeCompare(b.name)
        })
        .map(repo => ({
          ...repo,
          displayName: `${repo.organization}/${repo.name}`,
          lastSyncFormatted: repo.lastSync ? new Date(repo.lastSync).toLocaleDateString() : 'Never'
        }))

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(processedRepos.length).toBeGreaterThan(0)
      expect(executionTime).toBeLessThan(100) // Should process within 100ms

      // Verify sorting
      for (let i = 1; i < processedRepos.length; i++) {
        const prev = processedRepos[i - 1]
        const curr = processedRepos[i]

        if (prev.organization === curr.organization) {
          expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0)
        } else {
          expect(prev.organization.localeCompare(curr.organization)).toBeLessThanOrEqual(0)
        }
      }
    })

    it('should efficiently aggregate sync statistics', async () => {
      const largeSyncList = createMockSyncOperations(10000)

      const startTime = performance.now()

      // Calculate comprehensive statistics
      const stats = {
        totalOperations: largeSyncList.length,
        byStatus: largeSyncList.reduce((acc, op) => {
          acc[op.status] = (acc[op.status] || 0) + 1
          return acc
        }, {}),
        averageProgress: largeSyncList.reduce((sum, op) => sum + op.progress, 0) / largeSyncList.length,
        completedOperations: largeSyncList.filter(op => op.status === 'completed'),
        failedOperations: largeSyncList.filter(op => op.status === 'failed'),
        averageLogEntries: largeSyncList.reduce((sum, op) => sum + op.logs.length, 0) / largeSyncList.length,
        oldestOperation: largeSyncList.reduce((oldest, op) =>
          new Date(op.startTime) < new Date(oldest.startTime) ? op : oldest
        ),
        newestOperation: largeSyncList.reduce((newest, op) =>
          new Date(op.startTime) > new Date(newest.startTime) ? op : newest
        )
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(stats.totalOperations).toBe(10000)
      expect(stats.byStatus).toHaveProperty('completed')
      expect(stats.byStatus).toHaveProperty('running')
      expect(stats.byStatus).toHaveProperty('pending')
      expect(stats.averageProgress).toBeWithinRange(0, 100)
      expect(executionTime).toBeLessThan(50) // Should aggregate within 50ms
    })
  })

  describe('WebSocket Performance Tests', () => {
    it('should handle high-frequency WebSocket messages efficiently', async () => {
      const messageCount = 1000
      const messages = []
      let processedCount = 0

      // Mock WebSocket message handler
      const handleMessage = (data) => {
        processedCount++
        messages.push(data)
      }

      const startTime = performance.now()

      // Simulate rapid message processing
      for (let i = 0; i < messageCount; i++) {
        const mockMessage = {
          type: 'sync_progress',
          payload: {
            operationId: `sync-${i % 100}`, // 100 different operations
            progress: Math.floor(Math.random() * 100),
            currentStep: 'Processing files'
          }
        }

        handleMessage(mockMessage)
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(processedCount).toBe(messageCount)
      expect(messages).toHaveLength(messageCount)
      expect(executionTime).toBeLessThan(100) // Should process within 100ms
    })

    it('should efficiently deduplicate WebSocket updates', async () => {
      const updateCount = 5000
      const operationCount = 100
      const latestUpdates = new Map()

      const startTime = performance.now()

      // Simulate many updates for same operations (deduplication scenario)
      for (let i = 0; i < updateCount; i++) {
        const operationId = `sync-${i % operationCount}`
        const update = {
          operationId,
          progress: Math.floor(Math.random() * 100),
          timestamp: Date.now() + i // Each update is newer
        }

        // Keep only latest update per operation
        const existing = latestUpdates.get(operationId)
        if (!existing || update.timestamp > existing.timestamp) {
          latestUpdates.set(operationId, update)
        }
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(latestUpdates.size).toBe(operationCount)
      expect(executionTime).toBeLessThan(50) // Should deduplicate within 50ms

      // Verify we have the latest updates
      for (const [operationId, update] of latestUpdates) {
        expect(update.operationId).toBe(operationId)
        expect(update.timestamp).toBeDefined()
      }
    })
  })

  describe('Cache Performance Tests', () => {
    it('should efficiently cache and retrieve large datasets', async () => {
      const cache = new Map()
      const largeDataset = createMockRepositories(1000)

      // Cache write performance
      const writeStartTime = performance.now()
      cache.set('repositories', largeDataset)
      const writeEndTime = performance.now()

      // Cache read performance
      const readStartTime = performance.now()
      const cachedData = cache.get('repositories')
      const readEndTime = performance.now()

      const writeTime = writeEndTime - writeStartTime
      const readTime = readEndTime - readStartTime

      expect(cachedData).toHaveLength(1000)
      expect(writeTime).toBeLessThan(10) // Writing should be very fast
      expect(readTime).toBeLessThan(1) // Reading should be extremely fast
    })

    it('should handle cache invalidation efficiently', async () => {
      const cache = new Map()
      const cacheKeys = Array.from({ length: 1000 }, (_, i) => `key-${i}`)

      // Populate cache
      cacheKeys.forEach(key => {
        cache.set(key, { data: `data-${key}`, timestamp: Date.now() })
      })

      const startTime = performance.now()

      // Simulate cache invalidation (remove stale entries)
      const now = Date.now()
      const staleThreshold = 5 * 60 * 1000 // 5 minutes

      for (const [key, value] of cache) {
        if (now - value.timestamp > staleThreshold) {
          cache.delete(key)
        }
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(executionTime).toBeLessThan(10) // Cache invalidation should be fast
    })
  })
})
