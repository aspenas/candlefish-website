/**
 * Custom hook for gesture handling
 * Provides gesture recognizers and handlers for the mobile app
 */

import { useCallback, useMemo } from 'react';
import {
  Gesture,
  GestureDetector,
  PanGesture,
  TapGesture,
  PinchGesture,
  RotationGesture,
} from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Dimensions, Haptics } from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GestureConfig {
  enablePan?: boolean;
  enableTap?: boolean;
  enableDoubleTap?: boolean;
  enableLongPress?: boolean;
  enablePinch?: boolean;
  enableRotation?: boolean;
  boundaries?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
  hapticFeedback?: boolean;
}

interface GestureCallbacks {
  onPanStart?: (event: any) => void;
  onPanUpdate?: (event: any) => void;
  onPanEnd?: (event: any) => void;
  onTap?: (event: any) => void;
  onDoubleTap?: (event: any) => void;
  onLongPress?: (event: any) => void;
  onPinchStart?: (event: any) => void;
  onPinchUpdate?: (event: any) => void;
  onPinchEnd?: (event: any) => void;
  onRotationStart?: (event: any) => void;
  onRotationUpdate?: (event: any) => void;
  onRotationEnd?: (event: any) => void;
}

const defaultConfig: GestureConfig = {
  enablePan: true,
  enableTap: true,
  enableDoubleTap: false,
  enableLongPress: false,
  enablePinch: false,
  enableRotation: false,
  hapticFeedback: true,
};

