import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const estimate = await request.json();

    // Generate ID if not provided
    if (!estimate.id) {
      estimate.id = uuidv4();
      estimate.createdAt = new Date().toISOString();
    }
    estimate.updatedAt = new Date().toISOString();

    // In production, this would save to a database
    // For now, we'll just return the estimate with success status
    console.log('Saving estimate:', estimate);

    return NextResponse.json({
      ...estimate,
      syncStatus: 'synced',
      saved: true
    });
  } catch (error) {
    console.error('Error saving estimate:', error);
    return NextResponse.json(
      { error: 'Failed to save estimate' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    // In production, fetch from database
    return NextResponse.json({
      id,
      clientInfo: {},
      measurements: { exterior: {}, interior: {} },
      pricing: {},
      stepsCompleted: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced'
    });
  }

  return NextResponse.json({ estimates: [] });
}
