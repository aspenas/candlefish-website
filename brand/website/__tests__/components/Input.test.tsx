import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Input, InputProps } from '../../components/ui/Input'

// Test helper to render Input with default props
const renderInput = (props: Partial<InputProps> = {}) => {
  return render(<Input {...props} />)
}

describe('Input Component', () => {
  describe('Rendering', () => {
    it('renders input element', () => {
      renderInput({ placeholder: 'Enter text' })
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders with default text type', () => {
      renderInput()
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
    })

    it('renders with specified type', () => {
      renderInput({ type: 'email' })
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
    })

    it('applies custom className', () => {
      renderInput({ className: 'custom-input' })
      expect(screen.getByRole('textbox')).toHaveClass('custom-input')
    })

    it('applies wrapper className', () => {
      renderInput({ wrapperClassName: 'custom-wrapper', 'data-testid': 'input-wrapper' } as any)
      const wrapper = screen.getByTestId('input-wrapper').parentElement
      expect(wrapper).toHaveClass('custom-wrapper')
    })
  })

  describe('Label', () => {
    it('renders label when provided', () => {
      renderInput({ label: 'Username', id: 'username' })
      expect(screen.getByLabelText('Username')).toBeInTheDocument()
    })

    it('associates label with input via htmlFor', () => {
      renderInput({ label: 'Email', id: 'email' })
      const label = screen.getByText('Email')
      expect(label).toHaveAttribute('for', 'email')
    })

    it('generates unique id when not provided', () => {
      renderInput({ label: 'Password' })
      const input = screen.getByRole('textbox')
      const id = input.getAttribute('id')
      expect(id).toMatch(/^input-[a-z0-9]+$/)
    })

    it('shows required indicator when required', () => {
      renderInput({ label: 'Required Field', required: true })
      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByText('*')).toHaveAttribute('aria-label', 'required')
    })
  })

  describe('Icons', () => {
    it('renders left icon when provided', () => {
      renderInput({ leftIcon: <span data-testid="left-icon">@</span> })
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('renders right icon when provided', () => {
      renderInput({ rightIcon: <span data-testid="right-icon">✓</span> })
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('adjusts padding for left icon', () => {
      renderInput({ leftIcon: <span>@</span> })
      expect(screen.getByRole('textbox')).toHaveClass('pl-10')
    })

    it('adjusts padding for right icon', () => {
      renderInput({ rightIcon: <span>✓</span> })
      expect(screen.getByRole('textbox')).toHaveClass('pr-10')
    })

    it('renders both icons when provided', () => {
      renderInput({
        leftIcon: <span data-testid="left-icon">@</span>,
        rightIcon: <span data-testid="right-icon">✓</span>
      })
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveClass('pl-10', 'pr-10')
    })
  })

  describe('Error State', () => {
    it('displays error message when provided', () => {
      renderInput({ error: 'This field is required', id: 'test-input' })
      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('applies error styles to input', () => {
      renderInput({ error: 'Error message' })
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-red-500', 'focus:border-red-500', 'focus:ring-red-500')
    })

    it('sets aria-invalid when error exists', () => {
      renderInput({ error: 'Error message' })
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })

    it('associates error with input via aria-describedby', () => {
      renderInput({ error: 'Error message', id: 'test-input' })
      const input = screen.getByRole('textbox')
      const errorId = `test-input-error`
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(errorId))
    })

    it('error message has proper accessibility attributes', () => {
      renderInput({ error: 'Error message', id: 'test-input' })
      const errorElement = screen.getByText('Error message')
      expect(errorElement).toHaveAttribute('role', 'alert')
      expect(errorElement).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Helper Text', () => {
    it('displays helper text when provided', () => {
      renderInput({ helperText: 'Enter your email address' })
      expect(screen.getByText('Enter your email address')).toBeInTheDocument()
    })

    it('associates helper text with input via aria-describedby', () => {
      renderInput({ helperText: 'Helper text', id: 'test-input' })
      const input = screen.getByRole('textbox')
      const helperId = `test-input-helper`
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(helperId))
    })

    it('hides helper text when error is present', () => {
      renderInput({
        helperText: 'Helper text',
        error: 'Error message'
      })
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument()
      expect(screen.getByText('Error message')).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      renderInput({ disabled: true })
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('applies disabled styles', () => {
      renderInput({ disabled: true })
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50', 'disabled:bg-mist/5')
    })
  })

  describe('Focus and Interaction', () => {
    it('focuses input when clicked', async () => {
      renderInput()
      const input = screen.getByRole('textbox')

      await userEvent.click(input)
      expect(input).toHaveFocus()
    })

    it('applies focus styles', () => {
      renderInput()
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('focus:border-sea-glow', 'focus:ring-1', 'focus:ring-sea-glow')
    })

    it('accepts user input', async () => {
      renderInput()
      const input = screen.getByRole('textbox')

      await userEvent.type(input, 'Hello World')
      expect(input).toHaveValue('Hello World')
    })
  })

  describe('Event Handling', () => {
    it('calls onChange handler when value changes', async () => {
      const handleChange = jest.fn()
      renderInput({ onChange: handleChange })

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test')

      expect(handleChange).toHaveBeenCalled()
    })

    it('calls onFocus handler when focused', async () => {
      const handleFocus = jest.fn()
      renderInput({ onFocus: handleFocus })

      await userEvent.click(screen.getByRole('textbox'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('calls onBlur handler when blurred', async () => {
      const handleBlur = jest.fn()
      renderInput({ onBlur: handleBlur })

      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      await userEvent.tab()

      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('has proper base accessibility attributes', () => {
      renderInput()
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'false')
    })

    it('supports keyboard navigation', () => {
      renderInput()
      const input = screen.getByRole('textbox')

      input.focus()
      expect(input).toHaveFocus()

      fireEvent.keyDown(input, { key: 'Tab' })
    })

    it('has proper aria-describedby with both error and helper', () => {
      renderInput({
        helperText: 'Helper text',
        id: 'test-input'
      })

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'test-input-helper')
    })
  })

  describe('Forward Ref', () => {
    it('forwards ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>()
      render(<Input ref={ref} />)

      expect(ref.current).toBeInstanceOf(HTMLInputElement)
      expect(ref.current).toBe(screen.getByRole('textbox'))
    })
  })

  describe('Additional Props', () => {
    it('passes through additional HTML attributes', () => {
      renderInput({
        placeholder: 'Enter text',
        maxLength: 100,
        'data-testid': 'custom-input'
      } as any)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder', 'Enter text')
      expect(input).toHaveAttribute('maxLength', '100')
      expect(input).toHaveAttribute('data-testid', 'custom-input')
    })
  })

  describe('Default Values', () => {
    it('accepts defaultValue', () => {
      renderInput({ defaultValue: 'Initial value' })
      expect(screen.getByRole('textbox')).toHaveValue('Initial value')
    })

    it('accepts value prop for controlled component', () => {
      renderInput({ value: 'Controlled value', onChange: jest.fn() })
      expect(screen.getByRole('textbox')).toHaveValue('Controlled value')
    })
  })
})
