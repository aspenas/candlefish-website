/**
 * Company Cam Projects API
 * GET /api/v1/companycam/projects - List all projects
 * POST /api/v1/companycam/projects - Create a new project
 */

import { NextRequest, NextResponse } from 'next/server';
import { companyCamApi } from '@/lib/services/companycam-api';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  address: z.string().min(1, 'Address is required'),
  salesforceId: z.string().optional(),
  estimateId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/v1/companycam/projects');

    const { searchParams } = new URL(request.url);
    const useCache = searchParams.get('cache') !== 'false';

    const projects = await companyCamApi.getProjects(useCache);

    return NextResponse.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  } catch (error) {
    logger.error('Failed to fetch CompanyCam projects', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch projects',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/v1/companycam/projects');

    const body = await request.json();

    // Validate request body
    const validatedData = CreateProjectSchema.parse(body);

    const project = await companyCamApi.createProject(validatedData);

    logger.info('CompanyCam project created', { projectId: project.id });

    return NextResponse.json({
      success: true,
      data: project,
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create CompanyCam project', { error });

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
        error: 'Failed to create project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
