/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      // Authentication commands
      login(email?: string, password?: string): Chainable<void>;
      logout(): Chainable<void>;
      createTestUser(userOverrides?: any): Chainable<any>;

      // API commands
      setupApiInterceptors(): Chainable<void>;
      apiRequest(method: string, url: string, body?: any): Chainable<any>;
      createDocument(documentData: any): Chainable<any>;
      updateDocument(id: string, updates: any): Chainable<any>;
      deleteDocument(id: string): Chainable<void>;

      // UI interaction commands
      fillForm(formData: Record<string, string>): Chainable<void>;
      waitForSpinner(): Chainable<void>;
      clickOutside(): Chainable<void>;
      uploadFile(fileName: string, selector?: string): Chainable<void>;

      // Accessibility commands
      checkA11y(context?: any, options?: any): Chainable<void>;

      // Mobile and responsive commands
      setMobileViewport(): Chainable<void>;
      setTabletViewport(): Chainable<void>;
      setDesktopViewport(): Chainable<void>;

      // PWA commands
      installPWA(): Chainable<void>;
      checkOfflineMode(): Chainable<void>;

      // Camera and location commands
      mockGeolocation(latitude?: number, longitude?: number): Chainable<void>;
      mockCamera(): Chainable<void>;

      // Performance commands
      measurePerformance(): Chainable<any>;
      waitForPageLoad(): Chainable<void>;
    }
  }
}

// Authentication Commands
Cypress.Commands.add('login', (email = 'test@candlefish.ai', password = `test-${Math.random().toString(36).substr(2, 9)}`) => {
  cy.session([email, password], () => {
    cy.visit('/login');

    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();

    // Wait for successful login
    cy.url().should('not.include', '/login');
    cy.get('[data-testid="user-menu"]').should('be.visible');

    // Store auth token if available
    cy.window().then((win) => {
      const token = win.localStorage.getItem('authToken');
      if (token) {
        cy.wrap(token).as('authToken');
      }
    });
  });
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();

  // Verify logout
  cy.url().should('include', '/login');
  cy.get('[data-testid="login-form"]').should('be.visible');
});

Cypress.Commands.add('createTestUser', (userOverrides = {}) => {
  const userData = {
    name: 'Test User',
    email: `test+${Date.now()}@candlefish.ai`,
    password: 'test-password-123',
    organizationId: 'test-org-1',
    ...userOverrides,
  };

  cy.apiRequest('POST', '/api/users', userData).then((response) => {
    cy.wrap(response.body).as('testUser');
  });
});

// API Commands
Cypress.Commands.add('setupApiInterceptors', () => {
  // Intercept common API calls
  cy.intercept('GET', '/api/documents*', { fixture: 'documents.json' }).as('getDocuments');
  cy.intercept('POST', '/api/documents', { fixture: 'document.json' }).as('createDocument');
  cy.intercept('PUT', '/api/documents/*', { fixture: 'document.json' }).as('updateDocument');
  cy.intercept('DELETE', '/api/documents/*', { statusCode: 204 }).as('deleteDocument');

  // Intercept GraphQL
  cy.intercept('POST', '/graphql', (req) => {
    if (req.body.operationName === 'GetDocuments') {
      req.reply({ fixture: 'graphql/documents.json' });
    }
    if (req.body.operationName === 'CreateDocument') {
      req.reply({ fixture: 'graphql/document.json' });
    }
  }).as('graphqlRequest');

  // Intercept auth endpoints
  cy.intercept('POST', '/api/auth/login', { fixture: 'auth/login-success.json' }).as('login');
  cy.intercept('GET', '/api/auth/me', { fixture: 'auth/user.json' }).as('getCurrentUser');
});

Cypress.Commands.add('apiRequest', (method: string, url: string, body?: any) => {
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${url}`,
    body,
    headers: {
      'Authorization': `Bearer ${Cypress.env('authToken')}`,
      'Content-Type': 'application/json',
    },
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('createDocument', (documentData) => {
  return cy.apiRequest('POST', '/api/documents', {
    title: 'Test Document',
    content: 'Test content',
    organizationId: 'test-org-1',
    ...documentData,
  });
});

Cypress.Commands.add('updateDocument', (id: string, updates: any) => {
  return cy.apiRequest('PUT', `/api/documents/${id}`, updates);
});

Cypress.Commands.add('deleteDocument', (id: string) => {
  return cy.apiRequest('DELETE', `/api/documents/${id}`);
});

// UI Interaction Commands
Cypress.Commands.add('fillForm', (formData: Record<string, string>) => {
  Object.entries(formData).forEach(([field, value]) => {
    cy.get(`[data-testid="${field}-input"], [name="${field}"], #${field}`)
      .clear()
      .type(value);
  });
});

