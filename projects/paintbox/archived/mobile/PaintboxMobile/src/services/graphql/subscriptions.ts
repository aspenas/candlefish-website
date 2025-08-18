import { gql } from '@apollo/client';
import { PROJECT_FRAGMENT, ESTIMATE_FRAGMENT, PROJECT_PHOTO_FRAGMENT } from './queries';

// Estimate subscriptions
export const ESTIMATE_UPDATED = gql`
  ${ESTIMATE_FRAGMENT}
  subscription EstimateUpdated($id: ID!) {
    estimateUpdated(id: $id) {
      ...EstimateFragment
    }
  }
`;

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
`;

// Project subscriptions
export const PROJECT_UPDATED = gql`
  ${PROJECT_FRAGMENT}
  subscription ProjectUpdated($id: ID!) {
    projectUpdated(id: $id) {
      ...ProjectFragment
    }
  }
`;

export const PROJECT_STATUS_CHANGED = gql`
  subscription ProjectStatusChanged($id: ID!) {
    projectStatusChanged(id: $id) {
      projectId
      oldStatus
      newStatus
      reason
      changedBy
      changedAt
    }
  }
`;

export const PROJECT_PHOTO_ADDED = gql`
  ${PROJECT_PHOTO_FRAGMENT}
  subscription ProjectPhotoAdded($projectId: ID!) {
    projectPhotoAdded(projectId: $projectId) {
      ...ProjectPhotoFragment
    }
  }
`;

export const PHOTO_SYNC_PROGRESS = gql`
  subscription PhotoSyncProgress($projectId: ID!) {
    photoSyncProgress(projectId: $projectId) {
      projectId
      totalItems
      processedItems
      currentPhase
      estimatedTimeRemaining
      errors
    }
  }
`;

// Manager approval subscriptions
export const APPROVAL_REQUEST = gql`
  ${ESTIMATE_FRAGMENT}
  ${PROJECT_FRAGMENT}
  subscription ApprovalRequest($managerId: ID) {
    approvalRequest(managerId: $managerId) {
      id
      type
      priority
      requestedBy
      requestedAt
      estimate {
        ...EstimateFragment
      }
      project {
        ...ProjectFragment
      }
      metadata
    }
  }
`;

export const APPROVAL_STATUS_UPDATE = gql`
  subscription ApprovalStatusUpdate($requestId: ID!) {
    approvalStatusUpdate(requestId: $requestId) {
      requestId
      status
      approvedBy
      approvedAt
      reason
      metadata
    }
  }
`;

// Team collaboration subscriptions
export const TEAM_MEMBER_ACTIVITY = gql`
  subscription TeamMemberActivity($projectId: ID!) {
    teamMemberActivity(projectId: $projectId) {
      projectId
      userId
      userName
      action
      timestamp
      metadata
    }
  }
`;

export const MEASUREMENT_COLLABORATION = gql`
  subscription MeasurementCollaboration($estimateId: ID!) {
    measurementCollaboration(estimateId: $estimateId) {
      estimateId
      userId
      userName
      action
      measurementId
      timestamp
      isActive
    }
  }
`;

// Real-time notifications for mobile
export const MOBILE_NOTIFICATIONS = gql`
  subscription MobileNotifications($userId: ID!, $deviceId: String!) {
    mobileNotifications(userId: $userId, deviceId: $deviceId) {
      id
      type
      title
      message
      priority
      data
      timestamp
      expiresAt
      actions {
        id
        label
        action
        type
      }
    }
  }
`;

// Field updates (GPS, conditions, etc.)
export const FIELD_CONDITIONS_UPDATE = gql`
  subscription FieldConditionsUpdate($projectId: ID!) {
    fieldConditionsUpdate(projectId: $projectId) {
      projectId
      updatedBy
      timestamp
      weather {
        temperature
        humidity
        windSpeed
        conditions
      }
      siteConditions
      accessNotes
      coordinates {
        latitude
        longitude
        accuracy
      }
    }
  }
`;

// Company Cam integration subscriptions
export const COMPANY_CAM_SYNC_STATUS = gql`
  subscription CompanyCamSyncStatus($projectId: ID!) {
    companyCamSyncStatus(projectId: $projectId) {
      projectId
      syncStatus
      totalPhotos
      syncedPhotos
      failedPhotos
      lastSyncAt
      errors {
        photoId
        error
        retryable
      }
    }
  }
`;

// Offline queue status
export const SYNC_QUEUE_STATUS = gql`
  subscription SyncQueueStatus($deviceId: String!) {
    syncQueueStatus(deviceId: $deviceId) @client {
      queueSize
      processing
      lastSync
      pendingMutations {
        id
        operation
        queuedAt
        retryCount
        status
      }
      errors
    }
  }
`;

// Manager dashboard subscriptions
export const MANAGER_DASHBOARD_UPDATES = gql`
  ${PROJECT_FRAGMENT}
  ${ESTIMATE_FRAGMENT}
  subscription ManagerDashboardUpdates($managerId: ID!) {
    managerDashboardUpdates(managerId: $managerId) {
      type
      timestamp
      project {
        ...ProjectFragment
      }
      estimate {
        ...EstimateFragment
      }
      urgency
      requiresAction
      metadata
    }
  }
`;

// Performance monitoring subscriptions
export const APP_PERFORMANCE_METRICS = gql`
  subscription AppPerformanceMetrics($deviceId: String!) {
    appPerformanceMetrics(deviceId: $deviceId) @client {
      timestamp
      memoryUsage
      cacheSize
      networkLatency
      syncQueueSize
      errorRate
      crashReports
    }
  }
`;

// Location-based subscriptions
export const NEARBY_PROJECTS = gql`
  ${PROJECT_FRAGMENT}
  subscription NearbyProjects($coordinates: CoordinatesInput!, $radius: Float!) {
    nearbyProjects(coordinates: $coordinates, radius: $radius) {
      ...ProjectFragment
      distance
    }
  }
`;

export const CREW_LOCATION_UPDATES = gql`
  subscription CrewLocationUpdates($projectId: ID!) {
    crewLocationUpdates(projectId: $projectId) {
      crewMemberId
      name
      coordinates {
        latitude
        longitude
        accuracy
      }
      timestamp
      isOnSite
      estimatedArrival
    }
  }
`;

// iPad-specific subscriptions for split-screen features
export const MEASUREMENT_SESSION = gql`
  subscription MeasurementSession($estimateId: ID!, $sessionId: String!) {
    measurementSession(estimateId: $estimateId, sessionId: $sessionId) {
      sessionId
      activeUsers {
        userId
        userName
        cursor
        selection
        isTyping
      }
      measurements {
        id
        elevation
        surface
        dimensions
        lastModifiedBy
        lastModifiedAt
      }
      pricing {
        laborCost
        materialCost
        total
        lastCalculatedAt
      }
    }
  }
`;
