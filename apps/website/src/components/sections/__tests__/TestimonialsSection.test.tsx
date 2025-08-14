import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import TestimonialsSection from '../TestimonialsSection'

describe('TestimonialsSection', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const expectedTestimonials = [
    {
      author: 'Sarah Chen',
      role: 'Chief Technology Officer',
      company: 'GlobalTech Manufacturing',
      quote: 'Candlefish AI transformed our entire operation',
      rating: 5,
      metrics: ['300%', '45%', '3 weeks']
    },
    {
      author: 'Michael Rodriguez',
      role: 'VP of Operations',
      company: 'AeroLogistics International',
      quote: 'The ROI has been incredible',
      rating: 5,
      metrics: ['400%', '$2.1M', '6 months']
    },
    {
      author: 'Emily Watson',
      role: 'Head of Digital Innovation',
      company: 'MegaRetail Corporation',
      quote: 'Working with Candlefish AI has been a game-changer',
      rating: 5,
      metrics: ['40%', '96%', '+180%']
    },
    {
      author: 'Dr. James Park',
      role: 'Director of Technology',
      company: 'MedTech Solutions',
      quote: 'The level of support and expertise from the Candlefish team',
      rating: 5,
      metrics: ['98.7%', '65%', '94%']
    }
  ]

  describe('Rendering', () => {
    it('renders the testimonials section', () => {
      render(<TestimonialsSection />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('applies custom className when provided', () => {
      const customClass = 'custom-testimonials'
      render(<TestimonialsSection className={customClass} />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass(customClass)
    })
  })

  describe('Section Header', () => {
    it('renders section badge', () => {
      render(<TestimonialsSection />)

      expect(screen.getByText('Client Testimonials')).toBeInTheDocument()
    })

    it('section badge has correct styling and icon', () => {
      render(<TestimonialsSection />)

      const badge = screen.getByText('Client Testimonials').parentElement
      expect(badge).toHaveClass('bg-accent-100/50', 'text-accent-700')
      expect(badge?.querySelector('[data-lucide="quote"]')).toBeInTheDocument()
    })

    it('renders main heading', () => {
      render(<TestimonialsSection />)

      expect(screen.getByText('Trusted by')).toBeInTheDocument()
      expect(screen.getByText('Industry Leaders')).toBeInTheDocument()
    })

    it('main heading has gradient text for "Industry Leaders"', () => {
      render(<TestimonialsSection />)

      const industryLeadersText = screen.getByText('Industry Leaders')
      expect(industryLeadersText).toHaveClass('bg-gradient-to-r', 'bg-clip-text', 'text-transparent')
    })

    it('renders section description', () => {
      render(<TestimonialsSection />)

      const description = screen.getByText(/Don't just take our word for it/i)
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-xl', 'text-gray-600')
    })
  })

  describe('Testimonial Display', () => {
    it('displays first testimonial by default', () => {
      render(<TestimonialsSection />)

      expect(screen.getByText(new RegExp(expectedTestimonials[0].quote, 'i'))).toBeInTheDocument()
      expect(screen.getByText(expectedTestimonials[0].author)).toBeInTheDocument()
      expect(screen.getByText(expectedTestimonials[0].role)).toBeInTheDocument()
      expect(screen.getByText(expectedTestimonials[0].company)).toBeInTheDocument()
    })

    it('testimonial card has correct structure', () => {
      render(<TestimonialsSection />)

      // Quote icon
      expect(screen.getByRole('region').querySelector('[data-lucide="quote"]')).toBeInTheDocument()

      // Quote text
      const quote = screen.getByText(new RegExp(expectedTestimonials[0].quote, 'i'))
      expect(quote.tagName).toBe('BLOCKQUOTE')

      // Star ratings
      const stars = screen.getAllByTestId('star-rating') || screen.getByRole('region').querySelectorAll('[data-lucide="star"]')
      expect(stars.length).toBeGreaterThan(0)
    })

    it('displays testimonial metrics', () => {
      render(<TestimonialsSection />)

      expectedTestimonials[0].metrics.forEach(metric => {
        expect(screen.getByText(metric)).toBeInTheDocument()
      })
    })

    it('displays correct star rating', () => {
      render(<TestimonialsSection />)

      const ratingText = screen.getByText('5/5 stars')
      expect(ratingText).toBeInTheDocument()

      // Check for filled stars
      const stars = screen.getByRole('region').querySelectorAll('[data-lucide="star"]')
      expect(stars.length).toBe(5) // Should have 5 stars total
    })
  })

  describe('Navigation Controls', () => {
    it('renders navigation arrows', () => {
      render(<TestimonialsSection />)

      expect(screen.getByLabelText('Previous testimonial')).toBeInTheDocument()
      expect(screen.getByLabelText('Next testimonial')).toBeInTheDocument()
    })

    it('renders dot indicators', () => {
      render(<TestimonialsSection />)

      const dots = screen.getAllByLabelText(/Go to testimonial \d+/)
      expect(dots.length).toBe(expectedTestimonials.length)
    })

    it('first dot is active by default', () => {
      render(<TestimonialsSection />)

      const firstDot = screen.getByLabelText('Go to testimonial 1')
      expect(firstDot).toHaveClass('bg-primary-500', 'w-8')
    })

    it('navigates to next testimonial when next arrow is clicked', async () => {
      render(<TestimonialsSection />)

      const nextButton = screen.getByLabelText('Next testimonial')

      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(new RegExp(expectedTestimonials[1].quote, 'i'))).toBeInTheDocument()
        expect(screen.getByText(expectedTestimonials[1].author)).toBeInTheDocument()
      })
    })

    it('navigates to previous testimonial when previous arrow is clicked', async () => {
      render(<TestimonialsSection />)

      const nextButton = screen.getByLabelText('Next testimonial')
      const prevButton = screen.getByLabelText('Previous testimonial')

      // Go to next first
      await user.click(nextButton)
      await waitFor(() => {
        expect(screen.getByText(expectedTestimonials[1].author)).toBeInTheDocument()
      })

      // Then go back to previous
      await user.click(prevButton)
      await waitFor(() => {
        expect(screen.getByText(expectedTestimonials[0].author)).toBeInTheDocument()
      })
    })

    it('navigates when dot indicators are clicked', async () => {
      render(<TestimonialsSection />)

      const thirdDot = screen.getByLabelText('Go to testimonial 3')

      await user.click(thirdDot)

      await waitFor(() => {
        expect(screen.getByText(expectedTestimonials[2].author)).toBeInTheDocument()
      })
    })

    it('wraps around from last to first testimonial', async () => {
      render(<TestimonialsSection />)

      const nextButton = screen.getByLabelText('Next testimonial')

      // Click next 4 times to go through all testimonials and wrap around
      for (let i = 0; i < 4; i++) {
        await user.click(nextButton)
        vi.advanceTimersByTime(100) // Small delay for state updates
      }

      await waitFor(() => {
        expect(screen.getByText(expectedTestimonials[0].author)).toBeInTheDocument()
      })
    })

    it('wraps around from first to last testimonial when going previous', async () => {
      render(<TestimonialsSection />)

      const prevButton = screen.getByLabelText('Previous testimonial')

      await user.click(prevButton)

      await waitFor(() => {
        expect(screen.getByText(expectedTestimonials[3].author)).toBeInTheDocument()
      })
    })
  })

  describe('Auto-rotation', () => {
    it('auto-rotates testimonials every 6 seconds', async () => {
      render(<TestimonialsSection />)

      // Initially shows first testimonial
      expect(screen.getByText(expectedTestimonials[0].author)).toBeInTheDocument()

      // Advance time by 6 seconds
      vi.advanceTimersByTime(6000)

      await waitFor(() => {
        expect(screen.getByText(expectedTestimonials[1].author)).toBeInTheDocument()
      })
    })

    it('pauses auto-rotation when user interacts with navigation', async () => {
      render(<TestimonialsSection />)

      const nextButton = screen.getByLabelText('Next testimonial')

      // User clicks next
      await user.click(nextButton)

      // Advance time by 6 seconds - should not auto-rotate
      vi.advanceTimersByTime(6000)

      // Should still be on the manually selected testimonial
      expect(screen.getByText(expectedTestimonials[1].author)).toBeInTheDocument()
    })

    it('resumes auto-rotation after 10 seconds of inactivity', async () => {
      render(<TestimonialsSection />)

      const nextButton = screen.getByLabelText('Next testimonial')

      // User clicks next
      await user.click(nextButton)

      // Advance time by 10 seconds to resume auto-play
      vi.advanceTimersByTime(10000)

      // Then advance by 6 more seconds for auto-rotation
      vi.advanceTimersByTime(6000)

      await waitFor(() => {
        expect(screen.getByText(expectedTestimonials[2].author)).toBeInTheDocument()
      })
    })
  })

  describe('Trust Indicators', () => {
    it('displays trust message', () => {
      render(<TestimonialsSection />)

      expect(screen.getByText('Trusted by 500+ companies worldwide')).toBeInTheDocument()
    })

    it('displays company logos/names', () => {
      render(<TestimonialsSection />)

      const companies = [
        'GlobalTech Manufacturing',
        'AeroLogistics International',
        'MegaRetail Corporation',
        'MedTech Solutions'
      ]

      companies.forEach(company => {
        expect(screen.getByText(company)).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('adapts heading size for different screens', () => {
      render(<TestimonialsSection />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveClass('text-4xl', 'md:text-5xl')
    })

    it('adapts quote text size for different screens', () => {
      render(<TestimonialsSection />)

      const quote = screen.getByText(new RegExp(expectedTestimonials[0].quote, 'i'))
      expect(quote).toHaveClass('text-xl', 'md:text-2xl')
    })

    it('metrics grid adapts to screen size', () => {
      render(<TestimonialsSection />)

      const metricsGrid = screen.getByText('300%').parentElement?.parentElement
      expect(metricsGrid).toHaveClass('grid-cols-2', 'md:grid-cols-3')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<TestimonialsSection />)

      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toBeInTheDocument()
    })

    it('navigation buttons have proper ARIA labels', () => {
      render(<TestimonialsSection />)

      expect(screen.getByLabelText('Previous testimonial')).toBeInTheDocument()
      expect(screen.getByLabelText('Next testimonial')).toBeInTheDocument()

      const dots = screen.getAllByLabelText(/Go to testimonial \d+/)
      expect(dots.length).toBe(4)
    })

    it('uses blockquote for testimonial text', () => {
      render(<TestimonialsSection />)

      const quote = screen.getByText(new RegExp(expectedTestimonials[0].quote, 'i'))
      expect(quote.tagName).toBe('BLOCKQUOTE')
    })

    it('buttons are keyboard accessible', async () => {
      render(<TestimonialsSection />)

      const nextButton = screen.getByLabelText('Next testimonial')

      // Should be focusable
      nextButton.focus()
      expect(document.activeElement).toBe(nextButton)
    })
  })

  describe('Performance', () => {
    it('renders efficiently', () => {
      const { rerender } = render(<TestimonialsSection />)

      rerender(<TestimonialsSection />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('handles className changes', () => {
      const { rerender } = render(<TestimonialsSection className="test1" />)

      rerender(<TestimonialsSection className="test2" />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass('test2')
      expect(section).not.toHaveClass('test1')
    })

    it('cleans up timers on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      const { unmount } = render(<TestimonialsSection />)

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Content Quality', () => {
    it('displays specific metrics and achievements', () => {
      render(<TestimonialsSection />)

      // Business metrics from first testimonial
      expect(screen.getByText('300%')).toBeInTheDocument()
      expect(screen.getByText('Efficiency Increase')).toBeInTheDocument()
      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByText('Cost Reduction')).toBeInTheDocument()
    })

    it('includes credible executive testimonials', () => {
      render(<TestimonialsSection />)

      // Check for executive titles
      expect(screen.getByText('Chief Technology Officer')).toBeInTheDocument()
      expect(screen.getByText('VP of Operations')).toBeInTheDocument()
      expect(screen.getByText('Head of Digital Innovation')).toBeInTheDocument()
      expect(screen.getByText('Director of Technology')).toBeInTheDocument()
    })

    it('shows varied company backgrounds', () => {
      render(<TestimonialsSection />)

      // Different industries represented
      const companies = [
        'GlobalTech Manufacturing',
        'AeroLogistics International',
        'MegaRetail Corporation',
        'MedTech Solutions'
      ]

      companies.forEach(company => {
        expect(screen.getByText(company)).toBeInTheDocument()
      })
    })
  })

  describe('Visual Elements', () => {
    it('has gradient background', () => {
      render(<TestimonialsSection />)

      const section = screen.getByRole('region')
      expect(section).toHaveClass('bg-gradient-to-b', 'from-gray-50', 'to-white')
    })

    it('testimonial card has proper styling', () => {
      render(<TestimonialsSection />)

      const card = screen.getByText(new RegExp(expectedTestimonials[0].quote, 'i')).closest('.bg-white')
      expect(card).toHaveClass('rounded-2xl', 'p-8', 'shadow-lg')
    })

    it('quote icon has gradient background', () => {
      render(<TestimonialsSection />)

      const quoteIcon = screen.getByRole('region').querySelector('.bg-gradient-to-br.from-primary-500')
      expect(quoteIcon).toBeInTheDocument()
    })

    it('active dot indicator is styled differently', () => {
      render(<TestimonialsSection />)

      const activeDot = screen.getByLabelText('Go to testimonial 1')
      expect(activeDot).toHaveClass('bg-primary-500', 'w-8')

      const inactiveDot = screen.getByLabelText('Go to testimonial 2')
      expect(inactiveDot).toHaveClass('bg-gray-300')
      expect(inactiveDot).not.toHaveClass('w-8')
    })
  })

  describe('State Management', () => {
    it('tracks active testimonial index correctly', async () => {
      render(<TestimonialsSection />)

      const thirdDot = screen.getByLabelText('Go to testimonial 3')
      await user.click(thirdDot)

      await waitFor(() => {
        expect(thirdDot).toHaveClass('bg-primary-500', 'w-8')
      })
    })

    it('manages auto-play state correctly', async () => {
      render(<TestimonialsSection />)

      // Initially auto-playing
      vi.advanceTimersByTime(6000)
      await waitFor(() => {
        expect(screen.getByText(expectedTestimonials[1].author)).toBeInTheDocument()
      })

      // Stop auto-play on interaction
      const nextButton = screen.getByLabelText('Next testimonial')
      await user.click(nextButton)

      // Should not advance automatically
      vi.advanceTimersByTime(6000)
      expect(screen.getByText(expectedTestimonials[2].author)).toBeInTheDocument()
    })
  })
})
