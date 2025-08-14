import { NextRequest, NextResponse } from 'next/server';
import { salesforceService } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

const AccountUpdateSchema = z.object({
  Name: z.string().optional(),
  Type: z.string().optional(),
  Industry: z.string().optional(),
  Phone: z.string().optional(),
  Website: z.string().url().optional(),
  BillingStreet: z.string().optional(),
  BillingCity: z.string().optional(),
  BillingState: z.string().optional(),
  BillingPostalCode: z.string().optional(),
  BillingCountry: z.string().optional(),
  ShippingStreet: z.string().optional(),
  ShippingCity: z.string().optional(),
  ShippingState: z.string().optional(),
  ShippingPostalCode: z.string().optional(),
  ShippingCountry: z.string().optional(),
  Description: z.string().optional(),
  NumberOfEmployees: z.number().optional(),
  AnnualRevenue: z.number().optional(),
  ParentId: z.string().optional(),
});

// GET /api/v1/salesforce/accounts/[id] - Get account by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await salesforceService.getAccount(params.id);

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: account,
    });

  } catch (error) {
    logger.error('Failed to get account:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get account',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/salesforce/accounts/[id] - Update account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();

    const validation = AccountUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid account data', details: validation.error.issues },
        { status: 400 }
      );
    }

    await salesforceService.updateAccount(params.id, validation.data);

    return NextResponse.json({
      success: true,
      message: 'Account updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update account:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update account',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/salesforce/accounts/[id] - Delete account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await salesforceService.deleteAccount(params.id);

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });

  } catch (error) {
    logger.error('Failed to delete account:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete account',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
