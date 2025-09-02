import { useEffect, useCallback, useRef, useState } from 'react';

export interface GestureEvent {
  type: 'swipe' | 'pinch' | 'tap' | 'longpress' | 'drag';
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  scale?: number;
  velocity?: number;
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  target: EventTarget | null;
}

export interface SwipeGestureOptions {
  threshold?: number; // minimum distance for swipe
  velocityThreshold?: number; // minimum velocity for swipe
  touchSlop?: number; // tolerance for direction detection
  onSwipeLeft?: (event: GestureEvent) => void;
  onSwipeRight?: (event: GestureEvent) => void;
  onSwipeUp?: (event: GestureEvent) => void;
  onSwipeDown?: (event: GestureEvent) => void;
}

export interface PinchGestureOptions {
  threshold?: number; // minimum scale change
  onPinchStart?: (event: GestureEvent) => void;
  onPinchMove?: (event: GestureEvent) => void;
  onPinchEnd?: (event: GestureEvent) => void;
}

export interface TapGestureOptions {
  tapTimeout?: number; // max time for tap
  doubleTapTimeout?: number; // max time between taps for double tap
  longPressTimeout?: number; // min time for long press
  onTap?: (event: GestureEvent) => void;
  onDoubleTap?: (event: GestureEvent) => void;
  onLongPress?: (event: GestureEvent) => void;
}

interface GestureOptions extends SwipeGestureOptions, PinchGestureOptions, TapGestureOptions {
  disabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  lastMoveTime: number;
  initialDistance?: number;
  lastDistance?: number;
  touches: TouchList | null;
}

export function useMobileGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: GestureOptions = {}
) {
  const {
    // Swipe options
    threshold = 50,
    velocityThreshold = 0.1,
    touchSlop = 30,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    // Pinch options
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    // Tap options
    tapTimeout = 300,
    doubleTapTimeout = 300,
    longPressTimeout = 500,
    onTap,
    onDoubleTap,
    onLongPress,
    // General options
    disabled = false,
    preventDefault = true,
    stopPropagation = false
  } = options;

  const touchStateRef = useRef<TouchState | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isGesturing, setIsGesturing] = useState(false);

  // Haptic feedback (iOS Safari)
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [40]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  const createGestureEvent = useCallback((
    type: GestureEvent['type'],
    touchState: TouchState,
    additionalData: Partial<GestureEvent> = {}
  ): GestureEvent => {
    const deltaX = touchState.currentX - touchState.startX;
    const deltaY = touchState.currentY - touchState.startY;

    return {
      type,
      x: touchState.currentX,
      y: touchState.currentY,
      deltaX,
      deltaY,
      target: elementRef.current,
      ...additionalData
    };
  }, [elementRef]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;

    if (preventDefault) e.preventDefault();
    if (stopPropagation) e.stopPropagation();

    const touch = e.touches[0];
    const now = Date.now();

    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: now,
      lastMoveTime: now,
      touches: e.touches
    };

    // Handle multi-touch (pinch)
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      touchStateRef.current.initialDistance = distance;
      touchStateRef.current.lastDistance = distance;

      if (onPinchStart) {
        const event = createGestureEvent('pinch', touchStateRef.current, {
          scale: 1
        });
        onPinchStart(event);
      }
    }

    // Setup long press timer for single touch
    if (e.touches.length === 1 && onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        if (touchStateRef.current) {
          hapticFeedback('medium');
          const event = createGestureEvent('longpress', touchStateRef.current);
          onLongPress(event);
        }
      }, longPressTimeout);
    }

    setIsGesturing(true);
  }, [disabled, preventDefault, stopPropagation, onPinchStart, onLongPress, longPressTimeout, getDistance, createGestureEvent, hapticFeedback]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !touchStateRef.current) return;

    if (preventDefault) e.preventDefault();
    if (stopPropagation) e.stopPropagation();

    const touch = e.touches[0];
    const now = Date.now();

    touchStateRef.current.currentX = touch.clientX;
    touchStateRef.current.currentY = touch.clientY;
    touchStateRef.current.lastMoveTime = now;

    // Clear long press timer on movement
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle pinch gesture
    if (e.touches.length === 2 && touchStateRef.current.initialDistance) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / touchStateRef.current.initialDistance;

      if (onPinchMove) {
        const event = createGestureEvent('pinch', touchStateRef.current, {
          scale,
          distance: currentDistance - touchStateRef.current.initialDistance
        });
        onPinchMove(event);
      }

      touchStateRef.current.lastDistance = currentDistance;
    }
  }, [disabled, preventDefault, stopPropagation, onPinchMove, getDistance, createGestureEvent]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (disabled || !touchStateRef.current) return;

    if (preventDefault) e.preventDefault();
    if (stopPropagation) e.stopPropagation();

    const touchState = touchStateRef.current;
    const now = Date.now();
    const deltaX = touchState.currentX - touchState.startX;
    const deltaY = touchState.currentY - touchState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = now - touchState.startTime;
    const velocity = distance / duration;

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle pinch end
    if (e.changedTouches.length === 1 && touchState.initialDistance && onPinchEnd) {
      const finalScale = touchState.lastDistance ? touchState.lastDistance / touchState.initialDistance : 1;
      const event = createGestureEvent('pinch', touchState, {
        scale: finalScale
      });
      onPinchEnd(event);
    }

    // Handle swipe gestures (single touch)
    if (e.changedTouches.length === 1 && distance >= threshold && velocity >= velocityThreshold) {
      let direction: 'left' | 'right' | 'up' | 'down';
      let handler: ((event: GestureEvent) => void) | undefined;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > touchSlop) {
          direction = 'right';
          handler = onSwipeRight;
        } else if (deltaX < -touchSlop) {
          direction = 'left';
          handler = onSwipeLeft;
        }
      } else {
        // Vertical swipe
        if (deltaY > touchSlop) {
          direction = 'down';
          handler = onSwipeDown;
        } else if (deltaY < -touchSlop) {
          direction = 'up';
          handler = onSwipeUp;
        }
      }

      if (handler && direction!) {
        hapticFeedback('light');
        const event = createGestureEvent('swipe', touchState, {
          direction,
          distance,
          velocity
        });
        handler(event);
      }
    }
    // Handle tap gestures
    else if (distance < threshold && duration < tapTimeout) {
      const tapEvent = createGestureEvent('tap', touchState);

      // Check for double tap
      if (lastTapRef.current &&
          now - lastTapRef.current.time < doubleTapTimeout &&
          Math.abs(touchState.currentX - lastTapRef.current.x) < touchSlop &&
          Math.abs(touchState.currentY - lastTapRef.current.y) < touchSlop) {

        if (onDoubleTap) {
          hapticFeedback('medium');
          onDoubleTap(tapEvent);
        }
        lastTapRef.current = null;
      } else {
        // Single tap
        if (onTap) {
          hapticFeedback('light');
          onTap(tapEvent);
        }

        lastTapRef.current = {
          time: now,
          x: touchState.currentX,
          y: touchState.currentY
        };

        // Clear double tap timer
        setTimeout(() => {
          if (lastTapRef.current && lastTapRef.current.time === now) {
            lastTapRef.current = null;
          }
        }, doubleTapTimeout);
      }
    }

    touchStateRef.current = null;
    setIsGesturing(false);
  }, [
    disabled, preventDefault, stopPropagation, threshold, velocityThreshold, touchSlop, tapTimeout, doubleTapTimeout,
    onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPinchEnd, onTap, onDoubleTap,
    createGestureEvent, hapticFeedback
  ]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Prevent context menu on mobile
    const handleContextMenu = (e: Event) => e.preventDefault();
    element.addEventListener('contextmenu', handleContextMenu);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
      element.removeEventListener('contextmenu', handleContextMenu);

      // Clear timers
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [elementRef, disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isGesturing,
    hapticFeedback
  };
}

