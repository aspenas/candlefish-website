/**
 * React Native Fish Canvas Component
 * Cross-platform animation using React Native Skia, Reanimated 3, and Gesture Handler
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, Dimensions, StyleSheet, Platform } from 'react-native'
import { Canvas, Path, Skia, useComputedValue, useValue, runTiming, 
         Circle, Group, RadialGradient, vec, LinearGradient,
         useTouchHandler, TouchInfo, SkiaValue, useClockValue, useValueEffect } from '@shopify/react-native-skia'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue, useDerivedValue, withTiming, 
         withSpring, withRepeat, withSequence, Easing } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { FishEngine, type Point, type FishEngineConfig, type PlatformCapabilities } from '../core/FishEngine'
import { HapticService } from '../services/HapticService'
import { SensorService } from '../services/SensorService'
import { PerformanceService } from '../services/PerformanceService'

interface ReactNativeFishCanvasProps {
  style?: any
  width?: number
  height?: number
  enableHaptics?: boolean
  enableSensors?: boolean
  enablePerformanceAdaptation?: boolean
  onFishStateChange?: (state: 'idle' | 'dart' | 'feeding') => void
  onPerformanceUpdate?: (fps: number, qualityTier: string) => void
}

interface FishRenderData {
  position: Point
  angle: number
  glowIntensity: number
  eyeDilation: number
  finSpread: number
  bodyTension: number
  moodColor: { r: number; g: number; b: number; a: number }
  trail: Point[]
}

export const ReactNativeFishCanvas: React.FC<ReactNativeFishCanvasProps> = ({
  style,
  width: propWidth,
  height: propHeight,
  enableHaptics = true,
  enableSensors = true,
  enablePerformanceAdaptation = true,
  onFishStateChange,
  onPerformanceUpdate
}) => {
  const insets = useSafeAreaInsets()
  const screenData = Dimensions.get('window')
  
  // Canvas dimensions
  const canvasWidth = propWidth || screenData.width
  const canvasHeight = propHeight || (screenData.height - insets.top - insets.bottom) * 0.4
  
  // Services
  const hapticService = useRef<HapticService>(new HapticService()).current
  const sensorService = useRef<SensorService>(new SensorService()).current
  const performanceService = useRef<PerformanceService>(new PerformanceService()).current
  
  // Engine state
  const fishEngine = useRef<FishEngine | null>(null)
  const animationFrameId = useRef<number | null>(null)
  const lastFrameTime = useRef<number>(0)
  
  // Skia animation values
  const clock = useClockValue()
  const fishX = useValue(canvasWidth * 0.3)
  const fishY = useValue(canvasHeight * 0.5)
  const fishAngle = useValue(0)
  const glowIntensity = useValue(0.8)
  const eyeDilation = useValue(0.5)
  const finSpread = useValue(0.5)
  const bodyTension = useValue(0.3)
  
  // Mood colors (Skia colors)
  const moodColorR = useValue(255)
  const moodColorG = useValue(179)
  const moodColorB = useValue(71)
  const moodColorA = useValue(1)
  
  // Trail system
  const trailPoints = useRef<SkiaValue<number>[]>([])
  const maxTrailLength = 20
  
  // Touch interaction
  const touchPosition = useSharedValue<Point | null>(null)
  const touchActive = useSharedValue(false)
  
  // Performance metrics
  const [fps, setFPS] = useState(60)
  const [qualityTier, setQualityTier] = useState('high')
  const frameCount = useRef(0)
  const fpsStartTime = useRef(Date.now())
  
  /**
   * Initialize Fish Engine with platform capabilities
   */
  const initializeFishEngine = useCallback(async () => {
    try {
      // Detect platform capabilities
      const capabilities: PlatformCapabilities = {
        hasHaptics: enableHaptics && Platform.OS !== 'web',
        hasDeviceMotion: enableSensors,
        hasBatteryAPI: Platform.OS !== 'web',
        hasNetworkInfo: true,
        supportsMetal: Platform.OS === 'ios',
        supportsOpenGL: Platform.OS === 'android',
        maxTextureSize: 4096,
        devicePixelRatio: screenData.scale
      }
      
      // Performance configuration based on device
      const performanceConfig = await performanceService.getOptimalConfig()
      
      const config: FishEngineConfig = {
        bounds: { width: canvasWidth, height: canvasHeight },
        capabilities,
        performance: performanceConfig,
        enableEmotionalAI: true,
        enableMemorySystem: true,
        enableParticleSystem: true
      }
      
      // Create persistence adapter for AsyncStorage
      const persistenceAdapter = {
        save: async (data: any) => {
          await AsyncStorage.setItem('candlefish_memory', JSON.stringify(data))
        },
        load: async () => {
          const stored = await AsyncStorage.getItem('candlefish_memory')
          return stored ? JSON.parse(stored) : null
        }
      }
      
      fishEngine.current = new FishEngine(config, persistenceAdapter)
      await fishEngine.current.initialize()
      
      console.log('Fish engine initialized with capabilities:', capabilities)
    } catch (error) {
      console.error('Failed to initialize fish engine:', error)
    }
  }, [canvasWidth, canvasHeight, enableHaptics, enableSensors])
  
  /**
   * Initialize trail points for Skia animation
   */
  const initializeTrailPoints = useCallback(() => {
    trailPoints.current = []
    for (let i = 0; i < maxTrailLength; i++) {
      trailPoints.current.push(useValue(fishX.current))
      trailPoints.current.push(useValue(fishY.current))
    }
  }, [fishX, fishY])
  
  /**
   * Update fish engine and sync with Skia values
   */
  const updateFishEngine = useCallback(() => {
    if (!fishEngine.current) return
    
    const currentTime = Date.now()
    const deltaTime = currentTime - lastFrameTime.current
    lastFrameTime.current = currentTime
    
    // Update fish engine
    fishEngine.current.update(deltaTime)
    
    // Get updated fish data
    const fish = fishEngine.current.getFish()
    const moodColor = fishEngine.current.getMoodColor()
    
    // Update Skia values with smooth animations
    runTiming(fishX, fish.position.x, { duration: 16 })
    runTiming(fishY, fish.position.y, { duration: 16 })
    runTiming(fishAngle, fish.angle, { duration: 32 })
    runTiming(glowIntensity, fish.glowIntensity, { duration: 100 })
    runTiming(eyeDilation, fish.eyeDilation, { duration: 200 })
    runTiming(finSpread, fish.finSpread, { duration: 300 })
    runTiming(bodyTension, fish.bodyTension, { duration: 400 })
    
    // Update mood colors
    runTiming(moodColorR, moodColor.r, { duration: 500 })
    runTiming(moodColorG, moodColor.g, { duration: 500 })
    runTiming(moodColorB, moodColor.b, { duration: 500 })
    runTiming(moodColorA, moodColor.a, { duration: 500 })
    
    // Update trail points
    if (trailPoints.current.length >= 4) {
      // Shift trail points
      for (let i = trailPoints.current.length - 2; i >= 2; i -= 2) {
        trailPoints.current[i].current = trailPoints.current[i - 2].current
        trailPoints.current[i + 1].current = trailPoints.current[i - 1].current
      }
      // Set new head position
      trailPoints.current[0].current = fish.position.x
      trailPoints.current[1].current = fish.position.y
    }
    
    // Performance tracking
    frameCount.current++
    if (frameCount.current % 60 === 0) {
      const now = Date.now()
      const elapsed = now - fpsStartTime.current
      const currentFPS = Math.round((60 * 1000) / elapsed)
      setFPS(currentFPS)
      fpsStartTime.current = now
      
      if (onPerformanceUpdate) {
        onPerformanceUpdate(currentFPS, qualityTier)
      }
      
      // Adapt performance if enabled
      if (enablePerformanceAdaptation) {
        performanceService.adaptToPerformance(currentFPS, (newTier) => {
          setQualityTier(newTier)
        })
      }
    }
    
    // Handle haptic feedback for dart states
    if (enableHaptics && fish.dartCooldown > 35) { // Just started dart
      hapticService.impactLight()
    }
    
    // Callback for state changes
    if (onFishStateChange) {
      onFishStateChange(fish.swimPattern === 'feeding' ? 'feeding' : 
                       fish.dartCooldown > 0 ? 'dart' : 'idle')
    }
  }, [
    fishX, fishY, fishAngle, glowIntensity, eyeDilation, finSpread, bodyTension,
    moodColorR, moodColorG, moodColorB, moodColorA,
    enableHaptics, enablePerformanceAdaptation, onPerformanceUpdate, onFishStateChange
  ])
  
  /**
   * Animation loop
   */
  const startAnimationLoop = useCallback(() => {
    const animate = () => {
      updateFishEngine()
      animationFrameId.current = requestAnimationFrame(animate)
    }
    
    lastFrameTime.current = Date.now()
    animationFrameId.current = requestAnimationFrame(animate)
  }, [updateFishEngine])
  
  const stopAnimationLoop = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }
  }, [])
  
  /**
   * Touch gesture handling
   */
  const touchGesture = Gesture.Manual()
    .onBegin((event) => {
      const position = { x: event.x, y: event.y }
      touchPosition.value = position
      touchActive.value = true
      
      runOnJS(() => {
        if (fishEngine.current) {
          fishEngine.current.handleTouch(position, 'tap')
        }
        if (enableHaptics) {
          hapticService.selectionChanged()
        }
      })()
    })
    .onUpdate((event) => {
      const position = { x: event.x, y: event.y }
      touchPosition.value = position
      
      runOnJS(() => {
        if (fishEngine.current) {
          fishEngine.current.handleTouch(position, 'move')
        }
      })()
    })
    .onEnd(() => {
      runOnJS(() => {
        if (fishEngine.current) {
          fishEngine.current.handleTouch({ x: 0, y: 0 }, 'release')
        }
      })()
      
      touchActive.value = false
      touchPosition.value = null
    })
  
  /**
   * Computed values for rendering
   */
  const currentMoodColor = useComputedValue(() => {
    return `rgba(${moodColorR.current}, ${moodColorG.current}, ${moodColorB.current}, ${moodColorA.current})`
  }, [moodColorR, moodColorG, moodColorB, moodColorA])
  
  const fishPath = useComputedValue(() => {
    const path = Skia.Path.Make()
    
    // Body with tension affecting curve
    const bodyWidth = 3 + (1 - bodyTension.current) * 2
    const bodyHeight = 4 - bodyTension.current
    
    // Create fish body path
    path.moveTo(12, 0)
    path.quadTo(8, -bodyHeight, 0, -bodyWidth)
    path.quadTo(-8, -bodyWidth + 1, -12, 0)
    path.quadTo(-8, bodyWidth - 1, 0, bodyWidth)
    path.quadTo(8, bodyHeight, 12, 0)
    path.close()
    
    return path
  }, [bodyTension])
  
  const tailPath = useComputedValue(() => {
    const path = Skia.Path.Make()
    const tailSpread = 4 + finSpread.current * 3
    
    path.moveTo(-12, 0)
    path.lineTo(-18, -tailSpread)
    path.lineTo(-20, 0)
    path.lineTo(-18, tailSpread)
    path.close()
    
    return path
  }, [finSpread])
  
  const trailPath = useComputedValue(() => {
    const path = Skia.Path.Make()
    if (trailPoints.current.length < 4) return path
    
    path.moveTo(trailPoints.current[0].current, trailPoints.current[1].current)
    
    for (let i = 2; i < trailPoints.current.length - 2; i += 2) {
      const x = trailPoints.current[i].current
      const y = trailPoints.current[i + 1].current
      if (i === 2) {
        path.lineTo(x, y)
      } else {
        path.lineTo(x, y)
      }
    }
    
    return path
  }, trailPoints.current)
  
  // Initialization effect
  useEffect(() => {
    initializeFishEngine()
    initializeTrailPoints()
    
    return () => {
      stopAnimationLoop()
      if (fishEngine.current) {
        fishEngine.current.dispose()
      }
    }
  }, [initializeFishEngine, initializeTrailPoints, stopAnimationLoop])
  
  // Start animation when engine is ready
  useEffect(() => {
    if (fishEngine.current) {
      fishEngine.current.start()
      startAnimationLoop()
      
      return () => {
        fishEngine.current?.stop()
        stopAnimationLoop()
      }
    }
  }, [startAnimationLoop, stopAnimationLoop])
  
  // Sensor integration
  useEffect(() => {
    if (enableSensors) {
      const unsubscribe = sensorService.subscribeToOrientation((data) => {
        // Apply subtle fish movement based on device tilt
        if (fishEngine.current) {
          const tiltX = data.gamma * 0.1 // Convert to movement influence
          const tiltY = data.beta * 0.05
          
          // This could influence fish behavior subtly
          // Implementation would depend on specific sensor integration needs
        }
      })
      
      return unsubscribe
    }
  }, [enableSensors])
  
  return (
    <View style={[styles.container, style, { width: canvasWidth, height: canvasHeight }]}>
      <GestureDetector gesture={touchGesture}>
        <Canvas style={styles.canvas}>
          {/* Background gradient */}
          <Group>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, canvasHeight)}
              colors={['#2a1a4e', '#1a1a2e']}
            />
          </Group>
          
          {/* Trail */}
          <Group>
            <Path
              path={trailPath}
              style="stroke"
              strokeWidth={2}
              color={currentMoodColor}
              opacity={0.3}
              strokeCap="round"
            />
          </Group>
          
          {/* Ripples */}
          {touchPosition.value && (
            <Group>
              <Circle
                cx={touchPosition.value.x}
                cy={touchPosition.value.y}
                r={50}
                style="stroke"
                strokeWidth={1.5}
                color={currentMoodColor}
                opacity={0.4}
              />
            </Group>
          )}
          
          {/* Fish body */}
          <Group transform={[
            { translateX: fishX },
            { translateY: fishY },
            { rotate: fishAngle }
          ]}>
            {/* Glow effect */}
            <Group>
              <Path
                path={fishPath}
                style="stroke"
                strokeWidth={3}
                color={currentMoodColor}
                opacity={0.6}
              >
                <RadialGradient
                  c={vec(0, 0)}
                  r={20}
                  colors={[currentMoodColor.current, 'transparent']}
                />
              </Path>
            </Group>
            
            {/* Main body */}
            <Path
              path={fishPath}
              style="stroke"
              strokeWidth={1.5 + finSpread.current * 0.5}
              color={currentMoodColor}
              strokeCap="round"
              strokeJoin="round"
            />
            
            {/* Tail */}
            <Path
              path={tailPath}
              style="stroke"
              strokeWidth={1.5}
              color={currentMoodColor}
              strokeCap="round"
              strokeJoin="round"
            />
            
            {/* Side fins */}
            {finSpread.current > 0.3 && (
              <Group>
                <Path
                  path={Skia.Path.MakeFromSVGString('M-2,-2 L-6,-4 M-2,2 L-6,4') || Skia.Path.Make()}
                  style="stroke"
                  strokeWidth={1}
                  color={currentMoodColor}
                  strokeCap="round"
                />
              </Group>
            )}
            
            {/* Eye */}
            <Circle
              cx={6}
              cy={0}
              r={1.2 + eyeDilation.current * 0.8}
              color={currentMoodColor}
              opacity={0.8 * glowIntensity.current}
            />
            
            {/* Pupil */}
            {eyeDilation.current > 0.6 && (
              <Circle
                cx={6}
                cy={0}
                r={(1.2 + eyeDilation.current * 0.8) * (1 - eyeDilation.current) * 0.5}
                color="black"
                opacity={0.7}
              />
            )}
          </Group>
          
          {/* Particles (food and bubbles) */}
          <Group>
            {/* This would render particles from fishEngine.current?.getParticles() */}
            {/* Implementation depends on real-time particle data integration */}
          </Group>
        </Canvas>
      </GestureDetector>
      
      {/* Debug info */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <View style={styles.debugText}>
            <Text style={styles.debugLabel}>FPS: {fps}</Text>
            <Text style={styles.debugLabel}>Quality: {qualityTier}</Text>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    overflow: 'hidden'
  },
  canvas: {
    flex: 1
  },
  debugInfo: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4
  },
  debugText: {
    flexDirection: 'column'
  },
  debugLabel: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'monospace'
  }
})

export default ReactNativeFishCanvas