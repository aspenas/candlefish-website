// =====================================================
// GRAPHQL FEDERATION CONFIGURATION
// =====================================================
// Apollo Federation setup for security operations platform
// Splits services by domain with shared types and optimized performance
// =====================================================

import { buildFederatedSchema } from '@apollo/federation';
import { ApolloServer } from 'apollo-server-express';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { readFileSync } from 'fs';
import { join } from 'path';

// =====================================================
// DOMAIN SERVICE CONFIGURATIONS
// =====================================================

export interface ServiceConfig {
  name: string;
  url: string;
  schema: string;
  resolvers: any;
  dataSources: any[];
}

// =====================================================
// THREAT INTELLIGENCE SERVICE
// =====================================================

const threatIntelligenceTypeDefs = `
  # Extend shared types
  extend type SecurityEvent @key(fields: "id") {
    id: ID! @external
    threatIntelligence: [ThreatIntelligence!]!
  }

  extend type SecurityCase @key(fields: "id") {
    id: ID! @external
    threatIntelligence: [ThreatIntelligence!]!
  }

  # Core Threat Intelligence Types
  type ThreatIntelligence @key(fields: "id") {
    id: UUID!
    stixId: String!
    stixType: StixObjectType!
    name: String!
    description: String
    labels: [String!]!
    confidence: Int!
    
    # Source Information
    source: ThreatIntelligenceSource!
    externalReferences: [ExternalReference!]!
    
    # Relationships
    relationships: [ThreatRelationship!]!
    
    # STIX Pattern
    pattern: String
    patternType: String
    
    # Kill Chain
    killChainPhases: [KillChainPhase!]!
    
    # MITRE Mapping
    mitreAttackPatterns: [MitreAttackPattern!]!
    
    # Associated Events
    associatedEvents: [SecurityEvent!]!
    
    # Temporal Properties
    validFrom: DateTime!
    validUntil: DateTime
    firstSeen: DateTime
    lastSeen: DateTime
    
    # Classification
    tlpMarking: TLPMarking!
    tags: [String!]!
    
    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ThreatIntelligenceSource @key(fields: "id") {
    id: UUID!
    name: String!
    reliability: SourceReliability!
    url: String
    description: String
    feedType: FeedType!
    updateFrequency: Int! # minutes
    lastUpdate: DateTime
    isActive: Boolean!
  }

  enum FeedType {
    STIX_TAXII
    MISP
    COMMERCIAL
    GOVERNMENT
    OPEN_SOURCE
    INTERNAL
  }

  type ThreatRelationship @key(fields: "id") {
    id: UUID!
    relationshipType: String!
    source: ThreatIntelligence!
    target: ThreatIntelligence!
    confidence: Int!
    description: String
    createdAt: DateTime!
  }

  type KillChainPhase {
    killChainName: String!
    phaseName: String!
    order: Int
  }

  type ExternalReference {
    sourceName: String!
    url: String
    description: String
    externalId: String
  }

  # Queries
  type Query {
    threatIntelligence(
      filter: ThreatIntelligenceFilter
      sort: ThreatIntelligenceSort
      pagination: PaginationInput
    ): ThreatIntelligenceConnection!
    
    threatIntelligenceById(id: UUID!): ThreatIntelligence
    
    threatIntelligenceSources: [ThreatIntelligenceSource!]!
    
    stixObjectsByType(
      objectType: StixObjectType!
      timeRange: TimeRangeInput
    ): [ThreatIntelligence!]!
  }

  # Mutations
  type Mutation {
    createThreatIntelligence(input: ThreatIntelligenceInput!): ThreatIntelligence!
    updateThreatIntelligence(id: UUID!, input: ThreatIntelligenceUpdateInput!): ThreatIntelligence!
    deleteThreatIntelligence(id: UUID!): Boolean!
    
    ingestSTIXBundle(bundle: JSON!): STIXIngestResult!
    
    createThreatIntelligenceSource(input: ThreatIntelligenceSourceInput!): ThreatIntelligenceSource!
    updateThreatIntelligenceSource(id: UUID!, input: ThreatIntelligenceSourceUpdateInput!): ThreatIntelligenceSource!
  }

  # Subscriptions
  type Subscription {
    newThreatIntelligence(source: String): ThreatIntelligence!
    threatIntelligenceUpdated: ThreatIntelligence!
  }

  type STIXIngestResult {
    processedObjects: Int!
    createdObjects: Int!
    updatedObjects: Int!
    errors: [String!]!
  }
`;

// =====================================================
// SECURITY EVENTS SERVICE
// =====================================================

