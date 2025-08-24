'use client'

import { useState, useCallback } from 'react'
import { offlineStorage } from '@/lib/offline-storage'

interface CapturedImage {
  id: string
  dataUrl: string
  timestamp: number
  metadata: {
    filename: string
    size: number
    type: string
    location?: GeolocationPosition
    operator?: string
    jobId?: string
    tags?: string[]
  }
}

interface UseCameraOptions {
  maxImages?: number
  jobId?: string
  operatorId?: string
  tags?: string[]
  autoSave?: boolean
}

export function useCamera(options: UseCameraOptions = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [savedImages, setSavedImages] = useState<CapturedImage[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const openCamera = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeCamera = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleCapture = useCallback(async (images: CapturedImage[]) => {
    setIsSaving(true)
    
    try {
      // Save images to offline storage
      await Promise.all(images.map(async (image) => {
        await offlineStorage.store('captured-images', image)
      }))

      setSavedImages(prev => [...prev, ...images])

      // If online, upload to server
      if (navigator.onLine && options.autoSave) {
        await uploadImages(images)
      } else {
        // Queue for sync when online
        await Promise.all(images.map(async (image) => {
          await offlineStorage.addToQueue({
            id: '',
            operation: 'create',
            type: 'field-documentation',
            data: image,
            timestamp: Date.now(),
            retries: 0,
            maxRetries: 3
          })
        }))
      }

      console.log(`[Camera] Saved ${images.length} images`)
    } catch (error) {
      console.error('[Camera] Failed to save images:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [options.autoSave])

  const uploadImages = async (images: CapturedImage[]) => {
    try {
      for (const image of images) {
        const formData = new FormData()
        
        // Convert data URL to blob
        const response = await fetch(image.dataUrl)
        const blob = await response.blob()
        
        formData.append('image', blob, image.metadata.filename)
        formData.append('metadata', JSON.stringify(image.metadata))
        
        // Upload to your API endpoint
        await fetch('/api/field-documentation/upload', {
          method: 'POST',
          body: formData
        })
      }
      
      console.log(`[Camera] Uploaded ${images.length} images to server`)
    } catch (error) {
      console.error('[Camera] Upload failed:', error)
      throw error
    }
  }

  const getSavedImages = useCallback(async (filters?: {
    jobId?: string
    operatorId?: string
    tags?: string[]
    fromDate?: Date
    toDate?: Date
  }) => {
    try {
      let images = await offlineStorage.getAll('captured-images') as CapturedImage[]
      
      if (filters) {
        images = images.filter(image => {
          if (filters.jobId && image.metadata.jobId !== filters.jobId) return false
          if (filters.operatorId && image.metadata.operator !== filters.operatorId) return false
          if (filters.tags?.length && !filters.tags.some(tag => image.metadata.tags?.includes(tag))) return false
          if (filters.fromDate && image.timestamp < filters.fromDate.getTime()) return false
          if (filters.toDate && image.timestamp > filters.toDate.getTime()) return false
          return true
        })
      }
      
      return images.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('[Camera] Failed to get saved images:', error)
      return []
    }
  }, [])

  const deleteImage = useCallback(async (imageId: string) => {
    try {
      await offlineStorage.delete('captured-images', imageId)
      setSavedImages(prev => prev.filter(img => img.id !== imageId))
      
      // Queue deletion for server sync if needed
      await offlineStorage.addToQueue({
        id: '',
        operation: 'delete',
        type: 'field-documentation',
        data: { id: imageId },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3
      })
      
      console.log(`[Camera] Deleted image ${imageId}`)
    } catch (error) {
      console.error('[Camera] Failed to delete image:', error)
      throw error
    }
  }, [])

  const shareImages = useCallback(async (imageIds: string[]) => {
    try {
      const images = await getSavedImages()
      const imagesToShare = images.filter(img => imageIds.includes(img.id))
      
      if ('navigator' in window && 'share' in navigator) {
        // Use Web Share API if available
        const files = await Promise.all(imagesToShare.map(async (image) => {
          const response = await fetch(image.dataUrl)
          const blob = await response.blob()
          return new File([blob], image.metadata.filename, { type: 'image/jpeg' })
        }))

        await (navigator as any).share({
          title: 'Field Documentation',
          text: `Sharing ${files.length} field documentation images`,
          files
        })
      } else {
        // Fallback: Download as ZIP or individual files
        for (const image of imagesToShare) {
          const link = document.createElement('a')
          link.href = image.dataUrl
          link.download = image.metadata.filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }
      
      console.log(`[Camera] Shared ${imagesToShare.length} images`)
    } catch (error) {
      console.error('[Camera] Failed to share images:', error)
      throw error
    }
  }, [getSavedImages])

  const getStorageUsage = useCallback(async () => {
    try {
      const images = await offlineStorage.getAll('captured-images') as CapturedImage[]
      const totalSize = images.reduce((sum, img) => sum + img.metadata.size, 0)
      
      return {
        count: images.length,
        totalSize,
        formattedSize: formatBytes(totalSize)
      }
    } catch (error) {
      console.error('[Camera] Failed to get storage usage:', error)
      return { count: 0, totalSize: 0, formattedSize: '0 B' }
    }
  }, [])

  const cleanupOldImages = useCallback(async (daysToKeep: number = 30) => {
    try {
      const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
      const images = await offlineStorage.getAll('captured-images') as CapturedImage[]
      
      const imagesToDelete = images.filter(img => img.timestamp < cutoffDate)
      
      for (const image of imagesToDelete) {
        await offlineStorage.delete('captured-images', image.id)
      }
      
      setSavedImages(prev => prev.filter(img => img.timestamp >= cutoffDate))
      
      console.log(`[Camera] Cleaned up ${imagesToDelete.length} old images`)
      return imagesToDelete.length
    } catch (error) {
      console.error('[Camera] Failed to cleanup old images:', error)
      return 0
    }
  }, [])

  return {
    // State
    isOpen,
    savedImages,
    isSaving,

    // Actions
    openCamera,
    closeCamera,
    handleCapture,
    getSavedImages,
    deleteImage,
    shareImages,

    // Utilities
    getStorageUsage,
    cleanupOldImages
  }
}

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}