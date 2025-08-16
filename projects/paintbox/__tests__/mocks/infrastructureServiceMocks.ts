/**
 * Infrastructure Service Mocks
 * Mock implementations for external services and dependencies
 */

import { jest } from '@jest/globals';
import InfrastructureTestFactory from '../factories/infrastructureTestFactory';

// Health Service Mock
export const createMockHealthService = () => ({
  checkAllServices: jest.fn().mockResolvedValue(InfrastructureTestFactory.createHealthyResponse()),
  checkDatabase: jest.fn().mockResolvedValue({
    status: 'healthy',
    responseTime: 15,
    details: { connections: 5, maxConnections: 100 }
  }),
  checkRedis: jest.fn().mockResolvedValue({
    status: 'healthy',
    responseTime: 5,
    details: { memory: '50MB', keyspace: 'db0:keys=100' }
  }),
  checkTemporal: jest.fn().mockResolvedValue({
    status: 'healthy',
    responseTime: 25,
    details: { workflows: 3, activities: 10 }
  }),
  checkAPI: jest.fn().mockResolvedValue({
    status: 'healthy',
    responseTime: 20,
    details: { requestsPerSecond: 50, errorRate: 0.01 }
  }),
  checkWebSocket: jest.fn().mockResolvedValue({
    status: 'healthy',
    responseTime: 10,
    details: { connections: 100, messagesPerSecond: 200 }
  }),
  getHealthHistory: jest.fn().mockResolvedValue(InfrastructureTestFactory.createHealthHistory(50)),
  getServiceMetrics: jest.fn().mockResolvedValue(InfrastructureTestFactory.createPerformanceMetrics()),
  subscribeToHealthUpdates: jest.fn(),
  unsubscribeFromHealthUpdates: jest.fn()
});

// Temporal Service Mock
export const createMockTemporalService = () => ({
  startWorkflow: jest.fn().mockResolvedValue({
    workflowId: 'workflow-123',
    runId: 'run-456',
    status: 'running'
  }),
  cancelWorkflow: jest.fn().mockResolvedValue(true),
  getWorkflowExecution: jest.fn().mockResolvedValue(InfrastructureTestFactory.createRunningWorkflow()),
  listWorkflowExecutions: jest.fn().mockResolvedValue(InfrastructureTestFactory.createWorkflowExecutions(10)),
  getWorkflowHistory: jest.fn().mockResolvedValue([]),
  subscribeToWorkflow: jest.fn(),
  unsubscribeFromWorkflow: jest.fn(),
  getWorkflowMetrics: jest.fn().mockResolvedValue(InfrastructureTestFactory.createWorkflowMetrics())
});

// Load Testing Service Mock
export const createMockLoadTestService = () => ({
  createScenario: jest.fn().mockResolvedValue(InfrastructureTestFactory.createLoadTestScenario()),
  updateScenario: jest.fn().mockResolvedValue(true),
  deleteScenario: jest.fn().mockResolvedValue(true),
  startTest: jest.fn().mockResolvedValue({
    testId: 'test-123',
    status: 'running',
    startTime: new Date().toISOString()
  }),
  stopTest: jest.fn().mockResolvedValue(true),
  getTestResults: jest.fn().mockResolvedValue(InfrastructureTestFactory.createLoadTestResult()),
  getTestMetrics: jest.fn().mockResolvedValue(InfrastructureTestFactory.createLoadTestMetrics()),
  getRealTimeMetrics: jest.fn().mockResolvedValue(InfrastructureTestFactory.createRealTimeLoadTestMetrics()),
  listScenarios: jest.fn().mockResolvedValue([
    InfrastructureTestFactory.createLoadTestScenario(),
    InfrastructureTestFactory.createLoadTestScenario()
  ]),
  listTestHistory: jest.fn().mockResolvedValue([
    InfrastructureTestFactory.createLoadTestResult(),
    InfrastructureTestFactory.createLoadTestResult()
  ])
});

