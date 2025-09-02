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
  console.log('Hidden Queue Patterns Workshop initializing...');
}

interface Queue {
  name: string;
  location: string;
  type: 'visible' | 'invisible' | 'digital' | 'cognitive';
  currentLength: number;
  arrivalRate: number; // items/hour
  serviceRate: number; // items/hour
  utilization: number;
  averageWaitTime: number; // minutes
  throughput: number;
  bottleneck: boolean;
  hidden: boolean;
}

interface LittlesLawCalculation {
  queueName: string;
  L: number; // Average number in system
  lambda: number; // Arrival rate
  W: number; // Average time in system
  isValid: boolean;
  insight: string;
}

interface QueuePattern {
  pattern: string;
  description: string;
  frequency: number;
  impact: number;
  examples: string[];
  hiddenCost: number; // hours/day
}

interface MetricData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  queueHealth?: number;
}

export default function HiddenQueuePatternsWorkshop() {
  console.log('HiddenQueuePatternsWorkshop rendering...');
  
  const [discoveredQueues, setDiscoveredQueues] = useState<Queue[]>([
    {
      name: 'Code Review Queue',
      location: 'GitHub/Development',
      type: 'digital',
      currentLength: 23,
      arrivalRate: 8.5,
      serviceRate: 6.2,
      utilization: 0.87,
      averageWaitTime: 186,
      throughput: 6.2,
      bottleneck: true,
      hidden: false
    },
    {
      name: 'Manager Approval Chain',
      location: 'Email/Slack threads',
      type: 'invisible',
      currentLength: 47,
      arrivalRate: 12.3,
      serviceRate: 8.1,
      utilization: 0.93,
      averageWaitTime: 348,
      throughput: 7.5,
      bottleneck: true,
      hidden: true
    },
    {
      name: 'Context Switching Buffer',
      location: 'Individual minds',
      type: 'cognitive',
      currentLength: 156,
      arrivalRate: 24.7,
      serviceRate: 18.2,
      utilization: 0.74,
      averageWaitTime: 512,
      throughput: 18.2,
      bottleneck: false,
      hidden: true
    },
    {
      name: 'Customer Support Tickets',
      location: 'Zendesk',
      type: 'visible',
      currentLength: 89,
      arrivalRate: 15.8,
      serviceRate: 14.3,
      utilization: 0.91,
      averageWaitTime: 374,
      throughput: 13.0,
      bottleneck: true,
      hidden: false
    }
  ]);

  const [littlesLawResults, setLittlesLawResults] = useState<LittlesLawCalculation[]>([]);
  
  const [queuePatterns, setQueuePatterns] = useState<QueuePattern[]>([
    {
      pattern: 'Invisible Hand-offs',
      description: 'Work passes between people without explicit queues',
      frequency: 0.89,
      impact: 0.76,
      examples: ['Email chains', 'Slack threads', 'Implicit dependencies'],
      hiddenCost: 3.4
    },
    {
      pattern: 'Cognitive Overload Buffers',
      description: 'Mental task switching creates internal queues',
      frequency: 0.94,
      impact: 0.82,
      examples: ['Context switching', 'Interrupted workflows', 'Meeting fatigue'],
      hiddenCost: 5.7
    },
    {
      pattern: 'Waiting for Information',
      description: 'Blocked tasks create implicit queues',
      frequency: 0.78,
      impact: 0.91,
      examples: ['Missing requirements', 'Delayed decisions', 'External dependencies'],
      hiddenCost: 4.2
    },
    {
      pattern: 'Batch Processing Delays',
      description: 'Artificial batching creates unnecessary waiting',
      frequency: 0.65,
      impact: 0.69,
      examples: ['Weekly reviews', 'Monthly deployments', 'Scheduled meetings'],
      hiddenCost: 2.8
    }
  ]);

  const [liveMetrics, setLiveMetrics] = useState<MetricData[]>([
    { label: 'Queues Discovered', value: '47', trend: 'up', queueHealth: 0.73 },
    { label: 'Avg Wait Time', value: '4.2 hrs', trend: 'down', queueHealth: 0.68 },
    { label: 'Hidden Queue Cost', value: '$127K/mo', trend: 'stable', queueHealth: 0.45 },
    { label: 'Bottleneck Detection', value: '89%', trend: 'up', queueHealth: 0.91 }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 100]);

  // Calculate Little's Law for each queue
  useEffect(() => {
    const calculations = discoveredQueues.map(queue => {
      // Little's Law: L = λ × W
      const L = queue.currentLength;
      const lambda = queue.arrivalRate;
      const W = queue.averageWaitTime / 60; // Convert to hours
      
      const calculatedL = lambda * W;
      const isValid = Math.abs(L - calculatedL) / L < 0.2; // Within 20%
      
      let insight = '';
      if (queue.utilization > 0.9) {
        insight = 'Critical bottleneck - system at capacity';
      } else if (queue.utilization > 0.8) {
        insight = 'High utilization - monitor for degradation';
      } else if (W > 8) {
        insight = 'Long wait times - investigate service capacity';
      } else if (queue.hidden) {
        insight = 'Hidden queue - consider making visible';
      } else {
        insight = 'Queue operating within normal parameters';
      }

      return {
        queueName: queue.name,
        L,
        lambda,
        W,
        isValid,
        insight
      };
    });
    
    setLittlesLawResults(calculations);
  }, [discoveredQueues]);

  useEffect(() => {
    // Simulate queue discovery and updates
    const queueInterval = setInterval(() => {
      setDiscoveredQueues(prev => prev.map(queue => ({
        ...queue,
        currentLength: Math.max(0, queue.currentLength + Math.floor(Math.random() * 6 - 3)),
        arrivalRate: Math.max(0.1, queue.arrivalRate + (Math.random() * 2 - 1)),
        serviceRate: Math.max(0.1, queue.serviceRate + (Math.random() * 1.5 - 0.75)),
        utilization: Math.min(1, Math.max(0, queue.utilization + (Math.random() * 0.1 - 0.05))),
        averageWaitTime: Math.max(1, queue.averageWaitTime + (Math.random() * 60 - 30))
      })));
    }, 3000);

    // Update pattern recognition
    const patternInterval = setInterval(() => {
      setQueuePatterns(prev => prev.map(pattern => ({
        ...pattern,
        frequency: Math.max(0.1, Math.min(1, pattern.frequency + (Math.random() * 0.05 - 0.025))),
        impact: Math.max(0.1, Math.min(1, pattern.impact + (Math.random() * 0.04 - 0.02))),
        hiddenCost: Math.max(0, pattern.hiddenCost + (Math.random() * 0.4 - 0.2))
      })));
    }, 4000);

    // Update live metrics
    const metricsInterval = setInterval(() => {
      setLiveMetrics(prev => prev.map(metric => ({
        ...metric,
        value: metric.label === 'Queues Discovered' 
          ? `${45 + Math.floor(Math.random() * 8)}`
          : metric.label === 'Avg Wait Time'
          ? `${(3.8 + Math.random() * 1.2).toFixed(1)} hrs`
          : metric.label === 'Hidden Queue Cost'
          ? `$${(120 + Math.random() * 20).toFixed(0)}K/mo`
          : `${(85 + Math.random() * 10).toFixed(0)}%`,
        trend: Math.random() > 0.7 ? 'up' : Math.random() > 0.4 ? 'stable' : 'down'
      })));
    }, 5000);

    return () => {
      clearInterval(queueInterval);
      clearInterval(patternInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  return (
    <AtelierDesignProvider>
      <div className="min-h-screen relative bg-gradient-to-b from-black via-gray-900 to-gray-800 overflow-hidden">
        {/* Operational Background Systems */}
        <AmbientSystem
          intensity={0.3}
          followMouse={true}
          breathingRate={9000}
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
                <SpatialText level="caption" className="text-blue-400 font-mono">
                  WORKSHOP // HIDDEN-QUEUE-PATTERNS
                </SpatialText>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <SpatialText level="caption" className="text-gray-100/60">
                    Queue Discovery Active
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
                      metric.trend === 'up' ? 'text-blue-400' :
                      metric.trend === 'down' ? 'text-orange-500' :
                      'text-gray-100/60'
                    }`}>
                      {metric.value}
                    </span>
                    {metric.queueHealth && (
                      <div className="w-8 h-1 bg-pearl/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-400/60"
                          animate={{ width: `${metric.queueHealth * 100}%` }}
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
                          Finding Hidden Queues in Operations
                        </SpatialText>
                        <SpatialText level="subtitle" className="text-gray-100/60 italic">
                          Workshop Note - Queue Theory Applied to Organizational Flow
                        </SpatialText>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="space-y-8"
                      >
                        <div className="border-l-2 border-blue-400/30 pl-8 space-y-6">
                          <SpatialText level="body" className="text-gray-100/80 leading-relaxed">
                            Every organization has visible queues - support tickets, feature requests, hiring pipelines. 
                            But the hidden queues are where the real bottlenecks live: waiting for approvals, 
                            context switching, blocked dependencies, cognitive overload. Little's Law applies 
                            to all of them, whether we measure them or not.
                          </SpatialText>
                          
                          <SpatialText level="title" className="text-blue-400">
                            The most expensive queues are the ones we pretend don't exist.
                          </SpatialText>
                        </div>

                        {/* Queue Discovery Dashboard */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9, duration: 0.8 }}
                          className="bg-gradient-to-br from-blue-400/5 to-transparent border border-blue-400/20 rounded-lg p-8 mt-12"
                        >
                          <SpatialText level="title" className="text-blue-400 mb-6">
                            Live Queue Discovery
                          </SpatialText>
                          
                          <div className="grid gap-4">
                            {discoveredQueues.map((queue, i) => (
                              <motion.div
                                key={queue.name}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.2 + i * 0.15 }}
                                className={`relative p-4 rounded-lg border-l-4 overflow-hidden ${
                                  queue.bottleneck ? 'border-red-500 bg-red-500/5' :
                                  queue.utilization > 0.8 ? 'border-orange-500 bg-orange-500/5' :
                                  'border-blue-500 bg-blue-500/5'
                                } ${queue.hidden ? 'opacity-80 border-dashed' : ''}`}
                              >
                                <div className="grid grid-cols-6 gap-4 items-center">
                                  <div className="col-span-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <SpatialText level="body" className="text-gray-100/90">
                                        {queue.name}
                                      </SpatialText>
                                      {queue.hidden && (
                                        <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full">
                                          HIDDEN
                                        </span>
                                      )}
                                      {queue.bottleneck && (
                                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                                          BOTTLENECK
                                        </span>
                                      )}
                                    </div>
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      {queue.location} • {queue.type}
                                    </SpatialText>
                                  </div>
                                  
                                  <div className="text-center">
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Current Length
                                    </SpatialText>
                                    <div className="font-mono text-lg text-blue-400">
                                      {queue.currentLength}
                                    </div>
                                  </div>
                                  
                                  <div className="text-center">
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Utilization
                                    </SpatialText>
                                    <div className={`font-mono text-lg ${
                                      queue.utilization > 0.9 ? 'text-red-400' :
                                      queue.utilization > 0.8 ? 'text-orange-400' :
                                      'text-green-400'
                                    }`}>
                                      {(queue.utilization * 100).toFixed(0)}%
                                    </div>
                                  </div>
                                  
                                  <div className="text-center">
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Avg Wait
                                    </SpatialText>
                                    <div className="font-mono text-lg text-orange-400">
                                      {Math.floor(queue.averageWaitTime / 60)}h {queue.averageWaitTime % 60}m
                                    </div>
                                  </div>
                                  
                                  <div className="text-center">
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Throughput
                                    </SpatialText>
                                    <div className="font-mono text-lg text-cyan-400">
                                      {queue.throughput.toFixed(1)}/hr
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Queue Flow Visualization */}
                                <div className="mt-4 pt-3 border-t border-gray-100/10">
                                  <div className="flex items-center justify-between text-xs text-gray-100/40">
                                    <span>Arrival: {queue.arrivalRate.toFixed(1)}/hr</span>
                                    <span>Service: {queue.serviceRate.toFixed(1)}/hr</span>
                                    <span>λ/μ = {(queue.arrivalRate / queue.serviceRate).toFixed(2)}</span>
                                  </div>
                                  <div className="mt-2 h-1 bg-pearl/10 rounded-full overflow-hidden">
                                    <motion.div
                                      className={`h-full ${
                                        queue.utilization > 0.9 ? 'bg-red-400' :
                                        queue.utilization > 0.8 ? 'bg-orange-400' :
                                        'bg-green-400'
                                      }`}
                                      animate={{ width: `${queue.utilization * 100}%` }}
                                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                                    />
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

                {/* Little's Law Calculator */}
                <ReadingPlane sectionId="littles-law" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-6xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <div className="text-center space-y-4">
                        <SpatialText level="hero" className="text-gray-100">
                          Little's Law Calculator
                        </SpatialText>
                        <SpatialText level="body" className="text-gray-100/60">
                          L = λ × W | Average items in system = Arrival rate × Average time in system
                        </SpatialText>
                      </div>
                      
                      <div className="space-y-6">
                        {littlesLawResults.map((result, i) => (
                          <motion.div
                            key={result.queueName}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className={`bg-gradient-to-br from-pearl/[0.03] to-transparent border rounded-lg p-6 ${
                              result.isValid ? 'border-green-400/20' : 'border-orange-400/20'
                            }`}
                          >
                            <div className="grid grid-cols-2 gap-8">
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-4">
                                  {result.queueName}
                                </SpatialText>
                                
                                <div className="space-y-4">
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-blue-500/10 rounded">
                                      <div className="text-2xl font-mono text-blue-400 mb-1">
                                        {result.L}
                                      </div>
                                      <SpatialText level="caption" className="text-gray-100/50">
                                        L (Items)
                                      </SpatialText>
                                    </div>
                                    
                                    <div className="text-center p-3 bg-cyan-500/10 rounded">
                                      <div className="text-2xl font-mono text-cyan-400 mb-1">
                                        {result.lambda.toFixed(1)}
                                      </div>
                                      <SpatialText level="caption" className="text-gray-100/50">
                                        λ (Rate/hr)
                                      </SpatialText>
                                    </div>
                                    
                                    <div className="text-center p-3 bg-purple-500/10 rounded">
                                      <div className="text-2xl font-mono text-purple-400 mb-1">
                                        {result.W.toFixed(1)}
                                      </div>
                                      <SpatialText level="caption" className="text-gray-100/50">
                                        W (Hours)
                                      </SpatialText>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-center gap-4 text-2xl text-gray-100/60">
                                    <span className="font-mono text-blue-400">{result.L}</span>
                                    <span>=</span>
                                    <span className="font-mono text-cyan-400">{result.lambda.toFixed(1)}</span>
                                    <span>×</span>
                                    <span className="font-mono text-purple-400">{result.W.toFixed(1)}</span>
                                    <span className="text-lg">
                                      = <span className="font-mono text-green-400">{(result.lambda * result.W).toFixed(1)}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-3 mb-4">
                                  <div className={`w-4 h-4 rounded-full ${
                                    result.isValid ? 'bg-green-400' : 'bg-orange-400'
                                  }`} />
                                  <SpatialText level="title" className={result.isValid ? 'text-green-400' : 'text-orange-400'}>
                                    {result.isValid ? 'Law Verified' : 'Measurement Discrepancy'}
                                  </SpatialText>
                                </div>
                                
                                <div className="space-y-3">
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50 mb-2">
                                      Analysis:
                                    </SpatialText>
                                    <SpatialText level="body" className="text-gray-100/80">
                                      {result.insight}
                                    </SpatialText>
                                  </div>
                                  
                                  {!result.isValid && (
                                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded">
                                      <SpatialText level="caption" className="text-orange-400">
                                        Discrepancy suggests measurement error or queue instability.
                                        Consider improving data collection or analyzing queue dynamics.
                                      </SpatialText>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Little's Law Insight */}
                      <div className="mt-16 p-8 bg-gradient-to-br from-blue-400/10 to-transparent border border-blue-400/30 rounded-lg">
                        <SpatialText level="title" className="text-blue-400 mb-4">
                          The Universal Queue Law
                        </SpatialText>
                        <blockquote className="text-gray-100/80 italic text-lg leading-relaxed mb-4">
                          "Little's Law holds for any stable system in steady state - from manufacturing lines 
                          to email queues to cognitive load. If you can measure two variables, you can derive the third."
                        </blockquote>
                        <SpatialText level="body" className="text-gray-100/70">
                          This mathematical relationship reveals hidden bottlenecks, validates measurements, 
                          and predicts system behavior under different loads.
                        </SpatialText>
                      </div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Hidden Queue Patterns */}
                <ReadingPlane sectionId="patterns" priority="primary" className="min-h-screen flex items-center">
                  <motion.section className="max-w-6xl mx-auto px-8 py-16">
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Hidden Queue Patterns
                      </SpatialText>

                      <div className="space-y-6">
                        {queuePatterns.map((pattern, i) => (
                          <motion.div
                            key={pattern.pattern}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="bg-gradient-to-r from-purple-500/[0.05] to-transparent border-l-4 border-purple-500/40 p-6 rounded-r-lg"
                          >
                            <div className="grid grid-cols-3 gap-8">
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-2">
                                  {pattern.pattern}
                                </SpatialText>
                                <SpatialText level="body" className="text-gray-100/70 mb-4">
                                  {pattern.description}
                                </SpatialText>
                                <div className="flex items-center gap-4">
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Hidden Cost:
                                    </SpatialText>
                                    <div className="font-mono text-orange-400">
                                      {pattern.hiddenCost.toFixed(1)}h/day
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                  Pattern Metrics:
                                </SpatialText>
                                <div className="space-y-3">
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <SpatialText level="caption" className="text-gray-100/60">
                                        Frequency
                                      </SpatialText>
                                      <span className="font-mono text-sm text-purple-400">
                                        {(pattern.frequency * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <div className="h-1 bg-pearl/10 rounded-full overflow-hidden">
                                      <motion.div
                                        className="h-full bg-purple-400"
                                        animate={{ width: `${pattern.frequency * 100}%` }}
                                        transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <SpatialText level="caption" className="text-gray-100/60">
                                        Impact
                                      </SpatialText>
                                      <span className="font-mono text-sm text-red-400">
                                        {(pattern.impact * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <div className="h-1 bg-pearl/10 rounded-full overflow-hidden">
                                      <motion.div
                                        className="h-full bg-red-400"
                                        animate={{ width: `${pattern.impact * 100}%` }}
                                        transition={{ delay: 0.7 + i * 0.1, duration: 0.8 }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                  Common Examples:
                                </SpatialText>
                                <div className="space-y-2">
                                  {pattern.examples.map((example, j) => (
                                    <div
                                      key={example}
                                      className="text-xs bg-gray-500/10 text-gray-300 px-2 py-1 rounded border border-gray-500/20"
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

                      {/* Queue Detection Strategies */}
                      <div className="grid grid-cols-2 gap-8 mt-16">
                        {[
                          {
                            strategy: 'Follow the Wait',
                            description: 'Track where people spend time waiting for something to happen',
                            techniques: ['Time tracking', 'Process mapping', 'Bottleneck interviews']
                          },
                          {
                            strategy: 'Measure the Invisible',
                            description: 'Instrument cognitive and digital queues that seem automatic',
                            techniques: ['Email thread analysis', 'Context switch tracking', 'Decision latency']
                          },
                          {
                            strategy: 'Apply Little\'s Law',
                            description: 'Use mathematical relationships to validate queue measurements',
                            techniques: ['WIP limits', 'Lead time analysis', 'Throughput calculation']
                          },
                          {
                            strategy: 'Make Hidden Visible',
                            description: 'Convert invisible queues into manageable, trackable systems',
                            techniques: ['Kanban boards', 'Status dashboards', 'Explicit handoff protocols']
                          }
                        ].map((item, i) => (
                          <motion.div
                            key={item.strategy}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.15 }}
                            className="bg-gradient-to-br from-pearl/[0.03] to-transparent border border-gray-100/10 rounded-lg p-6"
                          >
                            <SpatialText level="title" className="text-blue-400 mb-2">
                              {item.strategy}
                            </SpatialText>
                            <SpatialText level="body" className="text-gray-100/70 mb-4">
                              {item.description}
                            </SpatialText>
                            <div className="space-y-1">
                              <SpatialText level="caption" className="text-gray-100/50">
                                Techniques:
                              </SpatialText>
                              {item.techniques.map((technique, j) => (
                                <div key={technique} className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full inline-block mr-2 mb-1">
                                  {technique}
                                </div>
                              ))}
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
                          Every organization is a network of queues. The ones you can see are manageable. 
                          The ones you can't see are controlling you.
                        </SpatialText>
                        <SpatialText level="caption" className="text-blue-400">
                          Make the invisible queues visible, and suddenly they become improvable.
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
              Queue Analysis
            </SpatialText>
            <div className="w-32 h-1 bg-pearl/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-400/50"
                style={{ width: progressScale }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AtelierDesignProvider>
  );
}