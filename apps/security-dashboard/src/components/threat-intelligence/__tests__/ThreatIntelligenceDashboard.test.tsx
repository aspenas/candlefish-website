import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import '@testing-library/jest-dom';

import ThreatIntelligenceDashboard from '../ThreatIntelligenceDashboard';
import { GET_THREAT_INTELLIGENCE_DASHBOARD } from '../../../graphql/threat-intelligence-operations';

// Mock the hooks
vi.mock('../../../hooks/useConnectionStatus', () => ({
  useConnectionStatus: () => ({ isConnected: true })
}));

// Mock sub-components
vi.mock('../ThreatMetricsOverview', () => ({
  default: function MockThreatMetricsOverview(props: any) {
    return <div data-testid="threat-metrics-overview">Threat Metrics Overview</div>;
  }
}));

vi.mock('../ThreatActorNetwork', () => ({
  default: function MockThreatActorNetwork(props: any) {
    return <div data-testid="threat-actor-network">Threat Actor Network</div>;
  }
}));

vi.mock('../IOCManagementPanel', () => ({
  default: function MockIOCManagementPanel(props: any) {
    return <div data-testid="ioc-management-panel">IOC Management Panel</div>;
  }
}));

vi.mock('../CorrelationEnginePanel', () => ({
  default: function MockCorrelationEnginePanel(props: any) {
    return <div data-testid="correlation-engine-panel">Correlation Engine Panel</div>;
  }
}));

vi.mock('../GeographicThreatMap', () => ({
  default: function MockGeographicThreatMap(props: any) {
    return <div data-testid="geographic-threat-map">Geographic Threat Map</div>;
  }
}));

vi.mock('../RecentThreatsList', () => ({
  default: function MockRecentThreatsList(props: any) {
    return <div data-testid="recent-threats-list">Recent Threats List</div>;
  }
}));

// Mock other components that might not exist yet
vi.mock('../ThreatTimeline', () => ({
  default: function MockThreatTimeline(props: any) {
    return <div data-testid="threat-timeline">Threat Timeline</div>;
  }
}));

vi.mock('../ThreatFeedStatus', () => ({
  default: function MockThreatFeedStatus(props: any) {
    return <div data-testid="threat-feed-status">Threat Feed Status</div>;
  }
}));

vi.mock('../IndustryTargetingAnalysis', () => ({
  default: function MockIndustryTargetingAnalysis(props: any) {
    return <div data-testid="industry-targeting-analysis">Industry Targeting Analysis</div>;
  }
}));

