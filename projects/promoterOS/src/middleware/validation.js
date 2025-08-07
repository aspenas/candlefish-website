/**
 * Input Validation Middleware for PromoterOS
 * Prevents injection attacks and validates API inputs
 */

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove dangerous characters and HTML tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[<>\"']/g, (char) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[char];
    })
    .trim();
}

/**
 * Validate and sanitize artist name
 * @param {string} artistName - Artist name to validate
 * @returns {Object} { valid: boolean, value: string, error?: string }
 */
function validateArtistName(artistName) {
  if (!artistName || typeof artistName !== 'string') {
    return {
      valid: false,
      error: 'Artist name is required and must be a string'
    };
  }

  const sanitized = sanitizeString(artistName);
  
  // Artist names should be 1-100 characters
  if (sanitized.length < 1 || sanitized.length > 100) {
    return {
      valid: false,
      error: 'Artist name must be between 1 and 100 characters'
    };
  }

  // Check for SQL injection patterns
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b|--|;|\*|')/i;
  if (sqlPatterns.test(sanitized)) {
    return {
      valid: false,
      error: 'Invalid characters in artist name'
    };
  }

  return {
    valid: true,
    value: sanitized
  };
}

/**
 * Validate venue capacity
 * @param {number} capacity - Venue capacity
 * @returns {Object} { valid: boolean, value: number, error?: string }
 */
function validateVenueCapacity(capacity) {
  const parsed = parseInt(capacity, 10);
  
  if (isNaN(parsed)) {
    return {
      valid: false,
      error: 'Venue capacity must be a number'
    };
  }

  // Reasonable venue capacity limits
  if (parsed < 50 || parsed > 100000) {
    return {
      valid: false,
      error: 'Venue capacity must be between 50 and 100,000'
    };
  }

  return {
    valid: true,
    value: parsed
  };
}

/**
 * Validate date input
 * @param {string} dateString - Date string to validate
 * @returns {Object} { valid: boolean, value: Date, error?: string }
 */
function validateDate(dateString) {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: 'Invalid date format'
    };
  }

  // Don't allow dates too far in the past or future
  const now = new Date();
  const maxFuture = new Date();
  maxFuture.setFullYear(maxFuture.getFullYear() + 2);
  const maxPast = new Date();
  maxPast.setFullYear(maxPast.getFullYear() - 5);

  if (date > maxFuture || date < maxPast) {
    return {
      valid: false,
      error: 'Date must be within reasonable range (5 years past to 2 years future)'
    };
  }

  return {
    valid: true,
    value: date
  };
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {Object} { valid: boolean, value: string, error?: string }
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      error: 'Email is required'
    };
  }

  const sanitized = sanitizeString(email).toLowerCase();
  
  // Basic email regex pattern
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailPattern.test(sanitized)) {
    return {
      valid: false,
      error: 'Invalid email format'
    };
  }

  return {
    valid: true,
    value: sanitized
  };
}

/**
 * Validate pagination parameters
 * @param {Object} params - Pagination parameters
 * @returns {Object} { valid: boolean, value: Object, error?: string }
 */
function validatePagination(params = {}) {
  const page = parseInt(params.page || 1, 10);
  const limit = parseInt(params.limit || 20, 10);
  
  if (isNaN(page) || page < 1) {
    return {
      valid: false,
      error: 'Page must be a positive number'
    };
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return {
      valid: false,
      error: 'Limit must be between 1 and 100'
    };
  }

  return {
    valid: true,
    value: {
      page,
      limit,
      offset: (page - 1) * limit
    }
  };
}

/**
 * Generic request body validation
 * @param {Object} body - Request body
 * @param {Object} schema - Validation schema
 * @returns {Object} { valid: boolean, value: Object, errors?: Array }
 */
function validateRequestBody(body, schema) {
  const errors = [];
  const validated = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        error: `${field} is required`
      });
      continue;
    }

    // Skip optional fields if not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push({
          field,
          error: `${field} must be of type ${rules.type}`
        });
        continue;
      }
    }

    // Custom validator
    if (rules.validator) {
      const result = rules.validator(value);
      if (!result.valid) {
        errors.push({
          field,
          error: result.error
        });
        continue;
      }
      validated[field] = result.value;
    } else {
      // Sanitize strings by default
      validated[field] = typeof value === 'string' ? sanitizeString(value) : value;
    }

    // Min/max validation for numbers
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field,
          error: `${field} must be at least ${rules.min}`
        });
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field,
          error: `${field} must be at most ${rules.max}`
        });
      }
    }

    // Length validation for strings
    if (rules.type === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push({
          field,
          error: `${field} must be at least ${rules.minLength} characters`
        });
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push({
          field,
          error: `${field} must be at most ${rules.maxLength} characters`
        });
      }
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    value: validated
  };
}

/**
 * Validation middleware for Netlify Functions
 * @param {Object} schema - Validation schema for the endpoint
 * @returns {Function} Middleware function
 */
function validationMiddleware(schema) {
  return async function(event, context, handler) {
    // Parse request body if needed
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (error) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Invalid JSON',
            message: 'Request body must be valid JSON'
          })
        };
      }
    }

    // Validate request body
    const validation = validateRequestBody(body, schema);
    
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Validation failed',
          errors: validation.errors
        })
      };
    }

    // Attach validated data to event
    event.validatedBody = validation.value;
    
    // Proceed to handler
    return handler(event, context);
  };
}

// Common validation schemas
const schemas = {
  artistEvaluation: {
    artist_name: {
      required: true,
      type: 'string',
      validator: validateArtistName
    },
    context: {
      required: false,
      type: 'object'
    }
  },
  
  bookingScore: {
    artist: {
      required: true,
      type: 'string',
      validator: validateArtistName
    },
    venue: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    capacity: {
      required: false,
      type: 'number',
      validator: validateVenueCapacity
    },
    date: {
      required: false,
      type: 'string',
      validator: validateDate
    }
  },

  userRegistration: {
    email: {
      required: true,
      type: 'string',
      validator: validateEmail
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8,
      maxLength: 100
    },
    venue_name: {
      required: false,
      type: 'string',
      maxLength: 200
    }
  }
};

// Export validation functions and middleware
module.exports = {
  sanitizeString,
  validateArtistName,
  validateVenueCapacity,
  validateDate,
  validateEmail,
  validatePagination,
  validateRequestBody,
  validationMiddleware,
  schemas
};