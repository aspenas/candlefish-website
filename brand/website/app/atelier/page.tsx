'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/atelier-enhancements.css';
import { EntryPortal } from '../../components/atelier/EntryPortal';
import { AmbientAudio } from '../../components/atelier/AmbientAudio';
import { AudioSystem } from '../../components/atelier/AudioSystem';
import { CursorTrail } from '../../components/atelier/CursorTrail';
import { TemporalEvolution } from '../../components/atelier/TemporalEvolution';
import { LaboratoryInterface } from '../../components/atelier/LaboratoryInterface';
import { WorkshopCapabilities } from '../../components/atelier/WorkshopCapabilities';
import { TransformationVisualization } from '../../components/atelier/TransformationVisualization';
import { WorkshopRequestForm } from '../../components/atelier/WorkshopRequestForm';
import { AutomationShowcase } from '../../components/atelier/AutomationShowcase';
import { ParticleField } from '../../components/atelier/ParticleField';
import { SystemDiagnostics } from '../../components/atelier/SystemDiagnostics';
import { SecurityClearance } from '../../components/atelier/SecurityClearance';
import { EasterEggs } from '../../components/atelier/EasterEggs';
import { DynamicBackground } from '../../components/atelier/DynamicBackground';

type Section = 'entry' | 'capabilities' | 'transformations' | 'examples' | 'access';

