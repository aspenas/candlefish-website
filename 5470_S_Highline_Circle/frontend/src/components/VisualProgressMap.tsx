import React, { useState, useCallback, useEffect } from 'react';
import { CheckCircleIcon, PlayIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Room, Item } from '../types';

interface FloorPlan {
  name: string;
  rooms: RoomLayout[];
  background?: string;
}

interface RoomLayout {
  id: string;
  name: string;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage width
  height: number; // percentage height
  shape?: 'rectangle' | 'circle' | 'polygon';
  points?: string; // for polygon shapes
}

interface VisualProgressMapProps {
  rooms: Room[];
  items: Item[];
  onRoomSelected: (roomId: string) => void;
  selectedRoomId?: string;
  className?: string;
}

// Floor plan layout for 5470 S Highline Circle
const FLOOR_PLANS: Record<string, FloorPlan> = {
  'Lower Level': {
    name: 'Lower Level',
    rooms: [
      { id: 'rec-room', name: 'Rec Room', x: 10, y: 20, width: 35, height: 30 },
      { id: 'wine-room', name: 'Wine Room', x: 50, y: 15, width: 20, height: 25 },
      { id: 'theater', name: 'Theater', x: 75, y: 20, width: 20, height: 35 },
      { id: 'exercise-room', name: 'Exercise Room', x: 15, y: 60, width: 30, height: 25 }
    ]
  },
  'Main Floor': {
    name: 'Main Floor',
    rooms: [
      { id: 'foyer', name: 'Foyer', x: 45, y: 10, width: 10, height: 15 },
      { id: 'living-room', name: 'Living Room', x: 15, y: 30, width: 25, height: 25 },
      { id: 'dining-room', name: 'Dining Room', x: 45, y: 30, width: 20, height: 20 },
      { id: 'kitchen', name: 'Kitchen', x: 70, y: 25, width: 25, height: 30 },
      { id: 'grand-room', name: 'Grand Room', x: 10, y: 60, width: 30, height: 25 },
      { id: 'hearth-room', name: 'Hearth Room', x: 45, y: 60, width: 25, height: 25 },
      { id: 'office', name: 'Office', x: 75, y: 65, width: 20, height: 20 }
    ]
  },
  'Upper Floor': {
    name: 'Upper Floor',
    rooms: [
      { id: 'primary-bedroom', name: 'Primary Bedroom', x: 15, y: 25, width: 30, height: 30 },
      { id: 'primary-bathroom', name: 'Primary Bathroom', x: 50, y: 25, width: 20, height: 20 },
      { id: 'guest-bedroom', name: 'Guest Bedroom', x: 75, y: 25, width: 20, height: 25 },
      { id: 'kids-room', name: 'Kids Room', x: 30, y: 65, width: 25, height: 20 }
    ]
  },
  'Outdoor': {
    name: 'Outdoor',
    rooms: [
      { id: 'deck', name: 'Deck', x: 15, y: 20, width: 25, height: 20 },
      { id: 'patio', name: 'Patio', x: 45, y: 25, width: 20, height: 25 },
      { id: 'garden', name: 'Garden', x: 70, y: 15, width: 25, height: 35 },
      { id: 'pool-area', name: 'Pool Area', x: 20, y: 60, width: 40, height: 25 },
      { id: 'driveway', name: 'Driveway', x: 70, y: 70, width: 25, height: 15 }
    ]
  },
  'Garage': {
    name: 'Garage',
    rooms: [
      { id: 'garage', name: 'Garage', x: 25, y: 35, width: 50, height: 30 }
    ]
  }
};

