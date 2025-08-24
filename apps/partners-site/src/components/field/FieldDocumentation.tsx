'use client'

import { useState } from 'react'
import { Camera, FileText, Share, Trash2, Download, MapPin, Clock } from 'lucide-react'
import { MobileCameraCapture } from '@/components/camera/MobileCameraCapture'
import { useCamera } from '@/hooks/useCamera'
import { usePWA } from '@/components/providers/PWAProvider'

interface FieldDocumentationProps {
  jobId?: string
  operatorId?: string
  tags?: string[]
}

export function FieldDocumentation({ jobId, operatorId, tags }: FieldDocumentationProps) {
  const { isOnline } = usePWA()
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [showImageViewer, setShowImageViewer] = useState<string | null>(null)
  
  const {
    isOpen,
    savedImages,
    isSaving,
    openCamera,
    closeCamera,
    handleCapture,
    getSavedImages,
    deleteImage,
    shareImages,
    getStorageUsage
  } = useCamera({
    jobId,
    operatorId,
    tags,
    autoSave: true
  })

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    )
  }

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return
    
    try {
      await Promise.all(selectedImages.map(id => deleteImage(id)))
      setSelectedImages([])
    } catch (error) {
      console.error('Failed to delete images:', error)
    }
  }

  const handleBulkShare = async () => {
    if (selectedImages.length === 0) return
    
    try {
      await shareImages(selectedImages)
      setSelectedImages([])
    } catch (error) {
      console.error('Failed to share images:', error)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getLocationText = (location?: GeolocationPosition) => {
    if (!location) return null
    
    const { latitude, longitude } = location.coords
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Field Documentation
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {savedImages.length} photos captured
              {jobId && <span className="ml-2">• Job: {jobId}</span>}
            </p>
          </div>
          
          <button
            onClick={openCamera}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Add Photos</span>
          </button>
        </div>

        {/* Selection actions */}
        {selectedImages.length > 0 && (
          <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-900">
              {selectedImages.length} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkShare}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                <Share className="w-3 h-3" />
                Share
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Images Grid */}
      <div className="p-4">
        {savedImages.length === 0 ? (
          <div className="text-center py-8">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No documentation yet
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Start documenting your field work with photos
            </p>
            <button
              onClick={openCamera}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
            >
              <Camera className="w-4 h-4" />
              Take First Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {savedImages.map((image) => (
              <div
                key={image.id}
                className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
              >
                {/* Image */}
                <img
                  src={image.dataUrl}
                  alt={`Documentation ${image.id}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setShowImageViewer(image.id)}
                />

                {/* Selection overlay */}
                <div 
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                  onClick={() => toggleImageSelection(image.id)}
                >
                  <div className={`w-6 h-6 rounded-full border-2 ${
                    selectedImages.includes(image.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-white bg-transparent'
                  } flex items-center justify-center`}>
                    {selectedImages.includes(image.id) && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>

                {/* Metadata overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <div className="text-xs text-white space-y-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(image.timestamp).toLocaleDateString()}</span>
                    </div>
                    {image.metadata.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>Location</span>
                      </div>
                    )}
                    {!isOnline && image.metadata.tags?.includes('offline') && (
                      <div className="text-yellow-300 text-xs">
                        Sync pending
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteImage(image.id)
                    }}
                    className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      {savedImages.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex justify-between items-center">
          <span>
            {savedImages.length} photos • 
            {savedImages.filter(img => img.metadata.location).length} with location
          </span>
          {!isOnline && (
            <span className="text-yellow-600">
              Offline - Will sync when connected
            </span>
          )}
        </div>
      )}

      {/* Camera component */}
      <MobileCameraCapture
        isOpen={isOpen}
        onClose={closeCamera}
        onCapture={handleCapture}
        jobId={jobId}
        operatorId={operatorId}
        tags={tags}
      />

      {/* Image viewer modal */}
      {showImageViewer && (
        <ImageViewerModal
          imageId={showImageViewer}
          images={savedImages}
          onClose={() => setShowImageViewer(null)}
          onDelete={(id) => {
            deleteImage(id)
            setShowImageViewer(null)
          }}
          onShare={(id) => shareImages([id])}
        />
      )}

      {/* Loading overlay */}
      {isSaving && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">Saving photos...</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface ImageViewerModalProps {
  imageId: string
  images: any[]
  onClose: () => void
  onDelete: (id: string) => void
  onShare: (id: string) => void
}

function ImageViewerModal({ imageId, images, onClose, onDelete, onShare }: ImageViewerModalProps) {
  const image = images.find(img => img.id === imageId)
  if (!image) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <button onClick={onClose} className="text-white hover:text-gray-300">
          <X className="w-6 h-6" />
        </button>
        <h3 className="font-medium">{image.metadata.filename}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onShare(image.id)}
            className="p-2 rounded-full hover:bg-white/20"
          >
            <Share className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(image.id)}
            className="p-2 rounded-full hover:bg-white/20"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-4">
        <img
          src={image.dataUrl}
          alt={image.metadata.filename}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Metadata */}
      <div className="bg-black/50 text-white p-4 text-sm space-y-2">
        <div>Captured: {formatTimestamp(image.timestamp)}</div>
        {image.metadata.location && (
          <div>Location: {getLocationText(image.metadata.location)}</div>
        )}
        {image.metadata.operator && (
          <div>Operator: {image.metadata.operator}</div>
        )}
        {image.metadata.jobId && (
          <div>Job: {image.metadata.jobId}</div>
        )}
        {image.metadata.tags && image.metadata.tags.length > 0 && (
          <div>Tags: {image.metadata.tags.join(', ')}</div>
        )}
      </div>
    </div>
  )
}