/**
 * Company Cam Webhooks Handler
 * POST /api/v1/companycam/webhooks - Handle incoming webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { companyCamApi, WEBHOOK_EVENTS, type CompanyCamWebhookEvent } from '@/lib/services/companycam-api';
import { logger } from '@/lib/logging/simple-logger';
import { getCompanyCamToken } from '@/lib/services/secrets-manager';
import crypto from 'crypto';

// Webhook signature verification
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedSignature = `sha256=${computedSignature}`;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    logger.error('Failed to verify webhook signature', { error });
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/v1/companycam/webhooks');

    // Get webhook signature from headers
    const signature = request.headers.get('x-companycam-signature');
    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Get request body
    const payload = await request.text();

    // Verify webhook signature
    const webhookSecret = process.env.COMPANYCAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = await verifyWebhookSignature(payload, signature, webhookSecret);
      if (!isValid) {
        logger.warn('Invalid webhook signature received');
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Parse webhook event
    const event: CompanyCamWebhookEvent = JSON.parse(payload);

    logger.info('Processing CompanyCam webhook event', {
      eventType: event.event_type,
      projectId: event.project_id,
      photoId: event.photo_id,
      timestamp: event.timestamp
    });

    // Process webhook event
    await processWebhookEvent(event);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      eventType: event.event_type,
    });
  } catch (error) {
    logger.error('Failed to process CompanyCam webhook', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function processWebhookEvent(event: CompanyCamWebhookEvent): Promise<void> {
  try {
    switch (event.event_type) {
      case WEBHOOK_EVENTS.PHOTO_UPLOADED:
        await handlePhotoUploaded(event);
        break;

      case WEBHOOK_EVENTS.PROJECT_CREATED:
        await handleProjectCreated(event);
        break;

      case WEBHOOK_EVENTS.ANNOTATION_ADDED:
        await handleAnnotationAdded(event);
        break;

      case WEBHOOK_EVENTS.TAG_ADDED:
        await handleTagAdded(event);
        break;

      default:
        logger.warn('Unknown webhook event type', { eventType: event.event_type });
    }
  } catch (error) {
    logger.error('Failed to process webhook event', { event, error });
    throw error;
  }
}

async function handlePhotoUploaded(event: CompanyCamWebhookEvent): Promise<void> {
  const { project_id: projectId, photo_id: photoId, data } = event;

  logger.info('Processing photo uploaded event', { projectId, photoId });

  try {
    // Fetch the latest project data to get the new photo
    const project = await companyCamApi.getProject(projectId);
    if (project) {
      const photo = project.photos.find(p => p.id === photoId);
      if (photo) {
        // Auto-tag the photo if it doesn't have tags
        if (photo.tags.length === 0 && data.filename) {
          const autoTags = detectWoodworkTagsFromFilename(data.filename);
          if (autoTags.length > 0 && photoId) {
            await companyCamApi.addTags(photoId, autoTags);
            logger.info('Auto-tagged photo', { photoId, tags: autoTags });
          }
        }
      }
    }

    // TODO: Trigger any additional processing
    // - Generate thumbnails
    // - Run image analysis
    // - Update project status
    // - Notify team members

  } catch (error) {
    logger.error('Failed to handle photo uploaded event', { event, error });
  }
}

async function handleProjectCreated(event: CompanyCamWebhookEvent): Promise<void> {
  const { project_id: projectId, data } = event;

  logger.info('Processing project created event', { projectId });

  try {
    // Fetch the new project data
    const project = await companyCamApi.getProject(projectId);

    if (project) {
      // TODO: Integration with other systems
      // - Create corresponding records in Salesforce
      // - Set up project folder structure
      // - Initialize project tracking
      // - Send notifications to team
    }

  } catch (error) {
    logger.error('Failed to handle project created event', { event, error });
  }
}

async function handleAnnotationAdded(event: CompanyCamWebhookEvent): Promise<void> {
  const { project_id: projectId, photo_id: photoId, data } = event;

  logger.info('Processing annotation added event', { projectId, photoId });

  try {
    // TODO: Process annotation data
    // - Extract important information
    // - Update project notes
    // - Trigger follow-up actions
    // - Notify relevant team members

  } catch (error) {
    logger.error('Failed to handle annotation added event', { event, error });
  }
}

async function handleTagAdded(event: CompanyCamWebhookEvent): Promise<void> {
  const { project_id: projectId, photo_id: photoId, data } = event;

  logger.info('Processing tag added event', { projectId, photoId });

  try {
    const { tags } = data;

    // TODO: Process tag data
    // - Update project categorization
    // - Trigger automated workflows
    // - Update progress tracking
    // - Generate reports based on tags

  } catch (error) {
    logger.error('Failed to handle tag added event', { event, error });
  }
}

function detectWoodworkTagsFromFilename(filename: string): string[] {
  const content = filename.toLowerCase();
  const detectedTags: string[] = [];

  // Common woodwork patterns in filenames
  const patterns = {
    'trim': /trim|baseboard|crown|molding/,
    'door': /door|entry|french/,
    'cabinet': /cabinet|kitchen|bathroom/,
    'window': /window|sill|frame/,
    'stairs': /stair|railing|handrail/,
    'deck': /deck|fence|outdoor/,
    'before': /before|initial|start/,
    'after': /after|complete|finish/,
    'progress': /progress|during|work|wip/
  };

  Object.entries(patterns).forEach(([tag, pattern]) => {
    if (pattern.test(content)) {
      detectedTags.push(tag);
    }
  });

  return detectedTags;
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'CompanyCam webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
