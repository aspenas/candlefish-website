/// <reference types="cypress" />

// Custom commands for security dashboard testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with test user
       * @example cy.login()
       * @example cy.login('admin')
       */
      login(userType?: 'admin' | 'analyst'): Chainable<void>;
      
      /**
       * Navigate to a specific page with authentication
       */
      navigateAuthenticated(path: string): Chainable<void>;
      
      /**
       * Wait for GraphQL response
       */
      waitForGraphQL(operationName: string, alias?: string): Chainable<void>;
      
      /**
       * Mock GraphQL operation
       */
      mockGraphQL(operationName: string, response: any): Chainable<void>;
      
      /**
       * Generate and create test security event
       */
      createTestSecurityEvent(eventData?: Partial<SecurityEvent>): Chainable<void>;
      
      /**
       * Create test incident
       */
      createTestIncident(incidentData?: Partial<Incident>): Chainable<void>;
      
      /**
       * Wait for real-time updates via WebSocket
       */
      waitForRealTimeUpdate(eventType: string): Chainable<void>;
      
      /**
       * Check accessibility
       */
      checkA11y(context?: string, options?: any): Chainable<void>;
      
      /**
       * Test drag and drop functionality
       */
      dragAndDrop(sourceSelector: string, targetSelector: string): Chainable<void>;
      
      /**
       * Wait for loading states to complete
       */
      waitForLoadingToComplete(): Chainable<void>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (userType: 'admin' | 'analyst' = 'analyst') => {
  const user = userType === 'admin' ? Cypress.env('adminUser') : Cypress.env('testUser');
  
  cy.session([user.email, user.role], () => {
    cy.visit('/login');
    cy.get('[data-testid=\"email-input\"]').type(user.email);
    cy.get('[data-testid=\"password-input\"]').type(user.password);
    cy.get('[data-testid=\"login-button\"]').click();
    
    // Wait for authentication to complete
    cy.url().should('not.include', '/login');
    cy.get('[data-testid=\"user-menu\"]').should('be.visible');
    
    // Store auth token
    cy.window().its('localStorage').then((localStorage) => {
      const authToken = localStorage.getItem('authToken');
      expect(authToken).to.exist;
    });
  });
});

// Navigate with authentication
Cypress.Commands.add('navigateAuthenticated', (path: string) => {
  cy.login();
  cy.visit(path);
});

// GraphQL utilities
Cypress.Commands.add('waitForGraphQL', (operationName: string, alias?: string) => {
  const aliasName = alias || `gql${operationName}`;
  cy.intercept('POST', Cypress.env('apiUrl'), (req) => {
    if (req.body.operationName === operationName) {
      req.alias = aliasName;
    }
  });
  cy.wait(`@${aliasName}`);
});

Cypress.Commands.add('mockGraphQL', (operationName: string, response: any) => {
  cy.intercept('POST', Cypress.env('apiUrl'), (req) => {
    if (req.body.operationName === operationName) {
      req.reply(response);
    }
  }).as(`mock${operationName}`);
});