const securityEventsTypeDefs = `
  # Core Security Event Type
  type SecurityEvent @key(fields: "id") {
    id: UUID!
    
    # CEF Header Fields
    cefVersion: Int!
    deviceVendor: String!
    deviceProduct: String!
    deviceVersion: String!
    deviceEventClassId: String!
    name: String!
    severity: SecuritySeverity!
    
    # CEF Extensions
    extensions: JSON!
    
    # Core Event Data
    timestamp: DateTime!
    sourceIp: String
    destinationIp: String
    sourcePort: Int
    destinationPort: Int
    protocol: String
    userId: String
    userName: String
    processName: String
    commandLine: String
    filePath: String
    fileHash: String
    registryKey: String
    
    # Enrichment
    geoLocation: GeoLocation
    asn: ASN
    dnsResolution: [DNSRecord!]!
    
    # Risk Assessment
    riskScore: Float!
    riskFactors: [RiskFactor!]!
    
    # Correlation
    correlatedEvents: [SecurityEvent!]!
    correlationScore: Float
    
    # Metadata
    ingestionSource: String!
    tags: [String!]!
    rawLog: String
    processedAt: DateTime!
  }

  type GeoLocation {
    country: String
    region: String
    city: String
    latitude: Float
    longitude: Float
    timezone: String
    isp: String
  }

  type ASN {
    number: Int!
    organization: String!
    networkRange: String!
  }

  type DNSRecord {
    domain: String!
    recordType: String!
    value: String!
    ttl: Int
    resolvedAt: DateTime!
  }

  type RiskFactor {
    factor: String!
    score: Float!
    description: String
    category: RiskCategory!
  }

  enum RiskCategory {
    BEHAVIORAL
    REPUTATION
    GEOLOCATION
    TEMPORAL
    VOLUME
    TECHNICAL
  }

  # Time Series Analytics
  type TimeSeriesData {
    series: [TimeSeries!]!
    timeRange: TimeRange!
    interval: TimeInterval!
    aggregationMethod: AggregationMethod!
  }

  type TimeSeries {
    name: String!
    data: [TimeSeriesPoint!]!
    metadata: JSON
  }

  type TimeSeriesPoint {
    timestamp: DateTime!
    value: Float!
    metadata: JSON
  }

  enum AggregationMethod {
    COUNT
    SUM
    AVERAGE
    MIN
    MAX
    PERCENTILE_95
    PERCENTILE_99
  }

  # Event Correlation
  type EventCorrelationGraph {
    centralEvent: SecurityEvent!
    correlatedEvents: [CorrelatedEvent!]!
    relationships: [EventRelationship!]!
    metadata: CorrelationMetadata!
  }

  type CorrelatedEvent {
    event: SecurityEvent!
    correlationScore: Float!
    correlationType: CorrelationType!
    distance: Int!
  }

  enum CorrelationType {
    TEMPORAL
    SPATIAL
    USER_BASED
    HOST_BASED
    PROCESS_BASED
    NETWORK_BASED
    BEHAVIORAL
  }

  type EventRelationship {
    source: UUID!
    target: UUID!
    relationshipType: String!
    score: Float!
    evidence: [String!]!
  }

  type CorrelationMetadata {
    totalEvents: Int!
    maxDepth: Int!
    correlationAlgorithm: String!
    processingTime: Int!
  }

  # Queries
  type Query {
    securityEvents(
      filter: SecurityEventFilter
      sort: SecurityEventSort
      pagination: PaginationInput
    ): SecurityEventConnection!
    
    securityEvent(id: UUID!): SecurityEvent
    
    eventsTimeSeriesAggregation(
      timeRange: TimeRangeInput!
      interval: TimeInterval!
      groupBy: [String!]
      filter: SecurityEventFilter
      aggregation: AggregationMethod = COUNT
    ): TimeSeriesData!
    
    eventCorrelationGraph(
      eventId: UUID!
      maxDepth: Int = 3
      minCorrelationScore: Float = 0.7
    ): EventCorrelationGraph!
    
    eventStatistics(
      timeRange: TimeRangeInput!
      groupBy: [EventStatisticGroup!]!
    ): EventStatistics!
  }

  enum EventStatisticGroup {
    SEVERITY
    DEVICE_VENDOR
    DEVICE_PRODUCT
    SOURCE_IP
    DESTINATION_IP
    USER_NAME
    PROCESS_NAME
  }

  type EventStatistics {
    totalEvents: Int!
    uniqueValues: [EventStatisticValue!]!
    topValues: [EventStatisticValue!]!
  }

  type EventStatisticValue {
    value: String!
    count: Int!
    percentage: Float!
  }

  # Mutations
  type Mutation {
    ingestSecurityEvent(input: SecurityEventInput!): SecurityEvent!
    
    batchIngestSecurityEvents(
      events: [SecurityEventInput!]!
      batchSize: Int = 1000
    ): SecurityEventBatchResult!
    
    updateSecurityEvent(id: UUID!, input: SecurityEventUpdateInput!): SecurityEvent!
    deleteSecurityEvent(id: UUID!): Boolean!
    
    enrichSecurityEvent(id: UUID!): SecurityEvent!
    reprocessSecurityEvent(id: UUID!): SecurityEvent!
  }

  # Subscriptions
  type Subscription {
    securityEventStream(filter: SecurityEventStreamFilter): SecurityEvent!
    criticalSecurityAlerts: SecurityEvent!
    eventCorrelations: EventCorrelation!
  }

  type EventCorrelation {
    primaryEvent: SecurityEvent!
    correlatedEvents: [SecurityEvent!]!
    correlationType: String!
    score: Float!
    detectedAt: DateTime!
  }
`;

// =====================================================
// CASE MANAGEMENT SERVICE
// =====================================================

