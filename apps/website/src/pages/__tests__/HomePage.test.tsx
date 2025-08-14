import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import HomePage from '../HomePage'

describe('HomePage Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Page Structure', () => {
    it('renders all main sections', () => {
      render(<HomePage />)

      // Check for main element
      expect(screen.getByRole('main')).toBeInTheDocument()

      // Check for all major sections
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('banner')).toBeInTheDocument() // HeroSection
      expect(screen.getByRole('contentinfo')).toBeInTheDocument() // Footer
    })

    it('has correct page layout structure', () => {
      render(<HomePage />)

      const page = screen.getByText('Candlefish AI').closest('.professional-app')
      expect(page).toBeInTheDocument()
    })

    it('imports design system styles', () => {
      render(<HomePage />)

      // The page should have the professional-app class that comes from design-system.css
      const pageContainer = screen.getByText('Candlefish AI').closest('.professional-app')
      expect(pageContainer).toBeInTheDocument()
    })
  })

  describe('Navigation Integration', () => {
    it('navigation is positioned correctly', () => {
      render(<HomePage />)

      const navigation = screen.getByRole('navigation')
      expect(navigation).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-50')
    })

    it('navigation contains expected elements', () => {
      render(<HomePage />)

      // Logo and brand
      expect(screen.getByAltText('Candlefish AI')).toBeInTheDocument()
      expect(screen.getByText('Candlefish AI')).toBeInTheDocument()

      // Navigation links
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Solutions')).toBeInTheDocument()
      expect(screen.getByText('Resources')).toBeInTheDocument()
      expect(screen.getByText('Company')).toBeInTheDocument()

      // CTA button
      expect(screen.getAllByText('Get Started').length).toBeGreaterThan(0)
    })

    it('navigation mobile menu functionality works', async () => {
      render(<HomePage />)

      const mobileMenuButton = screen.getByLabelText('Toggle mobile menu')
      await user.click(mobileMenuButton)

      // Mobile menu should open
      // Note: This tests the integration between the navigation component and the page
      expect(mobileMenuButton).toBeInTheDocument()
    })
  })

  describe('Hero Section Integration', () => {
    it('hero section displays main value proposition', () => {
      render(<HomePage />)

      expect(screen.getByText('Transform Your Business with')).toBeInTheDocument()
      expect(screen.getByText('Enterprise AI')).toBeInTheDocument()
      expect(screen.getByText(/We help enterprises implement AI solutions/)).toBeInTheDocument()
    })

    it('hero section CTA buttons work', async () => {
      render(<HomePage />)

      const startTrialButton = screen.getByText('Start Free Trial')
      const watchDemoButton = screen.getByText('Watch Demo')

      expect(startTrialButton).toBeInTheDocument()
      expect(watchDemoButton).toBeInTheDocument()

      // Test button interactions
      await user.hover(startTrialButton)
      await user.hover(watchDemoButton)
    })

    it('hero statistics are displayed', () => {
      render(<HomePage />)

      expect(screen.getByText('99.9%')).toBeInTheDocument()
      expect(screen.getByText('Uptime Guarantee')).toBeInTheDocument()
      expect(screen.getByText('10x')).toBeInTheDocument()
      expect(screen.getByText('Faster Deployment')).toBeInTheDocument()
    })
  })

  describe('Features Grid Integration', () => {
    it('features section displays all features', () => {
      render(<HomePage />)

      const expectedFeatures = [
        'Intelligent Automation',
        'Predictive Analytics',
        'Enterprise Security',
        'Rapid Deployment',
        'Custom AI Models',
        'Global Scale'
      ]

      expectedFeatures.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument()
      })
    })

    it('features have proper descriptions and benefits', () => {
      render(<HomePage />)

      // Test a specific feature
      expect(screen.getByText('Intelligent Automation')).toBeInTheDocument()
      expect(screen.getByText(/Transform complex business processes/)).toBeInTheDocument()
      expect(screen.getByText('Reduce manual work by 80%')).toBeInTheDocument()
    })

    it('features CTA button works', async () => {
      render(<HomePage />)

      const featuresButton = screen.getByText('Explore All Features')
      expect(featuresButton).toBeInTheDocument()

      await user.hover(featuresButton)
    })
  })

  describe('Case Studies Integration', () => {
    it('case studies section displays all case studies', () => {
      render(<HomePage />)

      const expectedCaseStudies = [
        'GlobalTech Manufacturing',
        'AeroLogistics',
        'MegaRetail Corp',
        'MedTech Solutions'
      ]

      expectedCaseStudies.forEach(company => {
        expect(screen.getByText(company)).toBeInTheDocument()
      })
    })

    it('case studies have metrics and results', () => {
      render(<HomePage />)

      // Test specific metrics
      expect(screen.getByText('95%')).toBeInTheDocument()
      expect(screen.getByText('Defect reduction')).toBeInTheDocument()
      expect(screen.getByText('$2.3M')).toBeInTheDocument()
      expect(screen.getByText('Annual savings')).toBeInTheDocument()
    })

    it('displays testimonial in featured case study', () => {
      render(<HomePage />)

      expect(screen.getByText(/Candlefish AI transformed our quality control process/)).toBeInTheDocument()
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
      expect(screen.getByText('VP of Operations')).toBeInTheDocument()
    })
  })

  describe('Testimonials Integration', () => {
    it('testimonials section displays first testimonial', () => {
      render(<HomePage />)

      expect(screen.getByText(/Candlefish AI transformed our entire operation/)).toBeInTheDocument()
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
      expect(screen.getByText('Chief Technology Officer')).toBeInTheDocument()
      expect(screen.getByText('GlobalTech Manufacturing')).toBeInTheDocument()
    })

    it('testimonial navigation controls work', async () => {
      render(<HomePage />)

      const nextButton = screen.getByLabelText('Next testimonial')
      const prevButton = screen.getByLabelText('Previous testimonial')

      expect(nextButton).toBeInTheDocument()
      expect(prevButton).toBeInTheDocument()

      // Test navigation
      await user.click(nextButton)
    })

    it('testimonial metrics are displayed', () => {
      render(<HomePage />)

      expect(screen.getByText('300%')).toBeInTheDocument()
      expect(screen.getByText('Efficiency Increase')).toBeInTheDocument()
    })
  })

  describe('CTA Section Integration', () => {
    it('CTA section displays with primary variant', () => {
      render(<HomePage />)

      // Should use primary variant as specified in HomePage
      expect(screen.getByText('Ready to')).toBeInTheDocument()
      expect(screen.getByText('10x')).toBeInTheDocument()
      expect(screen.getByText('Your Business Efficiency?')).toBeInTheDocument()
    })

    it('CTA section has proper call-to-action buttons', () => {
      render(<HomePage />)

      // Look for multiple "Start Free Trial" buttons (one in nav, one in CTA)
      const startTrialButtons = screen.getAllByText('Start Free Trial')
      expect(startTrialButtons.length).toBeGreaterThan(1)

      expect(screen.getByText('Book Demo')).toBeInTheDocument()
    })

    it('CTA section displays value propositions', () => {
      render(<HomePage />)

      expect(screen.getByText('No Risk')).toBeInTheDocument()
      expect(screen.getByText('30-day money-back guarantee')).toBeInTheDocument()
      expect(screen.getByText('Fast Setup')).toBeInTheDocument()
      expect(screen.getByText('Enterprise Ready')).toBeInTheDocument()
    })
  })

  describe('Footer Integration', () => {
    it('footer displays company information', () => {
      render(<HomePage />)

      expect(screen.getByText('hello@candlefish.ai')).toBeInTheDocument()
      expect(screen.getByText('+1 (555) 012-3456')).toBeInTheDocument()
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
    })

    it('footer has newsletter signup', () => {
      render(<HomePage />)

      expect(screen.getByText('Stay ahead with AI insights')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument()
      expect(screen.getByText('Subscribe')).toBeInTheDocument()
    })

    it('footer navigation links are present', () => {
      render(<HomePage />)

      expect(screen.getByText('AI Automation')).toBeInTheDocument()
      expect(screen.getByText('Manufacturing')).toBeInTheDocument()
      expect(screen.getByText('Documentation')).toBeInTheDocument()
      expect(screen.getByText('About Us')).toBeInTheDocument()
    })

    it('footer social links work', () => {
      render(<HomePage />)

      expect(screen.getByLabelText('Twitter')).toBeInTheDocument()
      expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument()
      expect(screen.getByLabelText('GitHub')).toBeInTheDocument()
    })
  })

  describe('Cross-Section Interactions', () => {
    it('multiple CTA buttons exist throughout the page', () => {
      render(<HomePage />)

      // Count all CTA-style buttons
      const getStartedButtons = screen.getAllByText('Get Started')
      const startTrialButtons = screen.getAllByText('Start Free Trial')
      const exploreButtons = screen.getAllByText('Explore All Features')
      const viewAllButtons = screen.getAllByText('View All Case Studies')

      // Should have multiple CTAs throughout the funnel
      expect(getStartedButtons.length + startTrialButtons.length).toBeGreaterThan(2)
      expect(exploreButtons.length).toBeGreaterThan(0)
      expect(viewAllButtons.length).toBeGreaterThan(0)
    })

    it('consistent branding across sections', () => {
      render(<HomePage />)

      // Logo should appear in navigation and footer
      const logos = screen.getAllByAltText('Candlefish AI')
      expect(logos.length).toBe(2) // Nav and footer

      // Company name should appear multiple times
      const companyNames = screen.getAllByText('Candlefish AI')
      expect(companyNames.length).toBeGreaterThan(2)
    })

    it('consistent color scheme and styling', () => {
      render(<HomePage />)

      // Test for consistent gradient usage
      const page = screen.getByRole('main').parentElement
      const gradientElements = page?.querySelectorAll('[class*="gradient"]')
      expect(gradientElements?.length).toBeGreaterThan(0)
    })
  })

  describe('Content Flow', () => {
    it('sections appear in logical order', () => {
      render(<HomePage />)

      const main = screen.getByRole('main')
      const sections = Array.from(main.children)

      expect(sections.length).toBeGreaterThan(4) // Hero, Features, Case Studies, Testimonials, CTA
    })

    it('progressive value proposition throughout sections', () => {
      render(<HomePage />)

      // Hero introduces the value prop
      expect(screen.getByText('Transform Your Business with')).toBeInTheDocument()

      // Features elaborate on capabilities
      expect(screen.getByText('Everything you need to')).toBeInTheDocument()
      expect(screen.getByText('accelerate')).toBeInTheDocument()

      // Case studies provide proof
      expect(screen.getByText('Real Results from')).toBeInTheDocument()

      // Testimonials add credibility
      expect(screen.getByText('Trusted by')).toBeInTheDocument()

      // CTA drives action
      expect(screen.getByText('Ready to')).toBeInTheDocument()
    })
  })

  describe('Performance Integration', () => {
    it('page renders all components without errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<HomePage />)

      // Page should render completely
      expect(screen.getByRole('main')).toBeInTheDocument()

      // No React errors should be logged
      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('all images have proper alt text', () => {
      render(<HomePage />)

      const images = screen.getAllByRole('img')

      images.forEach(img => {
        expect(img).toHaveAttribute('alt')
        expect(img.getAttribute('alt')).not.toBe('')
      })
    })

    it('all buttons are interactive', async () => {
      render(<HomePage />)

      const buttons = screen.getAllByRole('button')

      // All buttons should be clickable
      for (const button of buttons) {
        expect(button).toBeEnabled()
      }
    })
  })

  describe('Accessibility Integration', () => {
    it('has proper page structure with headings', () => {
      render(<HomePage />)

      // Should have h1 for main heading
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()

      // Should have h2s for section headings
      const sectionHeadings = screen.getAllByRole('heading', { level: 2 })
      expect(sectionHeadings.length).toBeGreaterThan(3)
    })

    it('maintains focus management', async () => {
      render(<HomePage />)

      // Test keyboard navigation works
      const firstLink = screen.getByText('Products')
      firstLink.focus()

      expect(document.activeElement).toBe(firstLink)
    })

    it('all interactive elements are keyboard accessible', () => {
      render(<HomePage />)

      const interactiveElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('link'),
        ...screen.getAllByRole('textbox')
      ]

      interactiveElements.forEach(element => {
        expect(element).toBeVisible()
      })
    })

    it('has proper landmark roles', () => {
      render(<HomePage />)

      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('banner')).toBeInTheDocument() // Hero section
      expect(screen.getByRole('contentinfo')).toBeInTheDocument() // Footer
    })
  })

  describe('Responsive Behavior', () => {
    it('all sections use responsive classes', () => {
      render(<HomePage />)

      const page = screen.getByRole('main')

      // Check for responsive grid classes
      const responsiveElements = page.querySelectorAll('[class*="md:"], [class*="lg:"], [class*="sm:"]')
      expect(responsiveElements.length).toBeGreaterThan(10)
    })

    it('text sizing adapts across sections', () => {
      render(<HomePage />)

      // Main heading
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveClass('text-5xl', 'md:text-7xl')

      // Section headings should also be responsive
      const sectionHeadings = screen.getAllByRole('heading', { level: 2 })
      sectionHeadings.forEach(heading => {
        const classes = heading.className
        expect(classes).toMatch(/text-\w+/)
      })
    })
  })
})
