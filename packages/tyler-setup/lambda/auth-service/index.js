// Authentication Service Lambda Function
// Handles user authentication, JWT token management, and OAuth

const { ApolloServer } = require('@apollo/server');
const { startServerAndCreateLambdaHandler, handlers } = require('@as-integrations/aws-lambda');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { gql } = require('graphql-tag');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const { OAuth2Client } = require('google-auth-library');

const secretsManager = new AWS.SecretsManager({ region: process.env.AWS_REGION });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

// GraphQL Schema for Auth Service
const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type User @key(fields: "id") {
    id: ID!
    email: String!
    role: String!
    isEmailVerified: Boolean!
    lastLoginAt: String
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
    expiresIn: Int!
  }

  type RefreshTokenPayload {
    token: String!
    expiresIn: Int!
  }

  input LoginInput {
    email: String!
    password: String!
    rememberMe: Boolean = false
  }

  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
  }

  input ForgotPasswordInput {
    email: String!
  }

  input ResetPasswordInput {
    token: String!
    newPassword: String!
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }

  input OAuthLoginInput {
    provider: String!
    token: String!
  }

  type Query {
    me: User
    validateToken(token: String!): Boolean!
  }

  type Mutation {
    login(input: LoginInput!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    logout(refreshToken: String): Boolean!
    refreshToken(refreshToken: String!): RefreshTokenPayload!
    forgotPassword(input: ForgotPasswordInput!): Boolean!
    resetPassword(input: ResetPasswordInput!): Boolean!
    changePassword(input: ChangePasswordInput!): Boolean!
    oauthLogin(input: OAuthLoginInput!): AuthPayload!
    verifyEmail(token: String!): Boolean!
    resendVerificationEmail: Boolean!
  }
`;

class AuthService {
  constructor() {
    this.secrets = new Map();
    this.googleClient = null;
  }

  async getSecret(secretName) {
    if (this.secrets.has(secretName)) {
      const cached = this.secrets.get(secretName);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
        return cached.value;
      }
    }

    try {
      const result = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
      const value = JSON.parse(result.SecretString);

      this.secrets.set(secretName, {
        value,
        timestamp: Date.now(),
      });

      return value;
    } catch (error) {
      console.error(`Failed to get secret ${secretName}:`, error);
      throw error;
    }
  }

  async generateTokens(user, rememberMe = false) {
    const jwtSecret = await this.getSecret('tyler-setup/auth/jwt-secret');
    const expiresIn = rememberMe ? '30d' : '24h';

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
      },
      jwtSecret.secret,
      { expiresIn, algorithm: 'HS256' }
    );

    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      jwtSecret.secret,
      { expiresIn: '30d', algorithm: 'HS256' }
    );

    // Store refresh token in DynamoDB
    await dynamodb.put({
      TableName: process.env.SESSIONS_TABLE,
      Item: {
        session_id: refreshToken,
        user_id: user.id,
        created_at: new Date().toISOString(),
        expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        ip_address: user.ipAddress || 'unknown',
        user_agent: user.userAgent || 'unknown',
      },
    }).promise();

    return {
      token,
      refreshToken,
      expiresIn: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // seconds
    };
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  async validatePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  async getUserByEmail(email) {
    // This would typically query your user database
    // For now, return a mock user
    return {
      id: '1',
      email,
      password_hash: await this.hashPassword('password123'),
      role: 'user',
      is_email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async createUser(userData) {
    const hashedPassword = await this.hashPassword(userData.password);

    // This would typically insert into your user database
    const user = {
      id: Math.random().toString(36).substr(2, 9),
      email: userData.email,
      password_hash: hashedPassword,
      first_name: userData.firstName,
      last_name: userData.lastName,
      role: 'user',
      is_email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Send verification email (implement email service)
    await this.sendVerificationEmail(user);

    return user;
  }

  async sendVerificationEmail(user) {
    // Implement email sending logic
    console.log(`Sending verification email to ${user.email}`);
  }

  async verifyGoogleToken(token) {
    if (!this.googleClient) {
      const oauthConfig = await this.getSecret('tyler-setup/auth/oauth-config');
      this.googleClient = new OAuth2Client(oauthConfig.google_client_id);
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.googleClient.clientId,
      });

      const payload = ticket.getPayload();
      return {
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        isEmailVerified: payload.email_verified,
        provider: 'google',
        providerId: payload.sub,
      };
    } catch (error) {
      throw new Error('Invalid Google token');
    }
  }
}

const authService = new AuthService();

const resolvers = {
  Query: {
    me: async (_, __, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.user;
    },

    validateToken: async (_, { token }) => {
      try {
        const jwtSecret = await authService.getSecret('tyler-setup/auth/jwt-secret');
        jwt.verify(token, jwtSecret.secret);
        return true;
      } catch {
        return false;
      }
    },
  },

  Mutation: {
    login: async (_, { input }, context) => {
      const { email, password, rememberMe } = input;

      // Get user from database
      const user = await authService.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Validate password
      const isValid = await authService.validatePassword(password, user.password_hash);
      if (!isValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      user.last_login_at = new Date().toISOString();

      // Generate tokens
      const tokens = await authService.generateTokens({
        ...user,
        ipAddress: context.event.requestContext?.identity?.sourceIp,
        userAgent: context.event.headers?.['User-Agent'],
      }, rememberMe);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.is_email_verified,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      };
    },

    register: async (_, { input }) => {
      const { email, password, firstName, lastName } = input;

      // Check if user already exists
      const existingUser = await authService.getUserByEmail(email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Create new user
      const user = await authService.createUser({
        email,
        password,
        firstName,
        lastName,
      });

      // Generate tokens
      const tokens = await authService.generateTokens(user);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.is_email_verified,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      };
    },

    logout: async (_, { refreshToken }) => {
      if (refreshToken) {
        // Remove refresh token from DynamoDB
        await dynamodb.delete({
          TableName: process.env.SESSIONS_TABLE,
          Key: { session_id: refreshToken },
        }).promise();
      }
      return true;
    },

    refreshToken: async (_, { refreshToken }) => {
      try {
        const jwtSecret = await authService.getSecret('tyler-setup/auth/jwt-secret');
        const decoded = jwt.verify(refreshToken, jwtSecret.secret);

        if (decoded.type !== 'refresh') {
          throw new Error('Invalid refresh token');
        }

        // Check if refresh token exists in database
        const session = await dynamodb.get({
          TableName: process.env.SESSIONS_TABLE,
          Key: { session_id: refreshToken },
        }).promise();

        if (!session.Item) {
          throw new Error('Refresh token not found');
        }

        // Get user data
        const user = await authService.getUserByEmail(decoded.sub);
        if (!user) {
          throw new Error('User not found');
        }

        // Generate new access token
        const token = jwt.sign(
          {
            sub: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions || [],
          },
          jwtSecret.secret,
          { expiresIn: '24h', algorithm: 'HS256' }
        );

        return {
          token,
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
        };
      } catch (error) {
        throw new Error('Invalid refresh token');
      }
    },

    oauthLogin: async (_, { input }) => {
      const { provider, token } = input;

      let userInfo;
      if (provider === 'google') {
        userInfo = await authService.verifyGoogleToken(token);
      } else {
        throw new Error('Unsupported OAuth provider');
      }

      // Check if user exists
      let user = await authService.getUserByEmail(userInfo.email);

      if (!user) {
        // Create new user from OAuth data
        user = await authService.createUser({
          email: userInfo.email,
          password: Math.random().toString(36), // Random password for OAuth users
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
        });
        user.is_email_verified = userInfo.isEmailVerified;
      }

      // Generate tokens
      const tokens = await authService.generateTokens(user);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.is_email_verified,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      };
    },

    forgotPassword: async (_, { input }) => {
      const { email } = input;

      const user = await authService.getUserByEmail(email);
      if (user) {
        // Generate password reset token
        const resetToken = jwt.sign(
          { sub: user.id, type: 'reset' },
          (await authService.getSecret('tyler-setup/auth/jwt-secret')).secret,
          { expiresIn: '1h' }
        );

        // Send reset email (implement email service)
        console.log(`Sending password reset email to ${email} with token: ${resetToken}`);
      }

      // Always return true for security
      return true;
    },

    resetPassword: async (_, { input }) => {
      const { token, newPassword } = input;

      try {
        const jwtSecret = await authService.getSecret('tyler-setup/auth/jwt-secret');
        const decoded = jwt.verify(token, jwtSecret.secret);

        if (decoded.type !== 'reset') {
          throw new Error('Invalid reset token');
        }

        // Update user password
        const hashedPassword = await authService.hashPassword(newPassword);
        // Update in database (implement database update)

        return true;
      } catch (error) {
        throw new Error('Invalid or expired reset token');
      }
    },

    changePassword: async (_, { input }, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const { currentPassword, newPassword } = input;

      // Get current user
      const user = await authService.getUserByEmail(context.user.email);

      // Validate current password
      const isValid = await authService.validatePassword(currentPassword, user.password_hash);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const hashedPassword = await authService.hashPassword(newPassword);
      // Update in database (implement database update)

      return true;
    },

    verifyEmail: async (_, { token }) => {
      try {
        const jwtSecret = await authService.getSecret('tyler-setup/auth/jwt-secret');
        const decoded = jwt.verify(token, jwtSecret.secret);

        if (decoded.type !== 'verify') {
          throw new Error('Invalid verification token');
        }

        // Update user email verification status
        // Update in database (implement database update)

        return true;
      } catch (error) {
        throw new Error('Invalid or expired verification token');
      }
    },

    resendVerificationEmail: async (_, __, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const user = await authService.getUserByEmail(context.user.email);
      if (user.is_email_verified) {
        throw new Error('Email already verified');
      }

      await authService.sendVerificationEmail(user);
      return true;
    },
  },

  User: {
    __resolveReference: async (reference) => {
      // Resolve user by ID for federation
      return await authService.getUserByEmail(reference.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  context: async ({ event }) => {
    const context = {
      event,
      user: null,
    };

    // Extract user from headers (set by gateway)
    const userHeader = event.headers?.user;
    if (userHeader) {
      try {
        context.user = JSON.parse(userHeader);
      } catch (error) {
        console.error('Failed to parse user header:', error);
      }
    }

    return context;
  },
  introspection: process.env.NODE_ENV !== 'production',
});

const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);

exports.handler = handler;
