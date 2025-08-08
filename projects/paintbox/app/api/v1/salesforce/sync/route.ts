import { NextRequest, NextResponse } from 'next/server';
import { salesforceService } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';

// POST /api/v1/salesforce/sync - Trigger manual sync
export async function POST(request: NextRequest) {
  try {
    logger.info('Manual Salesforce sync triggered');

    const result = await salesforceService.performBatchSync();

    return NextResponse.json({
      success: result.success,
      data: result,
      message: result.success ? 'Sync completed successfully' : 'Sync completed with errors',
    });

  } catch (error) {
    logger.error('Failed to perform sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform sync',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/v1/salesforce/sync - Get sync status
export async function GET(request: NextRequest) {
  try {
    const isConnected = await salesforceService.testConnection();

    // Get last sync time from cache
    const cache = salesforceService['cache']; // Access private cache property
    let lastSync: string | null = null;

    try {
      lastSync = await cache.get('salesforce:lastSync');
    } catch (error) {
      logger.warn('Failed to get last sync time:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: isConnected,
        lastSync: lastSync ? new Date(lastSync) : null,
        syncInterval: '5 minutes',
      },
    });

  } catch (error) {
    logger.error('Failed to get sync status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sync status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
