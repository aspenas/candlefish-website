import { gql } from '@apollo/client';

// Fragments
export const INTEGRATION_METRICS_FRAGMENT = gql`
  fragment IntegrationMetricsFragment on IntegrationMetrics {
    totalRequests
    successfulRequests
    failedRequests
    averageResponseTime
    lastRequestAt
    uptime
  }
`;

export const INTEGRATION_CONFIG_FRAGMENT = gql`
  fragment IntegrationConfigFragment on IntegrationConfig {
    endpoint
    syncInterval
    retryAttempts
    timeout
    customSettings
  }
`;

export const INTEGRATION_FRAGMENT = gql`
  ${INTEGRATION_METRICS_FRAGMENT}
  ${INTEGRATION_CONFIG_FRAGMENT}
  fragment IntegrationFragment on Integration {
    id
    type
    name
    status
    lastHealthCheck
    config {
      ...IntegrationConfigFragment
    }
    metrics {
      ...IntegrationMetricsFragment
    }
    errorMessage
  }
`;

// Queries
export const GET_INTEGRATIONS = gql`
  ${INTEGRATION_FRAGMENT}
  query GetIntegrations {
    integrations {
      ...IntegrationFragment
    }
  }
`;

export const GET_INTEGRATION = gql`
  ${INTEGRATION_FRAGMENT}
  query GetIntegration($id: ID!) {
    integration(id: $id) {
      ...IntegrationFragment
    }
  }
`;

export const GET_SYNC_STATUS = gql`
  query GetSyncStatus($integrationType: IntegrationType!) {
    syncStatus(integrationType: $integrationType) {
      isRunning
      lastSync
      nextSync
      progress {
        stage
        completed
        total
        message
      }
      errors {
        message
        timestamp
        details
      }
    }
  }
`;

export const GET_HEALTH_CHECKS = gql`
  query GetHealthChecks {
    healthChecks {
      service
      status
      lastCheck
      responseTime
      details
      dependencies {
        name
        status
        message
      }
    }
  }
`;

// Mutations
export const TEST_INTEGRATION = gql`
  mutation TestIntegration($id: ID!) {
    testIntegration(id: $id) {
      success
      message
      responseTime
      details
    }
  }
`;

export const UPDATE_INTEGRATION_CONFIG = gql`
  ${INTEGRATION_FRAGMENT}
  mutation UpdateIntegrationConfig($id: ID!, $config: IntegrationConfigInput!) {
    updateIntegrationConfig(id: $id, config: $config) {
      ...IntegrationFragment
    }
  }
`;

export const TRIGGER_SYNC = gql`
  mutation TriggerSync($integrationType: IntegrationType!) {
    triggerSync(integrationType: $integrationType) {
      success
      message
      syncId
    }
  }
`;

export const STOP_SYNC = gql`
  mutation StopSync($syncId: ID!) {
    stopSync(syncId: $syncId) {
      success
      message
    }
  }
`;

export const RESET_INTEGRATION = gql`
  ${INTEGRATION_FRAGMENT}
  mutation ResetIntegration($id: ID!) {
    resetIntegration(id: $id) {
      ...IntegrationFragment
    }
  }
`;

// Subscriptions
export const INTEGRATION_STATUS_UPDATED = gql`
  ${INTEGRATION_FRAGMENT}
  subscription IntegrationStatusUpdated($id: ID!) {
    integrationStatusUpdated(id: $id) {
      ...IntegrationFragment
    }
  }
`;

export const SYNC_PROGRESS = gql`
  subscription SyncProgress($integrationType: IntegrationType!) {
    syncProgress(integrationType: $integrationType) {
      stage
      completed
      total
      message
      errors {
        message
        timestamp
        details
      }
    }
  }
`;
