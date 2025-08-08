import { NextRequest, NextResponse } from 'next/server';
import { salesforceService, SalesforceOpportunity } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

const OpportunityCreateSchema = z.object({
  Name: z.string().min(1),
  AccountId: z.string().optional(),
  ContactId: z.string().optional(),
  Amount: z.number().optional(),
  StageName: z.string().min(1),
  CloseDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  Probability: z.number().min(0).max(100).optional(),
  Type: z.string().optional(),
  LeadSource: z.string().optional(),
  Description: z.string().optional(),
  NextStep: z.string().optional(),
  CampaignId: z.string().optional(),
});

const OpportunityUpdateSchema = OpportunityCreateSchema.partial();

// GET /api/v1/salesforce/opportunities - Get all opportunities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lastModified = searchParams.get('lastModified');

    let lastModifiedDate: Date | undefined;
    if (lastModified) {
      lastModifiedDate = new Date(lastModified);
      if (isNaN(lastModifiedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid lastModified date format' },
          { status: 400 }
        );
      }
    }

    const opportunities = await salesforceService.getAllOpportunities(lastModifiedDate);

    return NextResponse.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
    });

  } catch (error) {
    logger.error('Failed to get opportunities:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get opportunities',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/salesforce/opportunities - Create opportunity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = OpportunityCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid opportunity data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const opportunityId = await salesforceService.createOpportunity(validation.data);

    return NextResponse.json({
      success: true,
      data: { id: opportunityId },
      message: 'Opportunity created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create opportunity:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create opportunity',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/salesforce/opportunities - Bulk update opportunities
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
        const validation = OpportunityUpdateSchema.safeParse(update.data);
        if (!validation.success) {
          results.push({
            id: update.id,
            success: false,
            error: 'Invalid data',
            details: validation.error.issues,
          });
          continue;
        }

        await salesforceService.updateOpportunity(update.id, validation.data);
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
    logger.error('Failed to bulk update opportunities:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk update opportunities',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
