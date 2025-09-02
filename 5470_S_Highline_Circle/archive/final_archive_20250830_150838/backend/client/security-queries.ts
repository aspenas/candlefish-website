// =====================================================
// CLIENT-SIDE GRAPHQL QUERIES & FRAGMENTS
// =====================================================
// Comprehensive query examples, fragments, and client-side utilities
// Optimized for security operations dashboard and API consumption
// =====================================================

import { gql } from '@apollo/client';

// =====================================================
// REUSABLE FRAGMENTS
// =====================================================

// Core Security Event Fragment
export const SECURITY_EVENT_FRAGMENT = gql`
  fragment SecurityEventCore on SecurityEvent {
    id
    timestamp
    name
    severity
    riskScore
    deviceVendor
    deviceProduct
    deviceVersion
    deviceEventClassId
    sourceIp
    destinationIp
    sourcePort
    destinationPort
    protocol
    userId
    userName
    processName
    commandLine
    filePath
    fileHash
    registryKey
    tags
    processedAt
    ingestionSource
  }
`;

// Extended Security Event Fragment with relationships
export const SECURITY_EVENT_EXTENDED_FRAGMENT = gql`
  fragment SecurityEventExtended on SecurityEvent {
    ...SecurityEventCore
    extensions
    geoLocation {
      country
      region
      city
      latitude
      longitude
      timezone
      isp
    }
    asn {
      number
      organization
      networkRange
    }
    dnsResolution {
      domain
      recordType
      value
      ttl
      resolvedAt
    }
    riskFactors {
      factor
      score
      description
      category
    }
    correlationScore
    rawLog
  }
  ${SECURITY_EVENT_FRAGMENT}
`;

// Security Event with Full Relations
export const SECURITY_EVENT_FULL_FRAGMENT = gql`
  fragment SecurityEventFull on SecurityEvent {
    ...SecurityEventExtended
    mitreAttackPatterns {
      ...MitreAttackPatternCore
    }
    threatIntelligence {
      ...ThreatIntelligenceCore
    }
    cases {
      ...SecurityCaseCore
    }
    correlatedEvents {
      ...SecurityEventCore
    }
  }
  ${SECURITY_EVENT_EXTENDED_FRAGMENT}
  ${MITRE_ATTACK_PATTERN_CORE_FRAGMENT}
  ${THREAT_INTELLIGENCE_CORE_FRAGMENT}
  ${SECURITY_CASE_CORE_FRAGMENT}
`;

// Threat Intelligence Fragments
export const THREAT_INTELLIGENCE_CORE_FRAGMENT = gql`
  fragment ThreatIntelligenceCore on ThreatIntelligence {
    id
    stixId
    stixType
    name
    description
    labels
    confidence
    validFrom
    validUntil
    firstSeen
    lastSeen
    tlpMarking
    tags
    createdAt
    updatedAt
  }
`;

export const THREAT_INTELLIGENCE_EXTENDED_FRAGMENT = gql`
  fragment ThreatIntelligenceExtended on ThreatIntelligence {
    ...ThreatIntelligenceCore
    source {
      id
      name
      reliability
      url
      description
      feedType
      updateFrequency
      lastUpdate
      isActive
    }
    externalReferences {
      sourceName
      url
      description
      externalId
    }
    pattern
    patternType
    killChainPhases {
      killChainName
      phaseName
      order
    }
  }
  ${THREAT_INTELLIGENCE_CORE_FRAGMENT}
`;

// MITRE ATT&CK Pattern Fragments
export const MITRE_ATTACK_PATTERN_CORE_FRAGMENT = gql`
  fragment MitreAttackPatternCore on MitreAttackPattern {
    id
    name
    description
    platforms
    eventCount
    lastSeenInEvents
    version
    createdAt
    updatedAt
  }
`;

export const MITRE_ATTACK_PATTERN_EXTENDED_FRAGMENT = gql`
  fragment MitreAttackPatternExtended on MitreAttackPattern {
    ...MitreAttackPatternCore
    tactic {
      id
      name
      shortName
      description
      order
    }
    subTechniques {
      id
      name
      description
    }
    parentTechnique {
      id
      name
    }
    dataSourcesRequired {
      id
      name
      description
      dataComponents {
        name
        description
        detectionStrategies
      }
      platforms
    }
    detectionStrategies {
      id
      name
      description
      query
      queryLanguage
      confidence
      falsePositiveRate
      dataSourcesRequired
      difficulty
      coverage
    }
    mitigationStrategies {
      id
      name
      description
      implementationGuidance
      effectiveness
      cost
      complexity
    }
    prevalence
    difficulty
    impact
    externalReferences {
      sourceName
      url
      description
      externalId
    }
  }
  ${MITRE_ATTACK_PATTERN_CORE_FRAGMENT}
`;

