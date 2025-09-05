/**
 * Mobile Enhancement System for Bioluminescent Fish Animation
 * 
 * Provides mobile-optimized features:
 * - Touch interaction with fish following/darting
 * - Device orientation response (gyroscope/accelerometer)
 * - Haptic feedback on dart states
 * - Battery-aware performance scaling
 * - Touch gesture controls (swipe, pinch)
 * - Network-aware quality switching
 */

'use strict';

import type { Vec2, Bounds } from './types';
import { Vec2Math, MathUtils } from './types';
import type { Fish } from './fish';

/**
 * Mobile capabilities detection
 */
export interface MobileCapabilities {
  readonly touchSupport: boolean;
  readonly hapticSupport: boolean;
  readonly orientationSupport: boolean;
  readonly accelerometerSupport: boolean;
  readonly gyroscopeSupport: boolean;
  readonly batterySupport: boolean;
  readonly networkSupport: boolean;
  readonly iosDevice: boolean;
  readonly androidDevice: boolean;
  readonly isSafari: boolean;
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly devicePixelRatio: number;
  readonly screenSize: 'small' | 'medium' | 'large';
}

/**
 * Touch interaction configuration
 */
export interface TouchConfig {
  readonly enableTouchFollow: boolean;
  readonly enableTouchDart: boolean;
  readonly touchRadius: number;
  readonly dartThreshold: number;
  readonly followStrength: number;
  readonly dampening: number;
  readonly debounceMs: number;
  readonly maxTouchPoints: number;
}

/**
 * Device orientation data
 */
export interface OrientationData {
  readonly alpha: number; // Z-axis rotation (compass)
  readonly beta: number;  // X-axis tilt
  readonly gamma: number; // Y-axis tilt
  readonly absolute: boolean;
}

/**
 * Battery information
 */
export interface BatteryInfo {
  readonly level: number; // 0-1
  readonly charging: boolean;
  readonly chargingTime?: number;
  readonly dischargingTime?: number;
}

/**
 * Network information
 */
export interface NetworkInfo {
  readonly type: string;
  readonly effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  readonly downlink: number;
  readonly rtt: number;
  readonly saveData: boolean;
}

/**
 * Touch interaction state
 */
interface TouchState {
  isActive: boolean;
  position: Vec2;
  velocity: Vec2;
  timestamp: number;
  pressure: number;
  touchId: number;
}

/**
 * Gesture detection state
 */
interface GestureState {
  type: 'none' | 'tap' | 'double-tap' | 'swipe' | 'pinch' | 'pan';
  startPosition: Vec2;
  currentPosition: Vec2;
  deltaPosition: Vec2;
  scale: number;
  rotation: number;
  velocity: Vec2;
  duration: number;
}

/**
 * Mobile Enhancement Manager
 */
export class MobileEnhancementManager {
  private readonly capabilities: MobileCapabilities;
  private readonly touchConfig: TouchConfig;
  private readonly bounds: Bounds;
  
  // Touch interaction
  private touchState: TouchState | null = null;
  private gestureState: GestureState;
  private lastTouchTime: number = 0;
  private touchDebounceTimer: number = 0;
  private activeTouches = new Map<number, TouchState>();
  
  // Device sensors
  private orientationData: OrientationData | null = null;
  private orientationListenerActive = false;
  
  // Performance monitoring
  private batteryInfo: BatteryInfo | null = null;
  private networkInfo: NetworkInfo | null = null;
  private performanceLevel: number = 1.0; // 0-1, affects quality tier
  
  // Haptic feedback
  private lastHapticTime: number = 0;
  private hapticPattern: number[] = [100, 50, 100]; // dart pattern
  
  // Callbacks
  private onTouchInteraction?: (position: Vec2, type: 'follow' | 'dart') => void;
  private onOrientationChange?: (data: OrientationData) => void;
  private onPerformanceChange?: (level: number) => void;
  private onGesture?: (gesture: GestureState) => void;

  constructor(bounds: Bounds, config: Partial<TouchConfig> = {}) {
    this.bounds = bounds;
    this.capabilities = this.detectCapabilities();
    this.touchConfig = {
      enableTouchFollow: true,
      enableTouchDart: true,
      touchRadius: 60,
      dartThreshold: 150, // pixels/second
      followStrength: 0.3,
      dampening: 0.8,
      debounceMs: 16, // ~60fps
      maxTouchPoints: 2,
      ...config
    };
    
    this.gestureState = {
      type: 'none',
      startPosition: Vec2Math.ZERO,
      currentPosition: Vec2Math.ZERO,
      deltaPosition: Vec2Math.ZERO,
      scale: 1,
      rotation: 0,
      velocity: Vec2Math.ZERO,
      duration: 0
    };

    this.initializeMobileFeatures();
  }

