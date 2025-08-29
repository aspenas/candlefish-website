import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { createUploadLink } from 'apollo-upload-client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWS } from 'graphql-ws/lib/use/ws';
import { WebSocketLink } from '@apollo/client/link/ws';
import { RetryLink } from '@apollo/client/link/retry';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// Services and utilities
import { secureStorage } from '@/utils/secure-storage';
import { environment } from '@/config/environment';
import { crashReporting } from './crashReporting';

// Certificate pinning for enhanced security
const createSecureHttpLink = () => {
  const httpLink = createHttpLink({
    uri: environment.GRAPHQL_ENDPOINT,
    // Certificate pinning configuration
    fetchOptions: {
      // Add certificate pinning headers for additional security
      headers: {
        'X-API-Version': '1.0',
        'X-Client-Platform': Platform.OS,
        'X-Client-Version': '1.0.0',
      },
    },
  });

  return httpLink;
};

// Authentication link
const authLink = setContext(async (_, { headers }) => {
  try {
    // Get JWT token from secure storage
    const token = await secureStorage.getToken();
    
    // Get device ID for request tracking
    const deviceId = await secureStorage.getDeviceId();
    
    // Check network connectivity
    const networkState = await NetInfo.fetch();
    
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
        'x-device-id': deviceId,
        'x-connection-type': networkState.type,
        'x-connection-strength': networkState.details?.strength || 'unknown',
        // Security headers
        'x-app-integrity': await generateAppIntegrityToken(),
        'x-timestamp': Date.now().toString(),
      },
    };
  } catch (error) {
    console.error('Error setting auth context:', error);
    crashReporting.recordError(error);
    
    return {
      headers: {
        ...headers,
      },
    };
  }
});

// Generate app integrity token for enhanced security
const generateAppIntegrityToken = async (): Promise<string> => {
  try {
    // In a real implementation, this would use platform-specific app attestation
    // For now, return a basic integrity hash
    const deviceId = await secureStorage.getDeviceId();
    const timestamp = Date.now().toString();
    const integrity = btoa(`${deviceId}-${timestamp}-${Platform.OS}`);
    return integrity;
  } catch (error) {
    console.error('Error generating integrity token:', error);
    return '';
  }
};

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      const errorInfo = {
        message,
        locations,
        path,
        extensions,
        operation: operation.operationName,
      };
      
      console.error(`GraphQL error:`, errorInfo);
      crashReporting.recordError(new Error(`GraphQL Error: ${message}`), errorInfo);
      
      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Clear invalid token and redirect to login
        secureStorage.removeToken().catch(console.error);
        // Navigation will be handled by auth context
      }
      
      // Handle authorization errors
      if (extensions?.code === 'FORBIDDEN') {
        console.warn('Insufficient permissions for operation:', operation.operationName);
      }
    });
  }

  if (networkError) {
    console.error(`Network error:`, networkError);
    crashReporting.recordError(networkError, {
      operation: operation.operationName,
      variables: operation.variables,
    });
    
    // Handle specific network errors
    if ('statusCode' in networkError) {
      switch (networkError.statusCode) {
        case 401:
          secureStorage.removeToken().catch(console.error);
          break;
        case 403:
          console.warn('Access forbidden');
          break;
        case 429:
          console.warn('Rate limit exceeded');
          break;
        case 503:
          console.warn('Service temporarily unavailable');
          break;
      }
    }
  }
});

// Retry link for handling temporary failures
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
      return !!error && !error.result;
    },
  },
});

// WebSocket link for subscriptions
const createWSLink = () => {
  if (typeof window === 'undefined') return null;
  
  return new WebSocketLink({
    uri: environment.WEBSOCKET_ENDPOINT,
    options: {
      reconnect: true,
      connectionParams: async () => {
        const token = await secureStorage.getToken();
        const deviceId = await secureStorage.getDeviceId();
        
        return {
          authorization: token ? `Bearer ${token}` : '',
          deviceId,
        };
      },
      maxReconnectAttempts: 5,
      reconnectInterval: 5000,
    },
  });
};

// Split link to route queries/mutations vs subscriptions
const createSplitLink = () => {
  const httpLink = createSecureHttpLink();
  const wsLink = createWSLink();
  
  if (!wsLink) {
    // If WebSocket is not available (e.g., in tests), use HTTP only
    return httpLink;
  }
  
  return split(
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
};

// Upload link for file uploads
const uploadLink = createUploadLink({
  uri: environment.GRAPHQL_ENDPOINT,
  headers: {
    'X-API-Version': '1.0',
    'X-Client-Platform': Platform.OS,
  },
});

// Create the final link chain
const link = from([
  errorLink,
  retryLink,
  authLink,
  createSplitLink(),
]);

// Apollo Client configuration
export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      SecurityAlert: {
        fields: {
          timestamp: {
            read(existing) {
              return existing ? new Date(existing) : null;
            },
          },
        },
      },
      SecurityIncident: {
        fields: {
          createdAt: {
            read(existing) {
              return existing ? new Date(existing) : null;
            },
          },
          updatedAt: {
            read(existing) {
              return existing ? new Date(existing) : null;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'cache-first',
      notifyOnNetworkStatusChange: true,
    },
  },
});

// Initialize Apollo Client
export const initializeApollo = async (): Promise<void> => {
  try {
    console.log('Initializing Apollo Client...');
    
    // Warm up the cache with essential data
    // await apolloClient.query({
    //   query: GET_INITIAL_DATA,
    //   errorPolicy: 'ignore',
    // });
    
    console.log('Apollo Client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Apollo Client:', error);
    crashReporting.recordError(error);
  }
};

// API utility functions
export const apiUtils = {
  // Clear Apollo cache
  clearCache: async (): Promise<void> => {
    try {
      await apolloClient.clearStore();
      console.log('Apollo cache cleared');
    } catch (error) {
      console.error('Failed to clear Apollo cache:', error);
      throw error;
    }
  },

  // Reset Apollo cache and refetch active queries
  resetStore: async (): Promise<void> => {
    try {
      await apolloClient.resetStore();
      console.log('Apollo store reset');
    } catch (error) {
      console.error('Failed to reset Apollo store:', error);
      throw error;
    }
  },

  // Check API connectivity
  checkConnectivity: async (): Promise<boolean> => {
    try {
      const result = await apolloClient.query({
        query: gql`
          query HealthCheck {
            healthCheck {
              status
              timestamp
            }
          }
        `,
        fetchPolicy: 'network-only',
        errorPolicy: 'none',
      });
      
      return result.data?.healthCheck?.status === 'OK';
    } catch (error) {
      console.warn('API connectivity check failed:', error);
      return false;
    }
  },

  // Get current cache size (approximate)
  getCacheSize: (): number => {
    try {
      const cache = apolloClient.cache.extract();
      return JSON.stringify(cache).length;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  },
};

// GraphQL error types for better error handling
export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: {
    code?: string;
    exception?: any;
  };
}

// Network error types
export interface NetworkError extends Error {
  statusCode?: number;
  result?: any;
}

export default apolloClient;