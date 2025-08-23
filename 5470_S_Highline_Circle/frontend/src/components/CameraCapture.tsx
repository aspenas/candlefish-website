import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  CameraIcon,
  PhotoIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { CapturedPhoto, PhotoAngle, PhotoMetadata } from '../types';

interface CameraCaptureProps {
  onPhotoCapture: (photo: CapturedPhoto) => void;
  currentAngle: PhotoAngle;
  itemId: string;
  autoAdvance?: boolean;
  settings: {
    compressionQuality: number;
    maxResolution: number;
  };
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onPhotoCapture,
  currentAngle,
  itemId,
  autoAdvance = true,
  settings
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect device type
  const getDeviceType = useCallback((): 'mobile' | 'tablet' | 'desktop' => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile/.test(userAgent)) return 'mobile';
    if (/tablet|ipad/.test(userAgent)) return 'tablet';
    return 'desktop';
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: settings.maxResolution, max: 3840 },
          height: { ideal: Math.round(settings.maxResolution * 0.75), max: 2160 }
        }
      };

      // Add torch/flash constraint for mobile devices
      if (flashEnabled && facingMode === 'environment') {
        (constraints.video as any).torch = true;
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError('Unable to access camera. Please check permissions.');
    }
  }, [stream, facingMode, flashEnabled, settings.maxResolution]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Handle camera flip
  const flipCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (stream && facingMode === 'environment') {
      try {
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();

        if ('torch' in capabilities) {
          await videoTrack.applyConstraints({
            advanced: [{ torch: !flashEnabled }]
          });
          setFlashEnabled(!flashEnabled);
        }
      } catch (error) {
        console.error('Flash toggle error:', error);
      }
    }
  }, [stream, facingMode, flashEnabled]);

  // Compress image
  const compressImage = useCallback(async (
    canvas: HTMLCanvasElement,
    quality: number = 0.8
  ): Promise<{ blob: Blob; dataUrl: string }> => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({ blob, dataUrl });
        }
      }, 'image/jpeg', quality);
    });
  }, []);

  // Generate thumbnail
  const generateThumbnail = useCallback(async (canvas: HTMLCanvasElement): Promise<string> => {
    const thumbnailCanvas = document.createElement('canvas');
    const ctx = thumbnailCanvas.getContext('2d');
    if (!ctx) return '';

    const maxSize = 200;
    const ratio = Math.min(maxSize / canvas.width, maxSize / canvas.height);

    thumbnailCanvas.width = canvas.width * ratio;
    thumbnailCanvas.height = canvas.height * ratio;

    ctx.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

    return thumbnailCanvas.toDataURL('image/jpeg', 0.6);
  }, []);

  // Capture photo from video stream
  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Set canvas dimensions to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Compress image
      const { blob, dataUrl } = await compressImage(canvas, settings.compressionQuality);

      // Generate thumbnail
      const thumbnail = await generateThumbnail(canvas);

      // Create file from blob
      const file = new File([blob], `${itemId}_${currentAngle}_${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      const metadata: PhotoMetadata = {
        width: canvas.width,
        height: canvas.height,
        size: blob.size,
        quality: settings.compressionQuality,
        compression: 1 - (blob.size / (canvas.width * canvas.height * 3)),
        deviceType: getDeviceType()
      };

      const photo: CapturedPhoto = {
        id: crypto.randomUUID(),
        itemId,
        file,
        blob,
        dataUrl,
        thumbnail,
        angle: currentAngle,
        timestamp: new Date(),
        metadata,
        uploaded: false,
        compressed: true
      };

      setCapturedImage(dataUrl);
      setIsPreviewMode(true);

      // Auto-advance or show preview
      if (autoAdvance) {
        setTimeout(() => {
          onPhotoCapture(photo);
          setIsPreviewMode(false);
          setCapturedImage(null);
        }, 1500);
      } else {
        // Store photo temporarily for approval
        (window as any).tempPhoto = photo;
      }
    } catch (error) {
      console.error('Photo capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [itemId, currentAngle, settings, onPhotoCapture, autoAdvance, getDeviceType, compressImage, generateThumbnail]);

  // Handle file input (fallback for devices without camera)
  const handleFileInput = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Load image
      const img = new Image();
      img.onload = async () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize if needed
        let { width, height } = img;
        const maxDimension = settings.maxResolution;

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Process image
        const { blob, dataUrl } = await compressImage(canvas, settings.compressionQuality);
        const thumbnail = await generateThumbnail(canvas);

        const processedFile = new File([blob], `${itemId}_${currentAngle}_${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });

        const metadata: PhotoMetadata = {
          width,
          height,
          size: blob.size,
          quality: settings.compressionQuality,
          compression: 1 - (blob.size / (width * height * 3)),
          deviceType: getDeviceType()
        };

        const photo: CapturedPhoto = {
          id: crypto.randomUUID(),
          itemId,
          file: processedFile,
          blob,
          dataUrl,
          thumbnail,
          angle: currentAngle,
          timestamp: new Date(),
          metadata,
          uploaded: false,
          compressed: true
        };

        setCapturedImage(dataUrl);
        setIsPreviewMode(true);
        (window as any).tempPhoto = photo;
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('File processing error:', error);
    }
  }, [itemId, currentAngle, settings, getDeviceType, compressImage, generateThumbnail]);

  // Confirm captured photo
  const confirmPhoto = useCallback(() => {
    const photo = (window as any).tempPhoto as CapturedPhoto;
    if (photo) {
      onPhotoCapture(photo);
      setIsPreviewMode(false);
      setCapturedImage(null);
      delete (window as any).tempPhoto;
    }
  }, [onPhotoCapture]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setIsPreviewMode(false);
    setCapturedImage(null);
    delete (window as any).tempPhoto;
  }, []);

  // Restart camera if needed
  useEffect(() => {
    if (!isPreviewMode && !stream) {
      startCamera();
    }
  }, [isPreviewMode, stream, startCamera]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInput}
        className="hidden"
      />

      {cameraError ? (
        // Error state
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6">
          <CameraIcon className="h-16 w-16 text-gray-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Camera Error</h3>
          <p className="text-gray-400 text-center mb-6">{cameraError}</p>
          <div className="space-y-3">
            <button
              onClick={startCamera}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry Camera
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Choose from Files
            </button>
          </div>
        </div>
      ) : isPreviewMode && capturedImage ? (
        // Preview mode
        <div className="absolute inset-0">
          <img
            src={capturedImage}
            alt="Captured photo"
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
            <div className="flex justify-center space-x-6">
              <button
                onClick={retakePhoto}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <XMarkIcon className="h-5 w-5" />
                <span>Retake</span>
              </button>
              <button
                onClick={confirmPhoto}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <CheckIcon className="h-5 w-5" />
                <span>Use Photo</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Camera view
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Camera Controls Overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <div className="bg-black bg-opacity-50 rounded-lg px-3 py-2">
              <span className="text-white text-sm capitalize">{currentAngle} angle</span>
            </div>

            <div className="flex space-x-2">
              {facingMode === 'environment' && (
                <button
                  onClick={toggleFlash}
                  className={`p-2 rounded-full bg-black bg-opacity-50 ${
                    flashEnabled ? 'text-yellow-400' : 'text-white'
                  }`}
                >
                  {flashEnabled ? (
                    <SunIcon className="h-5 w-5" />
                  ) : (
                    <MoonIcon className="h-5 w-5" />
                  )}
                </button>
              )}

              <button
                onClick={flipCamera}
                className="p-2 rounded-full bg-black bg-opacity-50 text-white"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Capture Button */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <button
              onClick={captureFromCamera}
              disabled={isCapturing || !stream}
              className={`w-20 h-20 rounded-full border-4 border-white bg-transparent hover:bg-white hover:bg-opacity-20 transition-all ${
                isCapturing ? 'animate-pulse' : ''
              }`}
            >
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                {isCapturing ? (
                  <div className="w-8 h-8 border-4 border-gray-800 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CameraIcon className="h-8 w-8 text-gray-800" />
                )}
              </div>
            </button>
          </div>

          {/* Alternative file upload button */}
          <div className="absolute bottom-8 right-8">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
            >
              <PhotoIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Center focus indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white border-opacity-30 rounded-lg"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
