'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Section = 'entry' | 'capabilities' | 'transformations' | 'examples' | 'access';

interface WorkshopCapabilitiesProps {
  onNavigate: (section: Section) => void;
}

interface Capability {
  id: string;
  name: string;
  phase: 'analysis' | 'design' | 'implementation' | 'optimization';
  duration: string;
  description: string;
  instruments: string[];
  outputs: string[];
  readoutData?: {
    efficiency: number;
    accuracy: number;
    coverage: number;
  };
}

const capabilities: Capability[] = [
  {
    id: 'operational-scan',
    name: 'Operational Deep Scan',
    phase: 'analysis',
    duration: '90 min',
    description: 'Comprehensive analysis of current manual processes, identifying automation opportunities and efficiency bottlenecks.',
    instruments: ['Process Tracer', 'Workflow Analyzer', 'Bottleneck Detector', 'Resource Monitor'],
    outputs: ['Process Map', 'Inefficiency Report', 'Automation Readiness Score'],
    readoutData: {
      efficiency: 87.3,
      accuracy: 94.8,
      coverage: 91.2
    }
  },
  {
    id: 'architecture-design',
    name: 'System Architecture Design',
    phase: 'design',
    duration: '120 min',
    description: 'Custom automation architecture tailored to your operational patterns and existing systems.',
    instruments: ['Architecture Synthesizer', 'Integration Mapper', 'Dependency Analyzer', 'Scale Projector'],
    outputs: ['System Blueprint', 'Integration Specs', 'Implementation Roadmap'],
    readoutData: {
      efficiency: 92.1,
      accuracy: 96.4,
      coverage: 88.7
    }
  },
  {
    id: 'prototype-build',
    name: 'Rapid Prototype Construction',
    phase: 'implementation',
    duration: '180 min',
    description: 'Live construction of working automation prototypes using your actual data and systems.',
    instruments: ['Code Generator', 'API Weaver', 'Test Harness', 'Performance Profiler'],
    outputs: ['Working Prototype', 'Test Results', 'Performance Metrics'],
    readoutData: {
      efficiency: 89.6,
      accuracy: 93.2,
      coverage: 95.1
    }
  },
  {
    id: 'optimization-tuning',
    name: 'Performance Optimization',
    phase: 'optimization',
    duration: '90 min',
    description: 'Fine-tuning of automation systems for maximum efficiency and reliability in your environment.',
    instruments: ['Performance Analyzer', 'Load Simulator', 'Error Predictor', 'Optimization Engine'],
    outputs: ['Tuned System', 'Performance Report', 'Maintenance Guide'],
    readoutData: {
      efficiency: 94.7,
      accuracy: 97.1,
      coverage: 92.3
    }
  }
];

