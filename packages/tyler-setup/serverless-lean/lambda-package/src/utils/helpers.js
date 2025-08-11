import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { verifyJwtToken, getSecurityHeaders } from './security.js';
import { ValidationError } from './validation.js';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });

// Request tracking for rate limiting
const requestCounts = new Map();

/**
 * Enhanced response function with security headers and proper CORS
 */
export const response = (statusCode, body, additionalHeaders = {}) => {
  // Determine allowed origins based on environment
  const allowedOrigins = process.env.STAGE === 'prod'
    ? ['http://candlefish-employee-setup-lean-prod-web.s3-website-us-east-1.amazonaws.com', 'https://candlefish.ai']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  const origin = process.env.CORS_ORIGIN || allowedOrigins[0];

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...getSecurityHeaders(),
      ...additionalHeaders,
    },
    body: JSON.stringify({
      ...body,
      timestamp: new Date().toISOString(),
      requestId: process.env.AWS_REQUEST_ID || 'local',
    }),
  };
};

/**
 * Enhanced error response with proper error codes and messages
 */
export const errorResponse = (statusCode, message, details = null) => {
  const errorBody = {
    success: false,
    error: {
      code: getErrorCode(statusCode),
      message,
      ...(details && { details }),
    },
  };

  // Log error for monitoring
  console.error('API Error:', {
    statusCode,
    message,
    details,
    timestamp: new Date().toISOString(),
  });

  // Send metric to CloudWatch
  putMetric('ApiErrors', 1, [
    { Name: 'StatusCode', Value: statusCode.toString() },
    { Name: 'Stage', Value: process.env.STAGE || 'dev' }
  ]);

  return response(statusCode, errorBody);
};

/**
 * Enhanced authentication validation
 */
export const validateAuth = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return null;
    }

    const decoded = await verifyJwtToken(token);

    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }

    return decoded;
  } catch (error) {
    console.error('Auth validation error:', error.message);
    await logAudit({
      action: 'AUTH_VALIDATION_FAILED',
      reason: error.message,
      ip: event.requestContext?.identity?.sourceIp,
      userAgent: event.headers?.['User-Agent'],
    });
    return null;
  }
};

/**
 * Rate limiting check
 */
export const checkRateLimit = (identifier, limit) => {
  const now = Date.now();
  const windowMs = limit.windowMs || 15 * 60 * 1000; // 15 minutes default
  const maxRequests = limit.max || 100;

  // Clean old entries
  const cutoff = now - windowMs;
  const current = requestCounts.get(identifier) || [];
  const validRequests = current.filter(timestamp => timestamp > cutoff);

  if (validRequests.length >= maxRequests) {
    putMetric('RateLimitExceeded', 1, [
      { Name: 'Identifier', Value: identifier },
      { Name: 'Stage', Value: process.env.STAGE || 'dev' }
    ]);
    return false;
  }

  // Add current request
  validRequests.push(now);
  requestCounts.set(identifier, validRequests);

  return true;
};

/**
 * Enhanced audit logging with structured data
 */
export const logAudit = async (entry) => {
  try {
    const auditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      stage: process.env.STAGE || 'dev',
      service: 'employee-setup',
      ...entry,
    };

    await docClient.send(new PutCommand({
      TableName: `${process.env.SECRETS_PREFIX}-audit`,
      Item: auditEntry,
    }));

    // Also send important events to CloudWatch
    if (isImportantAuditEvent(entry.action)) {
      await putMetric('AuditEvents', 1, [
        { Name: 'Action', Value: entry.action },
        { Name: 'Stage', Value: process.env.STAGE || 'dev' }
      ]);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit logging failure shouldn't break the main flow
  }
};

/**
 * Send custom metrics to CloudWatch
 */
export const putMetric = async (metricName, value, dimensions = []) => {
  try {
    await cloudWatchClient.send(new PutMetricDataCommand({
      Namespace: 'CandlefishEmployeeSetup',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: 'Count',
        Dimensions: dimensions,
        Timestamp: new Date(),
      }],
    }));
  } catch (error) {
    console.error('CloudWatch metric error:', error);
    // Don't throw - metrics failure shouldn't break the main flow
  }
};

/**
 * Handle different types of errors consistently
 */
export const handleError = (error, context = '') => {
  console.error(`Error in ${context}:`, error);

  if (error instanceof ValidationError) {
    return errorResponse(400, 'Validation failed', error.details);
  }

  if (error.name === 'JsonWebTokenError') {
    return errorResponse(401, 'Invalid authentication token');
  }

  if (error.name === 'TokenExpiredError') {
    return errorResponse(401, 'Authentication token expired');
  }

  if (error.name === 'ResourceNotFoundException') {
    return errorResponse(404, 'Resource not found');
  }

  if (error.name === 'ConditionalCheckFailedException') {
    return errorResponse(409, 'Resource already exists or condition failed');
  }

  if (error.name === 'AccessDeniedException') {
    return errorResponse(403, 'Access denied');
  }

  // Generic server error
  return errorResponse(500, 'Internal server error');
};

/**
 * Get structured error code from HTTP status
 */
const getErrorCode = (statusCode) => {
  const codes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
  };
  return codes[statusCode] || 'UNKNOWN_ERROR';
};

/**
 * Check if audit event should generate metrics
 */
const isImportantAuditEvent = (action) => {
  const importantEvents = [
    'LOGIN_FAILED',
    'LOGIN_SUCCESS',
    'SECRET_CREATED',
    'SECRET_DELETED',
    'USER_CREATED',
    'USER_DELETED',
    'CONTRACTOR_INVITED',
    'AUTH_VALIDATION_FAILED'
  ];
  return importantEvents.includes(action);
};

/**
 * Validate request size to prevent large payload attacks
 */
export const validateRequestSize = (event, maxSizeKB = 100) => {
  const body = event.body || '';
  const sizeKB = Buffer.byteLength(body, 'utf8') / 1024;

  if (sizeKB > maxSizeKB) {
    throw new ValidationError(`Request size too large: ${sizeKB.toFixed(2)}KB (max: ${maxSizeKB}KB)`);
  }

  return true;
};

/**
 * Extract client IP for rate limiting and logging
 */
export const getClientIP = (event) => {
  return event.requestContext?.identity?.sourceIp ||
         event.headers?.['X-Forwarded-For']?.split(',')[0]?.trim() ||
         'unknown';
};
