import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import CTASection from '../CTASection'

describe('CTASection', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Primary Variant (Default)', () => {
    it('renders primary variant by default', () => {
      render(<CTASection />)

      expect(screen.getByRole('region')).toBeInTheDocument()
      expect(screen.getByText('Ready to')).toBeInTheDocument()
      expect(screen.getByText('10x')).toBeInTheDocument()
      expect(screen.getByText('Your Business Efficiency?')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const customClass = 'custom-cta'
      render(<CTASection className={customClass} />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass(customClass)
    })

    it('displays default title and subtitle', () => {
      render(<CTASection />)

      expect(screen.getByText(/Ready to.*10x.*Your Business Efficiency/)).toBeInTheDocument()
      expect(screen.getByText(/Join the AI revolution/)).toBeInTheDocument()
    })

    it('displays custom title when provided', () => {
      const customTitle = 'Transform Your Business Today'
      render(<CTASection title={customTitle} />)

      expect(screen.getByText(customTitle)).toBeInTheDocument()
    })

    it('displays custom subtitle when provided', () => {
      const customSubtitle = 'Custom subtitle text for testing'
      render(<CTASection subtitle={customSubtitle} />)

      expect(screen.getByText(customSubtitle)).toBeInTheDocument()
    })

    it('renders default CTA buttons', () => {
      render(<CTASection />)

      expect(screen.getByText('Start Free Trial')).toBeInTheDocument()
      expect(screen.getByText('Book Demo')).toBeInTheDocument()
    })

    it('renders custom CTA buttons when provided', () => {
      const primaryAction = { text: 'Custom Primary', onClick: vi.fn() }
      const secondaryAction = { text: 'Custom Secondary', onClick: vi.fn() }

      render(
        <CTASection
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
        />
      )

      expect(screen.getByText('Custom Primary')).toBeInTheDocument()
      expect(screen.getByText('Custom Secondary')).toBeInTheDocument()
    })

    it('handles primary button click', async () => {
      const mockClick = vi.fn()
      const primaryAction = { text: 'Click Me', onClick: mockClick }

      render(<CTASection primaryAction={primaryAction} />)

      const button = screen.getByText('Click Me')
      await user.click(button)

      expect(mockClick).toHaveBeenCalledTimes(1)
    })

    it('handles secondary button click', async () => {
      const mockClick = vi.fn()
      const secondaryAction = { text: 'Secondary Click', onClick: mockClick }

      render(<CTASection secondaryAction={secondaryAction} />)

      const button = screen.getByText('Secondary Click')
      await user.click(button)

      expect(mockClick).toHaveBeenCalledTimes(1)
    })

    it('displays value propositions', () => {
      render(<CTASection />)

      expect(screen.getByText('No Risk')).toBeInTheDocument()
      expect(screen.getByText('30-day money-back guarantee')).toBeInTheDocument()

      expect(screen.getByText('Fast Setup')).toBeInTheDocument()
      expect(screen.getByText('Live in 4 weeks or less')).toBeInTheDocument()

      expect(screen.getByText('Enterprise Ready')).toBeInTheDocument()
      expect(screen.getByText('SOC 2 compliant & secure')).toBeInTheDocument()
    })

    it('has proper gradient background', () => {
      render(<CTASection />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass('bg-gradient-to-r', 'from-primary-500', 'via-primary-600', 'to-accent-500')
    })

    it('displays animated background elements', () => {
      render(<CTASection />)

      const section = screen.getByRole('region')
      const animatedElements = section.querySelectorAll('.animate-pulse')
      expect(animatedElements.length).toBe(20)
    })
  })

  describe('Secondary Variant', () => {
    it('renders secondary variant correctly', () => {
      render(<CTASection variant="secondary" />)

      expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument()
      expect(screen.getByText('See Why Industry Leaders Choose Candlefish AI')).toBeInTheDocument()
    })

    it('has different background styling', () => {
      render(<CTASection variant="secondary" />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass('bg-gray-50')
      expect(section).not.toHaveClass('bg-gradient-to-r')
    })

    it('displays rocket icon badge', () => {
      render(<CTASection variant="secondary" />)

      const badge = screen.getByText('Ready to Get Started?').parentElement
      expect(badge?.querySelector('[data-lucide="rocket"]')).toBeInTheDocument()
    })

    it('renders different button styles', () => {
      render(<CTASection variant="secondary" />)

      const primaryBtn = screen.getByText('Schedule Demo')
      const secondaryBtn = screen.getByText('Contact Sales')

      expect(primaryBtn).toHaveClass('bg-gradient-to-r')
      expect(secondaryBtn).toHaveClass('bg-white', 'border-gray-300')
    })

    it('displays calendar and arrow icons', () => {
      render(<CTASection variant="secondary" />)

      const section = screen.getByRole('region')
      expect(section.querySelector('[data-lucide="calendar"]')).toBeInTheDocument()
      expect(section.querySelector('[data-lucide="arrow-right"]')).toBeInTheDocument()
    })
  })

  describe('Contact Variant', () => {
    it('renders contact variant correctly', () => {
      render(<CTASection variant="contact" />)

      expect(screen.getByText('Ready to Transform Your Business?')).toBeInTheDocument()
      expect(screen.getByText(/Join 500\+ companies/)).toBeInTheDocument()
    })

    it('has primary gradient background', () => {
      render(<CTASection variant="contact" />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass('bg-gradient-to-br', 'from-primary-600', 'to-primary-800')
    })

    it('renders email form', () => {
      render(<CTASection variant="contact" />)

      expect(screen.getByPlaceholderText('Enter your work email')).toBeInTheDocument()
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })

    it('validates email input', async () => {
      render(<CTASection variant="contact" />)

      const submitButton = screen.getByText('Get Started')
      await user.click(submitButton)

      const emailInput = screen.getByPlaceholderText('Enter your work email')
      expect(emailInput).toBeInvalid()
    })

    it('handles email form submission', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(<CTASection variant="contact" />)

      const emailInput = screen.getByPlaceholderText('Enter your work email')
      const submitButton = screen.getByText('Get Started')

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      // Should show loading state
      expect(screen.getByRole('button', { name: /get started/i })).toBeDisabled()
      expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument()

      // Fast-forward the timer to complete the submission
      vi.advanceTimersByTime(1500)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Email submitted:', 'test@example.com')
        expect(emailInput).toHaveValue('')
      })

      consoleSpy.mockRestore()
    })

    it('displays trust indicators', () => {
      render(<CTASection variant="contact" />)

      expect(screen.getByText('No credit card required. 14-day free trial.')).toBeInTheDocument()
    })

    it('displays benefits with icons', () => {
      render(<CTASection variant="contact" />)

      const benefits = [
        '4-week implementation guarantee',
        'Enterprise-grade security',
        'Proven ROI within 6 months',
        '24/7 dedicated support'
      ]

      benefits.forEach(benefit => {
        expect(screen.getByText(benefit)).toBeInTheDocument()
      })

      // Check for benefit icons
      const section = screen.getByRole('region')
      expect(section.querySelector('[data-lucide="clock"]')).toBeInTheDocument()
      expect(section.querySelector('[data-lucide="shield"]')).toBeInTheDocument()
      expect(section.querySelector('[data-lucide="trending-up"]')).toBeInTheDocument()
      expect(section.querySelector('[data-lucide="message-square"]')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('adapts heading size for different screens', () => {
      render(<CTASection />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveClass('text-4xl', 'md:text-5xl')
    })

    it('buttons stack on mobile', () => {
      render(<CTASection />)

      const buttonContainer = screen.getByText('Start Free Trial').parentElement
      expect(buttonContainer).toHaveClass('flex-col', 'sm:flex-row')
    })

    it('value propositions grid is responsive', () => {
      render(<CTASection />)

      const valuePropsGrid = screen.getByText('No Risk').parentElement?.parentElement
      expect(valuePropsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-3')
    })

    it('contact form adapts to screen size', () => {
      render(<CTASection variant="contact" />)

      const form = screen.getByPlaceholderText('Enter your work email').parentElement
      expect(form).toHaveClass('flex-col', 'sm:flex-row')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<CTASection />)

      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toBeInTheDocument()

      const subHeadings = screen.getAllByRole('heading', { level: 3 })
      expect(subHeadings.length).toBe(3) // Value prop headings
    })

    it('buttons are keyboard accessible', async () => {
      render(<CTASection />)

      const primaryButton = screen.getByText('Start Free Trial')

      // Should be focusable
      primaryButton.focus()
      expect(document.activeElement).toBe(primaryButton)
    })

    it('form has proper labels and validation', () => {
      render(<CTASection variant="contact" />)

      const emailInput = screen.getByPlaceholderText('Enter your work email')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })

    it('loading state is accessible', async () => {
      render(<CTASection variant="contact" />)

      const emailInput = screen.getByPlaceholderText('Enter your work email')
      const submitButton = screen.getByText('Get Started')

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveAttribute('disabled')
    })
  })

  describe('Visual Elements', () => {
    it('displays gradient highlights correctly', () => {
      render(<CTASection />)

      const highlightText = screen.getByText('10x')
      expect(highlightText).toHaveClass('text-accent-200')
    })

    it('button hover effects are applied', () => {
      render(<CTASection />)

      const primaryButton = screen.getByText('Start Free Trial')
      expect(primaryButton).toHaveClass('hover:bg-gray-50', 'hover:shadow-xl', 'hover:-translate-y-1')

      const secondaryButton = screen.getByText('Book Demo')
      expect(secondaryButton).toHaveClass('hover:bg-primary-800')
    })

    it('icons have proper styling', () => {
      render(<CTASection />)

      const section = screen.getByRole('region')
      const icons = section.querySelectorAll('[data-lucide]')

      icons.forEach(icon => {
        expect(icon).toHaveClass('w-5', 'h-5')
      })
    })

    it('background elements have proper opacity', () => {
      render(<CTASection />)

      const section = screen.getByRole('region')
      const backgroundPattern = section.querySelector('.opacity-20')
      expect(backgroundPattern).toBeInTheDocument()
    })
  })

  describe('Content Customization', () => {
    it('accepts all custom props', () => {
      const props = {
        title: 'Custom Title',
        subtitle: 'Custom Subtitle',
        primaryAction: { text: 'Custom Primary', onClick: vi.fn() },
        secondaryAction: { text: 'Custom Secondary', onClick: vi.fn() }
      }

      render(<CTASection {...props} />)

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
      expect(screen.getByText('Custom Subtitle')).toBeInTheDocument()
      expect(screen.getByText('Custom Primary')).toBeInTheDocument()
      expect(screen.getByText('Custom Secondary')).toBeInTheDocument()
    })

    it('falls back to defaults when custom props are not provided', () => {
      render(<CTASection primaryAction={{}} secondaryAction={{}} />)

      expect(screen.getByText('Start Free Trial')).toBeInTheDocument()
      expect(screen.getByText('Book Demo')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders efficiently', () => {
      const { rerender } = render(<CTASection />)

      rerender(<CTASection />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('handles variant changes', () => {
      const { rerender } = render(<CTASection variant="primary" />)

      rerender(<CTASection variant="secondary" />)

      expect(screen.getByText('Schedule Demo')).toBeInTheDocument()
      expect(screen.queryByText('Start Free Trial')).not.toBeInTheDocument()
    })

    it('handles prop changes without issues', () => {
      const { rerender } = render(<CTASection className="test1" />)

      rerender(<CTASection className="test2" />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass('test2')
      expect(section).not.toHaveClass('test1')
    })
  })

  describe('Form State Management', () => {
    it('manages email input state correctly', async () => {
      render(<CTASection variant="contact" />)

      const emailInput = screen.getByPlaceholderText('Enter your work email')

      await user.type(emailInput, 'test@example.com')
      expect(emailInput).toHaveValue('test@example.com')

      // Clear input
      await user.clear(emailInput)
      expect(emailInput).toHaveValue('')
    })

    it('manages loading state correctly', async () => {
      render(<CTASection variant="contact" />)

      const emailInput = screen.getByPlaceholderText('Enter your work email')
      const submitButton = screen.getByText('Get Started')

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      // Should be in loading state
      expect(submitButton).toBeDisabled()

      // Complete the submission
      vi.advanceTimersByTime(1500)

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('clears email after successful submission', async () => {
      render(<CTASection variant="contact" />)

      const emailInput = screen.getByPlaceholderText('Enter your work email')
      const submitButton = screen.getByText('Get Started')

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      vi.advanceTimersByTime(1500)

      await waitFor(() => {
        expect(emailInput).toHaveValue('')
      })
    })
  })
})
