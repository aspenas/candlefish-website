/**
 * Salesforce Search API - Real-time search endpoint
 * Handles searching for contacts and accounts with phone number support
 */

import { NextRequest, NextResponse } from 'next/server';
import { salesforceService } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all'; // 'contacts', 'accounts', or 'all'
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query must be at least 2 characters long',
          data: { contacts: [], accounts: [] }
        },
        { status: 400 }
      );
    }

    // Initialize Salesforce service if needed
    await salesforceService.initialize();

    let contacts: any[] = [];
    let accounts: any[] = [];

    // Search based on type parameter
    if (type === 'contacts' || type === 'all') {
      try {
        contacts = await salesforceService.searchContacts(query, limit);
        logger.info(`Found ${contacts.length} contacts for query: ${query}`);
      } catch (error) {
        logger.error('Contact search failed:', error);
      }
    }

    if (type === 'accounts' || type === 'all') {
      try {
        accounts = await salesforceService.searchAccounts(query, limit);
        logger.info(`Found ${accounts.length} accounts for query: ${query}`);
      } catch (error) {
        logger.error('Account search failed:', error);
      }
    }

    // Return combined results
    return NextResponse.json({
      success: true,
      data: {
        contacts,
        accounts,
        total: contacts.length + accounts.length,
        query,
        type
      }
    });

  } catch (error) {
    logger.error('Salesforce search API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during search',
        data: { contacts: [], accounts: [] }
      },
      { status: 500 }
    );
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
