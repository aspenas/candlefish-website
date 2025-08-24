/**
 * Candlefish AI - Auth Service Subgraph
 * Philosophy: Security-first authentication with federated identity
 */

import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { DataSource } from 'apollo-datasource';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Redis } from 'ioredis';
import { createComplexityLimitRule } from 'graphql-query-complexity';
import { shield, rule, and, or } from 'graphql-shield';
import { RateLimiterRedis } from 'rate-limiter-flexible';

// Type definitions for auth service
export const authTypeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable", "@provides", "@requires", "@external", "@tag", "@override", "@inaccessible"])

  # Custom scalars
  scalar DateTime
  scalar JSON

  # Core User entity - owns all user data
  type User @key(fields: "id") @key(fields: "email") {
    id: ID!
    email: String!
    username: String!
    fullName: String
    role: UserRole!
    avatar: String
    bio: String
    createdAt: DateTime!
    updatedAt: DateTime!
    lastLogin: DateTime
    isActive: Boolean!
    permissions: [String!]!

    # Security fields - only available in auth service
    passwordHash: String @inaccessible
    twoFactorSecret: String @inaccessible
    twoFactorEnabled: Boolean!
    loginAttempts: Int @inaccessible
    lockedUntil: DateTime @inaccessible
    sessionIds: [String!] @inaccessible
  }

  enum UserRole {
    ADMIN
    EDITOR
    PARTNER
    OPERATOR
    VIEWER
  }

  # Auth-specific types
  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
    expiresAt: DateTime!
    permissions: [String!]!
  }

  type Session @key(fields: "id") {
    id: ID!
    userId: ID!
    user: User!
    device: String
    ipAddress: String
    userAgent: String
    createdAt: DateTime!
    lastActivity: DateTime!
    expiresAt: DateTime!
    isActive: Boolean!
  }

  type LoginAttempt {
    id: ID!
    email: String!
    ipAddress: String!
    userAgent: String
    success: Boolean!
    failureReason: String
    createdAt: DateTime!
  }

  type TwoFactorSetup {
    secret: String!
    qrCode: String!
    backupCodes: [String!]!
  }

  # Rate limiting info
  type RateLimitInfo {
    limit: Int!
    remaining: Int!
    resetTime: DateTime!
  }

  # Security audit log
  type SecurityEvent {
    id: ID!
    userId: ID
    type: SecurityEventType!
    description: String!
    ipAddress: String
    userAgent: String
    metadata: JSON
    createdAt: DateTime!
  }

  enum SecurityEventType {
    LOGIN_SUCCESS
    LOGIN_FAILURE
    PASSWORD_CHANGE
    TWO_FACTOR_ENABLED
    TWO_FACTOR_DISABLED
    ACCOUNT_LOCKED
    ACCOUNT_UNLOCKED
    PERMISSION_CHANGE
    SESSION_CREATED
    SESSION_INVALIDATED
  }

  # Queries
  extend type Query {
    # User management
    me: User
    user(id: ID!): User
    users(first: Int = 20, after: String, role: UserRole, search: String): UserConnection!

    # Session management
    activeSessions: [Session!]!
    session(id: ID!): Session

    # Security
    loginAttempts(email: String!, limit: Int = 10): [LoginAttempt!]!
    securityEvents(userId: ID, type: SecurityEventType, limit: Int = 50): [SecurityEvent!]!
    rateLimitStatus: RateLimitInfo!

    # Admin queries
    suspiciousActivity(threshold: Int = 5): [SecurityEvent!]! @auth(requires: ADMIN)
  }

  # Mutations
  extend type Mutation {
    # Authentication
    login(email: String!, password: String!, twoFactorCode: String): AuthPayload!
    loginWithToken(token: String!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!
    logoutAll: Boolean!

    # Registration
    register(input: RegisterUserInput!): AuthPayload!

    # Password management
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    requestPasswordReset(email: String!): Boolean!
    resetPassword(token: String!, newPassword: String!): Boolean!

    # Two-factor authentication
    setupTwoFactor: TwoFactorSetup!
    enableTwoFactor(code: String!): Boolean!
    disableTwoFactor(password: String!, code: String!): Boolean!

    # Profile management
    updateProfile(input: UpdateProfileInput!): User!

    # Admin functions
    createUser(input: CreateUserInput!): User! @auth(requires: ADMIN)
    updateUserRole(userId: ID!, role: UserRole!): User! @auth(requires: ADMIN)
    suspendUser(userId: ID!, reason: String!): Boolean! @auth(requires: ADMIN)
    unsuspendUser(userId: ID!): Boolean! @auth(requires: ADMIN)

    # Session management
    invalidateSession(sessionId: ID!): Boolean!
    invalidateUserSessions(userId: ID!): Boolean! @auth(requires: ADMIN)
  }

  # Subscriptions
  extend type Subscription {
    # Real-time security events
    securityAlert(userId: ID): SecurityEvent!
    sessionActivity: Session!
    loginAttempt(email: String): LoginAttempt!
  }

  # Input types
  input RegisterUserInput {
    email: String!
    username: String!
    password: String!
    fullName: String
    role: UserRole = VIEWER
  }

  input CreateUserInput {
    email: String!
    username: String!
    password: String!
    fullName: String
    role: UserRole!
    isActive: Boolean = true
  }

  input UpdateProfileInput {
    fullName: String
    bio: String
    avatar: String
    username: String
  }

  # Connection types
  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # Custom directives
  directive @auth(requires: UserRole) on FIELD_DEFINITION | OBJECT
  directive @rateLimit(max: Int!, window: String!) on FIELD_DEFINITION
`;

// Data sources
class UserDataSource extends DataSource {
  private redis: Redis;
  private rateLimiter: RateLimiterRedis;

  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL);

    // Rate limiter for auth operations
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'auth_rl',
      points: 5, // Number of attempts
      duration: 900, // Per 15 minutes
      blockDuration: 900, // Block for 15 minutes
    });
  }

  async getUserById(id: string) {
    const cacheKey = `user:${id}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database (implement your DB logic here)
    const user = await this.queryDatabase('SELECT * FROM users WHERE id = $1', [id]);

    if (user) {
      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(user));
    }

    return user;
  }

  async getUserByEmail(email: string) {
    const cacheKey = `user:email:${email.toLowerCase()}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const user = await this.queryDatabase('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

    if (user) {
      await this.redis.setex(cacheKey, 300, JSON.stringify(user));
    }

    return user;
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.getUserByEmail(email);
    if (!user || !user.isActive) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async createUser(input: any) {
    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.queryDatabase(`
      INSERT INTO users (email, username, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [input.email.toLowerCase(), input.username, passwordHash, input.fullName, input.role, true]);

    // Invalidate cache
    await this.redis.del(`user:email:${input.email.toLowerCase()}`);

    return user;
  }

  async updateUser(id: string, updates: any) {
    const setClause = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];

    const user = await this.queryDatabase(`
      UPDATE users SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, values);

    // Invalidate cache
    await this.redis.del(`user:${id}`);
    if (user?.email) {
      await this.redis.del(`user:email:${user.email.toLowerCase()}`);
    }

    return user;
  }

  async logSecurityEvent(event: any) {
    await this.queryDatabase(`
      INSERT INTO security_events (user_id, type, description, ip_address, user_agent, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [event.userId, event.type, event.description, event.ipAddress, event.userAgent, JSON.stringify(event.metadata)]);
  }

  private async queryDatabase(query: string, params: any[]) {
    // Implement your database query logic here
    // This is a placeholder for your actual database implementation
    return null;
  }
}

