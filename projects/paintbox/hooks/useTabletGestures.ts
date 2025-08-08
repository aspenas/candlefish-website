import React, { useState, useCallback, useRef, useEffect } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: (velocity?: number) => void;
  onSwipeRight?: (velocity?: number) => void;
  onSwipeUp?: (velocity?: number) => void;
  onSwipeDown?: (velocity?: number) => void;
}

interface SwipeOptions {
  threshold?: number;
  velocityThreshold?: number;
  preventScroll?: boolean;
  requireMinDistance?: boolean;
}

// Enhanced swipe navigation hook for iPad
export function useSwipeNavigation(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventScroll = false,
    requireMinDistance = true
  } = options;

  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const bind = () => ({
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setStartX(touch.clientX);
      setStartY(touch.clientY);
      setStartTime(Date.now());
      setIsDragging(false);

      if (preventScroll) {
        e.preventDefault();
      }
    },

    onTouchMove: (e: React.TouchEvent) => {
      if (!isDragging) {
        setIsDragging(true);
      }

      if (preventScroll) {
        e.preventDefault();
      }
    },

    onTouchEnd: (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;

      // Check if movement meets minimum requirements
      if (requireMinDistance && distance < threshold) {
        setIsDragging(false);
        return;
      }

      if (velocity < velocityThreshold && requireMinDistance) {
        setIsDragging(false);
        return;
      }

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > threshold && handlers.onSwipeRight) {
          handlers.onSwipeRight(velocity);
        } else if (deltaX < -threshold && handlers.onSwipeLeft) {
          handlers.onSwipeLeft(velocity);
        }
      } else {
        // Vertical swipe
        if (deltaY > threshold && handlers.onSwipeDown) {
          handlers.onSwipeDown(velocity);
        } else if (deltaY < -threshold && handlers.onSwipeUp) {
          handlers.onSwipeUp(velocity);
        }
      }

      setIsDragging(false);
    }
  });

  return {
    bind,
    isDragging,
    spring: { x: 0, y: 0 }
  };
}

// Long press hook
export function useLongPress(
  callback: () => void,
  { delay = 500 } = {}
) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();

  const start = useCallback(() => {
    timeout.current = setTimeout(() => {
      callback();
      setLongPressTriggered(true);
    }, delay);
  }, [callback, delay]);

  const clear = useCallback(() => {
    timeout.current && clearTimeout(timeout.current);
    setLongPressTriggered(false);
  }, []);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear,
  };
}

// Enhanced double tap hook with position tracking
export function useDoubleTap(
  callback: (position?: { x: number; y: number }) => void,
  delay = 300
) {
  const [lastTap, setLastTap] = useState(0);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);

  const handleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();

    // Get position from touch or mouse event
    let position: { x: number; y: number };
    if ('touches' in e && e.touches.length > 0) {
      position = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if ('clientX' in e) {
      position = { x: e.clientX, y: e.clientY };
    } else {
      position = { x: 0, y: 0 };
    }

    if (now - lastTap < delay && lastPosition) {
      // Check if taps are close together (within 50px)
      const distance = Math.sqrt(
        Math.pow(position.x - lastPosition.x, 2) + Math.pow(position.y - lastPosition.y, 2)
      );

      if (distance < 50) {
        callback(position);
        setLastTap(0);
        setLastPosition(null);
        return;
      }
    }

    setLastTap(now);
    setLastPosition(position);
  }, [callback, delay, lastTap, lastPosition]);

  return {
    onTouchEnd: handleTap,
    onClick: handleTap,
  };
}

