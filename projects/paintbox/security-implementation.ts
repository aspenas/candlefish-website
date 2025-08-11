/**
 * Security Implementation Module for Paintbox
 * Addresses critical vulnerabilities identified in security audit
 */

import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import csrf from 'csurf'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

// ============================================================================
// AUTHENTICATION IMPLEMENTATION
// ============================================================================

interface User {
  id: string
  email: string
  password: string
  role: 'admin' | 'estimator' | 'viewer'
  createdAt: Date
  lastLogin: Date
}

export class AuthenticationService {
  private jwtSecret: string

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Generate JWT token
   */
  generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      this.jwtSecret,
      {
        expiresIn: '24h',
        issuer: 'paintbox',
        audience: 'paintbox-users'
      }
    )
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'paintbox',
        audience: 'paintbox-users'
      })
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }

  /**
   * Authentication middleware
   */
  authenticate() {
    return async (req: any, res: any, next: any) => {
      const token = req.cookies?.session || req.headers?.authorization?.split(' ')[1]

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      try {
        const decoded = this.verifyToken(token)
        req.user = decoded
        next()
      } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }
    }
  }

  /**
   * Role-based access control middleware
   */
  authorize(roles: string[]) {
    return (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      next()
    }
  }
}

// ============================================================================
// INPUT VALIDATION & SANITIZATION
// ============================================================================

// Validation schemas
export const ValidationSchemas = {
  login: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128)
  }),

  estimate: z.object({
    clientName: z.string().min(2).max(100).regex(/^[a-zA-Z\s\-']+$/),
    email: z.string().email().max(255),
    phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/),
    address: z.string().min(5).max(500),
    projectType: z.enum(['Interior', 'Exterior', 'Interior & Exterior', 'Commercial']),
    squareFootage: z.number().min(100).max(50000),
    notes: z.string().max(2000).optional()
  }),

  searchQuery: z.object({
    q: z.string().min(1).max(100),
    type: z.enum(['contacts', 'accounts', 'projects']).optional(),
    limit: z.number().min(1).max(100).default(20)
  })
}

export class InputSanitizer {
  /**
   * Sanitize HTML input to prevent XSS
   */
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })
  }

  /**
   * Sanitize SQL input to prevent injection
   */
  static sanitizeSql(input: string): string {
    // Remove SQL keywords and special characters
    const dangerous = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|SCRIPT)\b|[;'"`\\])/gi
    return input.replace(dangerous, '')
  }

  /**
   * Validate and sanitize request data
   */
  static validateAndSanitize(schema: z.ZodSchema, data: any) {
    // First validate structure
    const validated = schema.parse(data)

    // Then sanitize string fields
    const sanitized: any = {}
    for (const [key, value] of Object.entries(validated)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeHtml(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }
}

// ============================================================================
// SECURITY HEADERS CONFIGURATION
// ============================================================================

export function configureSecurityHeaders(app: express.Application) {
  // Use Helmet for basic security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'nonce-{{nonce}}'", "https://apis.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://paintbox-app.fly.dev", "wss://paintbox-app.fly.dev"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true
    }
  }))

  // Additional custom headers
  app.use((req, res, next) => {
    // Generate nonce for CSP
    const nonce = require('crypto').randomBytes(16).toString('base64')
    res.locals.nonce = nonce

    // Update CSP with nonce
    const csp = res.getHeader('Content-Security-Policy') as string
    if (csp) {
      res.setHeader('Content-Security-Policy',
        csp.replace('{{nonce}}', nonce))
    }

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=()')

    // Remove fingerprinting headers
    res.removeHeader('X-Powered-By')

    next()
  })
}

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

export const RateLimiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Strict rate limit for authentication
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts, please try again later',
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Rate limit for estimate creation
  estimate: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 estimates per hour
    message: 'Estimate creation limit reached, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Rate limit for API search
  search: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: 'Search rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false
  })
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

export function configureCsrfProtection(app: express.Application) {
  const csrfProtection = csrf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  })

  // Apply CSRF to state-changing routes
  app.use('/api/estimate', csrfProtection)
  app.use('/api/auth/logout', csrfProtection)
  app.use('/api/settings', csrfProtection)

  // Provide CSRF token endpoint
  app.get('/api/csrf-token', csrfProtection, (req: any, res) => {
    res.json({ csrfToken: req.csrfToken() })
  })
}

// ============================================================================
// SECRETS MANAGEMENT
// ============================================================================

export class SecretsManager {
  private client: SecretsManagerClient
  private cache: Map<string, { value: any, expires: number }> = new Map()

  constructor(region: string = 'us-west-2') {
    this.client = new SecretsManagerClient({ region })
  }

  /**
   * Retrieve secret from AWS Secrets Manager with caching
   */
  async getSecret(secretId: string): Promise<any> {
    // Check cache
    const cached = this.cache.get(secretId)
    if (cached && cached.expires > Date.now()) {
      return cached.value
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretId })
      const response = await this.client.send(command)

