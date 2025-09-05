/**
 * Web Platform Enhanced Features for Bioluminescent Fish Animation
 * 
 * Provides advanced web-specific interactions and optimizations:
 * - Mouse interaction (hover, click, drag)
 * - Keyboard controls (arrow keys, spacebar)
 * - Scroll-based animations
 * - WebGL shader effects for advanced glow
 * - Web Worker physics calculations
 * - OffscreenCanvas rendering
 * - RequestAnimationFrame optimization
 * - Browser-specific optimizations
 * - Full screen mode support
 */

'use strict';

import type { Vec2, Bounds, FishConfig, PerformanceMetrics } from './types';
import { Vec2Math, MathUtils, BRAND_COLORS } from './types';
import type { Fish } from './fish';

/**
 * Web-specific input capabilities
 */
export interface WebCapabilities {
  readonly mouseSupport: boolean;
  readonly keyboardSupport: boolean;
  readonly scrollSupport: boolean;
  readonly fullscreenSupport: boolean;
  readonly webGLSupport: boolean;
  readonly webWorkersSupport: boolean;
  readonly offscreenCanvasSupport: boolean;
  readonly pointerLockSupport: boolean;
  readonly gamepadSupport: boolean;
  readonly webGLVersion: '1.0' | '2.0' | 'none';
  readonly browserEngine: 'webkit' | 'gecko' | 'blink' | 'unknown';
  readonly gpuTier: 'high' | 'medium' | 'low';
}

/**
 * Mouse interaction configuration
 */
export interface MouseConfig {
  readonly enableMouseFollow: boolean;
  readonly enableMouseDart: boolean;
  readonly enableDrag: boolean;
  readonly mouseRadius: number;
  readonly dartThreshold: number;
  readonly followStrength: number;
  readonly dampening: number;
  readonly cursorHideTimeout: number;
  readonly smoothMouseMovement: boolean;
}

/**
 * Keyboard control configuration
 */
export interface KeyboardConfig {
  readonly enableArrowKeys: boolean;
  readonly enableSpaceDart: boolean;
  readonly enableFullscreenKey: boolean;
  readonly keyForceStrength: number;
  readonly keyRepeatRate: number;
  readonly enableKeyboardShortcuts: boolean;
}

/**
 * Scroll animation configuration
 */
export interface ScrollConfig {
  readonly enableScrollAnimation: boolean;
  readonly scrollInfluenceStrength: number;
  readonly scrollDirection: 'vertical' | 'horizontal' | 'both';
  readonly scrollThreshold: number;
  readonly enableParallax: boolean;
  readonly parallaxDepth: number;
}

/**
 * WebGL shader configuration
 */
export interface WebGLConfig {
  readonly enableWebGL: boolean;
  readonly shaderQuality: 'high' | 'medium' | 'low';
  readonly enableBloom: boolean;
  readonly enableGlow: boolean;
  readonly enableDistortion: boolean;
  readonly bloomIntensity: number;
  readonly glowRadius: number;
  readonly distortionStrength: number;
}

/**
 * Mouse interaction state
 */
interface MouseState {
  position: Vec2;
  velocity: Vec2;
  isInBounds: boolean;
  isDragging: boolean;
  lastMoveTime: number;
  buttons: number;
  wheelDelta: number;
  cursorVisible: boolean;
}

/**
 * Keyboard input state
 */
interface KeyboardState {
  pressedKeys: Set<string>;
  lastKeyTime: number;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
  repeatCount: number;
}

/**
 * Scroll state
 */
interface ScrollState {
  position: Vec2;
  velocity: Vec2;
  direction: Vec2;
  momentum: number;
  lastScrollTime: number;
  isScrolling: boolean;
}

/**
 * Web Enhancement Manager for advanced web-specific features
 */
export class WebEnhancementManager {
  private readonly capabilities: WebCapabilities;
  private readonly mouseConfig: MouseConfig;
  private readonly keyboardConfig: KeyboardConfig;
  private readonly scrollConfig: ScrollConfig;
  private readonly webGLConfig: WebGLConfig;
  private readonly bounds: Bounds;
  
  // Input state
  private mouseState: MouseState;
  private keyboardState: KeyboardState;
  private scrollState: ScrollState;
  
