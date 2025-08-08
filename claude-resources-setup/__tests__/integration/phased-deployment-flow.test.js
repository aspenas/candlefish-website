/**
 * Integration tests for complete phased deployment flow
 * Tests the entire deployment process from creation to completion
 */

import { jest } from '@jest/globals'
import { mockDeployments, mockPhases, mockUsers, mockMetrics } from '../mocks/data.js'

// Mock database/storage layer
const mockDatabase = {
  deployments: new Map(),
  phases: new Map(),
  users: new Map(),
  metrics: new Map(),
  feedback: new Map(),

  // Initialize with mock data
  init() {
    mockDeployments.forEach(deployment => {
      this.deployments.set(deployment.id, { ...deployment })
    })
    mockPhases.forEach(phase => {
      this.phases.set(phase.id, { ...phase })
    })
    mockUsers.forEach(user => {
      this.users.set(user.id, { ...user })
    })
    this.metrics.set('adoption', { ...mockMetrics.adoption })
  },

  clear() {
    this.deployments.clear()
    this.phases.clear()
    this.users.clear()
    this.metrics.clear()
    this.feedback.clear()
  }
}

// Mock service layer
const mockServices = {
  deploymentService: {
    createDeployment: jest.fn(),
    startPhase: jest.fn(),
    updatePhaseStatus: jest.fn(),
    getDeploymentProgress: jest.fn()
  },

  onboardingService: {
    startUserOnboarding: jest.fn(),
    updateUserProgress: jest.fn(),
    completeOnboardingStep: jest.fn(),
    getUserProgress: jest.fn()
  },

  notificationService: {
    sendPhaseStartNotification: jest.fn(),
    sendOnboardingReminder: jest.fn(),
    sendCompletionNotification: jest.fn()
  },

  metricsService: {
    updatePhaseMetrics: jest.fn(),
    recordUserProgress: jest.fn(),
    generateReport: jest.fn()
  },

  validationService: {
    validatePhaseTransition: jest.fn(),
    validateUserEligibility: jest.fn(),
    checkSuccessCriteria: jest.fn()
  }
}

// Integration test helpers
const createTestDeployment = async (name, phases) => {
  const deployment = {
    id: `test-deployment-${Date.now()}`,
    name,
    description: `Test deployment: ${name}`,
    status: 'pending',
    phases: phases.map(phase => ({ ...phase })),
    createdAt: new Date().toISOString(),
    currentPhase: null
  }

  mockDatabase.deployments.set(deployment.id, deployment)
  return deployment
}

const simulateUserOnboarding = async (userId, phaseId, steps) => {
  const user = mockDatabase.users.get(userId)
  if (!user) return null

  const onboardingStatus = {
    phase: phaseId,
    status: 'in_progress',
    progress: 0,
    startedAt: new Date().toISOString(),
    currentStep: 'step-1',
    steps: steps.map(step => ({ ...step, status: 'pending' }))
  }

  user.onboardingStatus = onboardingStatus
  mockDatabase.users.set(userId, user)
  return user
}

