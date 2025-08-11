import { gql } from '@apollo/client';

// Fragments
export const DASHBOARD_ANALYTICS_FRAGMENT = gql`
  fragment DashboardAnalyticsFields on DashboardAnalytics {
    totalUsers
    activeUsers
    totalContractors
    activeContractors
    totalSecrets
    secretsNeedingRotation
    recentAuditEvents
    userGrowth {
      period
      count
      change
    }
    contractorUsage {
      period
      count
      duration
    }
    secretAccess {
      period
      reads
      writes
      errors
    }
    securityAlerts {
      id
      type
      severity
      message
      timestamp
      resolved
    }
  }
`;

export const HEALTH_STATUS_FRAGMENT = gql`
  fragment HealthStatusFields on HealthStatus {
    status
    timestamp
    version
    uptime
    services {
      name
      status
      responseTime
      lastCheck
      message
    }
  }
`;

export const AUDIT_LOG_FRAGMENT = gql`
  fragment AuditLogFields on AuditLog {
    id
    action
    userId
    resource
    resourceId
    ip
    userAgent
    endpoint
    timestamp
    details
    success
    errorMessage
    user {
      id
      name
      email
    }
    formattedTimestamp
    riskLevel
    category
  }
`;

export const WEBSOCKET_CONNECTION_FRAGMENT = gql`
  fragment WebSocketConnectionFields on WebSocketConnection {
    connectionId
    userId
    connectedAt
    lastPing
    endpoint
    userAgent
    ip
    user {
      id
      name
      email
    }
    isActive
  }
`;

export const WEBSOCKET_EVENT_FRAGMENT = gql`
  fragment WebSocketEventFields on WebSocketEvent {
    id
    type
    connectionId
    data
    timestamp
    connection {
      ...WebSocketConnectionFields
    }
  }
  ${WEBSOCKET_CONNECTION_FRAGMENT}
`;

export const SECURITY_ALERT_FRAGMENT = gql`
  fragment SecurityAlertFields on SecurityAlert {
    id
    type
    severity
    message
    timestamp
    resolved
  }
`;

// Queries
export const GET_DASHBOARD_ANALYTICS_QUERY = gql`
  query GetDashboardAnalytics($dateFrom: Date, $dateTo: Date) {
    dashboardAnalytics(dateFrom: $dateFrom, dateTo: $dateTo) {
      ...DashboardAnalyticsFields
    }
  }
  ${DASHBOARD_ANALYTICS_FRAGMENT}
`;

export const GET_HEALTH_STATUS_QUERY = gql`
  query GetHealthStatus {
    health {
      ...HealthStatusFields
    }
  }
  ${HEALTH_STATUS_FRAGMENT}
`;

export const GET_AUDIT_LOGS_QUERY = gql`
  query GetAuditLogs(
    $pagination: PaginationInput
    $sort: SortInput
    $filter: AuditFilter
  ) {
    auditLogs(pagination: $pagination, sort: $sort, filter: $filter) {
      logs {
        ...AuditLogFields
      }
      pagination {
        hasNextPage
        hasPreviousPage
        totalCount
        cursor
      }
    }
  }
  ${AUDIT_LOG_FRAGMENT}
`;

export const GET_ACTIVE_CONNECTIONS_QUERY = gql`
  query GetActiveConnections {
    activeConnections {
      ...WebSocketConnectionFields
      events {
        ...WebSocketEventFields
      }
    }
  }
  ${WEBSOCKET_CONNECTION_FRAGMENT}
  ${WEBSOCKET_EVENT_FRAGMENT}
`;

// Mutations
export const DISCONNECT_USER_MUTATION = gql`
  mutation DisconnectUser($userId: ID!) {
    disconnectUser(userId: $userId) {
      success
      message
    }
  }
`;

export const CLEANUP_EXPIRED_TOKENS_MUTATION = gql`
  mutation CleanupExpiredTokens {
    cleanupExpiredTokens {
      success
      message
    }
  }
`;

// Subscriptions
export const AUDIT_EVENTS_SUBSCRIPTION = gql`
  subscription AuditEvents($userId: ID, $actions: [AuditAction!]) {
    auditEvents(userId: $userId, actions: $actions) {
      ...AuditLogFields
    }
  }
  ${AUDIT_LOG_FRAGMENT}
`;

export const DASHBOARD_UPDATED_SUBSCRIPTION = gql`
  subscription DashboardUpdated {
    dashboardUpdated {
      ...DashboardAnalyticsFields
    }
  }
  ${DASHBOARD_ANALYTICS_FRAGMENT}
`;

export const SECURITY_ALERT_SUBSCRIPTION = gql`
  subscription SecurityAlert {
    securityAlert {
      ...SecurityAlertFields
    }
  }
  ${SECURITY_ALERT_FRAGMENT}
`;

export const SYSTEM_NOTIFICATION_SUBSCRIPTION = gql`
  subscription SystemNotification {
    systemNotification
  }
`;

export const CONNECTION_EVENT_SUBSCRIPTION = gql`
  subscription ConnectionEvent {
    connectionEvent {
      ...WebSocketEventFields
    }
  }
  ${WEBSOCKET_EVENT_FRAGMENT}
`;