// Test data creation
Cypress.Commands.add('createTestSecurityEvent', (eventData: Partial<any> = {}) => {
  const defaultEvent = {
    type: 'MALWARE_DETECTED',
    severity: 'HIGH',
    source: '192.168.1.100',
    description: 'Test malware detection for E2E testing',
    mitre_tactics: ['Initial Access'],
    mitre_techniques: ['T1566.001'],
  };
  
  const event = { ...defaultEvent, ...eventData };
  
  cy.request({
    method: 'POST',
    url: Cypress.env('apiUrl'),
    body: {
      query: `
        mutation CreateSecurityEvent($input: SecurityEventInput!) {
          createSecurityEvent(input: $input) {
            id
            type
            severity
            description
          }
        }
      `,
      variables: { input: event },
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

Cypress.Commands.add('createTestIncident', (incidentData: Partial<any> = {}) => {
  const defaultIncident = {
    title: 'Test Security Incident',
    description: 'E2E test incident for automated testing',
    severity: 'HIGH',
    tags: ['e2e-test', 'automated'],
  };
  
  const incident = { ...defaultIncident, ...incidentData };
  
  cy.request({
    method: 'POST',
    url: Cypress.env('apiUrl'),
    body: {
      query: `
        mutation CreateIncident($input: IncidentInput!) {
          createIncident(input: $input) {
            id
            title
            severity
            status
          }
        }
      `,
      variables: { input: incident },
    },
  });
});

// Real-time testing
Cypress.Commands.add('waitForRealTimeUpdate', (eventType: string) => {
  // Mock WebSocket connection for testing
  cy.window().then((win) => {
    return new Promise((resolve) => {
      const mockSocket = {
        on: (event: string, callback: Function) => {
          if (event === eventType) {
            setTimeout(() => {
              callback({
                id: 'test-realtime-event',
                type: eventType,
                timestamp: new Date().toISOString(),
              });
              resolve(true);
            }, 1000);
          }
        },
      };
      
      // Replace socket instance
      (win as any).mockSocket = mockSocket;
    });
  });
});

// Accessibility testing
Cypress.Commands.add('checkA11y', (context?: string, options?: any) => {
  cy.injectAxe();
  cy.checkA11y(context, options, (violations) => {
    violations.forEach((violation) => {
      Cypress.log({
        name: 'a11y violation',
        consoleProps: () => violation,
        message: `${violation.nodes.length} violation(s) detected for rule: ${violation.id}`,
      });
    });
  });
});

// Drag and drop utility
Cypress.Commands.add('dragAndDrop', (sourceSelector: string, targetSelector: string) => {
  cy.get(sourceSelector).trigger('mousedown', { button: 0 });
  cy.get(targetSelector).trigger('mousemove').trigger('mouseup');
});

// Loading state management
Cypress.Commands.add('waitForLoadingToComplete', () => {
  // Wait for loading spinners to disappear
  cy.get('[data-testid=\"loading-spinner\"]').should('not.exist');
  cy.get('[data-testid=\"loading-skeleton\"]').should('not.exist');
  
  // Wait for content to be visible
  cy.get('[data-testid=\"main-content\"]').should('be.visible');
});

// Custom assertions
chai.Assertion.addMethod('toBeAccessible', function () {
  const subject = this._obj;
  
  return cy.wrap(subject).then(($element) => {
    return cy.checkA11y($element[0]);
  });
});

// Performance monitoring
Cypress.Commands.add('measurePerformance', (operationName: string) => {
  cy.window().then((win) => {
    win.performance.mark(`${operationName}-start`);
  });
  
  return {
    end: () => {
      cy.window().then((win) => {
        win.performance.mark(`${operationName}-end`);
        win.performance.measure(
          operationName,
          `${operationName}-start`,
          `${operationName}-end`
        );
        
        const measure = win.performance.getEntriesByName(operationName)[0];
        cy.log(`${operationName} took ${measure.duration}ms`);
        
        // Assert performance thresholds
        expect(measure.duration).to.be.lessThan(5000); // 5 seconds max
      });
    },
  };
});

// Visual regression testing support
Cypress.Commands.add('compareSnapshot', (name: string, options: any = {}) => {
  const defaultOptions = {
    threshold: 0.1,
    thresholdType: 'percent',
  };
  
  cy.task('log', `Taking snapshot: ${name}`);
  return cy.matchImageSnapshot(name, { ...defaultOptions, ...options });
});

// Database utilities
Cypress.Commands.add('seedTestData', () => {
  cy.task('seedDatabase');
});

Cypress.Commands.add('cleanTestData', () => {
  cy.task('cleanDatabase');
});

// Mock external APIs
Cypress.Commands.add('mockExternalAPIs', () => {
  // Mock threat intelligence APIs
  cy.intercept('GET', '**/threat-intelligence/**', {
    fixture: 'threat-intelligence.json',
  }).as('threatIntelAPI');
  
  // Mock MITRE ATT&CK API
  cy.intercept('GET', '**/mitre-attack/**', {
    fixture: 'mitre-attack.json',
  }).as('mitreAPI');
  
  // Mock geolocation services
  cy.intercept('GET', '**/geolocation/**', {
    fixture: 'geolocation.json',
  }).as('geolocationAPI');
});

export {};

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  description: string;
  mitre_tactics: string[];
  mitre_techniques: string[];
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  tags: string[];
}