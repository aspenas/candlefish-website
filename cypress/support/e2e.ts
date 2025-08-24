// Cypress E2E support file
import './commands';
import 'cypress-real-events/support';
import '@testing-library/cypress/add-commands';
import 'cypress-axe';

// Global configuration
Cypress.config('defaultCommandTimeout', 10000);
Cypress.config('requestTimeout', 10000);
Cypress.config('responseTimeout', 10000);

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent the test from failing
  // for certain types of expected errors

  // Ignore specific errors that might occur during testing
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }

  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }

  if (err.message.includes('ChunkLoadError')) {
    return false;
  }

  // Let other errors fail the test
  return true;
});

// Setup hooks
beforeEach(() => {
  // Clear browser data
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.clearAllSessionStorage();

  // Setup viewport
  cy.viewport(1280, 720);

  // Setup API interceptors
  cy.setupApiInterceptors();

  // Inject axe for accessibility testing
  cy.injectAxe();
});

afterEach(() => {
  // Cleanup after each test
  cy.task('cleanDatabase');
});

// Global error handling
Cypress.on('fail', (error, runnable) => {
  // Take screenshot on failure
  cy.screenshot(`${runnable.parent?.title}-${runnable.title}-failure`);

  // Log additional debug information
  cy.log('Test failed:', error.message);

  throw error;
});
