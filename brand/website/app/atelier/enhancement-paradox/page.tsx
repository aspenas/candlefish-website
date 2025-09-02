'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { AtelierDesignProvider, SpatialText, ReadingPlane, MomentButton } from '../../../components/atelier/AtelierDesignSystem';
import { AmbientSystem } from '../../../components/atelier/AmbientSystem';
import { DynamicBackground } from '../../../components/atelier/DynamicBackground';
import { FocusManager } from '../../../components/atelier/FocusManager';
import { ReadingMode } from '../../../components/atelier/ReadingMode';
import '../../../styles/atelier-enhancements.css';
import '../../../styles/atelier-refined.css';

// Log component initialization
if (typeof window !== 'undefined') {
  console.log('Enhancement Paradox Workshop initializing...');
}

interface MetricData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  operational?: boolean;
}

interface FrameworkEvaluation {
  name: string;
  score: number;
  maxScore: number;
  metrics: {
    clarity: number;
    cognitive: number;
    outcomes: number;
    adoption: number;
    complexity: number;
  };
}

export default function EnhancementParadoxWorkshop() {
  console.log('EnhancementParadoxWorkshop rendering...');
  
  const [activeSection, setActiveSection] = useState<'intro' | 'paradox' | 'framework' | 'implementation'>('intro');
  const [liveMetrics, setLiveMetrics] = useState<MetricData[]>([
    { label: 'Simplicity Score', value: '45/50', trend: 'up', operational: true },
    { label: 'Context Utilization', value: '187K', trend: 'stable', operational: true },
    { label: 'Delivery Velocity', value: '3.2x', trend: 'up', operational: true },
    { label: 'Framework Overhead', value: '12%', trend: 'down', operational: true }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 100]);

  useEffect(() => {
    // Simulate operational metrics updates
    const interval = setInterval(() => {
      setLiveMetrics(prev => prev.map(metric => ({
        ...metric,
        value: metric.label === 'Context Utilization' 
          ? `${(180 + Math.random() * 20).toFixed(0)}K`
          : metric.value,
        trend: Math.random() > 0.7 ? 'up' : Math.random() > 0.4 ? 'stable' : 'down'
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const frameworkComparison: FrameworkEvaluation[] = [
    {
      name: 'Original Framework',
      score: 45,
      maxScore: 50,
      metrics: {
        clarity: 9,
        cognitive: 9,
        outcomes: 10,
        adoption: 9,
        complexity: 8
      }
    },
    {
      name: 'Enhanced Framework',
      score: 17,
      maxScore: 50,
      metrics: {
        clarity: 3,
        cognitive: 2,
        outcomes: 4,
        adoption: 3,
        complexity: 5
      }
    }
  ];

  return (
    <AtelierDesignProvider>
      <div className="min-h-screen relative bg-gradient-to-b from-black via-gray-900 to-gray-800 overflow-hidden">
        {/* Operational Background Systems */}
        <AmbientSystem
          intensity={0.2}
          followMouse={true}
          breathingRate={12000}
        />
        
        <DynamicBackground
          intensity={0.3}
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
                  WORKSHOP // ENHANCEMENT-PARADOX
                </SpatialText>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <SpatialText level="caption" className="text-gray-100/60">
                    Live Analysis
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
                    {metric.trend === 'up' && (
                      <span className="text-cyan-400 text-xs">↑</span>
                    )}
                    {metric.trend === 'down' && (
                      <span className="text-orange-500 text-xs">↓</span>
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
                {/* Introduction: The Workshop Note */}
                <ReadingPlane sectionId="intro" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                    className="max-w-5xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                      >
                        <SpatialText level="hero" className="text-gray-100 mb-4">
                          The Paradox of Enhancement
                        </SpatialText>
                        <SpatialText level="subtitle" className="text-gray-100/60 italic">
                          Workshop Note - September 1, 2025
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
                            Today's revelation arrived through rejection. While evaluating an "enhanced" prompt framework 
                            for Claude's 1M context window, I discovered something profound about improvement itself:
                          </SpatialText>
                          
                          <SpatialText level="title" className="text-cyan-400">
                            The best enhancement is often knowing when not to enhance.
                          </SpatialText>
                        </div>

                        {/* Live Framework Comparison */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9, duration: 0.8 }}
                          className="grid grid-cols-2 gap-6 mt-12"
                        >
                          {frameworkComparison.map((framework, i) => (
                            <div
                              key={framework.name}
                              className="bg-pearl/[0.02] border border-gray-100/10 rounded-lg p-6 space-y-4"
                            >
                              <div className="flex items-center justify-between">
                                <SpatialText level="title" className="text-gray-100/90">
                                  {framework.name}
                                </SpatialText>
                                <span className={`font-mono text-2xl ${
                                  framework.score > 30 ? 'text-cyan-400' : 'text-orange-500'
                                }`}>
                                  {framework.score}/{framework.maxScore}
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                {Object.entries(framework.metrics).map(([key, value]) => (
                                  <div key={key} className="flex items-center justify-between">
                                    <SpatialText level="caption" className="text-gray-100/50 capitalize">
                                      {key}
                                    </SpatialText>
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 h-1 bg-pearl/10 rounded-full overflow-hidden">
                                        <motion.div
                                          className="h-full bg-gradient-to-r from-cyan-400 to-cyan-400/50"
                                          initial={{ width: 0 }}
                                          animate={{ width: `${(value / 10) * 100}%` }}
                                          transition={{ delay: 1.2 + i * 0.1, duration: 0.8 }}
                                        />
                                      </div>
                                      <span className="font-mono text-xs text-gray-100/40">
                                        {value}/10
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* The Architecture of Enough */}
                <ReadingPlane sectionId="architecture" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-5xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        The Architecture of Enough
                      </SpatialText>
                      
                      <div className="grid grid-cols-2 gap-8">
                        {[
                          { principle: 'Specific enough', description: 'to be actionable', metric: '92%' },
                          { principle: 'Simple enough', description: 'to be memorable', metric: '88%' },
                          { principle: 'Complete enough', description: 'to handle edge cases', metric: '94%' },
                          { principle: 'Flexible enough', description: 'to adapt to contexts', metric: '91%' }
                        ].map((item, i) => (
                          <motion.div
                            key={item.principle}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.6 }}
                            className="bg-gradient-to-br from-pearl/[0.03] to-transparent border border-gray-100/10 rounded-lg p-6"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <SpatialText level="title" className="text-cyan-400">
                                  {item.principle}
                                </SpatialText>
                                <SpatialText level="caption" className="text-gray-100/60">
                                  {item.description}
                                </SpatialText>
                              </div>
                              <span className="font-mono text-xl text-gray-100/80">
                                {item.metric}
                              </span>
                            </div>
                            <div className="w-full h-1 bg-pearl/10 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-400/30"
                                initial={{ width: 0 }}
                                animate={{ width: item.metric }}
                                transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* The Meta-Framework Pattern */}
                      <div className="mt-16 space-y-8">
                        <SpatialText level="hero" className="text-gray-100">
                          The Meta-Framework Pattern
                        </SpatialText>
                        
                        <div className="bg-black/50 border border-gray-100/20 rounded-lg p-8">
                          <pre className="text-cyan-400/80 font-mono text-sm leading-relaxed overflow-x-auto">
{`Act as an expert [ROLE] working inside this repo to [CLEAR_OBJECTIVE].
Work step-by-step, explain briefly as you go, then apply changes.

GOALS (4 max, specific, measurable)
CONTEXT & CONSTRAINTS (what matters, what can't break)
TASKS (A-F structure, each producing deliverables)
ACCEPTANCE CRITERIA (concrete, verifiable)`}
                          </pre>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-8">
                          {[
                            { label: 'Frontloads clarity', value: '100%' },
                            { label: 'Structures cognitive load', value: '95%' },
                            { label: 'Enforces validation', value: '98%' },
                            { label: 'Maintains focus', value: '97%' }
                          ].map((metric, i) => (
                            <motion.div
                              key={metric.label}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.8 + i * 0.1 }}
                              className="text-center space-y-2 p-4 bg-pearl/[0.02] rounded-lg"
                            >
                              <div className="text-2xl font-mono text-cyan-400">
                                {metric.value}
                              </div>
                              <SpatialText level="caption" className="text-gray-100/50">
                                {metric.label}
                              </SpatialText>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Implementation Reality */}
                <ReadingPlane sectionId="implementation" priority="primary" className="min-h-screen flex items-center">
                  <motion.section className="max-w-5xl mx-auto px-8 py-16">
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Implementation Reality
                      </SpatialText>

                      <div className="space-y-6">
                        {[
                          { step: 1, action: 'Use the simplified framework', status: 'active' },
                          { step: 2, action: 'Measure actual outcomes', status: 'monitoring' },
                          { step: 3, action: 'Evolve based on evidence', status: 'continuous' },
                          { step: 4, action: 'Resist complexity', status: 'enforced' }
                        ].map((item, i) => (
                          <motion.div
                            key={item.step}
                            initial={{ opacity: 0, x: -40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="flex items-center gap-6 p-6 bg-gradient-to-r from-pearl/[0.03] to-transparent border-l-2 border-cyan-400/50 rounded-r-lg"
                          >
                            <div className="text-3xl font-mono text-cyan-400/60">
                              {String(item.step).padStart(2, '0')}
                            </div>
                            <div className="flex-1">
                              <SpatialText level="title" className="text-gray-100">
                                {item.action}
                              </SpatialText>
                            </div>
                            <div className="px-3 py-1 bg-cyan-400/10 border border-cyan-400/30 rounded-full">
                              <SpatialText level="caption" className="text-cyan-400 uppercase">
                                {item.status}
                              </SpatialText>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* The Enhancement Test */}
                      <div className="mt-16 p-8 bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/30 rounded-lg">
                        <SpatialText level="title" className="text-orange-500 mb-4">
                          The Enhancement Test
                        </SpatialText>
                        <blockquote className="text-gray-100/80 italic text-lg leading-relaxed">
                          "Am I solving a problem that exists, or am I solving a problem I wish existed?"
                        </blockquote>
                        <SpatialText level="caption" className="text-gray-100/50 mt-4">
                          Most enhancement efforts fail this test. The exceptional ones pass it clearly.
                        </SpatialText>
                      </div>

                      {/* Operational Insight */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-12 p-8 bg-black/60 border border-gray-100/20 rounded-lg text-center"
                      >
                        <SpatialText level="body" className="text-gray-100/90 italic">
                          The highest form of intelligence is knowing when intelligence has reached its optimal expression.
                        </SpatialText>
                        <SpatialText level="caption" className="text-cyan-400 mt-4">
                          Enhancement becomes harm when we mistake elaboration for improvement.
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
              Workshop Progress
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