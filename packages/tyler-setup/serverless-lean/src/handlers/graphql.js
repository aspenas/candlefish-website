/**
 * GraphQL Handler for AWS Lambda
 * Optimized for serverless deployment with connection pooling and caching
 */

import { handler as graphqlHandler, healthCheck } from '../graphql/server.js';

/**
 * Main GraphQL handler for HTTP requests
 */
export const handler = async (event, context) => {
  // Prevent Lambda timeout from killing connections
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Handle health check requests
    if (event.path === '/health' && event.httpMethod === 'GET') {
      return await healthCheck();
    }

    // Handle GraphQL requests
    return await graphqlHandler(event, context);
  } catch (error) {
    console.error('GraphQL Handler Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        errors: [
          {
            message: 'Internal server error',
            extensions: {
              code: 'INTERNAL_ERROR',
              timestamp: new Date().toISOString(),
            },
          },
        ],
      }),
    };
  }
};

/**
 * Health check handler for monitoring
 */
export const health = healthCheck;
