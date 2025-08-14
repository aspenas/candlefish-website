/**
 * Input Validation Middleware for Paintbox Application
 * Implements comprehensive input validation using Zod schemas with security measures
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';
import { logger, getRequestContext } from '@/lib/logging/simple-logger';

// Common validation schemas
const commonSchemas = {
  // Basic types
  email: z.string().email('Invalid email format').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  // IDs and references
  uuid: z.string().uuid('Invalid UUID format'),
  salesforceId: z.string().regex(/^[a-zA-Z0-9]{15,18}$/, 'Invalid Salesforce ID format'),

  // Sanitized strings
  sanitizedString: z.string()
    .max(1000, 'String too long')
    .refine(val => !/<script|javascript:|data:|vbscript:/i.test(val), 'Potentially dangerous content detected'),

  // File inputs
  filename: z.string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename characters'),

  // URLs
  url: z.string().url('Invalid URL format').max(2048, 'URL too long'),

  // Numbers and amounts
  positiveInt: z.number().int().min(1, 'Must be a positive integer'),
  currency: z.number().min(0, 'Amount cannot be negative').max(999999.99, 'Amount too large'),

  // Dates
  isoDate: z.string().datetime('Invalid ISO date format'),

  // IP addresses
  ipAddress: z.string().ip('Invalid IP address'),

  // Phone numbers (basic US format)
  phoneNumber: z.string().regex(/^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/, 'Invalid phone number format'),
};

// Paintbox-specific schemas
const paintboxSchemas = {
  // Estimate data
  estimateId: commonSchemas.uuid,
  estimateData: z.object({
    clientInfo: z.object({
      name: commonSchemas.sanitizedString.min(1, 'Client name required'),
      email: commonSchemas.email,
      phone: commonSchemas.phoneNumber.optional(),
      address: commonSchemas.sanitizedString.max(500, 'Address too long'),
    }),
    exteriorWork: z.object({
      squareFootage: z.number().min(1, 'Square footage must be positive').max(50000, 'Square footage too large'),
      surfaces: z.array(z.string().max(100, 'Surface name too long')),
      paintType: z.enum(['premium', 'standard', 'basic']),
      laborHours: z.number().min(0.1, 'Labor hours must be positive').max(1000, 'Labor hours too high'),
    }).optional(),
    interiorWork: z.object({
      rooms: z.array(z.object({
        name: commonSchemas.sanitizedString.max(100, 'Room name too long'),
        squareFootage: z.number().min(1, 'Room size must be positive').max(5000, 'Room too large'),
        ceilingHeight: z.number().min(6, 'Ceiling too low').max(30, 'Ceiling too high'),
      })),
      paintType: z.enum(['premium', 'standard', 'basic']),
    }).optional(),
  }),

  // Company Cam integration
  companyCamPhotoId: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid Company Cam photo ID'),
  companyCamData: z.object({
    photoIds: z.array(commonSchemas.sanitizedString.max(100)),
    tags: z.array(commonSchemas.sanitizedString.max(50)).max(20, 'Too many tags'),
    notes: commonSchemas.sanitizedString.max(2000, 'Notes too long').optional(),
  }),

  // Salesforce integration
  salesforceAccountData: z.object({
    Name: commonSchemas.sanitizedString.min(1, 'Account name required').max(255),
    Type: z.enum(['Customer', 'Prospect', 'Partner']).optional(),
    Industry: commonSchemas.sanitizedString.max(100).optional(),
    BillingStreet: commonSchemas.sanitizedString.max(255).optional(),
    BillingCity: commonSchemas.sanitizedString.max(100).optional(),
    BillingState: z.string().length(2, 'State must be 2 characters').optional(),
    BillingPostalCode: z.string().max(20, 'Postal code too long').optional(),
    Phone: commonSchemas.phoneNumber.optional(),
    Website: commonSchemas.url.optional(),
  }),

  salesforceOpportunityData: z.object({
    Name: commonSchemas.sanitizedString.min(1, 'Opportunity name required').max(120),
    Amount: commonSchemas.currency.optional(),
    StageName: z.enum(['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']),
    CloseDate: commonSchemas.isoDate,
    Probability: z.number().min(0).max(100, 'Probability must be 0-100'),
    Type: z.enum(['New Customer', 'Existing Customer - Upgrade', 'Existing Customer - Replacement']).optional(),
  }),

  // User management
  userRegistration: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    confirmPassword: z.string(),
    firstName: commonSchemas.sanitizedString.min(1, 'First name required').max(50),
    lastName: commonSchemas.sanitizedString.min(1, 'Last name required').max(50),
    role: z.enum(['user', 'estimator', 'admin']).default('user'),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  userLogin: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password required'),
    rememberMe: z.boolean().default(false),
  }),

  // API key management
  apiKeyData: z.object({
    name: commonSchemas.sanitizedString.min(1, 'API key name required').max(100),
    permissions: z.array(z.enum(['read', 'write', 'admin'])).min(1, 'At least one permission required'),
    expiresAt: commonSchemas.isoDate.optional(),
  }),
};

// Validation configuration
interface ValidationConfig {
  sanitizeStrings?: boolean;
  maxPayloadSize?: number; // in bytes
  allowExtraFields?: boolean;
  logValidationErrors?: boolean;
  transformData?: boolean;
}

const defaultValidationConfig: ValidationConfig = {
  sanitizeStrings: true,
  maxPayloadSize: 1024 * 1024, // 1MB
  allowExtraFields: false,
  logValidationErrors: true,
  transformData: true,
};

/**
 * Sanitize input strings to prevent XSS and injection attacks
 */
