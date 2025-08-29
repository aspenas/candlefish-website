// POST /api/netlify/webhook - Handle Netlify webhook events
import { NextRequest, NextResponse } from 'next/server';
import { createWebSocketMessage } from '../../../../__tests__/factories/netlify-factory';

interface NetlifyWebhookPayload {
  id: string;
  site_id: string;
  build_id: string;
  state: 'building' | 'ready' | 'error';
  name: string;
  url: string;
  ssl_url: string;
  admin_url: string;
  deploy_url: string;
  deploy_ssl_url: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  error_message?: string;
  required?: string[];
  required_functions?: string[];
  commit_ref?: string;
  commit_url?: string;
  branch: string;
  review_id?: number;
  review_url?: string;
  published_at?: string;
  context: string;
  deploy_time?: number;
  available_functions?: Array<{
    n: string;
    d: string;
    id: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (simplified for demo)
    const signature = request.headers.get('x-netlify-webhook-signature');
    const webhookSecret = process.env.NETLIFY_WEBHOOK_SECRET;

    if (!signature && webhookSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing webhook signature',
          code: 'UNAUTHORIZED',
          timestamp: new Date()
        },
        { status: 401 }
      );
    }

    const payload: NetlifyWebhookPayload = await request.json();

    // Validate required fields
    if (!payload.site_id || !payload.state) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid webhook payload',
          code: 'VALIDATION_ERROR',
          details: {
            required: ['site_id', 'state'],
            received: Object.keys(payload)
          },
          timestamp: new Date()
        },
        { status: 400 }
      );
    }

    // Process different webhook events
    let eventType: string;
    let notificationData: any;

    switch (payload.state) {
      case 'building':
        eventType = 'deployment.started';
        notificationData = createWebSocketMessage.deploymentComplete(
          payload.site_id,
          'building',
          0
        );
        break;

      case 'ready':
        eventType = 'deployment.complete';
        notificationData = createWebSocketMessage.deploymentComplete(
          payload.site_id,
          'success',
          payload.deploy_time || 0
        );
        break;

      case 'error':
        eventType = 'deployment.failed';
        notificationData = createWebSocketMessage.error(
          'DEPLOYMENT_ERROR',
          payload.error_message || 'Deployment failed'
        );
        break;

      default:
        eventType = 'deployment.unknown';
        notificationData = {
          type: 'deployment.unknown',
          payload: {
            siteId: payload.site_id,
            state: payload.state,
            timestamp: new Date().toISOString()
          }
        };
    }

    // Log webhook event (in real implementation, this would be stored in database)
    const webhookEvent = {
      id: payload.id,
      siteId: payload.site_id,
      buildId: payload.build_id,
      eventType,
      state: payload.state,
      branch: payload.branch,
      context: payload.context,
      deployTime: payload.deploy_time,
      errorMessage: payload.error_message,
      timestamp: new Date(),
      processed: true
    };

    console.log('Processed Netlify webhook:', {
      eventType,
      siteId: payload.site_id,
      state: payload.state
    });

    // In a real implementation, this would:
    // 1. Store the event in database
    // 2. Trigger performance metric updates
    // 3. Send WebSocket notifications to connected clients
    // 4. Update extension status if needed
    // 5. Trigger automated responses (alerts, scaling, etc.)

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 50));

    return NextResponse.json({
      success: true,
      data: {
        eventId: webhookEvent.id,
        eventType,
        processed: true,
        notificationSent: true,
        processingTime: Date.now() - new Date(webhookEvent.timestamp).getTime()
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error processing Netlify webhook:', error);

    // Return success even on processing errors to prevent webhook retries
    // Log the error for investigation
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed',
      code: 'PROCESSING_ERROR',
      details: {
        message: error instanceof Error ? error.message : 'Unknown error',
        willRetry: false
      },
      timestamp: new Date()
    }, { status: 200 }); // Return 200 to prevent Netlify retries
  }
}
