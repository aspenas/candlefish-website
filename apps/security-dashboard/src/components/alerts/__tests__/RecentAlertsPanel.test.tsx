import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import RecentAlertsPanel from '../RecentAlertsPanel';
import { mockAlertData, createMockAlerts } from '@/test/factories/ThreatFactory';

// Mock the child components
vi.mock('@/components/ui/Badge', () => ({
  default: ({ children, variant }: any) => (
    <span data-testid="badge" className={variant}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, variant }: any) => (
    <button data-testid="button" onClick={onClick} className={variant}>
      {children}
    </button>
  ),
}));

describe('RecentAlertsPanel', () => {
  const mockAlerts = createMockAlerts(5);
  const mockProps = {
    alerts: mockAlerts,
    isLoading: false,
    onAlertClick: vi.fn(),
    onAcknowledge: vi.fn(),
    onDismiss: vi.fn(),
    maxAlerts: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    render(<RecentAlertsPanel {...mockProps} isLoading={true} />);
    
    expect(screen.getByText('Loading alerts...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders alerts list when data is loaded', () => {
    render(<RecentAlertsPanel {...mockProps} />);

    expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    expect(screen.getAllByTestId('alert-item')).toHaveLength(5);
    
    // Check first alert is rendered
    expect(screen.getByText(mockAlerts[0].title)).toBeInTheDocument();
    expect(screen.getByText(mockAlerts[0].description)).toBeInTheDocument();
  });

  it('displays empty state when no alerts', () => {
    render(<RecentAlertsPanel {...mockProps} alerts={[]} />);

    expect(screen.getByText('No recent alerts')).toBeInTheDocument();
    expect(screen.getByText('All systems are running normally')).toBeInTheDocument();
  });

  it('calls onAlertClick when alert is clicked', async () => {
    render(<RecentAlertsPanel {...mockProps} />);

    const firstAlert = screen.getAllByTestId('alert-item')[0];
    fireEvent.click(firstAlert);

    await waitFor(() => {
      expect(mockProps.onAlertClick).toHaveBeenCalledWith(mockAlerts[0]);
    });
  });

  it('calls onAcknowledge when acknowledge button is clicked', async () => {
    render(<RecentAlertsPanel {...mockProps} />);

    const acknowledgeButtons = screen.getAllByText('Acknowledge');
    fireEvent.click(acknowledgeButtons[0]);

    await waitFor(() => {
      expect(mockProps.onAcknowledge).toHaveBeenCalledWith(mockAlerts[0].id);
    });
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    render(<RecentAlertsPanel {...mockProps} />);

    const dismissButtons = screen.getAllByText('Dismiss');
    fireEvent.click(dismissButtons[0]);

    await waitFor(() => {
      expect(mockProps.onDismiss).toHaveBeenCalledWith(mockAlerts[0].id);
    });
  });

  it('displays correct severity badges', () => {
    const criticalAlert = mockAlertData({ severity: 'CRITICAL' });
    const highAlert = mockAlertData({ severity: 'HIGH' });
    const alerts = [criticalAlert, highAlert];

    render(<RecentAlertsPanel {...mockProps} alerts={alerts} />);

    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveClass('critical');
    expect(badges[1]).toHaveClass('high');
  });

  it('filters alerts by severity', async () => {
    const criticalAlert = mockAlertData({ severity: 'CRITICAL' });
    const mediumAlert = mockAlertData({ severity: 'MEDIUM' });
    const alerts = [criticalAlert, mediumAlert];

    render(<RecentAlertsPanel {...mockProps} alerts={alerts} />);

    // Click severity filter
    const severityFilter = screen.getByLabelText('Filter by severity');
    fireEvent.change(severityFilter, { target: { value: 'CRITICAL' } });

    await waitFor(() => {
      expect(screen.getAllByTestId('alert-item')).toHaveLength(1);
      expect(screen.getByText(criticalAlert.title)).toBeInTheDocument();
      expect(screen.queryByText(mediumAlert.title)).not.toBeInTheDocument();
    });
  });

  it('filters alerts by status', async () => {
    const openAlert = mockAlertData({ status: 'OPEN' });
    const resolvedAlert = mockAlertData({ status: 'RESOLVED' });
    const alerts = [openAlert, resolvedAlert];

    render(<RecentAlertsPanel {...mockProps} alerts={alerts} />);

    const statusFilter = screen.getByLabelText('Filter by status');
    fireEvent.change(statusFilter, { target: { value: 'OPEN' } });

    await waitFor(() => {
      expect(screen.getAllByTestId('alert-item')).toHaveLength(1);
      expect(screen.getByText(openAlert.title)).toBeInTheDocument();
      expect(screen.queryByText(resolvedAlert.title)).not.toBeInTheDocument();
    });
  });

  it('sorts alerts by date', async () => {
    const olderAlert = mockAlertData({ 
      triggered_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    });
    const newerAlert = mockAlertData({ 
      triggered_at: new Date().toISOString() 
    });
    const alerts = [olderAlert, newerAlert];

    render(<RecentAlertsPanel {...mockProps} alerts={alerts} />);

    const sortButton = screen.getByText('Sort by Date');
    fireEvent.click(sortButton);

    await waitFor(() => {
      const alertItems = screen.getAllByTestId('alert-item');
      // Newer alert should be first
      expect(alertItems[0]).toHaveTextContent(newerAlert.title);
      expect(alertItems[1]).toHaveTextContent(olderAlert.title);
    });
  });

  it('limits alerts to maxAlerts prop', () => {
    const manyAlerts = createMockAlerts(15);
    render(<RecentAlertsPanel {...mockProps} alerts={manyAlerts} maxAlerts={5} />);

    expect(screen.getAllByTestId('alert-item')).toHaveLength(5);
    expect(screen.getByText('Showing 5 of 15 alerts')).toBeInTheDocument();
  });

  it('handles refresh action', async () => {
    const onRefresh = vi.fn();
    render(<RecentAlertsPanel {...mockProps} onRefresh={onRefresh} />);

    const refreshButton = screen.getByLabelText('Refresh alerts');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('displays alert timestamps correctly', () => {
    const testDate = new Date('2024-01-15T10:30:00Z');
    const alert = mockAlertData({ 
      triggered_at: testDate.toISOString() 
    });

    render(<RecentAlertsPanel {...mockProps} alerts={[alert]} />);

    // Should display relative time
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    render(<RecentAlertsPanel {...mockProps} />);

    const firstAlert = screen.getAllByTestId('alert-item')[0];
    firstAlert.focus();

    // Press Enter to select alert
    fireEvent.keyDown(firstAlert, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockProps.onAlertClick).toHaveBeenCalledWith(mockAlerts[0]);
    });
  });

  it('displays alert source and type information', () => {
    const alert = mockAlertData({ 
      source: 'SIEM',
      type: 'MALWARE'
    });

    render(<RecentAlertsPanel {...mockProps} alerts={[alert]} />);

    expect(screen.getByText('SIEM')).toBeInTheDocument();
    expect(screen.getByText('MALWARE')).toBeInTheDocument();
  });

  it('handles bulk actions', async () => {
    render(<RecentAlertsPanel {...mockProps} />);

    // Select multiple alerts
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    // Perform bulk acknowledge
    const bulkAcknowledgeButton = screen.getByText('Acknowledge Selected');
    fireEvent.click(bulkAcknowledgeButton);

    await waitFor(() => {
      expect(mockProps.onAcknowledge).toHaveBeenCalledTimes(2);
    });
  });
});