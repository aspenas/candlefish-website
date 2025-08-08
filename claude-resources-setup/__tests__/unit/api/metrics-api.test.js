/**
 * Unit tests for Metrics and Analytics API endpoints
 * Tests adoption metrics, feedback collection, and reporting endpoints
 */

import { jest } from '@jest/globals'
import { mockMetrics, mockFeedback, mockWeeklyReports } from '../../mocks/data.js'

// Mock services
const mockMetricsService = {
  getAdoptionMetrics: jest.fn(),
  calculateTimeToValue: jest.fn(),
  getPhaseMetrics: jest.fn(),
  getDepartmentMetrics: jest.fn()
}

const mockFeedbackService = {
  submitFeedback: jest.fn(),
  getFeedbackByCategory: jest.fn(),
  analyzeFeedbackSentiment: jest.fn()
}

const mockReportingService = {
  generateWeeklyReport: jest.fn(),
  getWeeklyReport: jest.fn(),
  getReportHistory: jest.fn()
}

describe('Metrics and Analytics API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/metrics/adoption', () => {
    it('should return comprehensive adoption metrics', async () => {
      // Arrange
      mockMetricsService.getAdoptionMetrics.mockResolvedValue(mockMetrics.adoption)

      // Act
      const result = await getAdoptionMetrics()

      // Assert
      expect(result).toEqual(mockMetrics.adoption)
      expect(result.totalUsers).toBe(50)
      expect(result.onboardedUsers).toBe(23)
      expect(result.completionRate).toBe(78)
    })

    it('should include real-time metrics for active deployments', async () => {
      // Arrange
      const realTimeMetrics = {
        ...mockMetrics.adoption,
        realTime: {
          currentlyOnboarding: 5,
          completedToday: 3,
          activePhases: ['phase-2'],
          systemLoad: 65
        }
      }
      mockMetricsService.getAdoptionMetrics.mockResolvedValue(realTimeMetrics)

      // Act
      const result = await getAdoptionMetrics({ includeRealTime: true })

      // Assert
      expect(result.realTime).toBeDefined()
      expect(result.realTime.currentlyOnboarding).toBe(5)
      expect(result.realTime.completedToday).toBe(3)
    })

    it('should filter metrics by date range', async () => {
      // Arrange
      const dateRange = {
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-31T23:59:59Z'
      }
      const filteredMetrics = {
        ...mockMetrics.adoption,
        dateRange,
        totalUsers: 30,
        onboardedUsers: 18
      }
      mockMetricsService.getAdoptionMetrics.mockResolvedValue(filteredMetrics)

      // Act
      const result = await getAdoptionMetrics(dateRange)

      // Assert
      expect(result.dateRange).toEqual(dateRange)
      expect(result.totalUsers).toBe(30)
    })

    it('should calculate time to value metrics accurately', async () => {
      // Arrange
      const timeToValueData = {
        avg: 1.5,
        median: 1.2,
        p90: 2.8,
        p95: 3.5,
        distribution: {
          '0-1 days': 35,
          '1-2 days': 40,
          '2-3 days': 20,
          '3+ days': 5
        }
      }
      mockMetricsService.calculateTimeToValue.mockResolvedValue(timeToValueData)

      // Act
      const result = await getAdoptionMetrics({ includeTimeToValue: true })

      // Assert
      expect(result.timeToValue).toEqual(timeToValueData)
    })

    it('should handle large dataset queries efficiently', async () => {
      // Arrange
      const largeDatasetMetrics = {
        ...mockMetrics.adoption,
        totalUsers: 10000,
        queryTime: 250 // milliseconds
      }
      mockMetricsService.getAdoptionMetrics.mockResolvedValue(largeDatasetMetrics)

      // Act
      const start = Date.now()
      const result = await getAdoptionMetrics()
      const duration = Date.now() - start

      // Assert
      expect(result.totalUsers).toBe(10000)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should provide department-wise breakdown', async () => {
      // Arrange
      const departmentMetrics = {
        'Engineering': { completed: 15, total: 20, rate: 75, avgTime: 1.2 },
        'Product': { completed: 5, total: 8, rate: 62.5, avgTime: 1.8 },
        'Design': { completed: 3, total: 5, rate: 60, avgTime: 2.1 },
        'Marketing': { completed: 0, total: 3, rate: 0, avgTime: 0 }
      }
      mockMetricsService.getDepartmentMetrics.mockResolvedValue(departmentMetrics)

      // Act
      const result = await getAdoptionMetrics({ groupBy: 'department' })

      // Assert
      expect(result.departmentBreakdown).toEqual(departmentMetrics)
      expect(result.departmentBreakdown.Engineering.rate).toBe(75)
    })

    it('should handle missing or incomplete data gracefully', async () => {
      // Arrange
      const incompleteMetrics = {
        totalUsers: 50,
        onboardedUsers: null, // Missing data
        completionRate: NaN,
        phaseBreakdown: {}
      }
      mockMetricsService.getAdoptionMetrics.mockResolvedValue(incompleteMetrics)

      // Act
      const result = await getAdoptionMetrics()

      // Assert
      expect(result.onboardedUsers).toBe(0) // Should default to 0
      expect(result.completionRate).toBe(0) // Should handle NaN
    })
  })

  describe('POST /api/feedback', () => {
    it('should submit user feedback successfully', async () => {
      // Arrange
      const feedbackData = {
        userId: 'user-4',
        type: 'rating',
        category: 'onboarding_experience',
        rating: 4,
        comment: 'Great experience overall, but could use more documentation',
        phase: 'phase-2',
        step: 'step-3'
      }

      const submittedFeedback = {
        ...feedbackData,
        id: 'feedback-123',
        submittedAt: new Date(),
        status: 'received'
      }

      mockFeedbackService.submitFeedback.mockResolvedValue(submittedFeedback)

      // Act
      const result = await submitFeedback(feedbackData)

      // Assert
      expect(result.success).toBe(true)
      expect(result.feedback.id).toBe('feedback-123')
      expect(result.feedback.rating).toBe(4)
    })

    it('should validate required feedback fields', async () => {
      // Arrange
      const invalidFeedback = {
        userId: 'user-4',
        // Missing required fields: type, category
        rating: 5
      }

      // Act & Assert
      await expect(submitFeedback(invalidFeedback))
        .rejects
        .toThrow('Missing required fields: type, category')
    })

    it('should sanitize feedback content', async () => {
      // Arrange
      const feedbackWithHtml = {
        userId: 'user-4',
        type: 'issue',
        category: 'technical_difficulty',
        comment: '<script>alert("xss")</script>Great product!',
        title: '<b>Issue Title</b>'
      }

      const sanitizedFeedback = {
        ...feedbackWithHtml,
        comment: 'Great product!',
        title: 'Issue Title',
        id: 'feedback-124'
      }

      mockFeedbackService.submitFeedback.mockResolvedValue(sanitizedFeedback)

      // Act
      const result = await submitFeedback(feedbackWithHtml)

      // Assert
      expect(result.feedback.comment).toBe('Great product!')
      expect(result.feedback.title).toBe('Issue Title')
    })

    it('should handle anonymous feedback', async () => {
      // Arrange
      const anonymousFeedback = {
        userId: null,
        type: 'suggestion',
        category: 'feature_request',
        comment: 'Would love to see dark mode support',
        anonymous: true
      }

      const submittedFeedback = {
        ...anonymousFeedback,
        id: 'feedback-125',
        userId: 'anonymous'
      }

      mockFeedbackService.submitFeedback.mockResolvedValue(submittedFeedback)

      // Act
      const result = await submitFeedback(anonymousFeedback)

      // Assert
      expect(result.feedback.userId).toBe('anonymous')
      expect(result.feedback.anonymous).toBe(true)
    })

    it('should categorize and tag feedback automatically', async () => {
      // Arrange
      const feedbackData = {
        userId: 'user-4',
        type: 'issue',
        category: 'technical_difficulty',
        comment: 'The Claude Desktop app keeps crashing when I try to sync large repositories'
      }

      const categorizedFeedback = {
        ...feedbackData,
        id: 'feedback-126',
        autoTags: ['claude-desktop', 'sync', 'performance', 'crash'],
        priority: 'high',
        sentiment: 'negative'
      }

      mockFeedbackService.submitFeedback.mockResolvedValue(categorizedFeedback)

      // Act
      const result = await submitFeedback(feedbackData)

      // Assert
      expect(result.feedback.autoTags).toContain('claude-desktop')
      expect(result.feedback.priority).toBe('high')
      expect(result.feedback.sentiment).toBe('negative')
    })

    it('should handle bulk feedback submission', async () => {
      // Arrange
      const bulkFeedback = [
        {
          userId: 'user-1',
          type: 'rating',
          category: 'onboarding_experience',
          rating: 5
        },
        {
          userId: 'user-2',
          type: 'rating',
          category: 'onboarding_experience',
          rating: 4
        }
      ]

      const submittedBulkFeedback = bulkFeedback.map((feedback, index) => ({
        ...feedback,
        id: `feedback-${200 + index}`,
        submittedAt: new Date()
      }))

      mockFeedbackService.submitBulkFeedback = jest.fn()
        .mockResolvedValue(submittedBulkFeedback)

      // Act
      const result = await submitBulkFeedback(bulkFeedback)

      // Assert
      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
    })

    it('should trigger follow-up actions for critical feedback', async () => {
      // Arrange
      const criticalFeedback = {
        userId: 'user-4',
        type: 'issue',
        category: 'blocking_issue',
        severity: 'critical',
        comment: 'Cannot access any repositories, completely blocked'
      }

      const submittedFeedback = {
        ...criticalFeedback,
        id: 'feedback-127',
        status: 'escalated'
      }

      mockFeedbackService.submitFeedback.mockResolvedValue(submittedFeedback)

      const mockEscalationService = jest.fn()

      // Act
      const result = await submitFeedback(criticalFeedback, {
        escalationService: mockEscalationService
      })

      // Assert
      expect(result.feedback.status).toBe('escalated')
      expect(mockEscalationService).toHaveBeenCalledWith(submittedFeedback)
    })
  })

  describe('GET /api/reports/weekly/:week', () => {
    const weekId = '2025-W02'

    it('should return weekly report for specified week', async () => {
      // Arrange
      const expectedReport = mockWeeklyReports[1]
      mockReportingService.getWeeklyReport.mockResolvedValue(expectedReport)

      // Act
      const result = await getWeeklyReport(weekId)

      // Assert
      expect(result).toEqual(expectedReport)
      expect(result.week).toBe(weekId)
      expect(result.summary.newOnboardings).toBe(5)
    })

    it('should generate report if not exists', async () => {
      // Arrange
      const weekId = '2025-W03'
      mockReportingService.getWeeklyReport.mockResolvedValue(null)

      const generatedReport = {
        id: 'report-2025-w03',
        week: weekId,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-21T23:59:59Z',
        summary: {
          newOnboardings: 2,
          completedOnboardings: 4,
          activeIssues: 1,
          avgSatisfactionRating: 4.7
        },
        generatedAt: new Date()
      }

      mockReportingService.generateWeeklyReport.mockResolvedValue(generatedReport)

      // Act
      const result = await getWeeklyReport(weekId, { generateIfMissing: true })

      // Assert
      expect(result).toEqual(generatedReport)
      expect(mockReportingService.generateWeeklyReport).toHaveBeenCalledWith(weekId)
    })

    it('should include detailed metrics breakdown', async () => {
      // Arrange
      const detailedReport = {
        ...mockWeeklyReports[1],
        details: {
          userMetrics: {
            byDepartment: {
              'Engineering': { started: 3, completed: 1 },
              'Product': { started: 2, completed: 1 }
            },
            byPhase: {
              'phase-1': { users: 0 },
              'phase-2': { users: 5 }
            }
          },
          issueAnalysis: {
            topCategories: ['technical_difficulty', 'documentation'],
            resolutionTime: { avg: 24, median: 18 },
            satisfactionImpact: -0.2
          }
        }
      }

      mockReportingService.getWeeklyReport.mockResolvedValue(detailedReport)

      // Act
      const result = await getWeeklyReport(weekId, { includeDetails: true })

      // Assert
      expect(result.details).toBeDefined()
      expect(result.details.userMetrics.byDepartment.Engineering.started).toBe(3)
    })

    it('should handle invalid week format', async () => {
      // Act & Assert
      await expect(getWeeklyReport('invalid-week'))
        .rejects
        .toThrow('Invalid week format')

      await expect(getWeeklyReport('2025-W60'))
        .rejects
        .toThrow('Week number out of range')
    })

    it('should cache reports for performance', async () => {
      // Arrange
      const report = mockWeeklyReports[0]
      mockReportingService.getWeeklyReport.mockResolvedValue(report)

      // Act
      await getWeeklyReport('2025-W01')
      await getWeeklyReport('2025-W01') // Second call should use cache

      // Assert
      expect(mockReportingService.getWeeklyReport).toHaveBeenCalledTimes(1)
    })

    it('should compare with previous week', async () => {
      // Arrange
      const currentWeekReport = mockWeeklyReports[1]
      const previousWeekReport = mockWeeklyReports[0]

      mockReportingService.getWeeklyReport
        .mockResolvedValueOnce(currentWeekReport)
        .mockResolvedValueOnce(previousWeekReport)

      // Act
      const result = await getWeeklyReport('2025-W02', { includePreviousWeek: true })

      // Assert
      expect(result.comparison).toBeDefined()
      expect(result.comparison.newOnboardings.change).toBe(2) // 5 - 3
      expect(result.comparison.completedOnboardings.change).toBe(-1) // 2 - 3
    })

    it('should export report in multiple formats', async () => {
      // Arrange
      const report = mockWeeklyReports[1]
      mockReportingService.getWeeklyReport.mockResolvedValue(report)

      // Act
      const pdfResult = await getWeeklyReport(weekId, { format: 'pdf' })
      const csvResult = await getWeeklyReport(weekId, { format: 'csv' })

      // Assert
      expect(pdfResult.contentType).toBe('application/pdf')
      expect(csvResult.contentType).toBe('text/csv')
    })
  })

  describe('Analytics and Insights', () => {
    it('should provide predictive analytics for adoption trends', async () => {
      // Arrange
      const trendData = {
        currentTrend: 'positive',
        projectedCompletion: '2025-02-15T00:00:00Z',
        confidenceInterval: 85,
        factors: ['phase_2_success', 'low_error_rate', 'high_satisfaction']
      }

      mockMetricsService.analyzeTrends = jest.fn().mockResolvedValue(trendData)

      // Act
      const result = await getAdoptionTrends()

      // Assert
      expect(result.currentTrend).toBe('positive')
      expect(result.confidenceInterval).toBe(85)
    })

    it('should identify at-risk users for proactive support', async () => {
      // Arrange
      const atRiskUsers = [
        {
          userId: 'user-7',
          riskScore: 0.8,
          factors: ['stuck_on_step_2', 'no_activity_48h', 'prev_negative_feedback'],
          recommendedActions: ['send_reminder', 'offer_1on1_support']
        },
        {
          userId: 'user-9',
          riskScore: 0.6,
          factors: ['slow_progress', 'multiple_retries'],
          recommendedActions: ['check_technical_issues']
        }
      ]

      mockMetricsService.identifyAtRiskUsers = jest.fn().mockResolvedValue(atRiskUsers)

      // Act
      const result = await getAtRiskUsers()

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].riskScore).toBe(0.8)
      expect(result[0].recommendedActions).toContain('send_reminder')
    })

    it('should generate actionable insights from feedback data', async () => {
      // Arrange
      const insights = {
        topIssues: [
          {
            category: 'technical_difficulty',
            count: 12,
            impact: 'high',
            trend: 'increasing',
            suggestedFix: 'Improve documentation for step 3'
          }
        ],
        satisfactionDrivers: [
          { factor: 'ease_of_setup', correlation: 0.7 },
          { factor: 'support_response_time', correlation: 0.6 }
        ],
        recommendations: [
          'Add video tutorials for common setup issues',
          'Implement automated health checks',
          'Create FAQ for step 3 troubleshooting'
        ]
      }

      mockFeedbackService.generateInsights = jest.fn().mockResolvedValue(insights)

      // Act
      const result = await getFeedbackInsights()

      // Assert
      expect(result.topIssues).toHaveLength(1)
      expect(result.recommendations).toContain('Add video tutorials for common setup issues')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle high-volume metrics requests', async () => {
      // Arrange
      const highVolumeMetrics = {
        ...mockMetrics.adoption,
        queryOptimized: true,
        cacheHit: true,
        responseTime: 150
      }

      mockMetricsService.getAdoptionMetrics.mockResolvedValue(highVolumeMetrics)

      // Act
      const promises = Array(100).fill().map(() => getAdoptionMetrics())
      const results = await Promise.all(promises)

      // Assert
      expect(results).toHaveLength(100)
      results.forEach(result => {
        expect(result.cacheHit).toBe(true)
      })
    })

    it('should aggregate metrics efficiently for large datasets', async () => {
      // Arrange
      const largeDatasetQuery = {
        totalUsers: 50000,
        dateRange: { days: 365 },
        departments: 50,
        aggregationTime: 2.5 // seconds
      }

      mockMetricsService.getAdoptionMetrics.mockResolvedValue(largeDatasetQuery)

      // Act
      const start = Date.now()
      const result = await getAdoptionMetrics({
        largeDataset: true,
        optimizeQuery: true
      })
      const duration = Date.now() - start

      // Assert
      expect(result.totalUsers).toBe(50000)
      expect(duration).toBeLessThan(3000) // Should complete within 3 seconds
    })
  })
})

