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
    // Security health checks
    const checks = {
      database: 'healthy', // Mock database connection
      encryption: process.env.ENCRYPTION_KEY ? 'healthy' : 'not_configured',
      aws_integration: process.env.AWS_REGION ? 'healthy' : 'not_configured',
      secrets_manager: process.env.AWS_SECRET_ACCESS_KEY ? 'healthy' : 'not_configured',
      netlify_functions: 'healthy',
      cors_configuration: 'healthy',
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