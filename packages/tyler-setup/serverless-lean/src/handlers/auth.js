import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';
import { 
  response, 
  errorResponse, 
  logAudit, 
  handleError, 
  checkRateLimit, 
  getClientIP,
  validateRequestSize 
} from '../utils/helpers.js';
import { 
  generateJwtToken, 
  verifyJwtToken, 
  hashPassword, 
  verifyPassword, 
  generateRefreshToken,
  RATE_LIMITS 
} from '../utils/security.js';
import { 
  validateBody, 
  userLoginSchema, 
  sanitizeObject 
} from '../utils/validation.js';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = `${process.env.SECRETS_PREFIX}-users`;
const REFRESH_TOKENS_TABLE = `${process.env.SECRETS_PREFIX}-refresh-tokens`;

export const handler = async (event) => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return response(200, {});
    }

    // Validate request size
    validateRequestSize(event);

    const path = event.path;
    const method = event.httpMethod;
    const clientIP = getClientIP(event);
    
    // Rate limiting for authentication endpoints
    if (!checkRateLimit(`auth:${clientIP}`, RATE_LIMITS.AUTH)) {
      await logAudit({
        action: 'RATE_LIMIT_EXCEEDED',
        ip: clientIP,
        endpoint: path,
        userAgent: event.headers?.['User-Agent'],
      });
      return errorResponse(429, RATE_LIMITS.AUTH.message);
    }
    
    if (path.includes('/auth/login') && method === 'POST') {
      return await login(event);
    } else if (path.includes('/auth/refresh') && method === 'POST') {
      return await refreshToken(event);
    } else if (path.includes('/auth/logout') && method === 'POST') {
      return await logout(event);
    }
    
    return errorResponse(404, 'Authentication endpoint not found');
  } catch (error) {
    return handleError(error, 'auth handler');
  }
};

async function login(event) {
  try {
    const clientIP = getClientIP(event);
    const userAgent = event.headers?.['User-Agent'] || 'unknown';
    
    // Parse and validate request body
    const requestData = sanitizeObject(JSON.parse(event.body || '{}'));
    const credentials = validateBody(requestData, userLoginSchema);
    
    const { email, password } = credentials;
    
    // Query user by email
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    }));
    
    if (!result.Items || result.Items.length === 0) {
      await logAudit({
        action: 'LOGIN_FAILED',
        email,
        reason: 'User not found',
        ip: clientIP,
        userAgent,
      });
      return errorResponse(401, 'Invalid credentials');
    }
    
    const user = result.Items[0];
    
    // Verify password using Argon2
    const isValidPassword = await verifyPassword(user.passwordHash, password);
    if (!isValidPassword) {
      await logAudit({
        action: 'LOGIN_FAILED',
        userId: user.id,
        email,
        reason: 'Invalid password',
        ip: clientIP,
        userAgent,
      });
      return errorResponse(401, 'Invalid credentials');
    }
    
    // Check if user is active
    if (!user.isActive) {
      await logAudit({
        action: 'LOGIN_FAILED',
        userId: user.id,
        email,
        reason: 'Account disabled',
        ip: clientIP,
        userAgent,
      });
      return errorResponse(403, 'Account is disabled');
    }
    
    // Generate JWT token
    const token = await generateJwtToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      type: 'employee',
    });
    
    // Generate and store refresh token
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Store refresh token
    await docClient.send(new PutCommand({
      TableName: REFRESH_TOKENS_TABLE,
      Item: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
        createdAt: Date.now(),
        ip: clientIP,
        userAgent,
      },
    }));
    
    // Update user's last login
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        ...user,
        lastLogin: Date.now(),
        lastLoginIP: clientIP,
      },
    }));
    
    await logAudit({
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      email,
      ip: clientIP,
      userAgent,
    });
    
    return response(200, {
      success: true,
      token,
      refreshToken,
      expiresIn: 86400, // 24 hours in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    return handleError(error, 'login');
  }
}

