/**
 * GraphQL Queries, Mutations, and Subscriptions for System Analyzer Dashboard
 */

import { gql } from '@apollo/client';

// Fragment definitions for reusability
export const SERVICE_FRAGMENT = gql`
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
    autoDiscovered
    monitoringEnabled
    alertingEnabled
    healthCheckInterval
    healthCheckTimeout
    healthCheckRetries
  }
`;

export const METRIC_FRAGMENT = gql`
  fragment MetricDetails on Metric {
    id
    name
    type
    value
    unit
    timestamp
    labels
    warningThreshold
    criticalThreshold
  }
`;

export const ALERT_FRAGMENT = gql`
  fragment AlertDetails on Alert {
    id
    name
    description
    severity
    status
    triggeredAt
    resolvedAt
    acknowledgedAt
    acknowledgedBy
    triggerValue
    thresholdValue
    service {
      id
      name
      displayName
    }
    rule {
      id
      name
      condition
      threshold
    }
  }
`;

// Queries
export const GET_SERVICES = gql`
  ${SERVICE_FRAGMENT}
  query GetServices($status: ServiceStatus, $environment: String, $tags: [String!], $limit: Int, $offset: Int) {
    services(status: $status, environment: $environment, tags: $tags, limit: $limit, offset: $offset) {
      ...ServiceDetails
      containers {
        id
        name
        status
        cpuUsage
        memoryUsage
        memoryLimit
        networkRx
        networkTx
      }
      processes {
        id
        name
        status
        cpuPercent
        memoryMb
      }
    }
  }
`;

export const GET_SERVICE_DETAILS = gql`
  ${SERVICE_FRAGMENT}
  ${METRIC_FRAGMENT}
  ${ALERT_FRAGMENT}
  query GetServiceDetails($id: ID!) {
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
        diskUsage
        environment {
          key
          value
          masked
        }
        ports {
          containerPort
          hostPort
          protocol
        }
        volumes {
          source
          destination
          readOnly
        }
        createdAt
        startedAt
        lastRestart
        restartCount
        healthCheck {
          command
          interval
          timeout
          retries
          startPeriod
        }
      }
      processes {
        id
        pid
        name
        command
        status
        cpuPercent
        memoryMb
        openFiles
        threads
        user
        startTime
        parentPid
        workingDirectory
        environment {
          key
          value
          masked
        }
      }
      metrics(limit: 100) {
        ...MetricDetails
      }
      alerts(limit: 50) {
        ...AlertDetails
      }
    }
  }
`;

export const GET_SYSTEM_ANALYSIS = gql`
  query GetSystemAnalysis($timeRange: TimeRangeInput) {
    systemAnalysis(timeRange: $timeRange) {
      id
      timestamp
      overallHealth
      healthScore
      totalServices
      healthyServices
      degradedServices
      unhealthyServices
      performanceInsights {
        type
        severity
        title
        description
        service {
          id
          name
          displayName
        }
        metric
        currentValue
        expectedValue
        impact
        recommendation
      }
      resourceUtilization {
        cpu {
          current
          average
          peak
          percentile95
          trend
        }
        memory {
          current
          average
          peak
          percentile95
          trend
        }
        disk {
          current
          average
          peak
          percentile95
          trend
        }
        network {
          current
          average
          peak
          percentile95
          trend
        }
      }
      activeAlerts
      alertsByService {
        service {
          id
          name
          displayName
        }
        activeAlerts
        criticalAlerts
        lastAlert
      }
      recommendations {
        id
        type
        priority
        title
        description
        service {
          id
          name
          displayName
        }
        estimatedImpact
        actionItems
        automatable
      }
      trendAnalysis {
        timeRange {
          start
          end
          duration
        }
        serviceHealthTrend
        alertFrequencyTrend
        performanceTrend
        availabilityTrend
        mttrTrend
      }
    }
  }
`;

export const GET_ALERTS = gql`
  ${ALERT_FRAGMENT}
  query GetAlerts($serviceId: ID, $severity: AlertSeverity, $status: AlertStatus, $limit: Int, $offset: Int) {
    alerts(serviceId: $serviceId, severity: $severity, status: $status, limit: $limit, offset: $offset) {
      ...AlertDetails
      notifications {
        id
        channel
        sentAt
        acknowledged
        response
      }
    }
  }
`;

