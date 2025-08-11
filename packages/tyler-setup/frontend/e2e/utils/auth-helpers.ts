import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'employee';
}

/**
 * Login helper function for E2E tests
 */
export async function login(page: Page, user: TestUser) {
  await page.goto('/login');

  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');

  // Wait for successful login redirect
  await page.waitForURL('/dashboard');
}

/**
 * Logout helper function for E2E tests
 */
export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');

  // Wait for logout redirect
  await page.waitForURL('/login');
}

/**
 * Create a test user via API
 */
export async function createTestUser(user: TestUser) {
  const apiUrl = process.env.TEST_API_URL || 'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod';

  try {
    const response = await fetch(`${apiUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        email: user.email,
        name: user.name,
        role: user.role,
        password: user.password,
        isTestUser: true, // Flag for easy cleanup
      }),
    });

    if (!response.ok && response.status !== 409) {
      // 409 = user already exists, which is fine
      throw new Error(`Failed to create test user: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to create test user:', error);
    // Don't fail the test if user creation fails - user might already exist
  }
}

/**
 * Cleanup test user via API
 */
export async function cleanupTestUser(email: string) {
  const apiUrl = process.env.TEST_API_URL || 'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod';

  try {
    // First find the user
    const getUserResponse = await fetch(`${apiUrl}/users?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
    });

    if (getUserResponse.ok) {
      const userData = await getUserResponse.json();
      if (userData.data && userData.data.length > 0) {
        const userId = userData.data[0].id;

        // Delete the user
        await fetch(`${apiUrl}/users/${userId}?force=true`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
          },
        });
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup test user:', error);
    // Don't fail tests if cleanup fails
  }
}

/**
 * Create a test contractor via API
 */
export async function createTestContractor(contractorData: any) {
  const apiUrl = process.env.TEST_API_URL || 'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod';

  try {
    const response = await fetch(`${apiUrl}/contractors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        ...contractorData,
        isTestData: true, // Flag for cleanup
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create test contractor: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to create test contractor:', error);
    return null;
  }
}

/**
 * Cleanup test contractors via API
 */
export async function cleanupTestContractors() {
  const apiUrl = process.env.TEST_API_URL || 'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod';

  try {
    // Get all test contractors
    const response = await fetch(`${apiUrl}/contractors?isTestData=true`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
    });

    if (response.ok) {
      const contractorsData = await response.json();
      if (contractorsData.data && contractorsData.data.contractors) {
        // Delete each test contractor
        const deletePromises = contractorsData.data.contractors.map((contractor: any) =>
          fetch(`${apiUrl}/contractors/${contractor.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
            },
          })
        );

        await Promise.all(deletePromises);
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup test contractors:', error);
  }
}

/**
 * Create a test secret via API
 */
export async function createTestSecret(secretData: any) {
  const apiUrl = process.env.TEST_API_URL || 'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod';

  try {
    const response = await fetch(`${apiUrl}/secrets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        ...secretData,
        name: `test-${secretData.name}-${Date.now()}`, // Unique test name
        tags: [...(secretData.tags || []), 'e2e-test'], // Add test tag
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create test secret: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to create test secret:', error);
    return null;
  }
}

/**
 * Cleanup test secrets via API
 */
export async function cleanupTestSecrets() {
  const apiUrl = process.env.TEST_API_URL || 'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod';

  try {
    // Get all test secrets
    const response = await fetch(`${apiUrl}/secrets?tag=e2e-test`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
      },
    });

    if (response.ok) {
      const secretsData = await response.json();
      if (secretsData.data) {
        // Delete each test secret
        const deletePromises = secretsData.data.map((secret: any) =>
          fetch(`${apiUrl}/secrets/${secret.id}?force=true`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
            },
          })
        );

        await Promise.all(deletePromises);
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup test secrets:', error);
  }
}

/**
 * Wait for element to be visible with timeout
 */
export async function waitForElement(page: Page, selector: string, timeout: number = 10000) {
  return await page.waitForSelector(selector, {
    state: 'visible',
    timeout
  });
}

/**
 * Fill form and submit
 */
export async function fillAndSubmitForm(page: Page, formData: Record<string, string>, submitButtonSelector: string) {
  for (const [field, value] of Object.entries(formData)) {
    await page.fill(`[data-testid="${field}-input"]`, value);
  }

  await page.click(submitButtonSelector);
}

/**
 * Check if user has specific role permissions
 */
export async function hasPermission(page: Page, permission: string): Promise<boolean> {
  try {
    // Check if elements requiring this permission are visible
    const permissionElements = await page.locator(`[data-permission="${permission}"]`).count();
    return permissionElements > 0;
  } catch {
    return false;
  }
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);

  return {
    email: `test-${randomId}@example.com`,
    name: `Test User ${randomId}`,
    company: `Test Company ${randomId}`,
    phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    timestamp,
    randomId,
  };
}

/**
 * Take screenshot for debugging
 */
export async function takeDebugScreenshot(page: Page, name: string) {
  if (process.env.DEBUG_SCREENSHOTS === 'true') {
    await page.screenshot({
      path: `e2e/debug-screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }
}

/**
 * Mock GraphQL responses for testing
 */
export async function mockGraphQLResponse(page: Page, operation: string, response: any) {
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    const postData = request.postData();

    if (postData && postData.includes(operation)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: response }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Wait for network idle (no requests for specified duration)
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 2000) {
  await page.waitForLoadState('networkidle', { timeout });
}
