import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LoadingSpinner, LoadingState, LoadingSpinnerProps, LoadingStateProps } from '../../components/ui/LoadingSpinner'

describe('LoadingSpinner Component', () => {
  const renderSpinner = (props: Partial<LoadingSpinnerProps> = {}) => {
    return render(<LoadingSpinner data-testid="spinner" {...props} />)
  }

  describe('Rendering', () => {
    it('renders loading spinner', () => {
      renderSpinner()
      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })

    it('renders as SVG element', () => {
      renderSpinner()
      const spinner = screen.getByTestId('spinner')
      expect(spinner.tagName).toBe('svg')
    })

    it('has correct base classes', () => {
      renderSpinner()
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('animate-spin')
    })

    it('has proper SVG attributes', () => {
      renderSpinner()
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
      expect(spinner).toHaveAttribute('fill', 'none')
      expect(spinner).toHaveAttribute('viewBox', '0 0 24 24')
      expect(spinner).toHaveAttribute('aria-hidden', 'true')
    })

    it('applies custom className', () => {
      renderSpinner({ className: 'custom-spinner' })
      expect(screen.getByTestId('spinner')).toHaveClass('custom-spinner')
    })
  })

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      renderSpinner({ size: 'sm' })
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('h-4', 'w-4')
    })

    it('renders medium size correctly (default)', () => {
      renderSpinner({ size: 'md' })
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('h-6', 'w-6')
    })

    it('renders large size correctly', () => {
      renderSpinner({ size: 'lg' })
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('h-8', 'w-8')
    })

    it('renders extra large size correctly', () => {
      renderSpinner({ size: 'xl' })
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('h-12', 'w-12')
    })

    it('uses medium size by default', () => {
      renderSpinner()
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('h-6', 'w-6')
    })
  })

  describe('Colors', () => {
    it('renders primary color correctly (default)', () => {
      renderSpinner({ color: 'primary' })
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('text-sea-glow')
    })

    it('renders secondary color correctly', () => {
      renderSpinner({ color: 'secondary' })
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('text-mist')
    })

    it('renders white color correctly', () => {
      renderSpinner({ color: 'white' })
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('text-white')
    })

    it('uses primary color by default', () => {
      renderSpinner()
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('text-sea-glow')
    })
  })

  describe('SVG Content', () => {
    it('contains circle and path elements', () => {
      renderSpinner()
      const spinner = screen.getByTestId('spinner')
      
      const circle = spinner.querySelector('circle')
      const path = spinner.querySelector('path')
      
      expect(circle).toBeInTheDocument()
      expect(path).toBeInTheDocument()
    })

    it('has correct circle attributes', () => {
      renderSpinner()
      const circle = screen.getByTestId('spinner').querySelector('circle')!
      
      expect(circle).toHaveClass('opacity-25')
      expect(circle).toHaveAttribute('cx', '12')
      expect(circle).toHaveAttribute('cy', '12')
      expect(circle).toHaveAttribute('r', '10')
      expect(circle).toHaveAttribute('stroke', 'currentColor')
      expect(circle).toHaveAttribute('strokeWidth', '4')
    })

    it('has correct path attributes', () => {
      renderSpinner()
      const path = screen.getByTestId('spinner').querySelector('path')!
      
      expect(path).toHaveClass('opacity-75')
      expect(path).toHaveAttribute('fill', 'currentColor')
    })
  })

  describe('Accessibility', () => {
    it('has aria-hidden attribute', () => {
      renderSpinner()
      expect(screen.getByTestId('spinner')).toHaveAttribute('aria-hidden', 'true')
    })

    it('does not interfere with screen readers', () => {
      renderSpinner()
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveAttribute('aria-hidden', 'true')
      expect(spinner).not.toHaveAttribute('role')
      expect(spinner).not.toHaveAttribute('aria-label')
    })
  })

  describe('Style Combinations', () => {
    it('combines size and color correctly', () => {
      renderSpinner({ size: 'lg', color: 'white' })
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('h-8', 'w-8', 'text-white', 'animate-spin')
    })

    it('applies custom styles with defaults', () => {
      renderSpinner({ className: 'opacity-50 drop-shadow-lg' })
      const spinner = screen.getByTestId('spinner')
      expect(spinner).toHaveClass('animate-spin', 'h-6', 'w-6', 'text-sea-glow', 'opacity-50', 'drop-shadow-lg')
    })
  })
})

