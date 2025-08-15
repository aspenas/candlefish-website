import { test, expect, Page, Browser } from '@playwright/test';
import { EstimateWorkflowPage } from './page-objects/EstimateWorkflowPage';
import { CameraMobilePage } from './page-objects/CameraMobilePage';
import { ManagerDashboardPage } from './page-objects/ManagerDashboardPage';

test.describe('Complete Estimate Workflow', () => {
  let estimateWorkflow: EstimateWorkflowPage;
  let cameraMobile: CameraMobilePage;
  let managerDashboard: ManagerDashboardPage;

  test.beforeEach(async ({ page, browserName, isMobile }) => {
    estimateWorkflow = new EstimateWorkflowPage(page);
    cameraMobile = new CameraMobilePage(page);
    managerDashboard = new ManagerDashboardPage(page);
    
    await page.goto('/');
  });

  test.describe('Desktop Web Workflow', () => {
    test('should complete full estimate creation workflow', async ({ page }) => {
      // Step 1: Create new estimate
      await estimateWorkflow.startNewEstimate();
      
      // Step 2: Add customer information
      await estimateWorkflow.addCustomerInfo({
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
        },
      });

      // Step 3: Add project details
      await estimateWorkflow.addProjectDetails({
        name: 'Kitchen and Living Room Paint',
        propertyType: 'RESIDENTIAL',
        description: 'Interior painting project with premium finishes',
      });

      // Step 4: Add measurements for multiple rooms
      const kitchenMeasurements = {
        roomName: 'Kitchen',
        walls: [
          { length: 12, height: 9 },
          { length: 10, height: 9 },
          { length: 12, height: 9 },
          { length: 10, height: 9 },
        ],
        doors: 2,
        windows: 3,
      };

      const livingRoomMeasurements = {
        roomName: 'Living Room',
        walls: [
          { length: 16, height: 10 },
          { length: 14, height: 10 },
          { length: 16, height: 10 },
          { length: 14, height: 10 },
        ],
        doors: 2,
        windows: 4,
      };

      await estimateWorkflow.addRoomMeasurements(kitchenMeasurements);
      await estimateWorkflow.addRoomMeasurements(livingRoomMeasurements);

      // Step 5: Review calculated pricing
      const pricingBreakdown = await estimateWorkflow.getPricingBreakdown();
      
      expect(pricingBreakdown.goodPrice).toBeGreaterThan(0);
      expect(pricingBreakdown.betterPrice).toBeGreaterThan(pricingBreakdown.goodPrice);
      expect(pricingBreakdown.bestPrice).toBeGreaterThan(pricingBreakdown.betterPrice);
      
      // Step 6: Select Better tier
      await estimateWorkflow.selectPricingTier('BETTER');

      // Step 7: Add estimate notes
      await estimateWorkflow.addNotes('Customer prefers premium paint. Walls need minor prep work.');

      // Step 8: Review estimate
      const estimateDetails = await estimateWorkflow.reviewEstimate();
      
      expect(estimateDetails.customer.name).toBe('John Smith');
      expect(estimateDetails.totalSquareFootage).toBeGreaterThan(800); // Kitchen + Living room
      expect(estimateDetails.selectedTier).toBe('BETTER');

      // Step 9: Save estimate
      const estimateId = await estimateWorkflow.saveEstimate();
      
      expect(estimateId).toBeTruthy();

      // Step 10: Verify estimate appears in dashboard
      await page.goto('/dashboard');
      await expect(page.locator(`[data-testid="estimate-${estimateId}"]`)).toBeVisible();
    });

    test('should handle estimate editing and updates', async ({ page }) => {
      // Create initial estimate
      const estimateId = await estimateWorkflow.createBasicEstimate({
        customerName: 'Jane Doe',
        projectName: 'Bathroom Renovation',
        roomMeasurements: {
          bathroom: { totalArea: 85 },
        },
      });

      // Navigate to edit estimate
      await page.goto(`/estimate/${estimateId}/edit`);

      // Update customer information
      await estimateWorkflow.updateCustomerInfo({
        phone: '(555) 987-6543',
        email: 'jane.doe.updated@example.com',
      });

      // Add additional room
      await estimateWorkflow.addRoomMeasurements({
        roomName: 'Hallway',
        walls: [
          { length: 8, height: 8 },
          { length: 3, height: 8 },
        ],
      });

      // Change pricing tier
      await estimateWorkflow.selectPricingTier('BEST');

      // Save changes
      await estimateWorkflow.saveChanges();

      // Verify updates
      const updatedEstimate = await estimateWorkflow.getEstimateDetails();
      expect(updatedEstimate.customer.phone).toBe('(555) 987-6543');
      expect(updatedEstimate.selectedTier).toBe('BEST');
      expect(updatedEstimate.rooms).toHaveProperty('hallway');
    });

    test('should generate and download PDF estimate', async ({ page }) => {
      const estimateId = await estimateWorkflow.createBasicEstimate({
        customerName: 'Bob Johnson',
        projectName: 'Office Painting',
      });

      await page.goto(`/estimate/${estimateId}`);

      // Generate PDF
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="generate-pdf-button"]'),
      ]);

      // Verify PDF download
      expect(download.suggestedFilename()).toMatch(/estimate.*\.pdf/i);

      // Check PDF was generated successfully
      const pdfPath = await download.path();
      expect(pdfPath).toBeTruthy();
    });
  });

  test.describe('Mobile App Integration', () => {
    test('should sync measurements between mobile and web', async ({ page, context }) => {
      // Create estimate on web
      const estimateId = await estimateWorkflow.createBasicEstimate({
        customerName: 'Mobile Test Customer',
        projectName: 'Cross-Platform Test',
      });

      // Simulate mobile measurements being added
      await cameraMobile.connectToEstimate(estimateId);
      
      await cameraMobile.addRoomMeasurements('kitchen', {
        totalArea: 200,
        walls: [
          { length: 12, height: 9, area: 108 },
          { length: 10, height: 9, area: 90 },
        ],
      });

      // Add photos with WW tags
      await cameraMobile.takePhoto({
        roomId: 'kitchen',
        wwTag: 'WW15-001',
        location: { latitude: 40.7128, longitude: -74.0060 },
      });

      await cameraMobile.takePhoto({
        roomId: 'kitchen',
        wwTag: 'WW15-002',
        location: { latitude: 40.7128, longitude: -74.0060 },
      });

      // Switch back to web and verify sync
      await page.goto(`/estimate/${estimateId}`);
      await page.waitForLoadState('networkidle');

      // Check measurements synced
      const measurements = await estimateWorkflow.getRoomMeasurements('kitchen');
      expect(measurements.totalArea).toBe(200);

      // Check photos appear in gallery
      await page.click('[data-testid="photo-gallery-button"]');
      await expect(page.locator('[data-testid="photo-WW15-001"]')).toBeVisible();
      await expect(page.locator('[data-testid="photo-WW15-002"]')).toBeVisible();
    });

    test('should handle offline-to-online sync', async ({ page }) => {
      const estimateId = await estimateWorkflow.createBasicEstimate({
        customerName: 'Offline Test Customer',
        projectName: 'Offline Sync Test',
      });

      // Simulate mobile going offline and making changes
      await cameraMobile.simulateOfflineMode();
      
      await cameraMobile.connectToEstimate(estimateId);
      
      // Add measurements while offline
      await cameraMobile.addRoomMeasurements('bedroom', {
        totalArea: 150,
        walls: [{ length: 12, height: 8, area: 96 }],
      });

      // Take photos while offline
      for (let i = 1; i <= 3; i++) {
        await cameraMobile.takePhoto({
          roomId: 'bedroom',
          wwTag: `WW15-00${i}`,
          offline: true,
        });
      }

      // Simulate coming back online
      await cameraMobile.simulateOnlineMode();
      
      // Trigger sync
      await cameraMobile.syncOfflineData();

      // Verify sync on web
      await page.goto(`/estimate/${estimateId}`);
      await page.waitForSelector('[data-testid="sync-complete-indicator"]');

      // Check offline measurements synced
      const bedroomMeasurements = await estimateWorkflow.getRoomMeasurements('bedroom');
      expect(bedroomMeasurements.totalArea).toBe(150);

      // Check offline photos synced
      await page.click('[data-testid="photo-gallery-button"]');
      for (let i = 1; i <= 3; i++) {
        await expect(page.locator(`[data-testid="photo-WW15-00${i}"]`)).toBeVisible();
      }
    });
  });

  test.describe('Manager Approval Workflow', () => {
    test('should complete manager approval process', async ({ page, context }) => {
      // Create estimate as estimator
      const estimateId = await estimateWorkflow.createCompleteEstimate({
        customerName: 'Manager Approval Test',
        projectName: 'High-Value Project',
        selectedTier: 'BEST',
        totalAmount: 5500.00, // Above approval threshold
      });

      // Submit for manager approval
      await page.goto(`/estimate/${estimateId}`);
      await page.click('[data-testid="submit-for-approval-button"]');

      await page.fill('[data-testid="approval-reason"]', 'Large project requires manager approval');
      await page.click('[data-testid="submit-approval-request"]');

      // Verify approval request submitted
      await expect(page.locator('[data-testid="approval-pending-indicator"]')).toBeVisible();

      // Switch to manager account
      await page.context().addCookies([
        {
          name: 'auth_role',
          value: 'manager',
          url: 'http://localhost:3000',
        },
      ]);

      // Navigate to manager dashboard
      await managerDashboard.navigateToApprovals();

      // Find pending approval
      await expect(page.locator(`[data-testid="approval-request-${estimateId}"]`)).toBeVisible();

      // Review estimate details
      await page.click(`[data-testid="review-approval-${estimateId}"]`);

      const approvalDetails = await managerDashboard.getApprovalDetails();
      expect(approvalDetails.estimateId).toBe(estimateId);
      expect(approvalDetails.totalAmount).toBe(5500.00);
      expect(approvalDetails.selectedTier).toBe('BEST');

      // Approve with minor adjustments
      await managerDashboard.approveWithChanges({
        approved: true,
        comments: 'Approved with pricing adjustment recommendation',
        suggestedChanges: [
          { field: 'selectedTier', value: 'BETTER' },
        ],
      });

      // Verify approval status updated
      await expect(page.locator('[data-testid="approval-completed-indicator"]')).toBeVisible();

      // Switch back to estimator view
      await page.context().addCookies([
        {
          name: 'auth_role',
          value: 'estimator',
          url: 'http://localhost:3000',
        },
      ]);

      // Check notification received
      await page.goto(`/estimate/${estimateId}`);
      await expect(page.locator('[data-testid="approval-notification"]')).toBeVisible();

      // Verify suggested changes are highlighted
      await expect(page.locator('[data-testid="suggested-tier-change"]')).toBeVisible();
    });

    test('should handle approval rejection with required changes', async ({ page }) => {
      const estimateId = await estimateWorkflow.createCompleteEstimate({
        customerName: 'Rejection Test Customer',
        projectName: 'Needs Revision Project',
        selectedTier: 'BEST',
        totalAmount: 4500.00,
      });

      // Submit for approval
      await estimateWorkflow.submitForApproval(estimateId, 'Ready for manager review');

      // Manager rejects with changes
      await managerDashboard.login('manager');
      await managerDashboard.rejectWithChanges(estimateId, {
        reason: 'Pricing seems high for scope of work',
        requiredChanges: [
          { field: 'selectedTier', currentValue: 'BEST', requiredValue: 'BETTER' },
          { field: 'laborHours', currentValue: 32, requiredValue: 28 },
        ],
        dueDate: '2025-01-20',
      });

      // Estimator receives rejection
      await estimateWorkflow.login('estimator');
      await page.goto(`/estimate/${estimateId}`);

      // Check rejection notification
      await expect(page.locator('[data-testid="approval-rejected-notification"]')).toBeVisible();

      // Make required changes
      await estimateWorkflow.selectPricingTier('BETTER');
      await estimateWorkflow.updateLaborHours(28);

      // Resubmit for approval
      await estimateWorkflow.resubmitForApproval(estimateId);

      // Manager approves revised estimate
      await managerDashboard.login('manager');
      await managerDashboard.approveEstimate(estimateId, 'Changes implemented correctly');

      // Verify final approval
      await estimateWorkflow.login('estimator');
      await page.goto(`/estimate/${estimateId}`);
      await expect(page.locator('[data-testid="estimate-approved-indicator"]')).toBeVisible();
    });
  });

  test.describe('Real-time Collaboration', () => {
    test('should show live updates between multiple users', async ({ page, context }) => {
      const estimateId = await estimateWorkflow.createBasicEstimate({
        customerName: 'Collaboration Test',
        projectName: 'Multi-User Project',
      });

      // Open second browser tab for second user
      const secondPage = await context.newPage();
      const secondEstimateWorkflow = new EstimateWorkflowPage(secondPage);

      // Both users navigate to same estimate
      await page.goto(`/estimate/${estimateId}/edit`);
      await secondPage.goto(`/estimate/${estimateId}/edit`);

      // Wait for collaboration connection
      await page.waitForSelector('[data-testid="collaboration-connected"]');
      await secondPage.waitForSelector('[data-testid="collaboration-connected"]');

      // User 1 adds measurement
      await estimateWorkflow.addRoomMeasurements({
        roomName: 'Office',
        walls: [{ length: 12, height: 9 }],
      });

      // User 2 should see the update in real-time
      await expect(secondPage.locator('[data-testid="room-office"]')).toBeVisible({
        timeout: 5000,
      });

      // User 2 changes pricing tier
      await secondEstimateWorkflow.selectPricingTier('BEST');

      // User 1 should see pricing update
      await expect(page.locator('[data-testid="pricing-tier-BEST-selected"]')).toBeVisible({
        timeout: 5000,
      });

      // Show user cursors
      await page.mouse.move(200, 300);
      
      // Second user should see cursor indicator
      await expect(secondPage.locator('[data-testid="user-cursor-user1"]')).toBeVisible({
        timeout: 3000,
      });
    });

    test('should handle collaborative editing conflicts', async ({ page, context }) => {
      const estimateId = await estimateWorkflow.createBasicEstimate({
        customerName: 'Conflict Test',
        projectName: 'Conflict Resolution',
      });

      const secondPage = await context.newPage();
      const secondEstimateWorkflow = new EstimateWorkflowPage(secondPage);

      // Both users join same estimate
      await page.goto(`/estimate/${estimateId}/edit`);
      await secondPage.goto(`/estimate/${estimateId}/edit`);

      // Simultaneous edits to same field
      await Promise.all([
        estimateWorkflow.updateRoomMeasurement('kitchen', 'totalArea', 200),
        secondEstimateWorkflow.updateRoomMeasurement('kitchen', 'totalArea', 195),
      ]);

      // Check conflict resolution dialog appears
      await expect(page.locator('[data-testid="conflict-resolution-dialog"]')).toBeVisible();

      // Resolve conflict (keep latest change)
      await page.click('[data-testid="accept-latest-change"]');

      // Verify resolution
      const finalArea = await estimateWorkflow.getRoomMeasurement('kitchen', 'totalArea');
      expect([195, 200]).toContain(finalArea); // Either value is acceptable
    });
  });

  test.describe('Company Cam Integration', () => {
    test('should upload photos with WW tags to Company Cam', async ({ page }) => {
      const estimateId = await estimateWorkflow.createBasicEstimate({
        customerName: 'Company Cam Test',
        projectName: 'Photo Integration Test',
      });

      // Mock Company Cam API responses
      await page.route('**/api/companycam/**', (route) => {
        const url = route.request().url();
        
        if (url.includes('/projects')) {
          route.fulfill({
            json: { project: { id: 'cc-project-123', name: 'Test Project' } },
          });
        } else if (url.includes('/photos')) {
          route.fulfill({
            json: { 
              photo: { 
                id: 'photo-123', 
                url: 'https://companycam.com/photo123.jpg',
                tags: ['WW15-001', 'kitchen'],
              },
            },
          });
        }
      });

      // Simulate mobile photo upload
      await cameraMobile.connectToEstimate(estimateId);
      
      const photoResult = await cameraMobile.takePhoto({
        roomId: 'kitchen',
        wwTag: 'WW15-001',
        uploadToCompanyCam: true,
      });

      // Verify Company Cam integration
      expect(photoResult.companyCamId).toBe('photo-123');
      expect(photoResult.tags).toContain('WW15-001');

      // Check photo appears in web gallery with Company Cam link
      await page.goto(`/estimate/${estimateId}`);
      await page.click('[data-testid="photo-gallery-button"]');
      
      await expect(page.locator('[data-testid="photo-WW15-001"]')).toBeVisible();
      await expect(page.locator('[data-testid="companycam-link-WW15-001"]')).toBeVisible();
    });
  });

  test.describe('Excel Formula Validation', () => {
    test('should match Excel pricing calculations', async ({ page }) => {
      // Test case based on Paul Sakry Excel validation
      const estimateData = {
        customerName: 'Paul Sakry',
        projectName: 'Excel Validation Test',
        measurements: {
          exterior: {
            totalArea: 2800,
            complexity: 'MODERATE',
            surfaceType: 'STUCCO',
          },
        },
        laborHours: 28,
        materialType: 'STANDARD',
      };

      const estimateId = await estimateWorkflow.createEstimateWithData(estimateData);

      // Get calculated pricing
      const pricing = await estimateWorkflow.getPricingBreakdown();

      // Validate against Excel calculations
      // Kind Home Paint formula: (Labor + Material) / 0.45 + discount
      const expectedLaborCost = 28 * 60; // $60/hour
      const expectedMaterialCost = 2800 * 0.45; // $0.45/sqft
      const expectedSubtotal = (expectedLaborCost + expectedMaterialCost) / 0.45;

      expect(pricing.laborCost).toBeCloseTo(expectedLaborCost, 2);
      expect(pricing.materialCost).toBeCloseTo(expectedMaterialCost, 2);
      expect(pricing.subtotal).toBeCloseTo(expectedSubtotal, 2);
      
      // Verify pricing tiers
      expect(pricing.goodPrice).toBeLessThan(pricing.betterPrice);
      expect(pricing.betterPrice).toBeLessThan(pricing.bestPrice);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      const estimateId = await estimateWorkflow.createBasicEstimate({
        customerName: 'Network Test',
        projectName: 'Failure Handling',
      });

      // Simulate network failure
      await page.route('**/api/**', (route) => {
        route.abort();
      });

      await page.goto(`/estimate/${estimateId}/edit`);

      // Try to save changes
      await estimateWorkflow.addNotes('Test note during network failure');
      await page.click('[data-testid="save-button"]');

      // Should show offline indicator and queue changes
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="changes-queued"]')).toBeVisible();

      // Restore network
      await page.unroute('**/api/**');

      // Should automatically sync when back online
      await expect(page.locator('[data-testid="sync-successful"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test('should validate minimum data requirements', async ({ page }) => {
      await estimateWorkflow.startNewEstimate();

      // Try to proceed without customer info
      await page.click('[data-testid="continue-to-measurements"]');

      await expect(page.locator('[data-testid="customer-required-error"]')).toBeVisible();

      // Add customer but no measurements
      await estimateWorkflow.addCustomerInfo({
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
      });

      await page.click('[data-testid="continue-to-pricing"]');

      await expect(page.locator('[data-testid="measurements-required-error"]')).toBeVisible();

      // Add minimal measurements
      await estimateWorkflow.addRoomMeasurements({
        roomName: 'Test Room',
        walls: [{ length: 10, height: 8 }],
      });

      // Should now allow proceeding to pricing
      await page.click('[data-testid="continue-to-pricing"]');
      await expect(page.locator('[data-testid="pricing-breakdown"]')).toBeVisible();
    });

    test('should handle extremely large estimates', async ({ page }) => {
      const largeEstimateData = {
        customerName: 'Large Estate Owner',
        projectName: 'Massive Commercial Project',
        measurements: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [
            `room${i + 1}`,
            {
              totalArea: 200 + (i * 10),
              complexity: 'COMPLEX',
            },
          ])
        ),
      };

      const startTime = Date.now();
      const estimateId = await estimateWorkflow.createEstimateWithData(largeEstimateData);
      const endTime = Date.now();

      // Should handle large estimates within reasonable time
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max

      // Verify all rooms were added
      await page.goto(`/estimate/${estimateId}`);
      
      for (let i = 1; i <= 50; i++) {
        await expect(page.locator(`[data-testid="room-room${i}"]`)).toBeVisible();
      }

      // Check total square footage calculation
      const totalSqft = await estimateWorkflow.getTotalSquareFootage();
      expect(totalSqft).toBeGreaterThan(12000); // 50 rooms * ~250 sqft average
    });
  });
});