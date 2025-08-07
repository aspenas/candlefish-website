import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { response, validateAuth, logAudit } from '../utils/helpers.js';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = `${process.env.SECRETS_PREFIX}-users`;

export const handler = async (event) => {
  try {
    const user = await validateAuth(event);
    if (!user) {
      return response(401, { error: 'Unauthorized' });
    }
    
    const method = event.httpMethod;
    const userId = event.pathParameters?.id;
    
    switch (method) {
      case 'GET':
        if (userId) {
          return await getUser(userId, user);
        } else {
          return await listUsers(user);
        }
      case 'POST':
        return await createUser(JSON.parse(event.body), user);
      case 'PUT':
        return await updateUser(userId, JSON.parse(event.body), user);
      case 'DELETE':
        return await deleteUser(userId, user);
      default:
        return response(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Users handler error:', error);
    return response(500, { error: 'Internal server error' });
  }
};

async function listUsers(requestingUser) {
  // Only admins can list all users
  if (requestingUser.role !== 'admin') {
    return response(403, { error: 'Admin access required' });
  }
  
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      Limit: 100,
    }));
    
    const users = result.Items.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    }));
    
    await logAudit({
      action: 'USERS_LISTED',
      userId: requestingUser.id,
      count: users.length,
    });
    
    return response(200, {
      users,
      count: users.length,
    });
  } catch (error) {
    console.error('List users error:', error);
    throw error;
  }
}

async function getUser(userId, requestingUser) {
  // Users can view their own profile, admins can view anyone
  if (userId !== requestingUser.id && requestingUser.role !== 'admin') {
    return response(403, { error: 'Unauthorized' });
  }
  
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
    }));
    
    if (!result.Item) {
      return response(404, { error: 'User not found' });
    }
    
    const user = {
      id: result.Item.id,
      email: result.Item.email,
      name: result.Item.name,
      role: result.Item.role,
      isActive: result.Item.isActive,
      lastLogin: result.Item.lastLogin,
      createdAt: result.Item.createdAt,
    };
    
    return response(200, user);
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

async function createUser(userData, requestingUser) {
  // Only admins can create users
  if (requestingUser.role !== 'admin') {
    return response(403, { error: 'Admin access required' });
  }
  
  const { email, name, password, role = 'user' } = userData;
  
  if (!email || !name || !password) {
    return response(400, { error: 'Email, name, and password required' });
  }
  
  try {
    // Use Argon2 for password hashing (matches auth.js expectations)
    const { hashPassword } = await import('../utils/security.js');
    const passwordHash = await hashPassword(password);
    
    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase(),
      name,
      role,
      passwordHash,
      // Note: salt is included in Argon2 hash, no separate field needed
      isActive: true,
      createdAt: Date.now(),
      createdBy: requestingUser.id,
      lastLogin: null,
    };
    
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: newUser,
      ConditionExpression: 'attribute_not_exists(id)',
    }));
    
    await logAudit({
      action: 'USER_CREATED',
      userId: requestingUser.id,
      targetUserId: newUser.id,
      details: { email, name, role },
    });
    
    return response(201, {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return response(409, { error: 'User already exists' });
    }
    console.error('Create user error:', error);
    throw error;
  }
}

async function updateUser(userId, updates, requestingUser) {
  // Users can update their own profile (limited), admins can update anyone
  if (userId !== requestingUser.id && requestingUser.role !== 'admin') {
    return response(403, { error: 'Unauthorized' });
  }
  
  try {
    const allowedUpdates = requestingUser.role === 'admin' 
      ? ['name', 'email', 'role', 'isActive']
      : ['name']; // Regular users can only update their name
    
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }
    
    if (updateExpression.length === 0) {
      return response(400, { error: 'No valid updates provided' });
    }
    
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = Date.now();
    
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(id)',
    }));
    
    await logAudit({
      action: 'USER_UPDATED',
      userId: requestingUser.id,
      targetUserId: userId,
      changes: Object.keys(updates),
    });
    
    return response(200, {
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return response(404, { error: 'User not found' });
    }
    console.error('Update user error:', error);
    throw error;
  }
}

async function deleteUser(userId, requestingUser) {
  // Only admins can delete users
  if (requestingUser.role !== 'admin') {
    return response(403, { error: 'Admin access required' });
  }
  
  // Prevent self-deletion
  if (userId === requestingUser.id) {
    return response(400, { error: 'Cannot delete your own account' });
  }
  
  try {
    await docClient.send(new DeleteCommand({
      TableName: USERS_TABLE,
      Key: { id: userId },
      ConditionExpression: 'attribute_exists(id)',
    }));
    
    await logAudit({
      action: 'USER_DELETED',
      userId: requestingUser.id,
      targetUserId: userId,
    });
    
    return response(200, {
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return response(404, { error: 'User not found' });
    }
    console.error('Delete user error:', error);
    throw error;
  }
}