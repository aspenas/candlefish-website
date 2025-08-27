import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import IncidentCard from './IncidentCard';
import { Incident, IncidentStatus } from '../../types/security';
import clsx from 'clsx';

interface IncidentColumnProps {
  title: string;
  status: IncidentStatus;
  incidents: Incident[];
  onIncidentClick?: (incident: Incident) => void;
  onStatusChange?: (incidentId: string, status: IncidentStatus) => void;
}

const statusColors: Record<IncidentStatus, string> = {
  [IncidentStatus.OPEN]: 'border-critical-500 bg-critical-950/10',
  [IncidentStatus.INVESTIGATING]: 'border-info-500 bg-info-950/10',
  [IncidentStatus.RESOLVED]: 'border-success-500 bg-success-950/10',
  [IncidentStatus.CLOSED]: 'border-dark-600 bg-dark-950/10',
};

const IncidentColumn: React.FC<IncidentColumnProps> = ({
  title,
  status,
  incidents,
  onIncidentClick,
  onStatusChange,
}) => {
  return (
    <div className={clsx(
      'flex-1 min-w-[320px] rounded-lg border-2 p-4',
      statusColors[status]
    )}>
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="px-2 py-1 text-xs font-medium bg-soc-elevated rounded-full text-muted">
          {incidents.length}
        </span>
      </div>

      {/* Incident Cards */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={clsx(
              'space-y-3 min-h-[100px] transition-colors',
              snapshot.isDraggingOver && 'bg-white/5 rounded-lg'
            )}
          >
            {incidents.map((incident, index) => (
              <Draggable
                key={incident.id}
                draggableId={incident.id}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={provided.draggableProps.style}
                    className={clsx(
                      snapshot.isDragging && 'opacity-50 rotate-2'
                    )}
                  >
                    <IncidentCard
                      incident={incident}
                      onClick={() => onIncidentClick?.(incident)}
                      onStatusChange={(newStatus) => onStatusChange?.(incident.id, newStatus)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default IncidentColumn;