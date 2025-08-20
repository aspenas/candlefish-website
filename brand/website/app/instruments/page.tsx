'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Instrument {
  id: string;
  name: string;
  category: 'analysis' | 'synthesis' | 'calibration' | 'monitoring';
  description: string;
  status: 'active' | 'calibrating' | 'maintenance';
  precision: number;
  lastCalibrated: string;
  accessLevel: 'public' | 'collaborator' | 'restricted';
}

const instruments: Instrument[] = [
  {
    id: 'inst-001',
    name: 'Operational Pattern Analyzer',
    category: 'analysis',
    description: 'Deep pattern recognition across operational systems. Identifies efficiency opportunities and systemic bottlenecks.',
    status: 'active',
    precision: 0.97,
    lastCalibrated: '2025-12-15',
    accessLevel: 'collaborator'
  },
  {
    id: 'inst-002', 
    name: 'Workflow Synthesis Engine',
    category: 'synthesis',
    description: 'Combines disparate operational elements into coherent, optimized workflows. Emphasizes human-system harmony.',
    status: 'active',
    precision: 0.94,
    lastCalibrated: '2025-12-18',
    accessLevel: 'collaborator'
  },
  {
    id: 'inst-003',
    name: 'Craft Quality Calibrator',
    category: 'calibration',
    description: 'Measures and maintains the craft integrity of all workshop outputs. Non-negotiable quality standards.',
    status: 'calibrating',
    precision: 0.99,
    lastCalibrated: '2025-12-20',
    accessLevel: 'restricted'
  },
  {
    id: 'inst-004',
    name: 'Collaboration Dynamics Monitor',
    category: 'monitoring',
    description: 'Tracks the health and productivity of ongoing collaborative relationships. Ensures mutual amplification.',
    status: 'active',
    precision: 0.91,
    lastCalibrated: '2025-12-12',
    accessLevel: 'collaborator'
  },
  {
    id: 'inst-005',
    name: 'System Load Predictor',
    category: 'analysis',
    description: 'Forecasts workshop capacity and optimal scheduling. Prevents cognitive overload and maintains flow states.',
    status: 'maintenance',
    precision: 0.88,
    lastCalibrated: '2025-12-08',
    accessLevel: 'public'
  },
  {
    id: 'inst-006',
    name: 'Selective Access Controller',
    category: 'monitoring', 
    description: 'Maintains workshop boundaries and ensures only appropriate collaborations proceed. Quality over quantity.',
    status: 'active',
    precision: 1.00,
    lastCalibrated: '2025-12-21',
    accessLevel: 'restricted'
  }
];

export default function InstrumentsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);

  const categories = ['all', 'analysis', 'synthesis', 'calibration', 'monitoring'];
  
  const filteredInstruments = selectedCategory === 'all' 
    ? instruments 
    : instruments.filter(inst => inst.category === selectedCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-copper';
      case 'calibrating': return 'text-living-cyan';
      case 'maintenance': return 'text-pearl/40';
      default: return 'text-pearl/60';
    }
  };

  const getAccessColor = (level: string) => {
    switch (level) {
      case 'public': return 'text-copper';
      case 'collaborator': return 'text-living-cyan';
      case 'restricted': return 'text-pearl/40';
      default: return 'text-pearl/60';
    }
  };

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-light text-pearl mb-6">Workshop Instruments</h1>
          <p className="text-xl text-pearl/60 max-w-2xl mx-auto font-light">
            Precision tools for operational excellence. Each instrument is calibrated for specific aspects of 
            collaborative creation and system optimization.
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex justify-center mb-12"
        >
          <div className="flex space-x-1 bg-graphite/20 p-1 rounded backdrop-blur-workshop">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-6 py-2 text-sm font-mono capitalize transition-all duration-300
                  ${selectedCategory === category
                    ? 'bg-copper/20 text-copper'
                    : 'text-pearl/60 hover:text-pearl/80'
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Instruments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {filteredInstruments.map((instrument, index) => (
            <motion.div
              key={instrument.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
              className={`
                bg-graphite/30 border p-6 backdrop-blur-workshop cursor-pointer
                transition-all duration-500
                ${selectedInstrument === instrument.id
                  ? 'border-copper/50 bg-copper/5'
                  : 'border-copper/10 hover:border-copper/30'
                }
              `}
              onClick={() => setSelectedInstrument(
                selectedInstrument === instrument.id ? null : instrument.id
              )}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl text-pearl font-light mb-2">
                    {instrument.name}
                  </h3>
                  <span className="text-xs font-mono text-pearl/40 uppercase tracking-wide">
                    {instrument.category}
                  </span>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-mono ${getStatusColor(instrument.status)}`}>
                    {instrument.status}
                  </div>
                  <div className="w-2 h-2 bg-copper/60 rounded-full animate-pulse-slow mt-2 ml-auto" />
                </div>
              </div>

              {/* Description */}
              <p className="text-pearl/60 text-sm leading-relaxed mb-4">
                {instrument.description}
              </p>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 text-center text-xs font-mono">
                <div>
                  <div className="text-copper text-lg font-light">
                    {(instrument.precision * 100).toFixed(0)}%
                  </div>
                  <div className="text-pearl/40">precision</div>
                </div>
                
                <div>
                  <div className="text-living-cyan text-lg font-light">
                    {new Date(instrument.lastCalibrated).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="text-pearl/40">calibrated</div>
                </div>
                
                <div>
                  <div className={`text-lg font-light ${getAccessColor(instrument.accessLevel)}`}>
                    {instrument.accessLevel === 'public' ? '◯' : 
                     instrument.accessLevel === 'collaborator' ? '◐' : '●'}
                  </div>
                  <div className="text-pearl/40">access</div>
                </div>
              </div>

              {/* Expanded Details */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ 
                  height: selectedInstrument === instrument.id ? 'auto' : 0,
                  opacity: selectedInstrument === instrument.id ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {selectedInstrument === instrument.id && (
                  <div className="pt-6 mt-6 border-t border-copper/10">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-mono text-copper mb-2">Access Protocol</h4>
                        <p className="text-xs text-pearl/50 leading-relaxed">
                          {instrument.accessLevel === 'public' 
                            ? 'Available for demonstration purposes. Full functionality requires collaboration agreement.'
                            : instrument.accessLevel === 'collaborator'
                            ? 'Active collaborators have operational access during project phases. Usage monitored and logged.'
                            : 'Restricted access. Core workshop infrastructure. Maintained by atelier staff only.'
                          }
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-mono text-copper mb-2">Calibration Notes</h4>
                        <p className="text-xs text-pearl/50 leading-relaxed">
                          Last precision verification completed {instrument.lastCalibrated}. 
                          Next scheduled maintenance based on usage patterns and drift detection.
                          All instruments operate within acceptable tolerances.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Instrument Philosophy */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <blockquote className="text-lg text-pearl/60 font-light italic leading-relaxed mb-6">
            "An instrument is only as good as the craftsperson who wields it. 
            These tools amplify intention, they do not replace judgment. 
            Each has been shaped by years of operational practice and refined through careful use."
          </blockquote>
          
          <div className="text-sm font-mono text-pearl/40">
            — On Instrumentation, Workshop Manual v3.2
          </div>
        </motion.div>

        {/* Access Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-center"
        >
          <div className="bg-graphite/20 border border-copper/20 p-8 max-w-2xl mx-auto">
            <p className="text-pearl/50 font-mono text-sm leading-relaxed">
              Instrument access is granted based on collaboration requirements and demonstrated competency.
              Misuse of workshop tools results in immediate access revocation.
              All usage is logged and reviewed for continuous calibration improvement.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}