// Mock data for testing - Phased Deployment System
export const mockRepositories = [
  {
    id: 'repo-1',
    name: 'claude-resources-setup',
    organization: 'candlefish-ai',
    url: 'https://github.com/candlefish-ai/claude-resources-setup',
    status: 'synced',
    lastSync: '2025-01-04T10:30:00Z',
    hasClaudeResources: true,
    symlinkStatus: 'complete',
    metadata: {
      branch: 'main',
      commit: 'abc123',
      syncDuration: 45,
      fileCount: 23
    }
  },
  {
    id: 'repo-2',
    name: 'project-alpha',
    organization: 'candlefish-ai',
    url: 'https://github.com/candlefish-ai/project-alpha',
    status: 'syncing',
    hasClaudeResources: false,
    symlinkStatus: 'partial',
    metadata: {
      branch: 'main',
      commit: 'def456',
      fileCount: 15
    }
  },
  {
    id: 'repo-3',
    name: 'legacy-project',
    organization: 'candlefish-ai',
    url: 'https://github.com/candlefish-ai/legacy-project',
    status: 'error',
    lastError: 'Authentication failed - please check credentials',
    hasClaudeResources: false,
    symlinkStatus: 'error',
    metadata: {
      branch: 'main',
      commit: 'ghi789'
    }
  }
]

export const mockSystemStatus = {
  overallHealth: 'healthy',
  totalRepositories: 12,
  syncedRepositories: 9,
  pendingSyncs: 2,
  failedSyncs: 1,
  lastGlobalSync: '2025-01-04T10:00:00Z',
  resourcesVersion: 'v2.1.0',
  components: {
    syncService: 'healthy',
    distributionService: 'healthy',
    storageService: 'healthy'
  }
}

export const mockSyncOperations = [
  {
    id: 'sync-1',
    repositoryId: 'repo-1',
    status: 'completed',
    progress: 100,
    startTime: '2025-01-04T10:25:00Z',
    endTime: '2025-01-04T10:30:00Z',
    logs: [
      {
        timestamp: '2025-01-04T10:25:00Z',
        level: 'info',
        message: 'Starting repository sync...'
      },
      {
        timestamp: '2025-01-04T10:27:00Z',
        level: 'info',
        message: 'Fetching remote resources...'
      },
      {
        timestamp: '2025-01-04T10:29:00Z',
        level: 'info',
        message: 'Creating symlinks...'
      },
      {
        timestamp: '2025-01-04T10:30:00Z',
        level: 'info',
        message: 'Sync completed successfully'
      }
    ],
    metadata: {
      filesProcessed: 23,
      totalFiles: 23,
      currentStep: 'Completed'
    }
  },
  {
    id: 'sync-2',
    repositoryId: 'repo-2',
    status: 'running',
    progress: 65,
    startTime: '2025-01-04T10:35:00Z',
    logs: [
      {
        timestamp: '2025-01-04T10:35:00Z',
        level: 'info',
        message: 'Starting repository sync...'
      },
      {
        timestamp: '2025-01-04T10:37:00Z',
        level: 'info',
        message: 'Processing files...'
      }
    ],
    metadata: {
      filesProcessed: 10,
      totalFiles: 15,
      currentStep: 'Processing files'
    }
  },
  {
    id: 'sync-3',
    repositoryId: 'repo-3',
    status: 'failed',
    progress: 25,
    startTime: '2025-01-04T10:15:00Z',
    endTime: '2025-01-04T10:17:00Z',
    error: 'Authentication failed - please check credentials',
    logs: [
      {
        timestamp: '2025-01-04T10:15:00Z',
        level: 'info',
        message: 'Starting repository sync...'
      },
      {
        timestamp: '2025-01-04T10:16:00Z',
        level: 'error',
        message: 'Failed to authenticate with repository'
      }
    ],
    metadata: {
      filesProcessed: 0,
      totalFiles: 0,
      currentStep: 'Authentication'
    }
  }
]

export const mockDistributionJobs = [
  {
    id: 'dist-1',
    status: 'completed',
    targetRepositories: ['repo-1', 'repo-2'],
    progress: 100,
    startTime: '2025-01-04T09:00:00Z',
    endTime: '2025-01-04T09:05:00Z',
    results: [
      {
        repositoryId: 'repo-1',
        status: 'success'
      },
      {
        repositoryId: 'repo-2',
        status: 'success'
      }
    ]
  },
  {
    id: 'dist-2',
    status: 'running',
    targetRepositories: ['repo-3'],
    progress: 50,
    startTime: '2025-01-04T10:40:00Z',
    results: [
      {
        repositoryId: 'repo-3',
        status: 'pending'
      }
    ]
  }
]

