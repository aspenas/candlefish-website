'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReadingModeProps {
  children: React.ReactNode;
  threshold?: number; // Time in ms to enter reading mode
  contentPadding?: number; // Padding around content in reading mode
  backgroundDim?: number; // How much to dim background (0-1)
}

interface ReadingState {
  isActive: boolean;
  activeElement: HTMLElement | null;
  readingProgress: number;
  estimatedReadTime: number;
  wordsRead: number;
}

export function ReadingMode({
  children,
  threshold = 1000,
  contentPadding = 40,
  backgroundDim = 0.7,
}: ReadingModeProps) {
  const [readingState, setReadingState] = useState<ReadingState>({
    isActive: false,
    activeElement: null,
    readingProgress: 0,
    estimatedReadTime: 0,
    wordsRead: 0,
  });

  const [dwellTimer, setDwellTimer] = useState<NodeJS.Timeout | null>(null);
  const [scrollTimer, setScrollTimer] = useState<NodeJS.Timeout | null>(null);
  const lastScrollPosition = useRef(0);
  const readingStartTime = useRef<number>(0);

  // Calculate reading metrics for an element
  const calculateReadingMetrics = useCallback((element: HTMLElement) => {
    const text = element.innerText || '';
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const averageWordsPerMinute = 200; // Average adult reading speed
    const estimatedReadTime = Math.ceil((wordCount / averageWordsPerMinute) * 60 * 1000); // in ms

    return { wordCount, estimatedReadTime };
  }, []);

  // Enter reading mode for a specific element
  const enterReadingMode = useCallback((element: HTMLElement) => {
    const { wordCount, estimatedReadTime } = calculateReadingMetrics(element);

    setReadingState({
      isActive: true,
      activeElement: element,
      readingProgress: 0,
      estimatedReadTime,
      wordsRead: 0,
    });

    readingStartTime.current = Date.now();

    // Add visual indicators to the element
    element.classList.add('reading-mode-active');

    // Scroll element into optimal reading position (33% from top)
    const elementRect = element.getBoundingClientRect();
    const optimalPosition = window.scrollY + elementRect.top - (window.innerHeight * 0.33);

    window.scrollTo({
      top: optimalPosition,
      behavior: 'smooth'
    });

    // Track reading progress
    const progressInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - readingStartTime.current;
      const progress = Math.min(elapsed / estimatedReadTime, 1);
      const wordsRead = Math.floor(progress * wordCount);

      setReadingState(prev => ({
        ...prev,
        readingProgress: progress,
        wordsRead,
      }));

      // Auto-exit when reading is complete
      if (progress >= 1) {
        clearInterval(progressInterval);
        setTimeout(() => exitReadingMode(), 2000); // Stay active for 2s after completion
      }
    }, 1000);

    return progressInterval;
  }, [calculateReadingMetrics]);

  // Exit reading mode
  const exitReadingMode = useCallback(() => {
    if (readingState.activeElement) {
      readingState.activeElement.classList.remove('reading-mode-active');
    }

    setReadingState({
      isActive: false,
      activeElement: null,
      readingProgress: 0,
      estimatedReadTime: 0,
      wordsRead: 0,
    });

    readingStartTime.current = 0;
  }, [readingState.activeElement]);

  // Handle mouse interaction with content areas
  const handleMouseEnter = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Look for readable content elements
    const readableElement = target.closest('[data-reading-content], .reading-content, article, section, .prose, .content') as HTMLElement;

    if (!readableElement) return;

    // Clear any existing timer
    if (dwellTimer) {
      clearTimeout(dwellTimer);
    }

    // Start dwell timer
    const timer = setTimeout(() => {
      if (!readingState.isActive) {
        enterReadingMode(readableElement);
      }
    }, threshold);

    setDwellTimer(timer);
  }, [dwellTimer, readingState.isActive, threshold, enterReadingMode]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (dwellTimer) {
      clearTimeout(dwellTimer);
      setDwellTimer(null);
    }

    // Don't immediately exit reading mode - use scroll inactivity instead
  }, [dwellTimer]);

  // Handle scroll activity
  const handleScroll = useCallback(() => {
    const currentScrollPosition = window.scrollY;
    const scrollDelta = Math.abs(currentScrollPosition - lastScrollPosition.current);

    lastScrollPosition.current = currentScrollPosition;

    // Clear existing scroll timer
    if (scrollTimer) {
      clearTimeout(scrollTimer);
    }

    // If significant scroll movement and reading mode is active, set exit timer
    if (readingState.isActive && scrollDelta > 50) {
      const timer = setTimeout(() => {
        exitReadingMode();
      }, 3000); // Exit after 3s of no scroll activity

      setScrollTimer(timer);
    }
  }, [scrollTimer, readingState.isActive, exitReadingMode]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // R key to toggle reading mode on current element
    if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();

      if (readingState.isActive) {
        exitReadingMode();
      } else {
        // Find the element closest to center of viewport
        const viewportCenter = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };

        const elements = document.elementsFromPoint(viewportCenter.x, viewportCenter.y);
        const readableElement = elements.find(el =>
          el.matches('[data-reading-content], .reading-content, article, section, .prose, .content')
        ) as HTMLElement;

        if (readableElement) {
          enterReadingMode(readableElement);
        }
      }
    }

    // Escape to exit reading mode
    if (e.key === 'Escape' && readingState.isActive) {
      exitReadingMode();
    }
  }, [readingState.isActive, enterReadingMode, exitReadingMode]);

  // Setup event listeners
  useEffect(() => {
    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleKeyDown);

      if (dwellTimer) clearTimeout(dwellTimer);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [handleMouseEnter, handleMouseLeave, handleScroll, handleKeyDown, dwellTimer, scrollTimer]);

  return (
    <>
      {children}

      {/* Reading Mode Overlay */}
      <AnimatePresence>
        {readingState.isActive && (
          <>
            {/* Background dimming */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: backgroundDim }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-20 pointer-events-none"
            />

            {/* Reading Progress Indicator */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 left-1/2 transform -translate-x-1/2 z-30"
            >
              <div className="bg-charcoal/90 backdrop-blur-md border border-livingCyan/20 rounded-full px-6 py-3">
                <div className="flex items-center gap-4">
                  {/* Progress bar */}
                  <div className="w-32 h-1 bg-pearl/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-livingCyan rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${readingState.readingProgress * 100}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Reading stats */}
                  <div className="flex items-center gap-3 text-xs font-mono text-pearl/70">
                    <span>{readingState.wordsRead} words</span>
                    <span>•</span>
                    <span>{Math.ceil((readingState.estimatedReadTime - (Date.now() - readingStartTime.current)) / 1000)}s left</span>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={exitReadingMode}
                    className="ml-2 w-5 h-5 rounded-full bg-pearl/10 hover:bg-pearl/20 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-3 h-3 text-pearl/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Reading controls */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed right-6 top-1/2 transform -translate-y-1/2 z-30"
            >
              <div className="bg-charcoal/90 backdrop-blur-md border border-pearl/10 rounded-lg p-2 space-y-2">
                {/* Font size controls */}
                <button
                  onClick={() => {
                    if (readingState.activeElement) {
                      const currentSize = parseInt(getComputedStyle(readingState.activeElement).fontSize);
                      readingState.activeElement.style.fontSize = `${Math.min(currentSize + 2, 24)}px`;
                    }
                  }}
                  className="block w-6 h-6 text-pearl/50 hover:text-pearl/80 transition-colors"
                  title="Increase font size"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    if (readingState.activeElement) {
                      const currentSize = parseInt(getComputedStyle(readingState.activeElement).fontSize);
                      readingState.activeElement.style.fontSize = `${Math.max(currentSize - 2, 12)}px`;
                    }
                  }}
                  className="block w-6 h-6 text-pearl/50 hover:text-pearl/80 transition-colors"
                  title="Decrease font size"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// CSS classes for reading mode styling
export const readingModeStyles = `
  .reading-mode-active {
    position: relative !important;
    z-index: 25 !important;
    background-color: rgba(26, 26, 28, 0.95) !important;
    padding: 2rem !important;
    border-radius: 12px !important;
    margin: 1rem 0 !important;
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.4) !important;
    line-height: 1.8 !important;
    max-width: 65ch !important;
    margin-left: auto !important;
    margin-right: auto !important;
    transform: scale(1.02) !important;
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1) !important;
  }

  .reading-mode-active p,
  .reading-mode-active h1,
  .reading-mode-active h2,
  .reading-mode-active h3,
  .reading-mode-active h4,
  .reading-mode-active h5,
  .reading-mode-active h6 {
    margin-bottom: 1.5rem !important;
  }

  .reading-mode-active h1,
  .reading-mode-active h2,
  .reading-mode-active h3 {
    color: rgb(248, 248, 242) !important;
    font-weight: 300 !important;
  }

  .reading-mode-active p {
    color: rgba(248, 248, 242, 0.9) !important;
    font-size: 1.1rem !important;
    line-height: 1.8 !important;
  }
`;
