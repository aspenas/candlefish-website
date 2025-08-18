#!/bin/bash

# Apollo GraphOS Local Setup Script
set -e

echo "🚀 Setting up Apollo GraphOS for Paintbox..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✔${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✖${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the apollo-graphos directory"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file..."
    cat > .env << 'EOF'
# Apollo GraphOS Configuration
APOLLO_KEY=user:gh.a8534bae-93f6-433e-9f32-d7e4808f467c:hT3f6BaKm7EsguGwmmulRQ
APOLLO_GRAPH_REF=paintbox@main

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/paintbox_estimates
REDIS_URL=redis://localhost:6379

# API Configuration
SALESFORCE_CLIENT_ID=placeholder
SALESFORCE_CLIENT_SECRET=placeholder
SALESFORCE_USERNAME=placeholder
SALESFORCE_PASSWORD=placeholder
COMPANYCAM_API_TOKEN=placeholder

# Development
NODE_ENV=development
PORT=4100
EOF
fi

# Install Rover CLI if not installed
if ! command -v rover &> /dev/null; then
    print_status "Installing Rover CLI..."
    curl -sSL https://rover.apollo.dev/nix/latest > /tmp/rover-install.sh
    bash /tmp/rover-install.sh --force
    export PATH="$HOME/.rover/bin:$PATH"
else
    print_status "Rover CLI already installed"
    export PATH="$HOME/.rover/bin:$PATH"
fi

# Create a simple Node.js estimates service
print_status "Creating simple estimates service..."
mkdir -p simple-estimates
cat > simple-estimates/index.js << 'EOF'
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
EOF

# Create package.json for simple service
cat > simple-estimates/package.json << 'EOF'
{
  "name": "estimates-subgraph",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@apollo/server": "^4.9.5",
    "@apollo/subgraph": "^2.5.7",
    "graphql": "^16.8.1",
    "graphql-tag": "^2.12.6"
  }
}
EOF

# Install dependencies for simple service
print_status "Installing dependencies for estimates service..."
cd simple-estimates
npm install > /dev/null 2>&1
cd ..

# Start the estimates service
print_status "Starting estimates subgraph..."
cd simple-estimates
nohup npm start > ../estimates.log 2>&1 &
ESTIMATES_PID=$!
cd ..

# Wait for service to start
sleep 3

# Create supergraph config
print_status "Creating supergraph configuration..."
cat > supergraph-local.yaml << 'EOF'
federation_version: 2
subgraphs:
  estimates:
    routing_url: http://localhost:4002
    schema:
      subgraph_url: http://localhost:4002
EOF

# Compose the supergraph schema
print_status "Composing supergraph schema..."
rover supergraph compose --config supergraph-local.yaml > router/composed-schema.graphql 2>/dev/null || true

# Download and run Apollo Router
print_status "Starting Apollo Router..."
if [ ! -f "router" ]; then
    print_status "Downloading Apollo Router..."
    curl -sSL https://router.apollo.dev/download/nix/latest | sh
    chmod +x router
fi

# Create router config
cat > router-local.yaml << 'EOF'
supergraph:
  listen: 0.0.0.0:4100
  path: /
  introspection: true

cors:
  origins:
    - http://localhost:3000
    - http://localhost:4100

telemetry:
  apollo:
    endpoint: null
EOF

# Start the router
print_status "Starting Apollo Router on port 4100..."
./router --config router-local.yaml --supergraph router/composed-schema.graphql > router.log 2>&1 &
ROUTER_PID=$!

# Wait for router to start
sleep 5

# Test the setup
print_status "Testing GraphQL endpoint..."
curl -s -X POST http://localhost:4100 \
  -H "Content-Type: application/json" \
  -d '{"query":"{ estimates { id customerId goodPrice } }"}' | python3 -m json.tool > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_status "Apollo GraphOS is running successfully!"
    echo ""
    echo "📊 Access Points:"
    echo "  - GraphQL Endpoint: http://localhost:4100"
    echo "  - Apollo Studio Explorer: https://studio.apollographql.com/sandbox/explorer"
    echo ""
    echo "💡 Quick Test:"
    echo "  Run this query in Apollo Studio Explorer:"
    echo "  query { estimates { id customerId goodPrice betterPrice bestPrice } }"
    echo ""
    echo "🛑 To stop services:"
    echo "  kill $ESTIMATES_PID $ROUTER_PID"
    echo ""
    print_status "Setup complete! Apollo GraphOS is ready for Paintbox integration."
else
    print_error "Failed to connect to GraphQL endpoint"
    echo "Check logs: estimates.log and router.log"
fi