// Resolvers
export const authResolvers = {
  // Custom scalars
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'Date custom scalar type',
    serialize(value) {
      return value instanceof Date ? value.toISOString() : value;
    },
    parseValue(value) {
      return new Date(value);
    },
    parseLiteral(ast) {
      return ast.kind === Kind.STRING ? new Date(ast.value) : null;
    },
  }),

  JSON: new GraphQLScalarType({
    name: 'JSON',
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (ast) => ast.kind === Kind.STRING ? JSON.parse(ast.value) : null,
  }),

  // Entity resolvers for federation
  User: {
    __resolveReference: async (reference: any, { dataSources }: any) => {
      if (reference.id) {
        return await dataSources.userAPI.getUserById(reference.id);
      }
      if (reference.email) {
        return await dataSources.userAPI.getUserByEmail(reference.email);
      }
      return null;
    },

    permissions: (parent: any) => {
      // Map role to permissions
      const rolePermissions = {
        ADMIN: ['read', 'write', 'delete', 'admin'],
        EDITOR: ['read', 'write'],
        PARTNER: ['read', 'write:own'],
        OPERATOR: ['read', 'write:limited'],
        VIEWER: ['read'],
      };
      return rolePermissions[parent.role] || [];
    },
  },

  Session: {
    user: async (parent: any, _: any, { dataSources }: any) => {
      return await dataSources.userAPI.getUserById(parent.userId);
    },
  },

  Query: {
    me: async (_: any, __: any, { user }: any) => user,

    user: async (_: any, { id }: any, { dataSources }: any) => {
      return await dataSources.userAPI.getUserById(id);
    },

    users: async (_: any, { first, after, role, search }: any, { dataSources }: any) => {
      // Implement pagination and filtering logic
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
      };
    },

    rateLimitStatus: async (_: any, __: any, { req, dataSources }: any) => {
      const key = req.ip || 'unknown';
      const limiter = dataSources.userAPI.rateLimiter;

      try {
        const resRateLimiter = await limiter.get(key);
        return {
          limit: limiter.points,
          remaining: resRateLimiter ? resRateLimiter.remainingHits : limiter.points,
          resetTime: resRateLimiter ? new Date(Date.now() + resRateLimiter.msBeforeNext) : new Date(),
        };
      } catch {
        return {
          limit: limiter.points,
          remaining: 0,
          resetTime: new Date(Date.now() + limiter.blockDuration * 1000),
        };
      }
    },
  },

  Mutation: {
    login: async (_: any, { email, password, twoFactorCode }: any, { dataSources, req, pubsub }: any) => {
      const key = req.ip || 'unknown';

      try {
        // Apply rate limiting
        await dataSources.userAPI.rateLimiter.consume(key);

        const user = await dataSources.userAPI.validateCredentials(email, password);
        if (!user) {
          // Log failed attempt
          await dataSources.userAPI.logSecurityEvent({
            type: 'LOGIN_FAILURE',
            description: 'Invalid credentials',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { email },
          });

          throw new Error('Invalid credentials');
        }

        // Check 2FA if enabled
        if (user.twoFactorEnabled && !twoFactorCode) {
          throw new Error('Two-factor authentication required');
        }

        if (user.twoFactorEnabled && twoFactorCode) {
          // Implement 2FA validation logic here
        }

        // Generate JWT tokens
        const token = jwt.sign(
          { userId: user.id, role: user.role },
          process.env.JWT_SECRET!,
          { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
          { userId: user.id, type: 'refresh' },
          process.env.JWT_REFRESH_SECRET!,
          { expiresIn: '7d' }
        );

        // Update last login
        await dataSources.userAPI.updateUser(user.id, {
          last_login: new Date(),
        });

        // Log successful login
        await dataSources.userAPI.logSecurityEvent({
          userId: user.id,
          type: 'LOGIN_SUCCESS',
          description: 'Successful login',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        return {
          token,
          refreshToken,
          user,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          permissions: authResolvers.User.permissions(user),
        };
      } catch (rateLimiterRes) {
        if (rateLimiterRes instanceof Error) throw rateLimiterRes;

        throw new Error(`Too many login attempts. Try again in ${Math.round(rateLimiterRes.msBeforeNext / 1000)} seconds`);
      }
    },

    register: async (_: any, { input }: any, { dataSources, req }: any) => {
      // Validate email uniqueness
      const existing = await dataSources.userAPI.getUserByEmail(input.email);
      if (existing) {
        throw new Error('Email already registered');
      }

      // Create user
      const user = await dataSources.userAPI.createUser(input);

      // Generate tokens
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Log registration
      await dataSources.userAPI.logSecurityEvent({
        userId: user.id,
        type: 'LOGIN_SUCCESS',
        description: 'User registered and logged in',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return {
        token,
        refreshToken,
        user,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        permissions: authResolvers.User.permissions(user),
      };
    },

    changePassword: async (_: any, { currentPassword, newPassword }: any, { user, dataSources }: any) => {
      if (!user) throw new Error('Not authenticated');

      const dbUser = await dataSources.userAPI.getUserById(user.id);
      const isValidCurrent = await bcrypt.compare(currentPassword, dbUser.passwordHash);

      if (!isValidCurrent) {
        throw new Error('Current password is incorrect');
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await dataSources.userAPI.updateUser(user.id, {
        password_hash: newPasswordHash,
      });

      // Log password change
      await dataSources.userAPI.logSecurityEvent({
        userId: user.id,
        type: 'PASSWORD_CHANGE',
        description: 'Password changed successfully',
      });

      return true;
    },

    updateProfile: async (_: any, { input }: any, { user, dataSources }: any) => {
      if (!user) throw new Error('Not authenticated');

      return await dataSources.userAPI.updateUser(user.id, input);
    },
  },

  Subscription: {
    securityAlert: {
      subscribe: (_, { userId }, { pubsub }) => {
        const channel = userId ? `SECURITY_ALERT_${userId}` : 'SECURITY_ALERT_ALL';
        return pubsub.asyncIterator([channel]);
      },
    },
  },
};

// Security shield
export const authPermissions = shield({
  Query: {
    users: rule({ cache: 'contextual' })(async (parent, args, { user }) => {
      return user?.role === 'ADMIN';
    }),
    suspiciousActivity: rule({ cache: 'contextual' })(async (parent, args, { user }) => {
      return user?.role === 'ADMIN';
    }),
  },
  Mutation: {
    createUser: rule({ cache: 'contextual' })(async (parent, args, { user }) => {
      return user?.role === 'ADMIN';
    }),
    updateUserRole: rule({ cache: 'contextual' })(async (parent, args, { user }) => {
      return user?.role === 'ADMIN';
    }),
    suspendUser: rule({ cache: 'contextual' })(async (parent, args, { user }) => {
      return user?.role === 'ADMIN';
    }),
    unsuspendUser: rule({ cache: 'contextual' })(async (parent, args, { user }) => {
      return user?.role === 'ADMIN';
    }),
    invalidateUserSessions: rule({ cache: 'contextual' })(async (parent, args, { user }) => {
      return user?.role === 'ADMIN';
    }),
  },
});

// Create auth subgraph schema
export const authSchema = buildSubgraphSchema([
  {
    typeDefs: authTypeDefs,
    resolvers: authResolvers,
  },
]);

// Context function
export function createAuthContext(req: any) {
  return {
    dataSources: {
      userAPI: new UserDataSource(),
    },
    req,
    user: req.user, // Set by auth middleware
  };
}

// Query complexity limit
export const authComplexityLimit = createComplexityLimitRule(200, {
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
  introspectionCost: 1000,
  maximumDepth: 10,
});

export default {
  typeDefs: authTypeDefs,
  resolvers: authResolvers,
  schema: authSchema,
  permissions: authPermissions,
  createContext: createAuthContext,
  complexityLimit: authComplexityLimit,
};
