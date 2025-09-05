/**
 * Cross-Platform Device Sensor Service
 * Provides unified sensor access for device orientation, motion, and other sensors
 */

import { Platform } from 'react-native'
import { DeviceMotion } from 'expo-sensors'
import { setUpdateIntervalForType, SensorTypes } from 'react-native-sensors'
import { accelerometer, gyroscope, magnetometer } from 'react-native-sensors'

export interface OrientationData {
  alpha: number  // Z-axis rotation (compass heading)
  beta: number   // X-axis rotation (front-to-back tilt)
  gamma: number  // Y-axis rotation (left-to-right tilt)
  timestamp: number
}

export interface AccelerationData {
  x: number
  y: number
  z: number
  timestamp: number
}

export interface GyroscopeData {
  x: number
  y: number
  z: number
  timestamp: number
}

export interface MagnetometerData {
  x: number
  y: number
  z: number
  accuracy: number
  timestamp: number
}

export interface MotionData {
  acceleration: AccelerationData
  gyroscope: GyroscopeData
  orientation: OrientationData
  timestamp: number
}

export interface SensorCapabilities {
  hasAccelerometer: boolean
  hasGyroscope: boolean
  hasMagnetometer: boolean
  hasDeviceMotion: boolean
  hasOrientation: boolean
  supportsHighFrequency: boolean
  platform: 'ios' | 'android' | 'web'
}

export type SensorCallback<T> = (data: T) => void
export type SensorUnsubscribe = () => void

export class SensorService {
  private capabilities: SensorCapabilities
  private isEnabled: boolean = true
  private updateInterval: number = 100 // ms
  
  // Subscription tracking
  private subscriptions = new Map<string, any>()
  private motionSubscription: any = null
  
  constructor() {
    this.capabilities = this.detectCapabilities()
    this.configureSensors()
  }
  
  private detectCapabilities(): SensorCapabilities {
    const platform = Platform.OS as 'ios' | 'android' | 'web'
    
    // Platform-specific capability detection
    switch (platform) {
      case 'ios':
        return {
          hasAccelerometer: true,
          hasGyroscope: true,
          hasMagnetometer: true,
          hasDeviceMotion: true,
          hasOrientation: true,
          supportsHighFrequency: true,
          platform
        }
        
      case 'android':
        return {
          hasAccelerometer: true,
          hasGyroscope: true,
          hasMagnetometer: true,
          hasDeviceMotion: true,
          hasOrientation: true,
          supportsHighFrequency: true,
          platform
        }
        
      default:
        // Web capabilities
        return {
          hasAccelerometer: 'DeviceMotionEvent' in window,
          hasGyroscope: 'DeviceMotionEvent' in window,
          hasMagnetometer: 'DeviceOrientationEvent' in window,
          hasDeviceMotion: 'DeviceMotionEvent' in window,
          hasOrientation: 'DeviceOrientationEvent' in window,
          supportsHighFrequency: false,
          platform: 'web'
        }
    }
  }
  
