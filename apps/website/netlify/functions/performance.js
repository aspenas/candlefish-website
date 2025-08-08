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

  try {
    if (event.httpMethod === 'POST') {
      // Handle performance metrics collection
      const body = JSON.parse(event.body || '{}');

      // Basic validation
      if (!body.session_id || !body.page_url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Missing required fields: session_id, page_url'
          })
        };
      }

      // Simulate storing metrics (in production, this would go to a database)
      const metricsId = Math.floor(Math.random() * 10000) + 1;

      console.log('Performance metrics received:', {
        session_id: body.session_id,
        page_url: body.page_url,
        timestamp: new Date().toISOString(),
        client_ip: event.headers['x-forwarded-for'] || 'unknown'
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          message: 'Metrics stored successfully',
          metrics_id: metricsId
        })
      };

    } else if (event.httpMethod === 'GET') {
      // Handle metrics retrieval
      const queryParams = event.queryStringParameters || {};
      const limit = parseInt(queryParams.limit) || 100;

      // Mock performance data
      const mockMetrics = [];
      for (let i = 0; i < Math.min(limit, 10); i++) {
        mockMetrics.push({
          id: i + 1,
          session_id: `session_${Date.now()}_${i}`,
          page_url: 'https://api-test.candlefish.ai/test-fetch.html',
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          fcp: Math.floor(Math.random() * 2000) + 1000,
          lcp: Math.floor(Math.random() * 3000) + 2000,
          fid: Math.floor(Math.random() * 100) + 50,
          cls: (Math.random() * 0.3).toFixed(3),
          ttfb: Math.floor(Math.random() * 500) + 200
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          count: mockMetrics.length,
          metrics: mockMetrics
        })
      };
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Performance endpoint error:', error);
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