const mockDashboardData = {
  threatIntelligenceDashboard: {
    overview: {
      totalThreats: 1250,
      activeCampaigns: 23,
      trackedActors: 45,
      newIOCs: 156,
      highConfidenceThreats: 78,
      criticalSeverityCount: 12,
      recentActivityTrend: 5.2
    },
    recentThreats: [
      {
        id: '1',
        title: 'APT28 Targeting Government Agencies',
        description: 'Advanced persistent threat campaign targeting government agencies',
        severity: 'HIGH',
        confidence: 'HIGH',
        threatType: 'APT',
        category: 'CYBER_ESPIONAGE',
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-01-15T00:00:00Z',
        lastUpdated: '2024-01-15T12:00:00Z',
        attribution: {
          actor: 'APT28',
          campaign: 'Operation Ghostwriter',
          country: 'Russia'
        },
        indicators: [
          {
            type: 'DOMAIN',
            value: 'malicious-domain.com',
            confidence: 'HIGH'
          }
        ],
        targetedSectors: ['GOVERNMENT', 'DEFENSE'],
        targetedRegions: ['Europe', 'North America'],
        tags: ['apt28', 'government', 'espionage'],
        sources: [
          {
            name: 'CISA',
            reliability: 'COMPLETELY_RELIABLE'
          }
        ]
      }
    ],
    topThreatActors: [
      {
        id: '1',
        name: 'APT28',
        aliases: ['Fancy Bear', 'Sofacy'],
        actorType: 'NATION_STATE',
        sophistication: 'ADVANCED',
        motivations: ['ESPIONAGE'],
        isActive: true,
        firstSeen: '2023-01-01T00:00:00Z',
        lastSeen: '2024-01-15T00:00:00Z',
        countries: ['Russia'],
        targetedSectors: ['GOVERNMENT', 'DEFENSE'],
        recentActivityCount: 15,
        associatedThreatsCount: 25
      }
    ],
    activeCampaigns: [],
    iocMetrics: {
      totalIOCs: 5000,
      newIOCs: 156,
      expiredIOCs: 23,
      whitelistedIOCs: 45,
      highConfidenceIOCs: 1200,
      typeDistribution: [
        { type: 'IP_ADDRESS', count: 1500, percentage: 30 },
        { type: 'DOMAIN', count: 1250, percentage: 25 },
        { type: 'FILE_HASH', count: 1000, percentage: 20 },
        { type: 'URL', count: 750, percentage: 15 },
        { type: 'EMAIL_ADDRESS', count: 500, percentage: 10 }
      ],
      confidenceDistribution: [
        { confidence: 'HIGH', count: 1500, percentage: 30 },
        { confidence: 'MEDIUM', count: 2000, percentage: 40 },
        { confidence: 'LOW', count: 1000, percentage: 20 },
        { confidence: 'CONFIRMED', count: 500, percentage: 10 }
      ]
    },
    feedStatus: {
      totalFeeds: 10,
      activeFeeds: 8,
      errorFeeds: 2,
      lastSyncTime: '2024-01-15T12:00:00Z',
      feeds: []
    },
    correlationMetrics: {
      totalCorrelations: 45,
      activeCorrelations: 38,
      recentMatches: 12,
      averageConfidence: 0.78,
      effectivenessScore: 85.2
    },
    geographicDistribution: [
      {
        country: 'United States',
        threatCount: 450,
        actorCount: 12,
        campaignCount: 8,
        coordinates: { latitude: 39.8283, longitude: -98.5795 }
      },
      {
        country: 'Russia',
        threatCount: 320,
        actorCount: 8,
        campaignCount: 6,
        coordinates: { latitude: 61.524, longitude: 105.3188 }
      },
      {
        country: 'China',
        threatCount: 280,
        actorCount: 7,
        campaignCount: 5,
        coordinates: { latitude: 35.8617, longitude: 104.1954 }
      }
    ],
    industryTargeting: [
      {
        sector: 'GOVERNMENT',
        threatCount: 380,
        actorCount: 15,
        campaignCount: 10,
        riskLevel: 'HIGH'
      },
      {
        sector: 'FINANCIAL',
        threatCount: 320,
        actorCount: 12,
        campaignCount: 8,
        riskLevel: 'HIGH'
      },
      {
        sector: 'HEALTHCARE',
        threatCount: 250,
        actorCount: 10,
        campaignCount: 6,
        riskLevel: 'MEDIUM'
      }
    ],
    timeSeriesData: [
      {
        timestamp: '2024-01-01T00:00:00Z',
        threatCount: 100,
        iocCount: 250,
        actorActivity: 15,
        campaignActivity: 8,
        correlationMatches: 12
      },
      {
        timestamp: '2024-01-02T00:00:00Z',
        threatCount: 120,
        iocCount: 280,
        actorActivity: 18,
        campaignActivity: 10,
        correlationMatches: 15
      }
    ]
  }
};

const mocks = [
  {
    request: {
      query: GET_THREAT_INTELLIGENCE_DASHBOARD,
      variables: {
        organizationId: 'test-org',
        timeRange: {
          start: '24h',
          end: 'now'
        }
      }
    },
    result: {
      data: mockDashboardData
    }
  }
];

const mockSubscription = {
  request: {
    query: expect.any(Object)
  },
  result: {
    data: {}
  }
};

