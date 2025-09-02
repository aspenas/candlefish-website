import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  
  observe() {
    return null;
  }
  
  disconnect() {
    return null;
  }
  
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver  
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  
  observe() {
    return null;
  }
  
  disconnect() {
    return null;
  }
  
  unobserve() {
    return null;
  }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock next/router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 100);
  }
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  send(data) {
    // Mock implementation
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
  
  addEventListener(event, listener) {
    if (event === 'open' && this.readyState === WebSocket.OPEN) {
      setTimeout(listener, 0);
    }
  }
  
  removeEventListener() {
    // Mock implementation
  }
};

// Mock Recharts components to avoid canvas rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => children,
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LineChart: () => <div data-testid="line-chart" />,
  Line: () => null,
  BarChart: () => <div data-testid="bar-chart" />,
  Bar: () => null,
  PieChart: () => <div data-testid="pie-chart" />,
  Pie: () => null,
  Cell: () => null,
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}));

// Extend Jest matchers
expect.extend({
  toBeInTheDocument(received) {
    const pass = received && received.ownerDocument && received.ownerDocument.body.contains(received);
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
      pass,
    };
  }
});

// Global test utilities
global.testUtils = {
  // Mock API responses
  mockApiResponse: (data, delay = 0) => 
    Promise.resolve({ ok: true, json: () => Promise.resolve(data) }),
    
  // Wait for component updates
  waitForUpdate: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Create mock analytics data
  createMockAnalyticsData: () => ({
    agents: [
      {
        id: 'agent-1',
        name: 'Test Agent 1',
        status: 'active',
        performance: {
          responseTime: 120,
          successRate: 98.5,
          errorRate: 1.5
        }
      }
    ],
    services: [
      {
        name: 'api-server',
        status: 'healthy',
        responseTime: 89,
        uptime: 99.9
      }
    ],
    system: {
      cpuUsage: 45.2,
      memoryUsage: 67.8,
      diskUsage: 23.1
    }
  }),
  
  // Create mock WebSocket events
  mockWebSocketEvent: (eventName, data) => ({
    type: eventName,
    data,
    timestamp: new Date().toISOString()
  })
};