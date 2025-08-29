/// <reference types="cypress" />

describe('Security Dashboard E2E Tests', () => {
  beforeEach(() => {
    // Clean and seed test data
    cy.cleanTestData();
    cy.seedTestData();
    
    // Mock external APIs
    cy.mockExternalAPIs();
    
    // Setup GraphQL intercepts
    cy.intercept('POST', '/graphql').as('graphqlRequest');
  });

  afterEach(() => {
    cy.cleanTestData();
  });

  describe('Dashboard Overview', () => {
    it('displays security metrics and charts', () => {
      cy.navigateAuthenticated('/');
      
      // Check main dashboard elements
      cy.get('[data-testid="security-dashboard"]').should('be.visible');
      cy.get('[data-testid="metrics-grid"]').should('be.visible');
      
      // Verify key metrics are displayed
      cy.get('[data-testid="total-threats-metric"]').should('contain', 'Total Threats');
      cy.get('[data-testid="active-incidents-metric"]').should('contain', 'Active Incidents');
      cy.get('[data-testid="system-health-metric"]').should('contain', 'System Health');
      
      // Check charts are rendered
      cy.get('[data-testid="threat-activity-chart"]').should('be.visible');
      cy.get('[data-testid="severity-distribution-chart"]').should('be.visible');
      
      // Verify real-time updates indicator
      cy.get('[data-testid="realtime-indicator"]').should('have.class', 'online');
    });

    it('handles loading states correctly', () => {
      cy.intercept('POST', '/graphql', {
        delay: 2000,
        body: { data: { securityMetrics: null } },
      }).as('slowGraphQL');
      
      cy.navigateAuthenticated('/');
      
      // Should show loading state
      cy.get('[data-testid="loading-skeleton"]').should('be.visible');
      cy.get('[data-testid="metrics-loading"]').should('be.visible');
      
      cy.wait('@slowGraphQL');
      
      // Loading should disappear
      cy.waitForLoadingToComplete();
    });

    it('handles error states gracefully', () => {
      cy.intercept('POST', '/graphql', {
        statusCode: 500,
        body: { errors: [{ message: 'Internal server error' }] },
      }).as('errorGraphQL');
      
      cy.navigateAuthenticated('/');
      
      cy.wait('@errorGraphQL');
      
      // Should display error message
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');
      
      // Test retry functionality
      cy.intercept('POST', '/graphql', { fixture: 'dashboard-data.json' }).as('retryGraphQL');
      cy.get('[data-testid="retry-button"]').click();
      
      cy.wait('@retryGraphQL');
      cy.waitForLoadingToComplete();
    });

    it('refreshes data when refresh button is clicked', () => {
      cy.navigateAuthenticated('/');
      cy.waitForLoadingToComplete();
      
      const performance = cy.measurePerformance('dashboard-refresh');
      
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@graphqlRequest');
      
      performance.end();
      
      // Verify data is refreshed
      cy.get('[data-testid="last-updated"]').should('contain', 'Just now');
    });

    it('filters dashboard by time range', () => {
      cy.navigateAuthenticated('/');
      cy.waitForLoadingToComplete();
      
      // Test time range selector
      cy.get('[data-testid="time-range-selector"]').click();
      cy.get('[data-testid="time-range-24h"]').click();
      
      cy.wait('@graphqlRequest');
      
      // Verify charts update with new time range
      cy.get('[data-testid="threat-activity-chart"]').should('be.visible');
      
      // Test other time ranges
      cy.get('[data-testid="time-range-selector"]').click();
      cy.get('[data-testid="time-range-7d"]').click();
      
      cy.wait('@graphqlRequest');
    });
  });

  describe('Real-Time Threat Detection', () => {
    it('displays real-time threat alerts', () => {
      cy.navigateAuthenticated('/threats');
      cy.waitForLoadingToComplete();
      
      // Initial threat list
      cy.get('[data-testid="threat-list"]').should('be.visible');
      
      // Create a new threat event
      cy.createTestSecurityEvent({
        type: 'MALWARE_DETECTED',
        severity: 'CRITICAL',
        description: 'Real-time test malware detection',
      });
      
      // Should see new threat in real-time (mocked WebSocket)
      cy.waitForRealTimeUpdate('threat_detected');
      
      cy.get('[data-testid="threat-list"]')
        .should('contain', 'Real-time test malware detection');
    });

    it('filters threats by severity', () => {
      cy.navigateAuthenticated('/threats');
      cy.waitForLoadingToComplete();
      
      // Apply severity filter
      cy.get('[data-testid="severity-filter"]').click();
      cy.get('[data-testid="severity-critical"]').click();
      
      cy.wait('@graphqlRequest');
      
      // Verify only critical threats are shown
      cy.get('[data-testid="threat-item"]').each(($el) => {
        cy.wrap($el).find('[data-testid="severity-badge"]')
          .should('have.class', 'severity-critical');
      });
    });

    it('opens threat details modal', () => {
      cy.navigateAuthenticated('/threats');
      cy.waitForLoadingToComplete();
      
      // Click on first threat
      cy.get('[data-testid="threat-item"]').first().click();
      
      // Verify modal opens
      cy.get('[data-testid="threat-details-modal"]').should('be.visible');
      cy.get('[data-testid="mitre-mapping"]').should('be.visible');
      cy.get('[data-testid="indicators-list"]').should('be.visible');
      
      // Close modal
      cy.get('[data-testid="close-modal"]').click();
      cy.get('[data-testid="threat-details-modal"]').should('not.exist');
    });

    it('creates incident from threat', () => {
      cy.navigateAuthenticated('/threats');
      cy.waitForLoadingToComplete();
      
      cy.get('[data-testid="threat-item"]').first().within(() => {
        cy.get('[data-testid="create-incident-btn"]').click();
      });
      
      // Fill incident form
      cy.get('[data-testid="incident-form"]').should('be.visible');
      cy.get('[data-testid="incident-title-input"]')
        .type('Automated incident from E2E test');
      cy.get('[data-testid="incident-description-input"]')
        .type('This incident was created during E2E testing');
      cy.get('[data-testid="assignee-select"]').select('security-team@company.com');
      
      cy.get('[data-testid="create-incident-submit"]').click();
      
      cy.wait('@graphqlRequest');
      
      // Should redirect to incident details
      cy.url().should('include', '/incidents/');
      cy.get('[data-testid="incident-title"]')
        .should('contain', 'Automated incident from E2E test');
    });
  });

  describe('Incident Response Workflow', () => {
    it('manages incident lifecycle', () => {
      // Create test incident first
      cy.createTestIncident({
        title: 'E2E Test Incident Lifecycle',
        severity: 'HIGH',
        status: 'OPEN',
      });
      
      cy.navigateAuthenticated('/incidents');
      cy.waitForLoadingToComplete();
      
      // Find and click on test incident
      cy.get('[data-testid="incident-item"]')
        .contains('E2E Test Incident Lifecycle')
        .click();
      
      // Verify incident details page
      cy.get('[data-testid="incident-details"]').should('be.visible');
      cy.get('[data-testid="incident-status"]').should('contain', 'OPEN');
      
      // Update incident status
      cy.get('[data-testid="status-select"]').select('INVESTIGATING');
      cy.get('[data-testid="update-status-btn"]').click();
      
      cy.wait('@graphqlRequest');
      
      // Verify status updated
      cy.get('[data-testid="incident-status"]').should('contain', 'INVESTIGATING');
      
      // Add timeline entry
      cy.get('[data-testid="add-timeline-entry"]').click();
      cy.get('[data-testid="timeline-action-input"]')
        .type('Investigation started - E2E test');
      cy.get('[data-testid="timeline-details-input"]')
        .type('Automated testing of timeline functionality');
      cy.get('[data-testid="save-timeline-entry"]').click();
      
      cy.wait('@graphqlRequest');
      
      // Verify timeline entry added
      cy.get('[data-testid="timeline-entry"]')
        .should('contain', 'Investigation started - E2E test');
    });

    it('executes incident response playbook', () => {
      cy.navigateAuthenticated('/incidents/inc-123'); // Assume test incident exists
      cy.waitForLoadingToComplete();
      
      // Select playbook
      cy.get('[data-testid="playbook-selector"]').click();
      cy.get('[data-testid="playbook-malware-response"]').click();
      
      // Verify playbook steps are loaded
      cy.get('[data-testid="playbook-steps"]').should('be.visible');
      cy.get('[data-testid="step-item"]').should('have.length.greaterThan', 0);
      
      // Complete first step
      cy.get('[data-testid="step-item"]').first().within(() => {
        cy.get('[data-testid="step-checkbox"]').check();
        cy.get('[data-testid="step-notes"]')
          .type('Step completed during E2E testing');
        cy.get('[data-testid="save-step"]').click();
      });
      
      cy.wait('@graphqlRequest');
      
      // Verify step marked as completed
      cy.get('[data-testid="step-item"]').first()
        .should('have.class', 'step-completed');
    });

    it('assigns incident to team member', () => {
      cy.navigateAuthenticated('/incidents/inc-123');
      cy.waitForLoadingToComplete();
      
      cy.get('[data-testid="reassign-btn"]').click();
      
      // Reassign incident
      cy.get('[data-testid="assignee-modal"]').should('be.visible');
      cy.get('[data-testid="assignee-search"]').type('john.doe@company.com');
      cy.get('[data-testid="assignee-suggestion"]').first().click();
      cy.get('[data-testid="assign-incident-btn"]').click();
      
      cy.wait('@graphqlRequest');
      
      // Verify assignment
      cy.get('[data-testid="current-assignee"]')
        .should('contain', 'john.doe@company.com');
    });
  });

  describe('Accessibility', () => {
    it('meets accessibility standards on dashboard', () => {
      cy.navigateAuthenticated('/');
      cy.waitForLoadingToComplete();
      
      // Check accessibility
      cy.checkA11y();
      
      // Test keyboard navigation
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'main-navigation');
      
      cy.tab();
      cy.focused().should('be.visible');
    });

    it('supports screen reader navigation', () => {
      cy.navigateAuthenticated('/');
      cy.waitForLoadingToComplete();
      
      // Check ARIA labels and roles
      cy.get('[data-testid="metrics-grid"]').should('have.attr', 'role', 'region');
      cy.get('[data-testid="threat-activity-chart"]')
        .should('have.attr', 'aria-label');
      
      // Check heading hierarchy
      cy.get('h1').should('exist');
      cy.get('h1').next('h2, h3, h4, h5, h6').should('exist');
    });
  });

  describe('Performance', () => {
    it('loads dashboard within acceptable time', () => {
      const performance = cy.measurePerformance('dashboard-load');
      
      cy.navigateAuthenticated('/');
      cy.waitForLoadingToComplete();
      
      performance.end();
      
      // Verify critical performance metrics
      cy.window().its('performance').then((perf) => {
        const navigation = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        expect(navigation.loadEventEnd - navigation.navigationStart).to.be.lessThan(3000);
      });
    });

    it('handles large datasets efficiently', () => {
      // Generate large dataset
      cy.task('generateSecurityEvents', 1000);
      
      cy.navigateAuthenticated('/threats');
      
      const performance = cy.measurePerformance('large-dataset-render');
      cy.waitForLoadingToComplete();
      performance.end();
      
      // Should implement virtualization for large lists
      cy.get('[data-testid="threat-list"]').should('be.visible');
      cy.get('[data-testid="virtual-list"]').should('exist');
    });

    it('maintains 60fps during animations', () => {
      cy.navigateAuthenticated('/');
      cy.waitForLoadingToComplete();
      
      // Trigger chart animations
      cy.get('[data-testid="time-range-selector"]').click();
      cy.get('[data-testid="time-range-24h"]').click();
      
      // Monitor frame rate during transition
      cy.window().then((win) => {
        let frames = 0;
        let lastTime = win.performance.now();
        
        const countFrames = () => {
          const now = win.performance.now();
          frames++;
          if (now - lastTime >= 1000) {
            cy.log(`FPS: ${frames}`);
            expect(frames).to.be.at.least(55); // Allow some tolerance
          } else {
            win.requestAnimationFrame(countFrames);
          }
        };
        
        win.requestAnimationFrame(countFrames);
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts to mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.navigateAuthenticated('/');
      cy.waitForLoadingToComplete();
      
      // Check mobile navigation
      cy.get('[data-testid="mobile-menu-toggle"]').should('be.visible');
      cy.get('[data-testid="desktop-navigation"]').should('not.be.visible');
      
      // Verify responsive layout
      cy.get('[data-testid="metrics-grid"]')
        .should('have.css', 'grid-template-columns')
        .and('match', /1fr/); // Single column on mobile
    });

    it('supports touch interactions', () => {
      cy.viewport('iphone-x');
      cy.navigateAuthenticated('/threats');
      cy.waitForLoadingToComplete();
      
      // Test swipe actions on cards
      cy.get('[data-testid="threat-card"]').first()
        .trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] })
        .trigger('touchmove', { touches: [{ clientX: 200, clientY: 100 }] })
        .trigger('touchend');
      
      // Should reveal action buttons
      cy.get('[data-testid="swipe-actions"]').should('be.visible');
    });
  });

  describe('Data Export and Reporting', () => {
    it('exports incident report', () => {
      cy.navigateAuthenticated('/incidents/inc-123');
      cy.waitForLoadingToComplete();
      
      cy.get('[data-testid="export-report-btn"]').click();
      
      // Select export format
      cy.get('[data-testid="export-format-pdf"]').click();
      cy.get('[data-testid="confirm-export"]').click();
      
      // Should trigger download
      cy.readFile('cypress/downloads/incident-report.pdf').should('exist');
    });

    it('exports threat intelligence data', () => {
      cy.navigateAuthenticated('/threats');
      cy.waitForLoadingToComplete();
      
      // Select threats to export
      cy.get('[data-testid="select-all-threats"]').check();
      cy.get('[data-testid="export-selected"]').click();
      
      // Choose STIX format
      cy.get('[data-testid="export-format-stix"]').click();
      cy.get('[data-testid="export-confirm"]').click();
      
      cy.readFile('cypress/downloads/threat-intelligence.stix').should('exist');
    });
  });

  describe('Integration with External Systems', () => {
    it('integrates with SIEM system', () => {
      // Mock SIEM API
      cy.intercept('POST', '**/siem/events', { statusCode: 200 }).as('siemIntegration');
      
      cy.navigateAuthenticated('/settings/integrations');
      
      // Configure SIEM integration
      cy.get('[data-testid="siem-config"]').click();
      cy.get('[data-testid="siem-endpoint"]').type('https://siem.company.com/api');
      cy.get('[data-testid="siem-api-key"]').type('test-api-key');
      cy.get('[data-testid="save-siem-config"]').click();
      
      // Test connection
      cy.get('[data-testid="test-siem-connection"]').click();
      cy.wait('@siemIntegration');
      
      cy.get('[data-testid="connection-status"]').should('contain', 'Connected');
    });

    it('syncs with threat intelligence feeds', () => {
      cy.intercept('GET', '**/threat-feeds/**', { fixture: 'threat-feeds.json' }).as('threatFeeds');
      
      cy.navigateAuthenticated('/settings/threat-intelligence');
      
      cy.get('[data-testid="sync-feeds-btn"]').click();
      cy.wait('@threatFeeds');
      
      cy.get('[data-testid="sync-status"]').should('contain', 'Sync completed');
      cy.get('[data-testid="last-sync-time"]').should('contain', 'Just now');
    });
  });
});