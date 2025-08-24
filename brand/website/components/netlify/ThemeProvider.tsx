'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

export type Theme = 'light' | 'dark' | 'auto';
export type ColorScheme = 'light' | 'dark';

export interface ThemeConfig {
  enableAnimations: boolean;
  enableAmbientMotion: boolean;
  enableParallax: boolean;
  motionIntensity: 'subtle' | 'normal' | 'enhanced';
  colorTemperature: 'cool' | 'neutral' | 'warm';
  reducedMotion: boolean;
}

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  config: ThemeConfig;
  setTheme: (theme: Theme) => void;
  updateConfig: (updates: Partial<ThemeConfig>) => void;
  toggleTheme: () => void;
  isSystemDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultConfig?: Partial<ThemeConfig>;
}

const defaultThemeConfig: ThemeConfig = {
  enableAnimations: true,
  enableAmbientMotion: true,
  enableParallax: true,
  motionIntensity: 'normal',
  colorTemperature: 'neutral',
  reducedMotion: false
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'auto',
  defaultConfig = {}
}) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [config, setConfigState] = useState<ThemeConfig>({
    ...defaultThemeConfig,
    ...defaultConfig
  });
  const [isSystemDark, setIsSystemDark] = useState(false);

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsSystemDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setConfigState(prev => ({ ...prev, reducedMotion: mediaQuery.matches }));

    const handleChange = (e: MediaQueryListEvent) => {
      setConfigState(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('netlify-extension-theme');
      if (stored && ['light', 'dark', 'auto'].includes(stored)) {
        setThemeState(stored as Theme);
      }

      const storedConfig = localStorage.getItem('netlify-extension-theme-config');
      if (storedConfig) {
        try {
          const parsed = JSON.parse(storedConfig);
          setConfigState(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.warn('Failed to parse stored theme config:', error);
        }
      }
    }
  }, []);

  // Calculate effective color scheme
  const colorScheme: ColorScheme = useMemo(() => {
    return theme === 'auto' ? (isSystemDark ? 'dark' : 'light') : theme as ColorScheme;
  }, [theme, isSystemDark]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Add current theme class
    root.classList.add(colorScheme);

    // Apply theme-specific CSS variables
    if (colorScheme === 'dark') {
      // Dark theme overrides
      root.style.setProperty('--depth-void', '8 10 15');         // Deeper void
      root.style.setProperty('--depth-ocean', '15 18 25');       // Deeper ocean
      root.style.setProperty('--depth-steel', '20 20 20');       // Darker steel
      root.style.setProperty('--depth-graphite', '45 52 66');    // Muted graphite

      root.style.setProperty('--light-primary', '248 250 252');  // Brighter primary
      root.style.setProperty('--light-secondary', '203 213 225'); // Brighter secondary
      root.style.setProperty('--light-tertiary', '148 163 184');  // Brighter tertiary

      // Enhanced operational colors for dark mode
      root.style.setProperty('--operation-active', '79 227 214');     // Brighter cyan
      root.style.setProperty('--operation-processing', '139 192 236'); // Brighter blue
      root.style.setProperty('--operation-complete', '162 235 81');   // Brighter green
      root.style.setProperty('--operation-alert', '251 191 36');      // Softer amber
    } else {
      // Light theme (reset to defaults or apply light-specific overrides)
      root.style.setProperty('--depth-void', '250 250 250');     // Light background
      root.style.setProperty('--depth-ocean', '248 248 248');    // Lighter ocean
      root.style.setProperty('--depth-steel', '240 240 240');    // Light steel
      root.style.setProperty('--depth-graphite', '100 116 139'); // Darker text for contrast

      root.style.setProperty('--light-primary', '15 23 42');     // Dark text
      root.style.setProperty('--light-secondary', '51 65 85');   // Darker secondary
      root.style.setProperty('--light-tertiary', '100 116 139'); // Medium tertiary

      // Adjusted operational colors for light mode
      root.style.setProperty('--operation-active', '14 165 233');    // Blue
      root.style.setProperty('--operation-processing', '99 102 241'); // Indigo
      root.style.setProperty('--operation-complete', '34 197 94');   // Green
      root.style.setProperty('--operation-alert', '245 158 11');     // Amber
    }

    // Apply motion configuration
    const motionIntensityMap = {
      subtle: 0.5,
      normal: 1,
      enhanced: 1.5
    };

    const intensity = config.reducedMotion ? 0.1 : motionIntensityMap[config.motionIntensity];
    root.style.setProperty('--motion-intensity', intensity.toString());

    // Apply color temperature
    const temperatureMap = {
      cool: 'hue-rotate(10deg) saturate(1.1)',
      neutral: 'none',
      warm: 'hue-rotate(-10deg) saturate(1.1) brightness(1.02)'
    };
    root.style.setProperty('--color-filter', temperatureMap[config.colorTemperature]);

    // Animation preferences
    root.style.setProperty(
      '--enable-animations',
      (config.enableAnimations && !config.reducedMotion) ? '1' : '0'
    );
  }, [colorScheme, config]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('netlify-extension-theme', newTheme);
    }
  }, []);

  const updateConfig = useCallback((updates: Partial<ThemeConfig>) => {
    setConfigState(prev => {
      const newConfig = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem('netlify-extension-theme-config', JSON.stringify(newConfig));
      }
      return newConfig;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(colorScheme === 'dark' ? 'light' : 'dark');
  }, [colorScheme, setTheme]);

  const contextValue: ThemeContextType = {
    theme,
    colorScheme,
    config,
    setTheme,
    updateConfig,
    toggleTheme,
    isSystemDark
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <div className="theme-wrapper">
        {children}
        {config.enableAmbientMotion && !config.reducedMotion && (
          <AmbientMotionEffects intensity={config.motionIntensity} />
        )}
      </div>
    </ThemeContext.Provider>
  );
};

