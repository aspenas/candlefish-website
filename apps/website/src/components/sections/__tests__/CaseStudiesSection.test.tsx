import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import CaseStudiesSection from '../CaseStudiesSection'

describe('CaseStudiesSection', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const expectedCaseStudies = [
    {
      company: 'GlobalTech Manufacturing',
      industry: 'Manufacturing',
      challenge: 'Manual quality control processes',
      solution: 'Implemented computer vision AI'
    },
    {
      company: 'AeroLogistics',
      industry: 'Transportation',
      challenge: 'Complex route optimization',
      solution: 'Deployed AI-powered logistics optimization'
    },
    {
      company: 'MegaRetail Corp',
      industry: 'E-commerce',
      challenge: 'Personalization at scale',
      solution: 'Built recommendation engine'
    },
    {
      company: 'MedTech Solutions',
      industry: 'Healthcare',
      challenge: 'Need for faster and more accurate diagnostic',
      solution: 'Developed AI-assisted diagnostic tools'
    }
  ]

  describe('Rendering', () => {
    it('renders the case studies section', () => {
      render(<CaseStudiesSection />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('applies custom className when provided', () => {
      const customClass = 'custom-case-studies'
      render(<CaseStudiesSection className={customClass} />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass(customClass)
    })
  })

  describe('Section Header', () => {
    it('renders section badge', () => {
      render(<CaseStudiesSection />)

      expect(screen.getByText('Customer Success Stories')).toBeInTheDocument()
    })

    it('section badge has correct styling and icon', () => {
      render(<CaseStudiesSection />)

      const badge = screen.getByText('Customer Success Stories').parentElement
      expect(badge).toHaveClass('bg-accent-100/50', 'text-accent-700')
      expect(badge?.querySelector('[data-lucide="trending-up"]')).toBeInTheDocument()
    })

    it('renders main heading', () => {
      render(<CaseStudiesSection />)

      expect(screen.getByText('Real Results from')).toBeInTheDocument()
      expect(screen.getByText('Real Companies')).toBeInTheDocument()
    })

    it('main heading has gradient text for "Real Companies"', () => {
      render(<CaseStudiesSection />)

      const realCompaniesText = screen.getByText('Real Companies')
      expect(realCompaniesText).toHaveClass('bg-gradient-to-r', 'bg-clip-text', 'text-transparent')
    })

    it('renders section description', () => {
      render(<CaseStudiesSection />)

      const description = screen.getByText(/See how leading enterprises are transforming/i)
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-xl', 'text-gray-600')
    })
  })

  describe('Case Study Cards', () => {
    it('renders all case study cards', () => {
      render(<CaseStudiesSection />)

      expectedCaseStudies.forEach(caseStudy => {
        expect(screen.getByText(caseStudy.company)).toBeInTheDocument()
      })
    })

    it('featured case study spans multiple columns', () => {
      render(<CaseStudiesSection />)

      const featuredCard = screen.getByText('GlobalTech Manufacturing').closest('.group')
      expect(featuredCard).toHaveClass('lg:col-span-2')
    })

    it('case study cards display company and industry', () => {
      render(<CaseStudiesSection />)

      expectedCaseStudies.forEach(caseStudy => {
        expect(screen.getByText(caseStudy.company)).toBeInTheDocument()
        expect(screen.getByText(caseStudy.industry)).toBeInTheDocument()
      })
    })

    it('case study cards display challenge and solution', () => {
      render(<CaseStudiesSection />)

      expectedCaseStudies.forEach(caseStudy => {
        expect(screen.getByText(new RegExp(caseStudy.challenge, 'i'))).toBeInTheDocument()
        expect(screen.getByText(new RegExp(caseStudy.solution, 'i'))).toBeInTheDocument()
      })
    })

    it('case study cards have proper structure', () => {
      render(<CaseStudiesSection />)

      const firstCard = screen.getByText('GlobalTech Manufacturing').closest('.group')

      // Should have challenge section
      expect(within(firstCard!).getByText('Challenge')).toBeInTheDocument()

      // Should have solution section
      expect(within(firstCard!).getByText('Solution')).toBeInTheDocument()

      // Should have CTA button
      expect(within(firstCard!).getByText('Read Full Case Study')).toBeInTheDocument()
    })

    it('displays results metrics', () => {
      render(<CaseStudiesSection />)

      // Featured case study results
      expect(screen.getByText('95%')).toBeInTheDocument()
      expect(screen.getByText('Defect reduction')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
      expect(screen.getByText('Faster inspection')).toBeInTheDocument()

      // Other case studies
      expect(screen.getByText('40%')).toBeInTheDocument()
      expect(screen.getByText('35%')).toBeInTheDocument()
      expect(screen.getByText('98%')).toBeInTheDocument()
    })

    it('featured case study displays testimonial', () => {
      render(<CaseStudiesSection />)

      expect(screen.getByText(/Candlefish AI transformed our quality control process/i)).toBeInTheDocument()
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
      expect(screen.getByText('VP of Operations')).toBeInTheDocument()
    })
  })

  describe('Card Interactions', () => {
    it('cards have hover effects', () => {
      render(<CaseStudiesSection />)

      const firstCard = screen.getByText('GlobalTech Manufacturing').closest('.group')
      expect(firstCard).toHaveClass('hover:shadow-xl', 'hover:-translate-y-2')
    })

    it('company names change color on hover', () => {
      render(<CaseStudiesSection />)

      const companyName = screen.getByText('GlobalTech Manufacturing')
      expect(companyName).toHaveClass('group-hover:text-primary-600')
    })

    it('arrow appears on hover', () => {
      render(<CaseStudiesSection />)

      const firstCard = screen.getByText('GlobalTech Manufacturing').closest('.group')
      const arrow = firstCard?.querySelector('.opacity-0.group-hover\\:opacity-100')
      expect(arrow).toBeInTheDocument()
    })

    it('handles case study CTA button clicks', async () => {
      const mockClick = vi.fn()

      render(<CaseStudiesSection />)

      const ctaButtons = screen.getAllByText('Read Full Case Study')
      const firstButton = ctaButtons[0]

      firstButton.addEventListener('click', mockClick)
      await user.click(firstButton)

      expect(mockClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Statistics Bar', () => {
    it('renders statistics section', () => {
      render(<CaseStudiesSection />)

      expect(screen.getByText('500+')).toBeInTheDocument()
      expect(screen.getByText('Enterprise Clients')).toBeInTheDocument()

      expect(screen.getByText('95%')).toBeInTheDocument()
      expect(screen.getByText('Success Rate')).toBeInTheDocument()

      expect(screen.getByText('$50M+')).toBeInTheDocument()
      expect(screen.getByText('Client Savings')).toBeInTheDocument()

      expect(screen.getByText('4 weeks')).toBeInTheDocument()
      expect(screen.getByText('Avg. Implementation')).toBeInTheDocument()
    })

    it('statistics have proper styling', () => {
      render(<CaseStudiesSection />)

      const statsContainer = screen.getByText('500+').parentElement?.parentElement?.parentElement
      expect(statsContainer).toHaveClass('bg-gradient-to-r', 'from-gray-50', 'to-gray-100', 'rounded-2xl')
    })

    it('statistics icons have gradient backgrounds', () => {
      render(<CaseStudiesSection />)

      const statsSection = screen.getByText('Enterprise Clients').parentElement?.parentElement
      const iconContainers = statsSection?.querySelectorAll('.bg-gradient-to-br')
      expect(iconContainers?.length).toBeGreaterThan(0)
    })
  })

  describe('Bottom CTA', () => {
    it('renders bottom CTA button', () => {
      render(<CaseStudiesSection />)

      const ctaButton = screen.getByText('View All Case Studies')
      expect(ctaButton).toBeInTheDocument()
      expect(ctaButton).toHaveClass('bg-gradient-to-r')
    })

    it('CTA button has arrow icon', () => {
      render(<CaseStudiesSection />)

      const ctaButton = screen.getByText('View All Case Studies').parentElement
      expect(ctaButton?.querySelector('[data-lucide="arrow-right"]')).toBeInTheDocument()
    })

    it('handles CTA button click', async () => {
      const mockClick = vi.fn()

      render(<CaseStudiesSection />)

      const ctaButton = screen.getByText('View All Case Studies')
      ctaButton.addEventListener('click', mockClick)

      await user.click(ctaButton)

      expect(mockClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Grid Layout', () => {
    it('uses responsive grid layout', () => {
      render(<CaseStudiesSection />)

      const grid = screen.getByText('GlobalTech Manufacturing').closest('.grid')
      expect(grid).toHaveClass('grid-cols-1', 'lg:grid-cols-3')
    })

    it('statistics use responsive grid', () => {
      render(<CaseStudiesSection />)

      const statsGrid = screen.getByText('Enterprise Clients').parentElement?.parentElement?.parentElement
      expect(statsGrid).toHaveClass('grid-cols-2', 'md:grid-cols-4')
    })
  })

  describe('Industry Icons', () => {
    it('displays correct icons for each industry', () => {
      render(<CaseStudiesSection />)

      const section = screen.getByRole('region')

      // Manufacturing - Building2
      expect(section.querySelector('[data-lucide="building-2"]')).toBeInTheDocument()

      // Transportation - Plane
      expect(section.querySelector('[data-lucide="plane"]')).toBeInTheDocument()

      // E-commerce - ShoppingCart
      expect(section.querySelector('[data-lucide="shopping-cart"]')).toBeInTheDocument()

      // Healthcare - Heart
      expect(section.querySelector('[data-lucide="heart"]')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('adapts heading size for different screens', () => {
      render(<CaseStudiesSection />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveClass('text-4xl', 'md:text-5xl')
    })

    it('case study results grid is responsive', () => {
      render(<CaseStudiesSection />)

      const firstCard = screen.getByText('GlobalTech Manufacturing').closest('.group')
      const resultsGrid = firstCard?.querySelector('.grid-cols-2')
      expect(resultsGrid).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<CaseStudiesSection />)

      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toBeInTheDocument()

      // Company names should be h3
      const companyHeadings = screen.getAllByRole('heading', { level: 3 })
      expect(companyHeadings.length).toBe(expectedCaseStudies.length)
    })

    it('challenge and solution sections have proper headings', () => {
      render(<CaseStudiesSection />)

      const challengeHeadings = screen.getAllByRole('heading', { level: 4, name: /challenge/i })
      const solutionHeadings = screen.getAllByRole('heading', { level: 4, name: /solution/i })

      expect(challengeHeadings.length).toBe(expectedCaseStudies.length)
      expect(solutionHeadings.length).toBe(expectedCaseStudies.length)
    })

    it('buttons are keyboard accessible', async () => {
      render(<CaseStudiesSection />)

      const ctaButton = screen.getByText('View All Case Studies')

      // Should be focusable
      await user.tab()
      expect(document.activeElement).toBe(ctaButton)
    })

    it('has meaningful text content', () => {
      render(<CaseStudiesSection />)

      expect(screen.getByText(/Real Results from Real Companies/i)).toBeInTheDocument()
      expect(screen.getByText(/leading enterprises are transforming/i)).toBeInTheDocument()
    })
  })

  describe('Content Quality', () => {
    it('displays specific metrics and achievements', () => {
      render(<CaseStudiesSection />)

      // Specific business metrics
      expect(screen.getByText('$2.3M')).toBeInTheDocument()
      expect(screen.getByText('Annual savings')).toBeInTheDocument()
      expect(screen.getByText('3x')).toBeInTheDocument()
      expect(screen.getByText('Faster deliveries')).toBeInTheDocument()
    })

    it('includes industry-specific challenges', () => {
      render(<CaseStudiesSection />)

      expect(screen.getByText(/Manual quality control processes/i)).toBeInTheDocument()
      expect(screen.getByText(/Complex route optimization/i)).toBeInTheDocument()
      expect(screen.getByText(/Personalization at scale/i)).toBeInTheDocument()
      expect(screen.getByText(/faster and more accurate diagnostic/i)).toBeInTheDocument()
    })

    it('shows measurable outcomes', () => {
      render(<CaseStudiesSection />)

      // Look for percentage improvements
      expect(screen.getByText('95%')).toBeInTheDocument() // Multiple 95% metrics
      expect(screen.getByText('40%')).toBeInTheDocument()
      expect(screen.getByText('35%')).toBeInTheDocument()
      expect(screen.getByText('98%')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders efficiently', () => {
      const { rerender } = render(<CaseStudiesSection />)

      rerender(<CaseStudiesSection />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('handles className changes', () => {
      const { rerender } = render(<CaseStudiesSection className="test1" />)

      rerender(<CaseStudiesSection className="test2" />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass('test2')
      expect(section).not.toHaveClass('test1')
    })
  })

  describe('Data Structure', () => {
    it('handles case studies array correctly', () => {
      render(<CaseStudiesSection />)

      // Should render the correct number of case studies
      const caseStudyCards = screen.getAllByText('Read Full Case Study')
      expect(caseStudyCards.length).toBe(expectedCaseStudies.length)
    })

    it('properly structures results data', () => {
      render(<CaseStudiesSection />)

      // Each non-featured case study should show 2 results
      const resultValues = ['40%', '3x', '35%', '2.5x', '98%', '70%']
      resultValues.forEach(value => {
        expect(screen.getByText(value)).toBeInTheDocument()
      })
    })
  })
})