  // Event listeners
  private eventListeners: Map<string, EventListener> = new Map();
  private animationFrame: number = 0;
  private webWorker: Worker | null = null;
  private glContext: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  
  // Timers
  private cursorHideTimer: number = 0;
  private keyRepeatTimer: number = 0;
  private scrollMomentumTimer: number = 0;
  
  // Callbacks
  private onMouseInteraction?: (position: Vec2, type: 'hover' | 'click' | 'drag' | 'wheel', data?: any) => void;
  private onKeyboardInput?: (key: string, action: 'press' | 'release', modifiers: any) => void;
  private onScrollInput?: (position: Vec2, velocity: Vec2, momentum: number) => void;
  private onFullscreenToggle?: (isFullscreen: boolean) => void;
  private onWebGLRender?: (context: WebGL2RenderingContext | WebGLRenderingContext, deltaTime: number) => void;

  constructor(
    bounds: Bounds,
    mouseConfig: Partial<MouseConfig> = {},
    keyboardConfig: Partial<KeyboardConfig> = {},
    scrollConfig: Partial<ScrollConfig> = {},
    webGLConfig: Partial<WebGLConfig> = {}
  ) {
    this.bounds = bounds;
    this.capabilities = this.detectWebCapabilities();
    
    // Initialize configurations
    this.mouseConfig = {
      enableMouseFollow: true,
      enableMouseDart: true,
      enableDrag: false,
      mouseRadius: 80,
      dartThreshold: 300, // pixels/second
      followStrength: 0.4,
      dampening: 0.85,
      cursorHideTimeout: 3000,
      smoothMouseMovement: true,
      ...mouseConfig
    };
    
    this.keyboardConfig = {
      enableArrowKeys: true,
      enableSpaceDart: true,
      enableFullscreenKey: true,
      keyForceStrength: 50,
      keyRepeatRate: 16, // ~60fps
      enableKeyboardShortcuts: true,
      ...keyboardConfig
    };
    
    this.scrollConfig = {
      enableScrollAnimation: true,
      scrollInfluenceStrength: 0.3,
      scrollDirection: 'both',
      scrollThreshold: 10,
      enableParallax: true,
      parallaxDepth: 0.2,
      ...scrollConfig
    };
    
    this.webGLConfig = {
      enableWebGL: this.capabilities.webGLSupport,
      shaderQuality: this.getRecommendedShaderQuality(),
      enableBloom: true,
      enableGlow: true,
      enableDistortion: false,
      bloomIntensity: 1.2,
      glowRadius: 30,
      distortionStrength: 0.1,
      ...webGLConfig
    };
    
    // Initialize state
    this.mouseState = {
      position: Vec2Math.ZERO,
      velocity: Vec2Math.ZERO,
      isInBounds: false,
      isDragging: false,
      lastMoveTime: 0,
      buttons: 0,
      wheelDelta: 0,
      cursorVisible: true
    };
    
    this.keyboardState = {
      pressedKeys: new Set(),
      lastKeyTime: 0,
      modifiers: {
        ctrl: false,
        alt: false,
        shift: false,
        meta: false
      },
      repeatCount: 0
    };
    
    this.scrollState = {
      position: Vec2Math.ZERO,
      velocity: Vec2Math.ZERO,
      direction: Vec2Math.ZERO,
      momentum: 0,
      lastScrollTime: 0,
      isScrolling: false
    };

    this.initializeWebFeatures();
  }

  /**
   * Detect web platform capabilities
   */
  private detectWebCapabilities(): WebCapabilities {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Detect browser engine
    let browserEngine: 'webkit' | 'gecko' | 'blink' | 'unknown' = 'unknown';
    if (userAgent.includes('webkit') && !userAgent.includes('chrome')) {
      browserEngine = 'webkit';
    } else if (userAgent.includes('firefox')) {
      browserEngine = 'gecko';
    } else if (userAgent.includes('chrome') || userAgent.includes('edge')) {
      browserEngine = 'blink';
    }
    
    // Detect WebGL version
    let webGLVersion: '1.0' | '2.0' | 'none' = 'none';
    let webGLSupport = false;
    
    try {
      const canvas = document.createElement('canvas');
      const gl2 = canvas.getContext('webgl2');
      if (gl2) {
        webGLVersion = '2.0';
        webGLSupport = true;
      } else {
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          webGLVersion = '1.0';
          webGLSupport = true;
        }
      }
    } catch (e) {
      webGLSupport = false;
    }
    
