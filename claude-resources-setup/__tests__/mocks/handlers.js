import { rest } from 'msw'
import { mockRepositories, mockSystemStatus, mockSyncOperations, mockDistributionJobs } from './data'

const API_BASE = process.env.VITE_API_BASE_URL || '/api'

export const handlers = [
  // Repository endpoints
  rest.get(`${API_BASE}/repositories`, (req, res, ctx) => {
    return res(ctx.json(mockRepositories))
  }),

  rest.get(`${API_BASE}/repositories/:id`, (req, res, ctx) => {
    const { id } = req.params
    const repository = mockRepositories.find(repo => repo.id === id)

    if (!repository) {
      return res(ctx.status(404), ctx.json({ message: 'Repository not found' }))
    }

    return res(ctx.json(repository))
  }),

  rest.post(`${API_BASE}/repositories/:repoId/sync`, (req, res, ctx) => {
    const { repoId } = req.params
    const repository = mockRepositories.find(repo => repo.id === repoId)

    if (!repository) {
      return res(ctx.status(404), ctx.json({ message: 'Repository not found' }))
    }

    const syncOperation = {
      id: `sync-${Date.now()}`,
      repositoryId: repoId,
      status: 'pending',
      progress: 0,
      startTime: new Date().toISOString(),
      logs: [{
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Sync operation started'
      }],
      metadata: {
        filesProcessed: 0,
        totalFiles: repository.metadata?.fileCount || 0,
        currentStep: 'Initializing'
      }
    }

    return res(ctx.json(syncOperation))
  }),

  rest.post(`${API_BASE}/local/setup/:repoId`, (req, res, ctx) => {
    const { repoId } = req.params
    const repository = mockRepositories.find(repo => repo.id === repoId)

    if (!repository) {
      return res(ctx.status(404), ctx.json({ message: 'Repository not found' }))
    }

    return res(ctx.json({
      success: true,
      message: `Local symlinks created for ${repository.name}`
    }))
  }),

  // Sync operations endpoints
  rest.get(`${API_BASE}/sync/:id`, (req, res, ctx) => {
    const { id } = req.params
    const operation = mockSyncOperations.find(op => op.id === id)

    if (!operation) {
      return res(ctx.status(404), ctx.json({ message: 'Sync operation not found' }))
    }

    return res(ctx.json(operation))
  }),

  rest.get(`${API_BASE}/sync/active`, (req, res, ctx) => {
    const activeOperations = mockSyncOperations.filter(op =>
      op.status === 'running' || op.status === 'pending'
    )
    return res(ctx.json(activeOperations))
  }),

  rest.post(`${API_BASE}/sync/:id/cancel`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      message: 'Sync operation cancelled'
    }))
  }),

  // Distribution endpoints
  rest.post(`${API_BASE}/distribute`, async (req, res, ctx) => {
    const body = await req.json()
    const { targetRepositories } = body

    if (!targetRepositories || !Array.isArray(targetRepositories)) {
      return res(ctx.status(400), ctx.json({
        message: 'targetRepositories must be an array'
      }))
    }

    const distributionJob = {
      id: `dist-${Date.now()}`,
      status: 'pending',
      targetRepositories,
      progress: 0,
      startTime: new Date().toISOString(),
      results: targetRepositories.map(repoId => ({
        repositoryId: repoId,
        status: 'pending'
      }))
    }

    return res(ctx.json(distributionJob))
  }),

  rest.get(`${API_BASE}/distribute/:id`, (req, res, ctx) => {
    const { id } = req.params
    const job = mockDistributionJobs.find(job => job.id === id)

    if (!job) {
      return res(ctx.status(404), ctx.json({ message: 'Distribution job not found' }))
    }

    return res(ctx.json(job))
  }),

  rest.get(`${API_BASE}/distribute`, (req, res, ctx) => {
    return res(ctx.json(mockDistributionJobs))
  }),

  // System status endpoints
  rest.get(`${API_BASE}/status/overview`, (req, res, ctx) => {
    return res(ctx.json(mockSystemStatus))
  }),

  rest.get(`${API_BASE}/status/service/:service`, (req, res, ctx) => {
    const { service } = req.params
    const serviceStatus = mockSystemStatus.components[service]

    if (!serviceStatus) {
      return res(ctx.status(404), ctx.json({ message: 'Service not found' }))
    }

    return res(ctx.json({
      status: serviceStatus,
      lastCheck: new Date().toISOString(),
      details: {
        uptime: Math.random() * 1000000,
        memory: Math.random() * 100,
        cpu: Math.random() * 100
      }
    }))
  }),

  rest.get(`${API_BASE}/status/validate`, (req, res, ctx) => {
    return res(ctx.json({
      valid: true,
      issues: []
    }))
  }),

  // Error scenarios for testing
  rest.get(`${API_BASE}/error/500`, (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({
      message: 'Internal server error'
    }))
  }),

  rest.get(`${API_BASE}/error/timeout`, (req, res, ctx) => {
    return res(ctx.delay('infinite'))
  }),

  rest.get(`${API_BASE}/error/network`, (req, res, ctx) => {
    return res.networkError('Network connection failed')
  }),

  // Authentication errors
  rest.get(`${API_BASE}/error/auth`, (req, res, ctx) => {
    return res(ctx.status(401), ctx.json({
      message: 'Authentication required'
    }))
  }),

  // Rate limiting
  rest.get(`${API_BASE}/error/rate-limit`, (req, res, ctx) => {
    return res(ctx.status(429), ctx.json({
      message: 'Too many requests'
    }))
  })
]
