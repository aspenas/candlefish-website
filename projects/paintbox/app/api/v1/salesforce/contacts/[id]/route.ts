import { NextRequest, NextResponse } from 'next/server';
import { salesforceService } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

const ContactUpdateSchema = z.object({
  FirstName: z.string().optional(),
  LastName: z.string().optional(),
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

// GET /api/v1/salesforce/contacts/[id] - Get contact by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const contact = await salesforceService.getContact(params.id);

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contact,
    });

  } catch (error) {
    logger.error('Failed to get contact:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get contact',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/salesforce/contacts/[id] - Update contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();

    const validation = ContactUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid contact data', details: validation.error.issues },
        { status: 400 }
      );
    }

    await salesforceService.updateContact(params.id, validation.data);

    return NextResponse.json({
      success: true,
      message: 'Contact updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update contact:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update contact',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/salesforce/contacts/[id] - Delete contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await salesforceService.deleteContact(params.id);

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    });

  } catch (error) {
    logger.error('Failed to delete contact:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete contact',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
