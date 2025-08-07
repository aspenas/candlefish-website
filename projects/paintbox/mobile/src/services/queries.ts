/**
 * GraphQL Queries, Mutations, and Subscriptions for Mobile System Analyzer
 * Optimized for mobile data usage and offline scenarios
 */

import { gql } from '@apollo/client';

// Lightweight fragments for mobile
export const SERVICE_SUMMARY_FRAGMENT = gql`
  fragment ServiceSummary on Service {
    id
    name
    displayName
    status
    environment
    lastHealthCheck
    uptime
    tags
  }
`;

export const SERVICE_DETAILS_FRAGMENT = gql`
  fragment ServiceDetails on Service {
    id
    name
    displayName
    description
    version
    environment
    status
    healthEndpoint
    baseUrl
    tags
    discoveredAt
    lastHealthCheck
    lastStatusChange
    uptime
    monitoringEnabled
    alertingEnabled
  }
`;

export const ALERT_SUMMARY_FRAGMENT = gql`
  fragment AlertSummary on Alert {
    id
    name
    severity
    status
    triggeredAt
    service {
      id
      name
      displayName
    }
  }
`;

export const METRIC_SUMMARY_FRAGMENT = gql`
  fragment MetricSummary on Metric {
    id
    name
    type
    value
    unit
    timestamp
    warningThreshold
    criticalThreshold
  }
`;

// Mobile-optimized queries
export const GET_DASHBOARD_DATA = gql`
  ${SERVICE_SUMMARY_FRAGMENT}
  ${ALERT_SUMMARY_FRAGMENT}
  query GetDashboardData {
    services(limit: 50) {
      ...ServiceSummary
      containers {
        id
        name
        status
        cpuUsage
        memoryUsage
      }
    }
    alerts(status: ACTIVE, limit: 20) {
      ...AlertSummary
    }
    systemAnalysis {
      id
      timestamp
      overallHealth
      healthScore
      totalServices
      healthyServices
      degradedServices
      unhealthyServices
      activeAlerts
      resourceUtilization {
        cpu {
          current
          trend
        }
        memory {
          current
          trend
        }
      }
    }
  }
`;

export const GET_SERVICES_GRID = gql`
  ${SERVICE_SUMMARY_FRAGMENT}
  query GetServicesGrid($status: ServiceStatus, $environment: String, $limit: Int) {
    services(status: $status, environment: $environment, limit: $limit) {
      ...ServiceSummary
      containers {
        id
        status
        cpuUsage
        memoryUsage
      }
      alerts(status: ACTIVE, limit: 5) {
        id
        severity
      }
    }
  }
`;

export const GET_SERVICE_DETAIL = gql`
  ${SERVICE_DETAILS_FRAGMENT}
  ${ALERT_SUMMARY_FRAGMENT}
  ${METRIC_SUMMARY_FRAGMENT}
  query GetServiceDetail($id: ID!) {
    service(id: $id) {
      ...ServiceDetails
      dependencies {
        id
        type
        critical
        healthImpact
        dependsOn {
          id
          name
          displayName
          status
        }
      }
      containers {
        id
        name
        image
        tag
        status
        cpuUsage
        memoryUsage
        memoryLimit
        networkRx
        networkTx
        createdAt
        startedAt
        restartCount
      }
      processes {
        id
        name
        status
        cpuPercent
        memoryMb
      }
      alerts(limit: 10) {
        ...AlertSummary
        description
        resolvedAt
        acknowledgedAt
        acknowledgedBy
      }
      metrics(limit: 20) {
        ...MetricSummary
      }
    }
  }
`;

export const GET_ALERTS_LIST = gql`
  ${ALERT_SUMMARY_FRAGMENT}
  query GetAlertsList($severity: AlertSeverity, $status: AlertStatus, $limit: Int, $offset: Int) {
    alerts(severity: $severity, status: $status, limit: $limit, offset: $offset) {
      ...AlertSummary
      description
      resolvedAt
      acknowledgedAt
      acknowledgedBy
      triggerValue
      thresholdValue
    }
  }
`;

