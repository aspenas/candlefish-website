/**
 * Company Cam Photo Annotations API
 * GET /api/v1/companycam/photos/[photoId]/annotations - List photo annotations
 * POST /api/v1/companycam/photos/[photoId]/annotations - Add annotation
 */

import { NextRequest, NextResponse } from 'next/server';
import { companyCamApi } from '@/lib/services/companycam-api';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

const CreateAnnotationSchema = z.object({
  text: z.string().min(1, 'Annotation text is required'),
  x: z.number().min(0, 'X coordinate must be >= 0'),
  y: z.number().min(0, 'Y coordinate must be >= 0'),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const params = await context.params;
    const { photoId } = await params;
    logger.info('GET /api/v1/companycam/photos/:photoId/annotations', { photoId });

    // For now, return empty annotations since we don't have a direct method
    // In a full implementation, we'd fetch the photo and return its annotations
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
      photoId,
    });
  } catch (error) {
    logger.error('Failed to fetch CompanyCam photo annotations', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch annotations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const params = await context.params;
    const { photoId } = await params;
    logger.info('POST /api/v1/companycam/photos/:photoId/annotations', { photoId });

    const body = await request.json();
    const validatedData = CreateAnnotationSchema.parse(body);

    const annotation = await companyCamApi.addAnnotation(photoId, validatedData);

    logger.info('CompanyCam photo annotation added', { photoId, annotationId: annotation.id });

    return NextResponse.json({
      success: true,
      data: annotation,
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to add CompanyCam photo annotation', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add annotation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
