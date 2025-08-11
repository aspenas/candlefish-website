import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button, ButtonGroup } from '@/components/ui/button';

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('renders button with default props', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
    });

    it('renders button text correctly', () => {
      render(<Button>Test Button</Button>);

      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<Button className="custom-button">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-button');
    });
  });

  describe('Button Variants', () => {
    const variants = [
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
      'glow',
      'glass',
    ] as const;

    variants.forEach(variant => {
      it(`renders ${variant} variant correctly`, () => {
        render(<Button variant={variant}>Button</Button>);

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();

        // Check that appropriate classes are applied based on variant
        if (variant === 'default') {
          expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
        } else if (variant === 'destructive') {
          expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground');
        } else if (variant === 'outline') {
          expect(button).toHaveClass('border', 'border-input', 'bg-background');
        }
      });
    });
  });

  describe('Button Sizes', () => {
    const sizes = ['sm', 'default', 'lg', 'xl', 'icon'] as const;

    sizes.forEach(size => {
      it(`renders ${size} size correctly`, () => {
        render(<Button size={size}>Button</Button>);

        const button = screen.getByRole('button');

        // Check size-specific classes
        if (size === 'sm') {
          expect(button).toHaveClass('h-8', 'px-4', 'text-xs');
        } else if (size === 'lg') {
          expect(button).toHaveClass('h-12', 'px-8', 'text-base');
        } else if (size === 'xl') {
          expect(button).toHaveClass('h-14', 'px-10', 'text-lg');
        } else if (size === 'icon') {
          expect(button).toHaveClass('h-10', 'w-10');
        } else {
          expect(button).toHaveClass('h-10', 'px-6', 'py-2');
        }
      });
    });
  });

  describe('Button States', () => {
    it('handles click events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('shows loading state correctly', () => {
      render(<Button loading>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should show loading spinner
      const spinner = button.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('shows custom loading text', () => {
      render(<Button loading loadingText="Processing...">Button</Button>);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.queryByText('Button')).not.toBeInTheDocument();
    });

    it('is disabled during loading', () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Glow Effect', () => {
    it('applies glow effect when glow prop is true', () => {
      render(<Button glow>Glowing Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('relative', 'after:absolute');
    });

    it('does not apply glow effect by default', () => {
      render(<Button>Normal Button</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('relative', 'after:absolute');
    });
  });

  describe('AsChild Functionality', () => {
    it('renders as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      const link = screen.getByRole('link', { name: /link button/i });
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveClass('inline-flex', 'items-center');
    });

    it('renders as button when asChild is false', () => {
      render(<Button asChild={false}>Regular Button</Button>);

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('Keyboard Interaction', () => {
    it('responds to Enter key', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

      expect(handleClick).toHaveBeenCalled();
    });

    it('responds to Space key', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      fireEvent.keyUp(button, { key: ' ', code: 'Space' });

      expect(handleClick).toHaveBeenCalled();
    });

    it('has proper focus styles', () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2');
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<Button>Button</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('supports aria attributes', () => {
      render(
        <Button aria-label="Custom Label" aria-describedby="help-text">
          Button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom Label');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('is keyboard accessible', () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it('has proper disabled state accessibility', () => {
      render(<Button disabled>Disabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });
  });

  describe('Animation and Styling', () => {
    it('has hover and active transform styles', () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('motion-safe:hover:scale-[1.02]', 'motion-safe:active:scale-[0.98]');
    });

    it('respects reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('motion-safe:hover:scale-[1.02]');
    });
  });

  describe('Performance', () => {
    it('renders multiple buttons efficiently', () => {
      const startTime = performance.now();

      render(
        <div>
          {Array.from({ length: 100 }, (_, i) => (
            <Button key={i} variant={i % 2 === 0 ? 'default' : 'outline'}>
              Button {i}
            </Button>
          ))}
        </div>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(200); // Should render 100 buttons in less than 200ms
    });
  });

  describe('Error Handling', () => {
    it('handles missing children gracefully', () => {
      render(<Button />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEmptyDOMElement();
    });

    it('handles invalid props gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        // @ts-ignore - Testing invalid props
        <Button variant="invalid" size="invalid">
          Button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});

describe('ButtonGroup Component', () => {
  describe('Basic Rendering', () => {
    it('renders button group with default props', () => {
      render(
        <ButtonGroup>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );

      const group = screen.getByText('Button 1').closest('div');
      expect(group).toHaveClass('flex', 'flex-row', 'gap-2');
    });

    it('renders buttons within group', () => {
      render(
        <ButtonGroup>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </ButtonGroup>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  describe('Orientation', () => {
    it('renders horizontal orientation by default', () => {
      render(
        <ButtonGroup>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );

      const group = screen.getByText('Button 1').closest('div');
      expect(group).toHaveClass('flex-row');
    });

    it('renders vertical orientation correctly', () => {
      render(
        <ButtonGroup orientation="vertical">
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </ButtonGroup>
      );

      const group = screen.getByText('Button 1').closest('div');
      expect(group).toHaveClass('flex-col');
    });
  });

  describe('Attached Styling', () => {
    it('applies attached styles for horizontal group', () => {
      render(
        <ButtonGroup attached orientation="horizontal">
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </ButtonGroup>
      );

      const group = screen.getByText('First').closest('div');
      expect(group).toHaveClass('[&>*:not(:first-child)]:rounded-l-none');
      expect(group).toHaveClass('[&>*:not(:last-child)]:rounded-r-none');
      expect(group).toHaveClass('[&>*:not(:first-child)]:-ml-px');
    });

    it('applies attached styles for vertical group', () => {
      render(
        <ButtonGroup attached orientation="vertical">
          <Button>First</Button>
          <Button>Second</Button>
        </ButtonGroup>
      );

      const group = screen.getByText('First').closest('div');
      expect(group).toHaveClass('[&>*:not(:first-child)]:rounded-t-none');
      expect(group).toHaveClass('[&>*:not(:last-child)]:rounded-b-none');
      expect(group).toHaveClass('[&>*:not(:first-child)]:-mt-px');
    });

    it('does not apply gap when attached', () => {
      render(
        <ButtonGroup attached>
          <Button>First</Button>
          <Button>Second</Button>
        </ButtonGroup>
      );

      const group = screen.getByText('First').closest('div');
      expect(group).not.toHaveClass('gap-2');
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(
        <ButtonGroup className="custom-group">
          <Button>Button</Button>
        </ButtonGroup>
      );

      const group = screen.getByText('Button').closest('div');
      expect(group).toHaveClass('custom-group');
    });

    it('passes through other props', () => {
      render(
        <ButtonGroup data-testid="button-group" role="group">
          <Button>Button</Button>
        </ButtonGroup>
      );

      const group = screen.getByTestId('button-group');
      expect(group).toHaveAttribute('role', 'group');
    });
  });

  describe('Accessibility', () => {
    it('can have role attribute', () => {
      render(
        <ButtonGroup role="group" aria-label="Action buttons">
          <Button>Edit</Button>
          <Button>Delete</Button>
        </ButtonGroup>
      );

      const group = screen.getByRole('group', { name: /action buttons/i });
      expect(group).toBeInTheDocument();
    });
  });

  describe('Layout Behavior', () => {
    it('handles single button correctly', () => {
      render(
        <ButtonGroup>
          <Button>Single Button</Button>
        </ButtonGroup>
      );

      const group = screen.getByText('Single Button').closest('div');
      expect(group).toHaveClass('flex');
    });

    it('handles empty group gracefully', () => {
      render(<ButtonGroup />);

      const group = screen.getByRole('generic'); // div without specific role
      expect(group).toHaveClass('flex');
    });
  });
});
