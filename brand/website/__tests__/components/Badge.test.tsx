import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Badge, BadgeProps } from '../../components/ui/Badge'

describe('Badge Component', () => {
  const renderBadge = (props: Partial<BadgeProps> = {}) => {
    return render(
      <Badge data-testid="badge" {...props}>
        {props.children || 'Badge Text'}
      </Badge>
    )
  }

  describe('Rendering', () => {
    it('renders badge with children', () => {
      renderBadge({ children: 'Test Badge' })
      expect(screen.getByTestId('badge')).toBeInTheDocument()
      expect(screen.getByText('Test Badge')).toBeInTheDocument()
    })

    it('renders as div element', () => {
      renderBadge()
      const badge = screen.getByTestId('badge')
      expect(badge.tagName).toBe('DIV')
    })

    it('applies base classes', () => {
      renderBadge()
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass(
        'inline-flex',
        'items-center',
        'rounded-full',
        'border',
        'text-xs',
        'font-medium',
        'transition-colors'
      )
    })

    it('applies default variant and size', () => {
      renderBadge()
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('border-transparent', 'bg-mist/10', 'text-mist')
      expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-xs')
    })

    it('applies custom className', () => {
      renderBadge({ className: 'custom-badge' })
      expect(screen.getByTestId('badge')).toHaveClass('custom-badge')
    })
  })

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      renderBadge({ variant: 'default' })
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('border-transparent', 'bg-mist/10', 'text-mist')
    })

    it('renders primary variant correctly', () => {
      renderBadge({ variant: 'primary' })
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('border-transparent', 'bg-sea-glow', 'text-white')
    })

    it('renders secondary variant correctly', () => {
      renderBadge({ variant: 'secondary' })
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('border-transparent', 'bg-slate', 'text-foam')
    })

    it('renders success variant correctly', () => {
      renderBadge({ variant: 'success' })
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('border-transparent', 'bg-green-100', 'text-green-800')
    })

    it('renders warning variant correctly', () => {
      renderBadge({ variant: 'warning' })
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('border-transparent', 'bg-yellow-100', 'text-yellow-800')
    })

    it('renders error variant correctly', () => {
      renderBadge({ variant: 'error' })
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('border-transparent', 'bg-red-100', 'text-red-800')
    })

    it('renders outline variant correctly', () => {
      renderBadge({ variant: 'outline' })
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('border-mist', 'text-mist')
    })
  })

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      renderBadge({ size: 'sm' })
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs')
    })

    it('renders medium size correctly (default)', () => {
      renderBadge({ size: 'md' })
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-xs')
    })

    it('renders large size correctly', () => {
      renderBadge({ size: 'lg' })
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('px-3', 'py-1', 'text-sm')
    })
  })

  describe('Focus and Accessibility', () => {
    it('supports focus when tabIndex is set', () => {
      renderBadge({ tabIndex: 0 })
      const badge = screen.getByTestId('badge')
      
      badge.focus()
      expect(badge).toHaveFocus()
      expect(badge).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-sea-glow')
    })

    it('supports role attribute', () => {
      renderBadge({ role: 'status' })
      expect(screen.getByTestId('badge')).toHaveAttribute('role', 'status')
    })

    it('supports aria-label', () => {
      renderBadge({ 'aria-label': 'Status badge' })
      expect(screen.getByTestId('badge')).toHaveAttribute('aria-label', 'Status badge')
    })
  })

  describe('Content Types', () => {
    it('renders text content', () => {
      renderBadge({ children: 'New' })
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('renders with icons', () => {
      renderBadge({ 
        children: (
          <>
            <span data-testid="icon">★</span>
            Featured
          </>
        )
      })
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('Featured')).toBeInTheDocument()
    })

    it('renders with numbers', () => {
      renderBadge({ children: '99+' })
      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  describe('Additional Props', () => {
    it('passes through HTML attributes', () => {
      renderBadge({ 
        id: 'custom-badge',
        'aria-describedby': 'badge-description',
        title: 'Badge tooltip'
      })
      
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('id', 'custom-badge')
      expect(badge).toHaveAttribute('aria-describedby', 'badge-description')
      expect(badge).toHaveAttribute('title', 'Badge tooltip')
    })

    it('supports event handlers', () => {
      const handleClick = jest.fn()
      renderBadge({ onClick: handleClick })
      
      const badge = screen.getByTestId('badge')
      badge.click()
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Style Combinations', () => {
    it('combines variant and size correctly', () => {
      renderBadge({ variant: 'primary', size: 'lg' })
      const badge = screen.getByTestId('badge')
      
      // Should have primary variant classes
      expect(badge).toHaveClass('bg-sea-glow', 'text-white')
      // Should have large size classes
      expect(badge).toHaveClass('px-3', 'py-1', 'text-sm')
    })

    it('applies custom styles with variants', () => {
      renderBadge({ 
        variant: 'success', 
        className: 'shadow-lg hover:shadow-xl'
      })
      const badge = screen.getByTestId('badge')
      
      expect(badge).toHaveClass('bg-green-100', 'text-green-800', 'shadow-lg', 'hover:shadow-xl')
    })
  })

  describe('Semantic Usage', () => {
    it('can be used for status indicators', () => {
      render(
        <div>
          <span>Server Status:</span>
          <Badge variant="success" role="status" aria-label="Server is online">
            Online
          </Badge>
        </div>
      )
      
      const badge = screen.getByRole('status')
      expect(badge).toHaveTextContent('Online')
      expect(badge).toHaveAttribute('aria-label', 'Server is online')
    })

    it('can be used for notification counts', () => {
      render(
        <button>
          Messages
          <Badge variant="error" aria-label="3 unread messages">
            3
          </Badge>
        </button>
      )
      
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByLabelText('3 unread messages')).toBeInTheDocument()
    })

    it('can be used for categories/tags', () => {
      render(
        <article>
          <h2>Article Title</h2>
          <Badge variant="outline">Technology</Badge>
          <Badge variant="outline">React</Badge>
        </article>
      )
      
      expect(screen.getByText('Technology')).toBeInTheDocument()
      expect(screen.getByText('React')).toBeInTheDocument()
    })
  })
})