  /**
   * Detect mobile capabilities
   */
  private detectCapabilities(): MobileCapabilities {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/.test(userAgent);
    
    // Screen size classification
    const screenWidth = Math.min(window.innerWidth, window.innerHeight);
    let screenSize: 'small' | 'medium' | 'large' = 'medium';
    if (screenWidth < 480) screenSize = 'small';
    else if (screenWidth > 1024) screenSize = 'large';

    return {
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      hapticSupport: 'vibrate' in navigator,
      orientationSupport: 'DeviceOrientationEvent' in window,
      accelerometerSupport: 'DeviceMotionEvent' in window,
      gyroscopeSupport: 'DeviceOrientationEvent' in window && 'webkitCompassHeading' in DeviceOrientationEvent.prototype,
      batterySupport: 'getBattery' in navigator,
      networkSupport: 'connection' in navigator,
      iosDevice: isIOS,
      androidDevice: isAndroid,
      isSafari,
      isMobile,
      isTablet,
      devicePixelRatio: window.devicePixelRatio || 1,
      screenSize
    };
  }

  /**
   * Initialize mobile-specific features
   */
  private async initializeMobileFeatures(): Promise<void> {
    // Initialize battery monitoring
    if (this.capabilities.batterySupport) {
      try {
        const battery = await (navigator as any).getBattery();
        this.batteryInfo = {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
        
        // Listen for battery changes
        battery.addEventListener('levelchange', () => this.updateBatteryInfo(battery));
        battery.addEventListener('chargingchange', () => this.updateBatteryInfo(battery));
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }

    // Initialize network monitoring
    if (this.capabilities.networkSupport) {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        this.networkInfo = {
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false
        };
        
        connection.addEventListener('change', () => this.updateNetworkInfo(connection));
      }
    }

    // Calculate initial performance level
    this.updatePerformanceLevel();
  }

  /**
   * Update battery information
   */
  private updateBatteryInfo(battery: any): void {
    this.batteryInfo = {
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime
    };
    this.updatePerformanceLevel();
  }

  /**
   * Update network information
   */
  private updateNetworkInfo(connection: any): void {
    this.networkInfo = {
      type: connection.type || 'unknown',
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 100,
      saveData: connection.saveData || false
    };
    this.updatePerformanceLevel();
  }

  /**
   * Calculate performance level based on battery and network
   */
  private updatePerformanceLevel(): void {
    let level = 1.0;

    // Reduce performance when battery is low
    if (this.batteryInfo && !this.batteryInfo.charging) {
      if (this.batteryInfo.level < 0.2) level *= 0.6; // Very low battery
      else if (this.batteryInfo.level < 0.4) level *= 0.8; // Low battery
    }

    // Reduce performance on slow networks
    if (this.networkInfo) {
      if (this.networkInfo.saveData) level *= 0.7;
      if (this.networkInfo.effectiveType === 'slow-2g') level *= 0.5;
      else if (this.networkInfo.effectiveType === '2g') level *= 0.7;
      else if (this.networkInfo.effectiveType === '3g') level *= 0.9;
    }

    // Adjust for screen size
    if (this.capabilities.screenSize === 'small') level *= 0.8;

    this.performanceLevel = MathUtils.clamp(level, 0.3, 1.0);
    
    if (this.onPerformanceChange) {
      this.onPerformanceChange(this.performanceLevel);
    }
  }

  /**
   * Start touch event handling
   */
  public startTouchHandling(element: HTMLElement): void {
    if (!this.capabilities.touchSupport) return;

    // Passive event listeners for better performance
    const options = { passive: false };

    element.addEventListener('touchstart', this.handleTouchStart.bind(this), options);
    element.addEventListener('touchmove', this.handleTouchMove.bind(this), options);
    element.addEventListener('touchend', this.handleTouchEnd.bind(this), options);
    element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), options);

    // Prevent default touch behaviors that interfere with animation
    element.style.touchAction = 'none';
    element.style.userSelect = 'none';
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    const now = performance.now();
    if (now - this.lastTouchTime < this.touchConfig.debounceMs) return;
    
    const touch = event.touches[0];
    if (!touch) return;

    const rect = (event.target as Element).getBoundingClientRect();
    const position = Vec2Math.create(
      touch.clientX - rect.left,
      touch.clientY - rect.top
    );

