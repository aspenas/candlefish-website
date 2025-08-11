// Input Validation Schema for Tyler Setup Platform
// Comprehensive validation rules for all GraphQL inputs

import Joi from 'joi';
import { GraphQLError } from '../resolvers/index.js';

/**
 * Validation schemas for all input types
 */
export const validationSchemas = {
  // User validation schemas
  CreateUserInput: Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2 })
      .max(255)
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'string.max': 'Email must be less than 255 characters',
        'any.required': 'Email is required',
      }),

    name: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name must be less than 100 characters',
        'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
        'any.required': 'Name is required',
      }),

    password: Joi.string()
      .min(12)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 12 characters long',
        'string.max': 'Password must be less than 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.required': 'Password is required',
      }),

    role: Joi.string()
      .valid('ADMIN', 'USER', 'CONTRACTOR')
      .default('USER')
      .messages({
        'any.only': 'Role must be one of: ADMIN, USER, CONTRACTOR',
      }),

    sendWelcomeEmail: Joi.boolean().default(true),
  }),

  UpdateUserInput: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s'-]+$/),

    email: Joi.string()
      .email({ minDomainSegments: 2 })
      .max(255),

    role: Joi.string()
      .valid('ADMIN', 'USER', 'CONTRACTOR'),

    status: Joi.string()
      .valid('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'),
  }),

  LoginInput: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),

    password: Joi.string()
      .min(1)
      .required()
      .messages({
        'string.min': 'Password cannot be empty',
        'any.required': 'Password is required',
      }),

    rememberMe: Joi.boolean().default(false),
  }),

  // Contractor validation schemas
  InviteContractorInput: Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2 })
      .max(255)
      .required(),

    name: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .required(),

    company: Joi.string()
      .min(2)
      .max(100)
      .required(),

    accessDuration: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(7)
      .messages({
        'number.min': 'Access duration must be at least 1 day',
        'number.max': 'Access duration cannot exceed 365 days',
      }),

    permissions: Joi.array()
      .items(Joi.string().valid('READ', 'WRITE', 'DELETE', 'ADMIN'))
      .min(1)
      .default(['READ'])
      .messages({
        'array.min': 'At least one permission must be granted',
      }),

    allowedSecrets: Joi.array()
      .items(Joi.string().min(1).max(255))
      .default([]),

    reason: Joi.string()
      .min(10)
      .max(500)
      .required()
      .messages({
        'string.min': 'Reason must be at least 10 characters long',
        'string.max': 'Reason must be less than 500 characters',
        'any.required': 'Reason for access is required',
      }),

    notifyEmail: Joi.boolean().default(true),
  }),

  EnhancedInviteContractorInput: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(100).required(),
    company: Joi.string().min(2).max(100).required(),

    // Access configuration
    templateId: Joi.string().uuid(),
    accessDuration: Joi.number().integer().min(1).max(365).default(7),
    permissions: Joi.array().items(Joi.string().valid('READ', 'WRITE', 'DELETE', 'ADMIN')).default(['READ']),
    allowedSecrets: Joi.array().items(Joi.string()).default([]),

    // Security requirements
    requireTwoFactor: Joi.boolean().default(false),
    requireVPN: Joi.boolean().default(false),
    ipWhitelist: Joi.array().items(Joi.string().ip()).default([]),

    // Compliance
    backgroundCheckRequired: Joi.boolean().default(false),
    trainingRequired: Joi.array().items(Joi.string()).default([]),
    agreementsRequired: Joi.array().items(Joi.string()).default([]),

    // Communication
    reason: Joi.string().min(10).max(500).required(),
    notifyEmail: Joi.boolean().default(true),
    customMessage: Joi.string().max(1000),

    // Scheduling
    startDate: Joi.date().min('now'),
    endDate: Joi.date().greater(Joi.ref('startDate')),
    timezoneRestrictions: Joi.array().items(Joi.string()).default([]),
  }),

  // Secret validation schemas
  CreateSecretInput: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .required()
      .messages({
        'string.min': 'Secret name must be at least 3 characters long',
        'string.max': 'Secret name must be less than 100 characters',
        'string.pattern.base': 'Secret name can only contain letters, numbers, hyphens, and underscores',
        'any.required': 'Secret name is required',
      }),

    value: Joi.string()
      .min(1)
      .max(65536)
      .required()
      .messages({
        'string.min': 'Secret value cannot be empty',
        'string.max': 'Secret value must be less than 64KB',
        'any.required': 'Secret value is required',
      }),

    description: Joi.string()
      .max(500)
      .allow('', null),

    type: Joi.string()
      .valid('API_KEY', 'DATABASE_PASSWORD', 'JWT_SECRET', 'ENCRYPTION_KEY', 'OAUTH_CLIENT_SECRET', 'WEBHOOK_SECRET', 'CUSTOM')
      .required()
      .messages({
        'any.only': 'Secret type must be one of the valid types',
        'any.required': 'Secret type is required',
      }),

    rotationEnabled: Joi.boolean().default(false),

    rotationDays: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .when('rotationEnabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      })
      .messages({
        'number.min': 'Rotation period must be at least 1 day',
        'number.max': 'Rotation period cannot exceed 365 days',
      }),
  }),

  UpdateSecretInput: Joi.object({
    value: Joi.string().min(1).max(65536),
    description: Joi.string().max(500).allow('', null),
    rotationEnabled: Joi.boolean(),
    rotationDays: Joi.number().integer().min(1).max(365),
  }),

  // Configuration validation schemas
  ConfigInput: Joi.object({
    key: Joi.string()
      .min(3)
      .max(100)
      .pattern(/^[a-zA-Z0-9_.-]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Config key can only contain letters, numbers, underscores, dots, and hyphens',
      }),

    value: Joi.any().required(),

    description: Joi.string().max(500).allow('', null),

    isSecret: Joi.boolean().default(false),

    environment: Joi.string()
      .valid('development', 'staging', 'production')
      .default('production'),

    category: Joi.string()
      .max(50)
      .default('general'),
  }),

  // WebSocket validation schemas
  WebSocketMessageInput: Joi.object({
    type: Joi.string()
      .valid('HEARTBEAT', 'AUTH', 'SUBSCRIBE', 'UNSUBSCRIBE', 'DATA', 'NOTIFICATION', 'ERROR', 'SYSTEM', 'BROADCAST', 'DIRECT')
      .required(),

    payload: Joi.object().required(),

    targetConnections: Joi.array().items(Joi.string()),

    broadcast: Joi.boolean().default(false),

    roomId: Joi.string().uuid(),

    responseExpected: Joi.boolean().default(false),

    responseTimeout: Joi.number().integer().min(1000).max(60000),
  }),

  WebSocketRoomInput: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500),
    maxConnections: Joi.number().integer().min(1).max(1000).default(100),
    isPrivate: Joi.boolean().default(false),
    requiresAuth: Joi.boolean().default(true),
    allowedUsers: Joi.array().items(Joi.string().uuid()),
    allowedRoles: Joi.array().items(Joi.string().valid('ADMIN', 'USER', 'CONTRACTOR')),
  }),

  // Pagination validation
  PaginationInput: Joi.object({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100',
      }),

    offset: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.min': 'Offset cannot be negative',
      }),

    cursor: Joi.string().base64(),
  }),

  // Filter validation
  AuditFilter: Joi.object({
    userId: Joi.string().uuid(),
    action: Joi.string().valid('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'CONTRACTOR_INVITED', 'CONTRACTOR_ACCESS', 'CONTRACTOR_REVOKED', 'SECRET_CREATED', 'SECRET_READ', 'SECRET_UPDATED', 'SECRET_DELETED', 'SECRET_ROTATED', 'CONFIG_UPDATED', 'WEBSOCKET_CONNECTED', 'WEBSOCKET_DISCONNECTED', 'RATE_LIMIT_EXCEEDED'),
    resource: Joi.string().max(100),
    dateFrom: Joi.date(),
    dateTo: Joi.date().greater(Joi.ref('dateFrom')),
    success: Joi.boolean(),
    ip: Joi.string().ip(),
  }),

  // Bulk operations validation
  BulkUserOperationInput: Joi.object({
    userIds: Joi.array()
      .items(Joi.string().uuid())
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one user ID is required',
        'array.max': 'Cannot process more than 100 users at once',
      }),

    operation: Joi.string()
      .valid('ACTIVATE', 'DEACTIVATE', 'CHANGE_ROLE', 'ADD_TO_GROUP', 'REMOVE_FROM_GROUP', 'RESET_PASSWORD', 'SEND_NOTIFICATION')
      .required(),

    params: Joi.object(),
  }),

  // Two-factor authentication validation
  TwoFactorSetupInput: Joi.object({
    token: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .required()
      .messages({
        'string.pattern.base': 'Token must be a 6-digit number',
        'any.required': 'Two-factor token is required',
      }),

    backupCodes: Joi.array()
      .items(Joi.string().length(10))
      .length(8)
      .required()
      .messages({
        'array.length': 'Exactly 8 backup codes are required',
      }),
  }),

  TwoFactorVerifyInput: Joi.object({
    token: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .when('backupCode', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required(),
      }),

    backupCode: Joi.string().length(10),
  }).xor('token', 'backupCode').messages({
    'object.xor': 'Either token or backup code must be provided, but not both',
  }),

  // Password validation schemas
  ChangePasswordInput: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),

    newPassword: Joi.string()
      .min(12)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .invalid(Joi.ref('currentPassword'))
      .messages({
        'string.min': 'New password must be at least 12 characters long',
        'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.invalid': 'New password must be different from current password',
        'any.required': 'New password is required',
      }),

    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Password confirmation must match new password',
        'any.required': 'Password confirmation is required',
      }),
  }),

  PasswordResetRequestInput: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
  }),

  PasswordResetConfirmInput: Joi.object({
    token: Joi.string()
      .length(64)
      .pattern(/^[a-zA-Z0-9]+$/)
      .required()
      .messages({
        'string.length': 'Invalid reset token format',
        'string.pattern.base': 'Invalid reset token format',
        'any.required': 'Reset token is required',
      }),

    newPassword: Joi.string()
      .min(12)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required(),

    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required(),
  }),
};

