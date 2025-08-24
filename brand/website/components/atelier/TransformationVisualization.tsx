'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Section = 'entry' | 'capabilities' | 'transformations' | 'examples' | 'access';

interface TransformationVisualizationProps {
  onNavigate: (section: Section) => void;
}

interface TransformationCase {
  id: string;
  title: string;
  industry: string;
  challenge: string;
  before: {
    timeSpent: number;
    errorRate: number;
    capacity: number;
    satisfaction: number;
    description: string[];
  };
  after: {
    timeSpent: number;
    errorRate: number;
    capacity: number;
    satisfaction: number;
    description: string[];
  };
  transformation: {
    duration: string;
    automationLevel: number;
    roiMonths: number;
  };
}

const transformationCases: TransformationCase[] = [
  {
    id: 'inventory-system',
    title: 'Inventory Management Automation',
    industry: 'Manufacturing',
    challenge: 'Manual inventory tracking across 5 warehouses consuming 40+ hours weekly',
    before: {
      timeSpent: 42,
      errorRate: 12.3,
      capacity: 65,
      satisfaction: 34,
      description: [
        'Manual spreadsheet updates across locations',
        'Daily phone calls for inventory counts',
        'Weekly reconciliation taking 8+ hours',
        'Frequent stockouts and overstocking',
        'Error-prone manual data entry'
      ]
    },
    after: {
      timeSpent: 3,
      errorRate: 0.8,
      capacity: 94,
      satisfaction: 89,
      description: [
        'Real-time automated inventory sync',
        'Predictive restocking algorithms',
        'Automated variance reporting',
        'Smart reorder point optimization',
        'Integration with supplier systems'
      ]
    },
    transformation: {
      duration: '8 weeks',
      automationLevel: 87,
      roiMonths: 4
    }
  },
  {
    id: 'customer-onboarding',
    title: 'Client Onboarding Pipeline',
    industry: 'Financial Services',
    challenge: 'Complex manual onboarding process causing delays and client frustration',
    before: {
      timeSpent: 28,
      errorRate: 8.7,
      capacity: 12,
      satisfaction: 52,
      description: [
        'Manual document collection via email',
        'Paper-based compliance checking',
        'Multiple system data entry',
        'Manual status updates to clients',
        'Inconsistent process execution'
      ]
    },
    after: {
      timeSpent: 4,
      errorRate: 1.2,
      capacity: 68,
      satisfaction: 91,
      description: [
        'Automated document portal with validation',
        'AI-powered compliance verification',
        'Single-click multi-system provisioning',
        'Real-time client status dashboard',
        'Standardized workflow orchestration'
      ]
    },
    transformation: {
      duration: '12 weeks',
      automationLevel: 92,
      roiMonths: 6
    }
  },
  {
    id: 'report-generation',
    title: 'Executive Reporting System',
    industry: 'Healthcare',
    challenge: 'Monthly executive reports requiring 3 days of manual data compilation',
    before: {
      timeSpent: 24,
      errorRate: 5.4,
      capacity: 40,
      satisfaction: 45,
      description: [
        'Manual data extraction from 8 systems',
        'Excel-based calculations and formatting',
        'Manual chart creation and styling',
        'Email distribution to stakeholders',
        'Version control and update management'
      ]
    },
    after: {
      timeSpent: 0.5,
      errorRate: 0.1,
      capacity: 98,
      satisfaction: 95,
      description: [
        'Automated multi-source data aggregation',
        'Dynamic report generation with real-time data',
        'Interactive dashboards and visualizations',
        'Automated distribution and notifications',
        'Version-controlled template management'
      ]
    },
    transformation: {
      duration: '6 weeks',
      automationLevel: 96,
      roiMonths: 2
    }
  }
];

