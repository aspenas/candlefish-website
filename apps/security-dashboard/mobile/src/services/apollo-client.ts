import { 
  ApolloClient, 
  InMemoryCache, 
  createHttpLink, 
  split,
  from,
  ApolloLink,
  Observable
} from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';

import { AuthService } from './auth';
import { NotificationService } from './notifications';

// Configuration
const API_BASE_URL = __DEV__ ? 'http://localhost:4000' : 'https://api.candlefish.ai';
const GRAPHQL_ENDPOINT = `${API_BASE_URL}/graphql`;
const WS_ENDPOINT = API_BASE_URL.replace('http', 'ws');

class ApolloService {
  private client: ApolloClient<any> | null = null;
  private wsClient: any = null;

  async initialize(): Promise<ApolloClient<any>> {
    if (this.client) {
      return this.client;
    }

    // HTTP Link for queries and mutations
    const httpLink = createHttpLink({
      uri: GRAPHQL_ENDPOINT,
      credentials: 'include',
    });

    // WebSocket Link for subscriptions
    const wsLink = new GraphQLWsLink(
      createClient({
        url: `${WS_ENDPOINT}/graphql`,
        connectionParams: async () => {
          const token = await this.getAuthToken();
          return {
            authorization: token ? `Bearer ${token}` : '',
          };
        },
        shouldRetry: () => true,
        retryAttempts: 5,
        retryWait: async (attempt) => {
          return new Promise(resolve => {
            setTimeout(resolve, Math.min(1000 * 2 ** attempt, 30000));
          });
        },
        on: {
          connected: () => {
            console.log('🔗 WebSocket connected');
          },
          closed: () => {
            console.log('🔌 WebSocket disconnected');
          },
          error: (error) => {
            console.error('❌ WebSocket error:', error);
          },
        }
      })
    );

    // Store WebSocket client reference
    this.wsClient = wsLink;

    // Auth Link - Add JWT token to requests
    const authLink = setContext(async (_, { headers }) => {
      const token = await this.getAuthToken();
      
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : '',
          'x-client-version': '1.0.0',
          'x-client-platform': 'mobile',
        }
      };
    });

    // Error Link - Handle authentication and network errors
    const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
      if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path, extensions }) => {
          console.error(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
          );

          // Handle authentication errors
          if (extensions?.code === 'UNAUTHENTICATED') {
            AuthService.logout();
            NotificationService.showNotification({
              title: 'Session Expired',
              message: 'Please log in again',
              type: 'warning'
            });
          }

          // Handle authorization errors
          if (extensions?.code === 'FORBIDDEN') {
            NotificationService.showNotification({
              title: 'Access Denied',
              message: 'You do not have permission for this action',
              type: 'error'
            });
          }
        });
      }

      if (networkError) {
        console.error(`[Network error]: ${networkError}`);
        
        // Handle specific network errors
        if (networkError.message.includes('fetch')) {
          NotificationService.showNotification({
            title: 'Connection Error',
            message: 'Unable to connect to the server',
            type: 'error'
          });
        }
      }
    });

    // Retry Link - Retry failed requests
    const retryLink = new RetryLink({
      delay: {
        initial: 300,
        max: Infinity,
        jitter: true
      },
      attempts: {
        max: 5,
        retryIf: (error, _operation) => {
          return !!error && error.networkError && !error.graphQLErrors?.length;
        }
      }
    });

    // Network awareness link
    const networkAwareLink = new ApolloLink((operation, forward) => {
      return new Observable(observer => {
        let subscription: any;

        NetInfo.fetch().then(state => {
          if (state.isConnected) {
            subscription = forward(operation).subscribe(observer);
          } else {
            observer.error(new Error('No internet connection'));
          }
        });

        return () => {
          if (subscription) subscription.unsubscribe();
        };
      });
    });

    // Split link - Route to WebSocket for subscriptions, HTTP for queries/mutations
    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink,
    );

    // Combine all links
    const link = from([
      networkAwareLink,
      errorLink,
      retryLink,
      authLink,
      splitLink
    ]);

    // Create Apollo Client with optimized cache
    this.client = new ApolloClient({
      link,
      cache: new InMemoryCache({
        typePolicies: {
          Alert: {
            fields: {
              relatedEvents: {
                merge(existing = [], incoming) {
                  return [...existing, ...incoming];
                }
              }
            }
          },
          SecurityEvent: {
            fields: {
              relatedEvents: {
                merge(existing = [], incoming) {
                  return [...existing, ...incoming];
                }
              }
            }
          },
          Query: {
            fields: {
              alerts: {
                keyArgs: ['filter'],
                merge(existing, incoming, { args }) {
                  if (!existing) return incoming;
                  if (args?.offset === 0) return incoming;
                  
                  return {
                    ...incoming,
                    edges: [...existing.edges, ...incoming.edges]
                  };
                }
              },
              events: {
                keyArgs: ['filter'],
                merge(existing, incoming, { args }) {
                  if (!existing) return incoming;
                  if (args?.offset === 0) return incoming;
                  
                  return {
                    ...incoming,
                    edges: [...existing.edges, ...incoming.edges]
                  };
                }
              }
            }
          }
        }
      }),
      defaultOptions: {
        query: {
          errorPolicy: 'all',
          notifyOnNetworkStatusChange: true,
        },
        mutate: {
          errorPolicy: 'all',
        },
        watchQuery: {
          errorPolicy: 'all',
          notifyOnNetworkStatusChange: true,
        }
      },
      connectToDevTools: __DEV__,
    });

    // Enable cache persistence
    await this.setupCachePersistence();

    return this.client;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      // Try secure store first (most secure)
      const token = await SecureStore.getItemAsync('authToken');
      if (token) return token;

      // Fallback to AsyncStorage for development
      const fallbackToken = await AsyncStorage.getItem('authToken');
      return fallbackToken;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async setupCachePersistence(): Promise<void> {
    try {
      // Load persisted cache data
      const cacheData = await AsyncStorage.getItem('apollo-cache');
      if (cacheData && this.client) {
        const parsedCache = JSON.parse(cacheData);
        this.client.cache.restore(parsedCache);
      }

      // Set up auto-save cache on mutations
      if (this.client) {
        const originalMutate = this.client.mutate.bind(this.client);
        this.client.mutate = async (options) => {
          const result = await originalMutate(options);
          
          // Save cache after successful mutations
          if (result.data && !result.errors) {
            const cacheState = this.client!.cache.extract();
            await AsyncStorage.setItem('apollo-cache', JSON.stringify(cacheState));
          }
          
          return result;
        };
      }
    } catch (error) {
      console.error('Error setting up cache persistence:', error);
    }
  }

  async clearCache(): Promise<void> {
    if (this.client) {
      await this.client.cache.reset();
      await AsyncStorage.removeItem('apollo-cache');
    }
  }

  getClient(): ApolloClient<any> | null {
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.wsClient) {
      this.wsClient.dispose();
      this.wsClient = null;
    }
    
    if (this.client) {
      await this.client.stop();
      this.client = null;
    }
  }

  // Network status monitoring
  async checkNetworkStatus(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  // Offline queue management
  private offlineQueue: any[] = [];

  queueOfflineRequest(operation: any): void {
    this.offlineQueue.push({
      ...operation,
      timestamp: Date.now()
    });
  }

  async processOfflineQueue(): Promise<void> {
    if (!this.client || this.offlineQueue.length === 0) return;

    const isOnline = await this.checkNetworkStatus();
    if (!isOnline) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const operation of queue) {
      try {
        if (operation.operationType === 'mutation') {
          await this.client.mutate(operation);
        } else if (operation.operationType === 'query') {
          await this.client.query(operation);
        }
      } catch (error) {
        console.error('Error processing offline operation:', error);
        // Re-queue failed operations
        this.offlineQueue.push(operation);
      }
    }
  }

  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  clearOfflineQueue(): void {
    this.offlineQueue = [];
  }
}

export const apolloService = new ApolloService();
export default apolloService;