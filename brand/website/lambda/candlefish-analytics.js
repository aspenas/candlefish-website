/**
 * AWS Lambda Function for Candlefish Animation Analytics Processing
 * Handles real-time analytics, A/B testing, and memory persistence
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');

// Initialize AWS services
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cloudwatch = new AWS.CloudWatch();

// Environment variables
const ANALYTICS_TABLE_NAME = process.env.ANALYTICS_TABLE_NAME;
const MEMORY_TABLE_NAME = process.env.MEMORY_TABLE_NAME;
const AB_TESTING_TABLE_NAME = process.env.AB_TESTING_TABLE_NAME;
const ENVIRONMENT = process.env.ENVIRONMENT || 'production';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Session-Id',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Processing analytics event:', JSON.stringify(event, null, 2));
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'CORS preflight successful' })
      };
    }
    
    // Route based on path and method
    const path = event.path || event.pathParameters?.proxy;
    const method = event.httpMethod;
    
    if (path === '/analytics' && method === 'POST') {
      return await handleAnalyticsEvent(event);
    } else if (path === '/memory' && method === 'GET') {
      return await getMemoryData(event);
    } else if (path === '/memory' && method === 'POST') {
      return await updateMemoryData(event);
    } else if (path === '/ab-config' && method === 'GET') {
      return await getABTestConfig(event);
    } else {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Endpoint not found' })
      };
    }
  } catch (error) {
    console.error('Lambda execution error:', error);
    
    // Send error metric to CloudWatch
    await sendCloudWatchMetric('CandlefishAnalytics', 'Errors', 1);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

/**
 * Handle analytics event processing
 */
async function handleAnalyticsEvent(event) {
  const body = JSON.parse(event.body || '{}');
  const sessionId = extractSessionId(event);
  
  // Validate required fields
  if (!body.eventType || !sessionId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Missing required fields: eventType and sessionId' 
      })
    };
  }
  
  const timestamp = Date.now();
  const eventData = {
    session_id: sessionId,
    timestamp: timestamp,
    event_type: body.eventType,
    data: body.data || {},
    user_agent: event.headers['User-Agent'] || 'unknown',
    ip_address: getClientIP(event),
    environment: ENVIRONMENT
  };
  
  // Store analytics event
  await storeAnalyticsEvent(eventData);
  
  // Process specific event types
  await processEventByType(eventData);
  
  // Send success metrics
  await sendCloudWatchMetric('CandlefishAnalytics', 'EventsProcessed', 1);
  await sendCloudWatchMetric('CandlefishAnalytics', `EventType_${body.eventType}`, 1);
  
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ 
      success: true, 
      eventId: `${sessionId}_${timestamp}`,
      timestamp: timestamp
    })
  };
}

/**
 * Store analytics event in DynamoDB
 */
async function storeAnalyticsEvent(eventData) {
  const params = {
    TableName: ANALYTICS_TABLE_NAME,
    Item: {
      ...eventData,
      ttl: Math.floor((Date.now() + (90 * 24 * 60 * 60 * 1000)) / 1000) // 90 days TTL
    }
  };
  
  await dynamodb.put(params).promise();
}

/**
 * Process event based on type for real-time metrics
 */
async function processEventByType(eventData) {
  switch (eventData.event_type) {
    case 'mood_transition':
      await processMoodTransition(eventData);
      break;
    case 'feeding_interaction':
      await processFeedingInteraction(eventData);
      break;
    case 'trust_level_change':
      await processTrustLevelChange(eventData);
      break;
    case 'session_start':
      await processSessionStart(eventData);
      break;
    case 'session_end':
      await processSessionEnd(eventData);
      break;
    case 'performance_metrics':
      await processPerformanceMetrics(eventData);
      break;
    case 'ab_test_conversion':
      await processABTestConversion(eventData);
      break;
    default:
      console.log(`Unknown event type: ${eventData.event_type}`);
  }
}

/**
 * Process mood transition events
 */
async function processMoodTransition(eventData) {
  const { mood, previousMood } = eventData.data;
  
  // Send CloudWatch metrics
  await sendCloudWatchMetric('CandlefishAnimation', 'MoodTransitions', 1, [
    { Name: 'Mood', Value: mood },
    { Name: 'PreviousMood', Value: previousMood || 'none' }
  ]);
}

/**
 * Process feeding interaction events
 */
async function processFeedingInteraction(eventData) {
  const { position, trustLevelBefore, trustLevelAfter } = eventData.data;
  
  await sendCloudWatchMetric('CandlefishAnimation', 'FeedingInteractions', 1);
  await sendCloudWatchMetric('CandlefishAnimation', 'TrustIncrease', 
    trustLevelAfter - trustLevelBefore);
}

/**
 * Process trust level changes
 */
async function processTrustLevelChange(eventData) {
  const { trustLevel, change } = eventData.data;
  
  await sendCloudWatchMetric('CandlefishAnimation', 'TrustLevel', trustLevel);
  await sendCloudWatchMetric('CandlefishAnimation', 'TrustChange', change);
}

/**
 * Process session start events
 */