// Security Case Fragments
export const SECURITY_CASE_CORE_FRAGMENT = gql`
  fragment SecurityCaseCore on SecurityCase {
    id
    title
    description
    caseType
    severity
    priority
    status
    createdAt
    updatedAt
    firstOccurrence
    lastOccurrence
    resolvedAt
    closedAt
    dueDate
    tags
  }
`;

export const SECURITY_CASE_EXTENDED_FRAGMENT = gql`
  fragment SecurityCaseExtended on SecurityCase {
    ...SecurityCaseCore
    assignee {
      ...SecurityAnalystCore
    }
    team {
      ...SecurityTeamCore
    }
    slaStatus {
      isWithinSLA
      timeRemaining
      breachReason
      slaTarget
      elapsedTime
    }
    meanTimeToDetection
    meanTimeToResponse
    meanTimeToResolution
  }
  ${SECURITY_CASE_CORE_FRAGMENT}
  ${SECURITY_ANALYST_CORE_FRAGMENT}
  ${SECURITY_TEAM_CORE_FRAGMENT}
`;

// Security Analyst & Team Fragments
export const SECURITY_ANALYST_CORE_FRAGMENT = gql`
  fragment SecurityAnalystCore on SecurityAnalyst {
    id
    name
    email
    role
    skills
    activeWorkload
    availability {
      status
      availableFrom
      availableUntil
      timeZone
    }
  }
`;

export const SECURITY_TEAM_CORE_FRAGMENT = gql`
  fragment SecurityTeamCore on SecurityTeam {
    id
    name
    description
    capabilities
    specialization
    workingHours {
      timeZone
      monday { startTime endTime isWorkingDay }
      tuesday { startTime endTime isWorkingDay }
      wednesday { startTime endTime isWorkingDay }
      thursday { startTime endTime isWorkingDay }
      friday { startTime endTime isWorkingDay }
      saturday { startTime endTime isWorkingDay }
      sunday { startTime endTime isWorkingDay }
    }
  }
`;

// IOC Fragments
export const IOC_CORE_FRAGMENT = gql`
  fragment IOCCore on IOC {
    id
    value
    type
    description
    confidence
    severity
    firstSeen
    lastSeen
    validUntil
    hitCount
    falsePositiveCount
    lastHit
    status
    whitelisted
    whitelistReason
    tlpMarking
    tags
    createdAt
    updatedAt
  }
`;

export const IOC_EXTENDED_FRAGMENT = gql`
  fragment IOCExtended on IOC {
    ...IOCCore
    source {
      ...ThreatIntelligenceSourceCore
    }
    associatedMalware
    campaigns
    detectionRules {
      id
      name
      description
      ruleContent
      ruleFormat
      enabled
      lastTriggered
      triggerCount
      falsePositiveRate
    }
  }
  ${IOC_CORE_FRAGMENT}
  ${THREAT_INTELLIGENCE_SOURCE_CORE_FRAGMENT}
`;

// Playbook Fragments
export const SECURITY_PLAYBOOK_CORE_FRAGMENT = gql`
  fragment SecurityPlaybookCore on SecurityPlaybook {
    id
    name
    description
    version
    category
    severity
    automated
    approvalRequired
    executionCount
    successRate
    averageExecutionTime
    lastExecuted
    status
    tags
    createdAt
    updatedAt
  }
`;

export const PLAYBOOK_EXECUTION_CORE_FRAGMENT = gql`
  fragment PlaybookExecutionCore on PlaybookExecution {
    id
    status
    startedAt
    completedAt
    duration
    success
    errorMessage
    automated
    inputData
    outputData
  }
`;

// Source Fragments
export const THREAT_INTELLIGENCE_SOURCE_CORE_FRAGMENT = gql`
  fragment ThreatIntelligenceSourceCore on ThreatIntelligenceSource {
    id
    name
    reliability
    url
    description
    feedType
    updateFrequency
    lastUpdate
    isActive
  }
`;

