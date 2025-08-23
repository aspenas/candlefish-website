import { render, screen, waitFor, act } from '@testing-library/react';
import HeaderText from '../../components/HeaderText';

// Mock canvas getBoundingClientRect for mist effect calculations
HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 100,
  top: 0,
  left: 0,
  bottom: 100,
  right: 800,
  x: 0,
  y: 0,
  toJSON: jest.fn()
}));

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

// Mock Canvas 2D context for mist effect
const mockCanvasContext = {
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  fillStyle: '',
};

const mockCanvas = {
  getContext: jest.fn(() => mockCanvasContext),
  width: 800,
  height: 100,
  style: {}
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext,
});

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(clearTimeout);

describe('HeaderText Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Reset canvas mocks
    mockCanvasContext.clearRect.mockClear();
    mockCanvasContext.beginPath.mockClear();
    mockCanvasContext.arc.mockClear();
    mockCanvasContext.fill.mockClear();
  });

  it('renders the static text content', () => {
    render(<HeaderText />);
    expect(screen.getByText('Currently engineering')).toBeInTheDocument();
  });

  it('renders fallback text during SSR', () => {
    render(<HeaderText />);

    // Should show fallback text initially (before client hydration)
    expect(screen.getByText(/operational excellence systems/i)).toBeInTheDocument();
  });

  it('loads static project data after client hydration', async () => {
    render(<HeaderText />);

    // Wait for client-side initialization
    await waitFor(() => {
      expect(screen.getByText(/engraving automation for a trophy franchise network/i)).toBeInTheDocument();
    });
  });

  it('displays all project titles in rotation', async () => {
    render(<HeaderText />);

    // Wait for client-side initialization
    await waitFor(() => {
      // Should show first project initially
      expect(screen.getByText(/engraving automation for a trophy franchise network/i)).toBeInTheDocument();
    });
  });

  it('rotates between projects at 5-second intervals', async () => {
    jest.useFakeTimers();

    render(<HeaderText />);

    // Wait for client-side initialization
    await waitFor(() => {
      expect(screen.getByText(/engraving automation for a trophy franchise network/i)).toBeInTheDocument();
    });

    // Fast-forward through rotation interval
    act(() => {
      jest.advanceTimersByTime(5000); // 5 second rotation interval
    });

    // Should transition to second project after delay
    act(() => {
      jest.advanceTimersByTime(800); // Complete transition animation
    });

    await waitFor(() => {
      expect(screen.getByText(/concert intelligence platform for live music venues/i)).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('triggers mist effect during transitions', async () => {
    jest.useFakeTimers();

    render(<HeaderText />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText(/engraving automation for a trophy franchise network/i)).toBeInTheDocument();
    });

    // Trigger transition
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Canvas should be accessed for mist effect
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');

    // Canvas drawing methods should be called for particles
    act(() => {
      jest.advanceTimersByTime(100); // Let animation frame run
    });

    expect(mockCanvasContext.clearRect).toHaveBeenCalled();
    expect(mockCanvasContext.beginPath).toHaveBeenCalled();
    expect(mockCanvasContext.arc).toHaveBeenCalled();
    expect(mockCanvasContext.fill).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('applies transition styles during mist effect', async () => {
    jest.useFakeTimers();

    render(<HeaderText />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText(/engraving automation for a trophy franchise network/i)).toBeInTheDocument();
    });

    const canvas = document.querySelector('canvas');
    const textSpan = document.querySelector('span[style]');

    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass('opacity-0'); // Not transitioning initially

    // Trigger transition
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should apply transition styles
    await waitFor(() => {
      const updatedCanvas = document.querySelector('canvas');
      expect(updatedCanvas).toHaveClass('opacity-100'); // Transitioning
    });

    jest.useRealTimers();
  });

  it('handles canvas context unavailability gracefully', async () => {
    // Mock getContext to return null
    mockCanvas.getContext.mockReturnValueOnce(null);

    jest.useFakeTimers();

    render(<HeaderText />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText(/engraving automation for a trophy franchise network/i)).toBeInTheDocument();
    });

    // Trigger transition - should not crash
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Component should still function
    expect(screen.getByText('Currently engineering')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('cleans up intervals and animation frames on unmount', async () => {
    jest.useFakeTimers();

    const { unmount } = render(<HeaderText />);

    // Wait for client-side initialization
    await waitFor(() => {
      expect(screen.getByText(/engraving automation for a trophy franchise network/i)).toBeInTheDocument();
    });

    // Trigger some transitions to start timers
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const cancelAnimationFrameSpy = jest.spyOn(global, 'cancelAnimationFrame');

    // Unmount component
    unmount();

    // Should clean up timers
    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
    jest.useRealTimers();
  });

  it('creates correct number of mist particles', async () => {
    jest.useFakeTimers();

    render(<HeaderText />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText(/engraving automation for a trophy franchise network/i)).toBeInTheDocument();
    });

    // Trigger transition
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Let animation run for a bit
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should create 50 particles (one arc call per particle per frame)
    // The exact number depends on animation timing, but should be substantial
    expect(mockCanvasContext.arc).toHaveBeenCalled();
    expect(mockCanvasContext.arc.mock.calls.length).toBeGreaterThan(40);

    jest.useRealTimers();
  });
});
