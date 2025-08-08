import { NextRequest, NextResponse } from 'next/server';
import { salesforceService, SalesforceContact } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

// Validation schemas
const ContactSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(100).default(10),
});

const ContactCreateSchema = z.object({
  FirstName: z.string().optional(),
  LastName: z.string().min(1),
  Email: z.string().email().optional(),
  Phone: z.string().optional(),
  MobilePhone: z.string().optional(),
  AccountId: z.string().optional(),
  MailingStreet: z.string().optional(),
  MailingCity: z.string().optional(),
  MailingState: z.string().optional(),
  MailingPostalCode: z.string().optional(),
  MailingCountry: z.string().optional(),
  Title: z.string().optional(),
  Department: z.string().optional(),
  LeadSource: z.string().optional(),
});

const ContactUpdateSchema = ContactCreateSchema.partial();

// GET /api/v1/salesforce/contacts - Search contacts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const validation = ContactSearchSchema.safeParse({ query, limit });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.issues },
        { status: 400 }
      );
    }

    const contacts = await salesforceService.searchContacts(query, limit);

    return NextResponse.json({
      success: true,
      data: contacts,
      count: contacts.length,
    });

  } catch (error) {
    logger.error('Failed to search contacts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search contacts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/salesforce/contacts - Create contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = ContactCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid contact data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const contactId = await salesforceService.createContact(validation.data);

    return NextResponse.json({
      success: true,
      data: { id: contactId },
      message: 'Contact created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create contact:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create contact',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/salesforce/contacts - Bulk update contacts
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body; // Array of { id, data }

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      );
    }

    const results = [];
    for (const update of updates) {
      try {
        const validation = ContactUpdateSchema.safeParse(update.data);
        if (!validation.success) {
          results.push({
            id: update.id,
            success: false,
            error: 'Invalid data',
            details: validation.error.issues,
          });
          continue;
        }

        await salesforceService.updateContact(update.id, validation.data);
        results.push({
          id: update.id,
          success: true,
        });
      } catch (error) {
        results.push({
          id: update.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      data: results,
      summary: {
        total: results.length,
        successful,
        failed,
      },
    });

  } catch (error) {
    logger.error('Failed to bulk update contacts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk update contacts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
