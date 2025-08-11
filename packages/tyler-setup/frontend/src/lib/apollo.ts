import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  from,
  Observable,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { toast } from '@/hooks/use-toast';

// Environment configuration
const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT ||
  'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod/graphql';

const WS_ENDPOINT = import.meta.env.VITE_WS_ENDPOINT ||
  'wss://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod/graphql';

// HTTP link for queries and mutations
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
  credentials: 'include',
});

// WebSocket link for subscriptions
const wsClient = createClient({
  url: WS_ENDPOINT,
  connectionParams: () => {
    const token = localStorage.getItem('token');
    return {
      authorization: token ? `Bearer ${token}` : '',
    };
  },
  retryAttempts: 5,
  shouldRetry: () => true,
});

const wsLink = new GraphQLWsLink(wsClient);

// Auth link to add JWT tokens to requests
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  };
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const error of graphQLErrors) {
      console.error(`GraphQL error: ${error.message}`, {
        location: error.locations,
        path: error.path,
        extensions: error.extensions,
      });

      // Handle authentication errors
      if (error.extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return;
      }

      // Show user-friendly error messages
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }

  if (networkError) {
    console.error(`Network error: ${networkError.message}`, networkError);

    // Handle different types of network errors
    if ('statusCode' in networkError) {
      switch (networkError.statusCode) {
        case 401:
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          break;
        case 403:
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to perform this action.',
            variant: 'destructive',
          });
          break;
        case 429:
          toast({
            title: 'Rate Limited',
            description: 'Too many requests. Please try again later.',
            variant: 'destructive',
          });
          break;
        case 500:
          toast({
            title: 'Server Error',
            description: 'Internal server error. Please try again later.',
            variant: 'destructive',
          });
          break;
        default:
          toast({
            title: 'Network Error',
            description: 'Unable to connect to the server. Please check your connection.',
            variant: 'destructive',
          });
      }
    }
  }
});

// Retry link for failed requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error, _operation) => !!error && !error.message.includes('401'),
  },
});

// Split link to route different operation types
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([errorLink, retryLink, authLink, httpLink])
);

// Custom cache configuration with optimistic updates
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        users: {
          merge(existing, incoming, { args }) {
            // Handle pagination merging
            if (!existing || args?.pagination?.offset === 0) {
              return incoming;
            }
            return {
              ...incoming,
              users: [...(existing.users || []), ...(incoming.users || [])],
            };
          },
        },
        contractors: {
          merge(existing, incoming, { args }) {
            if (!existing || args?.pagination?.offset === 0) {
              return incoming;
            }
            return {
              ...incoming,
              contractors: [...(existing.contractors || []), ...(incoming.contractors || [])],
            };
          },
        },
        secrets: {
          merge(existing, incoming, { args }) {
            if (!existing || args?.pagination?.offset === 0) {
              return incoming;
            }
            return {
              ...incoming,
              secrets: [...(existing.secrets || []), ...(incoming.secrets || [])],
            };
          },
        },
        auditLogs: {
          merge(existing, incoming, { args }) {
            if (!existing || args?.pagination?.offset === 0) {
              return incoming;
            }
            return {
              ...incoming,
              logs: [...(existing.logs || []), ...(incoming.logs || [])],
            };
          },
        },
      },
    },
    User: {
      fields: {
        auditLogs: {
          merge: false, // Always replace
        },
      },
    },
    Contractor: {
      fields: {
        auditLogs: {
          merge: false,
        },
      },
    },
    Secret: {
      fields: {
        auditLogs: {
          merge: false,
        },
        rotationHistory: {
          merge: false,
        },
      },
    },
  },
});

// Apollo Client instance
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
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: import.meta.env.DEV,
});

// Cache persistence utilities
export const persistCache = () => {
  try {
    const cacheData = apolloClient.extract();
    localStorage.setItem('apollo-cache', JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to persist Apollo cache:', error);
  }
};

export const restoreCache = () => {
  try {
    const cacheData = localStorage.getItem('apollo-cache');
    if (cacheData) {
      apolloClient.restore(JSON.parse(cacheData));
    }
  } catch (error) {
    console.warn('Failed to restore Apollo cache:', error);
    localStorage.removeItem('apollo-cache');
  }
};

// Clear cache on logout
export const clearCache = () => {
  try {
    apolloClient.clearStore();
    localStorage.removeItem('apollo-cache');
  } catch (error) {
    console.warn('Failed to clear Apollo cache:', error);
  }
};

// Network status utilities
export const getNetworkStatus = () => {
  return navigator.onLine;
};

// Optimistic response helpers
export const createOptimisticResponse = <T>(
  typename: string,
  data: Partial<T>
): { __typename: string } & T => ({
  __typename: typename,
  ...data,
} as { __typename: string } & T);

// Cache update helpers
export const updateCacheAfterMutation = (
  cache: any,
  result: any,
  query: any,
  variables: any = {}
) => {
  try {
    const existingData = cache.readQuery({ query, variables });
    if (existingData && result.data) {
      // This is a generic helper - specific implementations should be in individual hooks
      cache.writeQuery({
        query,
        variables,
        data: {
          ...existingData,
          ...result.data,
        },
      });
    }
  } catch (error) {
    console.warn('Cache update failed:', error);
  }
};

// Initialize cache restoration
if (typeof window !== 'undefined') {
  restoreCache();

  // Persist cache periodically
  setInterval(persistCache, 30000); // Every 30 seconds

  // Clear cache on window unload
  window.addEventListener('beforeunload', persistCache);
}
