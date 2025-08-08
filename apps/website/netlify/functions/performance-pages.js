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
    // Mock monitored pages data
    const mockPages = [
      'https://api-test.candlefish.ai/',
      'https://api-test.candlefish.ai/test-fetch.html',
      'https://candlefish.ai/',
      'https://candlefish.ai/about',
      'https://candlefish.ai/contact',
      'https://candlefish.ai/services',
      'https://app.candlefish.ai/dashboard',
      'https://app.candlefish.ai/analytics'
    ];

    const response = {
      status: 'success',
      count: mockPages.length,
      pages: mockPages,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Performance pages error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        request_id: context.awsRequestId
      })
    };
  }
};
