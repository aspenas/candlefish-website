/**
 * Touch Gesture Hooks for iPad Optimization
 * Provides swipe, pinch, and long press support
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefault?: boolean;
}

/**
 * Hook for swipe gesture detection
 */
export function useSwipe(handlers: SwipeHandlers) {
  const touchStart = useRef<Point | null>(null);
  const touchEnd = useRef<Point | null>(null);
  const threshold = handlers.threshold || 50;

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (handlers.preventDefault) {
      e.preventDefault();
    }
    touchEnd.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, [handlers.preventDefault]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const distanceX = touchStart.current.x - touchEnd.current.x;
    const distanceY = touchStart.current.y - touchEnd.current.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe) {
      if (Math.abs(distanceX) > threshold) {
        if (distanceX > 0) {
          handlers.onSwipeLeft?.();
        } else {
          handlers.onSwipeRight?.();
        }
      }
    } else {
      if (Math.abs(distanceY) > threshold) {
        if (distanceY > 0) {
          handlers.onSwipeUp?.();
        } else {
          handlers.onSwipeDown?.();
        }
      }
    }
  }, [threshold, handlers]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

interface PinchHandlers {
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
  onPinchEnd?: () => void;
  minScale?: number;
  maxScale?: number;
}

/**
 * Hook for pinch gesture detection
 */
export function usePinch(handlers: PinchHandlers) {
  const [scale, setScale] = useState(1);
  const initialDistance = useRef<number | null>(null);
  const currentScale = useRef(1);
  const minScale = handlers.minScale || 0.5;
  const maxScale = handlers.maxScale || 3;

  const getDistance = (touches: TouchList): number => {
    const [touch1, touch2] = Array.from(touches);
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches);
    }
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      const newScale = (currentDistance / initialDistance.current) * currentScale.current;

      const clampedScale = Math.min(Math.max(newScale, minScale), maxScale);
      setScale(clampedScale);

      if (newScale > currentScale.current) {
        handlers.onPinchOut?.(clampedScale);
      } else if (newScale < currentScale.current) {
        handlers.onPinchIn?.(clampedScale);
      }
    }
  }, [minScale, maxScale, handlers]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) {
      currentScale.current = scale;
      initialDistance.current = null;
      handlers.onPinchEnd?.();
    }
  }, [scale, handlers]);

  return {
    scale,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

interface LongPressHandlers {
  onLongPress: () => void;
  delay?: number;
  cancelOnMove?: boolean;
  moveThreshold?: number;
}

/**
 * Hook for long press gesture detection
 */
export function useLongPress(handlers: LongPressHandlers) {
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const startPos = useRef<Point | null>(null);
  const delay = handlers.delay || 500;
  const moveThreshold = handlers.moveThreshold || 10;

  const start = useCallback((e: TouchEvent | MouseEvent) => {
    const isTouch = 'touches' in e;
    const point = isTouch
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

    startPos.current = point;

    timeout.current = setTimeout(() => {
      handlers.onLongPress();
    }, delay);
  }, [delay, handlers]);

  const move = useCallback((e: TouchEvent | MouseEvent) => {
    if (!handlers.cancelOnMove || !startPos.current) return;

    const isTouch = 'touches' in e;
    const point = isTouch
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

    const distance = Math.sqrt(
      Math.pow(point.x - startPos.current.x, 2) +
      Math.pow(point.y - startPos.current.y, 2)
    );

    if (distance > moveThreshold) {
      clear();
    }
  }, [handlers.cancelOnMove, moveThreshold]);

  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }
    startPos.current = null;
  }, []);

  return {
    onTouchStart: start,
    onMouseDown: start,
    onTouchMove: move,
    onMouseMove: move,
    onTouchEnd: clear,
    onMouseUp: clear,
    onTouchCancel: clear,
    onMouseLeave: clear,
  };
}

/**
 * Hook for double tap detection
 */
export function useDoubleTap(onDoubleTap: () => void, delay = 300) {
  const lastTap = useRef<number>(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < delay) {
      onDoubleTap();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [onDoubleTap, delay]);

  return {
    onTouchEnd: handleTap,
    onClick: handleTap,
  };
}

/**
 * Combined touch gesture hook for iPad optimization
 */
export function useIPadGestures(options?: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinch?: (scale: number) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}) {
  const swipeHandlers = useSwipe({
    onSwipeLeft: options?.onSwipeLeft,
    onSwipeRight: options?.onSwipeRight,
    threshold: 50,
  });

  const pinchHandlers = usePinch({
    onPinchIn: options?.onPinch,
    onPinchOut: options?.onPinch,
    minScale: 1,
    maxScale: 3,
  });

  const doubleTapHandlers = useDoubleTap(
    options?.onDoubleTap || (() => {}),
    300
  );

  const longPressHandlers = useLongPress({
    onLongPress: options?.onLongPress || (() => {}),
    delay: 500,
    cancelOnMove: true,
  });

  return {
    ...swipeHandlers,
    ...pinchHandlers,
    ...doubleTapHandlers,
    ...longPressHandlers,
  };
}

/**
 * Hook to detect if device is touch-enabled
 */
export function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);

    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  return isTouch;
}

/**
 * Hook to detect if device is an iPad
 */
export function useIPad() {
  const [isIPad, setIsIPad] = useState(false);

  useEffect(() => {
    const checkIPad = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIPadUA = /ipad/.test(userAgent);
      const isIPadPro = /macintosh/.test(userAgent) && 'ontouchstart' in window;

      setIsIPad(isIPadUA || isIPadPro);
    };

    checkIPad();
  }, []);

  return isIPad;
}
