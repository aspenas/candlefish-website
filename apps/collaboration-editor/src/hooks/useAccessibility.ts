import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';

// Hook for managing focus trap
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const firstFocusableElementRef = useRef<HTMLElement>(null);
  const lastFocusableElementRef = useRef<HTMLElement>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const focusableSelector = [
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'a[href]:not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(focusableSelector)) as HTMLElement[];
  }, []);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (!isActive || e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: Moving backwards
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: Moving forwards
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [isActive, getFocusableElements]);

  useEffect(() => {
    if (!isActive) return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      firstFocusableElementRef.current = focusableElements[0];
      lastFocusableElementRef.current = focusableElements[focusableElements.length - 1];
      
      // Focus the first element when trap becomes active
      firstFocusableElementRef.current.focus();
    }

    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [isActive, trapFocus, getFocusableElements]);

  return { containerRef, firstFocusableElementRef, lastFocusableElementRef };
}

// Hook for managing ARIA live regions
export function useAriaLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const [politeMessages, setPoliteMessages] = useState<string[]>([]);
  const [assertiveMessages, setAssertiveMessages] = useState<string[]>([]);

  const announcePolite = useCallback((message: string) => {
    setPoliteMessages(prev => [...prev, message]);
    
    // Clear message after it's been announced
    setTimeout(() => {
      setPoliteMessages(prev => prev.slice(1));
    }, 1000);
  }, []);

  const announceAssertive = useCallback((message: string) => {
    setAssertiveMessages(prev => [...prev, message]);
    
    // Clear message after it's been announced
    setTimeout(() => {
      setAssertiveMessages(prev => prev.slice(1));
    }, 1000);
  }, []);

  const LiveRegion = useCallback(() => (
    <>
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessages.map((message, index) => (
          <div key={`polite-${index}`}>{message}</div>
        ))}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessages.map((message, index) => (
          <div key={`assertive-${index}`}>{message}</div>
        ))}
      </div>
    </>
  ), [politeMessages, assertiveMessages]);

  return { announcePolite, announceAssertive, LiveRegion };
}

// Hook for keyboard navigation
export function useKeyboardNavigation({
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onEnter,
  onEscape,
  onSpace,
  onHome,
  onEnd,
  onPageUp,
  onPageDown,
}: {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onSpace?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
}) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onArrowUp?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        onArrowDown?.();
        break;
      case 'ArrowLeft':
        onArrowLeft?.();
        break;
      case 'ArrowRight':
        onArrowRight?.();
        break;
      case 'Enter':
        onEnter?.();
        break;
      case 'Escape':
        onEscape?.();
        break;
      case ' ':
        if (onSpace) {
          e.preventDefault();
          onSpace();
        }
        break;
      case 'Home':
        if (onHome) {
          e.preventDefault();
          onHome();
        }
        break;
      case 'End':
        if (onEnd) {
          e.preventDefault();
          onEnd();
        }
        break;
      case 'PageUp':
        if (onPageUp) {
          e.preventDefault();
          onPageUp();
        }
        break;
      case 'PageDown':
        if (onPageDown) {
          e.preventDefault();
          onPageDown();
        }
        break;
    }
  }, [onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onEnter, onEscape, onSpace, onHome, onEnd, onPageUp, onPageDown]);

  return { handleKeyDown };
}

