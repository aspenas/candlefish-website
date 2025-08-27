import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Gauge, Counter } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');
const throughput = new Counter('requests_per_second');
const concurrentUsers = new Gauge('concurrent_users');
const memoryUsage = new Gauge('memory_usage_mb');
const cpuUsage = new Gauge('cpu_usage_percent');

// Test configuration - Stress test to find breaking point
export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },    // Ramp up to 200 users
        { duration: '2m', target: 500 },    // Ramp up to 500 users
        { duration: '2m', target: 1000 },   // Ramp up to 1000 users
        { duration: '2m', target: 2000 },   // Ramp up to 2000 users
        { duration: '2m', target: 3000 },   // Ramp up to 3000 users
        { duration: '2m', target: 5000 },   // Ramp up to 5000 users
        { duration: '2m', target: 10000 },  // Ramp up to 10000 users - find breaking point
        { duration: '5m', target: 10000 },  // Stay at peak load
        { duration: '5m', target: 0 },      // Ramp down to 0 users - recovery test
      ],
      gracefulRampDown: '30s',
    },
  },
  
  thresholds: {
    // Relaxed thresholds for stress testing
    'http_req_duration': ['p(95)<5000', 'p(99)<10000'], // 5s and 10s thresholds
    'http_req_failed': ['rate<0.5'], // Allow up to 50% error rate during stress
    'errors': ['rate<0.5'],
    'checks': ['rate>0.5'], // At least 50% of checks should pass
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Helper functions
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

// Stress test scenarios
const stressScenarios = [
  // Heavy read operations
  () => {
    const response = http.get(`${BASE_URL}/api/security/events?limit=1000`, {
      headers: getHeaders(),
      timeout: '30s',
    });
    
    check(response, {
      'Heavy read successful': (r) => r.status === 200 || r.status === 503,
    });
    
    errorRate.add(response.status !== 200);
    responseTrend.add(response.timings.duration);
    throughput.add(1);
  },
  
  // Heavy write operations
  () => {
    const payload = {
      events: Array(100).fill(null).map((_, i) => ({
        type: 'security_alert',
        severity: randomItem(['low', 'medium', 'high', 'critical']),
        message: `Stress test event ${i}`,
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'stress_test',
          iteration: i,
          randomData: Math.random().toString(36).substring(7),
        },
      })),
    };
    
    const response = http.post(`${BASE_URL}/api/security/events/batch`, 
      JSON.stringify(payload), {
        headers: getHeaders(),
        timeout: '30s',
      });
    
    check(response, {
      'Heavy write successful': (r) => r.status === 201 || r.status === 503,
    });
    
    errorRate.add(response.status !== 201);
    responseTrend.add(response.timings.duration);
    throughput.add(1);
  },
  
  // Complex aggregation queries
  () => {
    const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
      query: `
        query StressTestAggregation($startDate: DateTime!, $endDate: DateTime!) {
          securityMetrics(startDate: $startDate, endDate: $endDate) {
            totalEvents
            eventsByType {
              type
              count
              averageSeverity
            }
            eventsByHour {
              hour
              count
            }
            topVulnerableAssets(limit: 100) {
              assetId
              vulnerabilityCount
              criticalCount
            }
            complianceScore
            threatLevel
          }
        }
      `,
      variables: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      }
    }), {
      headers: getHeaders(),
      timeout: '30s',
    });
    
    check(response, {
      'Complex aggregation successful': (r) => r.status === 200 || r.status === 503,
    });
    
    errorRate.add(response.status !== 200);
    responseTrend.add(response.timings.duration);
    throughput.add(1);
  },
  
  // Concurrent database transactions
  () => {
    const batch = http.batch([
      ['GET', `${BASE_URL}/api/assets`, null, { headers: getHeaders() }],
      ['GET', `${BASE_URL}/api/vulnerabilities`, null, { headers: getHeaders() }],
      ['GET', `${BASE_URL}/api/alerts`, null, { headers: getHeaders() }],
      ['GET', `${BASE_URL}/api/compliance`, null, { headers: getHeaders() }],
      ['POST', `${BASE_URL}/api/security/scan`, JSON.stringify({ assetId: 'test-asset' }), { headers: getHeaders() }],
    ]);
    
    batch.forEach((response, index) => {
      check(response, {
        [`Batch request ${index} successful`]: (r) => r.status === 200 || r.status === 201 || r.status === 503,
      });
      
      errorRate.add(![200, 201].includes(response.status));
      responseTrend.add(response.timings.duration);
    });
    
    throughput.add(batch.length);
  },
  
  // Memory-intensive operations
  () => {
    const largePayload = {
      data: Array(1000).fill(null).map(() => ({
        id: Math.random().toString(36).substring(7),
        content: 'x'.repeat(10000), // 10KB per item
        metadata: {
          timestamp: new Date().toISOString(),
          random: Math.random(),
        },
      })),
    };
    
    const response = http.post(`${BASE_URL}/api/process/large`, 
      JSON.stringify(largePayload), {
        headers: getHeaders(),
        timeout: '60s',
      });
    
    check(response, {
      'Memory-intensive operation handled': (r) => r.status === 200 || r.status === 503 || r.status === 413,
    });
    
    errorRate.add(response.status !== 200);
    responseTrend.add(response.timings.duration);
    throughput.add(1);
  },
];

