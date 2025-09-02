'use client';

import { useEffect, useRef, useState } from 'react';

interface SpatialAudioProps {
  enabled: boolean;
  score: number;
  hoveredDimension: string | null;
  selectedDimension: string | null;
}

export function SpatialAudio({ 
  enabled, 
  score, 
  hoveredDimension,
  selectedDimension 
}: SpatialAudioProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<Map<string, OscillatorNode>>(new Map());
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize audio context on user interaction
  useEffect(() => {
    if (!enabled || isInitialized) return;
    
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        setIsInitialized(true);
        
        // Create ambient drone
        createAmbientDrone();
      }
    };
    
    // Wait for user interaction to start audio (browser requirement)
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, [enabled, isInitialized]);
  
  // Create ambient drone based on score
  const createAmbientDrone = () => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Base frequency mapped to score (lower scores = lower frequency)
    const baseFreq = 60 + (score / 100) * 40; // 60-100 Hz range
    
    // Create oscillators for harmonic richness
    const fundamentalOsc = ctx.createOscillator();
    const fifthOsc = ctx.createOscillator();
    const octaveOsc = ctx.createOscillator();
    
    fundamentalOsc.frequency.value = baseFreq;
    fifthOsc.frequency.value = baseFreq * 1.5; // Perfect fifth
    octaveOsc.frequency.value = baseFreq * 2; // Octave
    
    fundamentalOsc.type = 'sine';
    fifthOsc.type = 'sine';
    octaveOsc.type = 'sine';
    
    // Create gain nodes for volume control
    const fundamentalGain = ctx.createGain();
    const fifthGain = ctx.createGain();
    const octaveGain = ctx.createGain();
    const masterGain = ctx.createGain();
    
    fundamentalGain.gain.value = 0.08;
    fifthGain.gain.value = 0.04;
    octaveGain.gain.value = 0.02;
    masterGain.gain.value = 0.15; // Overall volume
    
    // Add subtle vibrato using LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    
    lfo.frequency.value = 0.2; // Very slow modulation
    lfoGain.gain.value = 2; // Vibrato depth in Hz
    
    lfo.connect(lfoGain);
    lfoGain.connect(fundamentalOsc.frequency);
    lfoGain.connect(fifthOsc.frequency);
    lfoGain.connect(octaveOsc.frequency);
    
    // Connect oscillators through gains to output
    fundamentalOsc.connect(fundamentalGain);
    fifthOsc.connect(fifthGain);
    octaveOsc.connect(octaveGain);
    
    fundamentalGain.connect(masterGain);
    fifthGain.connect(masterGain);
    octaveGain.connect(masterGain);
    
    // Add reverb using convolver
    const convolver = ctx.createConvolver();
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.3;
    
    // Create impulse response for reverb
    const impulseBuffer = ctx.createBuffer(2, ctx.sampleRate * 2, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulseBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / channelData.length, 2);
      }
    }
    convolver.buffer = impulseBuffer;
    
    masterGain.connect(convolver);
    convolver.connect(reverbGain);
    
    // Connect to output
    masterGain.connect(ctx.destination);
    reverbGain.connect(ctx.destination);
    
    // Start oscillators
    fundamentalOsc.start();
    fifthOsc.start();
    octaveOsc.start();
    lfo.start();
    
    // Store references for cleanup
    oscillatorsRef.current.set('fundamental', fundamentalOsc);
    oscillatorsRef.current.set('fifth', fifthOsc);
    oscillatorsRef.current.set('octave', octaveOsc);
    oscillatorsRef.current.set('lfo', lfo);
    
    gainNodesRef.current.set('master', masterGain);
  };
  
  // Play hover sound
  useEffect(() => {
    if (!audioContextRef.current || !hoveredDimension) return;
    
    const ctx = audioContextRef.current;
    
    // Create a short crystalline ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.value = 800 + Math.random() * 400; // 800-1200 Hz
    osc.type = 'sine';
    
    // Quick envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    
  }, [hoveredDimension]);
  
  // Play selection sound
  useEffect(() => {
    if (!audioContextRef.current || !selectedDimension) return;
    
    const ctx = audioContextRef.current;
    
    // Create a harmonic chord
    const frequencies = [261.63, 329.63, 392.00]; // C major chord
    
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.value = freq;
      osc.type = 'sine';
      
      // Staggered attack for arpeggio effect
      const startTime = ctx.currentTime + i * 0.05;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 1);
    });
    
  }, [selectedDimension]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      // Stop all oscillators
      oscillatorsRef.current.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // Oscillator may already be stopped
        }
      });
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  return null; // This component doesn't render anything
}

// Audio toggle button component
export function AudioToggle({ 
  enabled, 
  onToggle 
}: { 
  enabled: boolean; 
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className="fixed bottom-8 right-8 z-50 p-3 bg-slate-800/80 backdrop-blur
               text-cyan-400 rounded-full border border-cyan-500/30
               hover:bg-slate-700/80 transition-all duration-300 group"
      aria-label={enabled ? 'Mute audio' : 'Enable audio'}
    >
      {enabled ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      )}
      
      {/* Tooltip */}
      <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-900 text-xs
                     text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity
                     pointer-events-none whitespace-nowrap">
        {enabled ? 'Mute soundscape' : 'Enable spatial audio'}
      </span>
    </button>
  );
}