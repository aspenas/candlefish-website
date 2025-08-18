const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { gql } = require('graphql-tag');

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

  type Query {
    estimates: [Estimate!]!
    estimate(id: ID!): Estimate
  }

  type Mutation {
    createEstimate(input: CreateEstimateInput!): Estimate!
  }

  type Estimate @key(fields: "id") {
    id: ID!
    customerId: ID!
    projectId: ID
    goodPrice: Float!
    betterPrice: Float!
    bestPrice: Float!
    selectedTier: PricingTier!
    status: EstimateStatus!
    createdAt: String!
    updatedAt: String!
  }

  enum PricingTier {
    GOOD
    BETTER
    BEST
  }

  enum EstimateStatus {
    DRAFT
    PENDING
    APPROVED
    REJECTED
    EXPIRED
  }

  input CreateEstimateInput {
    customerId: ID!
    projectId: ID
    goodPrice: Float!
    betterPrice: Float!
    bestPrice: Float!
    selectedTier: PricingTier!
  }
`;

const estimates = [
  {
    id: "1",
    customerId: "101",
    projectId: "201",
    goodPrice: 5000,
    betterPrice: 7500,
    bestPrice: 10000,
    selectedTier: "GOOD",
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "2",
    customerId: "102",
    projectId: "202",
    goodPrice: 8000,
    betterPrice: 12000,
    bestPrice: 16000,
    selectedTier: "BETTER",
    status: "APPROVED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const resolvers = {
  Query: {
    estimates: () => estimates,
    estimate: (_, { id }) => estimates.find(e => e.id === id)
  },
  Mutation: {
    createEstimate: (_, { input }) => {
      const newEstimate = {
        id: String(estimates.length + 1),
        ...input,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      estimates.push(newEstimate);
      return newEstimate;
    }
  },
  Estimate: {
    __resolveReference: (reference) => {
      return estimates.find(e => e.id === reference.id);
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers })
});

startStandaloneServer(server, {
  listen: { port: 4002 }
}).then(({ url }) => {
  console.log(`🚀 Estimates subgraph ready at ${url}`);
});
