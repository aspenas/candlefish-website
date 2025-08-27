// Mobile Apollo Client with Offline Persistence
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  from,
  ApolloLink,
} from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { persistCache, LocalStorageWrapper } from 'apollo3-cache-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { CachePersistor } from 'apollo3-cache-persist/lib/types';
import Constants from 'expo-constants';

// Environment configuration
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'https://api.candlefish.ai';
const GRAPHQL_HTTP_URI = `${API_BASE_URL}/graphql`;
const GRAPHQL_WS_URI = API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/graphql';

// Cache configuration optimized for mobile
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Security overview should update frequently on mobile
        securityOverview: {
          merge: true,
        },
        // Mobile-optimized pagination
        assets: {
          keyArgs: ['filter'],
          merge(existing = [], incoming, { args }) {
            const offset = args?.offset || 0;
            const merged = existing ? existing.slice() : [];

            // Replace items at offset with incoming items
            for (let i = 0; i < incoming.length; ++i) {
              merged[offset + i] = incoming[i];
            }

            return merged;
          },
        },
        vulnerabilities: {
          keyArgs: ['filter'],
          merge(existing = [], incoming, { args }) {
            const offset = args?.offset || 0;
            const merged = existing ? existing.slice() : [];

            for (let i = 0; i < incoming.length; ++i) {
              merged[offset + i] = incoming[i];
            }

            return merged;
          },
        },
        alerts: {
          keyArgs: ['filter'],
          merge(existing = [], incoming, { args }) {
            const offset = args?.offset || 0;
            const merged = existing ? existing.slice() : [];

            for (let i = 0; i < incoming.length; ++i) {
              merged[offset + i] = incoming[i];
            }

            return merged;
          },
        },
      },
    },
    Asset: {
      keyFields: ['id'],
      fields: {
        vulnerabilities: {
          merge(existing = [], incoming) {
            return [...incoming];
          },
        },
        alerts: {
          merge(existing = [], incoming) {
            return [...incoming];
          },
        },
      },
    },
    Vulnerability: {
      keyFields: ['id'],
    },
    Alert: {
      keyFields: ['id'],
    },
    SecurityEvent: {
      keyFields: ['id'],
    },
    // Kong status should always fetch fresh data
    KongAdminApiStatus: {
      merge: false,
    },
  },
  // Optimize memory usage on mobile
  possibleTypes: {},
  resultCaching: true,
});

// Cache persistence setup
let persistor: CachePersistor<any> | undefined;

export const initializeCachePersistence = async (): Promise<void> => {
  try {
    persistor = new CachePersistor({
      cache,
      storage: AsyncStorage as any,
      maxSize: 10 * 1024 * 1024, // 10MB cache limit for mobile
      debounce: 1000, // Batch cache writes
      serialize: true,
      trigger: 'write',
    });

    // Restore cache from storage
    await persistor.restore();
    console.log('Apollo cache restored from AsyncStorage');
  } catch (error) {
    console.error('Error initializing cache persistence:', error);
    // Clear potentially corrupted cache
    await AsyncStorage.removeItem('apollo-cache-persist');
  }
};

// HTTP Link for queries and mutations
const httpLink = createHttpLink({
  uri: GRAPHQL_HTTP_URI,
  credentials: 'include',
});

// WebSocket Link for subscriptions with mobile optimizations
const createWebSocketLink = () => {
  return new GraphQLWsLink(
    createClient({
      url: GRAPHQL_WS_URI,
      connectionParams: async () => {
        const token = await AsyncStorage.getItem('security_dashboard_auth_token');
        const deviceId = await AsyncStorage.getItem('device_id');

        return {
          authToken: token,
          deviceId,
          platform: 'mobile',
          'x-client-name': 'mobile-security-dashboard',
          'x-client-version': Constants.expoConfig?.version || '1.0.0',
        };
      },
      retryAttempts: 5,
      shouldRetry: (errOrCloseEvent) => {
        // Retry on network errors but not on auth failures
        return (errOrCloseEvent as CloseEvent)?.code !== 4401;
      },
      // Mobile-optimized reconnection
      retryWait: async (retryAttempt) => {
        // Exponential backoff with jitter for mobile networks
        const baseDelay = Math.min(1000 * Math.pow(2, retryAttempt), 30000);
        const jitter = Math.random() * 1000;
        return baseDelay + jitter;
      },
      lazy: true, // Don't connect immediately to save battery
      lazyCloseTimeout: 30000, // Keep connection for 30s after last subscription
    })
  );
};

let wsLink: GraphQLWsLink | null = null;

// Network-aware WebSocket link
const networkAwareWsLink = new ApolloLink((operation, forward) => {
  return new Promise((resolve) => {
    NetInfo.fetch().then((state) => {
      if (state.isConnected) {
        if (!wsLink) {
          wsLink = createWebSocketLink();
        }
        resolve(wsLink.request(operation, forward));
      } else {
        // If offline, don't attempt WebSocket connection
        resolve(null);
      }
    });
  });
});

