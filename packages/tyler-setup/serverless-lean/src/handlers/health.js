import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, ListSecretsCommand } from '@aws-sdk/client-secrets-manager';
import { response, errorResponse, putMetric } from '../utils/helpers.js';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  const startTime = Date.now();
  
  try {
    // Basic health check data
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      stage: process.env.STAGE || 'dev',
      service: 'candlefish-employee-setup',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {},
    };

    // Check if this is a detailed health check
    const detailed = event.queryStringParameters?.detailed === 'true';
    
    if (detailed) {
      // Check DynamoDB connectivity
      try {
        await checkDynamoDBHealth();
        healthData.checks.dynamodb = 'healthy';
      } catch (error) {
        console.error('DynamoDB health check failed:', error);
        healthData.checks.dynamodb = 'unhealthy';
        healthData.status = 'degraded';
      }
      
      // Check Secrets Manager connectivity
      try {
        await checkSecretsManagerHealth();
        healthData.checks.secretsManager = 'healthy';
      } catch (error) {
        console.error('Secrets Manager health check failed:', error);
        healthData.checks.secretsManager = 'unhealthy';
        healthData.status = 'degraded';
      }
      
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
      healthData.checks.memory = {
        status: memoryUsageMB > 400 ? 'warning' : 'healthy',
        heapUsedMB: Math.round(memoryUsageMB),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      };
      
      if (memoryUsageMB > 400) {
        healthData.status = 'degraded';
      }
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;
    healthData.responseTimeMs = responseTime;
    
    // Send metrics to CloudWatch
    await putMetric('HealthCheckResponseTime', responseTime, [
      { Name: 'Stage', Value: process.env.STAGE || 'dev' },
      { Name: 'Detailed', Value: detailed ? 'true' : 'false' }
    ]);
    
    await putMetric('HealthCheckStatus', healthData.status === 'healthy' ? 1 : 0, [
      { Name: 'Stage', Value: process.env.STAGE || 'dev' }
    ]);

    return response(200, healthData);
    
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      stage: process.env.STAGE || 'dev',
      error: error.message,
      responseTimeMs: Date.now() - startTime,
    };
    
    await putMetric('HealthCheckStatus', 0, [
      { Name: 'Stage', Value: process.env.STAGE || 'dev' }
    ]);
    
    return response(503, errorData);
  }
};

/**
 * Check DynamoDB connectivity
 */
async function checkDynamoDBHealth() {
  const tableName = `${process.env.SECRETS_PREFIX}-users`;
  
  await dynamoClient.send(new DescribeTableCommand({
    TableName: tableName
  }));
}

/**
 * Check Secrets Manager connectivity
 */
async function checkSecretsManagerHealth() {
  await secretsClient.send(new ListSecretsCommand({
    MaxResults: 1,
    Filters: [{
      Key: 'name',
      Values: [process.env.SECRETS_PREFIX]
    }]
  }));
}
