/**
 * Test setup for React Testing Library
 * Configures testing environment and global mocks
 */

import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  readyState: WebSocket.OPEN,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}));

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Line: vi.fn(({ data, options }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Line Chart Mock
    </div>
  )),
  Bar: vi.fn(({ data, options }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Bar Chart Mock
    </div>
  )),
  Doughnut: vi.fn(({ data, options }) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Doughnut Chart Mock
    </div>
  )),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
    button: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
    aside: vi.fn(({ children, ...props }) => <aside {...props}>{children}</aside>),
    nav: vi.fn(({ children, ...props }) => <nav {...props}>{children}</nav>),
  },
  AnimatePresence: vi.fn(({ children }) => <>{children}</>),
}));

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: vi.fn(({ children, itemCount, itemSize, ...props }) => (
    <div data-testid="virtualized-list" data-item-count={itemCount} data-item-size={itemSize} {...props}>
      {Array.from({ length: Math.min(itemCount, 10) }, (_, index) =>
        children({ index, style: { height: itemSize } })
      )}
    </div>
  )),
  VariableSizeList: vi.fn(({ children, itemCount, itemSize, ...props }) => (
    <div data-testid="variable-virtualized-list" data-item-count={itemCount} {...props}>
      {Array.from({ length: Math.min(itemCount, 10) }, (_, index) =>
        children({ index, style: { height: typeof itemSize === 'function' ? itemSize(index) : itemSize } })
      )}
    </div>
  )),
}));

// Mock react-window-infinite-loader
vi.mock('react-window-infinite-loader', () => ({
  default: vi.fn(({ children, ...props }) => children(props)),
}));

// Setup MSW
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
  }),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue({}),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0 }),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
});

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Test utilities
export const mockWebSocketService = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  getConnectionState: vi.fn().mockReturnValue('connected'),
};

export const createMockAgent = (overrides = {}) => ({
  id: 'agent-001',
  name: 'Test Agent 001',
  status: 'online' as const,
  version: 'v1.2.3',
  capabilities: ['monitoring', 'analysis'],
  lastSeen: new Date(),
  region: 'us-east-1',
  platform: 'OpenAI',
  ...overrides,
});

export const createMockMetrics = (overrides = {}) => ({
  agentId: 'agent-001',
  timestamp: new Date(),
  cpu: 45.5,
  memory: 62.3,
  requestRate: 150.2,
  errorRate: 2.1,
  responseTime: 95.7,
  throughput: 200.0,
  activeConnections: 25,
  queueDepth: 5,
  diskUsage: 35.8,
  networkLatency: 12.3,
  ...overrides,
});

export const createMockAlert = (overrides = {}) => ({
  id: 'alert-001',
  name: 'High CPU Usage',
  description: 'Alert when CPU usage exceeds threshold',
  metric: 'cpu' as const,
  operator: 'gt' as const,
  threshold: 80.0,
  actions: [],
  enabled: true,
  severity: 'warning' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockRealtimeMetrics = (overrides = {}) => ({
  timestamp: new Date(),
  agents: {
    total: 100,
    online: 85,
    offline: 10,
    warning: 3,
    error: 2,
  },
  system: {
    avgCpu: 45.2,
    avgMemory: 58.7,
    avgResponseTime: 125.3,
    requestRate: 1250.5,
    errorRate: 1.8,
    throughput: 2000.0,
    activeConnections: 450,
  },
  network: {
    latency: 15.2,
    bandwidth: 850.7,
    packetLoss: 0.02,
  },
  ...overrides,
});

// Custom render function with providers
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