export function TransformationVisualization({ onNavigate }: TransformationVisualizationProps) {
  const [selectedCase, setSelectedCase] = useState(0);
  const [viewState, setViewState] = useState<'before' | 'after' | 'comparison'>('before');
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    if (viewState === 'comparison') {
      const interval = setInterval(() => {
        setAnimationProgress(prev => (prev + 1) % 100);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [viewState]);

  const currentCase = transformationCases[selectedCase];

  const MetricBar = ({ label, beforeValue, afterValue, suffix = '', format = 'number' }: {
    label: string;
    beforeValue: number;
    afterValue: number;
    suffix?: string;
    format?: 'number' | 'percentage';
  }) => {
    const currentValue = viewState === 'before' ? beforeValue :
                        viewState === 'after' ? afterValue :
                        beforeValue + (afterValue - beforeValue) * (animationProgress / 100);

    const isImprovement = afterValue < beforeValue || (format === 'percentage' && afterValue > beforeValue);
    const barColor = viewState === 'before' ? 'copper' : 'living-cyan';

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-mono text-pearl/70 uppercase tracking-wider">
            {label}
          </span>
          <span className={`text-lg font-mono text-${barColor}`}>
            {format === 'percentage'
              ? `${currentValue.toFixed(1)}%`
              : `${currentValue.toFixed(1)}${suffix}`
            }
          </span>
        </div>

        <div className="h-2 bg-graphite/40 rounded-none overflow-hidden">
          <motion.div
            className={`h-full bg-${barColor}`}
            initial={{ width: 0 }}
            animate={{
              width: format === 'percentage'
                ? `${Math.min(currentValue, 100)}%`
                : `${Math.min((currentValue / Math.max(beforeValue, afterValue)) * 100, 100)}%`
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {viewState === 'comparison' && (
          <div className="flex justify-between text-xs font-mono">
            <span className="text-copper">
              Before: {format === 'percentage' ? `${beforeValue}%` : `${beforeValue}${suffix}`}
            </span>
            <span className="text-living-cyan">
              After: {format === 'percentage' ? `${afterValue}%` : `${afterValue}${suffix}`}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.section
      key="transformations"
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
            Transformation Gallery
          </h1>
          <p className="text-xl text-pearl/70 font-light max-w-3xl mx-auto">
            Real operational transformations showing the before/after reality
            of precision automation engineering
          </p>
        </motion.div>

        {/* Case Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {transformationCases.map((caseItem, index) => (
            <button
              key={caseItem.id}
              onClick={() => setSelectedCase(index)}
              className={`
                px-6 py-3 font-mono text-sm transition-all duration-300
                border ${selectedCase === index
                  ? 'border-living-cyan bg-living-cyan/10 text-living-cyan'
                  : 'border-copper/30 text-pearl/70 hover:border-copper hover:text-pearl'
                }
              `}
            >
              {caseItem.title}
            </button>
          ))}
        </motion.div>

        {/* View State Toggle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-1 flex">
            {[
              { key: 'before', label: 'Before', color: 'copper' },
              { key: 'comparison', label: 'Transform', color: 'living-cyan' },
              { key: 'after', label: 'After', color: 'living-cyan' }
            ].map((state) => (
              <button
                key={state.key}
                onClick={() => setViewState(state.key as any)}
                className={`
                  px-8 py-3 font-mono text-sm transition-all duration-300
                  ${viewState === state.key
                    ? `bg-${state.color} text-graphite`
                    : `text-${state.color} hover:bg-${state.color}/10`
                  }
                `}
              >
                {state.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Transformation Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Metrics Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-8"
          >
            <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-8">
              <h3 className="text-2xl font-light text-pearl mb-2">
                {currentCase.title}
              </h3>
              <div className="flex items-center space-x-4 mb-6">
                <span className="font-mono text-sm text-copper">
                  {currentCase.industry}
                </span>
                <span className="w-2 h-2 bg-pearl/30 rounded-full" />
                <span className="font-mono text-sm text-pearl/50">
                  {currentCase.transformation.duration} implementation
                </span>
              </div>

              <p className="text-pearl/70 font-light mb-8">
                {currentCase.challenge}
              </p>

              <div className="space-y-6">
                <MetricBar
                  label="Hours per Week"
                  beforeValue={currentCase.before.timeSpent}
                  afterValue={currentCase.after.timeSpent}
                  suffix="h"
                />

                <MetricBar
                  label="Error Rate"
                  beforeValue={currentCase.before.errorRate}
                  afterValue={currentCase.after.errorRate}
                  suffix="%"
                />

                <MetricBar
                  label="System Capacity"
                  beforeValue={currentCase.before.capacity}
                  afterValue={currentCase.after.capacity}
                  format="percentage"
                />

                <MetricBar
                  label="Team Satisfaction"
                  beforeValue={currentCase.before.satisfaction}
                  afterValue={currentCase.after.satisfaction}
                  format="percentage"
                />
              </div>

              {/* Transformation Stats */}
              {viewState === 'comparison' || viewState === 'after' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 pt-8 border-t border-pearl/20"
                >
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-mono text-living-cyan">
                        {currentCase.transformation.automationLevel}%
                      </div>
                      <div className="text-xs text-pearl/50 font-mono">AUTOMATED</div>
                    </div>
                    <div>
                      <div className="text-2xl font-mono text-copper">
                        {currentCase.transformation.roiMonths}mo
                      </div>
                      <div className="text-xs text-pearl/50 font-mono">ROI</div>
                    </div>
                    <div>
                      <div className="text-2xl font-mono text-pearl/70">
                        {Math.floor((currentCase.before.timeSpent - currentCase.after.timeSpent) * 4.33)}h
                      </div>
                      <div className="text-xs text-pearl/50 font-mono">SAVED/MONTH</div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </div>
          </motion.div>

          {/* Process Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className="space-y-6"
          >
            <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-8">
              <h4 className="text-xl font-medium text-pearl mb-6">
                {viewState === 'before' ? 'Current State' :
                 viewState === 'after' ? 'Transformed State' :
                 'Process Evolution'}
              </h4>

              <AnimatePresence mode="wait">
                {viewState === 'before' && (
                  <motion.div
                    key="before-details"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {currentCase.before.description.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-3"
                      >
                        <div className="w-2 h-2 bg-copper rounded-full mt-2 flex-shrink-0" />
                        <span className="text-pearl/70">{item}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {viewState === 'after' && (
                  <motion.div
                    key="after-details"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {currentCase.after.description.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-3"
                      >
                        <div className="w-2 h-2 bg-living-cyan rounded-full mt-2 flex-shrink-0" />
                        <span className="text-pearl/70">{item}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {viewState === 'comparison' && (
                  <motion.div
                    key="comparison-details"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <h5 className="font-mono text-sm text-copper uppercase tracking-wider">
                        Manual Process
                      </h5>
                      {currentCase.before.description.slice(0, 2).map((item, index) => (
                        <div key={index} className="flex items-start space-x-3 opacity-60">
                          <div className="w-1 h-1 bg-copper rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm text-pearl/50">{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-center py-4">
                      <div className="w-16 h-px bg-living-cyan mx-auto mb-2" />
                      <span className="font-mono text-xs text-living-cyan">TRANSFORMATION</span>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-mono text-sm text-living-cyan uppercase tracking-wider">
                        Automated Process
                      </h5>
                      {currentCase.after.description.slice(0, 2).map((item, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-1 h-1 bg-living-cyan rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm text-pearl/70">{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex justify-center space-x-6"
        >
          <button
            onClick={() => onNavigate('capabilities')}
            className="px-8 py-4 bg-graphite/80 border border-copper/30
                     text-copper font-mono hover:border-copper hover:bg-copper/5
                     transition-all duration-500"
          >
            ← Workshop Details
          </button>
          <button
            onClick={() => onNavigate('examples')}
            className="px-8 py-4 bg-graphite/80 border border-living-cyan/30
                     text-living-cyan font-mono hover:border-living-cyan hover:bg-living-cyan/5
                     transition-all duration-500"
          >
            Live Examples →
          </button>
        </motion.div>
      </div>
    </motion.section>
  );
}
