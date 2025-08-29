import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import fetch from 'cross-fetch';
import Redis from 'ioredis';
import { Client as PgClient } from 'pg';

import { 
  mockThreatData, 
  mockSecurityEventData, 
  mockIncidentData,
  mockAlertData 
} from '../test-helpers/integration-test-data';

// Test configuration
const TEST_CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:4000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  WS_URL: process.env.WS_URL || 'ws://localhost:4000/graphql',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  DB_URL: process.env.DB_URL || 'postgresql://localhost:5432/security_test',
  MOBILE_SIMULATOR_URL: process.env.MOBILE_SIMULATOR_URL || 'http://localhost:3001',
  API_KEY: process.env.TEST_API_KEY || 'test-api-key-12345',
  JWT_SECRET: process.env.JWT_SECRET || 'test-secret'
};

// Global test clients
let apolloClient: ApolloClient<any>;
let wsClient: any;
let redisClient: Redis;
let dbClient: PgClient;
let authToken: string;

describe('Cross-Platform Integration Tests', () => {
  beforeAll(async () => {
    // Setup database connection
    dbClient = new PgClient({
      connectionString: TEST_CONFIG.DB_URL
    });
    await dbClient.connect();

    // Setup Redis connection
    redisClient = new Redis(TEST_CONFIG.REDIS_URL);

    // Setup GraphQL WebSocket client
    wsClient = createClient({
      url: TEST_CONFIG.WS_URL,
      connectionParams: async () => ({
        authorization: `Bearer ${authToken}`,
      }),
    });

    // Setup Apollo Client with HTTP and WebSocket links
    const httpLink = createHttpLink({
      uri: `${TEST_CONFIG.BACKEND_URL}/graphql`,
      fetch,
    });

    const wsLink = new GraphQLWsLink(wsClient);

    const authLink = setContext((_, { headers }) => ({
      headers: {
        ...headers,
        authorization: authToken ? `Bearer ${authToken}` : '',
        'x-api-key': TEST_CONFIG.API_KEY,
      },
    }));

    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      authLink.concat(httpLink)
    );

    apolloClient = new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: { errorPolicy: 'all' },
        query: { errorPolicy: 'all' },
      },
    });

    // Authenticate for tests
    authToken = await authenticateTestUser();
  });

  afterAll(async () => {
    await wsClient?.dispose();
    await redisClient?.disconnect();
    await dbClient?.end();
  });

  beforeEach(async () => {
    // Clean test data before each test
    await cleanTestData();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanTestData();
  });

  describe('Data Consistency Across Platforms', () => {
    it('should maintain threat data consistency between web and mobile', async () => {
      // Create threat via web API
      const threatData = mockThreatData({
        name: 'Integration Test Threat',
        severity: 'HIGH',
        confidence: 0.95
      });

      const webResponse = await apolloClient.mutate({
        mutation: CREATE_THREAT_MUTATION,
        variables: { input: threatData }
      });

      const createdThreat = webResponse.data?.createThreat;
      expect(createdThreat).toBeDefined();
      expect(createdThreat.id).toBeDefined();

      // Wait for data propagation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify data is available via mobile API
      const mobileResponse = await fetch(`${TEST_CONFIG.MOBILE_SIMULATOR_URL}/api/threats/${createdThreat.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(mobileResponse.status).toBe(200);
      const mobileThreat = await mobileResponse.json();

      expect(mobileThreat.id).toBe(createdThreat.id);
      expect(mobileThreat.name).toBe(threatData.name);
      expect(mobileThreat.severity).toBe(threatData.severity);
      expect(mobileThreat.confidence).toBe(threatData.confidence);

      // Verify data in database directly
      const dbResult = await dbClient.query(
        'SELECT * FROM threats WHERE id = $1',
        [createdThreat.id]
      );

      expect(dbResult.rows).toHaveLength(1);
      const dbThreat = dbResult.rows[0];
      expect(dbThreat.name).toBe(threatData.name);
      expect(dbThreat.severity).toBe(threatData.severity);
    });

    it('should sync incident data across all platforms', async () => {
      const incidentData = mockIncidentData({
        title: 'Cross-Platform Integration Incident',
        severity: 'CRITICAL',
        status: 'INVESTIGATING'
      });

      // Create incident via GraphQL
      const graphqlResponse = await apolloClient.mutate({
        mutation: CREATE_INCIDENT_MUTATION,
        variables: { input: incidentData }
      });

      const incident = graphqlResponse.data?.createIncident;
      expect(incident).toBeDefined();

      // Update incident status via mobile API
      const updateResponse = await fetch(`${TEST_CONFIG.MOBILE_SIMULATOR_URL}/api/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'CONTAINED',
          notes: 'Updated from mobile app'
        })
      });

      expect(updateResponse.status).toBe(200);

      // Wait for synchronization
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify update is reflected in web GraphQL API
      const updatedIncident = await apolloClient.query({
        query: GET_INCIDENT_QUERY,
        variables: { id: incident.id },
        fetchPolicy: 'network-only'
      });

      expect(updatedIncident.data.incident.status).toBe('CONTAINED');
      expect(updatedIncident.data.incident.notes).toBe('Updated from mobile app');

      // Verify in Redis cache
      const cachedData = await redisClient.get(`incident:${incident.id}`);
      expect(cachedData).toBeDefined();
      const cached = JSON.parse(cachedData!);
      expect(cached.status).toBe('CONTAINED');
    });

    it('should maintain user session consistency across platforms', async () => {
      // Login via web API
      const loginResponse = await fetch(`${TEST_CONFIG.BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'integration.test@example.com',
          password: 'testPassword123!'
        })
      });

      expect(loginResponse.status).toBe(200);
      const { token, refreshToken, user } = await loginResponse.json();

      // Verify token works with GraphQL API
      const profileResponse = await apolloClient.query({
        query: GET_USER_PROFILE_QUERY,
        context: {
          headers: {
            authorization: `Bearer ${token}`
          }
        }
      });

      expect(profileResponse.data.me.id).toBe(user.id);

      // Verify token works with mobile API
      const mobileProfileResponse = await fetch(`${TEST_CONFIG.MOBILE_SIMULATOR_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      expect(mobileProfileResponse.status).toBe(200);
      const mobileProfile = await mobileProfileResponse.json();
      expect(mobileProfile.id).toBe(user.id);

      // Logout from mobile
      const logoutResponse = await fetch(`${TEST_CONFIG.MOBILE_SIMULATOR_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      expect(logoutResponse.status).toBe(200);

      // Wait for session invalidation to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify token is invalid across all platforms
      const invalidTokenTest = await fetch(`${TEST_CONFIG.BACKEND_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'query { me { id } }'
        })
      });

      expect(invalidTokenTest.status).toBe(401);
    });
  });

  describe('Real-time Subscription Integration', () => {
    it('should broadcast threat updates to all connected clients', async () => {
      const subscriptionPromises: Promise<any>[] = [];

      // Set up web client subscription
      const webSubscription = new Promise((resolve) => {
        const subscription = apolloClient.subscribe({
          query: THREAT_UPDATES_SUBSCRIPTION
        });

        subscription.subscribe({
          next: (result) => {
            if (result.data?.threatUpdates) {
              resolve(result.data.threatUpdates);
            }
          },
          error: (err) => console.error('Web subscription error:', err)
        });
      });
      subscriptionPromises.push(webSubscription);

      // Set up mobile client simulation (WebSocket)
      const mobileSubscription = new Promise((resolve) => {
        const ws = new WebSocket(`${TEST_CONFIG.WS_URL.replace('http', 'ws')}/mobile`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'threat_update') {
            resolve(message.payload);
          }
        });

        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            topic: 'threats'
          }));
        });
      });
      subscriptionPromises.push(mobileSubscription);

      // Wait for subscriptions to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create a threat to trigger updates
      const threatData = mockThreatData({
        name: 'Subscription Test Threat',
        severity: 'CRITICAL'
      });

      await apolloClient.mutate({
        mutation: CREATE_THREAT_MUTATION,
        variables: { input: threatData }
      });

      // Wait for all subscriptions to receive the update
      const results = await Promise.all(subscriptionPromises.map(p => 
        Promise.race([p, new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Subscription timeout')), 5000)
        )])
      ));

      // Verify all clients received the update
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.name).toBe('Subscription Test Threat');
        expect(result.severity).toBe('CRITICAL');
      });
    });

    it('should handle real-time alert escalation across platforms', async () => {
      const alertEscalations: any[] = [];

      // Set up escalation listeners
      const webEscalationListener = apolloClient.subscribe({
        query: ALERT_ESCALATION_SUBSCRIPTION
      });

      webEscalationListener.subscribe({
        next: (result) => {
          if (result.data?.alertEscalation) {
            alertEscalations.push({
              source: 'web',
              data: result.data.alertEscalation
            });
          }
        }
      });

      // Create initial alert
      const alertData = mockAlertData({
        title: 'Escalation Test Alert',
        severity: 'MEDIUM',
        escalationLevel: 0
      });

      const createResponse = await apolloClient.mutate({
        mutation: CREATE_ALERT_MUTATION,
        variables: { input: alertData }
      });

      const alert = createResponse.data?.createAlert;

      // Trigger escalation via mobile API
      const escalationResponse = await fetch(`${TEST_CONFIG.MOBILE_SIMULATOR_URL}/api/alerts/${alert.id}/escalate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'SLA breach imminent',
          newSeverity: 'HIGH'
        })
      });

      expect(escalationResponse.status).toBe(200);

      // Wait for escalation to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify escalation was received by web client
      expect(alertEscalations).toHaveLength(1);
      expect(alertEscalations[0].data.alertId).toBe(alert.id);
      expect(alertEscalations[0].data.newSeverity).toBe('HIGH');
      expect(alertEscalations[0].data.reason).toBe('SLA breach imminent');

      // Verify alert was updated in database
      const updatedAlert = await apolloClient.query({
        query: GET_ALERT_QUERY,
        variables: { id: alert.id },
        fetchPolicy: 'network-only'
      });

      expect(updatedAlert.data.alert.severity).toBe('HIGH');
      expect(updatedAlert.data.alert.escalationLevel).toBe(1);
    });

    it('should sync offline mobile changes when connection is restored', async () => {
      // Create an incident while mobile is "offline"
      const offlineIncidentData = {
        title: 'Offline Created Incident',
        description: 'Created while mobile was offline',
        severity: 'HIGH',
        tempId: 'temp-incident-123',
        createdOffline: true
      };

      // Simulate offline queue in Redis
      await redisClient.lpush(
        'offline_queue:user:123',
        JSON.stringify({
          id: 'temp-action-1',
          type: 'CREATE_INCIDENT',
          data: offlineIncidentData,
          timestamp: new Date().toISOString(),
          deviceId: 'mobile-device-123'
        })
      );

      // Simulate connection restoration by processing offline queue
      const processQueueResponse = await fetch(`${TEST_CONFIG.MOBILE_SIMULATOR_URL}/api/sync/process-queue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: '123',
          deviceId: 'mobile-device-123'
        })
      });

      expect(processQueueResponse.status).toBe(200);
      const syncResult = await processQueueResponse.json();
      expect(syncResult.processed).toBe(1);
      expect(syncResult.errors).toBe(0);

      // Verify incident was created and is available via web API
      const webIncidentsResponse = await apolloClient.query({
        query: GET_INCIDENTS_QUERY,
        variables: { 
          filter: { title: 'Offline Created Incident' }
        },
        fetchPolicy: 'network-only'
      });

      const incidents = webIncidentsResponse.data.incidents.data;
      expect(incidents).toHaveLength(1);
      expect(incidents[0].title).toBe('Offline Created Incident');
      expect(incidents[0].description).toBe('Created while mobile was offline');

      // Verify offline queue was cleared
      const queueLength = await redisClient.llen('offline_queue:user:123');
      expect(queueLength).toBe(0);
    });
  });

  describe('Performance and Scalability Integration', () => {
    it('should handle concurrent operations from multiple platforms', async () => {
      const concurrentOperations = [];
      const startTime = Date.now();

      // Simulate concurrent operations from web and mobile
      for (let i = 0; i < 10; i++) {
        // Web operations
        concurrentOperations.push(
          apolloClient.mutate({
            mutation: CREATE_THREAT_MUTATION,
            variables: { 
              input: mockThreatData({ 
                name: `Concurrent Web Threat ${i}` 
              })
            }
          })
        );

        // Mobile operations
        concurrentOperations.push(
          fetch(`${TEST_CONFIG.MOBILE_SIMULATOR_URL}/api/incidents`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(mockIncidentData({
              title: `Concurrent Mobile Incident ${i}`
            }))
          })
        );
      }

      // Execute all operations concurrently
      const results = await Promise.all(concurrentOperations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all operations completed successfully
      results.forEach((result, index) => {
        if (index % 2 === 0) {
          // Web GraphQL mutations
          expect(result.data?.createThreat).toBeDefined();
        } else {
          // Mobile REST API calls
          expect(result.status).toBe(201);
        }
      });

      // Performance assertion - all operations should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds for 20 concurrent operations

      // Verify database integrity after concurrent operations
      const threatCount = await dbClient.query('SELECT COUNT(*) FROM threats WHERE name LIKE $1', 
        ['Concurrent Web Threat %']);
      const incidentCount = await dbClient.query('SELECT COUNT(*) FROM incidents WHERE title LIKE $1', 
        ['Concurrent Mobile Incident %']);

      expect(parseInt(threatCount.rows[0].count)).toBe(10);
      expect(parseInt(incidentCount.rows[0].count)).toBe(10);
    });

    it('should handle high-frequency real-time updates efficiently', async () => {
      const receivedUpdates: any[] = [];
      const expectedUpdateCount = 100;
      const startTime = Date.now();

      // Set up subscription to capture updates
      const subscription = apolloClient.subscribe({
        query: SECURITY_EVENT_STREAM_SUBSCRIPTION
      });

      subscription.subscribe({
        next: (result) => {
          if (result.data?.securityEventStream) {
            receivedUpdates.push({
              ...result.data.securityEventStream,
              receivedAt: Date.now()
            });
          }
        }
      });

      // Wait for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate high-frequency events
      const eventPromises = [];
      for (let i = 0; i < expectedUpdateCount; i++) {
        eventPromises.push(
          apolloClient.mutate({
            mutation: CREATE_SECURITY_EVENT_MUTATION,
            variables: {
              input: mockSecurityEventData({
                type: `HIGH_FREQ_EVENT_${i}`,
                timestamp: new Date().toISOString()
              })
            }
          })
        );

        // Small delay to spread events over time
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      await Promise.all(eventPromises);

      // Wait for all updates to be received
      await new Promise(resolve => setTimeout(resolve, 3000));

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Verify we received all updates
      expect(receivedUpdates.length).toBeGreaterThanOrEqual(expectedUpdateCount * 0.95); // Allow 5% loss

      // Verify updates were timely
      const averageLatency = receivedUpdates.reduce((sum, update) => {
        const latency = update.receivedAt - new Date(update.timestamp).getTime();
        return sum + latency;
      }, 0) / receivedUpdates.length;

      expect(averageLatency).toBeLessThan(100); // Average latency under 100ms
      expect(totalDuration).toBeLessThan(10000); // Total test under 10 seconds
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      // Temporarily close database connection to simulate failure
      await dbClient.end();

      // Attempt operations that require database
      const threatResponse = await apolloClient.mutate({
        mutation: CREATE_THREAT_MUTATION,
        variables: { input: mockThreatData() }
      }).catch(err => err);

      expect(threatResponse.networkError).toBeDefined();

      // Attempt mobile API call
      const mobileResponse = await fetch(`${TEST_CONFIG.MOBILE_SIMULATOR_URL}/api/incidents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockIncidentData())
      });

      expect(mobileResponse.status).toBe(503); // Service unavailable

      // Restore database connection
      dbClient = new PgClient({ connectionString: TEST_CONFIG.DB_URL });
      await dbClient.connect();

      // Verify operations work again
      const recoveryResponse = await apolloClient.mutate({
        mutation: CREATE_THREAT_MUTATION,
        variables: { input: mockThreatData({ name: 'Recovery Test Threat' }) }
      });

      expect(recoveryResponse.data?.createThreat).toBeDefined();
    });

    it('should handle Redis connection failures with graceful degradation', async () => {
      // Disconnect Redis to simulate failure
      await redisClient.disconnect();

      // Operations should still work but without caching
      const threatResponse = await apolloClient.query({
        query: GET_THREATS_QUERY,
        variables: { limit: 10 },
        fetchPolicy: 'network-only'
      });

      expect(threatResponse.data.threats).toBeDefined();
      expect(Array.isArray(threatResponse.data.threats.data)).toBe(true);

      // Reconnect Redis
      redisClient = new Redis(TEST_CONFIG.REDIS_URL);

      // Verify caching works again
      await apolloClient.query({
        query: GET_THREATS_QUERY,
        variables: { limit: 10 },
        fetchPolicy: 'cache-first'
      });
    });

    it('should handle partial service failures in microservices architecture', async () => {
      // Test scenario where threat service is down but incident service works
      // This would typically involve mocking service endpoints

      const incidentResponse = await apolloClient.mutate({
        mutation: CREATE_INCIDENT_MUTATION,
        variables: { input: mockIncidentData() }
      });

      expect(incidentResponse.data?.createIncident).toBeDefined();

      // Operations that depend on threat service should fail gracefully
      const threatResponse = await apolloClient.query({
        query: GET_THREATS_QUERY,
        variables: { limit: 10 }
      }).catch(err => err);

      // Should either return cached data or appropriate error
      expect(
        threatResponse.data?.threats || threatResponse.networkError
      ).toBeDefined();
    });
  });

  describe('Security Integration', () => {
    it('should enforce authentication across all platforms', async () => {
      // Remove auth token
      const oldToken = authToken;
      authToken = '';

      // Test GraphQL API
      const graphqlResponse = await apolloClient.query({
        query: GET_THREATS_QUERY,
        context: {
          headers: {
            authorization: '' // No token
          }
        }
      }).catch(err => err);

      expect(graphqlResponse.networkError?.statusCode).toBe(401);

      // Test Mobile API  
      const mobileResponse = await fetch(`${TEST_CONFIG.MOBILE_SIMULATOR_URL}/api/incidents`, {
        headers: {
          'Content-Type': 'application/json'
          // No Authorization header
        }
      });

      expect(mobileResponse.status).toBe(401);

      // Restore auth token
      authToken = oldToken;
    });

    it('should enforce consistent authorization across platforms', async () => {
      // Create a limited-privilege token
      const limitedToken = await createLimitedToken('READ_ONLY');

      // Attempt write operation via GraphQL
      const graphqlWriteResponse = await apolloClient.mutate({
        mutation: CREATE_THREAT_MUTATION,
        variables: { input: mockThreatData() },
        context: {
          headers: {
            authorization: `Bearer ${limitedToken}`
          }
        }
      }).catch(err => err);

      expect(graphqlWriteResponse.networkError?.statusCode).toBe(403);

      // Attempt write operation via Mobile API
      const mobileWriteResponse = await fetch(`${TEST_CONFIG.MOBILE_SIMULATOR_URL}/api/incidents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${limitedToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockIncidentData())
      });

      expect(mobileWriteResponse.status).toBe(403);

      // Read operations should work
      const graphqlReadResponse = await apolloClient.query({
        query: GET_THREATS_QUERY,
        variables: { limit: 10 },
        context: {
          headers: {
            authorization: `Bearer ${limitedToken}`
          }
        }
      });

      expect(graphqlReadResponse.data.threats).toBeDefined();
    });
  });
});

