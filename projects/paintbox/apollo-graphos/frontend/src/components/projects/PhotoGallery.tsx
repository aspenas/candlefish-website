import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Image as ImageIcon, Download, ExternalLink, MapPin, Calendar, Camera, X, ZoomIn, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { GET_PROJECT_PHOTOS, SYNC_PROJECT_PHOTOS } from '@/graphql/projects';
import { formatDateTime, formatFileSize } from '@/utils/formatting';
import type { ProjectPhoto } from '@/types/graphql';
import toast from 'react-hot-toast';

interface PhotoGalleryProps {
  projectId: string;
  className?: string;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ projectId, className }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Query project photos
  const { data, loading, error, refetch } = useQuery(GET_PROJECT_PHOTOS, {
    variables: { projectId, limit: 100 },
  });

  // Sync photos from Company Cam
  const [syncPhotos, { loading: syncing }] = useMutation(SYNC_PROJECT_PHOTOS, {
    variables: { projectId },
    onCompleted: () => {
      toast.success('Photos synced from Company Cam');
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to sync photos');
      console.error('Sync photos error:', error);
    },
  });

  const photos = data?.projectPhotos || [];

  const handlePhotoClick = useCallback((photo: ProjectPhoto) => {
    setSelectedPhoto(photo);
  }, []);

  const handleDownload = useCallback(async (photo: ProjectPhoto) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photo.metadata.fileName || `photo-${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download photo');
    }
  }, []);

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-error-600 mb-4">Failed to load photos</p>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className={className}>
        <Card>
          <CardHeader
            title="Project Photos"
            subtitle={`${photos.length} photos from Company Cam`}
            actions={
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? 'List View' : 'Grid View'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => syncPhotos()}
                  loading={syncing}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  Sync Photos
                </Button>
              </div>
            }
          />

          <CardContent>
            {photos.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No photos available</p>
                <Button
                  onClick={() => syncPhotos()}
                  loading={syncing}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  Sync from Company Cam
                </Button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}>
                {photos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    viewMode={viewMode}
                    onPhotoClick={handlePhotoClick}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onDownload={handleDownload}
        />
      )}
    </>
  );
};

// Photo Card Component
interface PhotoCardProps {
  photo: ProjectPhoto;
  viewMode: 'grid' | 'list';
  onPhotoClick: (photo: ProjectPhoto) => void;
  onDownload: (photo: ProjectPhoto) => void;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, viewMode, onPhotoClick, onDownload }) => {
  if (viewMode === 'list') {
    return (
      <Card variant="outlined" padding="md" className="hover:shadow-soft transition-shadow">
        <div className="flex items-center space-x-4">
          <div
            className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden cursor-pointer"
            onClick={() => onPhotoClick(photo)}
          >
            <img
              src={photo.thumbnail || photo.url}
              alt={photo.caption || `Photo taken ${formatDateTime(photo.takenAt)}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
              loading="lazy"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {photo.caption || 'Untitled Photo'}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDateTime(photo.takenAt)}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>{photo.metadata.dimensions.width} × {photo.metadata.dimensions.height}</span>
                  <span>{formatFileSize(photo.metadata.fileSize)}</span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPhotoClick(photo)}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(photo)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {photo.metadata.gpsCoordinates && (
              <div className="flex items-center space-x-1 mt-2">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  GPS: {photo.metadata.gpsCoordinates.latitude.toFixed(6)}, {photo.metadata.gpsCoordinates.longitude.toFixed(6)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="outlined" padding="none" className="hover:shadow-soft transition-shadow group">
      <div
        className="aspect-square bg-gray-200 cursor-pointer overflow-hidden"
        onClick={() => onPhotoClick(photo)}
      >
        <img
          src={photo.thumbnail || photo.url}
          alt={photo.caption || `Photo taken ${formatDateTime(photo.takenAt)}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900 truncate flex-1">
            {photo.caption || 'Untitled Photo'}
          </h4>
          <div className="flex items-center space-x-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(photo)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-2">
          {formatDateTime(photo.takenAt)}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{photo.metadata.dimensions.width} × {photo.metadata.dimensions.height}</span>
          <span>{formatFileSize(photo.metadata.fileSize)}</span>
        </div>

        {photo.companyCamId && (
          <div className="mt-2">
            <Badge variant="outline" size="sm">
              Company Cam
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};

// Photo Modal Component
interface PhotoModalProps {
  photo: ProjectPhoto;
  onClose: () => void;
  onDownload: (photo: ProjectPhoto) => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({ photo, onClose, onDownload }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="max-w-4xl max-h-[90vh] w-full bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {photo.caption || 'Untitled Photo'}
            </h3>
            <p className="text-sm text-gray-500">{formatDateTime(photo.takenAt)}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(photo)}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Download
            </Button>
            {photo.companyCamId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://app.companycam.com/photos/${photo.companyCamId}`, '_blank')}
                leftIcon={<ExternalLink className="w-4 h-4" />}
              >
                View in Company Cam
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Photo */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex justify-center">
            <img
              src={photo.url}
              alt={photo.caption || `Photo taken ${formatDateTime(photo.takenAt)}`}
              className="max-w-full max-h-[60vh] object-contain"
            />
          </div>
        </div>

        {/* Footer with metadata */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Photo Details</h4>
              <div className="space-y-1 text-gray-600">
                <div>File: {photo.metadata.fileName}</div>
                <div>Size: {formatFileSize(photo.metadata.fileSize)}</div>
                <div>Dimensions: {photo.metadata.dimensions.width} × {photo.metadata.dimensions.height}</div>
              </div>
            </div>

            {photo.metadata.gpsCoordinates && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                <div className="space-y-1 text-gray-600">
                  <div>Latitude: {photo.metadata.gpsCoordinates.latitude.toFixed(6)}</div>
                  <div>Longitude: {photo.metadata.gpsCoordinates.longitude.toFixed(6)}</div>
                </div>
              </div>
            )}

            {photo.metadata.cameraInfo && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Camera Info</h4>
                <div className="space-y-1 text-gray-600">
                  <div>Make: {photo.metadata.cameraInfo.make}</div>
                  <div>Model: {photo.metadata.cameraInfo.model}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoGallery;
