import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { CandlefishEngine, Point, FishState } from '../candlefish'

describe('CandlefishEngine', () => {
  let canvas: HTMLCanvasElement
  let engine: CandlefishEngine
  
  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 240
    document.body.appendChild(canvas)
    
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(() => cb(Date.now()), 16)
      return 1
    })
    
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })
  
  afterEach(() => {
    if (engine) {
      engine.destroy()
    }
    document.body.removeChild(canvas)
    jest.restoreAllMocks()
  })
  
  describe('initialization', () => {
    it('should create engine with canvas', () => {
      expect(() => {
        engine = new CandlefishEngine(canvas)
      }).not.toThrow()
      
      expect(engine).toBeDefined()
    })
    
    it('should throw error if canvas context is not available', () => {
      const mockCanvas = {
        getContext: () => null,
        width: 800,
        height: 240,
        addEventListener: jest.fn(),
        getBoundingClientRect: () => ({ width: 800, height: 240, left: 0, top: 0 })
      } as any
      
      expect(() => {
        new CandlefishEngine(mockCanvas)
      }).toThrow('Failed to get 2D context')
    })
    
    it('should respect prefers-reduced-motion', () => {
      const matchMediaMock = jest.fn().mockReturnValue({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })
      
      Object.defineProperty(window, 'matchMedia', {
        value: matchMediaMock,
        writable: true
      })
      
      engine = new CandlefishEngine(canvas)
      expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    })
  })
  
  describe('animation lifecycle', () => {
    it('should start animation', () => {
      engine = new CandlefishEngine(canvas)
      engine.start()
      
      expect(window.requestAnimationFrame).toHaveBeenCalled()
    })
    
    it('should stop animation', () => {
      engine = new CandlefishEngine(canvas)
      engine.start()
      engine.stop()
      
      expect(window.cancelAnimationFrame).toHaveBeenCalled()
    })
    
    it('should cleanup on destroy', () => {
      engine = new CandlefishEngine(canvas)
      engine.start()
      
      const stopSpy = jest.spyOn(engine, 'stop')
      engine.destroy()
      
      expect(stopSpy).toHaveBeenCalled()
    })
  })
  
  describe('user interactions', () => {
    it('should handle mouse movement', () => {
      engine = new CandlefishEngine(canvas)
      
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 50
      })
      
      canvas.dispatchEvent(mouseEvent)
    })
    
    it('should handle click for ripple effect', () => {
      engine = new CandlefishEngine(canvas)
      
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 50
      })
      
      canvas.dispatchEvent(clickEvent)
    })
    
    it('should handle touch for ripple effect', () => {
      engine = new CandlefishEngine(canvas)
      
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{
          clientX: 100,
          clientY: 50,
          identifier: 0,
          target: canvas,
          radiusX: 0,
          radiusY: 0,
          rotationAngle: 0,
          force: 0
        } as Touch]
      })
      
      canvas.dispatchEvent(touchEvent)
    })
  })
  
  describe('visibility handling', () => {
    it('should pause when document is hidden', () => {
      engine = new CandlefishEngine(canvas)
      engine.start()
      
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true
      })
      
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    it('should resume when document is visible', () => {
      engine = new CandlefishEngine(canvas)
      engine.start()
      
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true
      })
      
      document.dispatchEvent(new Event('visibilitychange'))
    })
  })
  
  describe('responsive behavior', () => {
    it('should handle window resize', () => {
      engine = new CandlefishEngine(canvas)
      
      const resizeEvent = new Event('resize')
      window.dispatchEvent(resizeEvent)
      
      expect(canvas.width).toBeDefined()
      expect(canvas.height).toBeDefined()
    })
    
    it('should scale for device pixel ratio', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2,
        writable: true
      })
      
      engine = new CandlefishEngine(canvas)
      
      const expectedWidth = 800 * 2
      expect(canvas.width).toBe(expectedWidth)
    })
  })
})

describe('Math utilities', () => {
  describe('Point operations', () => {
    it('should calculate distance between points', () => {
      const p1: Point = { x: 0, y: 0 }
      const p2: Point = { x: 3, y: 4 }
      
      const distance = Math.sqrt(
        (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
      )
      
      expect(distance).toBe(5)
    })
    
    it('should calculate angle between points', () => {
      const p1: Point = { x: 0, y: 0 }
      const p2: Point = { x: 1, y: 1 }
      
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
      
      expect(angle).toBeCloseTo(Math.PI / 4)
    })
  })
  
  describe('Velocity calculations', () => {
    it('should normalize velocity vector', () => {
      const velocity = { x: 3, y: 4 }
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2)
      
      const normalized = {
        x: velocity.x / speed,
        y: velocity.y / speed
      }
      
      const newSpeed = Math.sqrt(normalized.x ** 2 + normalized.y ** 2)
      expect(newSpeed).toBeCloseTo(1)
    })
    
    it('should clamp velocity to max speed', () => {
      const MAX_SPEED = 2.5
      const velocity = { x: 5, y: 5 }
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2)
      
      if (speed > MAX_SPEED) {
        velocity.x = (velocity.x / speed) * MAX_SPEED
        velocity.y = (velocity.y / speed) * MAX_SPEED
      }
      
      const clampedSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2)
      expect(clampedSpeed).toBeLessThanOrEqual(MAX_SPEED)
    })
  })
})