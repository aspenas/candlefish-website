// WebGL Mock for testing Three.js components without a real WebGL context
export class MockWebGLRenderingContext {
  canvas: HTMLCanvasElement;
  drawingBufferWidth = 800;
  drawingBufferHeight = 600;
  
  // WebGL constants
  DEPTH_TEST = 0x0B71;
  DEPTH_BUFFER_BIT = 0x00000100;
  COLOR_BUFFER_BIT = 0x00004000;
  VERTEX_SHADER = 0x8B31;
  FRAGMENT_SHADER = 0x8B30;
  ARRAY_BUFFER = 0x8892;
  STATIC_DRAW = 0x88E4;
  FLOAT = 0x1406;
  
  // Mock implementation tracking
  private programs: WebGLProgram[] = [];
  private shaders: WebGLShader[] = [];
  private buffers: WebGLBuffer[] = [];
  private textures: WebGLTexture[] = [];
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }
  
  // Shader methods
  createShader(type: number): WebGLShader {
    const shader = { type, source: '', compiled: false } as unknown as WebGLShader;
    this.shaders.push(shader);
    return shader;
  }
  
  shaderSource(shader: WebGLShader, source: string): void {
    (shader as any).source = source;
  }
  
  compileShader(shader: WebGLShader): void {
    (shader as any).compiled = true;
  }
  
  getShaderParameter(shader: WebGLShader, pname: number): boolean {
    return (shader as any).compiled;
  }
  
  // Program methods
  createProgram(): WebGLProgram {
    const program = { 
      shaders: [], 
      linked: false,
      uniforms: new Map(),
      attributes: new Map()
    } as unknown as WebGLProgram;
    this.programs.push(program);
    return program;
  }
  
  attachShader(program: WebGLProgram, shader: WebGLShader): void {
    (program as any).shaders.push(shader);
  }
  
  linkProgram(program: WebGLProgram): void {
    (program as any).linked = true;
  }
  
  getProgramParameter(program: WebGLProgram, pname: number): boolean {
    return (program as any).linked;
  }
  
  useProgram(program: WebGLProgram | null): void {
    // Mock implementation - no actual GL state change
  }
  
  getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation {
    const location = { name, program } as unknown as WebGLUniformLocation;
    (program as any).uniforms.set(name, location);
    return location;
  }
  
  getAttribLocation(program: WebGLProgram, name: string): number {
    const location = this.attributes.size;
    (program as any).attributes.set(name, location);
    return location;
  }
  
  // Buffer methods
  createBuffer(): WebGLBuffer {
    const buffer = { data: null, target: null } as unknown as WebGLBuffer;
    this.buffers.push(buffer);
    return buffer;
  }
  
  bindBuffer(target: number, buffer: WebGLBuffer | null): void {
    if (buffer) {
      (buffer as any).target = target;
    }
  }
  
  bufferData(target: number, data: ArrayBuffer | ArrayBufferView, usage: number): void {
    // Mock implementation - store data reference
  }
  
  // Vertex attributes
  enableVertexAttribArray(index: number): void {
    // Mock implementation
  }
  
  vertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number
  ): void {
    // Mock implementation
  }
  
  // Texture methods
  createTexture(): WebGLTexture {
    const texture = { target: null, data: null } as unknown as WebGLTexture;
    this.textures.push(texture);
    return texture;
  }
  
  bindTexture(target: number, texture: WebGLTexture | null): void {
    if (texture) {
      (texture as any).target = target;
    }
  }
  
  texImage2D(
    target: number,
    level: number,
    internalformat: number,
    width: number,
    height: number,
    border: number,
    format: number,
    type: number,
    pixels: ArrayBufferView | null
  ): void;
  texImage2D(
    target: number,
    level: number,
    internalformat: number,
    format: number,
    type: number,
    source: TexImageSource
  ): void;
  texImage2D(...args: any[]): void {
    // Mock implementation
  }
  
  // Uniform methods
  uniform1f(location: WebGLUniformLocation | null, x: number): void {}
  uniform1i(location: WebGLUniformLocation | null, x: number): void {}
  uniform2f(location: WebGLUniformLocation | null, x: number, y: number): void {}
  uniform3f(location: WebGLUniformLocation | null, x: number, y: number, z: number): void {}
  uniform4f(location: WebGLUniformLocation | null, x: number, y: number, z: number, w: number): void {}
  uniformMatrix4fv(location: WebGLUniformLocation | null, transpose: boolean, value: Float32Array): void {}
  
  // Drawing methods
  clear(mask: number): void {
    // Mock implementation
  }
  
  clearColor(red: number, green: number, blue: number, alpha: number): void {
    // Mock implementation
  }
  
  drawArrays(mode: number, first: number, count: number): void {
    // Mock implementation
  }
  
  drawElements(mode: number, count: number, type: number, offset: number): void {
    // Mock implementation
  }
  
  // State management
  enable(cap: number): void {}
  disable(cap: number): void {}
  depthFunc(func: number): void {}
  viewport(x: number, y: number, width: number, height: number): void {}
  
  // Error handling
  getError(): number {
    return 0; // GL_NO_ERROR
  }
  
  // Extension support
  getExtension(name: string): any {
    const extensions: Record<string, any> = {
      'WEBGL_debug_renderer_info': {
        UNMASKED_VENDOR_WEBGL: 0x9245,
        UNMASKED_RENDERER_WEBGL: 0x9246
      },
      'EXT_texture_filter_anisotropic': {
        TEXTURE_MAX_ANISOTROPY_EXT: 0x84FE
      },
      'WEBGL_lose_context': {
        loseContext: () => {},
        restoreContext: () => {}
      }
    };
    return extensions[name] || null;
  }
  
  getSupportedExtensions(): string[] {
    return [
      'WEBGL_debug_renderer_info',
      'EXT_texture_filter_anisotropic',
      'WEBGL_lose_context'
    ];
  }
  
  // Parameter queries
  getParameter(pname: number): any {
    const params: Record<number, any> = {
      0x9245: 'Mock Vendor', // UNMASKED_VENDOR_WEBGL
      0x9246: 'Mock Renderer', // UNMASKED_RENDERER_WEBGL
      0x1F03: '3.0', // VERSION
      0x8B8C: '3.00', // SHADING_LANGUAGE_VERSION
    };
    return params[pname] || null;
  }
}