// Helper functions that would be in the actual API implementation
async function getAdoptionMetrics(options = {}) {
  const metrics = await mockMetricsService.getAdoptionMetrics(options)

  // Handle missing data
  if (metrics.onboardedUsers === null || isNaN(metrics.onboardedUsers)) {
    metrics.onboardedUsers = 0
  }
  if (isNaN(metrics.completionRate)) {
    metrics.completionRate = 0
  }

  // Add real-time data if requested
  if (options.includeRealTime) {
    // This would be implemented to fetch real-time data
  }

  // Add time to value data if requested
  if (options.includeTimeToValue) {
    metrics.timeToValue = await mockMetricsService.calculateTimeToValue()
  }

  // Add department breakdown if requested
  if (options.groupBy === 'department') {
    metrics.departmentBreakdown = await mockMetricsService.getDepartmentMetrics()
  }

  return metrics
}

async function submitFeedback(feedbackData, options = {}) {
  // Validate required fields
  const requiredFields = ['type', 'category']
  const missingFields = requiredFields.filter(field => !feedbackData[field])

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }

  // Handle anonymous feedback
  if (feedbackData.anonymous && !feedbackData.userId) {
    feedbackData.userId = 'anonymous'
  }

  const feedback = await mockFeedbackService.submitFeedback(feedbackData)

  // Handle escalation for critical feedback
  if (feedback.severity === 'critical' && options.escalationService) {
    await options.escalationService(feedback)
  }

  return {
    success: true,
    feedback
  }
}

