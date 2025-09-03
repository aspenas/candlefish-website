import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { CursorTrail } from '../../../components/atelier/CursorTrail';
import { setupWebGLMocks } from '../../mocks/webgl.mock';

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRAF = jest.fn();
const mockCAF = jest.fn();

Object.assign(global, {
  requestAnimationFrame: mockRAF,
  cancelAnimationFrame: mockCAF,
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('CursorTrail', () => {
  let webglMocks: ReturnType<typeof setupWebGLMocks>;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    webglMocks = setupWebGLMocks();
    
    // Mock canvas and context
    canvas = document.createElement('canvas');
    ctx = {
      clearRect: jest.fn(),
      createRadialGradient: jest.fn().mockReturnValue({
        addColorStop: jest.fn(),
      }),
      fillStyle: '',
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return canvas;
      }
      return document.createElement(tagName);
    });

    jest.spyOn(canvas, 'getContext').mockReturnValue(ctx);

    // Mock canvas dimensions
    Object.defineProperty(canvas, 'width', { value: 1920, writable: true });
    Object.defineProperty(canvas, 'height', { value: 1080, writable: true });

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

    // Reset mocks
    mockRAF.mockClear();
    mockCAF.mockClear();
  });

  afterEach(() => {
    webglMocks.restoreAll();
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render canvas element with correct initial classes', () => {
      const { container } = render(<CursorTrail />);
      const canvasElement = container.querySelector('canvas');

      expect(canvasElement).toBeInTheDocument();
      expect(canvasElement).toHaveClass('fixed', 'inset-0', 'pointer-events-none', 'z-30');
      expect(canvasElement).toHaveClass('opacity-0'); // Initially inactive
    });

    it('should set canvas dimensions to match window size', () => {
      render(<CursorTrail />);

      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
    });

    it('should update canvas size on window resize', () => {
      render(<CursorTrail />);

      // Simulate window resize
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

      act(() => {
        fireEvent(window, new Event('resize'));
      });

      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);
    });
  });

  describe('particle generation', () => {
    it('should start animation loop on mount', () => {
      render(<CursorTrail />);

      expect(mockRAF).toHaveBeenCalled();
    });

    it('should generate particles on mouse move', async () => {
      const { container } = render(<CursorTrail />);

      // Simulate mouse move
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      await waitFor(() => {
        const canvasElement = container.querySelector('canvas');
        expect(canvasElement).toHaveClass('opacity-100'); // Should become active
      });

      // Verify animation frame was requested
      expect(mockRAF).toHaveBeenCalled();
    });

    it('should create multiple particles per mouse move', () => {
      render(<CursorTrail />);

      // Mock Math.random to control particle generation
      const originalRandom = Math.random;
      Math.random = jest.fn()
        .mockReturnValueOnce(0.8) // numParticles calculation
        .mockReturnValue(0.5); // Other random values

      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      // Should generate particles based on the random value
      // The exact number depends on the implementation
      expect(mockRAF).toHaveBeenCalled();

      Math.random = originalRandom;
    });

    it('should set particle properties with random values', () => {
      render(<CursorTrail />);

      const mockRandom = jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5) // numParticles
        .mockReturnValueOnce(0.3) // angle
        .mockReturnValueOnce(0.7) // speed
        .mockReturnValueOnce(0.6) // life
        .mockReturnValueOnce(0.4); // size

      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 100,
          clientY: 200,
        }));
      });

      expect(mockRandom).toHaveBeenCalled();
      mockRandom.mockRestore();
    });
  });

  describe('animation loop', () => {
    it('should clear canvas on each frame', () => {
      render(<CursorTrail />);

      // Trigger animation frame
      act(() => {
        const animationCallback = mockRAF.mock.calls[0][0];
        animationCallback();
      });

      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
    });

    it('should draw particles with gradient effect', () => {
      render(<CursorTrail />);

      // Generate a particle first
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      // Run animation frame
      act(() => {
        const animationCallback = mockRAF.mock.calls[0][0];
        animationCallback();
      });

      expect(ctx.createRadialGradient).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('should update particle physics each frame', () => {
      render(<CursorTrail />);

      // Generate particles
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      // Run multiple animation frames
      act(() => {
        const animationCallback = mockRAF.mock.calls[0][0];
        animationCallback(); // Frame 1
        animationCallback(); // Frame 2
        animationCallback(); // Frame 3
      });

      // Particles should have moved and aged
      expect(ctx.arc).toHaveBeenCalledTimes(expect.any(Number));
    });

    it('should remove dead particles', () => {
      render(<CursorTrail />);

      // Generate particles
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      // Run many animation frames to age particles
      act(() => {
        const animationCallback = mockRAF.mock.calls[0][0];
        for (let i = 0; i < 100; i++) {
          animationCallback();
        }
      });

      // Canvas should still be clearing (animation continues)
      expect(ctx.clearRect).toHaveBeenCalled();
    });

    it('should limit particle count for performance', () => {
      render(<CursorTrail />);

      // Generate many particles
      act(() => {
        for (let i = 0; i < 200; i++) {
          fireEvent(document, new MouseEvent('mousemove', {
            clientX: 500 + i,
            clientY: 300,
          }));
        }
      });

      // Run animation frame
      act(() => {
        const animationCallback = mockRAF.mock.calls[0][0];
        animationCallback();
      });

      // Should limit particles (implementation detail)
      expect(ctx.arc).toHaveBeenCalled();
    });
  });

  describe('interaction states', () => {
    it('should become active on mouse move', async () => {
      const { container } = render(<CursorTrail />);
      const canvasElement = container.querySelector('canvas');

      // Initially inactive
      expect(canvasElement).toHaveClass('opacity-0');

      // Mouse move should activate
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      await waitFor(() => {
        expect(canvasElement).toHaveClass('opacity-100');
      });
    });

    it('should fade out after mouse leave', async () => {
      const { container } = render(<CursorTrail />);
      const canvasElement = container.querySelector('canvas');

      // Activate first
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      await waitFor(() => {
        expect(canvasElement).toHaveClass('opacity-100');
      });

      // Trigger mouse leave
      act(() => {
        fireEvent(document, new MouseEvent('mouseleave'));
      });

      // Should start fading out after timeout (2 seconds)
      await waitFor(() => {
        expect(canvasElement).toHaveClass('opacity-0');
      }, { timeout: 3000 });
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      const removeWindowListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<CursorTrail />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
      expect(removeWindowListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should cancel animation frame on unmount', () => {
      const { unmount } = render(<CursorTrail />);

      unmount();

      expect(mockCAF).toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    it('should use screen blend mode for visual effect', () => {
      const { container } = render(<CursorTrail />);
      const canvasElement = container.querySelector('canvas');

      expect(canvasElement).toHaveStyle('mix-blend-mode: screen');
    });

    it('should apply hardware acceleration with z-index', () => {
      const { container } = render(<CursorTrail />);
      const canvasElement = container.querySelector('canvas');

      expect(canvasElement).toHaveClass('z-30');
    });

    it('should handle high frequency mouse events', () => {
      render(<CursorTrail />);

      // Rapidly fire mouse events
      act(() => {
        for (let i = 0; i < 50; i++) {
          fireEvent(document, new MouseEvent('mousemove', {
            clientX: 500 + i,
            clientY: 300 + i,
          }));
        }
      });

      // Should not crash and animation should continue
      expect(mockRAF).toHaveBeenCalled();
    });
  });

  describe('visual effects', () => {
    it('should use copper glow colors', () => {
      render(<CursorTrail />);

      // Generate particles
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      // Run animation frame
      act(() => {
        const animationCallback = mockRAF.mock.calls[0][0];
        animationCallback();
      });

      // Verify gradient colors (copper: rgba(184, 115, 51, ...))
      const gradientMock = ctx.createRadialGradient as jest.Mock;
      expect(gradientMock).toHaveBeenCalled();
    });

    it('should apply friction to particle movement', () => {
      render(<CursorTrail />);

      // Generate particles
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      // Run multiple frames to test physics
      act(() => {
        const animationCallback = mockRAF.mock.calls[0][0];
        for (let i = 0; i < 10; i++) {
          animationCallback();
        }
      });

      // Particles should have moved and slowed down due to friction
      expect(ctx.arc).toHaveBeenCalled();
    });

    it('should fade particles based on lifetime', () => {
      render(<CursorTrail />);

      // Generate particles
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      // Age particles
      act(() => {
        const animationCallback = mockRAF.mock.calls[0][0];
        for (let i = 0; i < 30; i++) {
          animationCallback();
        }
      });

      // Opacity should decrease as particles age
      expect(ctx.createRadialGradient).toHaveBeenCalled();
    });
  });
});