export const mockTeamMembers = [
  {
    id: 'member-1',
    username: 'john-doe',
    email: 'john@example.com',
    role: 'admin',
    status: 'active',
    lastActivity: '2025-01-04T10:30:00Z',
    repositoryAccess: ['repo-1', 'repo-2', 'repo-3'],
    onboardingStatus: {
      completed: true,
      currentStep: 5,
      steps: [
        { id: 'step-1', title: 'Account Setup', status: 'completed', required: true },
        { id: 'step-2', title: 'SSH Keys', status: 'completed', required: true },
        { id: 'step-3', title: 'Repository Access', status: 'completed', required: true },
        { id: 'step-4', title: 'CLI Setup', status: 'completed', required: false },
        { id: 'step-5', title: 'First Sync', status: 'completed', required: false }
      ]
    }
  },
  {
    id: 'member-2',
    username: 'jane-smith',
    email: 'jane@example.com',
    role: 'developer',
    status: 'invited',
    repositoryAccess: ['repo-1'],
    onboardingStatus: {
      completed: false,
      currentStep: 1,
      steps: [
        { id: 'step-1', title: 'Account Setup', status: 'pending', required: true },
        { id: 'step-2', title: 'SSH Keys', status: 'pending', required: true },
        { id: 'step-3', title: 'Repository Access', status: 'pending', required: true }
      ]
    }
  }
]

export const mockDeploymentActions = [
  {
    id: 'action-1',
    type: 'sync',
    title: 'Sync All Repositories',
    description: 'Synchronize Claude resources across all repositories',
    status: 'idle',
    lastRun: '2025-01-04T10:00:00Z',
    estimatedDuration: 120
  },
  {
    id: 'action-2',
    type: 'distribute',
    title: 'Distribute Resources',
    description: 'Push updated resources to target repositories',
    status: 'idle',
    lastRun: '2025-01-04T09:30:00Z',
    estimatedDuration: 60
  },
  {
    id: 'action-3',
    type: 'setup_local',
    title: 'Setup Local Symlinks',
    description: 'Configure local development environment',
    status: 'idle',
    estimatedDuration: 30
  },
  {
    id: 'action-4',
    type: 'validate',
    title: 'Validate Configuration',
    description: 'Check system health and configuration',
    status: 'completed',
    lastRun: '2025-01-04T10:30:00Z',
    estimatedDuration: 15
  }
]

// Phased Deployment Mock Data
export const mockPhases = [
  {
    id: 'phase-1',
    name: 'Leadership Onboarding',
    description: 'Initial rollout to team leaders and managers',
    status: 'completed',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-01-07T23:59:59Z',
    targetUsers: ['user-1', 'user-2', 'user-3'],
    completedUsers: ['user-1', 'user-2', 'user-3'],
    successCriteria: {
      minCompletionRate: 90,
      maxErrorRate: 5,
      targetDuration: 7
    },
    metrics: {
      completionRate: 100,
      errorRate: 0,
      avgOnboardingTime: 2.5,
      userSatisfaction: 4.8
    }
  },
  {
    id: 'phase-2',
    name: 'Development Team',
    description: 'Rollout to core development team members',
    status: 'in_progress',
    startDate: '2025-01-08T00:00:00Z',
    endDate: '2025-01-21T23:59:59Z',
    targetUsers: ['user-4', 'user-5', 'user-6', 'user-7', 'user-8'],
    completedUsers: ['user-4', 'user-5'],
    successCriteria: {
      minCompletionRate: 85,
      maxErrorRate: 10,
      targetDuration: 14
    },
    metrics: {
      completionRate: 40,
      errorRate: 5,
      avgOnboardingTime: 3.2,
      userSatisfaction: 4.6
    }
  },
  {
    id: 'phase-3',
    name: 'Extended Team',
    description: 'Rollout to extended team and stakeholders',
    status: 'pending',
    startDate: '2025-01-22T00:00:00Z',
    endDate: '2025-02-05T23:59:59Z',
    targetUsers: ['user-9', 'user-10', 'user-11', 'user-12'],
    completedUsers: [],
    successCriteria: {
      minCompletionRate: 80,
      maxErrorRate: 15,
      targetDuration: 14
    },
    metrics: {
      completionRate: 0,
      errorRate: 0,
      avgOnboardingTime: 0,
      userSatisfaction: 0
    }
  }
]

export const mockDeployments = [
  {
    id: 'deployment-1',
    name: 'Q1 2025 Claude Resources Rollout',
    description: 'Phased deployment of Claude resources to entire organization',
    status: 'in_progress',
    currentPhase: 'phase-2',
    phases: mockPhases,
    createdAt: '2024-12-15T00:00:00Z',
    updatedAt: '2025-01-04T10:30:00Z',
    createdBy: 'admin-user',
    metadata: {
      version: '2.1.0',
      rollbackPlan: 'automatic',
      approvalRequired: true
    }
  }
]

