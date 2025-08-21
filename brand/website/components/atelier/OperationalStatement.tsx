'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface OperationalMetrics {
  currentCapacity: number;
  queuePosition: number;
  activeProjects: number;
  systemLoad: number;
  craftIntensity: 'minimal' | 'focused' | 'immersive';
}

const statements = [
  {
    primary: "Currently operating at maximum theoretical capacity.",
    secondary: "Workshop access restricted to invitation-only collaboration.",
    context: "We work with systems, not scalability.",
  },
  {
    primary: "All active project slots committed through Q2 2025.",
    secondary: "Queue management operating on craft timelines.",
    context: "Deep work requires undivided attention.",
  },
  {
    primary: "Workshop instruments calibrated for operational excellence.",
    secondary: "Each collaboration hand-selected for mutual amplification.",
    context: "We build what we would use ourselves.",
  },
  {
    primary: "Current operational philosophy: selective presence.",
    secondary: "Quality emerges from constraint, not abundance.",
    context: "Better to solve one problem completely.",
  },
];

export function OperationalStatement() {
  const [currentStatement, setCurrentStatement] = useState(0);
  const [metrics, setMetrics] = useState<OperationalMetrics>({
    currentCapacity: 100,
    queuePosition: 47,
    activeProjects: 3,
    systemLoad: 0.94,
    craftIntensity: 'immersive',
  });

  useEffect(() => {
    // Rotate statements every 8 seconds
    const interval = setInterval(() => {
      setCurrentStatement((prev) => (prev + 1) % statements.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Simulate live metrics updates
    const metricsInterval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        systemLoad: Math.max(0.85, Math.min(1.0, prev.systemLoad + (Math.random() - 0.5) * 0.02)),
        queuePosition: prev.queuePosition + Math.floor(Math.random() * 3 - 1), // -1, 0, or 1
      }));
    }, 3000);

    return () => clearInterval(metricsInterval);
  }, []);

  const statement = statements[currentStatement];
  const loadColor = metrics.systemLoad > 0.95 ? 'text-living-cyan' :
                   metrics.systemLoad > 0.90 ? 'text-copper' : 'text-pearl/70';

  return (
    <div className="text-center space-y-12">
      {/* Primary Statement */}
      <motion.div
        key={`primary-${currentStatement}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="space-y-6"
      >
        <h1 className="text-4xl md:text-6xl font-light text-pearl tracking-tight leading-tight max-w-4xl mx-auto">
          {statement.primary}
        </h1>

        <p className="text-xl md:text-2xl text-pearl/60 font-light max-w-2xl mx-auto">
          {statement.secondary}
        </p>
      </motion.div>

      {/* Operational Metrics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="flex justify-center space-x-12 text-sm font-mono"
      >
        <div className="text-center space-y-1">
          <div className={loadColor}>
            {(metrics.systemLoad * 100).toFixed(1)}%
          </div>
          <div className="text-pearl/40">capacity</div>
        </div>

        <div className="text-center space-y-1">
          <div className="text-copper">
            {metrics.queuePosition}
          </div>
          <div className="text-pearl/40">queue</div>
        </div>

        <div className="text-center space-y-1">
          <div className="text-pearl/70">
            {metrics.activeProjects}
          </div>
          <div className="text-pearl/40">active</div>
        </div>
      </motion.div>

      {/* Context */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="text-pearl/40 font-mono text-sm max-w-md mx-auto"
      >
        {statement.context}
      </motion.div>

      {/* Workshop Access */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="pt-8"
      >
        <button
          className="
            px-8 py-4
            bg-graphite/80 border border-copper/30
            text-copper font-mono text-sm
            backdrop-blur-workshop
            hover:border-copper/60 hover:bg-copper/5
            transition-all duration-500
            group
          "
          disabled
        >
          <span className="group-hover:text-pearl transition-colors">
            Request Workshop Visit
          </span>
          <div className="text-xs text-pearl/30 mt-1">
            Queue position #{metrics.queuePosition}
          </div>
        </button>
      </motion.div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="pt-8 flex justify-center space-x-6 text-xs font-mono text-pearl/30"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-copper/60 rounded-full animate-pulse-slow" />
          <span>operational</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-living-cyan/40 rounded-full animate-glow" />
          <span>monitored</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-pearl/20 rounded-full" />
          <span>selective</span>
        </div>
      </motion.div>
    </div>
  );
}
