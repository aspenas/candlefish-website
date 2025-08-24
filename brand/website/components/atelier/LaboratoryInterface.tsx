'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Section = 'entry' | 'capabilities' | 'transformations' | 'examples' | 'access';

interface SystemStatus {
  operational: boolean;
  capacity: number;
  activeProcesses: number;
  queuePosition: number;
}

interface LaboratoryInterfaceProps {
  currentSection: Section;
  systemStatus: SystemStatus;
  onSectionChange: (section: Section) => void;
  hasEntered: boolean;
}

export function LaboratoryInterface({
  currentSection,
  systemStatus,
  onSectionChange,
  hasEntered
}: LaboratoryInterfaceProps) {
  const [showHUD, setShowHUD] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (hasEntered) {
      const timer = setTimeout(() => setShowHUD(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasEntered]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navigationItems = [
    {
      id: 'capabilities' as Section,
      label: 'Workshop Capabilities',
      shortcode: 'WS',
      description: 'Day-long operational intensive'
    },
    {
      id: 'transformations' as Section,
      label: 'Transformation Gallery',
      shortcode: 'TG',
      description: 'Before & after case studies'
    },
    {
      id: 'examples' as Section,
      label: 'Automation Showcase',
      shortcode: 'AS',
      description: 'Live operational systems'
    },
    {
      id: 'access' as Section,
      label: 'Request Access',
      shortcode: 'RA',
      description: 'Workshop visit application'
    }
  ];

  if (!hasEntered) return null;

  return (
    <>
      {/* Main HUD Interface */}
      <AnimatePresence>
        {showHUD && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8 }}
            className="fixed top-0 left-0 right-0 z-50 p-6"
          >
            <div className="max-w-7xl mx-auto">
              <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 rounded-none">
                <div className="flex items-center justify-between p-4">
                  {/* Laboratory ID */}
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-living-cyan rounded-full animate-pulse" />
                    <div className="font-mono text-sm text-pearl/70">
                      ATELIER_LAB_001
                    </div>
                  </div>

                  {/* System Status */}
                  <div className="flex items-center space-x-6 font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-pearl/50">CAP:</span>
                      <span className={`${
                        systemStatus.capacity > 95 ? 'text-living-cyan' :
                        systemStatus.capacity > 85 ? 'text-copper' : 'text-pearl/70'
                      }`}>
                        {systemStatus.capacity.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-pearl/50">PROC:</span>
                      <span className="text-copper">{systemStatus.activeProcesses}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-pearl/50">QUEUE:</span>
                      <span className="text-pearl/70">#{systemStatus.queuePosition}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-pearl/50">TIME:</span>
                      <span className="text-pearl/70">
                        {currentTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Navigation Interface */}
      <AnimatePresence>
        {showHUD && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block fixed left-6 top-1/2 transform -translate-y-1/2 z-50"
          >
            <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 rounded-none">
              <div className="p-4 space-y-4">
                <div className="text-xs font-mono text-pearl/50 uppercase tracking-wider mb-4">
                  Navigation
                </div>

                {navigationItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`
                      w-full text-left p-3 transition-all duration-300
                      border border-transparent hover:border-copper/30
                      group relative overflow-hidden
                      ${currentSection === item.id
                        ? 'bg-copper/10 border-copper/30'
                        : 'hover:bg-copper/5'
                      }
                    `}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center space-x-3 relative z-10">
                      <div className={`
                        w-8 h-8 border border-pearl/30 flex items-center justify-center
                        font-mono text-xs
                        ${currentSection === item.id
                          ? 'bg-copper text-graphite border-copper'
                          : 'text-pearl/70 group-hover:border-copper/50'
                        }
                      `}>
                        {item.shortcode}
                      </div>
                      <div>
                        <div className={`
                          text-sm font-medium
                          ${currentSection === item.id ? 'text-pearl' : 'text-pearl/70 group-hover:text-pearl'}
                        `}>
                          {item.label}
                        </div>
                        <div className="text-xs text-pearl/40 font-mono">
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {/* Active indicator */}
                    {currentSection === item.id && (
                      <motion.div
                        layoutId="activeSection"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-copper"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {showHUD && (
          <MobileNavigation
            navigationItems={navigationItems}
            currentSection={currentSection}
            onSectionChange={onSectionChange}
            systemStatus={systemStatus}
          />
        )}
      </AnimatePresence>

      {/* Bottom Status Bar */}
      <AnimatePresence>
        {showHUD && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="fixed bottom-6 left-6 right-6 z-50"
          >
            <div className="max-w-7xl mx-auto">
              <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 rounded-none">
                <div className="flex items-center justify-between p-3">
                  {/* Operational Status */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-living-cyan rounded-full animate-pulse" />
                      <span className="font-mono text-xs text-pearl/70">OPERATIONAL</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-copper rounded-full animate-pulse" />
                      <span className="font-mono text-xs text-pearl/70">MONITORED</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-pearl/30 rounded-full" />
                      <span className="font-mono text-xs text-pearl/70">SELECTIVE</span>
                    </div>
                  </div>

                  {/* Current Section Info */}
                  <div className="font-mono text-xs text-pearl/50">
                    {navigationItems.find(item => item.id === currentSection)?.description || 'Laboratory Entry'}
                  </div>

                  {/* Session Info */}
                  <div className="font-mono text-xs text-pearl/50">
                    SESSION: {Math.floor(Date.now() / 1000) % 10000}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Toggle */}
      <AnimatePresence>
        {showHUD && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="fixed top-6 right-6 z-50 lg:hidden
                     w-12 h-12 bg-graphite/80 backdrop-blur-md
                     border border-copper/30 flex items-center justify-center
                     text-living-cyan hover:border-living-cyan
                     transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

// Mobile Navigation Component
function MobileNavigation({
  navigationItems,
  currentSection,
  onSectionChange,
  systemStatus
}: {
  navigationItems: Array<{
    id: Section;
    label: string;
    shortcode: string;
    description: string;
  }>;
  currentSection: Section;
  onSectionChange: (section: Section) => void;
  systemStatus: SystemStatus;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Trigger */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed top-6 right-6 z-50 lg:hidden
                 w-12 h-12 bg-graphite/80 backdrop-blur-md
                 border border-copper/30 flex items-center justify-center
                 text-living-cyan hover:border-living-cyan
                 transition-all duration-300"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </motion.button>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] lg:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-graphite/95 backdrop-blur-md border-l border-copper/20"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-living-cyan rounded-full animate-pulse" />
                    <span className="font-mono text-sm text-pearl">LAB_NAV</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 flex items-center justify-center text-pearl/70 hover:text-pearl"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* System Status */}
                <div className="bg-black/40 border border-copper/20 p-4 mb-8">
                  <div className="text-xs font-mono text-pearl/50 uppercase tracking-wider mb-3">
                    System Status
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-mono text-living-cyan">
                        {systemStatus.capacity.toFixed(1)}%
                      </div>
                      <div className="text-xs text-pearl/50 font-mono">CAPACITY</div>
                    </div>
                    <div>
                      <div className="text-lg font-mono text-copper">
                        #{systemStatus.queuePosition}
                      </div>
                      <div className="text-xs text-pearl/50 font-mono">QUEUE</div>
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="space-y-3">
                  <div className="text-xs font-mono text-pearl/50 uppercase tracking-wider mb-4">
                    Navigation
                  </div>

                  {navigationItems.map((item) => (
                    <motion.button
                      key={item.id}
                      onClick={() => {
                        onSectionChange(item.id);
                        setIsOpen(false);
                      }}
                      className={`
                        w-full text-left p-4 transition-all duration-300
                        border border-transparent
                        ${currentSection === item.id
                          ? 'bg-copper/10 border-copper/30'
                          : 'hover:bg-copper/5 hover:border-copper/20'
                        }
                      `}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`
                          w-10 h-10 border border-pearl/30 flex items-center justify-center
                          font-mono text-sm
                          ${currentSection === item.id
                            ? 'bg-copper text-graphite border-copper'
                            : 'text-pearl/70'
                          }
                        `}>
                          {item.shortcode}
                        </div>
                        <div>
                          <div className={`
                            text-base font-medium
                            ${currentSection === item.id ? 'text-pearl' : 'text-pearl/70'}
                          `}>
                            {item.label}
                          </div>
                          <div className="text-sm text-pearl/40 font-mono">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="text-center text-xs font-mono text-pearl/30">
                    CANDLEFISH ATELIER<br/>
                    Operational Laboratory
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
