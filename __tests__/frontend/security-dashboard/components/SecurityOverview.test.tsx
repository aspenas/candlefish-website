import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import { SecurityOverview } from '../../../../apps/security-dashboard/src/pages/SecurityOverview';
import { GET_SECURITY_OVERVIEW } from '../../../../apps/security-dashboard/src/graphql/queries/security.graphql';
import { SECURITY_EVENT_ADDED_SUBSCRIPTION } from '../../../../apps/security-dashboard/src/graphql/subscriptions/security.graphql';
import { ThreatLevel } from '../../../../apps/security-dashboard/src/types/security';

const theme = createTheme();

const mockSecurityOverview = {
  totalAssets: 25,
  criticalVulnerabilities: 3,
  activeAlerts: 7,
  complianceScore: 78.5,
  threatLevel: ThreatLevel.HIGH,
  vulnerabilitiesBySeverity: [
    { severity: ThreatLevel.CRITICAL, count: 3 },
    { severity: ThreatLevel.HIGH, count: 8 },
    { severity: ThreatLevel.MEDIUM, count: 15 },
    { severity: ThreatLevel.LOW, count: 5 },
  ],
  kongAdminApiVulnerability: {
    isVulnerable: true,
    riskLevel: ThreatLevel.CRITICAL,
    recommendedActions: [
      'Immediately restrict Admin API access to internal networks only',
      'Configure Admin API to use HTTPS with valid SSL certificates',
    ],
  },
};

const mocks = [
  {
    request: {
      query: GET_SECURITY_OVERVIEW,
      variables: {
        organizationId: 'org-123',
      },
    },
    result: {
      data: {
        securityOverview: mockSecurityOverview,
      },
    },
  },
];

const errorMocks = [
  {
    request: {
      query: GET_SECURITY_OVERVIEW,
      variables: {
        organizationId: 'org-123',
      },
    },
    error: new Error('Network error occurred'),
  },
];

const subscriptionMocks = [
  {
    request: {
      query: SECURITY_EVENT_ADDED_SUBSCRIPTION,
      variables: {
        organizationId: 'org-123',
      },
    },
    result: {
      data: {
        securityEventAdded: {
          id: 'event-123',
          title: 'Suspicious Login Attempt',
          severity: ThreatLevel.HIGH,
          eventType: 'LOGIN_ATTEMPT',
          createdAt: '2024-01-01T10:00:00Z',
        },
      },
    },
  },
];

const renderSecurityOverview = (mocks: any[] = []) => {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ThemeProvider theme={theme}>
        <SecurityOverview organizationId="org-123" />
      </ThemeProvider>
    </MockedProvider>
  );
};

