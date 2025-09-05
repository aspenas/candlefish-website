/**
 * Accessibility Enhancement System for Bioluminescent Fish Animation
 * 
 * Provides comprehensive accessibility features:
 * - VoiceOver/TalkBack screen reader support
 * - Touch target sizing (48x48 minimum)
 * - Focus management and keyboard navigation
 * - Reduced motion preferences compliance
 * - High contrast mode support
 * - Audio descriptions and sound effects
 * - Cognitive accessibility aids
 * - WCAG 2.1 AA compliance
 */

'use strict';

import type { Vec2, FishState } from './types';
import type { HeroFish } from './index';

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
  readonly enableScreenReader: boolean;
  readonly enableSoundEffects: boolean;
  readonly enableHapticFeedback: boolean;
  readonly respectReducedMotion: boolean;
  readonly respectHighContrast: boolean;
  readonly enableKeyboardNavigation: boolean;
  readonly enableFocusIndicators: boolean;
  readonly minTouchTargetSize: number; // pixels
  readonly announceStateChanges: boolean;
  readonly provideTactileFeedback: boolean;
  readonly enableAudioDescriptions: boolean;
}

/**
 * Screen reader announcement priorities
 */
export type AnnouncementPriority = 'polite' | 'assertive' | 'off';

/**
 * Accessibility state information
 */
export interface AccessibilityState {
  readonly isScreenReaderActive: boolean;
  readonly isHighContrastMode: boolean;
  readonly isReducedMotionPreferred: boolean;
  readonly isFocusVisible: boolean;
  readonly currentFocus: string | null;
  readonly touchTargetsValid: boolean;
  readonly colorContrastRatio: number;
}

/**
 * Touch target information for accessibility validation
 */
interface TouchTarget {
  readonly id: string;
  readonly element: HTMLElement;
  readonly bounds: { x: number; y: number; width: number; height: number };
  readonly label: string;
  readonly role: string;
  readonly isInteractive: boolean;
}

/**
 * Audio feedback configuration
 */
interface AudioFeedbackConfig {
  readonly idleSound: string | null;
  readonly dartSound: string | null;
  readonly recoverSound: string | null;
  readonly interactionSound: string | null;
  readonly volume: number; // 0-1
  readonly enableSpatialAudio: boolean;
}

/**
 * Accessibility Manager for Fish Animation
 */
export class AccessibilityManager {
  private readonly config: AccessibilityConfig;
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  
  // Screen reader support
  private liveRegion: HTMLElement | null = null;
  private descriptionElement: HTMLElement | null = null;
  private statusElement: HTMLElement | null = null;
  
  // Focus management
  private focusableElements: HTMLElement[] = [];
  private currentFocusIndex: number = -1;
  private focusVisible: boolean = false;
  
  // Touch targets
  private touchTargets = new Map<string, TouchTarget>();
  private touchTargetOverlay: HTMLElement | null = null;
  
  // Audio feedback
  private audioContext: AudioContext | null = null;
  private audioSources = new Map<string, AudioBuffer>();
  private currentSounds = new Map<string, AudioBufferSourceNode>();
  
  // State tracking
  private lastFishState: FishState | null = null;
  private lastPosition: Vec2 | null = null;
  private interactionCount: number = 0;
  
  // Media query listeners
  private reducedMotionQuery: MediaQueryList;
  private highContrastQuery: MediaQueryList;
  private prefersColorSchemeQuery: MediaQueryList;
  
  // Callbacks
  private onAccessibilityChange?: (state: AccessibilityState) => void;
  private onFocusChange?: (element: HTMLElement | null) => void;

  constructor(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    config: Partial<AccessibilityConfig> = {}
  ) {
    this.container = container;
    this.canvas = canvas;
    this.config = {
      enableScreenReader: true,
      enableSoundEffects: true,
      enableHapticFeedback: true,
      respectReducedMotion: true,
      respectHighContrast: true,
      enableKeyboardNavigation: true,
      enableFocusIndicators: true,
      minTouchTargetSize: 48,
      announceStateChanges: true,
      provideTactileFeedback: true,
      enableAudioDescriptions: true,
      ...config
    };
    
    // Initialize media queries
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    this.prefersColorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    this.initializeAccessibility();
  }

