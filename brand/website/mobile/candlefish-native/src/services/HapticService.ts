/**
 * Cross-Platform Haptic Feedback Service
 * Provides unified haptic feedback interface for iOS and Android
 */

import { Platform } from 'react-native'
import HapticFeedback from 'react-native-haptic-feedback'
import * as Haptics from 'expo-haptics'

export enum HapticIntensity {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy'
}

export enum HapticType {
  Selection = 'selection',
  Impact = 'impact',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Custom = 'custom'
}

interface HapticPattern {
  intensity: HapticIntensity
  duration: number
  delay?: number
}

export interface HapticCapabilities {
  hasHaptics: boolean
  supportsSelection: boolean
  supportsImpact: boolean
  supportsNotification: boolean
  supportsCustomPatterns: boolean
  platform: 'ios' | 'android' | 'web'
}

export class HapticService {
  private capabilities: HapticCapabilities
  private isEnabled: boolean = true
  
  constructor() {
    this.capabilities = this.detectCapabilities()
    this.configureHaptics()
  }
  
  private detectCapabilities(): HapticCapabilities {
    const platform = Platform.OS as 'ios' | 'android' | 'web'
    
    switch (platform) {
      case 'ios':
        return {
          hasHaptics: true,
          supportsSelection: true,
          supportsImpact: true,
          supportsNotification: true,
          supportsCustomPatterns: true,
          platform
        }
        
      case 'android':
        return {
          hasHaptics: 'vibrate' in navigator || true, // Most Android devices support vibration
          supportsSelection: true,
          supportsImpact: true,
          supportsNotification: false, // Limited on Android
          supportsCustomPatterns: true,
          platform
        }
        
      default:
        return {
          hasHaptics: 'vibrate' in navigator,
          supportsSelection: false,
          supportsImpact: false,
          supportsNotification: false,
          supportsCustomPatterns: 'vibrate' in navigator,
          platform: 'web'
        }
    }
  }
  
