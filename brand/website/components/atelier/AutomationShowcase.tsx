'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Section = 'entry' | 'capabilities' | 'transformations' | 'examples' | 'access';

interface AutomationShowcaseProps {
  onNavigate: (section: Section) => void;
}

interface AutomationExample {
  id: string;
  name: string;
  category: 'data-processing' | 'workflow' | 'integration' | 'monitoring';
  status: 'active' | 'processing' | 'optimizing';
  description: string;
  metrics: {
    throughput: number;
    accuracy: number;
    uptime: number;
    efficiency: number;
  };
  liveData: {
    processed: number;
    queued: number;
    errors: number;
    lastRun: string;
  };
  technicalDetails: {
    components: string[];
    integrations: string[];
    automationLevel: number;
  };
}

const automationExamples: AutomationExample[] = [
  {
    id: 'inventory-sync',
    name: 'Multi-Warehouse Inventory Sync',
    category: 'data-processing',
    status: 'active',
    description: 'Real-time inventory synchronization across 8 warehouse locations with predictive restocking.',
    metrics: {
      throughput: 12847,
      accuracy: 99.7,
      uptime: 99.94,
      efficiency: 94.2
    },
    liveData: {
      processed: 847291,
      queued: 23,
      errors: 2,
      lastRun: '00:00:12'
    },
    technicalDetails: {
      components: ['API Gateway', 'Message Queue', 'Data Validator', 'ML Predictor'],
      integrations: ['WMS Systems', 'ERP', 'Supplier APIs', 'Analytics'],
      automationLevel: 91
    }
  },
  {
    id: 'client-onboarding',
    name: 'Automated Client Onboarding',
    category: 'workflow',
    status: 'processing',
    description: 'End-to-end client onboarding with document processing, compliance checks, and system provisioning.',
    metrics: {
      throughput: 156,
      accuracy: 98.4,
      uptime: 99.8,
      efficiency: 96.7
    },
    liveData: {
      processed: 15647,
      queued: 8,
      errors: 0,
      lastRun: '00:01:47'
    },
    technicalDetails: {
      components: ['Document Parser', 'OCR Engine', 'Compliance Checker', 'System Provisioner'],
      integrations: ['CRM', 'Identity Provider', 'Compliance DB', 'Notification Service'],
      automationLevel: 87
    }
  },
  {
    id: 'report-engine',
    name: 'Executive Report Generator',
    category: 'integration',
    status: 'active',
    description: 'Automated report generation from 15+ data sources with dynamic visualizations and distribution.',
    metrics: {
      throughput: 47,
      accuracy: 99.9,
      uptime: 99.97,
      efficiency: 98.1
    },
    liveData: {
      processed: 2891,
      queued: 3,
      errors: 1,
      lastRun: '00:05:23'
    },
    technicalDetails: {
      components: ['Data Aggregator', 'Template Engine', 'Chart Generator', 'PDF Renderer'],
      integrations: ['BI Tools', 'Databases', 'Cloud Storage', 'Email Service'],
      automationLevel: 94
    }
  },
  {
    id: 'system-monitor',
    name: 'Infrastructure Health Monitor',
    category: 'monitoring',
    status: 'optimizing',
    description: 'Continuous infrastructure monitoring with predictive maintenance and automated scaling.',
    metrics: {
      throughput: 8947,
      accuracy: 97.8,
      uptime: 99.99,
      efficiency: 92.4
    },
    liveData: {
      processed: 5849273,
      queued: 47,
      errors: 12,
      lastRun: '00:00:03'
    },
    technicalDetails: {
      components: ['Metrics Collector', 'Anomaly Detector', 'Auto Scaler', 'Alert Manager'],
      integrations: ['Cloud Providers', 'Log Aggregators', 'Incident Response', 'Capacity Planners'],
      automationLevel: 89
    }
  }
];

