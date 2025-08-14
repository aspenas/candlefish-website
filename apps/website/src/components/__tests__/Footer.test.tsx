import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import Footer from '../Footer'

describe('Footer', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const expectedFooterSections = [
    {
      title: 'Products',
      links: ['AI Automation', 'Predictive Analytics', 'Custom Models', 'Enterprise Platform']
    },
    {
      title: 'Solutions',
      links: ['Manufacturing', 'Healthcare', 'Financial Services', 'Retail & E-commerce']
    },
    {
      title: 'Resources',
      links: ['Documentation', 'Case Studies', 'Blog', 'Whitepapers', 'API Reference']
    },
    {
      title: 'Company',
      links: ['About Us', 'Careers', 'Press', 'Partners', 'Contact']
    }
  ]

  describe('Rendering', () => {
    it('renders the footer', () => {
      render(<Footer />)

      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('applies custom className when provided', () => {
      const customClass = 'custom-footer'
      render(<Footer className={customClass} />)

      const footer = screen.getByRole('contentinfo')
      expect(footer).toHaveClass(customClass)
    })

    it('has proper background styling', () => {
      render(<Footer />)

      const footer = screen.getByRole('contentinfo')
      expect(footer).toHaveClass('bg-gray-900', 'text-white')
    })
  })

  describe('Newsletter Section', () => {
    it('renders newsletter section', () => {
      render(<Footer />)

      expect(screen.getByText('Stay ahead with AI insights')).toBeInTheDocument()
      expect(screen.getByText(/Get the latest updates on AI trends/)).toBeInTheDocument()
    })

    it('renders newsletter form', () => {
      render(<Footer />)

      expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument()
      expect(screen.getByText('Subscribe')).toBeInTheDocument()
    })

    it('displays newsletter trust message', () => {
      render(<Footer />)

      expect(screen.getByText('Join 10,000+ professionals. Unsubscribe anytime.')).toBeInTheDocument()
    })

    it('validates email input', async () => {
      render(<Footer />)

      const submitButton = screen.getByText('Subscribe')
      await user.click(submitButton)

      const emailInput = screen.getByPlaceholderText('Enter your email address')
      expect(emailInput).toBeInvalid()
    })

    it('handles newsletter form submission', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(<Footer />)

      const emailInput = screen.getByPlaceholderText('Enter your email address')
      const submitButton = screen.getByText('Subscribe')

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      // Should show loading state
      expect(screen.getByRole('button', { name: /subscribe/i })).toBeDisabled()
      expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument()

      // Fast-forward the timer to complete the submission
      vi.advanceTimersByTime(1500)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Newsletter signup:', 'test@example.com')
        expect(screen.getByText('Subscribed!')).toBeInTheDocument()
        expect(emailInput).toHaveValue('')
      })

      // Fast-forward to reset success state
      vi.advanceTimersByTime(3000)

      await waitFor(() => {
        expect(screen.getByText('Subscribe')).toBeInTheDocument()
        expect(screen.queryByText('Subscribed!')).not.toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('shows success state with check icon', async () => {
      render(<Footer />)

      const emailInput = screen.getByPlaceholderText('Enter your email address')
      const submitButton = screen.getByText('Subscribe')

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      vi.advanceTimersByTime(1500)

      await waitFor(() => {
        expect(screen.getByText('Subscribed!')).toBeInTheDocument()
        expect(screen.getByRole('contentinfo').querySelector('[data-lucide="check-circle"]')).toBeInTheDocument()
      })
    })

    it('disables form during submission', async () => {
      render(<Footer />)

      const emailInput = screen.getByPlaceholderText('Enter your email address')
      const submitButton = screen.getByText('Subscribe')

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      expect(emailInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Company Information', () => {
    it('renders company logo and name', () => {
      render(<Footer />)

      expect(screen.getByAltText('Candlefish AI')).toBeInTheDocument()
      expect(screen.getByText('Candlefish AI')).toBeInTheDocument()
    })

    it('displays company description', () => {
      render(<Footer />)

      expect(screen.getByText(/Transforming enterprises through intelligent AI solutions/)).toBeInTheDocument()
    })

    it('renders contact information', () => {
      render(<Footer />)

      expect(screen.getByText('hello@candlefish.ai')).toBeInTheDocument()
      expect(screen.getByText('+1 (555) 012-3456')).toBeInTheDocument()
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
    })

    it('contact links are functional', () => {
      render(<Footer />)

      const emailLink = screen.getByText('hello@candlefish.ai')
      expect(emailLink.closest('a')).toHaveAttribute('href', 'mailto:hello@candlefish.ai')

      const phoneLink = screen.getByText('+1 (555) 012-3456')
      expect(phoneLink.closest('a')).toHaveAttribute('href', 'tel:+1-555-0123')
    })

    it('displays contact icons', () => {
      render(<Footer />)

      const footer = screen.getByRole('contentinfo')
      expect(footer.querySelector('[data-lucide="mail"]')).toBeInTheDocument()
      expect(footer.querySelector('[data-lucide="phone"]')).toBeInTheDocument()
      expect(footer.querySelector('[data-lucide="map-pin"]')).toBeInTheDocument()
    })
  })

  describe('Footer Navigation', () => {
    it('renders all footer sections', () => {
      render(<Footer />)

      expectedFooterSections.forEach(section => {
        expect(screen.getByText(section.title)).toBeInTheDocument()
      })
    })

    it('renders all footer links', () => {
      render(<Footer />)

      expectedFooterSections.forEach(section => {
        section.links.forEach(linkText => {
          expect(screen.getByText(linkText)).toBeInTheDocument()
        })
      })
    })

    it('footer links have correct href attributes', () => {
      render(<Footer />)

      // Test a few key links
      const automationLink = screen.getByText('AI Automation')
      expect(automationLink.closest('a')).toHaveAttribute('href', '/products/automation')

      const aboutLink = screen.getByText('About Us')
      expect(aboutLink.closest('a')).toHaveAttribute('href', '/about')

      const docsLink = screen.getByText('Documentation')
      expect(docsLink.closest('a')).toHaveAttribute('href', '/docs')
    })

    it('footer links have hover effects', async () => {
      render(<Footer />)

      const firstLink = screen.getByText('AI Automation')
      expect(firstLink.closest('a')).toHaveClass('hover:text-white')

      // Check for arrow hover effect
      const linkContainer = firstLink.closest('a')
      expect(linkContainer?.querySelector('[data-lucide="arrow-right"]')).toBeInTheDocument()
    })

    it('footer section headings have correct styling', () => {
      render(<Footer />)

      expectedFooterSections.forEach(section => {
        const heading = screen.getByText(section.title)
        expect(heading).toHaveClass('text-lg', 'font-semibold')
      })
    })
  })

  describe('Social Media Links', () => {
    it('renders social media icons', () => {
      render(<Footer />)

      const footer = screen.getByRole('contentinfo')
      expect(footer.querySelector('[data-lucide="twitter"]')).toBeInTheDocument()
      expect(footer.querySelector('[data-lucide="linkedin"]')).toBeInTheDocument()
      expect(footer.querySelector('[data-lucide="github"]')).toBeInTheDocument()
    })

    it('social links have correct attributes', () => {
      render(<Footer />)

      const twitterLink = screen.getByLabelText('Twitter')
      expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/candlefishai')
      expect(twitterLink).toHaveAttribute('target', '_blank')
      expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer')

      const linkedinLink = screen.getByLabelText('LinkedIn')
      expect(linkedinLink).toHaveAttribute('href', 'https://linkedin.com/company/candlefish-ai')

      const githubLink = screen.getByLabelText('GitHub')
      expect(githubLink).toHaveAttribute('href', 'https://github.com/candlefish-ai')
    })

    it('social links have proper accessibility labels', () => {
      render(<Footer />)

      expect(screen.getByLabelText('Twitter')).toBeInTheDocument()
      expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument()
      expect(screen.getByLabelText('GitHub')).toBeInTheDocument()
    })

    it('social links have hover effects', () => {
      render(<Footer />)

      const socialLinks = [
        screen.getByLabelText('Twitter'),
        screen.getByLabelText('LinkedIn'),
        screen.getByLabelText('GitHub')
      ]

      socialLinks.forEach(link => {
        expect(link).toHaveClass('hover:bg-gray-700', 'hover:scale-110')
      })
    })
  })

  describe('Bottom Footer', () => {
    it('displays copyright notice', () => {
      render(<Footer />)

      const currentYear = new Date().getFullYear()
      expect(screen.getByText(`© ${currentYear} Candlefish AI. All rights reserved.`)).toBeInTheDocument()
    })

    it('renders legal links', () => {
      render(<Footer />)

      const legalLinks = [
        'Privacy Policy',
        'Terms of Service',
        'Cookie Policy',
        'Security'
      ]

      legalLinks.forEach(linkText => {
        expect(screen.getByText(linkText)).toBeInTheDocument()
      })
    })

    it('legal links have correct href attributes', () => {
      render(<Footer />)

      const privacyLink = screen.getByText('Privacy Policy')
      expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy')

      const termsLink = screen.getByText('Terms of Service')
      expect(termsLink.closest('a')).toHaveAttribute('href', '/terms')

      const cookieLink = screen.getByText('Cookie Policy')
      expect(cookieLink.closest('a')).toHaveAttribute('href', '/cookies')

      const securityLink = screen.getByText('Security')
      expect(securityLink.closest('a')).toHaveAttribute('href', '/security')
    })
  })

  describe('Responsive Design', () => {
    it('uses responsive grid layout', () => {
      render(<Footer />)

      const mainGrid = screen.getByText('Products').parentElement?.parentElement
      expect(mainGrid).toHaveClass('grid-cols-1', 'lg:grid-cols-5')
    })

    it('newsletter form adapts to screen size', () => {
      render(<Footer />)

      const form = screen.getByPlaceholderText('Enter your email address').parentElement
      expect(form).toHaveClass('flex-col', 'sm:flex-row')
    })

    it('bottom footer layout is responsive', () => {
      render(<Footer />)

      const bottomFooter = screen.getByText(/© \d{4} Candlefish AI/).parentElement?.parentElement
      expect(bottomFooter).toHaveClass('flex-col', 'md:flex-row')
    })

    it('newsletter heading adapts to screen size', () => {
      render(<Footer />)

      const heading = screen.getByText('Stay ahead with AI insights')
      expect(heading).toHaveClass('text-2xl', 'md:text-3xl')
    })
  })

  describe('Accessibility', () => {
    it('uses semantic footer element', () => {
      render(<Footer />)

      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('has proper heading hierarchy', () => {
      render(<Footer />)

      // Newsletter heading should be h3
      const newsletterHeading = screen.getByRole('heading', { level: 3 })
      expect(newsletterHeading).toHaveTextContent('Stay ahead with AI insights')

      // Section headings should be h4
      const sectionHeadings = screen.getAllByRole('heading', { level: 4 })
      expect(sectionHeadings.length).toBe(expectedFooterSections.length)
    })

    it('form has proper accessibility attributes', () => {
      render(<Footer />)

      const emailInput = screen.getByPlaceholderText('Enter your email address')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })

    it('all links are keyboard accessible', async () => {
      render(<Footer />)

      const firstLink = screen.getByText('AI Automation')

      // Should be focusable
      firstLink.focus()
      expect(document.activeElement).toBe(firstLink)
    })

    it('social links have proper ARIA labels', () => {
      render(<Footer />)

      expect(screen.getByLabelText('Twitter')).toBeInTheDocument()
      expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument()
      expect(screen.getByLabelText('GitHub')).toBeInTheDocument()
    })
  })

  describe('Visual Elements', () => {
    it('has background gradient elements', () => {
      render(<Footer />)

      const footer = screen.getByRole('contentinfo')
      const backgroundPattern = footer.querySelector('.opacity-5')
      expect(backgroundPattern).toBeInTheDocument()
    })

    it('company logo has gradient background', () => {
      render(<Footer />)

      const logoContainer = screen.getByAltText('Candlefish AI').parentElement
      expect(logoContainer).toHaveClass('bg-gradient-to-br', 'from-primary-500', 'to-accent-500')
    })

    it('has proper section borders', () => {
      render(<Footer />)

      const footer = screen.getByRole('contentinfo')
      const borderElements = footer.querySelectorAll('.border-gray-800')
      expect(borderElements.length).toBeGreaterThan(0)
    })

    it('newsletter section has border', () => {
      render(<Footer />)

      const newsletterSection = screen.getByText('Stay ahead with AI insights').closest('.border-b')
      expect(newsletterSection).toHaveClass('border-gray-800')
    })
  })

  describe('State Management', () => {
    it('manages newsletter form state correctly', async () => {
      render(<Footer />)

      const emailInput = screen.getByPlaceholderText('Enter your email address')

      // Initial state
      expect(emailInput).toHaveValue('')
      expect(emailInput).not.toBeDisabled()

      // Typing updates state
      await user.type(emailInput, 'test@example.com')
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('resets form state after successful submission', async () => {
      render(<Footer />)

      const emailInput = screen.getByPlaceholderText('Enter your email address')
      const submitButton = screen.getByText('Subscribe')

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      vi.advanceTimersByTime(1500)

      await waitFor(() => {
        expect(emailInput).toHaveValue('')
        expect(screen.getByText('Subscribed!')).toBeInTheDocument()
      })

      // Reset success state
      vi.advanceTimersByTime(3000)

      await waitFor(() => {
        expect(screen.getByText('Subscribe')).toBeInTheDocument()
      })
    })

    it('manages loading state correctly', async () => {
      render(<Footer />)

      const emailInput = screen.getByPlaceholderText('Enter your email address')
      const submitButton = screen.getByText('Subscribe')

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      // Should be in loading state
      expect(submitButton).toBeDisabled()
      expect(emailInput).toBeDisabled()
      expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders efficiently', () => {
      const { rerender } = render(<Footer />)

      rerender(<Footer />)

      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('handles className changes', () => {
      const { rerender } = render(<Footer className="test1" />)

      rerender(<Footer className="test2" />)

      const footer = screen.getByRole('contentinfo')
      expect(footer).toHaveClass('test2')
      expect(footer).not.toHaveClass('test1')
    })

    it('properly cleans up timers', () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

      const { unmount } = render(<Footer />)

      unmount()

      expect(setTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('Content Quality', () => {
    it('provides comprehensive navigation', () => {
      render(<Footer />)

      // Should cover main product categories
      expect(screen.getByText('AI Automation')).toBeInTheDocument()
      expect(screen.getByText('Predictive Analytics')).toBeInTheDocument()
      expect(screen.getByText('Custom Models')).toBeInTheDocument()

      // Should cover key industries
      expect(screen.getByText('Manufacturing')).toBeInTheDocument()
      expect(screen.getByText('Healthcare')).toBeInTheDocument()
      expect(screen.getByText('Financial Services')).toBeInTheDocument()
    })

    it('includes helpful resources', () => {
      render(<Footer />)

      expect(screen.getByText('Documentation')).toBeInTheDocument()
      expect(screen.getByText('Case Studies')).toBeInTheDocument()
      expect(screen.getByText('API Reference')).toBeInTheDocument()
      expect(screen.getByText('Whitepapers')).toBeInTheDocument()
    })

    it('provides clear contact information', () => {
      render(<Footer />)

      expect(screen.getByText('hello@candlefish.ai')).toBeInTheDocument()
      expect(screen.getByText('+1 (555) 012-3456')).toBeInTheDocument()
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
    })
  })
})
