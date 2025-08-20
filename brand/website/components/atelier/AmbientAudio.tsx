'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioContextState {
  context: AudioContext | null;
  gainNode: GainNode | null;
  isInitialized: boolean;
}

export function AmbientAudio() {
  const [audioState, setAudioState] = useState<AudioContextState>({
    context: null,
    gainNode: null,
    isInitialized: false,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);

  const initializeAudio = async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime); // Very quiet
      gainNode.connect(audioContext.destination);

      setAudioState({
        context: audioContext,
        gainNode,
        isInitialized: true,
      });
    } catch (error) {
      console.warn('Web Audio API not supported', error);
    }
  };

  const createWhiteNoise = (context: AudioContext, duration: number) => {
    const bufferSize = context.sampleRate * duration;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    return buffer;
  };

  const startAmbientSound = () => {
    if (!audioState.context || !audioState.gainNode) return;

    const { context, gainNode } = audioState;

    // Low frequency oscillator for deep ambience
    const oscillator = context.createOscillator();
    const oscillatorGain = context.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(55, context.currentTime); // Low A
    oscillator.frequency.exponentialRampToValueAtTime(45, context.currentTime + 8);
    
    oscillatorGain.gain.setValueAtTime(0.02, context.currentTime);
    
    oscillator.connect(oscillatorGain);
    oscillatorGain.connect(gainNode);
    
    oscillator.start();
    oscillatorRef.current = oscillator;

    // Filtered white noise for workshop ambience
    const noiseBuffer = createWhiteNoise(context, 1);
    const noiseSource = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(200, context.currentTime);
    
    noiseGain.gain.setValueAtTime(0.01, context.currentTime);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(gainNode);
    
    noiseSource.start();
    noiseRef.current = noiseSource;

    setIsPlaying(true);
  };

  const stopAmbientSound = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }
    
    if (noiseRef.current) {
      noiseRef.current.stop();
      noiseRef.current = null;
    }

    setIsPlaying(false);
  };

  const handleUserInteraction = () => {
    if (!audioState.isInitialized) {
      initializeAudio();
    } else if (!isPlaying) {
      startAmbientSound();
    }
  };

  useEffect(() => {
    // Add event listeners for user interaction
    const events = ['click', 'touchstart', 'keydown'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
      
      stopAmbientSound();
      
      if (audioState.context) {
        audioState.context.close();
      }
    };
  }, [audioState.isInitialized, isPlaying]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {audioState.isInitialized && (
        <button
          onClick={isPlaying ? stopAmbientSound : startAmbientSound}
          className="
            w-12 h-12 rounded-full 
            bg-graphite/80 border border-copper/30 
            text-copper hover:text-pearl
            backdrop-blur-sm
            transition-all duration-300
            group
          "
          title={isPlaying ? 'Mute ambient sound' : 'Enable ambient sound'}
        >
          <div className="text-xs font-mono">
            {isPlaying ? '♫' : '♪'}
          </div>
          <div className={`
            absolute inset-0 rounded-full border border-copper/20 
            ${isPlaying ? 'animate-pulse' : ''}
          `} />
        </button>
      )}
    </div>
  );
}