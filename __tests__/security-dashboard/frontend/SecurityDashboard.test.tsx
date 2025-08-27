import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { SecurityDashboard } from '../../../apps/security-dashboard/src/components/dashboard/SecurityDashboard';
import { SecurityEventTimeline } from '../../../apps/security-dashboard/src/components/events/SecurityEventTimeline';
import { ThreatDetectionPanel } from '../../../apps/security-dashboard/src/components/threats/ThreatDetectionPanel';
import { IncidentManagementBoard } from '../../../apps/security-dashboard/src/components/incidents/IncidentManagementBoard';
import * as apiClient from '../../../apps/security-dashboard/src/lib/api-client';
import { mockSecurityOverview, mockSecurityEvents, mockThreats, mockIncidents } from '../mocks/security-data';

// Mock the API client
vi.mock('../../../apps/security-dashboard/src/lib/api-client');

// Mock WebSocket
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('SecurityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API responses
    vi.mocked(apiClient.getSecurityOverview).mockResolvedValue(mockSecurityOverview);
    vi.mocked(apiClient.getSecurityEvents).mockResolvedValue({
      events: mockSecurityEvents,
      total: mockSecurityEvents.length,
    });
    vi.mocked(apiClient.getAssets).mockResolvedValue([]);
    vi.mocked(apiClient.getVulnerabilities).mockResolvedValue([]);
  });

  it('should render dashboard with security overview', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    // Check if main dashboard elements are present
    expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(`${mockSecurityOverview.totalAssets} Assets`)).toBeInTheDocument();
    });

    expect(screen.getByText(`${mockSecurityOverview.criticalVulnerabilities} Critical`)).toBeInTheDocument();
    expect(screen.getByText(`${mockSecurityOverview.activeAlerts} Active Alerts`)).toBeInTheDocument();
    expect(screen.getByText(`${mockSecurityOverview.complianceScore.toFixed(1)}% Compliant`)).toBeInTheDocument();
  });

  it('should display threat level indicator with correct styling', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const threatIndicator = screen.getByTestId('threat-level-indicator');
      expect(threatIndicator).toBeInTheDocument();
      
      // Check threat level styling based on mock data
      if (mockSecurityOverview.threatLevel === 'critical') {
        expect(threatIndicator).toHaveClass('bg-red-500');
      } else if (mockSecurityOverview.threatLevel === 'high') {
        expect(threatIndicator).toHaveClass('bg-orange-500');
      } else if (mockSecurityOverview.threatLevel === 'medium') {
        expect(threatIndicator).toHaveClass('bg-yellow-500');
      } else {
        expect(threatIndicator).toHaveClass('bg-green-500');
      }
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    vi.mocked(apiClient.getSecurityOverview).mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button is clicked', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(apiClient.getSecurityOverview).toHaveBeenCalledTimes(1);
    });

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    // Should call API again
    await waitFor(() => {
      expect(apiClient.getSecurityOverview).toHaveBeenCalledTimes(2);
    });
  });

  it('should update in real-time via WebSocket', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    // Wait for component to mount and WebSocket to connect
    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('securityUpdate', expect.any(Function));
    });

    // Simulate WebSocket event
    const updateCallback = mockSocket.on.mock.calls.find(call => call[0] === 'securityUpdate')[1];
    const newOverview = {
      ...mockSecurityOverview,
      criticalVulnerabilities: mockSecurityOverview.criticalVulnerabilities + 1,
    };
    
    updateCallback(newOverview);

    await waitFor(() => {
      expect(screen.getByText(`${newOverview.criticalVulnerabilities} Critical`)).toBeInTheDocument();
    });
  });

  it('should handle loading states correctly', () => {
    // Mock loading state
    vi.mocked(apiClient.getSecurityOverview).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading security data/i)).toBeInTheDocument();
  });
});

