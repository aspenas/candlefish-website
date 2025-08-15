import { 
  ApolloClient, 
  InMemoryCache, 
  createHttpLink, 
  from,
  ApolloLink,
  Observable,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { RetryLink } from '@apollo/client/link/retry';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import NetInfo from '@react-native-community/netinfo';
import { getCredentials } from './awsCredentials';
import { QueueLink } from 'apollo-link-queue';
import { SerializingLink } from 'apollo-link-serialize';
import { PerformanceMonitor, SmartCache } from './performanceOptimizations';

// Types
interface NetworkStatus {
  isConnected: boolean;
  type?: string;
}

// Constants
const GRAPHQL_ENDPOINT = __DEV__ 
  ? 'http://localhost:4000/graphql' 
  : 'https://api.paintbox.candlefish.ai/graphql';

const CACHE_VERSION = '1.0';
const CACHE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB

// Network status tracking
let networkStatus: NetworkStatus = { isConnected: true };

// Performance monitoring
const performanceMonitor = PerformanceMonitor.getInstance();
const queryCache = new SmartCache<any>(500, 25); // 500 items, 25MB max

NetInfo.addEventListener((state) => {
  networkStatus = {
    isConnected: state.isConnected ?? false,
    type: state.type,
  };
});

// Cache configuration
const cache = new InMemoryCache({
  typePolicies: {
    Project: {
      fields: {
        photos: {
          merge(existing = [], incoming = []) {
            return [...existing, ...incoming];
          },
        },
      },
    },
    Estimate: {
      fields: {
        // Handle estimate calculations with proper merging
        totalSquareFootage: {
          merge(existing, incoming) {
            return incoming ?? existing;
          },
        },
      },
    },
    ProjectPhoto: {
      keyFields: ['id', 'companyCamId'],
    },
    Customer: {
      merge: true,
    },
    Query: {
      fields: {
        projects: {
          keyArgs: ['filter'],
          merge(existing, incoming, { args }) {
            if (!existing) return incoming;
            if (args?.offset === 0) return incoming;
            
            return {
              ...incoming,
              edges: [...(existing.edges || []), ...(incoming.edges || [])],
            };
          },
        },
        estimates: {
          keyArgs: ['filter'],
          merge(existing, incoming, { args }) {
            if (!existing) return incoming;
            if (args?.offset === 0) return incoming;
            
            return {
              ...incoming,
              edges: [...(existing.edges || []), ...(incoming.edges || [])],
            };
          },
        },
      },
    },
  },
});

// HTTP Link
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
});

// Auth Link - using AWS credentials
const authLink = setContext(async (_, { headers }) => {
  try {
    const credentials = await getCredentials();
    
    return {
      headers: {
        ...headers,
        authorization: credentials?.apiKey ? `Bearer ${credentials.apiKey}` : '',
        'x-user-id': credentials?.userId || '',
      },
    };
  } catch (error) {
    console.warn('Failed to get credentials:', error);
    return { headers };
  }
});

// Queue Link - for offline support
const queueLink = new QueueLink();

// Serialize Link - prevent concurrent requests
const serializeLink = new SerializingLink();

// Retry Link
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error, _operation) => {
      const networkError = error.networkError;
      
      // Retry on network errors or 5xx status codes
      if (networkError) {
        // Don't retry on 4xx errors (client errors)
        if ('statusCode' in networkError && networkError.statusCode >= 400 && networkError.statusCode < 500) {
          return false;
        }
        return true;
      }
      
      return false;
    },
  },
});

// Error Link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`,
      );
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
    
    // Handle network errors - queue requests when offline
    if (!networkStatus.isConnected) {
      console.log('Network unavailable, queueing request...');
      // Queue will automatically be processed when network comes back
    }
  }
});

// Performance monitoring link
const performanceLink = new ApolloLink((operation, forward) => {
  const startTime = Date.now();
  const operationName = operation.operationName || 'Unknown';

  return forward(operation).map((response) => {
    const duration = Date.now() - startTime;
    performanceMonitor.trackApiCall(operationName, duration);
    
    console.log(`GraphQL ${operationName} completed in ${duration}ms`);
    return response;
  });
});

// Smart caching link with query deduplication
const smartCacheLink = new ApolloLink((operation, forward) => {
  const operationName = operation.operationName || 'Unknown';
  const variables = operation.variables;
  const cacheKey = `${operationName}_${JSON.stringify(variables)}`;

  // Only cache queries, not mutations/subscriptions
  if (operation.query.definitions.some(def => 
    def.kind === 'OperationDefinition' && def.operation === 'query'
  )) {
    const cached = queryCache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${operationName}`);
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }
  }

  return forward(operation).map((response) => {
    // Cache successful query responses
    if (operation.query.definitions.some(def => 
      def.kind === 'OperationDefinition' && def.operation === 'query'
    ) && !response.errors) {
      queryCache.set(cacheKey, response, 300); // 5 minute TTL
    }
    
    return response;
  });
});

// Offline Link - controls request flow based on network status
const offlineLink = new ApolloLink((operation, forward) => {
  if (!networkStatus.isConnected) {
    // For mutations, queue them
    if (operation.query.definitions.some(def => 
      def.kind === 'OperationDefinition' && def.operation === 'mutation'
    )) {
      console.log('Offline: Queueing mutation', operation.operationName);
      // Let queue link handle this
    }
    
    // For queries, try cache first
    return forward(operation);
  }
  
  return forward(operation);
});

// Create Apollo Client
const createApolloClient = async () => {
  // Initialize cache persistence
  await persistCache({
    cache,
    storage: new AsyncStorageWrapper(AsyncStorage),
    maxSize: CACHE_SIZE_LIMIT,
    debug: __DEV__,
  });

  // Check for cache version and clear if needed
  const currentVersion = await AsyncStorage.getItem('apollo-cache-version');
  if (currentVersion !== CACHE_VERSION) {
    await cache.reset();
    await AsyncStorage.setItem('apollo-cache-version', CACHE_VERSION);
  }

  // Create the Apollo Client
  const client = new ApolloClient({
    link: from([
      performanceLink,
      errorLink,
      retryLink,
      authLink,
      smartCacheLink,
      offlineLink,
      queueLink,
      serializeLink,
      httpLink,
    ]),
    cache,
    defaultOptions: {
      query: {
        errorPolicy: 'all',
        fetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
    connectToDevTools: __DEV__,
  });

  // Set up network status change handling
  NetInfo.addEventListener((state) => {
    const wasConnected = networkStatus.isConnected;
    networkStatus = {
      isConnected: state.isConnected ?? false,
      type: state.type,
    };

    // When network comes back online, open the queue
    if (!wasConnected && networkStatus.isConnected) {
      console.log('Network restored, processing queued requests...');
      queueLink.open();
    } else if (wasConnected && !networkStatus.isConnected) {
      console.log('Network lost, closing queue...');
      queueLink.close();
    }
  });

  return client;
};

// Utility functions for offline handling
export const clearCache = async () => {
  await cache.reset();
  await AsyncStorage.removeItem('apollo-cache-version');
};

export const getCacheSize = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const apolloKeys = keys.filter(key => key.startsWith('apollo'));
    let totalSize = 0;
    
    for (const key of apolloKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += new Blob([value]).size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Error calculating cache size:', error);
    return 0;
  }
};

export const isOffline = () => !networkStatus.isConnected;

export const getNetworkStatus = () => networkStatus;

// Performance monitoring exports
export const getPerformanceStats = () => ({
  monitor: performanceMonitor,
  queryCache: queryCache.getStats(),
});

// Export the client instance
export { cache };
export default createApolloClient;