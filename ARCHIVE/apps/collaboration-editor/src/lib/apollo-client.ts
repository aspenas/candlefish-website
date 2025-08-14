import { ApolloClient, InMemoryCache, createHttpLink, split, from } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { createClient } from 'graphql-ws';
import { toast } from 'react-hot-toast';

// HTTP Link for queries and mutations
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL || 'http://localhost:4000/graphql',
  credentials: 'include',
});

// WebSocket Link for subscriptions
const wsLink = typeof window !== 'undefined' ? new GraphQLWsLink(
  createClient({
    url: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql',
    connectionParams: () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      return {
        authorization: token ? `Bearer ${token}` : '',
        'x-client-type': 'collaboration-editor',
        'x-client-version': '1.0.0',
      };
    },
    shouldRetry: (errOrCloseEvent) => {
      // Retry on connection errors, but not on authentication failures
      if (errOrCloseEvent instanceof CloseEvent) {
        return ![1000, 1001, 1005, 4401, 4403].includes(errOrCloseEvent.code);
      }
      return true;
    },
    retryAttempts: 5,
    retryWait: async (retries) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 16000)));
    },
    on: {
      connected: () => {
        console.log('🚀 WebSocket connected');
      },
      closed: (event) => {
        console.log('🔌 WebSocket closed', event);
        if (event.code === 4401) {
          toast.error('Authentication expired. Please login again.');
        }
      },
      error: (error) => {
        console.error('❌ WebSocket error:', error);
        toast.error('Connection error. Retrying...');
      },
    },
  })
) : null;

// Auth link to add authorization header
const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-client-type': 'collaboration-editor',
      'x-organization': typeof window !== 'undefined' ? localStorage.getItem('organization_id') || '' : '',
    }
  };
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle specific error types
      if (extensions?.code === 'UNAUTHENTICATED') {
        toast.error('Please login to continue');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
      } else if (extensions?.code === 'FORBIDDEN') {
        toast.error('You do not have permission to perform this action');
      } else if (extensions?.code === 'CONFLICT') {
        toast.error('Conflict detected. Document has been updated by another user.');
      } else if (extensions?.code === 'RATE_LIMITED') {
        toast.error('Too many requests. Please slow down.');
      } else {
        toast.error(`Error: ${message}`);
      }
    });
  }

  if (networkError) {
    console.error('Network error:', networkError);

    if ('statusCode' in networkError && networkError.statusCode === 401) {
      toast.error('Authentication expired. Please login again.');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    } else {
      toast.error('Network error. Please check your connection.');
    }
  }
});

// Split link to route queries/mutations vs subscriptions
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
      httpLink
    )
  : httpLink;

// Apollo Cache configuration with collaboration-specific caching
const cache = new InMemoryCache({
  typePolicies: {
    Document: {
      fields: {
        // Cache document content with merge strategy for real-time updates
        content: {
          merge(existing, incoming) {
            return { ...existing, ...incoming };
          }
        },
        // Cache active users with replacement strategy for presence
        activeUsers: {
          merge: false, // Replace instead of merge for real-time presence
        },
        // Cache comments with merge strategy
        comments: {
          merge(existing = [], incoming = []) {
            return [...existing, ...incoming.filter(
              (comment: any) => !existing.some((e: any) => e.__ref === comment.__ref)
            )];
          }
        },
        // Cache versions with append strategy
        versions: {
          merge(existing = [], incoming = []) {
            const existingIds = existing.map((v: any) => v.__ref);
            const newVersions = incoming.filter((v: any) => !existingIds.includes(v.__ref));
            return [...existing, ...newVersions];
          }
        }
      }
    },
    Comment: {
      fields: {
        replies: {
          merge(existing = [], incoming = []) {
            return [...existing, ...incoming.filter(
              (reply: any) => !existing.some((e: any) => e.__ref === reply.__ref)
            )];
          }
        }
      }
    },
    // Collaboration-specific cache policies
    PresenceSession: {
      keyFields: ['id', 'user', ['id']]
    },
    Operation: {
      keyFields: ['id', 'timestamp']
    },
    ActivityEvent: {
      keyFields: ['id', 'timestamp']
    }
  }
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, splitLink]),
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
  connectToDevTools: process.env.NODE_ENV === 'development',
});

// Helper functions for client management
export const resetApolloClient = () => {
  return apolloClient.clearStore();
};

export const refetchQueries = (queries: string[]) => {
  return apolloClient.refetchQueries({
    include: queries,
  });
};

// Cache utilities for collaboration features
export const updateDocumentCache = (documentId: string, updates: any) => {
  apolloClient.cache.updateQuery(
    {
      query: require('../graphql/queries/document.graphql').GET_DOCUMENT,
      variables: { id: documentId }
    },
    (data) => data ? { ...data, document: { ...data.document, ...updates } } : data
  );
};

export const addCommentToCache = (documentId: string, comment: any) => {
  apolloClient.cache.updateQuery(
    {
      query: require('../graphql/queries/comments.graphql').GET_DOCUMENT_COMMENTS,
      variables: { documentId }
    },
    (data) => data ? {
      ...data,
      documentComments: [comment, ...data.documentComments]
    } : data
  );
};

export const updatePresenceCache = (documentId: string, presence: any[]) => {
  apolloClient.cache.updateQuery(
    {
      query: require('../graphql/queries/presence.graphql').GET_DOCUMENT_PRESENCE,
      variables: { documentId }
    },
    (data) => data ? {
      ...data,
      documentPresence: presence
    } : data
  );
};
