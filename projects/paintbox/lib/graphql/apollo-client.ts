/**
 * Apollo Client Configuration for System Analyzer Dashboard
 * 
 * Features:
 * - GraphQL queries and mutations
 * - Real-time subscriptions via WebSocket
 * - Error handling and retry logic
 * - Caching strategies
 */

import { ApolloClient, InMemoryCache, from, split, createHttpLink, gql } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

// Environment configuration
const GRAPHQL_HTTP_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
const GRAPHQL_WS_URL = process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql';

// HTTP Link for queries and mutations
const httpLink = createHttpLink({
  uri: GRAPHQL_HTTP_URL,
  credentials: 'include',
});

// WebSocket Link for subscriptions
const wsLink = typeof window !== 'undefined' ? new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_URL,
    connectionParams: {
      authToken: typeof window !== 'undefined' ? localStorage.getItem('authToken') : null,
    },
    retryAttempts: 5,
    shouldRetry: () => true,
  })
) : null;

// Auth Link to add authorization headers
const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-client-version': '1.0.0',
      'x-client-name': 'system-analyzer-dashboard',
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
      
      // Handle specific error types
      if (message.includes('UNAUTHENTICATED')) {
        // Redirect to login or refresh token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
      }
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
    
    // Handle network errors
    if (networkError.message?.includes('401')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
  }
});

// Retry Link for automatic retries
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      return !!error && !error.message?.includes('UNAUTHENTICATED');
    }
  }
});

// Split link to route operations based on type
const splitLink = typeof window !== 'undefined' && wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink,
    )
  : httpLink;

// Combine all links
const link = from([
  errorLink,
  retryLink,
  authLink,
  splitLink,
]);

// Apollo Cache configuration with type policies
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

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link,
  cache,
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'ignore',
      fetchPolicy: 'cache-and-network',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
    mutate: {
      errorPolicy: 'all',
    }
  },
  connectToDevTools: process.env.NODE_ENV === 'development',
});

// Helper functions for cache management
export const clearCache = () => {
  apolloClient.cache.reset();
};

export const updateServiceInCache = (serviceId: string, updates: any) => {
  apolloClient.cache.modify({
    id: apolloClient.cache.identify({ __typename: 'Service', id: serviceId }),
    fields: {
      ...updates,
    },
  });
};

export const addAlertToCache = (alert: any) => {
  apolloClient.cache.modify({
    fields: {
      alerts(existingAlerts = []) {
        const newAlertRef = apolloClient.cache.writeFragment({
          data: alert,
          fragment: gql`
            fragment NewAlert on Alert {
              id
              name
              severity
              status
              triggeredAt
              service {
                id
                name
              }
            }
          `
        });
        return [newAlertRef, ...existingAlerts];
      }
    }
  });
};

// Export default client
export default apolloClient;