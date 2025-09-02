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
  console.log('Workflow Standardization Resistance Workshop initializing...');
}

interface WorkflowPath {
  id: string;
  name: string;
  steps: string[];
  efficiency: number;
  adoptionRate: number;
  satisfactionScore: number;
  personalityAlignment: string[];
  resistancePoints: ResistancePoint[];
  deviations: number;
  completionTime: number; // minutes
}

interface ResistancePoint {
  step: string;
  reason: string;
  intensity: number;
  frequency: number;
  personalityTypes: string[];
}

interface PersonalityPattern {
  type: string;
  description: string;
  workflowPreferences: string[];
  resistanceReasons: string[];
  adaptationStrategies: string[];
  frequency: number;
  standardizationSuccess: number;
}

interface StandardizationAttempt {
  name: string;
  approach: string;
  initialAdoption: number;
  currentAdoption: number;
  timeframe: number; // weeks
  failureReasons: string[];
  successFactors: string[];
  personalityConflicts: string[];
}

interface MetricData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  resistance?: number;
}

export default function WorkflowStandardizationResistanceWorkshop() {
  console.log('WorkflowStandardizationResistanceWorkshop rendering...');
  
  const [workflowPaths, setWorkflowPaths] = useState<WorkflowPath[]>([
    {
      id: 'standard',
      name: 'Official Standard Process',
      steps: ['Requirements', 'Design', 'Review', 'Development', 'Testing', 'Deploy'],
      efficiency: 0.72,
      adoptionRate: 0.34,
      satisfactionScore: 0.45,
      personalityAlignment: ['Methodical', 'Risk-averse'],
      resistancePoints: [
        { step: 'Review', reason: 'Excessive bureaucracy', intensity: 0.8, frequency: 0.9, personalityTypes: ['Innovator', 'Results-driven'] },
        { step: 'Testing', reason: 'Slows down delivery', intensity: 0.6, frequency: 0.7, personalityTypes: ['Fast-paced', 'Entrepreneur'] }
      ],
      deviations: 23,
      completionTime: 480
    },
    {
      id: 'agile-variant',
      name: 'Agile Adaptation',
      steps: ['Story', 'Sprint Planning', 'Development', 'Daily Standup', 'Review', 'Retrospective'],
      efficiency: 0.84,
      adoptionRate: 0.67,
      satisfactionScore: 0.78,
      personalityAlignment: ['Collaborative', 'Adaptive'],
      resistancePoints: [
        { step: 'Daily Standup', reason: 'Too many meetings', intensity: 0.5, frequency: 0.6, personalityTypes: ['Independent', 'Deep-work'] },
        { step: 'Retrospective', reason: 'Feels redundant', intensity: 0.4, frequency: 0.3, personalityTypes: ['Action-oriented'] }
      ],
      deviations: 12,
      completionTime: 320
    },
    {
      id: 'minimal',
      name: 'Minimal Viable Process',
      steps: ['Idea', 'Build', 'Ship', 'Learn'],
      efficiency: 0.91,
      adoptionRate: 0.89,
      satisfactionScore: 0.86,
      personalityAlignment: ['Entrepreneurial', 'Risk-taking', 'Results-driven'],
      resistancePoints: [
        { step: 'Learn', reason: 'Post-ship analysis ignored', intensity: 0.7, frequency: 0.8, personalityTypes: ['Move-fast', 'Next-project'] }
      ],
      deviations: 8,
      completionTime: 180
    },
    {
      id: 'hybrid',
      name: 'Personality-Adaptive Hybrid',
      steps: ['Context Assessment', 'Path Selection', 'Execution', 'Validation', 'Iteration'],
      efficiency: 0.88,
      adoptionRate: 0.75,
      satisfactionScore: 0.91,
      personalityAlignment: ['All types (adaptive)'],
      resistancePoints: [
        { step: 'Context Assessment', reason: 'Adds complexity', intensity: 0.3, frequency: 0.2, personalityTypes: ['Simple-process'] }
      ],
      deviations: 5,
      completionTime: 260
    }
  ]);

  const [personalityPatterns, setPersonalityPatterns] = useState<PersonalityPattern[]>([
    {
      type: 'The Methodical Planner',
      description: 'Prefers detailed processes with clear checkpoints and documentation',
      workflowPreferences: ['Detailed requirements', 'Formal reviews', 'Comprehensive testing'],
      resistanceReasons: ['Skipped steps', 'Unclear handoffs', 'Incomplete documentation'],
      adaptationStrategies: ['Provide templates', 'Create checklists', 'Enable process tracking'],
      frequency: 0.23,
      standardizationSuccess: 0.78
    },
    {
      type: 'The Innovative Experimenter',
      description: 'Values flexibility and creative problem-solving over rigid processes',
      workflowPreferences: ['Rapid prototyping', 'Iterative feedback', 'Minimal constraints'],
      resistanceReasons: ['Rigid templates', 'Excessive approvals', 'One-size-fits-all'],
      adaptationStrategies: ['Allow customization', 'Focus on outcomes', 'Provide escape hatches'],
      frequency: 0.19,
      standardizationSuccess: 0.34
    },
    {
      type: 'The Collaborative Communicator',
      description: 'Thrives on team interaction and shared decision-making',
      workflowPreferences: ['Team discussions', 'Consensus building', 'Transparent progress'],
      resistanceReasons: ['Isolated work', 'Top-down decisions', 'Hidden processes'],
      adaptationStrategies: ['Build in collaboration points', 'Shared ownership', 'Visible workflows'],
      frequency: 0.27,
      standardizationSuccess: 0.69
    },
    {
      type: 'The Results-Driven Executor',
      description: 'Focuses on outcomes and efficiency over process adherence',
      workflowPreferences: ['Clear objectives', 'Minimal overhead', 'Fast execution'],
      resistanceReasons: ['Process for process sake', 'Bureaucratic steps', 'Slow approval chains'],
      adaptationStrategies: ['Emphasize business value', 'Streamline steps', 'Measure outcomes'],
      frequency: 0.31,
      standardizationSuccess: 0.52
    }
  ]);

  const [standardizationAttempts, setStandardizationAttempts] = useState<StandardizationAttempt[]>([
    {
      name: 'Enterprise Process Framework 2023',
      approach: 'Top-down mandate with training',
      initialAdoption: 0.85,
      currentAdoption: 0.28,
      timeframe: 48,
      failureReasons: ['Too complex', 'Ignored personality differences', 'No local adaptation'],
      successFactors: ['Strong initial buy-in', 'Executive support'],
      personalityConflicts: ['Innovative Experimenter', 'Results-Driven Executor']
    },
    {
      name: 'Agile Transformation Initiative',
      approach: 'Gradual rollout with coaches',
      initialAdoption: 0.45,
      currentAdoption: 0.72,
      timeframe: 78,
      failureReasons: ['Meeting fatigue', 'Cultural resistance'],
      successFactors: ['Coaching support', 'Team autonomy', 'Visible improvements'],
      personalityConflicts: ['Methodical Planner']
    },
    {
      name: 'Lean Process Optimization',
      approach: 'Bottom-up improvement suggestions',
      initialAdoption: 0.32,
      currentAdoption: 0.67,
      timeframe: 32,
      failureReasons: ['Inconsistent application', 'Lack of structure'],
      successFactors: ['Employee involvement', 'Quick wins', 'Waste elimination'],
      personalityConflicts: ['Collaborative Communicator']
    }
  ]);

  const [liveMetrics, setLiveMetrics] = useState<MetricData[]>([
    { label: 'Standard Adherence', value: '34%', trend: 'down', resistance: 0.67 },
    { label: 'Path Variations', value: '127', trend: 'up', resistance: 0.82 },
    { label: 'Satisfaction Score', value: '6.2/10', trend: 'stable', resistance: 0.45 },
    { label: 'Personality Conflicts', value: '23 active', trend: 'up', resistance: 0.76 }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 100]);

  useEffect(() => {
    // Simulate workflow evolution and resistance changes
    const workflowInterval = setInterval(() => {
      setWorkflowPaths(prev => prev.map(path => ({
        ...path,
        adoptionRate: Math.max(0.05, Math.min(0.95, path.adoptionRate + (Math.random() * 0.06 - 0.03))),
        satisfactionScore: Math.max(0.1, Math.min(1, path.satisfactionScore + (Math.random() * 0.04 - 0.02))),
        deviations: Math.max(0, path.deviations + Math.floor(Math.random() * 6 - 3))
      })));
    }, 4000);

    // Update personality pattern frequencies
    const personalityInterval = setInterval(() => {
      setPersonalityPatterns(prev => prev.map(pattern => ({
        ...pattern,
        frequency: Math.max(0.05, Math.min(0.4, pattern.frequency + (Math.random() * 0.02 - 0.01))),
        standardizationSuccess: Math.max(0.1, Math.min(0.9, pattern.standardizationSuccess + (Math.random() * 0.05 - 0.025)))
      })));
    }, 5000);

    // Update standardization attempt tracking
    const attemptInterval = setInterval(() => {
      setStandardizationAttempts(prev => prev.map(attempt => ({
        ...attempt,
        currentAdoption: Math.max(0.05, Math.min(0.95, attempt.currentAdoption + (Math.random() * 0.08 - 0.04)))
      })));
    }, 6000);

    return () => {
      clearInterval(workflowInterval);
      clearInterval(personalityInterval);
      clearInterval(attemptInterval);
    };
  }, []);

  return (
    <AtelierDesignProvider>
      <div className="min-h-screen relative bg-gradient-to-b from-black via-gray-900 to-gray-800 overflow-hidden">
        {/* Operational Background Systems */}
        <AmbientSystem
          intensity={0.25}
          followMouse={true}
          breathingRate={11000}
        />
        
        <DynamicBackground
          intensity={0.35}
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
                <SpatialText level="caption" className="text-purple-400 font-mono">
                  WORKSHOP // WORKFLOW-STANDARDIZATION-RESISTANCE
                </SpatialText>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <SpatialText level="caption" className="text-gray-100/60">
                    Resistance Pattern Analysis
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
                      metric.trend === 'up' ? 'text-purple-400' :
                      metric.trend === 'down' ? 'text-orange-500' :
                      'text-gray-100/60'
                    }`}>
                      {metric.value}
                    </span>
                    {metric.resistance && (
                      <div className="w-8 h-1 bg-pearl/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-red-400/60"
                          animate={{ width: `${metric.resistance * 100}%` }}
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
                          Why Workflows Resist Standardization
                        </SpatialText>
                        <SpatialText level="subtitle" className="text-gray-100/60 italic">
                          Workshop Note - Personality-Driven Process Resistance
                        </SpatialText>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="space-y-8"
                      >
                        <div className="border-l-2 border-purple-400/30 pl-8 space-y-6">
                          <SpatialText level="body" className="text-gray-100/80 leading-relaxed">
                            Every standardization initiative encounters the same paradox: the more you try to 
                            make workflows uniform, the more creative people become at working around them. 
                            This isn't defiance - it's personality asserting itself through process adaptation. 
                            Different thinking styles need different working methods.
                          </SpatialText>
                          
                          <SpatialText level="title" className="text-purple-400">
                            Workflows don't resist standardization - people do, and for good reasons.
                          </SpatialText>
                        </div>

                        {/* Workflow Path Visualizer */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9, duration: 0.8 }}
                          className="bg-gradient-to-br from-purple-400/5 to-transparent border border-purple-400/20 rounded-lg p-8 mt-12"
                        >
                          <SpatialText level="title" className="text-purple-400 mb-6">
                            Multiple Workflow Path Analysis
                          </SpatialText>
                          
                          <div className="space-y-6">
                            {workflowPaths.map((path, i) => (
                              <motion.div
                                key={path.id}
                                initial={{ opacity: 0, x: -40 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.2 + i * 0.2 }}
                                className="bg-gradient-to-r from-gray-500/[0.05] to-transparent border-l-4 border-purple-500/40 p-6 rounded-r-lg"
                              >
                                <div className="grid grid-cols-3 gap-8">
                                  <div>
                                    <SpatialText level="title" className="text-gray-100 mb-2">
                                      {path.name}
                                    </SpatialText>
                                    <div className="space-y-2">
                                      <SpatialText level="caption" className="text-gray-100/50">
                                        Process Steps:
                                      </SpatialText>
                                      <div className="flex flex-wrap gap-2">
                                        {path.steps.map((step, j) => (
                                          <span
                                            key={step}
                                            className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/20"
                                          >
                                            {j + 1}. {step}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                      Performance Metrics:
                                    </SpatialText>
                                    <div className="space-y-3">
                                      {[
                                        { label: 'Adoption Rate', value: path.adoptionRate, color: 'text-green-400' },
                                        { label: 'Satisfaction', value: path.satisfactionScore, color: 'text-blue-400' },
                                        { label: 'Efficiency', value: path.efficiency, color: 'text-cyan-400' }
                                      ].map((metric, k) => (
                                        <div key={metric.label}>
                                          <div className="flex justify-between items-center mb-1">
                                            <SpatialText level="caption" className="text-gray-100/60">
                                              {metric.label}
                                            </SpatialText>
                                            <span className={`font-mono text-sm ${metric.color}`}>
                                              {(metric.value * 100).toFixed(0)}%
                                            </span>
                                          </div>
                                          <div className="h-1 bg-pearl/10 rounded-full overflow-hidden">
                                            <motion.div
                                              className={`h-full ${
                                                metric.color.includes('green') ? 'bg-green-400' :
                                                metric.color.includes('blue') ? 'bg-blue-400' :
                                                'bg-cyan-400'
                                              }`}
                                              animate={{ width: `${metric.value * 100}%` }}
                                              transition={{ delay: 1.5 + i * 0.1 + k * 0.05, duration: 0.8 }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                      Resistance Analysis:
                                    </SpatialText>
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <SpatialText level="caption" className="text-gray-100/60">
                                          Deviations:
                                        </SpatialText>
                                        <span className="font-mono text-sm text-orange-400">
                                          {path.deviations}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <SpatialText level="caption" className="text-gray-100/60">
                                          Avg Completion:
                                        </SpatialText>
                                        <span className="font-mono text-sm text-yellow-400">
                                          {Math.floor(path.completionTime / 60)}h {path.completionTime % 60}m
                                        </span>
                                      </div>
                                      <div className="mt-2">
                                        <SpatialText level="caption" className="text-gray-100/50 mb-1">
                                          Aligned Personalities:
                                        </SpatialText>
                                        <div className="flex flex-wrap gap-1">
                                          {path.personalityAlignment.map((personality, l) => (
                                            <span
                                              key={personality}
                                              className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded"
                                            >
                                              {personality}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Major Resistance Points */}
                                {path.resistancePoints.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-gray-100/10">
                                    <SpatialText level="caption" className="text-red-400 mb-2">
                                      Major Resistance Points:
                                    </SpatialText>
                                    <div className="space-y-1">
                                      {path.resistancePoints.map((resistance, m) => (
                                        <div key={m} className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">
                                          <strong>{resistance.step}:</strong> {resistance.reason} 
                                          ({(resistance.frequency * 100).toFixed(0)}% frequency)
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Personality Pattern Detector */}
                <ReadingPlane sectionId="personality-patterns" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-6xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Personality Pattern Detector
                      </SpatialText>
                      
                      <div className="grid gap-6">
                        {personalityPatterns.map((pattern, i) => (
                          <motion.div
                            key={pattern.type}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            className="bg-gradient-to-br from-indigo-500/[0.05] to-transparent border border-indigo-500/20 rounded-lg p-6"
                          >
                            <div className="grid grid-cols-2 gap-8">
                              <div>
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <SpatialText level="title" className="text-gray-100 mb-2">
                                      {pattern.type}
                                    </SpatialText>
                                    <SpatialText level="body" className="text-gray-100/70">
                                      {pattern.description}
                                    </SpatialText>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-mono text-2xl text-indigo-400 mb-1">
                                      {(pattern.frequency * 100).toFixed(0)}%
                                    </div>
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Frequency
                                    </SpatialText>
                                  </div>
                                </div>
                                
                                <div className="space-y-4">
                                  <div>
                                    <SpatialText level="caption" className="text-green-400 mb-2">
                                      Workflow Preferences:
                                    </SpatialText>
                                    <div className="space-y-1">
                                      {pattern.workflowPreferences.map((pref, j) => (
                                        <div key={pref} className="text-sm text-green-300 bg-green-500/10 px-3 py-1 rounded border border-green-500/20">
                                          • {pref}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <SpatialText level="caption" className="text-red-400 mb-2">
                                      Common Resistance Reasons:
                                    </SpatialText>
                                    <div className="space-y-1">
                                      {pattern.resistanceReasons.map((reason, j) => (
                                        <div key={reason} className="text-sm text-red-300 bg-red-500/10 px-3 py-1 rounded border border-red-500/20">
                                          • {reason}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="mb-6">
                                  <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                    Standardization Success Rate:
                                  </SpatialText>
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 h-3 bg-pearl/10 rounded-full overflow-hidden">
                                      <motion.div
                                        className={`h-full ${
                                          pattern.standardizationSuccess > 0.7 ? 'bg-green-400' :
                                          pattern.standardizationSuccess > 0.5 ? 'bg-yellow-400' :
                                          'bg-red-400'
                                        }`}
                                        animate={{ width: `${pattern.standardizationSuccess * 100}%` }}
                                        transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                                      />
                                    </div>
                                    <span className={`font-mono text-lg ${
                                      pattern.standardizationSuccess > 0.7 ? 'text-green-400' :
                                      pattern.standardizationSuccess > 0.5 ? 'text-yellow-400' :
                                      'text-red-400'
                                    }`}>
                                      {(pattern.standardizationSuccess * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                                
                                <div>
                                  <SpatialText level="caption" className="text-cyan-400 mb-2">
                                    Adaptation Strategies:
                                  </SpatialText>
                                  <div className="space-y-1">
                                    {pattern.adaptationStrategies.map((strategy, j) => (
                                      <div key={strategy} className="text-sm text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded border border-cyan-500/20">
                                        • {strategy}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* The Personality Principle */}
                      <div className="mt-16 p-8 bg-gradient-to-br from-purple-400/10 to-transparent border border-purple-400/30 rounded-lg">
                        <SpatialText level="title" className="text-purple-400 mb-4">
                          The Personality-Process Principle
                        </SpatialText>
                        <blockquote className="text-gray-100/80 italic text-lg leading-relaxed mb-4">
                          "Standardization succeeds when it accommodates personality differences rather than 
                          trying to eliminate them. The goal isn't uniformity - it's predictable outcomes through diverse approaches."
                        </blockquote>
                        <SpatialText level="body" className="text-gray-100/70">
                          Effective process design allows for personality-driven variations while maintaining 
                          quality gates and outcome consistency.
                        </SpatialText>
                      </div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Standardization Attempt Analysis */}
                <ReadingPlane sectionId="standardization-attempts" priority="primary" className="min-h-screen flex items-center">
                  <motion.section className="max-w-6xl mx-auto px-8 py-16">
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Standardization Attempt Tracker
                      </SpatialText>

                      <div className="space-y-8">
                        {standardizationAttempts.map((attempt, i) => (
                          <motion.div
                            key={attempt.name}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.2 }}
                            className="bg-gradient-to-r from-yellow-500/[0.05] to-transparent border-l-4 border-yellow-500/40 p-6 rounded-r-lg"
                          >
                            <div className="grid grid-cols-3 gap-8">
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-2">
                                  {attempt.name}
                                </SpatialText>
                                <SpatialText level="body" className="text-gray-100/70 mb-4">
                                  {attempt.approach}
                                </SpatialText>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Timeline:
                                    </SpatialText>
                                    <span className="font-mono text-sm text-gray-100/70">
                                      {attempt.timeframe} weeks
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                  Adoption Tracking:
                                </SpatialText>
                                <div className="space-y-4">
                                  <div>
                                    <div className="flex justify-between items-center mb-2">
                                      <SpatialText level="caption" className="text-gray-100/60">
                                        Initial Adoption
                                      </SpatialText>
                                      <span className="font-mono text-sm text-blue-400">
                                        {(attempt.initialAdoption * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <div className="h-2 bg-pearl/10 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-blue-400" 
                                        style={{ width: `${attempt.initialAdoption * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <div className="flex justify-between items-center mb-2">
                                      <SpatialText level="caption" className="text-gray-100/60">
                                        Current Adoption
                                      </SpatialText>
                                      <span className={`font-mono text-sm ${
                                        attempt.currentAdoption > attempt.initialAdoption ? 'text-green-400' :
                                        attempt.currentAdoption < attempt.initialAdoption * 0.7 ? 'text-red-400' :
                                        'text-orange-400'
                                      }`}>
                                        {(attempt.currentAdoption * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <div className="h-2 bg-pearl/10 rounded-full overflow-hidden">
                                      <motion.div
                                        className={`h-full ${
                                          attempt.currentAdoption > attempt.initialAdoption ? 'bg-green-400' :
                                          attempt.currentAdoption < attempt.initialAdoption * 0.7 ? 'bg-red-400' :
                                          'bg-orange-400'
                                        }`}
                                        animate={{ width: `${attempt.currentAdoption * 100}%` }}
                                        transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="space-y-4">
                                  <div>
                                    <SpatialText level="caption" className="text-red-400 mb-2">
                                      Failure Reasons:
                                    </SpatialText>
                                    <div className="space-y-1">
                                      {attempt.failureReasons.slice(0, 3).map((reason, j) => (
                                        <div key={reason} className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                                          {reason}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <SpatialText level="caption" className="text-green-400 mb-2">
                                      Success Factors:
                                    </SpatialText>
                                    <div className="space-y-1">
                                      {attempt.successFactors.slice(0, 2).map((factor, j) => (
                                        <div key={factor} className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                                          {factor}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <SpatialText level="caption" className="text-purple-400 mb-2">
                                      Personality Conflicts:
                                    </SpatialText>
                                    <div className="space-y-1">
                                      {attempt.personalityConflicts.map((conflict, j) => (
                                        <div key={conflict} className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded">
                                          {conflict}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Design Principles for Personality-Aware Processes */}
                      <div className="grid grid-cols-2 gap-8 mt-16">
                        {[
                          {
                            principle: 'Multiple Valid Paths',
                            description: 'Offer 2-3 different approaches to the same outcome',
                            example: 'Detailed planning vs. iterative discovery vs. hybrid approaches'
                          },
                          {
                            principle: 'Flexible Checkpoints',
                            description: 'Quality gates that adapt to working style preferences',
                            example: 'Formal reviews vs. peer feedback vs. automated validation'
                          },
                          {
                            principle: 'Outcome-Based Measures',
                            description: 'Focus on results rather than adherence to specific steps',
                            example: 'Delivery quality and timing over process compliance'
                          },
                          {
                            principle: 'Escape Hatches',
                            description: 'Approved ways to deviate when standard process doesn\'t fit',
                            example: 'Exception workflows for urgent or unique situations'
                          }
                        ].map((item, i) => (
                          <motion.div
                            key={item.principle}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.15 }}
                            className="bg-gradient-to-br from-pearl/[0.03] to-transparent border border-gray-100/10 rounded-lg p-6"
                          >
                            <SpatialText level="title" className="text-purple-400 mb-2">
                              {item.principle}
                            </SpatialText>
                            <SpatialText level="body" className="text-gray-100/70 mb-3">
                              {item.description}
                            </SpatialText>
                            <SpatialText level="caption" className="text-gray-100/50 italic">
                              Example: {item.example}
                            </SpatialText>
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
                          The most successful "standardization" efforts don't eliminate variation - 
                          they channel it into productive forms that honor both individual preferences and organizational goals.
                        </SpatialText>
                        <SpatialText level="caption" className="text-purple-400">
                          When processes bend without breaking, they become antifragile.
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
              Resistance Analysis
            </SpatialText>
            <div className="w-32 h-1 bg-pearl/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-400 to-purple-400/50"
                style={{ width: progressScale }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AtelierDesignProvider>
  );
}