// Mock HTMLCanvasElement.getContext for WebGL
export const mockWebGLContext = () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  
  HTMLCanvasElement.prototype.getContext = function(
    contextType: string,
    contextAttributes?: any
  ): RenderingContext | null {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return new MockWebGLRenderingContext(this) as any;
    }
    return originalGetContext.call(this, contextType, contextAttributes);
  };
  
  return () => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  };
};

// Mock performance.now for consistent timing in tests
export const mockPerformanceNow = () => {
  const original = performance.now;
  let mockTime = 0;
  
  performance.now = jest.fn(() => mockTime);
  
  const advanceTime = (ms: number) => {
    mockTime += ms;
  };
  
  const reset = () => {
    mockTime = 0;
  };
  
  const restore = () => {
    performance.now = original;
  };
  
  return { advanceTime, reset, restore };
};

// Mock requestAnimationFrame for controlled animation testing
export const mockAnimationFrame = () => {
  let callbacks: Array<(time: number) => void> = [];
  let currentTime = 0;
  let id = 0;
  
  const originalRAF = global.requestAnimationFrame;
  const originalCAF = global.cancelAnimationFrame;
  
  global.requestAnimationFrame = jest.fn((callback) => {
    const currentId = ++id;
    callbacks.push(callback);
    return currentId;
  });
  
  global.cancelAnimationFrame = jest.fn((id) => {
    // Mock implementation - in real scenario would remove callback
  });
  
  const executeFrames = (frameCount: number = 1, deltaTime: number = 16.67) => {
    for (let i = 0; i < frameCount; i++) {
      const currentCallbacks = [...callbacks];
      callbacks = [];
      currentTime += deltaTime;
      
      currentCallbacks.forEach(callback => {
        try {
          callback(currentTime);
        } catch (error) {
          console.error('Animation frame callback error:', error);
        }
      });
    }
  };
  
  const restore = () => {
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCAF;
    callbacks = [];
    currentTime = 0;
    id = 0;
  };
  
  return { executeFrames, restore, getCurrentTime: () => currentTime };
};

// Mock ResizeObserver for responsive components
export const mockResizeObserver = () => {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
  
  const originalResizeObserver = global.ResizeObserver;
  
  global.ResizeObserver = jest.fn(() => mockObserver);
  
  const triggerResize = (element: Element, contentRect: Partial<DOMRectReadOnly>) => {
    const entry = {
      target: element,
      contentRect: {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 800,
        ...contentRect,
      },
    };
    
    // Find callbacks that would be triggered
    const calls = (global.ResizeObserver as jest.Mock).mock.calls;
    calls.forEach(call => {
      const [callback] = call;
      if (typeof callback === 'function') {
        callback([entry]);
      }
    });
  };
  
  const restore = () => {
    global.ResizeObserver = originalResizeObserver;
  };
  
  return { mockObserver, triggerResize, restore };
};

// Comprehensive WebGL testing setup
export const setupWebGLMocks = () => {
  const restoreWebGL = mockWebGLContext();
  const performanceNow = mockPerformanceNow();
  const animationFrame = mockAnimationFrame();
  const resizeObserver = mockResizeObserver();
  
  return {
    restoreAll: () => {
      restoreWebGL();
      performanceNow.restore();
      animationFrame.restore();
      resizeObserver.restore();
    },
    advanceTime: performanceNow.advanceTime,
    executeFrames: animationFrame.executeFrames,
    triggerResize: resizeObserver.triggerResize,
    resetTime: performanceNow.reset,
  };
};