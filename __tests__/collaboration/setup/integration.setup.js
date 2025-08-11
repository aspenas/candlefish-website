/**
 * Integration Test Setup for Collaboration Tests
 * Sets up real database connections, GraphQL server, and WebSocket connections
 */

const { Client } = require('pg');
const Redis = require('ioredis');
const { ApolloServer } = require('apollo-server-express');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const WebSocket = require('ws');
const express = require('express');
const http = require('http');

// Import GraphQL schema and resolvers
const typeDefs = require('../../../graphql/schema');
const resolvers = require('../../../graphql/resolvers');

let testServer;
let apolloServer;
let dbClient;
let redisClient;
let wsClient;

// Setup before all integration tests
beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...');

  // Connect to test database
  dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await dbClient.connect();

  // Connect to Redis
  redisClient = new Redis(process.env.REDIS_URL);

  // Setup GraphQL server
  await setupGraphQLServer();

  // Setup WebSocket client for testing
  setupWebSocketClient();

  console.log('✅ Integration test environment ready');
});

// Cleanup after all integration tests
afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');

  if (wsClient) {
    wsClient.terminate();
  }

  if (apolloServer) {
    await apolloServer.stop();
  }

  if (testServer) {
    testServer.close();
  }

  if (redisClient) {
    await redisClient.quit();
  }

  if (dbClient) {
    await dbClient.end();
  }

  console.log('✅ Integration test cleanup completed');
});

// Clean up between tests
beforeEach(async () => {
  // Clear test data between tests
  await clearTestData();

  // Reset WebSocket connection if needed
  if (wsClient && wsClient.readyState !== WebSocket.OPEN) {
    setupWebSocketClient();
  }
});

async function setupGraphQLServer() {
  const app = express();
  testServer = http.createServer(app);

  // Create Apollo Server with test configuration
  apolloServer = new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
    context: ({ req }) => ({
      req,
      db: dbClient,
      redis: redisClient,
      user: req.user, // Will be set by auth middleware in tests
    }),
    plugins: [
      {
        requestDidStart() {
          return {
            willSendResponse(requestContext) {
              // Add test headers
              requestContext.response.http.headers.set('x-test-environment', 'true');
            },
          };
        },
      },
    ],
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: '/graphql' });

  // Start server
  await new Promise((resolve) => {
    testServer.listen(parseInt(process.env.GRAPHQL_PORT), resolve);
  });

  console.log(`GraphQL server started on http://localhost:${process.env.GRAPHQL_PORT}/graphql`);
}

function setupWebSocketClient() {
  wsClient = new WebSocket(`ws://localhost:${process.env.WEBSOCKET_PORT}`);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, 5000);

    wsClient.on('open', () => {
      clearTimeout(timeout);
      console.log('WebSocket client connected');
      resolve();
    });

    wsClient.on('error', (error) => {
      clearTimeout(timeout);
      console.error('WebSocket client error:', error);
      reject(error);
    });
  });
}

async function clearTestData() {
  // Clear database tables in correct order
  const tables = [
    'operations',
    'presence_sessions',
    'comments',
    'document_versions',
    'documents',
    'users',
    'organizations'
  ];

  for (const table of tables) {
    await dbClient.query(`DELETE FROM ${table} WHERE true`);
  }

  // Clear Redis test data
  const keys = await redisClient.keys('test:*');
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
}

// Test utilities for integration tests
global.integrationTestUtils = {
  // Database helpers
  db: {
    query: (sql, params) => dbClient.query(sql, params),

    async createTestOrganization(data = {}) {
      const result = await dbClient.query(
        `INSERT INTO organizations (name, slug, plan)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [
          data.name || 'Test Org',
          data.slug || 'test-org',
          data.plan || 'FREE'
        ]
      );
      return result.rows[0];
    },

    async createTestUser(data = {}) {
      const result = await dbClient.query(
        `INSERT INTO users (email, organization_id, role)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [
          data.email || 'test@example.com',
          data.organizationId || null,
          data.role || 'USER'
        ]
      );
      return result.rows[0];
    },

    async createTestDocument(data = {}) {
      const result = await dbClient.query(
        `INSERT INTO documents (name, type, content, owner_id, organization_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          data.name || 'Test Document',
          data.type || 'TEXT_DOCUMENT',
          JSON.stringify(data.content || {}),
          data.ownerId,
          data.organizationId
        ]
      );
      return result.rows[0];
    },
  },

  // Redis helpers
  redis: {
    get: (key) => redisClient.get(key),
    set: (key, value) => redisClient.set(key, value),
    publish: (channel, message) => redisClient.publish(channel, message),
    subscribe: (channel) => {
      const subscriber = redisClient.duplicate();
      subscriber.subscribe(channel);
      return subscriber;
    },
  },

  // GraphQL helpers
  graphql: {
    async query(query, variables = {}, context = {}) {
      const response = await fetch(`http://localhost:${process.env.GRAPHQL_PORT}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...context.headers,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      return response.json();
    },

    async mutate(mutation, variables = {}, context = {}) {
      return this.query(mutation, variables, context);
    },
  },

  // WebSocket helpers
  websocket: {
    send: (message) => {
      if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify(message));
      } else {
        throw new Error('WebSocket not connected');
      }
    },

    waitForMessage: (timeout = 5000) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('WebSocket message timeout'));
        }, timeout);

        const handler = (data) => {
          clearTimeout(timer);
          wsClient.removeListener('message', handler);
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            resolve(data);
          }
        };

        wsClient.on('message', handler);
      });
    },
  },

  // Test data helpers
  async setupCollaborationScenario() {
    // Create organization
    const org = await this.db.createTestOrganization();

    // Create users
    const user1 = await this.db.createTestUser({
      email: 'user1@example.com',
      organizationId: org.id,
      role: 'USER',
    });

    const user2 = await this.db.createTestUser({
      email: 'user2@example.com',
      organizationId: org.id,
      role: 'USER',
    });

    // Create document
    const document = await this.db.createTestDocument({
      name: 'Collaboration Test Document',
      ownerId: user1.id,
      organizationId: org.id,
      content: {
        format: 'RICH_TEXT',
        blocks: [
          {
            id: 'block-1',
            type: 'PARAGRAPH',
            content: { text: 'Initial content' },
          },
        ],
      },
    });

    return { org, user1, user2, document };
  },
};
