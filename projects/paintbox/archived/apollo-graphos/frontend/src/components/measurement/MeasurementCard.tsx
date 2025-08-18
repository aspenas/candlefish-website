import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PhotoIcon,
  PaintBrushIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  LockClosedIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import {
  CubeIcon,
  RectangleStackIcon,
  WindowIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/solid';
import type { MeasurementEntry } from '@/store/measurement';
import type { MeasurementType } from '@/types/graphql';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';

interface MeasurementCardProps {
  measurement: MeasurementEntry;
  isSelected: boolean;
  collaborator?: { userId: string; userName: string; editingField?: string } | null;
  statusColor: 'red' | 'yellow' | 'blue' | 'green';
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  className?: string;
}

// Helper to get measurement type icon and info
const getMeasurementTypeInfo = (type: MeasurementType) => {
  switch (type) {
    case 'SIDING':
      return { icon: RectangleStackIcon, name: 'Siding', color: 'blue' };
    case 'TRIM':
      return { icon: RectangleStackIcon, name: 'Trim', color: 'green' };
    case 'FASCIA':
      return { icon: RectangleStackIcon, name: 'Fascia', color: 'purple' };
    case 'SOFFIT':
      return { icon: RectangleStackIcon, name: 'Soffit', color: 'indigo' };
    case 'GARAGE_DOOR':
      return { icon: ArchiveBoxIcon, name: 'Garage Door', color: 'gray' };
    case 'ACCESS_DOOR':
      return { icon: ArchiveBoxIcon, name: 'Access Door', color: 'gray' };
    case 'FRONT_DOOR':
      return { icon: ArchiveBoxIcon, name: 'Front Door', color: 'red' };
    case 'SLIDING_DOOR':
      return { icon: ArchiveBoxIcon, name: 'Sliding Door', color: 'gray' };
    case 'WINDOW':
      return { icon: WindowIcon, name: 'Window', color: 'yellow' };
    case 'WINDOW_TRIM':
      return { icon: WindowIcon, name: 'Window Trim', color: 'orange' };
    case 'SHUTTERS':
      return { icon: WindowIcon, name: 'Shutters', color: 'green' };
    case 'RAILINGS':
      return { icon: CubeIcon, name: 'Railings', color: 'brown' };
    case 'BALUSTERS':
      return { icon: CubeIcon, name: 'Balusters', color: 'brown' };
    case 'HANDRAILS':
      return { icon: CubeIcon, name: 'Handrails', color: 'brown' };
    default:
      return { icon: CubeIcon, name: type.replace('_', ' '), color: 'gray' };
  }
};

// Calculate square footage for display
const calculateSquareFootage = (measurement: MeasurementEntry): number => {
  switch (measurement.type) {
    case 'SIDING':
    case 'TRIM':
    case 'FASCIA':
    case 'SOFFIT':
      return measurement.length * (measurement.height || 1);
    case 'GARAGE_DOOR':
    case 'ACCESS_DOOR':
    case 'FRONT_DOOR':
    case 'WINDOW':
      return (measurement.width || 1) * (measurement.height || 1);
    case 'RAILINGS':
    case 'HANDRAILS':
      return measurement.length; // Linear footage
    default:
      return measurement.length * (measurement.height || measurement.width || 1);
  }
};

// Format dimensions for display
const formatDimensions = (measurement: MeasurementEntry): string => {
  const { length, width, height } = measurement;

  if (width && height) {
    return `${width}" × ${height}"`;
  } else if (height) {
    return `${length}" × ${height}"`;
  } else {
    return `${length}"`;
  }
};

export const MeasurementCard: React.FC<MeasurementCardProps> = ({
  measurement,
  isSelected,
  collaborator,
  statusColor,
  onEdit,
  onDelete,
  onDuplicate,
  className
}) => {
  const [showActions, setShowActions] = useState(false);
  const typeInfo = getMeasurementTypeInfo(measurement.type);
  const Icon = typeInfo.icon;
  const squareFootage = calculateSquareFootage(measurement);

  const statusIcon = {
    red: ExclamationTriangleIcon,
    yellow: ClockIcon,
    blue: LockClosedIcon,
    green: CheckCircleIcon,
  }[statusColor];

  const StatusIcon = statusIcon;

  const statusColors = {
    red: 'text-red-500',
    yellow: 'text-yellow-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      className={clsx(
        'relative bg-white border rounded-lg p-4 transition-all duration-200 cursor-pointer',
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300',
        collaborator && 'ring-2 ring-blue-200',
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Collaborator Indicator */}
      {collaborator && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge variant="info" size="sm" className="shadow-sm">
            <LockClosedIcon className="w-3 h-3 mr-1" />
            {collaborator.userName}
            {collaborator.editingField && ` (${collaborator.editingField})`}
          </Badge>
        </div>
      )}

      <div className="flex items-start justify-between">
        {/* Left Content */}
        <div className="flex items-start space-x-3 flex-1">
          {/* Type Icon */}
          <div className={clsx(
            'flex-shrink-0 p-2 rounded-lg',
            `bg-${typeInfo.color}-100`
          )}>
            <Icon className={clsx('w-5 h-5', `text-${typeInfo.color}-600`)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 truncate">
                {measurement.name}
              </h4>

              <div className="flex items-center space-x-2 ml-2">
                {/* Status Icon */}
                <StatusIcon className={clsx('w-4 h-4', statusColors[statusColor])} />

                {/* Square Footage */}
                <span className="text-sm font-medium text-gray-900">
                  {squareFootage.toFixed(1)} sq ft
                </span>
              </div>
            </div>

            {/* Type and Dimensions */}
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>{typeInfo.name}</span>
              <span>•</span>
              <span>{formatDimensions(measurement)}</span>
              {measurement.surfaceType && (
                <>
                  <span>•</span>
                  <span>{measurement.surfaceType.replace('_', ' ')}</span>
                </>
              )}
            </div>

            {/* Description */}
            {measurement.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                {measurement.description}
              </p>
            )}

            {/* Features and Tags */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-3">
                {/* Color Applied */}
                {measurement.colorPlacement && (
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <PaintBrushIcon className="w-3 h-3" />
                    <span>Color applied</span>
                  </div>
                )}

                {/* Photos */}
                {measurement.associatedPhotoIds.length > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-blue-600">
                    <PhotoIcon className="w-3 h-3" />
                    <span>{measurement.associatedPhotoIds.length}</span>
                  </div>
                )}

                {/* WW Tags */}
                {measurement.wwTags.length > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-purple-600">
                    <TagIcon className="w-3 h-3" />
                    <span>{measurement.wwTags.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Validation Errors */}
              {!measurement.isValid && (
                <div className="text-xs text-red-600">
                  {Object.values(measurement.validationErrors)[0]}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{
          opacity: showActions ? 1 : 0,
          x: showActions ? 0 : 20
        }}
        className="absolute top-2 right-2 flex items-center space-x-1"
      >
        <Button
          variant="ghost"
          size="xs"
          onClick={onEdit}
          className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
        >
          <PencilIcon className="w-3 h-3" />
        </Button>

        <Button
          variant="ghost"
          size="xs"
          onClick={onDuplicate}
          className="text-gray-500 hover:text-green-600 hover:bg-green-50"
        >
          <DocumentDuplicateIcon className="w-3 h-3" />
        </Button>

        <Button
          variant="ghost"
          size="xs"
          onClick={onDelete}
          className="text-gray-500 hover:text-red-600 hover:bg-red-50"
        >
          <TrashIcon className="w-3 h-3" />
        </Button>
      </motion.div>

      {/* Bottom Border Status Indicator */}
      <div className={clsx(
        'absolute bottom-0 left-0 right-0 h-1 rounded-b-lg',
        {
          'bg-red-200': statusColor === 'red',
          'bg-yellow-200': statusColor === 'yellow',
          'bg-blue-200': statusColor === 'blue',
          'bg-green-200': statusColor === 'green',
        }
      )} />
    </motion.div>
  );
};
