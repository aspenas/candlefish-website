import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  from,
  NormalizedCacheObject
} from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { RetryLink } from '@apollo/client/link/retry'
import { createClient } from 'graphql-ws'

// Environment configuration
const GRAPHQL_HTTP_URL = import.meta.env.VITE_GRAPHQL_URL || 'https://api.candlefish.ai/graphql'
const GRAPHQL_WS_URL = import.meta.env.VITE_GRAPHQL_WS_URL || 'wss://api.candlefish.ai/graphql'

// Token storage utilities
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token')
}

export const setAuthToken = (token: string): void => {
  localStorage.setItem('auth_token', token)
}

export const removeAuthToken = (): void => {
  localStorage.removeItem('auth_token')
}

// HTTP Link for queries and mutations
const httpLink = createHttpLink({
  uri: GRAPHQL_HTTP_URL,
  credentials: 'include', // Include cookies for session management
})

// WebSocket Link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_URL,
    connectionParams: () => {
      const token = getAuthToken()
      return {
        Authorization: token ? `Bearer ${token}` : '',
        // Add additional connection params if needed
        'x-client-name': 'analytics-dashboard',
        'x-client-version': '1.0.0',
      }
    },
    keepAlive: 30000, // 30 seconds
    retryAttempts: 5,
    shouldRetry: () => true,
    onConnected: () => {
      console.log('WebSocket connected')
    },
    onDisconnected: () => {
      console.log('WebSocket disconnected')
    },
  })
)

