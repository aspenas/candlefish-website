/**
 * Salesforce Connection Test API
 * Test connection to Salesforce sandbox
 */

import { NextRequest, NextResponse } from 'next/server';
import { salesforceService } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('Testing Salesforce connection...');

    // Test connection
    const isConnected = await salesforceService.testConnection();

    if (isConnected) {
      logger.info('Salesforce connection test successful');

      // Try a simple query to verify access
      try {
        const testQuery = await salesforceService.searchContacts('test', 1);

        return NextResponse.json({
          success: true,
          connected: true,
          data: {
            message: 'Connected to Salesforce successfully',
            canQuery: true,
            testQueryResults: testQuery.length,
            timestamp: new Date().toISOString()
          }
        });
      } catch (queryError) {
        logger.warn('Connection successful but query failed:', queryError);

        return NextResponse.json({
          success: true,
          connected: true,
          data: {
            message: 'Connected to Salesforce but query permissions may be limited',
            canQuery: false,
            error: (queryError as Error).message,
            timestamp: new Date().toISOString()
          }
        });
      }
    } else {
      logger.error('Salesforce connection test failed');

      return NextResponse.json({
        success: false,
        connected: false,
        data: {
          message: 'Failed to connect to Salesforce',
          error: 'Connection test failed - check credentials and network',
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    logger.error('Salesforce test API error:', error);

    return NextResponse.json({
      success: false,
      connected: false,
      data: {
        message: 'Connection test failed with error',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
