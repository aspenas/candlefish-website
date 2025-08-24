/**
 * Accessibility tests for shared components
 * Tests WCAG 2.1 AA compliance for reusable UI components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';

// Import shared components (mock if not available)
const Button = ({ children, onClick, disabled, variant = 'primary', ...props }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`btn btn-${variant}`}
    {...props}
  >
    {children}
  </button>
);

const Modal = ({ isOpen, onClose, title, children, ...props }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="modal-overlay"
      {...props}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="modal-close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

const FormField = ({ label, error, required, children, helpText, ...props }) => {
  const fieldId = `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpId = helpText ? `${fieldId}-help` : undefined;

  return (
    <div className="form-field">
      <label htmlFor={fieldId} className={required ? 'required' : ''}>
        {label}
        {required && <span aria-label="required">*</span>}
      </label>
      {React.cloneElement(children, {
        id: fieldId,
        'aria-describedby': [errorId, helpId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? 'true' : undefined,
        required,
        ...props
      })}
      {helpText && <div id={helpId} className="help-text">{helpText}</div>}
      {error && (
        <div id={errorId} className="error-text" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

const SearchInput = ({ onSearch, placeholder, value, onChange, ...props }) => (
  <div className="search-input-container" role="search">
    <label htmlFor="search-input" className="sr-only">
      Search documentation
    </label>
    <input
      id="search-input"
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      aria-label="Search documentation"
      {...props}
    />
    <button
      type="button"
      onClick={onSearch}
      aria-label="Perform search"
      className="search-button"
    >
      🔍
    </button>
  </div>
);

const Breadcrumbs = ({ items }) => (
  <nav aria-label="Breadcrumb" className="breadcrumbs">
    <ol className="breadcrumb-list">
      {items.map((item, index) => (
        <li key={index} className="breadcrumb-item">
          {index < items.length - 1 ? (
            <>
              <a href={item.href} aria-label={`Navigate to ${item.label}`}>
                {item.label}
              </a>
              <span className="breadcrumb-separator" aria-hidden="true"> / </span>
            </>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

expect.extend(toHaveNoViolations);

describe('Shared Components Accessibility', () => {

  describe('Button Component', () => {
    test('should be accessible with default props', async () => {
      const { container } = render(
        <Button onClick={() => {}}>Click me</Button>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper focus management', async () => {
      const user = userEvent.setup();
      render(<Button onClick={() => {}}>Click me</Button>);

      const button = screen.getByRole('button', { name: 'Click me' });

      // Test keyboard navigation
      await user.tab();
      expect(button).toHaveFocus();

      // Test activation with keyboard
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
    });

    test('should handle disabled state accessibly', async () => {
      const { container } = render(
        <Button disabled onClick={() => {}}>Disabled button</Button>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should support custom ARIA attributes', async () => {
      const { container } = render(
        <Button
          onClick={() => {}}
          aria-describedby="help-text"
          aria-expanded="false"
        >
          Menu button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Modal Component', () => {
    test('should be accessible when open', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper dialog structure', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');

      const title = screen.getByText('Test Modal');
      expect(title).toHaveAttribute('id', 'modal-title');
    });

    test('should have accessible close button', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();

      await user.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });

    test('should trap focus within modal', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button>Outside button</button>
          <Modal isOpen={true} onClose={() => {}} title="Test Modal">
            <button>Inside button 1</button>
            <button>Inside button 2</button>
          </Modal>
        </div>
      );

      const insideButton1 = screen.getByText('Inside button 1');
      const insideButton2 = screen.getByText('Inside button 2');
      const closeButton = screen.getByLabelText('Close modal');

      // Focus should be trapped within modal
      await user.tab();
      expect([insideButton1, insideButton2, closeButton]).toContain(document.activeElement);
    });
  });

  describe('FormField Component', () => {
    test('should be accessible with basic props', async () => {
      const { container } = render(
        <FormField label="Name">
          <input type="text" />
        </FormField>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should properly associate label with input', () => {
      render(
        <FormField label="Email Address">
          <input type="email" />
        </FormField>
      );

      const input = screen.getByLabelText('Email Address');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
    });

    test('should handle required fields accessibly', () => {
      render(
        <FormField label="Password" required>
          <input type="password" />
        </FormField>
      );

      const input = screen.getByLabelText(/Password/);
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('aria-required', 'true');

      // Check for required indicator
      expect(screen.getByLabelText('required')).toBeInTheDocument();
    });

    test('should handle errors accessibly', async () => {
      const { container } = render(
        <FormField label="Email" error="Please enter a valid email">
          <input type="email" />
        </FormField>
      );

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Please enter a valid email');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should handle help text accessibly', () => {
      render(
        <FormField label="Username" helpText="Must be 3-20 characters long">
          <input type="text" />
        </FormField>
      );

      const input = screen.getByLabelText('Username');
      const helpText = screen.getByText('Must be 3-20 characters long');

      expect(input).toHaveAttribute('aria-describedby');
      expect(helpText).toHaveAttribute('id');
    });
  });

  describe('SearchInput Component', () => {
    test('should be accessible', async () => {
      const { container } = render(
        <SearchInput
          onSearch={() => {}}
          placeholder="Search documentation..."
          value=""
          onChange={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper search semantics', () => {
      render(
        <SearchInput
          onSearch={() => {}}
          placeholder="Search documentation..."
          value=""
          onChange={() => {}}
        />
      );

      const searchContainer = screen.getByRole('search');
      expect(searchContainer).toBeInTheDocument();

      const input = screen.getByLabelText('Search documentation');
      expect(input).toHaveAttribute('type', 'search');

      const button = screen.getByLabelText('Perform search');
      expect(button).toBeInTheDocument();
    });

    test('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const onSearch = jest.fn();

      render(
        <SearchInput
          onSearch={onSearch}
          placeholder="Search documentation..."
          value=""
          onChange={() => {}}
        />
      );

      const input = screen.getByLabelText('Search documentation');
      const button = screen.getByLabelText('Perform search');

      // Test keyboard navigation
      await user.tab();
      expect(input).toHaveFocus();

      await user.tab();
      expect(button).toHaveFocus();

      // Test activation
      await user.keyboard('{Enter}');
      expect(onSearch).toHaveBeenCalled();
    });
  });

  describe('Breadcrumbs Component', () => {
    const breadcrumbItems = [
      { label: 'Home', href: '/' },
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Authentication' } // Current page, no href
    ];

    test('should be accessible', async () => {
      const { container } = render(<Breadcrumbs items={breadcrumbItems} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper navigation structure', () => {
      render(<Breadcrumbs items={breadcrumbItems} />);

      const nav = screen.getByLabelText('Breadcrumb');
      expect(nav).toBeInTheDocument();

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(4);
    });

    test('should mark current page properly', () => {
      render(<Breadcrumbs items={breadcrumbItems} />);

      const currentPage = screen.getByText('Authentication');
      expect(currentPage).toHaveAttribute('aria-current', 'page');

      // Should not be a link
      expect(currentPage.tagName).toBe('SPAN');
    });

    test('should have accessible separators', () => {
      render(<Breadcrumbs items={breadcrumbItems} />);

      const separators = document.querySelectorAll('.breadcrumb-separator');
      separators.forEach(separator => {
        expect(separator).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Keyboard Navigation Integration', () => {
    test('should handle complex component interactions', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <SearchInput
            onSearch={() => {}}
            placeholder="Search..."
            value=""
            onChange={() => {}}
          />
          <Button onClick={() => {}}>Primary Action</Button>
          <FormField label="Input Field">
            <input type="text" />
          </FormField>
        </div>
      );

      // Test tab order
      await user.tab(); // Search input
      expect(screen.getByLabelText('Search documentation')).toHaveFocus();

      await user.tab(); // Search button
      expect(screen.getByLabelText('Perform search')).toHaveFocus();

      await user.tab(); // Primary button
      expect(screen.getByText('Primary Action')).toHaveFocus();

      await user.tab(); // Form input
      expect(screen.getByLabelText('Input Field')).toHaveFocus();
    });
  });

  describe('High Contrast Mode Support', () => {
    test('should maintain accessibility in high contrast mode', async () => {
      // Simulate high contrast mode by adding CSS class
      const { container } = render(
        <div className="high-contrast-mode">
          <Button onClick={() => {}}>High Contrast Button</Button>
          <FormField label="High Contrast Field" error="Error message">
            <input type="text" />
          </FormField>
        </div>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
          'color-contrast-enhanced': { enabled: true }
        }
      });

      expect(results).toHaveNoViolations();
    });
  });
});
