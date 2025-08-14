#!/bin/bash

# Start GraphQL server without Temporal
# This script starts only the GraphQL API for development

set -e

echo "🔧 Setting up GraphQL-only environment..."

# Set basic environment variables
export NODE_ENV="${NODE_ENV:-development}"
export GRAPHQL_PORT="${GRAPHQL_PORT:-4000}"
export PORT="${PORT:-4000}"

# Database configuration (using existing DATABASE_URL from secrets)
export DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id candlefish/database-url --query SecretString --output text 2>/dev/null || echo "postgresql://postgres:postgres@localhost:5432/paintbox")

echo "📊 Environment variables set:"
echo "  - PORT: $PORT"
echo "  - NODE_ENV: $NODE_ENV"
echo "  - DATABASE_URL: [configured]"

# Create minimal GraphQL server
cat > /tmp/graphql-server.js << 'EOF'
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const bodyParser = require('body-parser');

const typeDefs = `
  type Query {
    health: String
    projects: [Project]
    project(id: ID!): Project
  }

  type Mutation {
    createProject(input: ProjectInput!): Project
  }

  type Project {
    id: ID!
    name: String!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  input ProjectInput {
    name: String!
    description: String
  }
`;

const resolvers = {
  Query: {
    health: () => 'GraphQL server is running!',
    projects: () => [
      { id: '1', name: 'Paintbox Project 1', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: '2', name: 'Paintbox Project 2', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ],
    project: (_, { id }) => ({
      id,
      name: `Project ${id}`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },
  Mutation: {
    createProject: (_, { input }) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: input.name,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 4000;

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    playground: true
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    bodyParser.json(),
    expressMiddleware(server)
  );

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`);
    console.log(`🏥 Health check at http://localhost:${PORT}/health`);
  });
}

startServer().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});
EOF

# Check if necessary packages are installed globally or locally
if [ -f "/Users/patricksmith/candlefish-ai/candlefish-temporal-platform/node_modules/.bin/ts-node" ]; then
    echo "✅ Using local TypeScript environment"
    cd /Users/patricksmith/candlefish-ai/candlefish-temporal-platform
    # Try to start with GraphQL-only mode
    SKIP_TEMPORAL=true npm run start
else
    echo "🚀 Starting minimal GraphQL server..."
    cd /tmp
    npm init -y > /dev/null 2>&1
    npm install express @apollo/server @apollo/server/express4 cors body-parser > /dev/null 2>&1
    node graphql-server.js
fi
