/**
 * Company Cam Sync API
 * POST /api/v1/companycam/sync - Sync pending uploads
 * GET /api/v1/companycam/sync - Get sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import { companyCamApi } from '@/lib/services/companycam-api';
import { logger } from '@/lib/logging/simple-logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/v1/companycam/sync');

    const health = await companyCamApi.healthCheck();

    return NextResponse.json({
      success: true,
      data: {
        status: health.status,
        details: health.details,
        lastSync: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get CompanyCam sync status', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sync status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/v1/companycam/sync');

    const result = await companyCamApi.syncPendingUploads();

    logger.info('CompanyCam sync completed', result);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Sync completed: ${result.success} successful, ${result.failed} failed`,
    });
  } catch (error) {
    logger.error('Failed to sync CompanyCam uploads', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync uploads',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
