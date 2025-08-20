'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface ArchiveEntry {
  id: string;
  title: string;
  type: 'study' | 'framework' | 'instrument' | 'collaboration';
  date: string;
  accessLevel: 'public' | 'collaborator' | 'restricted';
  summary: string;
  tags: string[];
}

const archiveEntries: ArchiveEntry[] = [
  {
    id: 'arch-2024-001',
    title: 'Operational Patterns in Craft Manufacturing',
    type: 'study',
    date: '2024-11-15',
    accessLevel: 'public',
    summary: 'Analysis of efficiency patterns in small-batch manufacturing. Identifies key leverage points for automation without compromising craft integrity.',
    tags: ['manufacturing', 'automation', 'craft', 'efficiency']
  },
  {
    id: 'arch-2024-002',
    title: 'Workshop Capacity Optimization Framework',
    type: 'framework',
    date: '2024-10-28',
    accessLevel: 'collaborator',
    summary: 'Systematic approach to balancing workshop capacity with quality output. Includes tools for measuring cognitive load and creative flow.',
    tags: ['capacity', 'optimization', 'workflow', 'measurement']
  },
  {
    id: 'arch-2024-003',
    title: 'Collaborative Selection Criteria v2.1',
    type: 'instrument',
    date: '2024-09-12',
    accessLevel: 'restricted',
    summary: 'Refined evaluation framework for partnership assessment. Emphasizes mutual amplification over traditional client-service relationships.',
    tags: ['collaboration', 'selection', 'partnership', 'evaluation']
  },
  {
    id: 'arch-2024-004',
    title: 'Case Study: Industrial Partner Alpha',
    type: 'collaboration',
    date: '2024-08-30',
    accessLevel: 'collaborator',
    summary: 'Deep dive into 6-month operational transformation. Focus on system integration and human-automation balance.',
    tags: ['case-study', 'transformation', 'integration', 'balance']
  },
  {
    id: 'arch-2024-005',
    title: 'Quality Metrics for Operational Excellence',
    type: 'framework',
    date: '2024-07-18',
    accessLevel: 'public',
    summary: 'Comprehensive framework for measuring operational quality beyond traditional efficiency metrics. Includes craft integrity indicators.',
    tags: ['quality', 'metrics', 'excellence', 'measurement']
  },
  {
    id: 'arch-2024-006',
    title: 'Workshop Environmental Optimization',
    type: 'study',
    date: '2024-06-22',
    accessLevel: 'public',
    summary: 'Environmental factors that impact deep work and creative output. Analysis of lighting, temperature, sound, and spatial arrangement.',
    tags: ['environment', 'workspace', 'deep-work', 'optimization']
  }
];