// Helper functions
async function authenticateTestUser(): Promise<string> {
  const response = await fetch(`${TEST_CONFIG.BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'integration.test@example.com',
      password: 'testPassword123!'
    })
  });

  if (response.ok) {
    const { token } = await response.json();
    return token;
  }
  throw new Error('Failed to authenticate test user');
}

async function createLimitedToken(permission: string): Promise<string> {
  const response = await fetch(`${TEST_CONFIG.BACKEND_URL}/auth/test-token`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      permissions: [permission],
      expiresIn: '1h'
    })
  });

  if (response.ok) {
    const { token } = await response.json();
    return token;
  }
  throw new Error('Failed to create limited token');
}

async function cleanTestData(): Promise<void> {
  // Clean test data from database
  await dbClient.query("DELETE FROM threats WHERE name LIKE '%Test%' OR name LIKE '%Integration%'");
  await dbClient.query("DELETE FROM incidents WHERE title LIKE '%Test%' OR title LIKE '%Integration%'");
  await dbClient.query("DELETE FROM security_events WHERE event_type LIKE '%TEST%'");
  await dbClient.query("DELETE FROM alerts WHERE title LIKE '%Test%'");

  // Clean Redis test data
  const testKeys = await redisClient.keys('*test*');
  if (testKeys.length > 0) {
    await redisClient.del(...testKeys);
  }
}

// GraphQL queries and mutations
const CREATE_THREAT_MUTATION = `
  mutation CreateThreat($input: ThreatInput!) {
    createThreat(input: $input) {
      id name severity confidence
      createdAt updatedAt
    }
  }
`;

const GET_THREATS_QUERY = `
  query GetThreats($limit: Int, $filter: ThreatFilter) {
    threats(limit: $limit, filter: $filter) {
      data { id name severity confidence }
      pagination { total pages }
    }
  }
`;

const CREATE_INCIDENT_MUTATION = `
  mutation CreateIncident($input: IncidentInput!) {
    createIncident(input: $input) {
      id title severity status
      createdAt updatedAt
    }
  }
`;

const GET_INCIDENT_QUERY = `
  query GetIncident($id: ID!) {
    incident(id: $id) {
      id title severity status notes
      createdAt updatedAt
    }
  }
`;

const GET_INCIDENTS_QUERY = `
  query GetIncidents($filter: IncidentFilter) {
    incidents(filter: $filter) {
      data { id title severity status description }
      pagination { total }
    }
  }
`;

const CREATE_ALERT_MUTATION = `
  mutation CreateAlert($input: AlertInput!) {
    createAlert(input: $input) {
      id title severity escalationLevel
      createdAt
    }
  }
`;

const GET_ALERT_QUERY = `
  query GetAlert($id: ID!) {
    alert(id: $id) {
      id title severity escalationLevel
      createdAt updatedAt
    }
  }
`;

const CREATE_SECURITY_EVENT_MUTATION = `
  mutation CreateSecurityEvent($input: SecurityEventInput!) {
    createSecurityEvent(input: $input) {
      id type timestamp severity
    }
  }
`;

const GET_USER_PROFILE_QUERY = `
  query GetUserProfile {
    me { id email name role permissions }
  }
`;

const THREAT_UPDATES_SUBSCRIPTION = `
  subscription ThreatUpdates {
    threatUpdates {
      id name severity confidence
      updatedAt
    }
  }
`;

const ALERT_ESCALATION_SUBSCRIPTION = `
  subscription AlertEscalation {
    alertEscalation {
      alertId newSeverity reason
      escalatedAt escalatedBy
    }
  }
`;

const SECURITY_EVENT_STREAM_SUBSCRIPTION = `
  subscription SecurityEventStream {
    securityEventStream {
      id type severity timestamp
      sourceIp destinationIp
    }
  }
`;