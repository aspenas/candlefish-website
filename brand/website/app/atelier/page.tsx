'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/atelier-enhancements.css';
import '../../styles/atelier-refined.css';
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
import { SystemDiagnostics } from '../../components/atelier/SystemDiagnostics';
import { SecurityClearance } from '../../components/atelier/SecurityClearance';
import { EasterEggs } from '../../components/atelier/EasterEggs';
// Refined components following Jony Ive principles
import { AtelierDesignProvider, AmbientGlow, MomentButton, SpatialText, ReadingPlane } from '../../components/atelier/AtelierDesignSystem';
import { FocusManager } from '../../components/atelier/FocusManager';
import { AmbientSystem } from '../../components/atelier/AmbientSystem';
import { ReadingMode } from '../../components/atelier/ReadingMode';
import { DynamicBackground } from '../../components/atelier/DynamicBackground';
import { ParticleField } from '../../components/atelier/ParticleField';

type Section = 'entry' | 'capabilities' | 'transformations' | 'examples' | 'access';

export default function AtelierLaboratory() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentSection, setCurrentSection] = useState<Section>('entry');
  const [hasEntered, setHasEntered] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [securityCleared, setSecurityCleared] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
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
    <AtelierDesignProvider>
      <div className="min-h-screen relative bg-gradient-to-b from-nearBlack via-charcoal/80 to-charcoal overflow-hidden">
        {/* Refined Background Systems - Jony Ive Style */}
        <AmbientSystem
          intensity={0.3}
          followMouse={true}
          breathingRate={10000}
        />

        <DynamicBackground
          intensity={0.4}
          enableParallax={true}
          readingMode={isReadingMode}
        />

        {/* Moments of Delight - Interaction-based particles only */}
        <ParticleField
          intensity={0.3}
          interactionOnly={true}
        />

        {/* Focus Management System */}
        <FocusManager>
          {/* Reading Mode for distraction-free content */}
          <ReadingMode threshold={1000}>
            {/* Environmental Systems - Preserved for functionality */}
            <TemporalEvolution />
            <EntryPortal />
            <CursorTrail />
            <AudioSystem />

            {/* System Diagnostics - Now subtle HUD */}
            <SystemDiagnostics
              isVisible={showDiagnostics}
              onToggle={handleDiagnosticsToggle}
            />

            {/* Security Clearance - iPhone-style smoothness */}
            <SecurityClearance
              isVisible={showSecurity}
              onComplete={handleSecurityComplete}
              onClose={() => setShowSecurity(false)}
            />

            {/* Easter Eggs System - Discovery-based */}
            <EasterEggs />

            {/* Laboratory Interface - Refined */}
            <LaboratoryInterface
              currentSection={currentSection}
              systemStatus={systemStatus}
              onSectionChange={setCurrentSection}
              hasEntered={hasEntered}
            />

            {/* Content Sections - With Reading Planes */}
            <main className="relative z-10">
              <AnimatePresence mode="wait">
                {!hasEntered && (
                  <RefinedEntrySequence
                    onEnter={handleEnterLaboratory}
                    systemStatus={systemStatus}
                  />
                )}

                {hasEntered && currentSection === 'capabilities' && (
                  <ReadingPlane sectionId="capabilities" priority="primary">
                    <WorkshopCapabilities onNavigate={setCurrentSection} />
                  </ReadingPlane>
                )}

                {hasEntered && currentSection === 'transformations' && (
                  <ReadingPlane sectionId="transformations" priority="primary">
                    <TransformationVisualization onNavigate={setCurrentSection} />
                  </ReadingPlane>
                )}

                {hasEntered && currentSection === 'examples' && (
                  <ReadingPlane sectionId="examples" priority="primary">
                    <AutomationShowcase onNavigate={setCurrentSection} />
                  </ReadingPlane>
                )}

                {hasEntered && currentSection === 'access' && (
                  <ReadingPlane sectionId="access" priority="primary">
                    <WorkshopRequestForm
                      onNavigate={setCurrentSection}
                      queuePosition={systemStatus.queuePosition}
                    />
                  </ReadingPlane>
                )}
              </AnimatePresence>
            </main>
          </ReadingMode>
        </FocusManager>
      </div>
    </AtelierDesignProvider>
  );
}

// Refined Entry sequence following Jony Ive principles
function RefinedEntrySequence({ onEnter, systemStatus }: {
  onEnter: () => void;
  systemStatus: { operational: boolean; capacity: number; activeProcesses: number; queuePosition: number };
}) {
  return (
    <motion.section
      key="entry"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(8px)' }}
      transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <ReadingPlane sectionId="entry" priority="primary" className="max-w-4xl mx-auto">
        <div className="text-center space-y-16 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-8"
          >
            <SpatialText level="hero" className="text-pearl">
              Operational Laboratory
            </SpatialText>
            <SpatialText level="subtitle" className="text-pearl/80 max-w-2xl mx-auto">
              Where manual chaos becomes automated elegance
            </SpatialText>
          </motion.div>

          {/* Refined System Status - More Apple-like */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { value: systemStatus.capacity.toFixed(1) + '%', label: 'Capacity', accent: true },
              { value: systemStatus.activeProcesses.toString(), label: 'Active', warning: systemStatus.activeProcesses > 5 },
              { value: '#' + systemStatus.queuePosition.toString(), label: 'Queue', muted: true }
            ].map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.6 }}
                className="text-center space-y-3 p-4 rounded-lg bg-pearl/[0.02] border border-pearl/5"
              >
                <div className={`text-3xl font-mono ${
                  metric.accent ? 'text-livingCyan' :
                  metric.warning ? 'text-copper' :
                  'text-pearl/70'
                }`}>
                  {metric.value}
                </div>
                <SpatialText level="caption" className="text-pearl/50">
                  {metric.label}
                </SpatialText>
              </motion.div>
            ))}
          </motion.div>

          {/* Refined Entry Button - iPhone precision */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="pt-4"
          >
            <MomentButton
              onClick={onEnter}
              variant="primary"
              size="large"
              className="group"
            >
              <span className="flex items-center gap-3">
                Enter Laboratory
                <motion.svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  whileHover={{ x: 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </motion.svg>
              </span>
            </MomentButton>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              className="mt-6"
            >
              <SpatialText level="caption" className="text-pearl/50">
                Precision operational engineering awaits
              </SpatialText>
            </motion.div>
          </motion.div>

          {/* Subtle Status Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="flex justify-center space-x-8"
          >
            {[
              { label: 'Monitored', active: true },
              { label: 'Calibrated', active: true },
              { label: 'Selective', active: false }
            ].map((indicator, i) => (
              <motion.div
                key={indicator.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2 + i * 0.1, duration: 0.5 }}
                className="flex items-center space-x-2"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  indicator.active
                    ? 'bg-livingCyan/80 animate-pulse'
                    : 'bg-pearl/20'
                }`} />
                <SpatialText level="caption" className="text-pearl/40">
                  {indicator.label}
                </SpatialText>
              </motion.div>
            ))}
          </motion.div>

          {/* Refined Access Hints */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5, duration: 1 }}
            className="text-center space-y-2"
          >
            <SpatialText level="caption" className="text-pearl/20">
              F11: Advanced Access • ⌘+D: Diagnostics • ⌘+R: Reading Mode
            </SpatialText>
            <SpatialText level="caption" className="text-pearl/15">
              Hidden features await discovery...
            </SpatialText>
          </motion.div>
        </div>
      </ReadingPlane>
    </motion.section>
  );
}
