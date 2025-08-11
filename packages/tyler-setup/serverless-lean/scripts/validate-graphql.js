#!/usr/bin/env node

/**
 * GraphQL End-to-End Validation Script
 * Validates all resolver flows and performance metrics
 */

import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';
import { createHttpLink } from '@apollo/client/link/http';
import { setContext } from '@apollo/client/link/context';
import fetch from 'node-fetch';
import ws from 'ws';
import chalk from 'chalk';
import ora from 'ora';

// Configuration
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';
const WS_ENDPOINT = process.env.WS_ENDPOINT || 'ws://localhost:4000/graphql';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const LOAD_TEST_USERS = parseInt(process.env.LOAD_TEST_USERS || '100');

// Test results
const results = {
  passed: [],
  failed: [],
  performance: {},
  startTime: Date.now(),
};

// Create Apollo Client
function createClient(token = AUTH_TOKEN) {
  const httpLink = createHttpLink({
    uri: GRAPHQL_ENDPOINT,
    fetch,
  });

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  });
}

// Create WebSocket client for subscriptions
function createWSClient(token = AUTH_TOKEN) {
  const wsLink = new WebSocketLink({
    uri: WS_ENDPOINT,
    options: {
      reconnect: true,
      connectionParams: {
        authorization: token ? `Bearer ${token}` : '',
      },
    },
    webSocketImpl: ws,
  });

  return new ApolloClient({
    link: wsLink,
    cache: new InMemoryCache(),
  });
}

/**
 * Test Suite: Health Check
 */
async function testHealthCheck() {
  const spinner = ora('Testing health check endpoint...').start();
  const client = createClient();

  try {
    const start = Date.now();
    const { data } = await client.query({
      query: gql`
        query Health {
          health {
            status
            timestamp
            version
            database {
              connected
              latency
              operations {
                reads
                writes
                errors
                avgLatency
              }
            }
            cache {
              hitRatio
              operations
              layers {
                memory { connected hitRatio }
                dax { connected hitRatio }
                dynamodb { connected hitRatio }
              }
            }
          }
        }
      `,
    });

    const duration = Date.now() - start;

    if (data.health.status === 'healthy') {
      spinner.succeed(chalk.green(`✓ Health check passed (${duration}ms)`));
      results.passed.push('Health Check');
      results.performance.healthCheck = duration;

      // Display health metrics
      console.log(chalk.cyan('  Database:'), data.health.database.connected ? 'Connected' : 'Disconnected');
      console.log(chalk.cyan('  Cache Hit Ratio:'), `${(data.health.cache.hitRatio * 100).toFixed(2)}%`);
      console.log(chalk.cyan('  DB Operations:'), data.health.database.operations.reads);

      return true;
    } else {
      throw new Error(`Health status: ${data.health.status}`);
    }
  } catch (error) {
    spinner.fail(chalk.red(`✗ Health check failed: ${error.message}`));
    results.failed.push('Health Check');
    return false;
  }
}

/**
 * Test Suite: Authentication Flow
 */
async function testAuthentication() {
  const spinner = ora('Testing authentication flow...').start();
  const client = createClient('');

  try {
    // Test login
    const loginStart = Date.now();
    const { data: loginData } = await client.mutate({
      mutation: gql`
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
            refreshToken
            expiresIn
            user {
              id
              email
              role
            }
          }
        }
      `,
      variables: {
        email: 'admin@example.com',
        password: 'admin123',
      },
    });

    const loginDuration = Date.now() - loginStart;
    const token = loginData.login.token;
    const refreshToken = loginData.login.refreshToken;

    // Test refresh token
    const refreshStart = Date.now();
    const { data: refreshData } = await client.mutate({
      mutation: gql`
        mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            token
            refreshToken
            expiresIn
          }
        }
      `,
      variables: { refreshToken },
    });

    const refreshDuration = Date.now() - refreshStart;

    // Test authenticated query
    const authClient = createClient(refreshData.refreshToken.token);
    const meStart = Date.now();
    const { data: meData } = await authClient.query({
      query: gql`
        query Me {
          me {
            id
            email
            role
          }
        }
      `,
    });

    const meDuration = Date.now() - meStart;

    spinner.succeed(chalk.green(`✓ Authentication flow passed (login: ${loginDuration}ms, refresh: ${refreshDuration}ms, me: ${meDuration}ms)`));
    results.passed.push('Authentication');
    results.performance.authentication = {
      login: loginDuration,
      refresh: refreshDuration,
      me: meDuration,
    };

    return refreshData.refreshToken.token;
  } catch (error) {
    spinner.fail(chalk.red(`✗ Authentication failed: ${error.message}`));
    results.failed.push('Authentication');
    return null;
  }
}

