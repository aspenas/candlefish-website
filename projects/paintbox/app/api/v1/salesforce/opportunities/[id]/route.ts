import { NextRequest, NextResponse } from 'next/server';
import { salesforceService } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

const OpportunityUpdateSchema = z.object({
  Name: z.string().optional(),
  AccountId: z.string().optional(),
  ContactId: z.string().optional(),
  Amount: z.number().optional(),
  StageName: z.string().optional(),
  CloseDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
  Probability: z.number().min(0).max(100).optional(),
  Type: z.string().optional(),
  LeadSource: z.string().optional(),
  Description: z.string().optional(),
  NextStep: z.string().optional(),
  CampaignId: z.string().optional(),
});

// GET /api/v1/salesforce/opportunities/[id] - Get opportunity by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const opportunity = await salesforceService.getOpportunity(params.id);

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: opportunity,
    });

  } catch (error) {
    logger.error('Failed to get opportunity:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get opportunity',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/salesforce/opportunities/[id] - Update opportunity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();

    const validation = OpportunityUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid opportunity data', details: validation.error.issues },
        { status: 400 }
      );
    }

    await salesforceService.updateOpportunity(params.id, validation.data);

    return NextResponse.json({
      success: true,
      message: 'Opportunity updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update opportunity:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update opportunity',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/salesforce/opportunities/[id] - Delete opportunity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await salesforceService.deleteOpportunity(params.id);

    return NextResponse.json({
      success: true,
      message: 'Opportunity deleted successfully',
    });

  } catch (error) {
    logger.error('Failed to delete opportunity:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete opportunity',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
