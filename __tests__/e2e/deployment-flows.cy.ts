/**
 * End-to-End tests for critical deployment flows
 * Tests complete user journeys through deployment processes
 */

describe('Deployment Flows E2E', () => {
  beforeEach(() => {
    // Setup test environment
    cy.task('db:seed');
    cy.task('setupTestUser', {
      email: 'admin@candlefish.ai',
      role: 'admin',
      permissions: ['deployments:create', 'deployments:read', 'deployments:rollback']
    });

    // Login
    cy.login('admin@candlefish.ai', 'test-password');
    cy.visit('/deployment');
  });

  afterEach(() => {
    cy.task('db:cleanup');
  });

  describe('Complete Deployment Flow', () => {
    it('should successfully deploy from dashboard to production', () => {
      // 1. Navigate to deployment dashboard
      cy.get('[data-testid="deployment-dashboard"]').should('be.visible');
      cy.get('[data-testid="health-status-grid"]').should('be.visible');

      // 2. Start new deployment
      cy.get('button').contains('New Deployment').click();
      cy.get('[data-testid="deployment-form"]').should('be.visible');

      // 3. Fill deployment form
      cy.get('[data-testid="site-selector"]').click();
      cy.get('[data-testid="site-option-docs"]').click();

      cy.get('[data-testid="environment-selector"]').click();
      cy.get('[data-testid="environment-option-staging"]').click();

      cy.get('[data-testid="branch-input"]').type('main');
      cy.get('[data-testid="strategy-selector"]').select('blue-green');
      cy.get('[data-testid="changelog-input"]').type('E2E test deployment with new features');

      // 4. Submit deployment
      cy.get('button').contains('Deploy').click();

      // 5. Verify deployment creation
      cy.get('[data-testid="deployment-success-toast"]').should('contain', 'Deployment created successfully');
      cy.get('[data-testid="deployment-modal"]').should('not.exist');

      // 6. Check deployment appears in history
      cy.get('[data-testid="deployment-history"]').within(() => {
        cy.get('[data-testid^="deployment-card-"]').first().within(() => {
          cy.get('[data-testid="site-name"]').should('contain', 'docs');
          cy.get('[data-testid="environment"]').should('contain', 'staging');
          cy.get('[data-testid="status"]').should('contain', 'pending');
        });
      });

      // 7. Monitor deployment progress
      cy.get('[data-testid^="deployment-card-"]').first().click();
      cy.get('[data-testid="deployment-details"]').should('be.visible');

      // Wait for build to start
      cy.get('[data-testid="status"]').should('contain', 'building', { timeout: 30000 });
      cy.get('[data-testid="step-build"]').should('have.attr', 'data-status', 'running');
      cy.get('[data-testid="deployment-progress"]').should('be.visible');

      // Wait for deployment to complete
      cy.get('[data-testid="status"]').should('contain', 'success', { timeout: 120000 });
      cy.get('[data-testid="completion-time"]').should('exist');
      cy.get('[data-testid="live-url"]').should('be.visible');

      // Verify all steps completed
      ['build', 'deploy_blue', 'health_check', 'switch_traffic'].forEach(step => {
        cy.get(`[data-testid="step-${step}"]`).should('have.attr', 'data-status', 'success');
      });

      // 8. Verify health status updated
      cy.get('[data-testid="health-status-grid"]').within(() => {
        cy.get('[data-testid="health-docs-staging"]').should('contain', 'healthy');
      });
    });

    it('should handle deployment failures gracefully', () => {
      // Create deployment that will fail
      cy.get('button').contains('New Deployment').click();

      cy.get('[data-testid="site-selector"]').click();
      cy.get('[data-testid="site-option-api"]').click();

      cy.get('[data-testid="environment-selector"]').click();
      cy.get('[data-testid="environment-option-staging"]').click();

      // Use a branch that will cause build failure
      cy.get('[data-testid="branch-input"]').type('feature/broken-build');
      cy.get('[data-testid="changelog-input"]').type('Testing build failure handling');

      cy.get('button').contains('Deploy').click();

      // Wait for failure
      cy.get('[data-testid^="deployment-card-"]').first().click();
      cy.get('[data-testid="status"]').should('contain', 'failed', { timeout: 60000 });

      // Check error details
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="step-build"]').should('have.attr', 'data-status', 'failed');

      // Verify logs link is available
      cy.get('[data-testid="view-logs-link"]').should('be.visible').and('have.attr', 'href');

      // Check that subsequent steps weren't executed
      cy.get('[data-testid="step-deploy"]').should('not.exist');
    });
  });

  describe('Blue-Green Deployment Strategy', () => {
    it('should perform zero-downtime blue-green deployment', () => {
      // Start monitoring site health
      cy.task('startHealthMonitor', { site: 'docs', environment: 'production' });

      // Create blue-green deployment
      cy.get('button').contains('New Deployment').click();

      cy.get('[data-testid="site-selector"]').click();
      cy.get('[data-testid="site-option-docs"]').click();

      cy.get('[data-testid="environment-selector"]').click();
      cy.get('[data-testid="environment-option-production"]').click();

      cy.get('[data-testid="branch-input"]').type('main');
      cy.get('[data-testid="strategy-selector"]').select('blue-green');

      cy.get('button').contains('Deploy').click();

      // Monitor deployment steps
      cy.get('[data-testid^="deployment-card-"]').first().click();

      // Blue deployment phase
      cy.get('[data-testid="step-deploy_blue"]').should('have.attr', 'data-status', 'running');
      cy.get('[data-testid="blue-environment-url"]').should('be.visible');

      // Health check phase
      cy.get('[data-testid="step-health_check"]', { timeout: 120000 }).should('have.attr', 'data-status', 'running');
      cy.get('[data-testid="health-check-results"]').should('be.visible');

      // Traffic switch phase
      cy.get('[data-testid="step-switch_traffic"]', { timeout: 30000 }).should('have.attr', 'data-status', 'running');

      // Final success
      cy.get('[data-testid="status"]').should('contain', 'success', { timeout: 60000 });

      // Verify no downtime occurred
      cy.task('getHealthMonitorResults').then((results: any) => {
        expect(results.downtime_seconds).to.equal(0);
        expect(results.error_count).to.equal(0);
      });
    });
  });

  describe('Rollback Scenarios', () => {
    beforeEach(() => {
      // Create two successful deployments for rollback testing
      cy.task('createSuccessfulDeployment', {
        site_name: 'partners',
        environment: 'production',
        commit_sha: 'good-deployment-123',
        changelog: 'Working version'
      }).as('previousDeployment');

      cy.task('createSuccessfulDeployment', {
        site_name: 'partners',
        environment: 'production',
        commit_sha: 'bad-deployment-456',
        changelog: 'Problematic version'
      }).as('currentDeployment');
    });

    it('should successfully rollback to previous deployment', function() {
      // Navigate to deployment history
      cy.get('[data-testid="deployment-history"]').should('be.visible');

      // Find current deployment and initiate rollback
      cy.get(`[data-testid="deployment-card-${this.currentDeployment.id}"]`).within(() => {
        cy.get('[data-testid="actions-menu"]').click();
      });

      cy.get('[data-testid="rollback-option"]').click();

      // Rollback confirmation dialog
      cy.get('[data-testid="rollback-dialog"]').should('be.visible');
      cy.get('[data-testid="rollback-target"]').should('contain', this.previousDeployment.commit_sha.substring(0, 7));

      cy.get('[data-testid="rollback-reason"]').type('E2E test rollback - simulated issue');
      cy.get('button').contains('Confirm Rollback').click();

      // Monitor rollback progress
      cy.get('[data-testid="rollback-progress"]').should('be.visible');
      cy.get('[data-testid="rollback-status"]').should('contain', 'pending');

      // Wait for rollback completion
      cy.get('[data-testid="rollback-status"]').should('contain', 'completed', { timeout: 120000 });

      // Verify current deployment is now the previous one
      cy.get('[data-testid="current-deployment"]').should('contain', this.previousDeployment.commit_sha.substring(0, 7));

      // Check audit log
      cy.get('[data-testid="audit-logs"]').click();
      cy.get('[data-testid="audit-log-entry"]').first().should('contain', 'rollback.completed');
    });

    it('should prevent rollback to unhealthy deployment', function() {
      // Mark previous deployment as unhealthy
      cy.task('markDeploymentUnhealthy', this.previousDeployment.id);

      cy.get(`[data-testid="deployment-card-${this.currentDeployment.id}"]`).within(() => {
        cy.get('[data-testid="actions-menu"]').click();
      });

      cy.get('[data-testid="rollback-option"]').click();
      cy.get('[data-testid="rollback-dialog"]').should('be.visible');

      // Should show warning about unhealthy target
      cy.get('[data-testid="rollback-warning"]').should('contain', 'Target deployment is unhealthy');

      // Rollback button should require force option
      cy.get('button').contains('Confirm Rollback').should('be.disabled');
      cy.get('[data-testid="force-rollback"]').check();
      cy.get('button').contains('Force Rollback').should('be.enabled');
    });
  });

  describe('Environment Variable Management', () => {
    it('should update environment variables and trigger redeployment', () => {
      // Navigate to environment settings
      cy.get('[data-testid="environment-tab"]').click();
      cy.get('[data-testid="environment-staging"]').click();

      // View current variables
      cy.get('[data-testid="environment-variables"]').should('be.visible');

      // Add new variable
      cy.get('button').contains('Add Variable').click();
      cy.get('[data-testid="var-key-input"]').type('NEW_FEATURE_FLAG');
      cy.get('[data-testid="var-value-input"]').type('enabled');
      cy.get('[data-testid="var-description-input"]').type('E2E test feature flag');

      cy.get('button').contains('Save Variable').click();

      // Update existing variable
      cy.get('[data-testid="var-API_BASE_URL"] [data-testid="edit-button"]').click();
      cy.get('[data-testid="var-value-input"]').clear().type('https://new-api.candlefish.ai');
      cy.get('button').contains('Update').click();

      // Save all changes
      cy.get('button').contains('Deploy Changes').click();

      // Confirm deployment trigger
      cy.get('[data-testid="env-change-deployment-dialog"]').should('be.visible');
      cy.get('[data-testid="affected-services"]').should('contain', 'docs');
      cy.get('button').contains('Deploy').click();

      // Verify new deployment was created
      cy.get('[data-testid="deployment-success-toast"]').should('be.visible');
      cy.get('[data-testid="deployment-history"]').within(() => {
        cy.get('[data-testid^="deployment-card-"]').first().should('contain', 'Environment variable update');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should receive real-time deployment status updates', () => {
      // Start a deployment
      cy.get('button').contains('New Deployment').click();
      cy.get('[data-testid="site-selector"]').click();
      cy.get('[data-testid="site-option-docs"]').click();
      cy.get('[data-testid="environment-selector"]').click();
      cy.get('[data-testid="environment-option-staging"]').click();
      cy.get('[data-testid="branch-input"]').type('main');
      cy.get('button').contains('Deploy').click();

      // Verify WebSocket connection
      cy.get('[data-testid="websocket-status"]').should('contain', 'connected');

      // Monitor real-time status changes
      cy.get('[data-testid^="deployment-card-"]').first().within(() => {
        cy.get('[data-testid="status"]').should('contain', 'pending');

        // Status should change to building automatically
        cy.get('[data-testid="status"]').should('contain', 'building', { timeout: 30000 });

        // Progress bar should appear and update
        cy.get('[data-testid="deployment-progress"]').should('be.visible');
        cy.get('[data-testid="progress-percentage"]').should('not.contain', '0%');
      });

      // Check step updates
      cy.get('[data-testid^="deployment-card-"]').first().click();
      cy.get('[data-testid="step-build"]').should('have.attr', 'data-status', 'running');

      // Should automatically update when build completes
      cy.get('[data-testid="step-build"]').should('have.attr', 'data-status', 'success', { timeout: 60000 });
      cy.get('[data-testid="step-deploy"]').should('have.attr', 'data-status', 'running');
    });

    it('should show live deployment logs', () => {
      // Create deployment and navigate to logs
      cy.task('createDeployment', {
        site_name: 'api',
        environment: 'staging',
        branch: 'main'
      }).then((deployment: any) => {
        cy.visit(`/deployments/${deployment.id}/logs`);
      });

      // Check live log stream
      cy.get('[data-testid="live-logs"]').should('be.visible');
      cy.get('[data-testid="log-line"]').should('have.length.gt', 0);

      // Logs should update in real-time
      cy.get('[data-testid="log-line"]').should('have.length.gt', 10, { timeout: 30000 });

      // Check log filtering
      cy.get('[data-testid="log-level-filter"]').select('error');
      cy.get('[data-testid="log-line"][data-level="error"]').should('be.visible');
      cy.get('[data-testid="log-line"][data-level="info"]').should('not.exist');
    });
  });

  describe('Access Control', () => {
    it('should enforce deployment permissions', () => {
      // Logout and login as viewer
      cy.logout();
      cy.task('setupTestUser', {
        email: 'viewer@candlefish.ai',
        role: 'viewer',
        permissions: ['deployments:read']
      });
      cy.login('viewer@candlefish.ai', 'test-password');
      cy.visit('/deployment');

      // Should see dashboard but not create button
      cy.get('[data-testid="deployment-dashboard"]').should('be.visible');
      cy.get('button').contains('New Deployment').should('not.exist');

      // Should not see rollback options
      cy.get('[data-testid="deployment-history"] [data-testid^="deployment-card-"]').first().within(() => {
        cy.get('[data-testid="actions-menu"]').click();
      });
      cy.get('[data-testid="rollback-option"]').should('not.exist');
    });

    it('should require approval for production deployments', () => {
      // Login as developer (non-admin)
      cy.logout();
      cy.task('setupTestUser', {
        email: 'developer@candlefish.ai',
        role: 'developer',
        permissions: ['deployments:create', 'deployments:read']
      });
      cy.login('developer@candlefish.ai', 'test-password');
      cy.visit('/deployment');

      // Try to deploy to production
      cy.get('button').contains('New Deployment').click();
      cy.get('[data-testid="site-selector"]').click();
      cy.get('[data-testid="site-option-docs"]').click();
      cy.get('[data-testid="environment-selector"]').click();
      cy.get('[data-testid="environment-option-production"]').click();

      // Should show approval required notice
      cy.get('[data-testid="approval-required"]').should('be.visible');
      cy.get('button').contains('Request Approval').should('be.visible');
      cy.get('button').contains('Deploy').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Mock API failure
      cy.intercept('POST', '/api/deployments', { statusCode: 500, body: { error: 'Internal server error' } });

      cy.get('button').contains('New Deployment').click();
      cy.get('[data-testid="site-selector"]').click();
      cy.get('[data-testid="site-option-docs"]').click();
      cy.get('[data-testid="environment-selector"]').click();
      cy.get('[data-testid="environment-option-staging"]').click();
      cy.get('[data-testid="branch-input"]').type('main');

      cy.get('button').contains('Deploy').click();

      // Should show error message
      cy.get('[data-testid="error-toast"]').should('contain', 'Failed to create deployment');
      cy.get('[data-testid="deployment-form"]').should('be.visible'); // Form should remain open
    });

    it('should handle WebSocket disconnection', () => {
      // Simulate WebSocket disconnection
      cy.window().then((win) => {
        win.postMessage({ type: 'WEBSOCKET_DISCONNECT' }, '*');
      });

      cy.get('[data-testid="websocket-status"]').should('contain', 'disconnected');
      cy.get('[data-testid="reconnect-banner"]').should('be.visible');

      // Should attempt reconnection
      cy.get('[data-testid="websocket-status"]').should('contain', 'connecting', { timeout: 5000 });
      cy.get('[data-testid="websocket-status"]').should('contain', 'connected', { timeout: 10000 });
    });
  });
});
