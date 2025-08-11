// Frontend Integration Examples for Tyler Setup Platform
// React/Apollo Client integration patterns and best practices

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  from,
  ApolloProvider
} from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { gql, useQuery, useMutation, useSubscription } from '@apollo/client';

/**
 * Apollo Client Configuration for Tyler Setup Platform
 */

// HTTP Link for queries and mutations
const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_HTTP_URL || 'http://localhost:4000/graphql',
  credentials: 'include',
});

// WebSocket Link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: process.env.REACT_APP_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql',
    connectionParams: () => {
      const token = localStorage.getItem('authToken');
      return token ? { authorization: `Bearer ${token}` } : {};
    },
    shouldRetry: () => true,
  })
);

// Authentication Link
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error Link for global error handling
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `GraphQL Error: ${message}`,
        { locations, path, extensions }
      );

      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }

      // Handle rate limiting
      if (extensions?.code === 'RATE_LIMITED') {
        console.warn('Rate limited:', extensions);
        // Show user-friendly message
      }
    });
  }

  if (networkError) {
    console.error(`Network Error: ${networkError.message}`);

    // Handle offline scenarios
    if (!navigator.onLine) {
      // Show offline indicator
      console.warn('Application is offline');
    }
  }
});

// Retry Link for network resilience
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => !!error,
  },
});

// Split link to route queries/mutations to HTTP and subscriptions to WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([authLink, errorLink, retryLink, httpLink])
);

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      User: {
        fields: {
          stats: {
            merge: true,
          },
          preferences: {
            merge: true,
          },
        },
      },
      Secret: {
        fields: {
          stats: {
            merge: true,
          },
          accessControlList: {
            merge: false,
          },
        },
      },
      Query: {
        fields: {
          users: {
            keyArgs: ['filter', 'sort'],
            merge(existing, incoming, { args }) {
              const offset = args?.pagination?.offset || 0;
              const merged = existing ? existing.slice() : [];

              for (let i = 0; i < incoming.users.length; i++) {
                merged[offset + i] = incoming.users[i];
              }

              return {
                ...incoming,
                users: merged,
              };
            },
          },
          contractors: {
            keyArgs: ['status', 'filter'],
            merge(existing, incoming, { args }) {
              const offset = args?.pagination?.offset || 0;
              const merged = existing ? existing.slice() : [];

              for (let i = 0; i < incoming.contractors.length; i++) {
                merged[offset + i] = incoming.contractors[i];
              }

              return {
                ...incoming,
                contractors: merged,
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

/**
 * GraphQL Operations
 */

// Authentication Operations
export const LOGIN_MUTATION = gql`
  mutation LoginUser($email: String!, $password: String!, $rememberMe: Boolean) {
    login(input: { email: $email, password: $password, rememberMe: $rememberMe }) {
      success
      token
      refreshToken
      expiresIn
      user {
        id
        email
        name
        role
        lastLogin
      }
      message
    }
  }
`;

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      name
      role
      status
      lastLogin
      createdAt
      profile {
        displayName
        avatar
        preferences
        timezone
      }
      preferences {
        theme
        language
        emailNotifications
        dashboardLayout
      }
      stats {
        totalLogins
        activityScore
        loginHistory {
          timestamp
          ip
          success
        }
      }
    }
  }
`;

// Dashboard Operations
export const GET_DASHBOARD_ANALYTICS = gql`
  query GetDashboardAnalytics($dateFrom: Date, $dateTo: Date) {
    dashboardAnalytics(dateFrom: $dateFrom, dateTo: $dateTo) {
      totalUsers
      activeUsers
      totalContractors
      activeContractors
      totalSecrets
      secretsNeedingRotation
      recentAuditEvents

      userGrowth {
        period
        count
        change
      }

      contractorUsage {
        period
        count
        duration
      }

      secretAccess {
        period
        reads
        writes
        errors
      }

      securityAlerts {
        id
        type
        severity
        message
        timestamp
        resolved
      }
    }

    health {
      status
      uptime
      services {
        name
        status
        responseTime
      }
    }
  }
`;

// Users Operations
export const GET_USERS_LIST = gql`
  query GetUsersList($limit: Int, $offset: Int, $filter: String) {
    users(
      pagination: { limit: $limit, offset: $offset }
      filter: $filter
      sort: { field: "createdAt", direction: DESC }
    ) {
      users {
        id
        email
        name
        role
        status
        lastLogin
        createdAt
        profileCompleteness
        stats {
          totalLogins
          activityScore
        }
      }
      pagination {
        hasNextPage
        totalCount
      }
    }
  }
`;

export const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      name
      role
      createdAt
    }
  }
`;

// Contractors Operations
export const GET_CONTRACTORS_LIST = gql`
  query GetContractorsList($status: ContractorStatus, $limit: Int, $offset: Int) {
    contractors(
      status: $status
      pagination: { limit: $limit, offset: $offset }
    ) {
      contractors {
        id
        email
        name
        company
        status
        expiresAt
        accessCount
        remainingDays
        isExpired
        invitedBy {
          name
          email
        }
        stats {
          totalAccesses
          averageSessionDuration
          accessPattern
        }
      }
      pagination {
        hasNextPage
        totalCount
      }
    }
  }
`;

export const INVITE_CONTRACTOR_MUTATION = gql`
  mutation InviteContractor($input: InviteContractorInput!) {
    inviteContractor(input: $input) {
      id
      email
      name
      company
      status
      expiresAt
      accessUrl
      message
    }
  }
`;

// Secrets Operations
export const GET_SECRETS_LIST = gql`
  query GetSecretsList($type: SecretType, $limit: Int, $offset: Int) {
    secrets(
      type: $type
      pagination: { limit: $limit, offset: $offset }
      sort: { field: "lastRotated", direction: ASC }
    ) {
      secrets {
        name
        description
        type
        createdAt
        lastRotated
        nextRotation
        complianceStatus
        stats {
          accessCount
          daysSinceRotation
          riskScore
        }
        hasActiveShares
        daysSinceLastAccess
      }
      pagination {
        hasNextPage
        totalCount
      }
    }
  }
`;

// Subscriptions for real-time updates
export const AUDIT_EVENTS_SUBSCRIPTION = gql`
  subscription WatchAuditEvents {
    auditEvents {
      id
      action
      timestamp
      user {
        name
        email
      }
      resource
      success
      ip
      riskLevel
    }
  }
`;

export const SECURITY_ALERTS_SUBSCRIPTION = gql`
  subscription WatchSecurityAlerts {
    securityAlert {
      id
      type
      severity
      message
      timestamp
      resolved
    }
  }
`;

/**
 * React Hooks for GraphQL Operations
 */

// Authentication Hook
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { data, loading: queryLoading, refetch } = useQuery(GET_CURRENT_USER, {
    errorPolicy: 'ignore',
    onCompleted: (data) => {
      setUser(data?.me);
      setLoading(false);
    },
    onError: () => {
      setUser(null);
      setLoading(false);
    }
  });

  const [loginMutation] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      if (data.login.success) {
        localStorage.setItem('authToken', data.login.token);
        localStorage.setItem('refreshToken', data.login.refreshToken);
        setUser(data.login.user);
        refetch();
      }
    },
  });

  const login = async (email, password, rememberMe = false) => {
    try {
      const result = await loginMutation({
        variables: { email, password, rememberMe },
      });
      return result.data.login;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    apolloClient.clearStore();
    window.location.href = '/login';
  };

  return {
    user,
    loading: loading || queryLoading,
    login,
    logout,
    refetch,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };
}

