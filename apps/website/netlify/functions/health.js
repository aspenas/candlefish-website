const { Handler } = require('@netlify/functions');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
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
    const response = {
      status: 'healthy',
      database: 'connected',
      service: 'Candlefish Performance Monitoring API',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.CONTEXT || 'development'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Health check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        status: 'unhealthy',
        error: 'Internal server error'
      })
    };
  }
};