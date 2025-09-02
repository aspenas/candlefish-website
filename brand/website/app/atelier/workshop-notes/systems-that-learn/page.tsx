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
  console.log('Systems That Learn Workshop initializing...');
}

interface UsagePattern {
  pattern: string;
  frequency: number;
  userSegment: string;
  learningConfidence: number;
  adaptationsMade: number;
  effectivenessScore: number;
  examples: string[];
  trend: 'emerging' | 'stable' | 'declining';
}

interface LearningEvent {
  timestamp: Date;
  eventType: string;
  userAction: string;
  systemResponse: string;
  outcomeSuccess: boolean;
  confidenceChange: number;
  adaptationTriggered: boolean;
}

interface AdaptiveFeature {
  feature: string;
  description: string;
  learningMethod: string;
  adaptationSpeed: 'slow' | 'medium' | 'fast';
  accuracy: number;
  userSatisfaction: number;
  adaptations: number;
  falsePositives: number;
}

interface SystemLearning {
  component: string;
  dataPoints: number;
  patterns: number;
  accuracy: number;
  adaptations: number;
  userFeedback: number;
  learningRate: number;
}

interface MetricData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  learning?: number;
}

export default function SystemsThatLearnWorkshop() {
  console.log('SystemsThatLearnWorkshop rendering...');
  
  const [usagePatterns, setUsagePatterns] = useState<UsagePattern[]>([
    {
      pattern: 'Morning workflow optimization',
      frequency: 0.87,
      userSegment: 'Early risers (23% of users)',
      learningConfidence: 0.91,
      adaptationsMade: 47,
      effectivenessScore: 0.84,
      examples: ['Auto-expanded dashboards', 'Preloaded priority data', 'Simplified morning reports'],
      trend: 'stable'
    },
    {
      pattern: 'Context switching behavior',
      frequency: 0.64,
      userSegment: 'Multi-taskers (41% of users)',
      learningConfidence: 0.73,
      adaptationsMade: 23,
      effectivenessScore: 0.67,
      examples: ['State preservation', 'Quick-switch UI', 'Context recovery suggestions'],
      trend: 'emerging'
    },
    {
      pattern: 'Deep focus sessions',
      frequency: 0.39,
      userSegment: 'Deep workers (18% of users)',
      learningConfidence: 0.88,
      adaptationsMade: 31,
      effectivenessScore: 0.92,
      examples: ['Distraction blocking', 'Extended session modes', 'Focus metrics'],
      trend: 'stable'
    },
    {
      pattern: 'Collaborative spike patterns',
      frequency: 0.52,
      userSegment: 'Team coordinators (28% of users)',
      learningConfidence: 0.79,
      adaptationsMade: 19,
      effectivenessScore: 0.71,
      examples: ['Team availability sync', 'Meeting optimization', 'Shared context loading'],
      trend: 'emerging'
    }
  ]);

  const [learningEvents, setLearningEvents] = useState<LearningEvent[]>([
    {
      timestamp: new Date(Date.now() - 180000),
      eventType: 'Pattern Recognition',
      userAction: 'Repeated search for specific data type',
      systemResponse: 'Added quick-access shortcut',
      outcomeSuccess: true,
      confidenceChange: 0.12,
      adaptationTriggered: true
    },
    {
      timestamp: new Date(Date.now() - 420000),
      eventType: 'Behavior Prediction',
      userAction: 'Started morning routine early',
      systemResponse: 'Pre-loaded dashboard 15min earlier',
      outcomeSuccess: true,
      confidenceChange: 0.08,
      adaptationTriggered: false
    },
    {
      timestamp: new Date(Date.now() - 720000),
      eventType: 'Context Learning',
      userAction: 'Opened report during meeting',
      systemResponse: 'Suggested presentation mode',
      outcomeSuccess: false,
      confidenceChange: -0.05,
      adaptationTriggered: true
    }
  ]);

  const [adaptiveFeatures, setAdaptiveFeatures] = useState<AdaptiveFeature[]>([
    {
      feature: 'Smart Menu Ordering',
      description: 'Reorders menu items based on usage patterns',
      learningMethod: 'Frequency analysis + temporal patterns',
      adaptationSpeed: 'fast',
      accuracy: 0.89,
      userSatisfaction: 0.84,
      adaptations: 156,
      falsePositives: 12
    },
    {
      feature: 'Predictive Data Loading',
      description: 'Pre-loads data user is likely to need next',
      learningMethod: 'Sequence mining + context analysis',
      adaptationSpeed: 'medium',
      accuracy: 0.76,
      userSatisfaction: 0.91,
      adaptations: 89,
      falsePositives: 23
    },
    {
      feature: 'Adaptive Interface Density',
      description: 'Adjusts information density based on user focus patterns',
      learningMethod: 'Attention tracking + performance correlation',
      adaptationSpeed: 'slow',
      accuracy: 0.82,
      userSatisfaction: 0.88,
      adaptations: 34,
      falsePositives: 7
    },
    {
      feature: 'Contextual Help Timing',
      description: 'Shows help exactly when user needs it',
      learningMethod: 'Frustration detection + success prediction',
      adaptationSpeed: 'medium',
      accuracy: 0.71,
      userSatisfaction: 0.79,
      adaptations: 67,
      falsePositives: 19
    }
  ]);

  const [systemLearning, setSystemLearning] = useState<SystemLearning[]>([
    {
      component: 'Navigation System',
      dataPoints: 47832,
      patterns: 127,
      accuracy: 0.89,
      adaptations: 234,
      userFeedback: 0.87,
      learningRate: 0.34
    },
    {
      component: 'Content Recommendations',
      dataPoints: 23917,
      patterns: 89,
      accuracy: 0.73,
      adaptations: 156,
      userFeedback: 0.76,
      learningRate: 0.28
    },
    {
      component: 'Performance Optimization',
      dataPoints: 156823,
      patterns: 203,
      accuracy: 0.91,
      adaptations: 89,
      userFeedback: 0.93,
      learningRate: 0.19
    }
  ]);

  const [liveMetrics, setLiveMetrics] = useState<MetricData[]>([
    { label: 'Learning Events', value: '2,347/day', trend: 'up', learning: 0.89 },
    { label: 'Pattern Recognition', value: '94.7%', trend: 'up', learning: 0.94 },
    { label: 'Adaptation Success', value: '76.8%', trend: 'stable', learning: 0.77 },
    { label: 'User Satisfaction', value: '8.3/10', trend: 'up', learning: 0.83 }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 100]);

  useEffect(() => {
    // Simulate continuous learning and adaptation
    const learningInterval = setInterval(() => {
      // Update usage patterns based on learning
      setUsagePatterns(prev => prev.map(pattern => ({
        ...pattern,
        frequency: Math.max(0.1, Math.min(0.95, pattern.frequency + (Math.random() * 0.04 - 0.02))),
        learningConfidence: Math.max(0.3, Math.min(0.98, pattern.learningConfidence + (Math.random() * 0.06 - 0.03))),
        effectivenessScore: Math.max(0.1, Math.min(1, pattern.effectivenessScore + (Math.random() * 0.05 - 0.025))),
        adaptationsMade: pattern.adaptationsMade + (Math.random() < 0.3 ? 1 : 0)
      })));

      // Update adaptive features
      setAdaptiveFeatures(prev => prev.map(feature => ({
        ...feature,
        accuracy: Math.max(0.5, Math.min(0.98, feature.accuracy + (Math.random() * 0.04 - 0.02))),
        userSatisfaction: Math.max(0.3, Math.min(1, feature.userSatisfaction + (Math.random() * 0.03 - 0.015))),
        adaptations: feature.adaptations + (Math.random() < 0.2 ? 1 : 0),
        falsePositives: Math.max(0, feature.falsePositives + (Math.random() < 0.1 ? 1 : Math.random() < 0.05 ? -1 : 0))
      })));

      // Generate new learning events occasionally
      if (Math.random() < 0.15) {
        const eventTypes = ['Pattern Recognition', 'Behavior Prediction', 'Context Learning', 'Adaptation Feedback'];
        const userActions = [
          'Changed workflow sequence',
          'Used new feature combination',
          'Provided explicit feedback',
          'Demonstrated new usage pattern',
          'Reverted system suggestion'
        ];
        const systemResponses = [
          'Updated prediction model',
          'Adjusted interface layout',
          'Modified recommendation algorithm',
          'Refined pattern detection',
          'Rolled back adaptation'
        ];

        const newEvent: LearningEvent = {
          timestamp: new Date(),
          eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          userAction: userActions[Math.floor(Math.random() * userActions.length)],
          systemResponse: systemResponses[Math.floor(Math.random() * systemResponses.length)],
          outcomeSuccess: Math.random() > 0.25,
          confidenceChange: (Math.random() * 0.2 - 0.1),
          adaptationTriggered: Math.random() > 0.4
        };

        setLearningEvents(prev => [newEvent, ...prev.slice(0, 9)]);
      }
    }, 3000);

    // Update system learning metrics
    const systemInterval = setInterval(() => {
      setSystemLearning(prev => prev.map(system => ({
        ...system,
        dataPoints: system.dataPoints + Math.floor(Math.random() * 100 + 20),
        patterns: system.patterns + (Math.random() < 0.1 ? 1 : 0),
        accuracy: Math.max(0.5, Math.min(0.98, system.accuracy + (Math.random() * 0.03 - 0.015))),
        adaptations: system.adaptations + (Math.random() < 0.2 ? 1 : 0),
        userFeedback: Math.max(0.3, Math.min(1, system.userFeedback + (Math.random() * 0.04 - 0.02)))
      })));
    }, 4000);

    return () => {
      clearInterval(learningInterval);
      clearInterval(systemInterval);
    };
  }, []);

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
                <SpatialText level="caption" className="text-emerald-400 font-mono">
                  WORKSHOP // SYSTEMS-THAT-LEARN
                </SpatialText>
                <div className="flex items-center gap-2">
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <SpatialText level="caption" className="text-gray-100/60">
                    Live Learning Active
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
                      metric.trend === 'up' ? 'text-emerald-400' :
                      metric.trend === 'down' ? 'text-orange-500' :
                      'text-gray-100/60'
                    }`}>
                      {metric.value}
                    </span>
                    {metric.learning && (
                      <div className="w-8 h-1 bg-pearl/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-emerald-400/60"
                          animate={{ width: `${metric.learning * 100}%` }}
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
                          Building Systems That Learn From Usage
                        </SpatialText>
                        <SpatialText level="subtitle" className="text-gray-100/60 italic">
                          Workshop Note - Adaptive Intelligence in Operational Systems
                        </SpatialText>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="space-y-8"
                      >
                        <div className="border-l-2 border-emerald-400/30 pl-8 space-y-6">
                          <SpatialText level="body" className="text-gray-100/80 leading-relaxed">
                            Most systems are built once and remain static. But the most powerful operational 
                            tools continuously evolve by observing how people actually use them. They detect 
                            patterns, adapt interfaces, optimize workflows, and become more useful over time. 
                            The system learns from every interaction, building intelligence from usage data.
                          </SpatialText>
                          
                          <SpatialText level="title" className="text-emerald-400">
                            The best systems get smarter every day, not just with updates, but through use itself.
                          </SpatialText>
                        </div>

                        {/* Live Usage Pattern Learning */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9, duration: 0.8 }}
                          className="bg-gradient-to-br from-emerald-400/5 to-transparent border border-emerald-400/20 rounded-lg p-8 mt-12"
                        >
                          <SpatialText level="title" className="text-emerald-400 mb-6">
                            Live Usage Pattern Learning
                          </SpatialText>
                          
                          <div className="space-y-6">
                            {usagePatterns.map((pattern, i) => (
                              <motion.div
                                key={pattern.pattern}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.2 + i * 0.15 }}
                                className={`bg-gradient-to-r from-gray-500/[0.05] to-transparent border-l-4 rounded-r-lg p-6 ${
                                  pattern.trend === 'emerging' ? 'border-blue-500/60' :
                                  pattern.trend === 'declining' ? 'border-red-500/60' :
                                  'border-emerald-500/60'
                                }`}
                              >
                                <div className="grid grid-cols-3 gap-8">
                                  <div>
                                    <div className="flex items-center gap-3 mb-2">
                                      <SpatialText level="title" className="text-gray-100">
                                        {pattern.pattern}
                                      </SpatialText>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        pattern.trend === 'emerging' ? 'bg-blue-500/20 text-blue-400' :
                                        pattern.trend === 'declining' ? 'bg-red-500/20 text-red-400' :
                                        'bg-emerald-500/20 text-emerald-400'
                                      }`}>
                                        {pattern.trend.toUpperCase()}
                                      </span>
                                    </div>
                                    <SpatialText level="body" className="text-gray-100/60 mb-3">
                                      {pattern.userSegment}
                                    </SpatialText>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <SpatialText level="caption" className="text-gray-100/50">
                                          Frequency:
                                        </SpatialText>
                                        <span className="font-mono text-sm text-emerald-400">
                                          {(pattern.frequency * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <SpatialText level="caption" className="text-gray-100/50">
                                          Adaptations Made:
                                        </SpatialText>
                                        <span className="font-mono text-sm text-cyan-400">
                                          {pattern.adaptationsMade}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                      Learning Metrics:
                                    </SpatialText>
                                    <div className="space-y-3">
                                      {[
                                        { label: 'Confidence', value: pattern.learningConfidence, color: 'text-green-400' },
                                        { label: 'Effectiveness', value: pattern.effectivenessScore, color: 'text-blue-400' }
                                      ].map((metric, j) => (
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
                                                metric.color.includes('green') ? 'bg-green-400' : 'bg-blue-400'
                                              }`}
                                              animate={{ width: `${metric.value * 100}%` }}
                                              transition={{ delay: 1.5 + i * 0.1 + j * 0.05, duration: 0.8 }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                      System Adaptations:
                                    </SpatialText>
                                    <div className="space-y-2">
                                      {pattern.examples.map((example, k) => (
                                        <div
                                          key={example}
                                          className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20"
                                        >
                                          {example}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Live Learning Events */}
                <ReadingPlane sectionId="learning-events" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-6xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Real-Time Learning Events
                      </SpatialText>
                      
                      <div className="space-y-4">
                        {learningEvents.map((event, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-4 rounded-lg border-l-4 ${
                              event.outcomeSuccess 
                                ? 'border-green-500 bg-green-500/5' 
                                : 'border-red-500 bg-red-500/5'
                            }`}
                          >
                            <div className="grid grid-cols-4 gap-6 items-center">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    event.outcomeSuccess ? 'bg-green-400' : 'bg-red-400'
                                  }`} />
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    {event.timestamp.toLocaleTimeString()}
                                  </SpatialText>
                                </div>
                                <SpatialText level="title" className={
                                  event.outcomeSuccess ? 'text-green-400' : 'text-red-400'
                                }>
                                  {event.eventType}
                                </SpatialText>
                                {event.adaptationTriggered && (
                                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full mt-1 inline-block">
                                    ADAPTATION TRIGGERED
                                  </span>
                                )}
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-1">
                                  User Action:
                                </SpatialText>
                                <SpatialText level="body" className="text-gray-100/80">
                                  {event.userAction}
                                </SpatialText>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-1">
                                  System Response:
                                </SpatialText>
                                <SpatialText level="body" className="text-gray-100/80">
                                  {event.systemResponse}
                                </SpatialText>
                              </div>
                              
                              <div className="text-right">
                                <SpatialText level="caption" className="text-gray-100/50 mb-1">
                                  Confidence Change:
                                </SpatialText>
                                <span className={`font-mono text-lg ${
                                  event.confidenceChange > 0 ? 'text-green-400' : 
                                  event.confidenceChange < 0 ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                  {event.confidenceChange > 0 ? '+' : ''}{(event.confidenceChange * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Learning Principles */}
                      <div className="mt-16 p-8 bg-gradient-to-br from-emerald-400/10 to-transparent border border-emerald-400/30 rounded-lg">
                        <SpatialText level="title" className="text-emerald-400 mb-4">
                          The Learning System Principle
                        </SpatialText>
                        <blockquote className="text-gray-100/80 italic text-lg leading-relaxed mb-4">
                          "Every user interaction contains information about how the system could work better. 
                          The challenge isn't collecting this data - it's transforming it into actionable improvements."
                        </blockquote>
                        <SpatialText level="body" className="text-gray-100/70">
                          Learning systems create a feedback loop: better adaptation leads to more usage, 
                          which generates more data, enabling even better adaptation.
                        </SpatialText>
                      </div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Adaptive Features Dashboard */}
                <ReadingPlane sectionId="adaptive-features" priority="primary" className="min-h-screen flex items-center">
                  <motion.section className="max-w-6xl mx-auto px-8 py-16">
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Adaptive Features Dashboard
                      </SpatialText>

                      <div className="grid gap-6">
                        {adaptiveFeatures.map((feature, i) => (
                          <motion.div
                            key={feature.feature}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="bg-gradient-to-br from-cyan-500/[0.05] to-transparent border border-cyan-500/20 rounded-lg p-6"
                          >
                            <div className="grid grid-cols-3 gap-8">
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-2">
                                  {feature.feature}
                                </SpatialText>
                                <SpatialText level="body" className="text-gray-100/70 mb-4">
                                  {feature.description}
                                </SpatialText>
                                <div className="space-y-2">
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Learning Method:
                                    </SpatialText>
                                    <SpatialText level="caption" className="text-cyan-400">
                                      {feature.learningMethod}
                                    </SpatialText>
                                  </div>
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Adaptation Speed:
                                    </SpatialText>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      feature.adaptationSpeed === 'fast' ? 'bg-red-500/20 text-red-400' :
                                      feature.adaptationSpeed === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-blue-500/20 text-blue-400'
                                    }`}>
                                      {feature.adaptationSpeed.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                  Performance Metrics:
                                </SpatialText>
                                <div className="space-y-3">
                                  {[
                                    { label: 'Accuracy', value: feature.accuracy, color: 'text-green-400' },
                                    { label: 'User Satisfaction', value: feature.userSatisfaction, color: 'text-blue-400' }
                                  ].map((metric, j) => (
                                    <div key={metric.label}>
                                      <div className="flex justify-between items-center mb-1">
                                        <SpatialText level="caption" className="text-gray-100/60">
                                          {metric.label}
                                        </SpatialText>
                                        <span className={`font-mono text-sm ${metric.color}`}>
                                          {(metric.value * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                      <div className="h-2 bg-pearl/10 rounded-full overflow-hidden">
                                        <motion.div
                                          className={`h-full ${
                                            metric.color.includes('green') ? 'bg-green-400' : 'bg-blue-400'
                                          }`}
                                          animate={{ width: `${metric.value * 100}%` }}
                                          transition={{ delay: 0.5 + j * 0.1, duration: 0.8 }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                  Learning Statistics:
                                </SpatialText>
                                <div className="space-y-3">
                                  <div className="flex justify-between">
                                    <SpatialText level="caption" className="text-gray-100/60">
                                      Total Adaptations:
                                    </SpatialText>
                                    <span className="font-mono text-sm text-cyan-400">
                                      {feature.adaptations}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <SpatialText level="caption" className="text-gray-100/60">
                                      False Positives:
                                    </SpatialText>
                                    <span className="font-mono text-sm text-orange-400">
                                      {feature.falsePositives}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <SpatialText level="caption" className="text-gray-100/60">
                                      Success Rate:
                                    </SpatialText>
                                    <span className="font-mono text-sm text-green-400">
                                      {(((feature.adaptations - feature.falsePositives) / feature.adaptations) * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* System Learning Overview */}
                      <div className="grid gap-6 mt-16">
                        <SpatialText level="title" className="text-gray-100">
                          System Learning Overview
                        </SpatialText>
                        
                        {systemLearning.map((system, i) => (
                          <motion.div
                            key={system.component}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className="bg-gradient-to-r from-purple-500/[0.05] to-transparent border-l-4 border-purple-500/40 p-6 rounded-r-lg"
                          >
                            <div className="grid grid-cols-6 gap-4 items-center">
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-1">
                                  {system.component}
                                </SpatialText>
                                <SpatialText level="caption" className="text-gray-100/50">
                                  Learning Rate: {(system.learningRate * 100).toFixed(0)}%
                                </SpatialText>
                              </div>
                              
                              {[
                                { label: 'Data Points', value: system.dataPoints.toLocaleString(), color: 'text-cyan-400' },
                                { label: 'Patterns', value: system.patterns.toString(), color: 'text-blue-400' },
                                { label: 'Accuracy', value: `${(system.accuracy * 100).toFixed(0)}%`, color: 'text-green-400' },
                                { label: 'Adaptations', value: system.adaptations.toString(), color: 'text-purple-400' },
                                { label: 'Feedback', value: `${(system.userFeedback * 100).toFixed(0)}%`, color: 'text-orange-400' }
                              ].map((metric, j) => (
                                <div key={metric.label} className="text-center">
                                  <div className={`font-mono text-lg mb-1 ${metric.color}`}>
                                    {metric.value}
                                  </div>
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    {metric.label}
                                  </SpatialText>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Learning System Design Principles */}
                      <div className="grid grid-cols-2 gap-8 mt-16">
                        {[
                          {
                            principle: 'Observe Without Intruding',
                            description: 'Collect behavioral data that doesn\'t impact user workflow',
                            implementation: 'Passive analytics, implicit feedback, performance monitoring'
                          },
                          {
                            principle: 'Start Simple, Learn Complex',
                            description: 'Begin with basic patterns and gradually build sophistication',
                            implementation: 'Frequency analysis → sequence mining → context understanding'
                          },
                          {
                            principle: 'Fail Fast, Adapt Faster',
                            description: 'Quickly detect when adaptations aren\'t working',
                            implementation: 'Real-time feedback loops, A/B testing, rollback mechanisms'
                          },
                          {
                            principle: 'Make Learning Visible',
                            description: 'Users should understand why the system adapted',
                            implementation: 'Adaptation notifications, reasoning explanations, control options'
                          }
                        ].map((item, i) => (
                          <motion.div
                            key={item.principle}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.15 }}
                            className="bg-gradient-to-br from-pearl/[0.03] to-transparent border border-gray-100/10 rounded-lg p-6"
                          >
                            <SpatialText level="title" className="text-emerald-400 mb-2">
                              {item.principle}
                            </SpatialText>
                            <SpatialText level="body" className="text-gray-100/70 mb-3">
                              {item.description}
                            </SpatialText>
                            <SpatialText level="caption" className="text-gray-100/50 italic">
                              Implementation: {item.implementation}
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
                          The most intelligent systems are those that become more useful not through programming, 
                          but through paying attention to how they're actually used.
                        </SpatialText>
                        <SpatialText level="caption" className="text-emerald-400">
                          Every user interaction is a teacher - the question is whether your system is listening.
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
              Learning Progress
            </SpatialText>
            <div className="w-32 h-1 bg-pearl/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-400/50"
                style={{ width: progressScale }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AtelierDesignProvider>
  );
}