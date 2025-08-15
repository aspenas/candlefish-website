import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  TagIcon,
  LinkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import type { PhotoUpload } from '@/store/measurement';
import { useMeasurements } from '@/store/measurement';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';

interface PhotoViewerProps {
  photo: PhotoUpload;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  showNavigation?: boolean;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo,
  onClose,
  onPrevious,
  onNext,
  showNavigation = false,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const measurements = useMeasurements();

  const associatedMeasurements = photo.associatedMeasurements
    .map(id => measurements[id])
    .filter(Boolean);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusInfo = () => {
    if (photo.error) {
      return {
        icon: ExclamationTriangleIcon,
        text: `Error: ${photo.error}`,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    } else if (!photo.uploaded) {
      return {
        icon: ArrowLeftIcon,
        text: `Uploading... ${photo.uploadProgress.toFixed(0)}%`,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
      };
    } else {
      return {
        icon: CheckCircleIcon,
        text: 'Uploaded successfully',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Navigation Controls */}
      {showNavigation && (
        <>
          {onPrevious && (
            <button
              onClick={onPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-opacity z-10"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
          )}
          
          {onNext && (
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-opacity z-10"
            >
              <ArrowRightIcon className="w-6 h-6" />
            </button>
          )}
        </>
      )}

      {/* Header Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          {/* File info */}
          <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
            {photo.file.name}
          </div>
          
          {/* Status */}
          <div className={clsx(
            'flex items-center space-x-1 px-2 py-1 rounded-lg text-sm',
            statusInfo.bgColor,
            statusInfo.borderColor,
            statusInfo.color,
            'border'
          )}>
            <StatusIcon className="w-4 h-4" />
            <span>{statusInfo.text}</span>
          </div>

          {/* Upload progress */}
          {!photo.uploaded && !photo.error && (
            <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-16 h-1 bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${photo.uploadProgress}%` }}
                  />
                </div>
                <span>{photo.uploadProgress.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsZoomed(!isZoomed)}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            {isZoomed ? (
              <ArrowsPointingInIcon className="w-5 h-5" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInfo(!showInfo)}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            <InformationCircleIcon className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center w-full h-full px-4">
        {/* Main Image */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ 
            scale: isZoomed ? 1.2 : 1, 
            opacity: 1 
          }}
          transition={{ duration: 0.3 }}
          className={clsx(
            'relative',
            isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
          )}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={photo.preview}
            alt={photo.file.name}
            className="max-w-full max-h-full object-contain"
            style={{ 
              maxHeight: isZoomed ? 'none' : '80vh',
              maxWidth: isZoomed ? 'none' : '80vw'
            }}
          />
        </motion.div>
      </div>

      {/* Info Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: showInfo ? 0 : '100%' }}
        transition={{ duration: 0.3 }}
        className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl overflow-y-auto z-20"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Photo Details</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </Button>
          </div>

          {/* File Information */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">File Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="text-gray-900 truncate ml-2" title={photo.file.name}>
                    {photo.file.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Size:</span>
                  <span className="text-gray-900">{formatFileSize(photo.file.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="text-gray-900">{photo.file.type}</span>
                </div>
              </div>
            </div>

            {/* Upload Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Status</h4>
              <div className="space-y-2">
                <div className={clsx(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg',
                  statusInfo.bgColor,
                  statusInfo.borderColor,
                  'border'
                )}>
                  <StatusIcon className={clsx('w-4 h-4', statusInfo.color)} />
                  <span className={clsx('text-sm font-medium', statusInfo.color)}>
                    {statusInfo.text}
                  </span>
                </div>
                
                {photo.companyCamId && (
                  <div className="text-sm text-gray-500">
                    Company Cam ID: {photo.companyCamId}
                  </div>
                )}
              </div>
            </div>

            {/* WW Tags */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                WW Tags ({photo.wwTags.length})
              </h4>
              {photo.wwTags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {photo.wwTags.map(tag => (
                    <Badge key={tag} variant="secondary" size="sm">
                      <TagIcon className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No tags assigned</p>
              )}
            </div>

            {/* Associated Measurements */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Associated Measurements ({associatedMeasurements.length})
              </h4>
              {associatedMeasurements.length > 0 ? (
                <div className="space-y-2">
                  {associatedMeasurements.map(measurement => (
                    <div key={measurement.id} className="p-2 bg-gray-50 rounded-lg">
                      <div className="font-medium text-sm text-gray-900">
                        {measurement.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {measurement.elevation} • {measurement.type.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Not associated with any measurements</p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Actions</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    // Open tag selector
                  }}
                >
                  <TagIcon className="w-4 h-4 mr-2" />
                  Edit Tags
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    // Open measurement association
                  }}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Associate with Measurements
                </Button>

                {photo.uploaded && photo.companyCamId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      // Open in Company Cam
                      window.open(`https://companycam.com/photos/${photo.companyCamId}`, '_blank');
                    }}
                  >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    View in Company Cam
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-xs">
          Press ESC to close • Click image to zoom • I for info
        </div>
      </div>
    </motion.div>
  );
};