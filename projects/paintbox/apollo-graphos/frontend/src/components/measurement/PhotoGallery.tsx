import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
  TagIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { 
  usePhotoUploads, 
  usePhotoActions, 
  useMeasurements,
  type PhotoUpload 
} from '@/store/measurement';
import type { WWTagType, ElevationType } from '@/types/graphql';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { PhotoViewer } from './PhotoViewer';
import { WWTagSelector } from './WWTagSelector';
import { clsx } from 'clsx';

interface PhotoGalleryProps {
  estimateId: string;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'uploaded' | 'pending' | 'errors';

// WW Tag categories for organization
const WWTagCategories = {
  SIDING: ['WW1', 'WW2', 'WW3', 'WW4', 'WW5'],
  TRIM: ['WW6', 'WW7', 'WW8', 'WW9', 'WW10'],
  DOORS: ['WW11', 'WW12', 'WW13', 'WW14', 'WW15'],
  WINDOWS: ['WW16', 'WW17', 'WW18', 'WW19', 'WW20'],
  RAILINGS: ['WW21', 'WW22', 'WW23', 'WW24', 'WW25'],
  SPECIALTY: ['WW26', 'WW27', 'WW28', 'WW29', 'WW30'],
};

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  estimateId,
  className
}) => {
  const photoUploads = usePhotoUploads();
  const measurements = useMeasurements();
  const {
    addPhotoUpload,
    updatePhotoUpload,
    removePhotoUpload,
    associatePhotoWithMeasurement,
    disassociatePhotoFromMeasurement,
    setPhotoWWTags,
  } = usePhotoActions();
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showTagSelector, setShowTagSelector] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof WWTagCategories | 'all'>('all');

  const photos = Object.values(photoUploads);

  // Dropzone for file uploads
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const photoId = addPhotoUpload(file);
      
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          updatePhotoUpload(photoId, { 
            uploadProgress: 100, 
            uploaded: true,
            companyCamId: `cc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          });
          clearInterval(interval);
        } else {
          updatePhotoUpload(photoId, { uploadProgress: progress });
        }
      }, 200);
    });
  }, [addPhotoUpload, updatePhotoUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic']
    },
    multiple: true,
  });

  // Filter photos
  const filteredPhotos = photos.filter(photo => {
    // Filter by mode
    switch (filterMode) {
      case 'uploaded':
        if (!photo.uploaded) return false;
        break;
      case 'pending':
        if (photo.uploaded) return false;
        break;
      case 'errors':
        if (!photo.error) return false;
        break;
    }

    // Filter by search query
    if (searchQuery && !photo.wwTags.join(' ').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filter by WW category
    if (selectedCategory !== 'all') {
      const categoryTags = WWTagCategories[selectedCategory];
      if (!photo.wwTags.some(tag => categoryTags.includes(tag))) {
        return false;
      }
    }

    return true;
  });

  const handleAssociateWithMeasurement = (photoId: string, measurementId: string) => {
    const photo = photoUploads[photoId];
    if (photo?.associatedMeasurements.includes(measurementId)) {
      disassociatePhotoFromMeasurement(photoId, measurementId);
    } else {
      associatePhotoWithMeasurement(photoId, measurementId);
    }
  };

  const handleTagsUpdate = (photoId: string, tags: WWTagType[]) => {
    setPhotoWWTags(photoId, tags);
    setShowTagSelector(null);
  };

  const handleDeletePhoto = (photoId: string) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      removePhotoUpload(photoId);
    }
  };

  const getStatusColor = (photo: PhotoUpload) => {
    if (photo.error) return 'red';
    if (!photo.uploaded) return 'yellow';
    return 'green';
  };

  return (
    <div className={clsx('flex flex-col h-full bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Photo Gallery</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{photos.length} photos</span>
              <span>•</span>
              <span>{photos.filter(p => p.uploaded).length} uploaded</span>
              {photos.some(p => p.uploadProgress < 100 && !p.uploaded) && (
                <>
                  <span>•</span>
                  <span className="text-yellow-600">
                    {photos.filter(p => !p.uploaded && !p.error).length} uploading
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none border-0"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none border-0"
              >
                <ListBulletIcon className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Upload Button */}
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              Upload Photos
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by WW tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Photos</option>
              <option value="uploaded">Uploaded</option>
              <option value="pending">Uploading</option>
              <option value="errors">Errors</option>
            </select>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Categories</option>
              <option value="SIDING">Siding (WW1-5)</option>
              <option value="TRIM">Trim (WW6-10)</option>
              <option value="DOORS">Doors (WW11-15)</option>
              <option value="WINDOWS">Windows (WW16-20)</option>
              <option value="RAILINGS">Railings (WW21-25)</option>
              <option value="SPECIALTY">Specialty (WW26-30)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Drop Zone */}
        {photos.length === 0 && (
          <div
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <input {...getInputProps()} />
            <PhotoIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop photos here...' : 'Upload Project Photos'}
            </h3>
            <p className="text-gray-500 mb-4">
              Drag and drop photos here, or click to select files
            </p>
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              <PlusIcon className="w-4 h-4 mr-2" />
              Choose Photos
            </Button>
          </div>
        )}

        {/* Photo Grid/List */}
        {filteredPhotos.length > 0 && (
          <div className={clsx(
            viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
              : 'space-y-3'
          )}>
            {filteredPhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                measurements={Object.values(measurements)}
                viewMode={viewMode}
                onView={() => setSelectedPhoto(photo.id)}
                onDelete={() => handleDeletePhoto(photo.id)}
                onTagsUpdate={() => setShowTagSelector(photo.id)}
                onMeasurementAssociate={handleAssociateWithMeasurement}
                statusColor={getStatusColor(photo)}
              />
            ))}
          </div>
        )}

        {/* Empty State for Filtered Results */}
        {filteredPhotos.length === 0 && photos.length > 0 && (
          <div className="text-center py-12">
            <FunnelIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos match your filters</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setFilterMode('all');
                setSelectedCategory('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Upload Drop Zone (when photos exist) */}
        {photos.length > 0 && (
          <div
            {...getRootProps()}
            className={clsx(
              'mt-6 border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <input {...getInputProps()} />
            <ArrowUpTrayIcon className="w-6 h-6 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              {isDragActive ? 'Drop photos here...' : 'Drop more photos here or click to upload'}
            </p>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        id="file-upload"
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          if (e.target.files) {
            onDrop(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Photo Viewer Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <PhotoViewer
            photo={photoUploads[selectedPhoto]}
            onClose={() => setSelectedPhoto(null)}
          />
        )}
      </AnimatePresence>

      {/* WW Tag Selector Modal */}
      <AnimatePresence>
        {showTagSelector && (
          <WWTagSelector
            selectedTags={photoUploads[showTagSelector]?.wwTags || []}
            onSave={(tags) => handleTagsUpdate(showTagSelector, tags)}
            onClose={() => setShowTagSelector(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Photo Card Component
interface PhotoCardProps {
  photo: PhotoUpload;
  measurements: any[];
  viewMode: ViewMode;
  statusColor: 'red' | 'yellow' | 'green';
  onView: () => void;
  onDelete: () => void;
  onTagsUpdate: () => void;
  onMeasurementAssociate: (photoId: string, measurementId: string) => void;
}

const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  measurements,
  viewMode,
  statusColor,
  onView,
  onDelete,
  onTagsUpdate,
  onMeasurementAssociate,
}) => {
  const [showMeasurements, setShowMeasurements] = useState(false);
  
  const StatusIcon = {
    red: ExclamationTriangleIcon,
    yellow: ArrowUpTrayIcon,
    green: CheckCircleIcon,
  }[statusColor];

  const statusText = {
    red: photo.error || 'Error',
    yellow: `Uploading... ${photo.uploadProgress.toFixed(0)}%`,
    green: 'Uploaded',
  }[statusColor];

  if (viewMode === 'list') {
    return (
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <img
              src={photo.preview}
              alt={photo.file.name}
              className="w-16 h-16 object-cover rounded-lg cursor-pointer"
              onClick={onView}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {photo.file.name}
            </h4>
            <div className="flex items-center space-x-2 mt-1">
              <StatusIcon className={clsx('w-4 h-4', {
                'text-red-500': statusColor === 'red',
                'text-yellow-500': statusColor === 'yellow',
                'text-green-500': statusColor === 'green',
              })} />
              <span className="text-sm text-gray-500">{statusText}</span>
            </div>
            
            <div className="flex items-center space-x-4 mt-2">
              <Button
                size="xs"
                variant="outline"
                onClick={onTagsUpdate}
                className="text-xs"
              >
                <TagIcon className="w-3 h-3 mr-1" />
                Tags ({photo.wwTags.length})
              </Button>
              
              <Button
                size="xs"
                variant="outline"
                onClick={() => setShowMeasurements(!showMeasurements)}
                className="text-xs"
              >
                Measurements ({photo.associatedMeasurements.length})
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="xs"
              variant="ghost"
              onClick={onDelete}
              className="text-red-600 hover:bg-red-50"
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <img
          src={photo.preview}
          alt={photo.file.name}
          className="w-full h-32 object-cover cursor-pointer"
          onClick={onView}
        />
        
        {/* Status overlay */}
        <div className="absolute top-2 right-2">
          <div className={clsx(
            'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
            {
              'bg-red-100 text-red-800': statusColor === 'red',
              'bg-yellow-100 text-yellow-800': statusColor === 'yellow',
              'bg-green-100 text-green-800': statusColor === 'green',
            }
          )}>
            <StatusIcon className="w-3 h-3" />
          </div>
        </div>

        {/* Upload progress */}
        {!photo.uploaded && !photo.error && (
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-50">
            <div 
              className="h-1 bg-blue-500 transition-all duration-300"
              style={{ width: `${photo.uploadProgress}%` }}
            />
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="absolute top-2 left-2 p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-opacity"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>
      </div>
      
      <div className="p-3">
        <h4 className="text-sm font-medium text-gray-900 truncate mb-2">
          {photo.file.name}
        </h4>
        
        <div className="flex items-center justify-between">
          <Button
            size="xs"
            variant="outline"
            onClick={onTagsUpdate}
            className="text-xs"
          >
            <TagIcon className="w-3 h-3 mr-1" />
            {photo.wwTags.length}
          </Button>
          
          <span className="text-xs text-gray-500">
            {(photo.file.size / 1024 / 1024).toFixed(1)} MB
          </span>
        </div>

        {/* WW Tags display */}
        {photo.wwTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {photo.wwTags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" size="sm">
                {tag}
              </Badge>
            ))}
            {photo.wwTags.length > 3 && (
              <Badge variant="secondary" size="sm">
                +{photo.wwTags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};