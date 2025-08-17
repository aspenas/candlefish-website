import { gql } from '@apollo/client';

// Fragment definitions
export const PROJECT_FRAGMENT = gql`
  fragment ProjectFragment on Project {
    id
    customerId
    companyCamId
    name
    description
    type
    priority
    status
    scheduledStartDate
    actualStartDate
    scheduledEndDate
    actualEndDate
    estimatedDuration
    serviceAddress {
      street
      city
      state
      postalCode
      country
      coordinates {
        latitude
        longitude
      }
    }
    assignedCrew {
      id
      name
      role
      skillLevel
    }
    projectManager {
      id
      name
      email
      phone
    }
    budgetAmount
    actualCost
    profitMargin
    photoCount
    lastPhotoSync
    notes
    createdAt
    updatedAt
    completionPercentage
    isOverdue
    weatherRisk
  }
`;

export const PROJECT_PHOTO_FRAGMENT = gql`
  fragment ProjectPhotoFragment on ProjectPhoto {
    id
    projectId
    companyCamId
    url
    thumbnailUrl
    originalFileName
    fileSize
    mimeType
    category
    tags
    description
    capturedAt
    uploadedAt
    coordinates {
      latitude
      longitude
    }
    location {
      address
      floor
      room
      coordinates {
        latitude
        longitude
      }
    }
    phase
    room
    surface
    syncStatus
    aiAnalysis {
      detectedObjects
      surfaceType
      conditionAssessment
      qualityScore
      suggestedTags
      confidence
    }
  }
`;

export const ESTIMATE_FRAGMENT = gql`
  fragment EstimateFragment on Estimate {
    id
    customerId
    projectId
    goodPrice
    betterPrice
    bestPrice
    selectedTier
    status
    createdAt
    updatedAt
    createdBy
    totalSquareFootage
    laborHours
    materialCost
    pdfUrl
    notes
  }
`;

export const CUSTOMER_FRAGMENT = gql`
  fragment CustomerFragment on Customer {
    id
    name
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
`;

// Query definitions
export const GET_PROJECTS = gql`
  ${PROJECT_FRAGMENT}
  query GetProjects($filter: ProjectFilter, $limit: Int = 20, $offset: Int = 0) {
    projects(filter: $filter, limit: $limit, offset: $offset) {
      edges {
        node {
          ...ProjectFragment
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

export const GET_PROJECT_DETAIL = gql`
  ${PROJECT_FRAGMENT}
  ${PROJECT_PHOTO_FRAGMENT}
  query GetProjectDetail($id: ID!) {
    project(id: $id) {
      ...ProjectFragment
      photos {
        ...ProjectPhotoFragment
      }
      permits {
        id
        type
        number
        issuer
        issuedDate
        expirationDate
        status
        cost
      }
    }
  }
`;

export const GET_PROJECT_PHOTOS = gql`
  ${PROJECT_PHOTO_FRAGMENT}
  query GetProjectPhotos($projectId: ID!, $category: PhotoCategory) {
    projectPhotos(projectId: $projectId, category: $category) {
      ...ProjectPhotoFragment
    }
  }
`;

export const GET_ESTIMATES = gql`
  ${ESTIMATE_FRAGMENT}
  query GetEstimates($filter: EstimateFilter, $limit: Int = 10, $offset: Int = 0) {
    estimates(filter: $filter, limit: $limit, offset: $offset) {
      edges {
        node {
          ...EstimateFragment
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

export const GET_ESTIMATE_DETAIL = gql`
  ${ESTIMATE_FRAGMENT}
  query GetEstimateDetail($id: ID!) {
    estimate(id: $id) {
      ...EstimateFragment
    }
  }
`;

export const CALCULATE_PRICING = gql`
  query CalculatePricing($input: PricingInput!) {
    calculatePricing(input: $input) {
      laborCost
      materialCost
      overheadCost
      profitMargin
      subtotal
      tax
      total
    }
  }
`;

export const GET_PROJECT_TIMELINE = gql`
  query GetProjectTimeline($projectId: ID!) {
    projectTimeline(projectId: $projectId) {
      id
      projectId
      type
      title
      description
      timestamp
      user
      metadata
    }
  }
`;

export const SEARCH_PROJECTS = gql`
  ${PROJECT_FRAGMENT}
  query SearchProjects($query: String!, $limit: Int = 10) {
    searchProjects(query: $query, limit: $limit) {
      ...ProjectFragment
    }
  }
`;

// Dashboard queries
export const GET_DASHBOARD_DATA = gql`
  ${PROJECT_FRAGMENT}
  ${ESTIMATE_FRAGMENT}
  query GetDashboardData {
    recentProjects: projects(limit: 5, filter: { status: IN_PROGRESS }) {
      edges {
        node {
          ...ProjectFragment
        }
      }
    }
    pendingEstimates: estimates(limit: 5, filter: { status: DRAFT }) {
      edges {
        node {
          ...EstimateFragment
        }
      }
    }
    overdueProjects: projects(limit: 10, filter: { isOverdue: true }) {
      edges {
        node {
          ...ProjectFragment
        }
      }
    }
  }
`;

// Manager specific queries
export const GET_PENDING_APPROVALS = gql`
  ${ESTIMATE_FRAGMENT}
  ${PROJECT_FRAGMENT}
  query GetPendingApprovals {
    pendingDiscountApprovals: estimates(filter: { status: REVIEW }) {
      edges {
        node {
          ...EstimateFragment
        }
      }
    }
    projectsNeedingReview: projects(filter: { status: REVIEW }) {
      edges {
        node {
          ...ProjectFragment
        }
      }
    }
  }
`;

// Offline-first queries with cache policies
export const GET_OFFLINE_PROJECTS = gql`
  ${PROJECT_FRAGMENT}
  query GetOfflineProjects($limit: Int = 50) {
    projects(limit: $limit) {
      edges {
        node {
          ...ProjectFragment
        }
      }
      totalCount
    }
  }
`;
