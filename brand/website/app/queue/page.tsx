'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface QueueEntry {
  position: number;
  id: string;
  type: 'collaboration' | 'consultation' | 'workshop_visit';
  submittedAt: string;
  estimatedWait: string;
  status: 'waiting' | 'under_review' | 'scheduled';
}

export default function QueuePage() {
  const [queuePosition, setQueuePosition] = useState(47);
  const [totalQueue, setTotalQueue] = useState(127);
  const [averageWait, setAverageWait] = useState("12-18 weeks");
  
  const [recentEntries] = useState<QueueEntry[]>([
    { position: 45, id: 'q-2024-156', type: 'collaboration', submittedAt: '2024-12-18', estimatedWait: '14-16 weeks', status: 'under_review' },
    { position: 46, id: 'q-2024-157', type: 'workshop_visit', submittedAt: '2024-12-19', estimatedWait: '16-20 weeks', status: 'waiting' },
    { position: 47, id: 'q-2024-158', type: 'consultation', submittedAt: '2024-12-20', estimatedWait: '12-14 weeks', status: 'waiting' },
    { position: 48, id: 'q-2024-159', type: 'collaboration', submittedAt: '2024-12-20', estimatedWait: '18-22 weeks', status: 'waiting' },
    { position: 49, id: 'q-2024-160', type: 'workshop_visit', submittedAt: '2024-12-21', estimatedWait: '20-24 weeks', status: 'waiting' },
  ]);

  useEffect(() => {
    // Simulate occasional queue updates
    const interval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        setQueuePosition(prev => Math.max(40, prev - 1));
        setTotalQueue(prev => prev + Math.floor(Math.random() * 3 - 1)); // -1, 0, 1
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'collaboration': return 'text-copper';
      case 'consultation': return 'text-living-cyan';
      case 'workshop_visit': return 'text-pearl/70';
      default: return 'text-pearl/60';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-copper';
      case 'under_review': return 'text-living-cyan';
      case 'waiting': return 'text-pearl/40';
      default: return 'text-pearl/60';
    }
  };

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-light text-pearl mb-6">Queue Status</h1>
          <p className="text-xl text-pearl/60 max-w-2xl mx-auto font-light">
            Current waiting room for workshop access and collaboration requests. 
            All entries are processed in order of receipt and operational fit.
          </p>
        </motion.div>

        {/* Current Queue Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
        >
          <div className="bg-graphite/30 border border-copper/20 p-8 text-center backdrop-blur-workshop">
            <div className="text-4xl font-light text-copper mb-2">{queuePosition}</div>
            <div className="text-sm font-mono text-pearl/50 uppercase tracking-wide">Current Position</div>
            <div className="text-xs text-pearl/30 mt-2">if you submitted today</div>
          </div>

          <div className="bg-graphite/30 border border-copper/20 p-8 text-center backdrop-blur-workshop">
            <div className="text-4xl font-light text-living-cyan mb-2">{totalQueue}</div>
            <div className="text-sm font-mono text-pearl/50 uppercase tracking-wide">Total Queue</div>
            <div className="text-xs text-pearl/30 mt-2">active submissions</div>
          </div>

          <div className="bg-graphite/30 border border-copper/20 p-8 text-center backdrop-blur-workshop">
            <div className="text-2xl font-light text-pearl mb-2">{averageWait}</div>
            <div className="text-sm font-mono text-pearl/50 uppercase tracking-wide">Average Wait</div>
            <div className="text-xs text-pearl/30 mt-2">from submission</div>
          </div>
        </motion.div>

        {/* Queue Visualization */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-light text-pearl mb-8 text-center">Recent Queue Activity</h2>
          
          <div className="space-y-4">
            {recentEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                className="bg-graphite/20 border border-copper/10 p-6 backdrop-blur-workshop"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-6">
                    <div className="text-2xl font-mono text-copper/60">
                      #{entry.position}
                    </div>
                    
                    <div>
                      <div className="text-sm font-mono text-pearl/40 mb-1">
                        {entry.id}
                      </div>
                      <div className={`text-sm ${getTypeColor(entry.type)}`}>
                        {entry.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-sm font-mono ${getStatusColor(entry.status)} mb-1`}>
                      {entry.status.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-pearl/40">
                      {entry.estimatedWait}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-xs font-mono text-pearl/30">
                  Submitted: {new Date(entry.submittedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Queue Philosophy */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="bg-graphite/20 border border-copper/20 p-12 backdrop-blur-workshop">
            <blockquote className="text-lg text-pearl/60 font-light italic leading-relaxed mb-6">
              "Quality work cannot be rushed. Each collaboration receives the time and attention 
              it deserves. The queue is not a barrier—it is a commitment to craft."
            </blockquote>
            
            <div className="text-sm font-mono text-copper">
              — Workshop Principles
            </div>
          </div>
        </motion.div>

        {/* Submission Process */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-light text-pearl mb-8 text-center">Submission Process</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-copper/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-copper font-mono font-bold">01</span>
              </div>
              <h3 className="text-lg text-pearl font-light mb-3">Initial Review</h3>
              <p className="text-sm text-pearl/60 leading-relaxed">
                All submissions undergo preliminary assessment for operational fit and workshop capacity alignment.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-living-cyan/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-living-cyan font-mono font-bold">02</span>
              </div>
              <h3 className="text-lg text-pearl font-light mb-3">Deep Evaluation</h3>
              <p className="text-sm text-pearl/60 leading-relaxed">
                Qualified submissions receive comprehensive evaluation. This process cannot be accelerated.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-pearl/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-pearl font-mono font-bold">03</span>
              </div>
              <h3 className="text-lg text-pearl font-light mb-3">Workshop Entry</h3>
              <p className="text-sm text-pearl/60 leading-relaxed">
                Successful candidates are invited for direct collaboration or workshop access.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Access Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="text-center"
        >
          <div className="border border-copper/20 p-8 backdrop-blur-workshop">
            <p className="text-pearl/50 font-mono text-sm leading-relaxed mb-4">
              Queue position is estimated and may change based on workshop capacity and project complexity.
              Not all submissions will proceed to collaboration. Quality requirements are non-negotiable.
            </p>
            
            <button 
              className="
                px-6 py-3 
                bg-graphite/60 border border-copper/30 
                text-copper font-mono text-sm
                hover:border-copper/60 hover:bg-copper/5
                transition-all duration-500
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              disabled
            >
              Submit Workshop Request
            </button>
            
            <div className="text-xs text-pearl/30 mt-3">
              New submissions temporarily suspended
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}