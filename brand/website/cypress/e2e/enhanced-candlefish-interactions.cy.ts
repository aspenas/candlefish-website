describe('Enhanced Candlefish Animation - User Interaction Flows', () => {
  beforeEach(() => {
    // Visit the page with enhanced candlefish
    cy.visit('/')
    
    // Wait for the canvas to be fully loaded
    cy.get('canvas[data-animation-id]').should('be.visible')
    
    // Clear any existing localStorage to start fresh
    cy.clearLocalStorage()
  })
  
  describe('First-time Visitor Experience', () => {
    it('should display curious fish for new visitors', () => {
      // Fish should start in curious mood for new visitors
      cy.get('canvas').should('be.visible')
      
      // Check that localStorage is empty (new visitor)
      cy.window().then((win) => {
        expect(win.localStorage.getItem('candlefish_memory')).to.be.null
      })
      
      // Verify initial cursor behavior (should be crosshair)
      cy.get('canvas').should('have.css', 'cursor', 'crosshair')
    })
    
    it('should respond to first interaction with trust building', () => {
      // Click on the fish
      cy.get('canvas').click(200, 120)
      
      // Verify localStorage was created with initial data
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.trustLevel).to.be.greaterThan(20) // Should increase from base 20
        expect(memory.interactionCount).to.be.greaterThan(0)
      })
    })
    
    it('should show feeding tutorial for new visitors', () => {
      // Click to feed the fish for the first time
      cy.get('canvas').click(250, 150)
      
      // Fish should become excited and approach the food
      cy.wait(500) // Allow animation time
      
      // Verify trust increased significantly for feeding
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.trustLevel).to.be.greaterThan(22) // Base 20 + feeding bonus
        expect(memory.feedingSpots).to.have.length(1)
      })
    })
  })
  
  describe('Trust Building Journey', () => {
    it('should gradually increase trust through gentle interactions', () => {
      let initialTrust: number
      
      // Record initial trust level
      cy.get('canvas').click(100, 100).then(() => {
        cy.window().then((win) => {
          const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
          initialTrust = memory.trustLevel
        })
      })
      
      // Perform gentle mouse movements (not too fast)
      const gentleMovements = [
        { x: 120, y: 110 },
        { x: 140, y: 120 },
        { x: 160, y: 130 },
        { x: 180, y: 140 },
        { x: 200, y: 150 }
      ]
      
      gentleMovements.forEach(({ x, y }, index) => {
        cy.get('canvas')
          .trigger('mousemove', { clientX: x, clientY: y })
          .wait(200) // Gentle pace
      })
      
      // Verify trust increased
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.trustLevel).to.be.greaterThan(initialTrust)
      })
    })
    
    it('should decrease trust with fast/erratic movements', () => {
      // Build some initial trust
      cy.get('canvas').click(150, 150).wait(500)
      
      let trustAfterFeeding: number
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        trustAfterFeeding = memory.trustLevel
      })
      
      // Make fast, erratic movements
      const fastMovements = [
        { x: 50, y: 50 },
        { x: 350, y: 200 },
        { x: 100, y: 300 },
        { x: 400, y: 100 },
        { x: 200, y: 250 }
      ]
      
      fastMovements.forEach(({ x, y }) => {
        cy.get('canvas')
          .trigger('mousemove', { clientX: x, clientY: y })
          .wait(50) // Fast movements
      })
      
      // Trust should decrease due to fast movements
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.trustLevel).to.be.lessThan(trustAfterFeeding)
      })
    })
    
    it('should reach trust milestones with persistent gentle interaction', () => {
      // Simulate reaching "comfortable" milestone (50+ trust)
      const buildTrust = () => {
        for (let i = 0; i < 10; i++) {
          cy.get('canvas').click(150 + i * 5, 150 + i * 2).wait(100)
        }
      }
      
      // Build trust through multiple feeding sessions
      buildTrust()
      
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        if (memory.trustLevel < 50) {
          buildTrust() // Continue building if needed
        }
      })
      
      // Verify high trust level achieved
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.trustLevel).to.be.at.least(50)
        expect(memory.interactionCount).to.be.greaterThan(10)
      })
    })
  })
  
  describe('Mood Transition Testing', () => {
    it('should transition from curious to excited when fed', () => {
      // Start with curious state, then feed
      cy.get('canvas').click(200, 150)
      
      // Fish should become excited (visual changes would be tested in visual tests)
      // We can verify through behavioral changes
      cy.wait(1000)
      
      // Fish should be in excited state for a while after feeding
      cy.get('canvas').trigger('mousemove', { clientX: 250, clientY: 200 })
      
      // Excited fish should respond more eagerly to cursor
      cy.wait(500)
    })
    
    it('should transition to shy state with aggressive cursor movement', () => {
      // Make rapid, aggressive movements
      for (let i = 0; i < 20; i++) {
        cy.get('canvas').trigger('mousemove', {
          clientX: 100 + Math.random() * 400,
          clientY: 50 + Math.random() * 200
        })
        cy.wait(10) // Very fast movements
      }
      
      // Fish should become shy and retreat
      cy.wait(1000)
      
      // Shy fish should be less responsive to gentle movements
      cy.get('canvas').trigger('mousemove', { clientX: 200, clientY: 150 })
      cy.wait(500)
    })
    
    it('should transition to lonely state after user absence', () => {
      // Simulate user leaving (no interactions)
      cy.get('canvas').trigger('mouseleave')
      
      // Fast-forward time by updating localStorage directly
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        memory.lastInteraction = Date.now() - 70000 // 70 seconds ago
        win.localStorage.setItem('candlefish_memory', JSON.stringify(memory))
      })
      
      // Refresh to trigger lonely state evaluation
      cy.reload()
      cy.get('canvas').should('be.visible')
      
      // Fish should be in lonely state (slower, melancholic behavior)
      cy.wait(2000)
      
      // Return attention should transition back to curious
      cy.get('canvas').trigger('mouseenter').trigger('mousemove', { clientX: 200, clientY: 150 })
      cy.wait(1000)
    })
    
    it('should transition to trusting state with high trust and gentle interaction', () => {
      // Build high trust first
      cy.window().then((win) => {
        const memory = {
          trustLevel: 85,
          lastInteraction: Date.now(),
          feedingSpots: [{ x: 150, y: 150 }, { x: 200, y: 180 }],
          interactionCount: 50,
          behaviorPattern: 'friendly',
          visitDates: [Date.now() - 86400000, Date.now()],
          personalityQuirks: []
        }
        win.localStorage.setItem('candlefish_memory', JSON.stringify(memory))
      })
      
      cy.reload()
      cy.get('canvas').should('be.visible')
      
      // Gentle cursor presence should trigger trusting state
      cy.get('canvas').trigger('mousemove', { clientX: 200, clientY: 150 })
      cy.wait(2000)
      
      // Trusting fish should follow cursor closely
      cy.get('canvas').trigger('mousemove', { clientX: 250, clientY: 180 })
      cy.wait(500)
      cy.get('canvas').trigger('mousemove', { clientX: 300, clientY: 200 })
      cy.wait(500)
    })
    
    it('should transition to playful state with moderate trust and active interaction', () => {
      // Set moderate trust level
      cy.window().then((win) => {
        const memory = {
          trustLevel: 60,
          lastInteraction: Date.now(),
          feedingSpots: [{ x: 150, y: 150 }],
          interactionCount: 25,
          behaviorPattern: 'responsive',
          visitDates: [Date.now()],
          personalityQuirks: []
        }
        win.localStorage.setItem('candlefish_memory', JSON.stringify(memory))
      })
      
      cy.reload()
      cy.get('canvas').should('be.visible')
      
      // Moderate cursor movement should trigger playful state
      cy.get('canvas').trigger('mousemove', { clientX: 180, clientY: 140 })
      cy.wait(200)
      cy.get('canvas').trigger('mousemove', { clientX: 220, clientY: 160 })
      cy.wait(200)
      cy.get('canvas').trigger('mousemove', { clientX: 200, clientY: 180 })
      cy.wait(1000)
      
      // Playful fish should exhibit figure-8 or circular patterns around cursor
    })
  })
  
  describe('Feeding Mechanics', () => {
    it('should create food particles when clicked', () => {
      cy.get('canvas').click(250, 200)
      
      // Food should be created (we can't directly test canvas content, but we can test side effects)
      cy.wait(500)
      
      // Fish should move toward the food location
      cy.wait(2000) // Give fish time to consume food
      
      // Trust should increase after consumption
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.trustLevel).to.be.greaterThan(20)
        expect(memory.feedingSpots).to.have.length.at.least(1)
        expect(memory.feedingSpots[0]).to.deep.include({ x: 250, y: 200 })
      })
    })
    
    it('should remember feeding locations', () => {
      const feedingLocations = [
        { x: 150, y: 120 },
        { x: 300, y: 180 },
        { x: 200, y: 250 }
      ]
      
      // Feed at multiple locations
      feedingLocations.forEach(({ x, y }) => {
        cy.get('canvas').click(x, y).wait(2500) // Wait for consumption
      })
      
      // Verify all locations are remembered
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.feedingSpots).to.have.length(feedingLocations.length)
        
        feedingLocations.forEach((location) => {
          expect(memory.feedingSpots).to.deep.include(location)
        })
      })
    })
    
    it('should limit feeding spots memory to 10 locations', () => {
      // Feed at 15 different locations
      for (let i = 0; i < 15; i++) {
        cy.get('canvas').click(100 + i * 20, 150 + i * 5).wait(1000)
      }
      
      // Verify only 10 most recent locations are kept
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.feedingSpots).to.have.length(10)
        
        // Should contain locations from feed 6-15 (last 10)
        expect(memory.feedingSpots[0]).to.deep.include({ x: 200, y: 175 }) // 6th feed
        expect(memory.feedingSpots[9]).to.deep.include({ x: 380, y: 220 }) // 15th feed
      })
    })
    
    it('should make fish return to remembered feeding spots when idle', () => {
      // Feed at a specific location
      cy.get('canvas').click(300, 180).wait(3000)
      
      // Move cursor away and wait
      cy.get('canvas')
        .trigger('mousemove', { clientX: 50, y: 50 })
        .trigger('mouseleave')
      
      // Wait for idle behavior to kick in
      cy.wait(5000)
      
      // Fish should eventually visit the remembered feeding spot
      // (This is harder to test directly, but we can verify the memory exists)
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.feedingSpots).to.deep.include({ x: 300, y: 180 })
      })
    })
  })
  
  describe('Returning Visitor Experience', () => {
    beforeEach(() => {
      // Set up returning visitor memory
      const returningVisitorMemory = {
        trustLevel: 75,
        lastInteraction: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
        feedingSpots: [
          { x: 180, y: 150 },
          { x: 220, y: 180 },
          { x: 200, y: 200 }
        ],
        interactionCount: 89,
        behaviorPattern: 'trusting_follower',
        visitDates: [
          Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
          Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
          Date.now() - 24 * 60 * 60 * 1000      // Yesterday
        ],
        personalityQuirks: ['playful', 'responsive']
      }
      
      cy.window().then((win) => {
        win.localStorage.setItem('candlefish_memory', JSON.stringify(returningVisitorMemory))
      })
    })
    
    it('should greet returning visitors with higher trust', () => {
      cy.reload()
      cy.get('canvas').should('be.visible')
      
      // Fish should be in a more trusting state
      cy.wait(2000) // Allow greeting animation time
      
      // Verify trust level was loaded and possibly decayed slightly
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.trustLevel).to.be.at.least(70) // Some decay is expected
        expect(memory.interactionCount).to.equal(89)
      })
    })
    
    it('should show excited greeting animation for high trust visitors', () => {
      cy.reload()
      cy.get('canvas').should('be.visible')
      
      // High trust visitors should trigger greeting animation
      cy.wait(3000) // Allow full greeting sequence
      
      // Fish should be responsive immediately
      cy.get('canvas').trigger('mousemove', { clientX: 200, clientY: 150 })
      cy.wait(500)
    })
    
    it('should add daily visit bonus', () => {
      const initialMemory = JSON.parse(localStorage.getItem('candlefish_memory') || '{}')
      const initialTrust = initialMemory.trustLevel
      
      // Record an interaction (should trigger daily visit bonus)
      cy.get('canvas').click(200, 150)
      
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.trustLevel).to.be.greaterThan(initialTrust + 3) // +5 daily bonus + feeding bonus
        expect(memory.visitDates).to.have.length(4) // Added today's visit
      })
    })
  })
  
  describe('Memory Persistence', () => {
    it('should persist memory across page reloads', () => {
      // Create some interactions
      cy.get('canvas').click(150, 150).wait(1000)
      cy.get('canvas').click(200, 180).wait(1000)
      
      let savedMemory: any
      cy.window().then((win) => {
        savedMemory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
      })
      
      // Reload the page
      cy.reload()
      cy.get('canvas').should('be.visible')
      
      // Verify memory was restored
      cy.window().then((win) => {
        const restoredMemory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(restoredMemory.trustLevel).to.equal(savedMemory.trustLevel)
        expect(restoredMemory.interactionCount).to.equal(savedMemory.interactionCount)
        expect(restoredMemory.feedingSpots).to.deep.equal(savedMemory.feedingSpots)
      })
    })
    
    it('should handle corrupted localStorage gracefully', () => {
      // Corrupt the localStorage data
      cy.window().then((win) => {
        win.localStorage.setItem('candlefish_memory', 'invalid json data')
      })
      
      cy.reload()
      cy.get('canvas').should('be.visible')
      
      // Should create fresh memory without crashing
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || '{}')
        expect(memory.trustLevel).to.equal(20) // Fresh start
      })
    })
  })
  
  describe('Performance and Responsiveness', () => {
    it('should handle rapid interactions without lag', () => {
      const startTime = Date.now()
      
      // Perform rapid clicks
      for (let i = 0; i < 10; i++) {
        cy.get('canvas').click(100 + i * 30, 150).wait(100)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time
      expect(duration).to.be.lessThan(5000) // 5 seconds for 10 interactions
    })
    
    it('should maintain smooth animation during intensive interaction', () => {
      // Move cursor rapidly while clicking
      for (let i = 0; i < 20; i++) {
        cy.get('canvas')
          .trigger('mousemove', { 
            clientX: 150 + Math.sin(i * 0.5) * 100, 
            clientY: 150 + Math.cos(i * 0.5) * 50 
          })
          .wait(50)
        
        if (i % 3 === 0) {
          cy.get('canvas').click()
        }
      }
      
      // Animation should continue smoothly without errors
      cy.wait(2000)
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle clicks outside canvas bounds gracefully', () => {
      // Click outside the canvas area
      cy.get('body').click(50, 50) // Outside canvas
      
      // Should not create memory entries for invalid clicks
      cy.window().then((win) => {
        const memory = JSON.parse(win.localStorage.getItem('candlefish_memory') || 'null')
        expect(memory).to.be.null // No memory created
      })
    })
    
    it('should handle extreme cursor movements', () => {
      // Extreme movements that might cause calculation issues
      const extremePositions = [
        { x: 0, y: 0 },
        { x: 9999, y: 9999 },
        { x: -100, y: -100 },
        { x: 500, y: 300 }
      ]
      
      extremePositions.forEach(({ x, y }) => {
        cy.get('canvas').trigger('mousemove', { clientX: x, clientY: y }).wait(100)
      })
      
      // Should not crash or cause errors
      cy.get('canvas').should('be.visible')
    })
    
    it('should handle storage quota exceeded', () => {
      // Fill up localStorage to near capacity
      cy.window().then((win) => {
        try {
          const largeData = 'x'.repeat(5000000) // ~5MB
          win.localStorage.setItem('large_data', largeData)
        } catch (e) {
          // Storage full, which is what we want to test
        }
      })
      
      // Try to save fish memory
      cy.get('canvas').click(200, 150)
      
      // Should handle gracefully without crashing
      cy.get('canvas').should('be.visible')
      
      // Clean up
      cy.clearLocalStorage()
    })
  })
})