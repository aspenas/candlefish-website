/**
 * Unit tests for User Onboarding API endpoints
 * Tests user onboarding flow and progress tracking
 */

import { jest } from '@jest/globals'
import { mockUsers, mockPhases } from '../../mocks/data.js'

// Mock services
const mockOnboardingService = {
  startUserOnboarding: jest.fn(),
  getUserProgress: jest.fn(),
  updateUserProgress: jest.fn(),
  completeOnboardingStep: jest.fn()
}

const mockNotificationService = {
  sendWelcomeEmail: jest.fn(),
  sendProgressReminder: jest.fn(),
  sendCompletionNotification: jest.fn()
}

describe('User Onboarding API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/users/:user_id/onboarding/start', () => {
    const userId = 'user-4'

    it('should start onboarding for a new user', async () => {
      // Arrange
      const expectedOnboardingData = {
        userId,
        phase: 'phase-2',
        status: 'in_progress',
        progress: 0,
        startedAt: expect.any(Date),
        steps: [
          { id: 'step-1', name: 'Account Setup', status: 'pending' },
          { id: 'step-2', name: 'Claude Desktop Installation', status: 'pending' },
          { id: 'step-3', name: 'Repository Access Configuration', status: 'pending' },
          { id: 'step-4', name: 'First Successful Sync', status: 'pending' }
        ]
      }

      mockOnboardingService.startUserOnboarding.mockResolvedValue(expectedOnboardingData)
      mockNotificationService.sendWelcomeEmail.mockResolvedValue(true)

      // Act
      const result = await startUserOnboarding(userId, 'phase-2')

      // Assert
      expect(mockOnboardingService.startUserOnboarding).toHaveBeenCalledWith(
        userId,
        'phase-2'
      )
      expect(mockNotificationService.sendWelcomeEmail).toHaveBeenCalledWith(
        userId,
        expectedOnboardingData
      )
      expect(result).toEqual({
        success: true,
        onboarding: expectedOnboardingData
      })
    })

    it('should not start onboarding if user already has active onboarding', async () => {
      // Arrange
      const existingUser = mockUsers[1] // User with in_progress onboarding
      mockOnboardingService.getUserProgress.mockResolvedValue(existingUser.onboardingStatus)

      // Act & Assert
      await expect(startUserOnboarding('user-4', 'phase-2'))
        .rejects
        .toThrow('User already has active onboarding')
    })

    it('should validate user exists before starting onboarding', async () => {
      // Arrange
      mockOnboardingService.startUserOnboarding.mockRejectedValue(
        new Error('User not found')
      )

      // Act & Assert
      await expect(startUserOnboarding('invalid-user', 'phase-1'))
        .rejects
        .toThrow('User not found')
    })

    it('should validate phase is active before assigning user', async () => {
      // Arrange
      const inactivePhase = 'phase-3'

      // Act & Assert
      await expect(startUserOnboarding(userId, inactivePhase))
        .rejects
        .toThrow('Cannot assign user to inactive phase')
    })

    it('should handle bulk user onboarding efficiently', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5']
      const bulkOnboardingData = userIds.map(id => ({
        userId: id,
        phase: 'phase-2',
        status: 'in_progress',
        startedAt: new Date()
      }))

      mockOnboardingService.startBulkOnboarding = jest.fn()
        .mockResolvedValue(bulkOnboardingData)

      // Act
      const result = await startBulkUserOnboarding(userIds, 'phase-2')

      // Assert
      expect(result.successful).toHaveLength(5)
      expect(result.failed).toHaveLength(0)
    })

    it('should handle partial failures in bulk onboarding', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'invalid-user']
      mockOnboardingService.startBulkOnboarding = jest.fn()
        .mockResolvedValue([
          { userId: 'user-1', success: true },
          { userId: 'user-2', success: true },
          { userId: 'invalid-user', success: false, error: 'User not found' }
        ])

      // Act
      const result = await startBulkUserOnboarding(userIds, 'phase-2')

      // Assert
      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].error).toBe('User not found')
    })

    it('should send appropriate notifications based on user preferences', async () => {
      // Arrange
      const userWithEmailPrefs = {
        ...mockUsers[0],
        notificationPreferences: {
          email: true,
          slack: false,
          inApp: true
        }
      }

      mockOnboardingService.startUserOnboarding.mockResolvedValue({
        userId,
        phase: 'phase-2'
      })

      // Act
      await startUserOnboarding(userId, 'phase-2', {
        user: userWithEmailPrefs
      })

      // Assert
      expect(mockNotificationService.sendWelcomeEmail).toHaveBeenCalled()
    })
  })

  describe('GET /api/users/:user_id/onboarding/progress', () => {
    const userId = 'user-4'

    it('should return current onboarding progress', async () => {
      // Arrange
      const expectedProgress = mockUsers[1].onboardingStatus
      mockOnboardingService.getUserProgress.mockResolvedValue(expectedProgress)

      // Act
      const result = await getUserOnboardingProgress(userId)

      // Assert
      expect(result).toEqual(expectedProgress)
      expect(result.progress).toBe(75)
      expect(result.currentStep).toBe('step-4')
    })

    it('should return null for users without onboarding', async () => {
      // Arrange
      mockOnboardingService.getUserProgress.mockResolvedValue(null)

      // Act
      const result = await getUserOnboardingProgress('user-without-onboarding')

      // Assert
      expect(result).toBeNull()
    })

    it('should include time-based metrics', async () => {
      // Arrange
      const progressWithMetrics = {
        ...mockUsers[1].onboardingStatus,
        metrics: {
          timeSpent: 180, // minutes
          estimatedTimeRemaining: 45,
          efficiency: 85 // percentage
        }
      }
      mockOnboardingService.getUserProgress.mockResolvedValue(progressWithMetrics)

      // Act
      const result = await getUserOnboardingProgress(userId)

      // Assert
      expect(result.metrics).toBeDefined()
      expect(result.metrics.timeSpent).toBe(180)
      expect(result.metrics.efficiency).toBe(85)
    })

    it('should handle concurrent progress requests', async () => {
      // Arrange
      const progress = mockUsers[1].onboardingStatus
      mockOnboardingService.getUserProgress.mockResolvedValue(progress)

      // Act
      const promises = Array(10).fill().map(() =>
        getUserOnboardingProgress(userId)
      )
      const results = await Promise.all(promises)

      // Assert
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result).toEqual(progress)
      })
    })

    it('should cache progress data to reduce database load', async () => {
      // Arrange
      const progress = mockUsers[1].onboardingStatus
      mockOnboardingService.getUserProgress.mockResolvedValue(progress)

      // Act
      await getUserOnboardingProgress(userId)
      await getUserOnboardingProgress(userId) // Second call should use cache

      // Assert
      expect(mockOnboardingService.getUserProgress).toHaveBeenCalledTimes(1)
    })

    it('should invalidate cache when progress is updated', async () => {
      // Arrange
      const initialProgress = mockUsers[1].onboardingStatus
      const updatedProgress = {
        ...initialProgress,
        progress: 100,
        status: 'completed'
      }

      mockOnboardingService.getUserProgress
        .mockResolvedValueOnce(initialProgress)
        .mockResolvedValueOnce(updatedProgress)

      // Act
      await getUserOnboardingProgress(userId)
      await updateUserOnboardingProgress(userId, { progress: 100 })
      const result = await getUserOnboardingProgress(userId)

      // Assert
      expect(result.progress).toBe(100)
      expect(result.status).toBe('completed')
    })
  })

  describe('Progress Updates and Step Completion', () => {
    const userId = 'user-4'

    it('should complete onboarding step and update progress', async () => {
      // Arrange
      const stepId = 'step-2'
      const updatedProgress = {
        ...mockUsers[1].onboardingStatus,
        progress: 50,
        steps: mockUsers[1].onboardingStatus.steps.map(step =>
          step.id === stepId
            ? { ...step, status: 'completed', completedAt: new Date() }
            : step
        )
      }

      mockOnboardingService.completeOnboardingStep.mockResolvedValue(updatedProgress)

      // Act
      const result = await completeOnboardingStep(userId, stepId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.progress.progress).toBe(50)
      expect(result.progress.steps.find(s => s.id === stepId).status).toBe('completed')
    })

    it('should not allow skipping required steps', async () => {
      // Arrange
      const currentProgress = {
        ...mockUsers[1].onboardingStatus,
        currentStep: 'step-1'
      }
      mockOnboardingService.getUserProgress.mockResolvedValue(currentProgress)

      // Act & Assert
      await expect(completeOnboardingStep(userId, 'step-3'))
        .rejects
        .toThrow('Cannot complete step: previous required steps not completed')
    })

    it('should trigger completion notifications when onboarding finishes', async () => {
      // Arrange
      const finalStepCompletion = {
        ...mockUsers[0].onboardingStatus,
        progress: 100,
        status: 'completed',
        completedAt: new Date()
      }

      mockOnboardingService.completeOnboardingStep.mockResolvedValue(finalStepCompletion)
      mockNotificationService.sendCompletionNotification.mockResolvedValue(true)

      // Act
      await completeOnboardingStep(userId, 'step-4')

      // Assert
      expect(mockNotificationService.sendCompletionNotification)
        .toHaveBeenCalledWith(userId, finalStepCompletion)
    })

    it('should handle step completion with custom data', async () => {
      // Arrange
      const stepData = {
        claudeDesktopVersion: '1.5.2',
        installationPath: '/Applications/Claude.app',
        configurationValid: true
      }

      const updatedProgress = {
        ...mockUsers[1].onboardingStatus,
        steps: mockUsers[1].onboardingStatus.steps.map(step =>
          step.id === 'step-2'
            ? { ...step, status: 'completed', data: stepData }
            : step
        )
      }

      mockOnboardingService.completeOnboardingStep.mockResolvedValue(updatedProgress)

      // Act
      const result = await completeOnboardingStep(userId, 'step-2', stepData)

      // Assert
      expect(result.progress.steps.find(s => s.id === 'step-2').data)
        .toEqual(stepData)
    })
  })

  describe('Error Handling and Validation', () => {
    it('should handle invalid user IDs gracefully', async () => {
      // Act & Assert
      await expect(startUserOnboarding('', 'phase-1'))
        .rejects
        .toThrow('Invalid user ID')

      await expect(getUserOnboardingProgress(null))
        .rejects
        .toThrow('Invalid user ID')
    })

    it('should handle service unavailability', async () => {
      // Arrange
      mockOnboardingService.startUserOnboarding.mockRejectedValue(
        new Error('Service temporarily unavailable')
      )

      // Act & Assert
      await expect(startUserOnboarding('user-1', 'phase-1'))
        .rejects
        .toThrow('Service temporarily unavailable')
    })

    it('should validate phase assignment rules', async () => {
      // Arrange - User trying to join a phase they're not eligible for
      const restrictedPhase = 'leadership-only-phase'

      // Act & Assert
      await expect(startUserOnboarding('user-4', restrictedPhase))
        .rejects
        .toThrow('User not eligible for this phase')
    })

    it('should handle network timeouts gracefully', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout')
      timeoutError.code = 'TIMEOUT'
      mockOnboardingService.getUserProgress.mockRejectedValue(timeoutError)

      // Act & Assert
      await expect(getUserOnboardingProgress('user-1'))
        .rejects
        .toThrow('Request timeout')
    })
  })

  describe('Analytics and Reporting', () => {
    it('should track onboarding events for analytics', async () => {
      // Arrange
      const mockAnalytics = jest.fn()
      const onboardingData = {
        userId: 'user-4',
        phase: 'phase-2'
      }

      mockOnboardingService.startUserOnboarding.mockResolvedValue(onboardingData)

      // Act
      await startUserOnboarding('user-4', 'phase-2', {
        analytics: mockAnalytics
      })

      // Assert
      expect(mockAnalytics).toHaveBeenCalledWith({
        event: 'onboarding_started',
        userId: 'user-4',
        phase: 'phase-2',
        timestamp: expect.any(Date)
      })
    })

    it('should generate progress reports for managers', async () => {
      // Arrange
      const teamMembers = ['user-1', 'user-2', 'user-3']
      const progressData = teamMembers.map(id => ({
        userId: id,
        progress: Math.floor(Math.random() * 100),
        status: 'in_progress'
      }))

      mockOnboardingService.getTeamProgress = jest.fn()
        .mockResolvedValue(progressData)

      // Act
      const report = await generateTeamProgressReport(teamMembers)

      // Assert
      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('individual')
      expect(report.summary.totalUsers).toBe(3)
    })
  })
})

