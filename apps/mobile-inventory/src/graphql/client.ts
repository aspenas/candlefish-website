import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { retry } from '@apollo/client/link/retry';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const GRAPHQL_ENDPOINT = 'https://api.candlefish.ai/graphql';
const GRAPHQL_WS_ENDPOINT = 'wss://api.candlefish.ai/graphql';

// Create HTTP Link
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
});

// Create WebSocket Link for subscriptions
const wsClient = createClient({
  url: GRAPHQL_WS_ENDPOINT,
  connectionParams: async () => {
    const token = await AsyncStorage.getItem('auth_token');
    return {
      authorization: token ? `Bearer ${token}` : '',
    };
  },
  shouldRetry: () => true,
  retryAttempts: 5,
  retryWait: (attempt) => Math.min(1000 * Math.pow(2, attempt), 10000),
});

const wsLink = new GraphQLWsLink(wsClient);

// Auth Link
const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('auth_token');

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-client-name': 'mobile-inventory',
      'x-client-version': '1.0.0',
    },
  };
});

// Error Link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);

    // Handle specific network errors
    if (networkError.statusCode === 401) {
      // Token expired - redirect to login
      AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
      // TODO: Trigger navigation to login screen
    }
  }
});

// Retry Link with exponential backoff
const retryLink = retry({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error, _operation) => !!error && !error.statusCode || error.statusCode >= 500,
  },
});

// Split link to route queries/mutations vs subscriptions
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

// Cache configuration
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        inventoryItems: {
          keyArgs: ['category', 'searchQuery'],
          merge(existing = { items: [], totalCount: 0, hasMore: false }, incoming) {
            return {
              ...incoming,
              items: [...existing.items, ...incoming.items],
            };
          },
        },
      },
    },
    InventoryItem: {
      fields: {
        tags: {
          merge: false, // Replace tags array completely
        },
      },
    },
  },
});

// Create Apollo Client
export const client = new ApolloClient({
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
});

// Network status monitoring
class NetworkStatusManager {
  private isOnline: boolean = true;
  private subscriptions: Array<(isOnline: boolean) => void> = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Initial network state
    const netInfoState = await NetInfo.fetch();
    this.isOnline = netInfoState.isConnected ?? false;

    // Subscribe to network changes
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOnline !== this.isOnline) {
        this.notifySubscribers();
      }
    });
  }

  subscribe(callback: (isOnline: boolean) => void): () => void {
    this.subscriptions.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.subscriptions.indexOf(callback);
      if (index > -1) {
        this.subscriptions.splice(index, 1);
      }
    };
  }

  private notifySubscribers() {
    this.subscriptions.forEach(callback => callback(this.isOnline));
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }
}

export const networkStatusManager = new NetworkStatusManager();

// Helper function to check if operation should be queued when offline
export const shouldQueueOperation = (operationName: string): boolean => {
  const queueableOperations = [
    'CreateInventoryItem',
    'UpdateInventoryItem',
    'DeleteInventoryItem',
    'UpdateInventoryQuantity',
    'BulkUpdateInventory',
  ];

  return queueableOperations.includes(operationName);
};

// Offline queue management
export class OfflineQueueManager {
  private static instance: OfflineQueueManager;
  private queue: Array<{
    id: string;
    operation: any;
    variables: any;
    timestamp: number;
    retryCount: number;
  }> = [];

  static getInstance(): OfflineQueueManager {
    if (!OfflineQueueManager.instance) {
      OfflineQueueManager.instance = new OfflineQueueManager();
    }
    return OfflineQueueManager.instance;
  }

  async addToQueue(operation: any, variables: any): Promise<string> {
    const queueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      variables,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queueItem);
    await this.persistQueue();

    return queueItem.id;
  }

  async processQueue(): Promise<void> {
    if (!networkStatusManager.getIsOnline() || this.queue.length === 0) {
      return;
    }

    const itemsToProcess = [...this.queue];
    this.queue = [];

    for (const item of itemsToProcess) {
      try {
        await client.mutate({
          mutation: item.operation,
          variables: item.variables,
        });

        console.log(`Successfully processed queued operation: ${item.id}`);
      } catch (error) {
        console.error(`Failed to process queued operation: ${item.id}`, error);

        // Retry logic
        if (item.retryCount < 3) {
          item.retryCount++;
          this.queue.push(item);
        } else {
          console.error(`Max retries exceeded for operation: ${item.id}`);
        }
      }
    }

    await this.persistQueue();
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }

  async loadQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('offline_queue');
      if (queueData) {
        this.queue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
    AsyncStorage.removeItem('offline_queue');
  }
}

export const offlineQueueManager = OfflineQueueManager.getInstance();

// Initialize offline queue and network monitoring
networkStatusManager.subscribe(async (isOnline) => {
  if (isOnline) {
    console.log('Network restored - processing offline queue');
    await offlineQueueManager.processQueue();
  } else {
    console.log('Network lost - operations will be queued');
  }
});

// Load persisted queue on app start
offlineQueueManager.loadQueue();