    // Create touch state
    this.touchState = {
      isActive: true,
      position,
      velocity: Vec2Math.ZERO,
      timestamp: now,
      pressure: touch.force || 1,
      touchId: touch.identifier
    };

    // Store in active touches
    this.activeTouches.set(touch.identifier, this.touchState);

    // Initialize gesture
    this.gestureState = {
      type: 'none',
      startPosition: position,
      currentPosition: position,
      deltaPosition: Vec2Math.ZERO,
      scale: 1,
      rotation: 0,
      velocity: Vec2Math.ZERO,
      duration: 0
    };

    this.lastTouchTime = now;
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    if (!this.touchState?.isActive) return;

    const now = performance.now();
    const touch = Array.from(event.touches).find(t => t.identifier === this.touchState!.touchId);
    if (!touch) return;

    const rect = (event.target as Element).getBoundingClientRect();
    const position = Vec2Math.create(
      touch.clientX - rect.left,
      touch.clientY - rect.top
    );

    // Calculate velocity
    const deltaTime = (now - this.touchState.timestamp) / 1000;
    const deltaPosition = Vec2Math.subtract(position, this.touchState.position);
    const velocity = deltaTime > 0 ? Vec2Math.divide(deltaPosition, deltaTime) : Vec2Math.ZERO;

    // Update touch state
    this.touchState = {
      ...this.touchState,
      position,
      velocity,
      timestamp: now,
      pressure: touch.force || 1
    };

    // Update gesture state
    this.gestureState = {
      ...this.gestureState,
      currentPosition: position,
      deltaPosition,
      velocity,
      duration: now - this.lastTouchTime
    };

    // Determine gesture type based on movement
    const speed = Vec2Math.magnitude(velocity);
    const distance = Vec2Math.distance(this.gestureState.startPosition, position);

    if (distance < 10 && this.gestureState.duration < 200) {
      this.gestureState.type = 'tap';
    } else if (speed > this.touchConfig.dartThreshold) {
      this.gestureState.type = 'swipe';
    } else if (distance > 20) {
      this.gestureState.type = 'pan';
    }

    // Multi-touch gestures
    if (event.touches.length === 2) {
      this.handleMultiTouch(event);
    }

