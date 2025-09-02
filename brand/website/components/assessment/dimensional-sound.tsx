'use client';

import { useEffect, useRef, useState } from 'react';
import type { AssessmentScore } from '@/types/assessment';

interface SoundScapeProps {
  score: AssessmentScore;
  enabled?: boolean;
}

export function OperationalSoundscape({ score, enabled = false }: SoundScapeProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Create ambient soundscape based on maturity score
  const createSoundscape = () => {
    if (!enabled || typeof window === 'undefined') return;

    // Create audio context on user interaction (browser requirement)
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    
    // Stop existing sounds
    stopSoundscape();

    // Calculate base frequency from overall score (higher score = higher frequency)
    const baseFreq = 100 + (score.percentage / 100) * 300; // 100Hz to 400Hz range

    // Create harmonic layers based on dimension scores
    score.dimensions.forEach((dimension, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const lfo = ctx.createOscillator(); // Low frequency oscillator for pulsing
      const lfoGain = ctx.createGain();

      // Set frequency based on dimension and harmonic series
      const harmonic = index + 1;
      const freq = baseFreq * (1 + index * 0.2); // Spread frequencies
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
      
      // Choose waveform based on dimension level
      const waveforms: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square'];
      oscillator.type = waveforms[Math.min(dimension.level, 3)];

      // Set volume based on dimension score
      const volume = (dimension.rawScore / 4) * 0.15; // Max 0.15 per oscillator
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);

      // Create pulsing effect with LFO
      lfo.frequency.setValueAtTime(0.5 + index * 0.1, ctx.currentTime); // Different pulse rates
      lfo.type = 'sine';
      lfoGain.gain.setValueAtTime(volume * 0.3, ctx.currentTime); // Modulation depth

      // Connect LFO for amplitude modulation
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);

      // Connect main audio path
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Start oscillators
      oscillator.start();
      lfo.start();

      // Store references
      oscillatorsRef.current.push(oscillator, lfo);
      gainNodesRef.current.push(gainNode, lfoGain);
    });

    // Add ambient noise layer for texture
    createNoiseLayer(ctx, score.readiness / 100);

    setIsPlaying(true);
  };

  // Create filtered noise for ambient texture
  const createNoiseLayer = (ctx: AudioContext, intensity: number) => {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate pink noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.05; // Very quiet noise
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter the noise
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200 + intensity * 800, ctx.currentTime); // 200Hz to 1000Hz

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(intensity * 0.05, ctx.currentTime);

    // Connect nodes
    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteNoise.start();
    
    // Store for cleanup (treat as oscillator for simplicity)
    oscillatorsRef.current.push(whiteNoise as any);
    gainNodesRef.current.push(gainNode);
  };

  // Stop all sounds
  const stopSoundscape = () => {
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    
    gainNodesRef.current.forEach(gain => {
      try {
        gain.disconnect();
      } catch (e) {
        // Might already be disconnected
      }
    });

    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    setIsPlaying(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSoundscape();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-8 left-8 z-50">
      <button
        onClick={() => isPlaying ? stopSoundscape() : createSoundscape()}
        className="group relative px-4 py-2 bg-[#1B263B]/80 backdrop-blur-sm border border-[#415A77] 
                   hover:border-[#3FD3C6] transition-all duration-300 rounded"
        aria-label={isPlaying ? 'Mute soundscape' : 'Play soundscape'}
      >
        <div className="flex items-center gap-2">
          {/* Sound icon */}
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            className="text-[#3FD3C6]"
          >
            {isPlaying ? (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </>
            ) : (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </>
            )}
          </svg>
          
          <span className="text-xs text-[#E0E1DD]">
            {isPlaying ? 'Soundscape Active' : 'Enable Soundscape'}
          </span>

          {/* Pulsing indicator when playing */}
          {isPlaying && (
            <div className="absolute -top-1 -right-1 w-2 h-2">
              <div className="absolute inset-0 bg-[#3FD3C6] rounded-full animate-ping" />
              <div className="relative w-2 h-2 bg-[#3FD3C6] rounded-full" />
            </div>
          )}
        </div>
      </button>

      {/* Sound visualization bars */}
      {isPlaying && (
        <div className="absolute bottom-full left-0 mb-2 flex items-end gap-1 h-8">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-[#3FD3C6] opacity-60 animate-pulse"
              style={{
                height: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Trigger sound effects for interactions
export function useInteractionSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTone = (frequency: number, duration: number = 100) => {
    if (typeof window === 'undefined') return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  };

  return {
    playHover: () => playTone(800, 50),
    playSelect: () => playTone(1200, 100),
    playSuccess: () => {
      playTone(800, 100);
      setTimeout(() => playTone(1000, 100), 100);
      setTimeout(() => playTone(1200, 150), 200);
    }
  };
}