const caseManagementTypeDefs = `
  extend type SecurityEvent @key(fields: "id") {
    id: ID! @external
    cases: [SecurityCase!]!
  }

  extend type ThreatIntelligence @key(fields: "id") {
    id: ID! @external
  }

  type SecurityCase @key(fields: "id") {
    id: UUID!
    title: String!
    description: String!
    
    # Classification
    caseType: SecurityCaseType!
    severity: SecuritySeverity!
    priority: CasePriority!
    status: CaseStatus!
    
    # Assignment
    assignee: SecurityAnalyst
    team: SecurityTeam!
    
    # Timeline
    createdAt: DateTime!
    updatedAt: DateTime!
    firstOccurrence: DateTime!
    lastOccurrence: DateTime!
    resolvedAt: DateTime
    closedAt: DateTime
    dueDate: DateTime
    
    # Evidence
    securityEvents: [SecurityEvent!]!
    threatIntelligence: [ThreatIntelligence!]!
    indicators: [IOC!]!
    
    # Activities
    activities: [CaseActivity!]!
    notes: [CaseNote!]!
    attachments: [CaseAttachment!]!
    
    # SOAR Integration
    playbooks: [PlaybookExecution!]!
    automatedActions: [AutomatedAction!]!
    
    # SLA and Metrics
    slaStatus: SLAStatus!
    meanTimeToDetection: Int
    meanTimeToResponse: Int
    meanTimeToResolution: Int
    
    # Relationships
    relatedCases: [SecurityCase!]!
    parentCase: SecurityCase
    childCases: [SecurityCase!]!
    
    # Compliance
    complianceFrameworks: [ComplianceFramework!]!
    
    # Tags
    tags: [String!]!
  }

  type SecurityAnalyst @key(fields: "id") {
    id: UUID!
    name: String!
    email: String!
    role: SecurityRole!
    team: SecurityTeam!
    skills: [String!]!
    certifications: [Certification!]!
    activeWorkload: Int!
    availability: AnalystAvailability!
  }

  type Certification {
    name: String!
    issuingOrganization: String!
    issueDate: DateTime!
    expirationDate: DateTime
    credentialId: String
  }

  type AnalystAvailability {
    status: AvailabilityStatus!
    availableFrom: DateTime
    availableUntil: DateTime
    timeZone: String!
  }

  enum AvailabilityStatus {
    AVAILABLE
    BUSY
    IN_MEETING
    ON_BREAK
    OFF_DUTY
    ON_VACATION
  }

  type SecurityTeam @key(fields: "id") {
    id: UUID!
    name: String!
    description: String
    members: [SecurityAnalyst!]!
    capabilities: [String!]!
    specialization: [TeamSpecialization!]!
    workingHours: WorkingHours!
  }

  enum TeamSpecialization {
    INCIDENT_RESPONSE
    THREAT_HUNTING
    MALWARE_ANALYSIS
    DIGITAL_FORENSICS
    VULNERABILITY_MANAGEMENT
    COMPLIANCE
    SOC_L1
    SOC_L2
    SOC_L3
  }

  type WorkingHours {
    timeZone: String!
    monday: DaySchedule
    tuesday: DaySchedule
    wednesday: DaySchedule
    thursday: DaySchedule
    friday: DaySchedule
    saturday: DaySchedule
    sunday: DaySchedule
    holidays: [Holiday!]!
  }

  type DaySchedule {
    startTime: String! # HH:mm format
    endTime: String!   # HH:mm format
    isWorkingDay: Boolean!
  }

  type Holiday {
    name: String!
    date: DateTime!
    isRecurring: Boolean!
  }

  type CaseActivity @key(fields: "id") {
    id: UUID!
    caseId: UUID!
    activityType: ActivityType!
    description: String!
    performer: SecurityAnalyst!
    timestamp: DateTime!
    metadata: JSON
    duration: Int # seconds spent on activity
  }

  type CaseNote @key(fields: "id") {
    id: UUID!
    caseId: UUID!
    content: String!
    author: SecurityAnalyst!
    createdAt: DateTime!
    updatedAt: DateTime
    isInternal: Boolean!
    tags: [String!]!
    mentions: [SecurityAnalyst!]! # @mentioned analysts
  }

  type CaseAttachment @key(fields: "id") {
    id: UUID!
    caseId: UUID!
    filename: String!
    originalFilename: String!
    contentType: String!
    size: BigInt!
    uploadedBy: SecurityAnalyst!
    uploadedAt: DateTime!
    description: String
    isEvidence: Boolean!
    hash: String!
    scanStatus: FileScanStatus!
    scanResults: JSON
  }

  enum FileScanStatus {
    PENDING
    SCANNING
    CLEAN
    MALICIOUS
    SUSPICIOUS
    ERROR
  }

  type SLAStatus {
    isWithinSLA: Boolean!
    timeRemaining: Int # seconds
    breachReason: String
    slaTarget: Int! # seconds
    elapsedTime: Int! # seconds
  }

  type AutomatedAction @key(fields: "id") {
    id: UUID!
    caseId: UUID!
    actionType: String!
    description: String!
    executedAt: DateTime!
    success: Boolean!
    result: String
    executedBy: String!
    parameters: JSON
    duration: Int # execution time in seconds
  }

  # Analytics Types
  type CaseMetrics {
    totalCases: Int!
    openCases: Int!
    closedCases: Int!
    averageResolutionTime: Float!
    casesByTeam: [TeamCaseMetric!]!
    casesBySeverity: [SeverityCaseMetric!]!
    casesByStatus: [StatusCaseMetric!]!
    slaMetrics: SLAMetrics!
    workloadDistribution: [WorkloadMetric!]!
  }

  type TeamCaseMetric {
    team: SecurityTeam!
    openCases: Int!
    closedCases: Int!
    averageResolutionTime: Float!
    slaCompliance: Float!
  }

  type SeverityCaseMetric {
    severity: SecuritySeverity!
    count: Int!
    averageResolutionTime: Float!
    slaTarget: Int!
  }

  type StatusCaseMetric {
    status: CaseStatus!
    count: Int!
    averageAge: Float! # hours
  }

  type SLAMetrics {
    within1Hour: Float! # percentage
    within4Hours: Float!
    within24Hours: Float!
    breaches: Int!
    averageResponseTime: Float! # minutes
  }

  type WorkloadMetric {
    analyst: SecurityAnalyst!
    activeCases: Int!
    averageCaseAge: Float! # hours
    utilizationRate: Float! # percentage
  }

  # Queries
  type Query {
    securityCases(
      filter: SecurityCaseFilter
      sort: SecurityCaseSort
      pagination: PaginationInput
    ): SecurityCaseConnection!
    
    securityCase(id: UUID!): SecurityCase
    
    caseMetrics(
      timeRange: TimeRangeInput
      teamFilter: [UUID!]
      severityFilter: [SecuritySeverity!]
    ): CaseMetrics!
    
    analystWorkload(analystId: UUID!): WorkloadMetric!
    teamWorkload(teamId: UUID!): [WorkloadMetric!]!
    
    casesNearingSLA(hoursThreshold: Int = 2): [SecurityCase!]!
    
    securityTeams: [SecurityTeam!]!
    securityAnalysts(teamId: UUID): [SecurityAnalyst!]!
  }

  # Mutations
  type Mutation {
    createSecurityCase(input: SecurityCaseInput!): SecurityCase!
    updateSecurityCase(id: UUID!, input: SecurityCaseUpdateInput!): SecurityCase!
    assignCase(caseId: UUID!, assigneeId: UUID!): SecurityCase!
    transferCase(caseId: UUID!, fromTeam: UUID!, toTeam: UUID!, reason: String!): SecurityCase!
    escalateCase(caseId: UUID!, reason: String!): SecurityCase!
    closeCase(caseId: UUID!, resolution: String!): SecurityCase!
    reopenCase(caseId: UUID!, reason: String!): SecurityCase!
    
    addCaseNote(caseId: UUID!, content: String!, isInternal: Boolean = false): CaseNote!
    updateCaseNote(id: UUID!, content: String!): CaseNote!
    deleteCaseNote(id: UUID!): Boolean!
    
    uploadCaseAttachment(caseId: UUID!, file: Upload!, description: String): CaseAttachment!
    deleteCaseAttachment(id: UUID!): Boolean!
    
    linkCases(parentCaseId: UUID!, childCaseId: UUID!): Boolean!
    unlinkCases(parentCaseId: UUID!, childCaseId: UUID!): Boolean!
  }

  # Subscriptions
  type Subscription {
    caseUpdates(caseId: UUID): SecurityCase!
    caseAssignments(analystId: UUID!): SecurityCase!
    slaBreaches: SecurityCase!
    newCases(teamId: UUID): SecurityCase!
  }
`;

