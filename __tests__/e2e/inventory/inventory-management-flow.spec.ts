import { test, expect, Page } from '@playwright/test';
import { InventoryTestHelper } from '../helpers/inventory-helper';

// Test data
const testItems = {
  newItem: {
    name: 'Test Sofa E2E',
    description: 'End-to-end test sofa item',
    category: 'Furniture',
    sku: 'E2E-SOFA-001',
    barcode: '1234567890123',
    quantity: '2',
    minQuantity: '1',
    maxQuantity: '5',
    unitPrice: '899.99',
    location: 'Living Room',
    supplier: 'Test Furniture Co',
    tags: 'e2e,test,sofa',
  },
  updateData: {
    name: 'Updated Test Sofa E2E',
    description: 'Updated description for e2e test',
    quantity: '3',
    unitPrice: '949.99',
  },
};

let inventoryHelper: InventoryTestHelper;

test.beforeEach(async ({ page }) => {
  inventoryHelper = new InventoryTestHelper(page);
  await inventoryHelper.navigateToInventory();
});

test.afterEach(async ({ page }) => {
  // Clean up test data
  await inventoryHelper.cleanupTestItems();
});

test.describe('Inventory Management E2E Flow', () => {
  test('should complete full inventory management lifecycle', async ({ page }) => {
    // Step 1: Create new inventory item
    await test.step('Create new inventory item', async () => {
      await inventoryHelper.clickAddItemButton();
      await inventoryHelper.fillItemForm(testItems.newItem);
      await inventoryHelper.submitItemForm();

      // Verify creation success
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Item created successfully'
      );

      // Verify redirect to inventory list
      await expect(page).toHaveURL(/\/inventory$/);

      // Verify item appears in list
      await expect(page.locator(`text=${testItems.newItem.name}`)).toBeVisible();
      await expect(page.locator(`text=${testItems.newItem.sku}`)).toBeVisible();
    });

    // Step 2: Search for the created item
    await test.step('Search for created item', async () => {
      await inventoryHelper.searchForItem(testItems.newItem.name);

      // Verify search results
      await expect(page.locator('[data-testid="inventory-item"]')).toHaveCount(1);
      await expect(page.locator(`text=${testItems.newItem.name}`)).toBeVisible();

      // Clear search
      await inventoryHelper.clearSearch();
      await expect(page.locator('[data-testid="inventory-item"]')).toHaveCount.toBeGreaterThan(1);
    });

    // Step 3: Filter by category
    await test.step('Filter by category', async () => {
      await inventoryHelper.filterByCategory('Furniture');

      // Verify filter is applied
      await expect(page.locator('[data-testid="category-filter"]')).toHaveValue('Furniture');

      // Verify only furniture items are shown
      const items = page.locator('[data-testid="inventory-item"]');
      const count = await items.count();

      for (let i = 0; i < count; i++) {
        await expect(items.nth(i).locator('[data-testid="item-category"]')).toContainText('Furniture');
      }
    });

    // Step 4: View item details
    await test.step('View item details', async () => {
      await inventoryHelper.clickItemByName(testItems.newItem.name);

      // Verify item detail page
      await expect(page).toHaveURL(/\/inventory\/items\/[\w-]+$/);
      await expect(page.locator('[data-testid="item-name"]')).toContainText(testItems.newItem.name);
      await expect(page.locator('[data-testid="item-description"]')).toContainText(testItems.newItem.description);
      await expect(page.locator('[data-testid="item-sku"]')).toContainText(testItems.newItem.sku);
      await expect(page.locator('[data-testid="item-price"]')).toContainText('$899.99');
      await expect(page.locator('[data-testid="item-quantity"]')).toContainText('2');
    });

    // Step 5: Edit item
    await test.step('Edit item', async () => {
      await page.locator('[data-testid="edit-item-button"]').click();

      // Verify edit form is pre-populated
      await expect(page.locator('[name="name"]')).toHaveValue(testItems.newItem.name);
      await expect(page.locator('[name="sku"]')).toHaveValue(testItems.newItem.sku);

      // Update item data
      await inventoryHelper.updateItemForm(testItems.updateData);
      await inventoryHelper.submitItemForm();

      // Verify update success
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Item updated successfully'
      );

      // Verify updated data is displayed
      await expect(page.locator('[data-testid="item-name"]')).toContainText(testItems.updateData.name);
      await expect(page.locator('[data-testid="item-price"]')).toContainText('$949.99');
      await expect(page.locator('[data-testid="item-quantity"]')).toContainText('3');
    });

    // Step 6: Update quantity using quick action
    await test.step('Update quantity using quick action', async () => {
      await page.locator('[data-testid="quick-quantity-update"]').click();

      // Update quantity in modal
      await page.locator('[data-testid="quantity-input"]').fill('5');
      await page.locator('[data-testid="update-quantity-button"]').click();

      // Verify quantity update
      await expect(page.locator('[data-testid="item-quantity"]')).toContainText('5');
      await expect(page.locator('[data-testid="total-value"]')).toContainText('$4,749.95'); // 5 * 949.99
    });

    // Step 7: Add item note
    await test.step('Add item note', async () => {
      await page.locator('[data-testid="add-note-button"]').click();

      const noteText = 'This is a test note for E2E testing';
      await page.locator('[data-testid="note-textarea"]').fill(noteText);
      await page.locator('[data-testid="save-note-button"]').click();

      // Verify note is added
      await expect(page.locator('[data-testid="item-note"]')).toContainText(noteText);
    });

    // Step 8: Test image upload
    await test.step('Upload item image', async () => {
      await page.locator('[data-testid="edit-item-button"]').click();

      // Upload test image
      const fileInput = page.locator('[data-testid="image-upload"]');
      await fileInput.setInputFiles('./test-fixtures/test-image.jpg');

      // Verify image preview
      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

      // Save changes
      await page.locator('[data-testid="save-item-button"]').click();

      // Verify image is displayed on item detail page
      await expect(page.locator('[data-testid="item-image"]')).toBeVisible();
    });

    // Step 9: Test bulk operations
    await test.step('Test bulk operations', async () => {
      // Navigate back to inventory list
      await inventoryHelper.navigateToInventory();

      // Enable bulk selection
      await page.locator('[data-testid="bulk-select-toggle"]').click();

      // Select multiple items
      await page.locator('[data-testid="item-checkbox"]').first().check();
      await page.locator('[data-testid="item-checkbox"]').nth(1).check();

      // Verify bulk actions panel is visible
      await expect(page.locator('[data-testid="bulk-actions-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 items selected');

      // Test bulk category update
      await page.locator('[data-testid="bulk-category-update"]').click();
      await page.locator('[data-testid="bulk-category-select"]').selectOption('Electronics');
      await page.locator('[data-testid="confirm-bulk-update"]').click();

      // Verify bulk update success
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Bulk update completed'
      );
    });

    // Step 10: Test export functionality
    await test.step('Test export functionality', async () => {
      await page.locator('[data-testid="export-dropdown"]').click();

      // Test Excel export
      const downloadPromise = page.waitForEvent('download');
      await page.locator('[data-testid="export-excel"]').click();
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toContain('.xlsx');

      // Test CSV export
      const csvDownloadPromise = page.waitForEvent('download');
      await page.locator('[data-testid="export-dropdown"]').click();
      await page.locator('[data-testid="export-csv"]').click();
      const csvDownload = await csvDownloadPromise;

      expect(csvDownload.suggestedFilename()).toContain('.csv');
    });

    // Step 11: Test analytics view
    await test.step('View analytics', async () => {
      await page.locator('[data-testid="analytics-tab"]').click();

      // Verify analytics dashboard elements
      await expect(page.locator('[data-testid="total-items-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-value-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="category-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="value-trends-chart"]')).toBeVisible();

      // Verify low stock alerts
      await expect(page.locator('[data-testid="low-stock-section"]')).toBeVisible();
    });

    // Step 12: Test delete item (soft delete)
    await test.step('Delete item', async () => {
      // Navigate back to inventory
      await page.locator('[data-testid="inventory-tab"]').click();

      // Find and click on the test item
      await inventoryHelper.clickItemByName(testItems.updateData.name);

      // Delete item
      await page.locator('[data-testid="delete-item-button"]').click();

      // Confirm deletion in modal
      await page.locator('[data-testid="confirm-delete-button"]').click();

      // Verify deletion success
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Item deleted successfully'
      );

      // Verify redirect to inventory list
      await expect(page).toHaveURL(/\/inventory$/);

      // Verify item is no longer in active inventory
      await expect(page.locator(`text=${testItems.updateData.name}`)).not.toBeVisible();
    });
  });

  test('should handle barcode scanning workflow', async ({ page }) => {
    await test.step('Navigate to barcode scanner', async () => {
      await page.locator('[data-testid="scan-barcode-button"]').click();

      // Mock camera permissions
      await page.evaluate(() => {
        navigator.mediaDevices.getUserMedia = () =>
          Promise.resolve({
            getTracks: () => [],
            getVideoTracks: () => [],
            getAudioTracks: () => [],
          });
      });

      // Verify scanner interface
      await expect(page.locator('[data-testid="barcode-scanner"]')).toBeVisible();
      await expect(page.locator('[data-testid="scan-overlay"]')).toBeVisible();
    });

    await test.step('Simulate barcode scan', async () => {
      // Simulate successful barcode scan
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('barcode-scanned', {
          detail: { data: '1234567890123', format: 'EAN_13' }
        }));
      });

      // Verify scan result processing
      await expect(page.locator('[data-testid="scan-success"]')).toBeVisible();

      // Should navigate to item form with barcode pre-filled
      await expect(page).toHaveURL(/\/inventory\/add\?barcode=1234567890123$/);
      await expect(page.locator('[name="barcode"]')).toHaveValue('1234567890123');
    });
  });

  test('should handle import/export workflow', async ({ page }) => {
    await test.step('Test Excel import', async () => {
      await page.locator('[data-testid="import-dropdown"]').click();
      await page.locator('[data-testid="import-excel"]').click();

      // Upload test Excel file
      const fileInput = page.locator('[data-testid="excel-file-input"]');
      await fileInput.setInputFiles('./test-fixtures/inventory-import.xlsx');

      // Preview import data
      await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-table"]')).toBeVisible();

      // Map columns
      await page.locator('[data-testid="column-mapping"]').click();
      await inventoryHelper.mapImportColumns();

      // Execute import
      await page.locator('[data-testid="execute-import"]').click();

      // Verify import success
      await expect(page.locator('[data-testid="import-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="imported-count"]')).toContainText('items imported');
    });

    await test.step('Verify imported items', async () => {
      // Check that imported items appear in inventory
      await inventoryHelper.navigateToInventory();

      // Search for known imported item
      await inventoryHelper.searchForItem('Imported Test Item');
      await expect(page.locator('[data-testid="inventory-item"]')).toHaveCount(1);
    });
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    await test.step('Handle form validation errors', async () => {
      await inventoryHelper.clickAddItemButton();

      // Try to submit empty form
      await page.locator('[data-testid="save-item-button"]').click();

      // Verify validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText('required');
      await expect(page.locator('[data-testid="sku-error"]')).toContainText('required');
      await expect(page.locator('[data-testid="category-error"]')).toContainText('required');
      await expect(page.locator('[data-testid="price-error"]')).toContainText('required');
    });

    await test.step('Handle duplicate SKU error', async () => {
      // Fill form with existing SKU
      await inventoryHelper.fillItemForm({
        ...testItems.newItem,
        sku: 'EXISTING-SKU-001', // Assuming this already exists
      });

      await inventoryHelper.submitItemForm();

      // Verify duplicate SKU error
      await expect(page.locator('[data-testid="sku-error"]')).toContainText('already exists');
    });

    await test.step('Handle network errors', async () => {
      // Simulate network failure
      await page.route('**/api/v1/items', route => {
        route.abort('failed');
      });

      await inventoryHelper.fillItemForm(testItems.newItem);
      await inventoryHelper.submitItemForm();

      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Network error'
      );

      // Verify retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });
  });

  test('should support offline functionality', async ({ page, context }) => {
    await test.step('Simulate offline mode', async () => {
      // Go offline
      await context.setOffline(true);

      // Verify offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    });

    await test.step('Create item while offline', async () => {
      await inventoryHelper.clickAddItemButton();
      await inventoryHelper.fillItemForm(testItems.newItem);
      await inventoryHelper.submitItemForm();

      // Verify offline storage
      await expect(page.locator('[data-testid="offline-success"]')).toContainText(
        'Saved locally. Will sync when online.'
      );

      // Verify pending sync indicator
      await expect(page.locator('[data-testid="pending-sync"]')).toBeVisible();
    });

    await test.step('Test sync when back online', async () => {
      // Go back online
      await context.setOffline(false);

      // Trigger sync
      await page.locator('[data-testid="sync-button"]').click();

      // Verify sync success
      await expect(page.locator('[data-testid="sync-success"]')).toContainText(
        'Sync completed'
      );

      // Verify offline indicator is hidden
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });
  });

  test('should support accessibility features', async ({ page }) => {
    await test.step('Test keyboard navigation', async () => {
      // Tab through main navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="add-item-button"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="search-input"]')).toBeFocused();

      // Test item navigation with arrow keys
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[data-testid="inventory-item"]').first()).toBeFocused();
    });

    await test.step('Test screen reader support', async () => {
      // Verify ARIA labels and roles
      await expect(page.locator('[data-testid="inventory-table"]')).toHaveAttribute('role', 'table');
      await expect(page.locator('[data-testid="add-item-button"]')).toHaveAttribute('aria-label', 'Add new inventory item');

      // Verify form labels
      await inventoryHelper.clickAddItemButton();
      await expect(page.locator('[name="name"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[name="sku"]')).toHaveAttribute('aria-required', 'true');
    });

    await test.step('Test high contrast mode', async () => {
      // Enable high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });

      // Verify UI still functions and is visible
      await expect(page.locator('[data-testid="inventory-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-item-button"]')).toBeVisible();
    });
  });
});
