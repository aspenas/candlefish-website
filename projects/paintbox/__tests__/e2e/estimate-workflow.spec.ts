/**
 * @file End-to-End Estimate Workflow Tests
 * @description Complete workflow tests using Playwright
 */

import { test, expect, type Page } from '@playwright/test';
import { createCompleteEstimate, createSalesforceDataSet } from '../factories';

test.describe('Complete Estimate Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Set up authentication (if required)
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@paintbox.com');
    await page.fill('[data-testid="password"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should complete full estimate workflow from start to finish', async () => {
    // Start new estimate
    await page.click('[data-testid="new-estimate-button"]');
    await expect(page).toHaveURL('/estimate/new');

    // Step 1: Client Information
    await page.fill('[data-testid="client-name"]', 'John Smith');
    await page.fill('[data-testid="client-email"]', 'john.smith@example.com');
    await page.fill('[data-testid="client-phone"]', '555-123-4567');
    await page.fill('[data-testid="address-street"]', '123 Main Street');
    await page.fill('[data-testid="address-city"]', 'Anytown');
    await page.selectOption('[data-testid="address-state"]', 'CA');
    await page.fill('[data-testid="address-zip"]', '90210');

    // Select project type
    await page.click('[data-testid="project-type-interior"]');

    await page.click('[data-testid="next-button"]');
    await expect(page).toHaveURL(/\/estimate\/new\/exterior/);

    // Step 2: Exterior Measurements (skip for interior-only)
    await page.click('[data-testid="skip-exterior"]');
    await expect(page).toHaveURL(/\/estimate\/new\/interior/);

    // Step 3: Interior Measurements
    await page.click('[data-testid="add-room-button"]');

    // Room 1: Living Room
    await page.fill('[data-testid="room-name"]', 'Living Room');
    await page.fill('[data-testid="room-length"]', '15');
    await page.fill('[data-testid="room-width"]', '12');
    await page.fill('[data-testid="room-height"]', '9');
    await page.fill('[data-testid="room-doors"]', '2');
    await page.fill('[data-testid="room-windows"]', '3');
    await page.selectOption('[data-testid="paint-type"]', 'eggshell');
    await page.selectOption('[data-testid="prep-level"]', 'standard');
    await page.click('[data-testid="save-room"]');

    // Add another room
    await page.click('[data-testid="add-room-button"]');

    // Room 2: Kitchen
    await page.fill('[data-testid="room-name"]', 'Kitchen');
    await page.fill('[data-testid="room-length"]', '12');
    await page.fill('[data-testid="room-width"]', '10');
    await page.fill('[data-testid="room-height"]', '9');
    await page.fill('[data-testid="room-doors"]', '1');
    await page.fill('[data-testid="room-windows"]', '2');
    await page.selectOption('[data-testid="paint-type"]', 'semi-gloss');
    await page.selectOption('[data-testid="prep-level"]', 'minimal');
    await page.click('[data-testid="save-room"]');

    await page.click('[data-testid="next-button"]');
    await expect(page).toHaveURL(/\/estimate\/new\/review/);

    // Step 4: Review and Calculations
    // Verify room calculations are displayed
    await expect(page.locator('[data-testid="living-room-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="kitchen-area"]')).toBeVisible();

    // Check pricing tiers are calculated
    await expect(page.locator('[data-testid="good-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="better-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="best-price"]')).toBeVisible();

    // Verify total calculations
    const totalArea = await page.locator('[data-testid="total-area"]').textContent();
    expect(totalArea).toMatch(/\d+\s*sq ft/);

    const paintGallons = await page.locator('[data-testid="paint-gallons"]').textContent();
    expect(paintGallons).toMatch(/\d+\.?\d*\s*gallons/);

    const laborHours = await page.locator('[data-testid="labor-hours"]').textContent();
    expect(laborHours).toMatch(/\d+\.?\d*\s*hours/);

    // Select pricing tier
    await page.click('[data-testid="select-better-tier"]');

    await page.click('[data-testid="finalize-estimate"]');
    await expect(page).toHaveURL(/\/estimate\/success/);

    // Step 5: Success Page
    await expect(page.locator('[data-testid="estimate-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-pdf"]')).toBeVisible();
  });

  test('should handle exterior-only estimate workflow', async () => {
    await page.click('[data-testid="new-estimate-button"]');

    // Client info (abbreviated)
    await page.fill('[data-testid="client-name"]', 'Jane Doe');
    await page.fill('[data-testid="client-email"]', 'jane.doe@example.com');
    await page.fill('[data-testid="client-phone"]', '555-987-6543');
    await page.click('[data-testid="project-type-exterior"]');
    await page.click('[data-testid="next-button"]');

    // Exterior measurements
    await page.fill('[data-testid="siding-area"]', '1500');
    await page.selectOption('[data-testid="siding-type"]', 'vinyl');
    await page.selectOption('[data-testid="siding-condition"]', 'good');

    await page.fill('[data-testid="trim-linear-feet"]', '200');
    await page.selectOption('[data-testid="trim-condition"]', 'fair');

    await page.check('[data-testid="pressure-washing"]');
    await page.check('[data-testid="primer-needed"]');

    await page.click('[data-testid="next-button"]');

    // Skip interior
    await page.click('[data-testid="skip-interior"]');

    // Review exterior calculations
    await expect(page.locator('[data-testid="siding-calculations"]')).toBeVisible();
    await expect(page.locator('[data-testid="trim-calculations"]')).toBeVisible();
    await expect(page.locator('[data-testid="pressure-wash-cost"]')).toBeVisible();

    await page.click('[data-testid="select-good-tier"]');
    await page.click('[data-testid="finalize-estimate"]');

    await expect(page).toHaveURL(/\/estimate\/success/);
  });

  test('should integrate with Salesforce during estimate creation', async () => {
    // Mock Salesforce integration
    await page.route('**/api/v1/salesforce/**', async route => {
      const salesforceData = createSalesforceDataSet();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: salesforceData,
        }),
      });
    });

    await page.click('[data-testid="new-estimate-button"]');

    // Enable Salesforce sync
    await page.check('[data-testid="sync-salesforce"]');

    // Search for existing customer
    await page.fill('[data-testid="customer-search"]', 'John Smith');
    await page.click('[data-testid="search-button"]');

    // Select from search results
    await page.click('[data-testid="customer-result-0"]');

    // Verify customer data is populated
    await expect(page.locator('[data-testid="client-name"]')).toHaveValue('John Smith');
    await expect(page.locator('[data-testid="client-email"]')).toHaveValue(/john.*@.*\.com/);

    // Continue with estimate...
    await page.click('[data-testid="project-type-both"]');
    await page.click('[data-testid="next-button"]');

    // Complete estimate workflow...
    // (abbreviated for brevity)

    // At the end, verify Salesforce sync
    await page.locator('[data-testid="finalize-estimate"]').click();
    await expect(page.locator('[data-testid="salesforce-sync-success"]')).toBeVisible();
  });

  test('should work offline and sync when back online', async () => {
    // Start estimate online
    await page.click('[data-testid="new-estimate-button"]');

    // Fill in basic info
    await page.fill('[data-testid="client-name"]', 'Offline Customer');
    await page.fill('[data-testid="client-email"]', 'offline@example.com');

    // Go offline
    await page.context().setOffline(true);

    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

    // Continue working offline
    await page.click('[data-testid="project-type-interior"]');
    await page.click('[data-testid="next-button"]');

    // Add room offline
    await page.click('[data-testid="add-room-button"]');
    await page.fill('[data-testid="room-name"]', 'Offline Room');
    await page.fill('[data-testid="room-length"]', '10');
    await page.fill('[data-testid="room-width"]', '10');
    await page.fill('[data-testid="room-height"]', '9');
    await page.click('[data-testid="save-room"]');

    // Calculations should still work offline
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="next-button"]');
    await expect(page.locator('[data-testid="total-area"]')).toBeVisible();

    // Save estimate offline
    await page.click('[data-testid="save-draft"]');
    await expect(page.locator('[data-testid="saved-offline"]')).toBeVisible();

    // Go back online
    await page.context().setOffline(false);

    // Should sync automatically
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
  });

  test('should handle real-time collaboration', async () => {
    // Start estimate
    await page.click('[data-testid="new-estimate-button"]');
    await page.fill('[data-testid="client-name"]', 'Collaboration Test');

    // Mock WebSocket connection for real-time updates
    await page.evaluate(() => {
      // Simulate another user joining
      window.dispatchEvent(new CustomEvent('collaborator-joined', {
        detail: { user: 'Jane Smith', avatar: '/avatars/jane.jpg' }
      }));
    });

    // Should show collaborator indicator
    await expect(page.locator('[data-testid="collaborator-jane"]')).toBeVisible();

    // Simulate remote changes
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('remote-change', {
        detail: {
          field: 'client-phone',
          value: '555-COLLAB',
          user: 'Jane Smith'
        }
      }));
    });

    // Should show the change and attribution
    await expect(page.locator('[data-testid="client-phone"]')).toHaveValue('555-COLLAB');
    await expect(page.locator('[data-testid="change-attribution"]')).toContainText('Jane Smith');
  });

  test('should generate and download PDF estimate', async () => {
    // Complete a full estimate first
    await page.click('[data-testid="new-estimate-button"]');

    // Quick estimate setup
    await page.fill('[data-testid="client-name"]', 'PDF Test Customer');
    await page.fill('[data-testid="client-email"]', 'pdf@example.com');
    await page.click('[data-testid="project-type-interior"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="skip-exterior"]');

    // Add quick room
    await page.click('[data-testid="add-room-button"]');
    await page.fill('[data-testid="room-name"]', 'Test Room');
    await page.fill('[data-testid="room-length"]', '12');
    await page.fill('[data-testid="room-width"]', '12');
    await page.fill('[data-testid="room-height"]', '9');
    await page.click('[data-testid="save-room"]');

    await page.click('[data-testid="next-button"]');

    // Generate PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-pdf"]');
    const download = await downloadPromise;

    // Verify PDF download
    expect(download.suggestedFilename()).toMatch(/estimate.*\.pdf$/);

    // Verify PDF content (basic check)
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('should handle form validation and error states', async () => {
    await page.click('[data-testid="new-estimate-button"]');

    // Try to proceed without required fields
    await page.click('[data-testid="next-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="client-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="client-email-error"]')).toBeVisible();

    // Invalid email format
    await page.fill('[data-testid="client-name"]', 'Test User');
    await page.fill('[data-testid="client-email"]', 'invalid-email');
    await page.click('[data-testid="next-button"]');

    await expect(page.locator('[data-testid="email-format-error"]')).toBeVisible();

    // Fix validation issues
    await page.fill('[data-testid="client-email"]', 'valid@example.com');
    await page.click('[data-testid="project-type-interior"]');
    await page.click('[data-testid="next-button"]');

    // Should proceed successfully
    await expect(page).toHaveURL(/\/exterior/);
  });

  test('should handle network errors gracefully', async () => {
    // Mock network failures
    await page.route('**/api/**', route => route.abort());

    await page.click('[data-testid="new-estimate-button"]');
    await page.fill('[data-testid="client-name"]', 'Network Test');
    await page.fill('[data-testid="client-email"]', 'network@example.com');

    // Should show network error
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();

    // Should offer retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Should work offline
    await expect(page.locator('[data-testid="work-offline-button"]')).toBeVisible();
    await page.click('[data-testid="work-offline-button"]');

    // Should continue in offline mode
    await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible();
  });

  test('should provide accessibility for keyboard navigation', async () => {
    await page.click('[data-testid="new-estimate-button"]');

    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="client-name"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="client-email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="client-phone"]')).toBeFocused();

    // Test keyboard shortcuts
    await page.keyboard.press('Alt+n'); // Next button shortcut

    // Should handle ARIA labels and screen reader compatibility
    const nameField = page.locator('[data-testid="client-name"]');
    await expect(nameField).toHaveAttribute('aria-label', /client name/i);
  });

  test('should handle large estimates with many rooms', async () => {
    await page.click('[data-testid="new-estimate-button"]');

    // Basic client info
    await page.fill('[data-testid="client-name"]', 'Large Project Customer');
    await page.fill('[data-testid="client-email"]', 'large@example.com');
    await page.click('[data-testid="project-type-interior"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="skip-exterior"]');

    // Add many rooms
    const roomCount = 10;
    for (let i = 1; i <= roomCount; i++) {
      await page.click('[data-testid="add-room-button"]');
      await page.fill('[data-testid="room-name"]', `Room ${i}`);
      await page.fill('[data-testid="room-length"]', '10');
      await page.fill('[data-testid="room-width"]', '10');
      await page.fill('[data-testid="room-height"]', '9');
      await page.click('[data-testid="save-room"]');
    }

    // Should handle large calculations efficiently
    const startTime = Date.now();
    await page.click('[data-testid="next-button"]');

    // Wait for calculations to complete
    await expect(page.locator('[data-testid="total-area"]')).toBeVisible({ timeout: 30000 });

    const calculationTime = Date.now() - startTime;
    expect(calculationTime).toBeLessThan(10000); // Under 10 seconds

    // Verify all rooms are included
    await expect(page.locator('[data-testid="room-count"]')).toContainText(`${roomCount}`);
  });
});
