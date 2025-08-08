/**
 * Apollo Client Configuration for React Native System Analyzer
 *
 * Features:
 * - GraphQL queries and mutations with offline support
 * - Real-time subscriptions via WebSocket
 * - Cache persistence with AsyncStorage
 * - Network-aware operations
 * - Error handling and retry logic
 */

import { ApolloClient, InMemoryCache, from, split, createHttpLink, NormalizedCacheObject } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

// Environment configuration
const GRAPHQL_HTTP_URL = Constants.expoConfig?.extra?.graphqlUrl || 'http://localhost:4000/graphql';
const GRAPHQL_WS_URL = Constants.expoConfig?.extra?.graphqlWsUrl || 'ws://localhost:4000/graphql';

// Network state management
let isOnline = true;
NetInfo.addEventListener(state => {
  isOnline = Boolean(state.isConnected && state.isInternetReachable);
});

// HTTP Link for queries and mutations
const httpLink = createHttpLink({
  uri: GRAPHQL_HTTP_URL,
  credentials: 'include',
});

// WebSocket Link for subscriptions (only when online)
const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_URL,
    connectionParams: async () => {
      const authToken = await AsyncStorage.getItem('authToken');
      return {
        authToken,
      };
    },
    retryAttempts: 5,
    shouldRetry: () => isOnline,
    on: {
      connected: () => console.log('WebSocket connected'),
      closed: () => console.log('WebSocket closed'),
      error: (error) => console.error('WebSocket error:', error),
    },
  })
);

// Auth Link to add authorization headers
const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('authToken');

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-client-version': '1.0.0',
      'x-client-name': 'system-analyzer-mobile',
      'x-platform': 'react-native',
    }
  };
});

// Error Link for centralized error handling
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle authentication errors
      if (message.includes('UNAUTHENTICATED')) {
        AsyncStorage.removeItem('authToken');
        // Navigate to login screen - you'll implement this based on your navigation setup
      }
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);

    // Handle specific network errors
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      AsyncStorage.removeItem('authToken');
      // Navigate to login screen
    }
  }
});

// Retry Link with network-aware retry logic
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Don't retry if offline or authentication error
      if (!isOnline || error.message?.includes('UNAUTHENTICATED')) {
        return false;
      }
      return !!error;
    }
  }
});

// Split link to route operations based on type and network status
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription' &&
      isOnline // Only use WebSocket when online
    );
  },
  wsLink,
  httpLink,
);

// Combine all links
const link = from([
  errorLink,
  retryLink,
  authLink,
  splitLink,
]);

// Apollo Cache configuration optimized for mobile
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        services: {
          merge(existing = [], incoming) {
            return [...incoming];
          }
        },
        alerts: {
          merge(existing = [], incoming) {
            return [...incoming];
          }
        },
        metrics: {
          merge(existing = [], incoming) {
            return [...incoming];
          }
        }
      }
    },
    Service: {
      fields: {
        metrics: {
          merge(existing = [], incoming) {
            return [...incoming];
          }
        },
        alerts: {
          merge(existing = [], incoming) {
            return [...incoming];
          }
        }
      }
    },
    SystemAnalysis: {
      keyFields: ['id'],
    },
    Alert: {
      keyFields: ['id'],
    },
    Metric: {
      keyFields: ['id'],
    }
  }
});

// Initialize cache persistence
let client: ApolloClient<NormalizedCacheObject>;

export const initializeApolloClient = async (): Promise<ApolloClient<NormalizedCacheObject>> => {
  // Set up cache persistence
  await persistCache({
    cache,
    storage: new AsyncStorageWrapper(AsyncStorage),
    maxSize: 1048576, // 1MB
    debounce: 1000, // 1 second
  });

  // Create Apollo Client instance
  client = new ApolloClient({
    link,
    cache,
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'ignore',
        fetchPolicy: isOnline ? 'cache-and-network' : 'cache-first',
      },
      query: {
        errorPolicy: 'all',
        fetchPolicy: isOnline ? 'cache-first' : 'cache-only',
      },
      mutate: {
        errorPolicy: 'all',
      }
    },
    connectToDevTools: __DEV__,
  });

  // Update fetch policies based on network status
  NetInfo.addEventListener(state => {
    const wasOnline = isOnline;
    isOnline = Boolean(state.isConnected && state.isInternetReachable);

    if (isOnline && !wasOnline) {
      // Back online - refetch active queries
      client.refetchQueries({
        include: 'active',
      });
    }

    // Update default fetch policies
    client.defaultOptions.watchQuery!.fetchPolicy = isOnline ? 'cache-and-network' : 'cache-first';
    client.defaultOptions.query!.fetchPolicy = isOnline ? 'cache-first' : 'cache-only';
  });

  return client;
};

// Helper functions for cache management
export const clearCache = async () => {
  if (client) {
    await client.cache.reset();
    await AsyncStorage.removeItem('apollo-cache-persist');
  }
};

export const getNetworkStatus = () => isOnline;

export const updateServiceInCache = (serviceId: string, updates: any) => {
  if (client) {
    client.cache.modify({
      id: client.cache.identify({ __typename: 'Service', id: serviceId }),
      fields: {
        ...updates,
      },
    });
  }
};

// Export client getter (use after initialization)
export const getApolloClient = () => {
  if (!client) {
    throw new Error('Apollo Client not initialized. Call initializeApolloClient first.');
  }
  return client;
};

export default getApolloClient;
