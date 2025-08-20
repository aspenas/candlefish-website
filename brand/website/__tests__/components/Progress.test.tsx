import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Progress, SteppedProgress, ProgressProps, SteppedProgressProps } from '../../components/ui/Progress'

describe('Progress Component', () => {
  const renderProgress = (props: Partial<ProgressProps> = {}) => {
    const defaultProps: ProgressProps = {
      value: 50,
      ...props,
    }
    return render(<Progress {...defaultProps} />)
  }

  describe('Rendering', () => {
    it('renders progress bar', () => {
      renderProgress({ value: 75 })
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })

    it('sets correct ARIA attributes', () => {
      renderProgress({ value: 60, max: 100 })
      const progressBar = screen.getByRole('progressbar')
      
      expect(progressBar).toHaveAttribute('aria-valuenow', '60')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('calculates percentage correctly', () => {
      renderProgress({ value: 25, max: 100 })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveStyle('width: 25%')
    })

    it('handles custom max value', () => {
      renderProgress({ value: 5, max: 10 })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveStyle('width: 50%')
    })

    it('applies custom className', () => {
      render(
        <div data-testid="progress-wrapper">
          <Progress value={50} className="custom-progress" />
        </div>
      )
      expect(screen.getByTestId('progress-wrapper').firstChild).toHaveClass('custom-progress')
    })
  })

  describe('Value Constraints', () => {
    it('constrains value to minimum 0%', () => {
      renderProgress({ value: -10 })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveStyle('width: 0%')
    })

    it('constrains value to maximum 100%', () => {
      renderProgress({ value: 150 })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveStyle('width: 100%')
    })

    it('handles zero value', () => {
      renderProgress({ value: 0 })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveStyle('width: 0%')
    })

    it('handles full value', () => {
      renderProgress({ value: 100 })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveStyle('width: 100%')
    })
  })

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      renderProgress({ value: 50, size: 'sm' })
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('h-1')
    })

    it('renders medium size correctly (default)', () => {
      renderProgress({ value: 50, size: 'md' })
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('h-2')
    })

    it('renders large size correctly', () => {
      renderProgress({ value: 50, size: 'lg' })
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('h-3')
    })
  })

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      renderProgress({ value: 50, variant: 'default' })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveClass('bg-sea-glow')
    })

    it('renders success variant correctly', () => {
      renderProgress({ value: 50, variant: 'success' })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveClass('bg-green-500')
    })

    it('renders warning variant correctly', () => {
      renderProgress({ value: 50, variant: 'warning' })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveClass('bg-yellow-500')
    })

    it('renders error variant correctly', () => {
      renderProgress({ value: 50, variant: 'error' })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveClass('bg-red-500')
    })
  })

  describe('Labels', () => {
    it('shows label when showLabel is true', () => {
      renderProgress({ value: 75, showLabel: true })
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('shows custom label', () => {
      renderProgress({ value: 60, label: 'Loading assets', showLabel: true })
      expect(screen.getByText('Loading assets')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
    })

    it('shows label even without showLabel when label is provided', () => {
      renderProgress({ value: 40, label: 'Custom Progress' })
      expect(screen.getByText('Custom Progress')).toBeInTheDocument()
      expect(screen.getByText('40%')).toBeInTheDocument()
    })

    it('does not show label by default', () => {
      renderProgress({ value: 50 })
      expect(screen.queryByText('Progress')).not.toBeInTheDocument()
      expect(screen.queryByText('50%')).not.toBeInTheDocument()
    })

    it('rounds percentage in label', () => {
      renderProgress({ value: 33.333, showLabel: true })
      expect(screen.getByText('33%')).toBeInTheDocument()
    })

    it('sets aria-label from label prop', () => {
      renderProgress({ value: 50, label: 'File upload progress' })
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label', 'File upload progress')
    })
  })

  describe('Transition Behavior', () => {
    it('has transition classes on progress fill', () => {
      renderProgress({ value: 50 })
      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement
      expect(progressFill).toHaveClass('transition-all', 'duration-300', 'ease-in-out')
    })
  })
})

describe('SteppedProgress Component', () => {
  const renderSteppedProgress = (props: Partial<SteppedProgressProps> = {}) => {
    const defaultProps: SteppedProgressProps = {
      currentStep: 2,
      totalSteps: 4,
      ...props,
    }
    return render(<SteppedProgress {...defaultProps} />)
  }

  describe('Rendering', () => {
    it('renders correct number of steps', () => {
      renderSteppedProgress({ totalSteps: 3 })
      const steps = screen.getAllByText(/^[0-9]$/)
      expect(steps).toHaveLength(3)
    })

    it('shows step numbers correctly', () => {
      renderSteppedProgress({ currentStep: 1, totalSteps: 3 })
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <div data-testid="stepped-wrapper">
          <SteppedProgress currentStep={1} totalSteps={3} className="custom-stepped" />
        </div>
      )
      expect(screen.getByTestId('stepped-wrapper').firstChild).toHaveClass('custom-stepped')
    })
  })

  describe('Step States', () => {
    it('marks current step as active', () => {
      renderSteppedProgress({ currentStep: 2, totalSteps: 4 })
      const activeStep = screen.getByText('2').closest('div')
      expect(activeStep).toHaveClass('bg-sea-glow/20', 'text-sea-glow', 'border-2', 'border-sea-glow')
    })

    it('marks completed steps correctly', () => {
      renderSteppedProgress({ currentStep: 3, totalSteps: 4 })
      
      // Step 1 should be completed (show checkmark)
      const step1 = screen.getByLabelText('', { selector: '[aria-current]' }).parentElement?.parentElement?.firstElementChild as HTMLElement
      expect(step1).toHaveClass('bg-sea-glow', 'text-white')
      
      // Should have checkmark SVG in completed steps
      const checkmarks = screen.getAllByRole('img', { hidden: true })
      expect(checkmarks.length).toBeGreaterThan(0)
    })

    it('marks pending steps correctly', () => {
      renderSteppedProgress({ currentStep: 2, totalSteps: 4 })
      const pendingStep = screen.getByText('4').closest('div')
      expect(pendingStep).toHaveClass('bg-mist/10', 'text-mist', 'border-2', 'border-mist/20')
    })

    it('sets aria-current on active step', () => {
      renderSteppedProgress({ currentStep: 2, totalSteps: 3 })
      const activeStep = screen.getByText('2').closest('div')
      expect(activeStep).toHaveAttribute('aria-current', 'step')
    })
  })

  describe('Variants', () => {
    it('renders horizontal variant by default', () => {
      render(
        <div data-testid="horizontal-wrapper">
          <SteppedProgress currentStep={1} totalSteps={3} />
        </div>
      )
      const container = screen.getByTestId('horizontal-wrapper').querySelector('.flex')
      expect(container).toHaveClass('items-center', 'space-x-4')
      expect(container).not.toHaveClass('flex-col', 'space-y-4')
    })

    it('renders vertical variant correctly', () => {
      render(
        <div data-testid="vertical-wrapper">
          <SteppedProgress currentStep={1} totalSteps={3} variant="vertical" />
        </div>
      )
      const container = screen.getByTestId('vertical-wrapper').querySelector('.flex')
      expect(container).toHaveClass('flex-col', 'space-y-4')
      expect(container).not.toHaveClass('items-center', 'space-x-4')
    })
  })

  describe('Step Labels', () => {
    const stepsWithLabels = [
      { label: 'Personal Info', description: 'Enter your details' },
      { label: 'Payment', description: 'Add payment method' },
      { label: 'Confirmation', description: 'Review and confirm' },
    ]

    it('renders step labels when provided', () => {
      renderSteppedProgress({ 
        currentStep: 2, 
        totalSteps: 3, 
        steps: stepsWithLabels 
      })
      
      expect(screen.getByText('Personal Info')).toBeInTheDocument()
      expect(screen.getByText('Payment')).toBeInTheDocument()
      expect(screen.getByText('Confirmation')).toBeInTheDocument()
    })

    it('renders step descriptions when provided', () => {
      renderSteppedProgress({ 
        currentStep: 1, 
        totalSteps: 3, 
        steps: stepsWithLabels 
      })
      
      expect(screen.getByText('Enter your details')).toBeInTheDocument()
      expect(screen.getByText('Add payment method')).toBeInTheDocument()
      expect(screen.getByText('Review and confirm')).toBeInTheDocument()
    })

    it('highlights active step label', () => {
      renderSteppedProgress({ 
        currentStep: 2, 
        totalSteps: 3, 
        steps: stepsWithLabels 
      })
      
      const activeLabel = screen.getByText('Payment')
      expect(activeLabel).toHaveClass('text-sea-glow')
      
      const inactiveLabel = screen.getByText('Personal Info')
      expect(inactiveLabel).toHaveClass('text-slate')
    })
  })

  describe('Connector Lines (Horizontal)', () => {
    it('shows connector lines between steps in horizontal mode', () => {
      render(
        <div data-testid="connector-test">
          <SteppedProgress currentStep={2} totalSteps={3} variant="horizontal" />
        </div>
      )
      
      // Look for connector line elements
      const connectors = screen.getByTestId('connector-test').querySelectorAll('.flex-1.h-0\\.5')
      expect(connectors.length).toBe(2) // Should be totalSteps - 1
    })

    it('does not show connector lines in vertical mode', () => {
      render(
        <div data-testid="vertical-test">
          <SteppedProgress currentStep={2} totalSteps={3} variant="vertical" />
        </div>
      )
      
      const connectors = screen.getByTestId('vertical-test').querySelectorAll('.flex-1.h-0\\.5')
      expect(connectors.length).toBe(0)
    })
  })

  describe('Accessibility', () => {
    it('maintains proper step progression semantics', () => {
      renderSteppedProgress({ currentStep: 2, totalSteps: 4 })
      
      // Current step should have aria-current
      const currentStep = screen.getByLabelText('', { selector: '[aria-current="step"]' })
      expect(currentStep).toBeInTheDocument()
    })

    it('provides meaningful step indicators', () => {
      const steps = [
        { label: 'Step 1', description: 'First step' },
        { label: 'Step 2', description: 'Second step' },
      ]
      
      renderSteppedProgress({ 
        currentStep: 1, 
        totalSteps: 2, 
        steps 
      })
      
      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('First step')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles single step', () => {
      renderSteppedProgress({ currentStep: 1, totalSteps: 1 })
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('handles step beyond total', () => {
      renderSteppedProgress({ currentStep: 5, totalSteps: 3 })
      // All steps should be completed
      const checkmarks = screen.getAllByRole('img', { hidden: true })
      expect(checkmarks.length).toBe(3)
    })

    it('handles step 0 or negative', () => {
      renderSteppedProgress({ currentStep: 0, totalSteps: 3 })
      // All steps should be pending
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })
})