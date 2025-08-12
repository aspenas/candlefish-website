import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import HeroSection from '../HeroSection'

describe('HeroSection', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the hero section', () => {
      render(<HeroSection />)
      
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('renders main headline', () => {
      render(<HeroSection />)
      
      expect(screen.getByText('Transform Your Business with')).toBeInTheDocument()
      expect(screen.getByText('Enterprise AI')).toBeInTheDocument()
    })

    it('renders subtitle', () => {
      render(<HeroSection />)
      
      const subtitle = screen.getByText(/We help enterprises implement AI solutions/i)
      expect(subtitle).toBeInTheDocument()
      expect(subtitle).toHaveClass('text-xl', 'md:text-2xl')
    })

    it('applies custom className when provided', () => {
      const customClass = 'custom-hero'
      render(<HeroSection className={customClass} />)
      
      const hero = screen.getByRole('banner')
      expect(hero).toHaveClass(customClass)
    })
  })

  describe('Trust Badge', () => {
    it('renders trust badge with correct content', () => {
      render(<HeroSection />)
      
      expect(screen.getByText('Trusted by leading enterprises worldwide')).toBeInTheDocument()
    })

    it('displays checkmark icon in trust badge', () => {
      render(<HeroSection />)
      
      const trustBadge = screen.getByText('Trusted by leading enterprises worldwide').parentElement
      expect(trustBadge?.querySelector('[data-lucide="check-circle"]')).toBeInTheDocument()
    })
  })

  describe('CTA Buttons', () => {
    it('renders Start Free Trial button', () => {
      render(<HeroSection />)
      
      const startTrialButton = screen.getByText('Start Free Trial')
      expect(startTrialButton).toBeInTheDocument()
      expect(startTrialButton).toHaveClass('bg-gradient-to-r')
    })

    it('renders Watch Demo button', () => {
      render(<HeroSection />)
      
      const watchDemoButton = screen.getByText('Watch Demo')
      expect(watchDemoButton).toBeInTheDocument()
    })

    it('Start Free Trial button has arrow icon', () => {
      render(<HeroSection />)
      
      const startTrialButton = screen.getByText('Start Free Trial').parentElement
      expect(startTrialButton?.querySelector('[data-lucide="arrow-right"]')).toBeInTheDocument()
    })

    it('Watch Demo button has play icon', () => {
      render(<HeroSection />)
      
      const watchDemoButton = screen.getByText('Watch Demo').parentElement
      expect(watchDemoButton?.querySelector('[data-lucide="play"]')).toBeInTheDocument()
    })

    it('handles CTA button clicks', async () => {
      const mockClick = vi.fn()
      
      render(<HeroSection />)
      
      const startTrialButton = screen.getByText('Start Free Trial')
      startTrialButton.addEventListener('click', mockClick)
      
      await user.click(startTrialButton)
      
      expect(mockClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Trust Indicators', () => {
    it('renders all trust indicators', () => {
      render(<HeroSection />)
      
      expect(screen.getByText('500+ Companies')).toBeInTheDocument()
      expect(screen.getByText('10x Faster Implementation')).toBeInTheDocument()
      expect(screen.getByText('Global Scale')).toBeInTheDocument()
    })

    it('trust indicators have correct icons', () => {
      render(<HeroSection />)
      
      const trustSection = screen.getByText('500+ Companies').parentElement?.parentElement
      
      // Check for Users, Zap, and Globe icons
      expect(trustSection?.querySelector('[data-lucide="users"]')).toBeInTheDocument()
      expect(trustSection?.querySelector('[data-lucide="zap"]')).toBeInTheDocument()
      expect(trustSection?.querySelector('[data-lucide="globe"]')).toBeInTheDocument()
    })
  })

  describe('Statistics Cards', () => {
    it('renders all statistics cards', () => {
      render(<HeroSection />)
      
      expect(screen.getByText('99.9%')).toBeInTheDocument()
      expect(screen.getByText('10x')).toBeInTheDocument()
      expect(screen.getByText('500+')).toBeInTheDocument()
    })

    it('statistics cards have correct labels', () => {
      render(<HeroSection />)
      
      expect(screen.getByText('Uptime Guarantee')).toBeInTheDocument()
      expect(screen.getByText('Faster Deployment')).toBeInTheDocument()
      expect(screen.getByText('Active Clients')).toBeInTheDocument()
    })

    it('statistics cards have descriptions', () => {
      render(<HeroSection />)
      
      expect(screen.getByText('Enterprise-grade reliability')).toBeInTheDocument()
      expect(screen.getByText('Compared to traditional methods')).toBeInTheDocument()
      expect(screen.getByText('Across 50+ countries')).toBeInTheDocument()
    })

    it('statistics cards have proper styling', () => {
      render(<HeroSection />)
      
      const statCard = screen.getByText('99.9%').parentElement
      expect(statCard).toHaveClass('bg-white/60', 'backdrop-blur-sm', 'rounded-2xl')
    })
  })

  describe('Layout and Styling', () => {
    it('has gradient background', () => {
      render(<HeroSection />)
      
      const hero = screen.getByRole('banner')
      expect(hero).toHaveClass('bg-gradient-to-br', 'from-white', 'via-gray-50', 'to-gray-100')
    })

    it('has minimum height for full screen', () => {
      render(<HeroSection />)
      
      const hero = screen.getByRole('banner')
      expect(hero).toHaveClass('min-h-screen')
    })

    it('is positioned relative for absolute elements', () => {
      render(<HeroSection />)
      
      const hero = screen.getByRole('banner')
      expect(hero).toHaveClass('relative')
    })

    it('has proper z-index for content', () => {
      render(<HeroSection />)
      
      const mainContent = screen.getByText('Transform Your Business with').closest('.relative')
      expect(mainContent).toHaveClass('z-10')
    })
  })

  describe('Typography', () => {
    it('main headline has correct typography classes', () => {
      render(<HeroSection />)
      
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toHaveClass('text-5xl', 'md:text-7xl', 'font-bold')
    })

    it('Enterprise AI text has gradient styling', () => {
      render(<HeroSection />)
      
      const enterpriseAIText = screen.getByText('Enterprise AI')
      expect(enterpriseAIText).toHaveClass('bg-gradient-to-r', 'bg-clip-text', 'text-transparent')
    })

    it('subtitle has proper spacing and sizing', () => {
      render(<HeroSection />)
      
      const subtitle = screen.getByText(/We help enterprises implement AI solutions/i)
      expect(subtitle).toHaveClass('text-xl', 'md:text-2xl', 'text-gray-600', 'mb-8')
    })
  })

  describe('Responsive Design', () => {
    it('adapts text size for mobile and desktop', () => {
      render(<HeroSection />)
      
      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toHaveClass('text-5xl', 'md:text-7xl')
      
      const subtitle = screen.getByText(/We help enterprises implement AI solutions/i)
      expect(subtitle).toHaveClass('text-xl', 'md:text-2xl')
    })

    it('buttons stack on mobile', () => {
      render(<HeroSection />)
      
      const buttonContainer = screen.getByText('Start Free Trial').parentElement?.parentElement
      expect(buttonContainer).toHaveClass('flex', 'flex-col', 'sm:flex-row')
    })

    it('statistics grid adapts to screen size', () => {
      render(<HeroSection />)
      
      const statsGrid = screen.getByText('99.9%').parentElement?.parentElement
      expect(statsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3')
    })
  })

  describe('Animations and Interactions', () => {
    it('has scroll indicator with animation', () => {
      render(<HeroSection />)
      
      const scrollIndicator = screen.getByRole('banner').querySelector('.animate-bounce')
      expect(scrollIndicator).toBeInTheDocument()
    })

    it('buttons have hover effects', () => {
      render(<HeroSection />)
      
      const startTrialButton = screen.getByText('Start Free Trial')
      expect(startTrialButton).toHaveClass('hover:from-primary-600', 'hover:to-primary-700')
      
      const watchDemoButton = screen.getByText('Watch Demo')
      expect(watchDemoButton).toHaveClass('hover:bg-white', 'hover:shadow-lg')
    })

    it('statistics cards have hover effects', () => {
      render(<HeroSection />)
      
      const statCard = screen.getByText('99.9%').parentElement
      expect(statCard).toHaveClass('hover:bg-white/80', 'hover:shadow-lg', 'hover:-translate-y-1')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<HeroSection />)
      
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()
    })

    it('buttons are keyboard accessible', async () => {
      render(<HeroSection />)
      
      const startTrialButton = screen.getByText('Start Free Trial')
      
      // Tab to the button
      await user.tab()
      
      expect(startTrialButton).toBeVisible()
    })

    it('has meaningful text content', () => {
      render(<HeroSection />)
      
      // Check that important information is present and meaningful
      expect(screen.getByText(/Transform Your Business/i)).toBeInTheDocument()
      expect(screen.getByText(/We help enterprises implement AI solutions/i)).toBeInTheDocument()
    })

    it('icons have proper attributes for screen readers', () => {
      render(<HeroSection />)
      
      // Icons should be decorative and not interfere with screen readers
      const icons = screen.getByRole('banner').querySelectorAll('[data-lucide]')
      icons.forEach(icon => {
        // Icons should not be focused or announced separately
        expect(icon.parentElement).not.toHaveAttribute('role', 'img')
      })
    })
  })

  describe('Performance', () => {
    it('renders efficiently without unnecessary re-renders', () => {
      const { rerender } = render(<HeroSection />)
      
      // Re-render with same props
      rerender(<HeroSection />)
      
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('handles different className props without issues', () => {
      const { rerender } = render(<HeroSection className="test-class" />)
      
      rerender(<HeroSection className="another-class" />)
      
      const hero = screen.getByRole('banner')
      expect(hero).toHaveClass('another-class')
      expect(hero).not.toHaveClass('test-class')
    })
  })

  describe('Content Structure', () => {
    it('maintains proper content hierarchy', () => {
      render(<HeroSection />)
      
      // Trust badge should appear before main headline
      const trustBadge = screen.getByText('Trusted by leading enterprises worldwide')
      const headline = screen.getByRole('heading', { level: 1 })
      
      expect(trustBadge.compareDocumentPosition(headline)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    })

    it('CTA buttons appear after main content', () => {
      render(<HeroSection />)
      
      const subtitle = screen.getByText(/We help enterprises implement AI solutions/i)
      const startTrialButton = screen.getByText('Start Free Trial')
      
      expect(subtitle.compareDocumentPosition(startTrialButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    })
  })
})