// Additional hook for camera-specific gestures
export function useCameraGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: {
    onCapture?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onNextItem?: () => void;
    onPreviousItem?: () => void;
    onToggleFlash?: () => void;
    disabled?: boolean;
  } = {}
) {
  const {
    onCapture,
    onZoomIn,
    onZoomOut,
    onNextItem,
    onPreviousItem,
    onToggleFlash,
    disabled
  } = options;

  const { isGesturing, hapticFeedback } = useMobileGestures(elementRef, {
    disabled,
    // Tap to capture
    onTap: () => {
      if (onCapture) {
        hapticFeedback('medium');
        onCapture();
      }
    },
    // Double tap to toggle flash
    onDoubleTap: () => {
      if (onToggleFlash) {
        hapticFeedback('heavy');
        onToggleFlash();
      }
    },
    // Swipe navigation
    onSwipeLeft: () => {
      if (onNextItem) {
        hapticFeedback('light');
        onNextItem();
      }
    },
    onSwipeRight: () => {
      if (onPreviousItem) {
        hapticFeedback('light');
        onPreviousItem();
      }
    },
    // Pinch to zoom
    onPinchMove: (e) => {
      if (e.scale && e.scale > 1.1 && onZoomIn) {
        onZoomIn();
      } else if (e.scale && e.scale < 0.9 && onZoomOut) {
        onZoomOut();
      }
    },
    preventDefault: true
  });

  return { isGesturing };
}

// Hook for orientation and device motion
export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<{
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    isPortrait: boolean;
    isLandscape: boolean;
  }>({
    alpha: null,
    beta: null,
    gamma: null,
    isPortrait: window.innerHeight > window.innerWidth,
    isLandscape: window.innerWidth > window.innerHeight
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(prev => ({
        ...prev,
        isPortrait: window.innerHeight > window.innerWidth,
        isLandscape: window.innerWidth > window.innerHeight
      }));
    };

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      setOrientation(prev => ({
        ...prev,
        alpha: e.alpha,
        beta: e.beta,
        gamma: e.gamma
      }));
    };

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
      (DeviceOrientationEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
          }
        })
        .catch((error: any) => console.log('Device orientation permission denied:', error));
    } else {
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return orientation;
}
