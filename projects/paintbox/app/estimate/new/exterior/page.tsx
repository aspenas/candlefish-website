'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Home, Plus, Minus, Camera, Save } from 'lucide-react';
import { animated, useSpring, useTrail } from '@react-spring/web';
import { useEstimateStore } from '@/stores/useEstimateStore';
import { CompanyCamGallery } from '@/components/ui/CompanyCamGallery';

interface Surface {
  id: string;
  name: string;
  sqft: number;
  stories: number;
  condition: 'good' | 'fair' | 'poor';
}

export default function ExteriorMeasurementPage() {
  const router = useRouter();
  const { estimate, updateExteriorInfo } = useEstimateStore();
  const [surfaces, setSurfaces] = useState<Surface[]>([
    { id: '1', name: 'Front Wall', sqft: 0, stories: 1, condition: 'good' },
    { id: '2', name: 'Back Wall', sqft: 0, stories: 1, condition: 'good' },
    { id: '3', name: 'Left Side', sqft: 0, stories: 1, condition: 'good' },
    { id: '4', name: 'Right Side', sqft: 0, stories: 1, condition: 'good' },
  ]);

  const headerSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { duration: 600 }
  });

  const trail = useTrail(surfaces.length, {
    from: { opacity: 0, transform: 'translateX(-20px)' },
    to: { opacity: 1, transform: 'translateX(0px)' },
    config: { tension: 200, friction: 20 }
  });

  const updateSurface = (id: string, field: keyof Surface, value: any) => {
    setSurfaces(surfaces.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const addSurface = () => {
    const newSurface: Surface = {
      id: Date.now().toString(),
      name: `Surface ${surfaces.length + 1}`,
      sqft: 0,
      stories: 1,
      condition: 'good'
    };
    setSurfaces([...surfaces, newSurface]);
  };

  const removeSurface = (id: string) => {
    if (surfaces.length > 1) {
      setSurfaces(surfaces.filter(s => s.id !== id));
    }
  };

  const handleNext = () => {
    // Save to store
    updateExteriorInfo({
      surfaces,
      totalSqft: surfaces.reduce((sum, s) => sum + s.sqft, 0),
      totalStories: Math.max(...surfaces.map(s => s.stories))
    });
    router.push('/estimate/new/interior');
  };

  const totalSqft = surfaces.reduce((sum, s) => sum + s.sqft, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-paintbox-primary/5 via-paintbox-background to-paintbox-accent/5">
      <animated.div style={headerSpring} className="bg-white shadow-paintbox sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/estimate/new/details">
                <button className="p-2 hover:bg-paintbox-primary/10 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-paintbox-text" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-paintbox-text">Exterior Measurements</h1>
                <p className="text-sm text-paintbox-text-muted">Step 2 of 4</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-paintbox-primary" />
              <span className="text-lg font-semibold text-paintbox-text">{totalSqft} sq ft</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= 2
                    ? 'bg-gradient-to-r from-paintbox-primary to-paintbox-accent'
                    : 'bg-paintbox-border'
                }`}
              />
            ))}
          </div>
        </div>
      </animated.div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="paintbox-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-paintbox-text">Exterior Surfaces</h2>
              <button
                onClick={addSurface}
                className="paintbox-btn paintbox-btn-secondary"
              >
                <Plus className="w-4 h-4" />
                Add Surface
              </button>
            </div>

            <div className="space-y-4">
              {trail.map((style, index) => (
                <animated.div
                  key={surfaces[index].id}
                  style={style}
                  className="paintbox-section"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="paintbox-label">Surface Name</label>
                      <input
                        type="text"
                        value={surfaces[index].name}
                        onChange={(e) => updateSurface(surfaces[index].id, 'name', e.target.value)}
                        className="paintbox-input"
                      />
                    </div>
                    <div>
                      <label className="paintbox-label">Square Feet</label>
                      <input
                        type="number"
                        value={surfaces[index].sqft}
                        onChange={(e) => updateSurface(surfaces[index].id, 'sqft', parseInt(e.target.value) || 0)}
                        className="paintbox-input"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="paintbox-label">Stories</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateSurface(surfaces[index].id, 'stories', Math.max(1, surfaces[index].stories - 1))}
                          className="p-2 hover:bg-paintbox-primary/10 rounded-lg transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 py-2 paintbox-input text-center">{surfaces[index].stories}</span>
                        <button
                          onClick={() => updateSurface(surfaces[index].id, 'stories', surfaces[index].stories + 1)}
                          className="p-2 hover:bg-paintbox-primary/10 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="paintbox-label">Condition</label>
                      <select
                        value={surfaces[index].condition}
                        onChange={(e) => updateSurface(surfaces[index].id, 'condition', e.target.value as 'good' | 'fair' | 'poor')}
                        className="paintbox-input"
                      >
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                  </div>
                  {surfaces.length > 1 && (
                    <button
                      onClick={() => removeSurface(surfaces[index].id)}
                      className="mt-4 text-paintbox-error hover:text-paintbox-error/80 transition-colors text-sm"
                    >
                      Remove Surface
                    </button>
                  )}
                </animated.div>
              ))}
            </div>
          </div>

          <div className="paintbox-card p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-paintbox-text">Total Exterior Area</h3>
                <p className="text-2xl font-bold paintbox-gradient-text">{totalSqft} sq ft</p>
              </div>
            </div>

            {/* CompanyCam Gallery */}
            <CompanyCamGallery />
          </div>

          <div className="flex justify-between">
            <Link href="/estimate/new/details">
              <button className="paintbox-btn paintbox-btn-secondary">
                Back
              </button>
            </Link>
            <button
              onClick={handleNext}
              className="paintbox-btn paintbox-btn-primary"
              disabled={totalSqft === 0}
            >
              Continue to Interior
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
