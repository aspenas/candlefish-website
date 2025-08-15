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
        // Measurement-specific query caching
        measurementsByElevation: {
          keyArgs: ['estimateId', 'elevation'],
          merge(existing = [], incoming) {
            return incoming; // Always replace with fresh data
          },
        },
        measurementSummary: {
          keyArgs: ['estimateId'],
        },
        calculatePricingTiers: {
          keyArgs: ['input', ['estimateId']],
        },
        colorPlacementOptions: {
          keyArgs: ['roomType', 'measurements'],
          merge(existing = [], incoming) {
            return incoming;
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
        // Enhanced measurement caching
        measurements: {
          merge(existing = [], incoming) {
            const existingMap = new Map(existing.map((m: any) => [m.__ref || m.id, m]));
            const result = [...existing];
            
            incoming.forEach((measurement: any) => {
              const key = measurement.__ref || measurement.id;
              const existingIndex = existing.findIndex((m: any) => 
                (m.__ref || m.id) === key
              );
              
              if (existingIndex >= 0) {
                result[existingIndex] = measurement;
              } else {
                result.push(measurement);
              }
            });
            
            return result;
          },
        },
        elevations: {
          merge(existing = [], incoming) {
            // Merge elevations while preserving measurement references
            const existingMap = new Map(existing.map((e: any) => [e.type || e.__ref, e]));
            const result = [];
            
            for (const elevation of incoming) {
              const key = elevation.type || elevation.__ref;
              const existingElevation = existingMap.get(key);
              
              if (existingElevation) {
                // Merge measurements within elevation
                result.push({
                  ...elevation,
                  measurements: elevation.measurements || existingElevation.measurements || [],
                });
              } else {
                result.push(elevation);
              }
            }
            
            return result;
          },
        },
        currentCollaborators: {
          merge(existing = [], incoming) {
            // Real-time collaborator updates
            return incoming; // Always use fresh collaborator data
          },
        },
        pricingTiers: {
          merge(existing, incoming) {
            return incoming; // Always use latest pricing
          },
        },
      },
    },
    
    // Measurement entity caching
    Measurement: {
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
        associatedPhotos: {
          merge(existing = [], incoming) {
            // Merge photo arrays, avoiding duplicates
            const existingIds = new Set(existing.map((p: any) => p.id || p.__ref));
            const result = [...existing];
            
            incoming.forEach((photo: any) => {
              const id = photo.id || photo.__ref;
              if (!existingIds.has(id)) {
                result.push(photo);
              }
            });
            
            return result;
          },
        },
        wwTags: {
          merge(existing = [], incoming) {
            return incoming; // Always use latest tags
          },
        },
      },
    },
    
    // Elevation entity caching
    Elevation: {
      keyFields: ['id'],
      fields: {
        measurements: {
          merge(existing = [], incoming) {
            // Smart merge for measurements within elevation
            const existingMap = new Map(existing.map((m: any) => [m.__ref || m.id, m]));
            const result = [];
            
            // Keep existing measurements not in incoming
            for (const measurement of existing) {
              const key = measurement.__ref || measurement.id;
              if (!incoming.some((m: any) => (m.__ref || m.id) === key)) {
                result.push(measurement);
              }
            }
            
            // Add all incoming measurements
            result.push(...incoming);
            
            return result;
          },
        },
      },
    },
    
    // Photo entity caching for Company Cam integration
    AssociatedPhoto: {
      keyFields: ['id'],
      fields: {
        capturedAt: {
          read(value) {
            return value ? new Date(value).toISOString() : null;
          },
        },
        wwTags: {
          merge(existing = [], incoming) {
            return incoming; // Always use latest tags
          },
        },
      },
    },
    
    // Color placement caching
    ColorPlacement: {
      keyFields: ['id'],
    },
    
    // Pricing tier caching
    PricingTierDetail: {
      keyFields: ['tier'],
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
  // Enable result caching for better performance
  resultCaching: true,
  // Add dataIdFromObject for better normalization
  dataIdFromObject: (object: any) => {
    switch (object.__typename) {
      case 'Estimate':
      case 'Measurement':
      case 'Elevation':
      case 'AssociatedPhoto':
      case 'ColorPlacement':
      case 'WWTag':
        return `${object.__typename}:${object.id}`;
      case 'PricingTierDetail':
        return `${object.__typename}:${object.tier}`;
      default:
        return object.id ? `${object.__typename}:${object.id}` : null;
    }
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
