export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  type Agent {
    agent_id: ID!
    name: String!
    platform: String!
    capabilities: [String!]!
    created_at: DateTime!
    updated_at: DateTime!
    metadata: JSON
  }

  type AgentConnection {
    edges: [AgentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type AgentEdge {
    node: Agent!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  input AgentInput {
    name: String!
    platform: String!
    capabilities: [String!]!
    metadata: JSON
  }

  type Query {
    agents(first: Int, after: String, platform: String): AgentConnection!
    agent(id: ID!): Agent
    health: String!
  }

  type Mutation {
    registerAgent(input: AgentInput!): Agent!
    updateAgent(id: ID!, input: AgentInput!): Agent!
    deleteAgent(id: ID!): Boolean!
  }

  type Subscription {
    agentRegistered: Agent!
    agentUpdated: Agent!
  }
`