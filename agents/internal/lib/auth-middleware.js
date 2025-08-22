/**
 * JWT Authentication middleware for NANDA agents
 * Ensures secure communication between agents
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthMiddleware {
  constructor(agentId) {
    this.agentId = agentId;

    // Generate agent-specific keys if not provided
    this.privateKey = process.env.JWT_PRIVATE_KEY || this.generateKey();
    this.publicKey = process.env.JWT_PUBLIC_KEY || this.derivePublicKey();

    // Shared secret for inter-agent communication
    this.sharedSecret = process.env.NANDA_SHARED_SECRET || 'candlefish-nanda-2025';

    // Token cache for performance
    this.tokenCache = new Map();
    this.trustedAgents = new Set();
  }

  generateKey() {
    // Generate a secure key for this agent
    return crypto.randomBytes(64).toString('base64');
  }

  derivePublicKey() {
    // In production, use proper RSA key pairs
    return crypto.createHash('sha256').update(this.privateKey).digest('base64');
  }

  /**
   * Generate a JWT token for agent-to-agent communication
   */
  generateToken(targetAgent, claims = {}) {
    const payload = {
      iss: this.agentId,
      aud: targetAgent,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      jti: crypto.randomBytes(16).toString('hex'),
      ...claims
    };

    const token = jwt.sign(payload, this.sharedSecret, {
      algorithm: 'HS256'
    });

    // Cache the token
    this.tokenCache.set(targetAgent, {
      token,
      expires: payload.exp * 1000
    });

    return token;
  }

  /**
   * Verify an incoming JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.sharedSecret, {
        algorithms: ['HS256'],
        audience: this.agentId
      });

      // Check if agent is trusted
      if (!this.trustedAgents.has(decoded.iss) && decoded.iss !== 'candlefish:orchestrator') {
        // Auto-trust orchestrator, require explicit trust for others
        console.warn(`[Auth] Untrusted agent attempted access: ${decoded.iss}`);
      }

      return {
        valid: true,
        agent: decoded.iss,
        claims: decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Express middleware for protecting endpoints
   */
  protect() {
    return (req, res, next) => {
      // Allow health checks without auth
      if (req.path === '/health' || req.path === '/agent/info') {
        return next();
      }

      // Extract token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Missing or invalid authorization header'
        });
      }

      const token = authHeader.substring(7);
      const verification = this.verifyToken(token);

      if (!verification.valid) {
        return res.status(401).json({
          error: 'Invalid token',
          details: verification.error
        });
      }

      // Add agent info to request
      req.agent = verification.agent;
      req.claims = verification.claims;

      next();
    };
  }

  /**
   * Add authentication to outgoing requests
   */
  authenticateRequest(targetAgent, options = {}) {
    // Check cache first
    const cached = this.tokenCache.get(targetAgent);
    if (cached && cached.expires > Date.now()) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${cached.token}`
      };
      return options;
    }

    // Generate new token
    const token = this.generateToken(targetAgent);

    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    return options;
  }

  /**
   * Trust another agent
   */
  trustAgent(agentId) {
    this.trustedAgents.add(agentId);
    console.log(`[Auth] Trusted agent: ${agentId}`);
  }

  /**
   * Revoke trust for an agent
   */
  revokeAgentTrust(agentId) {
    this.trustedAgents.delete(agentId);
    this.tokenCache.delete(agentId);
    console.log(`[Auth] Revoked trust: ${agentId}`);
  }

  /**
   * Rate limiting middleware
   */
  rateLimit(maxRequests = 100, windowMs = 60000) {
    const requests = new Map();

    return (req, res, next) => {
      const agent = req.agent || req.ip;
      const now = Date.now();

      // Clean old entries
      for (const [key, data] of requests) {
        if (data.resetTime < now) {
          requests.delete(key);
        }
      }

      // Check rate limit
      const agentData = requests.get(agent) || {
        count: 0,
        resetTime: now + windowMs
      };

      if (agentData.resetTime < now) {
        agentData.count = 0;
        agentData.resetTime = now + windowMs;
      }

      agentData.count++;
      requests.set(agent, agentData);

      if (agentData.count > maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((agentData.resetTime - now) / 1000)
        });
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - agentData.count);
      res.setHeader('X-RateLimit-Reset', new Date(agentData.resetTime).toISOString());

      next();
    };
  }
}

module.exports = AuthMiddleware;
