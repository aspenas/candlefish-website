import { gql } from '@apollo/client';

// Fragments for reusable type definitions
export const THREAT_INTELLIGENCE_FRAGMENT = gql`
  fragment ThreatIntelligenceFragment on ThreatIntelligence {
    id
    organizationId
    title
    description
    threatType
    severity
    confidence
    reliability
    category
    subCategory
    killChainPhases
    firstSeen
    lastSeen
    lastUpdated
    targetedSectors
    targetedRegions
    tags
    metadata
    createdAt
    updatedAt
    
    attribution {
      confidence
      country
      region
      organization
      sector
      motivations
      capabilities
      reasoning
      alternativeHypotheses
      lastUpdated
    }
    
    sources {
      id
      name
      type
      reliability
      credibility
      accuracy
      timeliness
    }
    
    threatActors {
      id
      name
      aliases
      actorType
      sophistication
      motivations
      isActive
      firstSeen
      lastSeen
      countries
      targetedSectors
    }
    
    campaigns {
      id
      name
      aliases
      status
      confidence
      startDate
      endDate
      isActive
      objectives
      targets
      targetedSectors
      targetedCountries
    }
    
    indicators {
      id
      type
      value
      description
      confidence
      severity
      firstSeen
      lastSeen
      isActive
    }
    
    iocs {
      id
      type
      value
      category
      confidence
      severity
      description
      firstSeen
      lastSeen
      expiresAt
      isActive
      isWhitelisted
      whitelistReason
    }
    
    mitigations {
      id
      name
      description
      mitigationType
      effectiveness
      implementationDifficulty
      successRate
      impactReduction
    }
  }
`;

export const IOC_FRAGMENT = gql`
  fragment IOCFragment on IOC {
    id
    type
    value
    category
    confidence
    severity
    description
    firstSeen
    lastSeen
    expiresAt
    isActive
    isWhitelisted
    whitelistReason
    falsePositiveRate
    killChainPhase
    
    context {
      contextType
      value
      description
      confidence
    }
    
    threatActors {
      id
      name
      aliases
      actorType
      sophistication
      isActive
    }
    
    campaigns {
      id
      name
      status
      isActive
      startDate
      endDate
    }
    
    malwareFamilies {
      id
      name
      aliases
      type
      category
      platform
      isActive
      firstSeen
      lastSeen
    }
    
    sightings {
      id
      source
      location
      timestamp
      confidence
      context
      reportedBy {
        id
        name
        type
        reliability
      }
    }
    
    matches {
      id
      matchType
      confidence
      timestamp
      context {
        source
        location
        severity
        additionalInfo
      }
    }
    
    enrichment {
      enrichedAt
      sources
      asn {
        number
        name
        country
        registry
      }
      whoisData {
        registrar
        registrant
        creationDate
        expirationDate
        nameServers
      }
      dnsData {
        aRecords
        aaaaRecords
        cnameRecords
        txtRecords
        nsRecords
      }
      geoLocation {
        country
        region
        city
        latitude
        longitude
      }
      reputation {
        overallScore
        categories
        firstSeen
        lastSeen
        sources {
          source
          score
          categories
          lastUpdated
        }
      }
      malwareAnalysis {
        detectionRate
        firstSubmission
        lastAnalysis
        engines {
          name
          version
          result
          detected
          category
        }
        signatures
        behaviors {
          category
          description
          severity
        }
      }
    }
    
    tags
    metadata
    createdAt
    updatedAt
  }
`;

export const THREAT_ACTOR_FRAGMENT = gql`
  fragment ThreatActorFragment on ThreatActor {
    id
    name
    aliases
    description
    actorType
    sophistication
    motivations
    attribution {
      confidence
      country
      region
      organization
      sector
      motivations
      capabilities
      reasoning
    }
    countries
    organizations
    firstSeen
    lastSeen
    isActive
    capabilities
    targetedSectors
    targetedRegions
    victimology {
      primaryTargets
      secondaryTargets
      targetingCriteria
      opportunistic
      targeted
    }
    sources {
      id
      name
      type
      reliability
      credibility
    }
    tags
    metadata
    createdAt
    updatedAt
  }
`;

