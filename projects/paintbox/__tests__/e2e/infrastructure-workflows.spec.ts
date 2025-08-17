/**
 * Infrastructure Management E2E Test Suite
 * End-to-end tests for complete infrastructure management workflows
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { InfrastructureE2EHelpers } from '../helpers/infrastructureE2EHelpers';
import { testDataFactory } from '../factories/e2eDataFactory';

// Test configuration
test.describe.configure({ mode: 'parallel' });

let helpers: InfrastructureE2EHelpers;

test.beforeEach(async ({ page, context }) => {
  helpers = new InfrastructureE2EHelpers(page, context);
  await helpers.setupTestEnvironment();
  await helpers.authenticateUser();
});

test.afterEach(async ({ page }) => {
  await helpers.cleanupTestData();
  await page.close();
});

test.describe('Infrastructure Health Monitoring', () => {
  test('should display system health overview', async ({ page }) => {
    // Navigate to infrastructure dashboard
    await page.goto('/infrastructure');

    // Wait for health data to load
    await page.waitForSelector('[data-testid="health-dashboard"]');

    // Verify health status is displayed
    await expect(page.locator('[data-testid="health-status-indicator"]')).toBeVisible();
    await expect(page.locator('text=System Health Overview')).toBeVisible();

    // Verify service status cards are present
    await expect(page.locator('[data-testid="service-database"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-redis"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-temporal"]')).toBeVisible();

    // Check response time metrics
    const databaseCard = page.locator('[data-testid="service-database"]');
    await expect(databaseCard.locator('text=/\\d+ms/')).toBeVisible();
  });

  test('should handle real-time health updates', async ({ page }) => {
    await page.goto('/infrastructure');

    // Wait for WebSocket connection
    await page.waitForSelector('[data-testid="websocket-status"]');
    await expect(page.locator('text=Connected')).toBeVisible();

    // Trigger health check
    await page.click('[data-testid="refresh-button"]');

    // Verify loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Wait for updated data
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();

    // Verify timestamp was updated
    const lastUpdate = await page.locator('[data-testid="last-update"]').textContent();
    expect(lastUpdate).toContain('seconds ago');
  });

  test('should filter services by status', async ({ page }) => {
    await page.goto('/infrastructure');

    // Apply status filter
    await page.selectOption('[data-testid="status-filter"]', 'healthy');

    // Verify only healthy services are shown
    const serviceCards = page.locator('[data-testid^="service-"]');
    const count = await serviceCards.count();

    for (let i = 0; i < count; i++) {
      const card = serviceCards.nth(i);
      await expect(card.locator('text=Healthy')).toBeVisible();
    }
  });

  test('should display service details modal', async ({ page }) => {
    await page.goto('/infrastructure');

    // Click on a service card to expand details
    await page.click('[data-testid="service-database"] [data-testid="expand-details"]');

    // Verify modal opens
    await expect(page.locator('[data-testid="service-details-modal"]')).toBeVisible();
    await expect(page.locator('text=Database Connection Details')).toBeVisible();

    // Verify detailed metrics are shown
    await expect(page.locator('text=Connection Pool')).toBeVisible();
    await expect(page.locator('text=Query Performance')).toBeVisible();

    // Close modal
    await page.click('[data-testid="close-modal"]');
    await expect(page.locator('[data-testid="service-details-modal"]')).not.toBeVisible();
  });

  test('should toggle auto-refresh functionality', async ({ page }) => {
    await page.goto('/infrastructure');

    // Toggle auto-refresh off
    await page.click('[data-testid="auto-refresh-toggle"]');

    // Verify toggle state
    const toggle = page.locator('[data-testid="auto-refresh-toggle"]');
    await expect(toggle).not.toBeChecked();

    // Change refresh interval
    await page.selectOption('[data-testid="refresh-interval-select"]', '60000');

    // Toggle auto-refresh back on
    await page.click('[data-testid="auto-refresh-toggle"]');
    await expect(toggle).toBeChecked();
  });
});

test.describe('Temporal Workflow Management', () => {
  test('should display active workflows', async ({ page }) => {
    await page.goto('/infrastructure/workflows');

    // Wait for workflow data to load
    await page.waitForSelector('[data-testid="workflow-list"]');

    // Verify workflow manager is displayed
    await expect(page.locator('text=Temporal Workflow Manager')).toBeVisible();

    // Check for workflow cards
    const workflowCards = page.locator('[data-testid^="workflow-"]');
    const count = await workflowCards.count();

    if (count > 0) {
      // Verify first workflow displays required information
      const firstWorkflow = workflowCards.first();
      await expect(firstWorkflow.locator('[data-testid="workflow-status-badge"]')).toBeVisible();
      await expect(firstWorkflow.locator('text=/Started.*ago/')).toBeVisible();
      await expect(firstWorkflow.locator('text=/Progress: \\d+%/')).toBeVisible();
    }
  });

  test('should start a new workflow', async ({ page }) => {
    await page.goto('/infrastructure/workflows');

    // Click start workflow button
    await page.click('[data-testid="start-workflow-button"]');

    // Verify modal opens
    await expect(page.locator('[data-testid="start-workflow-modal"]')).toBeVisible();

    // Fill workflow configuration
    await page.selectOption('[data-testid="workflow-type-select"]', 'agent-workflow');
    await page.fill('[data-testid="workflow-input"]', '{"prompt": "Test workflow execution"}');

    // Start the workflow
    await page.click('[data-testid="confirm-start-button"]');

    // Verify modal closes and new workflow appears
    await expect(page.locator('[data-testid="start-workflow-modal"]')).not.toBeVisible();
    await page.waitForSelector('[data-testid^="workflow-"]:has-text("Running")');
  });

  test('should cancel a running workflow', async ({ page }) => {
    await page.goto('/infrastructure/workflows');

    // Find a running workflow
    const runningWorkflow = page.locator('[data-testid^="workflow-"]:has-text("Running")').first();

    if (await runningWorkflow.isVisible()) {
      // Click cancel button
      await runningWorkflow.locator('[data-testid="cancel-workflow-button"]').click();

      // Confirm cancellation
      await expect(page.locator('[data-testid="confirm-cancel-dialog"]')).toBeVisible();
      await page.click('[data-testid="confirm-cancel-button"]');

      // Verify workflow is cancelled
      await expect(page.locator('[data-testid="confirm-cancel-dialog"]')).not.toBeVisible();
      await page.waitForTimeout(2000); // Wait for cancellation to process
    }
  });

  test('should view workflow execution details', async ({ page }) => {
    await page.goto('/infrastructure/workflows');

    // Click on workflow details
    const workflowCard = page.locator('[data-testid^="workflow-"]').first();
    await workflowCard.locator('[data-testid="view-details-button"]').click();

    // Verify details modal opens
    await expect(page.locator('[data-testid="workflow-details-modal"]')).toBeVisible();
    await expect(page.locator('text=Workflow Execution Details')).toBeVisible();

    // Verify tabs are present
    await expect(page.locator('[data-testid="execution-history-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-timeline-tab"]')).toBeVisible();

    // Click on activity timeline
    await page.click('[data-testid="activity-timeline-tab"]');
    await expect(page.locator('[data-testid="activity-timeline"]')).toBeVisible();
  });

  test('should filter workflows by status and search', async ({ page }) => {
    await page.goto('/infrastructure/workflows');

    // Apply status filter
    await page.selectOption('[data-testid="status-filter"]', 'completed');

    // Search for specific workflow
    await page.fill('[data-testid="workflow-search"]', 'agent');

    // Verify results are filtered
    const visibleWorkflows = page.locator('[data-testid^="workflow-"]:visible');
    const count = await visibleWorkflows.count();

    for (let i = 0; i < count; i++) {
      const workflow = visibleWorkflows.nth(i);
      await expect(workflow.locator('text=/agent/i')).toBeVisible();
    }
  });

  test('should display workflow metrics and analytics', async ({ page }) => {
    await page.goto('/infrastructure/workflows');

    // Navigate to metrics tab
    await page.click('[data-testid="metrics-tab"]');

    // Verify metrics are displayed
    await expect(page.locator('[data-testid="workflow-metrics"]')).toBeVisible();
    await expect(page.locator('text=/Total Executions: \\d+/')).toBeVisible();
    await expect(page.locator('text=/Success Rate: \\d+%/')).toBeVisible();
    await expect(page.locator('text=/Avg Duration: \\d+/')).toBeVisible();

    // Verify execution time chart
    await expect(page.locator('[data-testid="execution-time-chart"]')).toBeVisible();
  });
});

test.describe('Load Testing Console', () => {
  test('should display load testing scenarios', async ({ page }) => {
    await page.goto('/infrastructure/load-testing');

    // Wait for load testing console to load
    await page.waitForSelector('[data-testid="load-testing-console"]');

    // Verify console is displayed
    await expect(page.locator('text=Load Testing Console')).toBeVisible();

    // Check for scenario cards
    await expect(page.locator('[data-testid="test-scenarios"]')).toBeVisible();
  });

  test('should create and run a load test scenario', async ({ page }) => {
    await page.goto('/infrastructure/load-testing');

    // Create new scenario
    await page.click('[data-testid="create-scenario-button"]');

    // Fill scenario details
    await expect(page.locator('[data-testid="create-scenario-modal"]')).toBeVisible();
    await page.fill('[data-testid="scenario-name"]', 'API Load Test');
    await page.fill('[data-testid="target-url"]', 'https://api.example.com/health');
    await page.fill('[data-testid="virtual-users"]', '50');
    await page.fill('[data-testid="duration"]', '60');

    // Save scenario
    await page.click('[data-testid="save-scenario-button"]');
    await expect(page.locator('[data-testid="create-scenario-modal"]')).not.toBeVisible();

    // Run the scenario
    const newScenario = page.locator('[data-testid^="scenario-"]:has-text("API Load Test")');
    await newScenario.locator('[data-testid="run-scenario-button"]').click();

    // Verify test starts
    await expect(page.locator('text=Test Running')).toBeVisible();
    await expect(page.locator('[data-testid="real-time-metrics"]')).toBeVisible();
  });

  test('should monitor real-time load test metrics', async ({ page }) => {
    await page.goto('/infrastructure/load-testing');

    // Start a test (assuming one exists)
    const scenario = page.locator('[data-testid^="scenario-"]').first();
    if (await scenario.isVisible()) {
      await scenario.locator('[data-testid="run-scenario-button"]').click();

      // Monitor real-time metrics
      await expect(page.locator('[data-testid="real-time-metrics"]')).toBeVisible();
      await expect(page.locator('text=/RPS: \\d+/')).toBeVisible();
      await expect(page.locator('text=/Response Time: \\d+ms/')).toBeVisible();
      await expect(page.locator('text=/Error Rate: \\d+%/')).toBeVisible();

      // Verify charts are updating
      await expect(page.locator('[data-testid="metrics-chart"]')).toBeVisible();
    }
  });

  test('should stop a running load test', async ({ page }) => {
    await page.goto('/infrastructure/load-testing');

    // Find and stop running test
    const runningTest = page.locator('[data-testid="active-test"]:has-text("Running")');
    if (await runningTest.isVisible()) {
      await runningTest.locator('[data-testid="stop-test-button"]').click();

      // Confirm stop
      await expect(page.locator('[data-testid="confirm-stop-dialog"]')).toBeVisible();
      await page.click('[data-testid="confirm-stop-button"]');

      // Verify test stops
      await expect(page.locator('text=Test Stopped')).toBeVisible();
    }
  });
});

test.describe('Disaster Recovery Control Center', () => {
  test('should display backup status and metrics', async ({ page }) => {
    await page.goto('/infrastructure/disaster-recovery');

    // Wait for DR control center to load
    await page.waitForSelector('[data-testid="dr-control-center"]');

    // Verify DR center is displayed
    await expect(page.locator('text=Disaster Recovery Control Center')).toBeVisible();

    // Check backup status
    await expect(page.locator('[data-testid="backup-status"]')).toBeVisible();
    await expect(page.locator('text=/Last Backup:.*ago/')).toBeVisible();

    // Verify metrics
    await expect(page.locator('text=/RTO Target: \\d+m/')).toBeVisible();
    await expect(page.locator('text=/RPO Target: \\d+m/')).toBeVisible();
  });

  test('should trigger manual backup', async ({ page }) => {
    await page.goto('/infrastructure/disaster-recovery');

    // Trigger database backup
    await page.click('[data-testid="trigger-backup-button"]');

    // Select backup type
    await expect(page.locator('[data-testid="backup-type-modal"]')).toBeVisible();
    await page.click('[data-testid="backup-type-database"]');

    // Confirm backup
    await page.click('[data-testid="confirm-backup-button"]');

    // Verify backup starts
    await expect(page.locator('text=Backup Initiated')).toBeVisible();
    await expect(page.locator('[data-testid="backup-progress"]')).toBeVisible();
  });

  test('should display restore points and perform restore', async ({ page }) => {
    await page.goto('/infrastructure/disaster-recovery');

    // Navigate to restore points tab
    await page.click('[data-testid="restore-points-tab"]');

    // Verify restore points are listed
    await expect(page.locator('[data-testid="restore-points-list"]')).toBeVisible();

    // Select a restore point
    const restorePoint = page.locator('[data-testid^="restore-point-"]').first();
    if (await restorePoint.isVisible()) {
      await restorePoint.locator('[data-testid="restore-button"]').click();

      // Confirm restore action
      await expect(page.locator('[data-testid="confirm-restore-dialog"]')).toBeVisible();
      await page.fill('[data-testid="restore-confirmation"]', 'RESTORE');
      await page.click('[data-testid="confirm-restore-button"]');

      // Verify restore process starts
      await expect(page.locator('text=Restore Process Initiated')).toBeVisible();
    }
  });

  test('should run disaster recovery drill', async ({ page }) => {
    await page.goto('/infrastructure/disaster-recovery');

    // Navigate to drills tab
    await page.click('[data-testid="drills-tab"]');

    // Start new drill
    await page.click('[data-testid="start-drill-button"]');

    // Configure drill
    await expect(page.locator('[data-testid="drill-config-modal"]')).toBeVisible();
    await page.selectOption('[data-testid="drill-type"]', 'failover-test');
    await page.fill('[data-testid="drill-description"]', 'Monthly failover test');

    // Start drill
    await page.click('[data-testid="start-drill-confirm"]');

    // Monitor drill progress
    await expect(page.locator('text=Drill in Progress')).toBeVisible();
    await expect(page.locator('[data-testid="drill-steps"]')).toBeVisible();
  });
});

test.describe('Slack Integration Panel', () => {
  test('should display Slack workspace configuration', async ({ page }) => {
    await page.goto('/infrastructure/slack-integration');

    // Wait for Slack panel to load
    await page.waitForSelector('[data-testid="slack-integration-panel"]');

    // Verify panel is displayed
    await expect(page.locator('text=Slack Integration Panel')).toBeVisible();

    // Check workspace status
    await expect(page.locator('[data-testid="workspace-status"]')).toBeVisible();
  });

  test('should configure alert notifications', async ({ page }) => {
    await page.goto('/infrastructure/slack-integration');

    // Navigate to alerts configuration
    await page.click('[data-testid="alerts-config-tab"]');

    // Add new alert rule
    await page.click('[data-testid="add-alert-rule"]');

    // Configure alert
    await expect(page.locator('[data-testid="alert-rule-modal"]')).toBeVisible();
    await page.selectOption('[data-testid="alert-type"]', 'health-check-failure');
    await page.selectOption('[data-testid="slack-channel"]', '#alerts');
    await page.selectOption('[data-testid="alert-severity"]', 'critical');

    // Save alert rule
    await page.click('[data-testid="save-alert-rule"]');

    // Verify rule is added
    await expect(page.locator('text=Alert rule saved successfully')).toBeVisible();
  });

  test('should test Slack notification', async ({ page }) => {
    await page.goto('/infrastructure/slack-integration');

    // Send test notification
    await page.click('[data-testid="test-notification-button"]');

    // Configure test message
    await expect(page.locator('[data-testid="test-message-modal"]')).toBeVisible();
    await page.selectOption('[data-testid="test-channel"]', '#testing');
    await page.fill('[data-testid="test-message"]', 'Test notification from infrastructure dashboard');

    // Send test
    await page.click('[data-testid="send-test-button"]');

    // Verify success
    await expect(page.locator('text=Test notification sent successfully')).toBeVisible();
  });
});

test.describe('Cross-Component Integration', () => {
  test('should handle end-to-end infrastructure monitoring workflow', async ({ page }) => {
    // Start from health dashboard
    await page.goto('/infrastructure');

    // Verify healthy status
    await expect(page.locator('[data-testid="health-status-indicator"]')).toBeVisible();

    // Navigate to workflows from health dashboard
    await page.click('[data-testid="workflows-link"]');
    await expect(page.url()).toContain('/infrastructure/workflows');

    // Start a health check workflow
    await page.click('[data-testid="start-workflow-button"]');
    await page.selectOption('[data-testid="workflow-type-select"]', 'health-monitoring');
    await page.click('[data-testid="confirm-start-button"]');

    // Navigate to load testing
    await page.click('[data-testid="load-testing-link"]');
    await expect(page.url()).toContain('/infrastructure/load-testing');

    // Start performance test
    const scenario = page.locator('[data-testid^="scenario-"]').first();
    if (await scenario.isVisible()) {
      await scenario.locator('[data-testid="run-scenario-button"]').click();
      await expect(page.locator('[data-testid="real-time-metrics"]')).toBeVisible();
    }

    // Check disaster recovery status
    await page.click('[data-testid="dr-link"]');
    await expect(page.url()).toContain('/infrastructure/disaster-recovery');
    await expect(page.locator('[data-testid="backup-status"]')).toBeVisible();
  });

  test('should synchronize real-time updates across components', async ({ page, context }) => {
    // Open multiple tabs
    const page1 = page;
    const page2 = await context.newPage();

    // Navigate both pages to different infrastructure sections
    await page1.goto('/infrastructure');
    await page2.goto('/infrastructure/workflows');

    // Wait for WebSocket connections
    await page1.waitForSelector('[data-testid="websocket-status"]:has-text("Connected")');
    await page2.waitForSelector('[data-testid="websocket-status"]:has-text("Connected")');

    // Trigger action in one tab
    await page1.click('[data-testid="refresh-button"]');

    // Verify updates appear in both tabs
    await expect(page1.locator('[data-testid="last-update"]')).toContainText('seconds ago');

    // Close second page
    await page2.close();
  });

  test('should handle error states gracefully across components', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/health', route => route.abort());

    await page.goto('/infrastructure');

    // Verify error state is displayed
    await expect(page.locator('text=Error loading health data')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Remove network block and retry
    await page.unroute('**/api/health');
    await page.click('[data-testid="retry-button"]');

    // Verify recovery
    await expect(page.locator('[data-testid="health-status-indicator"]')).toBeVisible();
  });
});

test.describe('Accessibility and Performance', () => {
  test('should be accessible via keyboard navigation', async ({ page }) => {
    await page.goto('/infrastructure');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Verify focus management
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBeTruthy();
  });

  test('should meet performance benchmarks', async ({ page }) => {
    // Navigate to infrastructure dashboard
    const startTime = Date.now();
    await page.goto('/infrastructure');

    // Wait for critical content to load
    await page.waitForSelector('[data-testid="health-dashboard"]');
    const loadTime = Date.now() - startTime;

    // Verify load time is reasonable (under 3 seconds)
    expect(loadTime).toBeLessThan(3000);

    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });

    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/infrastructure');

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();

    // Navigate to workflows via mobile menu
    await page.click('[data-testid="mobile-nav-workflows"]');
    await expect(page.url()).toContain('/infrastructure/workflows');
  });
});
