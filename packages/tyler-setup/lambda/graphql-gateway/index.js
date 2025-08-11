// GraphQL Federation Gateway Lambda Function
// Combines multiple GraphQL services into a unified API

const { ApolloServer } = require('@apollo/server');
const { startServerAndCreateLambdaHandler, handlers } = require('@as-integrations/aws-lambda');
const { ApolloGateway, IntrospectAndCompose } = require('@apollo/gateway');
const { GraphQLError } = require('graphql');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager({ region: process.env.AWS_REGION });

// Cache for secrets
const secretsCache = new Map();

class GraphQLGateway {
  constructor() {
    this.gateway = null;
    this.server = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Get JWT secret from AWS Secrets Manager
      const jwtSecret = await this.getSecret('tyler-setup/auth/jwt-secret');
      this.jwtSecret = JSON.parse(jwtSecret).secret;

      // Initialize Apollo Gateway with federated services
      this.gateway = new ApolloGateway({
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql' },
            { name: 'users', url: process.env.USERS_SERVICE_URL || 'http://localhost:4002/graphql' },
            { name: 'contractors', url: process.env.CONTRACTORS_SERVICE_URL || 'http://localhost:4003/graphql' },
            { name: 'secrets', url: process.env.SECRETS_SERVICE_URL || 'http://localhost:4004/graphql' },
            { name: 'audit', url: process.env.AUDIT_SERVICE_URL || 'http://localhost:4005/graphql' },
          ],
        }),
        buildService({ url }) {
          return new (require('@apollo/gateway')).RemoteGraphQLDataSource({
            url,
            willSendRequest({ request, context }) {
              // Forward authorization header to subgraphs
              if (context.user) {
                request.http.headers.set('user', JSON.stringify(context.user));
              }
              if (context.authorization) {
                request.http.headers.set('authorization', context.authorization);
              }
            },
          });
        },
      });

      // Initialize Apollo Server
      this.server = new ApolloServer({
        gateway: this.gateway,
        context: async ({ event }) => {
          return await this.createContext(event);
        },
        plugins: [
          {
            requestDidStart() {
              return {
                didEncounterErrors(requestContext) {
                  console.error('GraphQL errors:', requestContext.errors);
                },
                willSendResponse(requestContext) {
                  // Add custom headers
                  requestContext.response.http.headers.set('x-powered-by', 'Tyler Setup Platform');

                  // Add CORS headers
                  requestContext.response.http.headers.set('access-control-allow-origin', '*');
                  requestContext.response.http.headers.set('access-control-allow-credentials', 'true');
                  requestContext.response.http.headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
                  requestContext.response.http.headers.set('access-control-allow-headers', 'Content-Type, Authorization');
                },
              };
            },
          },
        ],
        introspection: process.env.NODE_ENV !== 'production',
        csrfPrevention: true,
        formatError: (err) => {
          // Don't expose internal errors in production
          if (process.env.NODE_ENV === 'production' && !err.message.startsWith('GraphQL')) {
            return new GraphQLError('Internal server error');
          }
          return err;
        },
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize GraphQL Gateway:', error);
      throw error;
    }
  }

  async createContext(event) {
    const context = {
      event,
      requestId: event.requestContext?.requestId,
      authorization: null,
      user: null,
    };

    try {
      // Extract JWT token from headers
      const authorization = event.headers?.Authorization || event.headers?.authorization;
      if (authorization && authorization.startsWith('Bearer ')) {
        const token = authorization.substring(7);
        context.authorization = authorization;

        // Verify JWT token
        const decoded = jwt.verify(token, this.jwtSecret);
        context.user = {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || [],
        };
      }
    } catch (error) {
      console.log('Invalid or expired token:', error.message);
    }

    return context;
  }

  async getSecret(secretName) {
    if (secretsCache.has(secretName)) {
      const cached = secretsCache.get(secretName);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
        return cached.value;
      }
    }

    try {
      const result = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
      const value = result.SecretString;

      secretsCache.set(secretName, {
        value,
        timestamp: Date.now(),
      });

      return value;
    } catch (error) {
      console.error(`Failed to get secret ${secretName}:`, error);
      throw error;
    }
  }

  async getHandler() {
    await this.initialize();
    return startServerAndCreateLambdaHandler(
      this.server,
      handlers.createAPIGatewayProxyEventV2RequestHandler()
    );
  }
}

// Global instance
const gatewayInstance = new GraphQLGateway();

// Lambda handler
exports.handler = async (event, context) => {
  try {
    const handler = await gatewayInstance.getHandler();
    return await handler(event, context);
  } catch (error) {
    console.error('Gateway handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        errors: [{
          message: 'Internal server error',
          extensions: {
            code: 'INTERNAL_ERROR',
          },
        }],
      }),
    };
  }
};
