'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ResultsView } from './results-view';
import type { AssessmentScore, OperationalPortrait, AssessmentResponse } from '@/types/assessment';

// Dynamically import the Observatory for performance
const OperationalObservatory = dynamic(
  () => import('../observatory/operational-observatory').then(mod => ({ 
    default: mod.OperationalObservatory 
  })),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-8 relative">
            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-ping" />
            <div className="absolute inset-0 border-4 border-cyan-500/40 rounded-full animate-ping animation-delay-200" />
            <div className="absolute inset-0 border-4 border-cyan-500/60 rounded-full animate-ping animation-delay-400" />
          </div>
          <h2 className="text-cyan-400 text-xl font-mono">Loading Observatory</h2>
          <p className="text-gray-500 text-sm mt-2">Preparing your operational constellation...</p>
        </div>
      </div>
    )
  }
);

interface ResultsViewEnhancedProps {
  score: AssessmentScore;
  portrait: OperationalPortrait;
  responses: AssessmentResponse[];
  sessionId: string;
  onRequestConsultation: () => void;
}

export function ResultsViewEnhanced({
  score,
  portrait,
  responses,
  sessionId,
  onRequestConsultation
}: ResultsViewEnhancedProps) {
  const [viewMode, setViewMode] = useState<'standard' | 'observatory'>('standard');
  const [autoUpgrade, setAutoUpgrade] = useState(false);
  
  // Auto-upgrade to Observatory for high scorers
  useEffect(() => {
    if (score.overall >= 70) {
      const timer = setTimeout(() => {
        setAutoUpgrade(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [score.overall]);
  
  // Check for WebGL support
  const hasWebGL = typeof window !== 'undefined' && (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch(e) {
      return false;
    }
  })();
  
  return (
    <div className="relative min-h-screen">
      {/* View mode switcher */}
      {hasWebGL && viewMode === 'standard' && (
        <AnimatePresence>
          {autoUpgrade && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 right-8 z-50"
            >
              <div className="bg-gradient-to-r from-cyan-500/10 to-cyan-400/10 backdrop-blur-xl 
                            rounded-lg border border-cyan-500/30 p-4 max-w-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 animate-pulse" />
                  <div className="flex-1">
                    <h3 className="text-cyan-400 font-semibold mb-1">
                      Observatory Available
                    </h3>
                    <p className="text-gray-300 text-sm mb-3">
                      Your high score qualifies you for our advanced 3D visualization experience.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('observatory')}
                        className="px-4 py-2 bg-cyan-500 text-slate-900 font-semibold 
                                 rounded hover:bg-cyan-400 transition-colors text-sm"
                      >
                        Enter Observatory
                      </button>
                      <button
                        onClick={() => setAutoUpgrade(false)}
                        className="px-4 py-2 text-gray-400 hover:text-gray-300 
                                 transition-colors text-sm"
                      >
                        Maybe Later
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      
      {/* Manual toggle (for development/testing) */}
      {hasWebGL && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={() => setViewMode(viewMode === 'standard' ? 'observatory' : 'standard')}
          className="fixed bottom-8 left-8 z-50 px-4 py-2 bg-slate-800/80 backdrop-blur
                   text-cyan-400 font-mono text-xs rounded border border-cyan-500/30
                   hover:bg-slate-700/80 transition-colors"
        >
          {viewMode === 'standard' ? '🌌 Switch to Observatory' : '📊 Switch to Standard'}
        </motion.button>
      )}
      
      {/* Render appropriate view */}
      <AnimatePresence mode="wait">
        {viewMode === 'standard' ? (
          <motion.div
            key="standard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ResultsView
              score={score}
              portrait={portrait}
              responses={responses}
              sessionId={sessionId}
              onRequestConsultation={onRequestConsultation}
            />
          </motion.div>
        ) : (
          <motion.div
            key="observatory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <OperationalObservatory
              score={score}
              portrait={portrait}
              responses={responses}
              sessionId={sessionId}
              onRequestConsultation={onRequestConsultation}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}