  private configureHaptics(): void {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // Configure react-native-haptic-feedback
      const options = {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      }
      
      // Test haptic capability on initialization
      HapticFeedback.trigger('selection', options)
    }
  }
  
  /**
   * Get device haptic capabilities
   */
  getCapabilities(): HapticCapabilities {
    return { ...this.capabilities }
  }
  
  /**
   * Enable or disable haptics globally
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }
  
  /**
   * Check if haptics are currently enabled and available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.capabilities.hasHaptics
  }
  
  /**
   * Light selection feedback - for UI interactions
   */
  selectionChanged(): void {
    if (!this.isAvailable() || !this.capabilities.supportsSelection) return
    
    try {
      if (Platform.OS === 'ios') {
        HapticFeedback.trigger('selection')
      } else if (Platform.OS === 'android') {
        HapticFeedback.trigger('clockTick')
      } else if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    } catch (error) {
      console.warn('Selection haptic failed:', error)
    }
  }
  
  /**
   * Light impact feedback - for subtle interactions
   */
  impactLight(): void {
    if (!this.isAvailable() || !this.capabilities.supportsImpact) return
    
    try {
      if (Platform.OS === 'ios') {
        HapticFeedback.trigger('impactLight')
      } else if (Platform.OS === 'android') {
        HapticFeedback.trigger('impactLight')
      } else if ('vibrate' in navigator) {
        navigator.vibrate(25)
      }
    } catch (error) {
      console.warn('Light impact haptic failed:', error)
    }
  }
  
  /**
   * Medium impact feedback - for standard interactions
   */
  impactMedium(): void {
    if (!this.isAvailable() || !this.capabilities.supportsImpact) return
    
    try {
      if (Platform.OS === 'ios') {
        HapticFeedback.trigger('impactMedium')
      } else if (Platform.OS === 'android') {
        HapticFeedback.trigger('impactMedium')
      } else if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.warn('Medium impact haptic failed:', error)
    }
  }
  
  /**
   * Heavy impact feedback - for strong interactions
   */
  impactHeavy(): void {
    if (!this.isAvailable() || !this.capabilities.supportsImpact) return
    
    try {
      if (Platform.OS === 'ios') {
        HapticFeedback.trigger('impactHeavy')
      } else if (Platform.OS === 'android') {
        HapticFeedback.trigger('impactHeavy')
      } else if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }
    } catch (error) {
      console.warn('Heavy impact haptic failed:', error)
    }
  }
  
  /**
   * Success notification feedback
   */
  notificationSuccess(): void {
    if (!this.isAvailable()) return
    
    try {
      if (Platform.OS === 'ios') {
        if (this.capabilities.supportsNotification) {
          HapticFeedback.trigger('notificationSuccess')
        } else {
          HapticFeedback.trigger('impactLight')
        }
      } else if (Platform.OS === 'android') {
        HapticFeedback.trigger('impactLight')
      } else if ('vibrate' in navigator) {
        navigator.vibrate([25, 50, 25]) // Success pattern
      }
    } catch (error) {
      console.warn('Success notification haptic failed:', error)
    }
  }
  
  /**
   * Warning notification feedback
   */
  notificationWarning(): void {
    if (!this.isAvailable()) return
    
    try {
      if (Platform.OS === 'ios') {
        if (this.capabilities.supportsNotification) {
          HapticFeedback.trigger('notificationWarning')
        } else {
          HapticFeedback.trigger('impactMedium')
        }
      } else if (Platform.OS === 'android') {
        HapticFeedback.trigger('impactMedium')
      } else if ('vibrate' in navigator) {
        navigator.vibrate([50, 25, 50]) // Warning pattern
      }
    } catch (error) {
      console.warn('Warning notification haptic failed:', error)
    }
  }
  
  /**
   * Error notification feedback
   */
  notificationError(): void {
    if (!this.isAvailable()) return
    
    try {
      if (Platform.OS === 'ios') {
        if (this.capabilities.supportsNotification) {
          HapticFeedback.trigger('notificationError')
        } else {
          HapticFeedback.trigger('impactHeavy')
        }
      } else if (Platform.OS === 'android') {
        HapticFeedback.trigger('impactHeavy')
      } else if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 100]) // Error pattern
      }
    } catch (error) {
      console.warn('Error notification haptic failed:', error)
    }
  }
  
  /**
   * Custom haptic pattern
   */
  customPattern(pattern: HapticPattern[]): void {
    if (!this.isAvailable() || !this.capabilities.supportsCustomPatterns) return
    
    try {
      if (Platform.OS === 'ios') {
        // iOS doesn't support custom patterns directly, simulate with sequence
        pattern.forEach((step, index) => {
          setTimeout(() => {
            switch (step.intensity) {
              case HapticIntensity.Light:
                this.impactLight()
                break
              case HapticIntensity.Medium:
                this.impactMedium()
                break
              case HapticIntensity.Heavy:
                this.impactHeavy()
                break
            }
          }, (step.delay || 0) + (index * 50))
        })
      } else if (Platform.OS === 'android') {
        // Convert pattern to vibration timings
        const vibrationPattern: number[] = []
        
        pattern.forEach(step => {
          vibrationPattern.push(step.delay || 0)
          
          switch (step.intensity) {
            case HapticIntensity.Light:
              vibrationPattern.push(25)
              break
            case HapticIntensity.Medium:
              vibrationPattern.push(50)
              break
            case HapticIntensity.Heavy:
              vibrationPattern.push(100)
              break
          }
        })
        
        HapticFeedback.trigger('selection') // Fallback to simple
      } else if ('vibrate' in navigator) {
        const vibrationPattern: number[] = []
        
        pattern.forEach(step => {
          vibrationPattern.push(step.delay || 0)
          
          switch (step.intensity) {
            case HapticIntensity.Light:
              vibrationPattern.push(25)
              break
            case HapticIntensity.Medium:
              vibrationPattern.push(50)
              break
            case HapticIntensity.Heavy:
              vibrationPattern.push(100)
              break
          }
        })
        
        navigator.vibrate(vibrationPattern)
      }
    } catch (error) {
      console.warn('Custom haptic pattern failed:', error)
    }
  }
  
  /**
   * Fish-specific haptic patterns
   */
  fishDart(): void {
    this.customPattern([
      { intensity: HapticIntensity.Medium, duration: 50 },
      { intensity: HapticIntensity.Light, duration: 25, delay: 25 }
    ])
  }
  
  fishFeed(): void {
    this.customPattern([
      { intensity: HapticIntensity.Light, duration: 25 },
      { intensity: HapticIntensity.Light, duration: 25, delay: 50 },
      { intensity: HapticIntensity.Medium, duration: 50, delay: 25 }
    ])
  }
  
  fishExcited(): void {
    this.customPattern([
      { intensity: HapticIntensity.Light, duration: 25 },
      { intensity: HapticIntensity.Light, duration: 25, delay: 25 },
      { intensity: HapticIntensity.Light, duration: 25, delay: 25 },
      { intensity: HapticIntensity.Medium, duration: 50, delay: 50 }
    ])
  }
  
  fishShy(): void {
    this.impactLight() // Single subtle feedback for shy behavior
  }
  
  /**
   * Test all haptic types (for settings/calibration)
   */
  async testAllHaptics(): Promise<void> {
    if (!this.isAvailable()) {
      console.log('Haptics not available')
      return
    }
    
    console.log('Testing haptics...')
    
    // Test basic haptics with delays
    setTimeout(() => this.selectionChanged(), 0)
    setTimeout(() => this.impactLight(), 200)
    setTimeout(() => this.impactMedium(), 400)
    setTimeout(() => this.impactHeavy(), 600)
    setTimeout(() => this.notificationSuccess(), 800)
    setTimeout(() => this.notificationWarning(), 1000)
    setTimeout(() => this.notificationError(), 1200)
    
    console.log('Haptic test sequence started')
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    // No specific cleanup needed for haptics
    this.isEnabled = false
  }
}

export default HapticService