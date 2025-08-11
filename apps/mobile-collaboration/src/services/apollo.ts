import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  split,
  ApolloLink,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';

import { config } from '@/config';
import { store } from '@/stores';
import { setNetworkStatus } from '@/stores/slices/networkSlice';
import { logError } from '@/utils/logger';

// Network status tracking
NetInfo.addEventListener(state => {
  store.dispatch(setNetworkStatus({
    isConnected: state.isConnected || false,
    type: state.type,
    isInternetReachable: state.isInternetReachable || false,
  }));
});

// Authentication link
const authLink = setContext(async (_, { headers }) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    const organizationId = await AsyncStorage.getItem('current_organization_id');

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
        'x-organization-id': organizationId || '',
        'x-client-name': 'candlefish-mobile-collaboration',
        'x-client-version': '1.0.0',
      },
    };
  } catch (error) {
    logError('Apollo auth link error:', error);
    return { headers };
  }
});

// HTTP Link with mobile optimizations
const httpLink = new HttpLink({
  uri: config.graphql.httpEndpoint,
  fetch: async (uri, options) => {
    // Add network-aware fetching
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
      throw new Error('No network connection');
    }

    // Mobile-specific timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      netInfo.type === 'cellular' ? 15000 : 10000 // Longer timeout on cellular
    );

    try {
      const response = await fetch(uri, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
});

// WebSocket link for real-time subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: config.graphql.wsEndpoint,
    connectionParams: async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        const organizationId = await AsyncStorage.getItem('current_organization_id');

        return {
          authorization: token ? `Bearer ${token}` : '',
          'x-organization-id': organizationId || '',
        };
      } catch (error) {
        logError('WebSocket connection params error:', error);
        return {};
      }
    },
    keepAlive: 30000, // 30 second keepalive for mobile
    connectionTimeout: 10000,
  })
);

// Retry link with mobile-specific retry logic
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error, _operation) => {
      // Retry on network errors but not authentication errors
      return !!error && !error.message.includes('401') && !error.message.includes('403');
    },
  },
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      logError(`GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`);

      // Handle specific error types
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Handle authentication error
        store.dispatch({ type: 'auth/logout' });
      }
    });
  }

  if (networkError) {
    logError(`Network error: ${networkError.message}`);

    // Handle offline scenarios
    if (networkError.message.includes('Network request failed') ||
        networkError.message.includes('No network connection')) {
      store.dispatch(setNetworkStatus({ isConnected: false }));
    }
  }
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
  wsLink,
  httpLink
);

// Apollo Cache with mobile optimizations
const cache = new InMemoryCache({
  typePolicies: {
    Document: {
      fields: {
        activeUsers: {
          merge: false, // Replace instead of merging for real-time updates
        },
        comments: {
          merge: false,
        },
        operations: {
          merge: false,
        },
      },
    },
    User: {
      keyFields: ['id'],
    },
    Comment: {
      keyFields: ['id'],
    },
    PresenceSession: {
      keyFields: ['id'],
    },
  },
  // Mobile-specific cache settings
  resultCaching: true,
  canonizeResults: true,
});

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
      fetchPolicy: 'cache-and-network', // Good for mobile - show cache first, then update
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first', // Prefer cache for better performance
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  // Enable query deduplication for mobile performance
  queryDeduplication: true,
  // Mobile-specific settings
  assumeImmutableResults: true,
});

// Cache management utilities for mobile
export const clearApolloCache = async () => {
  try {
    await apolloClient.clearStore();
  } catch (error) {
    logError('Failed to clear Apollo cache:', error);
  }
};

export const refetchActiveQueries = async () => {
  try {
    await apolloClient.refetchQueries({
      include: 'active',
    });
  } catch (error) {
    logError('Failed to refetch active queries:', error);
  }
};

// Network-aware query management
export const executeNetworkAwareQuery = async (queryFn: () => Promise<any>) => {
  const netInfo = await NetInfo.fetch();

  if (!netInfo.isConnected) {
    // Try to get from cache only
    return queryFn();
  }

  return queryFn();
};