export const THREAT_CAMPAIGN_FRAGMENT = gql`
  fragment ThreatCampaignFragment on ThreatCampaign {
    id
    name
    aliases
    description
    status
    confidence
    startDate
    endDate
    isActive
    objectives
    targets
    targetedSectors
    targetedCountries
    victimCount
    estimatedLoss
    
    threatActors {
      id
      name
      aliases
      actorType
      sophistication
      isActive
    }
    
    attribution {
      confidence
      country
      region
      organization
      sector
      motivations
      capabilities
      reasoning
    }
    
    impact {
      scope
      severity
      financialImpact
      reputationalImpact
      operationalImpact
    }
    
    sources {
      id
      name
      type
      reliability
      credibility
    }
    
    tags
    metadata
    createdAt
    updatedAt
  }
`;

export const THREAT_FEED_FRAGMENT = gql`
  fragment ThreatFeedFragment on ThreatFeed {
    id
    name
    description
    url
    feedType
    format
    frequency
    status
    isActive
    lastUpdate
    nextUpdate
    totalIndicators
    activeIndicators
    newIndicators
    expiredIndicators
    qualityScore
    accuracy
    falsePositiveRate
    coverage
    
    health {
      overallHealth
      connectivity
      latency
      errorRate
      lastError
      uptime
    }
    
    provider {
      name
      type
      website
      reputation {
        score
        reliability
        trackRecord
        endorsements
      }
    }
    
    license {
      type
      terms
      restrictions
      attribution
      sharing
    }
    
    cost {
      model
      amount
      currency
      billingPeriod
    }
    
    processingRules {
      id
      name
      condition
      action
      parameters
      enabled
      order
    }
    
    enrichmentEnabled
    deduplicationEnabled
    tags
    metadata
    createdAt
    updatedAt
  }
`;

// Queries
export const GET_THREAT_INTELLIGENCE_DASHBOARD = gql`
  query GetThreatIntelligenceDashboard($organizationId: ID!, $timeRange: TimeRange!) {
    threatIntelligenceDashboard(organizationId: $organizationId, timeRange: $timeRange) {
      overview {
        totalThreats
        activeCampaigns
        trackedActors
        newIOCs
        highConfidenceThreats
        criticalSeverityCount
        recentActivityTrend
      }
      
      recentThreats {
        ...ThreatIntelligenceFragment
      }
      
      topThreatActors {
        ...ThreatActorFragment
        recentActivityCount
        associatedThreatsCount
      }
      
      activeCampaigns {
        ...ThreatCampaignFragment
        recentActivityCount
      }
      
      iocMetrics {
        totalIOCs
        newIOCs
        expiredIOCs
        whitelistedIOCs
        highConfidenceIOCs
        typeDistribution {
          type
          count
          percentage
        }
        confidenceDistribution {
          confidence
          count
          percentage
        }
      }
      
      feedStatus {
        totalFeeds
        activeFeeds
        errorFeeds
        lastSyncTime
        feeds {
          ...ThreatFeedFragment
        }
      }
      
      correlationMetrics {
        totalCorrelations
        activeCorrelations
        recentMatches
        averageConfidence
        effectivenessScore
      }
      
      geographicDistribution {
        country
        threatCount
        actorCount
        campaignCount
        coordinates {
          latitude
          longitude
        }
      }
      
      industryTargeting {
        sector
        threatCount
        actorCount
        campaignCount
        riskLevel
      }
      
      timeSeriesData {
        timestamp
        threatCount
        iocCount
        actorActivity
        campaignActivity
        correlationMatches
      }
    }
  }
  ${THREAT_INTELLIGENCE_FRAGMENT}
  ${THREAT_ACTOR_FRAGMENT}
  ${THREAT_CAMPAIGN_FRAGMENT}
  ${THREAT_FEED_FRAGMENT}
`;

export const GET_THREAT_INTELLIGENCE = gql`
  query GetThreatIntelligence(
    $filter: ThreatIntelligenceFilter
    $sort: ThreatIntelligenceSort
    $first: Int
    $after: String
    $last: Int
    $before: String
  ) {
    threatIntelligence(
      filter: $filter
      sort: $sort
      first: $first
      after: $after
      last: $last
      before: $before
    ) {
      edges {
        node {
          ...ThreatIntelligenceFragment
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${THREAT_INTELLIGENCE_FRAGMENT}
`;

