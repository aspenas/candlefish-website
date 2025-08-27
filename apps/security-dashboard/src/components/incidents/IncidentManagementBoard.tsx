import React, { useState, useMemo } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useIncidents, useCreateIncident, useAssignIncident } from '../../hooks/useApi';
import { useDashboardStore } from '../../store/dashboardStore';
import { useNotificationStore } from '../../store/notificationStore';
import { 
  Incident, 
  IncidentStatus, 
  IncidentPriority, 
  Severity 
} from '../../types/security';
import IncidentColumn from './IncidentColumn';
import IncidentCard from './IncidentCard';
import CreateIncidentModal from './CreateIncidentModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';
import clsx from 'clsx';

interface IncidentManagementBoardProps {
  showCreateButton?: boolean;
}

const IncidentManagementBoard: React.FC<IncidentManagementBoardProps> = ({
  showCreateButton = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [draggedIncident, setDraggedIncident] = useState<Incident | null>(null);

  const { incidentFilter, setIncidentFilter } = useDashboardStore();
  const { addNotification } = useNotificationStore();

  // Fetch incidents
  const {
    data: incidentsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useIncidents(incidentFilter);

  // Mutations
  const createIncidentMutation = useCreateIncident({
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Incident Created',
        message: 'New incident has been created successfully',
      });
      setShowCreateModal(false);
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: error.message || 'Failed to create incident',
      });
    },
  });

  const assignIncidentMutation = useAssignIncident({
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Incident Assigned',
        message: 'Incident has been assigned successfully',
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Assignment Failed',
        message: error.message || 'Failed to assign incident',
      });
    },
  });

  // Filter and search incidents
  const filteredIncidents = useMemo(() => {
    if (!incidentsResponse?.data?.items) return [];
    
    let incidents = incidentsResponse.data.items;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      incidents = incidents.filter(incident => 
        incident.title.toLowerCase().includes(query) ||
        incident.description.toLowerCase().includes(query) ||
        (incident.assignedTo && incident.assignedTo.toLowerCase().includes(query))
      );
    }
    
    return incidents;
  }, [incidentsResponse?.data?.items, searchQuery]);

  // Group incidents by status
  const incidentsByStatus = useMemo(() => {
    const groups = {
      [IncidentStatus.OPEN]: [] as Incident[],
      [IncidentStatus.IN_PROGRESS]: [] as Incident[],
      [IncidentStatus.RESOLVED]: [] as Incident[],
      [IncidentStatus.CLOSED]: [] as Incident[],
    };
    
    filteredIncidents.forEach(incident => {
      groups[incident.status].push(incident);
    });
    
    // Sort by priority and creation date
    Object.values(groups).forEach(group => {
      group.sort((a, b) => {
        // Priority order: CRITICAL, HIGH, MEDIUM, LOW
        const priorityOrder = {
          [IncidentPriority.CRITICAL]: 0,
          [IncidentPriority.HIGH]: 1,
          [IncidentPriority.MEDIUM]: 2,
          [IncidentPriority.LOW]: 3,
        };
        
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
    
    return groups;
  }, [filteredIncidents]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: filteredIncidents.length,
      open: incidentsByStatus[IncidentStatus.OPEN].length,
      inProgress: incidentsByStatus[IncidentStatus.IN_PROGRESS].length,
      resolved: incidentsByStatus[IncidentStatus.RESOLVED].length,
      critical: filteredIncidents.filter(i => i.priority === IncidentPriority.CRITICAL).length,
    };
  }, [filteredIncidents, incidentsByStatus]);

  // Drag and drop handlers
  const handleDragStart = (incident: Incident) => {
    setDraggedIncident(incident);
  };

  const handleDragEnd = () => {
    setDraggedIncident(null);
  };

  const handleDrop = (targetStatus: IncidentStatus, incident: Incident) => {
    if (incident.status === targetStatus) return;
    
    // Here you would typically update the incident status
    // For now, we'll just show a notification
    addNotification({
      type: 'info',
      title: 'Status Update',
      message: `Incident "${incident.title}" moved to ${targetStatus}`,
    });
  };

  const handleCreateIncident = async (incidentData: Partial<Incident>) => {
    await createIncidentMutation.mutateAsync(incidentData);
  };

  const handleAssignIncident = async (incidentId: string, userId: string) => {
    await assignIncidentMutation.mutateAsync({ incidentId, userId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading incidents..." />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load incidents"
        message={error?.message || 'Unknown error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Incident Management</h2>
          <p className="text-soc-muted mt-1">
            {stats.total} incidents • {stats.critical} critical • {stats.open + stats.inProgress} active
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-soc-muted" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="soc-input pl-10 w-64"
            />
          </div>
          
          {/* Create Button */}
          {showCreateButton && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="soc-button-primary inline-flex items-center space-x-2 px-4 py-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="soc-card p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-info-950/20 rounded-lg">
              <UserGroupIcon className="w-5 h-5 text-info-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{stats.total}</div>
              <div className="text-sm text-info-400">Total</div>
            </div>
          </div>
        </div>
        
        <div className="soc-card p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-warning-950/20 rounded-lg">
              <div className="w-5 h-5 bg-warning-500 rounded-full"></div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{stats.open}</div>
              <div className="text-sm text-warning-400">Open</div>
            </div>
          </div>
        </div>
        
        <div className="soc-card p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-info-950/20 rounded-lg">
              <div className="w-5 h-5 bg-info-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{stats.inProgress}</div>
              <div className="text-sm text-info-400">In Progress</div>
            </div>
          </div>
        </div>
        
        <div className="soc-card p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success-950/20 rounded-lg">
              <div className="w-5 h-5 bg-success-500 rounded-full"></div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{stats.resolved}</div>
              <div className="text-sm text-success-400">Resolved</div>
            </div>
          </div>
        </div>
        
        <div className="soc-card p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-critical-950/20 rounded-lg">
              <div className="w-5 h-5 bg-critical-500 rounded-full animate-ping"></div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{stats.critical}</div>
              <div className="text-sm text-critical-400">Critical</div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Open Column */}
        <IncidentColumn
          title="Open"
          status={IncidentStatus.OPEN}
          incidents={incidentsByStatus[IncidentStatus.OPEN]}
          onDrop={(incident) => handleDrop(IncidentStatus.OPEN, incident)}
          draggedIncident={draggedIncident}
        >
          {incidentsByStatus[IncidentStatus.OPEN].map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onSelect={setSelectedIncident}
              onDragStart={() => handleDragStart(incident)}
              onDragEnd={handleDragEnd}
              onAssign={(userId) => handleAssignIncident(incident.id, userId)}
              isSelected={selectedIncident?.id === incident.id}
              isDragging={draggedIncident?.id === incident.id}
            />
          ))}
        </IncidentColumn>

        {/* In Progress Column */}
        <IncidentColumn
          title="In Progress"
          status={IncidentStatus.IN_PROGRESS}
          incidents={incidentsByStatus[IncidentStatus.IN_PROGRESS]}
          onDrop={(incident) => handleDrop(IncidentStatus.IN_PROGRESS, incident)}
          draggedIncident={draggedIncident}
        >
          {incidentsByStatus[IncidentStatus.IN_PROGRESS].map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onSelect={setSelectedIncident}
              onDragStart={() => handleDragStart(incident)}
              onDragEnd={handleDragEnd}
              onAssign={(userId) => handleAssignIncident(incident.id, userId)}
              isSelected={selectedIncident?.id === incident.id}
              isDragging={draggedIncident?.id === incident.id}
            />
          ))}
        </IncidentColumn>

        {/* Resolved Column */}
        <IncidentColumn
          title="Resolved"
          status={IncidentStatus.RESOLVED}
          incidents={incidentsByStatus[IncidentStatus.RESOLVED]}
          onDrop={(incident) => handleDrop(IncidentStatus.RESOLVED, incident)}
          draggedIncident={draggedIncident}
        >
          {incidentsByStatus[IncidentStatus.RESOLVED].map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onSelect={setSelectedIncident}
              onDragStart={() => handleDragStart(incident)}
              onDragEnd={handleDragEnd}
              onAssign={(userId) => handleAssignIncident(incident.id, userId)}
              isSelected={selectedIncident?.id === incident.id}
              isDragging={draggedIncident?.id === incident.id}
            />
          ))}
        </IncidentColumn>

        {/* Closed Column */}
        <IncidentColumn
          title="Closed"
          status={IncidentStatus.CLOSED}
          incidents={incidentsByStatus[IncidentStatus.CLOSED]}
          onDrop={(incident) => handleDrop(IncidentStatus.CLOSED, incident)}
          draggedIncident={draggedIncident}
        >
          {incidentsByStatus[IncidentStatus.CLOSED].map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onSelect={setSelectedIncident}
              onDragStart={() => handleDragStart(incident)}
              onDragEnd={handleDragEnd}
              onAssign={(userId) => handleAssignIncident(incident.id, userId)}
              isSelected={selectedIncident?.id === incident.id}
              isDragging={draggedIncident?.id === incident.id}
            />
          ))}
        </IncidentColumn>
      </div>

      {/* Create Incident Modal */}
      {showCreateModal && (
        <CreateIncidentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateIncident}
          isLoading={createIncidentMutation.isPending}
        />
      )}
    </div>
  );
};

export default IncidentManagementBoard;