/**
 * Validate input against schema
 */
export function validateInput(input, schemaName) {
  const schema = validationSchemas[schemaName];

  if (!schema) {
    throw new GraphQLError(
      `Unknown validation schema: ${schemaName}`,
      'VALIDATION_ERROR',
      400
    );
  }

  const { error, value } = schema.validate(input, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));

    throw new GraphQLError(
      'Input validation failed',
      'VALIDATION_ERROR',
      400,
      {
        validationErrors,
        inputSchema: schemaName,
      }
    );
  }

  return value;
}

/**
 * Create a validation directive for GraphQL schema
 */
export function createValidationDirective() {
  return {
    typeDefs: `
      directive @validate(schema: String!) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
    `,

    transformer: (schema) => {
      // Implementation would hook into resolver execution
      // to validate inputs based on the schema parameter
      return schema;
    },
  };
}

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/[<>\"']/g, '') // Remove basic HTML/script characters
      .substring(0, 10000); // Limit length
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

/**
 * Validate and sanitize input wrapper
 */
export function validateAndSanitizeInput(input, schemaName) {
  // First sanitize to prevent injection
  const sanitized = sanitizeInput(input);

  // Then validate structure and constraints
  return validateInput(sanitized, schemaName);
}

/**
 * Common validation patterns
 */
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpecial: /^[a-zA-Z0-9_-]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  url: /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/,
};

/**
 * Custom validation messages
 */
export const validationMessages = {
  required: 'This field is required',
  email: 'Please provide a valid email address',
  minLength: (min) => `Must be at least ${min} characters long`,
  maxLength: (max) => `Must be less than ${max} characters long`,
  strongPassword: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
  invalidFormat: 'Invalid format provided',
  invalidChoice: (choices) => `Must be one of: ${choices.join(', ')}`,
  futureDate: 'Date must be in the future',
  pastDate: 'Date must be in the past',
  uniqueValue: 'This value must be unique',
};