// Disaster Recovery Service Mock
export const createMockDRService = () => ({
  triggerBackup: jest.fn().mockResolvedValue({
    backupId: 'backup-123',
    status: 'running',
    startTime: new Date().toISOString()
  }),
  getBackupStatus: jest.fn().mockResolvedValue(InfrastructureTestFactory.createBackupStatus()),
  listBackups: jest.fn().mockResolvedValue([
    InfrastructureTestFactory.createBackupStatus(),
    InfrastructureTestFactory.createBackupStatus()
  ]),
  restoreFromBackup: jest.fn().mockResolvedValue({
    restoreId: 'restore-123',
    status: 'running',
    startTime: new Date().toISOString()
  }),
  getRestorePoints: jest.fn().mockResolvedValue([
    InfrastructureTestFactory.createRestorePoint(),
    InfrastructureTestFactory.createRestorePoint()
  ]),
  initiateFailover: jest.fn().mockResolvedValue({
    failoverId: 'failover-123',
    status: 'running',
    startTime: new Date().toISOString()
  }),
  getDRMetrics: jest.fn().mockResolvedValue(InfrastructureTestFactory.createDRMetrics()),
  scheduleDrill: jest.fn().mockResolvedValue(InfrastructureTestFactory.createDRDrill()),
  runDrill: jest.fn().mockResolvedValue({
    drillId: 'drill-123',
    status: 'running',
    startTime: new Date().toISOString()
  }),
  getDrillResults: jest.fn().mockResolvedValue(InfrastructureTestFactory.createDRDrill())
});

// Slack Integration Service Mock
export const createMockSlackService = () => ({
  sendMessage: jest.fn().mockResolvedValue({
    ok: true,
    channel: 'C1234567890',
    ts: '1234567890.123456'
  }),
  updateMessage: jest.fn().mockResolvedValue({
    ok: true,
    channel: 'C1234567890',
    ts: '1234567890.123456'
  }),
  deleteMessage: jest.fn().mockResolvedValue({
    ok: true,
    channel: 'C1234567890',
    ts: '1234567890.123456'
  }),
  getChannels: jest.fn().mockResolvedValue([
    { id: 'C1234567890', name: 'general' },
    { id: 'C0987654321', name: 'alerts' },
    { id: 'C1122334455', name: 'infrastructure' }
  ]),
  getUserInfo: jest.fn().mockResolvedValue({
    id: 'U1234567890',
    name: 'testuser',
    real_name: 'Test User'
  }),
  validateSignature: jest.fn().mockReturnValue(true),
  processEvent: jest.fn().mockResolvedValue({ processed: true }),
  createAlert: jest.fn().mockResolvedValue({
    alertId: 'alert-123',
    sent: true,
    timestamp: new Date().toISOString()
  }),
  getWorkspaceInfo: jest.fn().mockResolvedValue({
    id: 'T1234567890',
    name: 'Test Workspace',
    domain: 'test-workspace'
  })
});

// Alert Service Mock
export const createMockAlertService = () => ({
  createAlert: jest.fn().mockResolvedValue(InfrastructureTestFactory.createAlert()),
  updateAlert: jest.fn().mockResolvedValue(true),
  deleteAlert: jest.fn().mockResolvedValue(true),
  acknowledgeAlert: jest.fn().mockResolvedValue(true),
  getAlert: jest.fn().mockResolvedValue(InfrastructureTestFactory.createAlert()),
  listAlerts: jest.fn().mockResolvedValue(InfrastructureTestFactory.createAlertHistory(10)),
  getAlertHistory: jest.fn().mockResolvedValue(InfrastructureTestFactory.createAlertHistory(50)),
  subscribeToAlerts: jest.fn(),
  unsubscribeFromAlerts: jest.fn(),
  getAlertRules: jest.fn().mockResolvedValue([
    {
      id: 'rule-1',
      name: 'High CPU Usage',
      condition: 'cpu_usage > 80',
      severity: 'warning',
      enabled: true
    },
    {
      id: 'rule-2',
      name: 'Database Connection Failed',
      condition: 'database_status != healthy',
      severity: 'critical',
      enabled: true
    }
  ]),
  createAlertRule: jest.fn().mockResolvedValue({
    id: 'rule-123',
    created: true
  }),
  updateAlertRule: jest.fn().mockResolvedValue(true),
  deleteAlertRule: jest.fn().mockResolvedValue(true)
});

