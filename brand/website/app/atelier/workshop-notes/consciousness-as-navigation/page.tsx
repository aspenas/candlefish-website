'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue } from 'framer-motion';
import { AtelierDesignProvider, SpatialText, ReadingPlane } from '../../../../components/atelier/AtelierDesignSystem';
import { AmbientSystem } from '../../../../components/atelier/AmbientSystem';
import { DynamicBackground } from '../../../../components/atelier/DynamicBackground';
import { FocusManager } from '../../../../components/atelier/FocusManager';
import { ReadingMode } from '../../../../components/atelier/ReadingMode';
import '../../../../styles/atelier-enhancements.css';
import '../../../../styles/atelier-refined.css';

// Log component initialization
if (typeof window !== 'undefined') {
  console.log('Consciousness as Navigation Workshop initializing...');
}

interface AttentionState {
  focused: boolean;
  confidence: number;
  duration: number;
  element: string;
  intention: 'scanning' | 'reading' | 'searching' | 'analyzing' | 'idle';
}

interface DashboardDeathEvent {
  timestamp: Date;
  dashboard: string;
  cause: 'abandonment' | 'information_overload' | 'cognitive_exhaustion' | 'irrelevance';
  lifespan: number; // in seconds
  lastInteraction: string;
}

interface UIConsciousness {
  element: string;
  awarenessLevel: number;
  adaptations: string[];
  responseTime: number;
  userFeedback: number;
}

interface MetricData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  consciousness?: number;
}