// Authentication link
const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('security_dashboard_auth_token');
  const orgId = await AsyncStorage.getItem('security_dashboard_org_id');
  const deviceId = await AsyncStorage.getItem('device_id');

  return {
    headers: {
      ...headers,
      ...(token && { authorization: `Bearer ${token}` }),
      ...(orgId && { 'x-organization-id': orgId }),
      ...(deviceId && { 'x-device-id': deviceId }),
      'x-client-name': 'mobile-security-dashboard',
      'x-platform': 'mobile',
      'x-request-id': `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
  };
});

// Enhanced error handling for mobile
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        extensions
      );

      if (extensions?.code === 'UNAUTHENTICATED') {
        // Clear auth tokens and navigate to login
        AsyncStorage.multiRemove([
          'security_dashboard_auth_token',
          'security_dashboard_refresh_token',
          'security_dashboard_org_id'
        ]);

        // Emit custom event for app-wide auth handling
        // This will be caught by the authentication service
        console.warn('Authentication expired - redirecting to login');
      }

      if (extensions?.code === 'RATE_LIMITED') {
        // Handle rate limiting gracefully on mobile
        console.warn('Rate limited - implementing backoff', extensions.retryAfter);
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);

    // Handle network connectivity issues
    if (networkError.message.includes('Network request failed')) {
      console.warn('Network request failed - device may be offline');
    }
  }
});

// Mobile-optimized retry link
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 30000, // Max 30s delay for mobile
    jitter: true,
  },
  attempts: {
    max: 3, // Fewer retries on mobile to save battery
    retryIf: (error, _operation) => {
      // Only retry network errors, not auth or validation errors
      return !!error && !error.message.includes('401') && !error.message.includes('400');
    },
  },
});

// Network status link to handle offline scenarios
const networkStatusLink = new ApolloLink((operation, forward) => {
  return new Promise((resolve) => {
    NetInfo.fetch().then((state) => {
      if (state.isConnected) {
        // Network is available, proceed normally
        resolve(forward(operation));
      } else {
        // Network is not available, check if we have cached data
        const context = operation.getContext();
        if (context.allowOffline) {
          // Return cached result or null for offline-allowed operations
          resolve(null);
        } else {
          // Reject for operations that require network
          resolve(forward(operation));
        }
      }
    });
  });
});

// Split link between HTTP and WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  networkAwareWsLink,
  from([authLink, errorLink, retryLink, networkStatusLink, httpLink])
);

// Apollo Client instance with mobile optimizations
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache,
  defaultOptions: {
    query: {
      errorPolicy: 'cache-and-network', // Return cached data while fetching
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    },
    mutate: {
      errorPolicy: 'all',
    },
    watchQuery: {
      errorPolicy: 'cache-and-network',
      fetchPolicy: 'cache-and-network',
    },
  },
  // Mobile-specific configurations
  connectToDevTools: __DEV__,
  name: 'mobile-security-dashboard',
  version: Constants.expoConfig?.version || '1.0.0',
});

// Helper functions for mobile authentication
export const setAuthToken = async (token: string, refreshToken?: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('security_dashboard_auth_token', token);
    if (refreshToken) {
      await AsyncStorage.setItem('security_dashboard_refresh_token', refreshToken);
    }
  } catch (error) {
    console.error('Error storing auth tokens:', error);
  }
};

export const clearAuthTokens = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      'security_dashboard_auth_token',
      'security_dashboard_refresh_token',
      'security_dashboard_org_id',
    ]);

    // Clear Apollo cache
    await apolloClient.clearStore();

    // Reset cache persistence
    if (persistor) {
      await persistor.purge();
    }
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const setOrganizationId = async (orgId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('security_dashboard_org_id', orgId);
  } catch (error) {
    console.error('Error storing organization ID:', error);
  }
};

// Network connectivity status
export const getNetworkStatus = async () => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected,
      connectionType: state.type,
      isWifiEnabled: state.type === 'wifi',
    };
  } catch (error) {
    console.error('Error getting network status:', error);
    return {
      isConnected: false,
      connectionType: 'unknown',
      isWifiEnabled: false,
    };
  }
};

// Cache management for mobile
export const clearSecurityCache = async (): Promise<void> => {
  try {
    // Clear specific security-related cache entries
    cache.modify({
      fields: {
        securityOverview: () => undefined,
        assets: () => undefined,
        vulnerabilities: () => undefined,
        alerts: () => undefined,
      },
    });

    // Persist the cache changes
    if (persistor) {
      await persistor.persist();
    }
  } catch (error) {
    console.error('Error clearing security cache:', error);
  }
};

// Offline action queue management
export const getOfflineActions = async (): Promise<any[]> => {
  try {
    const actionsJson = await AsyncStorage.getItem('offline_actions');
    return actionsJson ? JSON.parse(actionsJson) : [];
  } catch (error) {
    console.error('Error getting offline actions:', error);
    return [];
  }
};

export const addOfflineAction = async (action: any): Promise<void> => {
  try {
    const existingActions = await getOfflineActions();
    const newActions = [...existingActions, { ...action, timestamp: new Date().toISOString() }];
    await AsyncStorage.setItem('offline_actions', JSON.stringify(newActions));
  } catch (error) {
    console.error('Error adding offline action:', error);
  }
};

export const clearOfflineActions = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('offline_actions');
  } catch (error) {
    console.error('Error clearing offline actions:', error);
  }
};

// Cache size monitoring for mobile performance
export const getCacheSize = async (): Promise<number> => {
  try {
    if (persistor) {
      return await persistor.getSize();
    }
    return 0;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
};

// Initialize Apollo Client with cache persistence
export const initializeApollo = async (): Promise<void> => {
  try {
    await initializeCachePersistence();
    console.log('Apollo Client initialized successfully');
  } catch (error) {
    console.error('Error initializing Apollo Client:', error);
    throw error;
  }
};

export default apolloClient;
