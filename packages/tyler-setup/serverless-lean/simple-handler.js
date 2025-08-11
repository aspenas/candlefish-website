exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify({
      message: 'Tyler Setup GraphQL API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  };
};
