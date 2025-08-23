import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PhotoIcon,
  CameraIcon,
  QrCodeIcon,
  CheckCircleIcon,
  PauseIcon,
  PlayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  TrashIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { Item, Room, PhotoSession, CapturedPhoto, PhotoAngle, PhotoCaptureSettings } from '../types';
import { format } from '../utils/format';
import CameraCapture from './CameraCapture';

interface PhotoCaptureWorkflowProps {
  items: Item[];
  rooms: Room[];
  onPhotosUpdated: (itemId: string, photos: CapturedPhoto[]) => void;
  onSessionSaved: (session: PhotoSession) => void;
}

const PhotoCaptureWorkflow: React.FC<PhotoCaptureWorkflowProps> = ({
  items,
  rooms,
  onPhotosUpdated,
  onSessionSaved
}) => {
  const [currentSession, setCurrentSession] = useState<PhotoSession | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [settings, setSettings] = useState<PhotoCaptureSettings>({
    multipleAngles: true,
    autoAdvance: true,
    compressionQuality: 0.8,
    maxResolution: 1920,
    requireConfirmation: false,
    saveToLocal: true,
    autoUpload: false
  });
  const [currentAngle, setCurrentAngle] = useState<PhotoAngle>('main');
  const [capturedPhotosForCurrentItem, setCapturedPhotosForCurrentItem] = useState<CapturedPhoto[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [captureMode, setCaptureMode] = useState<'batch' | 'qr' | 'bulk'>('batch');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Session management
  const startPhotoSession = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    const roomItems = items.filter(item => item.room_id === roomId);

    if (!room || roomItems.length === 0) return;

    const session: PhotoSession = {
      id: crypto.randomUUID(),
      roomId,
      roomName: room.name,
      itemsTotal: roomItems.length,
      itemsCaptured: 0,
      currentItemIndex: 0,
      startTime: new Date(),
      lastSaveTime: new Date(),
      status: 'active',
      photos: new Map()
    };

    setCurrentSession(session);
    setIsFullscreen(true);
  }, [rooms, items]);

  const pauseSession = useCallback(() => {
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        status: 'paused' as const,
        lastSaveTime: new Date()
      };
      setCurrentSession(updatedSession);
      onSessionSaved(updatedSession);
    }
  }, [currentSession, onSessionSaved]);

  const resumeSession = useCallback(() => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        status: 'active'
      });
    }
  }, [currentSession]);

  const endSession = useCallback(() => {
    if (currentSession) {
      const completedSession = {
        ...currentSession,
        status: 'completed' as const,
        lastSaveTime: new Date()
      };
      onSessionSaved(completedSession);
      setCurrentSession(null);
      setIsFullscreen(false);
    }
  }, [currentSession, onSessionSaved]);

  // Get current item
  const getCurrentItem = useCallback((): Item | null => {
    if (!currentSession) return null;
    const roomItems = items.filter(item => item.room_id === currentSession.roomId);
    return roomItems[currentSession.currentItemIndex] || null;
  }, [currentSession, items]);

  const currentItem = getCurrentItem();

  // Progress calculation
  const getProgress = useCallback(() => {
    if (!currentSession) return { percent: 0, captured: 0, total: 0, remaining: 0 };
    return {
      percent: Math.round((currentSession.itemsCaptured / currentSession.itemsTotal) * 100),
      captured: currentSession.itemsCaptured,
      total: currentSession.itemsTotal,
      remaining: currentSession.itemsTotal - currentSession.itemsCaptured
    };
  }, [currentSession]);

  const progress = getProgress();

  // Estimated time remaining
  const getTimeEstimate = useCallback(() => {
    if (!currentSession || currentSession.itemsCaptured === 0) return null;

    const elapsed = new Date().getTime() - currentSession.startTime.getTime();
    const avgTimePerItem = elapsed / currentSession.itemsCaptured;
    const remainingMs = avgTimePerItem * progress.remaining;

    const remainingMinutes = Math.round(remainingMs / 60000);
    return remainingMinutes > 0 ? `${remainingMinutes}m remaining` : 'Almost done!';
  }, [currentSession, progress.remaining]);

  const timeEstimate = getTimeEstimate();

  // Handle photo capture from camera
  const handlePhotoCapture = useCallback((photo: CapturedPhoto) => {
    setCapturedPhotosForCurrentItem(prev => [...prev, photo]);

    if (currentSession) {
      const updatedPhotos = new Map(currentSession.photos);
      const itemPhotos = updatedPhotos.get(photo.itemId) || [];
      updatedPhotos.set(photo.itemId, [...itemPhotos, photo]);

      const updatedSession = {
        ...currentSession,
        photos: updatedPhotos,
        itemsCaptured: currentSession.itemsCaptured + 1,
        lastSaveTime: new Date()
      };

      setCurrentSession(updatedSession);
      onSessionSaved(updatedSession);
      onPhotosUpdated(photo.itemId, [...itemPhotos, photo]);

      // Auto-advance if enabled
      if (settings.autoAdvance) {
        setTimeout(() => {
          nextItem();
        }, 1500);
      }
    }
  }, [currentSession, settings.autoAdvance, onSessionSaved, onPhotosUpdated]);

  // Navigate to next item
  const nextItem = useCallback(() => {
    if (!currentSession) return;

    const roomItems = items.filter(item => item.room_id === currentSession.roomId);
    const nextIndex = Math.min(currentSession.currentItemIndex + 1, roomItems.length - 1);

    setCurrentSession(prev => prev ? {
      ...prev,
      currentItemIndex: nextIndex
    } : null);

    setCapturedPhotosForCurrentItem([]);
    setCurrentAngle('main');
  }, [currentSession, items]);

  // Navigate to previous item
  const previousItem = useCallback(() => {
    if (!currentSession) return;

    const prevIndex = Math.max(currentSession.currentItemIndex - 1, 0);

    setCurrentSession(prev => prev ? {
      ...prev,
      currentItemIndex: prevIndex
    } : null);

    setCapturedPhotosForCurrentItem([]);
    setCurrentAngle('main');
  }, [currentSession]);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'space-y-6'}`}>
      {!currentSession ? (
        <div className="bg-white shadow rounded-lg">
          {/* Session Setup */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Bulk Photo Capture</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Efficiently photograph your {items.length} inventory items
                </p>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Settings
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.multipleAngles}
                    onChange={(e) => setSettings(prev => ({ ...prev, multipleAngles: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Capture multiple angles</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoAdvance}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoAdvance: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-advance to next item</span>
                </label>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Image Quality</label>
                  <select
                    value={settings.compressionQuality}
                    onChange={(e) => setSettings(prev => ({ ...prev, compressionQuality: parseFloat(e.target.value) }))}
                    className="block w-full text-sm border-gray-300 rounded-md"
                  >
                    <option value={0.6}>Standard (60%)</option>
                    <option value={0.8}>High (80%)</option>
                    <option value={0.9}>Very High (90%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Max Resolution</label>
                  <select
                    value={settings.maxResolution}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxResolution: parseInt(e.target.value) }))}
                    className="block w-full text-sm border-gray-300 rounded-md"
                  >
                    <option value={1280}>1280px</option>
                    <option value={1920}>1920px</option>
                    <option value={2560}>2560px</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Capture Mode Selection */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setCaptureMode('batch')}
                className={`p-4 border rounded-lg text-left hover:border-indigo-500 transition-colors ${
                  captureMode === 'batch' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <CameraIcon className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Batch Photography</h4>
                    <p className="text-sm text-gray-500">Room-by-room guided capture</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setCaptureMode('qr')}
                className={`p-4 border rounded-lg text-left hover:border-indigo-500 transition-colors ${
                  captureMode === 'qr' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <QrCodeIcon className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">QR Label System</h4>
                    <p className="text-sm text-gray-500">Scan codes to link photos</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setCaptureMode('bulk')}
                className={`p-4 border rounded-lg text-left hover:border-indigo-500 transition-colors ${
                  captureMode === 'bulk' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <CloudArrowUpIcon className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Bulk Upload</h4>
                    <p className="text-sm text-gray-500">Upload and match existing photos</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Room Selection for Batch Mode */}
          {captureMode === 'batch' && (
            <div className="px-6 pb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Select Room to Photograph</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rooms.map(room => {
                  const roomItems = items.filter(item => item.room_id === room.id);
                  const photosNeeded = roomItems.filter(item => !item.images || item.images.length === 0);

                  return (
                    <button
                      key={room.id}
                      onClick={() => startPhotoSession(room.id)}
                      disabled={roomItems.length === 0}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        roomItems.length === 0
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                          : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{room.name}</h5>
                        <span className="text-xs text-gray-500">{room.floor}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>{roomItems.length} items</div>
                        {photosNeeded.length > 0 && (
                          <div className="text-orange-600 font-medium">
                            {photosNeeded.length} need photos
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Active Photo Session */
        <div className="h-screen flex flex-col bg-black text-white">
          {/* Session Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
            <div className="flex items-center space-x-4">
              <button
                onClick={endSession}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h3 className="font-medium">{currentSession.roomName}</h3>
                <p className="text-sm text-gray-400">
                  Item {currentSession.currentItemIndex + 1} of {currentSession.itemsTotal}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                {progress.percent}% • {timeEstimate}
              </div>
              {currentSession.status === 'active' ? (
                <button
                  onClick={pauseSession}
                  className="p-2 rounded-full bg-yellow-600 hover:bg-yellow-700"
                >
                  <PauseIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={resumeSession}
                  className="p-2 rounded-full bg-green-600 hover:bg-green-700"
                >
                  <PlayIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-gray-700">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          {/* Main Capture Area */}
          <div className="flex-1 flex flex-col">
            {currentItem && (
              <div className="flex-1 flex">
                {/* Item Information Panel - shows on larger screens */}
                <div className="hidden md:block w-80 bg-gray-800 p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-medium text-white">{currentItem.name}</h4>
                      {currentItem.description && (
                        <p className="text-sm text-gray-300 mt-1">{currentItem.description}</p>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Category:</span>
                        <span className="text-white">{currentItem.category}</span>
                      </div>
                      {currentItem.asking_price && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Asking Price:</span>
                          <span className="text-white">{format.currency(currentItem.asking_price)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Decision:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          currentItem.decision === 'Sell' ? 'bg-green-600' :
                          currentItem.decision === 'Keep' ? 'bg-blue-600' :
                          'bg-yellow-600'
                        }`}>
                          {currentItem.decision}
                        </span>
                      </div>
                    </div>

                    {/* Photo Requirements */}
                    <div className="border-t border-gray-700 pt-4">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Photo Angles</h5>
                      <div className="space-y-2">
                        {(['main', 'detail', 'label'] as PhotoAngle[]).map(angle => (
                          <div key={angle} className="flex items-center justify-between">
                            <span className="text-sm text-gray-400 capitalize">{angle}</span>
                            <CheckCircleIcon className="h-4 w-4 text-gray-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Camera Capture Area */}
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 bg-black relative">
                    {currentItem && (
                      <CameraCapture
                        onPhotoCapture={handlePhotoCapture}
                        currentAngle={currentAngle}
                        itemId={currentItem.id}
                        autoAdvance={settings.autoAdvance}
                        settings={{
                          compressionQuality: settings.compressionQuality,
                          maxResolution: settings.maxResolution
                        }}
                      />
                    )}
                  </div>

                  {/* Capture Controls */}
                  <div className="bg-gray-900 p-4">
                    {/* Angle Selection */}
                    {settings.multipleAngles && (
                      <div className="flex justify-center mb-4">
                        <div className="bg-black bg-opacity-50 rounded-lg p-2">
                          <div className="flex space-x-2">
                            {(['main', 'detail', 'label'] as PhotoAngle[]).map(angle => (
                              <button
                                key={angle}
                                onClick={() => setCurrentAngle(angle)}
                                className={`px-3 py-1 rounded text-sm transition-colors ${
                                  currentAngle === angle
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                                }`}
                              >
                                {angle.charAt(0).toUpperCase() + angle.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Captured Photos Preview */}
                    {capturedPhotosForCurrentItem.length > 0 && (
                      <div className="flex justify-center mb-4">
                        <div className="flex space-x-2">
                          {capturedPhotosForCurrentItem.map(photo => (
                            <img
                              key={photo.id}
                              src={photo.thumbnail}
                              alt={`${photo.angle} angle`}
                              className="w-12 h-12 object-cover rounded border-2 border-green-500"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={previousItem}
                        disabled={currentSession.currentItemIndex === 0}
                        className="flex items-center space-x-2 text-gray-400 hover:text-white disabled:opacity-50"
                      >
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span>Previous</span>
                      </button>

                      <div className="text-center">
                        <div className="text-white font-medium">
                          {currentItem?.name}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {capturedPhotosForCurrentItem.length} photos captured
                        </div>
                      </div>

                      <button
                        onClick={nextItem}
                        disabled={currentSession.currentItemIndex >= currentSession.itemsTotal - 1}
                        className="flex items-center space-x-2 text-gray-400 hover:text-white disabled:opacity-50"
                      >
                        <span>Next</span>
                        <ArrowRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoCaptureWorkflow;
