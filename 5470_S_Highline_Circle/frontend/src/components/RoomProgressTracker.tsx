import React, { useState, useCallback, useEffect } from 'react';
import {
  CheckCircleIcon,
  PhotoIcon,
  CameraIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Room, Item, CapturedPhoto } from '../types';

interface RoomProgressTrackerProps {
  room: Room;
  items: Item[];
  onItemSelected?: (itemId: string) => void;
  onStartPhotoSession?: (itemId: string) => void;
  selectedItemId?: string;
  recentPhotos?: CapturedPhoto[];
  className?: string;
}

interface ItemProgress {
  id: string;
  name: string;
  category: string;
  photosNeeded: number;
  photosCaptures: number;
  status: 'complete' | 'partial' | 'none';
  recentPhotos: CapturedPhoto[];
  lastPhotoTaken?: Date;
}

const RoomProgressTracker: React.FC<RoomProgressTrackerProps> = ({
  room,
  items,
  onItemSelected,
  onStartPhotoSession,
  selectedItemId,
  recentPhotos = [],
  className = ''
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'recent'>('progress');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'partial' | 'none'>('all');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // Calculate item progress
  const getItemProgress = useCallback((item: Item): ItemProgress => {
    const itemPhotos = item.images || [];
    const itemRecentPhotos = recentPhotos.filter(p => p.itemId === item.id);

    // Standard photo requirements: main, detail, label (if needed)
    const requiredPhotos = 3;
    const currentPhotos = itemPhotos.length + itemRecentPhotos.length;

    let status: 'complete' | 'partial' | 'none' = 'none';
    if (currentPhotos >= requiredPhotos) {
      status = 'complete';
    } else if (currentPhotos > 0) {
      status = 'partial';
    }

    // Find most recent photo timestamp
    const allPhotos = [
      ...itemPhotos.map(img => new Date(img.uploaded_at)),
      ...itemRecentPhotos.map(p => p.timestamp)
    ];
    const lastPhotoTaken = allPhotos.length > 0 ? new Date(Math.max(...allPhotos.map(d => d.getTime()))) : undefined;

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      photosNeeded: requiredPhotos,
      photosCaptures: currentPhotos,
      status,
      recentPhotos: itemRecentPhotos,
      lastPhotoTaken
    };
  }, [recentPhotos]);

  // Get all item progress
  const itemProgress = items.map(getItemProgress);

  // Filter and sort items
  const filteredItems = itemProgress
    .filter(item => {
      if (filterStatus === 'all') return true;
      return item.status === filterStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'progress':
          if (a.status !== b.status) {
            const statusOrder = { 'none': 0, 'partial': 1, 'complete': 2 };
            return statusOrder[a.status] - statusOrder[b.status];
          }
          return b.photosCaptures - a.photosCaptures;
        case 'recent':
          const aTime = a.lastPhotoTaken?.getTime() || 0;
          const bTime = b.lastPhotoTaken?.getTime() || 0;
          return bTime - aTime;
        default:
          return 0;
      }
    });

  // Calculate room statistics
  const roomStats = {
    totalItems: items.length,
    completeItems: itemProgress.filter(i => i.status === 'complete').length,
    partialItems: itemProgress.filter(i => i.status === 'partial').length,
    noneItems: itemProgress.filter(i => i.status === 'none').length,
    totalPhotos: itemProgress.reduce((sum, item) => sum + item.photosCaptures, 0),
    progressPercent: items.length > 0 ? Math.round((itemProgress.filter(i => i.status === 'complete').length / items.length) * 100) : 0
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-50 border-green-200';
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'none': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Navigate between items
  const navigateItem = (direction: 'prev' | 'next') => {
    setCurrentItemIndex(prev => {
      if (direction === 'next') {
        return Math.min(prev + 1, filteredItems.length - 1);
      } else {
        return Math.max(prev - 1, 0);
      }
    });
  };

  const currentItem = filteredItems[currentItemIndex];

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{room.name}</h3>
            <p className="text-sm text-gray-600">{room.floor} • Progress Tracker</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{roomStats.progressPercent}%</div>
            <div className="text-sm text-gray-500">
              {roomStats.completeItems}/{roomStats.totalItems} complete
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${roomStats.progressPercent}%` }}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-lg font-semibold text-green-600">{roomStats.completeItems}</div>
            <div className="text-xs text-green-600">Complete</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-lg font-semibold text-yellow-600">{roomStats.partialItems}</div>
            <div className="text-xs text-yellow-600">In Progress</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-lg font-semibold text-red-600">{roomStats.noneItems}</div>
            <div className="text-xs text-red-600">Not Started</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-lg font-semibold text-blue-600">{roomStats.totalPhotos}</div>
            <div className="text-xs text-blue-600">Total Photos</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Sort and Filter */}
          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="progress">Sort by Progress</option>
              <option value="name">Sort by Name</option>
              <option value="recent">Sort by Recent</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="all">All Items</option>
              <option value="none">Not Started</option>
              <option value="partial">In Progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateItem('prev')}
              disabled={currentItemIndex === 0}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-600">
              {currentItemIndex + 1} of {filteredItems.length}
            </span>
            <button
              onClick={() => navigateItem('next')}
              disabled={currentItemIndex >= filteredItems.length - 1}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Current Item Detail */}
      {currentItem && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h4 className="text-lg font-medium text-gray-900">{currentItem.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentItem.status)}`}>
                  {currentItem.status === 'complete' ? 'Complete' :
                   currentItem.status === 'partial' ? 'In Progress' : 'Not Started'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{currentItem.category}</p>

              {/* Photo Progress */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <PhotoIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {currentItem.photosCaptures}/{currentItem.photosNeeded} photos
                  </span>
                </div>
                {currentItem.lastPhotoTaken && (
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Last: {currentItem.lastPhotoTaken.toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 ml-4">
              {onItemSelected && (
                <button
                  onClick={() => onItemSelected(currentItem.id)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title="View Item Details"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              )}
              {onStartPhotoSession && (
                <button
                  onClick={() => onStartPhotoSession(currentItem.id)}
                  className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <CameraIcon className="h-4 w-4" />
                  <span className="text-sm">Photo Session</span>
                </button>
              )}
            </div>
          </div>

          {/* Photo Progress Visual */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Photo Progress</span>
              <span>{Math.round((currentItem.photosCaptures / currentItem.photosNeeded) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentItem.status === 'complete' ? 'bg-green-500' :
                  currentItem.status === 'partial' ? 'bg-yellow-500' : 'bg-gray-300'
                }`}
                style={{ width: `${(currentItem.photosCaptures / currentItem.photosNeeded) * 100}%` }}
              />
            </div>
          </div>

          {/* Recent Photos Preview */}
          {currentItem.recentPhotos.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Recent Photos</h5>
              <div className="flex space-x-2 overflow-x-auto">
                {currentItem.recentPhotos.slice(0, 5).map(photo => (
                  <div key={photo.id} className="flex-shrink-0">
                    <img
                      src={photo.thumbnail}
                      alt={`${photo.angle} angle`}
                      className="w-16 h-16 object-cover rounded border-2 border-green-500"
                    />
                    <div className="text-xs text-center text-gray-500 mt-1 capitalize">
                      {photo.angle}
                    </div>
                  </div>
                ))}
                {currentItem.recentPhotos.length > 5 && (
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <span className="text-xs text-gray-500">+{currentItem.recentPhotos.length - 5}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Item List */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          All Items ({filteredItems.length})
        </h4>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                index === currentItemIndex
                  ? 'border-indigo-500 bg-indigo-50'
                  : selectedItemId === item.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setCurrentItemIndex(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      item.status === 'complete' ? 'bg-green-500' :
                      item.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.category}</div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {item.photosCaptures}/{item.photosNeeded}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((item.photosCaptures / item.photosNeeded) * 100)}%
                  </div>
                </div>

                <div className="ml-3 flex items-center space-x-1">
                  {item.status === 'complete' && (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  )}
                  {item.recentPhotos.length > 0 && (
                    <div className="w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                      {item.recentPhotos.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all ${
                      item.status === 'complete' ? 'bg-green-500' :
                      item.status === 'partial' ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}
                    style={{ width: `${(item.photosCaptures / item.photosNeeded) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No items found matching your filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomProgressTracker;
