#!/usr/bin/env node
/**
 * GraphQL API Health Check
 * Comprehensive health monitoring for GraphQL service
 */

const HealthChecker = require('./health-check-base.js');
const http = require('http');

class GraphQLHealthChecker extends HealthChecker {
  constructor() {
    super({
      port: process.env.PORT || 4000,
      path: '/health'
    });

    // Add GraphQL-specific health checks
    this.addCheck('graphql', () => this.graphqlCheck());
    this.addCheck('database', () => this.databaseCheck());
    this.addCheck('redis', () => this.redisCheck());
    this.addCheck('federation', () => this.federationCheck());
  }

  // GraphQL introspection query health check
  async graphqlCheck() {
    const query = `
      query HealthCheck {
        __schema {
          queryType {
            name
          }
        }
      }
    `;

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ query });
      const options = {
        hostname: 'localhost',
        port: this.port,
        path: '/graphql',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.data && response.data.__schema) {
              resolve({
                status: 'healthy',
                schemaQueryType: response.data.__schema.queryType.name
              });
            } else {
              reject(new Error('GraphQL schema not accessible'));
            }
          } catch (error) {
            reject(new Error(`GraphQL health check failed: ${error.message}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('GraphQL health check timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  // Database connectivity check
  async databaseCheck() {
    try {
      // Check if we can connect to the database
      const response = await this.makeHealthRequest('/health/db');
      return {
        status: 'healthy',
        connection: 'active',
        responseTime: response.duration
      };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  // Redis connectivity check
  async redisCheck() {
    try {
      const response = await this.makeHealthRequest('/health/cache');
      return {
        status: 'healthy',
        connection: 'active',
        responseTime: response.duration
      };
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}`);
    }
  }

  // Federation gateway health check
  async federationCheck() {
    try {
      const response = await this.makeHealthRequest('/health/federation');
      return {
        status: 'healthy',
        gateway: 'active',
        subgraphs: response.subgraphs || 'unknown'
      };
    } catch (error) {
      // Federation check is optional for development
      if (process.env.NODE_ENV === 'development') {
        return { status: 'skipped', reason: 'development mode' };
      }
      throw new Error(`Federation health check failed: ${error.message}`);
    }
  }

  // Helper method to make health requests
  makeHealthRequest(path) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const req = http.request({
        hostname: 'localhost',
        port: this.port,
        path: path,
        method: 'GET',
        timeout: 3000
      }, (res) => {
        const duration = Date.now() - startTime;
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 400) {
            try {
              const response = JSON.parse(data);
              resolve({ ...response, duration });
            } catch {
              resolve({ status: 'healthy', duration });
            }
          } else {
            reject(new Error(`Health endpoint returned ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health request timeout'));
      });

      req.end();
    });
  }

  // Override HTTP health check for GraphQL-specific endpoint
  async httpHealthCheck() {
    try {
      const response = await this.makeHealthRequest('/health');
      return {
        status: 'healthy',
        endpoint: 'active',
        responseTime: response.duration
      };
    } catch (error) {
      throw new Error(`HTTP health check failed: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const checker = new GraphQLHealthChecker();

  try {
    const results = await checker.runChecks();

    if (process.env.HEALTH_CHECK_VERBOSE === 'true') {
      console.log(JSON.stringify(results, null, 2));
    }

    if (results.status === 'healthy') {
      process.exit(0);
    } else {
      console.error('GraphQL health check failed:', JSON.stringify(results, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('GraphQL health check error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('GraphQL health check failed:', error.message);
    process.exit(1);
  });
}

module.exports = GraphQLHealthChecker;