export default function AtelierLaboratory() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentSection, setCurrentSection] = useState<Section>('entry');
  const [hasEntered, setHasEntered] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [securityCleared, setSecurityCleared] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    operational: true,
    capacity: 94.7,
    activeProcesses: 3,
    queuePosition: 7
  });

  // Ensure this component only renders on the client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Simulate system metrics updates
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        capacity: Math.max(85, Math.min(100, prev.capacity + (Math.random() - 0.5) * 2)),
        queuePosition: Math.max(1, prev.queuePosition + Math.floor(Math.random() * 3 - 1))
      }));
    }, 5000);

    // Track audio time for achievements
    let audioStartTime = Date.now();
    const audioTimeInterval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).__laboratoryAudio?.isPlaying) {
        const currentTime = parseInt(localStorage.getItem('audioTime') || '0');
        localStorage.setItem('audioTime', (currentTime + 1000).toString());
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(audioTimeInterval);
    };
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Quick access to security clearance (for testing)
      if (e.key === 'F11' && !hasEntered) {
        e.preventDefault();
        setShowSecurity(true);
      }

      // Quick diagnostics toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && hasEntered) {
        e.preventDefault();
        handleDiagnosticsToggle();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [hasEntered, showDiagnostics]);

  const handleEnterLaboratory = () => {
    if (!securityCleared) {
      setShowSecurity(true);
    } else {
      setHasEntered(true);
      setCurrentSection('capabilities');

      // Play entry sound effect
      if (typeof window !== 'undefined' && (window as any).__laboratoryAudio?.playEffect) {
        (window as any).__laboratoryAudio.playEffect('entry');
      }
    }
  };

  const handleSecurityComplete = () => {
    setShowSecurity(false);
    setSecurityCleared(true);
    setHasEntered(true);
    setCurrentSection('capabilities');

    // Play success sound
    if (typeof window !== 'undefined' && (window as any).__laboratoryAudio?.playEffect) {
      (window as any).__laboratoryAudio.playEffect('success');
    }
  };

  const handleDiagnosticsToggle = () => {
    setShowDiagnostics(!showDiagnostics);

    // Track diagnostics usage for achievements
    if (typeof window !== 'undefined') {
      const currentCount = parseInt(localStorage.getItem('diagnosticsCount') || '0');
      localStorage.setItem('diagnosticsCount', (currentCount + 1).toString());
    }
  };

  // Don't render anything on server-side
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-depth-ocean to-depth-steel">
        <div className="text-pearl/50 font-mono text-sm">Initializing Laboratory...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-black via-depth-ocean to-depth-steel overflow-hidden">
      {/* Dynamic Background System */}
      <DynamicBackground />

      {/* Particle Field */}
      <ParticleField />

      {/* Environmental Systems */}
      <TemporalEvolution />
      <EntryPortal />
      <CursorTrail />
      <AudioSystem />

      {/* System Diagnostics */}
      <SystemDiagnostics
        isVisible={showDiagnostics}
        onToggle={handleDiagnosticsToggle}
      />

      {/* Security Clearance */}
      <SecurityClearance
        isVisible={showSecurity}
        onComplete={handleSecurityComplete}
        onClose={() => setShowSecurity(false)}
      />

      {/* Easter Eggs System */}
      <EasterEggs />

      {/* Laboratory Interface */}
      <LaboratoryInterface
        currentSection={currentSection}
        systemStatus={systemStatus}
        onSectionChange={setCurrentSection}
        hasEntered={hasEntered}
      />

      {/* Content Sections */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {!hasEntered && (
            <EntrySequence
              onEnter={handleEnterLaboratory}
              systemStatus={systemStatus}
            />
          )}

          {hasEntered && currentSection === 'capabilities' && (
            <WorkshopCapabilities onNavigate={setCurrentSection} />
          )}

          {hasEntered && currentSection === 'transformations' && (
            <TransformationVisualization onNavigate={setCurrentSection} />
          )}

          {hasEntered && currentSection === 'examples' && (
            <AutomationShowcase onNavigate={setCurrentSection} />
          )}

          {hasEntered && currentSection === 'access' && (
            <WorkshopRequestForm
              onNavigate={setCurrentSection}
              queuePosition={systemStatus.queuePosition}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Entry sequence component
function EntrySequence({ onEnter, systemStatus }: {
  onEnter: () => void;
  systemStatus: { operational: boolean; capacity: number; activeProcesses: number; queuePosition: number };
}) {
  return (
    <motion.section
      key="entry"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1 }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="max-w-4xl mx-auto text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="space-y-6"
        >
          <h1 className="text-5xl md:text-7xl font-light text-pearl tracking-tight leading-display">
            Operational Laboratory
          </h1>
          <p className="text-xl md:text-2xl text-pearl/70 font-light max-w-2xl mx-auto">
            Where manual chaos becomes automated elegance
          </p>
        </motion.div>

        {/* System Status Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto"
        >
          <div className="text-center space-y-2">
            <div className="text-3xl font-mono text-living-cyan">
              {systemStatus.capacity.toFixed(1)}%
            </div>
            <div className="text-sm text-pearl/50 font-mono uppercase tracking-wider">
              Capacity
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl font-mono text-copper">
              {systemStatus.activeProcesses}
            </div>
            <div className="text-sm text-pearl/50 font-mono uppercase tracking-wider">
              Active
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl font-mono text-pearl/70">
              #{systemStatus.queuePosition}
            </div>
            <div className="text-sm text-pearl/50 font-mono uppercase tracking-wider">
              Queue
            </div>
          </div>
        </motion.div>

        {/* Entry Portal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="pt-8"
        >
          <button
            onClick={onEnter}
            onMouseEnter={() => {
              if (typeof window !== 'undefined' && (window as any).__laboratoryAudio?.playEffect) {
                (window as any).__laboratoryAudio.playEffect('hover');
              }
            }}
            onMouseDown={() => {
              if (typeof window !== 'undefined' && (window as any).__laboratoryAudio?.playEffect) {
                (window as any).__laboratoryAudio.playEffect('click');
              }
            }}
            className="
              group relative px-12 py-6
              bg-graphite/80 border border-copper/30
              text-living-cyan font-mono text-lg
              backdrop-blur-md
              hover:border-living-cyan hover:bg-living-cyan/5
              transition-all duration-700
              overflow-hidden
            "
          >
            <span className="relative z-10 flex items-center gap-3">
              Enter Laboratory
              <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>

            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-living-cyan/10 to-transparent
                          translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </button>

          <p className="text-sm text-pearl/50 font-mono mt-4">
            Precision operational engineering awaits
          </p>
        </motion.div>

        {/* Atmospheric indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="flex justify-center space-x-8 pt-8"
        >
          {[
            { label: 'Monitored', color: 'living-cyan', active: true },
            { label: 'Calibrated', color: 'copper', active: true },
            { label: 'Selective', color: 'pearl', active: false }
          ].map((indicator, i) => (
            <div key={indicator.label} className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                indicator.active
                  ? `bg-${indicator.color} animate-pulse`
                  : `bg-${indicator.color}/30`
              }`} />
              <span className="text-xs font-mono text-pearl/50 uppercase tracking-wider">
                {indicator.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Quick access hints */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
          className="text-center pt-6 space-y-2"
        >
          <div className="text-xs font-mono text-pearl/30">
            Advanced Access: F11 • Diagnostics: ⌘+D • Terminal: Ctrl+`
          </div>
          <div className="text-xs font-mono text-copper/30">
            Hidden features await discovery...
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
