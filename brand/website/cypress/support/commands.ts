/// <reference types="cypress" />

// Custom commands for Candlefish.ai website testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to complete assessment form
       * @example cy.completeAssessment(['option1', 'option2'])
       */
      completeAssessment(answers?: string[]): Chainable<void>
      
      /**
       * Custom command to fill contact form
       * @example cy.fillContactForm('John', 'Doe', 'john@example.com')
       */
      fillContactForm(firstName: string, lastName: string, email: string, company?: string): Chainable<void>
      
      /**
       * Custom command to check accessibility violations
       * @example cy.checkA11y()
       */
      checkA11y(): Chainable<void>
      
      /**
       * Custom command to test responsive design
       * @example cy.testResponsive()
       */
      testResponsive(): Chainable<void>
    }
  }
}

Cypress.Commands.add('completeAssessment', (answers = []) => {
  // Navigate through assessment questions
  for (let i = 0; i < 8; i++) {
    // Select first option for each question by default
    cy.get('[type="radio"], [type="checkbox"]').first().check()
    
    // Click next button
    cy.get('button').contains(/Next/i).click()
  }
})

Cypress.Commands.add('fillContactForm', (firstName: string, lastName: string, email: string, company?: string) => {
  cy.get('input[name="firstName"], label:contains("First Name") + input')
    .type(firstName)
  
  cy.get('input[name="lastName"], label:contains("Last Name") + input')
    .type(lastName)
  
  cy.get('input[name="email"], input[type="email"], label:contains("Email") + input')
    .type(email)
  
  if (company) {
    cy.get('input[name="company"], label:contains("Company") + input')
      .type(company)
  }
})

Cypress.Commands.add('checkA11y', () => {
  // Basic accessibility checks
  cy.get('h1').should('exist') // Page should have main heading
  cy.get('[alt=""]').should('not.exist') // No empty alt attributes
  cy.get('button, a').each($el => {
    // Interactive elements should be keyboard accessible
    cy.wrap($el).should('be.visible')
  })
})

Cypress.Commands.add('testResponsive', () => {
  const viewports = [
    { width: 375, height: 667 },   // Mobile
    { width: 768, height: 1024 },  // Tablet
    { width: 1280, height: 720 },  // Desktop
  ]
  
  viewports.forEach(viewport => {
    cy.viewport(viewport.width, viewport.height)
    cy.wait(500) // Allow for responsive adjustments
    
    // Check that main content is visible
    cy.get('main, [role="main"], body > div').should('be.visible')
    
    // Check that navigation is accessible
    cy.get('nav, [role="navigation"]').should('be.visible')
  })
})

export {}