// Health check endpoint for PromoterOS API
exports.handler = async (event, context) => {
  // Allow CORS for the health endpoint
  const headers = {
    'Access-Control-Allow-Origin': 'https://promoteros.candlefish.ai',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Health check response
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'healthy',
      message: 'PromoterOS API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      version: '1.0.0'
    })
  };
};