export const SEARCH_THREATS = gql`
  query SearchThreats(
    $query: String!
    $filter: ThreatIntelligenceFilter
    $sort: ThreatIntelligenceSort
    $first: Int = 20
    $after: String
  ) {
    searchThreats(
      query: $query
      filter: $filter
      sort: $sort
      first: $first
      after: $after
    ) {
      threats {
        ...ThreatIntelligenceFragment
      }
      facets {
        threatTypes {
          value
          count
        }
        severities {
          value
          count
        }
        categories {
          value
          count
        }
        targetedSectors {
          value
          count
        }
        sources {
          value
          count
        }
      }
      totalCount
      searchTime
    }
  }
  ${THREAT_INTELLIGENCE_FRAGMENT}
`;

export const GET_IOCS = gql`
  query GetIOCs(
    $filter: IOCFilter
    $sort: IOCSort
    $first: Int
    $after: String
  ) {
    iocs(filter: $filter, sort: $sort, first: $first, after: $after) {
      edges {
        node {
          ...IOCFragment
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${IOC_FRAGMENT}
`;

export const SEARCH_IOCS = gql`
  query SearchIOCs(
    $query: String!
    $types: [IOCType!]
    $confidence: ThreatConfidence
    $activeOnly: Boolean = true
    $first: Int = 50
  ) {
    searchIOCs(
      query: $query
      types: $types
      confidence: $confidence
      activeOnly: $activeOnly
      first: $first
    ) {
      iocs {
        ...IOCFragment
      }
      facets {
        types {
          value
          count
        }
        categories {
          value
          count
        }
        confidenceLevels {
          value
          count
        }
        sources {
          value
          count
        }
      }
      totalCount
      searchTime
    }
  }
  ${IOC_FRAGMENT}
`;

export const ENRICH_IOC = gql`
  query EnrichIOC(
    $value: String!
    $type: IOCType!
    $sources: [String!]
  ) {
    enrichIOC(value: $value, type: $type, sources: $sources) {
      enrichedAt
      sources
      asn {
        number
        name
        country
        registry
      }
      whoisData {
        registrar
        registrant
        creationDate
        expirationDate
        nameServers
        contacts {
          type
          name
          organization
          email
          phone
          address {
            street
            city
            state
            postalCode
            country
          }
        }
      }
      dnsData {
        aRecords
        aaaaRecords
        cnameRecords
        mxRecords {
          priority
          exchange
        }
        txtRecords
        nsRecords
        soaRecord {
          primaryNameServer
          responsibleEmail
          serial
          refresh
          retry
          expire
          minimumTTL
        }
      }
      sslCertificate {
        subject
        issuer
        serialNumber
        notBefore
        notAfter
        fingerprints {
          sha1
          sha256
          md5
        }
        subjectAlternativeNames
        isValid
        isSelfSigned
      }
      reputation {
        overallScore
        sources {
          source
          score
          categories
          lastUpdated
        }
        categories
        firstSeen
        lastSeen
      }
      malwareAnalysis {
        detectionRate
        firstSubmission
        lastAnalysis
        engines {
          name
          version
          result
          detected
          category
        }
        signatures
        behaviors {
          category
          description
          severity
        }
      }
    }
  }
`;

export const GET_THREAT_ACTORS = gql`
  query GetThreatActors(
    $filter: ThreatActorFilter
    $sort: ThreatActorSort
    $first: Int
    $after: String
  ) {
    threatActors(filter: $filter, sort: $sort, first: $first, after: $after) {
      edges {
        node {
          ...ThreatActorFragment
          campaigns {
            id
            name
            status
            isActive
            startDate
            endDate
            targetedSectors
          }
          indicators {
            id
            type
            value
            confidence
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${THREAT_ACTOR_FRAGMENT}
`;

export const GET_THREAT_CAMPAIGNS = gql`
  query GetThreatCampaigns(
    $filter: ThreatCampaignFilter
    $sort: ThreatCampaignSort
    $first: Int
    $after: String
  ) {
    threatCampaigns(filter: $filter, sort: $sort, first: $first, after: $after) {
      edges {
        node {
          ...ThreatCampaignFragment
          indicators {
            id
            type
            value
            confidence
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${THREAT_CAMPAIGN_FRAGMENT}
`;

export const GET_THREAT_FEEDS = gql`
  query GetThreatFeeds(
    $filter: ThreatFeedFilter
    $sort: ThreatFeedSort
    $first: Int
    $after: String
  ) {
    threatFeeds(filter: $filter, sort: $sort, first: $first, after: $after) {
      edges {
        node {
          ...ThreatFeedFragment
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${THREAT_FEED_FRAGMENT}
`;

