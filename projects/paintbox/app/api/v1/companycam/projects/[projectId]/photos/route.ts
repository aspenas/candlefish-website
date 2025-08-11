/**
 * Company Cam Photos API
 * GET /api/v1/companycam/projects/[projectId]/photos - List project photos
 * POST /api/v1/companycam/projects/[projectId]/photos - Upload photos
 */

import { NextRequest, NextResponse } from 'next/server';
import { companyCamApi } from '@/lib/services/companycam-api';
import { logger } from '@/lib/logging/simple-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    logger.info('GET /api/v1/companycam/projects/:projectId/photos', { projectId });

    // Get query parameters
    const tag = searchParams.get('tag');
    const category = searchParams.get('category');

    let photos = await companyCamApi.getPhotos(projectId);

    // Filter by tag if specified
    if (tag) {
      photos = photos.filter(photo => photo.tags.includes(tag));
    }

    // Categorize photos if requested
    let result: any = photos;
    if (category === 'true') {
      result = companyCamApi.categorizePhotos(photos);
    }

    return NextResponse.json({
      success: true,
      data: result,
      count: Array.isArray(result) ? result.length : Object.values(result).flat().length,
      projectId,
    });
  } catch (error) {
    logger.error('Failed to fetch CompanyCam photos', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch photos',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    logger.info('POST /api/v1/companycam/projects/:projectId/photos', { projectId });

    // Check if project exists
    const project = await companyCamApi.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];
    const tags = formData.get('tags')?.toString().split(',').filter(Boolean) || [];
    const description = formData.get('description')?.toString();
    const autoTag = formData.get('autoTag') === 'true';

    if (!files.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'No photos provided',
        },
        { status: 400 }
      );
    }

    // Upload each photo
    const uploadedPhotos = [];
    const errors = [];

    for (const file of files) {
      try {
        const uploadedPhoto = await companyCamApi.uploadPhoto(projectId, file, {
          tags,
          description,
          autoTag,
        });
        uploadedPhotos.push(uploadedPhoto);
      } catch (error) {
        logger.error('Failed to upload photo', { error, filename: file.name });
        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: uploadedPhotos,
      uploaded: uploadedPhotos.length,
      errors,
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to upload CompanyCam photos', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload photos',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
