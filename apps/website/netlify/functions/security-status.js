const { Handler } = require('@netlify/functions');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-Client-IP',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    // Extract client information
    const clientIP = event.headers['x-forwarded-for'] || 
                    event.headers['x-real-ip'] || 
                    event.headers['client-ip'] || 
                    'unknown';
    
    const userAgent = event.headers['user-agent'] || 'unknown';

    const response = {
      security: {
        cors_origins: 'configured',
        rate_limiting: true,
        encryption: process.env.ENCRYPTION_KEY ? true : false,
        aws_integration: process.env.AWS_REGION ? true : false,
        threat_detection: true,
        environment: process.env.CONTEXT || 'development'
      },
      request_info: {
        client_ip: clientIP,
        user_agent: userAgent,
        request_id: context.awsRequestId,
        timestamp: new Date().toISOString()
      },
      status: 'operational'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Security status error:', error);
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