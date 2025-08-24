'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SecurityClearanceProps {
  isVisible: boolean;
  onComplete: () => void;
  onClose: () => void;
}

interface ScanningState {
  step: 'fingerprint' | 'retinal' | 'voice' | 'complete';
  progress: number;
  authenticated: boolean;
  clearanceLevel: number;
}

export function SecurityClearance({ isVisible, onComplete, onClose }: SecurityClearanceProps) {
  const [scanState, setScanState] = useState<ScanningState>({
    step: 'fingerprint',
    progress: 0,
    authenticated: false,
    clearanceLevel: 0,
  });

  const [typewriterText, setTypewriterText] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const clearanceLevels = [
    { level: 1, title: 'VISITOR ACCESS', color: 'copper', description: 'Basic laboratory observation privileges' },
    { level: 2, title: 'RESEARCH ASSOCIATE', color: 'living-cyan', description: 'Standard automation development access' },
    { level: 3, title: 'SENIOR ENGINEER', color: 'pearl', description: 'Advanced system integration clearance' },
    { level: 4, title: 'LABORATORY DIRECTOR', color: 'living-cyan', description: 'Full operational control authorization' },
  ];

  const securityMessages = [
    'Initiating biometric verification...',
    'Scanning fingerprint patterns...',
    'Analyzing retinal structure...',
    'Verifying voice authentication...',
    'Cross-referencing security databases...',
    'Access evaluation complete.',
  ];

  // Fingerprint scanner animation
  const drawFingerprintScanner = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() * 0.003;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw scanning beam
    ctx.strokeStyle = `rgba(0, 188, 212, ${0.3 + Math.sin(time * 2) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const scanY = centerY - 40 + (Math.sin(time) * 40);
    ctx.moveTo(centerX - 60, scanY);
    ctx.lineTo(centerX + 60, scanY);
    ctx.stroke();

    // Draw fingerprint ridges
    ctx.strokeStyle = `rgba(218, 165, 32, ${0.4 + Math.sin(time * 1.5) * 0.3})`;
    ctx.lineWidth = 1;

    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const radius = 15 + i * 8;
      const segments = 32;

      for (let j = 0; j < segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const noise = Math.sin(angle * 4 + i * 0.5) * 2;
        const x = centerX + Math.cos(angle) * (radius + noise);
        const y = centerY + Math.sin(angle) * (radius + noise) * 0.8;

        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw scan progress indicator
    if (scanState.step === 'fingerprint') {
      const progress = scanState.progress / 100;
      ctx.fillStyle = `rgba(0, 188, 212, ${0.2 + progress * 0.3})`;
      ctx.fillRect(centerX - 80, centerY + 60, progress * 160, 4);
    }

    animationRef.current = requestAnimationFrame(drawFingerprintScanner);
  };

  // Retinal scanner animation
  const drawRetinalScanner = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() * 0.002;

    // Clear canvas with dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw eye outline
    ctx.strokeStyle = `rgba(240, 248, 255, ${0.6 + Math.sin(time * 3) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 50, 25, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw iris
    ctx.strokeStyle = `rgba(218, 165, 32, ${0.8 + Math.sin(time * 2) * 0.2})`;
    ctx.lineWidth = 1;

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const innerRadius = 8;
      const outerRadius = 18 + Math.sin(time + i) * 3;

      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * innerRadius,
        centerY + Math.sin(angle) * innerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * outerRadius,
        centerY + Math.sin(angle) * outerRadius
      );
      ctx.stroke();
    }

    // Draw pupil
    ctx.fillStyle = `rgba(0, 0, 0, ${0.8 + Math.sin(time * 4) * 0.1})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Scanning grid
    ctx.strokeStyle = `rgba(0, 188, 212, ${0.3 + Math.sin(time * 5) * 0.2})`;
    ctx.lineWidth = 0.5;

    for (let x = -60; x <= 60; x += 10) {
      ctx.beginPath();
      ctx.moveTo(centerX + x, centerY - 30);
      ctx.lineTo(centerX + x, centerY + 30);
      ctx.stroke();
    }

    for (let y = -30; y <= 30; y += 10) {
      ctx.beginPath();
      ctx.moveTo(centerX - 60, centerY + y);
      ctx.lineTo(centerX + 60, centerY + y);
      ctx.stroke();
    }

    animationRef.current = requestAnimationFrame(drawRetinalScanner);
  };

  // Typewriter effect
  const typewriterEffect = (text: string, callback?: () => void) => {
    let index = 0;
    setTypewriterText('');

    const interval = setInterval(() => {
      setTypewriterText(text.slice(0, index + 1));
      index++;

      if (index >= text.length) {
        clearInterval(interval);
        if (callback) {
          setTimeout(callback, 1000);
        }
      }
    }, 50);
  };

  // Start security scan sequence
  useEffect(() => {
    if (!isVisible) return;

    setShowScanner(true);

    // Start with fingerprint scan
    typewriterEffect(securityMessages[1], () => {
      setScanState(prev => ({ ...prev, step: 'fingerprint' }));

      // Simulate fingerprint scanning
      const fingerprintInterval = setInterval(() => {
        setScanState(prev => {
          const newProgress = prev.progress + 2;
          if (newProgress >= 100) {
            clearInterval(fingerprintInterval);

            // Move to retinal scan
            typewriterEffect(securityMessages[2], () => {
              setScanState(prev => ({ ...prev, step: 'retinal', progress: 0 }));

              // Simulate retinal scanning
              const retinalInterval = setInterval(() => {
                setScanState(prev => {
                  const newProgress = prev.progress + 1.5;
                  if (newProgress >= 100) {
                    clearInterval(retinalInterval);

                    // Move to voice authentication
                    typewriterEffect(securityMessages[3], () => {
                      setScanState(prev => ({ ...prev, step: 'voice', progress: 0 }));

                      // Simulate voice authentication
                      const voiceInterval = setInterval(() => {
                        setScanState(prev => {
                          const newProgress = prev.progress + 3;
                          if (newProgress >= 100) {
                            clearInterval(voiceInterval);

                            // Complete authentication
                            typewriterEffect(securityMessages[5], () => {
                              const finalLevel = Math.floor(Math.random() * 4) + 1;
                              setScanState({
                                step: 'complete',
                                progress: 100,
                                authenticated: true,
                                clearanceLevel: finalLevel,
                              });

                              // Play success sound
                              if ((window as any).__laboratoryAudio?.playEffect) {
                                (window as any).__laboratoryAudio.playEffect('success');
                              }
                            });

                            return { ...prev, progress: 100 };
                          }
                          return { ...prev, progress: newProgress };
                        });
                      }, 80);
                    });

                    return { ...prev, progress: 100 };
                  }
                  return { ...prev, progress: newProgress };
                });
              }, 100);
            });

            return { ...prev, progress: 100 };
          }
          return { ...prev, progress: newProgress };
        });
      }, 80);
    });
  }, [isVisible]);

  // Canvas animation controller
  useEffect(() => {
    if (!showScanner) return;

    if (scanState.step === 'fingerprint') {
      drawFingerprintScanner();
    } else if (scanState.step === 'retinal') {
      drawRetinalScanner();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scanState.step, showScanner]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="max-w-lg mx-4 bg-graphite/95 border border-copper/30 backdrop-blur-md rounded-lg overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-copper/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-mono text-pearl">Security Clearance</h2>
                <button
                  onClick={onClose}
                  className="text-copper/60 hover:text-copper transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-sm font-mono text-pearl/50 mt-1">
                Biometric Authentication Required
              </div>
            </div>

            {/* Scanner Display */}
            <div className="p-6 space-y-6">
              {!scanState.authenticated ? (
                <>
                  {/* Scanner Canvas */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <canvas
                        ref={canvasRef}
                        width={200}
                        height={150}
                        className="border border-copper/20 bg-depth-steel/50 rounded"
                      />

                      {/* Scanner overlay */}
                      <div className="absolute inset-0 border-2 border-living-cyan/30 rounded animate-pulse" />

                      {/* Status indicator */}
                      <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-living-cyan rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* Progress indicators */}
                  <div className="space-y-3">
                    {['fingerprint', 'retinal', 'voice'].map((step, index) => (
                      <div key={step} className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          scanState.step === step ? 'bg-living-cyan animate-pulse' :
                          index < ['fingerprint', 'retinal', 'voice'].indexOf(scanState.step) ? 'bg-copper' :
                          'bg-pearl/20'
                        }`} />
                        <div className="flex-1">
                          <div className={`text-sm font-mono capitalize ${
                            scanState.step === step ? 'text-living-cyan' :
                            index < ['fingerprint', 'retinal', 'voice'].indexOf(scanState.step) ? 'text-copper' :
                            'text-pearl/50'
                          }`}>
                            {step.replace('_', ' ')} Authentication
                          </div>
                          {scanState.step === step && (
                            <div className="mt-1 bg-graphite/50 rounded-full h-1">
                              <div
                                className="bg-living-cyan h-full rounded-full transition-all duration-300"
                                style={{ width: `${scanState.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                        {index < ['fingerprint', 'retinal', 'voice'].indexOf(scanState.step) && (
                          <svg className="w-4 h-4 text-copper" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Status message */}
                  <div className="bg-depth-steel/30 p-4 rounded border border-copper/20">
                    <div className="text-sm font-mono text-living-cyan">
                      {typewriterText}
                      <span className="animate-pulse">_</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Clearance Level Display */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-2">
                    <div className="text-2xl font-mono text-living-cyan">
                      ACCESS GRANTED
                    </div>
                    <div className="w-16 h-0.5 bg-living-cyan mx-auto" />
                  </div>

                  <div className="bg-depth-steel/50 p-6 rounded border border-living-cyan/30">
                    <div className={`text-lg font-mono text-${clearanceLevels[scanState.clearanceLevel - 1]?.color} mb-2`}>
                      CLEARANCE LEVEL {scanState.clearanceLevel}
                    </div>
                    <div className={`text-sm font-mono text-${clearanceLevels[scanState.clearanceLevel - 1]?.color} mb-3`}>
                      {clearanceLevels[scanState.clearanceLevel - 1]?.title}
                    </div>
                    <div className="text-xs text-pearl/70">
                      {clearanceLevels[scanState.clearanceLevel - 1]?.description}
                    </div>
                  </div>

                  <button
                    onClick={onComplete}
                    className="
                      w-full px-6 py-3
                      bg-living-cyan/10 border border-living-cyan/30
                      text-living-cyan hover:bg-living-cyan/20
                      font-mono transition-all duration-300
                      rounded
                    "
                  >
                    Enter Laboratory
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