export const GET_METRICS_SERIES = gql`
  query GetMetricSeries(
    $serviceId: ID!
    $metricName: String!
    $timeRange: TimeRangeInput!
    $aggregation: AggregationType
    $granularity: Duration
  ) {
    metricSeries(
      serviceId: $serviceId
      metricName: $metricName
      timeRange: $timeRange
      aggregation: $aggregation
      granularity: $granularity
    ) {
      service {
        id
        name
        displayName
      }
      name
      type
      unit
      aggregation
      timeRange {
        start
        end
        duration
      }
      dataPoints {
        timestamp
        value
        labels
      }
    }
  }
`;

export const GET_HEALTH_CHECK_ALL = gql`
  query GetHealthCheckAll {
    healthCheckAll {
      service {
        id
        name
        displayName
        status
      }
      status
      responseTime
      timestamp
      error
      checks {
        name
        status
        message
        duration
      }
    }
  }
`;

// Mutations
export const ACKNOWLEDGE_ALERT = gql`
  ${ALERT_FRAGMENT}
  mutation AcknowledgeAlert($alertId: ID!, $userId: String!) {
    acknowledgeAlert(alertId: $alertId, userId: $userId) {
      ...AlertDetails
    }
  }
`;

export const RESOLVE_ALERT = gql`
  ${ALERT_FRAGMENT}
  mutation ResolveAlert($alertId: ID!, $userId: String!) {
    resolveAlert(alertId: $alertId, userId: $userId) {
      ...AlertDetails
    }
  }
`;

export const SUPPRESS_ALERT = gql`
  ${ALERT_FRAGMENT}
  mutation SuppressAlert($alertId: ID!, $duration: Duration!) {
    suppressAlert(alertId: $alertId, duration: $duration) {
      ...AlertDetails
    }
  }
`;

export const TRIGGER_HEALTH_CHECK = gql`
  mutation TriggerHealthCheck($serviceId: ID!) {
    triggerHealthCheck(serviceId: $serviceId) {
      service {
        id
        name
        displayName
        status
      }
      status
      responseTime
      timestamp
      error
      checks {
        name
        status
        message
        duration
      }
    }
  }
`;

export const RESTART_SERVICE = gql`
  mutation RestartService($serviceId: ID!) {
    restartService(serviceId: $serviceId) {
      success
      message
      timestamp
      service {
        id
        name
        displayName
        status
      }
    }
  }
`;

export const SCALE_SERVICE = gql`
  mutation ScaleService($serviceId: ID!, $replicas: Int!) {
    scaleService(serviceId: $serviceId, replicas: $replicas) {
      success
      message
      timestamp
      service {
        id
        name
        displayName
        status
      }
    }
  }
`;

export const REQUEST_SYSTEM_ANALYSIS = gql`
  mutation RequestSystemAnalysis {
    requestSystemAnalysis {
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

// Subscriptions
export const SERVICE_STATUS_CHANGED = gql`
  subscription ServiceStatusChanged($serviceId: ID) {
    serviceStatusChanged(serviceId: $serviceId) {
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

export const METRICS_UPDATED = gql`
  ${METRIC_FRAGMENT}
  subscription MetricsUpdated($serviceId: ID!) {
    metricsUpdated(serviceId: $serviceId) {
      ...MetricDetails
      service {
        id
        name
        displayName
      }
    }
  }
`;

export const SYSTEM_METRICS_UPDATED = gql`
  ${METRIC_FRAGMENT}
  subscription SystemMetricsUpdated {
    systemMetricsUpdated {
      ...MetricDetails
      service {
        id
        name
        displayName
      }
    }
  }
`;

export const ALERT_TRIGGERED = gql`
  ${ALERT_FRAGMENT}
  subscription AlertTriggered($serviceId: ID) {
    alertTriggered(serviceId: $serviceId) {
      ...AlertDetails
    }
  }
`;

export const ALERT_RESOLVED = gql`
  ${ALERT_FRAGMENT}
  subscription AlertResolved($serviceId: ID) {
    alertResolved(serviceId: $serviceId) {
      ...AlertDetails
    }
  }
`;

export const ALERTS_CHANGED = gql`
  ${ALERT_FRAGMENT}
  subscription AlertsChanged {
    alertsChanged {
      ...AlertDetails
    }
  }
`;

export const SYSTEM_ANALYSIS_UPDATED = gql`
  subscription SystemAnalysisUpdated {
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

export const CONTAINER_STATUS_CHANGED = gql`
  subscription ContainerStatusChanged($serviceId: ID) {
    containerStatusChanged(serviceId: $serviceId) {
      container {
        id
        name
        image
        status
        service {
          id
          name
          displayName
        }
      }
      previousStatus
      currentStatus
      timestamp
      reason
    }
  }
`;