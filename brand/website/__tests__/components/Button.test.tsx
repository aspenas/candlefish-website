import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Button, ButtonProps } from '../../components/ui/Button'

// Test helper to render Button with default props
const renderButton = (props: Partial<ButtonProps> = {}) => {
  const defaultProps: ButtonProps = {
    children: 'Test Button',
    ...props,
  }
  return render(<Button {...defaultProps} />)
}

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders button with children', () => {
      renderButton({ children: 'Click me' })
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('renders button with correct default variant and size', () => {
      renderButton()
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-sea-glow') // primary variant
      expect(button).toHaveClass('h-10') // medium size
    })

    it('applies custom className', () => {
      renderButton({ className: 'custom-class' })
      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })
  })

  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      renderButton({ variant: 'primary' })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-sea-glow', 'text-white')
    })

    it('renders secondary variant correctly', () => {
      renderButton({ variant: 'secondary' })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-slate', 'text-foam')
    })

    it('renders outline variant correctly', () => {
      renderButton({ variant: 'outline' })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border', 'border-mist', 'text-mist')
    })

    it('renders ghost variant correctly', () => {
      renderButton({ variant: 'ghost' })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-mist')
    })

    it('renders link variant correctly', () => {
      renderButton({ variant: 'link' })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-sea-glow', 'underline-offset-4')
    })
  })

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      renderButton({ size: 'sm' })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9', 'px-3', 'text-xs')
    })

    it('renders medium size correctly', () => {
      renderButton({ size: 'md' })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10', 'px-4', 'py-2')
    })

    it('renders large size correctly', () => {
      renderButton({ size: 'lg' })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-11', 'px-8', 'text-base')
    })

    it('renders extra large size correctly', () => {
      renderButton({ size: 'xl' })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-12', 'px-10', 'text-lg')
    })

    it('renders icon size correctly', () => {
      renderButton({ size: 'icon' })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10', 'w-10')
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when loading prop is true', () => {
      renderButton({ loading: true })
      const spinner = screen.getByRole('img', { hidden: true })
      expect(spinner).toHaveClass('animate-spin')
    })

    it('disables button when loading', () => {
      renderButton({ loading: true })
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('sets aria-disabled when loading', () => {
      renderButton({ loading: true })
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
    })

    it('hides icons when loading', () => {
      renderButton({ 
        loading: true, 
        leftIcon: <span data-testid="left-icon">←</span>,
        rightIcon: <span data-testid="right-icon">→</span>
      })
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument()
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument()
    })
  })

  describe('Icons', () => {
    it('renders left icon when provided', () => {
      renderButton({ leftIcon: <span data-testid="left-icon">←</span> })
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('renders right icon when provided', () => {
      renderButton({ rightIcon: <span data-testid="right-icon">→</span> })
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('renders both icons when provided', () => {
      renderButton({ 
        leftIcon: <span data-testid="left-icon">←</span>,
        rightIcon: <span data-testid="right-icon">→</span>
      })
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('disables button when disabled prop is true', () => {
      renderButton({ disabled: true })
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('sets aria-disabled when disabled', () => {
      renderButton({ disabled: true })
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
    })

    it('applies disabled styles', () => {
      renderButton({ disabled: true })
      const button = screen.getByRole('button')
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
    })
  })

  describe('Event Handling', () => {
    it('calls onClick handler when clicked', async () => {
      const handleClick = jest.fn()
      renderButton({ onClick: handleClick })
      
      await userEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', async () => {
      const handleClick = jest.fn()
      renderButton({ onClick: handleClick, disabled: true })
      
      await userEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('does not call onClick when loading', async () => {
      const handleClick = jest.fn()
      renderButton({ onClick: handleClick, loading: true })
      
      await userEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('handles keyboard navigation', () => {
      renderButton()
      const button = screen.getByRole('button')
      
      button.focus()
      expect(button).toHaveFocus()
      
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })
    })
  })

  describe('Accessibility', () => {
    it('has correct button role', () => {
      renderButton()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('supports focus-visible outline', () => {
      renderButton()
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2')
    })

    it('has proper aria attributes when disabled', () => {
      renderButton({ disabled: true })
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-disabled', 'true')
      expect(button).toBeDisabled()
    })

    it('loading spinner has aria-hidden', () => {
      renderButton({ loading: true })
      const spinner = screen.getByRole('img', { hidden: true })
      expect(spinner).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Forward Ref', () => {
    it('forwards ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Button ref={ref}>Test</Button>)
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current).toBe(screen.getByRole('button'))
    })
  })

  describe('Additional Props', () => {
    it('passes through additional HTML attributes', () => {
      renderButton({ 
        'data-testid': 'custom-button',
        'aria-label': 'Custom label',
        type: 'submit'
      })
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-testid', 'custom-button')
      expect(button).toHaveAttribute('aria-label', 'Custom label')
      expect(button).toHaveAttribute('type', 'submit')
    })
  })
})