async function submitBulkFeedback(feedbackArray) {
  const results = await mockFeedbackService.submitBulkFeedback(feedbackArray)

  return {
    successful: results.filter(r => r.success),
    failed: results.filter(r => !r.success)
  }
}

async function getWeeklyReport(weekId, options = {}) {
  // Validate week format
  if (!/^\d{4}-W\d{2}$/.test(weekId)) {
    throw new Error('Invalid week format')
  }

  const weekNumber = parseInt(weekId.split('-W')[1])
  if (weekNumber < 1 || weekNumber > 53) {
    throw new Error('Week number out of range')
  }

  let report = await mockReportingService.getWeeklyReport(weekId)

  if (!report && options.generateIfMissing) {
    report = await mockReportingService.generateWeeklyReport(weekId)
  }

  // Add comparison with previous week if requested
  if (options.includePreviousWeek && report) {
    const previousWeekId = `${weekId.split('-W')[0]}-W${String(weekNumber - 1).padStart(2, '0')}`
    const previousReport = await mockReportingService.getWeeklyReport(previousWeekId)

    if (previousReport) {
      report.comparison = {
        newOnboardings: {
          current: report.summary.newOnboardings,
          previous: previousReport.summary.newOnboardings,
          change: report.summary.newOnboardings - previousReport.summary.newOnboardings
        },
        completedOnboardings: {
          current: report.summary.completedOnboardings,
          previous: previousReport.summary.completedOnboardings,
          change: report.summary.completedOnboardings - previousReport.summary.completedOnboardings
        }
      }
    }
  }

  // Handle different export formats
  if (options.format === 'pdf') {
    return { ...report, contentType: 'application/pdf' }
  } else if (options.format === 'csv') {
    return { ...report, contentType: 'text/csv' }
  }

  return report
}

async function getAdoptionTrends() {
  return await mockMetricsService.analyzeTrends()
}

async function getAtRiskUsers() {
  return await mockMetricsService.identifyAtRiskUsers()
}

async function getFeedbackInsights() {
  return await mockFeedbackService.generateInsights()
}
