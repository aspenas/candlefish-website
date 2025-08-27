import React from 'react';
import { Clock, User, FileText, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SecurityEvent } from '../../types/security';

interface InvestigationTimelineProps {
  case: any;
  events: SecurityEvent[];
  className?: string;
}

export const InvestigationTimeline: React.FC<InvestigationTimelineProps> = ({
  case: caseData,
  events,
  className = ''
}) => {
  return (
    <Card className={`p-6 ${className}`}>
      <h3 className=\"text-lg font-semibold text-white mb-4 flex items-center\">
        <Clock className=\"w-5 h-5 mr-2\" />
        Investigation Timeline
      </h3>
      
      <div className=\"space-y-4\">
        {caseData?.timeline?.map((entry: any, index: number) => (
          <div key={entry.id} className=\"flex items-start space-x-4\">
            <div className=\"flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center\">
              <User className=\"w-4 h-4 text-white\" />
            </div>
            <div className=\"flex-1 min-w-0\">
              <div className=\"flex items-center justify-between mb-1\">
                <p className=\"text-sm font-medium text-white\">{entry.action}</p>
                <p className=\"text-xs text-gray-400\">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              </div>
              <p className=\"text-sm text-gray-300\">{entry.description}</p>
              <p className=\"text-xs text-gray-400 mt-1\">by {entry.userName}</p>
            </div>
          </div>
        ))}
        
        {(!caseData?.timeline || caseData.timeline.length === 0) && (
          <div className=\"text-center py-8 text-gray-400\">
            <Clock className=\"w-8 h-8 mx-auto mb-2 opacity-50\" />
            <p>No timeline events available</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default InvestigationTimeline;