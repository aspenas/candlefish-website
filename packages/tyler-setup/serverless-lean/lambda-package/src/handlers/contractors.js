import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { v4 as uuidv4 } from 'uuid';
import { response, validateAuth, logAudit } from '../utils/helpers.js';
import { generateJwtToken } from '../utils/security.js';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({ region: process.env.AWS_REGION });

const CONTRACTORS_TABLE = `${process.env.SECRETS_PREFIX}-contractors`;
const USERS_TABLE = `${process.env.SECRETS_PREFIX}-users`;

/**
 * Contractor temporary access management
 * Perfect for consultants, auditors, temporary staff
 */
export const handler = async (event) => {
  try {
    const path = event.path;
    const method = event.httpMethod;

    // Public endpoint for contractor access
    if (path.includes('/contractors/access/')) {
      const token = event.pathParameters.token;
      return await accessWithToken(token);
    }

    // All other endpoints require authentication
    const user = await validateAuth(event);
    if (!user || user.role !== 'admin') {
      return response(401, { error: 'Admin access required' });
    }

    if (path.includes('/contractors/invite')) {
      return await inviteContractor(JSON.parse(event.body), user);
    } else if (path.includes('/contractors/revoke/')) {
      const contractorId = event.pathParameters.id;
      return await revokeAccess(contractorId, user);
    }

    return response(404, { error: 'Not found' });
  } catch (error) {
    console.error('Contractor handler error:', error);
    return response(500, { error: 'Internal server error' });
  }
};

/**
 * Invite a contractor with temporary access
 */
async function inviteContractor(data, adminUser) {
  try {
    const {
      email,
      name,
      company,
      accessDuration = 7, // Days
      allowedSecrets = [],
      permissions = ['read'],
      reason,
      notifyEmail = true
    } = data;

    // Validate input
    if (!email || !name || !reason) {
      return response(400, { error: 'Email, name, and reason are required' });
    }

    // Generate secure access token
    const accessToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(accessToken).digest('hex');

    // Calculate expiration
    const now = Date.now();
    const expiresAt = now + (accessDuration * 24 * 60 * 60 * 1000);
    const ttl = Math.floor(expiresAt / 1000); // DynamoDB TTL in seconds

    // Create contractor record
    const contractor = {
      id: uuidv4(),
      email,
      name,
      company: company || 'External',
      tokenHash: hashedToken,
      createdAt: now,
      expiresAt,
      ttl, // Auto-delete after expiration
      accessDuration,
      allowedSecrets,
      permissions,
      reason,
      invitedBy: adminUser.id,
      invitedByEmail: adminUser.email,
      status: 'pending',
      accessCount: 0,
      lastAccess: null
    };

    // Store in DynamoDB
    await docClient.send(new PutCommand({
      TableName: CONTRACTORS_TABLE,
      Item: contractor
    }));

    // Create access URL
    const accessUrl = `https://${process.env.DOMAIN || 'onboarding.candlefish.ai'}/contractor-access/${accessToken}`;

    // Send invitation email if enabled
    if (notifyEmail) {
      await sendInvitationEmail({
        email,
        name,
        accessUrl,
        expirationDays: accessDuration,
        reason,
        invitedBy: adminUser.email
      });
    }

    // Log the invitation
    await logAudit({
      action: 'CONTRACTOR_INVITED',
      userId: adminUser.id,
      resource: contractor.id,
      details: {
        contractorEmail: email,
        company,
        accessDuration,
        permissions,
        allowedSecrets: allowedSecrets.length
      }
    });

    return response(201, {
      success: true,
      contractorId: contractor.id,
      accessUrl,
      expiresAt: new Date(expiresAt).toISOString(),
      message: `Contractor invited successfully. Access expires in ${accessDuration} days.`
    });
  } catch (error) {
    console.error('Error inviting contractor:', error);
    throw error;
  }
}

/**
 * Access system with contractor token
 */
