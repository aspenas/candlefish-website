/**
 * JWT Authentication Middleware for PromoterOS
 * Provides secure authentication for API endpoints
 */

const jwt = require('jsonwebtoken');

// Get JWT secret from environment or use a secure default for development
const JWT_SECRET = process.env.JWT_SECRET || 'promoteros-jwt-secret-change-in-production';
const JWT_ISSUER = 'https://promoteros.candlefish.ai';
const JWT_AUDIENCE = 'promoteros-api';

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with id, email, role
 * @param {Object} options - Token options (expiresIn, etc.)
 * @returns {string} JWT token
 */
function generateToken(user, options = {}) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role || 'user',
    iat: Math.floor(Date.now() / 1000)
  };

  const tokenOptions = {
    expiresIn: options.expiresIn || '24h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    ...options
  };

  return jwt.sign(payload, JWT_SECRET, tokenOptions);
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Extract token from Authorization header
 * @param {Object} headers - Request headers
 * @returns {string|null} Token or null if not found
 */
function extractToken(headers) {
  const authHeader = headers.authorization || headers.Authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer TOKEN" and "JWT TOKEN" formats
  const parts = authHeader.split(' ');
  if (parts.length === 2 && (parts[0] === 'Bearer' || parts[0] === 'JWT')) {
    return parts[1];
  }

  return null;
}

/**
 * Authentication middleware for Netlify Functions
 * @param {Object} event - Netlify function event
 * @param {Object} context - Netlify function context
 * @param {Function} handler - The actual handler function
 * @returns {Object} Response object or handler result
 */
async function authMiddleware(event, context, handler) {
  // Skip auth for OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://promoteros.candlefish.ai',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: ''
    };
  }

  try {
    const token = extractToken(event.headers);

    if (!token) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="PromoterOS API"'
        },
        body: JSON.stringify({
          error: 'Authentication required',
          message: 'Please provide a valid JWT token in the Authorization header'
        })
      };
    }

    // Verify token and attach user to context
    const decoded = verifyToken(token);
    event.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };

    // Call the actual handler with authenticated user
    return await handler(event, context);

  } catch (error) {
    console.error('Authentication error:', error.message);

    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="PromoterOS API", error="invalid_token"'
      },
      body: JSON.stringify({
        error: 'Authentication failed',
        message: error.message
      })
    };
  }
}

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
function requireRole(allowedRoles) {
  return async function(event, context, handler) {
    // First run auth middleware
    const authResult = await authMiddleware(event, context, async (authedEvent) => {
      // Check if user has required role
      if (!allowedRoles.includes(authedEvent.user.role)) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Insufficient permissions',
            message: `This endpoint requires one of the following roles: ${allowedRoles.join(', ')}`
          })
        };
      }

      // User has required role, proceed to handler
      return handler(authedEvent, context);
    });

    return authResult;
  };
}

/**
 * Public endpoint wrapper (no auth required but adds user if token present)
 * @param {Object} event - Netlify function event
 * @param {Object} context - Netlify function context
 * @param {Function} handler - The actual handler function
 * @returns {Object} Response object or handler result
 */
async function publicEndpoint(event, context, handler) {
  const token = extractToken(event.headers);

  if (token) {
    try {
      const decoded = verifyToken(token);
      event.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      // Invalid token, but continue as anonymous user
      console.log('Invalid token provided, continuing as anonymous:', error.message);
    }
  }

  return handler(event, context);
}

// Export middleware functions
module.exports = {
  authMiddleware,
  requireRole,
  publicEndpoint,
  generateToken,
  verifyToken,
  extractToken
};
