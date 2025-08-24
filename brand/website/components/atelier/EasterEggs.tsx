'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'legendary';
  condition: string;
}

interface EasterEggState {
  konamiProgress: number[];
  terminalActive: boolean;
  terminalHistory: string[];
  currentInput: string;
  achievements: Achievement[];
  showAchievements: boolean;
  matrix: boolean;
  godMode: boolean;
}

const KONAMI_CODE = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA

export function EasterEggs() {
  const [eggState, setEggState] = useState<EasterEggState>({
    konamiProgress: [],
    terminalActive: false,
    terminalHistory: [],
    currentInput: '',
    achievements: [
      {
        id: 'first_visit',
        title: 'Laboratory Initiate',
        description: 'First time entering the laboratory',
        icon: '🔬',
        unlocked: false,
        rarity: 'common',
        condition: 'Enter the laboratory'
      },
      {
        id: 'konami_code',
        title: 'Classic Gamer',
        description: 'Discovered the Konami code',
        icon: '🎮',
        unlocked: false,
        rarity: 'rare',
        condition: 'Enter the Konami code'
      },
      {
        id: 'terminal_hacker',
        title: 'Terminal Hacker',
        description: 'Accessed the hidden terminal',
        icon: '💻',
        unlocked: false,
        rarity: 'rare',
        condition: 'Use the hidden terminal'
      },
      {
        id: 'particle_master',
        title: 'Particle Master',
        description: 'Interacted with particles for 60 seconds',
        icon: '⚛️',
        unlocked: false,
        rarity: 'common',
        condition: 'Interact with particles extensively'
      },
      {
        id: 'system_monitor',
        title: 'System Monitor',
        description: 'Opened diagnostics 10 times',
        icon: '📊',
        unlocked: false,
        rarity: 'common',
        condition: 'Use system diagnostics frequently'
      },
      {
        id: 'audio_enthusiast',
        title: 'Audio Enthusiast',
        description: 'Listened to ambient audio for 5 minutes',
        icon: '🎵',
        unlocked: false,
        rarity: 'common',
        condition: 'Enjoy the ambient audio'
      },
      {
        id: 'secret_master',
        title: 'Secret Master',
        description: 'Discovered all hidden features',
        icon: '👑',
        unlocked: false,
        rarity: 'legendary',
        condition: 'Unlock all other achievements'
      }
    ],
    showAchievements: false,
    matrix: false,
    godMode: false,
  });

  const terminalRef = useRef<HTMLInputElement>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const matrixAnimationRef = useRef<number>();

  const terminalCommands = {
    help: 'Available commands: help, clear, status, achievements, matrix, godmode, exit, whoami, date, echo [text]',
    clear: 'clear',
    status: 'Laboratory Systems: OPTIMAL\nSecurity Level: MAXIMUM\nParticle Field: ACTIVE\nAudio System: OPERATIONAL',
    achievements: 'show_achievements',
    matrix: 'Matrix mode activated. Welcome to the real world.',
    godmode: 'God mode activated. You have transcended the laboratory.',
    whoami: 'User: Laboratory Researcher\nClearance: Variable\nLocation: Candlefish Atelier',
    date: new Date().toString(),
    exit: 'exit',
  };

  const unlockAchievement = useCallback((achievementId: string) => {
    setEggState(prev => ({
      ...prev,
      achievements: prev.achievements.map(achievement =>
        achievement.id === achievementId
          ? { ...achievement, unlocked: true }
          : achievement
      )
    }));

    // Play achievement sound
    if ((window as any).__laboratoryAudio?.playEffect) {
      (window as any).__laboratoryAudio.playEffect('success');
    }

    // Show achievement notification
    showAchievementNotification(achievementId);
  }, []);

  const showAchievementNotification = (achievementId: string) => {
    const achievement = eggState.achievements.find(a => a.id === achievementId);
    if (!achievement) return;

    // Create notification element
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div class="fixed top-4 right-4 z-50 bg-living-cyan/90 text-depth-steel px-4 py-2 rounded font-mono text-sm animate-bounce">
        ${achievement.icon} Achievement Unlocked: ${achievement.title}
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  const handleKonamiCode = useCallback((keyCode: number) => {
    setEggState(prev => {
      const newProgress = [...prev.konamiProgress, keyCode];

      // Check if we match the beginning of the Konami code
      const isOnTrack = KONAMI_CODE.slice(0, newProgress.length).every(
        (code, index) => code === newProgress[index]
      );

      if (!isOnTrack) {
        // Reset if wrong key
        return { ...prev, konamiProgress: [] };
      }

      if (newProgress.length === KONAMI_CODE.length) {
        // Complete Konami code entered!
        unlockAchievement('konami_code');
        return {
          ...prev,
          konamiProgress: [],
          terminalActive: true,
          godMode: true
        };
      }

      return { ...prev, konamiProgress: newProgress };
    });
  }, [unlockAchievement]);

  const executeTerminalCommand = useCallback((command: string) => {
    const cmd = command.toLowerCase().trim();
    const args = cmd.split(' ');
    const baseCmd = args[0];

    let output = '';

    if (baseCmd === 'echo' && args.length > 1) {
      output = args.slice(1).join(' ');
    } else if (baseCmd === 'clear') {
      setEggState(prev => ({ ...prev, terminalHistory: [], currentInput: '' }));
      return;
    } else if (baseCmd === 'achievements') {
      setEggState(prev => ({ ...prev, showAchievements: true }));
      output = 'Opening achievements panel...';
    } else if (baseCmd === 'matrix') {
      setEggState(prev => ({ ...prev, matrix: !prev.matrix }));
      output = terminalCommands.matrix;
    } else if (baseCmd === 'godmode') {
      setEggState(prev => ({ ...prev, godMode: !prev.godMode }));
      output = terminalCommands.godmode;
    } else if (baseCmd === 'exit') {
      setEggState(prev => ({ ...prev, terminalActive: false }));
      return;
    } else if (terminalCommands[baseCmd as keyof typeof terminalCommands]) {
      output = terminalCommands[baseCmd as keyof typeof terminalCommands] as string;
    } else if (baseCmd) {
      output = `Command not found: ${baseCmd}. Type 'help' for available commands.`;
    }

    setEggState(prev => ({
      ...prev,
      terminalHistory: [...prev.terminalHistory, `> ${command}`, output].filter(Boolean),
      currentInput: ''
    }));

    if (!eggState.achievements.find(a => a.id === 'terminal_hacker')?.unlocked) {
      unlockAchievement('terminal_hacker');
    }
  }, [eggState.achievements, unlockAchievement]);

  const drawMatrix = useCallback(() => {
    const canvas = matrixCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = Array(Math.floor(columns)).fill(1);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f0';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char = characters.charAt(Math.floor(Math.random() * characters.length));
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    matrixAnimationRef.current = requestAnimationFrame(drawMatrix);
  }, []);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Konami code
      handleKonamiCode(e.keyCode);

      // Terminal shortcuts
      if (e.key === '`' && e.ctrlKey) {
        e.preventDefault();
        setEggState(prev => ({ ...prev, terminalActive: !prev.terminalActive }));
      }

      // Achievements panel
      if (e.key === 'F12' && !eggState.terminalActive) {
        e.preventDefault();
        setEggState(prev => ({ ...prev, showAchievements: !prev.showAchievements }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKonamiCode, eggState.terminalActive]);

  // Matrix effect
  useEffect(() => {
    if (eggState.matrix) {
      drawMatrix();
    } else if (matrixAnimationRef.current) {
      cancelAnimationFrame(matrixAnimationRef.current);
    }

    return () => {
      if (matrixAnimationRef.current) {
        cancelAnimationFrame(matrixAnimationRef.current);
      }
    };
  }, [eggState.matrix, drawMatrix]);

  // Achievement tracking
  useEffect(() => {
    // First visit achievement
    if (!eggState.achievements.find(a => a.id === 'first_visit')?.unlocked) {
      setTimeout(() => unlockAchievement('first_visit'), 2000);
    }

    // Track diagnostics usage
    let diagnosticsCount = parseInt(localStorage.getItem('diagnosticsCount') || '0');
    if (diagnosticsCount >= 10 && !eggState.achievements.find(a => a.id === 'system_monitor')?.unlocked) {
      unlockAchievement('system_monitor');
    }

    // Track audio listening time
    let audioTime = parseInt(localStorage.getItem('audioTime') || '0');
    if (audioTime >= 300000 && !eggState.achievements.find(a => a.id === 'audio_enthusiast')?.unlocked) {
      unlockAchievement('audio_enthusiast');
    }

    // Check for secret master achievement
    const unlockedCount = eggState.achievements.filter(a => a.unlocked && a.id !== 'secret_master').length;
    if (unlockedCount === eggState.achievements.length - 1 &&
        !eggState.achievements.find(a => a.id === 'secret_master')?.unlocked) {
      unlockAchievement('secret_master');
    }
  }, [eggState.achievements, unlockAchievement]);

  return (
    <>
      {/* Matrix Background */}
      {eggState.matrix && (
        <canvas
          ref={matrixCanvasRef}
          className="fixed inset-0 z-0 pointer-events-none"
          style={{ mixBlendMode: 'multiply' }}
        />
      )}

      {/* God Mode Indicator */}
      {eggState.godMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40"
        >
          <div className="bg-gradient-to-r from-copper via-living-cyan to-pearl px-4 py-2 rounded font-mono text-black font-bold animate-pulse">
            👑 GOD MODE ACTIVATED 👑
          </div>
        </motion.div>
      )}

      {/* Hidden Terminal */}
      <AnimatePresence>
        {eggState.terminalActive && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed bottom-0 inset-x-0 h-80 bg-black/95 border-t border-living-cyan z-50"
          >
            <div className="p-4 h-full flex flex-col font-mono text-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-living-cyan">
                  Laboratory Terminal v2.1.0
                </div>
                <button
                  onClick={() => setEggState(prev => ({ ...prev, terminalActive: false }))}
                  className="text-copper hover:text-pearl transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto text-pearl/80 space-y-1 mb-2">
                <div>Welcome to the Laboratory Terminal. Type 'help' for available commands.</div>
                {eggState.terminalHistory.map((line, i) => (
                  <div key={i} className={line.startsWith('>') ? 'text-living-cyan' : 'text-pearl/60'}>
                    {line}
                  </div>
                ))}
              </div>

              <div className="flex items-center text-living-cyan">
                <span className="mr-2">$</span>
                <input
                  ref={terminalRef}
                  type="text"
                  value={eggState.currentInput}
                  onChange={(e) => setEggState(prev => ({ ...prev, currentInput: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      executeTerminalCommand(eggState.currentInput);
                    }
                  }}
                  className="flex-1 bg-transparent outline-none text-pearl"
                  autoFocus
                />
                <span className="animate-pulse">_</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievements Panel */}
      <AnimatePresence>
        {eggState.showAchievements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="max-w-2xl max-h-[80vh] bg-graphite/95 border border-copper/30 backdrop-blur-md rounded-lg overflow-hidden"
            >
              <div className="p-6 border-b border-copper/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-mono text-pearl">Laboratory Achievements</h2>
                  <button
                    onClick={() => setEggState(prev => ({ ...prev, showAchievements: false }))}
                    className="text-copper/60 hover:text-copper transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-sm font-mono text-pearl/50 mt-1">
                  {eggState.achievements.filter(a => a.unlocked).length} / {eggState.achievements.length} unlocked
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-96 space-y-4">
                {eggState.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded border ${
                      achievement.unlocked
                        ? 'border-living-cyan/30 bg-living-cyan/5'
                        : 'border-pearl/20 bg-graphite/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-2xl ${achievement.unlocked ? '' : 'grayscale opacity-30'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className={`font-mono text-sm ${
                          achievement.unlocked ? 'text-living-cyan' : 'text-pearl/50'
                        }`}>
                          {achievement.title}
                        </div>
                        <div className={`text-xs mt-1 ${
                          achievement.unlocked ? 'text-pearl/70' : 'text-pearl/30'
                        }`}>
                          {achievement.description}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`text-xs px-2 py-1 rounded font-mono ${
                            achievement.rarity === 'legendary' ? 'bg-copper/20 text-copper' :
                            achievement.rarity === 'rare' ? 'bg-living-cyan/20 text-living-cyan' :
                            'bg-pearl/20 text-pearl/70'
                          }`}>
                            {achievement.rarity.toUpperCase()}
                          </div>
                          {achievement.unlocked && (
                            <div className="text-xs text-living-cyan">✓ UNLOCKED</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-copper/20 text-center">
                <div className="text-xs font-mono text-pearl/50">
                  Keep exploring to unlock more achievements!
                </div>
                <div className="text-xs font-mono text-copper/50 mt-1">
                  Press F12 or Ctrl+` to access terminal • Konami code for surprises
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick shortcuts hint */}
      {!eggState.terminalActive && !eggState.showAchievements && (
        <div className="fixed bottom-4 right-20 z-40 text-xs font-mono text-pearl/30 space-y-1 text-right">
          <div>F12: Achievements</div>
          <div>Ctrl+`: Terminal</div>
          <div>↑↑↓↓←→←→BA: ???</div>
        </div>
      )}
    </>
  );
}
