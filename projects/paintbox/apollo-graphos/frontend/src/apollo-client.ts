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
import toast from 'react-hot-toast';

// HTTP link for queries and mutations
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: import.meta.env.VITE_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql',
    connectionParams: {
      authToken: localStorage.getItem('auth-token'),
    },
    on: {
      error: (error) => {
        console.error('WebSocket error:', error);
        toast.error('Real-time connection lost');
      },
      connected: () => {
        console.log('WebSocket connected');
      },
      closed: () => {
        console.log('WebSocket closed');
      },
    },
  })
);

// Auth link to add authorization headers
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('auth-token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error link for global error handling
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle specific error types
      if (extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('auth-token');
        toast.error('Please log in again');
        // Redirect to login page
        window.location.href = '/login';
      } else if (extensions?.code === 'FORBIDDEN') {
        toast.error('You do not have permission to perform this action');
      } else {
        toast.error(message);
      }
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
    if (networkError.message.includes('Failed to fetch')) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('Something went wrong. Please try again.');
    }
  }
});

// Split link based on operation type
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

// Configure cache with federation support
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        estimates: {
          keyArgs: ['filter'],
          merge(existing, incoming, { args }) {
            const { offset = 0 } = args || {};
            const merged = existing ? [...existing.edges] : [];

            if (offset === 0) {
              // Replace all data for first page
              return incoming;
            } else {
              // Append for pagination
              return {
                ...incoming,
                edges: [...merged, ...incoming.edges],
              };
            }
          },
        },
        customers: {
          keyArgs: ['filter'],
          merge(existing, incoming, { args }) {
            const { offset = 0 } = args || {};
            const merged = existing ? [...existing.edges] : [];

            if (offset === 0) {
              return incoming;
            } else {
              return {
                ...incoming,
                edges: [...merged, ...incoming.edges],
              };
            }
          },
        },
        projects: {
          keyArgs: ['filter'],
          merge(existing, incoming, { args }) {
            const { offset = 0 } = args || {};
            const merged = existing ? [...existing.edges] : [];

            if (offset === 0) {
              return incoming;
            } else {
              return {
                ...incoming,
                edges: [...merged, ...incoming.edges],
              };
            }
          },
        },
      },
    },
    Estimate: {
      keyFields: ['id'],
      fields: {
        createdAt: {
          read(value) {
            return value ? new Date(value).toISOString() : null;
          },
        },
        updatedAt: {
          read(value) {
            return value ? new Date(value).toISOString() : null;
          },
        },
      },
    },
    Customer: {
      keyFields: ['id'],
      fields: {
        createdAt: {
          read(value) {
            return value ? new Date(value).toISOString() : null;
          },
        },
        lastSync: {
          read(value) {
            return value ? new Date(value).toISOString() : null;
          },
        },
      },
    },
    Project: {
      keyFields: ['id'],
      fields: {
        createdAt: {
          read(value) {
            return value ? new Date(value).toISOString() : null;
          },
        },
        updatedAt: {
          read(value) {
            return value ? new Date(value).toISOString() : null;
          },
        },
        photos: {
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
      },
    },
    Integration: {
      keyFields: ['id'],
      fields: {
        lastHealthCheck: {
          read(value) {
            return value ? new Date(value).toISOString() : null;
          },
        },
      },
    },
  },
  possibleTypes: {
    // Add any union types here if needed
  },
});

// Create Apollo Client instance
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

// Helper function to clear cache and restart WebSocket
export const resetApolloClient = async () => {
  await apolloClient.clearStore();
  // Restart WebSocket connection
  if (wsLink) {
    // Force reconnection
    wsLink.subscriptionClient?.close();
  }
};
