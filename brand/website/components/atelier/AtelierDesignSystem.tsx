'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Jony Ive Design Philosophy Constants
export const DESIGN_TOKENS = {
  colors: {
    primary: {
      charcoal: '#1A1A1C',
      nearBlack: '#0A0A0B',
    },
    secondary: {
      pearl: '#F8F8F2',
      pearlMuted: 'rgba(248, 248, 242, 0.7)',
      pearlSubtle: 'rgba(248, 248, 242, 0.4)',
    },
    accent: {
      livingCyan: '#3FD3C6',
      livingCyanMuted: 'rgba(63, 211, 198, 0.3)',
      livingCyanSubtle: 'rgba(63, 211, 198, 0.1)',
    },
    warning: {
      copper: '#DA9520',
      copperMuted: 'rgba(218, 149, 32, 0.3)',
    },
    system: {
      transparent: 'rgba(0, 0, 0, 0)',
      backgroundScrim: 'rgba(10, 10, 11, 0.95)',
      glassBackground: 'rgba(26, 26, 28, 0.6)',
      glassBackgroundHover: 'rgba(26, 26, 28, 0.8)',
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
    xxxl: '4rem',
  },
  blur: {
    subtle: 'blur(4px)',
    reading: 'blur(8px)',
    atmosphere: 'blur(12px)',
    hidden: 'blur(20px)',
  },
  shadow: {
    subtle: '0 2px 8px rgba(0, 0, 0, 0.15)',
    reading: '0 8px 32px rgba(0, 0, 0, 0.3)',
    floating: '0 16px 64px rgba(0, 0, 0, 0.4)',
  },
  animation: {
    // Physics-based easing for precision engineering feel
    springSmooth: { type: 'spring', damping: 25, stiffness: 400 },
    springGentle: { type: 'spring', damping: 30, stiffness: 300 },
    springDelicate: { type: 'spring', damping: 35, stiffness: 200 },
    // Duration guidelines
    micro: 0.15,
    quick: 0.3,
    smooth: 0.6,
    deliberate: 1.0,
  }
} as const;

// Focus Management Types
interface FocusState {
  activeSection: string | null;
  isReading: boolean;
  mousePosition: { x: number; y: number };
}

interface AtelierContextType {
  focusState: FocusState;
  setFocusState: (state: Partial<FocusState>) => void;
  enterReadingMode: (sectionId: string) => void;
  exitReadingMode: () => void;
  updateMousePosition: (x: number, y: number) => void;
}

const AtelierContext = createContext<AtelierContextType | undefined>(undefined);

export function useAtelierDesign() {
  const context = useContext(AtelierContext);
  if (!context) {
    throw new Error('useAtelierDesign must be used within AtelierDesignProvider');
  }
  return context;
}

// Reading Plane Component - Content floats on subtle glass morphism
export function ReadingPlane({
  children,
  sectionId,
  priority = 'secondary',
  className = '',
}: {
  children: ReactNode;
  sectionId: string;
  priority?: 'primary' | 'secondary' | 'tertiary';
  className?: string;
}) {
  const { focusState, enterReadingMode, exitReadingMode } = useAtelierDesign();

  const isActive = focusState.activeSection === sectionId;
  const isOtherSectionActive = focusState.activeSection && focusState.activeSection !== sectionId;

  const priorityConfig = {
    primary: {
      zIndex: 30,
      blur: { inactive: 'blur(0px)', receded: 'blur(2px)' },
      opacity: { inactive: 1, receded: 0.6 },
    },
    secondary: {
      zIndex: 20,
      blur: { inactive: 'blur(0px)', receded: 'blur(4px)' },
      opacity: { inactive: 0.95, receded: 0.4 },
    },
    tertiary: {
      zIndex: 10,
      blur: { inactive: 'blur(0px)', receded: 'blur(8px)' },
      opacity: { inactive: 0.8, receded: 0.2 },
    }
  };

  const config = priorityConfig[priority];

  return (
    <motion.div
      className={`relative backdrop-blur-md border border-white/5 rounded-lg overflow-hidden ${className}`}
      style={{
        zIndex: isActive ? config.zIndex + 10 : config.zIndex,
      }}
      animate={{
        filter: isOtherSectionActive ? config.blur.receded : config.blur.inactive,
        opacity: isOtherSectionActive ? config.opacity.receded : config.opacity.inactive,
        scale: isActive ? 1.02 : 1,
        y: isActive ? -4 : 0,
      }}
      transition={DESIGN_TOKENS.animation.springGentle}
      onHoverStart={() => !isOtherSectionActive && enterReadingMode(sectionId)}
      onHoverEnd={() => exitReadingMode()}
      onFocus={() => enterReadingMode(sectionId)}
      onBlur={() => exitReadingMode()}
    >
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-white/[0.02]" />

      {/* Content with intelligent contrast adjustment */}
      <div className="relative p-6">
        {/* Dynamic background darkening for text contrast */}
        <motion.div
          className="absolute inset-0 bg-black/20 rounded-lg"
          animate={{
            opacity: isActive ? 0.3 : 0,
          }}
          transition={DESIGN_TOKENS.animation.springSmooth}
        />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>

      {/* Subtle border highlight on focus */}
      <motion.div
        className="absolute inset-0 border border-livingCyan/30 rounded-lg pointer-events-none"
        animate={{
          opacity: isActive ? 1 : 0,
        }}
        transition={DESIGN_TOKENS.animation.springSmooth}
      />
    </motion.div>
  );
}

// Ambient Glow - Replaces harsh particle effects with subtle light
export function AmbientGlow({
  intensity = 0.3,
  followMouse = true,
}: {
  intensity?: number;
  followMouse?: boolean;
}) {
  const { focusState } = useAtelierDesign();

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-0"
      animate={{
        opacity: focusState.isReading ? intensity * 0.3 : intensity,
      }}
      transition={DESIGN_TOKENS.animation.springDelicate}
    >
      {/* Breathing radial gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            `radial-gradient(circle at 50% 50%,
              rgba(63, 211, 198, 0.08) 0%,
              rgba(63, 211, 198, 0.03) 25%,
              transparent 50%)`,
            `radial-gradient(circle at 50% 50%,
              rgba(63, 211, 198, 0.12) 0%,
              rgba(63, 211, 198, 0.05) 25%,
              transparent 50%)`,
            `radial-gradient(circle at 50% 50%,
              rgba(63, 211, 198, 0.08) 0%,
              rgba(63, 211, 198, 0.03) 25%,
              transparent 50%)`,
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Mouse-following subtle highlight */}
      {followMouse && (
        <motion.div
          className="absolute w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle,
              rgba(63, 211, 198, 0.06) 0%,
              transparent 70%)`,
            transform: `translate3d(${focusState.mousePosition.x - 192}px, ${focusState.mousePosition.y - 192}px, 0)`,
          }}
          transition={DESIGN_TOKENS.animation.springDelicate}
        />
      )}

      {/* Depth layers with gaussian blur */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `linear-gradient(135deg,
            rgba(26, 26, 28, 0.4) 0%,
            rgba(10, 10, 11, 0.6) 50%,
            rgba(26, 26, 28, 0.4) 100%)`,
          filter: DESIGN_TOKENS.blur.atmosphere,
        }}
      />
    </motion.div>
  );
}

// Moments of Delight - Physics-based micro-interactions
export function MomentButton({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) {
  const sizeConfig = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  };

  const variantConfig = {
    primary: `
      bg-gradient-to-r from-livingCyan/20 to-livingCyan/10
      border border-livingCyan/30 text-livingCyan
      hover:from-livingCyan/30 hover:to-livingCyan/20
      hover:border-livingCyan/50 hover:shadow-lg hover:shadow-livingCyan/20
    `,
    secondary: `
      bg-gradient-to-r from-white/5 to-white/2
      border border-white/10 text-pearl/90
      hover:from-white/10 hover:to-white/5
      hover:border-white/20 hover:text-pearl
    `,
    ghost: `
      bg-transparent border border-transparent text-pearl/60
      hover:bg-white/5 hover:border-white/10 hover:text-pearl/90
    `,
  };

  return (
    <motion.button
      className={`
        relative backdrop-blur-md rounded-lg font-mono
        transition-all duration-300 overflow-hidden
        ${sizeConfig[size]} ${variantConfig[variant]} ${className}
      `}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={DESIGN_TOKENS.animation.springSmooth}
      onClick={onClick}
    >
      {/* Shimmer effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />

      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

// Spatial Typography - Breathing text with generous space
export function SpatialText({
  children,
  level = 'body',
  className = '',
}: {
  children: ReactNode;
  level?: 'hero' | 'title' | 'subtitle' | 'body' | 'caption';
  className?: string;
}) {
  const levelConfig = {
    hero: 'text-5xl md:text-7xl font-light tracking-tight leading-none',
    title: 'text-3xl md:text-4xl font-light tracking-tight leading-tight',
    subtitle: 'text-xl md:text-2xl font-light leading-relaxed',
    body: 'text-base md:text-lg leading-relaxed',
    caption: 'text-sm font-mono uppercase tracking-wider opacity-70',
  };

  return (
    <div className={`text-pearl ${levelConfig[level]} ${className}`}>
      {children}
    </div>
  );
}

// Provider Component
export function AtelierDesignProvider({ children }: { children: ReactNode }) {
  const [focusState, setFocusStateInternal] = React.useState<FocusState>({
    activeSection: null,
    isReading: false,
    mousePosition: { x: 0, y: 0 },
  });

  const setFocusState = React.useCallback((state: Partial<FocusState>) => {
    setFocusStateInternal(prev => ({ ...prev, ...state }));
  }, []);

  const enterReadingMode = React.useCallback((sectionId: string) => {
    setFocusState({ activeSection: sectionId, isReading: true });
  }, [setFocusState]);

  const exitReadingMode = React.useCallback(() => {
    setFocusState({ activeSection: null, isReading: false });
  }, [setFocusState]);

  const updateMousePosition = React.useCallback((x: number, y: number) => {
    setFocusState({ mousePosition: { x, y } });
  }, [setFocusState]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      updateMousePosition(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [updateMousePosition]);

  return (
    <AtelierContext.Provider value={{
      focusState,
      setFocusState,
      enterReadingMode,
      exitReadingMode,
      updateMousePosition,
    }}>
      {children}
    </AtelierContext.Provider>
  );
}
