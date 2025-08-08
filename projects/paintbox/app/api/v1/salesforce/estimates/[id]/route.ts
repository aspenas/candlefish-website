import { NextRequest, NextResponse } from 'next/server';
import { salesforceService } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';
import { z } from 'zod';

const EstimateUpdateSchema = z.object({
  Name: z.string().optional(),
  Contact__c: z.string().optional(),
  Account__c: z.string().optional(),
  Opportunity__c: z.string().optional(),
  Total_Amount__c: z.number().optional(),
  Exterior_Amount__c: z.number().optional(),
  Interior_Amount__c: z.number().optional(),
  Materials_Cost__c: z.number().optional(),
  Labor_Cost__c: z.number().optional(),
  Status__c: z.enum(['Draft', 'Pending', 'Approved', 'Rejected', 'Completed']).optional(),
  Estimate_Date__c: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
  Valid_Until__c: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
  Notes__c: z.string().optional(),
  Excel_Data__c: z.string().optional(),
  Square_Footage__c: z.number().optional(),
  Rooms_Count__c: z.number().optional(),
  Paint_Quality__c: z.enum(['Good', 'Better', 'Best']).optional(),
});

// GET /api/v1/salesforce/estimates/[id] - Get estimate by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const estimate = await salesforceService.getPaintboxEstimate(params.id);

    if (!estimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: estimate,
    });

  } catch (error) {
    logger.error('Failed to get estimate:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get estimate',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/salesforce/estimates/[id] - Update estimate
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const validation = EstimateUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid estimate data', details: validation.error.issues },
        { status: 400 }
      );
    }

    await salesforceService.updatePaintboxEstimate(params.id, validation.data);

    return NextResponse.json({
      success: true,
      message: 'Estimate updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update estimate:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update estimate',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/salesforce/estimates/[id] - Delete estimate
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await salesforceService.deletePaintboxEstimate(params.id);

    return NextResponse.json({
      success: true,
      message: 'Estimate deleted successfully',
    });

  } catch (error) {
    logger.error('Failed to delete estimate:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete estimate',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
