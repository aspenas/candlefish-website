import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import * as SecureStore from 'expo-secure-store';
import { store } from '@/store';

// Create HTTP link to GraphQL endpoint
const httpLink = createHttpLink({
  uri: __DEV__ 
    ? 'http://localhost:4000/graphql' 
    : 'https://api.candlefish.ai/graphql',
});

// Auth link to add authorization header
const authLink = setContext(async (_, { headers }) => {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return { headers };
  }
});

// Error link for handling GraphQL and network errors
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError.message}`);
    
    // Handle authentication errors
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      // Token expired or invalid - clear session
      store.dispatch({ type: 'auth/logout/fulfilled', payload: null });
    }
    
    // Handle network connectivity
    if (networkError.message === 'Network request failed') {
      store.dispatch({
        type: 'network/setOnlineStatus',
        payload: false,
      });
    }
  }
});

// Retry link for failed operations
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Retry on network errors but not on GraphQL errors
      return !!error && !error.message.includes('GraphQL error');
    },
  },
});

// Create Apollo Client with offline-capable cache
export const apolloClient = new ApolloClient({
  link: from([authLink, errorLink, retryLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Assessment: {
        fields: {
          documents: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
          responses: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
          recommendations: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
        },
      },
      Operator: {
        fields: {
          assessments: {
            merge(existing = [], incoming) {
              // Merge assessments, preferring newer versions
              const merged = [...existing];
              incoming.forEach((newAssessment: any) => {
                const existingIndex = merged.findIndex((a: any) => a.id === newAssessment.id);
                if (existingIndex >= 0) {
                  merged[existingIndex] = newAssessment;
                } else {
                  merged.push(newAssessment);
                }
              });
              return merged;
            },
          },
        },
      },
      Query: {
        fields: {
          assessments: {
            keyArgs: ['filter'],
            merge(existing, incoming, { args }) {
              if (!args?.after) {
                // First page
                return incoming;
              }
              
              // Merge pages for pagination
              return {
                ...incoming,
                edges: [...(existing?.edges || []), ...incoming.edges],
              };
            },
          },
          documents: {
            keyArgs: ['assessmentId', 'filter'],
            merge(existing, incoming, { args }) {
              if (!args?.after) {
                return incoming;
              }
              
              return {
                ...incoming,
                edges: [...(existing?.edges || []), ...incoming.edges],
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Network status monitoring
let isOnline = true;

// Function to handle online/offline status
export const updateNetworkStatus = (online: boolean) => {
  if (isOnline !== online) {
    isOnline = online;
    store.dispatch({
      type: 'network/setOnlineStatus',
      payload: online,
    });
    
    if (online) {
      // Refetch active queries when coming back online
      apolloClient.refetchQueries({
        include: 'active',
      });
      
      // Trigger sync of offline data
      store.dispatch({
        type: 'sync/syncOfflineData',
      });
    }
  }
};

// Error reporting for debugging
if (__DEV__) {
  apolloClient.onResetStore(() => {
    console.log('Apollo cache reset');
    return Promise.resolve();
  });
}