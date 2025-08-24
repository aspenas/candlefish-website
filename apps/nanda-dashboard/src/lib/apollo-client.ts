import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'

// HTTP link for GraphQL
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'https://api.candlefish.ai/graphql',
})

// Auth link for JWT tokens
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('nanda-auth-token')

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  }
})

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Agent: {
        keyFields: ['agent_id'],
      },
      AgentFact: {
        keyFields: ['agent_id', 'fact_id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'ignore',
    },
    query: {
      errorPolicy: 'all',
    },
  },
})
