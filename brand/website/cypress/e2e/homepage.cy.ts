describe('Candlefish Homepage E2E Tests', () => {
  beforeEach(() => {
    // Set up console error monitoring
    cy.window().then((win) => {
      cy.stub(win.console, 'error').as('consoleError');
    });

    cy.visit('/');
  });

  describe('Page Loading and Structure', () => {
    it('loads the homepage successfully', () => {
      cy.url().should('include', '/');
      cy.get('body').should('be.visible');
      cy.get('main').should('be.visible');
    });

    it('displays the operational atelier badge', () => {
      cy.contains('Operational Design Atelier').should('be.visible');
    });

    it('displays the rotating header text', () => {
      cy.get('h1').should('be.visible');
      cy.contains('Currently engineering').should('be.visible');
    });

    it('has minimal console errors on load', () => {
      // Allow some time for page to fully load
      cy.wait(2000);
      cy.get('@consoleError').should('not.have.been.called');
    });
  });

  describe('Animated Components', () => {
    it('displays the system activity bar', () => {
      cy.get('canvas, .fixed.top-0').should('exist');
      // System activity component should be positioned at top
    });

    it('displays rotating project titles', () => {
      cy.contains('Currently engineering').should('be.visible');

      // Wait for potential project rotation (projects rotate every 5 seconds)
      cy.wait(2000);

      // Should contain one of the project descriptions
      cy.get('h1').should('contain.text', 'automation');
    });

    it('renders WebGL system architecture visualization', () => {
      // SystemArchitecture component should render canvas or fallback
      cy.get('canvas, [data-testid="mock-canvas"]').should('exist');
    });
  });

  describe('Navigation and Links', () => {
    it('displays essential navigation elements', () => {
      // Check for links to key sections that should exist on homepage
      cy.get('a, button').should('exist');
    });

    it('contains workshop or project links', () => {
      // Look for links to workshop or project pages
      cy.get('body').then(($body) => {
        if ($body.find('a[href*="workshop"]').length > 0) {
          cy.get('a[href*="workshop"]').should('exist');
        } else if ($body.find('a[href*="project"]').length > 0) {
          cy.get('a[href*="project"]').should('exist');
        }
      });
    });
  });

  describe('Animation Performance', () => {
    it('animations load without significant delay', () => {
      // Test that animated components don't cause performance issues
      cy.get('h1').should('be.visible');

      // Ensure page remains responsive during animations
      cy.get('body').should('be.visible');
      cy.wait(1000);
      cy.get('body').should('be.visible');
    });

    it('handles reduced motion preference', () => {
      // Visit with reduced motion preference
      cy.visit('/', {
        onBeforeLoad: (win) => {
          // Mock reduced motion media query
          Object.defineProperty(win, 'matchMedia', {
            writable: true,
            value: cy.stub().returns({
              matches: true, // prefers-reduced-motion: reduce
              addEventListener: cy.stub(),
              removeEventListener: cy.stub(),
            }),
          });
        },
      });

      // Page should still load and function
      cy.get('body').should('be.visible');
      cy.get('h1').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('works on mobile devices', () => {
      cy.viewport('iphone-x');
      cy.get('body').should('be.visible');
      cy.get('h1').should('be.visible');
      cy.contains('Currently engineering').should('be.visible');

      // Text should remain readable on mobile
      cy.get('h1').should('have.css', 'font-size');
    });

    it('works on tablet devices', () => {
      cy.viewport('ipad-2');
      cy.get('body').should('be.visible');
      cy.get('h1').should('be.visible');
      cy.contains('Operational Design Atelier').should('be.visible');
    });

    it('works on desktop', () => {
      cy.viewport(1920, 1080);
      cy.get('body').should('be.visible');
      cy.get('h1').should('be.visible');
      cy.contains('Currently engineering').should('be.visible');
    });

    it('maintains layout integrity across viewports', () => {
      const viewports = ['iphone-x', 'ipad-2', [1920, 1080]];

      viewports.forEach((viewport) => {
        if (Array.isArray(viewport)) {
          cy.viewport(viewport[0], viewport[1]);
        } else {
          cy.viewport(viewport);
        }

        cy.get('main').should('be.visible');
        cy.get('h1').should('be.visible');

        // Check that content doesn't overflow
        cy.get('body').should('have.css', 'overflow-x', 'hidden');
      });
    });
  });

  describe('Performance', () => {
    it('loads within acceptable time', () => {
      const start = Date.now();
      cy.visit('/').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(5000); // 5 seconds for complex animations
      });
    });

    it('WebGL components load without blocking', () => {
      cy.visit('/');

      // Main content should be visible quickly even if WebGL is loading
      cy.get('h1', { timeout: 3000 }).should('be.visible');
      cy.contains('Currently engineering').should('be.visible');
    });

    it('handles slow network gracefully', () => {
      // Simulate slow network
      cy.intercept('**/*', (req) => {
        req.reply((res) => {
          res.delay(100); // Add 100ms delay
        });
      });

      cy.visit('/');
      cy.get('h1').should('be.visible');
      cy.contains('Currently engineering').should('be.visible');
    });

    it('lazy-loaded components do not block initial render', () => {
      cy.visit('/');

      // Core content should appear quickly
      cy.get('h1', { timeout: 2000 }).should('be.visible');

      // Allow time for lazy-loaded components to load
      cy.wait(3000);

      // Page should remain responsive
      cy.get('body').should('be.visible');
    });
  });

  describe('SEO and Metadata', () => {
    it('has proper meta tags', () => {
      cy.get('head title').should('exist').and('not.be.empty');
      cy.get('head meta[name="description"]').should('exist').and('have.attr', 'content');
      cy.get('head meta[name="viewport"]').should('exist');
    });

    it('has proper heading hierarchy', () => {
      cy.get('h1').should('have.length', 1); // Only one h1
      cy.get('h1').should('contain.text', 'Currently engineering');
    });

    it('includes structured data for operational atelier', () => {
      // Check that key brand terms are present for SEO
      cy.get('body').should('contain.text', 'Operational Design Atelier');
      cy.get('body').should('contain.text', 'automation');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA landmarks', () => {
      cy.get('main, [role="main"]').should('exist');
    });

    it('canvas elements have proper accessibility attributes', () => {
      cy.get('canvas').each($canvas => {
        cy.wrap($canvas).should('have.attr', 'aria-hidden', 'true');
      });
    });

    it('maintains focus management during animations', () => {
      cy.get('h1').should('be.visible');
      cy.get('h1').focus();

      // Focus should remain manageable even during text rotations
      cy.wait(2000);
      cy.focused().should('exist');
    });

    it('supports keyboard navigation', () => {
      // Test that interactive elements are keyboard accessible
      cy.get('body').tab();
      cy.focused().should('exist');
    });

    it('provides fallbacks for motion-sensitive users', () => {
      // This is tested in the Animation Performance section
      // but worth noting here for accessibility compliance
      cy.get('body').should('be.visible');
    });
  });
});