// =====================================================
// SOAR PLAYBOOKS SERVICE
// =====================================================

const soarPlaybooksTypeDefs = `
  extend type SecurityCase @key(fields: "id") {
    id: ID! @external
    playbooks: [PlaybookExecution!]!
  }

  extend type MitreAttackPattern @key(fields: "id") {
    id: ID! @external
    responsePlaybooks: [SecurityPlaybook!]!
  }

  type SecurityPlaybook @key(fields: "id") {
    id: UUID!
    name: String!
    description: String!
    version: String!
    
    # Configuration
    category: PlaybookCategory!
    severity: SecuritySeverity!
    automated: Boolean!
    approvalRequired: Boolean!
    
    # Triggers
    triggers: [PlaybookTrigger!]!
    
    # Workflow
    steps: [PlaybookStep!]!
    
    # Schema
    inputSchema: JSON!
    outputSchema: JSON!
    
    # Statistics
    executionCount: Int!
    successRate: Float!
    averageExecutionTime: Int!
    lastExecuted: DateTime
    
    # Authoring
    author: SecurityAnalyst!
    maintainer: SecurityAnalyst!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Status
    status: PlaybookStatus!
    tags: [String!]!
    
    # Associations
    mitreAttackPatterns: [MitreAttackPattern!]!
    relatedPlaybooks: [SecurityPlaybook!]!
    
    # Executions
    executions: [PlaybookExecution!]!
    recentExecutions: [PlaybookExecution!]!
  }

  type PlaybookTrigger @key(fields: "id") {
    id: UUID!
    playbookId: UUID!
    triggerType: TriggerType!
    condition: String!
    enabled: Boolean!
    priority: Int!
    parameters: JSON
  }

  type PlaybookStep @key(fields: "id") {
    id: UUID!
    playbookId: UUID!
    name: String!
    description: String!
    stepType: PlaybookStepType!
    order: Int!
    
    # Configuration
    actionDefinition: JSON!
    timeout: Int!
    retryAttempts: Int!
    continueOnFailure: Boolean!
    
    # Conditions
    preconditions: [String!]!
    
    # Human Interaction
    requiresApproval: Boolean!
    approvers: [SecurityAnalyst!]!
    
    # Mapping
    inputMapping: JSON!
    outputMapping: JSON!
    
    # Dependencies
    dependencies: [PlaybookStep!]!
    nextSteps: [PlaybookStep!]!
    
    # Statistics
    executionCount: Int!
    successRate: Float!
    averageExecutionTime: Int!
  }

  type PlaybookExecution @key(fields: "id") {
    id: UUID!
    playbook: SecurityPlaybook!
    
    # Context
    triggeredBy: ExecutionTrigger!
    case: SecurityCase
    securityEvent: SecurityEvent
    
    # Status
    status: ExecutionStatus!
    startedAt: DateTime!
    completedAt: DateTime
    duration: Int
    
    # Results
    success: Boolean
    errorMessage: String
    
    # Steps
    stepExecutions: [StepExecution!]!
    
    # Data
    inputData: JSON!
    outputData: JSON
    
    # Human Interactions
    approvals: [ExecutionApproval!]!
    
    # Executor
    executedBy: SecurityAnalyst
    automated: Boolean!
    
    # Metrics
    metrics: ExecutionMetrics!
  }

  union ExecutionTrigger = SecurityEvent | SecurityCase | IOC | ScheduledTrigger | ManualTrigger

  type ScheduledTrigger @key(fields: "scheduleId") {
    scheduleId: UUID!
    scheduleName: String!
    cronExpression: String!
    nextRun: DateTime!
  }

  type ManualTrigger {
    triggeredBy: SecurityAnalyst!
    reason: String!
    triggeredAt: DateTime!
  }

  type StepExecution @key(fields: "id") {
    id: UUID!
    executionId: UUID!
    step: PlaybookStep!
    status: ExecutionStatus!
    startedAt: DateTime
    completedAt: DateTime
    duration: Int
    success: Boolean
    errorMessage: String
    inputData: JSON
    outputData: JSON
    retryCount: Int!
    logs: [ExecutionLog!]!
  }

  type ExecutionLog {
    timestamp: DateTime!
    level: LogLevel!
    message: String!
    metadata: JSON
  }

  enum LogLevel {
    DEBUG
    INFO
    WARN
    ERROR
    FATAL
  }

  type ExecutionApproval @key(fields: "id") {
    id: UUID!
    executionId: UUID!
    step: PlaybookStep!
    approver: SecurityAnalyst!
    approved: Boolean!
    comments: String
    approvedAt: DateTime!
    requestedAt: DateTime!
  }

  type ExecutionMetrics {
    totalSteps: Int!
    completedSteps: Int!
    failedSteps: Int!
    skippedSteps: Int!
    averageStepDuration: Float!
    resourcesUsed: JSON
    costEstimate: Float
  }

  # Response Action Types
  type ResponseAction @key(fields: "id") {
    id: UUID!
    actionType: ResponseActionType!
    name: String!
    description: String!
    parameters: JSON!
    enabled: Boolean!
    integrationId: UUID!
    costPerExecution: Float
    averageExecutionTime: Int! # seconds
  }

  enum ResponseActionType {
    ISOLATE_HOST
    BLOCK_IP
    BLOCK_DOMAIN
    BLOCK_URL
    QUARANTINE_FILE
    DISABLE_USER_ACCOUNT
    RESET_PASSWORD
    SEND_EMAIL
    CREATE_TICKET
    UPDATE_FIREWALL
    SCAN_ENDPOINT
    COLLECT_ARTIFACTS
    ENRICH_IOC
    CUSTOM_SCRIPT
  }

  # Integration Management
  type SecurityIntegration @key(fields: "id") {
    id: UUID!
    name: String!
    type: IntegrationType!
    vendor: String!
    version: String!
    endpoint: String!
    status: IntegrationStatus!
    lastHealthCheck: DateTime!
    availableActions: [ResponseAction!]!
    configuration: JSON!
    apiLimits: APILimits!
  }

  enum IntegrationType {
    SIEM
    EDR
    FIREWALL
    EMAIL_SECURITY
    THREAT_INTELLIGENCE
    TICKETING
    IDENTITY_PROVIDER
    CLOUD_SECURITY
    VULNERABILITY_SCANNER
    SANDBOX
    CUSTOM
  }

  enum IntegrationStatus {
    ACTIVE
    INACTIVE
    ERROR
    MAINTENANCE
    DEGRADED
  }

  type APILimits {
    requestsPerMinute: Int!
    requestsPerHour: Int!
    requestsPerDay: Int!
    currentUsage: APIUsage!
  }

  type APIUsage {
    requestsThisMinute: Int!
    requestsThisHour: Int!
    requestsThisDay: Int!
    lastReset: DateTime!
  }

  # Queries
  type Query {
    securityPlaybooks(
      filter: SecurityPlaybookFilter
      pagination: PaginationInput
    ): SecurityPlaybookConnection!
    
    securityPlaybook(id: UUID!): SecurityPlaybook
    
    playbookExecutions(
      filter: PlaybookExecutionFilter
      pagination: PaginationInput
    ): PlaybookExecutionConnection!
    
    playbookExecution(id: UUID!): PlaybookExecution
    
    responseActions(integrationType: IntegrationType): [ResponseAction!]!
    
    securityIntegrations(status: IntegrationStatus): [SecurityIntegration!]!
    
    playbookMetrics(
      playbookId: UUID
      timeRange: TimeRangeInput
    ): PlaybookMetrics!
  }

  type PlaybookMetrics {
    totalExecutions: Int!
    successfulExecutions: Int!
    failedExecutions: Int!
    averageExecutionTime: Float!
    costSavings: Float!
    timesSaved: Int! # hours
    topFailureReasons: [FailureReason!]!
  }

  type FailureReason {
    reason: String!
    count: Int!
    percentage: Float!
  }

  # Mutations
  type Mutation {
    createSecurityPlaybook(input: SecurityPlaybookInput!): SecurityPlaybook!
    updateSecurityPlaybook(id: UUID!, input: SecurityPlaybookUpdateInput!): SecurityPlaybook!
    deleteSecurityPlaybook(id: UUID!): Boolean!
    cloneSecurityPlaybook(id: UUID!, name: String!): SecurityPlaybook!
    
    executePlaybook(
      playbookId: UUID!
      inputData: JSON!
      caseId: UUID
      automated: Boolean = false
    ): PlaybookExecution!
    
    approvePlaybookStep(
      executionId: UUID!
      stepId: UUID!
      approved: Boolean!
      comments: String
    ): ExecutionApproval!
    
    cancelPlaybookExecution(executionId: UUID!, reason: String!): PlaybookExecution!
    retryPlaybookExecution(executionId: UUID!, fromStep: UUID): PlaybookExecution!
    
    # Response Actions
    executeResponseAction(
      actionId: UUID!
      parameters: JSON!
      caseId: UUID
      reason: String!
    ): ResponseActionExecution!
    
    createSecurityIntegration(input: SecurityIntegrationInput!): SecurityIntegration!
    updateSecurityIntegration(id: UUID!, input: SecurityIntegrationUpdateInput!): SecurityIntegration!
    testSecurityIntegration(id: UUID!): IntegrationTestResult!
  }

  type ResponseActionExecution {
    id: UUID!
    action: ResponseAction!
    status: ExecutionStatus!
    result: JSON
    executedAt: DateTime!
    executedBy: SecurityAnalyst!
    duration: Int!
  }

  type IntegrationTestResult {
    success: Boolean!
    message: String!
    latency: Int! # milliseconds
    availableActions: [String!]!
    testedAt: DateTime!
  }

  # Subscriptions
  type Subscription {
    playbookExecutionUpdates(executionId: UUID!): PlaybookExecution!
    playbookApprovalRequests(analystId: UUID!): PlaybookExecution!
    integrationStatusUpdates: SecurityIntegration!
  }
`;

