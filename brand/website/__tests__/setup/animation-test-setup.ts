import '@testing-library/jest-dom';
import { server } from '../mocks/animation-api.mock';
import { setupWebGLMocks } from '../mocks/webgl.mock';

// Global test setup for animation tests

// Start MSW server for API mocking
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn'
  });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up MSW after all tests
afterAll(() => {
  server.close();
});

// Global WebGL mock setup
let webglMocks: ReturnType<typeof setupWebGLMocks>;

beforeEach(() => {
  webglMocks = setupWebGLMocks();
});

afterEach(() => {
  if (webglMocks) {
    webglMocks.restoreAll();
  }
});

// Mock IntersectionObserver for animation visibility testing
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}));

// Mock ResizeObserver for responsive animation testing
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock window.matchMedia for media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1920,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 1080,
});

Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: 2,
});

// Mock performance APIs
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB
      jsHeapSizeLimit: 2048 * 1024 * 1024 // 2GB
    }
  } as any;
}

// Mock requestAnimationFrame and cancelAnimationFrame
let animationFrameId = 0;
global.requestAnimationFrame = jest.fn((callback) => {
  animationFrameId++;
  setTimeout(() => callback(performance.now()), 16);
  return animationFrameId;
});

global.cancelAnimationFrame = jest.fn((id) => {
  // Mock implementation
});

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Suppress console errors and warnings in tests unless they're critical
  console.error = jest.fn((message, ...args) => {
    // Only show critical errors
    if (message && typeof message === 'string') {
      if (message.includes('Warning:') || 
          message.includes('React') ||
          message.includes('act()')) {
        // Suppress React warnings in tests
        return;
      }
    }
    originalConsoleError(message, ...args);
  });
  
  console.warn = jest.fn((message, ...args) => {
    // Suppress most warnings in tests
    if (message && typeof message === 'string') {
      if (message.includes('React') || 
          message.includes('Warning:')) {
        return;
      }
    }
    originalConsoleWarn(message, ...args);
  });
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Custom matchers for animation testing
expect.extend({
  toHaveAnimationRunning(canvas: HTMLCanvasElement) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      return {
        message: () => 'Expected element to be a canvas',
        pass: false
      };
    }
    
    // Check if canvas has been drawn on
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        message: () => 'Expected canvas to have 2d context',
        pass: false
      };
    }
    
    // Simple check for drawing activity
    const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
    const hasDrawing = imageData.data.some((pixel, index) => {
      // Check non-alpha channels for any color data
      return index % 4 !== 3 && pixel > 0;
    });
    
    return {
      message: () => hasDrawing 
        ? 'Expected canvas to not have animation running'
        : 'Expected canvas to have animation running',
      pass: hasDrawing
    };
  },
  
  toHavePerformanceWithin(received: number, expected: { min?: number; max?: number }) {
    const { min = -Infinity, max = Infinity } = expected;
    const pass = received >= min && received <= max;
    
    return {
      message: () => pass
        ? `Expected ${received} not to be within ${min}-${max}`
        : `Expected ${received} to be within ${min}-${max}`,
      pass
    };
  }
});

// Global test utilities
export const waitForAnimation = (ms: number = 16) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const waitForAnimationFrame = () => {
  return new Promise(resolve => requestAnimationFrame(resolve));
};

export const generateMousePath = (steps: number = 10) => {
  const path = [];
  for (let i = 0; i < steps; i++) {
    path.push({
      x: 100 + i * 50,
      y: 100 + Math.sin(i * 0.5) * 50
    });
  }
  return path;
};

export const simulateMouseMovement = (path: { x: number; y: number }[]) => {
  return path.map(point => ({
    type: 'mousemove',
    clientX: point.x,
    clientY: point.y
  }));
};

// Global animation test constants
export const ANIMATION_TEST_CONFIG = {
  DEFAULT_TIMEOUT: 5000,
  ANIMATION_FRAME_DELAY: 16,
  MOUSE_MOVE_DELAY: 10,
  PERFORMANCE_SAMPLE_SIZE: 60,
  MEMORY_THRESHOLD_MB: 100,
  MIN_FPS: 30,
  TARGET_FPS: 60
};

// Type augmentation for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAnimationRunning(): R;
      toHavePerformanceWithin(expected: { min?: number; max?: number }): R;
    }
  }
}