import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  CardProps 
} from '../../components/ui/Card'

describe('Card Component', () => {
  describe('Card', () => {
    it('renders card with children', () => {
      render(<Card data-testid="card">Card content</Card>)
      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('applies default variant and padding', () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-white', 'shadow-sm', 'border', 'border-mist/10', 'p-6')
    })

    it('applies custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>)
      expect(screen.getByTestId('card')).toHaveClass('custom-class')
    })

    describe('Variants', () => {
      it('renders default variant correctly', () => {
        render(<Card variant="default" data-testid="card">Content</Card>)
        const card = screen.getByTestId('card')
        expect(card).toHaveClass('bg-white', 'shadow-sm', 'border', 'border-mist/10')
        expect(card).not.toHaveClass('shadow-lg', 'hover:shadow-xl')
      })

      it('renders elevated variant correctly', () => {
        render(<Card variant="elevated" data-testid="card">Content</Card>)
        const card = screen.getByTestId('card')
        expect(card).toHaveClass('bg-white', 'shadow-lg', 'border', 'border-mist/10', 'hover:shadow-xl')
      })

      it('renders outlined variant correctly', () => {
        render(<Card variant="outlined" data-testid="card">Content</Card>)
        const card = screen.getByTestId('card')
        expect(card).toHaveClass('bg-white', 'border-2', 'border-mist/20')
        expect(card).not.toHaveClass('shadow-sm', 'shadow-lg')
      })
    })

    describe('Padding', () => {
      it('renders with no padding', () => {
        render(<Card padding="none" data-testid="card">Content</Card>)
        expect(screen.getByTestId('card')).toHaveClass('p-0')
      })

      it('renders with small padding', () => {
        render(<Card padding="sm" data-testid="card">Content</Card>)
        expect(screen.getByTestId('card')).toHaveClass('p-4')
      })

      it('renders with medium padding (default)', () => {
        render(<Card padding="md" data-testid="card">Content</Card>)
        expect(screen.getByTestId('card')).toHaveClass('p-6')
      })

      it('renders with large padding', () => {
        render(<Card padding="lg" data-testid="card">Content</Card>)
        expect(screen.getByTestId('card')).toHaveClass('p-8')
      })
    })

    it('passes through additional HTML attributes', () => {
      render(
        <Card 
          data-testid="card" 
          role="article" 
          aria-label="Test card"
        >
          Content
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('role', 'article')
      expect(card).toHaveAttribute('aria-label', 'Test card')
    })
  })

  describe('CardHeader', () => {
    it('renders header with children', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>)
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByText('Header content')).toBeInTheDocument()
    })

    it('applies default margin bottom', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>)
      expect(screen.getByTestId('header')).toHaveClass('mb-4')
    })

    it('applies custom className', () => {
      render(<CardHeader className="custom-header" data-testid="header">Header</CardHeader>)
      expect(screen.getByTestId('header')).toHaveClass('custom-header', 'mb-4')
    })
  })

  describe('CardTitle', () => {
    it('renders as h3 by default', () => {
      render(<CardTitle>Test Title</CardTitle>)
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Test Title')
    })

    it('renders with correct styles', () => {
      render(<CardTitle>Test Title</CardTitle>)
      const title = screen.getByRole('heading')
      expect(title).toHaveClass('text-lg', 'font-semibold', 'text-slate')
    })

    it('renders as different heading levels', () => {
      render(<CardTitle as="h1">H1 Title</CardTitle>)
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

      render(<CardTitle as="h2">H2 Title</CardTitle>)
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>)
      const title = screen.getByRole('heading')
      expect(title).toHaveClass('custom-title', 'text-lg', 'font-semibold', 'text-slate')
    })
  })

  describe('CardDescription', () => {
    it('renders description with children', () => {
      render(<CardDescription>Test description</CardDescription>)
      expect(screen.getByText('Test description')).toBeInTheDocument()
    })

    it('renders as paragraph element', () => {
      render(<CardDescription data-testid="description">Description</CardDescription>)
      const description = screen.getByTestId('description')
      expect(description.tagName).toBe('P')
    })

    it('applies correct styles', () => {
      render(<CardDescription data-testid="description">Description</CardDescription>)
      expect(screen.getByTestId('description')).toHaveClass('text-sm', 'text-mist')
    })

    it('applies custom className', () => {
      render(<CardDescription className="custom-desc" data-testid="description">Description</CardDescription>)
      expect(screen.getByTestId('description')).toHaveClass('custom-desc', 'text-sm', 'text-mist')
    })
  })

  describe('CardContent', () => {
    it('renders content with children', () => {
      render(<CardContent data-testid="content">Content text</CardContent>)
      expect(screen.getByTestId('content')).toBeInTheDocument()
      expect(screen.getByText('Content text')).toBeInTheDocument()
    })

    it('renders as div element', () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      const content = screen.getByTestId('content')
      expect(content.tagName).toBe('DIV')
    })

    it('applies custom className', () => {
      render(<CardContent className="custom-content" data-testid="content">Content</CardContent>)
      expect(screen.getByTestId('content')).toHaveClass('custom-content')
    })
  })

  describe('CardFooter', () => {
    it('renders footer with children', () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>)
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })

    it('applies default styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveClass('mt-4', 'pt-4', 'border-t', 'border-mist/10')
    })

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer" data-testid="footer">Footer</CardFooter>)
      expect(screen.getByTestId('footer')).toHaveClass('custom-footer', 'mt-4', 'pt-4')
    })
  })

  describe('Complete Card Structure', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main card content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action Button</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByTestId('complete-card')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Card Title')
      expect(screen.getByText('Card description text')).toBeInTheDocument()
      expect(screen.getByText('Main card content goes here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('supports ARIA attributes', () => {
      render(
        <Card 
          role="article" 
          aria-labelledby="card-title"
          data-testid="accessible-card"
        >
          <CardTitle id="card-title">Accessible Title</CardTitle>
          <CardContent>Accessible content</CardContent>
        </Card>
      )

      const card = screen.getByTestId('accessible-card')
      expect(card).toHaveAttribute('role', 'article')
      expect(card).toHaveAttribute('aria-labelledby', 'card-title')
    })

    it('maintains semantic structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle as="h2">Main Title</CardTitle>
            <CardDescription>Subtitle</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Paragraph content</p>
          </CardContent>
        </Card>
      )

      // Check that heading hierarchy is maintained
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      // Check that semantic elements are present
      expect(screen.getByText('Paragraph content').tagName).toBe('P')
    })
  })
})