export const GET_THREAT_CORRELATIONS = gql`
  query GetThreatCorrelations(
    $filter: ThreatCorrelationFilter
    $first: Int
    $after: String
  ) {
    threatCorrelations(filter: $filter, first: $first, after: $after) {
      edges {
        node {
          id
          name
          description
          correlationType
          confidence
          threshold
          timeWindow
          isActive
          status
          matchCount
          falsePositiveRate
          effectivenessScore
          
          rules {
            id
            field
            operator
            value
            weight
            isRequired
          }
          
          logic
          tags
          metadata
          createdAt
          updatedAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_THREAT_ANALYTICS = gql`
  query GetThreatAnalytics(
    $organizationId: ID!
    $timeRange: TimeRange!
    $filters: ThreatAnalyticsFilter
  ) {
    threatAnalytics(
      organizationId: $organizationId
      timeRange: $timeRange
      filters: $filters
    ) {
      threatTrends {
        timestamp
        threatCount
        severityBreakdown {
          severity
          count
          percentage
        }
        typeBreakdown {
          type
          count
          percentage
        }
        confidenceBreakdown {
          confidence
          count
          percentage
        }
      }
      
      actorAnalysis {
        totalActors
        activeActors
        newActors
        topActors {
          actor {
            ...ThreatActorFragment
          }
          activityScore
          threatCount
          campaignCount
          riskLevel
        }
        sophisticationDistribution {
          level
          count
          percentage
        }
        motivationDistribution {
          motivation
          count
          percentage
        }
      }
      
      campaignAnalysis {
        totalCampaigns
        activeCampaigns
        newCampaigns
        topCampaigns {
          campaign {
            ...ThreatCampaignFragment
          }
          activityScore
          threatCount
          indicatorCount
          riskLevel
        }
        statusDistribution {
          status
          count
          percentage
        }
        impactAnalysis {
          scope
          severity
          estimatedLoss
          affectedOrganizations
        }
      }
      
      indicatorAnalysis {
        totalIndicators
        newIndicators
        expiredIndicators
        typeDistribution {
          type
          count
          percentage
          trend
        }
        confidenceDistribution {
          confidence
          count
          percentage
        }
        sourceDistribution {
          source
          count
          percentage
          reliability
        }
        enrichmentCoverage {
          total
          enriched
          percentage
        }
      }
      
      geospatialAnalysis {
        threatsByCountry {
          country
          code
          threatCount
          actorCount
          campaignCount
          riskLevel
          coordinates {
            latitude
            longitude
          }
        }
        threatsByRegion {
          region
          threatCount
          actorCount
          campaignCount
          riskLevel
        }
        migrationPatterns {
          from
          to
          threatCount
          trend
        }
      }
      
      industryTargeting {
        sectorAnalysis {
          sector
          threatCount
          actorCount
          campaignCount
          riskLevel
          trend
        }
        crossSectorThreats {
          threatId
          affectedSectors
          scope
          severity
        }
      }
      
      timeSeriesAnalysis {
        daily {
          date
          threatCount
          iocCount
          actorActivity
          campaignActivity
        }
        weekly {
          week
          threatCount
          iocCount
          actorActivity
          campaignActivity
        }
        monthly {
          month
          threatCount
          iocCount
          actorActivity
          campaignActivity
        }
      }
      
      correlationAnalysis {
        totalCorrelations
        activeCorrelations
        averageConfidence
        effectivenessScore
        topCorrelations {
          id
          name
          matchCount
          confidence
          effectiveness
        }
      }
      
      feedAnalysis {
        totalFeeds
        activeFeeds
        feedEffectiveness {
          feedId
          feedName
          indicatorCount
          qualityScore
          accuracy
          timeliness
        }
        coverageGaps {
          threatType
          coverage
          recommendation
        }
      }
    }
  }
  ${THREAT_ACTOR_FRAGMENT}
  ${THREAT_CAMPAIGN_FRAGMENT}
