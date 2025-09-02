/**
 * Apollo GraphQL Client Configuration
 * Supports WebSocket subscriptions, offline caching, and retry logic
 */

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  split,
} from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import NetInfo from '@react-native-community/netinfo';
import Config from '@/constants/config';
import { getAuthToken, refreshAuthToken } from './auth';

// HTTP Link for queries and mutations
const httpLink = createHttpLink({
  uri: Config.GRAPHQL_HTTP_ENDPOINT,
  credentials: 'include',
});

// WebSocket Link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: Config.GRAPHQL_WS_ENDPOINT,
    connectionParams: async () => {
      const token = await getAuthToken();
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    shouldRetry: (errOrCloseEvent) => {
      // Retry on connection close but not on authentication errors
      return errOrCloseEvent instanceof CloseEvent && errOrCloseEvent.code !== 4401;
    },
  })
);

// Authentication link
const authLink = setContext(async (_, { headers }) => {
  const token = await getAuthToken();
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-client-name': 'collaboration-mobile',
      'x-client-version': '0.1.0',
    },
  };
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      
      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Try to refresh token
        refreshAuthToken().catch(() => {
          // Redirect to login if refresh fails
          // This will be handled by the AuthContext
        });
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    
    // Log network errors for debugging
    if (__DEV__) {
      console.error('Network Error Details:', {
        name: networkError.name,
        message: networkError.message,
        stack: networkError.stack,
      });
    }
  }
});

// Retry link for network failures
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error, _operation) => {
      // Only retry on network errors, not GraphQL errors
      return !!error && !error.result;
    },
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
  httpLink
);

// Create the Apollo Client cache
const cache = new InMemoryCache({
  typePolicies: {
    Document: {
      fields: {
        content: {
          merge: true,
        },
        presenceInfo: {
          merge: true,
        },
        permissions: {
          merge: true,
        },
      },
    },
    Query: {
      fields: {
        documents: {
          keyArgs: ['filter', 'sort'],
          merge(existing = { nodes: [], pageInfo: {}, totalCount: 0 }, incoming) {
            return {
              ...incoming,
              nodes: [...existing.nodes, ...incoming.nodes],
            };
          },
        },
        searchDocuments: {
          keyArgs: ['query', 'filter'],
          merge: false, // Don't merge search results
        },
      },
    },
  },
  possibleTypes: {
    ActivityTarget: ['Document', 'Comment', 'DocumentVersion', 'User'],
  },
});

// Persist cache to AsyncStorage
let persistCacheInitialized = false;

export const initializeApolloCache = async () => {
  if (persistCacheInitialized) return;
  
  try {
    await persistCache({
      cache,
      storage: new AsyncStorageWrapper(AsyncStorage),
      maxSize: 50 * 1024 * 1024, // 50MB
      serialize: true,
      debug: __DEV__,
    });
    persistCacheInitialized = true;
  } catch (error) {
    console.error('Failed to initialize Apollo cache persistence:', error);
  }
};

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([
    errorLink,
    retryLink,
    authLink,
    splitLink,
  ]),
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
  ssrMode: false,
});

// Network status monitoring
let isOnline = true;

NetInfo.addEventListener((state) => {
  const wasOnline = isOnline;
  isOnline = state.isConnected ?? false;
  
  // Resume queries when coming back online
  if (!wasOnline && isOnline) {
    apolloClient.reFetchObservableQueries();
  }
});

// Export utility functions
export const clearApolloCache = async () => {
  try {
    await apolloClient.clearStore();
    await AsyncStorage.removeItem('apollo-cache-persist');
  } catch (error) {
    console.error('Failed to clear Apollo cache:', error);
  }
};

export const refetchQueries = () => {
  return apolloClient.reFetchObservableQueries();
};

export const getNetworkStatus = () => isOnline;

export default apolloClient;