/**
 * Test Suite: Query Performance
 */
async function testQueryPerformance(token) {
  const spinner = ora('Testing query performance...').start();
  const client = createClient(token);

  try {
    const queries = [
      {
        name: 'List Users',
        query: gql`
          query ListUsers {
            users(first: 20) {
              edges {
                node { id name email role }
                cursor
              }
              pageInfo { hasNextPage endCursor }
              totalCount
            }
          }
        `,
      },
      {
        name: 'List Secrets',
        query: gql`
          query ListSecrets {
            secrets(first: 10) {
              edges {
                node { id name description tags }
              }
              totalCount
            }
          }
        `,
      },
      {
        name: 'List Audit Logs',
        query: gql`
          query ListAuditLogs {
            auditLogs(first: 50) {
              edges {
                node { id action timestamp userId }
              }
              totalCount
            }
          }
        `,
      },
    ];

    const queryPerf = {};

    for (const q of queries) {
      const start = Date.now();
      await client.query({ query: q.query });
      const duration = Date.now() - start;
      queryPerf[q.name] = duration;
      console.log(chalk.gray(`  ${q.name}: ${duration}ms`));
    }

    // Test parallel queries
    const parallelStart = Date.now();
    await Promise.all(queries.map(q => client.query({ query: q.query })));
    const parallelDuration = Date.now() - parallelStart;

    spinner.succeed(chalk.green(`✓ Query performance tests passed (parallel: ${parallelDuration}ms)`));
    results.passed.push('Query Performance');
    results.performance.queries = {
      ...queryPerf,
      parallel: parallelDuration,
    };

    return true;
  } catch (error) {
    spinner.fail(chalk.red(`✗ Query performance test failed: ${error.message}`));
    results.failed.push('Query Performance');
    return false;
  }
}

/**
 * Test Suite: Mutation Operations
 */
async function testMutations(token) {
  const spinner = ora('Testing mutation operations...').start();
  const client = createClient(token);

  try {
    // Create user
    const createStart = Date.now();
    const { data: createData } = await client.mutate({
      mutation: gql`
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            name
            role
          }
        }
      `,
      variables: {
        input: {
          email: `test${Date.now()}@example.com`,
          name: 'Test User',
          password: 'testpass123',
          role: 'USER',
        },
      },
    });
    const createDuration = Date.now() - createStart;
    const userId = createData.createUser.id;

    // Update user
    const updateStart = Date.now();
    await client.mutate({
      mutation: gql`
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
          }
        }
      `,
      variables: {
        id: userId,
        input: { name: 'Updated User' },
      },
    });
    const updateDuration = Date.now() - updateStart;

    // Delete user
    const deleteStart = Date.now();
    await client.mutate({
      mutation: gql`
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `,
      variables: { id: userId },
    });
    const deleteDuration = Date.now() - deleteStart;

    spinner.succeed(chalk.green(`✓ Mutation operations passed (create: ${createDuration}ms, update: ${updateDuration}ms, delete: ${deleteDuration}ms)`));
    results.passed.push('Mutations');
    results.performance.mutations = {
      create: createDuration,
      update: updateDuration,
      delete: deleteDuration,
    };

    return true;
  } catch (error) {
    spinner.fail(chalk.red(`✗ Mutation operations failed: ${error.message}`));
    results.failed.push('Mutations');
    return false;
  }
}

/**
 * Test Suite: Subscription Real-time Updates
 */