`;

export const GET_THREAT_LANDSCAPE = gql`
  query GetThreatLandscape(
    $organizationId: ID!
    $sector: IndustrySector
    $region: String
    $timeRange: TimeRange!
  ) {
    threatLandscape(
      organizationId: $organizationId
      sector: $sector
      region: $region
      timeRange: $timeRange
    ) {
      overview {
        totalThreats
        activeCampaigns
        trackedActors
        riskLevel
        trendDirection
      }
      
      threats {
        ...ThreatIntelligenceFragment
        riskScore
        relevanceScore
      }
      
      actors {
        ...ThreatActorFragment
        activityLevel
        riskScore
        relevanceScore
      }
      
      campaigns {
        ...ThreatCampaignFragment
        activityLevel
        riskScore
        relevanceScore
      }
      
      riskFactors {
        factor
        weight
        impact
        likelihood
        description
      }
      
      recommendations {
        priority
        category
        title
        description
        impact
        effort
        timeline
      }
      
      heatmapData {
        country
        region
        threatLevel
        actorCount
        campaignCount
        riskScore
        coordinates {
          latitude
          longitude
        }
      }
    }
  }
  ${THREAT_INTELLIGENCE_FRAGMENT}
  ${THREAT_ACTOR_FRAGMENT}
  ${THREAT_CAMPAIGN_FRAGMENT}
`;

// Mutations
export const CREATE_IOC = gql`
  mutation CreateIOC($input: CreateIOCInput!) {
    createIOC(input: $input) {
      success
      message
      errors {
        field
        message
        code
      }
      ioc {
        ...IOCFragment
      }
    }
  }
  ${IOC_FRAGMENT}
`;

export const UPDATE_IOC = gql`
  mutation UpdateIOC($id: ID!, $input: UpdateIOCInput!) {
    updateIOC(id: $id, input: $input) {
      success
      message
      errors {
        field
        message
        code
      }
      ioc {
        ...IOCFragment
      }
    }
  }
  ${IOC_FRAGMENT}
`;

export const WHITELIST_IOC = gql`
  mutation WhitelistIOC($id: ID!, $reason: String!, $expiresAt: DateTime) {
    whitelistIOC(id: $id, reason: $reason, expiresAt: $expiresAt) {
      success
      message
      errors {
        field
        message
        code
      }
      ioc {
        id
        isWhitelisted
        whitelistReason
      }
    }
  }
`;

export const BULK_IMPORT_IOCS = gql`
  mutation BulkImportIOCs($input: BulkImportIOCsInput!) {
    bulkImportIOCs(input: $input) {
      success
      message
      errors {
        field
        message
        code
      }
      results {
        totalProcessed
        successful
        failed
        skipped
        errors {
          line
          value
          error
        }
      }
    }
  }
`;

export const CREATE_THREAT_CORRELATION = gql`
  mutation CreateThreatCorrelation($input: CreateThreatCorrelationInput!) {
    createThreatCorrelation(input: $input) {
      success
      message
      errors {
        field
        message
        code
      }
      correlation {
        id
        name
        description
        correlationType
        confidence
        threshold
        isActive
        status
      }
    }
  }
`;

export const UPDATE_THREAT_FEED = gql`
  mutation UpdateThreatFeed($id: ID!, $input: UpdateThreatFeedInput!) {
    updateThreatFeed(id: $id, input: $input) {
      success
      message
      errors {
        field
        message
        code
      }
      feed {
        ...ThreatFeedFragment
      }
    }
  }
  ${THREAT_FEED_FRAGMENT}
`;

export const SYNC_THREAT_FEED = gql`
  mutation SyncThreatFeed($id: ID!, $force: Boolean = false) {
    syncThreatFeed(id: $id, force: $force) {
      success
      message
      errors {
        field
        message
        code
      }
      syncStatus {
        status
        startTime
        endTime
        processed
        imported
        updated
        errors
      }
    }
  }
`;

// Subscriptions
export const THREAT_INTELLIGENCE_UPDATES = gql`
  subscription ThreatIntelligenceUpdates(
    $organizationId: ID!
    $filter: ThreatIntelligenceFilter
  ) {
    threatIntelligenceUpdates(organizationId: $organizationId, filter: $filter) {
      type
      timestamp
      threat {
        ...ThreatIntelligenceFragment
      }
      changes {
        field
        oldValue
        newValue
        changeType
      }
      metadata
    }
  }
  ${THREAT_INTELLIGENCE_FRAGMENT}