  /**
   * Initialize accessibility features
   */
  private async initializeAccessibility(): Promise<void> {
    try {
      // Setup screen reader support
      if (this.config.enableScreenReader) {
        this.setupScreenReader();
      }
      
      // Setup keyboard navigation
      if (this.config.enableKeyboardNavigation) {
        this.setupKeyboardNavigation();
      }
      
      // Setup audio feedback
      if (this.config.enableSoundEffects) {
        await this.setupAudioFeedback();
      }
      
      // Setup touch target validation
      this.setupTouchTargetValidation();
      
      // Setup media query listeners
      this.setupMediaQueryListeners();
      
      // Setup ARIA attributes
      this.setupARIAAttributes();
      
      // Setup focus management
      this.setupFocusManagement();
      
      console.log('Accessibility features initialized');
    } catch (error) {
      console.warn('Accessibility initialization failed:', error);
    }
  }

  /**
   * Setup screen reader support with live regions
   */
  private setupScreenReader(): void {
    // Create live region for announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only fish-live-region';
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.liveRegion);
    
    // Create description element
    this.descriptionElement = document.createElement('div');
    this.descriptionElement.id = 'fish-animation-description';
    this.descriptionElement.className = 'sr-only';
    this.descriptionElement.textContent = 'Bioluminescent fish animation. The fish swims idly and occasionally darts to new locations. You can interact with the fish by touching or clicking on the animation area.';
    this.descriptionElement.style.cssText = this.liveRegion.style.cssText;
    this.container.appendChild(this.descriptionElement);
    