export const useGestures = (
  config: GestureConfig = {},
  callbacks: GestureCallbacks = {}
) => {
  const finalConfig = { ...defaultConfig, ...config };

  // Shared values for animations
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Context values for gesture state
  const context = useSharedValue({ x: 0, y: 0, scale: 1, rotation: 0 });

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (finalConfig.hapticFeedback) {
      HapticFeedback.trigger('impact' + type.charAt(0).toUpperCase() + type.slice(1));
    }
  }, [finalConfig.hapticFeedback]);

  // Pan gesture
  const panGesture = useMemo(() => {
    if (!finalConfig.enablePan) return null;

    return Gesture.Pan()
      .onStart((event) => {
        context.value = {
          ...context.value,
          x: translateX.value,
          y: translateY.value,
        };
        
        if (callbacks.onPanStart) {
          runOnJS(callbacks.onPanStart)(event);
        }
      })
      .onUpdate((event) => {
        const newX = context.value.x + event.translationX;
        const newY = context.value.y + event.translationY;

        // Apply boundaries if specified
        if (finalConfig.boundaries) {
          const { minX = -Infinity, maxX = Infinity, minY = -Infinity, maxY = Infinity } = finalConfig.boundaries;
          translateX.value = Math.max(minX, Math.min(maxX, newX));
          translateY.value = Math.max(minY, Math.min(maxY, newY));
        } else {
          translateX.value = newX;
          translateY.value = newY;
        }

        if (callbacks.onPanUpdate) {
          runOnJS(callbacks.onPanUpdate)(event);
        }
      })
      .onEnd((event) => {
        // Add momentum and spring back if needed
        const velocity = Math.sqrt(event.velocityX ** 2 + event.velocityY ** 2);
        
        if (velocity > 1000) {
          // High velocity - add momentum
          translateX.value = withSpring(translateX.value + event.velocityX * 0.1);
          translateY.value = withSpring(translateY.value + event.velocityY * 0.1);
        } else {
          // Low velocity - spring back to bounds
          translateX.value = withSpring(translateX.value);
          translateY.value = withSpring(translateY.value);
        }

        if (callbacks.onPanEnd) {
          runOnJS(callbacks.onPanEnd)(event);
        }
      });
  }, [finalConfig.enablePan, finalConfig.boundaries, callbacks, context, translateX, translateY]);

  // Tap gesture
  const tapGesture = useMemo(() => {
    if (!finalConfig.enableTap) return null;

    return Gesture.Tap()
      .onStart(() => {
        if (callbacks.onTap) {
          runOnJS(triggerHaptic)('light');
        }
      })
      .onEnd((event) => {
        if (callbacks.onTap) {
          runOnJS(callbacks.onTap)(event);
        }
      });
  }, [finalConfig.enableTap, callbacks, triggerHaptic]);

  // Double tap gesture
  const doubleTapGesture = useMemo(() => {
    if (!finalConfig.enableDoubleTap) return null;

    return Gesture.Tap()
      .numberOfTaps(2)
      .onStart(() => {
        runOnJS(triggerHaptic)('medium');
      })
      .onEnd((event) => {
        if (callbacks.onDoubleTap) {
          runOnJS(callbacks.onDoubleTap)(event);
        }
      });
  }, [finalConfig.enableDoubleTap, callbacks, triggerHaptic]);

  // Long press gesture
  const longPressGesture = useMemo(() => {
    if (!finalConfig.enableLongPress) return null;

    return Gesture.LongPress()
      .minDuration(600)
      .onStart(() => {
        runOnJS(triggerHaptic)('heavy');
        scale.value = withSpring(0.95);
      })
      .onEnd((event) => {
        scale.value = withSpring(1);
        if (callbacks.onLongPress) {
          runOnJS(callbacks.onLongPress)(event);
        }
      })
      .onTouchesUp(() => {
        scale.value = withSpring(1);
      });
  }, [finalConfig.enableLongPress, callbacks, triggerHaptic, scale]);

  // Pinch gesture
  const pinchGesture = useMemo(() => {
    if (!finalConfig.enablePinch) return null;

    return Gesture.Pinch()
      .onStart((event) => {
        context.value = {
          ...context.value,
          scale: scale.value,
        };
        
        if (callbacks.onPinchStart) {
          runOnJS(callbacks.onPinchStart)(event);
        }
      })
      .onUpdate((event) => {
        const newScale = context.value.scale * event.scale;
        // Constrain scale between 0.5x and 3x
        scale.value = Math.max(0.5, Math.min(3, newScale));

        if (callbacks.onPinchUpdate) {
          runOnJS(callbacks.onPinchUpdate)(event);
        }
      })
      .onEnd((event) => {
        // Snap to common scale values
        const currentScale = scale.value;
        let targetScale = currentScale;

        if (currentScale < 0.75) {
          targetScale = 0.5;
        } else if (currentScale < 1.25) {
          targetScale = 1;
        } else if (currentScale < 1.75) {
          targetScale = 1.5;
        } else if (currentScale < 2.25) {
          targetScale = 2;
        } else {
          targetScale = 3;
        }

        scale.value = withSpring(targetScale);

        if (callbacks.onPinchEnd) {
          runOnJS(callbacks.onPinchEnd)(event);
        }
      });
  }, [finalConfig.enablePinch, callbacks, context, scale]);

  // Rotation gesture
  const rotationGesture = useMemo(() => {
    if (!finalConfig.enableRotation) return null;

    return Gesture.Rotation()
      .onStart((event) => {
        context.value = {
          ...context.value,
          rotation: rotation.value,
        };
        
        if (callbacks.onRotationStart) {
          runOnJS(callbacks.onRotationStart)(event);
        }
      })
      .onUpdate((event) => {
        rotation.value = context.value.rotation + event.rotation;

        if (callbacks.onRotationUpdate) {
          runOnJS(callbacks.onRotationUpdate)(event);
        }
      })
      .onEnd((event) => {
        // Snap to 90-degree increments
        const degrees = (rotation.value * 180) / Math.PI;
        const snappedDegrees = Math.round(degrees / 90) * 90;
        rotation.value = withSpring((snappedDegrees * Math.PI) / 180);

        if (callbacks.onRotationEnd) {
          runOnJS(callbacks.onRotationEnd)(event);
        }
      });
  }, [finalConfig.enableRotation, callbacks, context, rotation]);

  // Compose gestures
  const composedGesture = useMemo(() => {
    const gestures = [
      doubleTapGesture,
      tapGesture,
      longPressGesture,
      panGesture,
      pinchGesture,
      rotationGesture,
    ].filter(Boolean);

    if (gestures.length === 0) return null;

    return Gesture.Race(...gestures);
  }, [doubleTapGesture, tapGesture, longPressGesture, panGesture, pinchGesture, rotationGesture]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
    opacity: opacity.value,
  }));

  // Reset function
  const reset = useCallback(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    scale.value = withSpring(1);
    rotation.value = withSpring(0);
    opacity.value = withTiming(1);
  }, [translateX, translateY, scale, rotation, opacity]);

  // Animate to position
  const animateTo = useCallback((
    x: number = 0,
    y: number = 0,
    scaleValue: number = 1,
    rotationValue: number = 0,
    opacityValue: number = 1
  ) => {
    translateX.value = withSpring(x);
    translateY.value = withSpring(y);
    scale.value = withSpring(scaleValue);
    rotation.value = withSpring(rotationValue);
    opacity.value = withTiming(opacityValue);
  }, [translateX, translateY, scale, rotation, opacity]);

  return {
    // Gesture
    gesture: composedGesture,
    
    // Animated styles
    animatedStyle,
    
    // Shared values (for custom animations)
    translateX,
    translateY,
    scale,
    rotation,
    opacity,
    
    // Utility functions
    reset,
    animateTo,
    triggerHaptic,
  };
};

