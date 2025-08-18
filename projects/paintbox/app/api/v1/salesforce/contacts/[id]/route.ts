/**
 * Salesforce Contact Detail API
 * Get individual contact details by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { salesforceService } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contact ID is required'
        },
        { status: 400 }
      );
    }

    // Initialize Salesforce service if needed
    await salesforceService.initialize();

    const contact = await salesforceService.getContact(id);

    if (!contact) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contact not found'
        },
        { status: 404 }
      );
    }

    logger.info(`Retrieved contact: ${contact.Name} (${id})`);

    return NextResponse.json({
      success: true,
      data: contact
    });

  } catch (error) {
    logger.error('Get contact API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
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
