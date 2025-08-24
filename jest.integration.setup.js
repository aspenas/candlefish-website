import { server } from './__tests__/__mocks__/server';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Stop MSW server after all tests
afterAll(() => {
  server.close();
});

// Global test timeout for integration tests
jest.setTimeout(60000);

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/candlefish_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Mock external services
global.fetch = require('node-fetch');

// Database test utilities
export const setupTestDatabase = async () => {
  // Database setup logic would go here
  console.log('Setting up test database...');
};

export const teardownTestDatabase = async () => {
  // Database cleanup logic would go here
  console.log('Tearing down test database...');
};

// Apollo Client test utilities for integration testing
export const createTestApolloClient = () => {
  const { ApolloClient, InMemoryCache, createHttpLink } = require('@apollo/client');
  const { setContext } = require('@apollo/client/link/context');
  
  const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/graphql',
  });

  const authLink = setContext((_, { headers }) => {
    const token = global.testAuthToken;
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      }
    };
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
      addTypename: false,
    }),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });
};

// Test authentication utilities
export const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    id: 'test-user-id',
    email: 'test@candlefish.ai',
    name: 'Test User',
    role: 'USER',
    organizationId: 'test-org-id',
    ...overrides,
  };
  
  // Mock JWT token for testing
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(defaultUser, process.env.JWT_SECRET, { expiresIn: '1h' });
  global.testAuthToken = token;
  
  return { user: defaultUser, token };
};

// WebSocket testing utilities
export const createTestWebSocketConnection = () => {
  const WebSocket = require('ws');
  const wsUrl = process.env.WS_URL || 'ws://localhost:3001/graphql';
  
  return new WebSocket(wsUrl, 'graphql-ws');
};

// Real-time subscription testing
export const subscriptionTester = {
  async testSubscription(client, subscription, expectedUpdates) {
    return new Promise((resolve, reject) => {
      let updateCount = 0;
      const receivedUpdates = [];
      
      const observable = client.subscribe({ query: subscription });
      
      const subscription_handle = observable.subscribe({
        next: (result) => {
          receivedUpdates.push(result);
          updateCount++;
          
          if (updateCount >= expectedUpdates) {
            subscription_handle.unsubscribe();
            resolve(receivedUpdates);
          }
        },
        error: (err) => {
          subscription_handle.unsubscribe();
          reject(err);
        }
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        subscription_handle.unsubscribe();
        reject(new Error('Subscription test timed out'));
      }, 10000);
    });
  }
};

// API endpoint testing utilities
export const apiTestUtils = {
  async testEndpoint(method, path, data = {}, headers = {}) {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = `${baseURL}${path}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    if (data && Object.keys(data).length > 0) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    const responseData = await response.json();
    
    return {
      status: response.status,
      data: responseData,
      headers: response.headers,
    };
  },
  
  async testGraphQL(query, variables = {}, headers = {}) {
    return this.testEndpoint('POST', '/graphql', {
      query,
      variables,
    }, headers);
  }
};

// Global setup and teardown hooks
beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});