// =====================================================
// IOC & MITRE ATT&CK SERVICE
// =====================================================

const iocMitreTypeDefs = `
  extend type SecurityEvent @key(fields: "id") {
    id: ID! @external
    mitreAttackPatterns: [MitreAttackPattern!]!
  }

  extend type ThreatIntelligence @key(fields: "id") {
    id: ID! @external
    mitreAttackPatterns: [MitreAttackPattern!]!
  }

  # IOC Types
  type IOC @key(fields: "id") {
    id: UUID!
    value: String!
    type: IOCType!
    
    # Context
    description: String
    confidence: Float!
    severity: SecuritySeverity!
    
    # Temporal
    firstSeen: DateTime!
    lastSeen: DateTime!
    validUntil: DateTime
    
    # Source
    source: ThreatIntelligenceSource!
    tags: [String!]!
    
    # Detection
    hitCount: Int!
    falsePositiveCount: Int!
    lastHit: DateTime
    
    # Associations
    threatIntelligence: [ThreatIntelligence!]!
    associatedMalware: [String!]!
    campaigns: [String!]!
    mitreAttackPatterns: [MitreAttackPattern!]!
    
    # Detection Rules
    detectionRules: [DetectionRule!]!
    
    # Status
    status: IOCStatus!
    whitelisted: Boolean!
    whitelistReason: String
    
    # Metadata
    tlpMarking: TLPMarking!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DetectionRule @key(fields: "id") {
    id: UUID!
    iocId: UUID!
    name: String!
    description: String!
    ruleContent: String!
    ruleFormat: DetectionRuleFormat!
    enabled: Boolean!
    lastTriggered: DateTime
    triggerCount: Int!
    falsePositiveRate: Float
    tuningHistory: [RuleTuning!]!
  }

  type RuleTuning {
    tunedAt: DateTime!
    tunedBy: SecurityAnalyst!
    changes: JSON!
    reason: String!
    impact: String
  }

  # MITRE ATT&CK Types
  type MitreAttackPattern @key(fields: "id") {
    id: String! # T1055
    name: String!
    description: String!
    
    # Hierarchy
    tactic: MitreTactic!
    subTechniques: [MitreAttackPattern!]!
    parentTechnique: MitreAttackPattern
    
    # Platform Information
    platforms: [MitrePlatform!]!
    dataSourcesRequired: [MitreDataSource!]!
    permissions: [String!]!
    
    # Detection and Mitigation
    detectionStrategies: [DetectionStrategy!]!
    mitigationStrategies: [MitigationStrategy!]!
    
    # Usage Statistics
    eventCount: Int!
    lastSeenInEvents: DateTime
    
    # Associated Elements
    threatIntelligence: [ThreatIntelligence!]!
    responsePlaybooks: [SecurityPlaybook!]!
    
    # External References
    externalReferences: [ExternalReference!]!
    
    # Metadata
    version: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Risk Assessment
    prevalence: TechniquePrevalence!
    difficulty: TechniqueDifficulty!
    impact: TechniqueImpact!
  }

  enum TechniquePrevalence {
    VERY_HIGH
    HIGH
    MEDIUM
    LOW
    VERY_LOW
    UNKNOWN
  }

  enum TechniqueDifficulty {
    TRIVIAL
    EASY
    MODERATE
    HARD
    EXPERT
    UNKNOWN
  }

  enum TechniqueImpact {
    CRITICAL
    HIGH
    MODERATE
    LOW
    MINIMAL
    UNKNOWN
  }

  type MitreTactic @key(fields: "id") {
    id: String! # TA0001
    name: String!
    shortName: String!
    description: String!
    techniques: [MitreAttackPattern!]!
    order: Int!
  }

  type MitreDataSource @key(fields: "id") {
    id: String!
    name: String!
    description: String
    dataComponents: [MitreDataComponent!]!
    platforms: [MitrePlatform!]!
  }

  type MitreDataComponent {
    name: String!
    description: String!
    detectionStrategies: [String!]!
  }

  type DetectionStrategy @key(fields: "id") {
    id: UUID!
    attackPatternId: String!
    name: String!
    description: String!
    query: String
    queryLanguage: String
    confidence: Float!
    falsePositiveRate: Float
    dataSourcesRequired: [String!]!
    difficulty: DetectionDifficulty!
    coverage: DetectionCoverage!
  }

  enum DetectionDifficulty {
    TRIVIAL
    EASY
    MODERATE
    DIFFICULT
    EXPERT_LEVEL
  }

  enum DetectionCoverage {
    COMPLETE
    SIGNIFICANT
    PARTIAL
    MINIMAL
    THEORETICAL
  }

  type MitigationStrategy @key(fields: "id") {
    id: String! # M1001
    name: String!
    description: String!
    implementationGuidance: String
    effectiveness: MitigationEffectiveness!
    cost: MitigationCost!
    complexity: MitigationComplexity!
    applicableTechniques: [MitreAttackPattern!]!
  }

  enum MitigationCost {
    FREE
    LOW
    MODERATE
    HIGH
    ENTERPRISE
  }

  enum MitigationComplexity {
    SIMPLE
    MODERATE
    COMPLEX
    EXPERT_REQUIRED
  }

  # Similarity and Analysis Types
  type IOCSimilarity {
    ioc: IOC!
    similarityScore: Float!
    similarityFactors: [String!]!
    vectorDistance: Float!
  }

  type TechniqueAnalysis {
    technique: MitreAttackPattern!
    riskScore: Float!
    detectionCoverage: Float!
    mitigationCoverage: Float!
    threatLevel: ThreatLevel!
    recommendations: [String!]!
  }

  enum ThreatLevel {
    CRITICAL
    HIGH
    ELEVATED
    GUARDED
    LOW
  }

  # Queries
  type Query {
    iocs(
      filter: IOCFilter
      sort: IOCSort
      pagination: PaginationInput
    ): IOCConnection!
    
    ioc(id: UUID!): IOC
    
    findSimilarIOCs(
      ioc: String!
      threshold: Float = 0.8
      limit: Int = 10
    ): [IOCSimilarity!]!
    
    iocEnrichment(value: String!, type: IOCType!): IOCEnrichmentResult!
    
    mitreAttackPatterns(
      filter: MitreAttackPatternFilter
      pagination: PaginationInput
    ): MitreAttackPatternConnection!
    
    mitreAttackPattern(id: String!): MitreAttackPattern
    
    mitreTactics: [MitreTactic!]!
    
    mitreDataSources: [MitreDataSource!]!
    
    attackPathAnalysis(
      startTechnique: String!
      targetAsset: String!
      maxDepth: Int = 5
    ): AttackPathResult!
    
    techniqueAnalysis(
      techniqueId: String!
      organizationContext: JSON
    ): TechniqueAnalysis!
    
    threatLandscape(
      timeRange: TimeRangeInput!
      assetType: String
    ): ThreatLandscapeReport!
  }

  type IOCEnrichmentResult {
    ioc: String!
    type: IOCType!
    reputation: ReputationScore!
    geolocation: GeoLocation
    whois: WhoisData
    dnsHistory: [DNSRecord!]!
    malwareAssociations: [String!]!
    threatActorAssociations: [String!]!
    firstSeen: DateTime
    lastSeen: DateTime
  }

  type ReputationScore {
    score: Float! # 0-1 (0 = malicious, 1 = benign)
    verdict: ReputationVerdict!
    sources: [ReputationSource!]!
  }

  enum ReputationVerdict {
    MALICIOUS
    SUSPICIOUS
    UNKNOWN
    BENIGN
  }

  type ReputationSource {
    name: String!
    score: Float!
    verdict: ReputationVerdict!
    lastUpdated: DateTime!
  }

  type WhoisData {
    domain: String!
    registrar: String
    creationDate: DateTime
    expirationDate: DateTime
    nameservers: [String!]!
    registrant: ContactInfo
    admin: ContactInfo
    tech: ContactInfo
  }

  type ContactInfo {
    name: String
    organization: String
    email: String
    country: String
  }

  type AttackPathResult {
    paths: [AttackPath!]!
    totalPaths: Int!
    shortestPath: AttackPath
    riskScore: Float!
    recommendations: [String!]!
    coverageGaps: [String!]!
  }

  type AttackPath {
    techniques: [MitreAttackPattern!]!
    transitions: [PathTransition!]!
    length: Int!
    riskScore: Float!
    likelihood: Float!
    impact: Float!
  }

  type PathTransition {
    from: MitreAttackPattern!
    to: MitreAttackPattern!
    relationship: String!
    probability: Float!
    prerequisites: [String!]!
  }

  type ThreatLandscapeReport {
    timeRange: TimeRange!
    topTechniques: [TechniqueUsage!]!
    topTactics: [TacticUsage!]!
    trendAnalysis: TrendAnalysis!
    recommendations: [ThreatRecommendation!]!
  }

  type TechniqueUsage {
    technique: MitreAttackPattern!
    eventCount: Int!
    uniqueTargets: Int!
    severity: Float!
    trend: TrendDirection!
  }

  type TacticUsage {
    tactic: MitreTactic!
    eventCount: Int!
    uniqueTechniques: Int!
    severity: Float!
    coverage: Float!
  }

  type TrendAnalysis {
    direction: TrendDirection!
    changePercentage: Float!
    anomalies: [TrendAnomaly!]!
  }

  type TrendAnomaly {
    date: DateTime!
    technique: MitreAttackPattern!
    expectedCount: Int!
    actualCount: Int!
    deviation: Float!
  }

  type ThreatRecommendation {
    type: RecommendationType!
    priority: RecommendationPriority!
    title: String!
    description: String!
    techniques: [MitreAttackPattern!]!
    estimatedEffort: String!
    estimatedCost: String!
  }

  enum RecommendationType {
    DETECTION_IMPROVEMENT
    MITIGATION_IMPLEMENTATION
    MONITORING_ENHANCEMENT
    PROCESS_IMPROVEMENT
    TRAINING
    TECHNOLOGY_INVESTMENT
  }

  enum RecommendationPriority {
    CRITICAL
    HIGH
    MEDIUM
    LOW
  }

  # Mutations
  type Mutation {
    createIOC(input: IOCInput!): IOC!
    updateIOC(id: UUID!, input: IOCUpdateInput!): IOC!
    deleteIOC(id: UUID!): Boolean!
    whitelistIOC(id: UUID!, reason: String!): IOC!
    blacklistIOC(id: UUID!, reason: String!): IOC!
    
    bulkImportIOCs(
      iocs: [IOCInput!]!
      source: String!
    ): BulkIOCImportResult!
    
    createDetectionRule(input: DetectionRuleInput!): DetectionRule!
    updateDetectionRule(id: UUID!, input: DetectionRuleUpdateInput!): DetectionRule!
    tuneDetectionRule(id: UUID!, changes: JSON!, reason: String!): DetectionRule!
    enableDetectionRule(id: UUID!): DetectionRule!
    disableDetectionRule(id: UUID!): DetectionRule!
    
    # MITRE ATT&CK Management
    updateMitreData: MitreUpdateResult!
    createCustomTechnique(input: CustomTechniqueInput!): MitreAttackPattern!
    
    createDetectionStrategy(input: DetectionStrategyInput!): DetectionStrategy!
    updateDetectionStrategy(id: UUID!, input: DetectionStrategyUpdateInput!): DetectionStrategy!
  }

  type BulkIOCImportResult {
    totalProcessed: Int!
    successful: Int!
    failed: Int!
    duplicates: Int!
    errors: [ImportError!]!
  }

  type ImportError {
    line: Int!
    ioc: String!
    error: String!
  }

  type MitreUpdateResult {
    techniquesUpdated: Int!
    tacticsUpdated: Int!
    dataSourcesUpdated: Int!
    lastUpdate: DateTime!
  }

  # Subscriptions
  type Subscription {
    iocUpdates: IOC!
    newThreatTechniques: MitreAttackPattern!
    detectionRuleTriggered: DetectionRuleTriggered!
  }

  type DetectionRuleTriggered {
    rule: DetectionRule!
    ioc: IOC!
    events: [SecurityEvent!]!
    triggeredAt: DateTime!
    context: JSON!
  }
`;

