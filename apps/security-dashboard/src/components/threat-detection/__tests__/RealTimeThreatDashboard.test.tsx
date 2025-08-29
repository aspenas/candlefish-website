import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import RealTimeThreatDashboard from '../RealTimeThreatDashboard';
import { emitMockEvent } from '@/test/__mocks__/socket.io-client';

// Mock GraphQL queries
const mockThreatsQuery = {
  request: {
    query: expect.any(Object),
    variables: {},
  },
  result: {
    data: {
      threats: [
        {
          id: 'threat-1',
          name: 'Advanced Persistent Threat Campaign',
          severity: 'CRITICAL',
          confidence: 0.95,
          first_seen: '2024-01-15T10:00:00Z',
          last_seen: '2024-01-15T15:30:00Z',
          indicators: [
            { type: 'IP', value: '192.168.1.100', confidence: 0.9 },
            { type: 'DOMAIN', value: 'malicious.com', confidence: 0.85 },
          ],
          mitre_mapping: {
            tactics: ['Initial Access', 'Persistence'],
            techniques: ['T1566', 'T1547'],
          },
        },
        {
          id: 'threat-2',
          name: 'Phishing Campaign Detection',
          severity: 'HIGH',
          confidence: 0.88,
          first_seen: '2024-01-15T12:00:00Z',
          last_seen: '2024-01-15T16:00:00Z',
          indicators: [
            { type: 'EMAIL', value: 'phishing@fake-bank.com', confidence: 0.92 },
            { type: 'URL', value: 'https://fake-bank-login.com', confidence: 0.87 },
          ],
          mitre_mapping: {
            tactics: ['Initial Access'],
            techniques: ['T1566.002'],
          },
        },
      ],
    },
  },
};

const mockThreatSubscription = {
  request: {
    query: expect.any(Object),
  },
  result: {
    data: {
      threatDetected: {
        id: 'threat-3',
        name: 'Ransomware Activity Detected',
        severity: 'CRITICAL',
        confidence: 0.98,
        indicators: [
          { type: 'HASH', value: 'a1b2c3d4e5f6', confidence: 0.95 },
        ],
      },
    },
  },
};

describe('RealTimeThreatDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders threat dashboard with initial data', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Real-Time Threat Detection')).toBeInTheDocument();
    });

    expect(screen.getByText('Advanced Persistent Threat Campaign')).toBeInTheDocument();
    expect(screen.getByText('Phishing Campaign Detection')).toBeInTheDocument();
  });

  it('displays threat severity indicators', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery],
    });

    await waitFor(() => {
      expect(screen.getAllByText('CRITICAL')).toHaveLength(1);
      expect(screen.getAllByText('HIGH')).toHaveLength(1);
    });
  });

  it('filters threats by severity', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Advanced Persistent Threat Campaign')).toBeInTheDocument();
    });

    const severityFilter = screen.getByRole('combobox', { name: /severity/i });
    fireEvent.change(severityFilter, { target: { value: 'CRITICAL' } });

    await waitFor(() => {
      expect(screen.getByText('Advanced Persistent Threat Campaign')).toBeInTheDocument();
      expect(screen.queryByText('Phishing Campaign Detection')).not.toBeInTheDocument();
    });
  });

  it('searches threats by name', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Advanced Persistent Threat Campaign')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('textbox', { name: /search threats/i });
    fireEvent.change(searchInput, { target: { value: 'Phishing' } });

    await waitFor(() => {
      expect(screen.queryByText('Advanced Persistent Threat Campaign')).not.toBeInTheDocument();
      expect(screen.getByText('Phishing Campaign Detection')).toBeInTheDocument();
    });
  });

  it('receives real-time threat updates via WebSocket', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery, mockThreatSubscription],
    });

    await waitFor(() => {
      expect(screen.getByText('Advanced Persistent Threat Campaign')).toBeInTheDocument();
    });

    // Simulate real-time threat detection
    emitMockEvent('threat_detected', {
      id: 'threat-new',
      name: 'Zero-Day Exploit Detected',
      severity: 'CRITICAL',
      confidence: 0.99,
      timestamp: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByText('Zero-Day Exploit Detected')).toBeInTheDocument();
    });
  });

  it('displays threat details in modal', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Advanced Persistent Threat Campaign')).toBeInTheDocument();
    });

    const threatCard = screen.getByText('Advanced Persistent Threat Campaign');
    fireEvent.click(threatCard);

    await waitFor(() => {
      expect(screen.getByText('Threat Details')).toBeInTheDocument();
      expect(screen.getByText('MITRE ATT&CK Mapping')).toBeInTheDocument();
      expect(screen.getByText('Initial Access')).toBeInTheDocument();
      expect(screen.getByText('T1566')).toBeInTheDocument();
    });
  });

  it('handles threat investigation workflow', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Advanced Persistent Threat Campaign')).toBeInTheDocument();
    });

    const investigateButton = screen.getByRole('button', { name: /investigate/i });
    fireEvent.click(investigateButton);

    await waitFor(() => {
      expect(screen.getByText('Investigation Workflow')).toBeInTheDocument();
      expect(screen.getByText('Create Incident')).toBeInTheDocument();
      expect(screen.getByText('Add to Watchlist')).toBeInTheDocument();
    });
  });

  it('exports threat intelligence report', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Advanced Persistent Threat Campaign')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export Threat Intelligence')).toBeInTheDocument();
      expect(screen.getByText('STIX/TAXII Format')).toBeInTheDocument();
      expect(screen.getByText('JSON Format')).toBeInTheDocument();
    });
  });

  it('displays threat timeline visualization', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Threat Timeline')).toBeInTheDocument();
    });

    const timelineButton = screen.getByRole('button', { name: /timeline view/i });
    fireEvent.click(timelineButton);

    await waitFor(() => {
      expect(screen.getByTestId('threat-timeline-chart')).toBeInTheDocument();
    });
  });

  it('manages threat false positives', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Advanced Persistent Threat Campaign')).toBeInTheDocument();
    });

    const falsePositiveButton = screen.getByRole('button', { name: /mark false positive/i });
    fireEvent.click(falsePositiveButton);

    await waitFor(() => {
      expect(screen.getByText('Mark as False Positive')).toBeInTheDocument();
      expect(screen.getByText('Reason for False Positive')).toBeInTheDocument();
    });
  });

  it('handles auto-refresh toggle', async () => {
    render(<RealTimeThreatDashboard />, {
      apolloMocks: [mockThreatsQuery],
    });

    const autoRefreshToggle = screen.getByRole('switch', { name: /auto refresh/i });
    expect(autoRefreshToggle).toBeChecked();

    fireEvent.click(autoRefreshToggle);
    expect(autoRefreshToggle).not.toBeChecked();

    fireEvent.click(autoRefreshToggle);
    expect(autoRefreshToggle).toBeChecked();
  });
});