// Pagination Fragment
export const PAGE_INFO_FRAGMENT = gql`
  fragment PageInfo on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;

// =====================================================
// SECURITY EVENT QUERIES
// =====================================================

// Get paginated security events with filtering
export const GET_SECURITY_EVENTS = gql`
  query GetSecurityEvents(
    $filter: SecurityEventFilter
    $sort: SecurityEventSort
    $pagination: PaginationInput
  ) {
    securityEvents(filter: $filter, sort: $sort, pagination: $pagination) {
      edges {
        node {
          ...SecurityEventExtended
        }
        cursor
      }
      pageInfo {
        ...PageInfo
      }
      totalCount
    }
  }
  ${SECURITY_EVENT_EXTENDED_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;

// Get single security event with full details
export const GET_SECURITY_EVENT_DETAILS = gql`
  query GetSecurityEventDetails($id: UUID!) {
    securityEvent(id: $id) {
      ...SecurityEventFull
    }
  }
  ${SECURITY_EVENT_FULL_FRAGMENT}
`;

// Time series aggregation for security events dashboard
export const GET_SECURITY_EVENTS_TIME_SERIES = gql`
  query GetSecurityEventsTimeSeries(
    $timeRange: TimeRangeInput!
    $interval: TimeInterval!
    $groupBy: [String!]
    $filter: SecurityEventFilter
    $aggregation: AggregationMethod = COUNT
  ) {
    eventsTimeSeriesAggregation(
      timeRange: $timeRange
      interval: $interval
      groupBy: $groupBy
      filter: $filter
      aggregation: $aggregation
    ) {
      series {
        name
        data {
          timestamp
          value
          metadata
        }
        metadata
      }
      timeRange {
        start
        end
      }
      interval
      aggregationMethod
    }
  }
`;

// Event correlation graph for investigation
export const GET_EVENT_CORRELATION_GRAPH = gql`
  query GetEventCorrelationGraph(
    $eventId: UUID!
    $maxDepth: Int = 3
    $minCorrelationScore: Float = 0.7
  ) {
    eventCorrelationGraph(
      eventId: $eventId
      maxDepth: $maxDepth
      minCorrelationScore: $minCorrelationScore
    ) {
      centralEvent {
        ...SecurityEventCore
      }
      correlatedEvents {
        event {
          ...SecurityEventCore
        }
        correlationScore
        correlationType
        distance
      }
      relationships {
        source
        target
        relationshipType
        score
        evidence
      }
      metadata {
        totalEvents
        maxDepth
        correlationAlgorithm
        processingTime
      }
    }
  }
  ${SECURITY_EVENT_CORE_FRAGMENT}
`;

// Event statistics for dashboard
export const GET_EVENT_STATISTICS = gql`
  query GetEventStatistics(
    $timeRange: TimeRangeInput!
    $groupBy: [EventStatisticGroup!]!
  ) {
    eventStatistics(timeRange: $timeRange, groupBy: $groupBy) {
      totalEvents
      uniqueValues {
        value
        count
        percentage
      }
      topValues {
        value
        count
        percentage
      }
    }
  }
`;

// =====================================================
// THREAT INTELLIGENCE QUERIES
// =====================================================

// Get paginated threat intelligence
export const GET_THREAT_INTELLIGENCE = gql`
  query GetThreatIntelligence(
    $filter: ThreatIntelligenceFilter
    $sort: ThreatIntelligenceSort
    $pagination: PaginationInput
  ) {
    threatIntelligence(filter: $filter, sort: $sort, pagination: $pagination) {
      edges {
        node {
          ...ThreatIntelligenceExtended
        }
        cursor
      }
      pageInfo {
        ...PageInfo
      }
      totalCount
    }
  }
  ${THREAT_INTELLIGENCE_EXTENDED_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;

// Get STIX objects by type
export const GET_STIX_OBJECTS_BY_TYPE = gql`
  query GetStixObjectsByType(
    $objectType: StixObjectType!
    $timeRange: TimeRangeInput
  ) {
    stixObjectsByType(objectType: $objectType, timeRange: $timeRange) {
      ...ThreatIntelligenceCore
    }
  }
  ${THREAT_INTELLIGENCE_CORE_FRAGMENT}
`;

// Get threat intelligence sources
export const GET_THREAT_INTELLIGENCE_SOURCES = gql`
  query GetThreatIntelligenceSources {
    threatIntelligenceSources {
      ...ThreatIntelligenceSourceCore
    }
  }
  ${THREAT_INTELLIGENCE_SOURCE_CORE_FRAGMENT}
`;

// =====================================================
// CASE MANAGEMENT QUERIES
// =====================================================

// Get paginated security cases
export const GET_SECURITY_CASES = gql`
  query GetSecurityCases(
    $filter: SecurityCaseFilter
    $sort: SecurityCaseSort
    $pagination: PaginationInput
  ) {
    securityCases(filter: $filter, sort: $sort, pagination: $pagination) {
      edges {
        node {
          ...SecurityCaseExtended
        }
        cursor
      }
      pageInfo {
        ...PageInfo
      }
      totalCount
    }
  }
  ${SECURITY_CASE_EXTENDED_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;

// Get single security case with full details
export const GET_SECURITY_CASE_DETAILS = gql`
  query GetSecurityCaseDetails($id: UUID!) {
    securityCase(id: $id) {
      ...SecurityCaseExtended
      securityEvents {
        ...SecurityEventCore
      }
      threatIntelligence {
        ...ThreatIntelligenceCore
      }
      indicators {
        ...IOCCore
      }
      activities {
        id
        activityType
        description
        performer {
          ...SecurityAnalystCore
        }
        timestamp
        metadata
        duration
      }
      notes {
        id
        content
        author {
          ...SecurityAnalystCore
        }
        createdAt
        updatedAt
        isInternal
        tags
        mentions {
          ...SecurityAnalystCore
        }
      }
      attachments {
        id
        filename
        originalFilename
        contentType
        size
        uploadedBy {
          ...SecurityAnalystCore
        }
        uploadedAt
        description
        isEvidence
        hash
        scanStatus
      }
      playbooks {
        ...PlaybookExecutionCore
        playbook {
          ...SecurityPlaybookCore
        }
      }
      automatedActions {
        id
        actionType
        description
        executedAt
        success
        result
        executedBy
        parameters
        duration
      }
      relatedCases {
        ...SecurityCaseCore
      }
      parentCase {
        ...SecurityCaseCore
      }
      childCases {
        ...SecurityCaseCore
      }
      complianceFrameworks {
        id
        name
        version
        description
      }
    }
  }
  ${SECURITY_CASE_EXTENDED_FRAGMENT}
  ${SECURITY_EVENT_CORE_FRAGMENT}
  ${THREAT_INTELLIGENCE_CORE_FRAGMENT}
  ${IOC_CORE_FRAGMENT}
  ${SECURITY_ANALYST_CORE_FRAGMENT}
  ${PLAYBOOK_EXECUTION_CORE_FRAGMENT}
  ${SECURITY_PLAYBOOK_CORE_FRAGMENT}
  ${SECURITY_CASE_CORE_FRAGMENT}
`;

// Get case metrics for dashboard
export const GET_CASE_METRICS = gql`
  query GetCaseMetrics(
    $timeRange: TimeRangeInput
    $teamFilter: [UUID!]
    $severityFilter: [SecuritySeverity!]
  ) {
    caseMetrics(
      timeRange: $timeRange
      teamFilter: $teamFilter
      severityFilter: $severityFilter
    ) {
      totalCases
      openCases
      closedCases
      averageResolutionTime
      casesByTeam {
        team {
          ...SecurityTeamCore
        }
        openCases
        closedCases
        averageResolutionTime
        slaCompliance
      }
      casesBySeverity {
        severity
        count
        averageResolutionTime
        slaTarget
      }
      casesByStatus {
        status
        count
        averageAge
      }
      slaMetrics {
        within1Hour
        within4Hours
        within24Hours
        breaches
        averageResponseTime
      }
      workloadDistribution {
        analyst {
          ...SecurityAnalystCore
        }
        activeCases
        averageCaseAge
        utilizationRate
      }
    }
  }
  ${SECURITY_TEAM_CORE_FRAGMENT}
  ${SECURITY_ANALYST_CORE_FRAGMENT}
`;

// Get cases nearing SLA breach
export const GET_CASES_NEARING_SLA = gql`
  query GetCasesNearingSLA($hoursThreshold: Int = 2) {
    casesNearingSLA(hoursThreshold: $hoursThreshold) {
      ...SecurityCaseExtended
    }
  }
  ${SECURITY_CASE_EXTENDED_FRAGMENT}
`;

// Get security teams and analysts
export const GET_SECURITY_TEAMS = gql`
  query GetSecurityTeams {
    securityTeams {
      ...SecurityTeamCore
      members {
        ...SecurityAnalystCore
        certifications {
          name
          issuingOrganization
          issueDate
          expirationDate
          credentialId
        }
      }
    }
  }
  ${SECURITY_TEAM_CORE_FRAGMENT}
  ${SECURITY_ANALYST_CORE_FRAGMENT}
`;

// Get analysts by team
export const GET_SECURITY_ANALYSTS = gql`
  query GetSecurityAnalysts($teamId: UUID) {
    securityAnalysts(teamId: $teamId) {
      ...SecurityAnalystCore
      team {
        ...SecurityTeamCore
      }
      certifications {
        name
        issuingOrganization
        issueDate
        expirationDate
        credentialId
      }
    }
  }
  ${SECURITY_ANALYST_CORE_FRAGMENT}
  ${SECURITY_TEAM_CORE_FRAGMENT}
`;

// =====================================================
// IOC & MITRE ATT&CK QUERIES
// =====================================================

// Get paginated IOCs
export const GET_IOCS = gql`
  query GetIOCs(
    $filter: IOCFilter
    $sort: IOCSort
    $pagination: PaginationInput
  ) {
    iocs(filter: $filter, sort: $sort, pagination: $pagination) {
      edges {
        node {
          ...IOCExtended
        }
        cursor
      }
      pageInfo {
        ...PageInfo
      }
      totalCount
    }
  }
  ${IOC_EXTENDED_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;

// Find similar IOCs using vector search
export const FIND_SIMILAR_IOCS = gql`
  query FindSimilarIOCs(
    $ioc: String!
    $threshold: Float = 0.8
    $limit: Int = 10
  ) {
    findSimilarIOCs(ioc: $ioc, threshold: $threshold, limit: $limit) {
      ioc {
        ...IOCCore
      }
      similarityScore
      similarityFactors
      vectorDistance
    }
  }
  ${IOC_CORE_FRAGMENT}
`;

// Get IOC enrichment data
export const GET_IOC_ENRICHMENT = gql`
  query GetIOCEnrichment($value: String!, $type: IOCType!) {
    iocEnrichment(value: $value, type: $type) {
      ioc
      type
      reputation {
        score
        verdict
        sources {
          name
          score
          verdict
          lastUpdated
        }
      }
      geolocation {
        country
        region
        city
        latitude
        longitude
        timezone
        isp
      }
      whois {
        domain
        registrar
        creationDate
        expirationDate
        nameservers
        registrant {
          name
          organization
          email
          country
        }
        admin {
          name
          organization
          email
          country
        }
        tech {
          name
          organization
          email
          country
        }
      }
      dnsHistory {
        domain
        recordType
        value
        ttl
        resolvedAt
      }
      malwareAssociations
      threatActorAssociations
      firstSeen
      lastSeen
    }
  }
`;

// Get MITRE ATT&CK patterns
export const GET_MITRE_ATTACK_PATTERNS = gql`
  query GetMitreAttackPatterns(
    $filter: MitreAttackPatternFilter
    $pagination: PaginationInput
  ) {
    mitreAttackPatterns(filter: $filter, pagination: $pagination) {
      edges {
        node {
          ...MitreAttackPatternExtended
        }
        cursor
      }
      pageInfo {
        ...PageInfo
      }
      totalCount
    }
  }
  ${MITRE_ATTACK_PATTERN_EXTENDED_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;

// Get MITRE tactics
export const GET_MITRE_TACTICS = gql`
  query GetMitreTactics {
    mitreTactics {
      id
      name
      shortName
      description
      order
      techniques {
        ...MitreAttackPatternCore
      }
    }
  }
  ${MITRE_ATTACK_PATTERN_CORE_FRAGMENT}
`;

// Attack path analysis
export const GET_ATTACK_PATH_ANALYSIS = gql`
  query GetAttackPathAnalysis(
    $startTechnique: String!
    $targetAsset: String!
    $maxDepth: Int = 5
  ) {
    attackPathAnalysis(
      startTechnique: $startTechnique
      targetAsset: $targetAsset
      maxDepth: $maxDepth
    ) {
      paths {
        techniques {
          ...MitreAttackPatternCore
        }
        transitions {
          from {
            ...MitreAttackPatternCore
          }
          to {
            ...MitreAttackPatternCore
          }
          relationship
          probability
          prerequisites
        }
        length
        riskScore
        likelihood
        impact
      }
      totalPaths
      shortestPath {
        techniques {
          ...MitreAttackPatternCore
        }
        length
        riskScore
      }
      riskScore
      recommendations
      coverageGaps
    }
  }
  ${MITRE_ATTACK_PATTERN_CORE_FRAGMENT}
`;

// Threat landscape report
export const GET_THREAT_LANDSCAPE_REPORT = gql`
  query GetThreatLandscapeReport(
    $timeRange: TimeRangeInput!
    $assetType: String
  ) {
    threatLandscape(timeRange: $timeRange, assetType: $assetType) {
      timeRange {
        start
        end
      }
      topTechniques {
        technique {
          ...MitreAttackPatternCore
        }
        eventCount
        uniqueTargets
        severity
        trend
      }
      topTactics {
        tactic {
          id
          name
          shortName
          description
        }
        eventCount
        uniqueTechniques
        severity
        coverage
      }
      trendAnalysis {
        direction
        changePercentage
        anomalies {
          date
          technique {
            ...MitreAttackPatternCore
          }
          expectedCount
          actualCount
          deviation
        }
      }
      recommendations {
        type
        priority
        title
        description
        techniques {
          ...MitreAttackPatternCore
        }
        estimatedEffort
        estimatedCost
      }
    }
  }
  ${MITRE_ATTACK_PATTERN_CORE_FRAGMENT}
`;

// =====================================================
// PLAYBOOK & SOAR QUERIES
// =====================================================

// Get security playbooks
export const GET_SECURITY_PLAYBOOKS = gql`
  query GetSecurityPlaybooks(
    $filter: SecurityPlaybookFilter
    $pagination: PaginationInput
  ) {
    securityPlaybooks(filter: $filter, pagination: $pagination) {
      edges {
        node {
          ...SecurityPlaybookCore
          author {
            ...SecurityAnalystCore
          }
          maintainer {
            ...SecurityAnalystCore
          }
          triggers {
            id
            triggerType
            condition
            enabled
            priority
            parameters
          }
          mitreAttackPatterns {
            ...MitreAttackPatternCore
          }
          relatedPlaybooks {
            ...SecurityPlaybookCore
          }
        }
        cursor
      }
      pageInfo {
        ...PageInfo
      }
      totalCount
    }
  }
  ${SECURITY_PLAYBOOK_CORE_FRAGMENT}
  ${SECURITY_ANALYST_CORE_FRAGMENT}
  ${MITRE_ATTACK_PATTERN_CORE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;

// Get playbook execution details
export const GET_PLAYBOOK_EXECUTION_DETAILS = gql`
  query GetPlaybookExecutionDetails($id: UUID!) {
    playbookExecution(id: $id) {
      ...PlaybookExecutionCore
      playbook {
        ...SecurityPlaybookCore
      }
      case {
        ...SecurityCaseCore
      }
      securityEvent {
        ...SecurityEventCore
      }
      stepExecutions {
        id
        step {
          id
          name
          description
          stepType
          order
          timeout
          retryAttempts
          continueOnFailure
          preconditions
          requiresApproval
          approvers {
            ...SecurityAnalystCore
          }
        }
        status
        startedAt
        completedAt
        duration
        success
        errorMessage
        inputData
        outputData
        retryCount
        logs {
          timestamp
          level
          message
          metadata
        }
      }
      approvals {
        id
        step {
          id
          name
        }
        approver {
          ...SecurityAnalystCore
        }
        approved
        comments
        approvedAt
        requestedAt
      }
      executedBy {
        ...SecurityAnalystCore
      }
      metrics {
        totalSteps
        completedSteps
        failedSteps
        skippedSteps
        averageStepDuration
        resourcesUsed
        costEstimate
      }
    }
  }
  ${PLAYBOOK_EXECUTION_CORE_FRAGMENT}
  ${SECURITY_PLAYBOOK_CORE_FRAGMENT}
  ${SECURITY_CASE_CORE_FRAGMENT}
  ${SECURITY_EVENT_CORE_FRAGMENT}
  ${SECURITY_ANALYST_CORE_FRAGMENT}
`;

// Get response actions
export const GET_RESPONSE_ACTIONS = gql`
  query GetResponseActions($integrationType: IntegrationType) {
    responseActions(integrationType: $integrationType) {
      id
      actionType
      name
      description
      parameters
      enabled
      integrationId
      costPerExecution
      averageExecutionTime
    }
  }
`;

// Get security integrations
export const GET_SECURITY_INTEGRATIONS = gql`
  query GetSecurityIntegrations($status: IntegrationStatus) {
    securityIntegrations(status: $status) {
      id
      name
      type
      vendor
      version
      endpoint
      status
      lastHealthCheck
      availableActions {
        id
        actionType
        name
        description
        enabled
      }
      configuration
      apiLimits {
        requestsPerMinute
        requestsPerHour
        requestsPerDay
        currentUsage {
          requestsThisMinute
          requestsThisHour
          requestsThisDay
          lastReset
        }
      }
    }
  }
`;

// =====================================================
// SYSTEM STATUS & ANALYTICS QUERIES
// =====================================================

// Get security operations status dashboard
export const GET_SECURITY_OPERATIONS_STATUS = gql`
  query GetSecurityOperationsStatus {
    securityOperationsStatus {
      systemHealth {
        overall
        components {
          name
          status
          message
          lastCheck
        }
        metrics {
          eventsPerSecond
          averageProcessingLatency
          queueDepth
          memoryUsage
          cpuUsage
          diskUsage
        }
      }
      activeIncidents
      criticalAlerts
      playbooksRunning
      averageResponseTime
      slaCompliance
      lastUpdated
    }
  }
`;

// Get security metrics report
export const GET_SECURITY_METRICS = gql`
  query GetSecurityMetrics(
    $timeRange: TimeRangeInput!
    $metrics: [String!]!
  ) {
    securityMetrics(timeRange: $timeRange, metrics: $metrics) {
      timeRange {
        start
        end
      }
      metrics {
        name
        value
        unit
        trend
        context
      }
      generatedAt
    }
  }
`;

// Get compliance report
export const GET_COMPLIANCE_REPORT = gql`
  query GetComplianceReport(
    $framework: String!
    $assessmentDate: DateTime
  ) {
    complianceReport(framework: $framework, assessmentDate: $assessmentDate) {
      framework {
        id
        name
        version
        description
      }
      assessmentDate
      overallStatus
      score
      requirements {
        requirement {
          id
          title
          description
          controls
          status
          lastAssessed
          nextAssessment
          evidence
        }
        status
        evidence
        gaps
      }
      recommendations
    }
  }
`;

// =====================================================
// ADVANCED ANALYTICS QUERIES
// =====================================================

// Threat hunting query
export const EXECUTE_THREAT_HUNT = gql`
  query ExecuteThreatHunt(
    $query: ThreatHuntQuery!
    $timeRange: TimeRangeInput!
  ) {
    threatHunt(query: $query, timeRange: $timeRange) {
      query {
        name
        description
        query
        queryType
        parameters
      }
      results {
        event {
          ...SecurityEventCore
        }
        score
        matchedCriteria
        context
      }
      totalMatches
      executionTime
      recommendations
    }
  }
  ${SECURITY_EVENT_CORE_FRAGMENT}
`;

// Entity relationship graph
export const GET_ENTITY_RELATIONSHIP_GRAPH = gql`
  query GetEntityRelationshipGraph(
    $entityId: UUID!
    $entityType: String!
    $depth: Int = 2
  ) {
    entityRelationshipGraph(
      entityId: $entityId
      entityType: $entityType
      depth: $depth
    ) {
      centralEntity {
        id
        type
        name
        properties
      }
      relatedEntities {
        id
        type
        name
        properties
      }
      relationships {
        source
        target
        type
        properties
      }
      depth
    }
  }
`;

// =====================================================
// SUBSCRIPTION QUERIES
// =====================================================

// Real-time security event stream
export const SECURITY_EVENT_STREAM_SUBSCRIPTION = gql`
  subscription SecurityEventStream($filter: SecurityEventStreamFilter) {
    securityEventStream(filter: $filter) {
      ...SecurityEventExtended
    }
  }
  ${SECURITY_EVENT_EXTENDED_FRAGMENT}
`;

// Critical security alerts
export const CRITICAL_SECURITY_ALERTS_SUBSCRIPTION = gql`
  subscription CriticalSecurityAlerts {
    criticalSecurityAlerts {
      ...SecurityEventFull
    }
  }
  ${SECURITY_EVENT_FULL_FRAGMENT}
`;

// Case updates subscription
export const CASE_UPDATES_SUBSCRIPTION = gql`
  subscription CaseUpdates($caseId: UUID) {
    caseUpdates(caseId: $caseId) {
      ...SecurityCaseExtended
    }
  }
  ${SECURITY_CASE_EXTENDED_FRAGMENT}
`;

// Case assignments subscription
export const CASE_ASSIGNMENTS_SUBSCRIPTION = gql`
  subscription CaseAssignments($analystId: UUID!) {
    caseAssignments(analystId: $analystId) {
      ...SecurityCaseExtended
    }
  }
  ${SECURITY_CASE_EXTENDED_FRAGMENT}
`;

// Playbook execution updates
export const PLAYBOOK_EXECUTION_UPDATES_SUBSCRIPTION = gql`
  subscription PlaybookExecutionUpdates($executionId: UUID!) {
    playbookExecutionUpdates(executionId: $executionId) {
      ...PlaybookExecutionCore
      playbook {
        ...SecurityPlaybookCore
      }
      stepExecutions {
        id
        status
        startedAt
        completedAt
        success
        errorMessage
      }
    }
  }
  ${PLAYBOOK_EXECUTION_CORE_FRAGMENT}
  ${SECURITY_PLAYBOOK_CORE_FRAGMENT}
`;

// Playbook approval requests
export const PLAYBOOK_APPROVAL_REQUESTS_SUBSCRIPTION = gql`
  subscription PlaybookApprovalRequests($analystId: UUID!) {
    playbookApprovalRequests(analystId: $analystId) {
      ...PlaybookExecutionCore
      playbook {
        name
        description
      }
      stepExecutions {
        id
        step {
          name
          description
          requiresApproval
        }
        status
      }
    }
  }
  ${PLAYBOOK_EXECUTION_CORE_FRAGMENT}
`;

// New threat intelligence
export const NEW_THREAT_INTELLIGENCE_SUBSCRIPTION = gql`
  subscription NewThreatIntelligence($source: String) {
    newThreatIntelligence(source: $source) {
      ...ThreatIntelligenceExtended
    }
  }
  ${THREAT_INTELLIGENCE_EXTENDED_FRAGMENT}
`;

// IOC updates
export const IOC_UPDATES_SUBSCRIPTION = gql`
  subscription IOCUpdates {
    iocUpdates {
      ...IOCExtended
    }
  }
  ${IOC_EXTENDED_FRAGMENT}
`;

// System health updates
export const SYSTEM_HEALTH_UPDATES_SUBSCRIPTION = gql`
  subscription SystemHealthUpdates {
    systemHealthUpdates {
      overall
      components {
        name
        status
        message
        lastCheck
      }
      metrics {
        eventsPerSecond
        averageProcessingLatency
        queueDepth
        memoryUsage
        cpuUsage
        diskUsage
      }
    }
  }
`;

// Attack pattern detections
export const ATTACK_PATTERN_DETECTIONS_SUBSCRIPTION = gql`
  subscription AttackPatternDetections {
    attackPatternDetections {
      attackPattern {
        ...MitreAttackPatternCore
      }
      events {
        ...SecurityEventCore
      }
      confidence
      detectedAt
      additionalContext
    }
  }
  ${MITRE_ATTACK_PATTERN_CORE_FRAGMENT}
  ${SECURITY_EVENT_CORE_FRAGMENT}
`;

// Event correlations
export const EVENT_CORRELATIONS_SUBSCRIPTION = gql`
  subscription EventCorrelations {
    eventCorrelations {
      primaryEvent {
        ...SecurityEventCore
      }
      correlatedEvents {
        ...SecurityEventCore
      }
      correlationType
      score
      detectedAt
    }
  }
  ${SECURITY_EVENT_CORE_FRAGMENT}
`;

// =====================================================
// MUTATION QUERIES
// =====================================================

// Ingest security event
export const INGEST_SECURITY_EVENT = gql`
  mutation IngestSecurityEvent($input: SecurityEventInput!) {
    ingestSecurityEvent(input: $input) {
      ...SecurityEventExtended
    }
  }
  ${SECURITY_EVENT_EXTENDED_FRAGMENT}
`;

// Batch ingest security events
export const BATCH_INGEST_SECURITY_EVENTS = gql`
  mutation BatchIngestSecurityEvents(
    $events: [SecurityEventInput!]!
    $batchSize: Int = 1000
  ) {
    batchIngestSecurityEvents(events: $events, batchSize: $batchSize) {
      successCount
      failureCount
      errors {
        index
        error
        input
      }
      processedAt
    }
  }
`;

// Create security case
export const CREATE_SECURITY_CASE = gql`
  mutation CreateSecurityCase($input: SecurityCaseInput!) {
    createSecurityCase(input: $input) {
      ...SecurityCaseExtended
    }
  }
  ${SECURITY_CASE_EXTENDED_FRAGMENT}
`;

// Assign case to analyst
export const ASSIGN_CASE = gql`
  mutation AssignCase($caseId: UUID!, $assigneeId: UUID!) {
    assignCase(caseId: $caseId, assigneeId: $assigneeId) {
      ...SecurityCaseExtended
    }
  }
  ${SECURITY_CASE_EXTENDED_FRAGMENT}
`;

// Add case note
export const ADD_CASE_NOTE = gql`
  mutation AddCaseNote(
    $caseId: UUID!
    $content: String!
    $isInternal: Boolean = false
  ) {
    addCaseNote(caseId: $caseId, content: $content, isInternal: $isInternal) {
      id
      content
      author {
        ...SecurityAnalystCore
      }
      createdAt
      isInternal
      tags
    }
  }
  ${SECURITY_ANALYST_CORE_FRAGMENT}
`;

// Execute playbook
export const EXECUTE_PLAYBOOK = gql`
  mutation ExecutePlaybook(
    $playbookId: UUID!
    $inputData: JSON!
    $caseId: UUID
    $automated: Boolean = false
  ) {
    executePlaybook(
      playbookId: $playbookId
      inputData: $inputData
      caseId: $caseId
      automated: $automated
    ) {
      ...PlaybookExecutionCore
      playbook {
        ...SecurityPlaybookCore
      }
    }
  }
  ${PLAYBOOK_EXECUTION_CORE_FRAGMENT}
  ${SECURITY_PLAYBOOK_CORE_FRAGMENT}
`;

// Approve playbook step
export const APPROVE_PLAYBOOK_STEP = gql`
  mutation ApprovePlaybookStep(
    $executionId: UUID!
    $stepId: UUID!
    $approved: Boolean!
    $comments: String
  ) {
    approvePlaybookStep(
      executionId: $executionId
      stepId: $stepId
      approved: $approved
      comments: $comments
    ) {
      id
      approved
      comments
      approver {
        ...SecurityAnalystCore
      }
      approvedAt
    }
  }
  ${SECURITY_ANALYST_CORE_FRAGMENT}
`;

// Response actions
export const ISOLATE_HOST = gql`
  mutation IsolateHost($hostname: String!, $reason: String!) {
    isolateHost(hostname: $hostname, reason: $reason) {
      id
      actionType
      description
      executedAt
      success
      result
      executedBy
      parameters
      duration
    }
  }
`;

export const BLOCK_IP = gql`
  mutation BlockIP(
    $ipAddress: String!
    $duration: Int
    $reason: String!
  ) {
    blockIP(ipAddress: $ipAddress, duration: $duration, reason: $reason) {
      id
      actionType
      description
      executedAt
      success
      result
      executedBy
      parameters
      duration
    }
  }
`;

// Create IOC
export const CREATE_IOC = gql`
  mutation CreateIOC($input: IOCInput!) {
    createIOC(input: $input) {
      ...IOCExtended
    }
  }
  ${IOC_EXTENDED_FRAGMENT}
`;

// Whitelist IOC
export const WHITELIST_IOC = gql`
  mutation WhitelistIOC($id: UUID!, $reason: String!) {
    whitelistIOC(id: $id, reason: $reason) {
      ...IOCCore
    }
  }
  ${IOC_CORE_FRAGMENT}
`;

// Bulk import IOCs
export const BULK_IMPORT_IOCS = gql`
  mutation BulkImportIOCs(
    $iocs: [IOCInput!]!
    $source: String!
  ) {
    bulkImportIOCs(iocs: $iocs, source: $source) {
      totalProcessed
      successful
      failed
      duplicates
      errors {
        line
        ioc
        error
      }
    }
  }
`;

// Create threat intelligence
export const CREATE_THREAT_INTELLIGENCE = gql`
  mutation CreateThreatIntelligence($input: ThreatIntelligenceInput!) {
    createThreatIntelligence(input: $input) {
      ...ThreatIntelligenceExtended
    }
  }
  ${THREAT_INTELLIGENCE_EXTENDED_FRAGMENT}
`;