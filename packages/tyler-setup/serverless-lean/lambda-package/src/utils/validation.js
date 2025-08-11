import Joi from 'joi';

/**
 * Validation schemas for different endpoints
 */

// User schemas
export const userLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(254)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required'
    })
});

export const userCreateSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(254)
    .required(),
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, lowercase letter, number, and special character'
    }),
  role: Joi.string()
    .valid('admin', 'manager', 'employee')
    .default('employee'),
  department: Joi.string()
    .trim()
    .max(50)
    .optional()
});

export const userUpdateSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional(),
  role: Joi.string()
    .valid('admin', 'manager', 'employee')
    .optional(),
  department: Joi.string()
    .trim()
    .max(50)
    .optional(),
  isActive: Joi.boolean().optional()
});

// Secret schemas
export const secretCreateSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(256)
    .pattern(/^[a-zA-Z0-9\-_\/]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Secret name can only contain alphanumeric characters, hyphens, underscores, and forward slashes'
    }),
  value: Joi.alternatives()
    .try(
      Joi.string().max(65536),
      Joi.object()
    )
    .required(),
  description: Joi.string()
    .trim()
    .max(500)
    .optional(),
  tags: Joi.array()
    .items(Joi.object({
      Key: Joi.string().max(128).required(),
      Value: Joi.string().max(256).required()
    }))
    .max(50)
    .optional()
});

export const secretUpdateSchema = Joi.object({
  value: Joi.alternatives()
    .try(
      Joi.string().max(65536),
      Joi.object()
    )
    .required(),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
});

// Contractor schemas
export const contractorInviteSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(254)
    .required(),
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required(),
  expiresInHours: Joi.number()
    .integer()
    .min(1)
    .max(168) // 7 days max
    .default(24),
  allowedSecrets: Joi.array()
    .items(Joi.string().trim().min(1).max(256))
    .max(50)
    .optional(),
  permissions: Joi.array()
    .items(Joi.string().valid('read_secrets', 'read_users', 'read_config'))
    .default(['read_secrets'])
});

// Configuration schemas
export const configUpdateSchema = Joi.object({
  maxTeamSize: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional(),
  enableContractorAccess: Joi.boolean().optional(),
  passwordPolicy: Joi.object({
    minLength: Joi.number().integer().min(8).max(128),
    requireUppercase: Joi.boolean(),
    requireLowercase: Joi.boolean(),
    requireNumbers: Joi.boolean(),
    requireSpecialChars: Joi.boolean(),
    maxAge: Joi.number().integer().min(30).max(365) // days
  }).optional(),
  sessionTimeout: Joi.number()
    .integer()
    .min(300) // 5 minutes
    .max(86400) // 24 hours
    .optional()
});

// Path parameter schemas
export const idParamSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .pattern(/^[a-zA-Z0-9\-_]+$/)
  .required();

export const secretNameParamSchema = Joi.string()
  .trim()
  .min(1)
  .max(256)
  .pattern(/^[a-zA-Z0-9\-_\/]+$/)
  .required();

/**
 * Validate request body against schema
 */
export const validateBody = (data, schema) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw new ValidationError('Validation failed', details);
  }

  return value;
};

/**
 * Validate path parameters
 */
export const validateParam = (value, schema, paramName) => {
  const { error, value: validatedValue } = schema.validate(value);

  if (error) {
    throw new ValidationError(`Invalid ${paramName}`, [{
      field: paramName,
      message: error.details[0].message
    }]);
  }

  return validatedValue;
};

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Sanitize string input to prevent XSS
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Sanitize object recursively
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};
