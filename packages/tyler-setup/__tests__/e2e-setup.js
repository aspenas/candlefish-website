/**
 * Tyler Setup Platform - E2E Test Setup
 * End-to-end testing configuration and utilities
 */

const { spawn } = require('child_process');
const path = require('path');

// Global test timeout for E2E tests
jest.setTimeout(60000);

let serverProcess;
let frontendProcess;

// Setup test servers before all E2E tests
beforeAll(async () => {
  console.log('Starting E2E test environment...');

  // Start backend server
  await startBackendServer();

  // Start frontend dev server
  await startFrontendServer();

  // Wait for servers to be ready
  await waitForServers();
});

// Cleanup after all E2E tests
afterAll(async () => {
  console.log('Cleaning up E2E test environment...');

  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }

  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
  }

  // Clean up test data
  await cleanupTestData();
});

async function startBackendServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../backend');

    serverProcess = spawn('npm', ['run', 'test:server'], {
      cwd: serverPath,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '4000',
        GRAPHQL_ENDPOINT: 'http://localhost:4000/graphql',
        JWT_SECRET: 'test-jwt-secret',
        DATABASE_URL: 'postgresql://test:test@localhost:5433/tyler_setup_test'
      },
      stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server ready at')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    serverProcess.on('error', reject);

    // Timeout after 30 seconds
    setTimeout(() => reject(new Error('Server startup timeout')), 30000);
  });
}

async function startFrontendServer() {
  return new Promise((resolve, reject) => {
    const frontendPath = path.join(__dirname, '../frontend');

    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: frontendPath,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '3000',
        VITE_GRAPHQL_URL: 'http://localhost:4000/graphql',
        VITE_WS_URL: 'ws://localhost:4000/graphql'
      },
      stdio: 'pipe'
    });

    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('ready in')) {
        resolve();
      }
    });

    frontendProcess.stderr.on('data', (data) => {
      console.error('Frontend error:', data.toString());
    });

    frontendProcess.on('error', reject);

    // Timeout after 30 seconds
    setTimeout(() => reject(new Error('Frontend startup timeout')), 30000);
  });
}

async function waitForServers() {
  console.log('Waiting for servers to be ready...');

  // Wait for backend
  await waitForUrl('http://localhost:4000/health');

  // Wait for frontend
  await waitForUrl('http://localhost:3000');

  console.log('Servers are ready!');
}

async function waitForUrl(url, timeout = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Server not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Timeout waiting for ${url}`);
}

async function cleanupTestData() {
  try {
    // Clean up test database
    const response = await fetch('http://localhost:4000/test/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('Failed to cleanup test data');
    }
  } catch (error) {
    console.warn('Error during cleanup:', error.message);
  }
}

// E2E test utilities
global.E2E_BASE_URL = 'http://localhost:3000';
global.GRAPHQL_URL = 'http://localhost:4000/graphql';

// Helper to create test user
global.createE2EUser = async (userData = {}) => {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    ...userData
  };

  const response = await fetch(`${global.GRAPHQL_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `
        mutation CreateTestUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            firstName
            lastName
          }
        }
      `,
      variables: { input: defaultUser }
    })
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(`Failed to create test user: ${result.errors[0].message}`);
  }

  return {
    ...result.data.createUser,
    password: defaultUser.password
  };
};

// Helper to login test user
global.loginE2EUser = async (email, password) => {
  const response = await fetch(`${global.GRAPHQL_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
            user {
              id
              email
              firstName
              lastName
            }
          }
        }
      `,
      variables: { email, password }
    })
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(`Failed to login: ${result.errors[0].message}`);
  }

  return result.data.login;
};

// Helper to create test organization
global.createE2EOrganization = async (orgData = {}, token) => {
  const defaultOrg = {
    name: `Test Organization ${Date.now()}`,
    plan: 'PREMIUM',
    ...orgData
  };

  const response = await fetch(`${global.GRAPHQL_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: `
        mutation CreateOrganization($input: CreateOrganizationInput!) {
          createOrganization(input: $input) {
            id
            name
            plan
          }
        }
      `,
      variables: { input: defaultOrg }
    })
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(`Failed to create organization: ${result.errors[0].message}`);
  }

  return result.data.createOrganization;
};

// Helper to wait for element to be visible
global.waitForElement = async (selector, timeout = 10000) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element && element.offsetParent !== null) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Element ${selector} not found within ${timeout}ms`);
};

// Helper to wait for text to appear
global.waitForText = async (text, timeout = 10000) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (document.body.textContent.includes(text)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Text "${text}" not found within ${timeout}ms`);
};