/**
 * Hook for swipe gestures specifically
 */
export const useSwipeGestures = (
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold: number = 50,
  hapticFeedback: boolean = true
) => {
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (hapticFeedback) {
      HapticFeedback.trigger('impact' + type.charAt(0).toUpperCase() + type.slice(1));
    }
  }, [hapticFeedback]);

  const swipeGesture = useMemo(() => {
    return Gesture.Pan()
      .onEnd((event) => {
        const { translationX, translationY, velocityX, velocityY } = event;
        
        // Determine primary direction based on velocity and translation
        const absTranslationX = Math.abs(translationX);
        const absTranslationY = Math.abs(translationY);
        const absVelocityX = Math.abs(velocityX);
        const absVelocityY = Math.abs(velocityY);

        if (absTranslationX > threshold || absVelocityX > 500) {
          if (translationX > 0 && onSwipeRight) {
            runOnJS(triggerHaptic)('light');
            runOnJS(onSwipeRight)();
          } else if (translationX < 0 && onSwipeLeft) {
            runOnJS(triggerHaptic)('light');
            runOnJS(onSwipeLeft)();
          }
        } else if (absTranslationY > threshold || absVelocityY > 500) {
          if (translationY > 0 && onSwipeDown) {
            runOnJS(triggerHaptic)('light');
            runOnJS(onSwipeDown)();
          } else if (translationY < 0 && onSwipeUp) {
            runOnJS(triggerHaptic)('light');
            runOnJS(onSwipeUp)();
          }
        }
      });
  }, [onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight, threshold, triggerHaptic]);

  return swipeGesture;
};

/**
 * Hook for pull-to-refresh gesture
 */
export const usePullToRefresh = (
  onRefresh: () => void,
  threshold: number = 80,
  hapticFeedback: boolean = true
) => {
  const translateY = useSharedValue(0);
  const isRefreshing = useSharedValue(false);

  const triggerHaptic = useCallback(() => {
    if (hapticFeedback) {
      HapticFeedback.trigger('impactMedium');
    }
  }, [hapticFeedback]);

  const pullGesture = useMemo(() => {
    return Gesture.Pan()
      .onUpdate((event) => {
        if (event.translationY > 0 && !isRefreshing.value) {
          translateY.value = Math.min(event.translationY, threshold * 1.5);
        }
      })
      .onEnd((event) => {
        if (event.translationY > threshold && !isRefreshing.value) {
          isRefreshing.value = true;
          runOnJS(triggerHaptic)();
          runOnJS(onRefresh)();
        }
        
        translateY.value = withSpring(0);
      });
  }, [onRefresh, threshold, triggerHaptic, translateY, isRefreshing]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const finishRefresh = useCallback(() => {
    isRefreshing.value = false;
  }, [isRefreshing]);

  return {
    gesture: pullGesture,
    animatedStyle,
    finishRefresh,
    translateY,
  };
};