import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand, ListSecretsCommand, DeleteSecretCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { response, validateAuth, logAudit } from '../utils/helpers.js';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Lean AWS Secrets Manager handler for small teams
 * Optimized for 5-20 users with contractor support
 */
export const handler = async (event) => {
  try {
    // Validate authentication
    const user = await validateAuth(event);
    if (!user) {
      return response(401, { error: 'Unauthorized' });
    }

    const httpMethod = event.httpMethod;
    const secretName = event.pathParameters?.name;

    // Check contractor permissions
    if (user.type === 'contractor') {
      // Contractors can only read specific allowed secrets
      if (httpMethod !== 'GET' || !isContractorAllowedSecret(secretName, user)) {
        await logAudit({
          action: 'SECRET_ACCESS_DENIED',
          userId: user.id,
          resource: secretName,
          reason: 'Contractor permission denied'
        });
        return response(403, { error: 'Contractors have read-only access to specific secrets' });
      }
    }

    switch (httpMethod) {
      case 'GET':
        if (secretName) {
          return await getSecret(secretName, user);
        } else {
          return await listSecrets(user);
        }

      case 'POST':
        return await createSecret(event.body, user);

      case 'PUT':
        return await updateSecret(secretName, event.body, user);

      case 'DELETE':
        return await deleteSecret(secretName, user);

      default:
        return response(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Secrets handler error:', error);
    return response(500, { error: 'Internal server error' });
  }
};

/**
 * Get a specific secret
 */
async function getSecret(secretName, user) {
  try {
    const fullSecretName = `${process.env.SECRETS_PREFIX}/${secretName}`;

    const command = new GetSecretValueCommand({
      SecretId: fullSecretName
    });

    const result = await secretsClient.send(command);

    // Parse secret value
    let secretValue;
    try {
      secretValue = JSON.parse(result.SecretString);
    } catch {
      secretValue = result.SecretString;
    }

    // Log access
    await logAudit({
      action: 'SECRET_RETRIEVED',
      userId: user.id,
      resource: secretName,
      userType: user.type
    });

    // Mask sensitive values for contractors
    if (user.type === 'contractor') {
      secretValue = maskSensitiveData(secretValue);
    }

    return response(200, {
      name: secretName,
      value: secretValue,
      version: result.VersionId,
      lastModified: result.CreatedDate,
      metadata: {
        description: result.Description,
        tags: result.Tags
      }
    });
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return response(404, { error: 'Secret not found' });
    }
    throw error;
  }
}

/**
 * List all secrets
 */
async function listSecrets(user) {
  try {
    const command = new ListSecretsCommand({
      MaxResults: 100,
      Filters: [
        {
          Key: 'name',
          Values: [`${process.env.SECRETS_PREFIX}/`]
        }
      ]
    });

    const result = await secretsClient.send(command);

    // Filter secrets based on user permissions
    let secrets = result.SecretList.map(secret => ({
      name: secret.Name.replace(`${process.env.SECRETS_PREFIX}/`, ''),
      description: secret.Description,
      lastChanged: secret.LastChangedDate,
      lastAccessed: secret.LastAccessedDate,
      tags: secret.Tags,
      rotationEnabled: secret.RotationEnabled
    }));

    // Contractors see limited list
    if (user.type === 'contractor') {
      secrets = secrets.filter(s => isContractorAllowedSecret(s.name, user));
    }

    await logAudit({
      action: 'SECRETS_LISTED',
      userId: user.id,
      count: secrets.length
    });

    return response(200, {
      secrets,
      count: secrets.length
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new secret
 */
async function createSecret(body, user) {
  try {
    const data = JSON.parse(body);
    const { name, value, description, tags } = data;

    if (!name || !value) {
      return response(400, { error: 'Name and value are required' });
    }

    const fullSecretName = `${process.env.SECRETS_PREFIX}/${name}`;

    const command = new CreateSecretCommand({
      Name: fullSecretName,
      SecretString: typeof value === 'object' ? JSON.stringify(value) : value,
      Description: description || `Created by ${user.email} on ${new Date().toISOString()}`,
      Tags: [
        { Key: 'CreatedBy', Value: user.id },
        { Key: 'Environment', Value: process.env.STAGE },
        ...(tags || [])
      ]
    });

    const result = await secretsClient.send(command);

    await logAudit({
      action: 'SECRET_CREATED',
      userId: user.id,
      resource: name,
      details: { description }
    });

    return response(201, {
      success: true,
      name,
      arn: result.ARN,
      versionId: result.VersionId
    });
  } catch (error) {
    if (error.name === 'ResourceExistsException') {
      return response(409, { error: 'Secret already exists' });
    }
    throw error;
  }
}

/**
 * Update an existing secret
 */
async function updateSecret(secretName, body, user) {
  try {
    const data = JSON.parse(body);
    const { value, description } = data;

    if (!value) {
      return response(400, { error: 'Value is required' });
    }

    const fullSecretName = `${process.env.SECRETS_PREFIX}/${secretName}`;

    const command = new UpdateSecretCommand({
      SecretId: fullSecretName,
      SecretString: typeof value === 'object' ? JSON.stringify(value) : value,
      Description: description
    });

    const result = await secretsClient.send(command);

    await logAudit({
      action: 'SECRET_UPDATED',
      userId: user.id,
      resource: secretName
    });

    return response(200, {
      success: true,
      name: secretName,
      arn: result.ARN,
      versionId: result.VersionId
    });
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return response(404, { error: 'Secret not found' });
    }
    throw error;
  }
}

/**
 * Delete a secret (with recovery window)
 */
async function deleteSecret(secretName, user) {
  try {
    // Only admins can delete secrets
    if (user.role !== 'admin') {
      return response(403, { error: 'Only administrators can delete secrets' });
    }

    const fullSecretName = `${process.env.SECRETS_PREFIX}/${secretName}`;

    const command = new DeleteSecretCommand({
      SecretId: fullSecretName,
      RecoveryWindowInDays: 7  // 7-day recovery window
    });

    const result = await secretsClient.send(command);

    await logAudit({
      action: 'SECRET_DELETED',
      userId: user.id,
      resource: secretName,
      details: { recoveryWindow: 7 }
    });

    return response(200, {
      success: true,
      name: secretName,
      deletionDate: result.DeletionDate,
      recoveryWindow: 7
    });
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return response(404, { error: 'Secret not found' });
    }
    throw error;
  }
}

/**
 * Check if contractor is allowed to access a secret
 */
function isContractorAllowedSecret(secretName, contractor) {
  // Define which secrets contractors can access
  const allowedPrefixes = [
    'app/',      // Application configs
    'public/',   // Public keys
    'docs/',     // Documentation links
  ];

  // Check contractor-specific permissions
  if (contractor.allowedSecrets && contractor.allowedSecrets.includes(secretName)) {
    return true;
  }

  // Check prefix-based permissions
  return allowedPrefixes.some(prefix => secretName.startsWith(prefix));
}

/**
 * Mask sensitive data for contractors
 */
function maskSensitiveData(value) {
  if (typeof value === 'string') {
    // Show first 4 and last 4 characters
    if (value.length > 12) {
      return value.substring(0, 4) + '****' + value.substring(value.length - 4);
    }
    return '********';
  }

  if (typeof value === 'object') {
    const masked = {};
    for (const [key, val] of Object.entries(value)) {
      // Don't mask certain safe fields
      if (['url', 'endpoint', 'region', 'type', 'description'].includes(key.toLowerCase())) {
        masked[key] = val;
      } else {
        masked[key] = maskSensitiveData(val);
      }
    }
    return masked;
  }

  return '********';
}
