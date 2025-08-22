// Accessibility utility functions

/**
 * Generate a unique ID for accessibility attributes
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return !(
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0' ||
    element.hasAttribute('aria-hidden') && element.getAttribute('aria-hidden') === 'true'
  );
}

/**
 * Get the next focusable element
 */
export function getNextFocusableElement(
  current: HTMLElement,
  direction: 'next' | 'previous' = 'next'
): HTMLElement | null {
  const focusableElements = Array.from(
    document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => isVisibleToScreenReader(el as HTMLElement)) as HTMLElement[];

  const currentIndex = focusableElements.indexOf(current);
  if (currentIndex === -1) return null;

  if (direction === 'next') {
    return focusableElements[currentIndex + 1] || focusableElements[0];
  } else {
    return focusableElements[currentIndex - 1] || focusableElements[focusableElements.length - 1];
  }
}

/**
 * Create ARIA attributes for expandable sections
 */
export function createExpandableAttributes(
  isExpanded: boolean,
  triggerId: string,
  contentId: string
) {
  return {
    trigger: {
      'aria-expanded': isExpanded,
      'aria-controls': contentId,
      id: triggerId,
    },
    content: {
      'aria-labelledby': triggerId,
      id: contentId,
      role: 'region',
    },
  };
}

/**
 * Format date for screen readers
 */
export function formatDateForScreenReader(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Create ARIA label for filter buttons
 */
export function createFilterLabel(
  filterType: string,
  filterValue: string,
  isActive: boolean,
  totalResults?: number
): string {
  const base = `Filter by ${filterType}: ${filterValue}`;
  const status = isActive ? 'currently selected' : 'not selected';
  const results = totalResults !== undefined ? `, ${totalResults} results` : '';
  return `${base}, ${status}${results}`;
}

/**
 * Create ARIA live region announcement for dynamic content
 */
export function createLiveRegionAnnouncement(
  action: string,
  target: string,
  result?: string
): string {
  const base = `${action} ${target}`;
  return result ? `${base}. ${result}` : base;
}

/**
 * Validate color contrast ratio
 */
export function getContrastRatio(foreground: string, background: string): number {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      const sRGB = c / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) return 0;

  const fgLuminance = getLuminance(fg.r, fg.g, fg.b);
  const bgLuminance = getLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG requirements
 */
export function meetsContrastRequirements(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);

  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7;
  }

  return size === 'large' ? ratio >= 3 : ratio >= 4.5;
}