async function refreshToken(event) {
  try {
    const clientIP = getClientIP(event);
    const userAgent = event.headers?.['User-Agent'] || 'unknown';
    
    // Parse request body
    const requestData = sanitizeObject(JSON.parse(event.body || '{}'));
    const { refreshToken } = requestData;
    
    if (!refreshToken) {
      return errorResponse(400, 'Refresh token required');
    }
    
    // Find refresh token in database
    const tokenResult = await docClient.send(new GetCommand({
      TableName: REFRESH_TOKENS_TABLE,
      Key: { token: refreshToken },
    }));
    
    if (!tokenResult.Item) {
      await logAudit({
        action: 'REFRESH_TOKEN_FAILED',
        reason: 'Token not found',
        ip: clientIP,
        userAgent,
      });
      return errorResponse(401, 'Invalid refresh token');
    }
    
    const storedToken = tokenResult.Item;
    
    // Check if token is expired
    if (storedToken.expiresAt < Date.now()) {
      await logAudit({
        action: 'REFRESH_TOKEN_FAILED',
        reason: 'Token expired',
        userId: storedToken.userId,
        ip: clientIP,
        userAgent,
      });
      return errorResponse(401, 'Refresh token expired');
    }
    
    // Get user details
    const userResult = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: storedToken.userId },
    }));
    
    if (!userResult.Item || !userResult.Item.isActive) {
      await logAudit({
        action: 'REFRESH_TOKEN_FAILED',
        reason: 'User not found or inactive',
        userId: storedToken.userId,
        ip: clientIP,
        userAgent,
      });
      return errorResponse(401, 'Invalid user');
    }
    
    const user = userResult.Item;
    
    // Generate new JWT token
    const newToken = await generateJwtToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      type: 'employee',
    });
    
    // Optionally rotate refresh token for security
    const newRefreshToken = generateRefreshToken();
    const refreshTokenExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Update refresh token
    await docClient.send(new PutCommand({
      TableName: REFRESH_TOKENS_TABLE,
      Item: {
        ...storedToken,
        token: newRefreshToken,
        expiresAt: refreshTokenExpiry,
        lastUsed: Date.now(),
        ip: clientIP,
        userAgent,
      },
    }));
    
    await logAudit({
      action: 'REFRESH_TOKEN_SUCCESS',
      userId: user.id,
      ip: clientIP,
      userAgent,
    });
    
    return response(200, {
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn: 86400,
    });
  } catch (error) {
    return handleError(error, 'refresh token');
  }
}

async function logout(event) {
  try {
    const clientIP = getClientIP(event);
    const userAgent = event.headers?.['User-Agent'] || 'unknown';
    
    // Extract user from token if available
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    let userId = null;
    if (token) {
      try {
        const decoded = await verifyJwtToken(token);
        userId = decoded.id;
      } catch (error) {
        // Token might be invalid, but we still want to allow logout
        console.log('Invalid token during logout:', error.message);
      }
    }
    
    // Parse request body for refresh token
    let refreshToken = null;
    if (event.body) {
      try {
        const requestData = sanitizeObject(JSON.parse(event.body));
        refreshToken = requestData.refreshToken;
      } catch (error) {
        // Ignore parsing errors for logout
      }
    }
    
    // Revoke refresh token if provided
    if (refreshToken) {
      try {
        await docClient.send(new DeleteCommand({
          TableName: REFRESH_TOKENS_TABLE,
          Key: { token: refreshToken },
        }));
      } catch (error) {
        console.log('Failed to delete refresh token:', error.message);
      }
    }
    
    await logAudit({
      action: 'LOGOUT',
      userId,
      ip: clientIP,
      userAgent,
    });
    
    return response(200, {
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    // Always return success for logout to prevent information leakage
    return response(200, { 
      success: true, 
      message: 'Logged out successfully' 
    });
  }
}