      const secret = response.SecretString
        ? JSON.parse(response.SecretString)
        : response.SecretBinary

      // Cache for 5 minutes
      this.cache.set(secretId, {
        value: secret,
        expires: Date.now() + 5 * 60 * 1000
      })

      return secret
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretId}:`, error)
      throw new Error('Failed to retrieve configuration')
    }
  }

  /**
   * Load all application secrets
   */
  async loadApplicationSecrets(): Promise<void> {
    const secrets = await this.getSecret('paintbox/production')

    // Set environment variables (but don't expose them)
    process.env.JWT_SECRET = secrets.JWT_SECRET
    process.env.DATABASE_URL = secrets.DATABASE_URL
    process.env.ENCRYPTION_KEY = secrets.ENCRYPTION_KEY
    process.env.SALESFORCE_CLIENT_ID = secrets.SALESFORCE_CLIENT_ID
    process.env.SALESFORCE_CLIENT_SECRET = secrets.SALESFORCE_CLIENT_SECRET
    process.env.COMPANYCAM_API_KEY = secrets.COMPANYCAM_API_KEY

    // Clear sensitive data from memory
    Object.keys(secrets).forEach(key => {
      secrets[key] = undefined
    })
  }
}

// ============================================================================
// SECURE SESSION MANAGEMENT
// ============================================================================

export interface SessionConfig {
  secret: string
  name?: string
  cookie?: {
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
    maxAge?: number
    domain?: string
    path?: string
  }
}

export function configureSecureSession(config: SessionConfig) {
  return {
    secret: config.secret,
    name: config.name || 'paintbox.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: config.cookie?.httpOnly !== false,
      secure: config.cookie?.secure !== false && process.env.NODE_ENV === 'production',
      sameSite: config.cookie?.sameSite || 'strict',
      maxAge: config.cookie?.maxAge || 24 * 60 * 60 * 1000, // 24 hours
      domain: config.cookie?.domain,
      path: config.cookie?.path || '/'
    }
  }
}

// ============================================================================
// SECURITY MONITORING & LOGGING
// ============================================================================

export class SecurityMonitor {
  private suspiciousPatterns = [
    /(<script|javascript:|onerror=|onclick=)/i,
    /(union.*select|select.*from|insert.*into|delete.*from|drop.*table)/i,
    /(\.\.\/|\.\.\\|%2e%2e)/i, // Directory traversal
    /(\x00|\x1a)/i // Null bytes
  ]

  /**
   * Check request for suspicious patterns
   */
  checkRequest(req: any): { suspicious: boolean, reasons: string[] } {
    const reasons: string[] = []
    const checkString = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params
    })

    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(checkString)) {
        reasons.push(`Suspicious pattern detected: ${pattern}`)
      }
    }

    // Check for abnormal request sizes
    if (checkString.length > 100000) {
      reasons.push('Abnormally large request')
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: {
    type: 'auth_failure' | 'suspicious_request' | 'rate_limit' | 'csrf_violation'
    ip: string
    user?: string
    details: any
  }) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      ...event,
      severity: this.getSeverity(event.type)
    }

    // Log to console (replace with proper logging service)
    console.log('[SECURITY]', JSON.stringify(logEntry))

    // Send to monitoring service (e.g., Sentry)
    if (process.env.SENTRY_DSN) {
      // Sentry.captureMessage(JSON.stringify(logEntry))
    }
  }

  private getSeverity(type: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'auth_failure': 'medium',
      'suspicious_request': 'high',
      'rate_limit': 'low',
      'csrf_violation': 'high'
    }
    return severityMap[type] || 'low'
  }
}

// Export configured Express app with all security features
export function createSecureApp(): express.Application {
  const app = express()

  // Load secrets
  const secretsManager = new SecretsManager()
  secretsManager.loadApplicationSecrets()

  // Configure security headers
  configureSecurityHeaders(app)

  // Configure CSRF protection
  configureCsrfProtection(app)

  // Apply rate limiting
  app.use('/api', RateLimiters.general)
  app.use('/api/auth/login', RateLimiters.auth)
  app.use('/api/estimate', RateLimiters.estimate)
  app.use('/api/search', RateLimiters.search)

  // Initialize services
  const authService = new AuthenticationService(process.env.JWT_SECRET!)
  const securityMonitor = new SecurityMonitor()

  // Security monitoring middleware
  app.use((req, res, next) => {
    const check = securityMonitor.checkRequest(req)
    if (check.suspicious) {
      securityMonitor.logSecurityEvent({
        type: 'suspicious_request',
        ip: req.ip,
        details: check.reasons
      })
      return res.status(400).json({ error: 'Invalid request' })
    }
    next()
  })

  return app
}