async function processSessionStart(eventData) {
  const { isReturningUser, device } = eventData.data;
  
  await sendCloudWatchMetric('CandlefishAnimation', 'Sessions', 1);
  if (isReturningUser) {
    await sendCloudWatchMetric('CandlefishAnimation', 'ReturningSessions', 1);
  }
  await sendCloudWatchMetric('CandlefishAnimation', 'SessionsByDevice', 1, [
    { Name: 'Device', Value: device || 'unknown' }
  ]);
}

/**
 * Process session end events
 */
async function processSessionEnd(eventData) {
  const { duration, interactionCount, finalTrustLevel } = eventData.data;
  
  await sendCloudWatchMetric('CandlefishAnimation', 'SessionDuration', duration);
  await sendCloudWatchMetric('CandlefishAnimation', 'InteractionsPerSession', interactionCount);
  await sendCloudWatchMetric('CandlefishAnimation', 'FinalTrustLevel', finalTrustLevel);
}

/**
 * Process performance metrics
 */
async function processPerformanceMetrics(eventData) {
  const { fps, memoryUsage, errorCount, loadTime } = eventData.data;
  
  if (fps !== undefined) {
    await sendCloudWatchMetric('CandlefishAnimation', 'FPS', fps);
  }
  if (memoryUsage !== undefined) {
    await sendCloudWatchMetric('CandlefishAnimation', 'MemoryUsage', memoryUsage);
  }
  if (errorCount !== undefined) {
    await sendCloudWatchMetric('CandlefishAnimation', 'ErrorCount', errorCount);
  }
  if (loadTime !== undefined) {
    await sendCloudWatchMetric('CandlefishAnimation', 'LoadTime', loadTime);
  }
}

/**
 * Process A/B test conversion events
 */
async function processABTestConversion(eventData) {
  const { experimentId, variantId, conversionType, value } = eventData.data;
  
  await sendCloudWatchMetric('CandlefishABTesting', 'Conversions', 1, [
    { Name: 'ExperimentId', Value: experimentId },
    { Name: 'VariantId', Value: variantId },
    { Name: 'ConversionType', Value: conversionType }
  ]);
  
  if (value !== undefined) {
    await sendCloudWatchMetric('CandlefishABTesting', 'ConversionValue', value, [
      { Name: 'ExperimentId', Value: experimentId },
      { Name: 'VariantId', Value: variantId }
    ]);
  }
}

/**
 * Get memory data for a user
 */
async function getMemoryData(event) {
  const sessionId = extractSessionId(event);
  const userHash = createUserHash(getClientIP(event), event.headers['User-Agent'] || '');
  
  try {
    const params = {
      TableName: MEMORY_TABLE_NAME,
      Key: { user_hash: userHash }
    };
    
    const result = await dynamodb.get(params).promise();
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        memoryData: result.Item?.memory_data || null,
        lastUpdated: result.Item?.last_updated || null
      })
    };
  } catch (error) {
    console.error('Error fetching memory data:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch memory data' })
    };
  }
}

/**
 * Update memory data for a user
 */
async function updateMemoryData(event) {
  const body = JSON.parse(event.body || '{}');
  const userHash = createUserHash(getClientIP(event), event.headers['User-Agent'] || '');
  
  if (!body.memoryData) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing memoryData' })
    };
  }
  
  try {
    const params = {
      TableName: MEMORY_TABLE_NAME,
      Item: {
        user_hash: userHash,
        memory_data: body.memoryData,
        last_updated: Date.now(),
        ttl: Math.floor((Date.now() + (365 * 24 * 60 * 60 * 1000)) / 1000) // 1 year TTL
      }
    };
    
    await dynamodb.put(params).promise();
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error updating memory data:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to update memory data' })
    };
  }
}

/**
 * Get A/B test configuration
 */
async function getABTestConfig(event) {
  try {
    const params = {
      TableName: AB_TESTING_TABLE_NAME,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'running' }
    };
    
    const result = await dynamodb.scan(params).promise();
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        experiments: result.Items || []
      })
    };
  } catch (error) {
    console.error('Error fetching A/B test config:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch A/B test configuration' })
    };
  }
}

/**
 * Helper functions
 */

function extractSessionId(event) {
  return event.headers['X-Session-Id'] || 
         event.queryStringParameters?.sessionId || 
         event.pathParameters?.sessionId || 
         null;
}

function getClientIP(event) {
  return event.headers['X-Forwarded-For']?.split(',')[0] ||
         event.headers['X-Real-IP'] ||
         event.requestContext?.identity?.sourceIp ||
         'unknown';
}

function createUserHash(ip, userAgent) {
  const hash = crypto.createHash('sha256');
  hash.update(`${ip}:${userAgent}`);
  return hash.digest('hex');
}

async function sendCloudWatchMetric(namespace, metricName, value, dimensions = []) {
  try {
    const params = {
      Namespace: namespace,
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: 'Count',
        Timestamp: new Date(),
        Dimensions: dimensions
      }]
    };
    
    await cloudwatch.putMetricData(params).promise();
  } catch (error) {
    console.error('Failed to send CloudWatch metric:', error);
    // Don't throw error to avoid disrupting main functionality
  }
}

// Health check endpoint
exports.healthCheck = async () => {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: ENVIRONMENT
    })
  };
};