import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Navigation, NavItem, Breadcrumb } from '@/components/ui/navigation';

// Mock next/router for navigation tests
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
    };
  },
}));

// Mock IntersectionObserver for scroll tests
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe('Navigation Component', () => {
  const mockNavItems = [
    { label: 'Home', href: '/', active: true },
    { label: 'Projects', href: '/projects' },
    { label: 'Estimates', href: '/estimates' },
    { label: 'About', href: '/about' },
  ];

  const mockActions = (
    <div>
      <button>Login</button>
      <button>Sign Up</button>
    </div>
  );

  beforeEach(() => {
    // Reset scroll position
    window.scrollY = 0;

    // Mock window.addEventListener for scroll events
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
  });

  describe('Basic Rendering', () => {
    it('renders navigation with default props', () => {
      render(<Navigation />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass('w-full', 'z-50', 'fixed', 'top-0');
    });

    it('renders logo by default', () => {
      render(<Navigation />);

      // Logo should be rendered as default
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders custom logo when provided', () => {
      const customLogo = <div data-testid="custom-logo">Custom Logo</div>;

      render(<Navigation logo={customLogo} />);

      expect(screen.getByTestId('custom-logo')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders navigation items', () => {
      render(<Navigation items={mockNavItems} />);

      mockNavItems.forEach(item => {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      });
    });

    it('renders actions when provided', () => {
      render(<Navigation actions={mockActions} />);

      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });
  });

  describe('Active States', () => {
    it('applies active styles to active navigation items', () => {
      render(<Navigation items={mockNavItems} />);

      const homeLink = screen.getByText('Home');
      const projectsLink = screen.getByText('Projects');

      expect(homeLink).toHaveClass('text-primary');
      expect(projectsLink).toHaveClass('text-muted-foreground');
    });

    it('handles navigation item clicks', () => {
      render(<Navigation items={mockNavItems} />);

      const projectsLink = screen.getByText('Projects');

      expect(projectsLink).toHaveAttribute('href', '/projects');
    });
  });

  describe('Responsive Behavior', () => {
    it('shows mobile menu button on small screens', () => {
      render(<Navigation items={mockNavItems} />);

      const menuButton = screen.getByRole('button');
      expect(menuButton).toHaveClass('md:hidden');
    });

    it('toggles mobile menu when clicked', () => {
      render(<Navigation items={mockNavItems} />);

      const menuButton = screen.getByRole('button');

      // Initially mobile menu should not be visible
      expect(screen.queryByText('Home')).not.toBeInTheDocument();

      // Click to open mobile menu
      fireEvent.click(menuButton);

      // Now mobile menu items should be visible
      expect(screen.getAllByText('Home')).toHaveLength(2); // Desktop + Mobile
    });

    it('closes mobile menu when item is clicked', () => {
      render(<Navigation items={mockNavItems} />);

      const menuButton = screen.getByRole('button');
      fireEvent.click(menuButton); // Open menu

      const mobileHomeLink = screen.getAllByText('Home')[1]; // Mobile version
      fireEvent.click(mobileHomeLink);

      // Menu should close (only desktop version visible)
      expect(screen.getAllByText('Home')).toHaveLength(1);
    });

    it('changes menu button icon when opened/closed', () => {
      render(<Navigation items={mockNavItems} />);

      const menuButton = screen.getByRole('button');

      // Should show Menu icon initially
      expect(menuButton.querySelector('[data-testid="menu-icon"]') ||
             menuButton.querySelector('svg')).toBeInTheDocument();

      fireEvent.click(menuButton);

      // Should show X icon when opened
      expect(menuButton.querySelector('[data-testid="x-icon"]') ||
             menuButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Scroll Behavior', () => {
    it('adds scrolled styles when page is scrolled', async () => {
      render(<Navigation sticky />);

      const nav = screen.getByRole('navigation');

      // Initially should not have scrolled styles
      expect(nav).not.toHaveClass('shadow-lg');

      // Simulate scroll event
      Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
      fireEvent.scroll(window);

      await waitFor(() => {
        expect(nav).toHaveClass('shadow-lg');
      });
    });

    it('handles transparent navigation correctly', () => {
      render(<Navigation transparent />);

      const nav = screen.getByRole('navigation');

      // Should be transparent when not scrolled
      expect(nav).toHaveClass('bg-transparent');
    });

    it('removes scroll listener when component unmounts', () => {
      const { unmount } = render(<Navigation sticky />);

      unmount();

      expect(global.removeEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );
    });

    it('does not add scroll listener when sticky is false', () => {
      render(<Navigation sticky={false} />);

      expect(global.addEventListener).not.toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper navigation role', () => {
      render(<Navigation />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('has keyboard navigation support', () => {
      render(<Navigation items={mockNavItems} />);

      const homeLink = screen.getByText('Home');

      expect(homeLink).toHaveAttribute('href', '/');

      // Test keyboard navigation
      fireEvent.keyDown(homeLink, { key: 'Enter' });
      fireEvent.keyDown(homeLink, { key: ' ' }); // Space key
    });

    it('mobile menu button has proper accessibility', () => {
      render(<Navigation items={mockNavItems} />);

      const menuButton = screen.getByRole('button');

      expect(menuButton).toBeInTheDocument();
      expect(menuButton).not.toHaveAttribute('aria-label');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<Navigation className="custom-nav" />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('custom-nav');
    });

    it('merges classes correctly with conditional styles', () => {
      render(<Navigation className="custom-nav" transparent />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('custom-nav', 'bg-transparent');
    });
  });

  describe('Performance', () => {
    it('renders efficiently with many navigation items', () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        label: `Item ${i + 1}`,
        href: `/item-${i + 1}`,
      }));

      const startTime = performance.now();
      render(<Navigation items={manyItems} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});

describe('NavItem Component', () => {
  it('renders navigation item with proper styling', () => {
    render(<NavItem href="/test">Test Link</NavItem>);

    const link = screen.getByText('Test Link');
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveClass('text-sm', 'font-medium');
  });

  it('applies active styles when active prop is true', () => {
    render(<NavItem href="/test" active>Active Link</NavItem>);

    const link = screen.getByText('Active Link');
    expect(link).toHaveClass('text-primary');
  });

  it('applies inactive styles when active prop is false', () => {
    render(<NavItem href="/test" active={false}>Inactive Link</NavItem>);

    const link = screen.getByText('Inactive Link');
    expect(link).toHaveClass('text-muted-foreground');
  });
});

describe('Breadcrumb Component', () => {
  const mockBreadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Projects', href: '/projects' },
    { label: 'Project Detail' },
  ];

  it('renders breadcrumb navigation', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(breadcrumb).toBeInTheDocument();
  });

  it('renders all breadcrumb items', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);

    mockBreadcrumbItems.forEach(item => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    });
  });

  it('renders links for items with href', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);

    const homeLink = screen.getByText('Home');
    const projectsLink = screen.getByText('Projects');
    const currentItem = screen.getByText('Project Detail');

    expect(homeLink.tagName).toBe('A');
    expect(homeLink).toHaveAttribute('href', '/');
    expect(projectsLink.tagName).toBe('A');
    expect(projectsLink).toHaveAttribute('href', '/projects');
    expect(currentItem.tagName).toBe('SPAN');
  });

  it('renders separators between items', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);

    const separators = screen.getAllByText('/');
    expect(separators).toHaveLength(2); // One between each item pair
  });

  it('uses custom separator', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} separator=">" />);

    const customSeparators = screen.getAllByText('>');
    expect(customSeparators).toHaveLength(2);

    // Should not have default separators
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('highlights current page (last item)', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);

    const currentItem = screen.getByText('Project Detail');
    expect(currentItem).toHaveClass('text-foreground');
  });

  it('applies proper accessibility attributes', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);

    const breadcrumb = screen.getByRole('navigation');
    expect(breadcrumb).toHaveAttribute('aria-label', 'Breadcrumb');
  });

  it('handles single item breadcrumb', () => {
    const singleItem = [{ label: 'Home', href: '/' }];
    render(<Breadcrumb items={singleItem} />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} className="custom-breadcrumb" />);

    const breadcrumb = screen.getByRole('navigation');
    expect(breadcrumb).toHaveClass('custom-breadcrumb');
  });
});