`;

export const IOC_MATCHES = gql`
  subscription IOCMatches(
    $organizationId: ID!
    $confidence: ThreatConfidence = MEDIUM
    $severity: Severity = MEDIUM
  ) {
    iocMatches(
      organizationId: $organizationId
      confidence: $confidence
      severity: $severity
    ) {
      type
      timestamp
      ioc {
        ...IOCFragment
      }
      match {
        id
        matchType
        confidence
        timestamp
        context {
          source
          location
          severity
          additionalInfo
        }
      }
      alert {
        id
        title
        severity
        status
        createdAt
      }
      metadata
    }
  }
  ${IOC_FRAGMENT}
`;

export const NEW_IOCS = gql`
  subscription NewIOCs(
    $organizationId: ID!
    $types: [IOCType!]
    $feeds: [ID!]
    $confidence: ThreatConfidence = MEDIUM
  ) {
    newIOCs(
      organizationId: $organizationId
      types: $types
      feeds: $feeds
      confidence: $confidence
    ) {
      type
      timestamp
      ioc {
        ...IOCFragment
      }
      source {
        feedId
        feedName
        importTime
      }
      metadata
    }
  }
  ${IOC_FRAGMENT}
`;

export const THREAT_FEED_UPDATES = gql`
  subscription ThreatFeedUpdates($organizationId: ID!, $feedIds: [ID!]) {
    threatFeedUpdates(organizationId: $organizationId, feedIds: $feedIds) {
      type
      timestamp
      feed {
        ...ThreatFeedFragment
      }
      syncStatus {
        status
        startTime
        endTime
        processed
        imported
        updated
        errors
      }
      healthUpdate {
        overallHealth
        connectivity
        latency
        errorRate
        lastError
      }
      metadata
    }
  }
  ${THREAT_FEED_FRAGMENT}
`;

export const CORRELATION_MATCHES = gql`
  subscription CorrelationMatches(
    $organizationId: ID!
    $correlationIds: [ID!]
    $minConfidence: Float = 0.7
  ) {
    correlationMatches(
      organizationId: $organizationId
      correlationIds: $correlationIds
      minConfidence: $minConfidence
    ) {
      type
      timestamp
      correlation {
        id
        name
        correlationType
        confidence
      }
      match {
        id
        confidence
        score
        timestamp
        details {
          matchingFields
          weights
          calculations
          reasoning
        }
      }
      events {
        id
        type
        timestamp
        source
        severity
      }
      indicators {
        id
        type
        value
        confidence
      }
      metadata
    }
  }
`;

export const THREAT_ACTOR_ACTIVITY = gql`
  subscription ThreatActorActivity($organizationId: ID!, $actorIds: [ID!]) {
    threatActorActivity(organizationId: $organizationId, actorIds: $actorIds) {
      type
      timestamp
      actor {
        ...ThreatActorFragment
      }
      activity {
        activityType
        description
        confidence
        source
        relatedThreats
        relatedCampaigns
        indicators
      }
      metadata
    }
  }
  ${THREAT_ACTOR_FRAGMENT}
`;

export const CAMPAIGN_UPDATES = gql`
  subscription CampaignUpdates($organizationId: ID!, $campaignIds: [ID!]) {
    campaignUpdates(organizationId: $organizationId, campaignIds: $campaignIds) {
      type
      timestamp
      campaign {
        ...ThreatCampaignFragment
      }
      update {
        updateType
        description
        confidence
        source
        newTargets
        newIndicators
        statusChange
      }
      metadata
    }
  }
  ${THREAT_CAMPAIGN_FRAGMENT}
`;

export const THREAT_LANDSCAPE_UPDATES = gql`
  subscription ThreatLandscapeUpdates(
    $organizationId: ID!
    $sectors: [IndustrySector!]
    $regions: [String!]
    $updateInterval: Int = 3600
  ) {
    threatLandscapeUpdates(
      organizationId: $organizationId
      sectors: $sectors
      regions: $regions
      updateInterval: $updateInterval
    ) {
      type
      timestamp
      landscape {
        region
        sector
        riskLevel
        threatCount
        actorCount
        campaignCount
        changeIndicators {
          metric
          change
          trend
          significance
        }
      }
      newThreats {
        id
        title
        severity
        confidence
      }
      emergingActors {
        id
        name
        sophistication
        activityLevel
      }
      activeCampaigns {
        id
        name
        status
        activityLevel
      }
      riskChanges {
        factor
        oldLevel
        newLevel
        impact
        recommendation
      }
      metadata
    }
  }
`;