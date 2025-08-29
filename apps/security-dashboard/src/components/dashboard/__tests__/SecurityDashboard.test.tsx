import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import SecurityDashboard from '../SecurityDashboard';

// Mock the child components
vi.mock('../MetricCard', () => ({
  default: ({ title, value, change }: any) => (
    <div data-testid="metric-card">
      <div>{title}</div>
      <div>{value}</div>
      <div>{change}</div>
    </div>
  ),
}));

vi.mock('../ThreatActivityChart', () => ({
  default: () => <div data-testid="threat-activity-chart">Threat Activity Chart</div>,
}));

vi.mock('../SystemHealthIndicator', () => ({
  default: ({ status }: any) => (
    <div data-testid="system-health-indicator">{status}</div>
  ),
}));

vi.mock('../RecentActivityFeed', () => ({
  default: () => <div data-testid="recent-activity-feed">Recent Activity Feed</div>,
}));

const mockSecurityData = {
  totalThreats: 1247,
  activeIncidents: 23,
  resolvedToday: 45,
  systemHealth: 'healthy' as const,
  threatTrends: [
    { time: '00:00', count: 12 },
    { time: '06:00', count: 15 },
    { time: '12:00', count: 8 },
    { time: '18:00', count: 22 },
  ],
  recentActivity: [
    {
      id: '1',
      type: 'threat_detected',
      message: 'Malware detected on WORKSTATION-042',
      timestamp: new Date().toISOString(),
      severity: 'high' as const,
    },
    {
      id: '2',
      type: 'incident_resolved',
      message: 'Phishing incident INC-789 resolved',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      severity: 'medium' as const,
    },
  ],
};

describe('SecurityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with all key components', () => {
    render(<SecurityDashboard />);

    expect(screen.getByText('Security Operations Dashboard')).toBeInTheDocument();
    expect(screen.getAllByTestId('metric-card')).toHaveLength(4);
    expect(screen.getByTestId('threat-activity-chart')).toBeInTheDocument();
    expect(screen.getByTestId('system-health-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('recent-activity-feed')).toBeInTheDocument();
  });

  it('displays correct metric values', () => {
    render(<SecurityDashboard />);

    const metricCards = screen.getAllByTestId('metric-card');
    expect(metricCards[0]).toHaveTextContent('Total Threats Detected');
    expect(metricCards[1]).toHaveTextContent('Active Incidents');
    expect(metricCards[2]).toHaveTextContent('Resolved Today');
    expect(metricCards[3]).toHaveTextContent('System Health Score');
  });

  it('handles loading state', () => {
    render(<SecurityDashboard />, {
      reduxState: {
        dashboard: {
          loading: true,
          data: null,
          error: null,
        },
      },
    });

    expect(screen.getByText('Loading security dashboard...')).toBeInTheDocument();
  });

  it('handles error state', () => {
    const errorMessage = 'Failed to load dashboard data';
    render(<SecurityDashboard />, {
      reduxState: {
        dashboard: {
          loading: false,
          data: null,
          error: errorMessage,
        },
      },
    });

    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });

  it('refreshes data when refresh button is clicked', async () => {
    const mockDispatch = vi.fn();
    vi.mock('react-redux', async () => ({
      ...await vi.importActual('react-redux'),
      useDispatch: () => mockDispatch,
    }));

    render(<SecurityDashboard />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.stringContaining('fetchDashboardData') })
      );
    });
  });

  it('displays critical alerts prominently', () => {
    render(<SecurityDashboard />, {
      reduxState: {
        dashboard: {
          loading: false,
          data: {
            ...mockSecurityData,
            criticalAlerts: [
              {
                id: 'alert-1',
                message: 'Critical: Data exfiltration detected',
                severity: 'critical',
                timestamp: new Date().toISOString(),
              },
            ],
          },
          error: null,
        },
      },
    });

    expect(screen.getByText('Critical Alerts')).toBeInTheDocument();
    expect(screen.getByText('Critical: Data exfiltration detected')).toBeInTheDocument();
  });

  it('filters dashboard by time range', async () => {
    render(<SecurityDashboard />);

    const timeRangeSelect = screen.getByRole('combobox', { name: /time range/i });
    fireEvent.change(timeRangeSelect, { target: { value: '7d' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('7d')).toBeInTheDocument();
    });
  });

  it('exports dashboard data', async () => {
    render(<SecurityDashboard />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export Options')).toBeInTheDocument();
    });
  });

  it('toggles full-screen mode', async () => {
    render(<SecurityDashboard />);

    const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i });
    fireEvent.click(fullscreenButton);

    await waitFor(() => {
      expect(document.body).toHaveClass('fullscreen-mode');
    });
  });
});