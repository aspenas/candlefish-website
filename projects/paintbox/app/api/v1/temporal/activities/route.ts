import { NextRequest, NextResponse } from 'next/server';

// Mock Temporal activities service
const temporalActivitiesService = {
  async listActivities() {
    return {
      activities: [
        {
          id: 'act-1',
          name: 'sendEmail',
          type: 'notification',
          status: 'completed',
          executionTime: 234,
          timestamp: new Date().toISOString()
        },
        {
          id: 'act-2',
          name: 'processData',
          type: 'processing',
          status: 'running',
          executionTime: null,
          timestamp: new Date().toISOString()
        }
      ],
      total: 2
    };
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const result = await temporalActivitiesService.listActivities();

    // Filter if needed
    let activities = result.activities;
    if (type) {
      activities = activities.filter(a => a.type === type);
    }
    if (status) {
      activities = activities.filter(a => a.status === status);
    }

    return NextResponse.json({
      activities,
      total: activities.length
    });
  } catch (error) {
    console.error('Error listing activities:', error);
    return NextResponse.json(
      { error: 'Failed to list activities' },
      { status: 500 }
    );
  }
}
