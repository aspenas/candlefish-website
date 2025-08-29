import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import { MemoryRouter } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';

// Mock child components
vi.mock('../Navigation', () => ({
  default: ({ isCollapsed, onToggle }: any) => (
    <nav data-testid="navigation" className={isCollapsed ? 'collapsed' : 'expanded'}>
      <button onClick={onToggle}>Toggle</button>
    </nav>
  ),
}));

vi.mock('@/components/notifications/NotificationPanel', () => ({
  default: () => <div data-testid="notification-panel">Notifications</div>,
}));

vi.mock('@/components/user/UserMenu', () => ({
  default: () => <div data-testid="user-menu">User Menu</div>,
}));

const TestContent = () => <div data-testid="test-content">Test Content</div>;

describe('DashboardLayout', () => {
  const defaultProps = {
    title: 'Security Dashboard',
    children: <TestContent />,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  const renderWithRouter = (component: React.ReactElement, initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        {component}
      </MemoryRouter>
    );
  };

  it('renders layout with all main components', () => {
    renderWithRouter(<DashboardLayout {...defaultProps} />);

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(screen.getByTestId('notification-panel')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
  });

  it('displays custom title when provided', () => {
    renderWithRouter(<DashboardLayout {...defaultProps} title="Custom Title" />);

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('toggles navigation collapsed state', async () => {
    renderWithRouter(<DashboardLayout {...defaultProps} />);

    const navigation = screen.getByTestId('navigation');
    const toggleButton = screen.getByText('Toggle');

    // Initially expanded
    expect(navigation).toHaveClass('expanded');

    // Click to collapse
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(navigation).toHaveClass('collapsed');
    });

    // Click again to expand
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(navigation).toHaveClass('expanded');
    });
  });

  it('persists navigation state in localStorage', async () => {
    const setItem = vi.fn();
    Object.defineProperty(window, 'localStorage', {
      value: { ...window.localStorage, setItem },
      writable: true,
    });

    renderWithRouter(<DashboardLayout {...defaultProps} />);

    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(setItem).toHaveBeenCalledWith('navigationCollapsed', 'true');
    });
  });

  it('restores navigation state from localStorage', () => {
    const getItem = vi.fn(() => 'true');
    Object.defineProperty(window, 'localStorage', {
      value: { ...window.localStorage, getItem },
      writable: true,
    });

    renderWithRouter(<DashboardLayout {...defaultProps} />);

    expect(screen.getByTestId('navigation')).toHaveClass('collapsed');
  });

  it('renders breadcrumbs when provided', () => {
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Security', href: '/security' },
      { label: 'Dashboard', href: '/security/dashboard' },
    ];

    renderWithRouter(
      <DashboardLayout {...defaultProps} breadcrumbs={breadcrumbs} />
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders action buttons when provided', () => {
    const actions = (
      <div>
        <button data-testid="action-button-1">Action 1</button>
        <button data-testid="action-button-2">Action 2</button>
      </div>
    );

    renderWithRouter(
      <DashboardLayout {...defaultProps} actions={actions} />
    );

    expect(screen.getByTestId('action-button-1')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-2')).toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    renderWithRouter(<DashboardLayout {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error state when error is provided', () => {
    const error = 'Failed to load dashboard';
    
    renderWithRouter(<DashboardLayout {...defaultProps} error={error} />);

    expect(screen.getByTestId('error-banner')).toBeInTheDocument();
    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('closes error banner when close button is clicked', async () => {
    renderWithRouter(<DashboardLayout {...defaultProps} error="Test error" />);

    const closeButton = screen.getByLabelText('Close error');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('error-banner')).not.toBeInTheDocument();
    });
  });

  it('handles window resize for responsive layout', async () => {
    renderWithRouter(<DashboardLayout {...defaultProps} />);

    // Simulate mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 640,
    });

    window.dispatchEvent(new Event('resize'));

    await waitFor(() => {
      expect(document.body).toHaveClass('mobile-layout');
    });

    // Simulate desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    window.dispatchEvent(new Event('resize'));

    await waitFor(() => {
      expect(document.body).not.toHaveClass('mobile-layout');
    });
  });

  it('supports keyboard navigation', async () => {
    renderWithRouter(<DashboardLayout {...defaultProps} />);

    // Press Alt+N to toggle navigation
    fireEvent.keyDown(document, { key: 'n', altKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('navigation')).toHaveClass('collapsed');
    });
  });

  it('renders with custom className', () => {
    renderWithRouter(
      <DashboardLayout {...defaultProps} className="custom-layout" />
    );

    expect(document.querySelector('.custom-layout')).toBeInTheDocument();
  });

  it('handles fullscreen mode', async () => {
    renderWithRouter(<DashboardLayout {...defaultProps} />);

    const fullscreenButton = screen.getByLabelText('Toggle fullscreen');
    fireEvent.click(fullscreenButton);

    await waitFor(() => {
      expect(document.body).toHaveClass('fullscreen-mode');
    });

    // Exit fullscreen
    fireEvent.click(fullscreenButton);

    await waitFor(() => {
      expect(document.body).not.toHaveClass('fullscreen-mode');
    });
  });

  it('displays notification count badge', () => {
    renderWithRouter(
      <DashboardLayout {...defaultProps} notificationCount={5} />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
  });

  it('handles theme toggle', async () => {
    renderWithRouter(<DashboardLayout {...defaultProps} />);

    const themeToggle = screen.getByLabelText('Toggle theme');
    fireEvent.click(themeToggle);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
  });

  it('supports custom header content', () => {
    const customHeader = <div data-testid="custom-header">Custom Header</div>;

    renderWithRouter(
      <DashboardLayout {...defaultProps} headerContent={customHeader} />
    );

    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  it('renders sidebar content when provided', () => {
    const sidebarContent = <div data-testid="sidebar-content">Sidebar</div>;

    renderWithRouter(
      <DashboardLayout {...defaultProps} sidebarContent={sidebarContent} />
    );

    expect(screen.getByTestId('sidebar-content')).toBeInTheDocument();
  });
});