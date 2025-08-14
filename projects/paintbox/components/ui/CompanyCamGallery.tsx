'use client';

import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for CompanyCam integration
export interface CompanyCamPhoto {
  id: string;
  uri: string;
  public_uri: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  date_taken?: string;
  tags?: string[];
}

interface CompanyCamGalleryProps {
  projectId?: string;
  onPhotosChange?: (photos: CompanyCamPhoto[]) => void;
  className?: string;
}

export const CompanyCamGallery: React.FC<CompanyCamGalleryProps> = ({
  projectId,
  onPhotosChange,
  className
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [photos, setPhotos] = useState<CompanyCamPhoto[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    try {
      // TODO: Implement actual photo upload via API route
      console.log('Photo upload functionality will be implemented via API routes');

      // Simulate upload
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Photo upload failed:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('bg-white rounded-lg border p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium">Project Photos</h3>
        </div>
        <label className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
          <Upload className="w-4 h-4 inline mr-1" />
          Upload
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Uploading photos...</p>
        </div>
      )}

      {photos.length === 0 && !isLoading && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No photos uploaded yet</p>
          <p className="text-sm text-gray-500">Upload photos to get started</p>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src={photo.public_uri}
                alt="Project photo"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyCamGallery;
