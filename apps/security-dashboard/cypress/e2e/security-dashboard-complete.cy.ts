/// <reference types="cypress" />

describe('Security Dashboard - Complete E2E Tests', () => {
  beforeEach(() => {
    // Set up test data and intercepts
    cy.setupTestData();
    cy.setupApiIntercepts();
  });

  describe('Authentication and Authorization', () => {
    it('should handle admin login flow (Tyler)', () => {
      cy.visit('/login');
      
      // Admin login
      cy.loginAsAdmin('tyler');
      
      // Should be on admin dashboard
      cy.url().should('include', '/dashboard/admin');
      cy.get('[data-testid="admin-header"]').should('be.visible');
      cy.get('[data-testid="welcome-message"]').should('contain', 'Tyler');
      
      // Should have admin navigation
      cy.get('[data-testid="nav-user-management"]').should('be.visible');
      cy.get('[data-testid="nav-system-settings"]').should('be.visible');
      cy.get('[data-testid="nav-audit-logs"]').should('be.visible');
    });

    it('should handle admin login flow (Patrick)', () => {
      cy.visit('/login');
      
      cy.loginAsAdmin('patrick');
      
      cy.url().should('include', '/dashboard/admin');
      cy.get('[data-testid="welcome-message"]').should('contain', 'Patrick');
      
      // Patrick should have super admin features
      cy.get('[data-testid="nav-system-config"]').should('be.visible');
      cy.get('[data-testid="nav-deployment-management"]').should('be.visible');
    });

    it('should handle guest login flow (Aaron)', () => {
      cy.visit('/login');
      
      cy.loginAsGuest('aaron');
      
      cy.url().should('include', '/dashboard/guest');
      cy.get('[data-testid="guest-header"]').should('be.visible');
      cy.get('[data-testid="welcome-message"]').should('contain', 'Aaron');
      cy.get('[data-testid="read-only-badge"]').should('be.visible');
      
      // Should not have admin navigation
      cy.get('[data-testid="nav-user-management"]').should('not.exist');
      cy.get('[data-testid="nav-system-settings"]').should('not.exist');
    });

    it('should handle guest login flow (James)', () => {
      cy.visit('/login');
      
      cy.loginAsGuest('james');
      
      cy.url().should('include', '/dashboard/guest');
      cy.get('[data-testid="welcome-message"]').should('contain', 'James');
      cy.get('[data-testid="access-restrictions-notice"]').should('be.visible');
    });

    it('should reject invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="username-input"]').type('invalid-user');
      cy.get('[data-testid="password-input"]').type('wrong-password');
      cy.get('[data-testid="login-button"]').click();
      
      cy.get('[data-testid="login-error"]').should('be.visible');
      cy.get('[data-testid="login-error"]').should('contain', 'Invalid credentials');
      cy.url().should('include', '/login');
    });

    it('should handle session expiration', () => {
      cy.loginAsAdmin('tyler');
      
      // Mock session expiration
      cy.window().then(win => {
        win.localStorage.setItem('sessionExpired', 'true');
        win.dispatchEvent(new Event('storage'));
      });
      
      cy.get('[data-testid="session-expired-modal"]').should('be.visible');
      cy.get('[data-testid="login-again-button"]').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Admin Dashboard Features', () => {
    beforeEach(() => {
      cy.loginAsAdmin('tyler');
      cy.seedTestData();
    });

    it('should display comprehensive security metrics', () => {
      cy.visit('/dashboard/admin');
      
      // Check all metric cards
      cy.get('[data-testid="metric-total-threats"]').should('be.visible');
      cy.get('[data-testid="metric-active-incidents"]').should('be.visible');
      cy.get('[data-testid="metric-resolved-today"]').should('be.visible');
      cy.get('[data-testid="metric-system-health"]').should('be.visible');
      
      // Values should be populated
      cy.get('[data-testid="metric-total-threats"] .metric-value')
        .should('not.be.empty')
        .invoke('text')
        .then(text => {
          expect(parseInt(text)).to.be.greaterThan(0);
        });
    });

    it('should handle real-time threat updates', () => {
      cy.visit('/dashboard/admin');
      
      // Get initial count
      cy.get('[data-testid="metric-total-threats"] .metric-value')
        .invoke('text')
        .then(initialCount => {
          // Simulate real-time update
          cy.mockSocketEvent('threat_updated', {
            id: 'new-threat-123',
            name: 'New Advanced Persistent Threat',
            severity: 'HIGH',
            timestamp: new Date().toISOString(),
          });
          
          // Count should update
          cy.get('[data-testid="metric-total-threats"] .metric-value')
            .should('not.contain', initialCount);
        });
    });

    it('should display and interact with threat activity chart', () => {
      cy.visit('/dashboard/admin');
      
      cy.get('[data-testid="threat-activity-chart"]').should('be.visible');
      
      // Chart should have data points
      cy.get('[data-testid="chart-container"] svg').should('exist');
      cy.get('[data-testid="chart-data-points"]').should('have.length.greaterThan', 0);
      
      // Should show tooltip on hover
      cy.get('[data-testid="chart-data-points"]').first().trigger('mouseover');
      cy.get('[data-testid="chart-tooltip"]').should('be.visible');
    });

    it('should manage recent alerts panel', () => {
      cy.visit('/dashboard/admin');
      
      cy.get('[data-testid="recent-alerts-panel"]').should('be.visible');
      cy.get('[data-testid="alert-item"]').should('have.length.greaterThan', 0);
      
      // Should show alert details
      cy.get('[data-testid="alert-item"]').first().within(() => {
        cy.get('[data-testid="alert-title"]').should('be.visible');
        cy.get('[data-testid="severity-badge"]').should('be.visible');
        cy.get('[data-testid="alert-timestamp"]').should('be.visible');
      });
      
      // Should handle alert acknowledgment
      cy.get('[data-testid="alert-item"]').first().click();
      cy.get('[data-testid="acknowledge-alert-button"]').click();
      cy.get('[data-testid="acknowledgment-notes"]').type('Alert reviewed and verified');
      cy.get('[data-testid="confirm-acknowledgment"]').click();
      
      cy.get('[data-testid="success-notification"]').should('contain', 'Alert acknowledged');
    });
  });

  describe('Incident Management Workflow', () => {
    beforeEach(() => {
      cy.loginAsAdmin('tyler');
      cy.visit('/incidents');
    });

    it('should create a new security incident', () => {
      cy.get('[data-testid="create-incident-button"]').click();
      
      // Fill incident form
      cy.get('[data-testid="incident-title"]').type('Critical Data Breach');
      cy.get('[data-testid="incident-description"]').type('Unauthorized access to customer database detected');
      cy.get('[data-testid="incident-severity"]').select('CRITICAL');
      cy.get('[data-testid="incident-priority"]').select('HIGH');
      cy.get('[data-testid="incident-category"]').select('Data Breach');
      
      cy.get('[data-testid="save-incident-button"]').click();
      
      // Should redirect to incident detail
      cy.url().should('match', /\/incidents\/[a-zA-Z0-9-]+/);
      cy.get('[data-testid="incident-title"]').should('contain', 'Critical Data Breach');
      cy.get('[data-testid="incident-status"]').should('contain', 'NEW');
    });

    it('should update incident through status workflow', () => {
      // Click on existing incident
      cy.get('[data-testid="incident-item"]').first().click();
      
      // Start investigation
      cy.get('[data-testid="status-actions"]').click();
      cy.get('[data-testid="start-investigation"]').click();
      
      cy.get('[data-testid="investigation-notes"]').type('Initial investigation started');
      cy.get('[data-testid="update-status-button"]').click();
      
      // Status should update
      cy.get('[data-testid="incident-status"]').should('contain', 'INVESTIGATING');
      
      // Should appear in timeline
      cy.get('[data-testid="incident-timeline"]').within(() => {
        cy.get('[data-testid="timeline-entry"]')
          .should('contain', 'Status changed to INVESTIGATING');
      });
    });

    it('should assign incident to team member', () => {
      cy.get('[data-testid="incident-item"]').first().click();
      
      cy.get('[data-testid="assign-incident-button"]').click();
      cy.get('[data-testid="assignee-select"]').select('analyst-jane-doe');
      cy.get('[data-testid="assignment-notes"]').type('Assigning to senior analyst for investigation');
      cy.get('[data-testid="confirm-assignment"]').click();
      
      cy.get('[data-testid="incident-assignee"]').should('contain', 'Jane Doe');
      cy.get('[data-testid="success-notification"]').should('contain', 'Incident assigned');
    });

    it('should execute incident response playbook', () => {
      cy.get('[data-testid="incident-item"]').first().click();
      
      cy.get('[data-testid="playbook-actions"]').click();
      cy.get('[data-testid="execute-playbook"]').click();
      
      cy.get('[data-testid="playbook-select"]').select('data-breach-response');
      cy.get('[data-testid="start-playbook-execution"]').click();
      
      // Should show playbook progress
      cy.get('[data-testid="playbook-progress"]').should('be.visible');
      cy.get('[data-testid="current-step-title"]').should('contain', 'Initial Containment');
      
      // Complete first step
      cy.get('[data-testid="complete-step-button"]').click();
      cy.get('[data-testid="step-completion-notes"]').type('Immediate containment measures implemented');
      cy.get('[data-testid="confirm-step-completion"]').click();
      
      // Should advance to next step
      cy.get('[data-testid="current-step-title"]').should('contain', 'Evidence Collection');
    });

    it('should filter and search incidents', () => {
      // Test status filter
      cy.get('[data-testid="status-filter"]').select('INVESTIGATING');
      cy.get('[data-testid="incident-item"]').each($el => {
        cy.wrap($el).find('[data-testid="incident-status"]').should('contain', 'INVESTIGATING');
      });
      
      // Test severity filter
      cy.get('[data-testid="severity-filter"]').select('CRITICAL');
      cy.get('[data-testid="incident-item"]').each($el => {
        cy.wrap($el).find('[data-testid="severity-badge"]').should('contain', 'CRITICAL');
      });
      
      // Test search
      cy.get('[data-testid="incident-search"]').type('data breach');
      cy.get('[data-testid="incident-item"]').should('have.length.greaterThan', 0);
      cy.get('[data-testid="incident-item"]').each($el => {
        cy.wrap($el).should('contain.text', 'breach');
      });
    });
  });

  describe('Alert Management Features', () => {
    beforeEach(() => {
      cy.loginAsAdmin('tyler');
      cy.visit('/alerts');
    });

    it('should acknowledge individual alerts', () => {
      cy.get('[data-testid="alert-item"]').first().within(() => {
        cy.get('[data-testid="acknowledge-button"]').click();
      });
      
      cy.get('[data-testid="acknowledgment-modal"]').should('be.visible');
      cy.get('[data-testid="acknowledgment-notes"]').type('Alert verified and assessed');
      cy.get('[data-testid="confirm-acknowledgment"]').click();
      
      cy.get('[data-testid="success-notification"]').should('contain', 'Alert acknowledged');
    });

    it('should perform bulk alert operations', () => {
      // Select multiple alerts
      cy.get('[data-testid="alert-checkbox"]').first().check();
      cy.get('[data-testid="alert-checkbox"]').eq(1).check();
      cy.get('[data-testid="alert-checkbox"]').eq(2).check();
      
      // Bulk acknowledge
      cy.get('[data-testid="bulk-actions-menu"]').click();
      cy.get('[data-testid="bulk-acknowledge"]').click();
      
      cy.get('[data-testid="bulk-operation-modal"]').should('be.visible');
      cy.get('[data-testid="bulk-notes"]').type('Bulk acknowledgment of related alerts');
      cy.get('[data-testid="confirm-bulk-operation"]').click();
      
      cy.get('[data-testid="success-notification"]').should('contain', '3 alerts acknowledged');
    });

    it('should escalate alerts to incidents', () => {
      // Find critical alert
      cy.get('[data-testid="severity-filter"]').select('CRITICAL');
      cy.get('[data-testid="alert-item"]').first().click();
      
      cy.get('[data-testid="escalate-button"]').click();
      
      // Should pre-fill incident creation form
      cy.get('[data-testid="escalation-form"]').should('be.visible');
      cy.get('[data-testid="incident-title"]').should('not.be.empty');
      cy.get('[data-testid="incident-severity"]').should('have.value', 'CRITICAL');
      
      cy.get('[data-testid="escalation-reason"]').type('Alert requires immediate incident response');
      cy.get('[data-testid="create-incident-from-alert"]').click();
      
      // Should redirect to new incident
      cy.url().should('match', /\/incidents\/[a-zA-Z0-9-]+/);
      cy.get('[data-testid="incident-source-alert"]').should('be.visible');
    });

    it('should filter alerts by multiple criteria', () => {
      // Combined filters
      cy.get('[data-testid="severity-filter"]').select('HIGH');
      cy.get('[data-testid="status-filter"]').select('OPEN');
      cy.get('[data-testid="type-filter"]').select('MALWARE');
      
      cy.get('[data-testid="apply-filters"]').click();
      
      // Verify filtered results
      cy.get('[data-testid="alert-item"]').each($el => {
        cy.wrap($el).find('[data-testid="severity-badge"]').should('contain', 'HIGH');
        cy.wrap($el).find('[data-testid="status-badge"]').should('contain', 'OPEN');
        cy.wrap($el).find('[data-testid="type-badge"]').should('contain', 'MALWARE');
      });
    });
  });

  describe('Threat Intelligence Management', () => {
    beforeEach(() => {
      cy.loginAsAdmin('tyler');
      cy.visit('/threats');
    });

    it('should search and filter threat intelligence', () => {
      // Search functionality
      cy.get('[data-testid="threat-search"]').type('APT');
      cy.get('[data-testid="search-button"]').click();
      
      cy.get('[data-testid="threat-item"]').should('have.length.greaterThan', 0);
      cy.get('[data-testid="threat-item"]').each($el => {
        cy.wrap($el).should('contain.text', 'APT');
      });
      
      // Clear search and apply filters
      cy.get('[data-testid="clear-search"]').click();
      cy.get('[data-testid="severity-filter"]').select('HIGH');
      cy.get('[data-testid="confidence-filter"]').select('0.8');
      
      cy.get('[data-testid="threat-item"]').each($el => {
        cy.wrap($el).find('[data-testid="severity-badge"]').should('contain', 'HIGH');
        cy.wrap($el).find('[data-testid="confidence-score"]').invoke('text').then(text => {
          expect(parseFloat(text)).to.be.at.least(0.8);
        });
      });
    });

    it('should view detailed threat information', () => {
      cy.get('[data-testid="threat-item"]').first().click();
      
      // Should display comprehensive threat details
      cy.get('[data-testid="threat-details"]').should('be.visible');
      cy.get('[data-testid="threat-name"]').should('be.visible');
      cy.get('[data-testid="threat-description"]').should('be.visible');
      cy.get('[data-testid="threat-severity"]').should('be.visible');
      cy.get('[data-testid="confidence-score"]').should('be.visible');
      
      // MITRE ATT&CK information
      cy.get('[data-testid="mitre-tactics"]').should('be.visible');
      cy.get('[data-testid="mitre-techniques"]').should('be.visible');
      
      // IOC section
      cy.get('[data-testid="indicators-section"]').should('be.visible');
      cy.get('[data-testid="ioc-list"]').should('be.visible');
    });

    it('should add IOC to existing threat', () => {
      cy.get('[data-testid="threat-item"]').first().click();
      
      cy.get('[data-testid="add-ioc-button"]').click();
      
      cy.get('[data-testid="ioc-form"]').should('be.visible');
      cy.get('[data-testid="ioc-type"]').select('IP');
      cy.get('[data-testid="ioc-value"]').type('192.168.1.100');
      cy.get('[data-testid="ioc-description"]').type('Command and control server');
      cy.get('[data-testid="ioc-confidence"]').type('0.9');
      
      cy.get('[data-testid="save-ioc"]').click();
      
      // Should appear in IOC list
      cy.get('[data-testid="ioc-list"]').should('contain', '192.168.1.100');
      cy.get('[data-testid="success-notification"]').should('contain', 'IOC added successfully');
    });

    it('should export threat intelligence data', () => {
      // Set up download handling
      cy.window().document().then(doc => {
        doc.addEventListener('click', () => {
          setTimeout(() => {
            doc.dispatchEvent(new Event('downloadStarted'));
          }, 500);
        });
      });
      
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-format"]').select('JSON');
      cy.get('[data-testid="export-threats"]').click();
      
      // Should trigger download
      cy.document().should('have.been.called.with.event', 'downloadStarted');
    });
  });

  describe('User Management (Admin Only)', () => {
    beforeEach(() => {
      cy.loginAsAdmin('tyler');
      cy.visit('/admin/users');
    });

    it('should display user management interface', () => {
      cy.get('[data-testid="users-table"]').should('be.visible');
      cy.get('[data-testid="add-user-button"]').should('be.visible');
      
      // Should show user list
      cy.get('[data-testid="user-row"]').should('have.length.greaterThan', 0);
      
      // Check user information
      cy.get('[data-testid="user-row"]').first().within(() => {
        cy.get('[data-testid="user-name"]').should('be.visible');
        cy.get('[data-testid="user-email"]').should('be.visible');
        cy.get('[data-testid="user-role"]').should('be.visible');
        cy.get('[data-testid="user-status"]').should('be.visible');
      });
    });

    it('should create new user', () => {
      cy.get('[data-testid="add-user-button"]').click();
      
      cy.get('[data-testid="user-form"]').should('be.visible');
      cy.get('[data-testid="user-name"]').type('Sarah Wilson');
      cy.get('[data-testid="user-email"]').type('sarah.wilson@security.com');
      cy.get('[data-testid="user-role"]').select('SECURITY_ANALYST');
      
      // Set permissions
      cy.get('[data-testid="permission-read-threats"]').check();
      cy.get('[data-testid="permission-write-incidents"]').check();
      cy.get('[data-testid="permission-read-alerts"]').check();
      
      cy.get('[data-testid="create-user-button"]').click();
      
      cy.get('[data-testid="success-notification"]').should('contain', 'User created successfully');
      cy.get('[data-testid="users-table"]').should('contain', 'sarah.wilson@security.com');
    });

    it('should edit user permissions', () => {
      cy.get('[data-testid="user-row"]').first().within(() => {
        cy.get('[data-testid="edit-user-button"]').click();
      });
      
      cy.get('[data-testid="user-edit-form"]').should('be.visible');
      
      // Add admin permission
      cy.get('[data-testid="permission-admin"]').check();
      cy.get('[data-testid="save-user-changes"]').click();
      
      cy.get('[data-testid="success-notification"]').should('contain', 'User updated successfully');
    });

    it('should deactivate user', () => {
      cy.get('[data-testid="user-row"]').first().within(() => {
        cy.get('[data-testid="user-actions"]').click();
        cy.get('[data-testid="deactivate-user"]').click();
      });
      
      cy.get('[data-testid="confirm-deactivation"]').should('be.visible');
      cy.get('[data-testid="deactivation-reason"]').type('User no longer with organization');
      cy.get('[data-testid="confirm-deactivation-button"]').click();
      
      cy.get('[data-testid="user-row"]').first().within(() => {
        cy.get('[data-testid="user-status"]').should('contain', 'Inactive');
      });
    });
  });

  describe('Guest User Experience', () => {
    beforeEach(() => {
      cy.loginAsGuest('aaron');
    });

    it('should display limited dashboard for guests', () => {
      cy.url().should('include', '/dashboard/guest');
      
      // Should show guest-specific elements
      cy.get('[data-testid="guest-header"]').should('be.visible');
      cy.get('[data-testid="read-only-notice"]').should('be.visible');
      
      // Should show limited metrics
      cy.get('[data-testid="metric-threat-level"]').should('be.visible');
      cy.get('[data-testid="metric-system-status"]').should('be.visible');
      
      // Should NOT show detailed admin metrics
      cy.get('[data-testid="metric-total-threats"]').should('not.exist');
      cy.get('[data-testid="metric-active-incidents"]').should('not.exist');
    });

    it('should restrict access to admin features', () => {
      // Try to access admin pages
      cy.visit('/admin/users');
      cy.url().should('include', '/dashboard/guest');
      cy.get('[data-testid="access-denied-message"]').should('be.visible');
      
      cy.visit('/admin/settings');
      cy.url().should('include', '/dashboard/guest');
      
      cy.visit('/admin/audit');
      cy.url().should('include', '/dashboard/guest');
    });

    it('should show read-only incident view', () => {
      cy.visit('/incidents');
      
      cy.get('[data-testid="incidents-list"]').should('be.visible');
      cy.get('[data-testid="readonly-warning"]').should('be.visible');
      
      // Should NOT have create button
      cy.get('[data-testid="create-incident-button"]').should('not.exist');
      
      // Click on incident
      cy.get('[data-testid="incident-item"]').first().click();
      
      // Should be read-only view
      cy.get('[data-testid="incident-readonly-view"]').should('be.visible');
      cy.get('[data-testid="readonly-notice"]').should('be.visible');
      
      // Should NOT have action buttons
      cy.get('[data-testid="update-status-button"]').should('not.exist');
      cy.get('[data-testid="assign-incident-button"]').should('not.exist');
    });

    it('should show sanitized alert information', () => {
      cy.visit('/alerts');
      
      cy.get('[data-testid="public-alerts-list"]').should('be.visible');
      cy.get('[data-testid="access-restricted-notice"]').should('be.visible');
      
      // Should NOT have management functions
      cy.get('[data-testid="acknowledge-alert-button"]').should('not.exist');
      cy.get('[data-testid="bulk-actions"]').should('not.exist');
      
      // Alert content should be sanitized
      cy.get('[data-testid="public-alert-item"]').first().within(() => {
        cy.get('[data-testid="alert-type"]').should('be.visible');
        cy.get('[data-testid="alert-severity"]').should('be.visible');
        
        // Should NOT show technical details
        cy.get('[data-testid="alert-source-ip"]').should('not.exist');
        cy.get('[data-testid="alert-rule-id"]').should('not.exist');
      });
    });

    it('should handle session timeout for guests', () => {
      // Set short timeout
      cy.window().then(win => {
        win.localStorage.setItem('guestSessionTimeout', '5000');
      });
      
      // Wait for timeout
      cy.wait(6000);
      
      // Should redirect to login
      cy.url().should('include', '/login');
      cy.get('[data-testid="session-expired-message"]').should('be.visible');
    });
  });

  describe('Real-time Features', () => {
    beforeEach(() => {
      cy.loginAsAdmin('tyler');
      cy.visit('/dashboard/admin');
    });

    it('should handle WebSocket connection status', () => {
      // Should show connected status
      cy.get('[data-testid="connection-status"]').should('contain', 'Connected');
      
      // Simulate connection loss
      cy.mockSocketDisconnect();
      cy.get('[data-testid="connection-status"]').should('contain', 'Disconnected');
      cy.get('[data-testid="reconnecting-indicator"]').should('be.visible');
      
      // Simulate reconnection
      cy.mockSocketReconnect();
      cy.get('[data-testid="connection-status"]').should('contain', 'Connected');
      cy.get('[data-testid="reconnecting-indicator"]').should('not.exist');
    });

    it('should receive real-time security alerts', () => {
      // Simulate incoming alert
      cy.mockSocketEvent('alert_created', {
        id: 'alert-realtime-123',
        title: 'Real-time Security Alert',
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
      });
      
      // Should show notification
      cy.get('[data-testid="realtime-notification"]').should('be.visible');
      cy.get('[data-testid="realtime-notification"]').should('contain', 'Real-time Security Alert');
      
      // Should update alerts counter
      cy.get('[data-testid="alerts-counter"]').should('be.visible');
    });

    it('should update threat metrics in real-time', () => {
      // Get initial count
      cy.get('[data-testid="metric-total-threats"] .metric-value')
        .invoke('text')
        .then(initialCount => {
          // Simulate threat update
          cy.mockSocketEvent('threat_updated', {
            id: 'threat-new-123',
            name: 'New Threat Intelligence',
            severity: 'HIGH',
          });
          
          // Count should update
          cy.get('[data-testid="metric-total-threats"] .metric-value')
            .should('not.contain', initialCount);
        });
    });
  });

  describe('Accessibility and Performance', () => {
    beforeEach(() => {
      cy.loginAsAdmin('tyler');
    });

    it('should be accessible with keyboard navigation', () => {
      cy.visit('/dashboard/admin');
      
      // Test tab navigation
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'skip-to-content');
      
      cy.tab();
      cy.focused().should('have.attr', 'data-testid', 'main-navigation');
      
      // Test alert acknowledgment with keyboard
      cy.visit('/alerts');
      cy.get('[data-testid="alert-item"]').first().focus();
      cy.focused().type('{enter}');
      
      cy.get('[data-testid="acknowledge-alert-button"]').focus();
      cy.focused().type('{enter}');
    });

    it('should meet accessibility standards', () => {
      cy.visit('/dashboard/admin');
      cy.injectAxe();
      cy.checkA11y();
      
      // Check specific components
      cy.checkA11y('[data-testid="threat-activity-chart"]');
      cy.checkA11y('[data-testid="recent-alerts-panel"]');
      cy.checkA11y('[data-testid="system-health-indicator"]');
    });

    it('should load within performance thresholds', () => {
      // Enable performance monitoring
      cy.startPerformanceMonitoring();
      
      cy.visit('/dashboard/admin');
      
      // Check load times
      cy.endPerformanceMonitoring().then(metrics => {
        expect(metrics.loadTime).to.be.lessThan(3000); // 3 seconds
        expect(metrics.firstContentfulPaint).to.be.lessThan(2000); // 2 seconds
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      cy.loginAsAdmin('tyler');
    });

    it('should handle API errors gracefully', () => {
      // Mock API failure
      cy.intercept('GET', '/api/threats', { statusCode: 500, body: 'Internal Server Error' });
      
      cy.visit('/threats');
      
      // Should show error message
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain', 'Unable to load threats');
      
      // Should provide retry option
      cy.get('[data-testid="retry-button"]').should('be.visible');
      cy.get('[data-testid="retry-button"]').click();
    });

    it('should handle network connectivity issues', () => {
      cy.visit('/dashboard/admin');
      
      // Simulate offline
      cy.window().then(win => {
        win.dispatchEvent(new Event('offline'));
      });
      
      cy.get('[data-testid="offline-indicator"]').should('be.visible');
      cy.get('[data-testid="offline-message"]').should('contain', 'You are currently offline');
      
      // Simulate back online
      cy.window().then(win => {
        win.dispatchEvent(new Event('online'));
      });
      
      cy.get('[data-testid="offline-indicator"]').should('not.exist');
    });

    it('should handle form validation errors', () => {
      cy.visit('/incidents');
      cy.get('[data-testid="create-incident-button"]').click();
      
      // Submit empty form
      cy.get('[data-testid="save-incident-button"]').click();
      
      // Should show validation errors
      cy.get('[data-testid="field-error-title"]').should('be.visible');
      cy.get('[data-testid="field-error-title"]').should('contain', 'Title is required');
      
      cy.get('[data-testid="field-error-description"]').should('be.visible');
      cy.get('[data-testid="field-error-severity"]').should('be.visible');
    });
  });
});