// Ambient motion effects component
interface AmbientMotionEffectsProps {
  intensity: ThemeConfig['motionIntensity'];
}

const AmbientMotionEffects: React.FC<AmbientMotionEffectsProps> = ({ intensity }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const intensityMap = { subtle: 0.5, normal: 1, enhanced: 1.5 };
  const multiplier = intensityMap[intensity];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Floating particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-operation-active/20 rounded-full animate-float"
            style={{
              left: `${20 + (i * 15)}%`,
              top: `${30 + (i * 10)}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + (i * 0.5)}s`,
              transform: `translate(${mousePosition.x * 10 * multiplier}px, ${mousePosition.y * 5 * multiplier}px)`
            }}
          />
        ))}
      </div>

      {/* Gradient orbs */}
      <div className="absolute inset-0">
        <div
          className="absolute w-64 h-64 bg-gradient-to-r from-operation-active/5 to-interface-focus/5 rounded-full blur-3xl animate-pulse"
          style={{
            top: '20%',
            right: '20%',
            transform: `translate(${mousePosition.x * -20 * multiplier}px, ${mousePosition.y * -10 * multiplier}px)`,
            animationDuration: '8s'
          }}
        />
        <div
          className="absolute w-48 h-48 bg-gradient-to-r from-operation-processing/5 to-operation-complete/5 rounded-full blur-3xl animate-pulse"
          style={{
            bottom: '30%',
            left: '15%',
            transform: `translate(${mousePosition.x * 15 * multiplier}px, ${mousePosition.y * -15 * multiplier}px)`,
            animationDuration: '6s'
          }}
        />
      </div>

      {/* Mesh gradient background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(circle at ${20 + mousePosition.x * 10}% ${30 + mousePosition.y * 10}%, rgb(var(--operation-active)) 0%, transparent 50%),
            radial-gradient(circle at ${70 + mousePosition.x * -5}% ${60 + mousePosition.y * -8}%, rgb(var(--operation-processing)) 0%, transparent 50%),
            radial-gradient(circle at ${50 + mousePosition.x * 8}% ${20 + mousePosition.y * 12}%, rgb(var(--interface-focus)) 0%, transparent 50%)
          `,
          filter: 'blur(80px)',
          opacity: 0.03 * multiplier
        }}
      />
    </div>
  );
};

// Theme control component
export const ThemeControls: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, colorScheme, config, setTheme, updateConfig, toggleTheme } = useTheme();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Theme Selection */}
      <div>
        <label className="block text-sm font-medium text-light-secondary mb-2">
          Theme
        </label>
        <div className="flex gap-2">
          {(['light', 'dark', 'auto'] as const).map((themeOption) => (
            <button
              key={themeOption}
              onClick={() => setTheme(themeOption)}
              className={`px-3 py-2 text-sm rounded border transition-all ${
                theme === themeOption
                  ? 'bg-operation-active text-depth-void border-operation-active'
                  : 'bg-depth-ocean/20 text-light-secondary border-interface-border/30 hover:border-operation-active/50'
              }`}
            >
              {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-light-secondary">Current: {colorScheme} mode</span>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-interface-border/30 hover:border-operation-active/50 transition-colors"
          aria-label="Toggle theme"
        >
          {colorScheme === 'dark' ? '🌞' : '🌙'}
        </button>
      </div>

      {/* Motion Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-light-secondary">Motion & Effects</h4>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enableAnimations}
            onChange={(e) => updateConfig({ enableAnimations: e.target.checked })}
            className="w-4 h-4 text-operation-active bg-depth-ocean/20 border-interface-border/30 rounded focus:ring-operation-active focus:ring-2"
          />
          <span className="text-sm text-light-secondary">Enable animations</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enableAmbientMotion}
            onChange={(e) => updateConfig({ enableAmbientMotion: e.target.checked })}
            className="w-4 h-4 text-operation-active bg-depth-ocean/20 border-interface-border/30 rounded focus:ring-operation-active focus:ring-2"
          />
          <span className="text-sm text-light-secondary">Ambient motion effects</span>
        </label>

        <div>
          <label className="block text-sm text-light-secondary mb-1">Motion intensity</label>
          <select
            value={config.motionIntensity}
            onChange={(e) => updateConfig({ motionIntensity: e.target.value as ThemeConfig['motionIntensity'] })}
            className="w-full p-2 text-sm bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none"
            disabled={config.reducedMotion}
          >
            <option value="subtle">Subtle</option>
            <option value="normal">Normal</option>
            <option value="enhanced">Enhanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-light-secondary mb-1">Color temperature</label>
          <select
            value={config.colorTemperature}
            onChange={(e) => updateConfig({ colorTemperature: e.target.value as ThemeConfig['colorTemperature'] })}
            className="w-full p-2 text-sm bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none"
          >
            <option value="cool">Cool</option>
            <option value="neutral">Neutral</option>
            <option value="warm">Warm</option>
          </select>
        </div>

        {config.reducedMotion && (
          <p className="text-xs text-operation-alert">
            Reduced motion is enabled by your system preferences
          </p>
        )}
      </div>
    </div>
  );
};
