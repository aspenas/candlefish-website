#!/usr/bin/env node

/**
 * Performance Profiling Script for Paintbox API
 * Measures response times, memory usage, and identifies bottlenecks
 */

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');
const { URL } = require('url');

// Configuration
const BASE_URL = process.env.API_URL || 'https://paintbox.fly.dev';
const CONCURRENT_REQUESTS = 10;
const TOTAL_REQUESTS = 100;
const ENDPOINTS = [
  { path: '/.well-known/jwks.json', method: 'GET', name: 'JWKS', target: 100 },
  { path: '/api/simple-health', method: 'GET', name: 'Simple Health', target: 50 },
  { path: '/api/health', method: 'GET', name: 'Full Health', target: 100 },
  { path: '/api/simple-health', method: 'HEAD', name: 'Health HEAD', target: 30 },
];

// Metrics storage
const metrics = {
  endpoints: {},
  summary: {
    totalTime: 0,
    totalRequests: 0,
    failures: 0,
    coldStarts: [],
  }
};

// Initialize metrics for each endpoint
ENDPOINTS.forEach(endpoint => {
  metrics.endpoints[endpoint.name] = {
    times: [],
    errors: [],
    statusCodes: {},
    headers: {},
    cacheHits: 0,
    target: endpoint.target
  };
});

/**
 * Make HTTP request and measure performance
 */
function makeRequest(endpoint, requestNum) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const url = new URL(BASE_URL + endpoint.path);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: endpoint.method,
      timeout: 30000,
      headers: {
        'User-Agent': 'Performance-Profiler/1.0',
        'Accept': 'application/json',
      }
    };

    // Add conditional headers for cache testing
    if (requestNum > 1 && endpoint.name === 'JWKS') {
      options.headers['If-None-Match'] = '"test-etag"';
    }

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        const result = {
          endpoint: endpoint.name,
          requestNum,
          responseTime,
          statusCode: res.statusCode,
          headers: res.headers,
          dataSize: data.length,
          success: res.statusCode >= 200 && res.statusCode < 300,
          cacheHit: res.headers['x-jwks-source'] === 'cache',
          responseTimeHeader: res.headers['x-response-time'],
          source: res.headers['x-jwks-source'],
        };

        // Store metrics
        const endpointMetrics = metrics.endpoints[endpoint.name];
        endpointMetrics.times.push(responseTime);
        endpointMetrics.statusCodes[res.statusCode] = (endpointMetrics.statusCodes[res.statusCode] || 0) + 1;

        if (result.cacheHit) {
          endpointMetrics.cacheHits++;
        }

        if (res.headers['x-response-time']) {
          endpointMetrics.headers['x-response-time'] = res.headers['x-response-time'];
        }

        resolve(result);
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const result = {
        endpoint: endpoint.name,
        requestNum,
        responseTime,
        error: error.message,
        success: false
      };

      metrics.endpoints[endpoint.name].errors.push(error.message);
      metrics.summary.failures++;

      resolve(result);
    });

    req.on('timeout', () => {
      req.destroy();
      const result = {
        endpoint: endpoint.name,
        requestNum,
        responseTime: 30000,
        error: 'Timeout',
        success: false
      };

      metrics.endpoints[endpoint.name].errors.push('Timeout');
      metrics.summary.failures++;

      resolve(result);
    });

    req.end();
  });
}

/**
 * Run concurrent requests
 */
async function runConcurrentRequests(endpoint, startIndex, count) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(makeRequest(endpoint, startIndex + i));
  }
  return Promise.all(promises);
}

/**
 * Calculate statistics
 */
function calculateStats(times) {
  if (times.length === 0) return null;

  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: avg,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    count: sorted.length
  };
}

/**
 * Test cold start performance
 */
async function testColdStart() {
  console.log('\n🧊 Testing Cold Start Performance...');

  for (const endpoint of ENDPOINTS) {
    const startTime = performance.now();
    const result = await makeRequest(endpoint, 0);
    const coldStartTime = performance.now() - startTime;

    metrics.summary.coldStarts.push({
      endpoint: endpoint.name,
      time: coldStartTime,
      success: result.success
    });

    console.log(`  ${endpoint.name}: ${coldStartTime.toFixed(2)}ms ${result.success ? '✅' : '❌'}`);
  }
}

/**
 * Run load test
 */
