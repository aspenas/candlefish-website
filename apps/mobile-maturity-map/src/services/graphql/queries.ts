import { gql } from '@apollo/client';

export const GET_OPERATOR_DASHBOARD = gql`
  query GetOperatorDashboard($operatorId: ID!) {
    operator(id: $operatorId) {
      id
      name
      email
      tier
      companyName
      industry
      permissions
      quotas {
        maxAssessments
        maxDocuments
        maxTokensPerMonth
        maxStorageGB
        maxConcurrentProcessing
      }
      usage {
        assessmentsUsed
        documentsUsed
        tokensUsed
        storageUsedGB
        currentProcessing
        resetDate
      }
      assessments {
        id
        title
        status
        progress
        industry
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
    
    dashboardMetrics: operatorDashboard {
      operator {
        id
      }
      recentAssessments {
        id
        title
        status
        progress
        updatedAt
      }
      usage {
        assessmentsUsed
        documentsUsed
        tokensUsed
        storageUsedGB
        currentProcessing
        resetDate
      }
      notifications {
        id
        type
        title
        message
        timestamp
      }
      recommendations {
        id
        title
        description
        priority
      }
    }
  }
`;

export const GET_ASSESSMENTS = gql`
  query GetAssessments(
    $operatorId: ID!
    $first: Int = 20
    $after: String
    $filter: AssessmentFilter
    $orderBy: AssessmentOrderBy
  ) {
    assessments(
      first: $first
      after: $after
      filter: $filter
      orderBy: $orderBy
    ) {
      edges {
        node {
          id
          title
          description
          status
          progress
          assessmentType
          industry
          complexity
          estimatedDuration
          operatorId
          score
          recommendations {
            id
            title
            priority
            effort
            impact
          }
          nextSteps {
            id
            title
            priority
            dueDate
            status
          }
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

export const GET_ASSESSMENT_DETAIL = gql`
  query GetAssessmentDetail($id: ID!) {
    assessment(id: $id) {
      id
      title
      description
      status
      progress
      assessmentType
      industry
      complexity
      estimatedDuration
      score
      
      operator {
        id
        name
        email
        tier
      }
      
      documents {
        id
        filename
        originalName
        type
        status
        processingProgress
        thumbnailUrl
        createdAt
      }
      
      responses {
        questionId
        response
        confidence
        timestamp
      }
      
      recommendations {
        id
        title
        description
        priority
        effort
        impact
        category
        resources
      }
      
      benchmarks {
        id
        metric
        value
        percentile
        industryAverage
        bestInClass
        unit
      }
      
      nextSteps {
        id
        title
        description
        priority
        dueDate
        assignee
        status
        dependencies
      }
      
      reports {
        id
        title
        format
        generatedAt
        url
        expiresAt
      }
      
      processedTokens
      processingTime
      aiConfidenceScore
      createdAt
      updatedAt
    }
  }
`;

export const GET_DOCUMENTS = gql`
  query GetDocuments(
    $assessmentId: ID
    $first: Int = 20
    $after: String
    $filter: DocumentFilter
  ) {
    documents(
      assessmentId: $assessmentId
      first: $first
      after: $after
      filter: $filter
    ) {
      edges {
        node {
          id
          filename
          originalName
          mimeType
          size
          type
          status
          processingProgress
          processingStartedAt
          processingCompletedAt
          processingError
          extractedText
          metadata
          aiSummary
          keyInsights
          topics
          sentiment
          assessmentId
          url
          thumbnailUrl
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

export const GET_INDUSTRY_BENCHMARKS = gql`
  query GetIndustryBenchmarks($industry: IndustryVertical!, $metrics: [String!]) {
    industryBenchmarks(industry: $industry, metrics: $metrics) {
      id
      metric
      value
      percentile
      industryAverage
      bestInClass
      unit
    }
  }
`;

export const GET_SOLUTIONS = gql`
  query GetSolutions(
    $category: SolutionCategory
    $industry: IndustryVertical
    $first: Int = 20
  ) {
    solutions(category: $category, industry: $industry, first: $first) {
      id
      name
      description
      category
      industry
      features
      requirements
      pricing {
        basePrice
        currency
        billingCycle
        customPricingAvailable
      }
      deliverables
      timeline
      complexity
      successRate
      averageImplementationTime
      clientSatisfaction
      createdAt
    }
  }
`;

export const GET_ASSESSMENT_ANALYTICS = gql`
  query GetAssessmentAnalytics(
    $timeRange: TimeRange
    $groupBy: String
  ) {
    assessmentAnalytics(timeRange: $timeRange, groupBy: $groupBy) {
      totalAssessments
      completionRate
      averageScore
      industryBreakdown {
        industry
        count
      }
      trendData {
        date
        value
      }
    }
  }
`;

export const HEALTH_CHECK = gql`
  query HealthCheck {
    health {
      status
      timestamp
      services {
        name
        status
        latency
        errorRate
      }
    }
  }
`;