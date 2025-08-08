import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OnboardingWizard from '../../../dashboard/src/components/OnboardingWizard'

// Mock react-spring
jest.mock('@react-spring/web', () => ({
  useSpring: (props) => props.to || props.from || {},
  useTransition: () => [],
  animated: {
    div: 'div'
  },
  config: {}
}))

describe('OnboardingWizard Component', () => {
  const mockTeamMember = {
    id: 'member-1',
    username: 'john-doe',
    email: 'john@example.com',
    role: 'developer',
    status: 'invited',
    repositoryAccess: ['repo-1'],
    onboardingStatus: {
      completed: false,
      currentStep: 0,
      steps: [
        {
          id: 'step-1',
          title: 'Account Setup',
          description: 'Create your account and verify email',
          status: 'pending',
          required: true,
          action: {
            type: 'api_call',
            data: { endpoint: '/api/user/setup' }
          }
        },
        {
          id: 'step-2',
          title: 'SSH Keys',
          description: 'Upload your SSH public key',
          status: 'pending',
          required: true,
          action: {
            type: 'manual',
            data: { instructions: 'Follow the SSH key setup guide' }
          }
        },
        {
          id: 'step-3',
          title: 'Repository Access',
          description: 'Configure repository permissions',
          status: 'pending',
          required: true,
          action: {
            type: 'api_call',
            data: { endpoint: '/api/user/repositories' }
          }
        },
        {
          id: 'step-4',
          title: 'CLI Setup',
          description: 'Install and configure Claude CLI',
          status: 'pending',
          required: false,
          action: {
            type: 'external_link',
            data: { url: 'https://docs.claude.ai/cli' }
          }
        }
      ]
    }
  }

  const mockCompletedMember = {
    ...mockTeamMember,
    onboardingStatus: {
      completed: true,
      currentStep: 4,
      steps: mockTeamMember.onboardingStatus.steps.map(step => ({
        ...step,
        status: 'completed'
      }))
    }
  }

  describe('Wizard Structure', () => {
    it('should render onboarding wizard with correct title', () => {
      render(<OnboardingWizard teamMember={mockTeamMember} />)

      expect(screen.getByText('Welcome to Claude Resources!')).toBeInTheDocument()
      expect(screen.getByText(/Let's get you set up/)).toBeInTheDocument()
    })

    it('should display team member information', () => {
      render(<OnboardingWizard teamMember={mockTeamMember} />)

      expect(screen.getByText('john-doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('developer')).toBeInTheDocument()
    })

    it('should show progress indicator', () => {
      render(<OnboardingWizard teamMember={mockTeamMember} />)

      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()

      // Progress bar should show 0% initially
      const progressBar = document.querySelector('[role="progressbar"]')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    })

    it('should display all steps in sidebar', () => {
      render(<OnboardingWizard teamMember={mockTeamMember} />)

      expect(screen.getByText('Account Setup')).toBeInTheDocument()
      expect(screen.getByText('SSH Keys')).toBeInTheDocument()
      expect(screen.getByText('Repository Access')).toBeInTheDocument()
      expect(screen.getByText('CLI Setup')).toBeInTheDocument()
    })
  })

  describe('Step Navigation', () => {
    it('should show current step content', () => {
      render(<OnboardingWizard teamMember={mockTeamMember} />)

      expect(screen.getByText('Account Setup')).toBeInTheDocument()
      expect(screen.getByText('Create your account and verify email')).toBeInTheDocument()
    })

    it('should navigate to next step when Next is clicked', async () => {
      const user = userEvent.setup()
      const onStepComplete = jest.fn()

      render(
        <OnboardingWizard
          teamMember={mockTeamMember}
          onStepComplete={onStepComplete}
        />
      )

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      expect(onStepComplete).toHaveBeenCalledWith('step-1')
    })

    it('should navigate to previous step when Back is clicked', async () => {
      const user = userEvent.setup()
      const memberOnStep2 = {
        ...mockTeamMember,
        onboardingStatus: {
          ...mockTeamMember.onboardingStatus,
          currentStep: 1
        }
      }

      render(<OnboardingWizard teamMember={memberOnStep2} />)

      const backButton = screen.getByText('Back')
      await user.click(backButton)

      // Should show previous step content
      expect(screen.getByText('Account Setup')).toBeInTheDocument()
    })

    it('should disable Back button on first step', () => {
      render(<OnboardingWizard teamMember={mockTeamMember} />)

      const backButton = screen.getByText('Back')
      expect(backButton).toBeDisabled()
    })

    it('should show Finish button on last step', () => {
      const memberOnLastStep = {
        ...mockTeamMember,
        onboardingStatus: {
          ...mockTeamMember.onboardingStatus,
          currentStep: 3
        }
      }

      render(<OnboardingWizard teamMember={memberOnLastStep} />)

      expect(screen.getByText('Finish')).toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })
  })

  describe('Step Status and Indicators', () => {
    it('should show correct step status icons', () => {
      const memberWithMixedSteps = {
        ...mockTeamMember,
        onboardingStatus: {
          ...mockTeamMember.onboardingStatus,
          currentStep: 2,
          steps: [
            { ...mockTeamMember.onboardingStatus.steps[0], status: 'completed' },
            { ...mockTeamMember.onboardingStatus.steps[1], status: 'completed' },
            { ...mockTeamMember.onboardingStatus.steps[2], status: 'pending' },
            { ...mockTeamMember.onboardingStatus.steps[3], status: 'pending' }
          ]
        }
      }

      render(<OnboardingWizard teamMember={memberWithMixedSteps} />)

      // Completed steps should show check icons
      const checkIcons = document.querySelectorAll('[data-lucide="check-circle"]')
      expect(checkIcons).toHaveLength(2)

      // Current step should be highlighted
      const currentStepElement = screen.getByText('Repository Access').closest('div')
      expect(currentStepElement).toHaveClass('bg-claude-50', 'border-claude-200')
    })

    it('should show required vs optional step indicators', () => {
      render(<OnboardingWizard teamMember={mockTeamMember} />)

      // Required steps should show asterisks or "Required" text
      const requiredSteps = screen.getAllByText(/required/i)
      expect(requiredSteps.length).toBeGreaterThan(0)

      // Optional step should be marked as such
      expect(screen.getByText(/optional/i)).toBeInTheDocument()
    })

    it('should calculate and display progress correctly', () => {
      const memberWithProgress = {
        ...mockTeamMember,
        onboardingStatus: {
          ...mockTeamMember.onboardingStatus,
          currentStep: 2,
          steps: [
            { ...mockTeamMember.onboardingStatus.steps[0], status: 'completed' },
            { ...mockTeamMember.onboardingStatus.steps[1], status: 'completed' },
            { ...mockTeamMember.onboardingStatus.steps[2], status: 'pending' },
            { ...mockTeamMember.onboardingStatus.steps[3], status: 'pending' }
          ]
        }
      }

      render(<OnboardingWizard teamMember={memberWithProgress} />)

      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()

      const progressBar = document.querySelector('[role="progressbar"]')
      expect(progressBar).toHaveAttribute('aria-valuenow', '75') // 3 of 4 steps
    })
  })

  describe('Step Actions', () => {
    it('should handle API call actions', async () => {
      const user = userEvent.setup()
      const onStepComplete = jest.fn().mockResolvedValue(true)

      render(
        <OnboardingWizard
          teamMember={mockTeamMember}
          onStepComplete={onStepComplete}
        />
      )

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      expect(onStepComplete).toHaveBeenCalledWith('step-1')
    })

    it('should handle manual actions with instructions', () => {
      const memberOnManualStep = {
        ...mockTeamMember,
        onboardingStatus: {
          ...mockTeamMember.onboardingStatus,
          currentStep: 1
        }
      }

      render(<OnboardingWizard teamMember={memberOnManualStep} />)

      expect(screen.getByText('Follow the SSH key setup guide')).toBeInTheDocument()

      // Manual steps should have a "Mark as Complete" button
      expect(screen.getByText('Mark as Complete')).toBeInTheDocument()
    })

    it('should handle external link actions', () => {
      const memberOnExternalStep = {
        ...mockTeamMember,
        onboardingStatus: {
          ...mockTeamMember.onboardingStatus,
          currentStep: 3
        }
      }

      render(<OnboardingWizard teamMember={memberOnExternalStep} />)

      const externalLink = screen.getByText('Open CLI Documentation')
      expect(externalLink).toHaveAttribute('href', 'https://docs.claude.ai/cli')
      expect(externalLink).toHaveAttribute('target', '_blank')
    })

    it('should show loading state during step completion', async () => {
      const user = userEvent.setup()
      const onStepComplete = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(
        <OnboardingWizard
          teamMember={mockTeamMember}
          onStepComplete={onStepComplete}
        />
      )

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      // Should show loading spinner
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when step fails', async () => {
      const user = userEvent.setup()
      const onStepComplete = jest.fn().mockRejectedValue(
        new Error('Failed to complete step')
      )

      render(
        <OnboardingWizard
          teamMember={mockTeamMember}
          onStepComplete={onStepComplete}
        />
      )

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to complete step')).toBeInTheDocument()
      })
    })

    it('should allow retrying failed steps', async () => {
      const user = userEvent.setup()
      const onStepComplete = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(true)

      render(
        <OnboardingWizard
          teamMember={mockTeamMember}
          onStepComplete={onStepComplete}
        />
      )

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)

      expect(onStepComplete).toHaveBeenCalledTimes(2)
    })

    it('should handle skip functionality for optional steps', async () => {
      const user = userEvent.setup()
      const onStepSkip = jest.fn()

      const memberOnOptionalStep = {
        ...mockTeamMember,
        onboardingStatus: {
          ...mockTeamMember.onboardingStatus,
          currentStep: 3 // CLI Setup is optional
        }
      }

      render(
        <OnboardingWizard
          teamMember={memberOnOptionalStep}
          onStepSkip={onStepSkip}
        />
      )

      const skipButton = screen.getByText('Skip')
      await user.click(skipButton)

      expect(onStepSkip).toHaveBeenCalledWith('step-4')
    })
  })

  describe('Completion State', () => {
    it('should show completion message when all steps are done', () => {
      render(<OnboardingWizard teamMember={mockCompletedMember} />)

      expect(screen.getByText('Onboarding Complete!')).toBeInTheDocument()
      expect(screen.getByText(/You're all set up/)).toBeInTheDocument()
    })

    it('should show completion actions', () => {
      render(<OnboardingWizard teamMember={mockCompletedMember} />)

      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
      expect(screen.getByText('View Documentation')).toBeInTheDocument()
    })

    it('should handle completion callback', async () => {
      const user = userEvent.setup()
      const onComplete = jest.fn()

      render(
        <OnboardingWizard
          teamMember={mockCompletedMember}
          onComplete={onComplete}
        />
      )

      const dashboardButton = screen.getByText('Go to Dashboard')
      await user.click(dashboardButton)

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      render(<OnboardingWizard teamMember={mockTeamMember} />)

      // Should have mobile-specific classes
      const container = document.querySelector('.flex-col')
      expect(container).toBeInTheDocument()
    })

    it('should show collapsible step list on mobile', async () => {
      const user = userEvent.setup()

      render(<OnboardingWizard teamMember={mockTeamMember} />)

      // On mobile, step list might be collapsible
      const toggleButton = screen.queryByText('Show Steps')
      if (toggleButton) {
        await user.click(toggleButton)
        expect(screen.getByText('Hide Steps')).toBeInTheDocument()
      }
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<OnboardingWizard teamMember={mockTeamMember} />)

      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Welcome to Claude Resources!')

      const stepHeading = screen.getByRole('heading', { level: 2 })
      expect(stepHeading).toHaveTextContent('Account Setup')
    })

    it('should have accessible progress bar', () => {
      render(<OnboardingWizard teamMember={mockTeamMember} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', 'Onboarding progress')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<OnboardingWizard teamMember={mockTeamMember} />)

      // Tab through interactive elements
      await user.tab()
      expect(screen.getByText('Next')).toHaveFocus()

      await user.tab()
      expect(screen.getByText('Back')).toHaveFocus()

      // Enter should activate buttons
      await user.tab() // Go back to Next button
      await user.keyboard('{Enter}')
      // Should trigger next step action
    })

    it('should announce step changes to screen readers', () => {
      const { rerender } = render(<OnboardingWizard teamMember={mockTeamMember} />)

      const memberOnStep2 = {
        ...mockTeamMember,
        onboardingStatus: {
          ...mockTeamMember.onboardingStatus,
          currentStep: 1
        }
      }

      rerender(<OnboardingWizard teamMember={memberOnStep2} />)

      // Should have aria-live region for announcements
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()
    })
  })

  describe('Data Persistence', () => {
    it('should save progress automatically', async () => {
      const user = userEvent.setup()
      const onProgressSave = jest.fn()

      render(
        <OnboardingWizard
          teamMember={mockTeamMember}
          onProgressSave={onProgressSave}
        />
      )

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      expect(onProgressSave).toHaveBeenCalledWith({
        currentStep: 1,
        completedSteps: ['step-1']
      })
    })

    it('should restore progress on component mount', () => {
      const memberWithProgress = {
        ...mockTeamMember,
        onboardingStatus: {
          ...mockTeamMember.onboardingStatus,
          currentStep: 2
        }
      }

      render(<OnboardingWizard teamMember={memberWithProgress} />)

      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
      expect(screen.getByText('Repository Access')).toBeInTheDocument()
    })
  })

  describe('Customization', () => {
    it('should accept custom step components', () => {
      const CustomStep = ({ step }) => (
        <div data-testid="custom-step">Custom: {step.title}</div>
      )

      render(
        <OnboardingWizard
          teamMember={mockTeamMember}
          stepComponent={CustomStep}
        />
      )

      expect(screen.getByTestId('custom-step')).toBeInTheDocument()
      expect(screen.getByText('Custom: Account Setup')).toBeInTheDocument()
    })

    it('should support custom styling', () => {
      const { container } = render(
        <OnboardingWizard
          teamMember={mockTeamMember}
          className="custom-wizard-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-wizard-class')
    })
  })
})