// Auth link to add JWT token to requests
const authLink = setContext((_, { headers }) => {
  const token = getAuthToken()

  return {
    headers: {
      ...headers,
      ...(token && { Authorization: `Bearer ${token}` }),
      'x-client-name': 'analytics-dashboard',
      'x-client-version': '1.0.0',
      'x-request-id': crypto.randomUUID(),
    },
  }
})

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  // Handle GraphQL errors
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      const errorCode = extensions?.code

      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}, Code: ${errorCode}`
      )

      // Handle specific error codes
      switch (errorCode) {
        case 'UNAUTHENTICATED':
        case 'AUTHENTICATION_REQUIRED':
          // Clear invalid token and redirect to login
          removeAuthToken()
          window.location.href = '/login'
          break
        case 'FORBIDDEN':
        case 'ACCESS_DENIED':
          // Show access denied message
          console.warn('Access denied for operation:', operation.operationName)
          break
        case 'RATE_LIMITED':
          // Handle rate limiting
          const retryAfter = extensions?.retryAfter
          if (retryAfter) {
            console.warn(`Rate limited. Retry after: ${retryAfter}ms`)
          }
          break
        default:
          // Log other GraphQL errors
          break
      }
    })
  }

  // Handle network errors
  if (networkError) {
    console.error(`Network error: ${networkError}`)

    // Handle specific network errors
    if ('statusCode' in networkError) {
      const statusCode = networkError.statusCode

      switch (statusCode) {
        case 401:
          // Unauthorized - clear token and redirect
          removeAuthToken()
          window.location.href = '/login'
          break
        case 403:
          // Forbidden - show access denied
          console.warn('Access forbidden')
          break
        case 429:
          // Rate limited
          console.warn('Rate limit exceeded')
          break
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors - show generic error message
          console.error('Server error occurred')
          break
      }
    }
  }
})

// Retry link for failed requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Only retry on network errors or specific GraphQL errors
      if (error?.networkError) {
        const statusCode = 'statusCode' in error.networkError ? error.networkError.statusCode : null
        // Don't retry on authentication errors
        return statusCode !== 401 && statusCode !== 403
      }

      // Don't retry on GraphQL authentication errors
      const hasAuthError = error?.graphQLErrors?.some(
        (err) => err.extensions?.code === 'UNAUTHENTICATED' || err.extensions?.code === 'FORBIDDEN'
      )
      return !hasAuthError
    },
  },
})

// Split link to route to appropriate transport
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
  },
  wsLink,
  from([retryLink, errorLink, authLink, httpLink])
)

// Apollo Client cache configuration
const cache = new InMemoryCache({
  typePolicies: {
    // User type policy
    User: {
      fields: {
        dashboards: {
          merge(existing = [], incoming) {
            return [...existing, ...incoming]
          },
        },
        notifications: {
          merge(existing = [], incoming) {
            return [...existing, ...incoming]
          },
        },
      },
    },

    // Dashboard type policy
    Dashboard: {
      fields: {
        widgets: {
          merge(existing = [], incoming) {
            return incoming // Replace existing widgets with new ones
          },
        },
        sharedWith: {
          merge(existing = [], incoming) {
            return [...existing, ...incoming]
          },
        },
      },
    },

    // Widget type policy
    Widget: {
      fields: {
        data: {
          merge(existing, incoming) {
            return incoming // Always use fresh widget data
          },
        },
      },
    },

    // Organization type policy
    Organization: {
      fields: {
        members: {
          merge(existing = [], incoming) {
            return [...existing, ...incoming]
          },
        },
        dashboards: {
          merge(existing = [], incoming) {
            return [...existing, ...incoming]
          },
        },
      },
    },

    // Connection type policies for pagination
    DashboardConnection: {
      fields: {
        edges: {
          merge(existing = [], incoming, { args, readField }) {
            if (!args?.pagination?.after) {
              // Fresh query, replace all
              return incoming
            }
            // Append for pagination
            return [...existing, ...incoming]
          },
        },
      },
    },

    WidgetConnection: {
      fields: {
        edges: {
          merge(existing = [], incoming, { args }) {
            if (!args?.pagination?.after) {
              return incoming
            }
            return [...existing, ...incoming]
          },
        },
      },
    },

    NotificationConnection: {
      fields: {
        edges: {
          merge(existing = [], incoming, { args }) {
            if (!args?.pagination?.after) {
              return incoming
            }
            return [...existing, ...incoming]
          },
        },
      },
    },

    // Query type policies
    Query: {
      fields: {
        dashboards: {
          keyArgs: ['filter', 'sort'],
          merge(existing, incoming, { args }) {
            if (!args?.pagination?.after) {
              return incoming
            }
            return {
              ...incoming,
              edges: [...(existing?.edges || []), ...incoming.edges],
            }
          },
        },

        myDashboards: {
          keyArgs: ['filter', 'sort'],
          merge(existing, incoming, { args }) {
            if (!args?.pagination?.after) {
              return incoming
            }
            return {
              ...incoming,
              edges: [...(existing?.edges || []), ...incoming.edges],
            }
          },
        },

        notifications: {
          keyArgs: ['filter'],
          merge(existing, incoming, { args }) {
            if (!args?.pagination?.after) {
              return incoming
            }
            return {
              ...incoming,
              edges: [...(existing?.edges || []), ...incoming.edges],
            }
          },
        },
      },
    },
  },

  // Customize cache ID generation
  dataIdFromObject: (object: any) => {
    switch (object.__typename) {
      case 'User':
      case 'Dashboard':
      case 'Widget':
      case 'Organization':
      case 'DataSource':
      case 'Metric':
      case 'Alert':
      case 'Notification':
        return `${object.__typename}:${object.id}`
      default:
        return undefined
    }
  },
})

// Create Apollo Client instance
export const apolloClient: ApolloClient<NormalizedCacheObject> = new ApolloClient({
  link: splitLink,
  cache,
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
  connectToDevTools: process.env.NODE_ENV === 'development',
  name: 'analytics-dashboard',
  version: '1.0.0',
})

// Helper function to clear cache on logout
export const clearApolloCache = async (): Promise<void> => {
  await apolloClient.clearStore()
  removeAuthToken()
}

// Helper function to refresh authentication
export const refreshAuth = async (): Promise<void> => {
  try {
    await apolloClient.resetStore()
  } catch (error) {
    console.error('Failed to refresh authentication:', error)
    removeAuthToken()
    window.location.href = '/login'
  }
}

// Subscription event handlers
export const subscriptionEventHandlers = {
  onDashboardUpdated: (callback: (data: any) => void) => {
    return apolloClient.subscribe({
      query: require('../graphql/subscriptions/dashboard').DASHBOARD_UPDATED_SUBSCRIPTION,
    }).subscribe({
      next: callback,
      error: (error) => console.error('Dashboard subscription error:', error),
    })
  },

  onNotificationReceived: (callback: (data: any) => void) => {
    return apolloClient.subscribe({
      query: require('../graphql/subscriptions/notification').NOTIFICATION_RECEIVED_SUBSCRIPTION,
    }).subscribe({
      next: callback,
      error: (error) => console.error('Notification subscription error:', error),
    })
  },
}

export default apolloClient
