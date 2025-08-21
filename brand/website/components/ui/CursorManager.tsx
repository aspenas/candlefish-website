'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CursorState {
  x: number;
  y: number;
  isHovering: boolean;
  hoverTarget: string | null;
  isPressed: boolean;
}

export default function CursorManager() {
  const [cursor, setCursor] = useState<CursorState>({
    x: 0,
    y: 0,
    isHovering: false,
    hoverTarget: null,
    isPressed: false,
  });

  const [isVisible, setIsVisible] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      setCursor(prev => ({
        ...prev,
        x: e.clientX,
        y: e.clientY,
      }));

      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const hoverTarget = target.getAttribute('data-cursor') ||
                         (target.tagName === 'BUTTON' ? 'button' :
                          target.tagName === 'A' ? 'link' :
                          target.closest('[data-cursor]')?.getAttribute('data-cursor') || null);

      if (hoverTarget) {
        setCursor(prev => ({
          ...prev,
          isHovering: true,
          hoverTarget,
        }));
      }
    };

    const handleMouseLeave = () => {
      setCursor(prev => ({
        ...prev,
        isHovering: false,
        hoverTarget: null,
      }));
    };

    const handleMouseDown = () => {
      setCursor(prev => ({ ...prev, isPressed: true }));
    };

    const handleMouseUp = () => {
      setCursor(prev => ({ ...prev, isPressed: false }));
    };

    const handleMouseOut = () => {
      setIsVisible(false);
    };

    // Add event listeners to all interactive elements
    const addInteractiveListeners = () => {
      const interactiveElements = document.querySelectorAll('button, a, [data-cursor], .hover-lift, .instrument-panel, .queue-position');

      interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', handleMouseEnter as EventListener);
        element.addEventListener('mouseleave', handleMouseLeave);
      });
    };

    // Initial setup
    document.addEventListener('mousemove', updateCursor);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseOut);

    // Set up interactive elements
    addInteractiveListeners();

    // Re-scan for new interactive elements periodically
    const rescanInterval = setInterval(addInteractiveListeners, 2000);

    return () => {
      document.removeEventListener('mousemove', updateCursor);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseOut);
      clearInterval(rescanInterval);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const getCursorVariant = () => {
    if (cursor.isPressed) return 'pressed';
    if (cursor.isHovering) {
      switch (cursor.hoverTarget) {
        case 'instrument': return 'instrument';
        case 'queue': return 'queue';
        case 'workshop': return 'workshop';
        case 'manifesto': return 'manifesto';
        case 'button': return 'button';
        case 'link': return 'link';
        default: return 'hover';
      }
    }
    return 'default';
  };

  const cursorVariants = {
    default: {
      scale: 1,
      backgroundColor: 'rgba(0, 255, 255, 0.8)',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      width: 20,
      height: 20,
    },
    hover: {
      scale: 2,
      backgroundColor: 'rgba(184, 115, 51, 0.6)',
      border: '1px solid rgba(184, 115, 51, 0.8)',
      width: 20,
      height: 20,
    },
    button: {
      scale: 2.5,
      backgroundColor: 'rgba(0, 255, 255, 0.2)',
      border: '2px solid rgba(0, 255, 255, 1)',
      width: 20,
      height: 20,
    },
    link: {
      scale: 1.5,
      backgroundColor: 'rgba(0, 255, 255, 0.4)',
      border: '1px solid rgba(0, 255, 255, 0.8)',
      width: 20,
      height: 20,
    },
    instrument: {
      scale: 3,
      backgroundColor: 'rgba(184, 115, 51, 0.3)',
      border: '2px solid rgba(184, 115, 51, 1)',
      width: 20,
      height: 20,
    },
    queue: {
      scale: 2.2,
      backgroundColor: 'rgba(0, 255, 255, 0.3)',
      border: '2px solid rgba(0, 255, 255, 0.9)',
      width: 20,
      height: 20,
    },
    workshop: {
      scale: 2.8,
      backgroundColor: 'rgba(248, 248, 242, 0.2)',
      border: '2px solid rgba(248, 248, 242, 0.8)',
      width: 20,
      height: 20,
    },
    manifesto: {
      scale: 2.5,
      backgroundColor: 'rgba(184, 115, 51, 0.4)',
      border: '1px solid rgba(184, 115, 51, 0.9)',
      width: 20,
      height: 20,
    },
    pressed: {
      scale: 1.5,
      backgroundColor: 'rgba(0, 255, 255, 1)',
      border: '2px solid rgba(248, 248, 242, 1)',
      width: 20,
      height: 20,
    },
  };

  const dotVariants = {
    default: { scale: 1, opacity: 0.9 },
    hover: { scale: 0.8, opacity: 1 },
    button: { scale: 0.6, opacity: 1 },
    link: { scale: 0.8, opacity: 1 },
    instrument: { scale: 0.5, opacity: 1 },
    queue: { scale: 0.7, opacity: 1 },
    workshop: { scale: 0.6, opacity: 1 },
    manifesto: { scale: 0.7, opacity: 1 },
    pressed: { scale: 1.2, opacity: 1 },
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <motion.div
        ref={cursorRef}
        className="absolute rounded-full mix-blend-difference"
        animate={cursorVariants[getCursorVariant() as keyof typeof cursorVariants]}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
          mass: 0.5,
        }}
        style={{
          left: cursor.x - 10,
          top: cursor.y - 10,
          transformOrigin: 'center',
        }}
      >
        <motion.div
          className="absolute top-1/2 left-1/2 w-1 h-1 bg-pearl rounded-full -translate-x-1/2 -translate-y-1/2"
          animate={dotVariants[getCursorVariant() as keyof typeof dotVariants]}
          transition={{
            type: "spring",
            stiffness: 600,
            damping: 25,
          }}
        />
      </motion.div>

      {/* Cursor trail effect */}
      <AnimatePresence>
        {cursor.isHovering && (
          <motion.div
            className="absolute pointer-events-none"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.3, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              left: cursor.x - 25,
              top: cursor.y - 25,
              width: 50,
              height: 50,
              background: 'radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'scale(1)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Contextual cursor label */}
      <AnimatePresence>
        {cursor.hoverTarget && (
          <motion.div
            className="absolute pointer-events-none text-xs text-pearl/80 bg-graphite/90 px-2 py-1 rounded backdrop-blur-sm border border-living-cyan/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              left: cursor.x + 20,
              top: cursor.y - 30,
            }}
          >
            {cursor.hoverTarget}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
