import { Page, expect } from '@playwright/test';

export class InventoryTestHelper {
  constructor(private page: Page) {}

  // Navigation helpers
  async navigateToInventory(): Promise<void> {
    await this.page.goto('/inventory');
    await this.waitForPageLoad();
  }

  async navigateToAddItem(): Promise<void> {
    await this.page.goto('/inventory/add');
    await this.waitForPageLoad();
  }

  async navigateToItemDetail(itemId: string): Promise<void> {
    await this.page.goto(`/inventory/items/${itemId}`);
    await this.waitForPageLoad();
  }

  private async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait for main content to be visible
    await this.page.waitForSelector('[data-testid="main-content"]', { state: 'visible' });
  }

  // Item creation helpers
  async clickAddItemButton(): Promise<void> {
    await this.page.locator('[data-testid="add-item-button"]').click();
    await this.waitForFormLoad();
  }

  async fillItemForm(itemData: {
    name: string;
    description?: string;
    category: string;
    sku: string;
    barcode?: string;
    quantity: string;
    minQuantity?: string;
    maxQuantity?: string;
    unitPrice: string;
    location: string;
    supplier?: string;
    tags?: string;
  }): Promise<void> {
    // Fill required fields
    await this.page.locator('[name="name"]').fill(itemData.name);
    await this.page.locator('[name="sku"]').fill(itemData.sku);
    await this.page.locator('[name="category"]').selectOption(itemData.category);
    await this.page.locator('[name="quantity"]').fill(itemData.quantity);
    await this.page.locator('[name="unitPrice"]').fill(itemData.unitPrice);
    await this.page.locator('[name="location"]').fill(itemData.location);

    // Fill optional fields if provided
    if (itemData.description) {
      await this.page.locator('[name="description"]').fill(itemData.description);
    }

    if (itemData.barcode) {
      await this.page.locator('[name="barcode"]').fill(itemData.barcode);
    }

    if (itemData.minQuantity) {
      await this.page.locator('[name="minQuantity"]').fill(itemData.minQuantity);
    }

    if (itemData.maxQuantity) {
      await this.page.locator('[name="maxQuantity"]').fill(itemData.maxQuantity);
    }

    if (itemData.supplier) {
      await this.page.locator('[name="supplier"]').fill(itemData.supplier);
    }

    if (itemData.tags) {
      await this.page.locator('[name="tags"]').fill(itemData.tags);
    }
  }

  async updateItemForm(updateData: {
    name?: string;
    description?: string;
    quantity?: string;
    unitPrice?: string;
    location?: string;
  }): Promise<void> {
    for (const [field, value] of Object.entries(updateData)) {
      if (value) {
        const input = this.page.locator(`[name="${field}"]`);
        await input.clear();
        await input.fill(value);
      }
    }
  }

  async submitItemForm(): Promise<void> {
    await this.page.locator('[data-testid="save-item-button"]').click();
    // Wait for form submission
    await this.page.waitForResponse(response =>
      response.url().includes('/api/v1/items') &&
      (response.status() === 200 || response.status() === 201)
    );
  }

  private async waitForFormLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="item-form"]', { state: 'visible' });
    await this.page.waitForSelector('[name="name"]', { state: 'visible' });
  }

  // Search and filter helpers
  async searchForItem(searchTerm: string): Promise<void> {
    const searchInput = this.page.locator('[data-testid="search-input"]');
    await searchInput.fill(searchTerm);
    await this.page.keyboard.press('Enter');
    await this.waitForSearchResults();
  }

  async clearSearch(): Promise<void> {
    const searchInput = this.page.locator('[data-testid="search-input"]');
    await searchInput.clear();
    await this.page.keyboard.press('Enter');
    await this.waitForSearchResults();
  }

  async filterByCategory(category: string): Promise<void> {
    await this.page.locator('[data-testid="category-filter"]').selectOption(category);
    await this.waitForSearchResults();
  }

  async filterByPriceRange(minPrice: string, maxPrice: string): Promise<void> {
    await this.page.locator('[data-testid="min-price-filter"]').fill(minPrice);
    await this.page.locator('[data-testid="max-price-filter"]').fill(maxPrice);
    await this.page.locator('[data-testid="apply-price-filter"]').click();
    await this.waitForSearchResults();
  }

  async sortBy(sortOption: string): Promise<void> {
    await this.page.locator('[data-testid="sort-dropdown"]').selectOption(sortOption);
    await this.waitForSearchResults();
  }

  private async waitForSearchResults(): Promise<void> {
    // Wait for search request to complete
    await this.page.waitForResponse(response =>
      response.url().includes('/api/v1/items') && response.status() === 200
    );
    // Wait for loading indicator to disappear
    await this.page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden' });
  }

  // Item interaction helpers
  async clickItemByName(itemName: string): Promise<void> {
    await this.page.locator(`text=${itemName}`).first().click();
    await this.waitForPageLoad();
  }

  async clickItemBySku(sku: string): Promise<void> {
    await this.page.locator(`[data-testid="item-sku"]:has-text("${sku}")`).first().click();
    await this.waitForPageLoad();
  }

  async getItemCardByName(itemName: string) {
    return this.page.locator(`[data-testid="inventory-item"]:has-text("${itemName}")`).first();
  }

  // Bulk operations helpers
  async selectItemsForBulkOperation(itemNames: string[]): Promise<void> {
    // Enable bulk selection mode
    await this.page.locator('[data-testid="bulk-select-toggle"]').click();

    // Select specified items
    for (const itemName of itemNames) {
      const itemCard = await this.getItemCardByName(itemName);
      await itemCard.locator('[data-testid="item-checkbox"]').check();
    }
  }

  async performBulkCategoryUpdate(newCategory: string): Promise<void> {
    await this.page.locator('[data-testid="bulk-category-update"]').click();
    await this.page.locator('[data-testid="bulk-category-select"]').selectOption(newCategory);
    await this.page.locator('[data-testid="confirm-bulk-update"]').click();

    // Wait for bulk update to complete
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async performBulkDelete(): Promise<void> {
    await this.page.locator('[data-testid="bulk-delete"]').click();
    await this.page.locator('[data-testid="confirm-bulk-delete"]').click();

    // Wait for bulk delete to complete
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  // Analytics helpers
  async navigateToAnalytics(): Promise<void> {
    await this.page.locator('[data-testid="analytics-tab"]').click();
    await this.waitForAnalyticsLoad();
  }

  async waitForAnalyticsLoad(): Promise<void> {
    await this.page.waitForSelector('[data-testid="analytics-dashboard"]', { state: 'visible' });
    await this.page.waitForSelector('[data-testid="total-items-metric"]', { state: 'visible' });
  }

  async getAnalyticsMetric(metricName: string): Promise<string> {
    const metric = await this.page.locator(`[data-testid="${metricName}-metric"]`).textContent();
    return metric || '';
  }

  // Export/Import helpers
  async exportToExcel(): Promise<void> {
    await this.page.locator('[data-testid="export-dropdown"]').click();

    const downloadPromise = this.page.waitForEvent('download');
    await this.page.locator('[data-testid="export-excel"]').click();

    const download = await downloadPromise;
    await download.saveAs(`./test-downloads/${download.suggestedFilename()}`);
  }

  async exportToCSV(): Promise<void> {
    await this.page.locator('[data-testid="export-dropdown"]').click();

    const downloadPromise = this.page.waitForEvent('download');
    await this.page.locator('[data-testid="export-csv"]').click();

    const download = await downloadPromise;
    await download.saveAs(`./test-downloads/${download.suggestedFilename()}`);
  }

  async importFromExcel(filePath: string): Promise<void> {
    await this.page.locator('[data-testid="import-dropdown"]').click();
    await this.page.locator('[data-testid="import-excel"]').click();

    const fileInput = this.page.locator('[data-testid="excel-file-input"]');
    await fileInput.setInputFiles(filePath);

    await this.page.waitForSelector('[data-testid="import-preview"]', { state: 'visible' });
  }

  async mapImportColumns(): Promise<void> {
    // Map standard columns - adjust based on your import UI
    const columnMappings = {
      'Name': 'name',
      'SKU': 'sku',
      'Category': 'category',
      'Price': 'unitPrice',
      'Quantity': 'quantity',
      'Location': 'location',
    };

    for (const [excelColumn, fieldName] of Object.entries(columnMappings)) {
      await this.page.locator(`[data-testid="column-mapping-${excelColumn}"]`).selectOption(fieldName);
    }
  }

  async executeImport(): Promise<void> {
    await this.page.locator('[data-testid="execute-import"]').click();
    await this.page.waitForSelector('[data-testid="import-success"]', { state: 'visible' });
  }

  // Image upload helpers
  async uploadItemImage(imagePath: string): Promise<void> {
    const fileInput = this.page.locator('[data-testid="image-upload"]');
    await fileInput.setInputFiles(imagePath);

    // Wait for image preview to load
    await this.page.waitForSelector('[data-testid="image-preview"]', { state: 'visible' });
  }

  // Barcode scanning helpers
  async openBarcodeScanner(): Promise<void> {
    await this.page.locator('[data-testid="scan-barcode-button"]').click();
    await this.page.waitForSelector('[data-testid="barcode-scanner"]', { state: 'visible' });
  }

  async simulateBarcodeScan(barcode: string, format: string = 'EAN_13'): Promise<void> {
    await this.page.evaluate(({ barcode, format }) => {
      window.dispatchEvent(new CustomEvent('barcode-scanned', {
        detail: { data: barcode, format }
      }));
    }, { barcode, format });
  }

  async enterBarcodeManually(barcode: string): Promise<void> {
    await this.page.locator('[data-testid="manual-barcode-button"]').click();
    await this.page.locator('[data-testid="manual-barcode-input"]').fill(barcode);
    await this.page.locator('[data-testid="submit-manual-barcode"]').click();
  }

  // Notes helpers
  async addItemNote(noteText: string): Promise<void> {
    await this.page.locator('[data-testid="add-note-button"]').click();
    await this.page.locator('[data-testid="note-textarea"]').fill(noteText);
    await this.page.locator('[data-testid="save-note-button"]').click();

    // Wait for note to be saved
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async editItemNote(oldNoteText: string, newNoteText: string): Promise<void> {
    const noteElement = this.page.locator(`[data-testid="item-note"]:has-text("${oldNoteText}")`);
    await noteElement.locator('[data-testid="edit-note-button"]').click();

    const textarea = this.page.locator('[data-testid="note-textarea"]');
    await textarea.clear();
    await textarea.fill(newNoteText);
    await this.page.locator('[data-testid="save-note-button"]').click();

    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async deleteItemNote(noteText: string): Promise<void> {
    const noteElement = this.page.locator(`[data-testid="item-note"]:has-text("${noteText}")`);
    await noteElement.locator('[data-testid="delete-note-button"]').click();
    await this.page.locator('[data-testid="confirm-delete-note"]').click();

    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  // Quantity update helpers
  async quickUpdateQuantity(itemName: string, newQuantity: string): Promise<void> {
    const itemCard = await this.getItemCardByName(itemName);
    await itemCard.locator('[data-testid="quick-quantity-update"]').click();

    await this.page.locator('[data-testid="quantity-input"]').fill(newQuantity);
    await this.page.locator('[data-testid="update-quantity-button"]').click();

    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  // Error handling helpers
  async waitForError(): Promise<string> {
    await this.page.waitForSelector('[data-testid="error-message"]', { state: 'visible' });
    const errorMessage = await this.page.locator('[data-testid="error-message"]').textContent();
    return errorMessage || '';
  }

  async dismissError(): Promise<void> {
    await this.page.locator('[data-testid="dismiss-error"]').click();
    await this.page.waitForSelector('[data-testid="error-message"]', { state: 'hidden' });
  }

  async retryFailedAction(): Promise<void> {
    await this.page.locator('[data-testid="retry-button"]').click();
  }

  // Cleanup helpers
  async cleanupTestItems(): Promise<void> {
    try {
      // Search for test items (items with E2E in name)
      await this.searchForItem('E2E');

      // Get all test items
      const testItems = this.page.locator('[data-testid="inventory-item"]:has-text("E2E")');
      const count = await testItems.count();

      if (count > 0) {
        // Select all test items for bulk delete
        await this.page.locator('[data-testid="bulk-select-toggle"]').click();

        for (let i = 0; i < count; i++) {
          await testItems.nth(i).locator('[data-testid="item-checkbox"]').check();
        }

        // Perform bulk delete
        await this.performBulkDelete();
      }
    } catch (error) {
      console.warn('Failed to cleanup test items:', error);
    }
  }

  // Assertion helpers
  async assertItemExists(itemName: string): Promise<void> {
    await expect(this.page.locator(`text=${itemName}`)).toBeVisible();
  }

  async assertItemDoesNotExist(itemName: string): Promise<void> {
    await expect(this.page.locator(`text=${itemName}`)).not.toBeVisible();
  }

  async assertItemCount(expectedCount: number): Promise<void> {
    await expect(this.page.locator('[data-testid="inventory-item"]')).toHaveCount(expectedCount);
  }

  async assertSuccessMessage(message: string): Promise<void> {
    await expect(this.page.locator('[data-testid="success-message"]')).toContainText(message);
  }

  async assertErrorMessage(message: string): Promise<void> {
    await expect(this.page.locator('[data-testid="error-message"]')).toContainText(message);
  }

  // Offline/sync helpers
  async waitForOfflineIndicator(): Promise<void> {
    await this.page.waitForSelector('[data-testid="offline-indicator"]', { state: 'visible' });
  }

  async triggerSync(): Promise<void> {
    await this.page.locator('[data-testid="sync-button"]').click();
    await this.page.waitForSelector('[data-testid="sync-success"]', { state: 'visible' });
  }

  async assertPendingSyncItems(expectedCount: number): Promise<void> {
    await expect(this.page.locator('[data-testid="pending-sync-item"]')).toHaveCount(expectedCount);
  }

  // Accessibility helpers
  async checkAccessibilityLabels(): Promise<void> {
    // Verify important elements have accessibility labels
    await expect(this.page.locator('[data-testid="add-item-button"]')).toHaveAttribute('aria-label');
    await expect(this.page.locator('[data-testid="search-input"]')).toHaveAttribute('aria-label');
    await expect(this.page.locator('[data-testid="inventory-table"]')).toHaveAttribute('role', 'table');
  }

  async testKeyboardNavigation(): Promise<void> {
    // Test tab navigation through main interface elements
    await this.page.keyboard.press('Tab'); // Should focus add button
    await expect(this.page.locator('[data-testid="add-item-button"]')).toBeFocused();

    await this.page.keyboard.press('Tab'); // Should focus search
    await expect(this.page.locator('[data-testid="search-input"]')).toBeFocused();

    await this.page.keyboard.press('Tab'); // Should focus first item or filter
    // Add more specific assertions based on your UI layout
  }

  // Performance helpers
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.waitForPageLoad();
    return Date.now() - startTime;
  }

  async measureSearchTime(searchTerm: string): Promise<number> {
    const startTime = Date.now();
    await this.searchForItem(searchTerm);
    return Date.now() - startTime;
  }
}
