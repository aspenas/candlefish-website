import { render, screen, waitFor, act } from '@testing-library/react';
import SystemActivity from '../../components/SystemActivity';

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
  setLineDash: jest.fn(),
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

// Mock getBoundingClientRect for canvas sizing
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

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(clearTimeout);

// Mock devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 2,
});

describe('SystemActivity Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Clear canvas mocks
    mockContext.clearRect.mockClear();
    mockContext.fillRect.mockClear();
    mockContext.stroke.mockClear();
    mockContext.setLineDash.mockClear();

    // Reset window.matchMedia to default
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? false : true,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('renders canvas element in normal mode', async () => {
    render(<SystemActivity />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('generates initial activity data with 30 bars', async () => {
    render(<SystemActivity />);

    // Wait for initialization and first animation frame
    await waitFor(() => {
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    // Should render 30 bars (based on barCount = 30 in component)
    expect(mockContext.fillRect).toHaveBeenCalledTimes(30);
  });

  it('renders activity bars with correct styling', async () => {
    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    // Should set correct fill style for bars
    expect(mockContext._fillStyle).toBe('rgba(65, 90, 119, 0.25)');
  });

  it('renders capacity indicator line when capacity > 0', async () => {
    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    // Should set stroke style for capacity line
    expect(mockContext._strokeStyle).toBe('rgba(63, 211, 198, 0.15)');
    expect(mockContext._lineWidth).toBe(0.5);
    expect(mockContext.setLineDash).toHaveBeenCalledWith([2, 4]);
    expect(mockContext.moveTo).toHaveBeenCalled();
    expect(mockContext.lineTo).toHaveBeenCalled();
  });

  it('handles prefers-reduced-motion with static fallback', () => {
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

    // Should render static gradient instead of canvas
    const staticElement = document.querySelector('.bg-gradient-to-r');
    expect(staticElement).toBeInTheDocument();
    expect(staticElement).toHaveClass('h-[2px]');

    // Canvas should not be present
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeInTheDocument();
  });

  it('updates activity values with smooth noise animation', async () => {
    jest.useFakeTimers();

    render(<SystemActivity />);

    // Wait for initial render
    await waitFor(() => {
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    const initialCallCount = mockContext.fillRect.mock.calls.length;

    // Advance animation frame
    act(() => {
      jest.advanceTimersByTime(16); // One animation frame
    });

    // Should render again with updated values
    expect(mockContext.fillRect).toHaveBeenCalledTimes(initialCallCount + 30);

    jest.useRealTimers();
  });

  it('positions correctly at top of viewport', () => {
    render(<SystemActivity />);

    const container = document.querySelector('.fixed.top-0');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('h-[4px]'); // 4px height container
    expect(container).toHaveClass('z-50'); // High z-index
    expect(container).toHaveClass('pointer-events-none'); // Non-interactive
  });

  it('handles canvas context unavailability gracefully', async () => {
    // Mock getContext to return null
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null);

    render(<SystemActivity />);

    // Component should render without crashing
    const container = document.querySelector('.fixed.top-0');
    expect(container).toBeInTheDocument();

    // No canvas operations should be attempted
    expect(mockContext.clearRect).not.toHaveBeenCalled();
  });

  it('scales canvas for device pixel ratio', async () => {
    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2); // devicePixelRatio = 2
    });
  });

  it('cleans up animation frames on unmount', async () => {
    jest.useFakeTimers();

    const { unmount } = render(<SystemActivity />);

    // Wait for animation to start
    await waitFor(() => {
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    const cancelAnimationFrameSpy = jest.spyOn(global, 'cancelAnimationFrame');

    // Unmount component
    unmount();

    // Should cancel animation frames
    expect(cancelAnimationFrameSpy).toHaveBeenCalled();

    cancelAnimationFrameSpy.mockRestore();
    jest.useRealTimers();
  });

  it('applies correct bar dimensions and spacing', async () => {
    render(<SystemActivity />);

    await waitFor(() => {
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    // Get first fillRect call to verify dimensions
    const firstCall = mockContext.fillRect.mock.calls[0];
    const [x, y, width, height] = firstCall;

    // Bar width should be 30% of total bar space (totalWidth / barCount * 0.3)
    const expectedBarWidth = (800 / 30) * 0.3;
    expect(width).toBeCloseTo(expectedBarWidth, 1);

    // Height should be between 0.1 * 2px and 1 * 2px (maxHeight = 2)
    expect(height).toBeGreaterThanOrEqual(0.2);
    expect(height).toBeLessThanOrEqual(2);
  });

  it('responds to media query changes', async () => {
    const { rerender } = render(<SystemActivity />);

    // Initially should show canvas
    expect(document.querySelector('canvas')).toBeInTheDocument();

    // Mock media query change to reduced motion
    const mockMediaQuery = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };

    window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

    // Trigger media query change
    act(() => {
      if (mockMediaQuery.addEventListener.mock.calls.length > 0) {
        const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1];
        changeHandler({ matches: true });
      }
    });

    rerender(<SystemActivity />);

    // Should now show static version
    expect(document.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
  });
});
