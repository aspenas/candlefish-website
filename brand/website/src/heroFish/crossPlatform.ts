/**
 * Cross-Platform Compatibility Layer for Bioluminescent Fish Animation
 * 
 * Provides compatibility bridges for:
 * - React Native WebView integration
 * - Flutter web bridge support
 * - iOS Safari optimizations
 * - Android Chrome optimizations
 * - Mobile viewport handling
 * - Platform-specific performance optimizations
 */

'use strict';

import type { Vec2, Bounds, FishConfig } from './types';
import type { HeroFish } from './index';

/**
 * Platform detection results
 */
export interface PlatformInfo {
  readonly platform: 'web' | 'react-native' | 'flutter' | 'cordova' | 'capacitor';
  readonly browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'webview' | 'unknown';
  readonly os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  readonly version: string;
  readonly isWebView: boolean;
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly supportsWebGL: boolean;
  readonly supportsOffscreenCanvas: boolean;
  readonly supportsWebAssembly: boolean;
  readonly devicePixelRatio: number;
  readonly viewportSize: { width: number; height: number };
  readonly safeArea: { top: number; right: number; bottom: number; left: number };
}

/**
 * Cross-platform configuration
 */
export interface CrossPlatformConfig {
  readonly enableWebViewBridge: boolean;
  readonly enableFlutterBridge: boolean;
  readonly adaptToSafeArea: boolean;
  readonly optimizeForWebView: boolean;
  readonly useNativeComponents: boolean;
  readonly fallbackToCanvas2D: boolean;
  readonly enablePlatformSpecificOptimizations: boolean;
}

/**
 * Platform-specific optimization settings
 */
interface PlatformOptimizations {
  readonly renderingEngine: 'webgl' | 'canvas2d' | 'native';
  readonly pixelRatio: number;
  readonly maxTextureSize: number;
  readonly enableAntialiasing: boolean;
  readonly enableBloom: boolean;
  readonly particleCount: number;
  readonly qualityTier: 'T1' | 'T2' | 'T3' | 'T4';
  readonly frameRateTarget: number;
  readonly memoryLimit: number; // bytes
}

/**
 * Bridge communication interface
 */
interface BridgeMessage {
  readonly type: string;
  readonly data: any;
  readonly timestamp: number;
  readonly id?: string;
}

/**
 * React Native bridge methods
 */
interface ReactNativeBridge {
  postMessage: (message: string) => void;
  onMessage: (handler: (message: string) => void) => void;
}

/**
 * Flutter web bridge methods
 */
interface FlutterBridge {
  callHandler: (method: string, args: any) => Promise<any>;
  registerHandler: (method: string, handler: (args: any) => Promise<any>) => void;
}

/**
 * Cross-Platform Compatibility Manager
 */
export class CrossPlatformManager {
  private readonly platformInfo: PlatformInfo;
  private readonly config: CrossPlatformConfig;
  private readonly optimizations: PlatformOptimizations;
  
  // Platform-specific bridges
  private reactNativeBridge: ReactNativeBridge | null = null;
  private flutterBridge: FlutterBridge | null = null;
  
  // Viewport management
  private viewportMeta: HTMLMetaElement | null = null;
  private safeAreaObserver: ResizeObserver | null = null;
  
  // Message handlers
  private messageHandlers = new Map<string, (data: any) => void>();
  
  // Callbacks
  private onPlatformReady?: () => void;
  private onViewportChange?: (viewport: { width: number; height: number }) => void;
  private onSafeAreaChange?: (safeArea: { top: number; right: number; bottom: number; left: number }) => void;

  constructor(config: Partial<CrossPlatformConfig> = {}) {
    this.platformInfo = this.detectPlatform();
    this.config = {
      enableWebViewBridge: true,
      enableFlutterBridge: true,
      adaptToSafeArea: true,
      optimizeForWebView: true,
      useNativeComponents: false,
      fallbackToCanvas2D: false,
      enablePlatformSpecificOptimizations: true,
      ...config
    };
    
    this.optimizations = this.calculateOptimizations();
    this.initializePlatformSupport();
  }

  /**
   * Detect current platform and capabilities
   */
  private detectPlatform(): PlatformInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    const windowObj = window as any;
    
