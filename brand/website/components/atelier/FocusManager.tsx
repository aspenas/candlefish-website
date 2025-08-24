'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FocusManagerProps {
  children: React.ReactNode;
}

interface FocusZone {
  id: string;
  element: HTMLElement;
  priority: number;
  bounds: DOMRect;
}

export function FocusManager({ children }: FocusManagerProps) {
  const [activeFocusZone, setActiveFocusZone] = useState<string | null>(null);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [focusZones, setFocusZones] = useState<Map<string, FocusZone>>(new Map());
  const [showFocusOverlay, setShowFocusOverlay] = useState(false);

  // Register focus zones automatically
  const registerFocusZone = useCallback((element: HTMLElement, id: string, priority: number = 1) => {
    const bounds = element.getBoundingClientRect();
    const zone: FocusZone = { id, element, priority, bounds };

    setFocusZones(prev => new Map(prev.set(id, zone)));

    // Add intersection observer to track when zones enter viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            // Zone is prominently visible
          }
        });
      },
      { threshold: [0.1, 0.3, 0.7, 1.0] }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      setFocusZones(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    };
  }, []);

  // Intelligent focus detection based on reading patterns
  const handleMouseMovement = useCallback((e: MouseEvent) => {
    const { clientX, clientY } = e;
    let newActiveFocus: string | null = null;
    let highestPriority = -1;

    // Find the highest priority zone under cursor
    focusZones.forEach((zone) => {
      const rect = zone.element.getBoundingClientRect();

      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom &&
        zone.priority > highestPriority
      ) {
        newActiveFocus = zone.id;
        highestPriority = zone.priority;
      }
    });

    if (newActiveFocus !== activeFocusZone) {
      setActiveFocusZone(newActiveFocus);

      // Enter reading mode after dwelling on content for 300ms
      if (newActiveFocus) {
        setTimeout(() => {
          setActiveFocusZone(current => {
            if (current === newActiveFocus) {
              setIsReadingMode(true);
              return current;
            }
            return current;
          });
        }, 300);
      } else {
        setIsReadingMode(false);
      }
    }
  }, [focusZones, activeFocusZone]);

  // Handle scroll-based focus (reading position tracking)
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const readingCenter = scrollY + (viewportHeight * 0.4); // 40% down from top

    let closestZone: string | null = null;
    let closestDistance = Infinity;

    focusZones.forEach((zone) => {
      const rect = zone.element.getBoundingClientRect();
      const elementCenter = rect.top + window.scrollY + (rect.height / 2);
      const distance = Math.abs(elementCenter - readingCenter);

      if (distance < closestDistance && rect.height > 100) { // Substantial content only
        closestDistance = distance;
        closestZone = zone.id;
      }
    });

    if (closestZone && closestDistance < viewportHeight * 0.3) {
      setActiveFocusZone(closestZone);
      setIsReadingMode(true);
    }
  }, [focusZones]);

  // Keyboard navigation support
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Tab through focus zones
    if (e.key === 'Tab') {
      const zones = Array.from(focusZones.values()).sort((a, b) => b.priority - a.priority);
      const currentIndex = activeFocusZone ? zones.findIndex(z => z.id === activeFocusZone) : -1;

      let nextIndex: number;
      if (e.shiftKey) {
        nextIndex = currentIndex <= 0 ? zones.length - 1 : currentIndex - 1;
      } else {
        nextIndex = currentIndex >= zones.length - 1 ? 0 : currentIndex + 1;
      }

      const nextZone = zones[nextIndex];
      if (nextZone) {
        setActiveFocusZone(nextZone.id);
        setIsReadingMode(true);
        nextZone.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        e.preventDefault();
      }
    }

    // Escape to exit reading mode
    if (e.key === 'Escape') {
      setActiveFocusZone(null);
      setIsReadingMode(false);
      setShowFocusOverlay(false);
    }

    // Toggle focus visualization with F key
    if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
      setShowFocusOverlay(!showFocusOverlay);
      e.preventDefault();
    }
  }, [activeFocusZone, focusZones, showFocusOverlay]);

  // Setup event listeners
  useEffect(() => {
    let mouseMoveTimer: NodeJS.Timeout;

    const throttledMouseMove = (e: MouseEvent) => {
      clearTimeout(mouseMoveTimer);
      mouseMoveTimer = setTimeout(() => handleMouseMovement(e), 16); // ~60fps
    };

    document.addEventListener('mousemove', throttledMouseMove);
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(mouseMoveTimer);
      document.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleMouseMovement, handleScroll, handleKeyDown]);

  // Apply focus effects to the active zone
  useEffect(() => {
    if (activeFocusZone && isReadingMode) {
      const zone = focusZones.get(activeFocusZone);
      if (zone) {
        // Add reading mode class to the focused element
        zone.element.classList.add('atelier-reading-focus');

        // Remove from all other zones
        focusZones.forEach((otherZone) => {
          if (otherZone.id !== activeFocusZone) {
            otherZone.element.classList.remove('atelier-reading-focus');
            otherZone.element.classList.add('atelier-reading-receded');
          } else {
            otherZone.element.classList.remove('atelier-reading-receded');
          }
        });
      }
    } else {
      // Clear all focus classes when not in reading mode
      focusZones.forEach((zone) => {
        zone.element.classList.remove('atelier-reading-focus', 'atelier-reading-receded');
      });
    }
  }, [activeFocusZone, isReadingMode, focusZones]);

  return (
    <>
      {children}

      {/* Focus Overlay for Development/Debugging */}
      <AnimatePresence>
        {showFocusOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          >
            {Array.from(focusZones.values()).map((zone) => {
              const rect = zone.element.getBoundingClientRect();
              return (
                <motion.div
                  key={zone.id}
                  className={`absolute border-2 rounded-lg ${
                    zone.id === activeFocusZone
                      ? 'border-livingCyan bg-livingCyan/10'
                      : 'border-pearl/30 bg-pearl/5'
                  }`}
                  style={{
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                  }}
                  layout
                  transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                >
                  <div className="absolute -top-6 left-0 text-xs font-mono text-pearl/70 bg-charcoal/80 px-2 py-1 rounded">
                    {zone.id} (P{zone.priority})
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reading Mode Indicator */}
      <AnimatePresence>
        {isReadingMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-4 right-4 z-40"
          >
            <div className="bg-charcoal/90 backdrop-blur-md border border-livingCyan/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-livingCyan rounded-full animate-pulse" />
                <span className="text-xs font-mono text-pearl/80">Reading Mode</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Background Dimming */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-10"
        animate={{
          backgroundColor: isReadingMode
            ? 'rgba(10, 10, 11, 0.4)'
            : 'rgba(10, 10, 11, 0)',
        }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </>
  );
}

// Hook for components to register themselves as focus zones
export function useFocusZone(
  id: string,
  priority: number = 1,
  dependencies: React.DependencyList = []
) {
  const elementRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Find the FocusManager and register this zone
    const focusManagerEvent = new CustomEvent('registerFocusZone', {
      detail: { element, id, priority }
    });

    document.dispatchEvent(focusManagerEvent);

    return () => {
      const unregisterEvent = new CustomEvent('unregisterFocusZone', {
        detail: { id }
      });
      document.dispatchEvent(unregisterEvent);
    };
  }, [id, priority, ...dependencies]);

  return elementRef;
}

// CSS classes applied by focus manager
export const focusManagerStyles = `
  .atelier-reading-focus {
    position: relative;
    z-index: 25;
    transform: scale(1.02) translateY(-2px);
    filter: brightness(1.1) contrast(1.05);
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .atelier-reading-receded {
    filter: blur(2px) brightness(0.7) contrast(0.8);
    opacity: 0.6;
    transform: scale(0.98);
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }
`;
