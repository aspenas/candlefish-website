'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccessibility, useSkipNavigation, useAriaLiveRegion } from '../../hooks/useAccessibility';

interface AccessibilityContextType {
  preferences: any;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  skipLinks: Array<{id: string, label: string, target: string}>;
  registerSkipLink: (id: string, label: string, target: string) => void;
  unregisterSkipLink: (id: string) => void;
  skipTo: (targetId: string) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const { preferences, announceToScreenReader } = useAccessibility();
  const { skipLinks, registerSkipLink, unregisterSkipLink, skipTo } = useSkipNavigation();
  const { announce } = useAriaLiveRegion();

  const contextValue: AccessibilityContextType = {
    preferences,
    announceToScreenReader,
    skipLinks,
    registerSkipLink,
    unregisterSkipLink,
    skipTo,
    announce
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <SkipNavigation />
      {children}
    </AccessibilityContext.Provider>
  );
};

// Skip Navigation Component
const SkipNavigation: React.FC = () => {
  const { skipLinks, skipTo } = useAccessibilityContext();

  if (skipLinks.length === 0) return null;

  return (
    <nav
      className="sr-only focus-within:not-sr-only fixed top-0 left-0 z-50 bg-operation-active p-2 rounded"
      aria-label="Skip navigation"
    >
      <ul className="flex gap-2">
        {skipLinks.map(link => (
          <li key={link.id}>
            <button
              onClick={() => skipTo(link.target)}
              className="px-3 py-1 bg-depth-void text-operation-active rounded text-sm font-medium hover:bg-light-primary hover:text-depth-void focus:outline-none focus:ring-2 focus:ring-light-primary"
              onFocus={(e) => {
                e.currentTarget.parentElement?.parentElement?.parentElement?.classList.remove('sr-only');
              }}
              onBlur={(e) => {
                // Only hide if no other skip link is focused
                if (!e.currentTarget.parentElement?.parentElement?.contains(e.relatedTarget as Node)) {
                  e.currentTarget.parentElement?.parentElement?.parentElement?.classList.add('sr-only');
                }
              }}
            >
              {link.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Accessible Card Component
interface AccessibleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  heading?: string;
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  description?: string;
  interactive?: boolean;
  role?: string;
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  children,
  heading,
  headingLevel = 'h2',
  description,
  interactive = false,
  role,
  className = '',
  ...props
}) => {
  const HeadingTag = headingLevel;
  const cardRole = role || (interactive ? 'button' : 'region');

  return (
    <div
      {...props}
      role={cardRole}
      className={`card-operational ${className}`}
      aria-label={heading}
      aria-describedby={description ? `${props.id}-description` : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {heading && (
        <HeadingTag className="sr-only">
          {heading}
        </HeadingTag>
      )}
      {description && (
        <p id={`${props.id}-description`} className="sr-only">
          {description}
        </p>
      )}
      {children}
    </div>
  );
};

// Focus Visible Outline Component
export const FocusVisibleOutline: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`focus-within:ring-2 focus-within:ring-operation-active focus-within:ring-offset-2 focus-within:ring-offset-depth-void rounded ${className}`}>
      {children}
    </div>
  );
};

// Loading State with Accessibility
interface AccessibleLoadingProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const AccessibleLoading: React.FC<AccessibleLoadingProps> = ({
  isLoading,
  loadingText = 'Loading...',
  children
}) => {
  const { announce } = useAccessibilityContext();

  useEffect(() => {
    if (isLoading) {
      announce(loadingText, 'polite');
    }
  }, [isLoading, loadingText, announce]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={loadingText}
        className="flex items-center justify-center p-8"
      >
        <div className="w-8 h-8 border-2 border-operation-active border-t-transparent rounded-full animate-spin" />
        <span className="sr-only">{loadingText}</span>
      </div>
    );
  }

  return <>{children}</>;
};

// Error Boundary with Accessibility
interface AccessibleErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class AccessibleErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  AccessibleErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AccessibleErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Accessibility Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            role="alert"
            aria-live="assertive"
            className="card-operational border-operation-alert/50 bg-operation-alert/10 p-6 text-center"
          >
            <h2 className="text-operation-alert font-medium mb-2">
              An error occurred
            </h2>
            <p className="text-light-secondary mb-4">
              We apologize for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-operation-alert text-depth-void rounded hover:bg-operation-alert/90 focus:outline-none focus:ring-2 focus:ring-operation-alert focus:ring-offset-2"
            >
              Refresh Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Modal with proper focus management
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);
  const { announce } = useAccessibilityContext();

  // Focus management
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      announce(`Modal opened: ${title}`, 'assertive');

      // Focus first focusable element
      setTimeout(() => {
        const focusableElement = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        focusableElement?.focus();
      }, 100);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, title, announce]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-depth-void/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`card-operational max-w-lg w-full max-h-[80vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-interface-border/20">
          <h2 id="modal-title" className="type-subtitle text-light-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-light-secondary hover:text-light-primary focus:outline-none focus:ring-2 focus:ring-operation-active rounded"
            aria-label="Close modal"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {description && (
          <p id="modal-description" className="px-6 pt-4 text-light-secondary">
            {description}
          </p>
        )}

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Form Field with Accessibility
interface AccessibleFormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  helpText?: string;
  required?: boolean;
  className?: string;
}

export const AccessibleFormField: React.FC<AccessibleFormFieldProps> = ({
  label,
  children,
  error,
  helpText,
  required,
  className = ''
}) => {
  const fieldId = React.useId();
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpId = helpText ? `${fieldId}-help` : undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-light-secondary"
      >
        {label}
        {required && (
          <span className="text-operation-alert ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      <div>
        {React.cloneElement(children as React.ReactElement, {
          id: fieldId,
          'aria-invalid': !!error,
          'aria-describedby': [errorId, helpId].filter(Boolean).join(' ') || undefined,
          required
        })}
      </div>

      {helpText && (
        <p id={helpId} className="text-xs text-light-tertiary">
          {helpText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-operation-alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};
