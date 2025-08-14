import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  from,
  ApolloLink,
  Observable
} from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { RetryLink } from '@apollo/client/link/retry'

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: process.env.NODE_ENV === 'production'
    ? 'https://api.paintbox.candlefish.ai/graphql'
    : 'http://localhost:4000/graphql',
})

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: process.env.NODE_ENV === 'production'
      ? 'wss://api.paintbox.candlefish.ai/graphql'
      : 'ws://localhost:4000/graphql',
    connectionParams: () => {
      const token = localStorage.getItem('authToken')
      return {
        authorization: token ? `Bearer ${token}` : '',
      }
    },
  })
)

// Auth link to add authentication headers
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken')

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-client-name': 'apollo-federation-ui',
      'x-client-version': '1.0.0',
    }
  }
})

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        extensions
      )

      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('authToken')
        window.location.href = '/login'
      }
    })
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`)

    // Handle network connectivity issues
    if (networkError.message.includes('fetch')) {
      // Show offline indicator
      document.dispatchEvent(new CustomEvent('network-status', {
        detail: { online: false }
      }))
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
    max: 5,
    retryIf: (error, _operation) => !!error,
  },
})

// Split link to route queries/mutations via HTTP and subscriptions via WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,
  httpLink,
)

// Combine all links
const link = from([
  errorLink,
  retryLink,
  authLink,
  splitLink,
])

// Cache configuration with optimistic updates and field policies
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        estimates: {
          keyArgs: ['filter'],
          merge(existing, incoming, { args }) {
            if (args?.offset === 0) {
              return incoming
            }
            return {
              ...incoming,
              edges: [...(existing?.edges || []), ...(incoming?.edges || [])],
            }
          },
        },
      },
    },
    Estimate: {
      fields: {
        status: {
          merge: (existing, incoming) => incoming,
        },
        updatedAt: {
          merge: (existing, incoming) => incoming,
        },
      },
    },
  },
})

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link,
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
})

// Network status monitoring
export const networkStatusLink = new ApolloLink((operation, forward) => {
  return new Observable(observer => {
    const subscription = forward(operation).subscribe({
      next: result => {
        document.dispatchEvent(new CustomEvent('network-status', {
          detail: { online: true }
        }))
        observer.next(result)
      },
      error: observer.error.bind(observer),
      complete: observer.complete.bind(observer),
    })

    return () => subscription.unsubscribe()
  })
})

// Helper function to clear cache on logout
export const clearApolloCache = () => {
  apolloClient.clearStore()
}

// Helper function to refetch all active queries
export const refetchAllQueries = () => {
  apolloClient.refetchQueries({
    include: 'active',
  })
}
