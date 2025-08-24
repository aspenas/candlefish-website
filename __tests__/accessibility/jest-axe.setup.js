/**
 * Jest-axe setup for accessibility testing
 * Configures axe-core for WCAG 2.1 AA compliance testing
 */

import { configureAxe } from 'jest-axe';

// Configure axe-core for comprehensive accessibility testing
const axe = configureAxe({
  // WCAG 2.1 AA compliance rules
  rules: {
    // Color contrast requirements
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: true },

    // Keyboard navigation
    'focus-order-semantics': { enabled: true },
    'tabindex': { enabled: true },
    'accesskeys': { enabled: true },

    // Screen reader compatibility
    'aria-allowed-attr': { enabled: true },
    'aria-command-name': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-input-field-name': { enabled: true },
    'aria-label': { enabled: true },
    'aria-labelledby': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-toggle-field-name': { enabled: true },
    'aria-tooltip-name': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },

    // Semantic HTML
    'button-name': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'html-xml-lang-mismatch': { enabled: true },
    'image-alt': { enabled: true },
    'input-button-name': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'object-alt': { enabled: true },

    // Document structure
    'bypass': { enabled: true },
    'document-title': { enabled: true },
    'duplicate-id-active': { enabled: true },
    'duplicate-id-aria': { enabled: true },
    'duplicate-id': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-banner-is-top-level': { enabled: true },
    'landmark-complementary-is-top-level': { enabled: true },
    'landmark-contentinfo-is-top-level': { enabled: true },
    'landmark-main-is-top-level': { enabled: true },
    'landmark-no-duplicate-banner': { enabled: true },
    'landmark-no-duplicate-contentinfo': { enabled: true },
    'landmark-no-duplicate-main': { enabled: true },
    'landmark-one-main': { enabled: true },
    'landmark-unique': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },

    // Interactive elements
    'nested-interactive': { enabled: true },
    'no-autoplay-audio': { enabled: true },
    'scrollable-region-focusable': { enabled: true },

    // Motion and animation
    'meta-refresh': { enabled: true },
    'meta-viewport': { enabled: true },

    // Tables
    'table-duplicate-name': { enabled: true },
    'table-fake-caption': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },

    // Lists
    'definition-list': { enabled: true },
    'dlitem': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true }
  },

  // Tags for WCAG 2.1 AA compliance
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],

  // Custom configuration for our platform
  options: {
    // Increase timeout for complex components
    timeout: 10000,

    // Include shadow DOM testing
    includeShadowDom: true,

    // Custom axe configuration for our components
    rules: {
      // Allow certain patterns common in documentation platforms
      'region': {
        enabled: true,
        options: {
          // Allow main content without explicit region landmarks in documentation
          allowImplicit: true
        }
      },

      // Customize color contrast for our design system
      'color-contrast': {
        enabled: true,
        options: {
          // Minimum contrast ratio for WCAG AA
          contrastRatio: {
            normal: 4.5,
            large: 3.0
          }
        }
      },

      // Custom heading order rules for documentation structure
      'heading-order': {
        enabled: true,
        options: {
          // Allow skipping heading levels in nested documentation
          allowSkipping: false
        }
      }
    }
  }
});

// Custom matchers for accessibility testing
expect.extend({
  // Check if element has proper ARIA attributes
  toHaveAccessibleName(received, expectedName) {
    const accessibleName = received.getAttribute('aria-label') ||
                          received.getAttribute('aria-labelledby') ||
                          received.textContent ||
                          received.getAttribute('title') ||
                          received.getAttribute('alt');

    const pass = accessibleName && accessibleName.includes(expectedName);

    return {
      message: () =>
        `expected element to have accessible name containing "${expectedName}", but got "${accessibleName}"`,
      pass
    };
  },

  // Check if element is keyboard accessible
  toBeKeyboardAccessible(received) {
    const tabIndex = received.getAttribute('tabindex');
    const role = received.getAttribute('role');
    const isInteractive = ['button', 'link', 'input', 'select', 'textarea'].includes(received.tagName.toLowerCase()) ||
                          ['button', 'link', 'tab', 'menuitem'].includes(role);

    const pass = isInteractive && (tabIndex !== '-1');

    return {
      message: () =>
        `expected element to be keyboard accessible (focusable)`,
      pass
    };
  },

  // Check if form field has proper labeling
  toHaveFormLabel(received) {
    const id = received.getAttribute('id');
    const ariaLabel = received.getAttribute('aria-label');
    const ariaLabelledBy = received.getAttribute('aria-labelledby');
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);

    const pass = ariaLabel || ariaLabelledBy || hasLabel;

    return {
      message: () =>
        `expected form field to have proper labeling (label, aria-label, or aria-labelledby)`,
      pass
    };
  }
});

// Global accessibility testing utilities
global.axeConfig = {
  // Standard test function for components
  testComponentAccessibility: async (component, options = {}) => {
    const results = await axe(component.container, {
      ...axe.options,
      ...options
    });
    expect(results).toHaveNoViolations();
    return results;
  },

  // Test specific accessibility features
  testKeyboardNavigation: (component) => {
    // Test tab order
    const focusableElements = component.container.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach((element, index) => {
      element.focus();
      expect(document.activeElement).toBe(element);
    });
  },

  // Test screen reader announcements
  testAriaLiveRegions: (component) => {
    const liveRegions = component.container.querySelectorAll('[aria-live]');
    liveRegions.forEach(region => {
      const politeness = region.getAttribute('aria-live');
      expect(['polite', 'assertive', 'off']).toContain(politeness);
    });
  },

  // Test color contrast programmatically
  testColorContrast: async (component) => {
    const results = await axe(component.container, {
      rules: {
        'color-contrast': { enabled: true },
        'color-contrast-enhanced': { enabled: true }
      }
    });

    const contrastViolations = results.violations.filter(
      violation => violation.id.includes('color-contrast')
    );

    expect(contrastViolations).toHaveLength(0);
  }
};

export default axe;