export function AutomationShowcase({ onNavigate }: AutomationShowcaseProps) {
  const [selectedExample, setSelectedExample] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState(automationExamples.map(ex => ({ ...ex.liveData })));

  useEffect(() => {
    // Simulate live data updates
    const interval = setInterval(() => {
      setLiveMetrics(prev => prev.map((metrics, index) => {
        const example = automationExamples[index];
        return {
          ...metrics,
          processed: metrics.processed + Math.floor(Math.random() * 10 + 1),
          queued: Math.max(0, metrics.queued + Math.floor(Math.random() * 5 - 2)),
          errors: Math.max(0, metrics.errors + (Math.random() < 0.02 ? 1 : 0)),
          lastRun: `00:00:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
        };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const categoryColors = {
    'data-processing': 'living-cyan',
    'workflow': 'copper',
    'integration': 'pearl',
    'monitoring': 'living-cyan'
  };

  const statusColors = {
    'active': 'living-cyan',
    'processing': 'copper',
    'optimizing': 'pearl'
  };

  const currentExample = automationExamples[selectedExample];
  const currentMetrics = liveMetrics[selectedExample];

  const MetricDisplay = ({ label, value, suffix = '', color = 'living-cyan' }: {
    label: string;
    value: number;
    suffix?: string;
    color?: string;
  }) => (
    <div className="text-center">
      <div className={`text-2xl font-mono text-${color}`}>
        {value.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-pearl/50 font-mono uppercase tracking-wider">
        {label}
      </div>
    </div>
  );

  return (
    <motion.section
      key="examples"
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
            Live Automation Systems
          </h1>
          <p className="text-xl text-pearl/70 font-light max-w-3xl mx-auto">
            Real operational systems currently running in production environments,
            processing thousands of transactions daily
          </p>
        </motion.div>

        {/* System Status Overview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-6 mb-12"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-living-cyan rounded-full animate-pulse" />
              <span className="font-mono text-sm text-pearl">PRODUCTION_SYSTEMS_ACTIVE</span>
            </div>
            <div className="font-mono text-sm text-pearl/70">
              {new Date().toISOString().slice(0, 19)}Z
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <MetricDisplay
              label="Total Processed"
              value={liveMetrics.reduce((sum, m) => sum + m.processed, 0)}
              color="living-cyan"
            />
            <MetricDisplay
              label="Queue Depth"
              value={liveMetrics.reduce((sum, m) => sum + m.queued, 0)}
              color="copper"
            />
            <MetricDisplay
              label="Systems Online"
              value={automationExamples.length}
              suffix="/4"
              color="pearl"
            />
            <MetricDisplay
              label="Avg Efficiency"
              value={Math.round(automationExamples.reduce((sum, ex) => sum + ex.metrics.efficiency, 0) / automationExamples.length)}
              suffix="%"
              color="living-cyan"
            />
          </div>
        </motion.div>

        {/* System Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        >
          {automationExamples.map((example, index) => (
            <button
              key={example.id}
              onClick={() => setSelectedExample(index)}
              className={`
                p-4 text-left transition-all duration-300 border
                ${selectedExample === index
                  ? `border-${categoryColors[example.category]} bg-${categoryColors[example.category]}/10`
                  : 'border-copper/20 bg-graphite/20 hover:border-copper/40 hover:bg-copper/5'
                }
                backdrop-blur-md
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-3 h-3 rounded-full bg-${statusColors[example.status]} ${
                  example.status === 'active' ? 'animate-pulse' : ''
                }`} />
                <span className="font-mono text-xs text-pearl/50 uppercase">
                  {example.category.replace('-', ' ')}
                </span>
              </div>

              <h3 className="text-sm font-medium text-pearl mb-2">
                {example.name}
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-pearl/50">Processed:</span>
                  <div className={`text-${categoryColors[example.category]}`}>
                    {liveMetrics[index]?.processed.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-pearl/50">Queue:</span>
                  <div className="text-copper">
                    {liveMetrics[index]?.queued}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </motion.div>

        {/* Detailed System View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* System Metrics */}
          <motion.div
            key={selectedExample}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-light text-pearl mb-2">
                    {currentExample.name}
                  </h3>
                  <div className="flex items-center space-x-4">
                    <span className={`font-mono text-sm text-${categoryColors[currentExample.category]}`}>
                      {currentExample.category.replace('-', ' ').toUpperCase()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full bg-${statusColors[currentExample.status]} ${
                        currentExample.status === 'active' ? 'animate-pulse' : ''
                      }`} />
                      <span className="font-mono text-xs text-pearl/50 uppercase">
                        {currentExample.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-pearl/70 font-light mb-8">
                {currentExample.description}
              </p>

              {/* Live Metrics */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-pearl/70">Throughput/Hour</span>
                    <span className="text-lg font-mono text-living-cyan">
                      {currentExample.metrics.throughput.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-pearl/70">Accuracy</span>
                    <span className="text-lg font-mono text-living-cyan">
                      {currentExample.metrics.accuracy}%
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-pearl/70">Uptime</span>
                    <span className="text-lg font-mono text-copper">
                      {currentExample.metrics.uptime}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-pearl/70">Efficiency</span>
                    <span className="text-lg font-mono text-copper">
                      {currentExample.metrics.efficiency}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Data */}
              <div className="border-t border-pearl/20 pt-6">
                <h4 className="text-sm font-mono text-pearl/70 uppercase tracking-wider mb-4">
                  Real-time Status
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-mono text-living-cyan">
                      {currentMetrics?.processed.toLocaleString()}
                    </div>
                    <div className="text-xs text-pearl/50 font-mono">Total Processed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-mono text-copper">
                      {currentMetrics?.queued}
                    </div>
                    <div className="text-xs text-pearl/50 font-mono">In Queue</div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 text-xs font-mono text-pearl/50">
                  <span>Last run: {currentMetrics?.lastRun} ago</span>
                  <span>Errors: {currentMetrics?.errors}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Technical Architecture */}
          <motion.div
            key={`${selectedExample}-tech`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-8">
              <h4 className="text-xl font-medium text-pearl mb-6">
                Technical Architecture
              </h4>

              <div className="space-y-6">
                <div>
                  <h5 className="font-mono text-sm text-pearl/70 uppercase tracking-wider mb-3">
                    Core Components
                  </h5>
                  <div className="space-y-2">
                    {currentExample.technicalDetails.components.map((component, index) => (
                      <motion.div
                        key={component}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-2 h-2 bg-living-cyan rounded-full" />
                        <span className="text-pearl/70">{component}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-mono text-sm text-pearl/70 uppercase tracking-wider mb-3">
                    System Integrations
                  </h5>
                  <div className="space-y-2">
                    {currentExample.technicalDetails.integrations.map((integration, index) => (
                      <motion.div
                        key={integration}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + 0.4 }}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-2 h-2 bg-copper rounded-full" />
                        <span className="text-pearl/70">{integration}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-pearl/20 pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-mono text-living-cyan mb-2">
                      {currentExample.technicalDetails.automationLevel}%
                    </div>
                    <div className="text-sm text-pearl/50 font-mono uppercase tracking-wider">
                      Automation Level
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Sample */}
            <div className="bg-black/40 backdrop-blur-md border border-copper/20 p-6">
              <h5 className="font-mono text-sm text-pearl/70 uppercase tracking-wider mb-4">
                Live Code Sample
              </h5>
              <pre className="text-xs text-living-cyan font-mono overflow-x-auto">
{`// Production automation pipeline
const pipeline = new AutomationPipeline({
  name: "${currentExample.name}",
  category: "${currentExample.category}",
  components: [${currentExample.technicalDetails.components.map(c => `"${c}"`).join(', ')}],
  integrations: [${currentExample.technicalDetails.integrations.slice(0, 2).map(i => `"${i}"`).join(', ')}]
});

pipeline.onProcess(async (data) => {
  const result = await processor.execute(data);
  metrics.record('processed', result.count);
  return result;
});

// Currently processing: ${currentMetrics?.processed.toLocaleString()} items`}
              </pre>
            </div>
          </motion.div>
        </div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex justify-center space-x-6 mt-16"
        >
          <button
            onClick={() => onNavigate('transformations')}
            className="px-8 py-4 bg-graphite/80 border border-copper/30
                     text-copper font-mono hover:border-copper hover:bg-copper/5
                     transition-all duration-500"
          >
            ← View Transformations
          </button>
          <button
            onClick={() => onNavigate('access')}
            className="px-8 py-4 bg-graphite/80 border border-living-cyan/30
                     text-living-cyan font-mono hover:border-living-cyan hover:bg-living-cyan/5
                     transition-all duration-500"
          >
            Request Workshop Access →
          </button>
        </motion.div>
      </div>
    </motion.section>
  );
}
