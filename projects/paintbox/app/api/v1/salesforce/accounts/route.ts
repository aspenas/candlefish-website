import { NextRequest, NextResponse } from 'next/server';
import { salesforceService, SalesforceAccount } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

const AccountSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(100).default(10),
});

const AccountCreateSchema = z.object({
  Name: z.string().min(1),
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

const AccountUpdateSchema = AccountCreateSchema.partial();

// GET /api/v1/salesforce/accounts - Search accounts
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

    const validation = AccountSearchSchema.safeParse({ query, limit });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.issues },
        { status: 400 }
      );
    }

    const accounts = await salesforceService.searchAccounts(query, limit);

    return NextResponse.json({
      success: true,
      data: accounts,
      count: accounts.length,
    });

  } catch (error) {
    logger.error('Failed to search accounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search accounts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/salesforce/accounts - Create account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = AccountCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid account data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const accountId = await salesforceService.createAccount(validation.data);

    return NextResponse.json({
      success: true,
      data: { id: accountId },
      message: 'Account created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create account:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create account',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/salesforce/accounts - Bulk update accounts
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
        const validation = AccountUpdateSchema.safeParse(update.data);
        if (!validation.success) {
          results.push({
            id: update.id,
            success: false,
            error: 'Invalid data',
            details: validation.error.issues,
          });
          continue;
        }

        await salesforceService.updateAccount(update.id, validation.data);
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
    logger.error('Failed to bulk update accounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk update accounts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
