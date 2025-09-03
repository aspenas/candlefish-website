import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { Point, FoodParticle, BubbleEffect } from '../candlefish'

// Mock Date.now for consistent testing
const mockDateNow = jest.spyOn(Date, 'now')

describe('ParticleSystem', () => {
  let canvas: HTMLCanvasElement
  let engine: any
  let particleSystem: any
  
  const baseTimestamp = 1000000000000
  
  beforeEach(() => {
    mockDateNow.mockReturnValue(baseTimestamp)
    
    // Setup canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    document.body.appendChild(canvas)
    
    // Mock window.innerHeight for particle system
    Object.defineProperty(window, 'innerHeight', {
      value: 600,
      writable: true
    })
    
    const { CandlefishEngine } = require('../candlefish')
    engine = new CandlefishEngine(canvas)
    particleSystem = engine.particleSystem
  })
  
  afterEach(() => {
    if (engine) {
      engine.destroy()
    }
    document.body.removeChild(canvas)
    jest.clearAllMocks()
    mockDateNow.mockRestore()
  })
  
  describe('food particle creation', () => {
    it('should create food particle at specified position', () => {
      const position: Point = { x: 200, y: 300 }
      particleSystem.addFood(position, '#FFB347')
      
      const particles = particleSystem.getParticles()
      expect(particles.length).toBe(1)
      
      const particle = particles[0]
      expect(particle.position).toEqual(position)
      expect(particle.consumed).toBe(false)
      expect(particle.created).toBe(baseTimestamp)
    })
    
    it('should create food particle with randomized size', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      const particle = particleSystem.getParticles()[0]
      expect(particle.size).toBeGreaterThanOrEqual(4)
      expect(particle.size).toBeLessThanOrEqual(7)
    })
    
    it('should create sparkles around food particle', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      const particle = particleSystem.getParticles()[0]
      expect(particle.sparkles.length).toBe(8)
      
      particle.sparkles.forEach(sparkle => {
        expect(sparkle.x).toBeGreaterThanOrEqual(90) // position.x - 10
        expect(sparkle.x).toBeLessThanOrEqual(110) // position.x + 10
        expect(sparkle.y).toBeGreaterThanOrEqual(90)
        expect(sparkle.y).toBeLessThanOrEqual(110)
      })
    })
    
    it('should initialize food particle with correct properties', () => {
      particleSystem.addFood({ x: 150, y: 250 }, '#FFB347')
      
      const particle = particleSystem.getParticles()[0]
      expect(particle.velocity.x).toBe(0)
      expect(particle.velocity.y).toBe(1.5)
      expect(particle.glow).toBe(1.0)
      expect(particle.consumed).toBe(false)
    })
  })
  
  describe('bubble creation', () => {
    it('should create bubble with correct type and position', () => {
      const position: Point = { x: 100, y: 200 }
      particleSystem.addBubble(position, 'excited')
      
      const bubbles = particleSystem.getBubbles()
      expect(bubbles.length).toBe(1)
      
      const bubble = bubbles[0]
      expect(bubble.position).toEqual(position)
      expect(bubble.type).toBe('excited')
      expect(bubble.opacity).toBe(0.6)
    })
    
    it('should create bubbles with different types', () => {
      const bubbleTypes: BubbleEffect['type'][] = ['content', 'lonely', 'excited']
      
      bubbleTypes.forEach((type, index) => {
        particleSystem.addBubble({ x: index * 50, y: 100 }, type)
      })
      
      const bubbles = particleSystem.getBubbles()
      expect(bubbles.length).toBe(3)
      
      bubbles.forEach((bubble, index) => {
        expect(bubble.type).toBe(bubbleTypes[index])
      })
    })
    
    it('should create bubbles with randomized velocity and size', () => {
      particleSystem.addBubble({ x: 100, y: 200 }, 'content')
      
      const bubble = particleSystem.getBubbles()[0]
      expect(bubble.velocity.x).toBeGreaterThanOrEqual(-0.25)
      expect(bubble.velocity.x).toBeLessThanOrEqual(0.25)
      expect(bubble.velocity.y).toBeLessThanOrEqual(-1)
      expect(bubble.size).toBeGreaterThanOrEqual(2)
      expect(bubble.size).toBeLessThanOrEqual(6)
    })
  })
  
  describe('particle physics updates', () => {
    it('should apply gravity to food particles', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      const particle = particleSystem.getParticles()[0]
      const initialVelocityY = particle.velocity.y
      
      particleSystem.update(16, { x: 500, y: 500 }) // Fish far away
      
      const updatedParticle = particleSystem.getParticles()[0]
      expect(updatedParticle.velocity.y).toBeGreaterThan(initialVelocityY)
    })
    
    it('should move food particles based on velocity', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      const particle = particleSystem.getParticles()[0]
      const initialPosition = { ...particle.position }
      
      particleSystem.update(16, { x: 500, y: 500 }) // Fish far away
      
      const updatedParticle = particleSystem.getParticles()[0]
      expect(updatedParticle.position.y).toBeGreaterThan(initialPosition.y)
    })
    
    it('should detect food consumption when fish is close', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      // Fish position close to food (within 15 units)
      const consumedFood = particleSystem.update(16, { x: 105, y: 105 })
      
      expect(consumedFood).toEqual({ x: 100, y: 100 })
      expect(particleSystem.getParticles().length).toBe(0) // Consumed particle removed
    })
    
    it('should not consume food when fish is far away', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      // Fish position far from food
      const consumedFood = particleSystem.update(16, { x: 300, y: 300 })
      
      expect(consumedFood).toBeNull()
      expect(particleSystem.getParticles().length).toBe(1) // Particle still exists
    })
    
    it('should remove old food particles after timeout', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      // Advance time beyond 10 seconds
      mockDateNow.mockReturnValue(baseTimestamp + 11000)
      
      particleSystem.update(16, { x: 500, y: 500 })
      
      expect(particleSystem.getParticles().length).toBe(0)
    })
    
    it('should remove food particles that fall off screen', () => {
      particleSystem.addFood({ x: 100, y: 590 }, '#FFB347') // Near bottom
      
      // Update multiple times to make it fall off screen
      for (let i = 0; i < 20; i++) {
        particleSystem.update(16, { x: 500, y: 500 })
      }
      
      expect(particleSystem.getParticles().length).toBe(0)
    })
  })
  
  describe('bubble physics updates', () => {
    it('should move bubbles upward', () => {
      particleSystem.addBubble({ x: 100, y: 200 }, 'content')
      const bubble = particleSystem.getBubbles()[0]
      const initialY = bubble.position.y
      
      particleSystem.update(16, { x: 500, y: 500 })
      
      const updatedBubble = particleSystem.getBubbles()[0]
      expect(updatedBubble.position.y).toBeLessThan(initialY)
    })
    
    it('should fade out bubbles over time', () => {
      particleSystem.addBubble({ x: 100, y: 200 }, 'content')
      const bubble = particleSystem.getBubbles()[0]
      const initialOpacity = bubble.opacity
      
      particleSystem.update(16, { x: 500, y: 500 })
      
      const updatedBubble = particleSystem.getBubbles()[0]
      expect(updatedBubble.opacity).toBeLessThan(initialOpacity)
    })
    
    it('should remove bubbles when opacity reaches zero', () => {
      particleSystem.addBubble({ x: 100, y: 200 }, 'content')
      
      // Update many times to fade out completely
      for (let i = 0; i < 100; i++) {
        particleSystem.update(16, { x: 500, y: 500 })
      }
      
      expect(particleSystem.getBubbles().length).toBe(0)
    })
    
    it('should move bubbles horizontally based on velocity', () => {
      particleSystem.addBubble({ x: 100, y: 200 }, 'content')
      const bubble = particleSystem.getBubbles()[0]
      const initialX = bubble.position.x
      
      // Force a specific velocity for testing
      bubble.velocity.x = 2.0
      
      particleSystem.update(16, { x: 500, y: 500 })
      
      const updatedBubble = particleSystem.getBubbles()[0]
      expect(updatedBubble.position.x).toBeGreaterThan(initialX)
    })
  })
  
  describe('multiple particle management', () => {
    it('should handle multiple food particles simultaneously', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      particleSystem.addFood({ x: 200, y: 200 }, '#FFB347')
      particleSystem.addFood({ x: 300, y: 300 }, '#FFB347')
      
      expect(particleSystem.getParticles().length).toBe(3)
      
      // Fish eats one particle
      const consumedFood = particleSystem.update(16, { x: 105, y: 105 })
      
      expect(consumedFood).toBeDefined()
      expect(particleSystem.getParticles().length).toBe(2)
    })
    
    it('should handle multiple bubbles simultaneously', () => {
      particleSystem.addBubble({ x: 100, y: 200 }, 'content')
      particleSystem.addBubble({ x: 150, y: 250 }, 'excited')
      particleSystem.addBubble({ x: 200, y: 300 }, 'lonely')
      
      expect(particleSystem.getBubbles().length).toBe(3)
      
      particleSystem.update(16, { x: 500, y: 500 })
      
      // All bubbles should still exist after one update
      expect(particleSystem.getBubbles().length).toBe(3)
    })
    
    it('should handle mixed particle types', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      particleSystem.addBubble({ x: 200, y: 200 }, 'content')
      
      expect(particleSystem.getParticles().length).toBe(1)
      expect(particleSystem.getBubbles().length).toBe(1)
      
      particleSystem.update(16, { x: 500, y: 500 })
      
      expect(particleSystem.getParticles().length).toBe(1)
      expect(particleSystem.getBubbles().length).toBe(1)
    })
  })
  
  describe('edge cases', () => {
    it('should handle zero delta time', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      expect(() => {
        particleSystem.update(0, { x: 500, y: 500 })
      }).not.toThrow()
    })
    
    it('should handle negative delta time', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      expect(() => {
        particleSystem.update(-16, { x: 500, y: 500 })
      }).not.toThrow()
    })
    
    it('should handle extreme fish positions', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      expect(() => {
        particleSystem.update(16, { x: -1000, y: -1000 })
      }).not.toThrow()
      
      expect(() => {
        particleSystem.update(16, { x: 10000, y: 10000 })
      }).not.toThrow()
    })
    
    it('should handle particles at exact consumption distance', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      // Fish position exactly 15 units away (consumption threshold)
      const consumedFood = particleSystem.update(16, { x: 115, y: 100 })
      
      expect(consumedFood).toBeNull() // Should not consume at exact threshold
      expect(particleSystem.getParticles().length).toBe(1)
    })
    
    it('should handle particles just inside consumption distance', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      // Fish position just under 15 units away
      const consumedFood = particleSystem.update(16, { x: 114, y: 100 })
      
      expect(consumedFood).toEqual({ x: 100, y: 100 })
      expect(particleSystem.getParticles().length).toBe(0)
    })
  })
  
  describe('performance considerations', () => {
    it('should efficiently handle large numbers of particles', () => {
      const startTime = performance.now()
      
      // Add many particles
      for (let i = 0; i < 100; i++) {
        particleSystem.addFood({ x: i * 8, y: 100 }, '#FFB347')
        particleSystem.addBubble({ x: i * 8, y: 200 }, 'content')
      }
      
      // Update system
      particleSystem.update(16, { x: 500, y: 500 })
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (less than 100ms for 200 particles)
      expect(duration).toBeLessThan(100)
    })
    
    it('should clean up consumed particles immediately', () => {
      particleSystem.addFood({ x: 100, y: 100 }, '#FFB347')
      
      // Consume the particle
      particleSystem.update(16, { x: 105, y: 105 })
      
      // Particle should be removed immediately
      expect(particleSystem.getParticles().length).toBe(0)
    })
  })
})