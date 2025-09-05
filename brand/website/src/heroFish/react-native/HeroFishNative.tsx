import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  Vibration,
  Platform,
  AccessibilityInfo,
  AppState,
  Text,
  Pressable,
} from 'react-native';
import Canvas from 'react-native-canvas';
import { accelerometer, gyroscope, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { HapticFeedbackTypes, trigger } from 'react-native-haptic-feedback';

interface HeroFishNativeProps {
  enableTouch?: boolean;
  enableSensors?: boolean;
  enableHaptics?: boolean;
  enableOffline?: boolean;
  onStateChange?: (state: string) => void;
  onPerformance?: (metrics: any) => void;
}

const HeroFishNative: React.FC<HeroFishNativeProps> = ({
  enableTouch = true,
  enableSensors = true,
  enableHaptics = true,
  enableOffline = true,
  onStateChange,
  onPerformance,
}) => {
  const canvasRef = useRef<Canvas>(null);
  const fishRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [fishState, setFishState] = useState('idle');
  const [performance, setPerformance] = useState({ fps: 60, tier: 'T1' });
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Touch handling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enableTouch,
      onMoveShouldSetPanResponder: () => enableTouch,
      onPanResponderMove: (evt, gestureState) => {
        if (fishRef.current && canvasRef.current) {
          const { dx, dy } = gestureState;
          fishRef.current.handleTouch?.(dx, dy);
          
          if (enableHaptics && Math.abs(dx) > 10) {
            trigger(HapticFeedbackTypes.selection);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { vx, vy } = gestureState;
        if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
          fishRef.current?.triggerDart?.();
          if (enableHaptics) {
            trigger(HapticFeedbackTypes.impactMedium);
          }
        }
      },
    })
  ).current;

  // Sensor integration
  useEffect(() => {
    if (!enableSensors) return;

    // Set sensor update interval
    setUpdateIntervalForType(SensorTypes.accelerometer, 100);
    setUpdateIntervalForType(SensorTypes.gyroscope, 100);

    const accelerometerSub = accelerometer.subscribe(({
      x, y, z,
    }) => {
      if (fishRef.current) {
        // Use accelerometer data to influence fish movement
        fishRef.current.setSensorInfluence?.({ x, y, z });
      }
    });

    const gyroscopeSub = gyroscope.subscribe(({
      x, y, z,
    }) => {
      if (fishRef.current) {
        // Use gyroscope for rotation effects
        fishRef.current.setRotationInfluence?.({ x, y, z });
      }
    });

    return () => {
      accelerometerSub.unsubscribe();
      gyroscopeSub.unsubscribe();
    };
  }, [enableSensors]);

  // Accessibility
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setIsReducedMotion(enabled);
      if (fishRef.current) {
        fishRef.current.setReducedMotion?.(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setIsReducedMotion(enabled);
        fishRef.current?.setReducedMotion?.(enabled);
      }
    );

    return () => subscription?.remove();
  }, []);

  // App state handling
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fishRef.current?.resume?.();
      } else {
        fishRef.current?.pause?.();
      }
    });

    return () => subscription?.remove();
  }, []);

  // Network and offline support
  useEffect(() => {
    if (!enableOffline) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (fishRef.current) {
        fishRef.current.setNetworkQuality?.(state.isConnected, state.type);
      }
    });

    return () => unsubscribe();
  }, [enableOffline]);

  // Initialize canvas
  useEffect(() => {
    const initializeCanvas = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      // Import fish logic (would need to be adapted for RN)
      // For now, we'll create a simplified version
      const ctx = canvas.getContext('2d');
      
      let x = dimensions.width / 2;
      let y = dimensions.height / 2;
      let vx = 0;
      let vy = 0;
      let state = 'idle';
      let frame = 0;

      // Simplified fish object
      fishRef.current = {
        handleTouch: (dx: number, dy: number) => {
          vx += dx * 0.01;
          vy += dy * 0.01;
        },
        triggerDart: () => {
          state = 'dart';
          vx *= 3;
          vy *= 3;
          setFishState('dart');
          onStateChange?.('dart');
          
          setTimeout(() => {
            state = 'recover';
            setFishState('recover');
            onStateChange?.('recover');
            
            setTimeout(() => {
              state = 'idle';
              setFishState('idle');
              onStateChange?.('idle');
            }, 2000);
          }, 500);
        },
        setSensorInfluence: (data: any) => {
          vx += data.x * 0.5;
          vy += data.y * 0.5;
        },
        setRotationInfluence: (data: any) => {
          // Rotation logic
        },
        setReducedMotion: (enabled: boolean) => {
          if (enabled) {
            vx = 0;
            vy = 0;
          }
        },
        pause: () => {
          // Pause animation
        },
        resume: () => {
          // Resume animation
        },
        setNetworkQuality: (connected: boolean, type: string) => {
          // Adjust quality based on network
        },
      };

      // Animation loop
      const animate = () => {
        if (!ctx) return;
        
        frame++;
        
        // Clear canvas
        ctx.clearRect(0, 0, dimensions.width, dimensions.height);
        
        // Update position
        x += vx;
        y += vy;
        
        // Boundary collision
        if (x < 20 || x > dimensions.width - 20) {
          vx *= -0.8;
          x = Math.max(20, Math.min(dimensions.width - 20, x));
        }
        if (y < 20 || y > dimensions.height - 20) {
          vy *= -0.8;
          y = Math.max(20, Math.min(dimensions.height - 20, y));
        }
        
        // Friction
        vx *= 0.98;
        vy *= 0.98;
        
        // Draw background
        ctx.fillStyle = '#3A3A60';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        
        // Draw fish glow
        if (state === 'dart') {
          ctx.shadowBlur = 30;
          ctx.shadowColor = '#FFB347';
        } else {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#FFB347';
        }
        
        // Draw fish body
        ctx.fillStyle = '#FFB347';
        ctx.beginPath();
        ctx.ellipse(x, y, 20, 10, vx * 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw tail
        ctx.beginPath();
        ctx.moveTo(x - 15, y);
        ctx.lineTo(x - 25 - Math.abs(vx), y - 5);
        ctx.lineTo(x - 25 - Math.abs(vx), y + 5);
        ctx.closePath();
        ctx.fill();
        
        // Draw eye
        ctx.fillStyle = '#FAFAF8';
        ctx.beginPath();
        ctx.arc(x + 8, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Performance monitoring
        if (frame % 60 === 0) {
          const metrics = {
            fps: 60, // Would calculate actual FPS
            tier: 'T1',
            state,
          };
          setPerformance(metrics);
          onPerformance?.(metrics);
        }
        
        requestAnimationFrame(animate);
      };
      
      animate();

      // Store offline data
      if (enableOffline) {
        await AsyncStorage.setItem('herofish_state', JSON.stringify({ x, y, state }));
      }
    };

    initializeCanvas();
  }, [dimensions, enableOffline, onStateChange, onPerformance]);

  // Handle dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas ref={canvasRef} style={styles.canvas} />
      
      {/* Performance overlay */}
      <View style={styles.overlay}>
        <View style={styles.performanceBar}>
          <Text style={styles.performanceText}>
            FPS: {performance.fps} | {performance.tier}
          </Text>
          {fishState !== 'idle' && (
            <Text style={styles.stateText}>{fishState.toUpperCase()}</Text>
          )}
        </View>
        
        {/* Control buttons for accessibility */}
        <View style={styles.controls}>
          <Pressable
            style={styles.controlButton}
            onPress={() => fishRef.current?.triggerDart?.()}
            accessible={true}
            accessibilityLabel="Trigger fish dart"
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>DART</Text>
          </Pressable>
        </View>
      </View>
      
      {isReducedMotion && (
        <View style={styles.reducedMotionNotice}>
          <Text style={styles.noticeText}>Animation paused (Reduced Motion)</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A3A60',
  },
  canvas: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
  },
  performanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 8,
  },
  performanceText: {
    color: '#FAFAF8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  stateText: {
    color: '#FFB347',
    fontWeight: 'bold',
    fontSize: 12,
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 179, 71, 0.2)',
    borderWidth: 1,
    borderColor: '#FFB347',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonText: {
    color: '#FFB347',
    fontWeight: 'bold',
  },
  reducedMotionNotice: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  noticeText: {
    color: '#FAFAF8',
    textAlign: 'center',
    fontSize: 12,
  },
});

export default HeroFishNative;