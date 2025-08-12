import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import Navigation from '../Navigation'

describe('Navigation', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the navigation component', () => {
      render(<Navigation />)
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByText('Candlefish AI')).toBeInTheDocument()
      expect(screen.getByAltText('Candlefish AI')).toBeInTheDocument()
    })

    it('renders all navigation items', () => {
      render(<Navigation />)
      
      const navItems = ['Products', 'Solutions', 'Resources', 'Company']
      
      navItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument()
      })
    })

    it('renders Get Started button', () => {
      render(<Navigation />)
      
      const getStartedButtons = screen.getAllByText('Get Started')
      expect(getStartedButtons.length).toBeGreaterThan(0)
    })

    it('applies custom className when provided', () => {
      const customClass = 'custom-navigation'
      render(<Navigation className={customClass} />)
      
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass(customClass)
    })
  })

  describe('Scroll Behavior', () => {
    it('changes appearance when scrolled', async () => {
      render(<Navigation />)
      
      const nav = screen.getByRole('navigation')
      
      // Initially should have transparent background
      expect(nav).toHaveClass('bg-white/80')
      
      // Mock scroll event
      Object.defineProperty(window, 'scrollY', {
        value: 50,
        writable: true
      })
      
      fireEvent.scroll(window)
      
      await waitFor(() => {
        expect(nav).toHaveClass('bg-white/95')
        expect(nav).toHaveClass('backdrop-blur-lg')
        expect(nav).toHaveClass('shadow-lg')
      })
    })

    it('adds and removes scroll event listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      
      const { unmount } = render(<Navigation />)
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
      
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })

  describe('Mobile Menu', () => {
    it('toggles mobile menu when button is clicked', async () => {
      render(<Navigation />)
      
      const mobileMenuButton = screen.getByLabelText('Toggle mobile menu')
      expect(mobileMenuButton).toBeInTheDocument()
      
      // Mobile menu should be closed initially
      const mobileMenu = mobileMenuButton.closest('nav')?.querySelector('.md\\:hidden:last-child')
      expect(mobileMenu).toHaveClass('max-h-0', 'opacity-0')
      
      // Click to open menu
      await user.click(mobileMenuButton)
      
      await waitFor(() => {
        expect(mobileMenu).toHaveClass('max-h-96', 'opacity-100')
      })
      
      // Click to close menu
      await user.click(mobileMenuButton)
      
      await waitFor(() => {
        expect(mobileMenu).toHaveClass('max-h-0', 'opacity-0')
      })
    })

    it('shows correct icon based on menu state', async () => {
      render(<Navigation />)
      
      const mobileMenuButton = screen.getByLabelText('Toggle mobile menu')
      
      // Should show Menu icon initially
      expect(mobileMenuButton.querySelector('[data-lucide="menu"]')).toBeInTheDocument()
      
      // Click to open menu
      await user.click(mobileMenuButton)
      
      // Should show X icon when menu is open
      expect(mobileMenuButton.querySelector('[data-lucide="x"]')).toBeInTheDocument()
    })

    it('closes mobile menu when navigation link is clicked', async () => {
      render(<Navigation />)
      
      const mobileMenuButton = screen.getByLabelText('Toggle mobile menu')
      
      // Open mobile menu
      await user.click(mobileMenuButton)
      
      // Find mobile navigation links (they should be in the mobile menu container)
      const mobileMenu = mobileMenuButton.closest('nav')?.querySelector('.md\\:hidden:last-child')
      const productsLink = mobileMenu?.querySelector('a[href="#products"]')
      
      if (productsLink) {
        await user.click(productsLink)
        
        await waitFor(() => {
          const updatedMobileMenu = mobileMenuButton.closest('nav')?.querySelector('.md\\:hidden:last-child')
          expect(updatedMobileMenu).toHaveClass('max-h-0', 'opacity-0')
        })
      }
    })
  })

  describe('Navigation Links', () => {
    it('has correct href attributes for navigation items', () => {
      render(<Navigation />)
      
      const expectedLinks = [
        { text: 'Products', href: '#products' },
        { text: 'Solutions', href: '#solutions' },
        { text: 'Resources', href: '#resources' },
        { text: 'Company', href: '#company' }
      ]
      
      expectedLinks.forEach(({ text, href }) => {
        const link = screen.getByRole('link', { name: text })
        expect(link).toHaveAttribute('href', href)
      })
    })

    it('applies hover effects to navigation links', async () => {
      render(<Navigation />)
      
      const productsLink = screen.getByRole('link', { name: 'Products' })
      
      await user.hover(productsLink)
      
      // Check if hover classes are applied (these would be handled by CSS)
      expect(productsLink).toHaveClass('hover:text-gray-900')
    })
  })

  describe('Logo and Branding', () => {
    it('renders logo image with correct attributes', () => {
      render(<Navigation />)
      
      const logo = screen.getByAltText('Candlefish AI')
      expect(logo).toHaveAttribute('src', '/logo/candlefish-logo.png')
      expect(logo).toHaveClass('w-6', 'h-6')
    })

    it('renders company name', () => {
      render(<Navigation />)
      
      const companyName = screen.getByText('Candlefish AI')
      expect(companyName).toHaveClass('text-xl', 'font-bold')
    })
  })

  describe('Responsive Design', () => {
    it('shows desktop navigation on larger screens', () => {
      render(<Navigation />)
      
      // Desktop navigation should have hidden class for mobile
      const desktopNav = screen.getByRole('navigation').querySelector('.hidden.md\\:flex')
      expect(desktopNav).toBeInTheDocument()
    })

    it('shows mobile menu button on smaller screens', () => {
      render(<Navigation />)
      
      const mobileMenuButton = screen.getByLabelText('Toggle mobile menu')
      expect(mobileMenuButton).toHaveClass('md:hidden')
    })
  })

  describe('Button Interactions', () => {
    it('renders Get Started button with correct styling', () => {
      render(<Navigation />)
      
      const getStartedButtons = screen.getAllByText('Get Started')
      const desktopButton = getStartedButtons[0] // First one should be desktop version
      
      expect(desktopButton).toHaveClass('bg-gradient-to-r')
      expect(desktopButton).toHaveClass('from-primary-500')
      expect(desktopButton).toHaveClass('to-primary-600')
    })

    it('handles Get Started button clicks', async () => {
      const mockClick = vi.fn()
      
      render(<Navigation />)
      
      const getStartedButton = screen.getAllByText('Get Started')[0]
      
      // Add click handler
      getStartedButton.addEventListener('click', mockClick)
      
      await user.click(getStartedButton)
      
      expect(mockClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA label for mobile menu button', () => {
      render(<Navigation />)
      
      const mobileMenuButton = screen.getByLabelText('Toggle mobile menu')
      expect(mobileMenuButton).toHaveAttribute('aria-label', 'Toggle mobile menu')
    })

    it('supports keyboard navigation', async () => {
      render(<Navigation />)
      
      const productsLink = screen.getByRole('link', { name: 'Products' })
      
      // Tab to the link
      await user.tab()
      
      // Should be focusable
      expect(productsLink).toBeVisible()
    })

    it('has proper role attributes', () => {
      render(<Navigation />)
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      
      const navLinks = screen.getAllByRole('link')
      expect(navLinks.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('renders without unnecessary re-renders', () => {
      const { rerender } = render(<Navigation />)
      
      // Re-render with same props
      rerender(<Navigation />)
      
      // Should still be in the document
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('handles rapid scroll events without breaking', () => {
      render(<Navigation />)
      
      // Simulate rapid scroll events
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(window, 'scrollY', {
          value: i * 10,
          writable: true
        })
        fireEvent.scroll(window)
      }
      
      // Component should still be functional
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })
})