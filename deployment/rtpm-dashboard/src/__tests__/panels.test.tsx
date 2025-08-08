/**
 * Tests for dashboard panel components.
 * Covers DNS, Infrastructure, Kubernetes, and Validation panels.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import DNSManagementPanel from '../components/panels/DNSManagementPanel';
import InfrastructureStatusPanel from '../components/panels/InfrastructureStatusPanel';
import KubernetesPanel from '../components/panels/KubernetesPanel';
import ValidationResultsPanel from '../components/panels/ValidationResultsPanel';
import * as apiMock from './__mocks__/apiMock';

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('DNS Management Panel', () => {
  beforeEach(() => {
    apiMock.resetAllMocks();
  });

  it('renders DNS configuration data', async () => {
    const mockDNSData = [
      {
        id: 'dns-1',
        domain: 'example.com',
        recordType: 'A',
        value: '192.168.1.1',
        ttl: 300,
        status: 'active',
      },
      {
        id: 'dns-2',
        domain: 'api.example.com',
        recordType: 'CNAME',
        value: 'example.com',
        ttl: 300,
        status: 'active',
      },
    ];

    apiMock.setApiResponse('getDNSConfiguration', mockDNSData);

    render(
      <TestWrapper>
        <DNSManagementPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dns-panel')).toBeInTheDocument();
      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('api.example.com')).toBeInTheDocument();
    });

    // Check table content
    const table = screen.getByTestId('dns-table');
    expect(within(table).getByText('A')).toBeInTheDocument();
    expect(within(table).getByText('CNAME')).toBeInTheDocument();
    expect(within(table).getByText('192.168.1.1')).toBeInTheDocument();
  });

  it('handles DNS record editing', async () => {
    const user = userEvent.setup();
    const mockDNSData = [
      {
        id: 'dns-1',
        domain: 'example.com',
        recordType: 'A',
        value: '192.168.1.1',
        ttl: 300,
        status: 'active',
      },
    ];

    apiMock.setApiResponse('getDNSConfiguration', mockDNSData);

    render(
      <TestWrapper>
        <DNSManagementPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dns-panel')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByTestId('edit-dns-dns-1');
    await user.click(editButton);

    // Should open edit modal
    expect(screen.getByTestId('dns-edit-modal')).toBeInTheDocument();
    expect(screen.getByDisplayValue('192.168.1.1')).toBeInTheDocument();

    // Change value
    const valueInput = screen.getByLabelText(/value/i);
    await user.clear(valueInput);
    await user.type(valueInput, '192.168.1.2');

    // Save changes
    const saveButton = screen.getByTestId('save-dns-changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(apiMock.getApiCallCount('updateDNSRecord')).toBe(1);
    });
  });

  it('displays SSL certificate information', async () => {
    const mockSSLData = [
      {
        id: 'ssl-1',
        domain: 'example.com',
        issuer: "Let's Encrypt",
        validFrom: '2022-01-01T00:00:00Z',
        validTo: '2022-04-01T00:00:00Z',
        status: 'valid',
      },
    ];

    apiMock.setApiResponse('getSSLCertificates', mockSSLData);

    render(
      <TestWrapper>
        <DNSManagementPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ssl-certificates')).toBeInTheDocument();
      expect(screen.getByText("Let's Encrypt")).toBeInTheDocument();
      expect(screen.getByTestId('ssl-status-valid')).toBeInTheDocument();
    });
  });

  it('warns about expiring certificates', async () => {
    const expiringSSL = [
      {
        id: 'ssl-1',
        domain: 'example.com',
        issuer: "Let's Encrypt",
        validFrom: '2022-01-01T00:00:00Z',
        validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: 'expiring',
      },
    ];

    apiMock.setApiResponse('getSSLCertificates', expiringSSL);

    render(
      <TestWrapper>
        <DNSManagementPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ssl-warning')).toBeInTheDocument();
      expect(screen.getByText(/expires in 7 days/i)).toBeInTheDocument();
    });
  });

  it('handles DNS loading and error states', async () => {
    // Test loading state
    apiMock.setApiResponse('getDNSConfiguration',
      new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    render(
      <TestWrapper>
        <DNSManagementPanel />
      </TestWrapper>
    );

    expect(screen.getByTestId('dns-loading')).toBeInTheDocument();

    // Test error state
    apiMock.setApiError('getDNSConfiguration', new Error('API Error'));

    const { rerender } = render(
      <TestWrapper>
        <DNSManagementPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dns-error')).toBeInTheDocument();
    });
  });
});

describe('Infrastructure Status Panel', () => {
  beforeEach(() => {
    apiMock.resetAllMocks();
  });

  it('displays infrastructure resource status', async () => {
    const mockResources = [
      {
        id: 'tf-1',
        type: 'aws_instance',
        name: 'web-server-01',
        status: 'created',
        attributes: {
          instanceType: 't3.medium',
          availabilityZone: 'us-east-1a',
        },
      },
    ];

    apiMock.setApiResponse('getTerraformResources', mockResources);

    render(
      <TestWrapper>
        <InfrastructureStatusPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('infrastructure-panel')).toBeInTheDocument();
      expect(screen.getByText('web-server-01')).toBeInTheDocument();
      expect(screen.getByText('t3.medium')).toBeInTheDocument();
      expect(screen.getByTestId('resource-status-created')).toBeInTheDocument();
    });
  });

  it('shows resource utilization metrics', async () => {
    const mockUtilization = [
      {
        resource: 'CPU',
        current: 65.5,
        maximum: 100,
        unit: 'percent',
        status: 'normal',
      },
      {
        resource: 'Memory',
        current: 12.8,
        maximum: 16,
        unit: 'GB',
        status: 'normal',
      },
    ];

    apiMock.setApiResponse('getResourceUtilization', mockUtilization);

    render(
      <TestWrapper>
        <InfrastructureStatusPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('resource-utilization')).toBeInTheDocument();
      expect(screen.getByText('CPU: 65.5%')).toBeInTheDocument();
      expect(screen.getByText('Memory: 12.8 GB / 16 GB')).toBeInTheDocument();
    });
  });

  it('displays cost information', async () => {
    const mockCosts = [
      {
        service: 'EC2',
        cost: 245.67,
        currency: 'USD',
        period: 'monthly',
        trend: 'up',
      },
      {
        service: 'RDS',
        cost: 123.45,
        currency: 'USD',
        period: 'monthly',
        trend: 'stable',
      },
    ];

    apiMock.setApiResponse('getInfrastructureCosts', mockCosts);

    render(
      <TestWrapper>
        <InfrastructureStatusPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cost-breakdown')).toBeInTheDocument();
      expect(screen.getByText('EC2: $245.67')).toBeInTheDocument();
      expect(screen.getByText('RDS: $123.45')).toBeInTheDocument();
      expect(screen.getByTestId('trend-up')).toBeInTheDocument();
      expect(screen.getByTestId('trend-stable')).toBeInTheDocument();
    });
  });

  it('handles high utilization alerts', async () => {
    const highUtilization = [
      {
        resource: 'CPU',
        current: 95.0,
        maximum: 100,
        unit: 'percent',
        status: 'critical',
      },
    ];

    apiMock.setApiResponse('getResourceUtilization', highUtilization);

    render(
      <TestWrapper>
        <InfrastructureStatusPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('utilization-alert')).toBeInTheDocument();
      expect(screen.getByText(/high cpu utilization/i)).toBeInTheDocument();
    });
  });
});

describe('Kubernetes Panel', () => {
  beforeEach(() => {
    apiMock.resetAllMocks();
  });

  it('displays Kubernetes deployments', async () => {
    const mockDeployments = [
      {
        id: 'k8s-1',
        name: 'rtpm-api',
        namespace: 'production',
        replicas: 3,
        readyReplicas: 3,
        status: 'Running',
        image: 'rtpm-api:v1.2.3',
      },
      {
        id: 'k8s-2',
        name: 'rtpm-frontend',
        namespace: 'production',
        replicas: 2,
        readyReplicas: 1,
        status: 'Updating',
        image: 'rtpm-frontend:v1.2.3',
      },
    ];

    apiMock.setApiResponse('getKubernetesDeployments', mockDeployments);

    render(
      <TestWrapper>
        <KubernetesPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kubernetes-panel')).toBeInTheDocument();
      expect(screen.getByText('rtpm-api')).toBeInTheDocument();
      expect(screen.getByText('rtpm-frontend')).toBeInTheDocument();
      expect(screen.getByText('3/3')).toBeInTheDocument(); // Ready replicas
      expect(screen.getByText('1/2')).toBeInTheDocument(); // Ready replicas
    });
  });

  it('allows scaling deployments', async () => {
    const user = userEvent.setup();
    const mockDeployments = [
      {
        id: 'k8s-1',
        name: 'rtpm-api',
        namespace: 'production',
        replicas: 3,
        readyReplicas: 3,
        status: 'Running',
        image: 'rtpm-api:v1.2.3',
      },
    ];

    apiMock.setApiResponse('getKubernetesDeployments', mockDeployments);

    render(
      <TestWrapper>
        <KubernetesPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kubernetes-panel')).toBeInTheDocument();
    });

    // Click scale button
    const scaleButton = screen.getByTestId('scale-rtpm-api');
    await user.click(scaleButton);

    // Should open scale modal
    expect(screen.getByTestId('scale-modal')).toBeInTheDocument();

    // Change replica count
    const replicaInput = screen.getByLabelText(/replicas/i);
    await user.clear(replicaInput);
    await user.type(replicaInput, '5');

    // Confirm scaling
    const confirmButton = screen.getByTestId('confirm-scale');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(apiMock.getApiCallCount('scaleDeployment')).toBe(1);
    });
  });

  it('allows restarting deployments', async () => {
    const user = userEvent.setup();
    const mockDeployments = [
      {
        id: 'k8s-1',
        name: 'rtpm-api',
        namespace: 'production',
        replicas: 3,
        readyReplicas: 3,
        status: 'Running',
        image: 'rtpm-api:v1.2.3',
      },
    ];

    apiMock.setApiResponse('getKubernetesDeployments', mockDeployments);

    render(
      <TestWrapper>
        <KubernetesPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kubernetes-panel')).toBeInTheDocument();
    });

    // Click restart button
    const restartButton = screen.getByTestId('restart-rtpm-api');
    await user.click(restartButton);

    // Should show confirmation dialog
    expect(screen.getByTestId('restart-confirmation')).toBeInTheDocument();

    // Confirm restart
    const confirmButton = screen.getByTestId('confirm-restart');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(apiMock.getApiCallCount('restartDeployment')).toBe(1);
    });
  });

  it('shows deployment status indicators', async () => {
    const deploymentWithIssues = [
      {
        id: 'k8s-1',
        name: 'rtpm-api',
        namespace: 'production',
        replicas: 3,
        readyReplicas: 1,
        status: 'Error',
        image: 'rtpm-api:v1.2.3',
      },
    ];

    apiMock.setApiResponse('getKubernetesDeployments', deploymentWithIssues);

    render(
      <TestWrapper>
        <KubernetesPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('deployment-status-error')).toBeInTheDocument();
      expect(screen.getByTestId('replica-warning')).toBeInTheDocument(); // Not all replicas ready
    });
  });

  it('displays pod logs preview', async () => {
    const user = userEvent.setup();
    const mockDeployments = [
      {
        id: 'k8s-1',
        name: 'rtpm-api',
        namespace: 'production',
        replicas: 3,
        readyReplicas: 3,
        status: 'Running',
        image: 'rtpm-api:v1.2.3',
      },
    ];

    apiMock.setApiResponse('getKubernetesDeployments', mockDeployments);
    apiMock.setApiResponse('getPodLogs', [
      'INFO: Starting application',
      'INFO: Database connection established',
      'INFO: Server listening on port 8000',
    ]);

    render(
      <TestWrapper>
        <KubernetesPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kubernetes-panel')).toBeInTheDocument();
    });

    // Click logs button
    const logsButton = screen.getByTestId('view-logs-rtpm-api');
    await user.click(logsButton);

    // Should show logs modal
    expect(screen.getByTestId('logs-modal')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Starting application')).toBeInTheDocument();
      expect(screen.getByText('Database connection established')).toBeInTheDocument();
    });
  });
});

describe('Validation Results Panel', () => {
  beforeEach(() => {
    apiMock.resetAllMocks();
  });

  it('displays validation results', async () => {
    const mockResults = [
      {
        id: 'validation-1',
        type: 'dns',
        status: 'passed',
        message: 'DNS configuration is valid',
        timestamp: '2022-01-01T00:00:00Z',
      },
      {
        id: 'validation-2',
        type: 'ssl',
        status: 'warning',
        message: 'SSL certificate expires in 30 days',
        timestamp: '2022-01-01T00:01:00Z',
      },
      {
        id: 'validation-3',
        type: 'kubernetes',
        status: 'failed',
        message: 'Pod rtpm-api-abc123 is not ready',
        timestamp: '2022-01-01T00:02:00Z',
      },
    ];

    apiMock.setApiResponse('getValidationResults', mockResults);

    render(
      <TestWrapper>
        <ValidationResultsPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('validation-panel')).toBeInTheDocument();
      expect(screen.getByText('DNS configuration is valid')).toBeInTheDocument();
      expect(screen.getByText('SSL certificate expires in 30 days')).toBeInTheDocument();
      expect(screen.getByText('Pod rtpm-api-abc123 is not ready')).toBeInTheDocument();
    });

    // Check status indicators
    expect(screen.getByTestId('status-passed')).toBeInTheDocument();
    expect(screen.getByTestId('status-warning')).toBeInTheDocument();
    expect(screen.getByTestId('status-failed')).toBeInTheDocument();
  });

  it('allows running new validation', async () => {
    const user = userEvent.setup();

    apiMock.setApiResponse('getValidationResults', []);
    apiMock.setApiResponse('runValidation', { id: 'validation-123' });

    render(
      <TestWrapper>
        <ValidationResultsPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('validation-panel')).toBeInTheDocument();
    });

    // Click run validation button
    const runButton = screen.getByTestId('run-validation-button');
    await user.click(runButton);

    await waitFor(() => {
      expect(apiMock.getApiCallCount('runValidation')).toBe(1);
      expect(screen.getByTestId('validation-running')).toBeInTheDocument();
    });
  });

  it('groups validation results by type', async () => {
    const mockResults = [
      {
        id: 'validation-1',
        type: 'dns',
        status: 'passed',
        message: 'DNS configuration is valid',
        timestamp: '2022-01-01T00:00:00Z',
      },
      {
        id: 'validation-2',
        type: 'dns',
        status: 'warning',
        message: 'DNS propagation incomplete',
        timestamp: '2022-01-01T00:01:00Z',
      },
      {
        id: 'validation-3',
        type: 'ssl',
        status: 'passed',
        message: 'SSL certificates are valid',
        timestamp: '2022-01-01T00:02:00Z',
      },
    ];

    apiMock.setApiResponse('getValidationResults', mockResults);

    render(
      <TestWrapper>
        <ValidationResultsPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('validation-group-dns')).toBeInTheDocument();
      expect(screen.getByTestId('validation-group-ssl')).toBeInTheDocument();
    });

    // DNS group should have 2 items
    const dnsGroup = screen.getByTestId('validation-group-dns');
    expect(within(dnsGroup).getAllByTestId(/validation-item/)).toHaveLength(2);

    // SSL group should have 1 item
    const sslGroup = screen.getByTestId('validation-group-ssl');
    expect(within(sslGroup).getAllByTestId(/validation-item/)).toHaveLength(1);
  });

  it('shows validation summary statistics', async () => {
    const mockResults = [
      { id: '1', type: 'dns', status: 'passed', message: 'Test 1', timestamp: '2022-01-01T00:00:00Z' },
      { id: '2', type: 'ssl', status: 'passed', message: 'Test 2', timestamp: '2022-01-01T00:01:00Z' },
      { id: '3', type: 'k8s', status: 'warning', message: 'Test 3', timestamp: '2022-01-01T00:02:00Z' },
      { id: '4', type: 'dns', status: 'failed', message: 'Test 4', timestamp: '2022-01-01T00:03:00Z' },
    ];

    apiMock.setApiResponse('getValidationResults', mockResults);

    render(
      <TestWrapper>
        <ValidationResultsPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('validation-summary')).toBeInTheDocument();
      expect(screen.getByText('2 Passed')).toBeInTheDocument();
      expect(screen.getByText('1 Warning')).toBeInTheDocument();
      expect(screen.getByText('1 Failed')).toBeInTheDocument();
    });
  });

  it('filters validation results', async () => {
    const user = userEvent.setup();

    const mockResults = [
      { id: '1', type: 'dns', status: 'passed', message: 'DNS Test', timestamp: '2022-01-01T00:00:00Z' },
      { id: '2', type: 'ssl', status: 'failed', message: 'SSL Test', timestamp: '2022-01-01T00:01:00Z' },
      { id: '3', type: 'k8s', status: 'passed', message: 'K8s Test', timestamp: '2022-01-01T00:02:00Z' },
    ];

    apiMock.setApiResponse('getValidationResults', mockResults);

    render(
      <TestWrapper>
        <ValidationResultsPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('validation-panel')).toBeInTheDocument();
    });

    // Initially show all results
    expect(screen.getByText('DNS Test')).toBeInTheDocument();
    expect(screen.getByText('SSL Test')).toBeInTheDocument();
    expect(screen.getByText('K8s Test')).toBeInTheDocument();

    // Filter by failed status
    const statusFilter = screen.getByTestId('status-filter');
    await user.selectOptions(statusFilter, 'failed');

    // Should only show failed results
    expect(screen.queryByText('DNS Test')).not.toBeInTheDocument();
    expect(screen.getByText('SSL Test')).toBeInTheDocument();
    expect(screen.queryByText('K8s Test')).not.toBeInTheDocument();

    // Filter by type
    const typeFilter = screen.getByTestId('type-filter');
    await user.selectOptions(typeFilter, 'dns');

    // Should show DNS results (but filtered by failed status, so none)
    expect(screen.queryByText('DNS Test')).not.toBeInTheDocument();
    expect(screen.queryByText('SSL Test')).not.toBeInTheDocument();
  });

  it('handles validation errors', async () => {
    apiMock.setApiError('getValidationResults', new Error('Failed to fetch validation results'));

    render(
      <TestWrapper>
        <ValidationResultsPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('validation-error')).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch validation results/i)).toBeInTheDocument();
    });
  });

  it('auto-refreshes validation results', async () => {
    jest.useFakeTimers();

    apiMock.setApiResponse('getValidationResults', []);

    render(
      <TestWrapper>
        <ValidationResultsPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('validation-panel')).toBeInTheDocument();
    });

    const initialCallCount = apiMock.getApiCallCount('getValidationResults');

    // Fast-forward time by 60 seconds (assuming 60s refresh interval)
    jest.advanceTimersByTime(60000);

    await waitFor(() => {
      expect(apiMock.getApiCallCount('getValidationResults')).toBeGreaterThan(initialCallCount);
    });

    jest.useRealTimers();
  });
});
