import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { AssessmentForm } from '../../components/forms/AssessmentForm'
import { AssessmentResult, AssessmentAnswer } from '../../types/api'

// Mock the icons to avoid issues with SVG imports
jest.mock('@heroicons/react/24/outline', () => ({
  CheckCircleIcon: ({ className }: { className?: string }) => <div data-testid="check-circle-icon" className={className} />,
  ArrowRightIcon: ({ className }: { className?: string }) => <div data-testid="arrow-right-icon" className={className} />,
  ArrowLeftIcon: ({ className }: { className?: string }) => <div data-testid="arrow-left-icon" className={className} />,
}))

describe('AssessmentForm Component', () => {
  const mockOnComplete = jest.fn()
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('renders assessment form with header information', () => {
      render(<AssessmentForm />)
      
      expect(screen.getByText('AI Automation Maturity Assessment')).toBeInTheDocument()
      expect(screen.getByText(/Discover your automation readiness/)).toBeInTheDocument()
      expect(screen.getByText('5 minutes')).toBeInTheDocument()
      expect(screen.getByText('8 questions')).toBeInTheDocument()
      expect(screen.getByText('Personalized recommendations')).toBeInTheDocument()
    })

    it('displays progress indicators', () => {
      render(<AssessmentForm />)
      
      expect(screen.getByText('Step 1 of 10')).toBeInTheDocument()
      expect(screen.getByText('Questions')).toBeInTheDocument()
      expect(screen.getByText('Contact')).toBeInTheDocument()
      expect(screen.getByText('Analysis')).toBeInTheDocument()
      expect(screen.getByText('Results')).toBeInTheDocument()
    })

    it('renders first question with category badge', () => {
      render(<AssessmentForm />)
      
      expect(screen.getByText('Process Maturity')).toBeInTheDocument()
      expect(screen.getByText('Question 1 of 8')).toBeInTheDocument()
      expect(screen.getByText(/How would you describe your current process documentation/)).toBeInTheDocument()
    })

    it('renders answer options as radio buttons for single choice', () => {
      render(<AssessmentForm />)
      
      const radioButtons = screen.getAllByRole('radio')
      expect(radioButtons).toHaveLength(4) // First question has 4 options
      
      expect(screen.getByText(/Most processes are undocumented/)).toBeInTheDocument()
      expect(screen.getByText(/Some key processes are documented/)).toBeInTheDocument()
    })

    it('disables Next button initially when no answer selected', () => {
      render(<AssessmentForm />)
      
      const nextButton = screen.getByRole('button', { name: /Next/ })
      expect(nextButton).toBeDisabled()
    })

    it('disables Back button on first question', () => {
      render(<AssessmentForm />)
      
      const backButton = screen.getByRole('button', { name: /Back/ })
      expect(backButton).toBeDisabled()
    })
  })

  describe('Question Navigation', () => {
    it('enables Next button when answer is selected', async () => {
      render(<AssessmentForm />)
      
      const firstOption = screen.getAllByRole('radio')[0]
      await userEvent.click(firstOption)
      
      const nextButton = screen.getByRole('button', { name: /Next/ })
      expect(nextButton).not.toBeDisabled()
    })

    it('advances to next question when Next is clicked', async () => {
      render(<AssessmentForm />)
      
      // Answer first question
      const firstOption = screen.getAllByRole('radio')[0]
      await userEvent.click(firstOption)
      
      // Click Next
      const nextButton = screen.getByRole('button', { name: /Next/ })
      await userEvent.click(nextButton)
      
      // Should show second question
      expect(screen.getByText('Question 2 of 8')).toBeInTheDocument()
      expect(screen.getByText(/How consistent are your operational processes/)).toBeInTheDocument()
    })

    it('enables Back button after first question', async () => {
      render(<AssessmentForm />)
      
      // Answer first question and advance
      const firstOption = screen.getAllByRole('radio')[0]
      await userEvent.click(firstOption)
      await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      
      // Back button should be enabled
      const backButton = screen.getByRole('button', { name: /Back/ })
      expect(backButton).not.toBeDisabled()
    })

    it('goes back to previous question when Back is clicked', async () => {
      render(<AssessmentForm />)
      
      // Navigate to second question
      const firstOption = screen.getAllByRole('radio')[0]
      await userEvent.click(firstOption)
      await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      
      // Click Back
      const backButton = screen.getByRole('button', { name: /Back/ })
      await userEvent.click(backButton)
      
      // Should be back to first question
      expect(screen.getByText('Question 1 of 8')).toBeInTheDocument()
    })

    it('preserves answers when navigating back and forth', async () => {
      render(<AssessmentForm />)
      
      // Answer first question
      const firstOption = screen.getAllByRole('radio')[0]
      await userEvent.click(firstOption)
      
      // Navigate to second question
      await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      
      // Navigate back
      await userEvent.click(screen.getByRole('button', { name: /Back/ }))
      
      // First option should still be selected
      expect(firstOption).toBeChecked()
    })
  })

  describe('Multiple Choice Questions', () => {
    it('renders checkboxes for multiple choice questions', async () => {
      render(<AssessmentForm />)
      
      // Navigate to question 3 (multiple choice)
      // Answer questions 1 and 2 first
      for (let i = 0; i < 2; i++) {
        const options = screen.getAllByRole(i === 0 ? 'radio' : 'radio')
        await userEvent.click(options[0])
        await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      }
      
      // Question 3 should have checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
      
      expect(screen.getByText(/What tools do you currently use/)).toBeInTheDocument()
      expect(screen.getByText('Excel/Google Sheets')).toBeInTheDocument()
    })

    it('allows multiple selections for multiple choice questions', async () => {
      render(<AssessmentForm />)
      
      // Navigate to multiple choice question
      for (let i = 0; i < 2; i++) {
        const options = screen.getAllByRole('radio')
        await userEvent.click(options[0])
        await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      }
      
      // Select multiple options
      const checkboxes = screen.getAllByRole('checkbox')
      await userEvent.click(checkboxes[0])
      await userEvent.click(checkboxes[1])
      
      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).toBeChecked()
    })
  })

  describe('Contact Information Step', () => {
    const navigateToContactStep = async () => {
      render(<AssessmentForm />)
      
      // Answer all 8 questions
      for (let i = 0; i < 8; i++) {
        const inputs = screen.getAllByRole(i === 2 ? 'checkbox' : 'radio')
        await userEvent.click(inputs[0])
        await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      }
    }

    it('displays contact form after all questions are answered', async () => {
      await navigateToContactStep()
      
      expect(screen.getByText('Get Your Personalized Results')).toBeInTheDocument()
      expect(screen.getByLabelText(/First Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Company \(Optional\)/)).toBeInTheDocument()
    })

    it('validates required contact fields', async () => {
      await navigateToContactStep()
      
      // Try to proceed without filling required fields
      const getResultsButton = screen.getByRole('button', { name: /Get Results/ })
      await userEvent.click(getResultsButton)
      
      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument()
      })
    })

    it('validates email format', async () => {
      await navigateToContactStep()
      
      const emailInput = screen.getByLabelText(/Email/)
      await userEvent.type(emailInput, 'invalid-email')
      fireEvent.blur(emailInput)
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      })
    })

    it('allows proceeding when all required fields are valid', async () => {
      await navigateToContactStep()
      
      // Fill in required fields
      await userEvent.type(screen.getByLabelText(/First Name/), 'John')
      await userEvent.type(screen.getByLabelText(/Last Name/), 'Doe')
      await userEvent.type(screen.getByLabelText(/Email/), 'john@example.com')
      
      const getResultsButton = screen.getByRole('button', { name: /Get Results/ })
      expect(getResultsButton).not.toBeDisabled()
    })
  })

  describe('Results Display', () => {
    const completeAssessment = async () => {
      render(<AssessmentForm onComplete={mockOnComplete} onSubmit={mockOnSubmit} />)
      
      // Answer all questions
      for (let i = 0; i < 8; i++) {
        const inputs = screen.getAllByRole(i === 2 ? 'checkbox' : 'radio')
        await userEvent.click(inputs[0])
        await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      }
      
      // Fill contact form
      await userEvent.type(screen.getByLabelText(/First Name/), 'John')
      await userEvent.type(screen.getByLabelText(/Last Name/), 'Doe')
      await userEvent.type(screen.getByLabelText(/Email/), 'john@example.com')
      
      // Submit
      await userEvent.click(screen.getByRole('button', { name: /Get Results/ }))
    }

    it('shows loading state during submission', async () => {
      render(<AssessmentForm />)
      
      // Navigate to contact step and fill form
      for (let i = 0; i < 8; i++) {
        const inputs = screen.getAllByRole(i === 2 ? 'checkbox' : 'radio')
        await userEvent.click(inputs[0])
        await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      }
      
      await userEvent.type(screen.getByLabelText(/First Name/), 'John')
      await userEvent.type(screen.getByLabelText(/Last Name/), 'Doe')
      await userEvent.type(screen.getByLabelText(/Email/), 'john@example.com')
      
      // Click submit and check for loading
      await userEvent.click(screen.getByRole('button', { name: /Get Results/ }))
      
      // Should show loading spinner
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
    })

    it('displays results after successful submission', async () => {
      await completeAssessment()
      
      await waitFor(() => {
        expect(screen.getByText('Your AI Automation Maturity Results')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Overall Maturity Score')).toBeInTheDocument()
      expect(screen.getByText('Process Maturity')).toBeInTheDocument()
      expect(screen.getByText('Technology Readiness')).toBeInTheDocument()
      expect(screen.getByText('Data Quality')).toBeInTheDocument()
      expect(screen.getByText('Change Readiness')).toBeInTheDocument()
    })

    it('displays estimated ROI section', async () => {
      await completeAssessment()
      
      await waitFor(() => {
        expect(screen.getByText('Estimated ROI Potential')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Payback Period')).toBeInTheDocument()
      expect(screen.getByText('Annual Savings')).toBeInTheDocument()
      expect(screen.getByText('Efficiency Gain')).toBeInTheDocument()
    })

    it('displays next steps recommendations', async () => {
      await completeAssessment()
      
      await waitFor(() => {
        expect(screen.getByText('Recommended Next Steps')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Schedule free consultation')).toBeInTheDocument()
      expect(screen.getByText('Get a custom implementation roadmap')).toBeInTheDocument()
      expect(screen.getByText('Start with a 2-week pilot project')).toBeInTheDocument()
    })

    it('shows call-to-action buttons in results', async () => {
      await completeAssessment()
      
      await waitFor(() => {
        expect(screen.getByText('Schedule Free Consultation')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Download Detailed Report')).toBeInTheDocument()
    })
  })

  describe('Callback Functions', () => {
    it('calls onSubmit with formatted answers', async () => {
      render(<AssessmentForm onSubmit={mockOnSubmit} />)
      
      // Complete assessment
      for (let i = 0; i < 8; i++) {
        const inputs = screen.getAllByRole(i === 2 ? 'checkbox' : 'radio')
        await userEvent.click(inputs[0])
        await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      }
      
      await userEvent.type(screen.getByLabelText(/First Name/), 'John')
      await userEvent.type(screen.getByLabelText(/Last Name/), 'Doe')
      await userEvent.type(screen.getByLabelText(/Email/), 'john@example.com')
      await userEvent.click(screen.getByRole('button', { name: /Get Results/ }))
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              questionId: expect.any(String),
              value: expect.any(Number)
            })
          ])
        )
      })
    })

    it('calls onComplete with calculated results', async () => {
      render(<AssessmentForm onComplete={mockOnComplete} />)
      
      // Complete assessment
      for (let i = 0; i < 8; i++) {
        const inputs = screen.getAllByRole(i === 2 ? 'checkbox' : 'radio')
        await userEvent.click(inputs[0])
        await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      }
      
      await userEvent.type(screen.getByLabelText(/First Name/), 'John')
      await userEvent.type(screen.getByLabelText(/Last Name/), 'Doe')
      await userEvent.type(screen.getByLabelText(/Email/), 'john@example.com')
      await userEvent.click(screen.getByRole('button', { name: /Get Results/ }))
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            overall: expect.objectContaining({
              score: expect.any(Number),
              level: expect.any(String),
              description: expect.any(String)
            }),
            categories: expect.any(Array),
            nextSteps: expect.any(Array),
            estimatedROI: expect.objectContaining({
              timeframe: expect.any(String),
              savings: expect.any(Number),
              efficiency: expect.any(Number)
            })
          })
        )
      })
    })
  })

  describe('Score Calculation', () => {
    it('calculates correct scores for all highest answers', async () => {
      render(<AssessmentForm onComplete={mockOnComplete} />)
      
      // Answer all questions with highest value (4)
      for (let i = 0; i < 8; i++) {
        const inputs = screen.getAllByRole(i === 2 ? 'checkbox' : 'radio')
        await userEvent.click(inputs[inputs.length - 1]) // Select last (highest value) option
        await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      }
      
      await userEvent.type(screen.getByLabelText(/First Name/), 'John')
      await userEvent.type(screen.getByLabelText(/Last Name/), 'Doe')
      await userEvent.type(screen.getByLabelText(/Email/), 'john@example.com')
      await userEvent.click(screen.getByRole('button', { name: /Get Results/ }))
      
      await waitFor(() => {
        const result = mockOnComplete.mock.calls[0][0] as AssessmentResult
        expect(result.overall.score).toBe(100)
        expect(result.overall.level).toBe('advanced')
      })
    })

    it('calculates correct scores for all lowest answers', async () => {
      render(<AssessmentForm onComplete={mockOnComplete} />)
      
      // Answer all questions with lowest value (1)
      for (let i = 0; i < 8; i++) {
        const inputs = screen.getAllByRole(i === 2 ? 'checkbox' : 'radio')
        await userEvent.click(inputs[0]) // Select first (lowest value) option
        await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      }
      
      await userEvent.type(screen.getByLabelText(/First Name/), 'John')
      await userEvent.type(screen.getByLabelText(/Last Name/), 'Doe')
      await userEvent.type(screen.getByLabelText(/Email/), 'john@example.com')
      await userEvent.click(screen.getByRole('button', { name: /Get Results/ }))
      
      await waitFor(() => {
        const result = mockOnComplete.mock.calls[0][0] as AssessmentResult
        expect(result.overall.score).toBe(25)
        expect(result.overall.level).toBe('beginner')
      })
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(<AssessmentForm />)
      
      // Progress bar should have role
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      
      // Form inputs should have proper labels
      const radioButtons = screen.getAllByRole('radio')
      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('name')
      })
    })

    it('supports keyboard navigation', async () => {
      render(<AssessmentForm />)
      
      const firstOption = screen.getAllByRole('radio')[0]
      
      // Focus and select with keyboard
      firstOption.focus()
      fireEvent.keyDown(firstOption, { key: ' ' })
      
      expect(firstOption).toBeChecked()
    })

    it('provides clear visual feedback for selected options', async () => {
      render(<AssessmentForm />)
      
      const firstOption = screen.getAllByRole('radio')[0]
      const label = firstOption.closest('label')
      
      await userEvent.click(firstOption)
      
      expect(label).toHaveClass('border-sea-glow')
      expect(label).toHaveClass('bg-sea-glow/5')
    })
  })

  describe('Error Handling', () => {
    it('handles submission errors gracefully', async () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock fetch to simulate error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      render(<AssessmentForm />)
      
      // Complete assessment
      for (let i = 0; i < 8; i++) {
        const inputs = screen.getAllByRole(i === 2 ? 'checkbox' : 'radio')
        await userEvent.click(inputs[0])
        await userEvent.click(screen.getByRole('button', { name: /Next/ }))
      }
      
      await userEvent.type(screen.getByLabelText(/First Name/), 'John')
      await userEvent.type(screen.getByLabelText(/Last Name/), 'Doe')
      await userEvent.type(screen.getByLabelText(/Email/), 'john@example.com')
      await userEvent.click(screen.getByRole('button', { name: /Get Results/ }))
      
      // Should handle error and stop loading
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to submit assessment:', expect.any(Error))
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('Custom Assessment ID', () => {
    it('accepts custom assessment ID prop', () => {
      render(<AssessmentForm assessmentId="custom-assessment" />)
      
      // Component should render with custom ID
      // In production, this would load different assessment data
      expect(screen.getByText('AI Automation Maturity Assessment')).toBeInTheDocument()
    })
  })
})