describe('SecurityEventTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getSecurityEvents).mockResolvedValue({
      events: mockSecurityEvents,
      total: mockSecurityEvents.length,
    });
  });

  it('should render security events timeline', async () => {
    render(
      <TestWrapper>
        <SecurityEventTimeline />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Security Events')).toBeInTheDocument();
      mockSecurityEvents.forEach(event => {
        expect(screen.getByText(event.title)).toBeInTheDocument();
      });
    });
  });

  it('should filter events by severity', async () => {
    render(
      <TestWrapper>
        <SecurityEventTimeline />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Security Events')).toBeInTheDocument();
    });

    // Click on critical filter
    const criticalFilter = screen.getByRole('button', { name: /critical/i });
    fireEvent.click(criticalFilter);

    await waitFor(() => {
      expect(apiClient.getSecurityEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
        })
      );
    });
  });

  it('should filter events by date range', async () => {
    render(
      <TestWrapper>
        <SecurityEventTimeline />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Security Events')).toBeInTheDocument();
    });

    // Open date picker
    const dateFilter = screen.getByRole('button', { name: /last 24 hours/i });
    fireEvent.click(dateFilter);

    // Select "Last 7 days"
    const last7Days = screen.getByRole('button', { name: /last 7 days/i });
    fireEvent.click(last7Days);

    await waitFor(() => {
      expect(apiClient.getSecurityEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: '7d',
        })
      );
    });
  });

  it('should acknowledge events', async () => {
    vi.mocked(apiClient.acknowledgeEvent).mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <SecurityEventTimeline />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(mockSecurityEvents[0].title)).toBeInTheDocument();
    });

    // Find and click acknowledge button for first event
    const eventCard = screen.getByTestId(`event-${mockSecurityEvents[0].id}`);
    const acknowledgeButton = within(eventCard).getByRole('button', { name: /acknowledge/i });
    fireEvent.click(acknowledgeButton);

    await waitFor(() => {
      expect(apiClient.acknowledgeEvent).toHaveBeenCalledWith(mockSecurityEvents[0].id);
    });
  });

  it('should paginate through events', async () => {
    render(
      <TestWrapper>
        <SecurityEventTimeline />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Security Events')).toBeInTheDocument();
    });

    // Click next page
    const nextButton = screen.getByRole('button', { name: /next page/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(apiClient.getSecurityEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });
});

describe('ThreatDetectionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getThreats).mockResolvedValue(mockThreats);
    vi.mocked(apiClient.getThreatTrends).mockResolvedValue({
      trends: [],
      total: 0,
    });
  });

  it('should render threat detection panel with charts', async () => {
    render(
      <TestWrapper>
        <ThreatDetectionPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Threat Detection')).toBeInTheDocument();
      expect(screen.getByText('Active Threats')).toBeInTheDocument();
      expect(screen.getByTestId('threat-severity-chart')).toBeInTheDocument();
      expect(screen.getByTestId('threat-trends-chart')).toBeInTheDocument();
    });
  });

  it('should display threat statistics', async () => {
    render(
      <TestWrapper>
        <ThreatDetectionPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      const criticalThreats = mockThreats.filter(t => t.severity === 'critical').length;
      const highThreats = mockThreats.filter(t => t.severity === 'high').length;
      
      expect(screen.getByText(`${criticalThreats} Critical`)).toBeInTheDocument();
      expect(screen.getByText(`${highThreats} High`)).toBeInTheDocument();
    });
  });

  it('should allow threat investigation', async () => {
    vi.mocked(apiClient.investigateThreat).mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <ThreatDetectionPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Active Threats')).toBeInTheDocument();
    });

    // Click investigate button for first threat
    const threatCard = screen.getByTestId(`threat-${mockThreats[0].id}`);
    const investigateButton = within(threatCard).getByRole('button', { name: /investigate/i });
    fireEvent.click(investigateButton);

    await waitFor(() => {
      expect(apiClient.investigateThreat).toHaveBeenCalledWith(mockThreats[0].id);
    });
  });
});

