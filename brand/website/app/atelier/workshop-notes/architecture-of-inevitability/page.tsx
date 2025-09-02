'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { AtelierDesignProvider, SpatialText, ReadingPlane } from '../../../../components/atelier/AtelierDesignSystem';
import { AmbientSystem } from '../../../../components/atelier/AmbientSystem';
import { DynamicBackground } from '../../../../components/atelier/DynamicBackground';
import { FocusManager } from '../../../../components/atelier/FocusManager';
import { ReadingMode } from '../../../../components/atelier/ReadingMode';
import '../../../../styles/atelier-enhancements.css';
import '../../../../styles/atelier-refined.css';

// Log component initialization
if (typeof window !== 'undefined') {
  console.log('Architecture of Inevitability Workshop initializing...');
}

interface SystemEvolution {
  phase: string;
  description: string;
  probability: number;
  inevitability: number;
  currentState: 'emerging' | 'active' | 'dominant' | 'legacy';
  failureModes: string[];
  resistancePoints: number;
}

interface FailureMode {
  type: string;
  likelihood: number;
  impact: number;
  evolution: 'increasing' | 'stable' | 'decreasing';
  mitigationCost: number;
}

interface MetricData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  operational?: boolean;
}

export default function ArchitectureOfInevitabilityWorkshop() {
  console.log('ArchitectureOfInevitabilityWorkshop rendering...');
  
  const [systemEvolutions, setSystemEvolutions] = useState<SystemEvolution[]>([
    {
      phase: 'Manual Processes',
      description: 'Human-driven operations with spreadsheets',
      probability: 0.02,
      inevitability: 0.98,
      currentState: 'legacy',
      failureModes: ['Human error', 'Scale limitations', 'Knowledge silos'],
      resistancePoints: 85
    },
    {
      phase: 'Automation Layer',
      description: 'Scripts and tools replacing manual work',
      probability: 0.35,
      inevitability: 0.89,
      currentState: 'dominant',
      failureModes: ['Brittle integrations', 'Maintenance overhead', 'Context loss'],
      resistancePoints: 45
    },
    {
      phase: 'AI Integration',
      description: 'Intelligent systems augmenting operations',
      probability: 0.72,
      inevitability: 0.76,
      currentState: 'active',
      failureModes: ['Hallucination risks', 'Training data bias', 'Black box decisions'],
      resistancePoints: 25
    },
    {
      phase: 'Autonomous Operations',
      description: 'Self-managing operational systems',
      probability: 0.15,
      inevitability: 0.45,
      currentState: 'emerging',
      failureModes: ['Loss of human control', 'System drift', 'Emergent behaviors'],
      resistancePoints: 75
    }
  ]);

  const [failureModes, setFailureModes] = useState<FailureMode[]>([
    { type: 'Technical Debt', likelihood: 0.89, impact: 0.74, evolution: 'increasing', mitigationCost: 120000 },
    { type: 'Human Resistance', likelihood: 0.67, impact: 0.82, evolution: 'decreasing', mitigationCost: 45000 },
    { type: 'Integration Complexity', likelihood: 0.78, impact: 0.69, evolution: 'stable', mitigationCost: 85000 },
    { type: 'Knowledge Transfer', likelihood: 0.54, impact: 0.91, evolution: 'increasing', mitigationCost: 35000 }
  ]);

  const [liveMetrics, setLiveMetrics] = useState<MetricData[]>([
    { label: 'System Evolution Rate', value: '2.4x/quarter', trend: 'up', operational: true },
    { label: 'Inevitability Index', value: '0.847', trend: 'stable', operational: true },
    { label: 'Failure Modes Active', value: '7/23', trend: 'down', operational: true },
    { label: 'Resistance Coefficient', value: '0.31', trend: 'down', operational: true }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 100]);

  useEffect(() => {
    // Simulate system evolution progression
    const evolutionInterval = setInterval(() => {
      setSystemEvolutions(prev => prev.map(system => ({
        ...system,
        probability: Math.min(1, system.probability + (Math.random() * 0.02 - 0.01)),
        resistancePoints: Math.max(0, system.resistancePoints + (Math.random() * 4 - 2))
      })));
    }, 2000);

    // Simulate failure mode evolution
    const failureInterval = setInterval(() => {
      setFailureModes(prev => prev.map(failure => ({
        ...failure,
        likelihood: Math.max(0, Math.min(1, failure.likelihood + (Math.random() * 0.04 - 0.02))),
        impact: Math.max(0, Math.min(1, failure.impact + (Math.random() * 0.03 - 0.015)))
      })));
    }, 3000);

    // Update live metrics
    const metricsInterval = setInterval(() => {
      setLiveMetrics(prev => prev.map(metric => ({
        ...metric,
        value: metric.label === 'System Evolution Rate' 
          ? `${(2.0 + Math.random() * 0.8).toFixed(1)}x/quarter`
          : metric.label === 'Inevitability Index'
          ? `${(0.8 + Math.random() * 0.1).toFixed(3)}`
          : metric.label === 'Failure Modes Active'
          ? `${Math.floor(5 + Math.random() * 5)}/23`
          : `${(0.25 + Math.random() * 0.15).toFixed(2)}`,
        trend: Math.random() > 0.7 ? 'up' : Math.random() > 0.4 ? 'stable' : 'down'
      })));
    }, 4000);

    return () => {
      clearInterval(evolutionInterval);
      clearInterval(failureInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  return (
    <AtelierDesignProvider>
      <div className="min-h-screen relative bg-gradient-to-b from-black via-gray-900 to-gray-800 overflow-hidden">
        {/* Operational Background Systems */}
        <AmbientSystem
          intensity={0.25}
          followMouse={true}
          breathingRate={15000}
        />
        
        <DynamicBackground
          intensity={0.4}
          enableParallax={true}
          readingMode={true}
        />

        {/* Live System Status Bar */}
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
                  WORKSHOP // ARCHITECTURE-OF-INEVITABILITY
                </SpatialText>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <SpatialText level="caption" className="text-gray-100/60">
                    System Evolution Tracking
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
                          The Architecture of Inevitability
                        </SpatialText>
                        <SpatialText level="subtitle" className="text-gray-100/60 italic">
                          Workshop Note - Systems Evolution Tracking
                        </SpatialText>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="space-y-8"
                      >
                        <div className="border-l-2 border-orange-500/30 pl-8 space-y-6">
                          <SpatialText level="body" className="text-gray-100/80 leading-relaxed">
                            Every operational system follows predictable evolutionary paths. What appears as choice
                            is often inevitability disguised as decision-making. Understanding these patterns allows
                            us to design with the future, not against it.
                          </SpatialText>
                          
                          <SpatialText level="title" className="text-orange-500">
                            Systems don't evolve randomly - they follow the path of least operational resistance.
                          </SpatialText>
                        </div>

                        {/* Live System Evolution Visualization */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9, duration: 0.8 }}
                          className="grid gap-4 mt-12"
                        >
                          {systemEvolutions.map((evolution, i) => (
                            <motion.div
                              key={evolution.phase}
                              initial={{ x: -50, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 1.2 + i * 0.15 }}
                              className="relative bg-pearl/[0.02] border border-gray-100/10 rounded-lg p-6 overflow-hidden"
                            >
                              {/* Evolution Phase Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <SpatialText level="title" className="text-gray-100/90">
                                    {evolution.phase}
                                  </SpatialText>
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    {evolution.description}
                                  </SpatialText>
                                </div>
                                <div className="text-right space-y-1">
                                  <div className={`px-3 py-1 rounded-full text-xs font-mono ${
                                    evolution.currentState === 'emerging' ? 'bg-blue-500/20 text-blue-400' :
                                    evolution.currentState === 'active' ? 'bg-cyan-500/20 text-cyan-400' :
                                    evolution.currentState === 'dominant' ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {evolution.currentState.toUpperCase()}
                                  </div>
                                </div>
                              </div>

                              {/* Probability and Inevitability Bars */}
                              <div className="grid grid-cols-2 gap-6 mb-4">
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Current Probability
                                    </SpatialText>
                                    <span className="font-mono text-sm text-cyan-400">
                                      {(evolution.probability * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="h-2 bg-pearl/10 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-cyan-400 to-cyan-400/50"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${evolution.probability * 100}%` }}
                                      transition={{ delay: 1.5 + i * 0.1, duration: 1 }}
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Inevitability Index
                                    </SpatialText>
                                    <span className="font-mono text-sm text-orange-500">
                                      {(evolution.inevitability * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="h-2 bg-pearl/10 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-orange-500 to-orange-500/50"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${evolution.inevitability * 100}%` }}
                                      transition={{ delay: 1.7 + i * 0.1, duration: 1 }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Resistance Points */}
                              <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    Organizational Resistance
                                  </SpatialText>
                                  <span className="font-mono text-sm text-gray-100/70">
                                    {evolution.resistancePoints.toFixed(0)} points
                                  </span>
                                </div>
                                <div className="h-1 bg-pearl/10 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-red-500 to-yellow-500"
                                    animate={{ width: `${Math.min(100, evolution.resistancePoints)}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                              </div>

                              {/* Failure Modes */}
                              <div>
                                <SpatialText level="caption" className="text-gray-100/40 mb-2">
                                  Primary Failure Modes:
                                </SpatialText>
                                <div className="flex flex-wrap gap-2">
                                  {evolution.failureModes.map((mode, j) => (
                                    <span
                                      key={mode}
                                      className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400"
                                    >
                                      {mode}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Background Evolution Indicator */}
                              <motion.div
                                className="absolute top-0 right-0 w-1 h-full"
                                animate={{
                                  backgroundColor: evolution.currentState === 'emerging' ? '#3b82f6' :
                                                evolution.currentState === 'active' ? '#06b6d4' :
                                                evolution.currentState === 'dominant' ? '#f97316' : '#6b7280'
                                }}
                                transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                              />
                            </motion.div>
                          ))}
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Failure Mode Analysis */}
                <ReadingPlane sectionId="failures" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-6xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Failure Mode Evolution
                      </SpatialText>
                      
                      <div className="grid gap-6">
                        {failureModes.map((failure, i) => (
                          <motion.div
                            key={failure.type}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-gradient-to-r from-red-500/[0.05] to-transparent border-l-4 border-red-500/40 p-6 rounded-r-lg"
                          >
                            <div className="grid grid-cols-4 gap-6 items-center">
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-1">
                                  {failure.type}
                                </SpatialText>
                                <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                                  failure.evolution === 'increasing' ? 'bg-red-500/20 text-red-400' :
                                  failure.evolution === 'decreasing' ? 'bg-green-500/20 text-green-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {failure.evolution}
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-2">
                                  Likelihood
                                </SpatialText>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-pearl/10 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-red-500 to-red-400"
                                      animate={{ width: `${failure.likelihood * 100}%` }}
                                      transition={{ duration: 0.8 }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono text-red-400">
                                    {(failure.likelihood * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-2">
                                  Impact
                                </SpatialText>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-pearl/10 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
                                      animate={{ width: `${failure.impact * 100}%` }}
                                      transition={{ duration: 0.8 }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono text-orange-400">
                                    {(failure.impact * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <SpatialText level="caption" className="text-gray-100/50 mb-1">
                                  Mitigation Cost
                                </SpatialText>
                                <span className="font-mono text-cyan-400">
                                  ${(failure.mitigationCost / 1000).toFixed(0)}K
                                </span>
                              </div>
                            </div>
                            
                            {/* Risk Score Calculation */}
                            <div className="mt-4 pt-4 border-t border-gray-100/10">
                              <div className="flex justify-between items-center">
                                <SpatialText level="caption" className="text-gray-100/40">
                                  Risk Score: Likelihood × Impact
                                </SpatialText>
                                <span className="font-mono text-lg text-yellow-400">
                                  {(failure.likelihood * failure.impact).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* The Inevitability Principle */}
                      <div className="mt-16 p-8 bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/30 rounded-lg">
                        <SpatialText level="title" className="text-orange-500 mb-4">
                          The Inevitability Principle
                        </SpatialText>
                        <blockquote className="text-gray-100/80 italic text-lg leading-relaxed mb-4">
                          "Systems evolve toward configurations that minimize total operational friction, 
                          regardless of our preferences or initial designs."
                        </blockquote>
                        <SpatialText level="body" className="text-gray-100/70">
                          This isn't fatalism - it's engineering reality. When we design with inevitability 
                          rather than against it, we create systems that evolve gracefully instead of breaking catastrophically.
                        </SpatialText>
                      </div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Design Implications */}
                <ReadingPlane sectionId="implications" priority="primary" className="min-h-screen flex items-center">
                  <motion.section className="max-w-6xl mx-auto px-8 py-16">
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Design Implications
                      </SpatialText>

                      <div className="grid grid-cols-2 gap-8">
                        {[
                          { 
                            principle: 'Design for Evolution', 
                            description: 'Build systems that expect to change',
                            implementation: 'Modular architecture, clear interfaces, version management',
                            successRate: 89 
                          },
                          { 
                            principle: 'Embrace Resistance', 
                            description: 'Resistance points reveal important constraints',
                            implementation: 'Change management, gradual rollout, feedback loops',
                            successRate: 76 
                          },
                          { 
                            principle: 'Plan for Failure', 
                            description: 'Failure modes are more predictable than success paths',
                            implementation: 'Circuit breakers, graceful degradation, monitoring',
                            successRate: 94 
                          },
                          { 
                            principle: 'Minimize Friction', 
                            description: 'Systems flow toward ease of use and maintenance',
                            implementation: 'Simple interfaces, automated operations, clear documentation',
                            successRate: 87 
                          }
                        ].map((principle, i) => (
                          <motion.div
                            key={principle.principle}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="bg-gradient-to-br from-pearl/[0.03] to-transparent border border-gray-100/10 rounded-lg p-6"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <SpatialText level="title" className="text-cyan-400">
                                {principle.principle}
                              </SpatialText>
                              <span className="font-mono text-xl text-gray-100/80">
                                {principle.successRate}%
                              </span>
                            </div>
                            
                            <SpatialText level="body" className="text-gray-100/70 mb-4">
                              {principle.description}
                            </SpatialText>
                            
                            <div className="space-y-2">
                              <SpatialText level="caption" className="text-gray-100/50">
                                Implementation Strategy:
                              </SpatialText>
                              <SpatialText level="caption" className="text-gray-100/60">
                                {principle.implementation}
                              </SpatialText>
                            </div>
                            
                            <div className="w-full h-1 bg-pearl/10 rounded-full overflow-hidden mt-4">
                              <motion.div
                                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-400/30"
                                initial={{ width: 0 }}
                                animate={{ width: `${principle.successRate}%` }}
                                transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Operational Insight */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-12 p-8 bg-black/60 border border-gray-100/20 rounded-lg text-center"
                      >
                        <SpatialText level="body" className="text-gray-100/90 italic mb-4">
                          The architecture of inevitability isn't about predicting the future - 
                          it's about building systems resilient enough to evolve with any future.
                        </SpatialText>
                        <SpatialText level="caption" className="text-orange-500">
                          When we stop fighting evolution and start designing with it, 
                          we create systems that improve themselves.
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
              Evolution Tracking
            </SpatialText>
            <div className="w-32 h-1 bg-pearl/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-500/50"
                style={{ width: progressScale }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AtelierDesignProvider>
  );
}