export const GET_METRIC_SERIES_MOBILE = gql`
  query GetMetricSeriesMobile(
    $serviceId: ID!
    $metricName: String!
    $timeRange: TimeRangeInput!
    $aggregation: AggregationType
  ) {
    metricSeries(
      serviceId: $serviceId
      metricName: $metricName
      timeRange: $timeRange
      aggregation: $aggregation
      granularity: "5m"
    ) {
      service {
        id
        name
        displayName
      }
      name
      type
      unit
      dataPoints {
        timestamp
        value
      }
    }
  }
`;

export const GET_SYSTEM_HEALTH_SUMMARY = gql`
  query GetSystemHealthSummary {
    systemAnalysis {
      id
      timestamp
      overallHealth
      healthScore
      totalServices
      healthyServices
      degradedServices
      unhealthyServices
      activeAlerts
      resourceUtilization {
        cpu {
          current
          average
          trend
        }
        memory {
          current
          average
          trend
        }
        disk {
          current
          average
          trend
        }
        network {
          current
          average
          trend
        }
      }
      recommendations(limit: 5) {
        id
        type
        priority
        title
        description
        automatable
      }
    }
  }
`;

// Mutations optimized for mobile quick actions
export const ACKNOWLEDGE_ALERT_MOBILE = gql`
  mutation AcknowledgeAlertMobile($alertId: ID!, $userId: String!) {
    acknowledgeAlert(alertId: $alertId, userId: $userId) {
      id
      status
      acknowledgedAt
      acknowledgedBy
    }
  }
`;

export const RESOLVE_ALERT_MOBILE = gql`
  mutation ResolveAlertMobile($alertId: ID!, $userId: String!) {
    resolveAlert(alertId: $alertId, userId: $userId) {
      id
      status
      resolvedAt
    }
  }
`;

export const TRIGGER_HEALTH_CHECK_MOBILE = gql`
  mutation TriggerHealthCheckMobile($serviceId: ID!) {
    triggerHealthCheck(serviceId: $serviceId) {
      service {
        id
        name
        status
      }
      status
      timestamp
      error
    }
  }
`;

export const RESTART_SERVICE_MOBILE = gql`
  mutation RestartServiceMobile($serviceId: ID!) {
    restartService(serviceId: $serviceId) {
      success
      message
      timestamp
      service {
        id
        name
        status
      }
    }
  }
`;

// Lightweight subscriptions for mobile
export const SERVICE_STATUS_UPDATES = gql`
  subscription ServiceStatusUpdates {
    serviceStatusChanged {
      service {
        id
        name
        displayName
      }
      previousStatus
      currentStatus
      timestamp
      reason
    }
  }
`;

export const CRITICAL_ALERTS = gql`
  subscription CriticalAlerts {
    alertTriggered(severity: CRITICAL) {
      id
      name
      severity
      status
      triggeredAt
      service {
        id
        name
        displayName
      }
      triggerValue
      thresholdValue
    }
  }
`;

export const SYSTEM_HEALTH_UPDATES = gql`
  subscription SystemHealthUpdates {
    systemAnalysisUpdated {
      id
      timestamp
      overallHealth
      healthScore
      totalServices
      healthyServices
      degradedServices
      unhealthyServices
      activeAlerts
    }
  }
`;

// Background sync queries (minimal data for background updates)
export const GET_BACKGROUND_STATUS = gql`
  query GetBackgroundStatus {
    services(limit: 100) {
      id
      name
      status
      lastHealthCheck
    }
    alerts(status: ACTIVE, limit: 50) {
      id
      name
      severity
      triggeredAt
      service {
        id
        name
      }
    }
    systemAnalysis {
      overallHealth
      healthScore
      activeAlerts
    }
  }
`;