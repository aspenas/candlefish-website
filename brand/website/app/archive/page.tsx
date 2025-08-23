'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useKeyboardNavigation, useAnnouncement } from '../../hooks/useAccessibility';
import { createFilterLabel, formatDateForScreenReader, generateId, createExpandableAttributes } from '../../utils/accessibility';
import ScreenReaderAnnouncement from '../../components/accessibility/ScreenReaderAnnouncement';
import { logContrastResults } from '../../utils/colorContrast';
import { archiveEntries, type ArchiveEntry } from './data';

export default function ArchivePage() {
  const router = useRouter();
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
      case 'study': return 'text-[#DAA520]';
      case 'framework': return 'text-[#3FD3C6]';
      case 'instrument': return 'text-[#F8F8F2]';
      case 'collaboration': return 'text-[#DAA520]';
      default: return 'text-[#415A77]';
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
    <div className="min-h-screen pt-24 pb-16 px-4" style={{
      background: 'linear-gradient(135deg, rgb(52, 58, 64) 0%, rgb(27, 38, 59) 50%, rgb(13, 27, 42) 100%)'
    }}>
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
            <h1 className="text-5xl font-light text-[#F8F8F2] mb-6 leading-tight">Workshop Archive</h1>
            <p className="text-xl text-[#415A77] max-w-2xl mx-auto font-light leading-relaxed">
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
          <fieldset className="flex space-x-1 bg-[#1B263B]/30 border border-[#415A77]/20 p-1 backdrop-blur-sm">
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
                      focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A]
                      ${isSelected
                        ? 'bg-[#DAA520]/20 text-[#DAA520]'
                        : 'text-[#E0E1DD]/60 hover:text-[#E0E1DD]/80'
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
          <fieldset className="flex space-x-1 bg-[#1B263B]/30 border border-[#415A77]/20 p-1 backdrop-blur-sm">
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
                      focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A]
                      ${isSelected
                        ? 'bg-[#3FD3C6]/20 text-[#3FD3C6]'
                        : 'text-[#E0E1DD]/60 hover:text-[#E0E1DD]/80'
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
                    bg-[#1B263B]/50 border p-6 backdrop-blur-sm
                    transition-all duration-500
                    ${accessible
                      ? 'border-[#415A77]/30 hover:border-[#DAA520]/50'
                      : 'border-[#415A77]/10 opacity-60'
                    }
                    ${isExpanded ? 'border-[#DAA520]/50 bg-[#DAA520]/5' : ''}
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
                        className="text-left w-full focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded"
                      >
                        <h3 className="text-lg font-light mb-2 text-[#F8F8F2] hover:text-[#DAA520] transition-colors">
                          {entry.title}
                        </h3>
                      </button>
                    ) : (
                      <h3 className="text-lg font-light mb-2 text-[#415A77]">
                        {entry.title}
                      </h3>
                    )}
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`font-mono ${getTypeColor(entry.type)}`}>
                        {entry.type}
                      </span>
                      <time
                        dateTime={entry.date}
                        className="text-[#415A77] font-mono"
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
                      entry.accessLevel === 'public' ? 'text-[#DAA520]' :
                      entry.accessLevel === 'collaborator' ? 'text-[#3FD3C6]' : 'text-[#415A77]'
                    }`}>
                      {getAccessIcon(entry.accessLevel)}
                    </div>
                    {!accessible && (
                      <div className="text-xs text-[#415A77]/60 mt-1">restricted</div>
                    )}
                  </div>
                </header>

                {/* Summary */}
                {accessible && (
                  <p className="text-[#415A77] text-sm leading-relaxed mb-4 font-light">
                    {entry.summary}
                  </p>
                )}

                {/* Tags */}
                {accessible && (
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-[#DAA520]/10 text-[#DAA520] text-xs font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {!accessible && (
                  <div className="text-center py-8">
                    <div className="text-[#415A77]/60 text-sm font-mono">
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
                    <div className="pt-6 mt-6 border-t border-[#DAA520]/20">
                      <div className="text-center">
                        <button
                          onClick={() => router.push(`/archive/${entry.id}`)}
                          className="
                            px-6 py-2
                            bg-[#DAA520]/10 border border-[#DAA520]/30
                            text-[#DAA520] font-mono text-sm font-light
                            hover:bg-[#DAA520]/20 focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A]
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
            <div className="bg-[#1B263B]/30 border border-[#DAA520]/20 p-12 backdrop-blur-sm">
              <h2 id="philosophy-heading" className="sr-only">Archive Philosophy</h2>
              <blockquote className="text-lg text-[#415A77] font-light italic leading-relaxed mb-6">
                "Knowledge shared selectively retains its power. Not every insight is meant
                for every audience. The archive preserves both the work and the intention behind it."
              </blockquote>

              <cite className="text-sm font-mono text-[#DAA520] not-italic">
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
            <div className="border border-[#415A77]/30 p-8 backdrop-blur-sm">
              <h2 id="access-levels-heading" className="text-lg text-[#F8F8F2] mb-4 font-light">Archive Access Levels</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="text-center">
                  <div className="text-[#DAA520] text-xl mb-2" aria-hidden="true">◯</div>
                  <h3 className="text-[#E0E1DD]/70 mb-2">Public</h3>
                  <p className="text-[#415A77]">
                    Open insights and foundational frameworks
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-[#3FD3C6] text-xl mb-2" aria-hidden="true">◐</div>
                  <h3 className="text-[#E0E1DD]/70 mb-2">Collaborator</h3>
                  <p className="text-[#415A77]">
                    Operational details and case studies
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-[#415A77] text-xl mb-2" aria-hidden="true">●</div>
                  <h3 className="text-[#E0E1DD]/70 mb-2">Restricted</h3>
                  <p className="text-[#415A77]">
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
