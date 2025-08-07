// GraphQL Client Examples for System Analyzer
// Demonstrates how to use the "run all open so we can analyze status" queries and mutations

import { gql } from '@apollo/client';

// ===========================================
// QUERY EXAMPLES
// ===========================================

// 1. Get all services with current status
export const GET_ALL_SERVICES = gql`
  query GetAllServices($limit: Int = 50, $environment: String) {
    services(limit: $limit, environment: $environment) {
      id
      name
      displayName
      status
      environment
      version
      tags
      lastHealthCheck
      uptime
      monitoringEnabled
      alertingEnabled
      
      # Resource usage
      containers {
        id
        name
        status
        cpuUsage
        memoryUsage
        restartCount
      }
      
      # Dependencies
      dependencies {
        id
        dependsOn {
          id
          name
          status
        }
        type
        critical
        healthImpact
      }
      
      # Recent metrics
      metrics {
        id
        name
        type
        value
        unit
        timestamp
        warningThreshold
        criticalThreshold
      }
      
      # Active alerts
      alerts(status: ACTIVE) {
        id
        name
        severity
        status
        triggeredAt
        triggerValue
        thresholdValue
      }
    }
  }
`;

// 2. Run comprehensive system analysis - "analyze all status"
export const RUN_FULL_ANALYSIS = gql`
  query RunFullAnalysis {
    runFullAnalysis {
      id
      timestamp
      overallHealth
      healthScore
      
      # Service breakdown
      totalServices
      healthyServices
      degradedServices
      unhealthyServices
      
      # Performance insights
      performanceInsights {
        type
        severity
        title
        description
        service {
          id
          name
        }
        metric
        currentValue
        expectedValue
        impact
        recommendation
      }
      
      # Resource utilization
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
      
      # Active alerts summary
      activeAlerts
      alertsByService {
        service {
          id
          name
        }
        activeAlerts
        criticalAlerts
        lastAlert
      }
      
      # System recommendations
      recommendations {
        id
        type
        priority
        title
        description
        service {
          id
          name
        }
        estimatedImpact
        actionItems
        automatable
      }
      
      # Trend analysis
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

// 3. Get service with detailed dependencies and status
export const GET_SERVICE_DETAILS = gql`
  query GetServiceDetails($id: ID!) {
    service(id: $id) {
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
      
      # Timing information
      discoveredAt
      lastHealthCheck
      lastStatusChange
      uptime
      
      # Configuration
      autoDiscovered
      monitoringEnabled
      alertingEnabled
      healthCheckInterval
      healthCheckTimeout
      healthCheckRetries
      
      # Dependencies with health impact
      dependencies {
        id
        type
        critical
        healthImpact
        dependsOn {
          id
          name
          status
          lastHealthCheck
        }
      }
      
      # Running containers
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
        
        ports {
          containerPort
          hostPort
          protocol
        }
      }
      
      # Running processes
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
      }
      
      # Recent metrics
      metrics {
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
      
      # Current alerts
      alerts {
        id
        name
        description
        severity
        status
        triggeredAt
        resolvedAt
        acknowledgedAt
        acknowledgedBy
        
        rule {
          id
          name
          condition
          threshold
          duration
        }
        
        triggerValue
        thresholdValue
        
        notifications {
          id
          channel
          sentAt
          acknowledged
          response
        }
      }
    }
  }