async function accessWithToken(token) {
  try {
    // Hash the provided token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Query by token hash
    const result = await docClient.send(new QueryCommand({
      TableName: CONTRACTORS_TABLE,
      IndexName: 'token-index',
      KeyConditionExpression: 'tokenHash = :token',
      ExpressionAttributeValues: {
        ':token': hashedToken
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return response(404, { error: 'Invalid or expired access token' });
    }

    const contractor = result.Items[0];

    // Check expiration
    if (Date.now() > contractor.expiresAt) {
      return response(401, {
        error: 'Access token has expired',
        expiredAt: new Date(contractor.expiresAt).toISOString()
      });
    }

    // Update access count and last access time
    await docClient.send(new UpdateCommand({
      TableName: CONTRACTORS_TABLE,
      Key: { id: contractor.id },
      UpdateExpression: 'SET accessCount = accessCount + :inc, lastAccess = :now, #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':inc': 1,
        ':now': Date.now(),
        ':status': 'active'
      }
    }));

    // Generate temporary JWT for contractor
    const jwt = await generateContractorJWT({
      id: contractor.id,
      email: contractor.email,
      name: contractor.name,
      type: 'contractor',
      permissions: contractor.permissions,
      allowedSecrets: contractor.allowedSecrets,
      expiresAt: contractor.expiresAt
    });

    // Log successful access
    await logAudit({
      action: 'CONTRACTOR_ACCESS',
      userId: contractor.id,
      details: {
        email: contractor.email,
        company: contractor.company,
        accessCount: contractor.accessCount + 1
      }
    });

    return response(200, {
      success: true,
      token: jwt,
      contractor: {
        name: contractor.name,
        email: contractor.email,
        company: contractor.company,
        permissions: contractor.permissions,
        expiresAt: new Date(contractor.expiresAt).toISOString()
      },
      message: 'Access granted successfully'
    });
  } catch (error) {
    console.error('Error accessing with token:', error);
    throw error;
  }
}

/**
 * Revoke contractor access
 */
async function revokeAccess(contractorId, adminUser) {
  try {
    // Get contractor details
    const result = await docClient.send(new GetCommand({
      TableName: CONTRACTORS_TABLE,
      Key: { id: contractorId }
    }));

    if (!result.Item) {
      return response(404, { error: 'Contractor not found' });
    }

    const contractor = result.Item;

    // Update status to revoked
    await docClient.send(new UpdateCommand({
      TableName: CONTRACTORS_TABLE,
      Key: { id: contractorId },
      UpdateExpression: 'SET #status = :status, revokedAt = :now, revokedBy = :admin',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'revoked',
        ':now': Date.now(),
        ':admin': adminUser.id
      }
    }));

    // Log revocation
    await logAudit({
      action: 'CONTRACTOR_REVOKED',
      userId: adminUser.id,
      resource: contractorId,
      details: {
        contractorEmail: contractor.email,
        company: contractor.company,
        wasActive: contractor.status === 'active',
        accessCount: contractor.accessCount
      }
    });

    return response(200, {
      success: true,
      message: `Access revoked for ${contractor.email}`,
      contractor: {
        id: contractorId,
        email: contractor.email,
        name: contractor.name,
        accessCount: contractor.accessCount,
        lastAccess: contractor.lastAccess ? new Date(contractor.lastAccess).toISOString() : null
      }
    });
  } catch (error) {
    console.error('Error revoking access:', error);
    throw error;
  }
}

/**
 * Send invitation email to contractor
 */
async function sendInvitationEmail(params) {
  const { email, name, accessUrl, expirationDays, reason, invitedBy } = params;

  const emailBody = `
Hello ${name},

You have been granted temporary access to Candlefish.ai's Employee Setup Platform.

Access Details:
- Reason: ${reason}
- Valid for: ${expirationDays} days
- Invited by: ${invitedBy}

To access the platform, please click the secure link below:
${accessUrl}

This link will expire in ${expirationDays} days. Please save this link as it cannot be retrieved later.

Security Notes:
- Do not share this link with anyone
- Your access is logged and monitored
- You have read-only access to specific resources

If you have any questions, please contact ${invitedBy}.

Best regards,
Candlefish.ai Security Team
  `.trim();

  try {
    await sesClient.send(new SendEmailCommand({
      Source: process.env.FROM_EMAIL || 'noreply@candlefish.ai',
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: `Temporary Access Granted - Candlefish.ai Platform`
        },
        Body: {
          Text: {
            Data: emailBody
          }
        }
      }
    }));
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't fail the invitation if email fails
  }
}

/**
 * Generate JWT for contractor using secure JWT library
 */
async function generateContractorJWT(contractor) {
  // Use the secure JWT generation from security.js
  // Don't include exp in payload - let generateJwtToken handle it
  const payload = {
    ...contractor,
    // Remove exp from here as generateJwtToken handles expiration
  };

  // Calculate expiration time
  const expiresIn = Math.floor((contractor.expiresAt - Date.now()) / 1000);

  // This will use the JWT secret from AWS Secrets Manager
  return await generateJwtToken(payload, `${expiresIn}s`);
}
