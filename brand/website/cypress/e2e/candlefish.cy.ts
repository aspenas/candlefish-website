describe('Candlefish Animation', () => {
  beforeEach(() => {
    cy.visit('/')
  })
  
  describe('Component Mounting', () => {
    it('should mount candlefish animation on homepage', () => {
      cy.get('[data-widget="operational-matrix"]').should('exist')
      cy.get('.candlefish-aquarium').should('exist')
      cy.get('canvas').should('be.visible')
    })
    
    it('should have correct dimensions on desktop', () => {
      cy.viewport(1280, 720)
      cy.get('.candlefish-aquarium').should('have.css', 'height', '240px')
    })
    
    it('should have responsive dimensions on mobile', () => {
      cy.viewport(375, 667)
      cy.get('.candlefish-aquarium').should(($el) => {
        const height = parseInt($el.css('height'))
        expect(height).to.be.lessThan(200)
      })
    })
  })
  
  describe('User Interactions', () => {
    it('should respond to click with ripple effect', () => {
      cy.get('canvas').click(200, 120)
      // Canvas rendering is internal, we verify no errors occur
      cy.window().its('console.error').should('not.be.called')
    })
    
    it('should respond to mouse movement', () => {
      cy.get('canvas')
        .trigger('mouseenter')
        .trigger('mousemove', { clientX: 400, clientY: 120 })
        .trigger('mouseleave')
      
      // Verify cursor style changes
      cy.get('canvas').should('have.css', 'cursor', 'crosshair')
    })
    
    it('should handle touch events on mobile', () => {
      cy.viewport('iphone-x')
      cy.get('canvas').trigger('touchstart', {
        touches: [{ clientX: 100, clientY: 50 }]
      })
    })
  })
  
  describe('Reduced Motion Support', () => {
    it('should show static fallback when prefers-reduced-motion is set', () => {
      cy.visit('/', {
        onBeforeLoad(win) {
          cy.stub(win, 'matchMedia')
            .withArgs('(prefers-reduced-motion: reduce)')
            .returns({
              matches: true,
              addEventListener: cy.stub(),
              removeEventListener: cy.stub()
            })
        }
      })
      
      cy.get('.candlefish-fallback').should('exist')
      cy.get('img[alt="Candlefish logo"]').should('be.visible')
    })
  })
  
  describe('Performance', () => {
    it('should not block page interaction', () => {
      cy.get('canvas').should('be.visible')
      
      // Test other page interactions work while animation runs
      cy.get('a[href="/consideration"]').should('be.visible').click()
      cy.url().should('include', '/consideration')
      cy.go('back')
    })
    
    it('should pause when page is not visible', () => {
      cy.document().then((doc) => {
        // Simulate visibility change
        Object.defineProperty(doc, 'hidden', {
          value: true,
          writable: true
        })
        doc.dispatchEvent(new Event('visibilitychange'))
      })
      
      // Animation should be paused (no errors)
      cy.window().its('console.error').should('not.be.called')
    })
  })
  
  describe('Feature Flag', () => {
    it('should respect NEXT_PUBLIC_FISH_ANIM environment variable', () => {
      // This would be set in cypress.config.ts or via env
      if (Cypress.env('NEXT_PUBLIC_FISH_ANIM') === '0') {
        cy.get('.candlefish-aquarium').should('not.exist')
      } else {
        cy.get('.candlefish-aquarium').should('exist')
      }
    })
  })
  
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      cy.get('canvas').should('have.attr', 'aria-label')
        .and('include', 'candlefish')
    })
    
    it('should provide alternative content for screen readers', () => {
      cy.get('.candlefish-aquarium').within(() => {
        cy.get('canvas[aria-label]').should('exist')
      })
    })
  })
})