// =====================================================
// GATEWAY CONFIGURATION
// =====================================================

export class SecurityOperationsGateway {
  private gateway: ApolloGateway;

  constructor(serviceConfigurations: ServiceConfig[]) {
    this.gateway = new ApolloGateway({
      supergraphSdl: new IntrospectAndCompose({
        subgraphs: serviceConfigurations.map(config => ({
          name: config.name,
          url: config.url
        }))
      }),
      buildService({ name, url }) {
        return new RemoteGraphQLDataSource({
          url,
          willSendRequest({ request, context }) {
            // Forward authentication headers
            if (context.authToken) {
              request.http.headers.set('authorization', context.authToken);
            }
            
            // Add correlation ID for tracing
            request.http.headers.set('x-correlation-id', context.correlationId);
            
            // Add service name for metrics
            request.http.headers.set('x-service-name', name);
          }
        });
      }
    });
  }

  public createServer(config: { 
    port: number; 
    playground?: boolean; 
    introspection?: boolean;
  }) {
    return new ApolloServer({
      gateway: this.gateway,
      subscriptions: false, // Handle subscriptions at subgraph level
      playground: config.playground,
      introspection: config.introspection,
      plugins: [
        // Query complexity analysis
        {
          requestDidStart() {
            return {
              didResolveOperation({ request, document }) {
                const complexity = calculateQueryComplexity({
                  estimators: [
                    fieldExtensionsEstimator(),
                    simpleEstimator({ defaultComplexity: 1 })
                  ],
                  maximumComplexity: 10000,
                  variables: request.variables,
                  document
                });
                
                console.log('Query complexity:', complexity);
              }
            };
          }
        },
        // Performance monitoring
        {
          requestDidStart() {
            return {
              willSendResponse({ response, metrics }) {
                console.log('Query execution time:', metrics?.queryPlanningTime);
              }
            };
          }
        }
      ],
      formatError: (error) => {
        console.error('GraphQL Error:', error);
        
        // Don't expose internal errors in production
        if (process.env.NODE_ENV === 'production') {
          return new Error('Internal server error');
        }
        
        return error;
      },
      context: ({ req }) => ({
        authToken: req.headers.authorization,
        correlationId: req.headers['x-correlation-id'] || generateCorrelationId(),
        user: req.user, // Assumes authentication middleware
        dataSources: {
          // Data sources will be injected at subgraph level
        }
      })
    });
  }
}