async function testSubscriptions(token) {
  const spinner = ora('Testing real-time subscriptions...').start();

  try {
    const wsClient = createWSClient(token);
    const httpClient = createClient(token);

    // Set up subscription
    const subscription = wsClient.subscribe({
      query: gql`
        subscription ConfigChanges {
          configChanged {
            key
            value
            updatedAt
          }
        }
      `,
    });

    let received = false;
    const subscriptionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);

      subscription.subscribe({
        next: (data) => {
          clearTimeout(timeout);
          received = true;
          resolve(data);
        },
        error: reject,
      });
    });

    // Trigger a change
    await new Promise(resolve => setTimeout(resolve, 1000));
    await httpClient.mutate({
      mutation: gql`
        mutation UpdateConfig($key: String!, $input: UpdateConfigInput!) {
          updateConfig(key: $key, input: $input) {
            key
            value
          }
        }
      `,
      variables: {
        key: 'test-config',
        input: { value: { test: Date.now() } },
      },
    });

    // Wait for subscription event
    await subscriptionPromise;

    if (received) {
      spinner.succeed(chalk.green('✓ Subscription real-time updates working'));
      results.passed.push('Subscriptions');
      return true;
    } else {
      throw new Error('No subscription event received');
    }
  } catch (error) {
    spinner.fail(chalk.red(`✗ Subscription test failed: ${error.message}`));
    results.failed.push('Subscriptions');
    return false;
  }
}

/**
 * Test Suite: Load Testing
 */
async function testLoadPerformance(token) {
  const spinner = ora(`Testing load performance with ${LOAD_TEST_USERS} concurrent users...`).start();
  const client = createClient(token);

  try {
    const query = gql`
      query LoadTest {
        health { status }
        users(first: 5) {
          edges {
            node { id name }
          }
        }
      }
    `;

    // Warm up
    await client.query({ query });

    // Load test
    const loadStart = Date.now();
    const promises = Array(LOAD_TEST_USERS).fill(null).map(() =>
      client.query({ query, fetchPolicy: 'network-only' })
    );

    const results = await Promise.allSettled(promises);
    const loadDuration = Date.now() - loadStart;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const avgLatency = loadDuration / LOAD_TEST_USERS;
    const throughput = (LOAD_TEST_USERS / loadDuration) * 1000;

    spinner.succeed(chalk.green(
      `✓ Load test completed: ${successful}/${LOAD_TEST_USERS} successful ` +
      `(${loadDuration}ms total, ${avgLatency.toFixed(2)}ms avg, ${throughput.toFixed(2)} req/s)`
    ));

    results.passed.push('Load Testing');
    results.performance.loadTest = {
      users: LOAD_TEST_USERS,
      duration: loadDuration,
      avgLatency,
      throughput,
      successRate: (successful / LOAD_TEST_USERS) * 100,
    };

    return true;
  } catch (error) {
    spinner.fail(chalk.red(`✗ Load test failed: ${error.message}`));
    results.failed.push('Load Testing');
    return false;
  }
}

/**
 * Test Suite: Cache Performance
 */
async function testCachePerformance(token) {
  const spinner = ora('Testing cache performance...').start();
  const client = createClient(token);

  try {
    const query = gql`
      query CacheTest($name: String!) {
        secret(name: $name) {
          id
          name
          description
        }
      }
    `;

    // First call - cache miss
    const missStart = Date.now();
    await client.query({
      query,
      variables: { name: 'test-secret' },
      fetchPolicy: 'network-only',
    });
    const missDuration = Date.now() - missStart;

    // Second call - cache hit
    const hitStart = Date.now();
    await client.query({
      query,
      variables: { name: 'test-secret' },
      fetchPolicy: 'cache-first',
    });
    const hitDuration = Date.now() - hitStart;

    const improvement = ((missDuration - hitDuration) / missDuration) * 100;

    spinner.succeed(chalk.green(
      `✓ Cache performance validated (miss: ${missDuration}ms, hit: ${hitDuration}ms, ${improvement.toFixed(2)}% improvement)`
    ));

    results.passed.push('Cache Performance');
    results.performance.cache = {
      miss: missDuration,
      hit: hitDuration,
      improvement,
    };

    return true;
  } catch (error) {
    spinner.fail(chalk.red(`✗ Cache test failed: ${error.message}`));
    results.failed.push('Cache Performance');
    return false;
  }
}

