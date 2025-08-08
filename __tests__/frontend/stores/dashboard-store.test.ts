import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardStore } from '../../../apps/analytics-dashboard/src/stores/dashboard-store';
import { Dashboard, Widget } from '../../../apps/analytics-dashboard/src/types/graphql';

// Mock GraphQL client
const mockGraphQLClient = {
  query: vi.fn(),
  mutate: vi.fn(),
  subscribe: vi.fn(),
};

vi.mock('@apollo/client', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
  gql: (str: TemplateStringsArray) => str.join(''),
}));

const mockDashboard: Dashboard = {
  id: 'dashboard-123',
  name: 'Test Dashboard',
  organizationId: 'org-123',
  config: {
    layout: 'grid',
    theme: 'light',
    widgets: [
      {
        id: 'widget-1',
        type: 'line_chart',
        title: 'Page Views',
        position: { x: 0, y: 0, width: 6, height: 4 },
        query: 'SELECT date, count() as views FROM events WHERE event_type = "page_view" GROUP BY date',
        config: {
          xAxis: 'date',
          yAxis: 'views',
          color: '#8884d8',
        },
      },
      {
        id: 'widget-2',
        type: 'metric',
        title: 'Total Users',
        position: { x: 6, y: 0, width: 3, height: 2 },
        query: 'SELECT count(DISTINCT user_id) as total_users FROM events',
        config: {
          format: 'number',
          suffix: '',
          color: '#82ca9d',
        },
      },
    ],
  },
  isActive: true,
  createdBy: 'user-123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('Dashboard Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.reset();
    });
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useDashboardStore());

      expect(result.current.dashboard).toBeNull();
      expect(result.current.dashboards).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.selectedWidgets).toEqual([]);
      expect(result.current.editMode).toBe(false);
      expect(result.current.filters).toEqual({});
      expect(result.current.dateRange).toEqual({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });
  });

  describe('Dashboard Management', () => {
    it('should set dashboard', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setDashboard(mockDashboard);
      });

      expect(result.current.dashboard).toEqual(mockDashboard);
      expect(result.current.error).toBeNull();
    });

    it('should load dashboard with loading state', async () => {
      const { result } = renderHook(() => useDashboardStore());

      // Mock successful API response
      mockGraphQLClient.query.mockResolvedValueOnce({
        data: { dashboard: mockDashboard },
      });

      await act(async () => {
        result.current.loadDashboard('dashboard-123');
      });

      expect(result.current.dashboard).toEqual(mockDashboard);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle dashboard loading error', async () => {
      const { result } = renderHook(() => useDashboardStore());
      const error = new Error('Failed to load dashboard');

      mockGraphQLClient.query.mockRejectedValueOnce(error);

      await act(async () => {
        result.current.loadDashboard('dashboard-123');
      });

      expect(result.current.dashboard).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(error);
    });

    it('should create new dashboard', async () => {
      const { result } = renderHook(() => useDashboardStore());
      const newDashboard = {
        name: 'New Dashboard',
        organizationId: 'org-123',
        config: { layout: 'grid', theme: 'light', widgets: [] },
      };

      mockGraphQLClient.mutate.mockResolvedValueOnce({
        data: { createDashboard: { ...newDashboard, id: 'new-dashboard-123' } },
      });

      await act(async () => {
        result.current.createDashboard(newDashboard);
      });

      expect(result.current.dashboard?.name).toBe('New Dashboard');
      expect(result.current.dashboards).toHaveLength(1);
    });

    it('should update dashboard', async () => {
      const { result } = renderHook(() => useDashboardStore());

      // Set initial dashboard
      act(() => {
        result.current.setDashboard(mockDashboard);
      });

      const updates = { name: 'Updated Dashboard Name' };
      const updatedDashboard = { ...mockDashboard, ...updates };

      mockGraphQLClient.mutate.mockResolvedValueOnce({
        data: { updateDashboard: updatedDashboard },
      });

      await act(async () => {
        result.current.updateDashboard('dashboard-123', updates);
      });

      expect(result.current.dashboard?.name).toBe('Updated Dashboard Name');
    });

    it('should delete dashboard', async () => {
      const { result } = renderHook(() => useDashboardStore());

      // Set initial dashboard
      act(() => {
        result.current.setDashboard(mockDashboard);
        result.current.setDashboards([mockDashboard]);
      });

      mockGraphQLClient.mutate.mockResolvedValueOnce({
        data: { deleteDashboard: true },
      });

      await act(async () => {
        result.current.deleteDashboard('dashboard-123');
      });

      expect(result.current.dashboard).toBeNull();
      expect(result.current.dashboards).toHaveLength(0);
    });
  });

  describe('Widget Management', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useDashboardStore());
      act(() => {
        result.current.setDashboard(mockDashboard);
      });
    });

    it('should add widget to dashboard', () => {
      const { result } = renderHook(() => useDashboardStore());
      const newWidget: Widget = {
        id: 'widget-3',
        type: 'bar_chart',
        title: 'New Widget',
        position: { x: 0, y: 8, width: 6, height: 4 },
        query: 'SELECT category, count() as count FROM events GROUP BY category',
        config: { xAxis: 'category', yAxis: 'count', color: '#ffc658' },
      };

      act(() => {
        result.current.addWidget(newWidget);
      });

      expect(result.current.dashboard?.config.widgets).toHaveLength(3);
      expect(result.current.dashboard?.config.widgets[2]).toEqual(newWidget);
    });

    it('should update existing widget', () => {
      const { result } = renderHook(() => useDashboardStore());
      const updates = { title: 'Updated Widget Title', color: '#ff0000' };

      act(() => {
        result.current.updateWidget('widget-1', updates);
      });

      const updatedWidget = result.current.dashboard?.config.widgets.find(w => w.id === 'widget-1');
      expect(updatedWidget?.title).toBe('Updated Widget Title');
    });

    it('should remove widget from dashboard', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.removeWidget('widget-1');
      });

      expect(result.current.dashboard?.config.widgets).toHaveLength(1);
      expect(result.current.dashboard?.config.widgets.find(w => w.id === 'widget-1')).toBeUndefined();
    });

    it('should duplicate widget', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.duplicateWidget('widget-1');
      });

      expect(result.current.dashboard?.config.widgets).toHaveLength(3);

      const originalWidget = result.current.dashboard?.config.widgets.find(w => w.id === 'widget-1');
      const duplicatedWidget = result.current.dashboard?.config.widgets.find(w => w.title === 'Page Views (Copy)');

      expect(duplicatedWidget).toBeTruthy();
      expect(duplicatedWidget?.query).toBe(originalWidget?.query);
      expect(duplicatedWidget?.type).toBe(originalWidget?.type);
    });

    it('should move widget to new position', () => {
      const { result } = renderHook(() => useDashboardStore());
      const newPosition = { x: 3, y: 3, width: 6, height: 4 };

      act(() => {
        result.current.moveWidget('widget-1', newPosition);
      });

      const movedWidget = result.current.dashboard?.config.widgets.find(w => w.id === 'widget-1');
      expect(movedWidget?.position).toEqual(newPosition);
    });

    it('should resize widget', () => {
      const { result } = renderHook(() => useDashboardStore());
      const newSize = { width: 8, height: 6 };

      act(() => {
        result.current.resizeWidget('widget-1', newSize);
      });

      const resizedWidget = result.current.dashboard?.config.widgets.find(w => w.id === 'widget-1');
      expect(resizedWidget?.position.width).toBe(8);
      expect(resizedWidget?.position.height).toBe(6);
    });
  });

  describe('Widget Selection', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useDashboardStore());
      act(() => {
        result.current.setDashboard(mockDashboard);
      });
    });

    it('should select widget', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.selectWidget('widget-1');
      });

      expect(result.current.selectedWidgets).toContain('widget-1');
    });

    it('should select multiple widgets', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.selectWidget('widget-1');
        result.current.selectWidget('widget-2');
      });

      expect(result.current.selectedWidgets).toContain('widget-1');
      expect(result.current.selectedWidgets).toContain('widget-2');
    });

    it('should deselect widget', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.selectWidget('widget-1');
        result.current.deselectWidget('widget-1');
      });

      expect(result.current.selectedWidgets).not.toContain('widget-1');
    });

    it('should clear all selections', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.selectWidget('widget-1');
        result.current.selectWidget('widget-2');
        result.current.clearSelection();
      });

      expect(result.current.selectedWidgets).toEqual([]);
    });

    it('should delete selected widgets', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.selectWidget('widget-1');
        result.current.selectWidget('widget-2');
        result.current.deleteSelectedWidgets();
      });

      expect(result.current.dashboard?.config.widgets).toHaveLength(0);
      expect(result.current.selectedWidgets).toEqual([]);
    });
  });

  describe('Layout Management', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useDashboardStore());
      act(() => {
        result.current.setDashboard(mockDashboard);
      });
    });

    it('should update layout', () => {
      const { result } = renderHook(() => useDashboardStore());
      const newLayout = [
        { i: 'widget-1', x: 6, y: 0, w: 6, h: 4 },
        { i: 'widget-2', x: 0, y: 0, w: 6, h: 4 },
      ];

      act(() => {
        result.current.updateLayout(newLayout);
      });

      const widget1 = result.current.dashboard?.config.widgets.find(w => w.id === 'widget-1');
      const widget2 = result.current.dashboard?.config.widgets.find(w => w.id === 'widget-2');

      expect(widget1?.position).toEqual({ x: 6, y: 0, width: 6, height: 4 });
      expect(widget2?.position).toEqual({ x: 0, y: 0, width: 6, height: 4 });
    });

    it('should auto-arrange widgets', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Add more widgets to test auto-arrangement
      const additionalWidgets = Array.from({ length: 5 }, (_, i) => ({
        id: `widget-${i + 3}`,
        type: 'metric',
        title: `Widget ${i + 3}`,
        position: { x: 0, y: 0, width: 3, height: 2 }, // All at same position initially
        query: 'SELECT count() as count FROM events',
        config: { format: 'number' },
      }));

      act(() => {
        additionalWidgets.forEach(widget => result.current.addWidget(widget));
        result.current.autoArrangeWidgets();
      });

      // Verify widgets are not overlapping
      const widgets = result.current.dashboard?.config.widgets || [];
      for (let i = 0; i < widgets.length; i++) {
        for (let j = i + 1; j < widgets.length; j++) {
          const widget1 = widgets[i];
          const widget2 = widgets[j];
          const overlap = (
            widget1.position.x < widget2.position.x + widget2.position.width &&
            widget1.position.x + widget1.position.width > widget2.position.x &&
            widget1.position.y < widget2.position.y + widget2.position.height &&
            widget1.position.y + widget1.position.height > widget2.position.y
          );
          expect(overlap).toBe(false);
        }
      }
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useDashboardStore());
      act(() => {
        result.current.setDashboard(mockDashboard);
      });
    });

    it('should toggle edit mode', () => {
      const { result } = renderHook(() => useDashboardStore());

      expect(result.current.editMode).toBe(false);

      act(() => {
        result.current.setEditMode(true);
      });

      expect(result.current.editMode).toBe(true);
    });

    it('should clear selections when exiting edit mode', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.selectWidget('widget-1');
        result.current.setEditMode(true);
        result.current.setEditMode(false);
      });

      expect(result.current.selectedWidgets).toEqual([]);
    });
  });

  describe('Filters and Date Range', () => {
    it('should set global filters', () => {
      const { result } = renderHook(() => useDashboardStore());
      const filters = {
        organizationId: 'org-123',
        eventType: 'page_view',
        userSegment: 'premium',
      };

      act(() => {
        result.current.setFilters(filters);
      });

      expect(result.current.filters).toEqual(filters);
    });

    it('should update single filter', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setFilters({ eventType: 'page_view' });
        result.current.updateFilter('userSegment', 'premium');
      });

      expect(result.current.filters).toEqual({
        eventType: 'page_view',
        userSegment: 'premium',
      });
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setFilters({ eventType: 'page_view' });
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
    });

    it('should set date range', () => {
      const { result } = renderHook(() => useDashboardStore());
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      act(() => {
        result.current.setDateRange(dateRange);
      });

      expect(result.current.dateRange).toEqual(dateRange);
    });

    it('should use preset date ranges', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setPresetDateRange('last7days');
      });

      const { startDate, endDate } = result.current.dateRange;
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      expect(daysDiff).toBe(7);
    });
  });

  describe('Widget Data Management', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useDashboardStore());
      act(() => {
        result.current.setDashboard(mockDashboard);
      });
    });

    it('should set widget data', () => {
      const { result } = renderHook(() => useDashboardStore());
      const widgetData = [
        { date: '2024-01-01', views: 1200 },
        { date: '2024-01-02', views: 1350 },
      ];

      act(() => {
        result.current.setWidgetData('widget-1', widgetData);
      });

      expect(result.current.widgetData['widget-1']).toEqual(widgetData);
    });

    it('should set widget loading state', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setWidgetLoading('widget-1', true);
      });

      expect(result.current.widgetLoading['widget-1']).toBe(true);
    });

    it('should set widget error state', () => {
      const { result } = renderHook(() => useDashboardStore());
      const error = new Error('Query failed');

      act(() => {
        result.current.setWidgetError('widget-1', error);
      });

      expect(result.current.widgetErrors['widget-1']).toEqual(error);
    });

    it('should clear widget error', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setWidgetError('widget-1', new Error('Query failed'));
        result.current.clearWidgetError('widget-1');
      });

      expect(result.current.widgetErrors['widget-1']).toBeUndefined();
    });
  });

  describe('Undo/Redo Functionality', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useDashboardStore());
      act(() => {
        result.current.setDashboard(mockDashboard);
      });
    });

    it('should track history for undo/redo', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Perform some actions
      act(() => {
        result.current.updateWidget('widget-1', { title: 'Updated Title 1' });
        result.current.updateWidget('widget-1', { title: 'Updated Title 2' });
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should undo last action', () => {
      const { result } = renderHook(() => useDashboardStore());
      const originalTitle = result.current.dashboard?.config.widgets[0].title;

      act(() => {
        result.current.updateWidget('widget-1', { title: 'Updated Title' });
        result.current.undo();
      });

      const widget = result.current.dashboard?.config.widgets.find(w => w.id === 'widget-1');
      expect(widget?.title).toBe(originalTitle);
      expect(result.current.canRedo).toBe(true);
    });

    it('should redo last undone action', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.updateWidget('widget-1', { title: 'Updated Title' });
        result.current.undo();
        result.current.redo();
      });

      const widget = result.current.dashboard?.config.widgets.find(w => w.id === 'widget-1');
      expect(widget?.title).toBe('Updated Title');
      expect(result.current.canRedo).toBe(false);
    });

    it('should limit history size', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Perform many actions to test history limit
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.updateWidget('widget-1', { title: `Title ${i}` });
        }
      });

      // History should be limited (default: 50 actions)
      expect(result.current.history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Real-time Updates', () => {
    it('should handle subscription updates', () => {
      const { result } = renderHook(() => useDashboardStore());
      const updatedDashboard = {
        ...mockDashboard,
        name: 'Updated via Subscription',
        updatedAt: new Date().toISOString(),
      };

      act(() => {
        result.current.setDashboard(mockDashboard);
        result.current.handleSubscriptionUpdate(updatedDashboard);
      });

      expect(result.current.dashboard?.name).toBe('Updated via Subscription');
    });

    it('should handle widget data updates', () => {
      const { result } = renderHook(() => useDashboardStore());
      const realtimeData = [
        { timestamp: '2024-01-01T10:00:00Z', value: 100 },
        { timestamp: '2024-01-01T10:01:00Z', value: 105 },
      ];

      act(() => {
        result.current.setDashboard(mockDashboard);
        result.current.handleRealtimeDataUpdate('widget-1', realtimeData);
      });

      expect(result.current.widgetData['widget-1']).toEqual(realtimeData);
      expect(result.current.lastUpdated).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { result } = renderHook(() => useDashboardStore());
      const error = new Error('API Error');

      mockGraphQLClient.query.mockRejectedValueOnce(error);

      await act(async () => {
        result.current.loadDashboard('dashboard-123');
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.loading).toBe(false);
      expect(result.current.dashboard).toBeNull();
    });

    it('should clear errors when performing new actions', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setError(new Error('Previous error'));
        result.current.setDashboard(mockDashboard);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Persistence', () => {
    it('should save dashboard state to localStorage', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setDashboard(mockDashboard);
        result.current.saveDashboardState();
      });

      const savedState = localStorage.getItem('dashboard-state');
      expect(savedState).toBeTruthy();

      const parsedState = JSON.parse(savedState!);
      expect(parsedState.dashboard.id).toBe('dashboard-123');
    });

    it('should restore dashboard state from localStorage', () => {
      const { result } = renderHook(() => useDashboardStore());

      // Save state first
      localStorage.setItem('dashboard-state', JSON.stringify({
        dashboard: mockDashboard,
        filters: { eventType: 'page_view' },
        editMode: true,
      }));

      act(() => {
        result.current.restoreDashboardState();
      });

      expect(result.current.dashboard?.id).toBe('dashboard-123');
      expect(result.current.filters.eventType).toBe('page_view');
      expect(result.current.editMode).toBe(true);
    });
  });
});