// =====================================================
// SERVICE FACTORY
// =====================================================

export class SecurityServiceFactory {
  static createThreatIntelligenceService(config: any): ServiceConfig {
    return {
      name: 'threat-intelligence',
      url: config.THREAT_INTEL_SERVICE_URL || 'http://localhost:4001/graphql',
      schema: threatIntelligenceTypeDefs,
      resolvers: {}, // Import threat intelligence resolvers
      dataSources: []
    };
  }

  static createSecurityEventsService(config: any): ServiceConfig {
    return {
      name: 'security-events',
      url: config.SECURITY_EVENTS_SERVICE_URL || 'http://localhost:4002/graphql',
      schema: securityEventsTypeDefs,
      resolvers: {}, // Import security events resolvers
      dataSources: []
    };
  }

  static createCaseManagementService(config: any): ServiceConfig {
    return {
      name: 'case-management',
      url: config.CASE_MANAGEMENT_SERVICE_URL || 'http://localhost:4003/graphql',
      schema: caseManagementTypeDefs,
      resolvers: {}, // Import case management resolvers
      dataSources: []
    };
  }

  static createSoarPlaybooksService(config: any): ServiceConfig {
    return {
      name: 'soar-playbooks',
      url: config.SOAR_PLAYBOOKS_SERVICE_URL || 'http://localhost:4004/graphql',
      schema: soarPlaybooksTypeDefs,
      resolvers: {}, // Import SOAR playbooks resolvers
      dataSources: []
    };
  }

  static createIocMitreService(config: any): ServiceConfig {
    return {
      name: 'ioc-mitre',
      url: config.IOC_MITRE_SERVICE_URL || 'http://localhost:4005/graphql',
      schema: iocMitreTypeDefs,
      resolvers: {}, // Import IOC/MITRE resolvers
      dataSources: []
    };
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Import these from appropriate libraries
function fieldExtensionsEstimator() {
  // Implementation for field extension based complexity estimation
  return () => 1;
}

function simpleEstimator(options: any) {
  // Implementation for simple complexity estimation
  return () => options.defaultComplexity;
}

function calculateQueryComplexity(options: any) {
  // Implementation for query complexity calculation
  return 100; // Placeholder
}

// =====================================================
// EXPORT CONFIGURATION
// =====================================================

export {
  threatIntelligenceTypeDefs,
  securityEventsTypeDefs,
  caseManagementTypeDefs,
  soarPlaybooksTypeDefs,
  iocMitreTypeDefs
};