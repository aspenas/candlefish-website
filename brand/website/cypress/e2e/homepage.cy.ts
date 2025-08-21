describe('Homepage E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('Page Loading', () => {
    it('loads the homepage successfully', () => {
      cy.url().should('include', '/')
      cy.get('body').should('be.visible')
    })

    it('displays main navigation elements', () => {
      cy.get('nav, [role="navigation"]').should('be.visible')
      cy.get('h1').should('be.visible')
    })

    it('has no console errors', () => {
      cy.get('@consoleError').should('not.have.been.called')
    })
  })

  describe('Hero Section', () => {
    it('displays hero content', () => {
      cy.get('h1').should('contain.text', 'AI')
      cy.get('button, a').contains(/Get Started|Start|Begin/i).should('be.visible')
    })

    it('hero CTA button is clickable', () => {
      cy.get('button, a').contains(/Get Started|Start|Begin/i).first().click()
      // Should navigate somewhere or trigger an action
      cy.url().should('not.equal', Cypress.config().baseUrl + '/')
    })
  })

  describe('Features Section', () => {
    it('displays feature cards', () => {
      cy.get('[data-testid*="feature"], .feature, [class*="feature"]')
        .should('have.length.greaterThan', 0)
    })

    it('feature cards have proper structure', () => {
      cy.get('[data-testid*="feature"], .feature, [class*="feature"]').first().within(() => {
        cy.get('h2, h3, h4').should('exist') // Feature title
        cy.get('p').should('exist') // Feature description
      })
    })
  })

  describe('Call to Action', () => {
    it('displays primary CTA section', () => {
      cy.get('section').contains(/Get Started|Contact|Learn More/i).should('be.visible')
    })

    it('CTA buttons are functional', () => {
      cy.get('button, a').contains(/Contact|Get Started/i).first().should('be.visible').click()
      // Should navigate to contact or assessment page
    })
  })

  describe('Responsive Design', () => {
    it('works on mobile devices', () => {
      cy.viewport('iphone-x')
      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
      cy.get('nav, [role="navigation"]').should('be.visible')
    })

    it('works on tablet devices', () => {
      cy.viewport('ipad-2')
      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
    })

    it('works on desktop', () => {
      cy.viewport(1920, 1080)
      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
    })
  })

  describe('Performance', () => {
    it('loads within acceptable time', () => {
      const start = Date.now()
      cy.visit('/').then(() => {
        const loadTime = Date.now() - start
        expect(loadTime).to.be.lessThan(3000) // 3 seconds
      })
    })

    it('images load properly', () => {
      cy.get('img').each($img => {
        cy.wrap($img)
          .should('be.visible')
          .and(($img) => {
            expect(($img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0)
          })
      })
    })
  })

  describe('SEO and Metadata', () => {
    it('has proper meta tags', () => {
      cy.get('head title').should('exist').and('not.be.empty')
      cy.get('head meta[name="description"]').should('exist').and('have.attr', 'content')
    })

    it('has proper heading hierarchy', () => {
      cy.get('h1').should('have.length', 1) // Only one h1
      cy.get('h1, h2, h3, h4, h5, h6').should('exist')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA landmarks', () => {
      cy.get('main, [role="main"]').should('exist')
      cy.get('nav, [role="navigation"]').should('exist')
    })

    it('interactive elements are keyboard accessible', () => {
      cy.get('button, a, input, select, textarea').each($el => {
        cy.wrap($el).should('be.visible')
        // Test tab navigation
        cy.wrap($el).focus().should('have.focus')
      })
    })

    it('images have alt text', () => {
      cy.get('img').each($img => {
        cy.wrap($img).should('have.attr', 'alt')
      })
    })

    it('has proper color contrast', () => {
      // Basic color contrast check - would need specialized tool for full compliance
      cy.get('body').should('have.css', 'color')
      cy.get('body').should('have.css', 'background-color')
    })
  })
})
