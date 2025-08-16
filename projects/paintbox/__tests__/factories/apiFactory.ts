/**
 * @file API test data factory
 * @description Provides factory functions for creating API test data
 */

import { faker } from '@faker-js/faker';

export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

export interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  timestamp: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  window: number;
}

/**
 * Creates an API request
 */
export function createAPIRequest(overrides?: Partial<APIRequest>): APIRequest {
  const method = faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  
  const endpoints = [
    '/api/v1/estimates',
    '/api/v1/salesforce/auth',
    '/api/v1/companycam/projects',
    '/api/v1/calculations/pricing',
    '/api/health',
    '/api/status',
  ];

  return {
    method,
    url: faker.helpers.arrayElement(endpoints),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${faker.string.alphanumeric(100)}`,
      'User-Agent': 'Paintbox/1.0',
      'X-Request-ID': faker.string.uuid(),
    },
    body: method !== 'GET' ? createRequestBody(method) : undefined,
    query: faker.datatype.boolean() ? createQueryParams() : undefined,
    ...overrides,
  };
}

/**
 * Creates an API response
 */
export function createAPIResponse(overrides?: Partial<APIResponse>): APIResponse {
  const status = faker.helpers.weightedArrayElement([
    { weight: 70, value: 200 },
    { weight: 10, value: 201 },
    { weight: 5, value: 400 },
    { weight: 5, value: 401 },
    { weight: 3, value: 403 },
    { weight: 3, value: 404 },
    { weight: 2, value: 429 },
    { weight: 2, value: 500 },
  ]);

  return {
    status,
    statusText: getStatusText(status),
    headers: {
      'Content-Type': 'application/json',
      'X-Response-Time': `${faker.number.int({ min: 10, max: 500 })}ms`,
      'X-Request-ID': faker.string.uuid(),
      'Cache-Control': 'no-cache',
    },
    body: createResponseBody(status),
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates an API error
 */
export function createAPIError(overrides?: Partial<APIError>): APIError {
  const errorCodes = [
    'VALIDATION_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'RATE_LIMITED',
    'INTERNAL_ERROR',
    'SERVICE_UNAVAILABLE',
    'TIMEOUT',
  ];

  const code = faker.helpers.arrayElement(errorCodes);

  return {
    code,
    message: getErrorMessage(code),
    details: createErrorDetails(code),
    timestamp: new Date().toISOString(),
    requestId: faker.string.uuid(),
    ...overrides,
  };
}

/**
 * Creates JWT payload
 */
export function createJWTPayload(overrides?: Partial<JWTPayload>): JWTPayload {
  const now = Math.floor(Date.now() / 1000);

  return {
    sub: faker.string.uuid(),
    email: faker.internet.email(),
    role: faker.helpers.arrayElement(['admin', 'user', 'viewer']),
    exp: now + 3600, // 1 hour from now
    iat: now,
    iss: 'paintbox-app',
    aud: 'paintbox-api',
    ...overrides,
  };
}

/**
 * Creates rate limit information
 */
export function createRateLimitInfo(overrides?: Partial<RateLimitInfo>): RateLimitInfo {
  const limit = faker.helpers.arrayElement([100, 1000, 5000, 10000]);
  const remaining = faker.number.int({ min: 0, max: limit });
  
  return {
    limit,
    remaining,
    reset: Math.floor(Date.now() / 1000) + 3600,
    window: 3600,
    ...overrides,
  };
}

/**
 * Creates request body based on method
 */
function createRequestBody(method: string): any {
  switch (method) {
    case 'POST':
      return {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        data: faker.datatype.json(),
      };
    case 'PUT':
    case 'PATCH':
      return {
        id: faker.string.uuid(),
        updates: {
          name: faker.person.fullName(),
          status: faker.helpers.arrayElement(['active', 'inactive', 'pending']),
        },
      };
    default:
      return undefined;
  }
}

/**
 * Creates query parameters
 */
function createQueryParams(): Record<string, string> {
  return {
    page: faker.number.int({ min: 1, max: 10 }).toString(),
    limit: faker.helpers.arrayElement(['10', '20', '50', '100']),
    sort: faker.helpers.arrayElement(['name', 'created_at', 'updated_at']),
    order: faker.helpers.arrayElement(['asc', 'desc']),
    filter: faker.helpers.arrayElement(['active', 'all', 'archived']),
  };
}

/**
 * Creates response body based on status
 */
function createResponseBody(status: number): any {
  if (status >= 200 && status < 300) {
    return {
      success: true,
      data: {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        created_at: faker.date.recent().toISOString(),
        updated_at: faker.date.recent().toISOString(),
      },
      meta: {
        total: faker.number.int({ min: 1, max: 1000 }),
        page: 1,
        limit: 20,
      },
    };
  } else {
    return createAPIError({ code: getErrorCodeForStatus(status) });
  }
}

/**
 * Gets status text for HTTP status codes
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
  };

  return statusTexts[status] || 'Unknown';
}

/**
 * Gets error message for error codes
 */
function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Request validation failed',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    RATE_LIMITED: 'Rate limit exceeded',
    INTERNAL_ERROR: 'An unexpected error occurred',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    TIMEOUT: 'Request timeout',
  };

  return messages[code] || 'Unknown error';
}

/**
 * Gets error code for HTTP status
 */
function getErrorCodeForStatus(status: number): string {
  const codes: Record<number, string> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
  };

  return codes[status] || 'UNKNOWN_ERROR';
}

/**
 * Creates error details based on code
 */
function createErrorDetails(code: string): any {
  switch (code) {
    case 'VALIDATION_ERROR':
      return {
        fields: {
          email: ['Invalid email format'],
          name: ['Name is required'],
        },
      };
    case 'RATE_LIMITED':
      return {
        retryAfter: 3600,
        limit: 1000,
        window: 3600,
      };
    case 'NOT_FOUND':
      return {
        resource: 'estimate',
        id: faker.string.uuid(),
      };
    default:
      return null;
  }
}

/**
 * Creates successful API responses for different endpoints
 */
export function createSuccessResponses(): Record<string, APIResponse> {
  return {
    estimates: createAPIResponse({
      status: 200,
      body: {
        success: true,
        data: Array.from({ length: 5 }, () => ({
          id: faker.string.uuid(),
          client_name: faker.person.fullName(),
          total_amount: faker.number.float({ min: 1000, max: 10000, fractionDigits: 2 }),
          status: faker.helpers.arrayElement(['draft', 'completed', 'approved']),
          created_at: faker.date.recent().toISOString(),
        })),
      },
    }),
    
    health: createAPIResponse({
      status: 200,
      body: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: 'healthy',
          redis: 'healthy',
          salesforce: 'healthy',
          companyCam: 'healthy',
        },
      },
    }),

    auth: createAPIResponse({
      status: 200,
      body: {
        success: true,
        token: faker.string.alphanumeric(100),
        refresh_token: faker.string.alphanumeric(100),
        expires_in: 3600,
        user: {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          role: 'user',
        },
      },
    }),
  };
}

/**
 * Creates error responses for different scenarios
 */
export function createErrorResponses(): Record<string, APIResponse> {
  return {
    unauthorized: createAPIResponse({
      status: 401,
      body: createAPIError({ code: 'UNAUTHORIZED' }),
    }),

    notFound: createAPIResponse({
      status: 404,
      body: createAPIError({ code: 'NOT_FOUND' }),
    }),

    rateLimited: createAPIResponse({
      status: 429,
      body: createAPIError({ code: 'RATE_LIMITED' }),
      headers: {
        'X-RateLimit-Limit': '1000',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + 3600).toString(),
        'Retry-After': '3600',
      },
    }),

    serverError: createAPIResponse({
      status: 500,
      body: createAPIError({ code: 'INTERNAL_ERROR' }),
    }),
  };
}

/**
 * Creates webhook payload
 */
export function createWebhookPayload(event: string, data?: any) {
  return {
    id: faker.string.uuid(),
    event,
    timestamp: new Date().toISOString(),
    data: data || {
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['estimate', 'project', 'photo']),
      status: faker.helpers.arrayElement(['created', 'updated', 'deleted']),
    },
    signature: faker.string.alphanumeric(64),
  };
}

/**
 * Creates batch API requests for load testing
 */
export function createAPIRequestBatch(count: number): APIRequest[] {
  return Array.from({ length: count }, () => createAPIRequest());
}

/**
 * Creates concurrent API responses for testing
 */
export function createConcurrentResponses(count: number): APIResponse[] {
  return Array.from({ length: count }, () => createAPIResponse());
}