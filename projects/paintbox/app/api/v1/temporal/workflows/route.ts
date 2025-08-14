import { NextRequest, NextResponse } from 'next/server';

// Mock Temporal service
const temporalService = {
  async listWorkflows() {
    return {
      workflows: [
        {
          id: 'wf-1',
          name: 'agent-workflow',
          status: 'running',
          startTime: new Date().toISOString(),
          taskQueue: 'agent-tasks'
        },
        {
          id: 'wf-2',
          name: 'data-processing',
          status: 'completed',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date().toISOString(),
          taskQueue: 'data-tasks'
        }
      ],
      total: 2
    };
  },

  async startWorkflow(name: string, args: any) {
    return {
      id: `wf-${Date.now()}`,
      name,
      status: 'running',
      startTime: new Date().toISOString(),
      taskQueue: args.taskQueue || 'default',
      args
    };
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const taskQueue = searchParams.get('taskQueue');

    const result = await temporalService.listWorkflows();

    // Filter if needed
    let workflows = result.workflows;
    if (status) {
      workflows = workflows.filter(w => w.status === status);
    }
    if (taskQueue) {
      workflows = workflows.filter(w => w.taskQueue === taskQueue);
    }

    return NextResponse.json({
      workflows,
      total: workflows.length
    });
  } catch (error) {
    console.error('Error listing workflows:', error);
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, args = {} } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Workflow name is required' },
        { status: 400 }
      );
    }

    const workflow = await temporalService.startWorkflow(name, args);

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error('Error starting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to start workflow' },
      { status: 500 }
    );
  }
}
