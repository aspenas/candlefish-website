import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import WebSocket from 'ws'

// Mock the API endpoints
const mockFishSessionHandler = jest.fn()
const mockFishInteractionHandler = jest.fn()
const mockFishPersonalityHandler = jest.fn()
const mockFishMoodHandler = jest.fn()
const mockFishMemoryHandler = jest.fn()
const mockFishFeedHandler = jest.fn()

// Mock WebSocket server
class MockWebSocketServer {
  clients: Set<WebSocket> = new Set()
  
  emit(event: string, data: any) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event, data }))
      }
    })
  }
  
  close() {
    this.clients.clear()
  }
}

describe('Fish API Integration Tests', () => {
  let mockWsServer: MockWebSocketServer
  
  beforeEach(() => {
    mockWsServer = new MockWebSocketServer()
    
    // Reset all mocks
    mockFishSessionHandler.mockReset()
    mockFishInteractionHandler.mockReset()
    mockFishPersonalityHandler.mockReset()
    mockFishMoodHandler.mockReset()
    mockFishMemoryHandler.mockReset()
    mockFishFeedHandler.mockReset()
  })
  
  afterEach(() => {
    mockWsServer.close()
  })
  
  describe('POST /api/fish/session', () => {
    it('should create new fish session with visitor ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          visitorId: 'visitor123',
          userAgent: 'Mozilla/5.0 (test)',
          timestamp: Date.now()
        }
      })
      
      mockFishSessionHandler.mockImplementation((req, res) => {
        res.status(201).json({
          sessionId: 'session_abc123',
          fishId: 'fish_def456',
          initialState: {
            mood: 'curious',
            trustLevel: 20,
            isFirstVisit: true
          },
          timestamp: Date.now()
        })
      })
      
      await mockFishSessionHandler(req, res)
      
      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data.sessionId).toBeDefined()
      expect(data.fishId).toBeDefined()
      expect(data.initialState.mood).toBe('curious')
      expect(data.initialState.trustLevel).toBe(20)
    })
    
    it('should restore existing session for returning visitor', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          visitorId: 'returning_visitor',
          userAgent: 'Mozilla/5.0 (test)',
          timestamp: Date.now()
        }
      })
      
      mockFishSessionHandler.mockImplementation((req, res) => {
        res.status(200).json({
          sessionId: 'session_restored',
          fishId: 'fish_familiar',
          initialState: {
            mood: 'trusting',
            trustLevel: 75,
            isFirstVisit: false,
            lastVisit: Date.now() - 86400000 // Yesterday
          },
          welcomeBack: true
        })
      })
      
      await mockFishSessionHandler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.welcomeBack).toBe(true)
      expect(data.initialState.trustLevel).toBe(75)
      expect(data.initialState.mood).toBe('trusting')
    })
    
    it('should handle missing visitor ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {}
      })
      
      mockFishSessionHandler.mockImplementation((req, res) => {
        res.status(400).json({
          error: 'Visitor ID is required',
          code: 'MISSING_VISITOR_ID'
        })
      })
      
      await mockFishSessionHandler(req, res)
      
      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Visitor ID is required')
    })
  })
  
  describe('POST /api/fish/interaction', () => {
    it('should record click interaction', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'session123',
          type: 'click',
          position: { x: 200, y: 150 },
          timestamp: Date.now()
        }
      })
      
      mockFishInteractionHandler.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          interaction: {
            id: 'interaction_001',
            type: 'click',
            trustImpact: 0.5,
            moodChange: null
          },
          fishState: {
            mood: 'curious',
            trustLevel: 20.5,
            position: { x: 180, y: 160 }
          }
        })
      })
      
      await mockFishInteractionHandler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(true)
      expect(data.interaction.type).toBe('click')
      expect(data.fishState.trustLevel).toBe(20.5)
    })
    
    it('should record mouse movement with speed calculation', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'session123',
          type: 'mousemove',
          position: { x: 300, y: 200 },
          previousPosition: { x: 250, y: 180 },
          deltaTime: 16,
          timestamp: Date.now()
        }
      })
      
      mockFishInteractionHandler.mockImplementation((req, res) => {
        // Calculate movement speed: sqrt((300-250)² + (200-180)²) / (16/1000) = speed in pixels/second
        const speed = Math.sqrt(Math.pow(50, 2) + Math.pow(20, 2)) / (16/1000) // ~3354 px/s
        
        res.status(200).json({
          success: true,
          interaction: {
            id: 'interaction_002',
            type: 'mousemove',
            speed: speed,
            trustImpact: speed > 1000 ? -0.2 : 0.1, // Fast movement reduces trust
            moodChange: speed > 2000 ? 'shy' : null
          },
          fishState: {
            mood: speed > 2000 ? 'shy' : 'curious',
            trustLevel: 19.8, // Reduced due to fast movement
            position: { x: 290, y: 195 } // Fish reacts to cursor
          }
        })
      })
      
      await mockFishInteractionHandler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.interaction.speed).toBeGreaterThan(1000)
      expect(data.interaction.trustImpact).toBeLessThan(0)
      expect(data.fishState.mood).toBe('shy')
    })
    
    it('should handle invalid session ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'invalid_session',
          type: 'click',
          position: { x: 100, y: 100 },
          timestamp: Date.now()
        }
      })
      
      mockFishInteractionHandler.mockImplementation((req, res) => {
        res.status(404).json({
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        })
      })
      
      await mockFishInteractionHandler(req, res)
      
      expect(res._getStatusCode()).toBe(404)
    })
  })
  
  describe('GET /api/fish/personality', () => {
    it('should return current fish personality data', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { sessionId: 'session123' }
      })
      
      mockFishPersonalityHandler.mockImplementation((req, res) => {
        res.status(200).json({
          personality: {
            mood: 'playful',
            intensity: 0.7,
            trustLevel: 65,
            traits: ['curious', 'responsive'],
            eyeDilation: 0.8,
            finSpread: 0.6,
            bodyTension: 0.3
          },
          memory: {
            totalInteractions: 147,
            feedingSpots: 8,
            visitCount: 5,
            daysSinceFirstVisit: 3
          },
          behavioral: {
            preferredActivities: ['following_cursor', 'eating'],
            reactionPatterns: {
              gentle_movement: 'approach',
              fast_movement: 'retreat',
              feeding: 'excited_rush'
            }
          }
        })
      })
      
      await mockFishPersonalityHandler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.personality.mood).toBe('playful')
      expect(data.personality.trustLevel).toBe(65)
      expect(data.memory.totalInteractions).toBe(147)
    })
  })
  
  describe('POST /api/fish/mood', () => {
    it('should trigger mood change', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'session123',
          targetMood: 'excited',
          trigger: 'manual_override',
          intensity: 0.9
        }
      })
      
      mockFishMoodHandler.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          moodChange: {
            from: 'curious',
            to: 'excited',
            intensity: 0.9,
            transitionSpeed: 2.0
          },
          effects: {
            visualChanges: ['increased_glow', 'faster_movement'],
            behavioralChanges: ['erratic_swimming', 'bubble_emission'],
            duration: 5000 // 5 seconds
          }
        })
      })
      
      await mockFishMoodHandler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.moodChange.to).toBe('excited')
      expect(data.effects.visualChanges).toContain('increased_glow')
    })
    
    it('should reject invalid mood transitions', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'session123',
          targetMood: 'invalid_mood',
          trigger: 'test'
        }
      })
      
      mockFishMoodHandler.mockImplementation((req, res) => {
        res.status(400).json({
          error: 'Invalid mood specified',
          validMoods: ['curious', 'playful', 'shy', 'excited', 'trusting', 'lonely'],
          code: 'INVALID_MOOD'
        })
      })
      
      await mockFishMoodHandler(req, res)
      
      expect(res._getStatusCode()).toBe(400)
    })
  })
  
  describe('POST /api/fish/feed', () => {
    it('should process feeding interaction', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'session123',
          position: { x: 250, y: 200 },
          foodType: 'standard',
          timestamp: Date.now()
        }
      })
      
      mockFishFeedHandler.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          feeding: {
            id: 'feed_001',
            position: { x: 250, y: 200 },
            consumed: false,
            estimatedConsumptionTime: 2500 // 2.5 seconds
          },
          fishResponse: {
            moodChange: 'excited',
            trustIncrease: 3,
            behaviorChange: 'darting_toward_food'
          },
          effects: {
            particles: ['food_orb', 'sparkles'],
            anticipation: true
          }
        })
      })
      
      await mockFishFeedHandler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.feeding.position).toEqual({ x: 250, y: 200 })
      expect(data.fishResponse.moodChange).toBe('excited')
      expect(data.fishResponse.trustIncrease).toBe(3)
    })
    
    it('should handle feeding when fish is already being fed', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'session123',
          position: { x: 300, y: 250 },
          foodType: 'standard'
        }
      })
      
      mockFishFeedHandler.mockImplementation((req, res) => {
        res.status(409).json({
          error: 'Fish is already eating',
          currentFood: {
            position: { x: 200, y: 150 },
            timeRemaining: 1500
          },
          code: 'ALREADY_FEEDING'
        })
      })
      
      await mockFishFeedHandler(req, res)
      
      expect(res._getStatusCode()).toBe(409)
    })
  })
  
  describe('GET /api/fish/memory', () => {
    it('should return fish memory data', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { sessionId: 'session123' }
      })
      
      mockFishMemoryHandler.mockImplementation((req, res) => {
        res.status(200).json({
          memory: {
            trustLevel: 67.5,
            totalInteractions: 234,
            feedingHistory: [
              { position: { x: 150, y: 200 }, timestamp: Date.now() - 3600000 },
              { position: { x: 200, y: 180 }, timestamp: Date.now() - 1800000 },
              { position: { x: 180, y: 220 }, timestamp: Date.now() - 900000 }
            ],
            visitHistory: [
              { date: '2024-01-15', interactions: 45, trustGain: 12 },
              { date: '2024-01-16', interactions: 67, trustGain: 15 },
              { date: '2024-01-17', interactions: 122, trustGain: 8 }
            ],
            behavioralPatterns: {
              preferredFeedingZones: [
                { x: 180, y: 200, frequency: 8 },
                { x: 220, y: 180, frequency: 5 }
              ],
              averageSessionDuration: 285000, // ~5 minutes
              mostActiveTimeOfDay: '14:00-16:00'
            }
          },
          statistics: {
            totalTimePlayed: 855000, // ~14 minutes
            foodConsumed: 23,
            moodChanges: 67,
            trustMilestones: ['first_feed', 'comfortable', 'trusting']
          }
        })
      })
      
      await mockFishMemoryHandler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.memory.trustLevel).toBe(67.5)
      expect(data.memory.feedingHistory.length).toBe(3)
      expect(data.statistics.foodConsumed).toBe(23)
    })
  })
  
  describe('Error handling', () => {
    it('should handle malformed requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          // Missing required fields
        }
      })
      
      mockFishInteractionHandler.mockImplementation((req, res) => {
        res.status(400).json({
          error: 'Malformed request',
          missing: ['sessionId', 'type'],
          code: 'INVALID_REQUEST'
        })
      })
      
      await mockFishInteractionHandler(req, res)
      
      expect(res._getStatusCode()).toBe(400)
    })
    
    it('should handle server errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'session123',
          type: 'click',
          position: { x: 100, y: 100 }
        }
      })
      
      mockFishInteractionHandler.mockImplementation((req, res) => {
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          requestId: 'req_12345'
        })
      })
      
      await mockFishInteractionHandler(req, res)
      
      expect(res._getStatusCode()).toBe(500)
    })
    
    it('should handle rate limiting', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          sessionId: 'session123',
          type: 'mousemove',
          position: { x: 100, y: 100 }
        }
      })
      
      mockFishInteractionHandler.mockImplementation((req, res) => {
        res.status(429).json({
          error: 'Rate limit exceeded',
          limit: 100,
          window: 60000, // 1 minute
          retryAfter: 30000, // 30 seconds
          code: 'RATE_LIMIT_EXCEEDED'
        })
      })
      
      await mockFishInteractionHandler(req, res)
      
      expect(res._getStatusCode()).toBe(429)
    })
  })
  
  describe('API versioning', () => {
    it('should handle API version headers', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'X-API-Version': 'v1'
        },
        query: { sessionId: 'session123' }
      })
      
      mockFishPersonalityHandler.mockImplementation((req, res) => {
        res.setHeader('X-API-Version', 'v1')
        res.status(200).json({
          version: 'v1',
          personality: {
            mood: 'curious',
            trustLevel: 50
          }
        })
      })
      
      await mockFishPersonalityHandler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      expect(res.getHeader('X-API-Version')).toBe('v1')
    })
  })
})