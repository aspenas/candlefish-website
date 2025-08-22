/**
 * K6 Load Testing Scripts for RTPM API
 * Tests various load scenarios including baseline, stress, spike, and soak testing
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const websocketConnections = new Counter('websocket_connections');
const metricsIngested = new Counter('metrics_ingested');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:8000';

// Test data generators
function generateAgent() {
  const id = `agent-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  return {
    id: id,
    name: `Agent-${id.split('-')[1]}`,
    status: ['online', 'offline', 'warning', 'error'][Math.floor(Math.random() * 4)],
    version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
    capabilities: ['monitoring', 'analysis', 'reporting'].slice(0, Math.floor(Math.random() * 3) + 1),
    lastSeen: new Date().toISOString(),
    region: ['us-east-1', 'us-west-2', 'eu-west-1'][Math.floor(Math.random() * 3)],
    platform: ['OpenAI', 'Anthropic', 'Google'][Math.floor(Math.random() * 3)]
  };
}

function generateMetrics(agentId) {
  return {
    agentId: agentId,
    timestamp: new Date().toISOString(),
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
    requestRate: Math.random() * 1000,
    errorRate: Math.random() * 10,
    responseTime: Math.random() * 500,
    throughput: Math.random() * 2000,
    activeConnections: Math.floor(Math.random() * 100),
    queueDepth: Math.floor(Math.random() * 50),
    diskUsage: Math.random() * 100,
    networkLatency: Math.random() * 100
  };
}

function generateAlert() {
  return {
    id: `alert-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    name: `Alert ${Math.floor(Math.random() * 1000)}`,
    description: 'Load test generated alert',
    metric: ['cpu', 'memory', 'responseTime', 'errorRate'][Math.floor(Math.random() * 4)],
    operator: ['gt', 'gte', 'lt', 'lte'][Math.floor(Math.random() * 4)],
    threshold: Math.random() * 100,
    actions: [],
    enabled: Math.random() > 0.3,
    severity: ['info', 'warning', 'error', 'critical'][Math.floor(Math.random() * 4)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Test scenarios
export const options = {
  scenarios: {
    // Baseline load test
    baseline_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      tags: { test_type: 'baseline' },
    },
    
    // Stress test - gradually increase load
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 20 },   // Ramp up
        { duration: '3m', target: 50 },   // Stay at 50
        { duration: '2m', target: 100 },  // Ramp to 100
        { duration: '2m', target: 100 },  // Stay at 100
        { duration: '1m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'stress' },
    },
    
    // Spike test - sudden traffic increase
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },   // Normal load
        { duration: '10s', target: 200 },  // Sudden spike
        { duration: '30s', target: 200 },  // Maintain spike
        { duration: '10s', target: 10 },   // Drop back
        { duration: '30s', target: 10 },   // Normal load
      ],
      tags: { test_type: 'spike' },
    },
    
    // Soak test - extended duration
    soak_test: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10m',
      tags: { test_type: 'soak' },
    },
    
    // WebSocket load test
    websocket_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '3m',
      tags: { test_type: 'websocket' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
    errors: ['rate<0.01'],            // Less than 1% custom errors
    websocket_connections: ['count>0'], // At least some WebSocket connections
  },
};

export default function () {
  const testType = __ENV.K6_TEST_TYPE || 'mixed';
  
  switch (testType) {
    case 'api_only':
      testAPIEndpoints();
      break;
    case 'websocket_only':
      testWebSocketConnections();
      break;
    case 'metrics_ingestion':
      testMetricsIngestion();
      break;
    default:
      testMixedWorkload();
  }
}

function testAPIEndpoints() {
  group('API Endpoint Tests', () => {
    
    // Health check
    group('Health Check', () => {
      const response = http.get(`${BASE_URL}/health`);
      check(response, {
        'health check status is 200': (r) => r.status === 200,
        'health check response time < 100ms': (r) => r.timings.duration < 100,
        'health check has correct body': (r) => {
          const body = JSON.parse(r.body);
          return body.status === 'healthy' && body.service === 'rtpm-api';
        },
      });
      errorRate.add(response.status !== 200);
      responseTime.add(response.timings.duration);
    });
    
    // System status
    group('System Status', () => {
      const response = http.get(`${BASE_URL}/api/v1/status`);
      check(response, {
        'status endpoint returns 200': (r) => r.status === 200,
        'status response time < 200ms': (r) => r.timings.duration < 200,
      });
      errorRate.add(response.status !== 200);
      responseTime.add(response.timings.duration);
    });
    
    // Current metrics
    group('Current Metrics', () => {
      const response = http.get(`${BASE_URL}/api/v1/metrics/current`);
      check(response, {
        'current metrics returns 200': (r) => r.status === 200,
        'current metrics response time < 300ms': (r) => r.timings.duration < 300,
        'current metrics has data': (r) => {
          const body = JSON.parse(r.body);
          return body.metrics && body.metrics.length > 0;
        },
      });
      errorRate.add(response.status !== 200);
      responseTime.add(response.timings.duration);
    });
    
    // Prometheus metrics
    group('Prometheus Metrics', () => {
      const response = http.get(`${BASE_URL}/metrics`);
      check(response, {
        'prometheus metrics returns 200': (r) => r.status === 200,
        'prometheus metrics response time < 500ms': (r) => r.timings.duration < 500,
        'prometheus metrics contains expected metrics': (r) => {
          return r.body.includes('rtmp_request_total') && 
                 r.body.includes('rtmp_request_latency_seconds');
        },
      });
      errorRate.add(response.status !== 200);
      responseTime.add(response.timings.duration);
    });
    
  });
  
  sleep(1);
}

function testWebSocketConnections() {
  group('WebSocket Tests', () => {
    
    const url = `${WS_URL}/ws/metrics`;
    const response = ws.connect(url, {}, function (socket) {
      websocketConnections.add(1);
      
      socket.on('open', () => {
        console.log('WebSocket connection opened');
      });
      
      socket.on('message', (data) => {
        const message = JSON.parse(data);
        check(message, {
          'WebSocket message has type': (msg) => msg.type !== undefined,
          'WebSocket message has timestamp': (msg) => msg.timestamp !== undefined,
        });
      });
      
      socket.on('error', (e) => {
        console.log('WebSocket error:', e);
        errorRate.add(1);
      });
      
      // Keep connection open for a while
      socket.setTimeout(() => {
        socket.close();
      }, Math.random() * 10000 + 5000); // 5-15 seconds
      
    });
    
    check(response, {
      'WebSocket connection successful': (r) => r && r.url === url,
    });
    
  });
}

function testMetricsIngestion() {
  group('Metrics Ingestion', () => {
    
    // Generate multiple metrics for different agents
    const agents = Array.from({ length: 10 }, () => generateAgent());
    
    agents.forEach(agent => {
      const metrics = generateMetrics(agent.id);
      
      const response = http.post(`${BASE_URL}/api/v1/metrics`, JSON.stringify(metrics), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(response, {
        'metrics ingestion returns 200': (r) => r.status === 200,
        'metrics ingestion response time < 100ms': (r) => r.timings.duration < 100,
        'metrics ingestion response has success': (r) => {
          const body = JSON.parse(r.body);
          return body.status === 'success';
        },
      });
      
      errorRate.add(response.status !== 200);
      responseTime.add(response.timings.duration);
      
      if (response.status === 200) {
        metricsIngested.add(1);
      }
    });
    
  });
  
  sleep(0.5);
}

function testMixedWorkload() {
  const workloadType = Math.random();
  
  if (workloadType < 0.4) {
    testAPIEndpoints();
  } else if (workloadType < 0.7) {
    testMetricsIngestion();
  } else {
    testWebSocketConnections();
  }
}

// Agent management load tests
export function testAgentManagement() {
  group('Agent Management Load', () => {
    
    const agent = generateAgent();
    
    // Create agent
    group('Create Agent', () => {
      const response = http.post(`${BASE_URL}/api/v1/agents`, JSON.stringify(agent), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(response, {
        'agent creation handled': (r) => r.status === 201 || r.status === 404, // 404 if not implemented
      });
      
      errorRate.add(response.status >= 400 && response.status !== 404);
      responseTime.add(response.timings.duration);
    });
    
    // Get agent
    group('Get Agent', () => {
      const response = http.get(`${BASE_URL}/api/v1/agents/${agent.id}`);
      
      check(response, {
        'agent retrieval handled': (r) => r.status === 200 || r.status === 404,
      });
      
      errorRate.add(response.status >= 400 && response.status !== 404);
      responseTime.add(response.timings.duration);
    });
    
    // List agents
    group('List Agents', () => {
      const response = http.get(`${BASE_URL}/api/v1/agents`);
      
      check(response, {
        'agent listing handled': (r) => r.status === 200 || r.status === 404,
      });
      
      errorRate.add(response.status >= 400 && response.status !== 404);
      responseTime.add(response.timings.duration);
    });
    
  });
}

// Alert management load tests
export function testAlertManagement() {
  group('Alert Management Load', () => {
    
    const alert = generateAlert();
    
    // Create alert
    group('Create Alert', () => {
      const response = http.post(`${BASE_URL}/api/v1/alerts`, JSON.stringify(alert), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(response, {
        'alert creation handled': (r) => r.status === 201 || r.status === 404,
      });
      
      errorRate.add(response.status >= 400 && response.status !== 404);
      responseTime.add(response.timings.duration);
    });
    
    // List alerts
    group('List Alerts', () => {
      const response = http.get(`${BASE_URL}/api/v1/alerts`);
      
      check(response, {
        'alert listing handled': (r) => r.status === 200 || r.status === 404,
      });
      
      errorRate.add(response.status >= 400 && response.status !== 404);
      responseTime.add(response.timings.duration);
    });
    
  });
}

// Historical metrics load test
export function testHistoricalMetrics() {
  group('Historical Metrics Load', () => {
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const params = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      interval: '1h'
    };
    
    const url = `${BASE_URL}/api/v1/metrics/historical?${Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&')}`;
    
    const response = http.get(url);
    
    check(response, {
      'historical metrics request handled': (r) => r.status === 200 || r.status === 404,
      'historical metrics response time acceptable': (r) => r.timings.duration < 2000, // 2 seconds for large dataset
    });
    
    errorRate.add(response.status >= 400 && response.status !== 404);
    responseTime.add(response.timings.duration);
    
  });
}

// Real-time metrics load test
export function testRealtimeMetrics() {
  group('Real-time Metrics Load', () => {
    
    const response = http.get(`${BASE_URL}/api/v1/metrics/realtime`);
    
    check(response, {
      'realtime metrics request handled': (r) => r.status === 200 || r.status === 404,
      'realtime metrics response time fast': (r) => r.timings.duration < 500, // Should be fast
    });
    
    errorRate.add(response.status >= 400 && response.status !== 404);
    responseTime.add(response.timings.duration);
    
  });
}

// Setup and teardown functions
export function setup() {
  console.log('Starting RTPM API load tests...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  
  // Warm up the service
  const warmupResponse = http.get(`${BASE_URL}/health`);
  console.log(`Warmup response: ${warmupResponse.status}`);
  
  return { startTime: new Date() };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}