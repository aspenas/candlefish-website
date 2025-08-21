describe('Assessment Form E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/assessment')
    cy.get('[data-testid="assessment-form"], form').as('assessmentForm')
  })

  describe('Assessment Flow', () => {
    it('displays assessment introduction', () => {
      cy.contains('AI Automation Maturity Assessment').should('be.visible')
      cy.contains('5 minutes').should('be.visible')
      cy.contains('8 questions').should('be.visible')
    })

    it('shows progress indicators', () => {
      cy.get('[role="progressbar"]').should('be.visible')
      cy.contains('Step 1 of').should('be.visible')
    })

    it('starts with first question', () => {
      cy.contains('Question 1 of 8').should('be.visible')
      cy.get('[type="radio"]').should('have.length.greaterThan', 0)
    })

    it('disables Next button when no answer selected', () => {
      cy.get('button').contains(/Next/i).should('be.disabled')
    })

    it('enables Next button when answer is selected', () => {
      cy.get('[type="radio"]').first().check()
      cy.get('button').contains(/Next/i).should('not.be.disabled')
    })
  })

  describe('Question Navigation', () => {
    it('advances through all questions', () => {
      // Answer all 8 questions
      for (let i = 1; i <= 8; i++) {
        cy.contains(`Question ${i} of 8`).should('be.visible')

        // Select first available option
        cy.get('[type="radio"], [type="checkbox"]').first().check()

        // Click Next
        cy.get('button').contains(/Next/i).click()
      }

      // Should reach contact form
      cy.contains('Get Your Personalized Results').should('be.visible')
    })

    it('allows going back to previous questions', () => {
      // Answer first question and go to second
      cy.get('[type="radio"]').first().check()
      cy.get('button').contains(/Next/i).click()

      // Go back
      cy.get('button').contains(/Back/i).click()

      // Should be back to first question
      cy.contains('Question 1 of 8').should('be.visible')
    })

    it('preserves answers when navigating', () => {
      // Select and remember first option
      cy.get('[type="radio"]').first().as('firstOption')
      cy.get('@firstOption').check()

      // Navigate forward and back
      cy.get('button').contains(/Next/i).click()
      cy.get('button').contains(/Back/i).click()

      // First option should still be selected
      cy.get('@firstOption').should('be.checked')
    })
  })

  describe('Multiple Choice Questions', () => {
    it('handles multiple choice questions correctly', () => {
      // Navigate to question 3 (multiple choice)
      for (let i = 0; i < 2; i++) {
        cy.get('[type="radio"]').first().check()
        cy.get('button').contains(/Next/i).click()
      }

      // Should have checkboxes for multiple choice
      cy.get('[type="checkbox"]').should('have.length.greaterThan', 0)

      // Should allow multiple selections
      cy.get('[type="checkbox"]').first().check()
      cy.get('[type="checkbox"]').eq(1).check()

      cy.get('[type="checkbox"]:checked').should('have.length', 2)
    })
  })

  describe('Contact Information', () => {
    beforeEach(() => {
      // Navigate to contact step
      cy.completeAssessment()
    })

    it('displays contact form', () => {
      cy.contains('Get Your Personalized Results').should('be.visible')
      cy.get('input[name*="firstName"], label:contains("First Name") + input').should('be.visible')
      cy.get('input[name*="lastName"], label:contains("Last Name") + input').should('be.visible')
      cy.get('input[type="email"], input[name*="email"]').should('be.visible')
    })

    it('validates required fields', () => {
      cy.get('button').contains(/Get Results/i).click()

      // Should show validation errors
      cy.contains('This field is required').should('be.visible')
    })

    it('validates email format', () => {
      cy.fillContactForm('John', 'Doe', 'invalid-email')

      cy.get('input[type="email"], input[name*="email"]').blur()
      cy.contains('Please enter a valid email address').should('be.visible')
    })

    it('submits form with valid data', () => {
      cy.fillContactForm('John', 'Doe', 'john@example.com', 'Test Company')

      cy.get('button').contains(/Get Results/i).should('not.be.disabled')
      cy.get('button').contains(/Get Results/i).click()

      // Should show loading state
      cy.get('[role="img"]').should('be.visible') // Loading spinner
    })
  })

  describe('Results Display', () => {
    beforeEach(() => {
      // Complete entire assessment
      cy.completeAssessment()
      cy.fillContactForm('John', 'Doe', 'john@example.com')
      cy.get('button').contains(/Get Results/i).click()
    })

    it('displays results after submission', () => {
      cy.contains('Your AI Automation Maturity Results', { timeout: 10000 }).should('be.visible')
      cy.contains('Overall Maturity Score').should('be.visible')
    })

    it('shows category breakdown', () => {
      cy.contains('Process Maturity').should('be.visible')
      cy.contains('Technology Readiness').should('be.visible')
      cy.contains('Data Quality').should('be.visible')
      cy.contains('Change Readiness').should('be.visible')
    })

    it('displays ROI estimates', () => {
      cy.contains('Estimated ROI Potential').should('be.visible')
      cy.contains('Payback Period').should('be.visible')
      cy.contains('Annual Savings').should('be.visible')
      cy.contains('Efficiency Gain').should('be.visible')
    })

    it('shows next steps and CTAs', () => {
      cy.contains('Recommended Next Steps').should('be.visible')
      cy.contains('Schedule Free Consultation').should('be.visible')
      cy.contains('Download Detailed Report').should('be.visible')
    })

    it('CTA buttons are clickable', () => {
      cy.get('button').contains(/Schedule Free Consultation/i).should('be.visible').click()
      // Should trigger some action (navigation, modal, etc.)
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', () => {
      // Mock network failure
      cy.intercept('POST', '/api/v1/**', { forceNetworkError: true }).as('networkError')

      cy.completeAssessment()
      cy.fillContactForm('John', 'Doe', 'john@example.com')
      cy.get('button').contains(/Get Results/i).click()

      // Should handle error without crashing
      cy.get('body').should('be.visible')
    })
  })

  describe('Performance', () => {
    it('loads assessment quickly', () => {
      const start = Date.now()
      cy.visit('/assessment').then(() => {
        const loadTime = Date.now() - start
        expect(loadTime).to.be.lessThan(2000) // 2 seconds
      })
    })

    it('responds quickly to user interactions', () => {
      cy.get('[type="radio"]').first().check()
      cy.get('button').contains(/Next/i).should('not.be.disabled')

      // Interaction should be immediate
      cy.get('button').contains(/Next/i).click()
      cy.contains('Question 2 of 8').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('supports keyboard navigation', () => {
      // Tab through form elements - using trigger as tab() is not a native command
      cy.get('body').trigger('keydown', { keyCode: 9, which: 9 })
      cy.focused().should('be.visible')

      // Should be able to navigate to radio buttons
      cy.get('[type="radio"]').first().focus()
      cy.focused().should('have.attr', 'type', 'radio')
    })

    it('has proper ARIA labels', () => {
      cy.get('[role="progressbar"]').should('exist')
      cy.get('input[required]').each($input => {
        // Required inputs should have proper labeling
        cy.wrap($input).should('have.attr', 'aria-invalid')
      })
    })

    it('provides screen reader friendly content', () => {
      cy.get('label').should('have.length.greaterThan', 0)
      cy.get('h1, h2, h3').should('exist') // Proper heading structure
    })
  })
})
