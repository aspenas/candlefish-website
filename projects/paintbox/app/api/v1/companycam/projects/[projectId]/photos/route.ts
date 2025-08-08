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
    const files = formData.getAll('photos') as File[];\n    const tags = formData.get('tags')?.toString().split(',').filter(Boolean) || [];\n    const description = formData.get('description')?.toString();\n    const autoTag = formData.get('autoTag') === 'true';\n\n    if (!files.length) {\n      return NextResponse.json(\n        {\n          success: false,\n          error: 'No photos provided',\n        },\n        { status: 400 }\n      );\n    }\n\n    // Upload each photo\n    const uploadedPhotos = [];\n    const errors = [];\n\n    for (const file of files) {\n      try {\n        const uploadedPhoto = await companyCamApi.uploadPhoto(projectId, file, {\n          tags,\n          description,\n          autoTag,\n        });\n        uploadedPhotos.push(uploadedPhoto);\n      } catch (error) {\n        logger.error('Failed to upload photo', { error, filename: file.name });\n        errors.push({\n          filename: file.name,\n          error: error instanceof Error ? error.message : 'Upload failed',\n        });\n      }\n    }\n\n    return NextResponse.json({\n      success: true,\n      data: uploadedPhotos,\n      uploaded: uploadedPhotos.length,\n      errors,\n    }, { status: 201 });\n  } catch (error) {\n    logger.error('Failed to upload CompanyCam photos', { error });\n    \n    return NextResponse.json(\n      {\n        success: false,\n        error: 'Failed to upload photos',\n        message: error instanceof Error ? error.message : 'Unknown error',\n      },\n      { status: 500 }\n    );\n  }\n}
