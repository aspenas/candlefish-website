import { SecretsManagerClient, ListSecretsCommand, RotateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { logAudit } from '../utils/helpers.js';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  console.log('Starting monthly secret rotation...');
  
  try {
    // List all secrets with our prefix
    const listCommand = new ListSecretsCommand({
      Filters: [
        {
          Key: 'name',
          Values: [`${process.env.SECRETS_PREFIX}/`]
        }
      ]
    });
    
    const listResult = await secretsClient.send(listCommand);
    const secretsToRotate = listResult.SecretList.filter(s => s.RotationEnabled);
    
    console.log(`Found ${secretsToRotate.length} secrets to rotate`);
    
    const results = [];
    for (const secret of secretsToRotate) {
      try {
        const rotateCommand = new RotateSecretCommand({
          SecretId: secret.ARN,
          ClientRequestToken: `rotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
        
        await secretsClient.send(rotateCommand);
        
        results.push({
          name: secret.Name,
          status: 'rotated',
        });
        
        await logAudit({
          action: 'SECRET_ROTATED',
          resource: secret.Name,
          userId: 'system',
        });
      } catch (error) {
        console.error(`Failed to rotate ${secret.Name}:`, error);
        results.push({
          name: secret.Name,
          status: 'failed',
          error: error.message,
        });
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        rotated: results.filter(r => r.status === 'rotated').length,
        failed: results.filter(r => r.status === 'failed').length,
        results,
      }),
    };
  } catch (error) {
    console.error('Rotation handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Rotation failed',
      }),
    };
  }
};