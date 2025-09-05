'use client';

import dynamic from 'next/dynamic';
import { memo } from 'react';

// Loading fallback component
const ThreeLoadingFallback = memo(() => (
  <div className="relative bg-[#1C1C1C] flex items-center justify-center animate-pulse" 
       style={{ height: '600px' }}>
    <div className="text-[#3FD3C6] font-mono text-xs opacity-80">
      <div className="mb-2">LOADING 3D VISUALIZATION...</div>
      <div className="text-[#415A77] text-center">Initializing WebGL Engine</div>
    </div>
  </div>
));

ThreeLoadingFallback.displayName = 'ThreeLoadingFallback';

// Lazy load Three.js components with optimized settings
export const LazyDimensionalRadar3D = dynamic(
  () => import('../assessment/dimensional-radar-3d').then(mod => ({ default: mod.DimensionalRadar3D })),
  {
    ssr: false,
    loading: () => <ThreeLoadingFallback />,
  }
);

export const LazyWebEnhancedHeroFish = dynamic(
  () => import('../WebEnhancedHeroFish'),
  {
    ssr: false,
    loading: () => (
      <div className="relative" style={{ height: 'clamp(180px, 25vh, 320px)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D1B2A] via-[#1B263B] to-[#415A77] animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[#3FD3C6] font-mono text-xs opacity-60">
            Initializing Fish Animation...
          </div>
        </div>
      </div>
    ),
  }
);

export const LazySystemArchitecture = dynamic(
  () => import('../SystemArchitecture'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#1B263B]/20 border border-[#415A77]/20">
        <div className="text-[#415A77] text-xs font-mono animate-pulse">LOADING ARCHITECTURE...</div>
      </div>
    ),
  }
);

export const LazyParticleField = dynamic(
  () => import('../assessment/particle-field'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-black/20 animate-pulse" />
    ),
  }
);

// Observatory components that are WebGL heavy
export const LazyOperationalObservatory = dynamic(
  () => import('../observatory/operational-observatory'),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-screen bg-black flex items-center justify-center">
        <div className="text-[#3FD3C6] font-mono text-sm">
          <div className="mb-4 text-center">OBSERVATORY LOADING...</div>
          <div className="text-[#415A77] text-xs text-center">Preparing Spatial Environment</div>
        </div>
      </div>
    ),
  }
);

// Workshop visualization components
export const LazyArchitectureVisualization = dynamic(
  () => import('../workshop/ArchitectureVisualization'),
  {
    ssr: false,
    loading: () => <ThreeLoadingFallback />,
  }
);

// Utility hook for checking WebGL support before loading heavy components
export const useWebGLSupport = () => {
  if (typeof window === 'undefined') return false;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
};

// Progressive enhancement wrapper
export const WithWebGLSupport = memo<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}>(({ children, fallback }) => {
  const hasWebGL = useWebGLSupport();
  
  if (!hasWebGL && fallback) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
});

WithWebGLSupport.displayName = 'WithWebGLSupport';