export default function ArchivePage() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccess, setSelectedAccess] = useState<string>('public');
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const types = ['all', 'study', 'framework', 'instrument', 'collaboration'];
  const accessLevels = ['public', 'collaborator', 'restricted'];
  
  const filteredEntries = archiveEntries.filter(entry => {
    const typeMatch = selectedType === 'all' || entry.type === selectedType;
    const accessMatch = 
      selectedAccess === 'public' ? entry.accessLevel === 'public' :
      selectedAccess === 'collaborator' ? ['public', 'collaborator'].includes(entry.accessLevel) :
      true; // restricted shows all
    
    return typeMatch && accessMatch;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'study': return 'text-copper';
      case 'framework': return 'text-living-cyan';
      case 'instrument': return 'text-pearl';
      case 'collaboration': return 'text-copper';
      default: return 'text-pearl/60';
    }
  };

  const getAccessIcon = (level: string) => {
    switch (level) {
      case 'public': return '◯';
      case 'collaborator': return '◐';
      case 'restricted': return '●';
      default: return '○';
    }
  };

  const canAccess = (level: string) => {
    // For demo purposes, assume public access only
    return level === 'public';
  };

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-light text-pearl mb-6">Workshop Archive</h1>
          <p className="text-xl text-pearl/60 max-w-2xl mx-auto font-light">
            Repository of operational insights, frameworks, and collaborative learnings. 
            Access levels reflect both value and exclusivity.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8 mb-12"
        >
          {/* Type Filter */}
          <div className="flex space-x-1 bg-graphite/20 p-1 rounded backdrop-blur-workshop">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`
                  px-4 py-2 text-sm font-mono capitalize transition-all duration-300
                  ${selectedType === type
                    ? 'bg-copper/20 text-copper'
                    : 'text-pearl/60 hover:text-pearl/80'
                  }
                `}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Access Filter */}
          <div className="flex space-x-1 bg-graphite/20 p-1 rounded backdrop-blur-workshop">
            {accessLevels.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedAccess(level)}
                className={`
                  px-4 py-2 text-sm font-mono capitalize transition-all duration-300
                  ${selectedAccess === level
                    ? 'bg-living-cyan/20 text-living-cyan'
                    : 'text-pearl/60 hover:text-pearl/80'
                  }
                `}
              >
                {getAccessIcon(level)} {level}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Archive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {filteredEntries.map((entry, index) => {
            const accessible = canAccess(entry.accessLevel);
            
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                className={`
                  bg-graphite/30 border p-6 backdrop-blur-workshop
                  transition-all duration-500
                  ${accessible 
                    ? 'border-copper/10 hover:border-copper/30 cursor-pointer' 
                    : 'border-pearl/5 opacity-60'
                  }
                  ${selectedEntry === entry.id ? 'border-copper/50 bg-copper/5' : ''}
                `}
                onClick={() => accessible && setSelectedEntry(
                  selectedEntry === entry.id ? null : entry.id
                )}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className={`text-lg font-light mb-2 ${
                      accessible ? 'text-pearl' : 'text-pearl/40'
                    }`}>
                      {entry.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`font-mono ${getTypeColor(entry.type)}`}>
                        {entry.type}
                      </span>
                      <span className="text-pearl/40 font-mono">
                        {new Date(entry.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-sm font-mono ${
                      entry.accessLevel === 'public' ? 'text-copper' :
                      entry.accessLevel === 'collaborator' ? 'text-living-cyan' : 'text-pearl/40'
                    }`}>
                      {getAccessIcon(entry.accessLevel)}
                    </div>
                    {!accessible && (
                      <div className="text-xs text-pearl/30 mt-1">restricted</div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {accessible && (
                  <p className="text-pearl/60 text-sm leading-relaxed mb-4">
                    {entry.summary}
                  </p>
                )}

                {/* Tags */}
                {accessible && (
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-copper/10 text-copper text-xs font-mono rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {!accessible && (
                  <div className="text-center py-8">
                    <div className="text-pearl/30 text-sm font-mono">
                      Access restricted to {entry.accessLevel} level
                    </div>
                  </div>
                )}

                {/* Expanded View */}
                {accessible && selectedEntry === entry.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 mt-6 border-t border-copper/10">
                      <div className="text-center">
                        <button 
                          className="
                            px-6 py-2 
                            bg-copper/10 border border-copper/30 
                            text-copper font-mono text-sm
                            hover:bg-copper/20
                            transition-all duration-300
                          "
                        >
                          View Full Archive Entry
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Archive Philosophy */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="bg-graphite/20 border border-copper/20 p-12 backdrop-blur-workshop">
            <blockquote className="text-lg text-pearl/60 font-light italic leading-relaxed mb-6">
              "Knowledge shared selectively retains its power. Not every insight is meant 
              for every audience. The archive preserves both the work and the intention behind it."
            </blockquote>
            
            <div className="text-sm font-mono text-copper">
              — Archive Principles
            </div>
          </div>
        </motion.div>

        {/* Access Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-center"
        >
          <div className="border border-copper/20 p-8 backdrop-blur-workshop">
            <h3 className="text-lg text-pearl mb-4 font-light">Archive Access Levels</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="text-center">
                <div className="text-copper text-xl mb-2">◯</div>
                <div className="text-pearl/70 mb-2">Public</div>
                <div className="text-pearl/50">
                  Open insights and foundational frameworks
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-living-cyan text-xl mb-2">◐</div>
                <div className="text-pearl/70 mb-2">Collaborator</div>
                <div className="text-pearl/50">
                  Operational details and case studies
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-pearl/40 text-xl mb-2">●</div>
                <div className="text-pearl/70 mb-2">Restricted</div>
                <div className="text-pearl/50">
                  Core methodologies and sensitive data
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}