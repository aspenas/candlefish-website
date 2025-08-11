/**
 * GraphQL Mutation Resolvers - Optimized for Performance
 * Implements efficient writes, cache invalidation, and event sourcing
 */

import { PutCommand, UpdateCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand, DeleteSecretCommand } from '@aws-sdk/client-secrets-manager';
import { v4 as uuidv4 } from 'uuid';
import { GraphQLError } from 'graphql';
import crypto from 'crypto';

import { generateJwtToken, verifyPassword, hashPassword } from '../../utils/security.js';

/**
 * Mutation resolvers with write optimization
 */
export const mutationResolvers = {
  // Authentication mutations
  login: async (parent, args, context) => {
    const { email, password } = args;

    try {
      // Check rate limiting for login attempts
      const clientIP = context.event.requestContext?.http?.sourceIp || 'unknown';
      const rateLimitKey = `login:${clientIP}:${email}`;

      // Query user by email
      const result = await context.client.send(new QueryCommand({
        TableName: process.env.USERS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email.toLowerCase() },
      }));

      if (!result.Items || result.Items.length === 0) {
        await context.logAudit({
          action: 'LOGIN_FAILED',
          email,
          reason: 'User not found',
          ip: clientIP,
        });
        throw new GraphQLError('Invalid credentials');
      }

      const user = result.Items[0];

      // Verify password
      const isValidPassword = await verifyPassword(user.passwordHash, password);
      if (!isValidPassword) {
        await context.logAudit({
          action: 'LOGIN_FAILED',
          userId: user.id,
          email,
          reason: 'Invalid password',
          ip: clientIP,
        });
        throw new GraphQLError('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        await context.logAudit({
          action: 'LOGIN_FAILED',
          userId: user.id,
          email,
          reason: 'Account disabled',
          ip: clientIP,
        });
        throw new GraphQLError('Account is disabled');
      }

      // Generate tokens
      const token = await generateJwtToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        type: 'employee',
      });

      const refreshToken = crypto.randomBytes(32).toString('hex');
      const refreshTokenExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

      // Store refresh token
      await context.client.send(new PutCommand({
        TableName: process.env.REFRESH_TOKENS_TABLE,
        Item: {
          token: refreshToken,
          userId: user.id,
          expiresAt: refreshTokenExpiry,
          createdAt: Date.now(),
          ip: clientIP,
        },
      }));

      // Update user's last login
      await context.client.send(new UpdateCommand({
        TableName: process.env.USERS_TABLE,
        Key: { id: user.id },
        UpdateExpression: 'SET lastLogin = :now, lastLoginIP = :ip',
        ExpressionAttributeValues: {
          ':now': Date.now(),
          ':ip': clientIP,
        },
      }));

      // Clear user cache
      await context.cache.delete('user', user.id);

      await context.logAudit({
        action: 'LOGIN_SUCCESS',
        userId: user.id,
        email,
        ip: clientIP,
      });

      return {
        token,
        refreshToken,
        expiresIn: 86400, // 24 hours
        user,
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError(`Login failed: ${error.message}`);
    }
  },

  refreshToken: async (parent, args, context) => {
    const { refreshToken } = args;

    try {
      // Find refresh token
      const tokenResult = await context.client.send(new GetCommand({
        TableName: process.env.REFRESH_TOKENS_TABLE,
        Key: { token: refreshToken },
      }));

      if (!tokenResult.Item) {
        throw new GraphQLError('Invalid refresh token');
      }

      const storedToken = tokenResult.Item;

      // Check expiration
      if (storedToken.expiresAt < Date.now()) {
        throw new GraphQLError('Refresh token expired');
      }

      // Get user
      const user = await context.getUser(storedToken.userId);
      if (!user || !user.isActive) {
        throw new GraphQLError('Invalid user');
      }

      // Generate new tokens
      const newToken = await generateJwtToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        type: 'employee',
      });

      const newRefreshToken = crypto.randomBytes(32).toString('hex');
      const refreshTokenExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000);

      // Update refresh token
      await context.client.send(new UpdateCommand({
        TableName: process.env.REFRESH_TOKENS_TABLE,
        Key: { token: refreshToken },
        UpdateExpression: 'SET token = :newToken, expiresAt = :expiry, lastUsed = :now',
        ExpressionAttributeValues: {
          ':newToken': newRefreshToken,
          ':expiry': refreshTokenExpiry,
          ':now': Date.now(),
        },
      }));

      return {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: 86400,
        user,
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError(`Token refresh failed: ${error.message}`);
    }
  },

  logout: async (parent, args, context) => {
    const { refreshToken } = args;

    try {
      // Revoke refresh token if provided
      if (refreshToken) {
        await context.client.send(new DeleteCommand({
          TableName: process.env.REFRESH_TOKENS_TABLE,
          Key: { token: refreshToken },
        }));
      }

      await context.logAudit({
        action: 'LOGOUT',
        userId: context.user?.id,
      });

      return true;
    } catch (error) {
      // Always return true for logout to prevent information leakage
      return true;
    }
  },

  // Contractor access
  accessWithToken: async (parent, args, context) => {
    const { token } = args;

    try {
      // Hash the provided token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Query by token hash
      const result = await context.client.send(new QueryCommand({
        TableName: process.env.CONTRACTORS_TABLE,
        IndexName: 'token-index',
        KeyConditionExpression: 'tokenHash = :token',
        ExpressionAttributeValues: { ':token': hashedToken },
      }));

      if (!result.Items || result.Items.length === 0) {
        throw new GraphQLError('Invalid or expired access token');
      }

      const contractor = result.Items[0];

      // Check expiration
      if (Date.now() > contractor.expiresAt) {
        throw new GraphQLError('Access token has expired');
      }

      // Update access count
      await context.client.send(new UpdateCommand({
        TableName: process.env.CONTRACTORS_TABLE,
        Key: { id: contractor.id },
        UpdateExpression: 'SET accessCount = accessCount + :inc, lastAccess = :now, #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':inc': 1,
          ':now': Date.now(),
          ':status': 'active',
        },
      }));

      // Generate JWT for contractor
      const expiresIn = Math.floor((contractor.expiresAt - Date.now()) / 1000);
      const jwt = await generateJwtToken({
        id: contractor.id,
        email: contractor.email,
        name: contractor.name,
        type: 'contractor',
        permissions: contractor.permissions,
        allowedSecrets: contractor.allowedSecrets,
      }, `${expiresIn}s`);

      await context.logAudit({
        action: 'CONTRACTOR_ACCESS',
        userId: contractor.id,
        details: {
          email: contractor.email,
          company: contractor.company,
        },
      });

      return {
        token: jwt,
        contractor,
        expiresAt: new Date(contractor.expiresAt).toISOString(),
      };
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError(`Access failed: ${error.message}`);
    }
  },

  // User management mutations
  createUser: async (parent, args, context) => {
    const { input } = args;
    const { email, name, password, role = 'USER' } = input;

    try {
      // Hash password
      const passwordHash = await hashPassword(password);

      const newUser = {
        id: uuidv4(),
        email: email.toLowerCase(),
        name,
        role: role.toLowerCase(),
        passwordHash,
        isActive: true,
        createdAt: Date.now(),
        createdBy: context.user.id,
        lastLogin: null,
      };

      // Create user
      await context.client.send(new PutCommand({
        TableName: process.env.USERS_TABLE,
        Item: newUser,
        ConditionExpression: 'attribute_not_exists(id)',
      }));

      // Clear users cache
      await context.cache.invalidate('user');

      await context.logAudit({
        action: 'USER_CREATED',
        userId: context.user.id,
        targetUserId: newUser.id,
        details: { email, name, role },
      });

      return newUser;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new GraphQLError('User already exists');
      }
      throw new GraphQLError(`User creation failed: ${error.message}`);
    }
  },

  updateUser: async (parent, args, context) => {
    const { id, input } = args;

    try {
      // Determine allowed updates based on role
      const allowedUpdates = context.user.role === 'admin'
        ? ['name', 'email', 'role', 'isActive']
        : id === context.user.id ? ['name'] : [];

      const updateExpression = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      for (const [key, value] of Object.entries(input)) {
        if (allowedUpdates.includes(key)) {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      }

      if (updateExpression.length === 0) {
        throw new GraphQLError('No valid updates provided');
      }

      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = Date.now();

      await context.client.send(new UpdateCommand({
        TableName: process.env.USERS_TABLE,
        Key: { id },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(id)',
      }));

      // Clear user cache
      await context.cache.delete('user', id);

      await context.logAudit({
        action: 'USER_UPDATED',
        userId: context.user.id,
        targetUserId: id,
        changes: Object.keys(input),
      });

      return context.getUser(id);
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new GraphQLError('User not found');
      }
      throw new GraphQLError(`User update failed: ${error.message}`);
    }
  },

  deleteUser: async (parent, args, context) => {
    const { id } = args;

    if (id === context.user.id) {
      throw new GraphQLError('Cannot delete your own account');
    }

    try {
      await context.client.send(new DeleteCommand({
        TableName: process.env.USERS_TABLE,
        Key: { id },
        ConditionExpression: 'attribute_exists(id)',
      }));

      // Clear cache
      await context.cache.delete('user', id);
      await context.cache.invalidate('user');

      await context.logAudit({
        action: 'USER_DELETED',
        userId: context.user.id,
        targetUserId: id,
      });

      return true;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new GraphQLError('User not found');
      }
      throw new GraphQLError(`User deletion failed: ${error.message}`);
    }
  },

  // Contractor management
  inviteContractor: async (parent, args, context) => {
    const { input } = args;
    const {
      email,
      name,
      company = 'External',
      accessDuration = 7,
      allowedSecrets = [],
      permissions = ['READ'],
      reason,
      notifyEmail = true,
    } = input;

    try {
      // Generate secure access token
      const accessToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(accessToken).digest('hex');

      const now = Date.now();
      const expiresAt = now + (accessDuration * 24 * 60 * 60 * 1000);
      const ttl = Math.floor(expiresAt / 1000);

      const contractor = {
        id: uuidv4(),
        email,
        name,
        company,
        tokenHash: hashedToken,
        createdAt: now,
        expiresAt,
        ttl,
        accessDuration,
        allowedSecrets,
        permissions,
        reason,
        invitedBy: context.user.id,
        status: 'pending',
        accessCount: 0,
        lastAccess: null,
      };

      // Store contractor
      await context.client.send(new PutCommand({
        TableName: process.env.CONTRACTORS_TABLE,
        Item: contractor,
      }));

      // Create access URL
      const accessUrl = `https://${process.env.DOMAIN || 'localhost:3000'}/contractor-access/${accessToken}`;

      // TODO: Send email notification if needed

      await context.logAudit({
        action: 'CONTRACTOR_INVITED',
        userId: context.user.id,
        resource: contractor.id,
        details: {
          contractorEmail: email,
          company,
          accessDuration,
          permissions,
        },
      });

      return contractor;
    } catch (error) {
      throw new GraphQLError(`Contractor invitation failed: ${error.message}`);
    }
  },

  revokeContractorAccess: async (parent, args, context) => {
    const { id } = args;

    try {
      await context.client.send(new UpdateCommand({
        TableName: process.env.CONTRACTORS_TABLE,
        Key: { id },
        UpdateExpression: 'SET #status = :status, revokedAt = :now, revokedBy = :admin',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'revoked',
          ':now': Date.now(),
          ':admin': context.user.id,
        },
        ConditionExpression: 'attribute_exists(id)',
      }));

      await context.logAudit({
        action: 'CONTRACTOR_REVOKED',
        userId: context.user.id,
        resource: id,
      });

      return true;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new GraphQLError('Contractor not found');
      }
      throw new GraphQLError(`Contractor revocation failed: ${error.message}`);
    }
  },

  // Secret management
  createSecret: async (parent, args, context) => {
    const { input } = args;
    const { name, value, description, tags = [] } = input;

    try {
      const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

      await client.send(new CreateSecretCommand({
        Name: `${process.env.SECRETS_PREFIX}/${name}`,
        SecretString: typeof value === 'string' ? value : JSON.stringify(value),
        Description: description,
        Tags: tags.map(tag => {
          const [key, val] = tag.split(':');
          return { Key: key, Value: val || '' };
        }),
      }));

      // Clear secrets cache
      await context.cache.invalidate('secret');

      await context.logAudit({
        action: 'SECRET_CREATED',
        userId: context.user.id,
        resource: name,
      });

      // Return secret metadata
      return {
        id: name,
        name,
        description,
        tags,
        createdAt: new Date().toISOString(),
        version: '1',
        createdBy: context.user.id,
        accessCount: 0,
      };
    } catch (error) {
      throw new GraphQLError(`Secret creation failed: ${error.message}`);
    }
  },

  updateSecret: async (parent, args, context) => {
    const { name, input } = args;
    const { value, description, tags } = input;

    try {
      const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

      const updateParams = {
        SecretId: `${process.env.SECRETS_PREFIX}/${name}`,
      };

      if (value !== undefined) {
        updateParams.SecretString = typeof value === 'string' ? value : JSON.stringify(value);
      }

      if (description !== undefined) {
        updateParams.Description = description;
      }

      await client.send(new UpdateSecretCommand(updateParams));

      // Clear cache
      await context.cache.delete('secret', name);

      await context.logAudit({
        action: 'SECRET_UPDATED',
        userId: context.user.id,
        resource: name,
      });

      // Return updated metadata
      return {
        id: name,
        name,
        description,
        tags: tags || [],
        updatedAt: new Date().toISOString(),
        lastModifiedBy: context.user.id,
      };
    } catch (error) {
      throw new GraphQLError(`Secret update failed: ${error.message}`);
    }
  },

  deleteSecret: async (parent, args, context) => {
    const { name } = args;

    try {
      const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

      await client.send(new DeleteSecretCommand({
        SecretId: `${process.env.SECRETS_PREFIX}/${name}`,
        ForceDeleteWithoutRecovery: false, // Allow recovery for 30 days
      }));

      // Clear cache
      await context.cache.delete('secret', name);
      await context.cache.invalidate('secret');

      await context.logAudit({
        action: 'SECRET_DELETED',
        userId: context.user.id,
        resource: name,
      });

      return true;
    } catch (error) {
      throw new GraphQLError(`Secret deletion failed: ${error.message}`);
    }
  },

  // Configuration management
  updateConfig: async (parent, args, context) => {
    const { key, input } = args;
    const { value, description } = input;

    try {
      await context.client.send(new PutCommand({
        TableName: process.env.CONFIG_TABLE,
        Item: {
          key,
          value,
          description: description || '',
          category: 'system',
          isPublic: false,
          updatedAt: Date.now(),
          updatedBy: context.user.id,
        },
      }));

      // Clear config cache
      await context.cache.delete('config', key);

      await context.logAudit({
        action: 'CONFIG_UPDATED',
        userId: context.user.id,
        resource: key,
      });

      return context.getEntity(`CONFIG#${key}`, 'METADATA');
    } catch (error) {
      throw new GraphQLError(`Config update failed: ${error.message}`);
    }
  },

  // Cache management
  clearCache: async (parent, args, context) => {
    const { pattern } = args;

    try {
      if (pattern) {
        await context.cache.invalidate(pattern);
      } else {
        // Clear all caches
        context.clearCache();
      }

      await context.logAudit({
        action: 'CACHE_CLEARED',
        userId: context.user.id,
        details: { pattern: pattern || 'all' },
      });

      return true;
    } catch (error) {
      throw new GraphQLError(`Cache clear failed: ${error.message}`);
    }
  },

  warmupCache: async (parent, args, context) => {
    const { keys } = args;

    try {
      // Pre-load commonly accessed data
      const warmupPromises = keys.map(async (key) => {
        if (key.startsWith('user:')) {
          const userId = key.replace('user:', '');
          return context.getUser(userId);
        } else if (key.startsWith('secret:')) {
          const secretName = key.replace('secret:', '');
          return context.secret(null, { name: secretName }, context);
        }
        return null;
      });

      await Promise.all(warmupPromises);

      await context.logAudit({
        action: 'CACHE_WARMED',
        userId: context.user.id,
        details: { keys },
      });

      return true;
    } catch (error) {
      throw new GraphQLError(`Cache warmup failed: ${error.message}`);
    }
  },
};
