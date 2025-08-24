/**
 * End-to-End Tests for Netlify Extension Management
 *
 * Critical user journeys:
 * 1. Enabling an extension on a site
 * 2. Configuring extension settings
 * 3. Following AI recommendations
 * 4. Monitoring performance impact
 */

describe('Netlify Extension Management E2E', () => {
  beforeEach(() => {
    // Setup test environment
    cy.intercept('GET', '/api/sites', { fixture: 'candlefish-sites.json' }).as('getSites');
    cy.intercept('GET', '/api/extensions', { fixture: 'available-extensions.json' }).as('getExtensions');
    cy.intercept('GET', '/api/sites/candlefish-ai/extensions', { fixture: 'site-extensions.json' }).as('getSiteExtensions');
    cy.intercept('GET', '/api/recommendations/candlefish-ai', { fixture: 'ai-recommendations.json' }).as('getRecommendations');
    cy.intercept('GET', '/api/sites/candlefish-ai/metrics*', { fixture: 'performance-metrics.json' }).as('getMetrics');

    // Visit the dashboard
    cy.visit('/netlify-dashboard');

    // Wait for initial load
    cy.wait(['@getSites', '@getExtensions']);
  });

  describe('Critical User Journey 1: Enabling an Extension', () => {
    it('should successfully enable a performance extension', () => {
      // Setup intercept for extension enablement
      cy.intercept('POST', '/api/sites/candlefish-ai/extensions', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'cache-control',
            name: 'Advanced Cache Control',
            isEnabled: true,
            performance: { impact: 'medium', loadTime: 120, bundleSize: 15 }
          },
          timestamp: new Date().toISOString()
        }
      }).as('enableExtension');

      // Verify initial state
      cy.get('[data-testid="site-selector"]').should('contain', 'Candlefish AI');
      cy.wait('@getSiteExtensions');

      // Find the Cache Control extension
      cy.get('[data-testid="extension-card"]')
        .contains('Advanced Cache Control')
        .parent('[data-testid="extension-card"]')
        .as('cacheControlCard');

      // Verify extension is initially disabled
      cy.get('@cacheControlCard')
        .find('[data-testid="extension-toggle"]')
        .should('not.be.checked');

      cy.get('@cacheControlCard')
        .should('contain', 'Disabled')
        .and('have.class', 'border-gray-700');

      // Enable the extension
      cy.get('@cacheControlCard')
        .find('[data-testid="extension-toggle"]')
        .click();

      // Verify loading state
      cy.get('@cacheControlCard')
        .find('[data-testid="loading-spinner"]')
        .should('be.visible');

      // Wait for API call to complete
      cy.wait('@enableExtension');

      // Verify success state
      cy.get('[data-testid="toast-success"]')
        .should('be.visible')
        .and('contain', 'Extension enabled successfully');

      // Verify UI updates
      cy.get('@cacheControlCard')
        .find('[data-testid="extension-toggle"]')
        .should('be.checked');

      cy.get('@cacheControlCard')
        .should('contain', 'Enabled')
        .and('have.class', 'border-operation-active');

      // Verify performance impact display
      cy.get('@cacheControlCard')
        .should('contain', 'Medium Impact')
        .and('contain', '120ms')
        .and('contain', '15KB');

      // Verify configure button becomes enabled
      cy.get('@cacheControlCard')
        .find('[data-testid="configure-button"]')
        .should('be.enabled');
    });

    it('should handle extension enablement errors gracefully', () => {
      // Setup intercept for failed enablement
      cy.intercept('POST', '/api/sites/candlefish-ai/extensions', {
        statusCode: 400,
        body: {
          code: 'EXTENSION_CONFLICT',
          message: 'Extension conflicts with current configuration'
        }
      }).as('enableExtensionError');

      // Try to enable an extension
      cy.get('[data-testid="extension-card"]')
        .first()
        .find('[data-testid="extension-toggle"]')
        .click();

      cy.wait('@enableExtensionError');

      // Verify error handling
      cy.get('[data-testid="toast-error"]')
        .should('be.visible')
        .and('contain', 'Failed to enable extension');

      // Verify toggle returns to disabled state
      cy.get('[data-testid="extension-card"]')
        .first()
        .find('[data-testid="extension-toggle"]')
        .should('not.be.checked');
    });

    it('should support bulk extension operations', () => {
      // Setup intercepts for batch operations
      cy.intercept('POST', '/api/batch-toggle', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            success: 3,
            failed: 0,
            errors: []
          }
        }
      }).as('batchToggle');

      // Enter bulk mode
      cy.get('[data-testid="bulk-operations-button"]').click();

      // Verify bulk mode UI
      cy.get('[data-testid="bulk-mode-banner"]')
        .should('be.visible')
        .and('contain', 'Bulk Operations Mode');

      // Select multiple extensions
      cy.get('[data-testid="extension-card"]')
        .should('have.length.gte', 3);

      cy.get('[data-testid="extension-card"]')
        .eq(0)
        .find('[data-testid="bulk-checkbox"]')
        .click();

      cy.get('[data-testid="extension-card"]')
        .eq(1)
        .find('[data-testid="bulk-checkbox"]')
        .click();

      cy.get('[data-testid="extension-card"]')
        .eq(2)
        .find('[data-testid="bulk-checkbox"]')
        .click();

      // Verify selection count
      cy.get('[data-testid="selected-count"]')
        .should('contain', '3 extensions selected');

      // Execute bulk enable
      cy.get('[data-testid="bulk-enable-button"]').click();

      // Confirm operation
      cy.get('[data-testid="bulk-confirm-dialog"]')
        .should('be.visible');

      cy.get('[data-testid="confirm-bulk-operation"]').click();

      cy.wait('@batchToggle');

      // Verify success
      cy.get('[data-testid="toast-success"]')
        .should('be.visible')
        .and('contain', '3 extensions enabled successfully');

      // Exit bulk mode
      cy.get('[data-testid="exit-bulk-mode"]').click();

      cy.get('[data-testid="bulk-mode-banner"]').should('not.exist');
    });
  });

  describe('Critical User Journey 2: Configuring Extension Settings', () => {
    it('should open and configure extension settings', () => {
      // Setup intercepts
      cy.intercept('GET', '/api/extension-config/candlefish-ai/cache-control', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            extensionId: 'cache-control',
            siteId: 'candlefish-ai',
            config: {
              maxAge: 3600,
              staleWhileRevalidate: 86400,
              cacheStrategy: 'conservative'
            },
            isEnabled: true,
            lastModified: new Date().toISOString()
          }
        }
      }).as('getConfig');

      cy.intercept('POST', '/api/extension-config/candlefish-ai/cache-control', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            extensionId: 'cache-control',
            siteId: 'candlefish-ai',
            config: {
              maxAge: 7200,
              staleWhileRevalidate: 86400,
              cacheStrategy: 'aggressive'
            },
            isEnabled: true,
            lastModified: new Date().toISOString()
          }
        }
      }).as('updateConfig');

      // Find enabled extension and click configure
      cy.get('[data-testid="extension-card"]')
        .contains('Advanced Cache Control')
        .parent('[data-testid="extension-card"]')
        .find('[data-testid="configure-button"]')
        .click();

      cy.wait('@getConfig');

      // Verify configuration modal opens
      cy.get('[data-testid="configuration-modal"]')
        .should('be.visible')
        .and('contain', 'Configure Advanced Cache Control');

      // Verify current settings are loaded
      cy.get('[data-testid="config-maxAge"]')
        .should('have.value', '3600');

      cy.get('[data-testid="config-cacheStrategy"]')
        .should('have.value', 'conservative');

      // Modify settings
      cy.get('[data-testid="config-maxAge"]')
        .clear()
        .type('7200');

      cy.get('[data-testid="config-cacheStrategy"]')
        .select('aggressive');

      // Preview changes
      cy.get('[data-testid="preview-changes"]').click();

      cy.get('[data-testid="config-preview"]')
        .should('be.visible')
        .and('contain', 'Max Age: 7200 seconds')
        .and('contain', 'Strategy: Aggressive caching');

      // Save configuration
      cy.get('[data-testid="save-config"]').click();

      cy.wait('@updateConfig');

      // Verify success
      cy.get('[data-testid="toast-success"]')
        .should('be.visible')
        .and('contain', 'Configuration updated successfully');

      // Modal should close
      cy.get('[data-testid="configuration-modal"]').should('not.exist');

      // Verify last modified time updates
      cy.get('[data-testid="extension-card"]')
        .contains('Advanced Cache Control')
        .parent('[data-testid="extension-card"]')
        .should('contain', 'Modified just now');
    });

    it('should validate configuration inputs', () => {
      // Open configuration modal
      cy.get('[data-testid="extension-card"]')
        .contains('Advanced Cache Control')
        .parent('[data-testid="extension-card"]')
        .find('[data-testid="configure-button"]')
        .click();

      // Enter invalid values
      cy.get('[data-testid="config-maxAge"]')
        .clear()
        .type('-1'); // Invalid negative value

      cy.get('[data-testid="config-threshold"]')
        .clear()
        .type('150'); // Invalid value > 100

      // Try to save
      cy.get('[data-testid="save-config"]').click();

      // Verify validation errors
      cy.get('[data-testid="validation-error-maxAge"]')
        .should('be.visible')
        .and('contain', 'Must be a positive number');

      cy.get('[data-testid="validation-error-threshold"]')
        .should('be.visible')
        .and('contain', 'Must be between 0 and 100');

      // Save button should be disabled
      cy.get('[data-testid="save-config"]').should('be.disabled');

      // Fix validation errors
      cy.get('[data-testid="config-maxAge"]')
        .clear()
        .type('3600');

      cy.get('[data-testid="config-threshold"]')
        .clear()
        .type('75');

      // Errors should clear
      cy.get('[data-testid="validation-error-maxAge"]').should('not.exist');
      cy.get('[data-testid="validation-error-threshold"]').should('not.exist');

      // Save button should be enabled
      cy.get('[data-testid="save-config"]').should('be.enabled');
    });
  });

  describe('Critical User Journey 3: Following AI Recommendations', () => {
    it('should display and apply AI recommendations', () => {
      // Setup intercept for applying recommendation
      cy.intercept('POST', '/api/sites/candlefish-ai/extensions', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'image-optimization',
            name: 'Smart Image Optimization',
            isEnabled: true
          }
        }
      }).as('applyRecommendation');

      // Wait for recommendations to load
      cy.wait('@getRecommendations');

      // Verify recommendations section
      cy.get('[data-testid="ai-recommendations"]')
        .should('be.visible')
        .and('contain', 'AI Recommendations');

      // Check recommendation details
      cy.get('[data-testid="recommendation-card"]')
        .first()
        .as('topRecommendation');

      cy.get('@topRecommendation')
        .should('contain', 'Smart Image Optimization')
        .and('contain', '92% confidence')
        .and('contain', '+35% performance')
        .and('contain', '12 minutes setup');

      // View detailed reasoning
      cy.get('@topRecommendation')
        .find('[data-testid="view-reasoning"]')
        .click();

      cy.get('[data-testid="reasoning-details"]')
        .should('be.visible')
        .and('contain', 'Your site has large images that could benefit from optimization');

      // Apply the recommendation
      cy.get('@topRecommendation')
        .find('[data-testid="apply-recommendation"]')
        .click();

      // Confirm application
      cy.get('[data-testid="apply-confirm-dialog"]')
        .should('be.visible')
        .and('contain', 'Apply AI Recommendation');

      cy.get('[data-testid="confirm-apply"]').click();

      cy.wait('@applyRecommendation');

      // Verify success
      cy.get('[data-testid="toast-success"]')
        .should('be.visible')
        .and('contain', 'Recommendation applied successfully');

      // Recommendation should be marked as applied
      cy.get('@topRecommendation')
        .should('contain', 'Applied')
        .and('have.class', 'recommendation-applied');

      // Extension should appear as enabled in extensions list
      cy.get('[data-testid="extension-card"]')
        .contains('Smart Image Optimization')
        .parent('[data-testid="extension-card"]')
        .find('[data-testid="extension-toggle"]')
        .should('be.checked');
    });

    it('should filter and sort recommendations', () => {
      cy.wait('@getRecommendations');

      // Verify initial sort (by confidence)
      cy.get('[data-testid="recommendation-card"]')
        .first()
        .should('contain', '92% confidence');

      // Change sort to impact
      cy.get('[data-testid="sort-recommendations"]')
        .select('impact');

      cy.get('[data-testid="recommendation-card"]')
        .first()
        .should('contain', '+35% performance');

      // Filter by category
      cy.get('[data-testid="filter-category"]')
        .select('performance');

      cy.get('[data-testid="recommendation-card"]')
        .should('have.length.gte', 1)
        .each($card => {
          cy.wrap($card).should('contain', 'Performance');
        });

      // Clear filters
      cy.get('[data-testid="clear-filters"]').click();

      cy.get('[data-testid="recommendation-card"]')
        .should('have.length.gte', 3); // More recommendations visible
    });

    it('should handle recommendation failures gracefully', () => {
      cy.intercept('POST', '/api/sites/candlefish-ai/extensions', {
        statusCode: 409,
        body: {
          code: 'EXTENSION_CONFLICT',
          message: 'Extension conflicts with existing configuration'
        }
      }).as('applyRecommendationError');

      cy.wait('@getRecommendations');

      // Try to apply recommendation
      cy.get('[data-testid="recommendation-card"]')
        .first()
        .find('[data-testid="apply-recommendation"]')
        .click();

      cy.get('[data-testid="confirm-apply"]').click();

      cy.wait('@applyRecommendationError');

      // Verify error handling
      cy.get('[data-testid="toast-error"]')
        .should('be.visible')
        .and('contain', 'Failed to apply recommendation');

      // Recommendation should show error state
      cy.get('[data-testid="recommendation-card"]')
        .first()
        .should('contain', 'Application failed')
        .and('have.class', 'recommendation-error');
    });
  });

  describe('Critical User Journey 4: Monitoring Performance Impact', () => {
    it('should display real-time performance metrics', () => {
      cy.wait('@getMetrics');

      // Verify performance metrics section
      cy.get('[data-testid="performance-metrics"]')
        .should('be.visible')
        .and('contain', 'Performance Metrics');

      // Check Core Web Vitals
      cy.get('[data-testid="metric-lcp"]')
        .should('be.visible')
        .and('contain', '1.8s')
        .and('contain', 'LCP');

      cy.get('[data-testid="metric-fid"]')
        .should('be.visible')
        .and('contain', '85ms')
        .and('contain', 'FID');

      cy.get('[data-testid="metric-cls"]')
        .should('be.visible')
        .and('contain', '0.08')
        .and('contain', 'CLS');

      // Verify Lighthouse scores
      cy.get('[data-testid="lighthouse-scores"]')
        .should('be.visible');

      cy.get('[data-testid="performance-score"]')
        .should('contain', '92');

      cy.get('[data-testid="accessibility-score"]')
        .should('contain', '98');

      // Check performance chart
      cy.get('[data-testid="performance-chart"]')
        .should('be.visible');

      // Verify chart data points
      cy.get('[data-testid="performance-chart"] canvas')
        .should('be.visible');
    });

    it('should allow changing time ranges', () => {
      cy.intercept('GET', '/api/sites/candlefish-ai/metrics?timeRange=7d', {
        fixture: 'performance-metrics-7d.json'
      }).as('getMetrics7d');

      cy.intercept('GET', '/api/sites/candlefish-ai/metrics?timeRange=30d', {
        fixture: 'performance-metrics-30d.json'
      }).as('getMetrics30d');

      // Change to 7 day view
      cy.get('[data-testid="time-range-selector"]')
        .select('7d');

      cy.wait('@getMetrics7d');

      // Verify chart updates
      cy.get('[data-testid="performance-chart"]')
        .should('contain', '7 days');

      // Change to 30 day view
      cy.get('[data-testid="time-range-selector"]')
        .select('30d');

      cy.wait('@getMetrics30d');

      cy.get('[data-testid="performance-chart"]')
        .should('contain', '30 days');
    });

    it('should show deployment impact analysis', () => {
      // Setup intercept for extension impact data
      cy.intercept('GET', '/api/sites/candlefish-ai/deployment-impact', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              extension: { id: 'cache-control', name: 'Cache Control' },
              before: { lcp: 2200, buildTime: 60 },
              after: { lcp: 1800, buildTime: 45 },
              impact: { performance: 18, buildTime: -25 },
              timestamp: new Date().toISOString()
            }
          ]
        }
      }).as('getImpactData');

      // Enable impact analysis view
      cy.get('[data-testid="show-impact-analysis"]').click();

      cy.wait('@getImpactData');

      // Verify impact display
      cy.get('[data-testid="impact-analysis"]')
        .should('be.visible')
        .and('contain', 'Deployment Impact');

      cy.get('[data-testid="impact-card"]')
        .should('contain', 'Cache Control')
        .and('contain', '+18% performance')
        .and('contain', '-25% build time')
        .and('contain', '400ms faster LCP');

      // Check before/after comparison
      cy.get('[data-testid="before-metrics"]')
        .should('contain', '2.2s LCP')
        .and('contain', '60s build');

      cy.get('[data-testid="after-metrics"]')
        .should('contain', '1.8s LCP')
        .and('contain', '45s build');
    });

    it('should handle real-time updates via WebSocket', () => {
      // Mock WebSocket connection
      cy.window().then((win) => {
        // Simulate WebSocket message
        const mockWs = {
          addEventListener: cy.stub(),
          close: cy.stub(),
          send: cy.stub()
        };

        // Override WebSocket constructor
        win.WebSocket = cy.stub().returns(mockWs);
      });

      // Trigger WebSocket connection
      cy.get('[data-testid="enable-realtime"]').click();

      // Simulate receiving performance update
      cy.window().its('WebSocket').should('have.been.called');

      // Verify real-time indicator
      cy.get('[data-testid="realtime-indicator"]')
        .should('be.visible')
        .and('contain', 'Live');
    });
  });

  describe('Site Switching and Navigation', () => {
    it('should switch between sites seamlessly', () => {
      // Setup intercepts for different sites
      cy.intercept('GET', '/api/sites/staging-candlefish-ai/extensions', {
        fixture: 'staging-site-extensions.json'
      }).as('getStagingExtensions');

      // Verify current site
      cy.get('[data-testid="current-site"]')
        .should('contain', 'Candlefish AI');

      // Switch to staging site
      cy.get('[data-testid="site-selector"]')
        .find('[data-testid="site-option"]')
        .contains('Staging')
        .click();

      cy.wait('@getStagingExtensions');

      // Verify site switch
      cy.get('[data-testid="current-site"]')
        .should('contain', 'Staging - Candlefish AI');

      // Verify URL update
      cy.url().should('include', 'site=staging-candlefish-ai');

      // Verify extensions update for new site
      cy.get('[data-testid="extension-card"]')
        .should('have.length.gte', 1);
    });

    it('should maintain state when navigating between sections', () => {
      // Apply filters
      cy.get('[data-testid="category-filter"]')
        .select('performance');

      cy.get('[data-testid="search-extensions"]')
        .type('cache');

      // Switch to recommendations tab
      cy.get('[data-testid="recommendations-tab"]').click();

      // Switch back to extensions
      cy.get('[data-testid="extensions-tab"]').click();

      // Verify filters are maintained
      cy.get('[data-testid="category-filter"]')
        .should('have.value', 'performance');

      cy.get('[data-testid="search-extensions"]')
        .should('have.value', 'cache');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API failures gracefully', () => {
      // Simulate API failure
      cy.intercept('GET', '/api/sites/candlefish-ai/extensions', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('getExtensionsError');

      // Reload the page to trigger API call
      cy.reload();

      cy.wait('@getExtensionsError');

      // Verify error state
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'Failed to load extensions');

      // Verify retry button
      cy.get('[data-testid="retry-button"]')
        .should('be.visible');

      // Setup successful retry
      cy.intercept('GET', '/api/sites/candlefish-ai/extensions', {
        fixture: 'site-extensions.json'
      }).as('getExtensionsRetry');

      // Click retry
      cy.get('[data-testid="retry-button"]').click();

      cy.wait('@getExtensionsRetry');

      // Verify recovery
      cy.get('[data-testid="error-message"]').should('not.exist');
      cy.get('[data-testid="extension-card"]')
        .should('have.length.gte', 1);
    });

    it('should handle network connectivity issues', () => {
      // Simulate network failure
      cy.intercept('POST', '/api/sites/candlefish-ai/extensions', {
        forceNetworkError: true
      }).as('networkError');

      // Try to enable an extension
      cy.get('[data-testid="extension-card"]')
        .first()
        .find('[data-testid="extension-toggle"]')
        .click();

      cy.wait('@networkError');

      // Verify offline handling
      cy.get('[data-testid="toast-error"]')
        .should('contain', 'Network error');

      cy.get('[data-testid="offline-indicator"]')
        .should('be.visible');
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
    });

    it('should adapt layout for mobile devices', () => {
      // Verify mobile navigation
      cy.get('[data-testid="mobile-nav-toggle"]')
        .should('be.visible')
        .click();

      cy.get('[data-testid="mobile-nav-menu"]')
        .should('be.visible');

      // Verify site selector adapts to mobile
      cy.get('[data-testid="site-selector"]')
        .should('have.class', 'mobile-layout');

      // Verify extension cards stack vertically
      cy.get('[data-testid="extension-grid"]')
        .should('have.class', 'grid-cols-1');

      // Verify touch-friendly interactions
      cy.get('[data-testid="extension-toggle"]')
        .first()
        .should('have.css', 'min-height', '44px'); // iOS touch target size
    });
  });
});
