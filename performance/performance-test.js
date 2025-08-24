#!/usr/bin/env node

/**
 * Candlefish AI Performance Testing Script
 *
 * This script performs comprehensive performance testing of the Candlefish AI platform
 * including response times, resource loading, and API performance.
 */

const https = require('https');
const { performance } = require('perf_hooks');
const { URL } = require('url');

// Configuration
const TARGETS = {
  docs: 'https://docs.candlefish.ai',
  api: 'https://api.candlefish.ai',
};

const GRAPHQL_QUERIES = [
  {
    name: 'Simple Query',
    query: '{ __typename }',
  },
  {
    name: 'Documentation Query',
    query: `{
      documents(first: 10) {
        edges {
          node {
            id
            title
            content
          }
        }
      }
    }`,
  },
];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Utility functions
function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatTime(ms) {
  if (ms < 100) return colorize(`${ms.toFixed(2)}ms`, 'green');
  if (ms < 500) return colorize(`${ms.toFixed(2)}ms`, 'yellow');
  return colorize(`${ms.toFixed(2)}ms`, 'red');
}

function formatSize(bytes) {
  const kb = bytes / 1024;
  const mb = kb / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  if (kb >= 1) return `${kb.toFixed(2)} KB`;
  return `${bytes} B`;
}

// HTTP request wrapper with timing
function timedRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const startTime = performance.now();
    let dataSize = 0;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options,
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
        dataSize += chunk.length;
      });

      res.on('end', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        resolve({
          url,
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          dataSize,
          duration,
          timing: {
            start: startTime,
            end: endTime,
            duration,
          },
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test HTML page load performance
async function testPageLoad(url) {
  console.log(`\n${colorize('Testing Page Load:', 'cyan')} ${url}`);
  console.log('─'.repeat(50));

  try {
    const result = await timedRequest(url);

    console.log(`Status: ${colorize(result.statusCode, result.statusCode === 200 ? 'green' : 'red')}`);
    console.log(`Response Time: ${formatTime(result.duration)}`);
    console.log(`Response Size: ${formatSize(result.dataSize)}`);
    console.log(`Content-Type: ${result.headers['content-type']}`);
    console.log(`Cache-Control: ${result.headers['cache-control'] || 'not set'}`);

    // Check for performance headers
    const perfHeaders = {
      'X-Response-Time': result.headers['x-response-time'],
      'Server-Timing': result.headers['server-timing'],
      'CF-Cache-Status': result.headers['cf-cache-status'],
      'X-Cache': result.headers['x-cache'],
    };

    console.log('\nPerformance Headers:');
    Object.entries(perfHeaders).forEach(([key, value]) => {
      if (value) {
        console.log(`  ${key}: ${value}`);
      }
    });

    return result;
  } catch (error) {
    console.error(colorize(`Error: ${error.message}`, 'red'));
    return null;
  }
}

// Test GraphQL API performance
async function testGraphQLAPI(endpoint, query) {
  console.log(`\n${colorize('Testing GraphQL Query:', 'cyan')} ${query.name}`);
  console.log('─'.repeat(50));

  const body = JSON.stringify({ query: query.query });

  try {
    const result = await timedRequest(`${endpoint}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      body,
    });

    console.log(`Status: ${colorize(result.statusCode, result.statusCode === 200 ? 'green' : 'red')}`);
    console.log(`Response Time: ${formatTime(result.duration)}`);
    console.log(`Response Size: ${formatSize(result.dataSize)}`);

    try {
      const jsonData = JSON.parse(result.data);
      if (jsonData.errors) {
        console.log(colorize('GraphQL Errors:', 'red'));
        jsonData.errors.forEach(err => console.log(`  - ${err.message}`));
      } else {
        console.log(colorize('GraphQL Response: Valid', 'green'));
      }
    } catch (e) {
      console.log(colorize('Response is not valid JSON', 'yellow'));
    }

    return result;
  } catch (error) {
    console.error(colorize(`Error: ${error.message}`, 'red'));
    return null;
  }
}

// Test multiple requests for consistency
async function testMultipleRequests(url, count = 5) {
  console.log(`\n${colorize('Testing Multiple Requests:', 'cyan')} ${url}`);
  console.log('─'.repeat(50));

  const results = [];

  for (let i = 0; i < count; i++) {
    const result = await timedRequest(url);
    results.push(result.duration);
    process.stdout.write(`Request ${i + 1}: ${formatTime(result.duration)}\n`);
  }

  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);
  const p95 = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)];

  console.log('\nStatistics:');
  console.log(`  Average: ${formatTime(avg)}`);
  console.log(`  Min: ${formatTime(min)}`);
  console.log(`  Max: ${formatTime(max)}`);
  console.log(`  P95: ${formatTime(p95)}`);

  return { avg, min, max, p95 };
}

// Test concurrent requests
async function testConcurrentRequests(url, concurrent = 10) {
  console.log(`\n${colorize('Testing Concurrent Requests:', 'cyan')} ${url}`);
  console.log(`Concurrent connections: ${concurrent}`);
  console.log('─'.repeat(50));

  const startTime = performance.now();
  const promises = [];

  for (let i = 0; i < concurrent; i++) {
    promises.push(timedRequest(url));
  }

  const results = await Promise.all(promises);
  const endTime = performance.now();
  const totalTime = endTime - startTime;

  const successCount = results.filter(r => r.statusCode === 200).length;
  const avgResponseTime = results.reduce((a, b) => a + b.duration, 0) / results.length;

  console.log(`Total Time: ${formatTime(totalTime)}`);
  console.log(`Successful Requests: ${colorize(`${successCount}/${concurrent}`, successCount === concurrent ? 'green' : 'yellow')}`);
  console.log(`Average Response Time: ${formatTime(avgResponseTime)}`);
  console.log(`Requests per Second: ${colorize((concurrent / (totalTime / 1000)).toFixed(2), 'cyan')}`);

  return { totalTime, successCount, avgResponseTime };
}

// Performance grade calculation
function calculateGrade(metrics) {
  let score = 100;

  // Response time scoring
  if (metrics.avgResponseTime > 100) score -= 10;
  if (metrics.avgResponseTime > 200) score -= 10;
  if (metrics.avgResponseTime > 500) score -= 20;
  if (metrics.avgResponseTime > 1000) score -= 20;

  // P95 scoring
  if (metrics.p95 > 500) score -= 10;
  if (metrics.p95 > 1000) score -= 15;

  // Consistency scoring (max - min)
  const variance = metrics.max - metrics.min;
  if (variance > 500) score -= 10;
  if (variance > 1000) score -= 10;

  // Grade assignment
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// Main test runner
async function runPerformanceTests() {
  console.log(colorize('\n🚀 Candlefish AI Performance Testing Suite', 'bright'));
  console.log('═'.repeat(50));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('═'.repeat(50));

  const summary = {
    docs: {},
    api: {},
  };

  // Test documentation site
  console.log(colorize('\n📚 Documentation Site Tests', 'blue'));
  console.log('═'.repeat(50));

  await testPageLoad(TARGETS.docs);
  const docsMetrics = await testMultipleRequests(TARGETS.docs, 5);
  const docsConcurrent = await testConcurrentRequests(TARGETS.docs, 10);

  summary.docs = {
    ...docsMetrics,
    concurrent: docsConcurrent,
    grade: calculateGrade(docsMetrics),
  };

  // Test API site
  console.log(colorize('\n🔌 API Site Tests', 'blue'));
  console.log('═'.repeat(50));

  await testPageLoad(TARGETS.api);
  const apiMetrics = await testMultipleRequests(TARGETS.api, 5);
  const apiConcurrent = await testConcurrentRequests(TARGETS.api, 10);

  // Test GraphQL queries
  for (const query of GRAPHQL_QUERIES) {
    await testGraphQLAPI(TARGETS.api, query);
  }

  summary.api = {
    ...apiMetrics,
    concurrent: apiConcurrent,
    grade: calculateGrade(apiMetrics),
  };

  // Print summary
  console.log(colorize('\n📊 Performance Summary', 'bright'));
  console.log('═'.repeat(50));

  console.log('\nDocumentation Site:');
  console.log(`  Performance Grade: ${colorize(summary.docs.grade, summary.docs.grade === 'A' ? 'green' : 'yellow')}`);
  console.log(`  Average Response: ${formatTime(summary.docs.avg)}`);
  console.log(`  P95 Response: ${formatTime(summary.docs.p95)}`);
  console.log(`  Concurrent RPS: ${(10 / (summary.docs.concurrent.totalTime / 1000)).toFixed(2)}`);

  console.log('\nAPI Site:');
  console.log(`  Performance Grade: ${colorize(summary.api.grade, summary.api.grade === 'A' ? 'green' : 'yellow')}`);
  console.log(`  Average Response: ${formatTime(summary.api.avg)}`);
  console.log(`  P95 Response: ${formatTime(summary.api.p95)}`);
  console.log(`  Concurrent RPS: ${(10 / (summary.api.concurrent.totalTime / 1000)).toFixed(2)}`);

  // Recommendations
  console.log(colorize('\n💡 Recommendations', 'cyan'));
  console.log('═'.repeat(50));

  const recommendations = [];

  if (summary.docs.avg > 200) {
    recommendations.push('- Enable CDN caching for documentation site');
  }
  if (summary.api.avg > 100) {
    recommendations.push('- Implement GraphQL query caching');
  }
  if (summary.docs.p95 > 500 || summary.api.p95 > 500) {
    recommendations.push('- Add Redis caching layer');
    recommendations.push('- Optimize database queries');
  }
  if (summary.docs.grade !== 'A' || summary.api.grade !== 'A') {
    recommendations.push('- Implement service workers for offline support');
    recommendations.push('- Enable HTTP/2 or HTTP/3');
    recommendations.push('- Optimize bundle sizes');
  }

  if (recommendations.length > 0) {
    recommendations.forEach(rec => console.log(rec));
  } else {
    console.log(colorize('✨ Performance is excellent! No major issues detected.', 'green'));
  }

  console.log('\n' + '═'.repeat(50));
  console.log(colorize('✅ Performance testing complete!', 'green'));
}

// Run tests
runPerformanceTests().catch(error => {
  console.error(colorize(`\n❌ Fatal error: ${error.message}`, 'red'));
  process.exit(1);
});