    // Platform detection
    let platform: PlatformInfo['platform'] = 'web';
    if (windowObj.ReactNativeWebView) platform = 'react-native';
    else if (windowObj.flutter_inappwebview || windowObj.Flutter) platform = 'flutter';
    else if (windowObj.cordova) platform = 'cordova';
    else if (windowObj.Capacitor) platform = 'capacitor';
    
    // Browser detection
    let browser: PlatformInfo['browser'] = 'unknown';
    if (userAgent.includes('chrome') && !userAgent.includes('edge')) browser = 'chrome';
    else if (userAgent.includes('safari') && !userAgent.includes('chrome')) browser = 'safari';
    else if (userAgent.includes('firefox')) browser = 'firefox';
    else if (userAgent.includes('edge')) browser = 'edge';
    
    // OS detection
    let os: PlatformInfo['os'] = 'unknown';
    if (/iphone|ipad|ipod/.test(userAgent)) os = 'ios';
    else if (userAgent.includes('android')) os = 'android';
    else if (userAgent.includes('windows')) os = 'windows';
    else if (userAgent.includes('mac')) os = 'macos';
    else if (userAgent.includes('linux')) os = 'linux';
    
    // Device type detection
    const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/.test(userAgent);
    const isWebView = platform !== 'web' || windowObj.chrome?.webview;
    
    // Capability detection
    const canvas = document.createElement('canvas');
    const supportsWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    const supportsWebAssembly = typeof WebAssembly !== 'undefined';
    
    // Viewport and safe area detection
    const viewportSize = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    const safeArea = this.detectSafeArea();
    
