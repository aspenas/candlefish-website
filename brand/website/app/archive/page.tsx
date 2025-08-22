'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useKeyboardNavigation, useAnnouncement } from '../../hooks/useAccessibility';
import { createFilterLabel, formatDateForScreenReader, generateId, createExpandableAttributes } from '../../utils/accessibility';
import ScreenReaderAnnouncement from '../../components/accessibility/ScreenReaderAnnouncement';
import { logContrastResults } from '../../utils/colorContrast';

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
    id: 'arch-2025-001',
    title: 'Operational Patterns in Craft Manufacturing',
    type: 'study',
    date: '2025-08-18',
    accessLevel: 'public',
    summary: 'Analysis of efficiency patterns in small-batch manufacturing. Identifies key leverage points for automation without compromising craft integrity.',
    tags: ['manufacturing', 'automation', 'craft', 'efficiency']
  },
  {
    id: 'arch-2025-002',
    title: 'Workshop Capacity Optimization Framework',
    type: 'framework',
    date: '2025-08-15',
    accessLevel: 'collaborator',
    summary: 'Systematic approach to balancing workshop capacity with quality output. Includes tools for measuring cognitive load and creative flow.',
    tags: ['capacity', 'optimization', 'workflow', 'measurement']
  },
  {
    id: 'arch-2025-003',
    title: 'Collaborative Selection Criteria v2.1',
    type: 'instrument',
    date: '2025-08-12',
    accessLevel: 'restricted',
    summary: 'Refined evaluation framework for partnership assessment. Emphasizes mutual amplification over traditional client-service relationships.',
    tags: ['collaboration', 'selection', 'partnership', 'evaluation']
  },
  {
    id: 'arch-2025-004',
    title: 'Case Study: Industrial Partner Alpha',
    type: 'collaboration',
    date: '2025-08-08',
    accessLevel: 'collaborator',
    summary: 'Deep dive into 6-month operational transformation. Focus on system integration and human-automation balance.',
    tags: ['case-study', 'transformation', 'integration', 'balance']
  },
  {
    id: 'arch-2025-005',
    title: 'Quality Metrics for Operational Excellence',
    type: 'framework',
    date: '2025-08-05',
    accessLevel: 'public',
    summary: 'Comprehensive framework for measuring operational quality beyond traditional efficiency metrics. Includes craft integrity indicators.',
    tags: ['quality', 'metrics', 'excellence', 'measurement']
  },
  {
    id: 'arch-2025-006',
    title: 'Workshop Environmental Optimization',
    type: 'study',
    date: '2025-07-28',
    accessLevel: 'public',
    summary: 'Environmental factors that impact deep work and creative output. Analysis of lighting, temperature, sound, and spatial arrangement.',
    tags: ['environment', 'workspace', 'deep-work', 'optimization']
  }
];