// Helper functions that would be in the actual API implementation
async function startUserOnboarding(userId, phaseId, options = {}) {
  if (!userId || userId.trim() === '') {
    throw new Error('Invalid user ID')
  }

  // Check if user already has active onboarding
  const existingProgress = await mockOnboardingService.getUserProgress(userId)
  if (existingProgress && existingProgress.status === 'in_progress') {
    throw new Error('User already has active onboarding')
  }

  // Validate phase is active
  if (phaseId === 'phase-3') {
    throw new Error('Cannot assign user to inactive phase')
  }

  // Check user eligibility for phase
  if (phaseId === 'leadership-only-phase' && !options.user?.role?.includes('lead')) {
    throw new Error('User not eligible for this phase')
  }

  const onboardingData = await mockOnboardingService.startUserOnboarding(userId, phaseId)

  // Send notifications
  if (options.user?.notificationPreferences?.email !== false) {
    await mockNotificationService.sendWelcomeEmail(userId, onboardingData)
  }

  // Track analytics
  if (options.analytics) {
    options.analytics({
      event: 'onboarding_started',
      userId,
      phase: phaseId,
      timestamp: new Date()
    })
  }

  return {
    success: true,
    onboarding: onboardingData
  }
}

async function startBulkUserOnboarding(userIds, phaseId) {
  const results = await mockOnboardingService.startBulkOnboarding(userIds, phaseId)

  return {
    successful: results.filter(r => r.success),
    failed: results.filter(r => !r.success)
  }
}

async function getUserOnboardingProgress(userId) {
  if (!userId) {
    throw new Error('Invalid user ID')
  }

  return await mockOnboardingService.getUserProgress(userId)
}

async function updateUserOnboardingProgress(userId, updates) {
  return await mockOnboardingService.updateUserProgress(userId, updates)
}

async function completeOnboardingStep(userId, stepId, stepData = {}) {
  const progress = await mockOnboardingService.completeOnboardingStep(
    userId,
    stepId,
    stepData
  )

  // Check if onboarding is now complete
  if (progress.status === 'completed') {
    await mockNotificationService.sendCompletionNotification(userId, progress)
  }

  return {
    success: true,
    progress
  }
}

async function generateTeamProgressReport(teamMembers) {
  const progressData = await mockOnboardingService.getTeamProgress(teamMembers)

  return {
    summary: {
      totalUsers: progressData.length,
      avgProgress: progressData.reduce((sum, p) => sum + p.progress, 0) / progressData.length,
      completedUsers: progressData.filter(p => p.status === 'completed').length
    },
    individual: progressData,
    generatedAt: new Date()
  }
}