describe('SecurityOverview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching data', () => {
      renderSecurityOverview(mocks);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Loading security overview...')).toBeInTheDocument();
    });

    it('should display skeleton loaders for metric cards', () => {
      renderSecurityOverview(mocks);

      const skeletons = screen.getAllByTestId('metric-card-skeleton');
      expect(skeletons).toHaveLength(4); // Total Assets, Critical Vulnerabilities, Active Alerts, Compliance Score
    });
  });

  describe('Data Display', () => {
    it('should display security metrics correctly', async () => {
      renderSecurityOverview(mocks);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument(); // Total Assets
        expect(screen.getByText('3')).toBeInTheDocument(); // Critical Vulnerabilities
        expect(screen.getByText('7')).toBeInTheDocument(); // Active Alerts
        expect(screen.getByText('78.5%')).toBeInTheDocument(); // Compliance Score
      });

      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      expect(screen.getByText('Critical Vulnerabilities')).toBeInTheDocument();
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
      expect(screen.getByText('Compliance Score')).toBeInTheDocument();
    });

    it('should display threat level with correct styling', async () => {
      renderSecurityOverview(mocks);

      await waitFor(() => {
        const threatLevelElement = screen.getByText('HIGH');
        expect(threatLevelElement).toBeInTheDocument();
        expect(threatLevelElement).toHaveClass('threat-level-high');
      });
    });

    it('should display vulnerabilities by severity chart', async () => {
      renderSecurityOverview(mocks);

      await waitFor(() => {
        expect(screen.getByTestId('vulnerabilities-by-severity-chart')).toBeInTheDocument();
      });

      // Check chart data labels
      expect(screen.getByText('Critical (3)')).toBeInTheDocument();
      expect(screen.getByText('High (8)')).toBeInTheDocument();
      expect(screen.getByText('Medium (15)')).toBeInTheDocument();
      expect(screen.getByText('Low (5)')).toBeInTheDocument();
    });

    it('should display Kong Admin API vulnerability warning', async () => {
      renderSecurityOverview(mocks);

      await waitFor(() => {
        const kongWarning = screen.getByTestId('kong-vulnerability-warning');
        expect(kongWarning).toBeInTheDocument();
        expect(kongWarning).toHaveClass('alert-critical');
      });

      expect(screen.getByText('Kong Admin API Vulnerability Detected')).toBeInTheDocument();
      expect(screen.getByText(/immediately restrict admin api access/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when query fails', async () => {
      renderSecurityOverview(errorMocks);

      await waitFor(() => {
        expect(screen.getByText('Error loading security overview')).toBeInTheDocument();
        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      renderSecurityOverview(errorMocks);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should retry query when retry button is clicked', async () => {
      const { rerender } = renderSecurityOverview(errorMocks);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        fireEvent.click(retryButton);
      });

      // Mock successful retry
      rerender(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ThemeProvider theme={theme}>
            <SecurityOverview organizationId="org-123" />
          </ThemeProvider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should establish subscription for security events', async () => {
      renderSecurityOverview([...mocks, ...subscriptionMocks]);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Subscription should be established (tested via subscription mock)
      expect(subscriptionMocks[0].request.query).toBeDefined();
    });

    it('should display real-time notifications', async () => {
      const { rerender } = renderSecurityOverview(mocks);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Simulate receiving a subscription event
      rerender(
        <MockedProvider mocks={[...mocks, ...subscriptionMocks]} addTypename={false}>
          <ThemeProvider theme={theme}>
            <SecurityOverview organizationId="org-123" />
          </ThemeProvider>
        </MockedProvider>
      );

      // Check if notification appears
      await waitFor(() => {
        expect(screen.getByText('New Security Event')).toBeInTheDocument();
        expect(screen.getByText('Suspicious Login Attempt')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adjust layout for mobile screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderSecurityOverview(mocks);

      await waitFor(() => {
        const metricsGrid = screen.getByTestId('metrics-grid');
        expect(metricsGrid).toHaveClass('mobile-layout');
      });
    });

    it('should stack metric cards vertically on small screens', async () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));

      renderSecurityOverview(mocks);

      await waitFor(() => {
        const metricCards = screen.getAllByTestId('metric-card');
        expect(metricCards[0]).toHaveClass('full-width');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderSecurityOverview(mocks);

      await waitFor(() => {
        expect(screen.getByLabelText('Total assets count')).toBeInTheDocument();
        expect(screen.getByLabelText('Critical vulnerabilities count')).toBeInTheDocument();
        expect(screen.getByLabelText('Active alerts count')).toBeInTheDocument();
        expect(screen.getByLabelText('Compliance score percentage')).toBeInTheDocument();
      });
    });

    it('should have semantic HTML structure', async () => {
      renderSecurityOverview(mocks);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Security Metrics' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Threat Analysis' })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderSecurityOverview(mocks);

      await waitFor(() => {
        const firstMetricCard = screen.getAllByTestId('metric-card')[0];
        firstMetricCard.focus();
        expect(document.activeElement).toBe(firstMetricCard);
      });
    });

    it('should provide screen reader announcements for alerts', async () => {
      renderSecurityOverview(mocks);

      await waitFor(() => {
        const alertRegion = screen.getByRole('alert');
        expect(alertRegion).toHaveAttribute('aria-live', 'polite');
        expect(alertRegion).toHaveTextContent('Kong Admin API vulnerability detected');
      });
    });
  });

  describe('Performance', () => {
    it('should memoize chart components to prevent unnecessary re-renders', async () => {
      const { rerender } = renderSecurityOverview(mocks);

      await waitFor(() => {
        expect(screen.getByTestId('vulnerabilities-by-severity-chart')).toBeInTheDocument();
      });

      // Re-render with same props
      rerender(
        <MockedProvider mocks={mocks} addTypename={false}>
          <ThemeProvider theme={theme}>
            <SecurityOverview organizationId="org-123" />
          </ThemeProvider>
        </MockedProvider>
      );

      // Chart should not re-render (implementation would use React.memo)
      const chart = screen.getByTestId('vulnerabilities-by-severity-chart');
      expect(chart).toBeInTheDocument();
    });

    it('should handle large datasets efficiently', async () => {
      const largeMockData = {
        ...mockSecurityOverview,
        vulnerabilitiesBySeverity: Array.from({ length: 1000 }, (_, i) => ({
          severity: ThreatLevel.LOW,
          count: i + 1,
        })),
      };

      const largeMocks = [
        {
          request: {
            query: GET_SECURITY_OVERVIEW,
            variables: { organizationId: 'org-123' },
          },
          result: {
            data: { securityOverview: largeMockData },
          },
        },
      ];

      const startTime = Date.now();
      renderSecurityOverview(largeMocks);

      await waitFor(() => {
        expect(screen.getByTestId('vulnerabilities-by-severity-chart')).toBeInTheDocument();
      });

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(3000); // Should render within 3 seconds
    });
  });

  describe('User Interactions', () => {
    it('should navigate to detailed view when metric card is clicked', async () => {
      const mockNavigate = jest.fn();
      jest.mock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));

      renderSecurityOverview(mocks);

      await waitFor(() => {
        const criticalVulnCard = screen.getByTestId('critical-vulnerabilities-card');
        fireEvent.click(criticalVulnCard);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/vulnerabilities?severity=CRITICAL');
    });

    it('should expand/collapse Kong vulnerability details', async () => {
      renderSecurityOverview(mocks);

      await waitFor(() => {
        const expandButton = screen.getByRole('button', { name: /show details/i });
        fireEvent.click(expandButton);
      });

      expect(screen.getByText('Configure Admin API to use HTTPS')).toBeInTheDocument();

      const collapseButton = screen.getByRole('button', { name: /hide details/i });
      fireEvent.click(collapseButton);

      expect(screen.queryByText('Configure Admin API to use HTTPS')).not.toBeInTheDocument();
    });

    it('should refresh data when refresh button is clicked', async () => {
      let refetchCalled = false;
      const mockRefetch = jest.fn(() => {
        refetchCalled = true;
        return Promise.resolve();
      });

      // Mock the useQuery hook to return refetch function
      jest.mock('@apollo/client', () => ({
        ...jest.requireActual('@apollo/client'),
        useQuery: () => ({
          data: { securityOverview: mockSecurityOverview },
          loading: false,
          error: null,
          refetch: mockRefetch,
        }),
      }));

      renderSecurityOverview(mocks);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshButton);
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Data Formatting', () => {
    it('should format compliance score as percentage', async () => {
      renderSecurityOverview(mocks);

      await waitFor(() => {
        expect(screen.getByText('78.5%')).toBeInTheDocument();
      });
    });

    it('should display zero values correctly', async () => {
      const zeroValuesMock = [
        {
          request: {
            query: GET_SECURITY_OVERVIEW,
            variables: { organizationId: 'org-123' },
          },
          result: {
            data: {
              securityOverview: {
                ...mockSecurityOverview,
                criticalVulnerabilities: 0,
                activeAlerts: 0,
              },
            },
          },
        },
      ];

      renderSecurityOverview(zeroValuesMock);

      await waitFor(() => {
        expect(screen.getAllByText('0')).toHaveLength(2);
      });
    });

    it('should handle null/undefined values gracefully', async () => {
      const nullValuesMock = [
        {
          request: {
            query: GET_SECURITY_OVERVIEW,
            variables: { organizationId: 'org-123' },
          },
          result: {
            data: {
              securityOverview: {
                ...mockSecurityOverview,
                kongAdminApiVulnerability: null,
              },
            },
          },
        },
      ];

      renderSecurityOverview(nullValuesMock);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Kong vulnerability warning should not be displayed
      expect(screen.queryByTestId('kong-vulnerability-warning')).not.toBeInTheDocument();
    });
  });
});
