import { gql } from '@apollo/client'

// Customer queries
export const GET_CUSTOMERS = gql`
  query GetCustomers($filter: CustomerFilter, $limit: Int, $offset: Int) {
    customers(filter: $filter, limit: $limit, offset: $offset) {
      edges {
        node {
          id
          name
          email
          phone
          address
          status
          salesforceId
          lastSyncAt
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
`

export const GET_CUSTOMER = gql`
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      id
      name
      email
      phone
      address
      status
      salesforceId
      lastSyncAt
      createdAt
      updatedAt
      projects {
        id
        name
        status
        createdAt
      }
      estimates {
        id
        status
        goodPrice
        betterPrice
        bestPrice
        selectedTier
        createdAt
      }
    }
  }
`

// Estimate queries (from the schema)
export const GET_ESTIMATES = gql`
  query GetEstimates($filter: EstimateFilter, $limit: Int, $offset: Int) {
    estimates(filter: $filter, limit: $limit, offset: $offset) {
      edges {
        node {
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
`

export const GET_ESTIMATE = gql`
  query GetEstimate($id: ID!) {
    estimate(id: $id) {
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
  }
`

// Project queries
export const GET_PROJECTS = gql`
  query GetProjects($filter: ProjectFilter, $limit: Int, $offset: Int) {
    projects(filter: $filter, limit: $limit, offset: $offset) {
      edges {
        node {
          id
          customerId
          name
          description
          status
          companyCamPhotos {
            id
            url
            thumbnailUrl
            caption
            uploadedAt
            uploadedBy
            metadata
          }
          timeline {
            id
            type
            title
            description
            timestamp
            userId
            metadata
          }
          estimateId
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
`

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      customerId
      name
      description
      status
      companyCamPhotos {
        id
        url
        thumbnailUrl
        caption
        uploadedAt
        uploadedBy
        metadata
      }
      timeline {
        id
        type
        title
        description
        timestamp
        userId
        metadata
      }
      estimateId
      createdAt
      updatedAt
    }
  }
`

// Integration status queries
export const GET_INTEGRATION_STATUS = gql`
  query GetIntegrationStatus {
    integrations {
      id
      name
      type
      status
      lastCheckAt
      responseTime
      errorMessage
      metadata
    }
  }
`

export const GET_SYNC_PROGRESS = gql`
  query GetSyncProgress {
    syncProgress {
      id
      integration
      status
      progress
      total
      startedAt
      completedAt
      errorMessage
      recordsProcessed
    }
  }
`

// Pricing calculation query (from schema)
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
`
