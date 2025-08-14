import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from './auth';
import NetInfo from '@react-native-community/netinfo';

// Configuration
const HTTP_ENDPOINT = __DEV__
  ? 'http://localhost:4000/graphql'
  : 'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod/graphql';

const WS_ENDPOINT = __DEV__
  ? 'ws://localhost:4000/graphql'
  : 'wss://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod/graphql';

// HTTP Link
const httpLink = createHttpLink({
  uri: HTTP_ENDPOINT,
});

// WebSocket Link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_ENDPOINT,
    connectionParams: async () => {
      const token = await SecureStore.getItemAsync('auth_token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    retryAttempts: 5,
    shouldRetry: () => true,
  })
);

// Auth Link
const authLink = setContext(async (_, { headers }) => {
  const token = await SecureStore.getItemAsync('auth_token');

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-client-type': 'mobile',
      'x-client-version': '1.0.0',
    },
  };
});

// Error Link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (let err of graphQLErrors) {
      console.error(`GraphQL error: ${err.message}`);

      // Handle authentication errors
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        // Try to refresh token
        AuthService.validateStoredAuth().catch(() => {
          // If refresh fails, redirect to login
          // This will be handled by the navigation system
          console.log('Authentication failed, user needs to log in again');
        });
      }

      // Handle authorization errors
      if (err.extensions?.code === 'FORBIDDEN') {
        console.error('Authorization error:', err.message);
      }
    }
  }

  if (networkError) {
    console.error(`Network error: ${networkError.message}`);

    // Handle offline scenarios
    if (networkError.message?.includes('Network request failed')) {
      // Store mutation for offline queue
      console.log('Network request failed, considering offline mode');
    }
  }
});

// Split link for subscriptions
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([errorLink, authLink, httpLink])
);

// Cache configuration
const cache = new InMemoryCache({
  typePolicies: {
    User: {
      fields: {
        organizations: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
        notifications: {
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
      },
    },
    Organization: {
      fields: {
        dashboards: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
        members: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
      },
    },
    Dashboard: {
      fields: {
        widgets: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
      },
    },
    Widget: {
      fields: {
        data: {
          merge(existing, incoming) {
            return incoming;
          },
        },
      },
    },
    Query: {
      fields: {
        dashboards: {
          keyArgs: ['organizationId'],
          merge(existing = [], incoming) {
            return incoming;
          },
        },
        notifications: {
          keyArgs: ['userId'],
          merge(existing = [], incoming, { args }) {
            if (args?.offset === 0) {
              return incoming;
            }
            return [...existing, ...incoming];
          },
        },
      },
    },
  },
});

// Restore cache from AsyncStorage
const restoreCache = async () => {
  try {
    const cacheData = await AsyncStorage.getItem('apollo-cache');
    if (cacheData) {
      cache.restore(JSON.parse(cacheData));
    }
  } catch (error) {
    console.error('Failed to restore Apollo cache:', error);
  }
};

// Persist cache to AsyncStorage
const persistCache = () => {
  try {
    const cacheData = cache.extract();
    AsyncStorage.setItem('apollo-cache', JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to persist Apollo cache:', error);
  }
};

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache,
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: __DEV__,
});

// Initialize cache restoration
restoreCache();

// Persist cache on app state changes
let persistTimer: NodeJS.Timeout;
apolloClient.onResetStore(() => {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistCache, 1000);
});

// Network status monitoring
NetInfo.addEventListener(state => {
  if (state.isConnected && state.isInternetReachable) {
    // Refetch active queries when connection is restored
    apolloClient.refetchQueries({
      include: 'active',
    }).catch(console.error);
  }
});

// Export cache utilities
export const clearApolloCache = async () => {
  await apolloClient.clearStore();
  await AsyncStorage.removeItem('apollo-cache');
};

export const refreshApolloCache = async () => {
  await apolloClient.refetchQueries({
    include: 'active',
  });
};

// Export WebSocket utilities
export const reconnectWebSocket = () => {
  const wsClient = (wsLink as any).client;
  if (wsClient) {
    wsClient.dispose();
    // The client will automatically reconnect
  }
};

// Utility to update auth token
export const updateAuthToken = async (token: string) => {
  await SecureStore.setItemAsync('auth_token', token);
  // Apollo will pick up the new token on the next request
};

// Utility to clear auth
export const clearAuth = async () => {
  await SecureStore.deleteItemAsync('auth_token');
  await apolloClient.clearStore();
  await clearApolloCache();
};