// WebSocket Service Mock
export const createMockWebSocketService = () => ({
  connect: jest.fn().mockResolvedValue({
    connected: true,
    connectionId: 'conn-123'
  }),
  disconnect: jest.fn().mockResolvedValue(true),
  subscribe: jest.fn().mockResolvedValue(true),
  unsubscribe: jest.fn().mockResolvedValue(true),
  sendMessage: jest.fn().mockResolvedValue(true),
  broadcast: jest.fn().mockResolvedValue({
    sent: true,
    recipientCount: 100
  }),
  getConnectionInfo: jest.fn().mockResolvedValue({
    id: 'conn-123',
    connectedAt: new Date().toISOString(),
    subscriptions: ['health', 'workflows', 'alerts']
  }),
  getConnectionCount: jest.fn().mockResolvedValue(150),
  getSubscriberCount: jest.fn().mockResolvedValue({
    health: 50,
    workflows: 30,
    alerts: 40,
    'load-tests': 20,
    backups: 10
  })
});

// Authentication Service Mock
export const createMockAuthService = () => ({
  authenticate: jest.fn().mockResolvedValue({
    success: true,
    user: InfrastructureTestFactory.createTestUser(),
    token: 'jwt-token-123'
  }),
  validateToken: jest.fn().mockResolvedValue({
    valid: true,
    user: InfrastructureTestFactory.createTestUser()
  }),
  refreshToken: jest.fn().mockResolvedValue({
    token: 'new-jwt-token-456'
  }),
  logout: jest.fn().mockResolvedValue({ success: true }),
  generateMFACode: jest.fn().mockReturnValue('123456'),
  validateMFACode: jest.fn().mockReturnValue(true),
  createSession: jest.fn().mockResolvedValue({
    sessionId: 'session-123',
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  }),
  validateSession: jest.fn().mockResolvedValue(true),
  invalidateSession: jest.fn().mockResolvedValue(true)
});

// Authorization Service Mock
export const createMockAuthorizationService = () => ({
  checkPermission: jest.fn().mockReturnValue(true),
  checkRole: jest.fn().mockReturnValue(true),
  getUserPermissions: jest.fn().mockReturnValue([
    'health:read',
    'workflows:read',
    'workflows:create'
  ]),
  getUserRoles: jest.fn().mockReturnValue(['operator']),
  hasPermission: jest.fn().mockReturnValue(true),
  hasRole: jest.fn().mockReturnValue(true),
  isOwner: jest.fn().mockReturnValue(true),
  canAccess: jest.fn().mockReturnValue(true)
});

// Database Service Mock
export const createMockDatabaseService = () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  queryOne: jest.fn().mockResolvedValue({}),
  execute: jest.fn().mockResolvedValue({ success: true }),
  transaction: jest.fn().mockImplementation((callback) => callback()),
  getConnection: jest.fn().mockResolvedValue({
    connected: true,
    connectionId: 'db-conn-123'
  }),
  releaseConnection: jest.fn().mockResolvedValue(true),
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy',
    responseTime: 15,
    connections: 5,
    maxConnections: 100
  }),
  getPoolStats: jest.fn().mockResolvedValue({
    totalConnections: 10,
    idleConnections: 5,
    waitingClients: 0
  })
});

// Cache Service Mock
export const createMockCacheService = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  delete: jest.fn().mockResolvedValue(true),
  exists: jest.fn().mockResolvedValue(false),
  ttl: jest.fn().mockResolvedValue(-1),
  expire: jest.fn().mockResolvedValue(true),
  keys: jest.fn().mockResolvedValue([]),
  flush: jest.fn().mockResolvedValue(true),
  info: jest.fn().mockResolvedValue({
    memory: '50MB',
    keyspace: 'db0:keys=100',
    hitRate: 0.95
  }),
  healthCheck: jest.fn().mockResolvedValue({
    status: 'healthy',
    responseTime: 5,
    memory: '50MB'
  })
});

// Webhook Service Mock
export const createMockWebhookService = () => ({
  validateSlackSignature: jest.fn().mockReturnValue(true),
  validateGitHubSignature: jest.fn().mockReturnValue(true),
  processSlackEvent: jest.fn().mockResolvedValue({ success: true }),
  processGitHubEvent: jest.fn().mockResolvedValue({ success: true }),
  isRateLimited: jest.fn().mockReturnValue(false),
  sanitizePayload: jest.fn().mockImplementation((payload) => payload),
  logWebhookMetrics: jest.fn(),
  triggerInfrastructureAlert: jest.fn(),
  updateMonitoringMetrics: jest.fn(),
  isRetryRequest: jest.fn().mockReturnValue(false)
});