export default function ConsciousnessAsNavigationWorkshop() {
  console.log('ConsciousnessAsNavigationWorkshop rendering...');
  
  const [attentionState, setAttentionState] = useState<AttentionState>({
    focused: false,
    confidence: 0.3,
    duration: 0,
    element: 'introduction',
    intention: 'scanning'
  });

  const [dashboardDeaths, setDashboardDeaths] = useState<DashboardDeathEvent[]>([
    {
      timestamp: new Date(Date.now() - 1800000),
      dashboard: 'Analytics Overview',
      cause: 'information_overload',
      lifespan: 127,
      lastInteraction: 'scrolled past metric #47'
    },
    {
      timestamp: new Date(Date.now() - 3600000),
      dashboard: 'Performance Monitor',
      cause: 'cognitive_exhaustion',
      lifespan: 89,
      lastInteraction: 'stared at CPU graph for 23s'
    },
    {
      timestamp: new Date(Date.now() - 5400000),
      dashboard: 'User Engagement',
      cause: 'irrelevance',
      lifespan: 34,
      lastInteraction: 'clicked refresh 3x'
    }
  ]);

  const [uiConsciousness, setUIConsciousness] = useState<UIConsciousness[]>([
    {
      element: 'Navigation Menu',
      awarenessLevel: 0.89,
      adaptations: ['Context-sensitive ordering', 'Predictive highlighting', 'Usage-based simplification'],
      responseTime: 45,
      userFeedback: 0.91
    },
    {
      element: 'Data Visualization',
      awarenessLevel: 0.76,
      adaptations: ['Attention-based detail levels', 'Progressive disclosure', 'Cognitive load balancing'],
      responseTime: 120,
      userFeedback: 0.84
    },
    {
      element: 'Search Interface',
      awarenessLevel: 0.93,
      adaptations: ['Intent prediction', 'Result reranking', 'Query completion'],
      responseTime: 23,
      userFeedback: 0.96
    }
  ]);

  const [liveMetrics, setLiveMetrics] = useState<MetricData[]>([
    { label: 'Attention Tracking', value: '94.7%', trend: 'up', consciousness: 0.94 },
    { label: 'Dashboard Deaths/hr', value: '2.3', trend: 'down', consciousness: 0.78 },
    { label: 'UI Awareness Level', value: '0.847', trend: 'up', consciousness: 0.85 },
    { label: 'Navigation Efficiency', value: '3.2x', trend: 'stable', consciousness: 0.91 }
  ]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [gazePoint, setGazePoint] = useState({ x: 0, y: 0 });
  const [focusIntensity, setFocusIntensity] = useState(0.3);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 100]);

  useEffect(() => {
    // Simulated attention tracking
    const attentionInterval = setInterval(() => {
      setAttentionState(prev => ({
        ...prev,
        confidence: 0.2 + Math.random() * 0.8,
        duration: prev.duration + 1,
        intention: ['scanning', 'reading', 'searching', 'analyzing', 'idle'][Math.floor(Math.random() * 5)] as any
      }));
    }, 2000);

    // UI consciousness evolution
    const consciousnessInterval = setInterval(() => {
      setUIConsciousness(prev => prev.map(ui => ({
        ...ui,
        awarenessLevel: Math.max(0.1, Math.min(1, ui.awarenessLevel + (Math.random() * 0.1 - 0.05))),
        responseTime: Math.max(10, ui.responseTime + (Math.random() * 20 - 10)),
        userFeedback: Math.max(0.1, Math.min(1, ui.userFeedback + (Math.random() * 0.05 - 0.025)))
      })));
    }, 3000);

    // Dashboard death tracking (simulate new deaths occasionally)
    const deathInterval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance of new death
        const newDeath: DashboardDeathEvent = {
          timestamp: new Date(),
          dashboard: ['Alert Center', 'Metrics Board', 'Process Monitor', 'Status Overview'][Math.floor(Math.random() * 4)],
          cause: ['abandonment', 'information_overload', 'cognitive_exhaustion', 'irrelevance'][Math.floor(Math.random() * 4)] as any,
          lifespan: Math.floor(Math.random() * 300 + 30),
          lastInteraction: ['scrolled to bottom', 'clicked filter', 'stared without interaction', 'refreshed page'][Math.floor(Math.random() * 4)]
        };
        setDashboardDeaths(prev => [newDeath, ...prev.slice(0, 9)]); // Keep only 10 most recent
      }
    }, 15000);

    // Mouse tracking for gaze simulation
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setGazePoint({ x: e.clientX, y: e.clientY });
      
      // Simulate focus intensity based on mouse movement
      const movement = Math.sqrt(Math.pow(e.movementX, 2) + Math.pow(e.movementY, 2));
      setFocusIntensity(Math.max(0.1, Math.min(1, 0.5 - movement * 0.01)));
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearInterval(attentionInterval);
      clearInterval(consciousnessInterval);
      clearInterval(deathInterval);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mouseX, mouseY]);

  return (
    <AtelierDesignProvider>
      <div className="min-h-screen relative bg-gradient-to-b from-black via-gray-900 to-gray-800 overflow-hidden">
        {/* Operational Background Systems */}
        <AmbientSystem
          intensity={0.3}
          followMouse={true}
          breathingRate={8000}
        />
        
        <DynamicBackground
          intensity={0.5}
          enableParallax={true}
          readingMode={true}
        />

        {/* Attention Gaze Indicator */}
        <motion.div
          className="fixed pointer-events-none z-40"
          style={{
            left: gazePoint.x - 15,
            top: gazePoint.y - 15,
          }}
        >
          <motion.div
            className="w-8 h-8 border-2 border-cyan-400/50 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.7, 0.3],
              borderColor: attentionState.intention === 'reading' ? '#06b6d4' : 
                         attentionState.intention === 'analyzing' ? '#f97316' : '#3b82f6'
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-2 bg-cyan-400/20 rounded-full"
            animate={{ opacity: focusIntensity }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>

        {/* Live System Status Bar with Consciousness Indicators */}
        <motion.div 
          className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-100/5"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <SpatialText level="caption" className="text-cyan-400 font-mono">
                  WORKSHOP // CONSCIOUSNESS-AS-NAVIGATION
                </SpatialText>
                <div className="flex items-center gap-2">
                  <motion.div 
                    className="w-2 h-2 rounded-full"
                    animate={{
                      backgroundColor: attentionState.intention === 'reading' ? '#06b6d4' :
                                     attentionState.intention === 'analyzing' ? '#f97316' :
                                     attentionState.intention === 'searching' ? '#10b981' : '#6b7280'
                    }}
                  />
                  <SpatialText level="caption" className="text-gray-100/60">
                    {attentionState.intention.charAt(0).toUpperCase() + attentionState.intention.slice(1)} 
                    ({(attentionState.confidence * 100).toFixed(0)}% confidence)
                  </SpatialText>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                {liveMetrics.map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <SpatialText level="caption" className="text-gray-100/40">
                      {metric.label}:
                    </SpatialText>
                    <span className={`font-mono text-sm ${
                      metric.trend === 'up' ? 'text-cyan-400' :
                      metric.trend === 'down' ? 'text-orange-500' :
                      'text-gray-100/60'
                    }`}>
                      {metric.value}
                    </span>
                    {metric.consciousness && (
                      <div className="w-12 h-1 bg-pearl/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-cyan-400/60"
                          animate={{ width: `${metric.consciousness * 100}%` }}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <FocusManager>
          <ReadingMode threshold={800}>
            <main ref={scrollRef} className="relative z-10 pt-20 overflow-y-auto h-screen">
              <AnimatePresence mode="wait">
                {/* Introduction */}
                <ReadingPlane sectionId="intro" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                    className="max-w-6xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                      >
                        <SpatialText level="hero" className="text-gray-100 mb-4">
                          Consciousness as Navigation System
                        </SpatialText>
                        <SpatialText level="subtitle" className="text-gray-100/60 italic">
                          Workshop Note - Self-Aware Interface Design
                        </SpatialText>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="space-y-8"
                      >
                        <div className="border-l-2 border-cyan-400/30 pl-8 space-y-6">
                          <SpatialText level="body" className="text-gray-100/80 leading-relaxed">
                            What if interfaces could sense where your attention goes? Not just clicks and scrolls, 
                            but the deeper patterns of focus, confusion, and comprehension. True navigation isn't 
                            about menus and buttons - it's about consciousness finding its way through information space.
                          </SpatialText>
                          
                          <SpatialText level="title" className="text-cyan-400">
                            The interface becomes a mirror of mental states, adapting to consciousness itself.
                          </SpatialText>
                        </div>

                        {/* Attention State Visualization */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9, duration: 0.8 }}
                          className="bg-gradient-to-br from-cyan-400/5 to-transparent border border-cyan-400/20 rounded-lg p-8 mt-12"
                        >
                          <div className="grid grid-cols-2 gap-8">
                            <div>
                              <SpatialText level="title" className="text-cyan-400 mb-4">
                                Current Attention State
                              </SpatialText>
                              
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <SpatialText level="caption" className="text-gray-100/60">
                                    Confidence Level
                                  </SpatialText>
                                  <span className="font-mono text-cyan-400">
                                    {(attentionState.confidence * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-pearl/10 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-cyan-400 to-cyan-400/50"
                                    animate={{ width: `${attentionState.confidence * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <SpatialText level="caption" className="text-gray-100/60">
                                    Focus Duration
                                  </SpatialText>
                                  <span className="font-mono text-orange-400">
                                    {attentionState.duration}s
                                  </span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <SpatialText level="caption" className="text-gray-100/60">
                                    Current Intention
                                  </SpatialText>
                                  <span className={`px-2 py-1 rounded-full text-xs font-mono ${
                                    attentionState.intention === 'reading' ? 'bg-cyan-500/20 text-cyan-400' :
                                    attentionState.intention === 'analyzing' ? 'bg-orange-500/20 text-orange-400' :
                                    attentionState.intention === 'searching' ? 'bg-green-500/20 text-green-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {attentionState.intention.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <SpatialText level="title" className="text-orange-400 mb-4">
                                Interface Adaptations
                              </SpatialText>
                              
                              <div className="space-y-3">
                                {attentionState.intention === 'reading' && (
                                  <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded"
                                  >
                                    <SpatialText level="caption" className="text-cyan-400">
                                      • Enhanced typography contrast
                                    </SpatialText>
                                    <SpatialText level="caption" className="text-cyan-400">
                                      • Reduced peripheral distractions
                                    </SpatialText>
                                  </motion.div>
                                )}
                                
                                {attentionState.intention === 'analyzing' && (
                                  <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 bg-orange-500/10 border border-orange-500/20 rounded"
                                  >
                                    <SpatialText level="caption" className="text-orange-400">
                                      • Highlighted data relationships
                                    </SpatialText>
                                    <SpatialText level="caption" className="text-orange-400">
                                      • Interactive comparison tools
                                    </SpatialText>
                                  </motion.div>
                                )}
                                
                                {attentionState.intention === 'searching' && (
                                  <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 bg-green-500/10 border border-green-500/20 rounded"
                                  >
                                    <SpatialText level="caption" className="text-green-400">
                                      • Predictive search suggestions
                                    </SpatialText>
                                    <SpatialText level="caption" className="text-green-400">
                                      • Contextual result filtering
                                    </SpatialText>
                                  </motion.div>
                                )}
                                
                                {(attentionState.intention === 'scanning' || attentionState.intention === 'idle') && (
                                  <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 bg-gray-500/10 border border-gray-500/20 rounded"
                                  >
                                    <SpatialText level="caption" className="text-gray-400">
                                      • Reduced animation frequency
                                    </SpatialText>
                                    <SpatialText level="caption" className="text-gray-400">
                                      • Subtle attention guidance
                                    </SpatialText>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Dashboard Death Counter */}
                <ReadingPlane sectionId="dashboard-deaths" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-6xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <div className="text-center space-y-4">
                        <SpatialText level="hero" className="text-gray-100">
                          Dashboard Death Counter
                        </SpatialText>
                        <SpatialText level="body" className="text-gray-100/60">
                          Tracking the moment when interfaces lose consciousness - when users abandon, 
                          become overwhelmed, or drift into cognitive exhaustion.
                        </SpatialText>
                      </div>
                      
                      {/* Death Statistics */}
                      <div className="grid grid-cols-4 gap-6">
                        {[
                          { label: 'Total Deaths Today', value: dashboardDeaths.length, color: 'text-red-400' },
                          { label: 'Avg Lifespan', value: `${Math.floor(dashboardDeaths.reduce((acc, d) => acc + d.lifespan, 0) / dashboardDeaths.length)}s`, color: 'text-orange-400' },
                          { label: 'Primary Cause', value: 'Info Overload', color: 'text-yellow-400' },
                          { label: 'Survival Rate', value: '23%', color: 'text-green-400' }
                        ].map((stat, i) => (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center p-6 bg-black/40 border border-gray-100/10 rounded-lg"
                          >
                            <div className={`text-3xl font-mono mb-2 ${stat.color}`}>
                              {stat.value}
                            </div>
                            <SpatialText level="caption" className="text-gray-100/50">
                              {stat.label}
                            </SpatialText>
                          </motion.div>
                        ))}
                      </div>

                      {/* Recent Deaths Timeline */}
                      <div className="space-y-4">
                        <SpatialText level="title" className="text-red-400">
                          Recent Dashboard Deaths
                        </SpatialText>
                        
                        <div className="space-y-3">
                          {dashboardDeaths.slice(0, 6).map((death, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -30 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-red-500/[0.05] to-transparent border-l-4 border-red-500/40 rounded-r-lg"
                            >
                              <div className="flex items-center gap-6">
                                <div className="text-center">
                                  <div className="text-xs text-gray-100/40 mb-1">
                                    {death.timestamp.toLocaleTimeString()}
                                  </div>
                                  <div className="text-red-400 font-mono text-sm">
                                    {death.lifespan}s
                                  </div>
                                </div>
                                
                                <div>
                                  <SpatialText level="body" className="text-gray-100/90 mb-1">
                                    {death.dashboard}
                                  </SpatialText>
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    Last interaction: {death.lastInteraction}
                                  </SpatialText>
                                </div>
                              </div>
                              
                              <div className={`px-3 py-1 rounded-full text-xs font-mono ${
                                death.cause === 'information_overload' ? 'bg-orange-500/20 text-orange-400' :
                                death.cause === 'cognitive_exhaustion' ? 'bg-red-500/20 text-red-400' :
                                death.cause === 'irrelevance' ? 'bg-gray-500/20 text-gray-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {death.cause.replace('_', ' ').toUpperCase()}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* The Consciousness Principle */}
                      <div className="mt-16 p-8 bg-gradient-to-br from-cyan-400/10 to-transparent border border-cyan-400/30 rounded-lg">
                        <SpatialText level="title" className="text-cyan-400 mb-4">
                          The Consciousness Navigation Principle
                        </SpatialText>
                        <blockquote className="text-gray-100/80 italic text-lg leading-relaxed mb-4">
                          "Interfaces that respond to mental states rather than just physical actions 
                          create navigation paths that feel like extensions of thought itself."
                        </blockquote>
                        <SpatialText level="body" className="text-gray-100/70">
                          When we design for consciousness - attention, intention, comprehension - 
                          we create systems that guide without constraining, inform without overwhelming.
                        </SpatialText>
                      </div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* UI Consciousness Levels */}
                <ReadingPlane sectionId="ui-consciousness" priority="primary" className="min-h-screen flex items-center">
                  <motion.section className="max-w-6xl mx-auto px-8 py-16">
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        UI Consciousness Levels
                      </SpatialText>

                      <div className="space-y-6">
                        {uiConsciousness.map((ui, i) => (
                          <motion.div
                            key={ui.element}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            className="bg-gradient-to-br from-pearl/[0.03] to-transparent border border-gray-100/10 rounded-lg p-6 overflow-hidden relative"
                          >
                            <div className="grid grid-cols-3 gap-8 items-center">
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-2">
                                  {ui.element}
                                </SpatialText>
                                <div className="flex items-center gap-4 mb-4">
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    Awareness Level:
                                  </SpatialText>
                                  <span className="font-mono text-lg text-cyan-400">
                                    {(ui.awarenessLevel * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-pearl/10 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-cyan-400 to-cyan-400/30"
                                    animate={{ width: `${ui.awarenessLevel * 100}%` }}
                                    transition={{ duration: 1 }}
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                  Active Adaptations:
                                </SpatialText>
                                <div className="space-y-2">
                                  {ui.adaptations.map((adaptation, j) => (
                                    <motion.div
                                      key={adaptation}
                                      initial={{ opacity: 0, x: 10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.5 + j * 0.1 }}
                                      className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full"
                                    >
                                      {adaptation}
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="text-right space-y-3">
                                <div>
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    Response Time
                                  </SpatialText>
                                  <div className="font-mono text-lg text-orange-400">
                                    {ui.responseTime}ms
                                  </div>
                                </div>
                                <div>
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    User Feedback
                                  </SpatialText>
                                  <div className="font-mono text-lg text-green-400">
                                    {(ui.userFeedback * 100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Consciousness Pulse Effect */}
                            <motion.div
                              className="absolute top-0 right-0 w-1 h-full opacity-20"
                              animate={{
                                backgroundColor: ['#06b6d4', '#3b82f6', '#06b6d4'],
                                opacity: [0.2, 0.6, 0.2]
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: 'easeInOut'
                              }}
                            />
                          </motion.div>
                        ))}
                      </div>

                      {/* Implementation Insights */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-12 p-8 bg-black/60 border border-gray-100/20 rounded-lg text-center"
                      >
                        <SpatialText level="body" className="text-gray-100/90 italic mb-4">
                          The future of interface design isn't about what users do - 
                          it's about understanding what they're trying to think.
                        </SpatialText>
                        <SpatialText level="caption" className="text-cyan-400">
                          Navigation becomes intuitive when interfaces mirror the patterns of consciousness itself.
                        </SpatialText>
                      </motion.div>
                    </div>
                  </motion.section>
                </ReadingPlane>
              </AnimatePresence>
            </main>
          </ReadingMode>
        </FocusManager>

        {/* Operational Progress Indicator */}
        <motion.div
          className="fixed bottom-8 right-8 z-50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div className="bg-black/80 backdrop-blur-xl border border-gray-100/10 rounded-lg p-4">
            <SpatialText level="caption" className="text-gray-100/40 mb-2">
              Consciousness Tracking
            </SpatialText>
            <div className="w-32 h-1 bg-pearl/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-400/50"
                style={{ width: progressScale }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AtelierDesignProvider>
  );
}