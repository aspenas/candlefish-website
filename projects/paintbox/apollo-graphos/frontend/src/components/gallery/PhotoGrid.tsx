import React, { useRef, useState } from 'react'
import {
  PhotoIcon,
  PlusIcon,
  ArrowsPointingOutIcon,
  TrashIcon,
  DownloadIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { ProjectPhoto } from '@/types'
import { formatDate, formatFileSize } from '@/utils/formatters'

interface PhotoGridProps {
  photos: ProjectPhoto[]
  onPhotoUpload?: (files: FileList) => void
  onPhotoSelect?: (photo: ProjectPhoto) => void
  onPhotoDelete?: (photoId: string) => void
  uploading?: boolean
  className?: string
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoUpload,
  onPhotoSelect,
  onPhotoDelete,
  uploading = false,
  className = ''
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0 && onPhotoUpload) {
      onPhotoUpload(files)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)

    const files = event.dataTransfer.files
    if (files.length > 0 && onPhotoUpload) {
      onPhotoUpload(files)
    }
  }

  const handlePhotoClick = (photo: ProjectPhoto) => {
    setSelectedPhoto(photo)
    onPhotoSelect?.(photo)
  }

  const getImageUrl = (photo: ProjectPhoto) => {
    return photo.thumbnailUrl || photo.url
  }

  const PhotoModal = () => {
    if (!selectedPhoto) return null

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={() => setSelectedPhoto(null)}
      >
        <div
          className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || 'Project photo'}
              className="w-full h-auto max-h-96 object-contain"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {selectedPhoto.caption || 'Project Photo'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <span>Uploaded {formatDate(selectedPhoto.uploadedAt)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <span>By {selectedPhoto.uploadedBy}</span>
              </div>

              {selectedPhoto.metadata?.size && (
                <div className="flex items-center space-x-2">
                  <PhotoIcon className="h-4 w-4 text-gray-400" />
                  <span>{formatFileSize(selectedPhoto.metadata.size)}</span>
                </div>
              )}

              {selectedPhoto.metadata?.dimensions && (
                <div className="flex items-center space-x-2">
                  <ArrowsPointingOutIcon className="h-4 w-4 text-gray-400" />
                  <span>
                    {selectedPhoto.metadata.dimensions.width} × {selectedPhoto.metadata.dimensions.height}
                  </span>
                </div>
              )}

              {selectedPhoto.metadata?.location && (
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  <span>
                    {selectedPhoto.metadata.location.latitude.toFixed(6)}, {selectedPhoto.metadata.location.longitude.toFixed(6)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="flex space-x-2">
                <a
                  href={selectedPhoto.url}
                  download
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </a>
              </div>

              {onPhotoDelete && (
                <button
                  onClick={() => {
                    onPhotoDelete(selectedPhoto.id)
                    setSelectedPhoto(null)
                  }}
                  className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded text-red-700 bg-white hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow border ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Company Cam Photos ({photos.length})
          </h3>

          {onPhotoUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Photos'}
            </button>
          )}
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Photo Grid */}
        {photos.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <PhotoIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h4 className="text-lg font-medium text-gray-900 mt-4">No photos yet</h4>
            <p className="text-gray-600 mt-2">
              {onPhotoUpload
                ? 'Upload photos by clicking the button above or drag and drop images here'
                : 'Photos will appear here when uploaded'}
            </p>
            {onPhotoUpload && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Choose Files
              </button>
            )}
          </div>
        ) : (
          <div
            className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${
              dragOver ? 'opacity-50' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handlePhotoClick(photo)}
              >
                <img
                  src={getImageUrl(photo)}
                  alt={photo.caption || 'Project photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Overlay with info */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-end">
                  <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-sm font-medium truncate">
                      {photo.caption || 'Project Photo'}
                    </p>
                    <p className="text-xs text-gray-200">
                      {formatDate(photo.uploadedAt)}
                    </p>
                  </div>
                </div>

                {/* Expand icon */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="p-1 bg-black bg-opacity-50 rounded">
                    <ArrowsPointingOutIcon className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            ))}

            {/* Upload drop zone when photos exist */}
            {onPhotoUpload && (
              <div
                className={`aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${
                  dragOver ? 'border-blue-400 bg-blue-50' : ''
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <PlusIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-600 mt-2">Add photos</p>
                </div>
              </div>
            )}
          </div>
        )}

        {uploading && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm text-blue-800">Uploading photos...</span>
            </div>
          </div>
        )}
      </div>

      <PhotoModal />
    </div>
  )
}