export default function ArchivePage() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccess, setSelectedAccess] = useState<string>('public');
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const { announcement, announce } = useAnnouncement();
  const mainContentRef = useRef<HTMLElement>(null);

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

  // Announce filter changes
  useEffect(() => {
    const resultCount = filteredEntries.length;
    const message = `Showing ${resultCount} ${resultCount === 1 ? 'entry' : 'entries'} for ${selectedType === 'all' ? 'all types' : selectedType} with ${selectedAccess} access`;
    announce(message);
  }, [selectedType, selectedAccess, filteredEntries.length, announce]);

  // Log color contrast results in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logContrastResults();
    }
  }, []);

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
      <ScreenReaderAnnouncement message={announcement} />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header>
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
        </header>

        {/* Filters */}
        <section aria-labelledby="filters-heading">
          <h2 id="filters-heading" className="sr-only">Archive Filters</h2>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8 mb-12"
          >
          {/* Type Filter */}
          <fieldset className="flex space-x-1 bg-graphite/20 p-1 rounded backdrop-blur-workshop">
            <legend className="sr-only">Filter by entry type</legend>
            <div role="radiogroup" aria-labelledby="type-filter-label">
              <span id="type-filter-label" className="sr-only">Entry Type</span>
              {types.map((type) => {
                const isSelected = selectedType === type;
                const filterId = generateId('type-filter');
                return (
                  <button
                    key={type}
                    id={filterId}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={createFilterLabel('type', type, isSelected, filteredEntries.length)}
                    onClick={() => setSelectedType(type)}
                    className={`
                      px-4 py-2 text-sm font-mono capitalize transition-all duration-300
                      focus:outline-none focus:ring-2 focus:ring-living-cyan focus:ring-offset-2 focus:ring-offset-graphite
                      ${isSelected
                        ? 'bg-copper/20 text-copper'
                        : 'text-pearl/60 hover:text-pearl/80'
                      }
                    `}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Access Filter */}
          <fieldset className="flex space-x-1 bg-graphite/20 p-1 rounded backdrop-blur-workshop">
            <legend className="sr-only">Filter by access level</legend>
            <div role="radiogroup" aria-labelledby="access-filter-label">
              <span id="access-filter-label" className="sr-only">Access Level</span>
              {accessLevels.map((level) => {
                const isSelected = selectedAccess === level;
                const filterId = generateId('access-filter');
                return (
                  <button
                    key={level}
                    id={filterId}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={createFilterLabel('access level', level, isSelected, filteredEntries.length)}
                    onClick={() => setSelectedAccess(level)}
                    className={`
                      px-4 py-2 text-sm font-mono capitalize transition-all duration-300
                      focus:outline-none focus:ring-2 focus:ring-living-cyan focus:ring-offset-2 focus:ring-offset-graphite
                      ${isSelected
                        ? 'bg-living-cyan/20 text-living-cyan'
                        : 'text-pearl/60 hover:text-pearl/80'
                      }
                    `}
                  >
                    <span aria-hidden="true">{getAccessIcon(level)}</span> {level}
                  </button>
                );
              })}
            </div>
          </fieldset>
          </motion.div>
        </section>

        {/* Archive Grid */}
        <section aria-labelledby="archive-entries-heading">
          <h2 id="archive-entries-heading" className="sr-only">
            Archive Entries ({filteredEntries.length} {filteredEntries.length === 1 ? 'result' : 'results'})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {filteredEntries.map((entry, index) => {
              const accessible = canAccess(entry.accessLevel);
              const isExpanded = selectedEntry === entry.id;
              const { trigger, content } = createExpandableAttributes(
                isExpanded,
                `entry-trigger-${entry.id}`,
                `entry-content-${entry.id}`
              );

              return (
                <motion.article
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  className={`
                    bg-graphite/30 border p-6 backdrop-blur-workshop
                    transition-all duration-500
                    ${accessible
                      ? 'border-copper/10 hover:border-copper/30'
                      : 'border-pearl/5 opacity-60'
                    }
                    ${isExpanded ? 'border-copper/50 bg-copper/5' : ''}
                  `}
                >
                {/* Header */}
                <header className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    {accessible ? (
                      <button
                        {...trigger}
                        onClick={() => setSelectedEntry(
                          selectedEntry === entry.id ? null : entry.id
                        )}
                        className="text-left w-full focus:outline-none focus:ring-2 focus:ring-living-cyan focus:ring-offset-2 focus:ring-offset-graphite rounded"
                      >
                        <h3 className="text-lg font-light mb-2 text-pearl hover:text-copper transition-colors">
                          {entry.title}
                        </h3>
                      </button>
                    ) : (
                      <h3 className="text-lg font-light mb-2 text-pearl/40">
                        {entry.title}
                      </h3>
                    )}
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`font-mono ${getTypeColor(entry.type)}`}>
                        {entry.type}
                      </span>
                      <time
                        dateTime={entry.date}
                        className="text-pearl/40 font-mono"
                        title={formatDateForScreenReader(entry.date)}
                      >
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short'
                        })}
                      </time>
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
                    {...content}
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
                            hover:bg-copper/20 focus:outline-none focus:ring-2 focus:ring-living-cyan focus:ring-offset-2 focus:ring-offset-graphite
                            transition-all duration-300
                          "
                          aria-label={`View full archive entry for ${entry.title}`}
                        >
                          View Full Archive Entry
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.article>
            );
          })}
        </div>

        </section>

        {/* Archive Philosophy */}
        <section aria-labelledby="philosophy-heading">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="bg-graphite/20 border border-copper/20 p-12 backdrop-blur-workshop">
              <h2 id="philosophy-heading" className="sr-only">Archive Philosophy</h2>
              <blockquote className="text-lg text-pearl/60 font-light italic leading-relaxed mb-6">
                "Knowledge shared selectively retains its power. Not every insight is meant
                for every audience. The archive preserves both the work and the intention behind it."
              </blockquote>

              <cite className="text-sm font-mono text-copper not-italic">
                — Archive Principles
              </cite>
            </div>
          </motion.div>
        </section>

        {/* Access Notice */}
        <section aria-labelledby="access-levels-heading">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="text-center"
          >
            <div className="border border-copper/20 p-8 backdrop-blur-workshop">
              <h2 id="access-levels-heading" className="text-lg text-pearl mb-4 font-light">Archive Access Levels</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="text-center">
                  <div className="text-copper text-xl mb-2" aria-hidden="true">◯</div>
                  <h3 className="text-pearl/70 mb-2">Public</h3>
                  <p className="text-pearl/50">
                    Open insights and foundational frameworks
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-living-cyan text-xl mb-2" aria-hidden="true">◐</div>
                  <h3 className="text-pearl/70 mb-2">Collaborator</h3>
                  <p className="text-pearl/50">
                    Operational details and case studies
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-pearl/40 text-xl mb-2" aria-hidden="true">●</div>
                  <h3 className="text-pearl/70 mb-2">Restricted</h3>
                  <p className="text-pearl/50">
                    Core methodologies and sensitive data
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
