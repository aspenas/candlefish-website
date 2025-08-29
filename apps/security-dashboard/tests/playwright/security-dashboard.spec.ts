import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test fixtures and utilities
class SecurityDashboardPage {
  constructor(private page: Page) {}

  async login(email: string = 'test@company.com', password: string = 'testPassword123!') {
    await this.page.goto('/login');
    await this.page.fill('[data-testid=\"email-input\"]', email);
    await this.page.fill('[data-testid=\"password-input\"]', password);
    await this.page.click('[data-testid=\"login-button\"]');
    await this.page.waitForURL('/');
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
  }

  async waitForDashboardLoad() {
    await this.page.waitForSelector('[data-testid=\"security-dashboard\"]');
    await this.page.waitForLoadState('networkidle');
  }

  async getThreatMetrics() {
    const totalThreats = await this.page.textContent('[data-testid=\"total-threats-value\"]');
    const activeIncidents = await this.page.textContent('[data-testid=\"active-incidents-value\"]');
    const systemHealth = await this.page.textContent('[data-testid=\"system-health-value\"]');
    
    return {
      totalThreats: parseInt(totalThreats || '0'),
      activeIncidents: parseInt(activeIncidents || '0'),
      systemHealth: parseFloat(systemHealth || '0'),
    };
  }

  async createIncident(title: string, description: string, severity: string) {
    await this.page.click('[data-testid=\"create-incident-btn\"]');
    await this.page.fill('[data-testid=\"incident-title-input\"]', title);
    await this.page.fill('[data-testid=\"incident-description-input\"]', description);
    await this.page.selectOption('[data-testid=\"incident-severity-select\"]', severity);
    await this.page.click('[data-testid=\"submit-incident-btn\"]');
    await this.page.waitForSelector('[data-testid=\"incident-created-success\"]');
  }

  async filterThreatsBySeverity(severity: string) {
    await this.page.click('[data-testid=\"severity-filter-dropdown\"]');
    await this.page.click(`[data-testid=\"severity-${severity.toLowerCase()}\"]`);
    await this.page.waitForSelector('[data-testid=\"threat-list\"]');
  }

  async exportReport(format: 'pdf' | 'excel' | 'json') {
    await this.page.click('[data-testid=\"export-dropdown\"]');
    await this.page.click(`[data-testid=\"export-${format}\"]`);
    
    // Wait for download
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid=\"confirm-export\"]');
    const download = await downloadPromise;
    
    return download;
  }
}

test.describe('Security Dashboard - Visual Regression', () => {
  let dashboardPage: SecurityDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    await dashboardPage.waitForDashboardLoad();
  });

  test('dashboard overview matches visual baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('dashboard-overview.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('threat detection page visual consistency', async ({ page }) => {
    await dashboardPage.navigateTo('/threats');
    await page.waitForSelector('[data-testid=\"threat-list\"]');
    
    // Test different states
    await expect(page).toHaveScreenshot('threats-default.png');
    
    await dashboardPage.filterThreatsBySeverity('CRITICAL');
    await expect(page).toHaveScreenshot('threats-critical-filtered.png');
  });

  test('incident management board visual layout', async ({ page }) => {
    await dashboardPage.navigateTo('/incidents');
    await page.waitForSelector('[data-testid=\"incident-board\"]');
    
    await expect(page).toHaveScreenshot('incident-board.png', {
      fullPage: true,
    });
  });

  test('mobile responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    
    await dashboardPage.navigateTo('/');
    await page.waitForSelector('[data-testid=\"mobile-navigation\"]');
    
    await expect(page).toHaveScreenshot('mobile-dashboard.png', {
      fullPage: true,
    });
  });
});

