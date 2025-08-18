import { gql } from '@apollo/client'

// Estimate subscriptions (from schema)
export const ESTIMATE_UPDATED = gql`
  subscription EstimateUpdated($id: ID!) {
    estimateUpdated(id: $id) {
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

export const CALCULATION_PROGRESS = gql`
  subscription CalculationProgress($estimateId: ID!) {
    calculationProgress(estimateId: $estimateId) {
      estimateId
      stage
      progress
      message
      completed
    }
  }
`

// Customer subscriptions
export const CUSTOMER_UPDATED = gql`
  subscription CustomerUpdated($id: ID!) {
    customerUpdated(id: $id) {
      id
      name
      email
      phone
      address
      status
      salesforceId
      lastSyncAt
      updatedAt
    }
  }
`

export const CUSTOMER_SYNC_STATUS = gql`
  subscription CustomerSyncStatus($customerId: ID!) {
    customerSyncStatus(customerId: $customerId) {
      customerId
      status
      progress
      message
      completed
      error
    }
  }
`

// Project subscriptions
export const PROJECT_UPDATED = gql`
  subscription ProjectUpdated($id: ID!) {
    projectUpdated(id: $id) {
      id
      customerId
      name
      description
      status
      updatedAt
    }
  }
`

export const PROJECT_PHOTO_UPLOADED = gql`
  subscription ProjectPhotoUploaded($projectId: ID!) {
    projectPhotoUploaded(projectId: $projectId) {
      id
      url
      thumbnailUrl
      caption
      uploadedAt
      uploadedBy
      metadata
    }
  }
`

export const PROJECT_TIMELINE_UPDATED = gql`
  subscription ProjectTimelineUpdated($projectId: ID!) {
    projectTimelineUpdated(projectId: $projectId) {
      id
      type
      title
      description
      timestamp
      userId
      metadata
    }
  }
`

// Integration subscriptions
export const INTEGRATION_STATUS_UPDATED = gql`
  subscription IntegrationStatusUpdated {
    integrationStatusUpdated {
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

export const SYNC_PROGRESS_UPDATED = gql`
  subscription SyncProgressUpdated {
    syncProgressUpdated {
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

export const WEBSOCKET_CONNECTION_STATUS = gql`
  subscription WebSocketConnectionStatus {
    connectionStatus {
      connected
      timestamp
      clientCount
    }
  }
`

// Real-time notifications
export const SYSTEM_NOTIFICATIONS = gql`
  subscription SystemNotifications {
    systemNotification {
      id
      type
      title
      message
      severity
      timestamp
      actionUrl
      dismissed
    }
  }
`

export const USER_NOTIFICATIONS = gql`
  subscription UserNotifications($userId: ID!) {
    userNotification(userId: $userId) {
      id
      userId
      type
      title
      message
      severity
      timestamp
      read
      actionUrl
    }
  }
`
