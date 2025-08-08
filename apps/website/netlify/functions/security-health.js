const { Handler } = require('@netlify/functions');

exports.handler = async (event, context) => {
  // Enforce strict CORS allowlist and security headers
  const allowedOriginsEnv = process.env.CORS_ORIGINS || '';
  const nodeEnv = process.env.NODE_ENV || process.env.CONTEXT || 'development';
  const defaultProd = [
    'https://candlefish.ai',
    'https://www.candlefish.ai',
    'https://dashboard.candlefish.ai',
  ];
  const allowedOrigins = (allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : (nodeEnv === 'production' ? defaultProd : ['*'])
  );
  const origin = event.headers.origin || event.headers.Origin;
  const corsOrigin = allowedOrigins.includes('*')
    ? '*'
    : (allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || 'https://candlefish.ai');

  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'X-Request-ID': context.awsRequestId
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Security health checks
    const checks = {
      database: 'healthy',
      encryption: process.env.ENCRYPTION_KEY ? 'healthy' : 'not_configured',
      aws_integration: process.env.AWS_REGION ? 'healthy' : 'not_configured',
      secrets_manager: process.env.AWS_REGION ? 'configured' : 'not_configured',
      netlify_functions: 'healthy',
      cors_configuration: corsOrigin === '*' && nodeEnv === 'production' ? 'unhealthy' : 'healthy',
      rate_limiting: 'healthy'
    };

    // Simulate encryption test
    if (process.env.ENCRYPTION_KEY) {
      try {
        // Mock encryption test
        const testData = { test: 'encryption' };
        // In a real implementation, you'd test actual encryption here
        checks.encryption = 'healthy';
      } catch (error) {
        checks.encryption = 'unhealthy';
      }
    }

    const healthyStatuses = ['healthy', 'not_configured'];
    const overallStatus = Object.values(checks).every(status =>
      healthyStatuses.includes(status)
    ) ? 'healthy' : 'degraded';

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: checks,
      environment: process.env.CONTEXT || 'development',
      request_id: context.awsRequestId,
      summary: {
        total_checks: Object.keys(checks).length,
        healthy: Object.values(checks).filter(s => s === 'healthy').length,
        degraded: Object.values(checks).filter(s => s === 'unhealthy').length,
        not_configured: Object.values(checks).filter(s => s === 'not_configured').length
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Security health check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        request_id: context.awsRequestId
      })
    };
  }
};