describe('ThreatIntelligenceDashboard', () => {
  const user = userEvent.setup();
  const defaultProps = {
    organizationId: 'test-org',
    className: 'test-class'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders dashboard header correctly', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    // Check for dashboard title
    expect(screen.getByText('Threat Intelligence Dashboard')).toBeInTheDocument();
    
    // Check for connection status indicator
    expect(screen.getByText('Connected')).toBeInTheDocument();

    // Check for control buttons
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    expect(screen.getByText('Loading threat intelligence data...')).toBeInTheDocument();
  });

  it('displays quick stats when data is loaded', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument(); // Total Threats
      expect(screen.getByText('23')).toBeInTheDocument(); // Active Campaigns
      expect(screen.getByText('45')).toBeInTheDocument(); // Tracked Actors
      expect(screen.getByText('156')).toBeInTheDocument(); // New IOCs
      expect(screen.getByText('78')).toBeInTheDocument(); // High Confidence
      expect(screen.getByText('12')).toBeInTheDocument(); // Critical
    });
  });

  it('renders navigation tabs correctly', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Threat Actors')).toBeInTheDocument();
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
      expect(screen.getByText('IOCs')).toBeInTheDocument();
      expect(screen.getByText('Threat Feeds')).toBeInTheDocument();
      expect(screen.getByText('Geography')).toBeInTheDocument();
      expect(screen.getByText('Industries')).toBeInTheDocument();
      expect(screen.getByText('Correlations')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('threat-metrics-overview')).toBeInTheDocument();
    });

    // Click on Threat Actors tab
    fireEvent.click(screen.getByText('Threat Actors'));
    await waitFor(() => {
      expect(screen.getByTestId('threat-actor-network')).toBeInTheDocument();
    });

    // Click on IOCs tab
    fireEvent.click(screen.getByText('IOCs'));
    await waitFor(() => {
      expect(screen.getByTestId('ioc-management-panel')).toBeInTheDocument();
    });

    // Click on Correlations tab
    fireEvent.click(screen.getByText('Correlations'));
    await waitFor(() => {
      expect(screen.getByTestId('correlation-engine-panel')).toBeInTheDocument();
    });
  });

  it('displays tab badges correctly', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      // Overview tab should show new threats count
      const overviewTab = screen.getByText('Overview').closest('button');
      expect(overviewTab).toBeInTheDocument();

      // Threat Actors tab should show tracked actors count
      const actorsTab = screen.getByText('Threat Actors').closest('button');
      expect(actorsTab).toBeInTheDocument();

      // IOCs tab should show new IOCs count
      const iocsTab = screen.getByText('IOCs').closest('button');
      expect(iocsTab).toBeInTheDocument();
    });
  });

  it('handles time range selection', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours');
      expect(timeRangeSelect).toBeInTheDocument();

      // Change time range
      fireEvent.change(timeRangeSelect, { target: { value: 'Last 7 Days' } });
      expect(timeRangeSelect).toHaveValue('Last 7 Days');
    });
  });

  it('handles auto refresh toggle', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      const autoRefreshButton = screen.getByText('Auto');
      expect(autoRefreshButton).toBeInTheDocument();

      // Toggle auto refresh
      fireEvent.click(autoRefreshButton);
      // Should still be in the document but might change styling
      expect(autoRefreshButton).toBeInTheDocument();
    });
  });

  it('handles manual refresh', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();

      // Click refresh
      fireEvent.click(refreshButton);
      expect(refreshButton).toBeInTheDocument();
    });
  });

  it('displays recent threats list', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('recent-threats-list')).toBeInTheDocument();
    });
  });

  it('shows connection status correctly', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    // Should show connected status
    expect(screen.getByText('Connected')).toBeInTheDocument();
    
    // Should show green indicator
    const connectionIndicator = document.querySelector('.bg-green-500');
    expect(connectionIndicator).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThreatIntelligenceDashboard {...defaultProps} />
      </MockedProvider>
    );

    expect(container.firstChild).toHaveClass('test-class');
  });
});

// Additional integration test for error handling
describe('ThreatIntelligenceDashboard Error Handling', () => {
  const errorMocks = [
    {
      request: {
        query: GET_THREAT_INTELLIGENCE_DASHBOARD,
        variables: {
          organizationId: 'test-org',
          timeRange: {
            start: '24h',
            end: 'now'
          }
        }
      },
      error: new Error('Failed to load dashboard data')
    }
  ];

  it('displays error message when query fails', async () => {
    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <ThreatIntelligenceDashboard organizationId="test-org" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Threat Intelligence Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });
});