    // Estimate GPU tier (simplified)
    let gpuTier: 'high' | 'medium' | 'low' = 'medium';
    if (webGLSupport) {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (gl) {
        const renderer = gl.getParameter(gl.RENDERER).toLowerCase();
        if (renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) {
          gpuTier = 'high';
        } else if (renderer.includes('intel') && !renderer.includes('hd')) {
          gpuTier = 'medium';
        } else {
          gpuTier = 'low';
        }
      }
    }

    return {
      mouseSupport: 'onmousedown' in window,
      keyboardSupport: 'onkeydown' in window,
      scrollSupport: 'onscroll' in window,
      fullscreenSupport: document.fullscreenEnabled || (document as any).webkitFullscreenEnabled || (document as any).mozFullScreenEnabled,
      webGLSupport,
      webWorkersSupport: typeof Worker !== 'undefined',
      offscreenCanvasSupport: typeof OffscreenCanvas !== 'undefined',
      pointerLockSupport: 'requestPointerLock' in Element.prototype,
      gamepadSupport: 'getGamepads' in navigator,
      webGLVersion,
      browserEngine,
      gpuTier
    };
  }

  /**
   * Get recommended shader quality based on capabilities
   */
  private getRecommendedShaderQuality(): 'high' | 'medium' | 'low' {
    if (this.capabilities.gpuTier === 'high' && this.capabilities.webGLVersion === '2.0') {
      return 'high';
    } else if (this.capabilities.gpuTier === 'medium' && this.capabilities.webGLSupport) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Initialize web-specific features
   */
  private async initializeWebFeatures(): Promise<void> {
    // Initialize Web Worker if supported
    if (this.capabilities.webWorkersSupport) {
      await this.initializeWebWorker();
    }
  }

  /**
   * Initialize Web Worker for physics calculations
   */
  private async initializeWebWorker(): Promise<void> {
    try {
      const workerCode = `
        // Fish physics Web Worker
        self.addEventListener('message', function(e) {
          const { type, data } = e.data;
          
          switch (type) {
            case 'CALCULATE_PHYSICS':
              const result = calculatePhysics(data);
              self.postMessage({ type: 'PHYSICS_RESULT', data: result });
              break;
            case 'UPDATE_CONFIG':
              updateConfig(data);
              break;
          }
        });
        
        function calculatePhysics(fishState) {
          // Perform heavy physics calculations in worker
          // This is a simplified version - would include full noise calculations
          const { position, velocity, bounds, deltaTime } = fishState;
          
          // Basic velocity integration
          const newPosition = {
            x: position.x + velocity.x * deltaTime,
            y: position.y + velocity.y * deltaTime
          };
          
          return {
            position: newPosition,
            velocity,
            forces: { x: 0, y: 0 }
          };
        }
        
        function updateConfig(config) {
          // Update worker configuration
        }
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.webWorker = new Worker(URL.createObjectURL(blob));
      
      this.webWorker.addEventListener('message', (e) => {
        const { type, data } = e.data;
        if (type === 'PHYSICS_RESULT') {
          // Handle physics calculation result
          this.handleWebWorkerResult(data);
        }
      });
      
      this.webWorker.addEventListener('error', (error) => {
        console.warn('Web Worker error:', error);
        this.webWorker = null;
      });
      
    } catch (error) {
      console.warn('Failed to initialize Web Worker:', error);
      this.webWorker = null;
    }
  }

  /**
   * Handle Web Worker physics result
   */
  private handleWebWorkerResult(result: any): void {
    // Process physics calculation result from worker
    // This would update fish state based on worker calculations
  }

  /**
   * Start web input handling
   */
  public startWebHandling(element: HTMLElement): void {
    this.setupMouseEvents(element);
    this.setupKeyboardEvents();
    this.setupScrollEvents(element);
    this.setupFullscreenEvents();
  }

  /**
   * Setup mouse event listeners
   */
  private setupMouseEvents(element: HTMLElement): void {
    if (!this.capabilities.mouseSupport) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const position = Vec2Math.create(
        event.clientX - rect.left,
        event.clientY - rect.top
      );
      
      const now = performance.now();
      const deltaTime = (now - this.mouseState.lastMoveTime) / 1000;
      
      if (deltaTime > 0) {
        const velocity = Vec2Math.divide(
          Vec2Math.subtract(position, this.mouseState.position),
          deltaTime
        );
        
        this.mouseState = {
          ...this.mouseState,
          position,
          velocity: this.mouseConfig.smoothMouseMovement ?
            Vec2Math.lerp(this.mouseState.velocity, velocity, 0.3) :
            velocity,
          lastMoveTime: now,
          isInBounds: true,
          cursorVisible: true
        };
      }
      
      // Reset cursor hide timer
      if (this.cursorHideTimer) {
        clearTimeout(this.cursorHideTimer);
      }
      
      this.cursorHideTimer = window.setTimeout(() => {
        this.mouseState.cursorVisible = false;
      }, this.mouseConfig.cursorHideTimeout);
      
      // Trigger interaction callback
      if (this.mouseConfig.enableMouseFollow && this.onMouseInteraction) {
        this.onMouseInteraction(position, 'hover', { velocity: this.mouseState.velocity });
      }
    };

    const handleMouseClick = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const position = Vec2Math.create(
        event.clientX - rect.left,
        event.clientY - rect.top
      );
      
      if (this.mouseConfig.enableMouseDart && this.onMouseInteraction) {
        this.onMouseInteraction(position, 'click', { 
          button: event.button,
          modifiers: {
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey
          }
        });
      }
    };

    const handleMouseLeave = () => {
      this.mouseState.isInBounds = false;
    };

    const handleMouseEnter = () => {
      this.mouseState.isInBounds = true;
    };

    const handleWheel = (event: WheelEvent) => {
      if (this.onMouseInteraction) {
        this.onMouseInteraction(this.mouseState.position, 'wheel', {
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          deltaZ: event.deltaZ,
          deltaMode: event.deltaMode
        });
      }
    };

    // Add event listeners
    element.addEventListener('mousemove', handleMouseMove, { passive: true });
    element.addEventListener('click', handleMouseClick);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('wheel', handleWheel, { passive: true });
    
    // Store for cleanup
    this.eventListeners.set('mousemove', handleMouseMove);
    this.eventListeners.set('click', handleMouseClick);
    this.eventListeners.set('mouseleave', handleMouseLeave);
    this.eventListeners.set('mouseenter', handleMouseEnter);
    this.eventListeners.set('wheel', handleWheel);
  }

  /**
   * Setup keyboard event listeners
   */
  private setupKeyboardEvents(): void {
    if (!this.capabilities.keyboardSupport) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      // Update modifiers
      this.keyboardState.modifiers = {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
      };
      
      // Handle special keys
      if (key === 'f11' || (key === 'f' && this.keyboardState.modifiers.ctrl)) {
        if (this.keyboardConfig.enableFullscreenKey) {
          event.preventDefault();
          this.toggleFullscreen();
          return;
        }
      }
      
      if (key === ' ' && this.keyboardConfig.enableSpaceDart) {
        event.preventDefault();
        if (this.onKeyboardInput) {
          this.onKeyboardInput('space', 'press', this.keyboardState.modifiers);
        }
      }
      
      // Handle arrow keys
      if (this.keyboardConfig.enableArrowKeys && 
          ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        this.keyboardState.pressedKeys.add(key);
        this.keyboardState.lastKeyTime = performance.now();
        
        if (this.onKeyboardInput) {
          this.onKeyboardInput(key, 'press', this.keyboardState.modifiers);
        }
        
        // Start key repeat if not already active
        if (this.keyRepeatTimer === 0) {
          this.startKeyRepeat();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      this.keyboardState.pressedKeys.delete(key);
      
      if (this.onKeyboardInput) {
        this.onKeyboardInput(key, 'release', this.keyboardState.modifiers);
      }
      
      // Stop key repeat if no keys pressed
      if (this.keyboardState.pressedKeys.size === 0 && this.keyRepeatTimer) {
        clearInterval(this.keyRepeatTimer);
        this.keyRepeatTimer = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    this.eventListeners.set('keydown', handleKeyDown);
    this.eventListeners.set('keyup', handleKeyUp);
  }

  /**
   * Start key repeat for held keys
   */
  private startKeyRepeat(): void {
    this.keyRepeatTimer = window.setInterval(() => {
      if (this.keyboardState.pressedKeys.size > 0 && this.onKeyboardInput) {
        this.keyboardState.pressedKeys.forEach(key => {
          this.onKeyboardInput!(key, 'press', this.keyboardState.modifiers);
        });
      }
    }, this.keyboardConfig.keyRepeatRate);
  }

  /**
   * Setup scroll event listeners
   */
  private setupScrollEvents(element: HTMLElement): void {
    if (!this.capabilities.scrollSupport || !this.scrollConfig.enableScrollAnimation) return;

    const handleScroll = () => {
      const now = performance.now();
      const deltaTime = (now - this.scrollState.lastScrollTime) / 1000;
      
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const position = Vec2Math.create(scrollX, scrollY);
      
      if (deltaTime > 0) {
        const velocity = Vec2Math.divide(
          Vec2Math.subtract(position, this.scrollState.position),
          deltaTime
        );
        
        this.scrollState = {
          ...this.scrollState,
          position,
          velocity,
          direction: Vec2Math.normalize(velocity),
          momentum: Vec2Math.magnitude(velocity),
          lastScrollTime: now,
          isScrolling: true
        };
      }
      
      if (this.onScrollInput) {
        this.onScrollInput(position, this.scrollState.velocity, this.scrollState.momentum);
      }
      
      // Clear scroll momentum timer
      if (this.scrollMomentumTimer) {
        clearTimeout(this.scrollMomentumTimer);
      }
      
      // Set scroll end detection
      this.scrollMomentumTimer = window.setTimeout(() => {
        this.scrollState.isScrolling = false;
        this.scrollState.momentum = 0;
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    this.eventListeners.set('scroll', handleScroll);
  }

  /**
   * Setup fullscreen event listeners
   */
  private setupFullscreenEvents(): void {
    if (!this.capabilities.fullscreenSupport) return;

    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement);
      
      if (this.onFullscreenToggle) {
        this.onFullscreenToggle(isFullscreen);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  }

  /**
   * Toggle fullscreen mode
   */
  private toggleFullscreen(): void {
    if (!this.capabilities.fullscreenSupport) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen();
      }
    }
  }

  /**
   * Initialize WebGL context and shaders
   */
  public initializeWebGL(canvas: HTMLCanvasElement): WebGL2RenderingContext | WebGLRenderingContext | null {
    if (!this.webGLConfig.enableWebGL || !this.capabilities.webGLSupport) {
      return null;
    }

    try {
      // Try WebGL 2.0 first
      let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
      
      if (this.capabilities.webGLVersion === '2.0') {
        gl = canvas.getContext('webgl2', {
          alpha: true,
          antialias: true,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance'
        }) as WebGL2RenderingContext;
      }
      
      if (!gl && this.capabilities.webGLVersion === '1.0') {
        gl = canvas.getContext('webgl', {
          alpha: true,
          antialias: true,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance'
        }) as WebGLRenderingContext;
      }
      
      if (!gl) {
        console.warn('WebGL context creation failed');
        return null;
      }
      
      this.glContext = gl;
      this.initializeShaders(gl);
      
      return gl;
      
    } catch (error) {
      console.warn('WebGL initialization failed:', error);
      return null;
    }
  }

  /**
   * Initialize WebGL shaders for advanced effects
   */
  private initializeShaders(gl: WebGL2RenderingContext | WebGLRenderingContext): void {
    // Vertex shader source
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      uniform mat3 u_transform;
      uniform vec2 u_resolution;
      
      varying vec2 v_texCoord;
      varying vec2 v_position;
      
      void main() {
        vec3 position = u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(
          (position.xy / u_resolution) * 2.0 - 1.0,
          0.0,
          1.0
        );
        
        v_texCoord = a_texCoord;
        v_position = a_position;
      }
    `;
    
    // Fragment shader source with advanced effects
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_fishPosition;
      uniform float u_glowRadius;
      uniform float u_bloomIntensity;
      uniform vec3 u_fishColor;
      uniform sampler2D u_texture;
      
      varying vec2 v_texCoord;
      varying vec2 v_position;
      
      // Noise function for organic glow
      float noise(vec2 uv) {
        return fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      float smoothNoise(vec2 uv) {
        vec2 i = floor(uv);
        vec2 f = fract(uv);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = noise(i);
        float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0));
        float d = noise(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      float fbm(vec2 uv) {
        float value = 0.0;
        float amplitude = 0.5;
        
        for (int i = 0; i < 4; i++) {
          value += amplitude * smoothNoise(uv);
          uv *= 2.0;
          amplitude *= 0.5;
        }
        
        return value;
      }
      
      void main() {
        vec2 uv = v_position / u_resolution;
        vec2 fishUV = u_fishPosition / u_resolution;
        
        float distToFish = length(uv - fishUV);
        float glowStrength = u_glowRadius / max(distToFish * u_resolution.x, 1.0);
        
        // Base texture
        vec4 texColor = texture2D(u_texture, v_texCoord);
        
        // Animated noise for organic glow
        float noiseValue = fbm(uv * 8.0 + u_time * 0.1);
        noiseValue += fbm(uv * 16.0 + u_time * 0.05) * 0.5;
        
        // Glow calculation
        float glow = glowStrength * (0.8 + 0.2 * noiseValue);
        glow = smoothstep(0.0, 1.0, glow);
        
        // Fish color with bloom
        vec3 fishGlow = u_fishColor * glow * u_bloomIntensity;
        
        // Combine base texture with glow
        vec3 finalColor = texColor.rgb + fishGlow;
        
        // Add subtle distortion near fish
        if (distToFish < 0.1) {
          vec2 distortion = normalize(uv - fishUV) * sin(u_time * 4.0) * 0.01;
          finalColor += texture2D(u_texture, v_texCoord + distortion).rgb * 0.1;
        }
        
        gl_FragColor = vec4(finalColor, texColor.a);
      }
    `;
    
    // Compile shaders (simplified - would include full error handling)
    this.compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  }

  /**
   * Compile WebGL shader
   */
  private compileShader(gl: WebGL2RenderingContext | WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  /**
   * Get current mouse state
   */
  public getMouseState(): MouseState {
    return { ...this.mouseState };
  }

  /**
   * Get current keyboard state
   */
  public getKeyboardState(): KeyboardState {
    return {
      ...this.keyboardState,
      pressedKeys: new Set(this.keyboardState.pressedKeys)
    };
  }

  /**
   * Get current scroll state
   */
  public getScrollState(): ScrollState {
    return { ...this.scrollState };
  }

  /**
   * Get web capabilities
   */
  public getCapabilities(): WebCapabilities {
    return this.capabilities;
  }

  /**
   * Calculate keyboard force vector from pressed keys
   */
  public getKeyboardForce(): Vec2 {
    let force = Vec2Math.ZERO;
    
    if (this.keyboardState.pressedKeys.has('arrowup')) {
      force = Vec2Math.add(force, Vec2Math.create(0, -this.keyboardConfig.keyForceStrength));
    }
    if (this.keyboardState.pressedKeys.has('arrowdown')) {
      force = Vec2Math.add(force, Vec2Math.create(0, this.keyboardConfig.keyForceStrength));
    }
    if (this.keyboardState.pressedKeys.has('arrowleft')) {
      force = Vec2Math.add(force, Vec2Math.create(-this.keyboardConfig.keyForceStrength, 0));
    }
    if (this.keyboardState.pressedKeys.has('arrowright')) {
      force = Vec2Math.add(force, Vec2Math.create(this.keyboardConfig.keyForceStrength, 0));
    }
    
    return force;
  }

  /**
   * Calculate scroll influence on fish behavior
   */
  public getScrollInfluence(): Vec2 {
    if (!this.scrollState.isScrolling) return Vec2Math.ZERO;
    
    const influence = Vec2Math.multiply(
      this.scrollState.direction,
      this.scrollConfig.scrollInfluenceStrength * Math.min(this.scrollState.momentum / 100, 1.0)
    );
    
    return influence;
  }

  /**
   * Send physics calculation to Web Worker
   */
  public requestPhysicsCalculation(fishState: any): void {
    if (this.webWorker) {
      this.webWorker.postMessage({
        type: 'CALCULATE_PHYSICS',
        data: fishState
      });
    }
  }

  /**
   * Event callback setters
   */
  public onMouse(callback: (position: Vec2, type: 'hover' | 'click' | 'drag' | 'wheel', data?: any) => void): void {
    this.onMouseInteraction = callback;
  }

  public onKeyboard(callback: (key: string, action: 'press' | 'release', modifiers: any) => void): void {
    this.onKeyboardInput = callback;
  }

  public onScroll(callback: (position: Vec2, velocity: Vec2, momentum: number) => void): void {
    this.onScrollInput = callback;
  }

  public onFullscreen(callback: (isFullscreen: boolean) => void): void {
    this.onFullscreenToggle = callback;
  }

  public onWebGL(callback: (context: WebGL2RenderingContext | WebGLRenderingContext, deltaTime: number) => void): void {
    this.onWebGLRender = callback;
  }

  /**
   * Update method called each frame
   */
  public update(deltaTime: number): void {
    // Update mouse state
    if (this.mouseState.isInBounds) {
      // Apply velocity damping
      this.mouseState.velocity = Vec2Math.multiply(this.mouseState.velocity, this.mouseConfig.dampening);
    }
    
    // Update scroll momentum
    if (this.scrollState.isScrolling) {
      this.scrollState.momentum *= 0.95; // Decay momentum
    }
    
    // Trigger WebGL render if enabled
    if (this.glContext && this.onWebGLRender) {
      this.onWebGLRender(this.glContext, deltaTime);
    }
  }

  /**
   * Dispose of web enhancement manager
   */
  public dispose(): void {
    // Clear timers
    if (this.cursorHideTimer) clearTimeout(this.cursorHideTimer);
    if (this.keyRepeatTimer) clearInterval(this.keyRepeatTimer);
    if (this.scrollMomentumTimer) clearTimeout(this.scrollMomentumTimer);
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    
    // Dispose Web Worker
    if (this.webWorker) {
      this.webWorker.terminate();
      this.webWorker = null;
    }
    
    // Remove event listeners
    this.eventListeners.forEach((listener, event) => {
      if (event.startsWith('key')) {
        window.removeEventListener(event, listener as EventListener);
      } else if (event === 'scroll') {
        window.removeEventListener(event, listener as EventListener);
      }
      // Element-specific listeners would need element reference to remove
    });
    
    this.eventListeners.clear();
    
    // Clear WebGL context
    this.glContext = null;
    
    // Clear callbacks
    this.onMouseInteraction = undefined;
    this.onKeyboardInput = undefined;
    this.onScrollInput = undefined;
    this.onFullscreenToggle = undefined;
    this.onWebGLRender = undefined;
  }
}

/**
 * Web Fish Controller - Integrates web enhancements with fish behavior
 */
export class WebFishController {
  private readonly fish: Fish;
  private readonly webManager: WebEnhancementManager;
  private mouseTarget: Vec2 | null = null;
  private keyboardForces: Vec2 = Vec2Math.ZERO;
  private scrollInfluence: Vec2 = Vec2Math.ZERO;
  private isFullscreen: boolean = false;

  constructor(
    fish: Fish,
    bounds: Bounds,
    mouseConfig?: Partial<MouseConfig>,
    keyboardConfig?: Partial<KeyboardConfig>,
    scrollConfig?: Partial<ScrollConfig>,
    webGLConfig?: Partial<WebGLConfig>
  ) {
    this.fish = fish;
    this.webManager = new WebEnhancementManager(
      bounds,
      mouseConfig,
      keyboardConfig,
      scrollConfig,
      webGLConfig
    );

    this.setupWebIntegration();
  }

  /**
   * Setup web integration callbacks
   */
  private setupWebIntegration(): void {
    // Mouse interaction
    this.webManager.onMouse((position, type, data) => {
      switch (type) {
        case 'hover':
          this.mouseTarget = position;
          break;
        case 'click':
          this.forceDartToPosition(position);
          this.mouseTarget = null;
          break;
        case 'wheel':
          this.handleWheelInput(data);
          break;
      }
    });

    // Keyboard interaction
    this.webManager.onKeyboard((key, action, modifiers) => {
      if (action === 'press') {
        if (key === 'space') {
          this.triggerRandomDart();
        }
      }
      
      // Update keyboard forces
      this.keyboardForces = this.webManager.getKeyboardForce();
    });

    // Scroll interaction
    this.webManager.onScroll((position, velocity, momentum) => {
      this.scrollInfluence = this.webManager.getScrollInfluence();
    });

    // Fullscreen toggle
    this.webManager.onFullscreen((isFullscreen) => {
      this.isFullscreen = isFullscreen;
      // Adjust fish behavior for fullscreen
      if (isFullscreen) {
        this.fish.updateConfig({
          dartSpeed: 300, // Faster in fullscreen
          glowRadius: 40   // Larger glow
        });
      } else {
        this.fish.updateConfig({
          dartSpeed: 200,  // Normal speed
          glowRadius: 25   // Normal glow
        });
      }
    });
  }

  /**
   * Force fish to dart to specific position
   */
  private forceDartToPosition(position: Vec2): void {
    // This would need to be implemented in the Fish class
    // For now, we can influence behavior through config updates
  }

  /**
   * Trigger random dart
   */
  private triggerRandomDart(): void {
    this.fish.updateConfig({
      dartSpeed: 250,
      dartDuration: 0.5
    });
  }

  /**
   * Handle mouse wheel input
   */
  private handleWheelInput(data: any): void {
    const { deltaY } = data;
    
    // Adjust fish speed based on wheel direction
    const speedMultiplier = deltaY > 0 ? 1.2 : 0.8;
    this.fish.updateConfig({
      idleSpeed: 30 * speedMultiplier
    });
  }

  /**
   * Initialize WebGL for the canvas
   */
  public initializeWebGL(canvas: HTMLCanvasElement): WebGL2RenderingContext | WebGLRenderingContext | null {
    return this.webManager.initializeWebGL(canvas);
  }

  /**
   * Start web interactions
   */
  public start(element: HTMLElement): void {
    this.webManager.startWebHandling(element);
  }

  /**
   * Update fish with web influences
   */
  public update(deltaTime: number): void {
    this.webManager.update(deltaTime);
    
    // Apply external forces to fish (conceptual - would need Fish class integration)
    const totalForce = Vec2Math.add(
      this.keyboardForces,
      Vec2Math.multiply(this.scrollInfluence, 20)
    );
    
    if (Vec2Math.magnitude(totalForce) > 1) {
      // Apply force to fish physics
      // This would integrate with Fish class physics system
    }
    
    // Handle mouse target attraction
    if (this.mouseTarget) {
      const fishPos = this.fish.getPosition();
      const toMouse = Vec2Math.subtract(this.mouseTarget, fishPos);
      const distance = Vec2Math.magnitude(toMouse);
      
      if (distance > 10) {
        // Calculate attraction force
        const attraction = Vec2Math.multiply(
          Vec2Math.normalize(toMouse),
          Math.min(distance / 100, 1.0) * 30
        );
        
        // Apply attraction (would need Fish class integration)
      }
    }
  }

  /**
   * Get web manager
   */
  public getWebManager(): WebEnhancementManager {
    return this.webManager;
  }

  /**
   * Get current web state summary
   */
  public getWebState() {
    return {
      mouse: this.webManager.getMouseState(),
      keyboard: this.webManager.getKeyboardState(),
      scroll: this.webManager.getScrollState(),
      capabilities: this.webManager.getCapabilities(),
      isFullscreen: this.isFullscreen
    };
  }

  /**
   * Dispose of controller
   */
  public dispose(): void {
    this.webManager.dispose();
    this.mouseTarget = null;
  }
}

// Export utility functions
export function getBrowserEngine(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('webkit') && !userAgent.includes('chrome')) return 'webkit';
  if (userAgent.includes('firefox')) return 'gecko';
  if (userAgent.includes('chrome') || userAgent.includes('edge')) return 'blink';
  return 'unknown';
}

export function getGPUTier(): 'high' | 'medium' | 'low' {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return 'low';
    
    const renderer = gl.getParameter(gl.RENDERER).toLowerCase();
    if (renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) {
      return 'high';
    } else if (renderer.includes('intel') && !renderer.includes('hd')) {
      return 'medium';
    }
    return 'low';
  } catch {
    return 'low';
  }
}

export function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

export function supportsOffscreenCanvas(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}

export function requestHighPerformance(): void {
  // Request high performance mode for better GPU utilization
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      // Trigger GPU warmup
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl', { powerPreference: 'high-performance' });
      if (gl) {
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    });
  }
}