// Dashboard Hook
export function useDashboard(dateRange) {
  const { data, loading, error, refetch } = useQuery(GET_DASHBOARD_ANALYTICS, {
    variables: dateRange,
    pollInterval: 30000, // Poll every 30 seconds for fresh data
    errorPolicy: 'all',
  });

  return {
    analytics: data?.dashboardAnalytics,
    health: data?.health,
    loading,
    error,
    refetch,
  };
}

// Users Management Hook
export function useUsers(pagination = {}, filter = '') {
  const { data, loading, error, fetchMore, refetch } = useQuery(GET_USERS_LIST, {
    variables: {
      limit: pagination.limit || 20,
      offset: pagination.offset || 0,
      filter,
    },
    errorPolicy: 'all',
  });

  const [createUser] = useMutation(CREATE_USER_MUTATION, {
    refetchQueries: [{ query: GET_USERS_LIST }],
  });

  const loadMore = () => {
    if (data?.users.pagination.hasNextPage) {
      fetchMore({
        variables: {
          offset: data.users.users.length,
        },
      });
    }
  };

  return {
    users: data?.users.users || [],
    pagination: data?.users.pagination,
    loading,
    error,
    loadMore,
    refetch,
    createUser,
  };
}

// Contractors Management Hook
export function useContractors(status = null, pagination = {}) {
  const { data, loading, error, fetchMore, refetch } = useQuery(GET_CONTRACTORS_LIST, {
    variables: {
      status,
      limit: pagination.limit || 20,
      offset: pagination.offset || 0,
    },
    errorPolicy: 'all',
  });

  const [inviteContractor] = useMutation(INVITE_CONTRACTOR_MUTATION, {
    refetchQueries: [{ query: GET_CONTRACTORS_LIST }],
  });

  return {
    contractors: data?.contractors.contractors || [],
    pagination: data?.contractors.pagination,
    loading,
    error,
    fetchMore,
    refetch,
    inviteContractor,
  };
}