function sanitizeString(input: string): string {
  return input
    .replace(/[<>'"&]/g, char => {
      const chars: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return chars[char] || char;
    })
    .trim();
}

/**
 * Deep sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Extract and parse request body
 */
async function extractRequestData(request: NextRequest): Promise<any> {
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      return await request.json();
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const data: Record<string, any> = {};

      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          data[key] = value;
        } else {
          // Handle File objects
          data[key] = {
            name: value.name,
            size: value.size,
            type: value.type,
          };
        }
      }

      return data;
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const data: Record<string, any> = {};

      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }

      return data;
    }

    // Try to parse as text
    const text = await request.text();
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { body: text };
      }
    }

    return {};
  } catch (error) {
    logger.error('Failed to parse request data', {
      contentType,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Invalid request data format');
  }
}

/**
 * Format validation errors for user-friendly responses
 */
function formatValidationErrors(error: ZodError): any {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    const field = path || 'root';

    if (!errors[field]) {
      errors[field] = [];
    }

    errors[field].push(issue.message);
  }

  return {
    message: 'Validation failed',
    errors,
    totalErrors: error.issues.length,
  };
}

/**
 * Main validation middleware function
 */
export async function validationMiddleware<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  config: ValidationConfig = {}
): Promise<NextResponse | { data: T }> {
  const requestContext = getRequestContext(request);
  const mergedConfig = { ...defaultValidationConfig, ...config };

  try {
    logger.middleware('validation', 'Processing input validation', requestContext);

    // Check payload size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > mergedConfig.maxPayloadSize!) {
      logger.security('Payload size limit exceeded', {
        ...requestContext,
        contentLength: parseInt(contentLength),
        limit: mergedConfig.maxPayloadSize,
      });

      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
    }

    // Extract request data
    let rawData: any;

    if (request.method === 'GET' || request.method === 'DELETE') {
      // Extract query parameters
      const url = new URL(request.url);
      rawData = Object.fromEntries(url.searchParams.entries());
    } else {
      // Extract body data
      rawData = await extractRequestData(request);
    }

    // Sanitize input if enabled
    let data = rawData;
    if (mergedConfig.sanitizeStrings) {
      data = sanitizeObject(rawData);
    }

    // Validate against schema
    const validationResult = schema.safeParse(data);

    if (!validationResult.success) {
      const formattedErrors = formatValidationErrors(validationResult.error);

      if (mergedConfig.logValidationErrors) {
        logger.security('Input validation failed', {
          ...requestContext,
          errors: formattedErrors.errors,
          totalErrors: formattedErrors.totalErrors,
        });
      }

      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: formattedErrors,
        },
        { status: 400 }
      );
    }

    logger.middleware('validation', 'Input validation successful', {
      ...requestContext,
      dataKeys: Object.keys(data),
    });

    return { data: validationResult.data };
  } catch (error) {
    logger.error('Validation middleware error', {
      ...requestContext,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Validation processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Higher-order function to create validation middleware with specific schema
 */
export function createValidationMiddleware<T>(
  schema: ZodSchema<T>,
  config?: ValidationConfig
) {
  return (request: NextRequest) => validationMiddleware(request, schema, config);
}

/**
 * Pre-configured validation middleware for common Paintbox operations
 */
export const validateEstimateData = createValidationMiddleware(
  paintboxSchemas.estimateData,
  { sanitizeStrings: true, logValidationErrors: true }
);

export const validateUserRegistration = createValidationMiddleware(
  paintboxSchemas.userRegistration,
  { sanitizeStrings: true, logValidationErrors: true }
);

export const validateUserLogin = createValidationMiddleware(
  paintboxSchemas.userLogin,
  { sanitizeStrings: true, logValidationErrors: false } // Don't log login attempts
);

export const validateCompanyCamData = createValidationMiddleware(
  paintboxSchemas.companyCamData,
  { sanitizeStrings: true, logValidationErrors: true }
);

export const validateSalesforceAccount = createValidationMiddleware(
  paintboxSchemas.salesforceAccountData,
  { sanitizeStrings: true, logValidationErrors: true }
);

export const validateSalesforceOpportunity = createValidationMiddleware(
  paintboxSchemas.salesforceOpportunityData,
  { sanitizeStrings: true, logValidationErrors: true }
);

export const validateApiKeyData = createValidationMiddleware(
  paintboxSchemas.apiKeyData,
  { sanitizeStrings: true, logValidationErrors: true }
);

/**
 * Generic validation for query parameters
 */
export const validateQueryParams = (schema: ZodSchema) =>
  createValidationMiddleware(schema, {
    sanitizeStrings: true,
    allowExtraFields: true
  });

/**
 * Strict validation for sensitive operations
 */
export const validateSensitiveData = (schema: ZodSchema) =>
  createValidationMiddleware(schema, {
    sanitizeStrings: true,
    allowExtraFields: false,
    logValidationErrors: true,
    maxPayloadSize: 50 * 1024, // 50KB limit for sensitive operations
  });

// Export schemas and utilities
export { commonSchemas, paintboxSchemas, sanitizeString, sanitizeObject, formatValidationErrors };
export type { ValidationConfig };
