const { Handler } = require('@netlify/functions');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
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