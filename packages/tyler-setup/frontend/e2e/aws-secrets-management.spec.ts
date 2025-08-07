import { test, expect, Page } from '@playwright/test';

test.describe('AWS Secrets Management', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Authenticate user before each test
    await authenticateUser(page);
    await page.goto('/aws-secrets');
  });

  test('should display secrets list page', async () => {
    await expect(page.getByRole('heading', { name: /aws secrets|secrets management/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create.*secret|add.*secret/i })).toBeVisible();
    
    // Should show secrets table or empty state
    const secretsTable = page.getByRole('table');
    const emptyState = page.getByText(/no secrets|empty/i);
    
    await expect(secretsTable.or(emptyState)).toBeVisible();
  });

  test('should create new AWS secret successfully', async () => {
    // Click create secret button
    await page.getByRole('button', { name: /create.*secret|add.*secret/i }).click();
    
    // Should open create secret modal/form
    await expect(page.getByRole('dialog').or(page.getByRole('form'))).toBeVisible();
    
    // Fill out secret creation form
    const secretName = `test-secret-${Date.now()}`;
    await page.getByLabel(/secret.*name|name/i).fill(secretName);
    await page.getByLabel(/description/i).fill('Test secret created by E2E test');
    
    // Handle different value input types (JSON, text)
    const valueInput = page.getByLabel(/value|secret.*value/i);
    await valueInput.fill('{"username": "testuser", "password": "testpass123"}');
    
    // Add tags if available
    const addTagButton = page.getByRole('button', { name: /add.*tag/i });
    if (await addTagButton.isVisible()) {
      await addTagButton.click();
      await page.getByLabel(/tag.*key|key/i).last().fill('Environment');
      await page.getByLabel(/tag.*value|value/i).last().fill('Test');
    }
    
    // Submit the form
    await page.getByRole('button', { name: /create|save/i }).click();
    
    // Should show success message
    await expect(page.getByText(/secret.*created|success/i)).toBeVisible({ timeout: 10000 });
    
    // Should return to secrets list and show the new secret
    await expect(page.getByText(secretName)).toBeVisible({ timeout: 5000 });
  });

  test('should validate secret creation form', async () => {
    await page.getByRole('button', { name: /create.*secret|add.*secret/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /create|save/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/name.*required|secret name.*required/i)).toBeVisible();
    await expect(page.getByText(/value.*required|secret value.*required/i)).toBeVisible();
  });

  test('should handle duplicate secret names', async () => {
    const duplicateName = 'existing-secret';
    
    // Mock API to return conflict error
    await page.route('**/api/aws-secrets', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Secret already exists' })
        });
      } else {
        route.continue();
      }
    });
    
    await page.getByRole('button', { name: /create.*secret|add.*secret/i }).click();
    await page.getByLabel(/secret.*name|name/i).fill(duplicateName);
    await page.getByLabel(/value|secret.*value/i).fill('test-value');
    await page.getByRole('button', { name: /create|save/i }).click();
    
    await expect(page.getByText(/already exists|duplicate|conflict/i)).toBeVisible();
  });

  test('should view secret details', async () => {
    // Create a test secret first or use existing one
    await createTestSecret(page, 'view-test-secret');
    
    // Click on the secret to view details
    await page.getByText('view-test-secret').click();
    
    // Should show secret details modal/page
    await expect(page.getByText(/secret details|view secret/i)).toBeVisible();
    await expect(page.getByText('view-test-secret')).toBeVisible();
    await expect(page.getByText(/arn:|created:|version:/i)).toBeVisible();
  });

  test('should retrieve and display secret value', async () => {
    await createTestSecret(page, 'value-test-secret');
    
    // Find and click the "View Value" or similar button
    const secretRow = page.getByText('value-test-secret').locator('..');
    await secretRow.getByRole('button', { name: /view.*value|show.*value|reveal/i }).click();
    
    // Should show secret value (possibly masked/revealed)
    await expect(page.getByText(/secret value|value:/i)).toBeVisible();
    
    // Should show actual value or masked value with reveal option
    const valueContainer = page.getByTestId('secret-value').or(page.getByText(/username.*password/i));
    await expect(valueContainer).toBeVisible();
  });

  test('should edit existing secret', async () => {
    await createTestSecret(page, 'edit-test-secret');
    
    // Find and click edit button
    const secretRow = page.getByText('edit-test-secret').locator('..');
    await secretRow.getByRole('button', { name: /edit|update/i }).click();
    
    // Should open edit form
    await expect(page.getByRole('dialog').or(page.getByText(/edit.*secret/i))).toBeVisible();
    
    // Update the description
    const descriptionInput = page.getByLabel(/description/i);
    await descriptionInput.clear();
    await descriptionInput.fill('Updated description via E2E test');
    
    // Update the value
    const valueInput = page.getByLabel(/value|secret.*value/i);
    await valueInput.clear();
    await valueInput.fill('{"updated": "value", "timestamp": "' + Date.now() + '"}');
    
    // Submit changes
    await page.getByRole('button', { name: /save|update/i }).click();
    
    // Should show success message
    await expect(page.getByText(/secret.*updated|changes.*saved/i)).toBeVisible();
  });

  test('should delete secret with confirmation', async () => {
    await createTestSecret(page, 'delete-test-secret');
    
    // Find and click delete button
    const secretRow = page.getByText('delete-test-secret').locator('..');
    await secretRow.getByRole('button', { name: /delete|remove/i }).click();
    
    // Should show confirmation dialog
    await expect(page.getByText(/confirm.*delete|are you sure/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /confirm|delete|yes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel|no/i })).toBeVisible();
    
    // Cancel first to test cancellation
    await page.getByRole('button', { name: /cancel|no/i }).click();
    
    // Secret should still be visible
    await expect(page.getByText('delete-test-secret')).toBeVisible();
    
    // Try delete again and confirm
    await secretRow.getByRole('button', { name: /delete|remove/i }).click();
    await page.getByRole('button', { name: /confirm|delete|yes/i }).click();
    
    // Should show success message and secret should be removed
    await expect(page.getByText(/secret.*deleted|deletion.*scheduled/i)).toBeVisible();
    await expect(page.getByText('delete-test-secret')).not.toBeVisible({ timeout: 5000 });
  });

  test('should filter and search secrets', async () => {
    // Create multiple test secrets
    await createTestSecret(page, 'production-secret');
    await createTestSecret(page, 'development-secret');
    await createTestSecret(page, 'staging-secret');
    
    // Use search functionality
    const searchInput = page.getByPlaceholder(/search|filter/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('production');
      
      // Should show only matching secrets
      await expect(page.getByText('production-secret')).toBeVisible();
      await expect(page.getByText('development-secret')).not.toBeVisible();
      await expect(page.getByText('staging-secret')).not.toBeVisible();
      
      // Clear search
      await searchInput.clear();
      await expect(page.getByText('development-secret')).toBeVisible();
    }
  });

  test('should handle pagination for large secret lists', async () => {
    // Check if pagination exists (may not be present with small data sets)
    const paginationControls = page.getByRole('navigation').getByText(/page|next|previous/i);
    
    if (await paginationControls.isVisible()) {
      // Test pagination navigation
      const nextButton = page.getByRole('button', { name: /next/i });
      if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
        await nextButton.click();
        
        // Should navigate to next page
        await expect(page).toHaveURL(/page=2|offset=/);
      }
    }
  });

  test('should handle network errors gracefully', async () => {
    // Simulate network error for secrets list
    await page.route('**/api/aws-secrets', route => route.abort('failed'));
    
    await page.reload();
    
    // Should show error state
    await expect(page.getByText(/error.*loading|failed.*load|network.*error/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible();
  });

  test('should validate JSON format for secret values', async () => {
    await page.getByRole('button', { name: /create.*secret|add.*secret/i }).click();
    
    // Fill basic info
    await page.getByLabel(/secret.*name|name/i).fill('json-validation-test');
    
    // Enter invalid JSON
    const valueInput = page.getByLabel(/value|secret.*value/i);
    await valueInput.fill('{ invalid json }');
    
    // Should show validation error for JSON
    await valueInput.blur();
    await expect(page.getByText(/invalid.*json|json.*format/i)).toBeVisible();
    
    // Enter valid JSON
    await valueInput.clear();
    await valueInput.fill('{"valid": "json", "number": 123}');
    await valueInput.blur();
    
    // Should not show error
    await expect(page.getByText(/invalid.*json|json.*format/i)).not.toBeVisible();
  });

  test('should handle AWS service errors', async () => {
    // Mock AWS service unavailable error
    await page.route('**/api/aws-secrets', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AWS Secrets Manager service unavailable' })
      });
    });
    
    await page.getByRole('button', { name: /create.*secret|add.*secret/i }).click();
    await page.getByLabel(/secret.*name|name/i).fill('aws-error-test');
    await page.getByLabel(/value|secret.*value/i).fill('test-value');
    await page.getByRole('button', { name: /create|save/i }).click();
    
    // Should show AWS service error
    await expect(page.getByText(/aws.*unavailable|service.*error/i)).toBeVisible();
  });
});

// Helper functions
async function authenticateUser(page: Page) {
  await page.goto('/');
  await page.getByLabel(/username|email/i).fill('testuser@example.com');
  await page.getByLabel(/password/i).fill('testpassword123');
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function createTestSecret(page: Page, secretName: string) {
  await page.getByRole('button', { name: /create.*secret|add.*secret/i }).click();
  await page.getByLabel(/secret.*name|name/i).fill(secretName);
  await page.getByLabel(/description/i).fill(`E2E test secret: ${secretName}`);
  await page.getByLabel(/value|secret.*value/i).fill(`{"test": "value", "secret": "${secretName}"}`);
  await page.getByRole('button', { name: /create|save/i }).click();
  await expect(page.getByText(/secret.*created|success/i)).toBeVisible({ timeout: 10000 });
  await page.waitForSelector(`text=${secretName}`, { timeout: 5000 });
}