// Hook for managing reduced motion preference
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Hook for managing high contrast mode
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = () => setPrefersHighContrast(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

// Hook for managing screen reader announcements
export function useScreenReaderAnnouncements() {
  const { announcePolite, announceAssertive, LiveRegion } = useAriaLiveRegion();

  const announceCollaboratorJoined = useCallback((userName: string) => {
    announcePolite(`${userName} joined the document`);
  }, [announcePolite]);

  const announceCollaboratorLeft = useCallback((userName: string) => {
    announcePolite(`${userName} left the document`);
  }, [announcePolite]);

  const announceDocumentSaved = useCallback(() => {
    announcePolite('Document saved successfully');
  }, [announcePolite]);

  const announceDocumentError = useCallback((error: string) => {
    announceAssertive(`Error: ${error}`);
  }, [announceAssertive]);

  const announceCommentAdded = useCallback((userName: string) => {
    announcePolite(`New comment from ${userName}`);
  }, [announcePolite]);

  const announceVersionCreated = useCallback((versionName: string) => {
    announcePolite(`New version created: ${versionName}`);
  }, [announcePolite]);

  const announceAISuggestion = useCallback((suggestionType: string) => {
    announcePolite(`New AI suggestion: ${suggestionType}`);
  }, [announcePolite]);

  const announceSelectionChange = useCallback((selectedText: string) => {
    if (selectedText.length > 0 && selectedText.length < 100) {
      announcePolite(`Selected: ${selectedText}`);
    }
  }, [announcePolite]);

  return {
    announceCollaboratorJoined,
    announceCollaboratorLeft,
    announceDocumentSaved,
    announceDocumentError,
    announceCommentAdded,
    announceVersionCreated,
    announceAISuggestion,
    announceSelectionChange,
    LiveRegion,
  };
}

// Hook for skip links navigation
export function useSkipLinks() {
  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainContent) {
      (mainContent as HTMLElement).focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const skipToNavigation = useCallback(() => {
    const navigation = document.querySelector('nav') || document.querySelector('[role="navigation"]');
    if (navigation) {
      (navigation as HTMLElement).focus();
      navigation.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const skipToSidebar = useCallback(() => {
    const sidebar = document.querySelector('[role="complementary"]');
    if (sidebar) {
      (sidebar as HTMLElement).focus();
      sidebar.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return { skipToContent, skipToNavigation, skipToSidebar };
}

// Hook for managing font size preferences
export function useFontSize() {
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('medium');

  useEffect(() => {
    const saved = localStorage.getItem('preferred-font-size');
    if (saved && ['small', 'medium', 'large', 'extra-large'].includes(saved)) {
      setFontSize(saved as typeof fontSize);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('preferred-font-size', fontSize);
    
    const root = document.documentElement;
    root.className = root.className.replace(/font-size-\w+/g, '');
    root.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  const increaseFontSize = useCallback(() => {
    const sizes = ['small', 'medium', 'large', 'extra-large'] as const;
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex < sizes.length - 1) {
      setFontSize(sizes[currentIndex + 1]);
      toast.success(`Font size increased to ${sizes[currentIndex + 1]}`);
    }
  }, [fontSize]);

  const decreaseFontSize = useCallback(() => {
    const sizes = ['small', 'medium', 'large', 'extra-large'] as const;
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(sizes[currentIndex - 1]);
      toast.success(`Font size decreased to ${sizes[currentIndex - 1]}`);
    }
  }, [fontSize]);

  const resetFontSize = useCallback(() => {
    setFontSize('medium');
    toast.success('Font size reset to default');
  }, []);

  return { fontSize, setFontSize, increaseFontSize, decreaseFontSize, resetFontSize };
}

// Utility function to generate unique IDs for ARIA labels
export function useUniqueId(prefix: string = 'id') {
  const idRef = useRef<string>();
  
  if (!idRef.current) {
    idRef.current = `${prefix}-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
  }
  
  return idRef.current;
}

// Hook for managing color scheme preferences
export function useColorScheme() {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | 'high-contrast'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('preferred-color-scheme');
    if (saved && ['light', 'dark', 'high-contrast'].includes(saved)) {
      setColorScheme(saved as typeof colorScheme);
    } else {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      if (prefersHighContrast) {
        setColorScheme('high-contrast');
      } else if (prefersDark) {
        setColorScheme('dark');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('preferred-color-scheme', colorScheme);
    
    const root = document.documentElement;
    root.className = root.className.replace(/(light|dark|high-contrast)/g, '');
    root.classList.add(colorScheme);
  }, [colorScheme]);

  const toggleColorScheme = useCallback(() => {
    const schemes = ['light', 'dark', 'high-contrast'] as const;
    const currentIndex = schemes.indexOf(colorScheme);
    const nextScheme = schemes[(currentIndex + 1) % schemes.length];
    setColorScheme(nextScheme);
    toast.success(`Switched to ${nextScheme.replace('-', ' ')} mode`);
  }, [colorScheme]);

  return { colorScheme, setColorScheme, toggleColorScheme };
}

// Hook for managing accessibility preferences
export function useAccessibilityPreferences() {
  const { fontSize, increaseFontSize, decreaseFontSize, resetFontSize } = useFontSize();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const prefersReducedMotion = useReducedMotion();
  const prefersHighContrast = useHighContrast();

  const [preferences, setPreferences] = useState({
    announceActions: true,
    announcePresence: true,
    announceComments: true,
    keyboardShortcuts: true,
    focusIndicators: true,
    skipLinks: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem('accessibility-preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse accessibility preferences:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = useCallback((key: keyof typeof preferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  return {
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    colorScheme,
    toggleColorScheme,
    prefersReducedMotion,
    prefersHighContrast,
    preferences,
    updatePreference,
  };
}