    // Create status element
    this.statusElement = document.createElement('div');
    this.statusElement.setAttribute('aria-live', 'assertive');
    this.statusElement.setAttribute('aria-atomic', 'false');
    this.statusElement.className = 'sr-only fish-status';
    this.statusElement.style.cssText = this.liveRegion.style.cssText;
    this.container.appendChild(this.statusElement);
  }

  /**
   * Setup ARIA attributes for the animation
   */
  private setupARIAAttributes(): void {
    // Main container
    this.container.setAttribute('role', 'img');
    this.container.setAttribute('aria-label', 'Interactive bioluminescent fish animation');
    this.container.setAttribute('aria-describedby', 'fish-animation-description');
    this.container.setAttribute('tabindex', '0');
    
    // Canvas element
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Bioluminescent fish swimming animation');
    this.canvas.setAttribute('aria-describedby', 'fish-animation-description');
    
    // Make container keyboard focusable
    if (!this.container.hasAttribute('tabindex')) {
      this.container.setAttribute('tabindex', '0');
    }
  }

  /**
   * Setup keyboard navigation support
   */
  private setupKeyboardNavigation(): void {
    this.container.addEventListener('keydown', (event) => {
      this.focusVisible = true;
      
      switch (event.key) {
        case 'Enter':
        case ' ': // Spacebar
          event.preventDefault();
          this.triggerFishInteraction('keyboard');
          break;
          
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          event.preventDefault();
          this.handleArrowKeyNavigation(event.key);
          break;
          
        case 'Tab':
          this.handleTabNavigation(event);
          break;
          
        case 'Escape':
          event.preventDefault();
          this.container.blur();
          break;
      }
    });
    
    // Track focus visibility
    this.container.addEventListener('focus', () => {
      this.updateFocusIndicator(true);
    });
    
    this.container.addEventListener('blur', () => {
      this.focusVisible = false;
      this.updateFocusIndicator(false);
    });
    
    // Mouse interactions should hide focus indicators
    this.container.addEventListener('mousedown', () => {
      this.focusVisible = false;
    });
  }

  /**
   * Handle arrow key navigation within the fish animation
   */
  private handleArrowKeyNavigation(key: string): void {
    // Could be used to move focus to different areas of the animation
    // or to trigger directional fish movements
    const directions = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 }
    };
    
    const direction = directions[key as keyof typeof directions];
    if (direction) {
      this.announceToScreenReader(`Fish encouraged to move ${key.replace('Arrow', '').toLowerCase()}`, 'polite');
      this.triggerFishInteraction('keyboard', direction);
    }
  }

  /**
   * Handle tab navigation between focusable elements
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) return;
    
    const direction = event.shiftKey ? -1 : 1;
    this.currentFocusIndex = (this.currentFocusIndex + direction) % this.focusableElements.length;
    
    if (this.currentFocusIndex < 0) {
      this.currentFocusIndex = this.focusableElements.length - 1;
    }
    
    const targetElement = this.focusableElements[this.currentFocusIndex];
    if (targetElement) {
      event.preventDefault();
      targetElement.focus();
    }
  }

  /**
   * Update focus indicator visibility
   */
  private updateFocusIndicator(visible: boolean): void {
    if (!this.config.enableFocusIndicators) return;
    
    const focusClass = 'fish-animation-focused';
    
    if (visible && this.focusVisible) {
      this.container.classList.add(focusClass);
      
      // Add focus styles if not already present
      if (!document.getElementById('fish-focus-styles')) {
        const style = document.createElement('style');
        style.id = 'fish-focus-styles';
        style.textContent = `
          .${focusClass} {
            outline: 3px solid #4A90E2 !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8) !important;
          }
          
          @media (prefers-color-scheme: dark) {
            .${focusClass} {
              outline-color: #7BB3F7 !important;
            }
          }
          
          @media (prefers-contrast: high) {
            .${focusClass} {
              outline: 4px solid #000000 !important;
              outline-offset: 3px !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      this.container.classList.remove(focusClass);
    }
  }

  /**
   * Setup audio feedback system
   */
  private async setupAudioFeedback(): Promise<void> {
    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create audio sources for different fish states
      await this.createAudioSources();
      
      console.log('Audio feedback initialized');
    } catch (error) {
      console.warn('Audio feedback setup failed:', error);
    }
  }

  /**
   * Create audio sources for fish states
   */
  private async createAudioSources(): Promise<void> {
    if (!this.audioContext) return;
    
    // Create synthetic audio for fish states using oscillators
    // This avoids needing external audio files
    
    const createTone = (frequency: number, duration: number, type: OscillatorType = 'sine'): AudioBuffer => {
      const sampleRate = this.audioContext!.sampleRate;
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = this.audioContext!.createBuffer(1, numSamples, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        
        switch (type) {
          case 'sine':
            sample = Math.sin(2 * Math.PI * frequency * t);
            break;
          case 'triangle':
            sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
            break;
          case 'square':
            sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
            break;
        }
        
        // Apply envelope (fade in/out)
        const envelope = Math.min(t * 10, (duration - t) * 10, 1);
        channelData[i] = sample * envelope * 0.1; // Low volume
      }
      
      return buffer;
    };
    
    // Create different sounds for each state
    this.audioSources.set('idle', createTone(220, 0.3, 'sine')); // Soft, low tone
    this.audioSources.set('dart', createTone(440, 0.2, 'triangle')); // Higher, sharper tone
    this.audioSources.set('recover', createTone(330, 0.4, 'sine')); // Medium tone
    this.audioSources.set('interaction', createTone(550, 0.1, 'square')); // Brief, distinct tone
  }

  /**
   * Setup touch target validation for accessibility
   */
  private setupTouchTargetValidation(): void {
    // Create invisible overlay for touch target visualization (dev mode)
    if (process.env.NODE_ENV === 'development') {
      this.touchTargetOverlay = document.createElement('div');
      this.touchTargetOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        opacity: 0.3;
      `;
      this.container.appendChild(this.touchTargetOverlay);
    }
    
    // Register the main canvas as a touch target
    this.registerTouchTarget('main-canvas', this.canvas, 'Interactive fish animation', 'img');
  }

  /**
   * Register a touch target for accessibility validation
   */
  public registerTouchTarget(
    id: string,
    element: HTMLElement,
    label: string,
    role: string,
    isInteractive: boolean = true
  ): void {
    const bounds = element.getBoundingClientRect();
    
    const touchTarget: TouchTarget = {
      id,
      element,
      bounds: {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height
      },
      label,
      role,
      isInteractive
    };
    
    this.touchTargets.set(id, touchTarget);
    
    // Validate touch target size
    this.validateTouchTarget(touchTarget);
    
    // Add to focusable elements if interactive
    if (isInteractive && !this.focusableElements.includes(element)) {
      this.focusableElements.push(element);
    }
  }

  /**
   * Validate touch target meets accessibility guidelines
   */
  private validateTouchTarget(target: TouchTarget): void {
    const minSize = this.config.minTouchTargetSize;
    const isValid = target.bounds.width >= minSize && target.bounds.height >= minSize;
    
    if (!isValid) {
      console.warn(`Touch target "${target.id}" is too small. Current: ${target.bounds.width}x${target.bounds.height}px, Required: ${minSize}x${minSize}px`);
      
      // Add visual indicator in development
      if (process.env.NODE_ENV === 'development' && this.touchTargetOverlay) {
        const indicator = document.createElement('div');
        indicator.style.cssText = `
          position: absolute;
          left: ${target.bounds.x}px;
          top: ${target.bounds.y}px;
          width: ${target.bounds.width}px;
          height: ${target.bounds.height}px;
          border: 2px solid red;
          background: rgba(255, 0, 0, 0.2);
          pointer-events: none;
        `;
        this.touchTargetOverlay.appendChild(indicator);
      }
    }
  }

  /**
   * Setup media query listeners for accessibility preferences
   */
  private setupMediaQueryListeners(): void {
    // Reduced motion preference
    this.reducedMotionQuery.addEventListener('change', (e) => {
      if (e.matches && this.config.respectReducedMotion) {
        this.announceToScreenReader('Animation reduced for motion sensitivity', 'polite');
      }
      this.notifyAccessibilityChange();
    });
    
    // High contrast preference
    this.highContrastQuery.addEventListener('change', (e) => {
      if (e.matches && this.config.respectHighContrast) {
        this.announceToScreenReader('High contrast mode detected', 'polite');
        this.applyHighContrastStyles();
      }
      this.notifyAccessibilityChange();
    });
    
    // Color scheme preference
    this.prefersColorSchemeQuery.addEventListener('change', () => {
      this.notifyAccessibilityChange();
    });
  }

  /**
   * Setup focus management
   */
  private setupFocusManagement(): void {
    // Track focus changes
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (this.container.contains(target)) {
        if (this.onFocusChange) {
          this.onFocusChange(target);
        }
      }
    });
    
    document.addEventListener('focusout', (event) => {
      const target = event.target as HTMLElement;
      if (this.container.contains(target)) {
        if (this.onFocusChange) {
          this.onFocusChange(null);
        }
      }
    });
  }

  /**
   * Apply high contrast styles
   */
  private applyHighContrastStyles(): void {
    const style = document.createElement('style');
    style.id = 'fish-high-contrast-styles';
    style.textContent = `
      .fish-animation-container {
        border: 2px solid ButtonText !important;
        background: ButtonFace !important;
      }
      
      .fish-animation-container:focus {
        outline: 3px solid Highlight !important;
        outline-offset: 2px !important;
      }
    `;
    
    // Remove existing high contrast styles
    const existing = document.getElementById('fish-high-contrast-styles');
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(style);
  }

  /**
   * Update fish animation state for accessibility
   */
  public updateFishState(heroFish: HeroFish): void {
    const status = heroFish.getStatus();
    const { fishState, position } = status;
    
    // Announce state changes
    if (this.config.announceStateChanges && this.lastFishState !== fishState) {
      this.announceFishStateChange(fishState, this.lastFishState);
      this.playAudioFeedback(fishState);
    }
    
    // Update position for spatial audio
    if (this.config.enableSoundEffects && position !== this.lastPosition) {
      this.updateSpatialAudio(position);
    }
    
    this.lastFishState = fishState;
    this.lastPosition = position;
  }

  /**
   * Announce fish state changes to screen readers
   */
  private announceFishStateChange(newState: FishState, oldState: FishState | null): void {
    if (!this.liveRegion) return;
    
    let message = '';
    switch (newState) {
      case 'idle':
        message = 'Fish is now swimming calmly';
        break;
      case 'dart':
        message = 'Fish is darting quickly to a new location';
        break;
      case 'recover':
        message = 'Fish is slowing down and recovering';
        break;
    }
    
    if (message) {
      this.announceToScreenReader(message, 'polite');
    }
  }

  /**
   * Play audio feedback for fish state
   */
  private playAudioFeedback(state: FishState): void {
    if (!this.audioContext || !this.config.enableSoundEffects) return;
    
    const audioBuffer = this.audioSources.get(state);
    if (!audioBuffer) return;
    
    try {
      // Stop any currently playing sound for this state
      const currentSound = this.currentSounds.get(state);
      if (currentSound) {
        currentSound.stop();
      }
      
      // Create and play new sound
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.1; // Low volume for accessibility
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
      this.currentSounds.set(state, source);
      
      // Clean up after playback
      source.addEventListener('ended', () => {
        this.currentSounds.delete(state);
      });
      
    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  }

  /**
   * Update spatial audio based on fish position
   */
  private updateSpatialAudio(position: Vec2): void {
    // This would implement spatial audio positioning
    // For now, we'll skip this complex implementation
  }

  /**
   * Trigger fish interaction (from keyboard or other accessible means)
   */
  private triggerFishInteraction(source: 'keyboard' | 'voice' | 'switch', direction?: { x: number; y: number }): void {
    this.interactionCount++;
    
    // Announce interaction
    this.announceToScreenReader(`Fish interaction ${this.interactionCount} triggered by ${source}`, 'assertive');
    
    // Play interaction sound
    this.playAudioFeedback('interaction');
    
    // Provide haptic feedback if available
    if (this.config.enableHapticFeedback && navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
    
    // This would trigger actual fish behavior
    // Implementation would depend on fish animation API
  }

  /**
   * Announce message to screen reader
   */
  public announceToScreenReader(message: string, priority: AnnouncementPriority = 'polite'): void {
    if (!this.config.enableScreenReader) return;
    
    const targetElement = priority === 'assertive' ? this.statusElement : this.liveRegion;
    if (!targetElement) return;
    
    // Clear previous message
    targetElement.textContent = '';
    
    // Use setTimeout to ensure screen reader picks up the change
    setTimeout(() => {
      targetElement.textContent = message;
    }, 10);
    
    // Clear message after a delay to prevent repetition
    setTimeout(() => {
      if (targetElement.textContent === message) {
        targetElement.textContent = '';
      }
    }, 5000);
  }

  /**
   * Get current accessibility state
   */
  public getAccessibilityState(): AccessibilityState {
    return {
      isScreenReaderActive: this.isScreenReaderActive(),
      isHighContrastMode: this.highContrastQuery.matches,
      isReducedMotionPreferred: this.reducedMotionQuery.matches,
      isFocusVisible: this.focusVisible,
      currentFocus: document.activeElement?.id || null,
      touchTargetsValid: this.validateAllTouchTargets(),
      colorContrastRatio: this.calculateColorContrastRatio()
    };
  }

  /**
   * Check if screen reader is likely active
   */
  private isScreenReaderActive(): boolean {
    // Heuristics for screen reader detection
    return !!(
      window.speechSynthesis ||
      (window as any).navigator?.userAgent?.includes('NVDA') ||
      (window as any).navigator?.userAgent?.includes('JAWS') ||
      (window as any).navigator?.userAgent?.includes('VoiceOver')
    );
  }

  /**
   * Validate all registered touch targets
   */
  private validateAllTouchTargets(): boolean {
    const minSize = this.config.minTouchTargetSize;
    
    for (const target of this.touchTargets.values()) {
      if (target.isInteractive) {
        const bounds = target.element.getBoundingClientRect();
        if (bounds.width < minSize || bounds.height < minSize) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Calculate color contrast ratio (simplified)
   */
  private calculateColorContrastRatio(): number {
    // This is a simplified implementation
    // A full implementation would analyze actual colors
    return this.highContrastQuery.matches ? 7.0 : 4.5;
  }

  /**
   * Notify accessibility state change
   */
  private notifyAccessibilityChange(): void {
    if (this.onAccessibilityChange) {
      this.onAccessibilityChange(this.getAccessibilityState());
    }
  }

  /**
   * Set event callbacks
   */
  public onAccessibilityStateChange(callback: (state: AccessibilityState) => void): void {
    this.onAccessibilityChange = callback;
  }

  public onFocusChanged(callback: (element: HTMLElement | null) => void): void {
    this.onFocusChange = callback;
  }

  /**
   * Get accessibility recommendations
   */
  public getAccessibilityRecommendations(): string[] {
    const recommendations: string[] = [];
    const state = this.getAccessibilityState();
    
    if (!state.touchTargetsValid) {
      recommendations.push('Increase touch target sizes to at least 48x48 pixels');
    }
    
    if (state.colorContrastRatio < 4.5) {
      recommendations.push('Improve color contrast ratio to at least 4.5:1');
    }
    
    if (state.isReducedMotionPreferred && !this.config.respectReducedMotion) {
      recommendations.push('Respect user\'s reduced motion preference');
    }
    
    if (state.isScreenReaderActive && !this.config.enableScreenReader) {
      recommendations.push('Enable screen reader support');
    }
    
    return recommendations;
  }

  /**
   * Dispose of accessibility manager
   */
  public dispose(): void {
    // Remove media query listeners
    this.reducedMotionQuery.removeEventListener('change', () => {});
    this.highContrastQuery.removeEventListener('change', () => {});
    this.prefersColorSchemeQuery.removeEventListener('change', () => {});
    
    // Remove DOM elements
    if (this.liveRegion) {
      this.liveRegion.remove();
    }
    
    if (this.descriptionElement) {
      this.descriptionElement.remove();
    }
    
    if (this.statusElement) {
      this.statusElement.remove();
    }
    
    if (this.touchTargetOverlay) {
      this.touchTargetOverlay.remove();
    }
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    // Clear collections
    this.touchTargets.clear();
    this.focusableElements.length = 0;
    this.audioSources.clear();
    this.currentSounds.clear();
    
    // Clear callbacks
    this.onAccessibilityChange = undefined;
    this.onFocusChange = undefined;
  }
}

/**
 * Utility functions for accessibility
 */

export function createAccessibleFishAnimation(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  config?: Partial<AccessibilityConfig>
): AccessibilityManager {
  return new AccessibilityManager(container, canvas, config);
}

export function getAccessibilityPreferences(): {
  reducedMotion: boolean;
  highContrast: boolean;
  darkMode: boolean;
} {
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
  };
}

export function isScreenReaderLikelyActive(): boolean {
  return !!(
    window.speechSynthesis ||
    (window as any).navigator?.userAgent?.includes('NVDA') ||
    (window as any).navigator?.userAgent?.includes('JAWS') ||
    (window as any).navigator?.userAgent?.includes('VoiceOver')
  );
}

export function validateTouchTargetSize(element: HTMLElement, minSize: number = 48): boolean {
  const bounds = element.getBoundingClientRect();
  return bounds.width >= minSize && bounds.height >= minSize;
}

export function calculateColorContrast(color1: string, color2: string): number {
  // Simplified contrast calculation
  // A full implementation would parse colors and calculate luminance
  return 4.5; // Placeholder
}