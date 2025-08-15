import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  PhotoIcon,
  PaintBrushIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { 
  BuildingOfficeIcon,
  HomeIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/solid';
import { useMeasurementStore, useElevationActions, useMeasurementActions } from '@/store/measurement';
import type { ElevationGroup, MeasurementEntry } from '@/store/measurement';
import type { ElevationType } from '@/types/graphql';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MeasurementCard } from './MeasurementCard';
import { clsx } from 'clsx';

interface ElevationPanelProps {
  elevationGroup: ElevationGroup;
  onAddMeasurement: (elevation: ElevationType) => void;
  onEditMeasurement: (measurementId: string) => void;
  isActive?: boolean;
  className?: string;
}

// Helper to get elevation icon and display name
const getElevationInfo = (elevation: ElevationType) => {
  switch (elevation) {
    case 'FRONT':
      return { icon: HomeIcon, name: 'Front Elevation', color: 'blue' };
    case 'REAR':
      return { icon: HomeIcon, name: 'Rear Elevation', color: 'green' };
    case 'LEFT':
      return { icon: ArrowLeftIcon, name: 'Left Elevation', color: 'purple' };
    case 'RIGHT':
      return { icon: ArrowRightIcon, name: 'Right Elevation', color: 'orange' };
    case 'DETACHED_GARAGE':
      return { icon: BuildingOfficeIcon, name: 'Detached Garage', color: 'gray' };
    case 'ATTACHED_GARAGE':
      return { icon: BuildingOfficeIcon, name: 'Attached Garage', color: 'gray' };
    default:
      return { icon: HomeIcon, name: elevation.replace('_', ' '), color: 'gray' };
  }
};

export const ElevationPanel: React.FC<ElevationPanelProps> = ({
  elevationGroup,
  onAddMeasurement,
  onEditMeasurement,
  isActive = false,
  className
}) => {
  const { selectedMeasurements, collaboration } = useMeasurementStore();
  const { toggleElevationExpanded, toggleElevationSelection } = useElevationActions();
  const { deleteMeasurement, duplicateMeasurement } = useMeasurementActions();
  
  const [showMeasurementActions, setShowMeasurementActions] = useState<string | null>(null);
  
  const elevationInfo = getElevationInfo(elevationGroup.elevation);
  const Icon = elevationInfo.icon;
  
  const handleToggleExpanded = () => {
    toggleElevationExpanded(elevationGroup.elevation);
  };
  
  const handleToggleSelection = () => {
    toggleElevationSelection(elevationGroup.elevation);
  };
  
  const handleDeleteMeasurement = (measurementId: string) => {
    if (window.confirm('Are you sure you want to delete this measurement?')) {
      deleteMeasurement(measurementId);
    }
  };
  
  const handleDuplicateMeasurement = (measurementId: string) => {
    duplicateMeasurement(measurementId);
  };
  
  const getMeasurementStatusColor = (measurement: MeasurementEntry) => {
    if (!measurement.isValid) return 'red';
    if (measurement.isDirty) return 'yellow';
    if (collaboration.lockedMeasurements.has(measurement.id || '')) return 'blue';
    return 'green';
  };
  
  const getCollaboratorOnMeasurement = (measurementId: string) => {
    return collaboration.connectedUsers.find(user => user.currentMeasurement === measurementId);
  };

  return (
    <Card className={clsx(
      'transition-all duration-200',
      isActive && 'ring-2 ring-blue-500 ring-opacity-50',
      elevationGroup.isSelected && 'bg-blue-50 border-blue-200',
      className
    )}>
      {/* Elevation Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleExpanded}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              {elevationGroup.isExpanded ? (
                <ChevronDownIcon className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRightIcon className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            <div className={clsx(
              'p-2 rounded-lg',
              `bg-${elevationInfo.color}-100`
            )}>
              <Icon className={clsx('w-5 h-5', `text-${elevationInfo.color}-600`)} />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {elevationInfo.name}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{elevationGroup.measurements.length} measurements</span>
                <span>{elevationGroup.totalSquareFootage.toFixed(1)} sq ft</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Visibility Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSelection}
              className={clsx(
                'text-gray-500 hover:text-gray-700',
                elevationGroup.isSelected && 'text-blue-600 bg-blue-50'
              )}
            >
              {elevationGroup.isSelected ? (
                <EyeIcon className="w-4 h-4" />
              ) : (
                <EyeSlashIcon className="w-4 h-4" />
              )}
            </Button>
            
            {/* Status Badges */}
            <div className="flex items-center space-x-1">
              {elevationGroup.measurements.some(m => !m.isValid) && (
                <Badge variant="error" size="sm">
                  {elevationGroup.measurements.filter(m => !m.isValid).length} errors
                </Badge>
              )}
              
              {elevationGroup.measurements.some(m => m.isDirty) && (
                <Badge variant="warning" size="sm">
                  unsaved
                </Badge>
              )}
              
              {elevationGroup.measurements.some(m => 
                collaboration.lockedMeasurements.has(m.id || '')
              ) && (
                <Badge variant="info" size="sm">
                  editing
                </Badge>
              )}
            </div>
            
            {/* Add Measurement */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddMeasurement(elevationGroup.elevation)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Measurements List */}
      <AnimatePresence>
        {elevationGroup.isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {elevationGroup.measurements.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentDuplicateIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 mb-3">
                    No measurements on this elevation yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddMeasurement(elevationGroup.elevation)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add First Measurement
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {elevationGroup.measurements.map((measurement) => (
                    <MeasurementCard
                      key={measurement.id}
                      measurement={measurement}
                      isSelected={selectedMeasurements.has(measurement.id || '')}
                      collaborator={getCollaboratorOnMeasurement(measurement.id || '')}
                      onEdit={() => onEditMeasurement(measurement.id || '')}
                      onDelete={() => handleDeleteMeasurement(measurement.id || '')}
                      onDuplicate={() => handleDuplicateMeasurement(measurement.id || '')}
                      statusColor={getMeasurementStatusColor(measurement)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Stats (when collapsed) */}
      {!elevationGroup.isExpanded && elevationGroup.measurements.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Total: {elevationGroup.totalSquareFootage.toFixed(1)} sq ft</span>
              {elevationGroup.measurements.some(m => m.colorPlacement) && (
                <div className="flex items-center space-x-1">
                  <PaintBrushIcon className="w-4 h-4" />
                  <span>Colors applied</span>
                </div>
              )}
              {elevationGroup.measurements.some(m => m.associatedPhotoIds.length > 0) && (
                <div className="flex items-center space-x-1">
                  <PhotoIcon className="w-4 h-4" />
                  <span>Photos attached</span>
                </div>
              )}
            </div>
            
            <button
              onClick={handleToggleExpanded}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View Details
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};