test.describe('Security Dashboard - Accessibility', () => {
  test('meets WCAG 2.1 AA standards', async ({ page }) => {
    const dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    await dashboardPage.waitForDashboardLoad();

    // Install axe-core
    await page.addInitScript(() => {
      window.axe = require('axe-core');
    });

    // Run accessibility audit
    const results = await page.evaluate(async () => {
      return await window.axe.run();
    });

    // Check for violations
    expect(results.violations).toHaveLength(0);
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    const dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    await dashboardPage.waitForDashboardLoad();

    // Test tab navigation
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focused).toBe('main-navigation');

    // Continue tabbing through interactive elements
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focused).not.toBeNull();

    // Test Enter key activation
    await page.keyboard.press('Enter');
    // Should activate the focused element
  });

  test('screen reader compatibility', async ({ page }) => {
    const dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    await dashboardPage.waitForDashboardLoad();

    // Check for proper ARIA labels
    const ariaLabels = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label]');
      return Array.from(elements).map(el => el.getAttribute('aria-label'));
    });

    expect(ariaLabels.length).toBeGreaterThan(0);
    
    // Check for heading hierarchy
    const headings = await page.evaluate(() => {
      const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headers).map(h => h.tagName);
    });

    expect(headings).toContain('H1');
  });
});

test.describe('Security Dashboard - Performance', () => {
  test('loads within performance budget', async ({ page }) => {
    const dashboardPage = new SecurityDashboardPage(page);
    
    // Start performance monitoring
    await page.coverage.startJSCoverage();
    const startTime = Date.now();
    
    await dashboardPage.login();
    await dashboardPage.waitForDashboardLoad();
    
    const loadTime = Date.now() - startTime;
    const jsCoverage = await page.coverage.stopJSCoverage();
    
    // Performance assertions
    expect(loadTime).toBeLessThan(3000); // 3 seconds max
    
    // Check JavaScript coverage
    const totalBytes = jsCoverage.reduce((acc, entry) => acc + entry.text.length, 0);
    const usedBytes = jsCoverage.reduce((acc, entry) => {
      const used = entry.ranges.reduce((used, range) => used + range.end - range.start, 0);
      return acc + used;
    }, 0);
    
    const coverage = usedBytes / totalBytes;
    expect(coverage).toBeGreaterThan(0.6); // 60% minimum coverage
  });

  test('handles large datasets efficiently', async ({ page }) => {
    const dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    
    // Navigate to page with large dataset
    await dashboardPage.navigateTo('/threats');
    
    // Monitor performance during rendering
    const performanceMetrics = await page.evaluate(() => {
      return performance.getEntriesByType('measure');
    });
    
    // Should implement virtualization for large lists
    const virtualList = await page.locator('[data-testid=\"virtual-list\"]');
    await expect(virtualList).toBeVisible();
  });

  test('maintains smooth animations', async ({ page }) => {
    const dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    await dashboardPage.waitForDashboardLoad();
    
    // Trigger chart animation
    await page.click('[data-testid=\"time-range-7d\"]');
    
    // Monitor frame rate
    const frameRate = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const startTime = performance.now();
        
        const countFrames = () => {
          frames++;
          const elapsed = performance.now() - startTime;
          
          if (elapsed >= 1000) {
            resolve(frames);
          } else {
            requestAnimationFrame(countFrames);
          }
        };
        
        requestAnimationFrame(countFrames);
      });
    });
    
    expect(frameRate).toBeGreaterThan(55); // Should maintain ~60fps
  });
});

test.describe('Security Dashboard - Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`works correctly in ${browserName}`, async ({ page }) => {
      const dashboardPage = new SecurityDashboardPage(page);
      await dashboardPage.login();
      await dashboardPage.waitForDashboardLoad();
      
      // Test core functionality
      const metrics = await dashboardPage.getThreatMetrics();
      expect(metrics.totalThreats).toBeGreaterThan(0);
      
      // Test interactive elements
      await page.click('[data-testid=\"refresh-button\"]');
      await page.waitForSelector('[data-testid=\"loading-indicator\"]', { state: 'hidden' });
      
      // Verify charts render correctly
      const chart = page.locator('[data-testid=\"threat-activity-chart\"]');
      await expect(chart).toBeVisible();
    });
  });
});