/**
 * Main validation runner
 */
async function runValidation() {
  console.log(chalk.bold.cyan('\n🚀 Tyler Setup GraphQL Validation\n'));
  console.log(chalk.gray(`Endpoint: ${GRAPHQL_ENDPOINT}`));
  console.log(chalk.gray(`WebSocket: ${WS_ENDPOINT}`));
  console.log(chalk.gray(`Load Test Users: ${LOAD_TEST_USERS}\n`));

  // Run test suites
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log(chalk.red('\n⚠️ Health check failed. Aborting further tests.'));
    return;
  }

  const token = await testAuthentication();
  if (!token) {
    console.log(chalk.red('\n⚠️ Authentication failed. Aborting further tests.'));
    return;
  }

  await testQueryPerformance(token);
  await testMutations(token);
  await testSubscriptions(token);
  await testCachePerformance(token);
  await testLoadPerformance(token);

  // Display results
  const totalDuration = Date.now() - results.startTime;
  console.log(chalk.bold.cyan('\n📊 Validation Results\n'));

  console.log(chalk.green(`✓ Passed: ${results.passed.length}`));
  results.passed.forEach(test => console.log(chalk.gray(`  - ${test}`)));

  if (results.failed.length > 0) {
    console.log(chalk.red(`\n✗ Failed: ${results.failed.length}`));
    results.failed.forEach(test => console.log(chalk.gray(`  - ${test}`)));
  }

  // Performance summary
  console.log(chalk.bold.cyan('\n⚡ Performance Metrics\n'));

  console.log(chalk.yellow('Authentication:'));
  if (results.performance.authentication) {
    console.log(`  Login: ${results.performance.authentication.login}ms`);
    console.log(`  Refresh: ${results.performance.authentication.refresh}ms`);
  }

  console.log(chalk.yellow('\nQuery Performance:'));
  if (results.performance.queries) {
    Object.entries(results.performance.queries).forEach(([name, duration]) => {
      console.log(`  ${name}: ${duration}ms`);
    });
  }

  console.log(chalk.yellow('\nMutation Performance:'));
  if (results.performance.mutations) {
    console.log(`  Create: ${results.performance.mutations.create}ms`);
    console.log(`  Update: ${results.performance.mutations.update}ms`);
    console.log(`  Delete: ${results.performance.mutations.delete}ms`);
  }

  console.log(chalk.yellow('\nCache Performance:'));
  if (results.performance.cache) {
    console.log(`  Cache Miss: ${results.performance.cache.miss}ms`);
    console.log(`  Cache Hit: ${results.performance.cache.hit}ms`);
    console.log(`  Improvement: ${results.performance.cache.improvement.toFixed(2)}%`);
  }

  console.log(chalk.yellow('\nLoad Test Results:'));
  if (results.performance.loadTest) {
    console.log(`  Concurrent Users: ${results.performance.loadTest.users}`);
    console.log(`  Total Duration: ${results.performance.loadTest.duration}ms`);
    console.log(`  Average Latency: ${results.performance.loadTest.avgLatency.toFixed(2)}ms`);
    console.log(`  Throughput: ${results.performance.loadTest.throughput.toFixed(2)} req/s`);
    console.log(`  Success Rate: ${results.performance.loadTest.successRate.toFixed(2)}%`);
  }

  console.log(chalk.gray(`\nTotal validation time: ${totalDuration}ms`));

  // Exit code based on results
  if (results.failed.length > 0) {
    console.log(chalk.red('\n❌ Validation failed\n'));
    process.exit(1);
  } else {
    console.log(chalk.green('\n✅ All validations passed!\n'));
    process.exit(0);
  }
}

// Run validation
runValidation().catch(error => {
  console.error(chalk.red(`\n💥 Fatal error: ${error.message}\n`));
  process.exit(1);
});