describe('Phased Deployment Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDatabase.init()
  })

  afterEach(() => {
    mockDatabase.clear()
  })

  describe('Complete Deployment Lifecycle', () => {
    it('should execute a full deployment from creation to completion', async () => {
      // Arrange - Create a deployment with 3 phases
      const testPhases = [
        {
          id: 'test-phase-1',
          name: 'Alpha Phase',
          description: 'Initial rollout to alpha users',
          status: 'pending',
          targetUsers: ['user-alpha-1', 'user-alpha-2'],
          completedUsers: [],
          startDate: null,
          endDate: null,
          successCriteria: {
            minCompletionRate: 90,
            maxErrorRate: 5,
            targetDuration: 7
          },
          metrics: {
            completionRate: 0,
            errorRate: 0,
            avgOnboardingTime: 0,
            userSatisfaction: 0
          }
        },
        {
          id: 'test-phase-2',
          name: 'Beta Phase',
          description: 'Rollout to beta users',
          status: 'pending',
          targetUsers: ['user-beta-1', 'user-beta-2', 'user-beta-3'],
          completedUsers: [],
          successCriteria: {
            minCompletionRate: 85,
            maxErrorRate: 10,
            targetDuration: 14
          },
          metrics: {
            completionRate: 0,
            errorRate: 0,
            avgOnboardingTime: 0,
            userSatisfaction: 0
          }
        },
        {
          id: 'test-phase-3',
          name: 'General Availability',
          description: 'Full rollout to all users',
          status: 'pending',
          targetUsers: ['user-ga-1', 'user-ga-2', 'user-ga-3', 'user-ga-4'],
          completedUsers: [],
          successCriteria: {
            minCompletionRate: 80,
            maxErrorRate: 15,
            targetDuration: 21
          },
          metrics: {
            completionRate: 0,
            errorRate: 0,
            avgOnboardingTime: 0,
            userSatisfaction: 0
          }
        }
      ]

      const deployment = await createTestDeployment('End-to-End Test Deployment', testPhases)

      // Mock service responses
      mockServices.deploymentService.startPhase.mockImplementation(async (deploymentId, phaseId) => {
        const deployment = mockDatabase.deployments.get(deploymentId)
        const phase = deployment.phases.find(p => p.id === phaseId)

        phase.status = 'in_progress'
        phase.startDate = new Date().toISOString()
        deployment.currentPhase = phaseId

        mockDatabase.deployments.set(deploymentId, deployment)
        return phase
      })

      mockServices.onboardingService.startUserOnboarding.mockImplementation(async (userId, phaseId) => {
        return await simulateUserOnboarding(userId, phaseId, [
          { id: 'step-1', name: 'Account Setup', status: 'pending' },
          { id: 'step-2', name: 'Tool Installation', status: 'pending' },
          { id: 'step-3', name: 'Configuration', status: 'pending' },
          { id: 'step-4', name: 'First Use', status: 'pending' }
        ])
      })

      mockServices.validationService.validatePhaseTransition.mockResolvedValue(true)
      mockServices.notificationService.sendPhaseStartNotification.mockResolvedValue(true)

      // Act & Assert - Execute Phase 1
      console.log('Starting Phase 1: Alpha Phase')

      // Start Phase 1
      const phase1 = await mockServices.deploymentService.startPhase(deployment.id, 'test-phase-1')
      expect(phase1.status).toBe('in_progress')
      expect(mockServices.notificationService.sendPhaseStartNotification).toHaveBeenCalledWith(
        deployment.id,
        'test-phase-1'
      )

      // Onboard alpha users
      for (const userId of testPhases[0].targetUsers) {
        const user = await mockServices.onboardingService.startUserOnboarding(userId, 'test-phase-1')
        expect(user.onboardingStatus.phase).toBe('test-phase-1')
        expect(user.onboardingStatus.status).toBe('in_progress')
      }

      // Simulate user completions for Phase 1
      await simulatePhaseCompletion(deployment.id, 'test-phase-1', testPhases[0].targetUsers)

      // Act & Assert - Execute Phase 2
      console.log('Starting Phase 2: Beta Phase')

      // Validate Phase 1 is complete before starting Phase 2
      const updatedDeployment = mockDatabase.deployments.get(deployment.id)
      const completedPhase1 = updatedDeployment.phases.find(p => p.id === 'test-phase-1')
      expect(completedPhase1.status).toBe('completed')

      // Start Phase 2
      const phase2 = await mockServices.deploymentService.startPhase(deployment.id, 'test-phase-2')
      expect(phase2.status).toBe('in_progress')

      // Onboard beta users
      for (const userId of testPhases[1].targetUsers) {
        await mockServices.onboardingService.startUserOnboarding(userId, 'test-phase-2')
      }

      // Simulate user completions for Phase 2
      await simulatePhaseCompletion(deployment.id, 'test-phase-2', testPhases[1].targetUsers)

      // Act & Assert - Execute Phase 3
      console.log('Starting Phase 3: General Availability')

      const phase3 = await mockServices.deploymentService.startPhase(deployment.id, 'test-phase-3')
      expect(phase3.status).toBe('in_progress')

      // Onboard GA users
      for (const userId of testPhases[2].targetUsers) {
        await mockServices.onboardingService.startUserOnboarding(userId, 'test-phase-3')
      }

      // Simulate user completions for Phase 3
      await simulatePhaseCompletion(deployment.id, 'test-phase-3', testPhases[2].targetUsers)

      // Final validation - entire deployment should be complete
      const finalDeployment = mockDatabase.deployments.get(deployment.id)
      expect(finalDeployment.status).toBe('completed')

      finalDeployment.phases.forEach(phase => {
        expect(phase.status).toBe('completed')
        expect(phase.metrics.completionRate).toBeGreaterThanOrEqual(phase.successCriteria.minCompletionRate)
      })

      console.log('✅ Complete deployment lifecycle test passed')
    })

    it('should handle phase failures and rollback scenarios', async () => {
      // Arrange
      const deployment = await createTestDeployment('Failure Test Deployment', [
        {
          id: 'failing-phase',
          name: 'Failing Phase',
          targetUsers: ['user-fail-1', 'user-fail-2'],
          completedUsers: [],
          status: 'pending',
          successCriteria: {
            minCompletionRate: 90,
            maxErrorRate: 5
          },
          metrics: {
            completionRate: 0,
            errorRate: 100 // High error rate
          }
        }
      ])

      // Mock failure scenarios
      mockServices.deploymentService.startPhase.mockRejectedValueOnce(
        new Error('Phase start failed due to infrastructure issues')
      )

      mockServices.validationService.checkSuccessCriteria.mockResolvedValue({
        passed: false,
        failures: ['Error rate exceeds maximum threshold']
      })

      // Act & Assert
      await expect(
        mockServices.deploymentService.startPhase(deployment.id, 'failing-phase')
      ).rejects.toThrow('Phase start failed due to infrastructure issues')

      // Verify rollback procedures are triggered
      const deploymentAfterFailure = mockDatabase.deployments.get(deployment.id)
      expect(deploymentAfterFailure.status).not.toBe('in_progress')
    })

    it('should enforce phase order and prevent skipping phases', async () => {
      // Arrange
      const deployment = await createTestDeployment('Phase Order Test', [
        { id: 'phase-1', name: 'Phase 1', status: 'pending' },
        { id: 'phase-2', name: 'Phase 2', status: 'pending' },
        { id: 'phase-3', name: 'Phase 3', status: 'pending' }
      ])

      mockServices.validationService.validatePhaseTransition.mockImplementation(
        async (currentPhase, targetPhase) => {
          const phaseOrder = ['phase-1', 'phase-2', 'phase-3']
          const currentIndex = phaseOrder.indexOf(currentPhase)
          const targetIndex = phaseOrder.indexOf(targetPhase)

          if (targetIndex !== currentIndex + 1) {
            throw new Error('Invalid phase transition: phases must be executed in order')
          }
          return true
        }
      )

      // Act & Assert - Try to skip Phase 1 and start Phase 2
      await expect(
        mockServices.validationService.validatePhaseTransition(null, 'phase-2')
      ).rejects.toThrow('Invalid phase transition: phases must be executed in order')

      // Correctly start Phase 1
      await expect(
        mockServices.validationService.validatePhaseTransition(null, 'phase-1')
      ).resolves.toBe(true)
    })
  })

  describe('User Onboarding Integration', () => {
    it('should handle complete user onboarding flow within a phase', async () => {
      // Arrange
      const userId = 'integration-test-user'
      const phaseId = 'test-phase-1'
      const onboardingSteps = [
        { id: 'step-1', name: 'Account Setup', required: true },
        { id: 'step-2', name: 'Tool Installation', required: true },
        { id: 'step-3', name: 'Configuration', required: true },
        { id: 'step-4', name: 'First Sync', required: false }
      ]

      // Mock progressive step completion
      mockServices.onboardingService.completeOnboardingStep.mockImplementation(
        async (userId, stepId) => {
          const user = mockDatabase.users.get(userId)
          const stepIndex = user.onboardingStatus.steps.findIndex(s => s.id === stepId)

          if (stepIndex === -1) {
            throw new Error('Step not found')
          }

          // Complete the step
          user.onboardingStatus.steps[stepIndex].status = 'completed'
          user.onboardingStatus.steps[stepIndex].completedAt = new Date().toISOString()

          // Update overall progress
          const completedSteps = user.onboardingStatus.steps.filter(s => s.status === 'completed').length
          user.onboardingStatus.progress = Math.round((completedSteps / user.onboardingStatus.steps.length) * 100)

          // Move to next step or complete
          if (stepIndex < user.onboardingStatus.steps.length - 1) {
            user.onboardingStatus.currentStep = user.onboardingStatus.steps[stepIndex + 1].id
          } else {
            user.onboardingStatus.status = 'completed'
            user.onboardingStatus.completedAt = new Date().toISOString()
          }

          mockDatabase.users.set(userId, user)
          return user.onboardingStatus
        }
      )

      mockServices.notificationService.sendCompletionNotification.mockResolvedValue(true)
      mockServices.metricsService.recordUserProgress.mockResolvedValue(true)

      // Act - Start user onboarding
      const user = await simulateUserOnboarding(userId, phaseId, onboardingSteps)
      expect(user.onboardingStatus.status).toBe('in_progress')
      expect(user.onboardingStatus.progress).toBe(0)

      // Complete each step
      for (const step of onboardingSteps) {
        console.log(`Completing step: ${step.name}`)

        const updatedStatus = await mockServices.onboardingService.completeOnboardingStep(userId, step.id)

        expect(updatedStatus.steps.find(s => s.id === step.id).status).toBe('completed')
        expect(mockServices.metricsService.recordUserProgress).toHaveBeenCalledWith(userId, step.id)
      }

      // Assert - Verify completion
      const finalUser = mockDatabase.users.get(userId)
      expect(finalUser.onboardingStatus.status).toBe('completed')
      expect(finalUser.onboardingStatus.progress).toBe(100)
      expect(mockServices.notificationService.sendCompletionNotification).toHaveBeenCalledWith(
        userId,
        finalUser.onboardingStatus
      )
    })

    it('should handle user onboarding failures and retry mechanisms', async () => {
      // Arrange
      const userId = 'retry-test-user'
      const phaseId = 'test-phase-1'

      const user = await simulateUserOnboarding(userId, phaseId, [
        { id: 'step-1', name: 'Account Setup', required: true },
        { id: 'step-2', name: 'Problematic Step', required: true }
      ])

      // Mock step failure
      mockServices.onboardingService.completeOnboardingStep
        .mockRejectedValueOnce(new Error('Tool installation failed'))
        .mockResolvedValueOnce({ status: 'completed' })

      // Act & Assert - First attempt fails
      await expect(
        mockServices.onboardingService.completeOnboardingStep(userId, 'step-2')
      ).rejects.toThrow('Tool installation failed')

      // Second attempt succeeds
      const result = await mockServices.onboardingService.completeOnboardingStep(userId, 'step-2')
      expect(result.status).toBe('completed')
    })

    it('should handle concurrent user onboarding in same phase', async () => {
      // Arrange
      const phaseId = 'concurrent-test-phase'
      const userIds = ['concurrent-user-1', 'concurrent-user-2', 'concurrent-user-3']
      const steps = [
        { id: 'step-1', name: 'Setup', required: true },
        { id: 'step-2', name: 'Configuration', required: true }
      ]

      // Mock concurrent onboarding
      mockServices.onboardingService.startUserOnboarding.mockImplementation(
        async (userId, phaseId) => {
          // Simulate some delay to test concurrency
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
          return await simulateUserOnboarding(userId, phaseId, steps)
        }
      )

      // Act - Start concurrent onboarding
      const onboardingPromises = userIds.map(userId =>
        mockServices.onboardingService.startUserOnboarding(userId, phaseId)
      )

      const results = await Promise.all(onboardingPromises)

      // Assert - All should start successfully
      results.forEach((user, index) => {
        expect(user.onboardingStatus.phase).toBe(phaseId)
        expect(user.onboardingStatus.status).toBe('in_progress')
        expect(user.id).toBe(userIds[index])
      })

      expect(mockServices.onboardingService.startUserOnboarding).toHaveBeenCalledTimes(3)
    })

    it('should track and update phase metrics as users complete onboarding', async () => {
      // Arrange
      const phaseId = 'metrics-test-phase'
      const userIds = ['metrics-user-1', 'metrics-user-2', 'metrics-user-3']

      mockServices.metricsService.updatePhaseMetrics.mockImplementation(
        async (phaseId, userProgress) => {
          const phase = mockDatabase.phases.get(phaseId)
          if (!phase) return null

          // Calculate new metrics
          const completedUsers = userProgress.filter(u => u.status === 'completed')
          const totalUsers = userProgress.length

          phase.metrics.completionRate = Math.round((completedUsers.length / totalUsers) * 100)
          phase.metrics.avgOnboardingTime = completedUsers.reduce(
            (sum, u) => sum + (u.timeSpent || 0), 0
          ) / completedUsers.length || 0

          mockDatabase.phases.set(phaseId, phase)
          return phase.metrics
        }
      )

      // Act - Simulate users completing onboarding at different rates
      const userProgress = []

      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i]
        const isCompleted = i < 2 // First 2 users complete, last one doesn't

        userProgress.push({
          userId,
          status: isCompleted ? 'completed' : 'in_progress',
          timeSpent: isCompleted ? 2 + Math.random() * 2 : 0 // 2-4 days
        })
      }

      const updatedMetrics = await mockServices.metricsService.updatePhaseMetrics(phaseId, userProgress)

      // Assert
      expect(updatedMetrics.completionRate).toBe(67) // 2/3 = 66.67 -> 67%
      expect(updatedMetrics.avgOnboardingTime).toBeGreaterThan(2)
      expect(updatedMetrics.avgOnboardingTime).toBeLessThan(4)
    })
  })

  describe('Cross-Service Integration', () => {
    it('should coordinate between deployment, onboarding, and metrics services', async () => {
      // Arrange
      const deployment = await createTestDeployment('Cross-Service Test', [
        {
          id: 'integration-phase',
          name: 'Integration Phase',
          targetUsers: ['cross-user-1', 'cross-user-2'],
          completedUsers: [],
          status: 'pending',
          metrics: { completionRate: 0 }
        }
      ])

      let phaseMetricsUpdated = false
      let notificationsSent = 0

      // Mock service coordination
      mockServices.deploymentService.startPhase.mockImplementation(async (deploymentId, phaseId) => {
        // Start phase in deployment service
        const deployment = mockDatabase.deployments.get(deploymentId)
        const phase = deployment.phases.find(p => p.id === phaseId)
        phase.status = 'in_progress'

        // Trigger notifications
        await mockServices.notificationService.sendPhaseStartNotification(deploymentId, phaseId)
        notificationsSent++

        return phase
      })

      mockServices.onboardingService.updateUserProgress.mockImplementation(async (userId, progress) => {
        // Update user progress
        const user = mockDatabase.users.get(userId)
        user.onboardingStatus.progress = progress

        // Trigger metrics update
        await mockServices.metricsService.updatePhaseMetrics('integration-phase', [
          { userId, status: progress === 100 ? 'completed' : 'in_progress' }
        ])
        phaseMetricsUpdated = true

        return user.onboardingStatus
      })

      mockServices.notificationService.sendPhaseStartNotification.mockResolvedValue(true)
      mockServices.metricsService.updatePhaseMetrics.mockResolvedValue({ completionRate: 50 })

      // Act - Execute coordinated flow
      const phase = await mockServices.deploymentService.startPhase(deployment.id, 'integration-phase')

      // Simulate user progress updates
      await mockServices.onboardingService.updateUserProgress('cross-user-1', 50)
      await mockServices.onboardingService.updateUserProgress('cross-user-2', 100)

      // Assert - Verify cross-service coordination
      expect(phase.status).toBe('in_progress')
      expect(notificationsSent).toBe(1)
      expect(phaseMetricsUpdated).toBe(true)
      expect(mockServices.metricsService.updatePhaseMetrics).toHaveBeenCalledTimes(2)
    })

    it('should handle service failures gracefully with proper error propagation', async () => {
      // Arrange
      const deployment = await createTestDeployment('Error Handling Test', [
        { id: 'error-phase', name: 'Error Phase', status: 'pending' }
      ])

      // Mock service failures
      mockServices.notificationService.sendPhaseStartNotification.mockRejectedValue(
        new Error('Notification service unavailable')
      )

      mockServices.deploymentService.startPhase.mockImplementation(async (deploymentId, phaseId) => {
        try {
          await mockServices.notificationService.sendPhaseStartNotification(deploymentId, phaseId)
        } catch (error) {
          // Log error but continue with phase start
          console.warn('Notification failed:', error.message)
        }

        const deployment = mockDatabase.deployments.get(deploymentId)
        const phase = deployment.phases.find(p => p.id === phaseId)
        phase.status = 'in_progress'
        return phase
      })

      // Act
      const phase = await mockServices.deploymentService.startPhase(deployment.id, 'error-phase')

      // Assert - Phase should still start despite notification failure
      expect(phase.status).toBe('in_progress')
      expect(mockServices.notificationService.sendPhaseStartNotification).toHaveBeenCalled()
    })
  })

  describe('Data Consistency and State Management', () => {
    it('should maintain data consistency across concurrent operations', async () => {
      // Arrange
      const deployment = await createTestDeployment('Consistency Test', [
        {
          id: 'consistency-phase',
          name: 'Consistency Phase',
          targetUsers: ['consistency-user-1', 'consistency-user-2'],
          completedUsers: [],
          metrics: { completionRate: 0 }
        }
      ])

      // Mock concurrent operations
      const concurrentOperations = [
        () => mockServices.deploymentService.updatePhaseStatus(deployment.id, 'consistency-phase', 'in_progress'),
        () => mockServices.onboardingService.startUserOnboarding('consistency-user-1', 'consistency-phase'),
        () => mockServices.onboardingService.startUserOnboarding('consistency-user-2', 'consistency-phase'),
        () => mockServices.metricsService.updatePhaseMetrics('consistency-phase', [])
      ]

      mockServices.deploymentService.updatePhaseStatus.mockResolvedValue({ status: 'in_progress' })
      mockServices.onboardingService.startUserOnboarding.mockImplementation(
        async (userId, phaseId) => simulateUserOnboarding(userId, phaseId, [])
      )
      mockServices.metricsService.updatePhaseMetrics.mockResolvedValue({ completionRate: 0 })

      // Act - Execute concurrent operations
      const results = await Promise.allSettled(
        concurrentOperations.map(operation => operation())
      )

      // Assert - All operations should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
      })

      // Verify final state consistency
      const finalDeployment = mockDatabase.deployments.get(deployment.id)
      expect(finalDeployment).toBeDefined()
    })

    it('should handle database transaction rollbacks on failures', async () => {
      // Arrange
      const deployment = await createTestDeployment('Transaction Test', [
        { id: 'transaction-phase', name: 'Transaction Phase', status: 'pending' }
      ])

      const originalDeployment = { ...mockDatabase.deployments.get(deployment.id) }

      // Mock transaction failure
      mockServices.deploymentService.startPhase.mockImplementation(async (deploymentId, phaseId) => {
        // Simulate partial update
        const deployment = mockDatabase.deployments.get(deploymentId)
        deployment.status = 'in_progress'

        // Simulate failure after partial update
        throw new Error('Database transaction failed')
      })

      // Act & Assert
      await expect(
        mockServices.deploymentService.startPhase(deployment.id, 'transaction-phase')
      ).rejects.toThrow('Database transaction failed')

      // Verify rollback (in real implementation, this would be handled by the database)
      // For this test, we manually verify the state wasn't corrupted
      const currentDeployment = mockDatabase.deployments.get(deployment.id)
      expect(currentDeployment.status).toBe(originalDeployment.status)
    })
  })

  // Helper function to simulate phase completion
  async function simulatePhaseCompletion(deploymentId, phaseId, userIds) {
    const deployment = mockDatabase.deployments.get(deploymentId)
    const phase = deployment.phases.find(p => p.id === phaseId)

    // Simulate all users completing onboarding
    for (const userId of userIds) {
      const user = mockDatabase.users.get(userId)
      if (user && user.onboardingStatus) {
        user.onboardingStatus.status = 'completed'
        user.onboardingStatus.progress = 100
        user.onboardingStatus.completedAt = new Date().toISOString()
        mockDatabase.users.set(userId, user)
      }

      phase.completedUsers.push(userId)
    }

    // Update phase metrics
    phase.metrics.completionRate = 100
    phase.metrics.avgOnboardingTime = 2.5
    phase.metrics.errorRate = 2
    phase.metrics.userSatisfaction = 4.7

    // Mark phase as completed
    phase.status = 'completed'
    phase.endDate = new Date().toISOString()

    // Check if all phases are complete
    const allPhasesComplete = deployment.phases.every(p => p.status === 'completed')
    if (allPhasesComplete) {
      deployment.status = 'completed'
    }

    mockDatabase.deployments.set(deploymentId, deployment)
    return phase
  }
})