const VisualProgressMap: React.FC<VisualProgressMapProps> = ({
  rooms,
  items,
  onRoomSelected,
  selectedRoomId,
  className = ''
}) => {
  const [selectedFloor, setSelectedFloor] = useState<string>('Main Floor');
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  // Get room progress data
  const getRoomProgress = useCallback((roomId: string) => {
    const roomItems = items.filter(item => item.room_id === roomId);
    const itemsWithPhotos = roomItems.filter(item => item.images && item.images.length > 0);
    const totalPhotos = roomItems.reduce((sum, item) => sum + (item.images?.length || 0), 0);

    return {
      totalItems: roomItems.length,
      itemsWithPhotos: itemsWithPhotos.length,
      totalPhotos,
      progressPercent: roomItems.length > 0 ? Math.round((itemsWithPhotos.length / roomItems.length) * 100) : 0,
      status: roomItems.length === 0 ? 'empty' :
              itemsWithPhotos.length === roomItems.length ? 'complete' :
              itemsWithPhotos.length > 0 ? 'in-progress' : 'not-started'
    };
  }, [items]);

  // Get room color based on progress
  const getRoomColor = useCallback((status: string, isSelected: boolean, isHovered: boolean) => {
    const baseColors = {
      'complete': isSelected ? 'bg-green-600' : 'bg-green-500',
      'in-progress': isSelected ? 'bg-yellow-600' : 'bg-yellow-500',
      'not-started': isSelected ? 'bg-red-600' : 'bg-red-500',
      'empty': isSelected ? 'bg-gray-600' : 'bg-gray-400'
    };

    const hoverColors = {
      'complete': 'bg-green-600',
      'in-progress': 'bg-yellow-600',
      'not-started': 'bg-red-600',
      'empty': 'bg-gray-600'
    };

    if (isHovered) return hoverColors[status as keyof typeof hoverColors];
    return baseColors[status as keyof typeof baseColors];
  }, []);

  // Find actual room by matching name
  const findRoomByLayoutId = useCallback((layoutId: string, floorName: string) => {
    const layoutRoom = FLOOR_PLANS[floorName]?.rooms.find(r => r.id === layoutId);
    return rooms.find(room => room.name.toLowerCase().replace(/\s+/g, '-') === layoutId ||
                              room.name === layoutRoom?.name);
  }, [rooms]);

  const currentFloorPlan = FLOOR_PLANS[selectedFloor];
  const floors = Object.keys(FLOOR_PLANS);

  // Get overall progress
  const overallProgress = React.useMemo(() => {
    const totalItems = items.length;
    const itemsWithPhotos = items.filter(item => item.images && item.images.length > 0).length;
    return {
      totalItems,
      itemsWithPhotos,
      percent: totalItems > 0 ? Math.round((itemsWithPhotos / totalItems) * 100) : 0
    };
  }, [items]);

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">5470 S Highline Circle</h2>
            <p className="text-sm text-gray-600">Visual Progress Map</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{overallProgress.percent}%</div>
            <div className="text-sm text-gray-500">
              {overallProgress.itemsWithPhotos} of {overallProgress.totalItems} items
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress.percent}%` }}
          />
        </div>
      </div>

      {/* Floor Selection */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          {floors.map(floor => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedFloor === floor
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      {/* Floor Plan */}
      <div className="p-6">
        <div className="relative bg-gray-50 rounded-lg border-2 border-gray-200" style={{ height: '400px' }}>
          {/* Floor Plan Title */}
          <div className="absolute top-2 left-2 text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded shadow">
            {currentFloorPlan?.name}
          </div>

          {/* Room Layouts */}
          {currentFloorPlan?.rooms.map(roomLayout => {
            const actualRoom = findRoomByLayoutId(roomLayout.id, selectedFloor);
            const progress = actualRoom ? getRoomProgress(actualRoom.id) : {
              totalItems: 0,
              itemsWithPhotos: 0,
              totalPhotos: 0,
              progressPercent: 0,
              status: 'empty'
            };

            const isSelected = actualRoom?.id === selectedRoomId;
            const isHovered = hoveredRoom === roomLayout.id;
            const roomColor = getRoomColor(progress.status, isSelected, isHovered);

            return (
              <div
                key={roomLayout.id}
                className={`absolute cursor-pointer transition-all duration-200 rounded-lg border-2 ${roomColor} ${
                  isSelected ? 'border-indigo-800 shadow-lg' : 'border-transparent hover:border-gray-400'
                } ${isHovered ? 'scale-105 z-10' : ''}`}
                style={{
                  left: `${roomLayout.x}%`,
                  top: `${roomLayout.y}%`,
                  width: `${roomLayout.width}%`,
                  height: `${roomLayout.height}%`,
                }}
                onClick={() => actualRoom && onRoomSelected(actualRoom.id)}
                onMouseEnter={() => setHoveredRoom(roomLayout.id)}
                onMouseLeave={() => setHoveredRoom(null)}
              >
                {/* Room Content */}
                <div className="h-full flex flex-col items-center justify-center text-white text-xs font-medium p-1 relative overflow-hidden">
                  {/* Status Icon */}
                  <div className="absolute top-1 right-1">
                    {progress.status === 'complete' && (
                      <CheckCircleIcon className="h-4 w-4 text-white" />
                    )}
                    {progress.status === 'in-progress' && (
                      <PlayIcon className="h-4 w-4 text-white" />
                    )}
                    {progress.status === 'not-started' && (
                      <XMarkIcon className="h-4 w-4 text-white" />
                    )}
                    {progress.totalPhotos > 0 && (
                      <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {progress.totalPhotos}
                      </div>
                    )}
                  </div>

                  {/* Room Name */}
                  <div className="text-center">
                    <div className="font-semibold">{roomLayout.name}</div>
                    <div className="text-xs opacity-90">
                      {progress.itemsWithPhotos}/{progress.totalItems}
                    </div>
                    {progress.totalItems > 0 && (
                      <div className="text-xs opacity-75">
                        {progress.progressPercent}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover Tooltip */}
                {isHovered && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-20">
                    <div className="bg-black bg-opacity-90 text-white p-2 rounded text-xs whitespace-nowrap">
                      <div className="font-semibold">{roomLayout.name}</div>
                      <div>Items: {progress.totalItems}</div>
                      <div>With Photos: {progress.itemsWithPhotos}</div>
                      <div>Total Photos: {progress.totalPhotos}</div>
                      <div>Progress: {progress.progressPercent}%</div>
                      {actualRoom && (
                        <div className="mt-1 text-blue-300">Click to start photo session</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Complete</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">Not Started</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span className="text-sm text-gray-600">No Items</span>
          </div>
        </div>

        {/* Room Details List for Mobile */}
        <div className="mt-6 block md:hidden">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Rooms on {selectedFloor}</h4>
          <div className="space-y-2">
            {currentFloorPlan?.rooms.map(roomLayout => {
              const actualRoom = findRoomByLayoutId(roomLayout.id, selectedFloor);
              const progress = actualRoom ? getRoomProgress(actualRoom.id) : {
                totalItems: 0,
                itemsWithPhotos: 0,
                totalPhotos: 0,
                progressPercent: 0,
                status: 'empty'
              };

              if (!actualRoom) return null;

              return (
                <button
                  key={roomLayout.id}
                  onClick={() => onRoomSelected(actualRoom.id)}
                  className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getRoomColor(progress.status, false, false)}`}></div>
                      <div>
                        <div className="font-medium text-gray-900">{roomLayout.name}</div>
                        <div className="text-sm text-gray-500">
                          {progress.itemsWithPhotos}/{progress.totalItems} items
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{progress.progressPercent}%</div>
                      {progress.totalPhotos > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <PhotoIcon className="h-3 w-3 mr-1" />
                          {progress.totalPhotos}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualProgressMap;