    return {
      platform,
      browser,
      os,
      version: this.extractVersion(userAgent),
      isWebView,
      isMobile,
      isTablet,
      supportsWebGL,
      supportsOffscreenCanvas,
      supportsWebAssembly,
      devicePixelRatio: window.devicePixelRatio || 1,
      viewportSize,
      safeArea
    };
  }

  /**
   * Extract version from user agent
   */
  private extractVersion(userAgent: string): string {
    const patterns = [
      /chrome\/(\d+\.\d+)/,
      /safari\/(\d+\.\d+)/,
      /firefox\/(\d+\.\d+)/,
      /version\/(\d+\.\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = userAgent.match(pattern);
      if (match) return match[1];
    }
    
    return 'unknown';
  }

  /**
   * Detect safe area insets
   */
  private detectSafeArea(): { top: number; right: number; bottom: number; left: number } {
    const computedStyle = getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10)
    };
  }

  /**
   * Calculate platform-specific optimizations
   */
  private calculateOptimizations(): PlatformOptimizations {
    const { platformInfo } = this;
    let optimizations: PlatformOptimizations = {
      renderingEngine: 'webgl',
      pixelRatio: Math.min(platformInfo.devicePixelRatio, 2),
      maxTextureSize: 2048,
      enableAntialiasing: true,
      enableBloom: true,
      particleCount: 12,
      qualityTier: 'T1',
      frameRateTarget: 60,
      memoryLimit: 64 * 1024 * 1024 // 64MB
    };

    // iOS Safari optimizations
    if (platformInfo.os === 'ios' && platformInfo.browser === 'safari') {
      optimizations = {
        ...optimizations,
        pixelRatio: Math.min(platformInfo.devicePixelRatio, 1.5), // Reduce for better performance
        maxTextureSize: 1024, // iOS has texture size limits
        enableAntialiasing: false, // Can be expensive on iOS
        particleCount: 8,
        qualityTier: 'T2',
        frameRateTarget: 30,
        memoryLimit: 32 * 1024 * 1024 // iOS is memory constrained
      };
    }

    // Android Chrome optimizations
    if (platformInfo.os === 'android' && platformInfo.browser === 'chrome') {
      optimizations = {
        ...optimizations,
        pixelRatio: Math.min(platformInfo.devicePixelRatio, 1.5),
        enableAntialiasing: true, // Android Chrome handles this well
        particleCount: 10,
        qualityTier: 'T2',
        frameRateTarget: 60,
        memoryLimit: 48 * 1024 * 1024
      };
    }

    // WebView optimizations
    if (platformInfo.isWebView) {
      optimizations = {
        ...optimizations,
        renderingEngine: this.config.fallbackToCanvas2D ? 'canvas2d' : 'webgl',
        pixelRatio: 1, // Reduce pixel ratio in WebViews
        enableBloom: false, // Disable expensive effects
        particleCount: 6,
        qualityTier: 'T3',
        frameRateTarget: 30,
        memoryLimit: 24 * 1024 * 1024
      };
    }

    // React Native WebView specific optimizations
    if (platformInfo.platform === 'react-native') {
      optimizations = {
        ...optimizations,
        renderingEngine: 'canvas2d', // More reliable in RN WebView
        enableBloom: false,
        particleCount: 4,
        qualityTier: 'T4',
        frameRateTarget: 24
      };
    }

    // Low-end device detection and optimization
    if (this.isLowEndDevice()) {
      optimizations = {
        ...optimizations,
        renderingEngine: 'canvas2d',
        pixelRatio: 1,
        maxTextureSize: 512,
        enableAntialiasing: false,
        enableBloom: false,
        particleCount: 3,
        qualityTier: 'T4',
        frameRateTarget: 24,
        memoryLimit: 16 * 1024 * 1024
      };
    }

    return optimizations;
  }

  /**
   * Detect low-end devices based on various heuristics
   */
  private isLowEndDevice(): boolean {
    // Memory-based detection
    const memoryInfo = (navigator as any).deviceMemory;
    if (memoryInfo && memoryInfo <= 2) return true; // 2GB or less
    
    // Hardware concurrency (CPU cores)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return true;
    
    // Connection-based hint
    const connection = (navigator as any).connection;
    if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
      return true;
    }
    
    // Screen size as proxy for device capability
    const screenArea = screen.width * screen.height;
    if (screenArea < 800 * 600) return true;
    
    return false;
  }

  /**
   * Initialize platform-specific support
   */
  private async initializePlatformSupport(): Promise<void> {
    try {
      // Setup viewport
      this.setupViewport();
      
      // Initialize platform bridges
      if (this.config.enableWebViewBridge && this.platformInfo.platform === 'react-native') {
        this.initializeReactNativeBridge();
      }
      
      if (this.config.enableFlutterBridge && this.platformInfo.platform === 'flutter') {
        this.initializeFlutterBridge();
      }
      
      // Setup safe area handling
      if (this.config.adaptToSafeArea) {
        this.setupSafeAreaHandling();
      }
      
      // Platform-specific polyfills
      this.loadPlatformPolyfills();
      
      if (this.onPlatformReady) {
        this.onPlatformReady();
      }
    } catch (error) {
      console.warn('Platform initialization failed:', error);
    }
  }

  /**
   * Setup viewport meta tag for mobile optimization
   */
  private setupViewport(): void {
    let existingViewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!existingViewport) {
      existingViewport = document.createElement('meta');
      existingViewport.name = 'viewport';
      document.head.appendChild(existingViewport);
    }
    
    this.viewportMeta = existingViewport;
    
    // Platform-specific viewport settings
    let viewportContent = 'width=device-width, initial-scale=1.0';
    
    if (this.platformInfo.os === 'ios') {
      viewportContent += ', viewport-fit=cover'; // Support for safe area
    }
    
    if (this.platformInfo.isWebView) {
      viewportContent += ', user-scalable=no'; // Prevent zooming in WebViews
    }
    
    this.viewportMeta.content = viewportContent;
    
    // Listen for viewport changes
    window.addEventListener('resize', () => {
      if (this.onViewportChange) {
        this.onViewportChange({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    });
  }

  /**
   * Initialize React Native WebView bridge
   */
  private initializeReactNativeBridge(): void {
    const windowObj = window as any;
    
    if (windowObj.ReactNativeWebView) {
      this.reactNativeBridge = {
        postMessage: (message: string) => {
          windowObj.ReactNativeWebView.postMessage(message);
        },
        onMessage: (handler: (message: string) => void) => {
          windowObj.addEventListener('message', (event: MessageEvent) => {
            handler(event.data);
          });
        }
      };
      
      // Setup message handling
      this.reactNativeBridge.onMessage((message) => {
        try {
          const parsed: BridgeMessage = JSON.parse(message);
          const handler = this.messageHandlers.get(parsed.type);
          if (handler) {
            handler(parsed.data);
          }
        } catch (error) {
          console.warn('Failed to parse RN bridge message:', error);
        }
      });
      
      // Register standard handlers
      this.registerMessageHandler('requestAnimationFrame', () => {
        return { fps: 60, supported: true };
      });
      
      console.log('React Native bridge initialized');
    }
  }

  /**
   * Initialize Flutter web bridge
   */
  private initializeFlutterBridge(): void {
    const windowObj = window as any;
    
    if (windowObj.flutter_inappwebview) {
      this.flutterBridge = {
        callHandler: async (method: string, args: any) => {
          return await windowObj.flutter_inappwebview.callHandler(method, args);
        },
        registerHandler: (method: string, handler: (args: any) => Promise<any>) => {
          windowObj[`flutter_${method}`] = handler;
        }
      };
      
      // Register standard handlers
      this.flutterBridge.registerHandler('getAnimationCapabilities', async () => {
        return {
          webgl: this.platformInfo.supportsWebGL,
          offscreenCanvas: this.platformInfo.supportsOffscreenCanvas,
          devicePixelRatio: this.platformInfo.devicePixelRatio,
          optimizations: this.optimizations
        };
      });
      
      console.log('Flutter bridge initialized');
    }
  }

  /**
   * Setup safe area handling for notched devices
   */
  private setupSafeAreaHandling(): void {
    if (!CSS.supports || !CSS.supports('padding-top', 'env(safe-area-inset-top)')) {
      return; // Safe area not supported
    }
    
    // Add CSS custom properties for safe area
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --safe-area-top: env(safe-area-inset-top, 0px);
        --safe-area-right: env(safe-area-inset-right, 0px);
        --safe-area-bottom: env(safe-area-inset-bottom, 0px);
        --safe-area-left: env(safe-area-inset-left, 0px);
      }
      
      .fish-container {
        padding-top: var(--safe-area-top);
        padding-right: var(--safe-area-right);
        padding-bottom: var(--safe-area-bottom);
        padding-left: var(--safe-area-left);
      }
    `;
    document.head.appendChild(style);
    
    // Monitor safe area changes
    if (window.ResizeObserver) {
      this.safeAreaObserver = new ResizeObserver(() => {
        const newSafeArea = this.detectSafeArea();
        if (this.onSafeAreaChange) {
          this.onSafeAreaChange(newSafeArea);
        }
      });
      
      this.safeAreaObserver.observe(document.documentElement);
    }
  }

  /**
   * Load platform-specific polyfills
   */
  private loadPlatformPolyfills(): void {
    // RequestAnimationFrame polyfill for older WebViews
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = (callback) => {
        return window.setTimeout(callback, 1000 / 60);
      };
    }
    
    // Performance.now polyfill
    if (!window.performance || !window.performance.now) {
      if (!window.performance) {
        (window as any).performance = {};
      }
      window.performance.now = () => Date.now();
    }
    
    // IntersectionObserver polyfill for older browsers
    if (!window.IntersectionObserver && this.platformInfo.platform === 'react-native') {
      // Minimal polyfill for RN WebView
      (window as any).IntersectionObserver = class {
        constructor(callback: Function) {
          setTimeout(() => {
            callback([{ intersectionRatio: 1 }]);
          }, 100);
        }
        observe() {}
        disconnect() {}
      };
    }
  }

  /**
   * Register message handler for platform bridges
   */
  private registerMessageHandler(type: string, handler: (data: any) => any): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Send message through appropriate platform bridge
   */
  public sendMessage(type: string, data: any): void {
    const message: BridgeMessage = {
      type,
      data,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    if (this.reactNativeBridge) {
      this.reactNativeBridge.postMessage(JSON.stringify(message));
    } else if (this.flutterBridge) {
      this.flutterBridge.callHandler('webViewMessage', message).catch(console.warn);
    } else {
      // Fallback to custom event
      window.dispatchEvent(new CustomEvent('platform-message', { detail: message }));
    }
  }

  /**
   * Apply platform-specific configuration to fish animation
   */
  public applyPlatformOptimizations(heroFish: HeroFish): void {
    const config = {
      pixelRatio: this.optimizations.pixelRatio,
      enableBloom: this.optimizations.enableBloom,
      targetFPS: this.optimizations.frameRateTarget,
      fishConfig: {
        trailLength: this.optimizations.particleCount,
      }
    };
    
    heroFish.updateConfig(config);
    
    // Set quality tier
    heroFish.setQualityTier(this.optimizations.qualityTier);
  }

  /**
   * Get platform-optimized canvas configuration
   */
  public getCanvasConfig(): {
    width: number;
    height: number;
    pixelRatio: number;
    antialias: boolean;
    alpha: boolean;
  } {
    const viewport = this.platformInfo.viewportSize;
    
    return {
      width: viewport.width,
      height: viewport.height,
      pixelRatio: this.optimizations.pixelRatio,
      antialias: this.optimizations.enableAntialiasing,
      alpha: true
    };
  }

  /**
   * Get platform-safe bounds considering safe area
   */
  public getSafeBounds(): Bounds {
    const { viewportSize, safeArea } = this.platformInfo;
    
    return {
      x: safeArea.left,
      y: safeArea.top,
      width: viewportSize.width - safeArea.left - safeArea.right,
      height: viewportSize.height - safeArea.top - safeArea.bottom
    };
  }

  /**
   * Get platform information
   */
  public getPlatformInfo(): PlatformInfo {
    return this.platformInfo;
  }

  /**
   * Get optimization settings
   */
  public getOptimizations(): PlatformOptimizations {
    return this.optimizations;
  }

  /**
   * Check if running in WebView
   */
  public isWebView(): boolean {
    return this.platformInfo.isWebView;
  }

  /**
   * Check if platform supports specific feature
   */
  public supportsFeature(feature: 'webgl' | 'offscreenCanvas' | 'webAssembly' | 'touch' | 'sensors'): boolean {
    switch (feature) {
      case 'webgl':
        return this.platformInfo.supportsWebGL;
      case 'offscreenCanvas':
        return this.platformInfo.supportsOffscreenCanvas;
      case 'webAssembly':
        return this.platformInfo.supportsWebAssembly;
      case 'touch':
        return 'ontouchstart' in window;
      case 'sensors':
        return 'DeviceOrientationEvent' in window;
      default:
        return false;
    }
  }

  /**
   * Set event callbacks
   */
  public onPlatformReady(callback: () => void): void {
    this.onPlatformReady = callback;
  }

  public onViewportChange(callback: (viewport: { width: number; height: number }) => void): void {
    this.onViewportChange = callback;
  }

  public onSafeAreaChange(callback: (safeArea: { top: number; right: number; bottom: number; left: number }) => void): void {
    this.onSafeAreaChange = callback;
  }

  /**
   * Dispose of cross-platform manager
   */
  public dispose(): void {
    // Disconnect observers
    if (this.safeAreaObserver) {
      this.safeAreaObserver.disconnect();
    }
    
    // Clear message handlers
    this.messageHandlers.clear();
    
    // Clear callbacks
    this.onPlatformReady = undefined;
    this.onViewportChange = undefined;
    this.onSafeAreaChange = undefined;
    
    // Clear bridges
    this.reactNativeBridge = null;
    this.flutterBridge = null;
  }
}

/**
 * Utility functions for cross-platform compatibility
 */

export function createPlatformOptimizedHeroFish(
  canvas: HTMLCanvasElement,
  platformManager: CrossPlatformManager
): Promise<HeroFish> {
  const HeroFishClass = require('./index').HeroFish;
  const config = platformManager.getCanvasConfig();
  const bounds = platformManager.getSafeBounds();
  
  const heroFish = new HeroFishClass({
    canvas,
    bounds,
    pixelRatio: config.pixelRatio,
    enableBloom: platformManager.getOptimizations().enableBloom,
    targetFPS: platformManager.getOptimizations().frameRateTarget
  });
  
  return heroFish.init().then(() => {
    platformManager.applyPlatformOptimizations(heroFish);
    return heroFish;
  });
}

export function detectReactNative(): boolean {
  return !!(window as any).ReactNativeWebView;
}

export function detectFlutter(): boolean {
  return !!(window as any).flutter_inappwebview || !!(window as any).Flutter;
}

export function isIOSSafari(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) && /safari/.test(userAgent) && !/chrome/.test(userAgent);
}

export function isAndroidChrome(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('android') && userAgent.includes('chrome');
}

export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

export function getSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
  if (!CSS.supports || !CSS.supports('padding-top', 'env(safe-area-inset-top)')) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  const computedStyle = getComputedStyle(document.documentElement);
  return {
    top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
    bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10)
  };
}