export const mockUsers = [
  {
    id: 'user-1',
    username: 'alice-johnson',
    email: 'alice@candlefish.ai',
    role: 'team_lead',
    department: 'Engineering',
    onboardingStatus: {
      phase: 'phase-1',
      status: 'completed',
      progress: 100,
      startedAt: '2025-01-01T09:00:00Z',
      completedAt: '2025-01-02T15:30:00Z',
      currentStep: 'completed',
      steps: [
        {
          id: 'step-1',
          name: 'Account Setup',
          status: 'completed',
          completedAt: '2025-01-01T09:30:00Z'
        },
        {
          id: 'step-2',
          name: 'Claude Desktop Installation',
          status: 'completed',
          completedAt: '2025-01-01T10:15:00Z'
        },
        {
          id: 'step-3',
          name: 'Repository Access Configuration',
          status: 'completed',
          completedAt: '2025-01-02T14:00:00Z'
        },
        {
          id: 'step-4',
          name: 'First Successful Sync',
          status: 'completed',
          completedAt: '2025-01-02T15:30:00Z'
        }
      ]
    }
  },
  {
    id: 'user-4',
    username: 'bob-smith',
    email: 'bob@candlefish.ai',
    role: 'developer',
    department: 'Engineering',
    onboardingStatus: {
      phase: 'phase-2',
      status: 'in_progress',
      progress: 75,
      startedAt: '2025-01-08T09:00:00Z',
      currentStep: 'step-4',
      steps: [
        {
          id: 'step-1',
          name: 'Account Setup',
          status: 'completed',
          completedAt: '2025-01-08T09:30:00Z'
        },
        {
          id: 'step-2',
          name: 'Claude Desktop Installation',
          status: 'completed',
          completedAt: '2025-01-08T10:15:00Z'
        },
        {
          id: 'step-3',
          name: 'Repository Access Configuration',
          status: 'completed',
          completedAt: '2025-01-09T14:00:00Z'
        },
        {
          id: 'step-4',
          name: 'First Successful Sync',
          status: 'in_progress',
          startedAt: '2025-01-10T09:00:00Z'
        }
      ]
    }
  }
]

export const mockMetrics = {
  adoption: {
    totalUsers: 50,
    onboardedUsers: 23,
    activeUsers: 18,
    completionRate: 78,
    avgOnboardingTime: 2.8,
    phaseBreakdown: {
      'phase-1': { completed: 3, total: 3, rate: 100 },
      'phase-2': { completed: 2, total: 5, rate: 40 },
      'phase-3': { completed: 0, total: 4, rate: 0 }
    },
    departmentBreakdown: {
      'Engineering': { completed: 15, total: 20, rate: 75 },
      'Product': { completed: 5, total: 8, rate: 62.5 },
      'Design': { completed: 3, total: 5, rate: 60 }
    },
    timeToValue: {
      avg: 1.5,
      median: 1.2,
      p90: 2.8,
      p95: 3.5
    }
  }
}

export const mockFeedback = [
  {
    id: 'feedback-1',
    userId: 'user-1',
    type: 'rating',
    category: 'onboarding_experience',
    rating: 5,
    comment: 'The onboarding process was smooth and well-guided. Great job!',
    submittedAt: '2025-01-02T16:00:00Z',
    phase: 'phase-1',
    step: 'completed'
  },
  {
    id: 'feedback-2',
    userId: 'user-4',
    type: 'issue',
    category: 'technical_difficulty',
    severity: 'medium',
    title: 'Repository sync taking longer than expected',
    description: 'The initial sync is taking over 10 minutes. Is this normal?',
    submittedAt: '2025-01-10T11:30:00Z',
    phase: 'phase-2',
    step: 'step-4',
    status: 'acknowledged'
  }
]

export const mockWeeklyReports = [
  {
    id: 'report-2025-w01',
    week: '2025-W01',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-01-07T23:59:59Z',
    summary: {
      newOnboardings: 3,
      completedOnboardings: 3,
      activeIssues: 0,
      avgSatisfactionRating: 4.8,
      milestones: ['Phase 1 completed successfully']
    },
    metrics: {
      userProgress: {
        started: 3,
        inProgress: 0,
        completed: 3,
        dropped: 0
      },
      timeToCompletion: {
        avg: 2.5,
        min: 1.8,
        max: 3.2
      },
      issueBreakdown: {
        technical: 0,
        documentation: 0,
        access: 0,
        other: 0
      }
    },
    generatedAt: '2025-01-08T00:00:00Z'
  },
  {
    id: 'report-2025-w02',
    week: '2025-W02',
    startDate: '2025-01-08T00:00:00Z',
    endDate: '2025-01-14T23:59:59Z',
    summary: {
      newOnboardings: 5,
      completedOnboardings: 2,
      activeIssues: 1,
      avgSatisfactionRating: 4.6,
      milestones: ['Phase 2 started', '40% completion rate achieved']
    },
    metrics: {
      userProgress: {
        started: 5,
        inProgress: 3,
        completed: 2,
        dropped: 0
      },
      timeToCompletion: {
        avg: 3.2,
        min: 2.1,
        max: 4.5
      },
      issueBreakdown: {
        technical: 1,
        documentation: 0,
        access: 0,
        other: 0
      }
    },
    generatedAt: '2025-01-15T00:00:00Z'
  }
]
