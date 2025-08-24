'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, X, RotateCcw, FlashOff, Flash, Check, Loader } from 'lucide-react'

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

interface MobileCameraCaptureProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (images: CapturedImage[]) => void
  maxImages?: number
  jobId?: string
  operatorId?: string
  tags?: string[]
}

export function MobileCameraCapture({
  isOpen,
  onClose,
  onCapture,
  maxImages = 5,
  jobId,
  operatorId,
  tags = []
}: MobileCameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [location, setLocation] = useState<GeolocationPosition | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize camera when component opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera()
      getCurrentLocation()
    } else {
      cleanup()
    }

    return cleanup
  }, [isOpen, facingMode])

  const initializeCamera = async () => {
    try {
      setError(null)
      
      // Request camera permission
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Camera initialization failed:', err)
      setError('Camera access denied. Please enable camera permissions.')
    }
  }

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation(position),
        (err) => console.warn('Location access failed:', err)
      )
    }
  }

  const cleanup = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const toggleFlash = async () => {
    if (stream) {
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities()
      
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashEnabled } as any]
          })
          setFlashEnabled(!flashEnabled)
        } catch (err) {
          console.warn('Flash control failed:', err)
        }
      }
    }
  }

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return

    setIsCapturing(true)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) return

      // Set canvas size to video size
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Add timestamp overlay
      context.fillStyle = 'rgba(0, 0, 0, 0.7)'
      context.fillRect(10, canvas.height - 60, 300, 50)
      context.fillStyle = 'white'
      context.font = '14px monospace'
      context.fillText(
        new Date().toLocaleString(),
        20, 
        canvas.height - 30
      )

      // Add operator/job info if available
      if (operatorId || jobId) {
        context.fillText(
          `${operatorId ? `Op: ${operatorId}` : ''} ${jobId ? `Job: ${jobId}` : ''}`,
          20,
          canvas.height - 45
        )
      }

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      const timestamp = Date.now()

      const capturedImage: CapturedImage = {
        id: `img-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        dataUrl,
        timestamp,
        metadata: {
          filename: `candlefish-field-${timestamp}.jpg`,
          size: Math.round(dataUrl.length * 0.75), // Approximate size
          type: 'image/jpeg',
          location: location || undefined,
          operator: operatorId,
          jobId,
          tags: [...tags, 'field-documentation']
        }
      }

      setCapturedImages(prev => [...prev, capturedImage])

      // Flash effect
      if (videoRef.current) {
        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 9999;
          pointer-events: none;
        `
        document.body.appendChild(overlay)
        setTimeout(() => document.body.removeChild(overlay), 100)
      }

    } catch (error) {
      console.error('Image capture failed:', error)
      setError('Failed to capture image. Please try again.')
    } finally {
      setIsCapturing(false)
    }
  }

  const removeImage = (id: string) => {
    setCapturedImages(prev => prev.filter(img => img.id !== id))
  }

  const handleSave = () => {
    if (capturedImages.length > 0) {
      onCapture(capturedImages)
      setCapturedImages([])
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/20 active:bg-white/30"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-semibold">Field Documentation</h2>
          <p className="text-sm opacity-75">
            {capturedImages.length}/{maxImages} photos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Flash toggle */}
          <button
            onClick={toggleFlash}
            className="p-2 rounded-full hover:bg-white/20 active:bg-white/30"
          >
            {flashEnabled ? (
              <Flash className="w-5 h-5 text-yellow-400" />
            ) : (
              <FlashOff className="w-5 h-5" />
            )}
          </button>

          {/* Camera switch */}
          <button
            onClick={switchCamera}
            className="p-2 rounded-full hover:bg-white/20 active:bg-white/30"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        {error ? (
          <div className="flex items-center justify-center h-full bg-gray-900 text-white text-center p-8">
            <div>
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
              <p className="text-sm opacity-75 mb-4">{error}</p>
              <button
                onClick={initializeCamera}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Capture overlay */}
        {stream && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Grid overlay for composition */}
            <div className="absolute inset-4 border border-white/30">
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
              <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/30" />
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
              <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/30" />
            </div>

            {/* Location indicator */}
            {location && (
              <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs">
                📍 Location captured
              </div>
            )}

            {/* Job/Operator info */}
            {(jobId || operatorId) && (
              <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs">
                {operatorId && <div>Op: {operatorId}</div>}
                {jobId && <div>Job: {jobId}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Captured Images Strip */}
      {capturedImages.length > 0 && (
        <div className="bg-black/80 p-4">
          <div className="flex gap-2 overflow-x-auto">
            {capturedImages.map((image) => (
              <div key={image.id} className="relative flex-shrink-0">
                <img
                  src={image.dataUrl}
                  alt={`Captured ${image.id}`}
                  className="w-16 h-16 object-cover rounded border border-white/30"
                />
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="bg-black/80 p-6">
        <div className="flex items-center justify-between">
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={capturedImages.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg disabled:bg-gray-600 disabled:opacity-50 hover:bg-green-700 active:bg-green-800 transition-colors"
          >
            <Check className="w-5 h-5" />
            Save ({capturedImages.length})
          </button>

          {/* Capture button */}
          <button
            onClick={captureImage}
            disabled={isCapturing || capturedImages.length >= maxImages || !stream}
            className="w-20 h-20 bg-white border-4 border-gray-300 rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            {isCapturing ? (
              <Loader className="w-8 h-8 text-gray-600 animate-spin" />
            ) : (
              <div className="w-14 h-14 bg-white border-2 border-gray-400 rounded-full" />
            )}
          </button>

          {/* Spacer */}
          <div className="w-20" />
        </div>
      </div>
    </div>
  )
}