// Main stress test function
export default function () {
  // Update concurrent users metric
  concurrentUsers.add(__VU);
  
  // Execute random stress scenario
  const scenario = randomItem(stressScenarios);
  scenario();
  
  // Variable sleep time based on load stage
  const currentVUs = __VU;
  if (currentVUs < 1000) {
    sleep(Math.random() * 2 + 1); // 1-3 seconds
  } else if (currentVUs < 5000) {
    sleep(Math.random() + 0.5); // 0.5-1.5 seconds
  } else {
    sleep(Math.random() * 0.5); // 0-0.5 seconds - maximum stress
  }
}

// Monitor system resources
export function monitorResources() {
  // Check system health endpoint
  const healthResponse = http.get(`${BASE_URL}/health/detailed`, {
    headers: getHeaders(),
    timeout: '5s',
  });
  
  if (healthResponse.status === 200) {
    try {
      const health = JSON.parse(healthResponse.body);
      
      // Update resource metrics
      if (health.memory) {
        memoryUsage.add(health.memory.usedMB);
      }
      if (health.cpu) {
        cpuUsage.add(health.cpu.percentage);
      }
      
      // Check for resource exhaustion
      check(health, {
        'Memory below 90%': (h) => h.memory && h.memory.percentage < 90,
        'CPU below 90%': (h) => h.cpu && h.cpu.percentage < 90,
        'Database connections available': (h) => h.database && h.database.activeConnections < h.database.maxConnections * 0.9,
        'Redis responsive': (h) => h.redis && h.redis.status === 'healthy',
      });
    } catch (e) {
      console.error('Failed to parse health response:', e);
    }
  }
}

// Chaos engineering scenarios
export function chaosScenarios() {
  const chaosTests = [
    // Sudden spike in traffic
    () => {
      console.log('Executing chaos: Traffic spike');
      for (let i = 0; i < 100; i++) {
        http.get(`${BASE_URL}/api/security/overview`, {
          headers: getHeaders(),
          timeout: '5s',
        });
      }
    },
    
    // Large batch operations
    () => {
      console.log('Executing chaos: Large batch operation');
      const hugeBatch = Array(500).fill(null).map(() => ({
        query: 'query { securityOverview { totalAssets } }',
      }));
      
      http.post(`${BASE_URL}/graphql/batch`, 
        JSON.stringify(hugeBatch), {
          headers: getHeaders(),
          timeout: '60s',
        });
    },
    
    // Malformed requests
    () => {
      console.log('Executing chaos: Malformed requests');
      http.post(`${BASE_URL}/api/security/events`, 
        'INVALID_JSON{{{', {
          headers: getHeaders(),
          timeout: '5s',
        });
    },
    
    // Connection pool exhaustion attempt
    () => {
      console.log('Executing chaos: Connection pool exhaustion');
      const connections = [];
      for (let i = 0; i < 200; i++) {
        connections.push(
          http.get(`${BASE_URL}/api/long-running`, {
            headers: getHeaders(),
            timeout: '120s',
          })
        );
      }
    },
  ];
  
  // Execute random chaos scenario
  if (Math.random() < 0.01) { // 1% chance per iteration
    const chaos = randomItem(chaosTests);
    chaos();
  }
}

// Lifecycle hooks
export function setup() {
  console.log('Starting Security Dashboard Stress Test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Testing system limits and recovery capabilities');
  
  // Warm up the system
  http.get(`${BASE_URL}/health`);
  
  return { 
    startTime: new Date(),
    initialHealth: checkSystemHealth(),
  };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  
  console.log(`\nStress Test Summary:`);
  console.log(`Duration: ${duration} seconds`);
  console.log(`Initial Health: ${JSON.stringify(data.initialHealth)}`);
  console.log(`Final Health: ${JSON.stringify(checkSystemHealth())}`);
  
  // Check if system recovered
  const finalHealth = checkSystemHealth();
  if (finalHealth.status === 'healthy') {
    console.log('✅ System recovered successfully after stress test');
  } else {
    console.log('⚠️ System has not fully recovered');
  }
}

function checkSystemHealth() {
  try {
    const response = http.get(`${BASE_URL}/health/detailed`, {
      headers: getHeaders(),
      timeout: '10s',
    });
    
    if (response.status === 200) {
      return JSON.parse(response.body);
    }
  } catch (e) {
    console.error('Health check failed:', e);
  }
  
  return { status: 'unknown' };
}

// Export for use in multi-scenario tests
export { 
  stressScenarios,
  monitorResources,
  chaosScenarios,
};