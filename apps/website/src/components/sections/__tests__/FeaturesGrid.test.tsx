import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import FeaturesGrid from '../FeaturesGrid'

describe('FeaturesGrid', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the features section', () => {
      render(<FeaturesGrid />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('applies custom className when provided', () => {
      const customClass = 'custom-features'
      render(<FeaturesGrid className={customClass} />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass(customClass)
    })
  })

  describe('Section Header', () => {
    it('renders section badge', () => {
      render(<FeaturesGrid />)

      expect(screen.getByText('Enterprise AI Solutions')).toBeInTheDocument()
    })

    it('section badge has correct styling', () => {
      render(<FeaturesGrid />)

      const badge = screen.getByText('Enterprise AI Solutions').parentElement
      expect(badge).toHaveClass('bg-primary-100/50', 'text-primary-700')
    })

    it('renders main heading', () => {
      render(<FeaturesGrid />)

      expect(screen.getByText('Everything you need to')).toBeInTheDocument()
      expect(screen.getByText('accelerate')).toBeInTheDocument()
      expect(screen.getByText('with AI')).toBeInTheDocument()
    })

    it('main heading has gradient text for "accelerate"', () => {
      render(<FeaturesGrid />)

      const accelerateText = screen.getByText('accelerate')
      expect(accelerateText).toHaveClass('bg-gradient-to-r', 'bg-clip-text', 'text-transparent')
    })

    it('renders section description', () => {
      render(<FeaturesGrid />)

      const description = screen.getByText(/From intelligent automation to predictive analytics/i)
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-xl', 'text-gray-600')
    })
  })

  describe('Feature Cards', () => {
    const expectedFeatures = [
      {
        title: 'Intelligent Automation',
        description: 'Transform complex business processes with AI-powered automation',
        benefits: ['Reduce manual work by 80%', 'Self-improving algorithms', 'Seamless integration with existing systems']
      },
      {
        title: 'Predictive Analytics',
        description: 'Unlock actionable insights from your data with advanced machine learning',
        benefits: ['Real-time decision making', 'Custom dashboards and reports', 'Predictive forecasting capabilities']
      },
      {
        title: 'Enterprise Security',
        description: 'Bank-level security with end-to-end encryption',
        benefits: ['SOC 2 Type II certified', 'GDPR and CCPA compliant', 'Zero-trust security model']
      },
      {
        title: 'Rapid Deployment',
        description: 'Get up and running in weeks, not months',
        benefits: ['Average 4-week implementation', 'Dedicated success manager', '24/7 technical support']
      },
      {
        title: 'Custom AI Models',
        description: 'Purpose-built AI solutions tailored to your industry',
        benefits: ['Industry-specific training', 'Continuous model optimization', 'Custom API development']
      },
      {
        title: 'Global Scale',
        description: 'Enterprise-grade infrastructure that scales with your business',
        benefits: ['99.9% uptime SLA', 'Multi-region deployment', 'Auto-scaling capabilities']
      }
    ]

    it('renders all feature cards', () => {
      render(<FeaturesGrid />)

      expectedFeatures.forEach(feature => {
        expect(screen.getByText(feature.title)).toBeInTheDocument()
      })
    })

    it('feature cards have correct content', () => {
      render(<FeaturesGrid />)

      expectedFeatures.forEach(feature => {
        const title = screen.getByText(feature.title)
        const card = title.closest('.group')

        expect(card).toBeInTheDocument()

        // Check description
        expect(within(card!).getByText(new RegExp(feature.description, 'i'))).toBeInTheDocument()

        // Check benefits
        feature.benefits.forEach(benefit => {
          expect(within(card!).getByText(benefit)).toBeInTheDocument()
        })
      })
    })

    it('feature cards have correct icons', () => {
      render(<FeaturesGrid />)

      const expectedIcons = ['brain', 'bar-chart-3', 'shield', 'zap', 'cpu', 'globe']

      expectedIcons.forEach(icon => {
        expect(screen.getByRole('region').querySelector(`[data-lucide="${icon}"]`)).toBeInTheDocument()
      })
    })

    it('feature cards have proper styling', () => {
      render(<FeaturesGrid />)

      const firstCard = screen.getByText('Intelligent Automation').closest('.group')
      expect(firstCard).toHaveClass('bg-white/70', 'backdrop-blur-sm', 'rounded-2xl', 'p-8')
    })

    it('feature card icons have gradient background', () => {
      render(<FeaturesGrid />)

      const firstCard = screen.getByText('Intelligent Automation').closest('.group')
      const iconContainer = firstCard?.querySelector('.bg-gradient-to-br')

      expect(iconContainer).toHaveClass('from-primary-500', 'to-accent-500')
    })
  })

  describe('Feature Benefits', () => {
    it('renders benefit lists for each feature', () => {
      render(<FeaturesGrid />)

      expectedFeatures[0].benefits.forEach(benefit => {
        expect(screen.getByText(benefit)).toBeInTheDocument()
      })
    })

    it('benefit items have bullet points', () => {
      render(<FeaturesGrid />)

      const firstCard = screen.getByText('Intelligent Automation').closest('.group')
      const benefitsList = firstCard?.querySelector('ul')
      const bulletPoints = benefitsList?.querySelectorAll('.bg-accent-500')

      expect(bulletPoints?.length).toBeGreaterThan(0)
    })
  })

  describe('Hover Effects', () => {
    it('feature cards have hover effects', () => {
      render(<FeaturesGrid />)

      const firstCard = screen.getByText('Intelligent Automation').closest('.group')
      expect(firstCard).toHaveClass('hover:bg-white', 'hover:shadow-xl', 'hover:-translate-y-2')
    })

    it('shows "Learn more" on hover', () => {
      render(<FeaturesGrid />)

      // The "Learn more" text should be present but initially hidden
      const learnMoreElements = screen.getAllByText('Learn more')
      expect(learnMoreElements.length).toBe(expectedFeatures.length)

      learnMoreElements.forEach(element => {
        expect(element.parentElement).toHaveClass('opacity-0', 'group-hover:opacity-100')
      })
    })

    it('icons scale on hover', () => {
      render(<FeaturesGrid />)

      const firstCard = screen.getByText('Intelligent Automation').closest('.group')
      const iconContainer = firstCard?.querySelector('.w-12.h-12')

      expect(iconContainer).toHaveClass('group-hover:scale-110')
    })
  })

  describe('Grid Layout', () => {
    it('uses responsive grid layout', () => {
      render(<FeaturesGrid />)

      const grid = screen.getByText('Intelligent Automation').closest('.grid')
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
    })

    it('has proper gap between cards', () => {
      render(<FeaturesGrid />)

      const grid = screen.getByText('Intelligent Automation').closest('.grid')
      expect(grid).toHaveClass('gap-8')
    })
  })

  describe('Background Elements', () => {
    it('has gradient background', () => {
      render(<FeaturesGrid />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass('bg-gradient-to-b', 'from-gray-50', 'to-white')
    })

    it('contains decorative background elements', () => {
      render(<FeaturesGrid />)

      const section = screen.getByRole('region')
      const backgroundElements = section.querySelectorAll('.absolute')

      // Should have decorative blur elements
      expect(backgroundElements.length).toBeGreaterThan(0)
    })
  })

  describe('Bottom CTA', () => {
    it('renders bottom CTA button', () => {
      render(<FeaturesGrid />)

      const ctaButton = screen.getByText('Explore All Features')
      expect(ctaButton).toBeInTheDocument()
      expect(ctaButton).toHaveClass('bg-gradient-to-r')
    })

    it('CTA button has arrow icon', () => {
      render(<FeaturesGrid />)

      const ctaButton = screen.getByText('Explore All Features').parentElement
      expect(ctaButton?.querySelector('[data-lucide="arrow-right"]')).toBeInTheDocument()
    })

    it('handles CTA button click', async () => {
      const mockClick = vi.fn()

      render(<FeaturesGrid />)

      const ctaButton = screen.getByText('Explore All Features')
      ctaButton.addEventListener('click', mockClick)

      await user.click(ctaButton)

      expect(mockClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Responsive Design', () => {
    it('adapts heading size for different screens', () => {
      render(<FeaturesGrid />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveClass('text-4xl', 'md:text-5xl')
    })

    it('adjusts padding for mobile', () => {
      render(<FeaturesGrid />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass('py-20')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<FeaturesGrid />)

      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toBeInTheDocument()

      // Feature titles should be h3
      const featureTitles = screen.getAllByRole('heading', { level: 3 })
      expect(featureTitles.length).toBe(expectedFeatures.length)
    })

    it('buttons are keyboard accessible', async () => {
      render(<FeaturesGrid />)

      const ctaButton = screen.getByText('Explore All Features')

      // Should be focusable
      await user.tab()
      expect(document.activeElement).toBe(ctaButton)
    })

    it('has meaningful text content', () => {
      render(<FeaturesGrid />)

      // Important information should be accessible
      expect(screen.getByText(/Everything you need to accelerate with AI/i)).toBeInTheDocument()
      expect(screen.getByText(/comprehensive AI platform/i)).toBeInTheDocument()
    })

    it('lists have proper structure', () => {
      render(<FeaturesGrid />)

      const lists = screen.getAllByRole('list')
      expect(lists.length).toBe(expectedFeatures.length)

      lists.forEach(list => {
        const listItems = within(list).getAllByRole('listitem')
        expect(listItems.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Performance', () => {
    it('renders efficiently', () => {
      const { rerender } = render(<FeaturesGrid />)

      rerender(<FeaturesGrid />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('handles className changes', () => {
      const { rerender } = render(<FeaturesGrid className="test1" />)

      rerender(<FeaturesGrid className="test2" />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass('test2')
      expect(section).not.toHaveClass('test1')
    })
  })

  describe('Content Quality', () => {
    it('has descriptive and actionable content', () => {
      render(<FeaturesGrid />)

      // Check for specific value propositions
      expect(screen.getByText(/Reduce manual work by 80%/i)).toBeInTheDocument()
      expect(screen.getByText(/Real-time decision making/i)).toBeInTheDocument()
      expect(screen.getByText(/SOC 2 Type II certified/i)).toBeInTheDocument()
    })

    it('includes specific metrics and credentials', () => {
      render(<FeaturesGrid />)

      expect(screen.getByText(/99.9% uptime SLA/i)).toBeInTheDocument()
      expect(screen.getByText(/Average 4-week implementation/i)).toBeInTheDocument()
      expect(screen.getByText(/24\/7 technical support/i)).toBeInTheDocument()
    })
  })
})