    // Trigger interaction callback
    this.handleTouchInteraction();
  }

  /**
   * Handle multi-touch gestures (pinch, rotate)
   */
  private handleMultiTouch(event: TouchEvent): void {
    if (event.touches.length !== 2) return;

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    const rect = (event.target as Element).getBoundingClientRect();
    const pos1 = Vec2Math.create(touch1.clientX - rect.left, touch1.clientY - rect.top);
    const pos2 = Vec2Math.create(touch2.clientX - rect.left, touch2.clientY - rect.top);

    const distance = Vec2Math.distance(pos1, pos2);
    const center = Vec2Math.multiply(Vec2Math.add(pos1, pos2), 0.5);

    // Calculate pinch scale (simplified)
    const initialDistance = 100; // Would track this from touch start
    const scale = distance / initialDistance;

    this.gestureState = {
      ...this.gestureState,
      type: 'pinch',
      currentPosition: center,
      scale: MathUtils.clamp(scale, 0.5, 2.0)
    };
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    
    if (!this.touchState?.isActive) return;

    const now = performance.now();
    const touch = Array.from(event.changedTouches).find(t => t.identifier === this.touchState!.touchId);
    if (!touch) return;

    // Remove from active touches
    this.activeTouches.delete(touch.identifier);

    // Check for tap vs dart based on final gesture
    if (this.gestureState.type === 'tap' || this.gestureState.duration < 200) {
      // Quick tap - trigger dart
      if (this.touchConfig.enableTouchDart && this.onTouchInteraction) {
        this.onTouchInteraction(this.touchState.position, 'dart');
        this.triggerHapticFeedback('dart');
      }
    } else if (this.gestureState.type === 'swipe') {
      // Swipe - trigger directional dart
      if (this.touchConfig.enableTouchDart && this.onTouchInteraction) {
        this.onTouchInteraction(this.gestureState.currentPosition, 'dart');
        this.triggerHapticFeedback('swipe');
      }
    }

    // Trigger gesture callback
    if (this.onGesture) {
      this.onGesture(this.gestureState);
    }

    this.touchState = null;
    this.gestureState.type = 'none';
  }

  /**
   * Handle touch cancel
   */
  private handleTouchCancel(event: TouchEvent): void {
    this.handleTouchEnd(event);
  }

  /**
   * Process touch interaction
   */
  private handleTouchInteraction(): void {
    if (!this.touchState?.isActive || !this.touchConfig.enableTouchFollow) return;

    // Debounce touch updates
    if (this.touchDebounceTimer) {
      clearTimeout(this.touchDebounceTimer);
    }

    this.touchDebounceTimer = window.setTimeout(() => {
      if (this.touchState?.isActive && this.onTouchInteraction) {
        this.onTouchInteraction(this.touchState.position, 'follow');
      }
    }, this.touchConfig.debounceMs);
  }

  /**
   * Start device orientation handling
   */
  public startOrientationHandling(): void {
    if (!this.capabilities.orientationSupport || this.orientationListenerActive) return;

    // Request permission on iOS 13+
    if (this.capabilities.iosDevice && typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
      (DeviceOrientationEvent as any).requestPermission().then((response: string) => {
        if (response === 'granted') {
          this.addOrientationListeners();
        }
      }).catch(console.error);
    } else {
      this.addOrientationListeners();
    }
  }

  /**
   * Add orientation event listeners
   */
  private addOrientationListeners(): void {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return;

      this.orientationData = {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute || false
      };

      if (this.onOrientationChange) {
        this.onOrientationChange(this.orientationData);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    this.orientationListenerActive = true;
  }

  /**
   * Trigger haptic feedback
   */
  private triggerHapticFeedback(type: 'tap' | 'dart' | 'swipe' = 'tap'): void {
    if (!this.capabilities.hapticSupport) return;

    const now = performance.now();
    if (now - this.lastHapticTime < 100) return; // Prevent spam

    let pattern: number[];
    switch (type) {
      case 'dart':
        pattern = [150, 50, 100]; // Strong burst
        break;
      case 'swipe':
        pattern = [50, 30, 80, 30, 50]; // Fluid pattern
        break;
      default:
        pattern = [50]; // Simple tap
    }

    navigator.vibrate(pattern);
    this.lastHapticTime = now;
  }

  /**
   * Get recommended quality tier based on performance level
   */
  public getRecommendedQualityTier(): 'T1' | 'T2' | 'T3' | 'T4' {
    if (this.performanceLevel >= 0.9) return 'T1'; // High quality
    if (this.performanceLevel >= 0.7) return 'T2'; // Medium quality
    if (this.performanceLevel >= 0.5) return 'T3'; // Low quality
    return 'T4'; // Minimum quality
  }

  /**
   * Check if device is in power saving mode
   */
  public isPowerSavingMode(): boolean {
    return (this.batteryInfo?.level || 1) < 0.2 && !this.batteryInfo?.charging;
  }

  /**
   * Check if network is slow
   */
  public isSlowNetwork(): boolean {
    return this.networkInfo?.effectiveType === 'slow-2g' || 
           this.networkInfo?.effectiveType === '2g' ||
           this.networkInfo?.saveData === true;
  }

  /**
   * Get current touch position (if active)
   */
  public getCurrentTouch(): Vec2 | null {
    return this.touchState?.isActive ? this.touchState.position : null;
  }

  /**
   * Get device tilt as force vector
   */
  public getDeviceTilt(): Vec2 {
    if (!this.orientationData) return Vec2Math.ZERO;

    // Convert tilt to normalized force vector
    const maxTilt = 45; // degrees
    const x = MathUtils.clamp(this.orientationData.gamma / maxTilt, -1, 1);
    const y = MathUtils.clamp(this.orientationData.beta / maxTilt, -1, 1);

    return Vec2Math.create(x, -y); // Invert Y for natural feeling
  }

  /**
   * Set event callbacks
   */
  public onTouch(callback: (position: Vec2, type: 'follow' | 'dart') => void): void {
    this.onTouchInteraction = callback;
  }

  public onOrientation(callback: (data: OrientationData) => void): void {
    this.onOrientationChange = callback;
  }

  public onPerformance(callback: (level: number) => void): void {
    this.onPerformanceChange = callback;
  }

  public onGestureDetected(callback: (gesture: GestureState) => void): void {
    this.onGesture = callback;
  }

  /**
   * Get mobile capabilities
   */
  public getCapabilities(): MobileCapabilities {
    return this.capabilities;
  }

  /**
   * Get current performance level
   */
  public getPerformanceLevel(): number {
    return this.performanceLevel;
  }

  /**
   * Dispose of mobile enhancement manager
   */
  public dispose(): void {
    // Clear timers
    if (this.touchDebounceTimer) {
      clearTimeout(this.touchDebounceTimer);
    }

    // Clear touch state
    this.touchState = null;
    this.activeTouches.clear();

    // Remove event listeners (would need element reference)
    this.orientationListenerActive = false;

    // Clear callbacks
    this.onTouchInteraction = undefined;
    this.onOrientationChange = undefined;
    this.onPerformanceChange = undefined;
    this.onGesture = undefined;
  }
}

