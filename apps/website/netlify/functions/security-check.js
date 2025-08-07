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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-Client-IP',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract client information
    const clientIP = event.headers['x-forwarded-for'] || 
                    event.headers['x-real-ip'] || 
                    event.headers['client-ip'] || 
                    'unknown';

    // Simulate security check with mock services
    const services = {
      'api-gateway': {
        healthy: true,
        response_time: Math.floor(Math.random() * 100) + 50,
        last_check: new Date().toISOString()
      },
      'database': {
        healthy: true,
        response_time: Math.floor(Math.random() * 50) + 20,
        last_check: new Date().toISOString()
      },
      'encryption': {
        healthy: process.env.ENCRYPTION_KEY ? true : false,
        response_time: Math.floor(Math.random() * 30) + 10,
        last_check: new Date().toISOString()
      },
      'aws-integration': {
        healthy: process.env.AWS_REGION ? true : false,
        response_time: Math.floor(Math.random() * 200) + 100,
        last_check: new Date().toISOString()
      }
    };

    const healthyCount = Object.values(services).filter(s => s.healthy).length;
    const totalCount = Object.keys(services).length;
    
    const response = {
      overall_status: healthyCount === totalCount ? 'healthy' : 'degraded',
      services: services,
      summary: {
        total_services: totalCount,
        healthy_services: healthyCount,
        degraded_services: totalCount - healthyCount
      },
      timestamp: new Date().toISOString(),
      request_id: context.awsRequestId,
      client_ip: clientIP
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Security check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Security check failed',
        request_id: context.awsRequestId
      })
    };
  }
};