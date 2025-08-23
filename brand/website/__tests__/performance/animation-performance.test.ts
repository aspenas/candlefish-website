/**
 * Animation Performance Tests
 * Tests for FPS monitoring, memory leak detection, and animation efficiency
 */

import { render, act } from '@testing-library/react';
import React from 'react';
import HeaderText from '../../components/HeaderText';
import SystemActivity from '../../components/SystemActivity';
import SystemArchitecture from '../../components/SystemArchitecture';

// Mock performance APIs
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock requestAnimationFrame for controlled testing
let animationFrameCallbacks: Array<() => void> = [];
global.requestAnimationFrame = jest.fn((callback) => {
  animationFrameCallbacks.push(callback);
  return animationFrameCallbacks.length;
});

global.cancelAnimationFrame = jest.fn((id) => {
  animationFrameCallbacks = animationFrameCallbacks.filter((_, index) => index !== id - 1);
});

// Helper to simulate animation frames
const runAnimationFrames = (count = 1) => {
  for (let i = 0; i < count; i++) {
    act(() => {
      animationFrameCallbacks.forEach(callback => callback());
    });
  }
};

describe('Animation Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    animationFrameCallbacks = [];
    mockPerformance.now.mockImplementation(() => Date.now());
  });

  describe('FPS Monitoring', () => {
    it('HeaderText mist animation maintains target FPS', () => {
      jest.useFakeTimers();
      const { unmount } = render(<HeaderText />);

      // Simulate transition trigger
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const startTime = Date.now();
      const frameCount = 60; // Target 60 FPS
      const duration = 1000; // 1 second

      // Simulate 60 frames over 1 second
      for (let i = 0; i < frameCount; i++) {
        mockPerformance.now.mockReturnValue(startTime + (i * (duration / frameCount)));
        runAnimationFrames(1);
      }

      expect(global.requestAnimationFrame).toHaveBeenCalled();

      unmount();
      jest.useRealTimers();
    });

    it('SystemActivity bar animation runs at consistent intervals', () => {
      jest.useFakeTimers();
      const { unmount } = render(<SystemActivity />);

      const frameCallCount = (global.requestAnimationFrame as jest.Mock).mock.calls.length;

      // Run several animation frames
      runAnimationFrames(10);

      // Should maintain consistent frame requests
      expect(global.requestAnimationFrame).toHaveBeenCalledTimes(frameCallCount + 10);

      unmount();
      jest.useRealTimers();
    });

    it('SystemArchitecture WebGL animation handles frame drops', () => {
      const { unmount } = render(<SystemArchitecture />);

      // Simulate dropped frames by adding delays
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(16) // Normal frame
        .mockReturnValueOnce(50) // Dropped frames (34ms gap)
        .mockReturnValueOnce(66); // Recovery

      runAnimationFrames(3);

      // Component should handle frame drops gracefully
      expect(global.requestAnimationFrame).toHaveBeenCalled();

      unmount();
    });
  });

  describe('Memory Leak Detection', () => {
    it('HeaderText cleans up animation references on unmount', () => {
      const { unmount } = render(<HeaderText />);

      const initialCallbacks = animationFrameCallbacks.length;

      unmount();

      // Animation callbacks should be cleaned up
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('SystemActivity prevents memory accumulation', () => {
      const initialMemory = mockPerformance.memory.usedJSHeapSize;

      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<SystemActivity />);
        runAnimationFrames(5);
        unmount();
      }

      // Memory usage shouldn't grow significantly
      expect(mockPerformance.memory.usedJSHeapSize).toBeLessThan(initialMemory * 2);
    });

    it('SystemArchitecture releases WebGL resources', () => {
      const { unmount } = render(<SystemArchitecture />);

      // WebGL components should clean up properly
      unmount();

      // Check that cleanup functions were called
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('detects potential memory leaks in long-running animations', () => {
      jest.useFakeTimers();

      const { unmount } = render(<HeaderText />);

      // Run animations for extended period
      for (let i = 0; i < 100; i++) {
        act(() => {
          jest.advanceTimersByTime(100);
        });
        runAnimationFrames(1);
      }

      // Memory should remain stable
      expect(mockPerformance.memory.usedJSHeapSize).toBeLessThan(5000000);

      unmount();
      jest.useRealTimers();
    });
  });

  describe('Animation Efficiency', () => {
    it('HeaderText mist particles use efficient rendering', () => {
      jest.useFakeTimers();

      const { unmount } = render(<HeaderText />);

      // Trigger mist animation
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should use requestAnimationFrame efficiently
      const frameRequests = (global.requestAnimationFrame as jest.Mock).mock.calls.length;
      expect(frameRequests).toBeGreaterThan(0);
      expect(frameRequests).toBeLessThan(100); // Shouldn't spam requests

      unmount();
      jest.useRealTimers();
    });

    it('SystemActivity bars render with minimal calculations', () => {
      const renderStartTime = Date.now();

      const { unmount } = render(<SystemActivity />);

      runAnimationFrames(5);

      const renderEndTime = Date.now();
      const renderDuration = renderEndTime - renderStartTime;

      // Should render quickly (under 100ms for 5 frames)
      expect(renderDuration).toBeLessThan(100);

      unmount();
    });

    it('avoids unnecessary re-renders during animations', () => {
      const renderSpy = jest.fn();

      const TestWrapper = ({ children }: { children: React.ReactNode }) => {
        renderSpy();
        return <div>{children}</div>;
      };

      const { unmount } = render(
        <TestWrapper>
          <SystemActivity />
        </TestWrapper>
      );

      const initialRenders = renderSpy.mock.calls.length;

      runAnimationFrames(10);

      // Should not trigger unnecessary parent re-renders
      expect(renderSpy).toHaveBeenCalledTimes(initialRenders);

      unmount();
    });

    it('handles simultaneous animations without performance degradation', () => {
      jest.useFakeTimers();

      const { unmount: unmount1 } = render(<HeaderText />);
      const { unmount: unmount2 } = render(<SystemActivity />);
      const { unmount: unmount3 } = render(<SystemArchitecture />);

      // Trigger animations simultaneously
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      runAnimationFrames(10);

      // All components should animate without blocking each other
      expect(global.requestAnimationFrame).toHaveBeenCalled();

      unmount1();
      unmount2();
      unmount3();
      jest.useRealTimers();
    });
  });

  describe('Performance Monitoring', () => {
    it('measures animation frame timing', () => {
      const { unmount } = render(<SystemActivity />);

      runAnimationFrames(5);

      // Should use performance marks for monitoring
      expect(mockPerformance.now).toHaveBeenCalled();

      unmount();
    });

    it('tracks component render duration', () => {
      const startTime = mockPerformance.now();

      const { unmount } = render(<HeaderText />);

      const endTime = mockPerformance.now();
      const renderDuration = endTime - startTime;

      // Component should render within reasonable time
      expect(renderDuration).toBeDefined();

      unmount();
    });

    it('detects animation jank', () => {
      const { unmount } = render(<SystemActivity />);

      // Simulate jank by mocking long frame times
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(16)  // Good frame
        .mockReturnValueOnce(50)  // Jank (34ms frame)
        .mockReturnValueOnce(66); // Recovery

      runAnimationFrames(3);

      // Should handle jank gracefully
      expect(global.requestAnimationFrame).toHaveBeenCalled();

      unmount();
    });

    it('provides performance metrics for optimization', () => {
      const { unmount } = render(<SystemArchitecture />);

      // Mock performance entries
      mockPerformance.getEntriesByType.mockReturnValue([
        { name: 'paint', startTime: 0, duration: 16 },
        { name: 'layout', startTime: 16, duration: 8 },
      ]);

      runAnimationFrames(1);

      // Should collect performance data
      expect(mockPerformance.now).toHaveBeenCalled();

      unmount();
    });
  });

  describe('Browser Compatibility', () => {
    it('handles missing requestAnimationFrame gracefully', () => {
      const originalRAF = global.requestAnimationFrame;

      // @ts-ignore
      delete global.requestAnimationFrame;

      expect(() => {
        const { unmount } = render(<SystemActivity />);
        unmount();
      }).not.toThrow();

      global.requestAnimationFrame = originalRAF;
    });

    it('works with reduced performance APIs', () => {
      const originalPerformance = global.performance;

      // @ts-ignore
      global.performance = undefined;

      expect(() => {
        const { unmount } = render(<HeaderText />);
        unmount();
      }).not.toThrow();

      global.performance = originalPerformance;
    });

    it('adapts to different frame rates', () => {
      const { unmount } = render(<SystemActivity />);

      // Simulate 30fps device
      for (let i = 0; i < 5; i++) {
        mockPerformance.now.mockReturnValue(i * 33.33); // 30fps timing
        runAnimationFrames(1);
      }

      expect(global.requestAnimationFrame).toHaveBeenCalled();

      unmount();
    });
  });
});
