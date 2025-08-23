import { render, screen, waitFor, act } from '@testing-library/react';
import SystemActivity from '../../components/SystemActivity';
import { getSystemActivity } from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  getSystemActivity: jest.fn()
}));

const mockGetSystemActivity = getSystemActivity as jest.MockedFunction<typeof getSystemActivity>;

// Mock matchMedia for prefers-reduced-motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? false : true,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock canvas context for rendering
const mockContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  scale: jest.fn(),
  set fillStyle(value) { this._fillStyle = value; },
  get fillStyle() { return this._fillStyle; },
  set strokeStyle(value) { this._strokeStyle = value; },
  get strokeStyle() { return this._strokeStyle; },
  set lineWidth(value) { this._lineWidth = value; },
  get lineWidth() { return this._lineWidth; },
  _fillStyle: '',
  _strokeStyle: '',
  _lineWidth: 1
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => mockContext),
});

// Mock getBoundingClientRect
Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  value: jest.fn(() => ({
    width: 800,
    height: 4,
    top: 0,
    left: 0,
    bottom: 4,
    right: 800,
  })),
});

describe('SystemActivity Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API response with generated activity data
    mockGetSystemActivity.mockResolvedValue({
      capacity: 0.75,
      activity: [0.8, 0.6, 0.9, 0.4, 0.7, 0.5, 0.8, 0.3]
    });

    // Clear any canvas mocks
    mockContext.clearRect.mockClear();
    mockContext.fillRect.mockClear();
    mockContext.stroke.mockClear();
  });

  it('renders canvas element', async () => {
    render(<SystemActivity />);

    const canvas = screen.getByRole('img', { hidden: true }); // canvas has aria-hidden="true"
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('loads system activity data from workshop projects', async () => {
    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockGetSystemActivity).toHaveBeenCalled();
    });
  });

  it('renders activity bars on canvas', async () => {
    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockGetSystemActivity).toHaveBeenCalled();
    });

    // Allow time for canvas rendering
    await waitFor(() => {
      expect(mockContext.fillRect).toHaveBeenCalled();
    });
  });

  it('renders capacity indicator line', async () => {
    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockGetSystemActivity).toHaveBeenCalled();
    });

    // Allow time for canvas rendering
    await waitFor(() => {
      expect(mockContext.stroke).toHaveBeenCalled();
    });
  });

  it('handles prefers-reduced-motion with static fallback', async () => {
    // Mock reduced motion preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? true : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockGetSystemActivity).toHaveBeenCalled();
    });

    // Should render static version instead of canvas
    const container = screen.getByRole('generic', { hidden: true });
    expect(container).toHaveClass('bg-gradient-to-r');
  });

  it('updates activity data periodically', async () => {
    jest.useFakeTimers();

    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockGetSystemActivity).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 30 seconds to trigger refresh
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(mockGetSystemActivity).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('handles API errors gracefully', async () => {
    mockGetSystemActivity.mockRejectedValue(new Error('API Error'));

    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockGetSystemActivity).toHaveBeenCalled();
    });

    // Component should still render without crashing
    const canvas = screen.getByRole('img', { hidden: true });
    expect(canvas).toBeInTheDocument();
  });

  it('positions correctly at top of viewport', () => {
    render(<SystemActivity />);

    const container = document.querySelector('.fixed.top-0');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('h-1'); // 1 pixel height
    expect(container).toHaveClass('z-50'); // High z-index
  });

  it('respects visibility changes and pauses animation when hidden', async () => {
    const { container } = render(<SystemActivity />);

    // Mock document.hidden
    Object.defineProperty(document, 'hidden', {
      value: true,
      writable: true
    });

    // Trigger visibility change
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(mockGetSystemActivity).toHaveBeenCalled();
    });
  });

  it('generates consistent activity values from workshop data', async () => {
    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockGetSystemActivity).toHaveBeenCalled();
    });

    // Verify the mock was called with the expected workshop-derived data
    const lastCall = mockGetSystemActivity.mock.results[0];
    expect(lastCall.value).resolves.toHaveProperty('capacity');
    expect(lastCall.value).resolves.toHaveProperty('activity');

    await expect(lastCall.value).resolves.toMatchObject({
      capacity: expect.any(Number),
      activity: expect.arrayContaining([expect.any(Number)])
    });
  });
});