// Secrets Management Hook
export function useSecrets(type = null, pagination = {}) {
  const { data, loading, error, fetchMore, refetch } = useQuery(GET_SECRETS_LIST, {
    variables: {
      type,
      limit: pagination.limit || 20,
      offset: pagination.offset || 0,
    },
    errorPolicy: 'all',
  });

  return {
    secrets: data?.secrets.secrets || [],
    pagination: data?.secrets.pagination,
    loading,
    error,
    fetchMore,
    refetch,
  };
}

// Real-time Updates Hook
export function useRealTimeUpdates() {
  const [auditEvents, setAuditEvents] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);

  // Subscribe to audit events
  useSubscription(AUDIT_EVENTS_SUBSCRIPTION, {
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.auditEvents) {
        setAuditEvents(prev => [subscriptionData.data.auditEvents, ...prev.slice(0, 49)]);
      }
    },
  });

  // Subscribe to security alerts
  useSubscription(SECURITY_ALERTS_SUBSCRIPTION, {
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.securityAlert) {
        setSecurityAlerts(prev => [subscriptionData.data.securityAlert, ...prev]);
      }
    },
  });

  return {
    auditEvents,
    securityAlerts,
    clearAuditEvents: () => setAuditEvents([]),
    clearSecurityAlerts: () => setSecurityAlerts([]),
  };
}

/**
 * React Components Examples
 */

// Authentication Context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

// Dashboard Component
export const Dashboard = () => {
  const [dateRange, setDateRange] = useState({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dateTo: new Date().toISOString(),
  });

  const { analytics, health, loading, error } = useDashboard(dateRange);
  const { auditEvents, securityAlerts } = useRealTimeUpdates();

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error loading dashboard: {error.message}</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Tyler Setup Dashboard</h1>
        <div className="system-status">
          Status: <span className={`status ${health?.status}`}>{health?.status}</span>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Users</h3>
          <span className="metric-value">{analytics?.totalUsers}</span>
        </div>
        <div className="metric-card">
          <h3>Active Contractors</h3>
          <span className="metric-value">{analytics?.activeContractors}</span>
        </div>
        <div className="metric-card">
          <h3>Secrets Needing Rotation</h3>
          <span className="metric-value warning">{analytics?.secretsNeedingRotation}</span>
        </div>
        <div className="metric-card">
          <h3>Recent Audit Events</h3>
          <span className="metric-value">{analytics?.recentAuditEvents}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Recent Security Alerts</h2>
          <div className="alerts-list">
            {securityAlerts.slice(0, 5).map(alert => (
              <div key={alert.id} className={`alert ${alert.severity.toLowerCase()}`}>
                <span className="alert-type">{alert.type}</span>
                <span className="alert-message">{alert.message}</span>
                <span className="alert-time">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Live Audit Stream</h2>
          <div className="audit-stream">
            {auditEvents.slice(0, 10).map(event => (
              <div key={event.id} className="audit-event">
                <span className={`action ${event.success ? 'success' : 'failure'}`}>
                  {event.action}
                </span>
                <span className="user">{event.user?.name}</span>
                <span className="resource">{event.resource}</span>
                <span className="time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Users List Component
export const UsersList = () => {
  const [filter, setFilter] = useState('');
  const { users, pagination, loading, error, loadMore, createUser } = useUsers({}, filter);

  const handleCreateUser = async (userData) => {
    try {
      await createUser({ variables: { input: userData } });
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="users-list">
      <div className="users-header">
        <h2>Users Management</h2>
        <input
          type="text"
          placeholder="Search users..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="users-grid">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-info">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <span className={`role ${user.role}`}>{user.role}</span>
              <span className={`status ${user.status}`}>{user.status}</span>
            </div>
            <div className="user-stats">
              <p>Logins: {user.stats.totalLogins}</p>
              <p>Activity: {Math.round(user.stats.activityScore)}%</p>
              <p>Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</p>
            </div>
          </div>
        ))}
      </div>

      {pagination?.hasNextPage && (
        <button onClick={loadMore} className="load-more-btn">
          Load More Users
        </button>
      )}
    </div>
  );
};

// Apollo Provider Setup
export const GraphQLProvider = ({ children }) => {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ApolloProvider>
  );
};

// Error Boundary for GraphQL errors
export class GraphQLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GraphQL Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong with the GraphQL connection</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default {
  apolloClient,
  GraphQLProvider,
  useAuth,
  useDashboard,
  useUsers,
  useContractors,
  useSecrets,
  useRealTimeUpdates,
};