async function runLoadTest() {
  console.log('\n📊 Running Load Test...');

  for (const endpoint of ENDPOINTS) {
    console.log(`\n  Testing ${endpoint.name} (${endpoint.method} ${endpoint.path})`);

    const batchSize = CONCURRENT_REQUESTS;
    const batches = Math.ceil(TOTAL_REQUESTS / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const startIndex = batch * batchSize;
      const count = Math.min(batchSize, TOTAL_REQUESTS - startIndex);

      process.stdout.write(`    Batch ${batch + 1}/${batches}: `);
      const results = await runConcurrentRequests(endpoint, startIndex, count);

      const successCount = results.filter(r => r.success).length;
      console.log(`${successCount}/${count} successful`);

      // Small delay between batches
      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
}

/**
 * Generate performance report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📈 PERFORMANCE PROFILING REPORT');
  console.log('='.repeat(80));

  console.log('\n🎯 Target Performance Metrics:');
  console.log('  • JWKS endpoint: < 100ms');
  console.log('  • Health check: < 50ms');
  console.log('  • Cold start: < 3000ms');
  console.log('  • Memory usage: < 512MB');

  console.log('\n🧊 Cold Start Performance:');
  metrics.summary.coldStarts.forEach(cs => {
    const status = cs.time < 3000 ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${cs.endpoint}: ${cs.time.toFixed(2)}ms ${status}`);
  });

  console.log('\n📊 Endpoint Performance Analysis:');

  for (const [name, data] of Object.entries(metrics.endpoints)) {
    console.log(`\n  ${name}:`);

    if (data.times.length > 0) {
      const stats = calculateStats(data.times);
      const targetMet = stats.p95 < data.target;
      const status = targetMet ? '✅' : '❌';

      console.log(`    Response Times (ms):`);
      console.log(`      • Min: ${stats.min.toFixed(2)}`);
      console.log(`      • Avg: ${stats.avg.toFixed(2)}`);
      console.log(`      • Median: ${stats.median.toFixed(2)}`);
      console.log(`      • P95: ${stats.p95.toFixed(2)} ${status} (target: <${data.target}ms)`);
      console.log(`      • P99: ${stats.p99.toFixed(2)}`);
      console.log(`      • Max: ${stats.max.toFixed(2)}`);

      if (data.cacheHits > 0) {
        const cacheRate = (data.cacheHits / stats.count * 100).toFixed(1);
        console.log(`    Cache Hit Rate: ${cacheRate}%`);
      }

      console.log(`    Status Codes:`);
      for (const [code, count] of Object.entries(data.statusCodes)) {
        console.log(`      • ${code}: ${count} requests`);
      }

      if (data.errors.length > 0) {
        console.log(`    Errors: ${data.errors.length}`);
        const uniqueErrors = [...new Set(data.errors)];
        uniqueErrors.forEach(err => {
          const count = data.errors.filter(e => e === err).length;
          console.log(`      • ${err}: ${count}`);
        });
      }
    } else {
      console.log('    No successful requests');
    }
  }

  // Performance bottlenecks
  console.log('\n🔥 Identified Bottlenecks:');
  const bottlenecks = [];

  for (const [name, data] of Object.entries(metrics.endpoints)) {
    if (data.times.length > 0) {
      const stats = calculateStats(data.times);
      if (stats.p95 > data.target) {
        bottlenecks.push({
          endpoint: name,
          p95: stats.p95,
          target: data.target,
          delta: stats.p95 - data.target
        });
      }
    }
  }

  if (bottlenecks.length > 0) {
    bottlenecks.sort((a, b) => b.delta - a.delta);
    bottlenecks.forEach(b => {
      console.log(`  • ${b.endpoint}: ${b.p95.toFixed(2)}ms (${b.delta.toFixed(2)}ms over target)`);
    });
  } else {
    console.log('  ✅ All endpoints meeting performance targets!');
  }

  // Recommendations
  console.log('\n💡 Optimization Recommendations:');

  const recommendations = [];

  // Check JWKS performance
  const jwksStats = metrics.endpoints['JWKS'].times.length > 0
    ? calculateStats(metrics.endpoints['JWKS'].times)
    : null;

  if (jwksStats && jwksStats.p95 > 100) {
    recommendations.push('1. JWKS endpoint needs optimization:');
    recommendations.push('   - Implement edge caching with Cloudflare/Fastly');
    recommendations.push('   - Pre-warm AWS SDK client connections');
    recommendations.push('   - Consider static file serving for public keys');
  }

  // Check cold starts
  const slowColdStarts = metrics.summary.coldStarts.filter(cs => cs.time > 3000);
  if (slowColdStarts.length > 0) {
    recommendations.push(`${recommendations.length + 1}. Cold start optimization needed:`);
    recommendations.push('   - Reduce bundle size with dynamic imports');
    recommendations.push('   - Implement warm-up pings');
    recommendations.push('   - Consider edge functions for critical endpoints');
  }

  // Check cache performance
  const jwksData = metrics.endpoints['JWKS'];
  if (jwksData.cacheHits < jwksData.times.length * 0.5) {
    recommendations.push(`${recommendations.length + 1}. Cache optimization:`);
    recommendations.push('   - Increase cache TTL for stable data');
    recommendations.push('   - Implement CDN caching');
    recommendations.push('   - Add Redis for distributed caching');
  }

  if (recommendations.length === 0) {
    console.log('  ✅ Performance is optimal!');
  } else {
    recommendations.forEach(r => console.log(`  ${r}`));
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Performance Profiling for Paintbox API');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Requests: ${TOTAL_REQUESTS} total, ${CONCURRENT_REQUESTS} concurrent`);

  try {
    // Test cold start
    await testColdStart();

    // Wait a bit to let the system stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run load test
    await runLoadTest();

    // Generate report
    generateReport();

  } catch (error) {
    console.error('\n❌ Error during profiling:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { makeRequest, calculateStats };
