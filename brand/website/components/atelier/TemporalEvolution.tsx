'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useIsomorphicState, useClientOnlyTime } from '../../hooks/useIsomorphicState';

interface TemporalState {
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
  intensity: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  atmosphericPressure: number;
  cosmicAlignment: number;
}

// Static initial state to ensure SSR consistency
const STATIC_TEMPORAL_STATE: TemporalState = {
  timeOfDay: 'day',
  intensity: 0.5,
  season: 'spring',
  atmosphericPressure: 85.0, // Use whole number to avoid decimal precision issues
  cosmicAlignment: 0.5,
};

// Calculate temporal state based on current time (client-only)
const calculateTemporalState = (): TemporalState => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

  let timeOfDay: TemporalState['timeOfDay'];
  if (hour >= 5 && hour < 8) timeOfDay = 'dawn';
  else if (hour >= 8 && hour < 17) timeOfDay = 'day';
  else if (hour >= 17 && hour < 20) timeOfDay = 'dusk';
  else timeOfDay = 'night';

  let season: TemporalState['season'];
  if (dayOfYear < 79 || dayOfYear >= 355) season = 'winter';
  else if (dayOfYear < 172) season = 'spring';
  else if (dayOfYear < 266) season = 'summer';
  else season = 'autumn';

  return {
    timeOfDay,
    intensity: Math.sin((hour / 24) * Math.PI * 2) * 0.5 + 0.5,
    season,
    atmosphericPressure: 85.0, // Start with static value
    cosmicAlignment: Math.sin((dayOfYear / 365) * Math.PI * 2) * 0.5 + 0.5,
  };
};

export function TemporalEvolution() {
  const { isClient } = useClientOnlyTime();
  const [temporalState, isHydrated] = useIsomorphicState(
    STATIC_TEMPORAL_STATE,
    calculateTemporalState
  );
  const [dynamicState, setDynamicState] = useState(temporalState);

  // Update dynamic state when temporal state changes
  useEffect(() => {
    setDynamicState(temporalState);
  }, [temporalState]);

  // Dynamic updates only after client hydration
  useEffect(() => {
    if (!isClient || !isHydrated) return;

    const interval = setInterval(() => {
      setDynamicState(prev => ({
        ...prev,
        atmosphericPressure: Math.max(40, Math.min(100, prev.atmosphericPressure + (Math.random() - 0.5) * 5)),
        cosmicAlignment: prev.cosmicAlignment + Math.sin(Date.now() * 0.0001) * 0.01,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isClient, isHydrated]);

  const getTimeBasedGradient = () => {
    switch (dynamicState.timeOfDay) {
      case 'dawn':
        return 'radial-gradient(ellipse at center, rgba(255, 94, 77, 0.15) 0%, rgba(184, 115, 51, 0.08) 40%, transparent 70%)';
      case 'day':
        return 'radial-gradient(ellipse at center, rgba(248, 248, 242, 0.1) 0%, rgba(184, 115, 51, 0.05) 50%, transparent 80%)';
      case 'dusk':
        return 'radial-gradient(ellipse at center, rgba(184, 115, 51, 0.2) 0%, rgba(139, 69, 19, 0.1) 40%, transparent 70%)';
      case 'night':
        return 'radial-gradient(ellipse at center, rgba(63, 211, 198, 0.08) 0%, rgba(184, 115, 51, 0.03) 60%, transparent 90%)';
      default:
        return 'transparent';
    }
  };

  const getSeasonalParticles = () => {
    const baseCount = Math.floor(dynamicState.atmosphericPressure);

    switch (dynamicState.season) {
      case 'spring':
        return { count: baseCount + 20, color: 'rgba(144, 238, 144, 0.3)', size: 'small' };
      case 'summer':
        return { count: baseCount + 50, color: 'rgba(255, 215, 0, 0.4)', size: 'medium' };
      case 'autumn':
        return { count: baseCount + 30, color: 'rgba(210, 105, 30, 0.35)', size: 'large' };
      case 'winter':
        return { count: baseCount - 10, color: 'rgba(176, 196, 222, 0.25)', size: 'tiny' };
      default:
        return { count: baseCount, color: 'rgba(184, 115, 51, 0.3)', size: 'medium' };
    }
  };

  const seasonalData = getSeasonalParticles();

  return (
    <>
      {/* Temporal Atmosphere Overlay */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-5"
        animate={{
          background: getTimeBasedGradient(),
        }}
        transition={{ duration: 3, ease: "easeInOut" }}
      />

      {/* Cosmic Alignment Indicator */}
      <motion.div
        className="fixed top-6 left-6 z-40"
        animate={{
          opacity: dynamicState.cosmicAlignment,
          rotate: dynamicState.cosmicAlignment * 360,
        }}
        transition={{ duration: 8, ease: "linear" }}
      >
        <div className="w-3 h-3 border border-copper/40 rotate-45 animate-pulse-slow">
          <div className="absolute inset-0.5 bg-copper/20 rotate-45" />
        </div>
      </motion.div>

      {/* Temporal Readings - Only render after client hydration */}
      {isClient && (
        <motion.div
          className="fixed top-6 right-6 z-40 text-right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 0.7, x: 0 }}
          transition={{ delay: 3, duration: 1 }}
        >
          <div className="font-mono text-xs text-copper/60 space-y-1">
            <div>temporal: {dynamicState.timeOfDay}</div>
            <div>cycle: {dynamicState.season}</div>
            <div>pressure: {Math.round(dynamicState.atmosphericPressure)}%</div>
            <div>alignment: {(dynamicState.cosmicAlignment * 100).toFixed(0)}°</div>
          </div>
        </motion.div>
      )}

      {/* Atmospheric Pressure Waves */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-1"
        animate={{
          background: `radial-gradient(circle at 50% 50%, transparent ${40 + (dynamicState.atmosphericPressure / 100) * 20}%, rgba(184, 115, 51, ${(dynamicState.atmosphericPressure / 100) * 0.02}) ${60 + (dynamicState.atmosphericPressure / 100) * 15}%, transparent 100%)`,
        }}
        transition={{ duration: 4, ease: "easeInOut" }}
      />
    </>
  );
}
