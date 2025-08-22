import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    // In production, this would fetch from database
    // For now, return a mock estimate
    const estimate = {
      id,
      clientInfo: {},
      measurements: { exterior: {}, interior: {} },
      pricing: {},
      stepsCompleted: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced'
    };

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Error fetching estimate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimate' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const updates = await request.json();

    // In production, this would update in database
    const estimate = {
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced'
    };

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Error updating estimate:', error);
    return NextResponse.json(
      { error: 'Failed to update estimate' },
      { status: 500 }
    );
  }
}
