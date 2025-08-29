import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/providers/ThemeProvider';
import authSlice from '@/store/authStore';
import dashboardSlice from '@/store/dashboardStore';
import notificationSlice from '@/store/notificationStore';

// Mock Redux store for testing
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      dashboard: dashboardSlice,
      notifications: notificationSlice,
    },
    preloadedState: initialState,
  });
};

// Custom render function with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  apolloMocks?: any[];
  reduxState?: any;
}

const customRender = (
  ui: ReactElement,
  {
    initialEntries = ['/'],
    apolloMocks = [],
    reduxState = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const store = createMockStore(reduxState);

  function AllProviders({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MockedProvider mocks={apolloMocks} addTypename={false}>
          <MemoryRouter initialEntries={initialEntries}>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </MemoryRouter>
        </MockedProvider>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: AllProviders, ...renderOptions }),
  };
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Mock data generators
export const mockSecurityEvent = {
  id: 'evt-123',
  timestamp: new Date().toISOString(),
  type: 'MALWARE_DETECTED',
  severity: 'HIGH',
  source: '192.168.1.100',
  destination: '192.168.1.200',
  description: 'Malware detected on endpoint',
  mitre_tactics: ['Initial Access', 'Execution'],
  mitre_techniques: ['T1566.001', 'T1204.002'],
};

export const mockThreatData = {
  id: 'threat-456',
  name: 'Advanced Persistent Threat',
  severity: 'CRITICAL',
  confidence: 0.95,
  first_seen: new Date(Date.now() - 86400000).toISOString(),
  last_seen: new Date().toISOString(),
  indicators: [
    { type: 'IP', value: '192.168.1.100', confidence: 0.9 },
    { type: 'DOMAIN', value: 'malicious.com', confidence: 0.85 },
  ],
  mitre_mapping: {
    tactics: ['Initial Access', 'Persistence'],
    techniques: ['T1566', 'T1547'],
  },
};

export const mockIncident = {
  id: 'inc-789',
  title: 'Security Incident - Malware Detection',
  description: 'Multiple malware detections across network',
  severity: 'HIGH',
  status: 'INVESTIGATING',
  assignee: 'security-team@company.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  events: [mockSecurityEvent],
  assets_affected: ['SERVER-001', 'WORKSTATION-042'],
  tags: ['malware', 'endpoint-security'],
};

export const mockUser = {
  id: 'user-123',
  email: 'test@company.com',
  name: 'Test User',
  role: 'SECURITY_ANALYST',
  permissions: ['READ_INCIDENTS', 'WRITE_INCIDENTS'],
  last_login: new Date().toISOString(),
};

export const mockAuthState = {
  isAuthenticated: true,
  user: mockUser,
  token: 'mock-jwt-token',
  refreshToken: 'mock-refresh-token',
  loading: false,
  error: null,
};

// Wait utilities
export const waitForLoadingToFinish = () => new Promise(resolve => setTimeout(resolve, 100));

// Mock GraphQL responses
export const mockGraphQLResponses = {
  GET_SECURITY_EVENTS: {
    request: {
      query: expect.any(Object),
      variables: {},
    },
    result: {
      data: {
        securityEvents: [mockSecurityEvent],
      },
    },
  },
  GET_THREATS: {
    request: {
      query: expect.any(Object),
      variables: {},
    },
    result: {
      data: {
        threats: [mockThreatData],
      },
    },
  },
  GET_INCIDENTS: {
    request: {
      query: expect.any(Object),
      variables: {},
    },
    result: {
      data: {
        incidents: [mockIncident],
      },
    },
  },
};