describe('LoadingState Component', () => {
  const renderLoadingState = (props: Partial<LoadingStateProps>) => {
    const defaultProps: LoadingStateProps = {
      loading: false,
      children: <div>Main content</div>,
      ...props,
    }
    return render(<LoadingState {...defaultProps} />)
  }

  describe('Loading State', () => {
    it('shows loading spinner when loading is true', () => {
      renderLoadingState({ loading: true })
      
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
      expect(screen.queryByText('Main content')).not.toBeInTheDocument()
    })

    it('shows custom loading component when provided', () => {
      const customLoader = <div data-testid="custom-loader">Custom Loading...</div>
      renderLoadingState({ 
        loading: true, 
        loadingComponent: customLoader 
      })
      
      expect(screen.getByTestId('custom-loader')).toBeInTheDocument()
      expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
      expect(screen.queryByText('Main content')).not.toBeInTheDocument()
    })

    it('applies correct loading container styles', () => {
      render(
        <div data-testid="loading-container">
          <LoadingState loading={true} children={<div>Content</div>} />
        </div>
      )
      
      const container = screen.getByTestId('loading-container').firstChild
      expect(container).toHaveClass('flex', 'items-center', 'justify-center', 'py-8')
    })
  })

  describe('Error State', () => {
    it('shows error message when error is provided', () => {
      renderLoadingState({ 
        loading: false, 
        error: 'Network connection failed' 
      })
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Network connection failed')).toBeInTheDocument()
      expect(screen.queryByText('Main content')).not.toBeInTheDocument()
    })

    it('shows custom error component when provided', () => {
      const customError = <div data-testid="custom-error">Custom Error!</div>
      renderLoadingState({ 
        loading: false, 
        error: 'Failed', 
        errorComponent: customError 
      })
      
      expect(screen.getByTestId('custom-error')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
      expect(screen.queryByText('Main content')).not.toBeInTheDocument()
    })

    it('applies correct error container styles', () => {
      render(
        <div data-testid="error-container">
          <LoadingState loading={false} error="Error occurred" children={<div>Content</div>} />
        </div>
      )
      
      const container = screen.getByTestId('error-container').firstChild
      expect(container).toHaveClass('text-center', 'py-8')
    })

    it('shows default error styling', () => {
      renderLoadingState({ 
        loading: false, 
        error: 'Test error' 
      })
      
      const errorTitle = screen.getByText('Something went wrong')
      const errorMessage = screen.getByText('Test error')
      
      expect(errorTitle.closest('div')).toHaveClass('text-red-600')
      expect(errorTitle).toHaveClass('text-sm')
      expect(errorMessage).toHaveClass('text-xs', 'text-mist', 'mt-1')
    })
  })

  describe('Success State', () => {
    it('shows children when not loading and no error', () => {
      renderLoadingState({ 
        loading: false, 
        error: null 
      })
      
      expect(screen.getByText('Main content')).toBeInTheDocument()
      expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('renders children as fragment', () => {
      renderLoadingState({ 
        loading: false,
        children: (
          <>
            <h1>Title</h1>
            <p>Description</p>
          </>
        )
      })
      
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
    })
  })

  describe('State Priorities', () => {
    it('prioritizes loading over error', () => {
      renderLoadingState({ 
        loading: true, 
        error: 'Some error' 
      })
      
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
      expect(screen.queryByText('Main content')).not.toBeInTheDocument()
    })

    it('prioritizes error over children', () => {
      renderLoadingState({ 
        loading: false, 
        error: 'Error occurred' 
      })
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.queryByText('Main content')).not.toBeInTheDocument()
    })

    it('handles empty error string as falsy', () => {
      renderLoadingState({ 
        loading: false, 
        error: '' 
      })
      
      expect(screen.getByText('Main content')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('handles null error correctly', () => {
      renderLoadingState({ 
        loading: false, 
        error: null 
      })
      
      expect(screen.getByText('Main content')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Complex Children', () => {
    it('handles complex React components as children', () => {
      const ComplexChild = () => (
        <div>
          <header>Header</header>
          <main>Main content</main>
          <footer>Footer</footer>
        </div>
      )
      
      renderLoadingState({ 
        loading: false,
        children: <ComplexChild />
      })
      
      expect(screen.getByText('Header')).toBeInTheDocument()
      expect(screen.getByText('Main content')).toBeInTheDocument()
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })

    it('preserves children props and state', () => {
      const ChildWithProps = ({ title }: { title: string }) => <h1>{title}</h1>
      
      renderLoadingState({ 
        loading: false,
        children: <ChildWithProps title="Dynamic Title" />
      })
      
      expect(screen.getByText('Dynamic Title')).toBeInTheDocument()
    })
  })

  describe('Integration Usage', () => {
    it('works with async data loading pattern', () => {
      // Simulate typical usage pattern
      const { rerender } = renderLoadingState({ 
        loading: true,
        children: <div>Data loaded!</div>
      })
      
      // Initially loading
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
      
      // Simulate successful load
      rerender(
        <LoadingState loading={false} children={<div>Data loaded!</div>} />
      )
      expect(screen.getByText('Data loaded!')).toBeInTheDocument()
    })

    it('works with error recovery pattern', () => {
      const { rerender } = renderLoadingState({ 
        loading: false,
        error: 'Failed to load',
        children: <div>Content</div>
      })
      
      // Initially error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      
      // Simulate retry success
      rerender(
        <LoadingState loading={false} error={null} children={<div>Content</div>} />
      )
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })
})