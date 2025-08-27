// Cypress E2E tests for Security Dashboard critical workflows

import { mockSecurityOverview, mockSecurityEvents, mockThreats, mockIncidents } from '../mocks/security-data';

// Custom commands for Security Dashboard
Cypress.Commands.add('loginAsAdmin', () => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type('admin@candlefish.ai');
  cy.get('[data-testid="password-input"]').type('SecurePassword123!');
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
  cy.get('[data-testid="user-menu"]').should('contain', 'admin@candlefish.ai');
});

Cypress.Commands.add('loginAsAnalyst', () => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type('analyst@candlefish.ai');
  cy.get('[data-testid="password-input"]').type('AnalystPassword123!');
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('interceptSecurityAPIs', () => {
  cy.intercept('GET', '/api/security/overview', mockSecurityOverview).as('getOverview');
  cy.intercept('GET', '/api/security/events**', {
    events: mockSecurityEvents,
    total: mockSecurityEvents.length,
  }).as('getEvents');
  cy.intercept('GET', '/api/threats**', mockThreats).as('getThreats');
  cy.intercept('GET', '/api/incidents**', mockIncidents).as('getIncidents');
});

Cypress.Commands.add('waitForDashboardLoad', () => {
  cy.wait(['@getOverview']);
  cy.get('[data-testid="dashboard-loading"]').should('not.exist');
  cy.get('[data-testid="security-overview"]').should('be.visible');
});

describe('Security Dashboard E2E Tests', () => {
  beforeEach(() => {
    cy.interceptSecurityAPIs();
    // Mock WebSocket connection
    cy.window().then((win) => {
      win.mockWebSocket = {
        connected: true,
        on: cy.stub(),
        emit: cy.stub(),
      };
    });
  });

  describe('Authentication Flow', () => {
    it('should redirect unauthenticated users to login', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
      cy.get('[data-testid="login-form"]').should('be.visible');
    });

    it('should login successfully with valid credentials', () => {
      cy.loginAsAdmin();
      cy.get('[data-testid="security-dashboard"]').should('be.visible');
      cy.get('[data-testid="threat-level-indicator"]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('invalid@example.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();
      cy.get('[data-testid="error-message"]').should('contain', 'Invalid credentials');
    });

    it('should logout successfully', () => {
      cy.loginAsAdmin();
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();
      cy.url().should('include', '/login');
    });

    it('should require MFA for admin users', () => {
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('admin@candlefish.ai');
      cy.get('[data-testid="password-input"]').type('SecurePassword123!');
      cy.get('[data-testid="login-button"]').click();
      
      // Should be redirected to MFA page
      cy.url().should('include', '/mfa');
      cy.get('[data-testid="mfa-code-input"]').should('be.visible');
      
      // Enter valid MFA code
      cy.get('[data-testid="mfa-code-input"]').type('123456');
      cy.get('[data-testid="mfa-verify-button"]').click();
      
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Security Dashboard Overview', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.waitForDashboardLoad();
    });

    it('should display security overview metrics', () => {
      cy.get('[data-testid="total-assets-metric"]').should('contain', mockSecurityOverview.totalAssets);
      cy.get('[data-testid="critical-vulns-metric"]').should('contain', mockSecurityOverview.criticalVulnerabilities);
      cy.get('[data-testid="active-alerts-metric"]').should('contain', mockSecurityOverview.activeAlerts);
      cy.get('[data-testid="compliance-score-metric"]').should('contain', mockSecurityOverview.complianceScore);
    });

    it('should display threat level with correct styling', () => {
      cy.get('[data-testid="threat-level-indicator"]')
        .should('be.visible')
        .and('have.class', 'threat-level-high'); // Based on mock data
    });

    it('should refresh dashboard data', () => {
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@getOverview');
      cy.get('[data-testid="last-updated"]').should('contain', 'just now');
    });

    it('should navigate to different dashboard sections', () => {
      // Navigate to Events
      cy.get('[data-testid="nav-events"]').click();
      cy.url().should('include', '/events');
      cy.get('[data-testid="events-timeline"]').should('be.visible');

      // Navigate to Threats
      cy.get('[data-testid="nav-threats"]').click();
      cy.url().should('include', '/threats');
      cy.get('[data-testid="threats-panel"]').should('be.visible');

      // Navigate to Incidents
      cy.get('[data-testid="nav-incidents"]').click();
      cy.url().should('include', '/incidents');
      cy.get('[data-testid="incidents-board"]').should('be.visible');
    });
  });

  describe('Security Events Management', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.visit('/events');
      cy.wait('@getEvents');
    });

    it('should display security events timeline', () => {
      cy.get('[data-testid="events-timeline"]').should('be.visible');
      cy.get('[data-testid="event-card"]').should('have.length', mockSecurityEvents.length);
      
      // Check first event details
      cy.get('[data-testid="event-card"]').first().within(() => {
        cy.contains(mockSecurityEvents[0].title);
        cy.get('[data-testid="event-severity"]').should('contain', mockSecurityEvents[0].severity);
        cy.get('[data-testid="event-timestamp"]').should('be.visible');
      });
    });

    it('should filter events by severity', () => {
      // Filter by critical events
      cy.get('[data-testid="severity-filter-critical"]').click();
      cy.wait('@getEvents');
      
      cy.get('[data-testid="event-card"]').each(($card) => {
        cy.wrap($card).find('[data-testid="event-severity"]').should('contain', 'critical');
      });
    });

    it('should filter events by time range', () => {
      cy.get('[data-testid="time-range-filter"]').click();
      cy.get('[data-testid="time-range-24h"]').click();
      cy.wait('@getEvents');
      
      cy.url().should('include', 'timeRange=24h');
    });

    it('should acknowledge security events', () => {
      cy.intercept('POST', `/api/security/events/${mockSecurityEvents[0].id}/acknowledge`, {
        success: true,
      }).as('acknowledgeEvent');

      cy.get('[data-testid="event-card"]').first().within(() => {
        cy.get('[data-testid="acknowledge-button"]').click();
      });

      cy.wait('@acknowledgeEvent');
      cy.get('[data-testid="event-card"]').first().should('have.class', 'acknowledged');
    });

    it('should view event details in modal', () => {
      cy.get('[data-testid="event-card"]').first().click();
      
      cy.get('[data-testid="event-details-modal"]').should('be.visible');
      cy.get('[data-testid="event-details-modal"]').within(() => {
        cy.contains(mockSecurityEvents[0].title);
        cy.contains(mockSecurityEvents[0].description);
        cy.get('[data-testid="event-metadata"]').should('be.visible');
        cy.get('[data-testid="related-assets"]').should('be.visible');
      });

      // Close modal
      cy.get('[data-testid="close-modal"]').click();
      cy.get('[data-testid="event-details-modal"]').should('not.exist');
    });

    it('should export security events', () => {
      cy.get('[data-testid="export-events-button"]').click();
      cy.get('[data-testid="export-format-csv"]').click();
      
      // Verify download was triggered
      cy.readFile('cypress/downloads/security-events.csv').should('exist');
    });
  });

  describe('Threat Detection and Investigation', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.visit('/threats');
      cy.wait('@getThreats');
    });

    it('should display threat detection panel with active threats', () => {
      cy.get('[data-testid="threats-panel"]').should('be.visible');
      cy.get('[data-testid="threat-card"]').should('have.length', mockThreats.length);
      
      // Check threat statistics
      const criticalThreats = mockThreats.filter(t => t.severity === 'critical').length;
      cy.get('[data-testid="critical-threats-count"]').should('contain', criticalThreats);
    });

    it('should display threat severity charts', () => {
      cy.get('[data-testid="threat-severity-chart"]').should('be.visible');
      cy.get('[data-testid="threat-trends-chart"]').should('be.visible');
    });

    it('should investigate threats', () => {
      cy.intercept('POST', `/api/threats/${mockThreats[0].id}/investigate`, {
        investigationId: 'inv-123',
        status: 'investigating',
      }).as('investigateThreat');

      cy.get('[data-testid="threat-card"]').first().within(() => {
        cy.get('[data-testid="investigate-button"]').click();
      });

      cy.wait('@investigateThreat');
      
      // Should open investigation modal
      cy.get('[data-testid="investigation-modal"]').should('be.visible');
      cy.get('[data-testid="investigation-steps"]').should('be.visible');
    });

    it('should update threat status', () => {
      cy.intercept('PATCH', `/api/threats/${mockThreats[0].id}`, {
        ...mockThreats[0],
        status: 'resolved',
      }).as('updateThreat');

      cy.get('[data-testid="threat-card"]').first().within(() => {
        cy.get('[data-testid="status-dropdown"]').click();
        cy.get('[data-testid="status-resolved"]').click();
      });

      cy.wait('@updateThreat');
      cy.get('[data-testid="threat-card"]').first().should('contain', 'Resolved');
    });

    it('should create incident from threat', () => {
      cy.intercept('POST', '/api/incidents', {
        id: 'new-incident-id',
        title: 'Security Incident from Threat',
        status: 'open',
      }).as('createIncident');

      cy.get('[data-testid="threat-card"]').first().within(() => {
        cy.get('[data-testid="threat-actions"]').click();
        cy.get('[data-testid="create-incident"]').click();
      });

      cy.get('[data-testid="incident-form-modal"]').should('be.visible');
      cy.get('[data-testid="incident-title"]').should('have.value', mockThreats[0].title);
      cy.get('[data-testid="create-incident-button"]').click();

      cy.wait('@createIncident');
      cy.get('[data-testid="success-toast"]').should('contain', 'Incident created successfully');
    });
  });

  describe('Incident Management Workflows', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.visit('/incidents');
      cy.wait('@getIncidents');
    });

    it('should display incident management board', () => {
      cy.get('[data-testid="incidents-board"]').should('be.visible');
      cy.get('[data-testid="column-open"]').should('be.visible');
      cy.get('[data-testid="column-investigating"]').should('be.visible');
      cy.get('[data-testid="column-resolved"]').should('be.visible');
    });

    it('should create new incident', () => {
      cy.intercept('POST', '/api/incidents', {
        id: 'new-incident-id',
        incidentNumber: 'INC-2024-999',
        title: 'New Security Incident',
        status: 'open',
        severity: 'high',
        createdAt: new Date().toISOString(),
      }).as('createIncident');

      cy.get('[data-testid="create-incident-button"]').click();
      
      cy.get('[data-testid="incident-form-modal"]').should('be.visible');
      cy.get('[data-testid="incident-title"]').type('New Security Incident');
      cy.get('[data-testid="incident-severity"]').select('high');
      cy.get('[data-testid="incident-description"]').type('Description of the security incident');
      cy.get('[data-testid="create-incident-button"]').click();

      cy.wait('@createIncident');
      cy.get('[data-testid="success-toast"]').should('be.visible');
      
      // New incident should appear in open column
      cy.get('[data-testid="column-open"]').should('contain', 'New Security Incident');
    });

    it('should update incident status via drag and drop', () => {
      cy.intercept('PATCH', `/api/incidents/${mockIncidents[2].id}`, {
        ...mockIncidents[2],
        status: 'investigating',
      }).as('updateIncidentStatus');

      // Drag incident from open to investigating column
      cy.get(`[data-testid="incident-${mockIncidents[2].id}"]`)
        .trigger('dragstart');
      
      cy.get('[data-testid="column-investigating"]')
        .trigger('dragover')
        .trigger('drop');

      cy.wait('@updateIncidentStatus');
      
      // Incident should now be in investigating column
      cy.get('[data-testid="column-investigating"]')
        .should('contain', mockIncidents[2].title);
    });

    it('should view incident details and timeline', () => {
      cy.get(`[data-testid="incident-${mockIncidents[0].id}"]`).click();
      
      cy.get('[data-testid="incident-details-modal"]').should('be.visible');
      cy.get('[data-testid="incident-details-modal"]').within(() => {
        cy.contains(mockIncidents[0].title);
        cy.contains(mockIncidents[0].incidentNumber);
        cy.get('[data-testid="incident-timeline"]').should('be.visible');
        cy.get('[data-testid="affected-assets"]').should('be.visible');
        cy.get('[data-testid="related-events"]').should('be.visible');
      });
    });

    it('should assign incident to team member', () => {
      cy.intercept('PATCH', `/api/incidents/${mockIncidents[2].id}`, {
        ...mockIncidents[2],
        assignedTo: 'user-123',
        assignedToName: 'John Security',
      }).as('assignIncident');

      cy.get(`[data-testid="incident-${mockIncidents[2].id}"]`).within(() => {
        cy.get('[data-testid="assign-button"]').click();
      });

      cy.get('[data-testid="assign-modal"]').should('be.visible');
      cy.get('[data-testid="assignee-select"]').select('John Security');
      cy.get('[data-testid="assign-confirm-button"]').click();

      cy.wait('@assignIncident');
      cy.get(`[data-testid="incident-${mockIncidents[2].id}"]`)
        .should('contain', 'John Security');
    });

    it('should add timeline entry to incident', () => {
      cy.intercept('POST', `/api/incidents/${mockIncidents[0].id}/timeline`, {
        id: 'timeline-entry-id',
        timestamp: new Date().toISOString(),
        action: 'Investigation update',
        user: 'admin',
        details: 'Added new findings to the investigation',
      }).as('addTimelineEntry');

      cy.get(`[data-testid="incident-${mockIncidents[0].id}"]`).click();
      
      cy.get('[data-testid="incident-details-modal"]').within(() => {
        cy.get('[data-testid="add-timeline-entry"]').click();
        cy.get('[data-testid="timeline-action"]').type('Investigation update');
        cy.get('[data-testid="timeline-details"]').type('Added new findings to the investigation');
        cy.get('[data-testid="save-timeline-entry"]').click();
      });

      cy.wait('@addTimelineEntry');
      cy.get('[data-testid="incident-timeline"]').should('contain', 'Investigation update');
    });
  });

  describe('Asset Management', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.visit('/assets');
    });

    it('should display assets with security scores', () => {
      cy.get('[data-testid="assets-table"]').should('be.visible');
      cy.get('[data-testid="asset-row"]').should('have.length.at.least', 1);
      
      cy.get('[data-testid="asset-row"]').first().within(() => {
        cy.get('[data-testid="asset-name"]').should('be.visible');
        cy.get('[data-testid="security-score"]').should('be.visible');
        cy.get('[data-testid="threat-level"]').should('be.visible');
      });
    });

    it('should filter assets by criticality', () => {
      cy.get('[data-testid="criticality-filter"]').select('critical');
      
      cy.get('[data-testid="asset-row"]').each(($row) => {
        cy.wrap($row).find('[data-testid="criticality-badge"]').should('contain', 'Critical');
      });
    });

    it('should view asset vulnerabilities', () => {
      cy.get('[data-testid="asset-row"]').first().within(() => {
        cy.get('[data-testid="view-vulnerabilities"]').click();
      });

      cy.url().should('include', '/assets/');
      cy.url().should('include', '/vulnerabilities');
      cy.get('[data-testid="vulnerability-list"]').should('be.visible');
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.waitForDashboardLoad();
    });

    it('should show real-time connection status', () => {
      cy.get('[data-testid="connection-status"]').should('contain', 'Connected');
      cy.get('[data-testid="connection-indicator"]').should('have.class', 'connected');
    });

    it('should display new security events in real-time', () => {
      // Simulate WebSocket event
      cy.window().then((win) => {
        const newEvent = {
          id: 'real-time-event',
          title: 'Real-time Security Event',
          severity: 'high',
          createdAt: new Date().toISOString(),
        };
        
        // Trigger WebSocket event simulation
        win.postMessage({
          type: 'websocket-event',
          event: 'new-security-event',
          data: newEvent,
        }, '*');
      });

      // Should see notification
      cy.get('[data-testid="notification-toast"]').should('be.visible');
      cy.get('[data-testid="notification-toast"]').should('contain', 'New security event');
    });

    it('should handle connection loss gracefully', () => {
      // Simulate connection loss
      cy.window().then((win) => {
        win.mockWebSocket.connected = false;
        win.postMessage({
          type: 'websocket-event',
          event: 'disconnect',
          data: { reason: 'transport close' },
        }, '*');
      });

      cy.get('[data-testid="connection-status"]').should('contain', 'Disconnected');
      cy.get('[data-testid="connection-indicator"]').should('have.class', 'disconnected');
      cy.get('[data-testid="reconnection-banner"]').should('be.visible');
    });
  });

  describe('Performance and Responsiveness', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should load dashboard within performance budget', () => {
      const startTime = Date.now();
      
      cy.visit('/dashboard');
      cy.waitForDashboardLoad();
      
      cy.then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // 3 second budget
      });
    });

    it('should be responsive on mobile devices', () => {
      cy.viewport('iphone-6');
      cy.visit('/dashboard');
      cy.waitForDashboardLoad();

      // Check mobile navigation
      cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
      cy.get('[data-testid="mobile-menu-button"]').click();
      cy.get('[data-testid="mobile-navigation"]').should('be.visible');

      // Check responsive metrics cards
      cy.get('[data-testid="metric-cards"]').should('have.class', 'mobile-layout');
    });

    it('should handle large datasets without performance degradation', () => {
      // Mock large dataset
      const largeEventsList = Array.from({ length: 1000 }, (_, i) => ({
        id: `event-${i}`,
        title: `Security Event ${i}`,
        severity: i % 4 === 0 ? 'critical' : 'medium',
        createdAt: new Date().toISOString(),
      }));

      cy.intercept('GET', '/api/security/events**', {
        events: largeEventsList,
        total: largeEventsList.length,
      }).as('getLargeEventsList');

      const startTime = Date.now();
      cy.visit('/events');
      cy.wait('@getLargeEventsList');
      
      // Should implement virtualization or pagination
      cy.get('[data-testid="events-timeline"]').should('be.visible');
      cy.get('[data-testid="event-card"]').should('have.length.lessThan', 50); // Virtual scrolling
      
      cy.then(() => {
        const renderTime = Date.now() - startTime;
        expect(renderTime).to.be.lessThan(5000); // 5 second budget for large datasets
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.waitForDashboardLoad();
    });

    it('should be keyboard navigable', () => {
      // Tab through main navigation
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'nav-dashboard');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'nav-events');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'nav-threats');
      
      // Test keyboard activation
      cy.focused().type('{enter}');
      cy.url().should('include', '/threats');
    });

    it('should have proper ARIA labels and roles', () => {
      cy.get('[data-testid="security-dashboard"]').should('have.attr', 'role', 'main');
      cy.get('[data-testid="threat-level-indicator"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="metric-cards"]').should('have.attr', 'role', 'region');
    });

    it('should provide screen reader announcements', () => {
      cy.get('[aria-live="polite"]').should('exist');
      
      // Trigger an action that should announce
      cy.get('[data-testid="refresh-button"]').click();
      cy.get('[aria-live="polite"]').should('contain', 'Dashboard updated');
    });

    it('should meet color contrast requirements', () => {
      // This would typically use axe-core or similar accessibility testing tools
      cy.get('[data-testid="threat-level-critical"]')
        .should('have.css', 'background-color')
        .and('match', /rgb\(220, 38, 127\)/); // Ensures sufficient contrast
    });
  });

  describe('Role-Based Access Control', () => {
    it('should restrict analyst users appropriately', () => {
      cy.loginAsAnalyst();
      cy.visit('/dashboard');
      
      // Can view dashboard
      cy.get('[data-testid="security-overview"]').should('be.visible');
      
      // Cannot see admin-only features
      cy.get('[data-testid="admin-settings"]').should('not.exist');
      cy.get('[data-testid="user-management"]').should('not.exist');
      
      // Can acknowledge events but not delete
      cy.visit('/events');
      cy.get('[data-testid="acknowledge-button"]').should('be.visible');
      cy.get('[data-testid="delete-event-button"]').should('not.exist');
    });

    it('should show different UI elements based on permissions', () => {
      cy.loginAsAdmin();
      cy.visit('/incidents');
      
      // Admin should see all incident actions
      cy.get('[data-testid="create-incident-button"]').should('be.visible');
      cy.get('[data-testid="bulk-actions"]').should('be.visible');
      cy.get('[data-testid="incident-settings"]').should('be.visible');
    });
  });
});

// Add custom command types
declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>;
      loginAsAnalyst(): Chainable<void>;
      interceptSecurityAPIs(): Chainable<void>;
      waitForDashboardLoad(): Chainable<void>;
      tab(): Chainable<JQuery<HTMLElement>>;
    }
  }
}