// Notification Service Mock
export const createMockNotificationService = () => ({
  sendEmail: jest.fn().mockResolvedValue({
    messageId: 'email-123',
    sent: true
  }),
  sendSMS: jest.fn().mockResolvedValue({
    messageId: 'sms-123',
    sent: true
  }),
  sendPushNotification: jest.fn().mockResolvedValue({
    messageId: 'push-123',
    sent: true
  }),
  sendSlackMessage: jest.fn().mockResolvedValue({
    messageId: 'slack-123',
    sent: true
  }),
  createNotificationTemplate: jest.fn().mockResolvedValue({
    templateId: 'template-123',
    created: true
  }),
  sendBulkNotifications: jest.fn().mockResolvedValue({
    sent: 100,
    failed: 0
  })
});

// Metrics Service Mock
export const createMockMetricsService = () => ({
  recordMetric: jest.fn(),
  getMetric: jest.fn().mockResolvedValue({
    value: 100,
    timestamp: new Date().toISOString()
  }),
  getMetrics: jest.fn().mockResolvedValue([
    { metric: 'api.response_time', value: 150, timestamp: new Date().toISOString() },
    { metric: 'api.requests_per_second', value: 50, timestamp: new Date().toISOString() }
  ]),
  deleteMetric: jest.fn().mockResolvedValue(true),
  incrementCounter: jest.fn(),
  decrementCounter: jest.fn(),
  setGauge: jest.fn(),
  recordHistogram: jest.fn(),
  startTimer: jest.fn().mockReturnValue({
    stop: jest.fn().mockReturnValue(150)
  })
});

// Logging Service Mock
export const createMockLoggingService = () => ({
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  getLogs: jest.fn().mockResolvedValue([
    {
      level: 'info',
      message: 'Test log message',
      timestamp: new Date().toISOString(),
      metadata: {}
    }
  ]),
  searchLogs: jest.fn().mockResolvedValue([]),
  exportLogs: jest.fn().mockResolvedValue({
    exportId: 'export-123',
    url: 'https://example.com/logs.zip'
  })
});

// File Service Mock
export const createMockFileService = () => ({
  upload: jest.fn().mockResolvedValue({
    fileId: 'file-123',
    url: 'https://example.com/file-123.txt',
    size: 1024
  }),
  download: jest.fn().mockResolvedValue({
    data: Buffer.from('test file content'),
    contentType: 'text/plain'
  }),
  delete: jest.fn().mockResolvedValue(true),
  getInfo: jest.fn().mockResolvedValue({
    id: 'file-123',
    name: 'test.txt',
    size: 1024,
    contentType: 'text/plain',
    uploadedAt: new Date().toISOString()
  }),
  list: jest.fn().mockResolvedValue([
    {
      id: 'file-123',
      name: 'test1.txt',
      size: 1024
    },
    {
      id: 'file-456',
      name: 'test2.txt',
      size: 2048
    }
  ])
});

// Temporal Activities Mock
export const createMockActivities = () => ({
  parseUserIntent: jest.fn().mockResolvedValue({
    type: 'simple_query',
    parameters: {},
    cost: 0.02
  }),
  selectTool: jest.fn().mockResolvedValue({
    name: 'test-tool',
    confidence: 0.9
  }),
  executeTool: jest.fn().mockResolvedValue({
    success: true,
    output: 'Tool executed successfully',
    duration: 1000
  }),
  formatResponse: jest.fn().mockResolvedValue({
    response: 'Formatted response',
    cost: 0.01
  }),
  saveToMemory: jest.fn().mockResolvedValue(true),
  getConversationContext: jest.fn().mockResolvedValue([]),
  performExcelTransformation: jest.fn().mockResolvedValue({
    response: 'Excel transformation completed',
    duration: 5000,
    generatedFiles: ['component.tsx']
  }),
  callLLM: jest.fn().mockResolvedValue({
    response: 'LLM response',
    cost: 0.05
  })
});

// Export all mocks
export default {
  createMockHealthService,
  createMockTemporalService,
  createMockLoadTestService,
  createMockDRService,
  createMockSlackService,
  createMockAlertService,
  createMockWebSocketService,
  createMockAuthService,
  createMockAuthorizationService,
  createMockDatabaseService,
  createMockCacheService,
  createMockWebhookService,
  createMockNotificationService,
  createMockMetricsService,
  createMockLoggingService,
  createMockFileService,
  createMockActivities
};