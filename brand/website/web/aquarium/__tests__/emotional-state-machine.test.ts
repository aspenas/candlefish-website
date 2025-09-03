import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock localStorage for browser environment
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// We need to extract the classes from candlefish.ts since they're not exported
// This is done by importing the file and accessing the classes through the CandlefishEngine
import { CandlefishEngine } from '../candlefish'

describe('EmotionalStateMachine', () => {
  let canvas: HTMLCanvasElement
  let engine: CandlefishEngine
  let emotionalState: any
  
  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    
    // Setup canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    document.body.appendChild(canvas)
    
    // Create engine to access emotional state
    engine = new CandlefishEngine(canvas)
    emotionalState = (engine as any).emotionalState
  })
  
  afterEach(() => {
    if (engine) {
      engine.destroy()
    }
    document.body.removeChild(canvas)
    jest.clearAllMocks()
  })
  
  describe('initialization', () => {
    it('should start in curious state', () => {
      const currentState = emotionalState.getCurrentState()
      expect(currentState.mood).toBe('curious')
      expect(currentState.intensity).toBe(0.5)
      expect(currentState.duration).toBe(0)
    })
    
    it('should initialize with correct transition speed', () => {
      const currentState = emotionalState.getCurrentState()
      expect(currentState.transitionSpeed).toBe(1.0)
    })
  })
  
  describe('state transitions', () => {
    it('should transition to excited state when fed', () => {
      emotionalState.transitionTo('excited', 'feeding', 1.0)
      
      const newState = emotionalState.getCurrentState()
      expect(newState.mood).toBe('excited')
      expect(newState.intensity).toBe(1.0)
      expect(newState.transitionSpeed).toBe(2.0) // excited has faster transition
    })
    
    it('should transition to shy state with fast cursor movement', () => {
      const context = {
        trustLevel: 20,
        timeSinceLastInteraction: 5000,
        cursorPresent: true,
        cursorMovement: 60
      }
      
      emotionalState.update(16, context)
      
      const newState = emotionalState.getCurrentState()
      expect(newState.mood).toBe('shy')
      expect(newState.transitionSpeed).toBe(0.5)
    })
    
    it('should transition to lonely state after timeout', () => {
      const context = {
        trustLevel: 50,
        timeSinceLastInteraction: 70000, // > 60 seconds
        cursorPresent: false,
        cursorMovement: 0
      }
      
      emotionalState.update(16, context)
      
      const newState = emotionalState.getCurrentState()
      expect(newState.mood).toBe('lonely')
    })
    
    it('should transition to trusting state with high trust and cursor presence', () => {
      const context = {
        trustLevel: 85,
        timeSinceLastInteraction: 5000,
        cursorPresent: true,
        cursorMovement: 15
      }
      
      emotionalState.update(16, context)
      
      const newState = emotionalState.getCurrentState()
      expect(newState.mood).toBe('trusting')
      expect(newState.transitionSpeed).toBe(0.8)
    })
    
    it('should transition to playful state with moderate trust and active interaction', () => {
      // First set curious state
      emotionalState.transitionTo('curious', 'test', 0.5)
      
      const context = {
        trustLevel: 60,
        timeSinceLastInteraction: 2000,
        cursorPresent: true,
        cursorMovement: 20
      }
      
      emotionalState.update(16, context)
      
      const newState = emotionalState.getCurrentState()
      expect(newState.mood).toBe('playful')
      expect(newState.transitionSpeed).toBe(1.5)
    })
  })
  
  describe('state history tracking', () => {
    it('should maintain state history', () => {
      emotionalState.transitionTo('excited', 'feeding', 1.0)
      emotionalState.transitionTo('playful', 'interaction', 0.7)
      
      const history = (emotionalState as any).stateHistory
      expect(history.length).toBeGreaterThan(0)
      expect(history[history.length - 1].mood).toBe('excited')
    })
    
    it('should limit state history to 10 entries', () => {
      for (let i = 0; i < 15; i++) {
        const mood = i % 2 === 0 ? 'excited' : 'shy'
        emotionalState.transitionTo(mood, 'test', 0.5)
      }
      
      const history = (emotionalState as any).stateHistory
      expect(history.length).toBeLessThanOrEqual(10)
    })
  })
  
  describe('duration tracking', () => {
    it('should update duration over time', () => {
      const initialState = emotionalState.getCurrentState()
      expect(initialState.duration).toBe(0)
      
      emotionalState.update(1000, {
        trustLevel: 50,
        timeSinceLastInteraction: 5000,
        cursorPresent: false,
        cursorMovement: 0
      })
      
      const updatedState = emotionalState.getCurrentState()
      expect(updatedState.duration).toBe(1000)
    })
  })
  
  describe('transition speed calculation', () => {
    const testCases = [
      { mood: 'excited', expectedSpeed: 2.0 },
      { mood: 'shy', expectedSpeed: 0.5 },
      { mood: 'playful', expectedSpeed: 1.5 },
      { mood: 'trusting', expectedSpeed: 0.8 },
      { mood: 'curious', expectedSpeed: 1.0 },
      { mood: 'lonely', expectedSpeed: 0.6 }
    ]
    
    testCases.forEach(({ mood, expectedSpeed }) => {
      it(`should calculate correct transition speed for ${mood} mood`, () => {
        emotionalState.transitionTo(mood as any, 'test', 0.5)
        
        const state = emotionalState.getCurrentState()
        expect(state.transitionSpeed).toBe(expectedSpeed)
      })
    })
  })
  
  describe('context evaluation', () => {
    it('should prioritize loneliness over other states', () => {
      const context = {
        trustLevel: 90,
        timeSinceLastInteraction: 65000, // > 60 seconds
        cursorPresent: true,
        cursorMovement: 5
      }
      
      emotionalState.update(16, context)
      
      const state = emotionalState.getCurrentState()
      expect(state.mood).toBe('lonely')
    })
    
    it('should return attention to curious from lonely state', () => {
      // Start in lonely state
      emotionalState.transitionTo('lonely', 'timeout', 0.8)
      
      const context = {
        trustLevel: 50,
        timeSinceLastInteraction: 5000,
        cursorPresent: true,
        cursorMovement: 5
      }
      
      emotionalState.update(16, context)
      
      const state = emotionalState.getCurrentState()
      expect(state.mood).toBe('curious')
    })
    
    it('should not transition if already in the target mood', () => {
      emotionalState.transitionTo('excited', 'feeding', 1.0)
      const initialHistory = [...(emotionalState as any).stateHistory]
      
      emotionalState.transitionTo('excited', 'feeding', 1.0)
      const finalHistory = (emotionalState as any).stateHistory
      
      expect(finalHistory.length).toBe(initialHistory.length)
    })
  })
  
  describe('edge cases', () => {
    it('should handle undefined context gracefully', () => {
      expect(() => {
        emotionalState.update(16, undefined)
      }).not.toThrow()
    })
    
    it('should handle negative delta time', () => {
      expect(() => {
        emotionalState.update(-100, {
          trustLevel: 50,
          timeSinceLastInteraction: 5000,
          cursorPresent: true,
          cursorMovement: 10
        })
      }).not.toThrow()
    })
    
    it('should handle extreme trust values', () => {
      const contextHighTrust = {
        trustLevel: 150, // Over 100
        timeSinceLastInteraction: 5000,
        cursorPresent: true,
        cursorMovement: 10
      }
      
      expect(() => {
        emotionalState.update(16, contextHighTrust)
      }).not.toThrow()
      
      const contextNegativeTrust = {
        trustLevel: -50,
        timeSinceLastInteraction: 5000,
        cursorPresent: true,
        cursorMovement: 10
      }
      
      expect(() => {
        emotionalState.update(16, contextNegativeTrust)
      }).not.toThrow()
    })
  })
})