import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { response, validateAuth, logAudit } from '../utils/helpers.js';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONFIG_TABLE = `${process.env.SECRETS_PREFIX}-config`;

export const handler = async (event) => {
  try {
    const user = await validateAuth(event);
    if (!user) {
      return response(401, { error: 'Unauthorized' });
    }
    
    const method = event.httpMethod;
    
    if (method === 'GET') {
      return await getConfig(user);
    } else if (method === 'PUT') {
      return await updateConfig(JSON.parse(event.body), user);
    }
    
    return response(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Config handler error:', error);
    return response(500, { error: 'Internal server error' });
  }
};

async function getConfig(user) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { key: 'global' },
    }));
    
    const config = result.Item || {
      key: 'global',
      teamSize: parseInt(process.env.MAX_TEAM_SIZE) || 20,
      contractorEnabled: true,
      secretRotationDays: 30,
      sessionTimeout: 24,
      mfaRequired: false,
      allowedDomains: [],
    };
    
    await logAudit({
      action: 'CONFIG_RETRIEVED',
      userId: user.id,
    });
    
    return response(200, config);
  } catch (error) {
    console.error('Get config error:', error);
    throw error;
  }
}

async function updateConfig(updates, user) {
  // Only admins can update configuration
  if (user.role !== 'admin') {
    return response(403, { error: 'Admin access required' });
  }
  
  try {
    const config = {
      key: 'global',
      ...updates,
      updatedAt: Date.now(),
      updatedBy: user.id,
    };
    
    await docClient.send(new PutCommand({
      TableName: CONFIG_TABLE,
      Item: config,
    }));
    
    await logAudit({
      action: 'CONFIG_UPDATED',
      userId: user.id,
      changes: Object.keys(updates),
    });
    
    return response(200, {
      success: true,
      message: 'Configuration updated',
      config,
    });
  } catch (error) {
    console.error('Update config error:', error);
    throw error;
  }
}