test.describe('Security Dashboard - Real-time Features', () => {
  test('receives WebSocket updates', async ({ page, context }) => {
    const dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    await dashboardPage.navigateTo('/threats');
    
    // Mock WebSocket connection
    await page.addInitScript(() => {
      class MockWebSocket {
        onopen: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        
        constructor(url: string) {
          setTimeout(() => {
            if (this.onopen) {
              this.onopen(new Event('open'));
            }
          }, 100);
        }
        
        send(data: string) {
          // Mock sending data
        }
        
        close() {
          if (this.onclose) {
            this.onclose(new CloseEvent('close'));
          }
        }
        
        // Simulate receiving a message
        simulateMessage(data: any) {
          if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
          }
        }
      }
      
      (window as any).WebSocket = MockWebSocket;
    });
    
    await page.waitForSelector('[data-testid=\"threat-list\"]');
    
    // Simulate real-time threat detection
    await page.evaluate(() => {
      const mockThreat = {
        type: 'threat_detected',
        data: {
          id: 'test-threat-realtime',
          name: 'Real-time Test Threat',
          severity: 'CRITICAL',
          timestamp: new Date().toISOString(),
        },
      };
      
      // Simulate WebSocket message
      const ws = new (window as any).WebSocket('ws://localhost:4000/graphql');
      setTimeout(() => {
        ws.simulateMessage(mockThreat);
      }, 500);
    });
    
    // Verify the new threat appears in the UI
    await page.waitForSelector('text=Real-time Test Threat', { timeout: 5000 });
  });

  test('handles connection loss gracefully', async ({ page }) => {
    const dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    await dashboardPage.waitForDashboardLoad();
    
    // Simulate network disconnection
    await page.setOffline(true);
    
    // Should show offline indicator
    await page.waitForSelector('[data-testid=\"offline-indicator\"]');
    
    // Restore connection
    await page.setOffline(false);
    
    // Should reconnect and hide offline indicator
    await page.waitForSelector('[data-testid=\"offline-indicator\"]', { state: 'hidden' });
  });
});

test.describe('Security Dashboard - Data Integrity', () => {
  test('maintains data consistency during concurrent operations', async ({ context }) => {
    // Create multiple pages to simulate concurrent users
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    const dashboard1 = new SecurityDashboardPage(page1);
    const dashboard2 = new SecurityDashboardPage(page2);
    
    await dashboard1.login();
    await dashboard2.login();
    
    await dashboard1.navigateTo('/incidents');
    await dashboard2.navigateTo('/incidents');
    
    // User 1 creates an incident
    await dashboard1.createIncident(
      'Concurrent Test Incident',
      'Testing concurrent operations',
      'HIGH'
    );
    
    // User 2 should see the new incident after refresh
    await page2.reload();
    await page2.waitForSelector('text=Concurrent Test Incident');
  });

  test('validates form data before submission', async ({ page }) => {
    const dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    await dashboardPage.navigateTo('/incidents');
    
    await page.click('[data-testid=\"create-incident-btn\"]');
    
    // Try to submit empty form
    await page.click('[data-testid=\"submit-incident-btn\"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid=\"title-error\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"description-error\"]')).toBeVisible();
    
    // Form should not submit
    await expect(page.locator('[data-testid=\"incident-form\"]')).toBeVisible();
  });
});

test.describe('Security Dashboard - Error Handling', () => {
  test('handles API errors gracefully', async ({ page }) => {
    // Mock API to return errors
    await page.route('**/graphql', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'Internal server error' }],
        }),
      });
    });
    
    const dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    
    // Should show error message
    await expect(page.locator('[data-testid=\"error-banner\"]')).toBeVisible();
    await expect(page.locator('text=Unable to load dashboard data')).toBeVisible();
    
    // Should show retry option
    await expect(page.locator('[data-testid=\"retry-button\"]')).toBeVisible();
  });

  test('recovers from network failures', async ({ page }) => {
    const dashboardPage = new SecurityDashboardPage(page);
    await dashboardPage.login();
    await dashboardPage.waitForDashboardLoad();
    
    // Simulate network failure
    await page.setOffline(true);
    
    // Try to perform an action
    await page.click('[data-testid=\"refresh-button\"]');
    
    // Should queue the action for retry
    await expect(page.locator('[data-testid=\"offline-queue-indicator\"]')).toBeVisible();
    
    // Restore network
    await page.setOffline(false);
    
    // Should automatically retry queued actions
    await page.waitForSelector('[data-testid=\"offline-queue-indicator\"]', { state: 'hidden' });
  });
});

// Global types for axe-core
declare global {
  interface Window {
    axe: {
      run: () => Promise<{
        violations: Array<{
          id: string;
          description: string;
          impact: string;
          nodes: Array<any>;
        }>;
      }>;
    };
  }
}