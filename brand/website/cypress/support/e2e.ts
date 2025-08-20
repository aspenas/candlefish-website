// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
Cypress.on('window:before:load', (win) => {
  cy.stub(win.console, 'error').as('consoleError')
  cy.stub(win.console, 'warn').as('consoleWarn')
})

// Add global before hook
beforeEach(() => {
  // Intercept API calls
  cy.intercept('GET', '/api/v1/**', { fixture: 'api-response.json' }).as('apiCall')
  
  // Set viewport for consistent testing
  cy.viewport(1280, 720)
})