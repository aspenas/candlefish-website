/**
 * Custom Metrics Collection Lambda for Tyler Setup Database
 * Collects business and technical metrics not available through standard CloudWatch
 */

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cloudwatch = new AWS.CloudWatch();

// Configuration
const METRICS_CONFIG = {
  namespace: 'Tyler-Setup/Database',
  batchSize: 20, // CloudWatch metric batch limit
  sampleSize: 100, // Sample size for performance metrics
};

// Table names from environment
const TABLES = {
  entities: process.env.ENTITY_TABLE,
  events: process.env.EVENT_TABLE,
  cache: process.env.CACHE_TABLE,
  connections: process.env.CONNECTION_TABLE,
  rateLimits: process.env.RATE_LIMIT_TABLE,
};

/**
 * Main handler function
 */
exports.handler = async (event) => {
  console.log('Starting custom metrics collection...');

  try {
    const metrics = [];
    const timestamp = new Date();

    // Collect various types of metrics
    const entityMetrics = await collectEntityMetrics();
    const cacheMetrics = await collectCacheMetrics();
    const connectionMetrics = await collectConnectionMetrics();
    const performanceMetrics = await collectPerformanceMetrics();
    const businessMetrics = await collectBusinessMetrics();

    // Combine all metrics
    metrics.push(
      ...entityMetrics,
      ...cacheMetrics,
      ...connectionMetrics,
      ...performanceMetrics,
      ...businessMetrics
    );

    // Send metrics to CloudWatch in batches
    await sendMetricsToCloudWatch(metrics, timestamp);

    console.log(`Successfully collected and sent ${metrics.length} custom metrics`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Metrics collection completed',
        metricsCount: metrics.length,
        timestamp: timestamp.toISOString(),
      }),
    };

  } catch (error) {
    console.error('Error collecting metrics:', error);

    // Send error metric
    await sendErrorMetric(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Metrics collection failed',
        error: error.message,
      }),
    };
  }
};

/**
 * Collect entity-related metrics
 */
async function collectEntityMetrics() {
  const metrics = [];

  try {
    // Count entities by type
    const entityTypes = ['USER', 'CONTRACTOR', 'AUDIT', 'CONFIG', 'REFRESH_TOKEN'];

    for (const entityType of entityTypes) {
      const count = await getEntityCount(entityType);

      metrics.push({
        MetricName: 'EntityCount',
        Dimensions: [
          { Name: 'EntityType', Value: entityType },
          { Name: 'Environment', Value: process.env.ENVIRONMENT }
        ],
        Value: count,
        Unit: 'Count',
      });
    }

    // Active vs inactive users
    const activeUsers = await getEntityCount('USER', 'ACTIVE');
    const inactiveUsers = await getEntityCount('USER', 'INACTIVE');

    metrics.push(
      {
        MetricName: 'ActiveUsers',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: activeUsers,
        Unit: 'Count',
      },
      {
        MetricName: 'InactiveUsers',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: inactiveUsers,
        Unit: 'Count',
      }
    );

    // Active contractors (not expired)
    const activeContractors = await getActiveContractors();
    metrics.push({
      MetricName: 'ActiveContractors',
      Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
      Value: activeContractors,
      Unit: 'Count',
    });

  } catch (error) {
    console.error('Error collecting entity metrics:', error);
  }

  return metrics;
}

/**
 * Collect cache performance metrics
 */
async function collectCacheMetrics() {
  const metrics = [];

  try {
    // Cache table size and TTL distribution
    const cacheStats = await getCacheStats();

    metrics.push(
      {
        MetricName: 'CacheTableSize',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: cacheStats.totalItems,
        Unit: 'Count',
      },
      {
        MetricName: 'CacheHitRatio',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: cacheStats.hitRatio,
        Unit: 'Percent',
      },
      {
        MetricName: 'CacheExpiredItems',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: cacheStats.expiredItems,
        Unit: 'Count',
      }
    );

    // Cache by type
    for (const [cacheType, count] of Object.entries(cacheStats.byType)) {
      metrics.push({
        MetricName: 'CacheItemsByType',
        Dimensions: [
          { Name: 'CacheType', Value: cacheType },
          { Name: 'Environment', Value: process.env.ENVIRONMENT }
        ],
        Value: count,
        Unit: 'Count',
      });
    }

  } catch (error) {
    console.error('Error collecting cache metrics:', error);
  }

  return metrics;
}