  private configureSensors(): void {
    // Configure sensor update intervals
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        setUpdateIntervalForType(SensorTypes.accelerometer, this.updateInterval)
        setUpdateIntervalForType(SensorTypes.gyroscope, this.updateInterval)
        setUpdateIntervalForType(SensorTypes.magnetometer, this.updateInterval)
      } catch (error) {
        console.warn('Failed to configure native sensors:', error)
      }
    }
  }
  
  /**
   * Get device sensor capabilities
   */
  getCapabilities(): SensorCapabilities {
    return { ...this.capabilities }
  }
  
  /**
   * Enable or disable sensors globally
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    
    if (!enabled) {
      this.unsubscribeAll()
    }
  }
  
  /**
   * Set sensor update interval (in milliseconds)
   */
  setUpdateInterval(interval: number): void {
    this.updateInterval = Math.max(16, Math.min(1000, interval)) // Clamp between 16ms and 1000ms
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        setUpdateIntervalForType(SensorTypes.accelerometer, this.updateInterval)
        setUpdateIntervalForType(SensorTypes.gyroscope, this.updateInterval)
        setUpdateIntervalForType(SensorTypes.magnetometer, this.updateInterval)
      } catch (error) {
        console.warn('Failed to update sensor intervals:', error)
      }
    }
  }
  
  /**
   * Subscribe to device orientation changes
   */
  subscribeToOrientation(callback: SensorCallback<OrientationData>): SensorUnsubscribe {
    if (!this.isEnabled || !this.capabilities.hasOrientation) {
      return () => {}
    }
    
    const subscriptionId = 'orientation_' + Date.now()
    
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // Use Expo DeviceMotion for cross-platform orientation
        DeviceMotion.setUpdateInterval(this.updateInterval)
        
        const subscription = DeviceMotion.addListener((motionData) => {
          if (motionData.orientation) {
            const orientationData: OrientationData = {
              alpha: motionData.orientation.yaw || 0,
              beta: motionData.orientation.pitch || 0,
              gamma: motionData.orientation.roll || 0,
              timestamp: Date.now()
            }
            
            callback(orientationData)
          }
        })
        
        this.subscriptions.set(subscriptionId, subscription)
        
        return () => {
          subscription.remove()
          this.subscriptions.delete(subscriptionId)
        }
      } else {
        // Web implementation
        const handleOrientation = (event: DeviceOrientationEvent) => {
          const orientationData: OrientationData = {
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0,
            timestamp: Date.now()
          }
          
          callback(orientationData)
        }
        
        window.addEventListener('deviceorientation', handleOrientation)
        this.subscriptions.set(subscriptionId, { type: 'web', listener: handleOrientation })
        
        return () => {
          window.removeEventListener('deviceorientation', handleOrientation)
          this.subscriptions.delete(subscriptionId)
        }
      }
    } catch (error) {
      console.warn('Failed to subscribe to orientation:', error)
      return () => {}
    }
  }
  
  /**
   * Subscribe to accelerometer data
   */
  subscribeToAccelerometer(callback: SensorCallback<AccelerationData>): SensorUnsubscribe {
    if (!this.isEnabled || !this.capabilities.hasAccelerometer) {
      return () => {}
    }
    
    const subscriptionId = 'accelerometer_' + Date.now()
    
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const subscription = accelerometer.subscribe((data) => {
          const accelerationData: AccelerationData = {
            x: data.x,
            y: data.y,
            z: data.z,
            timestamp: data.timestamp
          }
          
          callback(accelerationData)
        })
        
        this.subscriptions.set(subscriptionId, subscription)
        
        return () => {
          subscription.unsubscribe()
          this.subscriptions.delete(subscriptionId)
        }
      } else {
        // Web implementation using DeviceMotionEvent
        const handleMotion = (event: DeviceMotionEvent) => {
          if (event.acceleration) {
            const accelerationData: AccelerationData = {
              x: event.acceleration.x || 0,
              y: event.acceleration.y || 0,
              z: event.acceleration.z || 0,
              timestamp: Date.now()
            }
            
            callback(accelerationData)
          }
        }
        
        window.addEventListener('devicemotion', handleMotion)
        this.subscriptions.set(subscriptionId, { type: 'web', listener: handleMotion })
        
        return () => {
          window.removeEventListener('devicemotion', handleMotion)
          this.subscriptions.delete(subscriptionId)
        }
      }
    } catch (error) {
      console.warn('Failed to subscribe to accelerometer:', error)
      return () => {}
    }
  }
  
  /**
   * Subscribe to gyroscope data
   */
  subscribeToGyroscope(callback: SensorCallback<GyroscopeData>): SensorUnsubscribe {
    if (!this.isEnabled || !this.capabilities.hasGyroscope) {
      return () => {}
    }
    
    const subscriptionId = 'gyroscope_' + Date.now()
    
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const subscription = gyroscope.subscribe((data) => {
          const gyroscopeData: GyroscopeData = {
            x: data.x,
            y: data.y,
            z: data.z,
            timestamp: data.timestamp
          }
          
          callback(gyroscopeData)
        })
        
        this.subscriptions.set(subscriptionId, subscription)
        
        return () => {
          subscription.unsubscribe()
          this.subscriptions.delete(subscriptionId)
        }
      } else {
        // Web implementation using DeviceMotionEvent
        const handleMotion = (event: DeviceMotionEvent) => {
          if (event.rotationRate) {
            const gyroscopeData: GyroscopeData = {
              x: event.rotationRate.alpha || 0,
              y: event.rotationRate.beta || 0,
              z: event.rotationRate.gamma || 0,
              timestamp: Date.now()
            }
            
            callback(gyroscopeData)
          }
        }
        
        window.addEventListener('devicemotion', handleMotion)
        this.subscriptions.set(subscriptionId, { type: 'web', listener: handleMotion })
        
        return () => {
          window.removeEventListener('devicemotion', handleMotion)
          this.subscriptions.delete(subscriptionId)
        }
      }
    } catch (error) {
      console.warn('Failed to subscribe to gyroscope:', error)
      return () => {}
    }
  }
  
  /**
   * Subscribe to magnetometer data
   */
  subscribeToMagnetometer(callback: SensorCallback<MagnetometerData>): SensorUnsubscribe {
    if (!this.isEnabled || !this.capabilities.hasMagnetometer) {
      return () => {}
    }
    
    const subscriptionId = 'magnetometer_' + Date.now()
    
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const subscription = magnetometer.subscribe((data) => {
          const magnetometerData: MagnetometerData = {
            x: data.x,
            y: data.y,
            z: data.z,
            accuracy: 1, // Default accuracy
            timestamp: data.timestamp
          }
          
          callback(magnetometerData)
        })
        
        this.subscriptions.set(subscriptionId, subscription)
        
        return () => {
          subscription.unsubscribe()
          this.subscriptions.delete(subscriptionId)
        }
      } else {
        // Web doesn't have direct magnetometer access
        console.warn('Magnetometer not available on web platform')
        return () => {}
      }
    } catch (error) {
      console.warn('Failed to subscribe to magnetometer:', error)
      return () => {}
    }
  }
  
  /**
   * Subscribe to combined motion data (acceleration + gyroscope + orientation)
   */
  subscribeToMotion(callback: SensorCallback<MotionData>): SensorUnsubscribe {
    if (!this.isEnabled || !this.capabilities.hasDeviceMotion) {
      return () => {}
    }
    
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        DeviceMotion.setUpdateInterval(this.updateInterval)
        
        this.motionSubscription = DeviceMotion.addListener((motionData) => {
          const combinedData: MotionData = {
            acceleration: {
              x: motionData.acceleration?.x || 0,
              y: motionData.acceleration?.y || 0,
              z: motionData.acceleration?.z || 0,
              timestamp: Date.now()
            },
            gyroscope: {
              x: motionData.rotation?.alpha || 0,
              y: motionData.rotation?.beta || 0,
              z: motionData.rotation?.gamma || 0,
              timestamp: Date.now()
            },
            orientation: {
              alpha: motionData.orientation?.yaw || 0,
              beta: motionData.orientation?.pitch || 0,
              gamma: motionData.orientation?.roll || 0,
              timestamp: Date.now()
            },
            timestamp: Date.now()
          }
          
          callback(combinedData)
        })
        
        return () => {
          if (this.motionSubscription) {
            this.motionSubscription.remove()
            this.motionSubscription = null
          }
        }
      } else {
        // Web implementation combining both events
        let lastAcceleration: AccelerationData | null = null
        let lastOrientation: OrientationData | null = null
        
        const combineAndCallback = () => {
          if (lastAcceleration && lastOrientation) {
            const combinedData: MotionData = {
              acceleration: lastAcceleration,
              gyroscope: { x: 0, y: 0, z: 0, timestamp: Date.now() }, // Limited on web
              orientation: lastOrientation,
              timestamp: Date.now()
            }
            
            callback(combinedData)
          }
        }
        
        const handleMotion = (event: DeviceMotionEvent) => {
          if (event.acceleration) {
            lastAcceleration = {
              x: event.acceleration.x || 0,
              y: event.acceleration.y || 0,
              z: event.acceleration.z || 0,
              timestamp: Date.now()
            }
            combineAndCallback()
          }
        }
        
        const handleOrientation = (event: DeviceOrientationEvent) => {
          lastOrientation = {
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0,
            timestamp: Date.now()
          }
          combineAndCallback()
        }
        
        window.addEventListener('devicemotion', handleMotion)
        window.addEventListener('deviceorientation', handleOrientation)
        
        return () => {
          window.removeEventListener('devicemotion', handleMotion)
          window.removeEventListener('deviceorientation', handleOrientation)
        }
      }
    } catch (error) {
      console.warn('Failed to subscribe to motion:', error)
      return () => {}
    }
  }
  
  /**
   * Fish-specific sensor helpers
   */
  
  /**
   * Subscribe to fish-relevant motion (filtered and processed for fish behavior)
   */
  subscribeToFishMotion(callback: SensorCallback<{
    tilt: { x: number; y: number }
    shake: { intensity: number; direction: 'x' | 'y' | 'z' | 'all' }
    stability: number // 0-1, how stable the device is
  }>): SensorUnsubscribe {
    let lastAcceleration: AccelerationData | null = null
    let stabilityBuffer: number[] = []
    const bufferSize = 10
    
    return this.subscribeToMotion((motionData) => {
      const acceleration = motionData.acceleration
      const orientation = motionData.orientation
      
      // Calculate tilt (simplified for fish behavior)
      const tilt = {
        x: Math.max(-1, Math.min(1, orientation.gamma / 90)), // Normalize to -1 to 1
        y: Math.max(-1, Math.min(1, orientation.beta / 90))
      }
      
      // Calculate shake intensity
      let shake = { intensity: 0, direction: 'all' as 'x' | 'y' | 'z' | 'all' }
      
      if (lastAcceleration) {
        const deltaX = Math.abs(acceleration.x - lastAcceleration.x)
        const deltaY = Math.abs(acceleration.y - lastAcceleration.y)
        const deltaZ = Math.abs(acceleration.z - lastAcceleration.z)
        
        const maxDelta = Math.max(deltaX, deltaY, deltaZ)
        shake.intensity = Math.min(1, maxDelta / 5) // Normalize shake intensity
        
        if (deltaX > deltaY && deltaX > deltaZ) {
          shake.direction = 'x'
        } else if (deltaY > deltaZ) {
          shake.direction = 'y'
        } else {
          shake.direction = 'z'
        }
      }
      
      lastAcceleration = acceleration
      
      // Calculate stability
      stabilityBuffer.push(shake.intensity)
      if (stabilityBuffer.length > bufferSize) {
        stabilityBuffer.shift()
      }
      
      const avgShake = stabilityBuffer.reduce((sum, val) => sum + val, 0) / stabilityBuffer.length
      const stability = 1 - Math.min(1, avgShake * 2) // Invert and scale
      
      callback({ tilt, shake, stability })
    })
  }
  
  /**
   * Request sensor permissions (mainly for iOS 13+)
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios' && 'DeviceOrientationEvent' in window) {
        // For iOS 13+ web, need to request permission
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          const permissionState = await (DeviceOrientationEvent as any).requestPermission()
          return permissionState === 'granted'
        }
      }
      
      if (Platform.OS === 'ios' && 'DeviceMotionEvent' in window) {
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          const permissionState = await (DeviceMotionEvent as any).requestPermission()
          return permissionState === 'granted'
        }
      }
      
      return true // Assume granted for other platforms
    } catch (error) {
      console.warn('Failed to request sensor permissions:', error)
      return false
    }
  }
  
  /**
   * Unsubscribe from all sensors
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription, id) => {
      try {
        if (subscription.type === 'web') {
          // Web event listener cleanup handled by individual unsubscribe functions
        } else {
          subscription.unsubscribe?.()
          subscription.remove?.()
        }
      } catch (error) {
        console.warn(`Failed to unsubscribe from ${id}:`, error)
      }
    })
    
    this.subscriptions.clear()
    
    if (this.motionSubscription) {
      this.motionSubscription.remove()
      this.motionSubscription = null
    }
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    this.unsubscribeAll()
    this.isEnabled = false
  }
}

export default SensorService