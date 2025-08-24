'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  forcedColors: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  colorBlindness: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

// Comprehensive accessibility hook
export function useAccessibility() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reducedMotion: false,
    highContrast: false,
    forcedColors: false,
    screenReader: false,
    keyboardNavigation: false,
    fontSize: 'medium',
    colorBlindness: 'none'
  });

  const previousFocusRef = useRef<HTMLElement | null>(null);
  const announcementRef = useRef<HTMLDivElement | null>(null);

  // Detect accessibility preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      forcedColors: window.matchMedia('(forced-colors: active)')
    };

    const updatePreferences = () => {
      setPreferences(prev => ({
        ...prev,
        reducedMotion: mediaQueries.reducedMotion.matches,
        highContrast: mediaQueries.highContrast.matches,
        forcedColors: mediaQueries.forcedColors.matches
      }));
    };

    updatePreferences();

    Object.values(mediaQueries).forEach(mq => {
      mq.addEventListener('change', updatePreferences);
    });

    // Detect keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setPreferences(prev => ({ ...prev, keyboardNavigation: true }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      Object.values(mediaQueries).forEach(mq => {
        mq.removeEventListener('change', updatePreferences);
      });
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Create screen reader announcement area
  useEffect(() => {
    if (!announcementRef.current && typeof window !== 'undefined') {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
      announcementRef.current = announcer;
    }

    return () => {
      if (announcementRef.current && document.body.contains(announcementRef.current)) {
        document.body.removeChild(announcementRef.current);
      }
    };
  }, []);

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) return;

    announcementRef.current.setAttribute('aria-live', priority);
    announcementRef.current.textContent = message;

    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  return {
    preferences,
    announceToScreenReader
  };
}

// Enhanced focus management hook
export function useFocusManagement() {
  const focusRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const setFocus = () => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  };

  const storeFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
      previousFocusRef.current.focus();
    }
  };

  const trapFocus = (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), summary, details[open]'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }

      if (e.key === 'Escape') {
        restoreFocus();
      }
    };

    // Store current focus and focus first element
    storeFocus();
    firstElement?.focus();

    element.addEventListener('keydown', handleTabKey);
    return () => {
      element.removeEventListener('keydown', handleTabKey);
      restoreFocus();
    };
  };

  return { focusRef, setFocus, storeFocus, restoreFocus, trapFocus };
}

// Hook for screen reader announcements
export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState<string>('');

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(''); // Clear first to ensure re-announcement
    setTimeout(() => setAnnouncement(message), 100);
  };

  return { announcement, announce };
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
  items: any[],
  onSelect?: (index: number) => void,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical';
  } = {}
) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const { loop = true, orientation = 'vertical' } = options;

  const handleKeyDown = (e: KeyboardEvent) => {
    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    switch (e.key) {
      case nextKey:
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev + 1;
          return next >= items.length ? (loop ? 0 : prev) : next;
        });
        break;
      case prevKey:
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev - 1;
          return next < 0 ? (loop ? items.length - 1 : prev) : next;
        });
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && onSelect) {
          onSelect(focusedIndex);
        }
        break;
    }
  };

  return { focusedIndex, setFocusedIndex, handleKeyDown };
}

// Hook for reduced motion preference
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Hook for high contrast preference
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

// Color contrast utility hook
export function useColorContrast() {
  const calculateLuminance = useCallback((r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      const srgb = c / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }, []);

  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }, []);

  const calculateContrast = useCallback((foreground: string, background: string): number => {
    const fgRgb = hexToRgb(foreground);
    const bgRgb = hexToRgb(background);

    if (!fgRgb || !bgRgb) return 1;

    const fgLum = calculateLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
    const bgLum = calculateLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);

    return (lighter + 0.05) / (darker + 0.05);
  }, [calculateLuminance, hexToRgb]);

  const checkWCAGCompliance = useCallback((
    foreground: string,
    background: string,
    level: 'AA' | 'AAA' = 'AA',
    size: 'normal' | 'large' = 'normal'
  ) => {
    const contrast = calculateContrast(foreground, background);
    const minContrast = level === 'AA'
      ? (size === 'large' ? 3 : 4.5)
      : (size === 'large' ? 4.5 : 7);

    return {
      contrast: Number(contrast.toFixed(2)),
      passes: contrast >= minContrast,
      level,
      size,
      minRequired: minContrast
    };
  }, [calculateContrast]);

  return {
    calculateContrast,
    checkWCAGCompliance
  };
}

// Skip navigation hook
export function useSkipNavigation() {
  const [skipLinks, setSkipLinks] = useState<Array<{id: string, label: string, target: string}>>([]);

  const registerSkipLink = useCallback((id: string, label: string, target: string) => {
    setSkipLinks(prev => {
      const exists = prev.find(link => link.id === id);
      if (exists) return prev;
      return [...prev, { id, label, target }];
    });
  }, []);

  const unregisterSkipLink = useCallback((id: string) => {
    setSkipLinks(prev => prev.filter(link => link.id !== id));
  }, []);

  const skipTo = useCallback((targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return {
    skipLinks,
    registerSkipLink,
    unregisterSkipLink,
    skipTo
  };
}

// ARIA live region hook for dynamic content updates
export function useAriaLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!liveRegionRef.current && typeof window !== 'undefined') {
      const region = document.createElement('div');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'false');
      region.className = 'sr-only';
      region.id = 'aria-live-region';
      document.body.appendChild(region);
      liveRegionRef.current = region;
    }

    return () => {
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return;

    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;

    // Clear after announcement to allow repeat announcements
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 100);
  }, []);

  return { announce };
}

// Enhanced keyboard navigation with roving tabindex
export function useRovingTabindex<T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    activateOnFocus?: boolean;
  } = {}
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { orientation = 'vertical', wrap = true, activateOnFocus = false } = options;

  const moveNext = useCallback(() => {
    setActiveIndex(current => {
      const next = current + 1;
      return next >= items.length ? (wrap ? 0 : current) : next;
    });
  }, [items.length, wrap]);

  const movePrevious = useCallback(() => {
    setActiveIndex(current => {
      const previous = current - 1;
      return previous < 0 ? (wrap ? items.length - 1 : current) : previous;
    });
  }, [items.length, wrap]);

  const moveToIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setActiveIndex(index);
    }
  }, [items.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';
    const isVertical = orientation === 'vertical' || orientation === 'both';

    switch (e.key) {
      case 'ArrowRight':
        if (isHorizontal) {
          e.preventDefault();
          moveNext();
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          e.preventDefault();
          movePrevious();
        }
        break;
      case 'ArrowDown':
        if (isVertical) {
          e.preventDefault();
          moveNext();
        }
        break;
      case 'ArrowUp':
        if (isVertical) {
          e.preventDefault();
          movePrevious();
        }
        break;
      case 'Home':
        e.preventDefault();
        moveToIndex(0);
        break;
      case 'End':
        e.preventDefault();
        moveToIndex(items.length - 1);
        break;
    }
  }, [orientation, moveNext, movePrevious, moveToIndex, items.length]);

  // Update tabindex values
  useEffect(() => {
    items.forEach((item, index) => {
      if (item) {
        item.tabIndex = index === activeIndex ? 0 : -1;
        if (index === activeIndex) {
          if (activateOnFocus) {
            item.focus();
          }
        }
      }
    });
  }, [items, activeIndex, activateOnFocus]);

  return {
    activeIndex,
    setActiveIndex: moveToIndex,
    handleKeyDown
  };
}