/**
 * Collect WebSocket connection metrics
 */
async function collectConnectionMetrics() {
  const metrics = [];

  try {
    if (!TABLES.connections) {
      return metrics;
    }

    // Active connections
    const activeConnections = await getActiveConnections();

    metrics.push({
      MetricName: 'ActiveConnections',
      Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
      Value: activeConnections,
      Unit: 'Count',
    });

    // Connection duration distribution
    const connectionStats = await getConnectionStats();

    metrics.push(
      {
        MetricName: 'AverageConnectionDuration',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: connectionStats.avgDuration,
        Unit: 'Seconds',
      },
      {
        MetricName: 'ConnectionTurnover',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: connectionStats.turnoverRate,
        Unit: 'Percent',
      }
    );

  } catch (error) {
    console.error('Error collecting connection metrics:', error);
  }

  return metrics;
}

/**
 * Collect performance metrics
 */
async function collectPerformanceMetrics() {
  const metrics = [];

  try {
    // Query performance samples
    const queryPerformance = await sampleQueryPerformance();

    metrics.push(
      {
        MetricName: 'AverageQueryLatency',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: queryPerformance.avgLatency,
        Unit: 'Milliseconds',
      },
      {
        MetricName: 'SlowQueryCount',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: queryPerformance.slowQueries,
        Unit: 'Count',
      }
    );

    // Index utilization
    const indexStats = await getIndexUtilization();

    for (const [indexName, utilization] of Object.entries(indexStats)) {
      metrics.push({
        MetricName: 'IndexUtilization',
        Dimensions: [
          { Name: 'IndexName', Value: indexName },
          { Name: 'Environment', Value: process.env.ENVIRONMENT }
        ],
        Value: utilization,
        Unit: 'Percent',
      });
    }

  } catch (error) {
    console.error('Error collecting performance metrics:', error);
  }

  return metrics;
}

/**
 * Collect business metrics
 */
async function collectBusinessMetrics() {
  const metrics = [];

  try {
    // Daily activity metrics
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    // Login activity today
    const loginsToday = await getAuditCount('LOGIN', todayStart);
    const failedLoginsToday = await getAuditCount('LOGIN_FAILED', todayStart);

    metrics.push(
      {
        MetricName: 'DailyLogins',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: loginsToday,
        Unit: 'Count',
      },
      {
        MetricName: 'DailyLoginFailures',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: failedLoginsToday,
        Unit: 'Count',
      }
    );

    // User activity metrics
    const userCreationsToday = await getAuditCount('USER_CREATED', todayStart);
    const contractorInvitesToday = await getAuditCount('CONTRACTOR_INVITED', todayStart);

    metrics.push(
      {
        MetricName: 'DailyUserCreations',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: userCreationsToday,
        Unit: 'Count',
      },
      {
        MetricName: 'DailyContractorInvites',
        Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
        Value: contractorInvitesToday,
        Unit: 'Count',
      }
    );

    // Security metrics
    const suspiciousActivity = await getSuspiciousActivityCount(todayStart);

    metrics.push({
      MetricName: 'SuspiciousActivity',
      Dimensions: [{ Name: 'Environment', Value: process.env.ENVIRONMENT }],
      Value: suspiciousActivity,
      Unit: 'Count',
    });

  } catch (error) {
    console.error('Error collecting business metrics:', error);
  }

  return metrics;
}

/**
 * Helper functions for data collection
 */

async function getEntityCount(entityType, status = null) {
  const params = {
    TableName: TABLES.entities,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :entityType',
    ExpressionAttributeValues: {
      ':entityType': entityType,
    },
    Select: 'COUNT',
  };

  if (status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues[':status'] = status;
  }

  const result = await dynamodb.query(params).promise();
  return result.Count || 0;
}

async function getActiveContractors() {
  const now = Date.now();

  const params = {
    TableName: TABLES.entities,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :entityType',
    FilterExpression: 'expiresAt > :now',
    ExpressionAttributeValues: {
      ':entityType': 'CONTRACTOR',
      ':now': now,
    },
    Select: 'COUNT',
  };

  const result = await dynamodb.query(params).promise();
  return result.Count || 0;
}

