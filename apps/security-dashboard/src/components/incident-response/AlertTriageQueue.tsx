import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SecurityEvent } from '../../types/security';

interface AlertTriageQueueProps {
  events: SecurityEvent[];
  className?: string;
}

export const AlertTriageQueue: React.FC<AlertTriageQueueProps> = ({
  events,
  className = ''
}) => {
  const [selectedAlert, setSelectedAlert] = useState<SecurityEvent | null>(null);

  const pendingEvents = events.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL').slice(0, 10);

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className=\"text-lg font-semibold text-white mb-4\">Alert Triage Queue</h3>
      
      <div className=\"space-y-3\">
        {pendingEvents.map((event) => (
          <div key={event.id} className=\"p-3 bg-gray-800 rounded-lg border border-gray-700\">
            <div className=\"flex items-center justify-between mb-2\">
              <Badge className={`text-xs ${
                event.severity === 'CRITICAL' ? 'text-red-400 bg-red-500/10' : 'text-orange-400 bg-orange-500/10'
              }`}>
                {event.severity}
              </Badge>
              <div className=\"flex items-center space-x-2\">
                <Button size=\"sm\" variant=\"outline\">
                  <CheckCircle className=\"w-4 h-4 mr-1\" />
                  Accept
                </Button>
                <Button size=\"sm\" variant=\"outline\">
                  <XCircle className=\"w-4 h-4 mr-1\" />
                  Dismiss
                </Button>
              </div>
            </div>
            <h4 className=\"font-medium text-white mb-1\">{event.title}</h4>
            <p className=\"text-sm text-gray-300\">{event.description}</p>
            <div className=\"mt-2 text-xs text-gray-400\">
              <Clock className=\"w-3 h-3 inline mr-1\" />
              {new Date(event.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AlertTriageQueue;