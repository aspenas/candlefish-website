import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { logAudit } from '../utils/helpers.js';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONTRACTORS_TABLE = `${process.env.SECRETS_PREFIX}-contractors`;

export const handler = async (event) => {
  console.log('Starting daily contractor cleanup...');
  
  try {
    const now = Date.now();
    
    // Scan for expired contractors
    const scanCommand = new ScanCommand({
      TableName: CONTRACTORS_TABLE,
      FilterExpression: 'expiresAt < :now AND #status <> :revoked',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':now': now,
        ':revoked': 'revoked',
      },
    });
    
    const result = await docClient.send(scanCommand);
    
    console.log(`Found ${result.Items.length} expired contractors to clean up`);
    
    const cleanupResults = [];
    
    for (const contractor of result.Items) {
      try {
        // Delete expired contractor (DynamoDB TTL will also handle this eventually)
        await docClient.send(new DeleteCommand({
          TableName: CONTRACTORS_TABLE,
          Key: { id: contractor.id },
        }));
        
        cleanupResults.push({
          id: contractor.id,
          email: contractor.email,
          status: 'cleaned',
        });
        
        await logAudit({
          action: 'CONTRACTOR_EXPIRED_CLEANUP',
          userId: 'system',
          resource: contractor.id,
          details: {
            email: contractor.email,
            expiredAt: new Date(contractor.expiresAt).toISOString(),
            accessCount: contractor.accessCount,
          },
        });
      } catch (error) {
        console.error(`Failed to clean up contractor ${contractor.id}:`, error);
        cleanupResults.push({
          id: contractor.id,
          email: contractor.email,
          status: 'failed',
          error: error.message,
        });
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processed: cleanupResults.length,
        cleaned: cleanupResults.filter(r => r.status === 'cleaned').length,
        failed: cleanupResults.filter(r => r.status === 'failed').length,
        results: cleanupResults,
      }),
    };
  } catch (error) {
    console.error('Cleanup handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Cleanup failed',
      }),
    };
  }
};