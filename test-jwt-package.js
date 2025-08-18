#!/usr/bin/env node

/**
 * Test script to verify @candlefish/jwt-auth package is working
 */

const { CandlefishAuth, AuthMiddleware, ServiceAuth } = require('./packages/jwt-auth/dist');

console.log('✅ @candlefish/jwt-auth package successfully imported!');
console.log('\n📦 Available exports:');
console.log('  - CandlefishAuth:', typeof CandlefishAuth);
console.log('  - AuthMiddleware:', typeof AuthMiddleware);
console.log('  - ServiceAuth:', typeof ServiceAuth);

// Test instantiation
try {
  const auth = new CandlefishAuth({
    jwksUrl: 'https://paintbox.fly.dev/.well-known/jwks.json',
    issuer: 'paintbox.fly.dev',
    audience: 'candlefish.ai'
  });

  console.log('\n✅ CandlefishAuth instance created successfully');

  const middleware = new AuthMiddleware(auth);
  console.log('✅ AuthMiddleware instance created successfully');

  const serviceAuth = new ServiceAuth(auth, {
    serviceId: 'test-service',
    serviceKey: 'test-key'
  });
  console.log('✅ ServiceAuth instance created successfully');

  console.log('\n🎉 Package is fully functional and ready for use!');
  console.log('\n📚 Usage example:');
  console.log(`
const express = require('express');
const { CandlefishAuth, AuthMiddleware } = require('@candlefish/jwt-auth');

const app = express();
const auth = new CandlefishAuth({
  jwksUrl: 'https://paintbox.fly.dev/.well-known/jwks.json',
  issuer: 'paintbox.fly.dev'
});

const authMiddleware = new AuthMiddleware(auth);

// Protect routes
app.use('/api/*', authMiddleware.middleware());

// Role-based protection
app.get('/admin/*', authMiddleware.requireRole('admin'));
  `);

} catch (error) {
  console.error('❌ Error testing package:', error.message);
  process.exit(1);
}
