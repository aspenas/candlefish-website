import { NextRequest, NextResponse } from 'next/server';
import { salesforceService, PaintboxEstimate } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

const EstimateCreateSchema = z.object({
  Name: z.string().min(1),
  Contact__c: z.string().optional(),
  Account__c: z.string().optional(),
  Opportunity__c: z.string().optional(),
  Total_Amount__c: z.number().optional(),
  Exterior_Amount__c: z.number().optional(),
  Interior_Amount__c: z.number().optional(),
  Materials_Cost__c: z.number().optional(),
  Labor_Cost__c: z.number().optional(),
  Status__c: z.enum(['Draft', 'Pending', 'Approved', 'Rejected', 'Completed']),
  Estimate_Date__c: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  Valid_Until__c: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
  Notes__c: z.string().optional(),
  Excel_Data__c: z.string().optional(),
  Square_Footage__c: z.number().optional(),
  Rooms_Count__c: z.number().optional(),
  Paint_Quality__c: z.enum(['Good', 'Better', 'Best']).optional(),
});

const EstimateUpdateSchema = EstimateCreateSchema.partial();

// GET /api/v1/salesforce/estimates - Get all estimates
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

    const estimates = await salesforceService.getAllPaintboxEstimates(lastModifiedDate);

    return NextResponse.json({
      success: true,
      data: estimates,
      count: estimates.length,
    });

  } catch (error) {
    logger.error('Failed to get estimates:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get estimates',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/salesforce/estimates - Create estimate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = EstimateCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid estimate data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const estimateId = await salesforceService.createPaintboxEstimate(validation.data);

    return NextResponse.json({
      success: true,
      data: { id: estimateId },
      message: 'Estimate created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create estimate:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create estimate',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/salesforce/estimates - Bulk update estimates
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
        const validation = EstimateUpdateSchema.safeParse(update.data);
        if (!validation.success) {
          results.push({
            id: update.id,
            success: false,
            error: 'Invalid data',
            details: validation.error.issues,
          });
          continue;
        }

        await salesforceService.updatePaintboxEstimate(update.id, validation.data);
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
    logger.error('Failed to bulk update estimates:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk update estimates',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
