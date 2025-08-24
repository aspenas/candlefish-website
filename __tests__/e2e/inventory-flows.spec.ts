// End-to-End tests for inventory management critical user flows
import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data and utilities
interface TestUser {
  email: string;
  password: string;
  role: 'owner' | 'admin' | 'viewer';
}

interface TestItem {
  name: string;
  category: string;
  decision: 'Keep' | 'Sell' | 'Donate' | 'Unsure';
  purchasePrice: number;
  room: string;
  description?: string;
  quantity?: number;
}

class InventoryPageObjects {
  constructor(private page: Page) {}

  // Navigation
  async navigateToInventory() {
    await this.page.goto('/inventory');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToHome() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  // Authentication
  async login(user: TestUser) {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/inventory');
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/login');
  }

  // Search and Filtering
  async searchItems(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.press('[data-testid="search-input"]', 'Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async applyFilter(filterType: string, value: string) {
    await this.page.click('[data-testid="filter-button"]');
    await this.page.selectOption(`[data-testid="${filterType}-filter"]`, value);
    await this.page.click('[data-testid="apply-filters"]');
    await this.page.waitForLoadState('networkidle');
  }

  async clearFilters() {
    await this.page.click('[data-testid="clear-filters"]');
    await this.page.waitForLoadState('networkidle');
  }

  // Item Management
  async addItem(item: TestItem) {
    await this.page.click('[data-testid="add-item-button"]');
    await this.page.waitForSelector('[data-testid="add-item-form"]');

    await this.page.fill('[data-testid="item-name"]', item.name);
    await this.page.selectOption('[data-testid="item-category"]', item.category);
    await this.page.selectOption('[data-testid="item-decision"]', item.decision);
    await this.page.fill('[data-testid="item-price"]', item.purchasePrice.toString());
    await this.page.selectOption('[data-testid="item-room"]', item.room);

    if (item.description) {
      await this.page.fill('[data-testid="item-description"]', item.description);
    }

    if (item.quantity) {
      await this.page.fill('[data-testid="item-quantity"]', item.quantity.toString());
    }

    await this.page.click('[data-testid="save-item"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async editItem(itemId: string, updates: Partial<TestItem>) {
    await this.page.click(`[data-testid="edit-item-${itemId}"]`);
    await this.page.waitForSelector('[data-testid="edit-item-form"]');

    if (updates.name) {
      await this.page.fill('[data-testid="item-name"]', updates.name);
    }

    if (updates.decision) {
      await this.page.selectOption('[data-testid="item-decision"]', updates.decision);
    }

    if (updates.purchasePrice) {
      await this.page.fill('[data-testid="item-price"]', updates.purchasePrice.toString());
    }

    await this.page.click('[data-testid="save-item"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async deleteItem(itemId: string) {
    await this.page.click(`[data-testid="delete-item-${itemId}"]`);
    await this.page.click('[data-testid="confirm-delete"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async bulkUpdateItems(itemIds: string[], decision: string) {
    // Select items
    for (const itemId of itemIds) {
      await this.page.check(`[data-testid="select-item-${itemId}"]`);
    }

    await this.page.click('[data-testid="bulk-actions-menu"]');
    await this.page.selectOption('[data-testid="bulk-decision"]', decision);
    await this.page.click('[data-testid="apply-bulk-update"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  // File Operations
  async uploadItemImages(itemId: string, imagePaths: string[]) {
    await this.page.click(`[data-testid="add-images-${itemId}"]`);

    const fileInput = this.page.locator('[data-testid="image-upload"]');
    await fileInput.setInputFiles(imagePaths);

    await this.page.click('[data-testid="upload-images"]');
    await this.page.waitForSelector('[data-testid="upload-success"]');
  }

  async exportData(format: 'excel' | 'csv' | 'pdf') {
    await this.page.click('[data-testid="export-menu"]');
    await this.page.click(`[data-testid="export-${format}"]`);

    // Wait for download to start
    const downloadPromise = this.page.waitForEvent('download');
    const download = await downloadPromise;

    return download;
  }

  // Verification methods
  async verifyItemExists(itemName: string): Promise<boolean> {
    const items = await this.page.locator(`[data-testid*="item-"]:has-text("${itemName}")`);
    return await items.count() > 0;
  }

  async verifyItemCount(expectedCount: number) {
    const itemCount = await this.page.locator('[data-testid="total-items"]').textContent();
    expect(itemCount).toContain(expectedCount.toString());
  }

  async verifySearchResults(query: string, expectedCount: number) {
    const results = await this.page.locator('[data-testid="search-results"]');
    const actualCount = await results.locator('[data-testid*="item-"]').count();
    expect(actualCount).toBe(expectedCount);
  }

  async verifySummaryStats(expectedStats: {
    totalItems?: number;
    totalValue?: number;
    keepCount?: number;
    sellCount?: number;
  }) {
    if (expectedStats.totalItems !== undefined) {
      const totalItems = await this.page.locator('[data-testid="stat-total-items"]').textContent();
      expect(totalItems).toContain(expectedStats.totalItems.toString());
    }

    if (expectedStats.totalValue !== undefined) {
      const totalValue = await this.page.locator('[data-testid="stat-total-value"]').textContent();
      expect(totalValue).toContain(expectedStats.totalValue.toString());
    }
  }

  // Utility methods
  async waitForLoadingToFinish() {
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { state: 'detached' });
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    });
  }
}

// Test users
const testUsers: Record<string, TestUser> = {
  owner: {
    email: 'owner@test.com',
    password: 'TestPassword123!',
    role: 'owner'
  },
  admin: {
    email: 'admin@test.com',
    password: 'TestPassword123!',
    role: 'admin'
  },
  viewer: {
    email: 'viewer@test.com',
    password: 'TestPassword123!',
    role: 'viewer'
  }
};

// Sample test items
const testItems: Record<string, TestItem> = {
  sofa: {
    name: 'West Elm Sectional Sofa',
    category: 'Furniture',
    decision: 'Keep',
    purchasePrice: 3500,
    room: 'Living Room',
    description: 'Beautiful brown leather sectional with chaise',
    quantity: 1
  },
  lamp: {
    name: 'Modern Table Lamp',
    category: 'Lighting',
    decision: 'Sell',
    purchasePrice: 150,
    room: 'Master Bedroom',
    description: 'Brass table lamp with white shade'
  },
  rug: {
    name: 'Persian Area Rug',
    category: 'Rug / Carpet',
    decision: 'Unsure',
    purchasePrice: 2200,
    room: 'Living Room',
    description: '8x10 hand-knotted wool rug'
  }
};

test.describe('Inventory Management E2E Tests', () => {
  let inventoryPage: InventoryPageObjects;

  test.beforeEach(async ({ page }) => {
    inventoryPage = new InventoryPageObjects(page);

    // Login as owner for most tests
    await inventoryPage.login(testUsers.owner);
  });

  test.afterEach(async ({ page }) => {
    await inventoryPage.takeScreenshot(`test-${test.info().title.replace(/\s+/g, '-')}`);
  });

  test.describe('Authentication and Authorization', () => {
    test('should allow owner to access all features', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Verify all action buttons are present
      await expect(page.locator('[data-testid="add-item-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="bulk-actions-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-menu"]')).toBeVisible();
    });

    test('should restrict viewer permissions appropriately', async ({ page }) => {
      await inventoryPage.logout();
      await inventoryPage.login(testUsers.viewer);
      await inventoryPage.navigateToInventory();

      // Verify viewer cannot add/edit/delete
      await expect(page.locator('[data-testid="add-item-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="bulk-actions-menu"]')).not.toBeVisible();
    });

    test('should handle session expiration gracefully', async ({ page, context }) => {
      await inventoryPage.navigateToInventory();

      // Clear all cookies to simulate session expiration
      await context.clearCookies();

      // Try to perform an action that requires authentication
      await page.click('[data-testid="add-item-button"]');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Item Management Workflows', () => {
    test('should complete full item lifecycle: create, edit, delete', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Create item
      await inventoryPage.addItem(testItems.sofa);
      await inventoryPage.verifyItemExists(testItems.sofa.name);

      // Get the item ID for further operations
      const itemElement = page.locator(`[data-testid*="item-"]:has-text("${testItems.sofa.name}")`).first();
      const itemId = await itemElement.getAttribute('data-testid');
      const extractedId = itemId?.replace('item-', '') || '';

      // Edit item
      await inventoryPage.editItem(extractedId, {
        decision: 'Sell',
        purchasePrice: 2800
      });

      // Verify edit
      await expect(page.locator(`[data-testid="item-decision-${extractedId}"]`)).toHaveText('Sell');

      // Delete item
      await inventoryPage.deleteItem(extractedId);

      // Verify deletion
      await expect(inventoryPage.verifyItemExists(testItems.sofa.name)).resolves.toBe(false);
    });

    test('should handle bulk operations on multiple items', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Create multiple items
      await inventoryPage.addItem(testItems.sofa);
      await inventoryPage.addItem(testItems.lamp);
      await inventoryPage.addItem(testItems.rug);

      await inventoryPage.waitForLoadingToFinish();

      // Get item IDs
      const sofaElement = page.locator(`[data-testid*="item-"]:has-text("${testItems.sofa.name}")`).first();
      const lampElement = page.locator(`[data-testid*="item-"]:has-text("${testItems.lamp.name}")`).first();

      const sofaId = (await sofaElement.getAttribute('data-testid'))?.replace('item-', '') || '';
      const lampId = (await lampElement.getAttribute('data-testid'))?.replace('item-', '') || '';

      // Bulk update decision to "Sell"
      await inventoryPage.bulkUpdateItems([sofaId, lampId], 'Sell');

      // Verify bulk update
      await expect(page.locator(`[data-testid="item-decision-${sofaId}"]`)).toHaveText('Sell');
      await expect(page.locator(`[data-testid="item-decision-${lampId}"]`)).toHaveText('Sell');
    });

    test('should validate form inputs and show appropriate errors', async ({ page }) => {
      await inventoryPage.navigateToInventory();
      await page.click('[data-testid="add-item-button"]');
      await page.waitForSelector('[data-testid="add-item-form"]');

      // Try to save without required fields
      await page.click('[data-testid="save-item"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="category-error"]')).toBeVisible();

      // Fill in invalid price
      await page.fill('[data-testid="item-name"]', 'Test Item');
      await page.fill('[data-testid="item-price"]', '-100');
      await page.click('[data-testid="save-item"]');

      await expect(page.locator('[data-testid="price-error"]')).toBeVisible();
    });

    test('should handle image uploads correctly', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Create item first
      await inventoryPage.addItem(testItems.sofa);

      const itemElement = page.locator(`[data-testid*="item-"]:has-text("${testItems.sofa.name}")`).first();
      const itemId = (await itemElement.getAttribute('data-testid'))?.replace('item-', '') || '';

      // Create test images (mock files)
      const testImagePaths = [
        'test-data/images/sofa-front.jpg',
        'test-data/images/sofa-side.jpg'
      ];

      // Upload images
      await inventoryPage.uploadItemImages(itemId, testImagePaths);

      // Verify images appear in item
      const imageCount = await page.locator(`[data-testid="item-images-${itemId}"] img`).count();
      expect(imageCount).toBe(2);
    });
  });

  test.describe('Search and Filtering', () => {
    test('should perform text search across item fields', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Create test items with searchable content
      await inventoryPage.addItem(testItems.sofa);
      await inventoryPage.addItem(testItems.lamp);
      await inventoryPage.addItem(testItems.rug);

      // Test search by name
      await inventoryPage.searchItems('sectional');
      await inventoryPage.verifySearchResults('sectional', 1);

      // Test search by category
      await inventoryPage.searchItems('Lighting');
      await inventoryPage.verifySearchResults('Lighting', 1);

      // Test search by description
      await inventoryPage.searchItems('leather');
      await inventoryPage.verifySearchResults('leather', 1);

      // Clear search
      await inventoryPage.searchItems('');
      await inventoryPage.verifySearchResults('', 3);
    });

    test('should apply and combine multiple filters', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Create items with varied attributes
      await inventoryPage.addItem(testItems.sofa);   // Furniture, Keep, $3500
      await inventoryPage.addItem(testItems.lamp);   // Lighting, Sell, $150
      await inventoryPage.addItem(testItems.rug);    // Rug/Carpet, Unsure, $2200

      // Filter by category
      await inventoryPage.applyFilter('category', 'Furniture');
      await inventoryPage.verifySearchResults('furniture-filter', 1);

      // Add decision filter
      await inventoryPage.applyFilter('decision', 'Keep');
      await inventoryPage.verifySearchResults('combined-filters', 1);

      // Clear filters
      await inventoryPage.clearFilters();
      await inventoryPage.verifySearchResults('no-filters', 3);
    });

    test('should handle price range filtering', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      await inventoryPage.addItem(testItems.sofa);   // $3500
      await inventoryPage.addItem(testItems.lamp);   // $150
      await inventoryPage.addItem(testItems.rug);    // $2200

      // Filter by price range $1000 - $3000
      await page.click('[data-testid="filter-button"]');
      await page.fill('[data-testid="min-price"]', '1000');
      await page.fill('[data-testid="max-price"]', '3000');
      await page.click('[data-testid="apply-filters"]');

      // Should show only the rug ($2200)
      await inventoryPage.verifySearchResults('price-range', 1);
      await expect(page.locator(`text="${testItems.rug.name}"`)).toBeVisible();
    });

    test('should provide no results feedback', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      await inventoryPage.addItem(testItems.sofa);

      // Search for non-existent item
      await inventoryPage.searchItems('nonexistent item');

      // Should show no results message
      await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="no-results"]')).toContainText('No items found');
    });
  });

  test.describe('Data Export and Reporting', () => {
    test('should export inventory data in multiple formats', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Create test data
      await inventoryPage.addItem(testItems.sofa);
      await inventoryPage.addItem(testItems.lamp);

      // Test Excel export
      const excelDownload = await inventoryPage.exportData('excel');
      expect(excelDownload.suggestedFilename()).toContain('.xlsx');

      // Test CSV export
      const csvDownload = await inventoryPage.exportData('csv');
      expect(csvDownload.suggestedFilename()).toContain('.csv');

      // Test PDF export
      const pdfDownload = await inventoryPage.exportData('pdf');
      expect(pdfDownload.suggestedFilename()).toContain('.pdf');
    });

    test('should display accurate summary statistics', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Create items with known values
      await inventoryPage.addItem(testItems.sofa);   // Keep, $3500
      await inventoryPage.addItem(testItems.lamp);   // Sell, $150
      await inventoryPage.addItem(testItems.rug);    // Unsure, $2200

      await inventoryPage.waitForLoadingToFinish();

      // Verify summary stats
      await inventoryPage.verifySummaryStats({
        totalItems: 3,
        totalValue: 5850, // $3500 + $150 + $2200
      });

      // Verify decision counts
      await expect(page.locator('[data-testid="keep-count"]')).toContainText('1');
      await expect(page.locator('[data-testid="sell-count"]')).toContainText('1');
      await expect(page.locator('[data-testid="unsure-count"]')).toContainText('1');
    });

    test('should update statistics in real-time', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Add first item
      await inventoryPage.addItem(testItems.sofa);
      await inventoryPage.verifySummaryStats({ totalItems: 1, totalValue: 3500 });

      // Add second item
      await inventoryPage.addItem(testItems.lamp);
      await inventoryPage.verifySummaryStats({ totalItems: 2, totalValue: 3650 });

      // Edit item price
      const itemElement = page.locator(`[data-testid*="item-"]:has-text("${testItems.lamp.name}")`).first();
      const itemId = (await itemElement.getAttribute('data-testid'))?.replace('item-', '') || '';

      await inventoryPage.editItem(itemId, { purchasePrice: 200 });
      await inventoryPage.verifySummaryStats({ totalItems: 2, totalValue: 3700 });
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Simulate network failure
      await page.route('**/api/**', route => route.abort());

      // Try to add an item
      await page.click('[data-testid="add-item-button"]');
      await inventoryPage.addItem(testItems.sofa);

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('network');

      // Restore network and retry
      await page.unroute('**/api/**');
      await page.click('[data-testid="retry-button"]');

      // Should succeed
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should recover from temporary server errors', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Simulate server error
      await page.route('**/api/**', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      // Try to load items
      await page.reload();

      // Should show error state
      await expect(page.locator('[data-testid="server-error"]')).toBeVisible();

      // Restore server
      await page.unroute('**/api/**');
      await page.click('[data-testid="retry-loading"]');

      // Should load successfully
      await expect(page.locator('[data-testid="inventory-list"]')).toBeVisible();
    });

    test('should handle concurrent edit conflicts', async ({ page, context }) => {
      await inventoryPage.navigateToInventory();
      await inventoryPage.addItem(testItems.sofa);

      // Get item ID
      const itemElement = page.locator(`[data-testid*="item-"]:has-text("${testItems.sofa.name}")`).first();
      const itemId = (await itemElement.getAttribute('data-testid'))?.replace('item-', '') || '';

      // Open same item in two tabs (simulate concurrent editing)
      const newPage = await context.newPage();
      const newInventoryPage = new InventoryPageObjects(newPage);
      await newInventoryPage.login(testUsers.admin);
      await newInventoryPage.navigateToInventory();

      // Edit in first tab
      await page.click(`[data-testid="edit-item-${itemId}"]`);
      await page.fill('[data-testid="item-name"]', 'Updated from Tab 1');

      // Edit in second tab
      await newPage.click(`[data-testid="edit-item-${itemId}"]`);
      await newPage.fill('[data-testid="item-name"]', 'Updated from Tab 2');

      // Save from first tab
      await page.click('[data-testid="save-item"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Try to save from second tab - should show conflict
      await newPage.click('[data-testid="save-item"]');
      await expect(newPage.locator('[data-testid="conflict-error"]')).toBeVisible();

      await newPage.close();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should load large datasets efficiently', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Simulate loading a large number of items
      await page.route('**/api/v1/items**', route => {
        const largeDataset = {
          items: Array.from({ length: 1000 }, (_, i) => ({
            id: `item-${i}`,
            name: `Item ${i}`,
            category: 'Furniture',
            decision: 'Unsure',
            purchase_price: 100 * (i + 1),
            room: 'Test Room'
          })),
          total: 1000,
          hasMore: true
        };

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset)
        });
      });

      const startTime = Date.now();
      await page.reload();
      await inventoryPage.waitForLoadingToFinish();
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (less than 3 seconds)
      expect(loadTime).toBeLessThan(3000);

      // Should implement virtual scrolling (not all items rendered at once)
      const renderedItems = await page.locator('[data-testid*="item-"]').count();
      expect(renderedItems).toBeLessThan(100); // Should virtualize
    });

    test('should meet accessibility standards', async ({ page }) => {
      await inventoryPage.navigateToInventory();
      await inventoryPage.addItem(testItems.sofa);

      // Check for proper ARIA labels
      await expect(page.locator('[data-testid="add-item-button"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="search-input"]')).toHaveAttribute('aria-label');

      // Check keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      expect(await focusedElement.isVisible()).toBe(true);

      // Check color contrast (this would typically use a tool like axe-playwright)
      // For now, we'll just verify critical elements are visible
      await expect(page.locator('[data-testid="add-item-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="inventory-list"]')).toBeVisible();
    });

    test('should be responsive across device sizes', async ({ page }) => {
      await inventoryPage.navigateToInventory();
      await inventoryPage.addItem(testItems.sofa);

      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="inventory-list"]')).toBeVisible();

      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();
    });
  });

  test.describe('Advanced Features', () => {
    test('should support keyboard shortcuts', async ({ page }) => {
      await inventoryPage.navigateToInventory();

      // Test quick add shortcut (Ctrl+N)
      await page.keyboard.press('Control+n');
      await expect(page.locator('[data-testid="add-item-form"]')).toBeVisible();

      // Close form
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="add-item-form"]')).not.toBeVisible();

      // Test search focus (Ctrl+K)
      await page.keyboard.press('Control+k');
      await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
    });

    test('should auto-save draft changes', async ({ page }) => {
      await inventoryPage.navigateToInventory();
      await page.click('[data-testid="add-item-button"]');

      // Start filling form
      await page.fill('[data-testid="item-name"]', 'Draft Item');
      await page.fill('[data-testid="item-description"]', 'This is a draft');

      // Navigate away without saving
      await page.goto('/dashboard');

      // Come back
      await inventoryPage.navigateToInventory();
      await page.click('[data-testid="add-item-button"]');

      // Should restore draft
      await expect(page.locator('[data-testid="item-name"]')).toHaveValue('Draft Item');
      await expect(page.locator('[data-testid="item-description"]')).toHaveValue('This is a draft');
    });

    test('should support undo/redo operations', async ({ page }) => {
      await inventoryPage.navigateToInventory();
      await inventoryPage.addItem(testItems.sofa);

      const itemElement = page.locator(`[data-testid*="item-"]:has-text("${testItems.sofa.name}")`).first();
      const itemId = (await itemElement.getAttribute('data-testid'))?.replace('item-', '') || '';

      // Delete item
      await inventoryPage.deleteItem(itemId);
      await expect(inventoryPage.verifyItemExists(testItems.sofa.name)).resolves.toBe(false);

      // Undo deletion
      await page.keyboard.press('Control+z');
      await expect(inventoryPage.verifyItemExists(testItems.sofa.name)).resolves.toBe(true);

      // Redo deletion
      await page.keyboard.press('Control+y');
      await expect(inventoryPage.verifyItemExists(testItems.sofa.name)).resolves.toBe(false);
    });
  });
});
