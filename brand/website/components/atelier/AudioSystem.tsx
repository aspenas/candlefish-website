'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioContextState {
  context: AudioContext | null;
  masterGain: GainNode | null;
  ambientGain: GainNode | null;
  effectsGain: GainNode | null;
  isInitialized: boolean;
}

interface SoundEffect {
  id: string;
  name: string;
  type: 'click' | 'hover' | 'entry' | 'ambient';
  frequency?: number;
  duration?: number;
  volume?: number;
}

export function AudioSystem() {
  const [audioState, setAudioState] = useState<AudioContextState>({
    context: null,
    masterGain: null,
    ambientGain: null,
    effectsGain: null,
    isInitialized: false,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showControls, setShowControls] = useState(false);

  // Audio source references
  const ambientOscillatorRef = useRef<OscillatorNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const pulseOscillatorRef = useRef<OscillatorNode | null>(null);

  const soundEffects: SoundEffect[] = [
    { id: 'click', name: 'Terminal Click', type: 'click', frequency: 800, duration: 0.1, volume: 0.15 },
    { id: 'hover', name: 'Interface Hover', type: 'hover', frequency: 600, duration: 0.05, volume: 0.08 },
    { id: 'entry', name: 'System Entry', type: 'entry', frequency: 400, duration: 0.3, volume: 0.2 },
    { id: 'success', name: 'Operation Success', type: 'entry', frequency: 1000, duration: 0.15, volume: 0.18 },
  ];

  const initializeAudio = useCallback(async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create gain nodes for different audio layers
      const masterGain = audioContext.createGain();
      const ambientGain = audioContext.createGain();
      const effectsGain = audioContext.createGain();

      // Set initial volumes
      masterGain.gain.setValueAtTime(volume, audioContext.currentTime);
      ambientGain.gain.setValueAtTime(0.4, audioContext.currentTime);
      effectsGain.gain.setValueAtTime(0.6, audioContext.currentTime);

      // Connect the audio graph
      ambientGain.connect(masterGain);
      effectsGain.connect(masterGain);
      masterGain.connect(audioContext.destination);

      setAudioState({
        context: audioContext,
        masterGain,
        ambientGain,
        effectsGain,
        isInitialized: true,
      });

      return { audioContext, masterGain, ambientGain, effectsGain };
    } catch (error) {
      console.warn('Web Audio API not supported', error);
      return null;
    }
  }, [volume]);

  const createWhiteNoise = useCallback((context: AudioContext, duration: number) => {
    const bufferSize = context.sampleRate * duration;
    const buffer = context.createBuffer(2, bufferSize, context.sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const output = buffer.getChannelData(channel);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }

    return buffer;
  }, []);

  const createPinkNoise = useCallback((context: AudioContext, duration: number) => {
    const bufferSize = context.sampleRate * duration;
    const buffer = context.createBuffer(2, bufferSize, context.sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const output = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
      }
    }

    return buffer;
  }, []);

  const startAmbientLayers = useCallback(() => {
    const { context, ambientGain } = audioState;
    if (!context || !ambientGain) return;

    // Deep bass oscillator for laboratory ambience
    const bassOsc = context.createOscillator();
    const bassGain = context.createGain();
    const bassLFO = context.createOscillator();
    const bassLFOGain = context.createGain();

    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(32, context.currentTime);

    bassLFO.type = 'sine';
    bassLFO.frequency.setValueAtTime(0.1, context.currentTime);
    bassLFOGain.gain.setValueAtTime(8, context.currentTime);

    bassLFO.connect(bassLFOGain);
    bassLFOGain.connect(bassOsc.frequency);

    bassGain.gain.setValueAtTime(0.08, context.currentTime);
    bassOsc.connect(bassGain);
    bassGain.connect(ambientGain);

    bassOsc.start();
    bassLFO.start();
    ambientOscillatorRef.current = bassOsc;

    // Pink noise for laboratory atmosphere
    const pinkBuffer = createPinkNoise(context, 4);
    const noiseSource = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();

    noiseSource.buffer = pinkBuffer;
    noiseSource.loop = true;

    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(400, context.currentTime);
    noiseFilter.Q.setValueAtTime(0.5, context.currentTime);

    noiseGain.gain.setValueAtTime(0.06, context.currentTime);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ambientGain);

    noiseSource.start();
    noiseSourceRef.current = noiseSource;

    // Subtle pulse for system activity
    const pulseOsc = context.createOscillator();
    const pulseGain = context.createGain();
    const pulseLFO = context.createOscillator();
    const pulseLFOGain = context.createGain();

    pulseOsc.type = 'sine';
    pulseOsc.frequency.setValueAtTime(880, context.currentTime);

    pulseLFO.type = 'sine';
    pulseLFO.frequency.setValueAtTime(0.5, context.currentTime);
    pulseLFOGain.gain.setValueAtTime(0.02, context.currentTime);
    pulseLFOGain.gain.setTargetAtTime(0, context.currentTime, 0.1);

    pulseLFO.connect(pulseLFOGain);
    pulseLFOGain.connect(pulseGain.gain);

    pulseGain.gain.setValueAtTime(0, context.currentTime);

    // Create periodic pulses
    const createPulse = () => {
      const now = context.currentTime;
      pulseGain.gain.cancelScheduledValues(now);
      pulseGain.gain.setValueAtTime(0, now);
      pulseGain.gain.linearRampToValueAtTime(0.005, now + 0.05);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      // Schedule next pulse
      setTimeout(createPulse, 3000 + Math.random() * 4000);
    };

    pulseOsc.connect(pulseGain);
    pulseGain.connect(ambientGain);

    pulseOsc.start();
    pulseLFO.start();
    pulseOscillatorRef.current = pulseOsc;

    // Start pulse sequence
    createPulse();

    setIsPlaying(true);
  }, [audioState, createPinkNoise]);

  const stopAmbientLayers = useCallback(() => {
    [ambientOscillatorRef, noiseSourceRef, pulseOscillatorRef].forEach(ref => {
      if (ref.current) {
        try {
          ref.current.stop();
        } catch (e) {
          // Node might already be stopped
        }
        ref.current = null;
      }
    });

    setIsPlaying(false);
  }, []);

  const playEffect = useCallback((effectId: string) => {
    const { context, effectsGain } = audioState;
    if (!context || !effectsGain) return;

    const effect = soundEffects.find(e => e.id === effectId);
    if (!effect) return;

    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    // Configure oscillator
    osc.type = 'sine';
    osc.frequency.setValueAtTime(effect.frequency || 440, context.currentTime);

    // Configure filter for more realistic sound
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime((effect.frequency || 440) * 2, context.currentTime);
    filter.Q.setValueAtTime(1, context.currentTime);

    // Configure envelope
    const now = context.currentTime;
    const duration = effect.duration || 0.1;
    const volume = effect.volume || 0.1;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Connect audio graph
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(effectsGain);

    // Play and cleanup
    osc.start(now);
    osc.stop(now + duration);
  }, [audioState, soundEffects]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (audioState.masterGain) {
      audioState.masterGain.gain.setValueAtTime(newVolume, audioState.context?.currentTime || 0);
    }
  }, [audioState]);

  const handleUserInteraction = useCallback(async () => {
    if (!audioState.isInitialized) {
      const result = await initializeAudio();
      if (result && !isPlaying) {
        setTimeout(() => startAmbientLayers(), 100);
      }
    } else if (!isPlaying) {
      startAmbientLayers();
    }
  }, [audioState.isInitialized, isPlaying, initializeAudio, startAmbientLayers]);

  // Auto-initialize on user interaction
  useEffect(() => {
    const events = ['click', 'touchstart', 'keydown'];

    const handler = () => {
      if (!audioState.isInitialized) {
        handleUserInteraction();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handler, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handler);
      });

      stopAmbientLayers();

      if (audioState.context && audioState.context.state !== 'closed') {
        audioState.context.close();
      }
    };
  }, [audioState.isInitialized, handleUserInteraction, stopAmbientLayers, audioState.context]);

  // Expose effects globally for other components
  useEffect(() => {
    (window as any).__laboratoryAudio = {
      playEffect,
      isPlaying,
    };
  }, [playEffect, isPlaying]);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Main control button */}
      <motion.div
        className="relative"
        onHoverStart={() => setShowControls(true)}
        onHoverEnd={() => setShowControls(false)}
      >
        <button
          onClick={isPlaying ? stopAmbientLayers : handleUserInteraction}
          onMouseEnter={() => playEffect('hover')}
          onClick={() => playEffect('click')}
          className="
            w-12 h-12 rounded-full
            bg-graphite/90 border border-copper/30
            text-copper hover:text-living-cyan
            backdrop-blur-sm
            transition-all duration-300
            group
            relative overflow-hidden
          "
          title={isPlaying ? 'Disable laboratory audio' : 'Enable laboratory audio'}
        >
          <div className="relative z-10">
            {isPlaying ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center w-full h-full"
              >
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-living-cyan animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-living-cyan/30 animate-ping" />
                </div>
              </motion.div>
            ) : (
              <svg className="w-5 h-5 m-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.788L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.797-3.788a1 1 0 011.617.788zM16 8a2 2 0 11-4 0 2 2 0 014 0zm-2 6a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {/* Animated ring */}
          <div className={`
            absolute inset-0 rounded-full border border-copper/20
            ${isPlaying ? 'animate-pulse' : ''}
          `} />

          {/* Hover effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-living-cyan/10 to-transparent
                        translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </button>

        {/* Extended controls */}
        <AnimatePresence>
          {showControls && audioState.isInitialized && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-full mb-2 left-0 bg-graphite/95 border border-copper/30 backdrop-blur-sm rounded-lg p-3 min-w-[200px]"
            >
              <div className="space-y-3">
                <div className="text-xs font-mono text-pearl/70">Audio System</div>

                {/* Volume control */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-pearl/50">
                    <span>Volume</span>
                    <span>{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-graphite rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Status indicators */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-pearl/50">Status:</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isPlaying ? 'bg-living-cyan animate-pulse' : 'bg-copper/50'
                    }`} />
                    <span className={`font-mono ${isPlaying ? 'text-living-cyan' : 'text-copper/70'}`}>
                      {isPlaying ? 'ACTIVE' : 'STANDBY'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Audio visualization */}
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-16 left-4"
        >
          <div className="flex items-end gap-1 h-6">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-living-cyan/40 rounded-full"
                animate={{
                  height: [4, Math.random() * 16 + 4, 4],
                }}
                transition={{
                  duration: 0.8 + Math.random() * 0.4,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
