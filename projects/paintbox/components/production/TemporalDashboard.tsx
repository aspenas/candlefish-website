import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/Button';

interface TemporalConnection {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  address: string;
  namespace: string;
}

interface TemporalWorkflow {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
}

export const TemporalDashboard: React.FC = () => {
  const [connections, setConnections] = React.useState<TemporalConnection[]>([
    {
      id: '1',
      name: 'Production',
      status: 'connected',
      address: 'temporal.cloud:7233',
      namespace: 'default',
    },
  ]);

  const [workflows, setWorkflows] = React.useState<TemporalWorkflow[]>([
    {
      id: '1',
      name: 'agent-workflow',
      status: 'running',
      startTime: new Date(),
    },
  ]);

  return (
    <div className="space-y-6" role="region" aria-label="Temporal Dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Temporal Dashboard</h1>
        <p className="text-gray-600">Manage Temporal Cloud connections and workflows</p>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Connections</h2>
          <Button aria-label="Add new connection">Add Connection</Button>
        </div>

        <div className="space-y-3">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <h3 className="font-medium">{connection.name}</h3>
                <p className="text-sm text-gray-600">{connection.address}</p>
                <p className="text-sm text-gray-600">Namespace: {connection.namespace}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={connection.status === 'connected' ? 'default' : 'destructive'}
                  aria-label={`Connection status: ${connection.status}`}
                >
                  {connection.status}
                </Badge>
                <Button variant="outline" size="sm">Test</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Active Workflows</h2>

        <div className="space-y-3">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <h3 className="font-medium">{workflow.name}</h3>
                <p className="text-sm text-gray-600">
                  Started: {workflow.startTime.toLocaleString()}
                </p>
              </div>
              <Badge
                variant={
                  workflow.status === 'running' ? 'default' :
                  workflow.status === 'completed' ? 'secondary' :
                  'destructive'
                }
                aria-label={`Workflow status: ${workflow.status}`}
              >
                {workflow.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Live region for status updates */}
      <div role="status" aria-live="polite" className="sr-only">
        {/* Status updates will be announced here */}
      </div>
    </div>
  );
};
