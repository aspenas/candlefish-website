import { NextRequest, NextResponse } from 'next/server';
import { salesforceService } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';
import { getSecretsManager } from '@/lib/services/secrets-manager';
import crypto from 'crypto';

// Salesforce webhook payload interface
interface SalesforceWebhookPayload {
  sobject: {
    Id: string;
    attributes: {
      type: string;
      url: string;
    };
    [key: string]: any;
  };
  event: {
    type: 'created' | 'updated' | 'deleted' | 'undeleted';
    createdDate: string;
    replayId: number;
  };
  schema: string;
}

interface WebhookEvent {
  id: string;
  type: 'Contact' | 'Account' | 'Opportunity' | 'PaintboxEstimate__c';
  action: 'created' | 'updated' | 'deleted' | 'undeleted';
  data: any;
  timestamp: Date;
}

// Webhook signature verification
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Failed to verify webhook signature:', error);
    return false;
  }
}

// POST /api/webhooks/salesforce - Handle Salesforce webhooks
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-salesforce-signature') ||
                     request.headers.get('x-hub-signature-256');

    if (!signature) {
      logger.warn('Webhook received without signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    const rawPayload = await request.text();

    // Verify webhook signature
    const secretsManager = getSecretsManager();
    const secrets = await secretsManager.getSecrets();
    const webhookSecret = secrets.salesforce?.webhookSecret;

    if (!webhookSecret) {
      logger.error('Webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    const isValid = await verifyWebhookSignature(rawPayload, signature, webhookSecret);
    if (!isValid) {
      logger.warn('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let payload: SalesforceWebhookPayload;
    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      logger.error('Invalid JSON payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Process the webhook event
    const event = await processWebhookEvent(payload);

    logger.info('Webhook processed successfully:', {
      eventId: event.id,
      type: event.type,
      action: event.action,
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      eventId: event.id,
    });

  } catch (error) {
    logger.error('Failed to process webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function processWebhookEvent(payload: SalesforceWebhookPayload): Promise<WebhookEvent> {
  const { sobject, event } = payload;
  const objectType = sobject.attributes.type;
  const eventId = `${sobject.Id}_${event.replayId}`;

  const webhookEvent: WebhookEvent = {
    id: eventId,
    type: objectType as any,
    action: event.type,
    data: sobject,
    timestamp: new Date(event.createdDate),
  };

  // Handle different object types and actions
  switch (objectType) {
    case 'Contact':
      await handleContactWebhook(webhookEvent);
      break;
    case 'Account':
      await handleAccountWebhook(webhookEvent);
      break;
    case 'Opportunity':
      await handleOpportunityWebhook(webhookEvent);
      break;
    case 'PaintboxEstimate__c':
      await handleEstimateWebhook(webhookEvent);
      break;
    default:
      logger.warn('Unhandled object type:', objectType);
  }

  // Store webhook event for audit/replay
  await storeWebhookEvent(webhookEvent);

  return webhookEvent;
}

async function handleContactWebhook(event: WebhookEvent): Promise<void> {
  const { action, data } = event;

  try {
    switch (action) {
      case 'created':
      case 'updated':
        // Clear relevant caches
        await salesforceService['clearContactCaches']();
        logger.info(`Contact ${action}:`, { id: data.Id, name: data.Name });
        break;
      case 'deleted':
        // Clear caches and handle cleanup
        await salesforceService['clearContactCaches']();
        logger.info('Contact deleted:', { id: data.Id });
        break;
      case 'undeleted':
        // Clear caches to refresh data
        await salesforceService['clearContactCaches']();
        logger.info('Contact undeleted:', { id: data.Id });
        break;
    }
  } catch (error) {
    logger.error('Failed to handle contact webhook:', { event, error });
    throw error;
  }
}

async function handleAccountWebhook(event: WebhookEvent): Promise<void> {
  const { action, data } = event;

  try {
    switch (action) {
      case 'created':
      case 'updated':
        await salesforceService['clearAccountCaches']();
        logger.info(`Account ${action}:`, { id: data.Id, name: data.Name });
        break;
      case 'deleted':
        await salesforceService['clearAccountCaches']();
        logger.info('Account deleted:', { id: data.Id });
        break;
      case 'undeleted':
        await salesforceService['clearAccountCaches']();
        logger.info('Account undeleted:', { id: data.Id });
        break;
    }
  } catch (error) {
    logger.error('Failed to handle account webhook:', { event, error });
    throw error;
  }
}

async function handleOpportunityWebhook(event: WebhookEvent): Promise<void> {
  const { action, data } = event;

  try {
    switch (action) {
      case 'created':
      case 'updated':
        await salesforceService['clearOpportunityCaches']();
        logger.info(`Opportunity ${action}:`, {
          id: data.Id,
          name: data.Name,
          stage: data.StageName,
          amount: data.Amount
        });
        break;
      case 'deleted':
        await salesforceService['clearOpportunityCaches']();
        logger.info('Opportunity deleted:', { id: data.Id });
        break;
      case 'undeleted':
        await salesforceService['clearOpportunityCaches']();
        logger.info('Opportunity undeleted:', { id: data.Id });
        break;
    }
  } catch (error) {
    logger.error('Failed to handle opportunity webhook:', { event, error });
    throw error;
  }
}

async function handleEstimateWebhook(event: WebhookEvent): Promise<void> {
  const { action, data } = event;

  try {
    switch (action) {
      case 'created':
      case 'updated':
        await salesforceService['clearEstimateCaches']();
        logger.info(`Estimate ${action}:`, {
          id: data.Id,
          name: data.Name,
          status: data.Status__c,
          amount: data.Total_Amount__c
        });

        // Trigger real-time update to connected clients
        await notifyClientsOfEstimateChange(data);
        break;
      case 'deleted':
        await salesforceService['clearEstimateCaches']();
        logger.info('Estimate deleted:', { id: data.Id });
        break;
      case 'undeleted':
        await salesforceService['clearEstimateCaches']();
        logger.info('Estimate undeleted:', { id: data.Id });
        break;
    }
  } catch (error) {
    logger.error('Failed to handle estimate webhook:', { event, error });
    throw error;
  }
}

async function notifyClientsOfEstimateChange(estimateData: any): Promise<void> {
  // TODO: Implement WebSocket notification to connected clients
  // This would integrate with the existing WebSocket service
  logger.info('TODO: Notify clients of estimate change:', estimateData.Id);
}

async function storeWebhookEvent(event: WebhookEvent): Promise<void> {
  try {
    // Store in Redis for audit trail and potential replay
    const cache = salesforceService['cache'];
    const key = `webhook:${event.type}:${event.id}`;

    await cache.set(key, JSON.stringify(event), 24 * 60 * 60); // 24 hours

    // Also store in a list for recent events
    const recentKey = 'webhook:recent';
    await cache.lpush(recentKey, JSON.stringify({
      id: event.id,
      type: event.type,
      action: event.action,
      timestamp: event.timestamp,
    }));

    // Keep only the last 1000 recent events
    await cache.ltrim(recentKey, 0, 999);

  } catch (error) {
    logger.error('Failed to store webhook event:', { event, error });
    // Don't throw - webhook processing should continue even if storage fails
  }
}

// GET /api/webhooks/salesforce - Get recent webhook events (for debugging)
export async function GET(request: NextRequest) {
  try {
    const cache = salesforceService['cache'];
    const recentEvents = await cache.lrange('webhook:recent', 0, 49); // Last 50 events

    const events = recentEvents.map(event => JSON.parse(event));

    return NextResponse.json({
      success: true,
      data: events,
      count: events.length,
    });

  } catch (error) {
    logger.error('Failed to get recent webhook events:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get webhook events',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