async function getCacheStats() {
  const params = {
    TableName: TABLES.cache,
    Select: 'ALL_ATTRIBUTES',
    Limit: 1000, // Sample for stats
  };

  const result = await dynamodb.scan(params).promise();
  const now = Date.now();

  const stats = {
    totalItems: result.Count || 0,
    expiredItems: 0,
    hitRatio: 85, // Placeholder - would need actual hit/miss tracking
    byType: {},
  };

  for (const item of result.Items || []) {
    // Count expired items
    if (item.ttl && item.ttl * 1000 < now) {
      stats.expiredItems++;
    }

    // Group by cache type
    const cacheType = item.cacheType || 'unknown';
    stats.byType[cacheType] = (stats.byType[cacheType] || 0) + 1;
  }

  return stats;
}

async function getActiveConnections() {
  if (!TABLES.connections) {
    return 0;
  }

  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);

  const params = {
    TableName: TABLES.connections,
    FilterExpression: 'connectedAt > :threshold',
    ExpressionAttributeValues: {
      ':threshold': fiveMinutesAgo,
    },
    Select: 'COUNT',
  };

  const result = await dynamodb.scan(params).promise();
  return result.Count || 0;
}

async function getConnectionStats() {
  // Placeholder implementation - would need actual connection tracking
  return {
    avgDuration: 300, // 5 minutes
    turnoverRate: 15, // 15% per hour
  };
}

async function sampleQueryPerformance() {
  // Simulate performance sampling
  const startTime = Date.now();

  // Sample query
  const params = {
    TableName: TABLES.entities,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'USER',
    },
    Limit: 10,
  };

  const result = await dynamodb.query(params).promise();
  const latency = Date.now() - startTime;

  return {
    avgLatency: latency,
    slowQueries: latency > 100 ? 1 : 0,
  };
}

async function getIndexUtilization() {
  // Placeholder - would need CloudWatch Insights or custom tracking
  return {
    'GSI1': 75,
    'GSI2': 60,
    'GSI3': 40,
    'GSI4': 25,
  };
}

async function getAuditCount(action, sinceTimestamp) {
  const params = {
    TableName: TABLES.entities,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :entityType AND GSI1SK > :since',
    FilterExpression: '#action = :action',
    ExpressionAttributeNames: {
      '#action': 'action',
    },
    ExpressionAttributeValues: {
      ':entityType': 'AUDIT',
      ':since': sinceTimestamp,
      ':action': action,
    },
    Select: 'COUNT',
  };

  const result = await dynamodb.query(params).promise();
  return result.Count || 0;
}

async function getSuspiciousActivityCount(sinceTimestamp) {
  // Look for patterns that might indicate suspicious activity
  const suspiciousPatterns = [
    'LOGIN_FAILED',
    'UNAUTHORIZED_ACCESS_ATTEMPT',
    'MULTIPLE_FAILED_ATTEMPTS',
  ];

  let totalSuspicious = 0;

  for (const pattern of suspiciousPatterns) {
    const count = await getAuditCount(pattern, sinceTimestamp);
    totalSuspicious += count;
  }

  return totalSuspicious;
}

/**
 * Send metrics to CloudWatch in batches
 */
async function sendMetricsToCloudWatch(metrics, timestamp) {
  const batches = chunkArray(metrics, METRICS_CONFIG.batchSize);

  for (const batch of batches) {
    const params = {
      Namespace: METRICS_CONFIG.namespace,
      MetricData: batch.map(metric => ({
        ...metric,
        Timestamp: timestamp,
      })),
    };

    try {
      await cloudwatch.putMetricData(params).promise();
      console.log(`Sent batch of ${batch.length} metrics to CloudWatch`);
    } catch (error) {
      console.error('Error sending metrics batch:', error);
      throw error;
    }
  }
}

/**
 * Send error metric
 */
async function sendErrorMetric(error) {
  const params = {
    Namespace: METRICS_CONFIG.namespace,
    MetricData: [
      {
        MetricName: 'MetricsCollectionErrors',
        Dimensions: [
          { Name: 'Environment', Value: process.env.ENVIRONMENT },
          { Name: 'ErrorType', Value: error.name || 'UnknownError' }
        ],
        Value: 1,
        Unit: 'Count',
        Timestamp: new Date(),
      },
    ],
  };

  try {
    await cloudwatch.putMetricData(params).promise();
  } catch (cloudwatchError) {
    console.error('Failed to send error metric:', cloudwatchError);
  }
}

/**
 * Utility function to chunk arrays
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
