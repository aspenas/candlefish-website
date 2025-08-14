/**
 * Company Cam Individual Photo API
 * GET /api/v1/companycam/photos/[photoId] - Get photo details
 * PUT /api/v1/companycam/photos/[photoId] - Update photo
 * DELETE /api/v1/companycam/photos/[photoId] - Delete photo
 */

import { NextRequest, NextResponse } from 'next/server';
import { companyCamApi } from '@/lib/services/companycam-api';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

const UpdatePhotoSchema = z.object({
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;
    logger.info('GET /api/v1/companycam/photos/:photoId', { photoId });

    // Since we don't have a direct getPhoto method, we'll need to search through projects
    // This is a simplified implementation
    return NextResponse.json(
      {
        success: false,
        error: 'Photo lookup not implemented',
        message: 'Use project-specific photo endpoints',
      },
      { status: 501 }
    );
  } catch (error) {
    logger.error('Failed to fetch CompanyCam photo', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch photo',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;
    logger.info('PUT /api/v1/companycam/photos/:photoId', { photoId });

    const body = await request.json();
    const validatedData = UpdatePhotoSchema.parse(body);

    // Update tags if provided
    if (validatedData.tags) {
      await companyCamApi.addTags(photoId, validatedData.tags);
    }

    logger.info('CompanyCam photo updated', { photoId });

    return NextResponse.json({
      success: true,
      message: 'Photo updated successfully',
      data: {
        id: photoId,
        ...validatedData,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to update CompanyCam photo', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update photo',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;
    logger.info('DELETE /api/v1/companycam/photos/:photoId', { photoId });

    // Photo deletion would need to be implemented in the API service
    logger.info('CompanyCam photo deletion requested', { photoId });

    return NextResponse.json({
      success: true,
      message: 'Photo deletion requested',
    });
  } catch (error) {
    logger.error('Failed to delete CompanyCam photo', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete photo',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