export function WorkshopCapabilities({ onNavigate }: WorkshopCapabilitiesProps) {
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<string>('analysis');
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    // Simulate scanning progress
    const interval = setInterval(() => {
      setScanProgress(prev => (prev + 1) % 100);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const phaseColors = {
    analysis: 'living-cyan',
    design: 'copper',
    implementation: 'pearl',
    optimization: 'living-cyan'
  };

  return (
    <motion.section
      key="capabilities"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen pt-24 pb-32 px-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-light text-pearl mb-6">
            Workshop Capabilities
          </h1>
          <p className="text-xl text-pearl/70 font-light max-w-3xl mx-auto">
            A day-long intensive where we dissect your operations,
            design custom automation, and build working prototypes
          </p>
        </motion.div>

        {/* Live Workshop Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-living-cyan rounded-full animate-pulse" />
                <span className="font-mono text-sm text-pearl">WORKSHOP_SESSION_ACTIVE</span>
              </div>
              <div className="font-mono text-sm text-pearl/70">
                SESSION: {Math.floor(Date.now() / 1000) % 10000}
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-xs text-pearl/50">
                <span>SCANNING OPERATIONAL PATTERNS</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="w-full bg-graphite/40 h-1">
                <div
                  className="h-1 bg-living-cyan transition-all duration-100"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Capability Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {capabilities.map((capability, index) => (
            <motion.div
              key={capability.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className={`
                bg-graphite/20 backdrop-blur-md border border-copper/20 p-6
                cursor-pointer transition-all duration-500
                hover:border-${phaseColors[capability.phase]}/40
                hover:bg-${phaseColors[capability.phase]}/5
                ${selectedCapability === capability.id ? `border-${phaseColors[capability.phase]} bg-${phaseColors[capability.phase]}/10` : ''}
              `}
              onClick={() => setSelectedCapability(
                selectedCapability === capability.id ? null : capability.id
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-3 h-3 bg-${phaseColors[capability.phase]} rounded-full`} />
                    <span className="font-mono text-xs text-pearl/50 uppercase tracking-wider">
                      {capability.phase}
                    </span>
                  </div>
                  <h3 className="text-xl font-medium text-pearl mb-1">
                    {capability.name}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-copper">
                    {capability.duration}
                  </div>
                </div>
              </div>

              <p className="text-pearl/70 font-light mb-4">
                {capability.description}
              </p>

              {/* Live readout data */}
              {capability.readoutData && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-mono text-living-cyan">
                      {capability.readoutData.efficiency}%
                    </div>
                    <div className="text-xs text-pearl/50 font-mono">EFFICIENCY</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-mono text-copper">
                      {capability.readoutData.accuracy}%
                    </div>
                    <div className="text-xs text-pearl/50 font-mono">ACCURACY</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-mono text-pearl/70">
                      {capability.readoutData.coverage}%
                    </div>
                    <div className="text-xs text-pearl/50 font-mono">COVERAGE</div>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {selectedCapability === capability.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-pearl/20 pt-4 space-y-4"
                  >
                    <div>
                      <h4 className="text-sm font-mono text-pearl/70 uppercase tracking-wider mb-2">
                        Instruments
                      </h4>
                      <div className="space-y-1">
                        {capability.instruments.map(instrument => (
                          <div key={instrument} className="flex items-center space-x-2">
                            <div className="w-1 h-1 bg-copper rounded-full" />
                            <span className="text-sm text-pearl/70">{instrument}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-mono text-pearl/70 uppercase tracking-wider mb-2">
                        Outputs
                      </h4>
                      <div className="space-y-1">
                        {capability.outputs.map(output => (
                          <div key={output} className="flex items-center space-x-2">
                            <div className="w-1 h-1 bg-living-cyan rounded-full" />
                            <span className="text-sm text-pearl/70">{output}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Workshop Flow Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mb-12"
        >
          <h3 className="text-2xl font-light text-pearl mb-6 text-center">
            Workshop Flow
          </h3>

          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
            {['Analysis', 'Design', 'Implementation', 'Optimization'].map((phase, index) => (
              <React.Fragment key={phase}>
                <div className="flex flex-col items-center text-center">
                  <div className={`
                    w-16 h-16 rounded-full border-2 flex items-center justify-center
                    font-mono text-sm
                    ${index === 0 ? 'border-living-cyan bg-living-cyan/10 text-living-cyan' :
                      index === 1 ? 'border-copper bg-copper/10 text-copper' :
                      index === 2 ? 'border-pearl bg-pearl/10 text-pearl' :
                      'border-living-cyan bg-living-cyan/10 text-living-cyan'}
                  `}>
                    {index + 1}
                  </div>
                  <div className="mt-2 text-sm font-medium text-pearl">
                    {phase}
                  </div>
                  <div className="text-xs text-pearl/50 font-mono">
                    {index === 0 ? '90min' : index === 1 ? '120min' : index === 2 ? '180min' : '90min'}
                  </div>
                </div>

                {index < 3 && (
                  <div className="hidden md:block w-8 h-px bg-pearl/30" />
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex justify-center space-x-6"
        >
          <button
            onClick={() => onNavigate('transformations')}
            className="px-8 py-4 bg-graphite/80 border border-copper/30
                     text-copper font-mono hover:border-copper hover:bg-copper/5
                     transition-all duration-500"
          >
            View Transformations →
          </button>
          <button
            onClick={() => onNavigate('examples')}
            className="px-8 py-4 bg-graphite/80 border border-living-cyan/30
                     text-living-cyan font-mono hover:border-living-cyan hover:bg-living-cyan/5
                     transition-all duration-500"
          >
            See Live Examples →
          </button>
        </motion.div>
      </div>
    </motion.section>
  );
}