Cypress.Commands.add('waitForSpinner', () => {
  cy.get('[data-testid="loading-spinner"], .loading-spinner', { timeout: 1000 }).should('not.exist');
});

Cypress.Commands.add('clickOutside', () => {
  cy.get('body').click(0, 0);
});

Cypress.Commands.add('uploadFile', (fileName: string, selector = 'input[type="file"]') => {
  cy.get(selector).selectFile(`cypress/fixtures/files/${fileName}`, { force: true });
});

// Accessibility Commands
Cypress.Commands.add('checkA11y', (context, options) => {
  cy.checkA11y(context, options, (violations) => {
    violations.forEach((violation) => {
      cy.log(`A11Y Violation: ${violation.description}`);
      violation.nodes.forEach((node) => {
        cy.log(`Element: ${node.target.join(' ')}`);
        cy.log(`Fix: ${node.failureSummary}`);
      });
    });
  });
});

// Responsive Commands
Cypress.Commands.add('setMobileViewport', () => {
  cy.viewport(375, 667); // iPhone SE
});

Cypress.Commands.add('setTabletViewport', () => {
  cy.viewport(768, 1024); // iPad
});

Cypress.Commands.add('setDesktopViewport', () => {
  cy.viewport(1280, 720); // Desktop
});

// PWA Commands
Cypress.Commands.add('installPWA', () => {
  cy.window().then((win) => {
    // Simulate PWA install prompt
    const installPromptEvent = new Event('beforeinstallprompt');
    win.dispatchEvent(installPromptEvent);
  });
});

Cypress.Commands.add('checkOfflineMode', () => {
  cy.window().then((win) => {
    // Go offline
    cy.wrap(win.navigator).invoke('dispatchEvent', new Event('offline'));

    // Check offline indicator
    cy.get('[data-testid="offline-indicator"]').should('be.visible');

    // Go back online
    cy.wrap(win.navigator).invoke('dispatchEvent', new Event('online'));

    // Check online indicator
    cy.get('[data-testid="offline-indicator"]').should('not.be.visible');
  });
});

// Mock Browser APIs
Cypress.Commands.add('mockGeolocation', (latitude = 37.7749, longitude = -122.4194) => {
  cy.window().then((win) => {
    cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success) => {
      return success({
        coords: {
          latitude,
          longitude,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    });
  });
});

Cypress.Commands.add('mockCamera', () => {
  cy.window().then((win) => {
    const mockStream = {
      getVideoTracks: () => [{
        stop: cy.stub(),
        getSettings: () => ({ width: 640, height: 480 }),
      }],
      getTracks: () => [{
        stop: cy.stub(),
      }],
    };

    cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves(mockStream);
  });
});

// Performance Commands
Cypress.Commands.add('measurePerformance', () => {
  return cy.window().then((win) => {
    const perfEntries = win.performance.getEntriesByType('navigation');
    const [entry] = perfEntries as PerformanceNavigationTiming[];

    return {
      loadTime: entry.loadEventEnd - entry.loadEventStart,
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      firstPaint: win.performance.getEntriesByType('paint')[0]?.startTime || 0,
      transferSize: entry.transferSize,
    };
  });
});

Cypress.Commands.add('waitForPageLoad', () => {
  cy.window().should('have.property', 'document');
  cy.document().should('have.property', 'readyState', 'complete');
  cy.waitForSpinner();
});

// Add custom command for waiting for network requests
Cypress.Commands.add('waitForNetworkIdle', (timeout = 2000) => {
  let requestCount = 0;

  cy.intercept('**', (req) => {
    requestCount++;
    req.reply((res) => {
      requestCount--;
      res.send();
    });
  });

  cy.then(() => {
    return new Cypress.Promise((resolve) => {
      const checkIdle = () => {
        if (requestCount === 0) {
          resolve(undefined);
        } else {
          setTimeout(checkIdle, 100);
        }
      };

      setTimeout(checkIdle, timeout);
    });
  });
});

export {};