// Pinch-to-zoom hook for iPad
export function usePinchZoom(
  onZoom: (scale: number, center: { x: number; y: number }) => void,
  options: {
    minScale?: number;
    maxScale?: number;
    sensitivity?: number;
  } = {}
) {
  const { minScale = 0.5, maxScale = 3, sensitivity = 1 } = options;

  const [scale, setScale] = useState(1);
  const [initialDistance, setInitialDistance] = useState(0);
  const [initialScale, setInitialScale] = useState(1);
  const [center, setCenter] = useState({ x: 0, y: 0 });

  const getDistance = (touches: TouchList): number => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getCenter = (touches: TouchList): { x: number; y: number } => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const bind = () => ({
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const distance = getDistance(e.touches);
        const center = getCenter(e.touches);

        setInitialDistance(distance);
        setInitialScale(scale);
        setCenter(center);

        e.preventDefault();
      }
    },

    onTouchMove: (e: React.TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        const currentDistance = getDistance(e.touches);
        const currentCenter = getCenter(e.touches);

        let newScale = initialScale * (currentDistance / initialDistance) * sensitivity;
        newScale = Math.max(minScale, Math.min(maxScale, newScale));

        setScale(newScale);
        setCenter(currentCenter);
        onZoom(newScale, currentCenter);

        e.preventDefault();
      }
    },

    onTouchEnd: (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
        setInitialDistance(0);
      }
    }
  });

  return {
    bind,
    scale,
    center,
    reset: () => {
      setScale(1);
      onZoom(1, { x: 0, y: 0 });
    }
  };
}

// Multi-touch gesture hook for complex interactions
export function useMultiTouch(
  onGesture: (gesture: {
    type: 'pan' | 'pinch' | 'rotate';
    data: any;
  }) => void
) {
  const [touches, setTouches] = useState<TouchList | null>(null);
  const [initialTouches, setInitialTouches] = useState<TouchList | null>(null);

  const bind = () => ({
    onTouchStart: (e: React.TouchEvent) => {
      setTouches(e.touches);
      setInitialTouches(e.touches);

      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },

    onTouchMove: (e: React.TouchEvent) => {
      if (!initialTouches || e.touches.length !== initialTouches.length) {
        return;
      }

      if (e.touches.length === 1) {
        // Single finger pan
        const touch = e.touches[0];
        const initialTouch = initialTouches[0];

        onGesture({
          type: 'pan',
          data: {
            deltaX: touch.clientX - initialTouch.clientX,
            deltaY: touch.clientY - initialTouch.clientY,
            position: { x: touch.clientX, y: touch.clientY }
          }
        });
      } else if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const initialTouch1 = initialTouches[0];
        const initialTouch2 = initialTouches[1];

        // Calculate pinch
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        const initialDistance = Math.sqrt(
          Math.pow(initialTouch2.clientX - initialTouch1.clientX, 2) +
          Math.pow(initialTouch2.clientY - initialTouch1.clientY, 2)
        );

        const scale = currentDistance / initialDistance;

        // Calculate rotation
        const currentAngle = Math.atan2(
          touch2.clientY - touch1.clientY,
          touch2.clientX - touch1.clientX
        );

        const initialAngle = Math.atan2(
          initialTouch2.clientY - initialTouch1.clientY,
          initialTouch2.clientX - initialTouch1.clientX
        );

        const rotation = currentAngle - initialAngle;

        onGesture({
          type: 'pinch',
          data: {
            scale,
            rotation: rotation * (180 / Math.PI), // Convert to degrees
            center: {
              x: (touch1.clientX + touch2.clientX) / 2,
              y: (touch1.clientY + touch2.clientY) / 2
            }
          }
        });
      }

      setTouches(e.touches);

      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },

    onTouchEnd: () => {
      setTouches(null);
      setInitialTouches(null);
    }
  });

  return { bind };
}

// Haptic feedback utilities (if supported)
export const useHapticFeedback = () => {
  const triggerImpact = useCallback((style: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      // Check if device supports haptic feedback
      if ('vibrate' in navigator) {
        // Fallback to basic vibration
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        };
        navigator.vibrate(patterns[style]);
      }

      // iOS Haptic Feedback (if available)
      if (window.DeviceMotionEvent && typeof (window as any).DeviceMotionEvent.requestPermission === 'function') {
        // This would work on iOS Safari with proper permissions
        console.log(`Haptic feedback: ${style}`);
      }
    } catch (error) {
      console.log('Haptic feedback not supported');
    }
  }, []);

  const triggerSelection = useCallback(() => {
    triggerImpact('light');
  }, [triggerImpact]);

  const triggerNotification = useCallback((type: 'success' | 'warning' | 'error' = 'success') => {
    const patterns = {
      success: [10, 100, 10],
      warning: [20, 100, 20, 100, 20],
      error: [30, 100, 30, 100, 30]
    };

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(patterns[type]);
      }
    } catch (error) {
      console.log('Haptic feedback not supported');
    }
  }, []);

  return {
    triggerImpact,
    triggerSelection,
    triggerNotification
  };
};
