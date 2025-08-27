import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// HTTP link for queries and mutations
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql',
  credentials: 'include',
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: import.meta.env.VITE_WS_URL || 'ws://localhost:4000/graphql',
    connectionParams: () => {
      const token = localStorage.getItem('auth_token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    retryAttempts: 5,
    shouldRetry: () => true,
  })
);

// Split links based on operation type
const splitLink = split(
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

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          securityEvents: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
});

export default apolloClient;