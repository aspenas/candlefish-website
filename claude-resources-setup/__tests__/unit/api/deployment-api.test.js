import {
  repositoryApi,
  syncApi,
  distributionApi,
  systemApi,
  deploymentUtils,
  DeploymentWebSocket
} from '../../../dashboard/src/lib/deployment-api'
import { server } from '../../mocks/server'
import { rest } from 'msw'

const API_BASE = '/api'

describe('Deployment API', () => {
  describe('repositoryApi', () => {
    describe('getRepositories', () => {
      it('should fetch all repositories successfully', async () => {
        const repositories = await repositoryApi.getRepositories()

        expect(repositories).toHaveLength(3)
        expect(repositories[0]).toMatchObject({
          id: 'repo-1',
          name: 'claude-resources-setup',
          organization: 'candlefish-ai',
          status: 'synced'
        })
      })

      it('should handle network errors', async () => {
        server.use(
          rest.get(`${API_BASE}/repositories`, (req, res, ctx) => {
            return res.networkError('Network connection failed')
          })
        )

        await expect(repositoryApi.getRepositories()).rejects.toThrow('Network Error')
      })

      it('should handle server errors', async () => {
        server.use(
          rest.get(`${API_BASE}/repositories`, (req, res, ctx) => {
            return res(ctx.status(500), ctx.json({ message: 'Internal server error' }))
          })
        )

        await expect(repositoryApi.getRepositories()).rejects.toMatchObject({
          type: 'server',
          title: 'HTTP 500'
        })
      })
    })

    describe('getRepository', () => {
      it('should fetch a specific repository by ID', async () => {
        const repository = await repositoryApi.getRepository('repo-1')

        expect(repository).toMatchObject({
          id: 'repo-1',
          name: 'claude-resources-setup',
          status: 'synced'
        })
      })

      it('should handle repository not found', async () => {
        await expect(repositoryApi.getRepository('non-existent')).rejects.toMatchObject({
          type: 'validation'
        })
      })
    })

    describe('syncRepository', () => {
      it('should trigger repository sync successfully', async () => {
        const syncOperation = await repositoryApi.syncRepository('repo-1')

        expect(syncOperation).toMatchObject({
          repositoryId: 'repo-1',
          status: 'pending',
          progress: 0
        })
        expect(syncOperation.id).toMatch(/^sync-\d+$/)
        expect(syncOperation.logs).toHaveLength(1)
      })

      it('should handle invalid repository ID', async () => {
        await expect(repositoryApi.syncRepository('invalid-repo')).rejects.toMatchObject({
          type: 'validation'
        })
      })
    })

    describe('setupLocalSymlinks', () => {
      it('should setup local symlinks successfully', async () => {
        const result = await repositoryApi.setupLocalSymlinks('repo-1')

        expect(result).toMatchObject({
          success: true,
          message: expect.stringContaining('claude-resources-setup')
        })
      })
    })
  })

  describe('syncApi', () => {
    describe('getSyncOperation', () => {
      it('should fetch sync operation by ID', async () => {
        const operation = await syncApi.getSyncOperation('sync-1')

        expect(operation).toMatchObject({
          id: 'sync-1',
          repositoryId: 'repo-1',
          status: 'completed',
          progress: 100
        })
      })

      it('should handle operation not found', async () => {
        await expect(syncApi.getSyncOperation('non-existent')).rejects.toMatchObject({
          type: 'validation'
        })
      })
    })

    describe('getActiveSyncs', () => {
      it('should fetch only active sync operations', async () => {
        const activeSyncs = await syncApi.getActiveSyncs()

        expect(activeSyncs).toHaveLength(1)
        expect(activeSyncs[0].status).toBe('running')
      })
    })

    describe('cancelSync', () => {
      it('should cancel sync operation successfully', async () => {
        const result = await syncApi.cancelSync('sync-2')

        expect(result).toMatchObject({
          success: true,
          message: 'Sync operation cancelled'
        })
      })
    })
  })

  describe('distributionApi', () => {
    describe('distributeResources', () => {
      it('should create distribution job successfully', async () => {
        const targetRepositories = ['repo-1', 'repo-2']
        const distributionJob = await distributionApi.distributeResources(targetRepositories)

        expect(distributionJob).toMatchObject({
          status: 'pending',
          targetRepositories,
          progress: 0
        })
        expect(distributionJob.id).toMatch(/^dist-\d+$/)
        expect(distributionJob.results).toHaveLength(2)
      })

      it('should validate target repositories parameter', async () => {
        await expect(distributionApi.distributeResources()).rejects.toMatchObject({
          type: 'validation'
        })

        await expect(distributionApi.distributeResources('not-an-array')).rejects.toMatchObject({
          type: 'validation'
        })
      })
    })

    describe('getDistributionJob', () => {
      it('should fetch distribution job by ID', async () => {
        const job = await distributionApi.getDistributionJob('dist-1')

        expect(job).toMatchObject({
          id: 'dist-1',
          status: 'completed',
          progress: 100
        })
      })
    })

    describe('getDistributionJobs', () => {
      it('should fetch all distribution jobs', async () => {
        const jobs = await distributionApi.getDistributionJobs()

        expect(jobs).toHaveLength(2)
        expect(jobs[0].status).toBe('completed')
        expect(jobs[1].status).toBe('running')
      })
    })
  })

  describe('systemApi', () => {
    describe('getSystemStatus', () => {
      it('should fetch system status overview', async () => {
        const status = await systemApi.getSystemStatus()

        expect(status).toMatchObject({
          overallHealth: 'healthy',
          totalRepositories: 12,
          syncedRepositories: 9,
          pendingSyncs: 2,
          failedSyncs: 1,
          resourcesVersion: 'v2.1.0'
        })
        expect(status.components).toHaveProperty('syncService', 'healthy')
      })
    })

    describe('getServiceHealth', () => {
      it('should fetch specific service health', async () => {
        const health = await systemApi.getServiceHealth('syncService')

        expect(health).toMatchObject({
          status: 'healthy',
          lastCheck: expect.any(String),
          details: expect.objectContaining({
            uptime: expect.any(Number),
            memory: expect.any(Number),
            cpu: expect.any(Number)
          })
        })
      })

      it('should handle invalid service name', async () => {
        await expect(systemApi.getServiceHealth('invalidService')).rejects.toMatchObject({
          type: 'validation'
        })
      })
    })

    describe('validateConfiguration', () => {
      it('should validate system configuration', async () => {
        const validation = await systemApi.validateConfiguration()

        expect(validation).toMatchObject({
          valid: true,
          issues: []
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      server.use(
        rest.get(`${API_BASE}/error/timeout`, (req, res, ctx) => {
          return res(ctx.delay('infinite'))
        })
      )

      const apiClient = repositoryApi
      await expect(
        fetch('/api/error/timeout').then(res => res.json())
      ).rejects.toThrow('timeout')
    }, 10000)

    it('should handle authentication errors', async () => {
      server.use(
        rest.get(`${API_BASE}/repositories`, (req, res, ctx) => {
          return res(ctx.status(401), ctx.json({ message: 'Authentication required' }))
        })
      )

      await expect(repositoryApi.getRepositories()).rejects.toMatchObject({
        type: 'authentication',
        title: 'HTTP 401'
      })
    })

    it('should handle rate limiting', async () => {
      server.use(
        rest.get(`${API_BASE}/repositories`, (req, res, ctx) => {
          return res(ctx.status(429), ctx.json({ message: 'Too many requests' }))
        })
      )

      await expect(repositoryApi.getRepositories()).rejects.toMatchObject({
        type: 'rate_limit',
        title: 'HTTP 429'
      })
    })
  })

  describe('deploymentUtils', () => {
    describe('formatError', () => {
      it('should format network errors', () => {
        const error = {
          type: 'network',
          message: 'Connection failed'
        }

        const formatted = deploymentUtils.formatError(error)
        expect(formatted).toContain('Network connection issue')
      })

      it('should format authentication errors', () => {
        const error = {
          type: 'authentication',
          message: 'Token expired'
        }

        const formatted = deploymentUtils.formatError(error)
        expect(formatted).toContain('Authentication failed')
      })

      it('should format validation errors', () => {
        const error = {
          type: 'validation',
          message: 'Invalid input'
        }

        const formatted = deploymentUtils.formatError(error)
        expect(formatted).toContain('Validation error: Invalid input')
      })
    })

    describe('isRetryableError', () => {
      it('should identify retryable errors', () => {
        const retryableError = {
          retryable: true,
          retryCount: 1,
          maxRetries: 3
        }

        expect(deploymentUtils.isRetryableError(retryableError)).toBe(true)
      })

      it('should identify non-retryable errors', () => {
        const nonRetryableError = {
          retryable: false
        }

        expect(deploymentUtils.isRetryableError(nonRetryableError)).toBe(false)
      })

      it('should respect max retry limit', () => {
        const maxRetriesReached = {
          retryable: true,
          retryCount: 3,
          maxRetries: 3
        }

        expect(deploymentUtils.isRetryableError(maxRetriesReached)).toBe(false)
      })
    })

    describe('getRetryDelay', () => {
      it('should calculate exponential backoff delay', () => {
        expect(deploymentUtils.getRetryDelay(0)).toBe(1000) // 2^0 * 1000
        expect(deploymentUtils.getRetryDelay(1)).toBe(2000) // 2^1 * 1000
        expect(deploymentUtils.getRetryDelay(2)).toBe(4000) // 2^2 * 1000
      })

      it('should cap delay at 30 seconds', () => {
        expect(deploymentUtils.getRetryDelay(10)).toBe(30000)
      })
    })

    describe('withRetry', () => {
      it('should retry failed operations', async () => {
        let attempts = 0
        const mockFn = jest.fn().mockImplementation(() => {
          attempts++
          if (attempts < 3) {
            const error = new Error('Temporary failure')
            error.retryable = true
            throw error
          }
          return 'success'
        })

        const retriedFn = deploymentUtils.withRetry(mockFn, 3)
        const result = await retriedFn()

        expect(result).toBe('success')
        expect(mockFn).toHaveBeenCalledTimes(3)
      }, 10000)

      it('should not retry non-retryable errors', async () => {
        const mockFn = jest.fn().mockImplementation(() => {
          const error = new Error('Permanent failure')
          error.retryable = false
          throw error
        })

        const retriedFn = deploymentUtils.withRetry(mockFn, 3)

        await expect(retriedFn()).rejects.toThrow('Permanent failure')
        expect(mockFn).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('DeploymentWebSocket', () => {
    let mockWebSocket

    beforeEach(() => {
      mockWebSocket = {
        readyState: WebSocket.CONNECTING,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket)
    })

    it('should establish WebSocket connection', () => {
      const onMessage = jest.fn()
      const onConnect = jest.fn()

      const ws = new DeploymentWebSocket()
      ws.connect(onMessage, undefined, onConnect)

      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('/ws/deployment')
      )
    })

    it('should handle connection success', () => {
      const onConnect = jest.fn()

      const ws = new DeploymentWebSocket()
      ws.connect(jest.fn(), undefined, onConnect)

      // Simulate connection opening
      mockWebSocket.readyState = WebSocket.OPEN
      mockWebSocket.onopen()

      expect(onConnect).toHaveBeenCalled()
    })

    it('should handle incoming messages', () => {
      const onMessage = jest.fn()
      const testData = { type: 'sync_update', payload: { progress: 50 } }

      const ws = new DeploymentWebSocket()
      ws.connect(onMessage)

      // Simulate incoming message
      mockWebSocket.onmessage({ data: JSON.stringify(testData) })

      expect(onMessage).toHaveBeenCalledWith(testData)
    })

    it('should handle malformed messages gracefully', () => {
      const onMessage = jest.fn()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const ws = new DeploymentWebSocket()
      ws.connect(onMessage)

      // Simulate malformed message
      mockWebSocket.onmessage({ data: 'invalid json' })

      expect(onMessage).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should subscribe to topics', () => {
      const ws = new DeploymentWebSocket()
      ws.connect(jest.fn())

      mockWebSocket.readyState = WebSocket.OPEN
      ws.subscribe(['sync_updates', 'deployment_status'])

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          topics: ['sync_updates', 'deployment_status']
        })
      )
    })

    it('should unsubscribe from topics', () => {
      const ws = new DeploymentWebSocket()
      ws.connect(jest.fn())

      mockWebSocket.readyState = WebSocket.OPEN
      ws.unsubscribe(['sync_updates'])

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'unsubscribe',
          topics: ['sync_updates']
        })
      )
    })

    it('should disconnect WebSocket', () => {
      const ws = new DeploymentWebSocket()
      ws.connect(jest.fn())

      ws.disconnect()

      expect(mockWebSocket.close).toHaveBeenCalled()
    })
  })
})
