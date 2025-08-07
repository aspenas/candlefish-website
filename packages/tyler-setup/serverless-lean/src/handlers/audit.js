import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { response, validateAuth } from '../utils/helpers.js';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const AUDIT_TABLE = `${process.env.SECRETS_PREFIX}-audit`;

export const handler = async (event) => {
  try {
    const user = await validateAuth(event);
    if (!user) {
      return response(401, { error: 'Unauthorized' });
    }
    
    // Only admins can view audit logs
    if (user.role !== 'admin') {
      return response(403, { error: 'Admin access required' });
    }
    
    const queryParams = event.queryStringParameters || {};
    return await getAuditLogs(queryParams, user);
  } catch (error) {
    console.error('Audit handler error:', error);
    return response(500, { error: 'Internal server error' });
  }
};

async function getAuditLogs(params, user) {
  try {
    const { userId, action, startDate, endDate, limit = 100 } = params;
    
    let command;
    
    if (userId) {
      // Query by user ID
      command = new QueryCommand({
        TableName: AUDIT_TABLE,
        IndexName: 'user-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        Limit: parseInt(limit),
        ScanIndexForward: false, // Most recent first
      });
    } else {
      // Scan all logs (less efficient but ok for small teams)
      const filterExpressions = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {};
      
      if (action) {
        filterExpressions.push('#action = :action');
        expressionAttributeNames['#action'] = 'action';
        expressionAttributeValues[':action'] = action;
      }
      
      if (startDate) {
        filterExpressions.push('#timestamp >= :startDate');
        expressionAttributeNames['#timestamp'] = 'timestamp';
        expressionAttributeValues[':startDate'] = parseInt(startDate);
      }
      
      if (endDate) {
        filterExpressions.push('#timestamp <= :endDate');
        expressionAttributeNames['#timestamp'] = 'timestamp';
        expressionAttributeValues[':endDate'] = parseInt(endDate);
      }
      
      command = new ScanCommand({
        TableName: AUDIT_TABLE,
        Limit: parseInt(limit),
        ...(filterExpressions.length > 0 && {
          FilterExpression: filterExpressions.join(' AND '),
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        }),
      });
    }
    
    const result = await docClient.send(command);
    
    // Format logs for response
    const logs = result.Items
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(log => ({
        id: log.id,
        timestamp: new Date(log.timestamp).toISOString(),
        action: log.action,
        userId: log.userId,
        resource: log.resource,
        details: log.details,
        ip: log.ip,
        userAgent: log.userAgent,
      }));
    
    return response(200, {
      logs,
      count: logs.length,
      hasMore: !!result.LastEvaluatedKey,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    throw error;
  }
}