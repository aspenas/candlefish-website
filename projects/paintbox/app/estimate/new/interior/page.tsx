'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Home, Plus, Trash2, Palette, Square } from 'lucide-react';
import dynamic from 'next/dynamic';
// Conditionally import animations to reduce bundle size
const AnimationComponents = dynamic(
  () => import('@react-spring/web').then(mod => ({
    default: { animated: mod.animated, useSpring: mod.useSpring, useTransition: mod.useTransition }
  })),
  { ssr: false }
);
import { useEstimateStore } from '@/stores/useEstimateStore';

interface Room {
  id: string;
  name: string;
  width: number;
  length: number;
  height: number;
  condition: 'good' | 'fair' | 'poor';
  ceilingPaint: boolean;
  trimPaint: boolean;
  wallPaint: boolean;
}

const ROOM_TEMPLATES = [
  { name: 'Living Room', width: 15, length: 20, height: 9 },
  { name: 'Bedroom', width: 12, length: 14, height: 9 },
  { name: 'Kitchen', width: 10, length: 12, height: 9 },
  { name: 'Bathroom', width: 6, length: 8, height: 8 },
  { name: 'Dining Room', width: 12, length: 14, height: 9 },
  { name: 'Office', width: 10, length: 11, height: 9 },
];

export default function InteriorMeasurementPage() {
  const router = useRouter();
  const { estimate, updateInteriorInfo } = useEstimateStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(false);

  // Lazy load animations after component mount to reduce initial bundle size
  const [AnimationState, setAnimationState] = useState<any>(null);

  // Simplified animation state for memory optimization
  const simpleHeaderStyle = animationsEnabled ? {} : { opacity: 1 };
  const simpleTemplateStyle = showTemplates ? { opacity: 1 } : { opacity: 0 };

  const updateRoom = (id: string, field: keyof Room, value: any) => {
    setRooms(rooms.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const addRoom = (template?: typeof ROOM_TEMPLATES[0]) => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: template?.name || `Room ${rooms.length + 1}`,
      width: template?.width || 10,
      length: template?.length || 12,
      height: template?.height || 9,
      condition: 'good',
      ceilingPaint: true,
      trimPaint: true,
      wallPaint: true,
    };
    setRooms([...rooms, newRoom]);
    setShowTemplates(false);
  };

  const removeRoom = (id: string) => {
    setRooms(rooms.filter(r => r.id !== id));
  };

  const calculateRoomSqft = (room: Room) => {
    const wallArea = 2 * (room.width + room.length) * room.height;
    const ceilingArea = room.width * room.length;
    return {
      walls: wallArea,
      ceiling: ceilingArea,
      total: wallArea + (room.ceilingPaint ? ceilingArea : 0)
    };
  };

  const totalInteriorSqft = rooms.reduce((sum, room) => {
    const { total } = calculateRoomSqft(room);
    return sum + total;
  }, 0);

  const handleNext = () => {
    // Save to store
    updateInteriorInfo({
      rooms,
      totalSqft: totalInteriorSqft,
      totalRooms: rooms.length
    });
    router.push('/estimate/new/review');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-paintbox-primary/5 via-paintbox-background to-paintbox-accent/5">
      <div className="bg-white shadow-paintbox sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/estimate/new/exterior">
                <button className="p-2 hover:bg-paintbox-primary/10 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-paintbox-text" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-paintbox-text">Interior Measurements</h1>
                <p className="text-sm text-paintbox-text-muted">Step 3 of 4</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-paintbox-primary" />
              <span className="text-lg font-semibold text-paintbox-text">{totalInteriorSqft} sq ft</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= 3
                    ? 'bg-gradient-to-r from-paintbox-primary to-paintbox-accent'
                    : 'bg-paintbox-border'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="paintbox-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-paintbox-text">Interior Rooms</h2>
              <div className="relative">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="paintbox-btn paintbox-btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  Add Room
                </button>
                {showTemplates && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-paintbox-border p-2 z-10"
                  >
                    <button
                      onClick={() => addRoom()}
                      className="w-full text-left px-4 py-2 hover:bg-paintbox-primary/10 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-paintbox-text">Custom Room</div>
                      <div className="text-sm text-paintbox-text-muted">Add your own dimensions</div>
                    </button>
                    <div className="h-px bg-paintbox-border my-2" />
                    {ROOM_TEMPLATES.map((template) => (
                      <button
                        key={template.name}
                        onClick={() => addRoom(template)}
                        className="w-full text-left px-4 py-2 hover:bg-paintbox-primary/10 rounded-lg transition-colors"
                      >
                        <div className="font-medium text-paintbox-text">{template.name}</div>
                        <div className="text-sm text-paintbox-text-muted">
                          {template.width}' × {template.length}' × {template.height}'
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {rooms.length === 0 ? (
              <div className="text-center py-12">
                <Palette className="w-16 h-16 text-paintbox-primary/30 mx-auto mb-4" />
                <p className="text-paintbox-text-muted">No rooms added yet. Click "Add Room" to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="paintbox-section relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-paintbox-primary to-paintbox-accent" />

                    <div className="flex items-start justify-between mb-4">
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => updateRoom(room.id, 'name', e.target.value)}
                        className="text-lg font-semibold bg-transparent border-b-2 border-transparent hover:border-paintbox-border focus:border-paintbox-primary outline-none transition-colors"
                      />
                      <button
                        onClick={() => removeRoom(room.id)}
                        className="p-2 hover:bg-paintbox-error/10 rounded-lg transition-colors group"
                      >
                        <Trash2 className="w-4 h-4 text-paintbox-text-muted group-hover:text-paintbox-error" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className="paintbox-label">Width (ft)</label>
                        <input
                          type="number"
                          value={room.width}
                          onChange={(e) => updateRoom(room.id, 'width', parseFloat(e.target.value) || 0)}
                          className="paintbox-input"
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label className="paintbox-label">Length (ft)</label>
                        <input
                          type="number"
                          value={room.length}
                          onChange={(e) => updateRoom(room.id, 'length', parseFloat(e.target.value) || 0)}
                          className="paintbox-input"
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label className="paintbox-label">Height (ft)</label>
                        <input
                          type="number"
                          value={room.height}
                          onChange={(e) => updateRoom(room.id, 'height', parseFloat(e.target.value) || 0)}
                          className="paintbox-input"
                          min="0"
                          step="0.5"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="paintbox-label">Condition</label>
                      <select
                        value={room.condition}
                        onChange={(e) => updateRoom(room.id, 'condition', e.target.value as 'good' | 'fair' | 'poor')}
                        className="paintbox-input"
                      >
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>

                    <div className="space-y-2 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={room.wallPaint}
                          onChange={(e) => updateRoom(room.id, 'wallPaint', e.target.checked)}
                          className="w-4 h-4 text-paintbox-primary"
                        />
                        <span className="text-sm text-paintbox-text">Paint Walls</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={room.ceilingPaint}
                          onChange={(e) => updateRoom(room.id, 'ceilingPaint', e.target.checked)}
                          className="w-4 h-4 text-paintbox-primary"
                        />
                        <span className="text-sm text-paintbox-text">Paint Ceiling</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={room.trimPaint}
                          onChange={(e) => updateRoom(room.id, 'trimPaint', e.target.checked)}
                          className="w-4 h-4 text-paintbox-primary"
                        />
                        <span className="text-sm text-paintbox-text">Paint Trim</span>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-paintbox-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-paintbox-text-muted">Total Area:</span>
                        <span className="font-semibold text-paintbox-text">
                          {calculateRoomSqft(room).total} sq ft
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {rooms.length > 0 && (
            <div className="paintbox-card p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-paintbox-text">Total Interior Area</h3>
                  <p className="text-2xl font-bold paintbox-gradient-text">{totalInteriorSqft} sq ft</p>
                  <p className="text-sm text-paintbox-text-muted">{rooms.length} rooms</p>
                </div>
                <Square className="w-12 h-12 text-paintbox-primary/20" />
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Link href="/estimate/new/exterior">
              <button className="paintbox-btn paintbox-btn-secondary">
                Back
              </button>
            </Link>
            <button
              onClick={handleNext}
              className="paintbox-btn paintbox-btn-primary"
              disabled={rooms.length === 0}
            >
              Review Estimate
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