describe('IncidentManagementBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getIncidents).mockResolvedValue(mockIncidents);
  });

  it('should render incident management board', async () => {
    render(
      <TestWrapper>
        <IncidentManagementBoard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Incident Management')).toBeInTheDocument();
      expect(screen.getByText('Open Incidents')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });
  });

  it('should display incidents in correct columns', async () => {
    render(
      <TestWrapper>
        <IncidentManagementBoard />
      </TestWrapper>
    );

    await waitFor(() => {
      mockIncidents.forEach(incident => {
        expect(screen.getByText(incident.title)).toBeInTheDocument();
        
        const incidentCard = screen.getByTestId(`incident-${incident.id}`);
        const column = incidentCard.closest('[data-testid*="column"]');
        
        if (incident.status === 'open') {
          expect(column).toHaveAttribute('data-testid', 'column-open');
        } else if (incident.status === 'investigating') {
          expect(column).toHaveAttribute('data-testid', 'column-investigating');
        } else if (incident.status === 'resolved') {
          expect(column).toHaveAttribute('data-testid', 'column-resolved');
        }
      });
    });
  });

  it('should allow incident status updates via drag and drop', async () => {
    vi.mocked(apiClient.updateIncidentStatus).mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <IncidentManagementBoard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Incident Management')).toBeInTheDocument();
    });

    // Simulate drag and drop (simplified)
    const incident = mockIncidents.find(i => i.status === 'open');
    if (incident) {
      const incidentCard = screen.getByTestId(`incident-${incident.id}`);
      const investigatingColumn = screen.getByTestId('column-investigating');

      // Simulate drop event
      fireEvent.drop(investigatingColumn);

      // Note: In a real test, you'd use a proper drag-and-drop testing library
      // For now, we'll simulate the status update directly
      const updateButton = within(incidentCard).getByRole('button', { name: /update status/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(apiClient.updateIncidentStatus).toHaveBeenCalled();
      });
    }
  });

  it('should create new incident', async () => {
    vi.mocked(apiClient.createIncident).mockResolvedValue({
      id: 'new-incident-id',
      title: 'New Test Incident',
      status: 'open',
      severity: 'high',
      description: 'Test incident created via UI',
      createdAt: new Date().toISOString(),
    });

    render(
      <TestWrapper>
        <IncidentManagementBoard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Incident Management')).toBeInTheDocument();
    });

    // Click create incident button
    const createButton = screen.getByRole('button', { name: /create incident/i });
    fireEvent.click(createButton);

    // Fill out incident form
    const titleInput = screen.getByLabelText(/incident title/i);
    fireEvent.change(titleInput, { target: { value: 'New Test Incident' } });

    const severitySelect = screen.getByLabelText(/severity/i);
    fireEvent.change(severitySelect, { target: { value: 'high' } });

    const descriptionInput = screen.getByLabelText(/description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Test incident created via UI' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.createIncident).toHaveBeenCalledWith({
        title: 'New Test Incident',
        severity: 'high',
        description: 'Test incident created via UI',
      });
    });
  });
});

describe('Real-time Updates', () => {
  it('should handle WebSocket connection and disconnection', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    // Should establish WebSocket connection
    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('securityUpdate', expect.any(Function));
    });

    // Simulate connection
    const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    connectCallback();

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');

    // Simulate disconnection
    const disconnectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    disconnectCallback();

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
  });

  it('should handle real-time security event updates', async () => {
    render(
      <TestWrapper>
        <SecurityEventTimeline />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('newSecurityEvent', expect.any(Function));
    });

    // Simulate new security event via WebSocket
    const eventCallback = mockSocket.on.mock.calls.find(call => call[0] === 'newSecurityEvent')[1];
    const newEvent = {
      id: 'new-event-id',
      title: 'Real-time Security Event',
      severity: 'high',
      eventType: 'unauthorized_access',
      createdAt: new Date().toISOString(),
    };
    
    eventCallback(newEvent);

    await waitFor(() => {
      expect(screen.getByText('Real-time Security Event')).toBeInTheDocument();
    });
  });
});

describe('Accessibility', () => {
  it('should have proper ARIA labels and roles', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 1, name: /security dashboard/i })).toBeInTheDocument();
      
      // Check for proper button labeling
      expect(screen.getByRole('button', { name: /refresh dashboard/i })).toBeInTheDocument();
      
      // Check for proper link labeling
      const viewAllLink = screen.getByRole('link', { name: /view all assets/i });
      expect(viewAllLink).toBeInTheDocument();
      
      // Check for proper table headers
      expect(screen.getByRole('columnheader', { name: /asset name/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /threat level/i })).toBeInTheDocument();
    });
  });

  it('should be keyboard navigable', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
    });

    // Test tab navigation
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    refreshButton.focus();
    expect(refreshButton).toHaveFocus();

    // Test Enter key activation
    fireEvent.keyDown(refreshButton, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(apiClient.getSecurityOverview).toHaveBeenCalled();
    });
  });

  it('should provide screen reader friendly content', async () => {
    render(
      <TestWrapper>
        <SecurityDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for screen reader announcements
      expect(screen.getByText('Security dashboard loaded')).toBeInTheDocument();
      expect(screen.getByLabelText(/current threat level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/compliance score/i)).toBeInTheDocument();
    });
  });
});