`;

// 4. Get system metrics over time
export const GET_SYSTEM_METRICS = gql`
  query GetSystemMetrics(
    $serviceId: ID!
    $timeRange: TimeRangeInput!
    $aggregation: AggregationType = AVG
    $granularity: Duration = "1m"
  ) {
    # CPU metrics
    cpuSeries: metricSeries(
      serviceId: $serviceId
      metricName: "cpu_usage_percent"
      timeRange: $timeRange
      aggregation: $aggregation
      granularity: $granularity
    ) {
      service {
        id
        name
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
    
    # Memory metrics
    memorySeries: metricSeries(
      serviceId: $serviceId
      metricName: "memory_usage_bytes"
      timeRange: $timeRange
      aggregation: $aggregation
      granularity: $granularity
    ) {
      service {
        id
        name
      }
      name
      type
      unit
      dataPoints {
        timestamp
        value
        labels
      }
    }
    
    # Network metrics
    networkSeries: metricSeries(
      serviceId: $serviceId
      metricName: "network_bytes_total"
      timeRange: $timeRange
      aggregation: $aggregation
      granularity: $granularity
    ) {
      service {
        id
        name
      }
      name
      type
      unit
      dataPoints {
        timestamp
        value
        labels
      }
    }
  }
`;

// 5. Get all active alerts across system
export const GET_ACTIVE_ALERTS = gql`
  query GetActiveAlerts($severity: AlertSeverity, $limit: Int = 100) {
    alerts(status: ACTIVE, severity: $severity, limit: $limit) {
      id
      name
      description
      severity
      status
      triggeredAt
      
      service {
        id
        name
        environment
        status
      }
      
      rule {
        id
        name
        description
        metric
        condition
        threshold
        duration
        notificationChannels
      }
      
      triggerValue
      thresholdValue
      
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

// 6. Health check all services
export const HEALTH_CHECK_ALL = gql`
  query HealthCheckAll {
    healthCheckAll {
      service {
        id
        name
        environment
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

// ===========================================
// MUTATION EXAMPLES
// ===========================================

// 1. Register a new service for monitoring
export const REGISTER_SERVICE = gql`
  mutation RegisterService($input: RegisterServiceInput!) {
    registerService(input: $input) {
      id
      name
      displayName
      environment
      status
      autoDiscovered
      monitoringEnabled
      alertingEnabled
      discoveredAt
    }
  }
`;

// 2. Trigger health check for specific service
export const TRIGGER_HEALTH_CHECK = gql`
  mutation TriggerHealthCheck($serviceId: ID!) {
    triggerHealthCheck(serviceId: $serviceId) {
      service {
        id
        name
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

// 3. Create alert rule for monitoring
export const CREATE_ALERT_RULE = gql`
  mutation CreateAlertRule($input: CreateAlertRuleInput!) {
    createAlertRule(input: $input) {
      id
      name
      description
      metric
      condition
      threshold
      duration
      severity
      enabled
      
      services {
        id
        name
      }
      
      notificationChannels
      suppressDuration
    }
  }
`;

// 4. Acknowledge alert
export const ACKNOWLEDGE_ALERT = gql`
  mutation AcknowledgeAlert($alertId: ID!, $userId: String!) {
    acknowledgeAlert(alertId: $alertId, userId: $userId) {
      id
      name
      severity
      status
      acknowledgedAt
      acknowledgedBy
      
      service {
        id
        name
      }
    }
  }
`;

// 5. Restart service
export const RESTART_SERVICE = gql`
  mutation RestartService($serviceId: ID!) {
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

// 6. Scale service (for containerized services)
export const SCALE_SERVICE = gql`
  mutation ScaleService($serviceId: ID!, $replicas: Int!) {
    scaleService(serviceId: $serviceId, replicas: $replicas) {
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

// ===========================================
// SUBSCRIPTION EXAMPLES
// ===========================================

// 1. Subscribe to service status changes
export const SUBSCRIBE_SERVICE_STATUS = gql`
  subscription ServiceStatusChanged($serviceId: ID) {
    serviceStatusChanged(serviceId: $serviceId) {
      service {
        id
        name
        environment
      }
      previousStatus
      currentStatus
      timestamp
      reason
    }
  }
`;

// 2. Subscribe to new alerts
export const SUBSCRIBE_ALERT_TRIGGERED = gql`
  subscription AlertTriggered($serviceId: ID) {
    alertTriggered(serviceId: $serviceId) {
      id
      name
      severity
      status
      triggeredAt
      
      service {
        id
        name
        environment
      }
      
      rule {
        name
        threshold
        condition
      }
      
      triggerValue
      thresholdValue
    }
  }
`;

// 3. Subscribe to real-time metrics
export const SUBSCRIBE_SYSTEM_METRICS = gql`
  subscription SystemMetricsUpdated {
    systemMetricsUpdated {
      id
      service {
        id
        name
      }
      name
      type
      value
      unit
      timestamp
      labels
      warningThreshold
      criticalThreshold
    }
  }
`;

// 4. Subscribe to system analysis updates
export const SUBSCRIBE_SYSTEM_ANALYSIS = gql`
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
      
      performanceInsights {
        type
        severity
        title
        service {
          id
          name
        }
        recommendation
      }
    }
  }
`;

// ===========================================
// FRAGMENT EXAMPLES FOR CODE REUSE
// ===========================================

export const SERVICE_BASIC_FRAGMENT = gql`
  fragment ServiceBasic on Service {
    id
    name
    displayName
    status
    environment
    version
    lastHealthCheck
    uptime
  }
`;

export const SERVICE_DETAILED_FRAGMENT = gql`
  fragment ServiceDetailed on Service {
    ...ServiceBasic
    description
    healthEndpoint
    baseUrl
    tags
    discoveredAt
    lastStatusChange
    autoDiscovered
    monitoringEnabled
    alertingEnabled
    healthCheckInterval
    healthCheckTimeout
    healthCheckRetries
  }
  ${SERVICE_BASIC_FRAGMENT}
`;

export const ALERT_FRAGMENT = gql`
  fragment AlertInfo on Alert {
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
  }
`;

export const METRIC_FRAGMENT = gql`
  fragment MetricInfo on Metric {
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

// ===========================================
// USAGE EXAMPLES IN COMPONENTS
// ===========================================

/*
// Example React component usage:

import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { GET_ALL_SERVICES, RUN_FULL_ANALYSIS, SUBSCRIBE_SERVICE_STATUS } from './client-examples';

export const SystemOverview: React.FC = () => {
  // Get all services
  const { data: servicesData, loading, refetch } = useQuery(GET_ALL_SERVICES, {
    variables: { limit: 100 },
    pollInterval: 30000, // Poll every 30 seconds
  });

  // Run full analysis
  const { data: analysisData, loading: analysisLoading } = useQuery(RUN_FULL_ANALYSIS, {
    fetchPolicy: 'cache-and-network',
  });

  // Subscribe to status changes
  const { data: statusUpdate } = useSubscription(SUBSCRIBE_SERVICE_STATUS);

  // Mutations
  const [triggerHealthCheck] = useMutation(TRIGGER_HEALTH_CHECK);
  const [acknowledgeAlert] = useMutation(ACKNOWLEDGE_ALERT);

  const handleHealthCheck = async (serviceId: string) => {
    await triggerHealthCheck({ variables: { serviceId } });
    refetch(); // Refresh services data
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await acknowledgeAlert({ 
      variables: { 
        alertId, 
        userId: 'current-user-id' 
      } 
    });
  };

  if (loading) return <div>Loading system status...</div>;

  return (
    <div className="system-overview">
      <h1>System Status Overview</h1>
      
      {analysisData?.runFullAnalysis && (
        <div className="analysis-summary">
          <h2>Overall Health: {analysisData.runFullAnalysis.overallHealth}</h2>
          <p>Health Score: {analysisData.runFullAnalysis.healthScore}/100</p>
          <p>Services: {analysisData.runFullAnalysis.healthyServices} healthy, 
             {analysisData.runFullAnalysis.degradedServices} degraded, 
             {analysisData.runFullAnalysis.unhealthyServices} unhealthy</p>
        </div>
      )}
      
      <div className="services-grid">
        {servicesData?.services.map(service => (
          <div key={service.id} className={`service-card ${service.status.toLowerCase()}`}>
            <h3>{service.displayName || service.name}</h3>
            <p>Status: {service.status}</p>
            <p>Environment: {service.environment}</p>
            
            {service.alerts.length > 0 && (
              <div className="alerts">
                <h4>Active Alerts ({service.alerts.length})</h4>
                {service.alerts.map(alert => (
                  <div key={alert.id} className={`alert ${alert.severity.toLowerCase()}`}>
                    <span>{alert.name}</span>
                    <button onClick={() => handleAcknowledgeAlert(alert.id)}>
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <button onClick={() => handleHealthCheck(service.id)}>
              Check Health
            </button>
          </div>
        ))}
      </div>
      
      {statusUpdate && (
        <div className="status-update">
          Service {statusUpdate.serviceStatusChanged.service.name} changed from {statusUpdate.serviceStatusChanged.previousStatus} to {statusUpdate.serviceStatusChanged.currentStatus}
        </div>
      )}
    </div>
  );
};

// Example query complexity analysis usage:
export const COMPLEX_ANALYSIS_QUERY = gql`
  query ComplexSystemAnalysis {
    systemAnalysis {
      # This query has high complexity due to nested relationships
      # Cost estimate: ~200 complexity points
      
      overallHealth
      healthScore
      
      performanceInsights {
        service {
          dependencies {
            dependsOn {
              alerts {
                notifications {
                  # Deep nesting increases complexity
                  channel
                  sentAt
                }
              }
            }
          }
        }
      }
    }
  }
`;

*/