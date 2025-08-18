#!/usr/bin/env node

/**
 * JWT Authentication Demo
 * Demonstrates the @candlefish/jwt-auth package usage
 */

const express = require('express');
const { CandlefishAuth, AuthMiddleware } = require('../packages/jwt-auth/dist');

// Initialize auth with AWS Secrets Manager
const auth = new CandlefishAuth({
  secretId: 'paintbox/production/jwt/private-key',
  jwksUrl: 'https://paintbox.fly.dev/.well-known/jwks.json',
  issuer: 'paintbox.fly.dev',
  audience: 'candlefish.ai',
  region: 'us-east-1'
});

// Create Express app
const app = express();
app.use(express.json());

// Initialize middleware
const authMiddleware = new AuthMiddleware(auth);

// Public endpoint - no auth required
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Candlefish JWT Auth Demo',
    endpoints: {
      '/': 'This help message',
      '/login': 'POST - Login with email and password',
      '/refresh': 'POST - Refresh tokens',
      '/protected': 'GET - Protected endpoint (requires token)',
      '/admin': 'GET - Admin only endpoint',
      '/.well-known/jwks.json': 'GET - JWKS endpoint'
    }
  });
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Mock user validation (replace with real authentication)
    if (email === 'admin@example.com' && password === 'password') {
      const accessToken = await auth.signToken({
        sub: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['read', 'write', 'delete']
      });

      const refreshToken = await auth.generateRefreshToken('user-123');

      res.json({
        accessToken,
        refreshToken,
        expiresIn: 86400,
        tokenType: 'Bearer'
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token endpoint
app.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await auth.refreshToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Protected endpoint - requires valid token
app.get('/protected', authMiddleware.middleware(), (req, res) => {
  res.json({
    message: 'This is a protected resource',
    user: req.user
  });
});

// Admin only endpoint
app.get('/admin', authMiddleware.requireRole('admin'), (req, res) => {
  res.json({
    message: 'Admin dashboard',
    user: req.user
  });
});

// Optional auth endpoint
app.get('/optional', authMiddleware.optional(), (req, res) => {
  if (req.user) {
    res.json({
      message: `Hello ${req.user.email}`,
      authenticated: true
    });
  } else {
    res.json({
      message: 'Hello anonymous',
      authenticated: false
    });
  }
});

// JWKS endpoint
app.get('/.well-known/jwks.json', async (req, res) => {
  try {
    const jwks = await auth.getPublicKeys();
    res.json(jwks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get JWKS' });
  }
});

// Start server
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`
🚀 JWT Auth Demo Server Started
================================
Server: http://localhost:${PORT}

Try these commands:

1. Login (get tokens):
   curl -X POST http://localhost:${PORT}/login \\
     -H "Content-Type: application/json" \\
     -d '{"email":"admin@example.com","password":"password"}'

2. Access protected endpoint:
   TOKEN="<your-access-token>"
   curl http://localhost:${PORT}/protected \\
     -H "Authorization: Bearer $TOKEN"

3. Check JWKS:
   curl http://localhost:${PORT}/.well-known/jwks.json

Press Ctrl+C to stop
  `);
});
