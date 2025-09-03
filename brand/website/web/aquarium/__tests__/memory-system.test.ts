import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { Point } from '../candlefish'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock Date.now for consistent testing
const mockDateNow = jest.spyOn(Date, 'now')

describe('MemorySystem', () => {
  let canvas: HTMLCanvasElement
  let engine: any
  let memorySystem: any
  
  const baseTimestamp = 1000000000000 // Fixed timestamp for testing
  
  beforeEach(() => {
    mockDateNow.mockReturnValue(baseTimestamp)
    
    // Reset localStorage mock
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    
    // Setup canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    document.body.appendChild(canvas)
    
    // Import here to avoid issues with module loading
    const { CandlefishEngine } = require('../candlefish')
    engine = new CandlefishEngine(canvas)
    memorySystem = engine.memorySystem
  })
  
  afterEach(() => {
    if (engine) {
      engine.destroy()
    }
    document.body.removeChild(canvas)
    jest.clearAllMocks()
    mockDateNow.mockRestore()
  })
  
  describe('initialization', () => {
    it('should create new memory when no stored data exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const { CandlefishEngine } = require('../candlefish')
      const newEngine = new CandlefishEngine(canvas)
      const newMemorySystem = newEngine.memorySystem
      
      expect(newMemorySystem.getTrustLevel()).toBe(20)
      expect(newMemorySystem.getFeedingSpots()).toEqual([])
      expect(newMemorySystem.getTimeSinceLastInteraction()).toBe(0)
      
      newEngine.destroy()
    })
    
    it('should load existing memory from localStorage', () => {
      const storedMemory = {
        trustLevel: 75,
        lastInteraction: baseTimestamp - 5000,
        feedingSpots: [{ x: 100, y: 200 }],
        interactionCount: 50,
        behaviorPattern: 'friendly',
        visitDates: [baseTimestamp - 86400000, baseTimestamp],
        personalityQuirks: ['playful']
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedMemory))
      
      const { CandlefishEngine } = require('../candlefish')
      const newEngine = new CandlefishEngine(canvas)
      const newMemorySystem = newEngine.memorySystem
      
      expect(newMemorySystem.getTrustLevel()).toBe(75)
      expect(newMemorySystem.getFeedingSpots()).toEqual([{ x: 100, y: 200 }])
      expect(newMemorySystem.getTimeSinceLastInteraction()).toBe(5000)
      
      newEngine.destroy()
    })
    
    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json data')
      
      const { CandlefishEngine } = require('../candlefish')
      const newEngine = new CandlefishEngine(canvas)
      const newMemorySystem = newEngine.memorySystem
      
      // Should fall back to default values
      expect(newMemorySystem.getTrustLevel()).toBe(20)
      expect(newMemorySystem.getFeedingSpots()).toEqual([])
      
      newEngine.destroy()
    })
    
    it('should decay trust over time since last visit', () => {
      const daysSinceLastVisit = 5
      const originalTrust = 80
      const expectedDecay = originalTrust - daysSinceLastVisit
      
      const storedMemory = {
        trustLevel: originalTrust,
        lastInteraction: baseTimestamp - (daysSinceLastVisit * 24 * 60 * 60 * 1000),
        feedingSpots: [],
        interactionCount: 10,
        behaviorPattern: 'unknown',
        visitDates: [baseTimestamp - (daysSinceLastVisit * 24 * 60 * 60 * 1000)],
        personalityQuirks: []
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedMemory))
      
      const { CandlefishEngine } = require('../candlefish')
      const newEngine = new CandlefishEngine(canvas)
      const newMemorySystem = newEngine.memorySystem
      
      expect(newMemorySystem.getTrustLevel()).toBe(expectedDecay)
      
      newEngine.destroy()
    })
  })
  
  describe('trust management', () => {
    it('should increase trust level', () => {
      const initialTrust = memorySystem.getTrustLevel()
      memorySystem.addTrust(10)
      
      expect(memorySystem.getTrustLevel()).toBe(initialTrust + 10)
    })
    
    it('should decrease trust level', () => {
      memorySystem.addTrust(50) // Set to 70
      memorySystem.addTrust(-20)
      
      expect(memorySystem.getTrustLevel()).toBe(50)
    })
    
    it('should cap trust at 100', () => {
      memorySystem.addTrust(200)
      
      expect(memorySystem.getTrustLevel()).toBe(100)
    })
    
    it('should not let trust go below 0', () => {
      memorySystem.addTrust(-50)
      
      expect(memorySystem.getTrustLevel()).toBe(0)
    })
    
    it('should update last interaction time when trust changes', () => {
      const newTime = baseTimestamp + 10000
      mockDateNow.mockReturnValue(newTime)
      
      memorySystem.addTrust(5)
      
      expect(memorySystem.getTimeSinceLastInteraction()).toBe(0) // Just updated
    })
  })
  
  describe('feeding memory', () => {
    it('should record feeding locations', () => {
      const feedingSpot: Point = { x: 150, y: 250 }
      memorySystem.recordFeeding(feedingSpot)
      
      const spots = memorySystem.getFeedingSpots()
      expect(spots).toContain(feedingSpot)
      expect(spots.length).toBe(1)
    })
    
    it('should limit feeding spots to 10 locations', () => {
      // Add 15 feeding spots
      for (let i = 0; i < 15; i++) {
        memorySystem.recordFeeding({ x: i * 10, y: i * 10 })
      }
      
      const spots = memorySystem.getFeedingSpots()
      expect(spots.length).toBe(10)
      
      // Should contain the last 10 spots (index 5-14)
      expect(spots[0]).toEqual({ x: 50, y: 50 }) // 6th spot added
      expect(spots[9]).toEqual({ x: 140, y: 140 }) // 15th spot added
    })
    
    it('should increase trust when recording feeding', () => {
      const initialTrust = memorySystem.getTrustLevel()
      memorySystem.recordFeeding({ x: 100, y: 100 })
      
      expect(memorySystem.getTrustLevel()).toBe(initialTrust + 3) // +3 for feeding
    })
  })
  
  describe('interaction tracking', () => {
    it('should record interactions and increment count', () => {
      const memoryData = (memorySystem as any).memoryData
      const initialCount = memoryData.interactionCount
      
      memorySystem.recordInteraction('click')
      
      expect(memoryData.interactionCount).toBe(initialCount + 1)
    })
    
    it('should update last interaction timestamp', () => {
      const newTime = baseTimestamp + 5000
      mockDateNow.mockReturnValue(newTime)
      
      memorySystem.recordInteraction('mousemove')
      
      expect(memorySystem.getTimeSinceLastInteraction()).toBe(0)
    })
    
    it('should add daily visit bonus for new days', () => {
      const initialTrust = memorySystem.getTrustLevel()
      
      // Simulate next day
      const nextDay = baseTimestamp + 24 * 60 * 60 * 1000
      mockDateNow.mockReturnValue(nextDay)
      
      memorySystem.recordInteraction('visit')
      
      expect(memorySystem.getTrustLevel()).toBe(initialTrust + 5) // Daily visit bonus
    })
    
    it('should not add daily bonus for same day visits', () => {
      const initialTrust = memorySystem.getTrustLevel()
      
      memorySystem.recordInteraction('visit')
      const trustAfterFirst = memorySystem.getTrustLevel()
      
      // Same day, later time
      mockDateNow.mockReturnValue(baseTimestamp + 3600000) // +1 hour
      memorySystem.recordInteraction('visit')
      
      expect(memorySystem.getTrustLevel()).toBe(trustAfterFirst) // No additional bonus
    })
  })
  
  describe('persistence', () => {
    it('should save memory to localStorage', () => {
      memorySystem.addTrust(10)
      memorySystem.recordFeeding({ x: 50, y: 50 })
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'candlefish_memory',
        expect.stringContaining('"trustLevel":')
      )
    })
    
    it('should handle localStorage save errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })
      
      // Should not throw error
      expect(() => {
        memorySystem.saveMemory()
      }).not.toThrow()
    })
    
    it('should save memory when trust is added', () => {
      localStorageMock.setItem.mockClear()
      memorySystem.addTrust(5)
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
    
    it('should save memory when feeding is recorded', () => {
      localStorageMock.setItem.mockClear()
      memorySystem.recordFeeding({ x: 100, y: 100 })
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
    
    it('should save memory when interaction is recorded', () => {
      localStorageMock.setItem.mockClear()
      memorySystem.recordInteraction('click')
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })
  
  describe('time calculations', () => {
    it('should calculate time since last interaction correctly', () => {
      const interactionTime = baseTimestamp - 30000 // 30 seconds ago
      mockDateNow.mockReturnValue(interactionTime)
      
      memorySystem.recordInteraction('test')
      
      // Now move forward in time
      mockDateNow.mockReturnValue(baseTimestamp)
      
      expect(memorySystem.getTimeSinceLastInteraction()).toBe(30000)
    })
    
    it('should handle edge case when last interaction is in the future', () => {
      const futureTime = baseTimestamp + 5000
      mockDateNow.mockReturnValue(futureTime)
      
      memorySystem.recordInteraction('future')
      
      // Go back to base time
      mockDateNow.mockReturnValue(baseTimestamp)
      
      // Should return negative time (handled gracefully by system)
      expect(memorySystem.getTimeSinceLastInteraction()).toBe(-5000)
    })
  })
  
  describe('visit date tracking', () => {
    it('should track visit dates correctly', () => {
      const memoryData = (memorySystem as any).memoryData
      const initialVisitCount = memoryData.visitDates.length
      
      // Visit on a new day
      const nextDay = baseTimestamp + 24 * 60 * 60 * 1000
      mockDateNow.mockReturnValue(nextDay)
      
      memorySystem.recordInteraction('visit')
      
      expect(memoryData.visitDates.length).toBe(initialVisitCount + 1)
      expect(memoryData.visitDates[memoryData.visitDates.length - 1]).toBe(nextDay)
    })
  })
  
  describe('memory reset', () => {
    it('should reset to default values', () => {
      // Modify memory first
      memorySystem.addTrust(50)
      memorySystem.recordFeeding({ x: 100, y: 100 })
      
      // Reset memory
      const resetMemory = (memorySystem as any).resetMemory
      resetMemory.call(memorySystem)
      
      expect(memorySystem.getTrustLevel()).toBe(20)
      expect(memorySystem.getFeedingSpots()).toEqual([])
    })
  })
})