/**
 * Fish Touch Controller - Integrates mobile enhancements with fish behavior
 */
export class FishTouchController {
  private readonly fish: Fish;
  private readonly mobileManager: MobileEnhancementManager;
  private touchTarget: Vec2 | null = null;
  private touchAttraction: number = 0;
  private orientationForce: Vec2 = Vec2Math.ZERO;

  constructor(fish: Fish, bounds: Bounds, config?: Partial<TouchConfig>) {
    this.fish = fish;
    this.mobileManager = new MobileEnhancementManager(bounds, config);

    this.setupMobileIntegration();
  }

  /**
   * Setup mobile integration callbacks
   */
  private setupMobileIntegration(): void {
    // Touch interaction
    this.mobileManager.onTouch((position, type) => {
      if (type === 'follow') {
        this.touchTarget = position;
        this.touchAttraction = 0.3; // Gentle attraction
      } else if (type === 'dart') {
        // Force fish to dart toward touch position
        this.forceDartToPosition(position);
        this.touchTarget = null;
        this.touchAttraction = 0;
      }
    });

    // Orientation changes
    this.mobileManager.onOrientation(() => {
      this.orientationForce = Vec2Math.multiply(
        this.mobileManager.getDeviceTilt(),
        20 // Force magnitude
      );
    });

    // Performance changes
    this.mobileManager.onPerformance((level) => {
      // Update fish configuration based on performance
      const config = this.getPerformanceAdjustedConfig(level);
      this.fish.updateConfig(config);
    });
  }

  /**
   * Force fish to dart to specific position
   */
  private forceDartToPosition(position: Vec2): void {
    // This would need to be added to the Fish class
    // For now, we can update the fish config to influence behavior
    this.fish.updateConfig({
      dartSpeed: 250, // Faster dart
      dartDuration: 0.6 // Shorter duration
    });
  }

  /**
   * Get performance-adjusted fish configuration
   */
  private getPerformanceAdjustedConfig(performanceLevel: number) {
    const baseSpeed = 30;
    const baseDartSpeed = 200;
    const baseTrailLength = 20;

    return {
      idleSpeed: baseSpeed * performanceLevel,
      dartSpeed: baseDartSpeed * performanceLevel,
      trailLength: Math.max(5, Math.floor(baseTrailLength * performanceLevel)),
      noiseScale: 0.002 * performanceLevel
    };
  }

  /**
   * Start mobile interactions
   */
  public start(element: HTMLElement): void {
    this.mobileManager.startTouchHandling(element);
    this.mobileManager.startOrientationHandling();
  }

  /**
   * Update fish with mobile influences
   */
  public update(deltaTime: number): void {
    // Apply touch attraction
    if (this.touchTarget && this.touchAttraction > 0) {
      const fishPos = this.fish.getPosition();
      const toTarget = Vec2Math.subtract(this.touchTarget, fishPos);
      const distance = Vec2Math.magnitude(toTarget);
      
      if (distance > 10) {
        const attraction = Vec2Math.multiply(
          Vec2Math.normalize(toTarget),
          this.touchAttraction * (distance / 100) // Stronger when further
        );
        
        // This would need Fish class modification to accept external forces
        // For now, this is conceptual
      }
    }

    // Apply orientation forces
    if (Vec2Math.magnitude(this.orientationForce) > 0.1) {
      // Apply tilt as environmental force
      // This would integrate with the Fish class physics system
    }

    // Decay touch attraction
    this.touchAttraction *= 0.95;
    if (this.touchAttraction < 0.01) {
      this.touchTarget = null;
      this.touchAttraction = 0;
    }
  }

  /**
   * Get mobile manager
   */
  public getMobileManager(): MobileEnhancementManager {
    return this.mobileManager;
  }

  /**
   * Dispose of controller
   */
  public dispose(): void {
    this.mobileManager.dispose();
    this.touchTarget = null;
  }
}

// Export utilities for integration
export function isMobileDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
}

export function getTouchTargetSize(): number {
  // Ensure minimum 48x48px touch targets for accessibility
  return Math.max(48, window.innerWidth > 768 ? 60 : 48);
}

export function shouldReduceAnimations(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}