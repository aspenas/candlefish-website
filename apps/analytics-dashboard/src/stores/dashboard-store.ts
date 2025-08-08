import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { Dashboard, Widget, DashboardFilter, WidgetPosition, WidgetSize } from '../types/graphql'

export interface DashboardState {
  // Current dashboard state
  currentDashboard: Dashboard | null
  dashboards: Dashboard[]
  widgets: Widget[]
  isLoading: boolean
  error: string | null

  // UI state
  isEditMode: boolean
  selectedWidgetId: string | null
  draggedWidget: Widget | null
  isDragging: boolean

  // Filter state
  globalFilters: DashboardFilter[]
  appliedFilters: Record<string, any>

  // Real-time state
  collaborators: Array<{
    userId: string
    userName: string
    cursor?: { x: number; y: number }
    color: string
  }>

  // Actions
  setCurrentDashboard: (dashboard: Dashboard | null) => void
  setDashboards: (dashboards: Dashboard[]) => void
  addDashboard: (dashboard: Dashboard) => void
  updateDashboard: (dashboardId: string, updates: Partial<Dashboard>) => void
  removeDashboard: (dashboardId: string) => void

  // Widget actions
  setWidgets: (widgets: Widget[]) => void
  addWidget: (widget: Widget) => void
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void
  removeWidget: (widgetId: string) => void
  updateWidgetPosition: (widgetId: string, position: WidgetPosition, size?: WidgetSize) => void
  duplicateWidget: (widgetId: string) => void

  // UI actions
  setEditMode: (editMode: boolean) => void
  setSelectedWidget: (widgetId: string | null) => void
  setDraggedWidget: (widget: Widget | null) => void
  setIsDragging: (dragging: boolean) => void

  // Filter actions
  setGlobalFilters: (filters: DashboardFilter[]) => void
  applyFilter: (filterId: string, value: any) => void
  removeFilter: (filterId: string) => void
  clearAllFilters: () => void

  // Real-time actions
  setCollaborators: (collaborators: Array<{ userId: string; userName: string; cursor?: { x: number; y: number }; color: string }>) => void
  updateCollaboratorCursor: (userId: string, cursor: { x: number; y: number }) => void

  // Utility actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void

  // Computed
  getWidgetById: (widgetId: string) => Widget | undefined
  getDashboardById: (dashboardId: string) => Dashboard | undefined
  getFilteredWidgets: () => Widget[]
  hasUnsavedChanges: () => boolean
}

export const useDashboardStore = create<DashboardState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentDashboard: null,
    dashboards: [],
    widgets: [],
    isLoading: false,
    error: null,

    // UI state
    isEditMode: false,
    selectedWidgetId: null,
    draggedWidget: null,
    isDragging: false,

    // Filter state
    globalFilters: [],
    appliedFilters: {},

    // Real-time state
    collaborators: [],

    // Dashboard actions
    setCurrentDashboard: (dashboard: Dashboard | null) => {
      set({
        currentDashboard: dashboard,
        widgets: dashboard?.widgets || [],
        globalFilters: dashboard?.filters || [],
        selectedWidgetId: null,
        isEditMode: false,
        error: null,
      })
    },

    setDashboards: (dashboards: Dashboard[]) => {
      set({ dashboards })
    },

    addDashboard: (dashboard: Dashboard) => {
      set((state) => ({
        dashboards: [...state.dashboards, dashboard],
      }))
    },

    updateDashboard: (dashboardId: string, updates: Partial<Dashboard>) => {
      set((state) => ({
        dashboards: state.dashboards.map((dashboard) =>
          dashboard.id === dashboardId
            ? { ...dashboard, ...updates }
            : dashboard
        ),
        currentDashboard:
          state.currentDashboard?.id === dashboardId
            ? { ...state.currentDashboard, ...updates }
            : state.currentDashboard,
      }))
    },

    removeDashboard: (dashboardId: string) => {
      set((state) => ({
        dashboards: state.dashboards.filter(
          (dashboard) => dashboard.id !== dashboardId
        ),
        currentDashboard:
          state.currentDashboard?.id === dashboardId
            ? null
            : state.currentDashboard,
      }))
    },

    // Widget actions
    setWidgets: (widgets: Widget[]) => {
      set({ widgets })
    },

    addWidget: (widget: Widget) => {
      set((state) => ({
        widgets: [...state.widgets, widget],
        selectedWidgetId: widget.id,
      }))
    },

    updateWidget: (widgetId: string, updates: Partial<Widget>) => {
      set((state) => ({
        widgets: state.widgets.map((widget) =>
          widget.id === widgetId
            ? { ...widget, ...updates }
            : widget
        ),
      }))
    },

    removeWidget: (widgetId: string) => {
      set((state) => ({
        widgets: state.widgets.filter((widget) => widget.id !== widgetId),
        selectedWidgetId:
          state.selectedWidgetId === widgetId ? null : state.selectedWidgetId,
      }))
    },

    updateWidgetPosition: (
      widgetId: string,
      position: WidgetPosition,
      size?: WidgetSize
    ) => {
      set((state) => ({
        widgets: state.widgets.map((widget) =>
          widget.id === widgetId
            ? {
                ...widget,
                position,
                ...(size && { size }),
              }
            : widget
        ),
      }))
    },

    duplicateWidget: (widgetId: string) => {
      const widget = get().getWidgetById(widgetId)
      if (widget) {
        const duplicatedWidget: Widget = {
          ...widget,
          id: crypto.randomUUID(),
          name: `${widget.name} (Copy)`,
          position: {
            ...widget.position,
            x: widget.position.x + 1,
            y: widget.position.y + 1,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        get().addWidget(duplicatedWidget)
      }
    },

    // UI actions
    setEditMode: (editMode: boolean) => {
      set({
        isEditMode: editMode,
        selectedWidgetId: editMode ? get().selectedWidgetId : null,
      })
    },

    setSelectedWidget: (widgetId: string | null) => {
      set({ selectedWidgetId: widgetId })
    },

    setDraggedWidget: (widget: Widget | null) => {
      set({ draggedWidget: widget })
    },

    setIsDragging: (dragging: boolean) => {
      set({ isDragging: dragging })
    },

    // Filter actions
    setGlobalFilters: (filters: DashboardFilter[]) => {
      set({ globalFilters: filters })
    },

    applyFilter: (filterId: string, value: any) => {
      set((state) => ({
        appliedFilters: {
          ...state.appliedFilters,
          [filterId]: value,
        },
      }))
    },

    removeFilter: (filterId: string) => {
      set((state) => {
        const { [filterId]: removed, ...rest } = state.appliedFilters
        return { appliedFilters: rest }
      })
    },

    clearAllFilters: () => {
      set({ appliedFilters: {} })
    },

    // Real-time actions
    setCollaborators: (collaborators) => {
      set({ collaborators })
    },

    updateCollaboratorCursor: (userId: string, cursor: { x: number; y: number }) => {
      set((state) => ({
        collaborators: state.collaborators.map((collaborator) =>
          collaborator.userId === userId
            ? { ...collaborator, cursor }
            : collaborator
        ),
      }))
    },

    // Utility actions
    setLoading: (loading: boolean) => {
      set({ isLoading: loading })
    },

    setError: (error: string | null) => {
      set({ error })
    },

    clearError: () => {
      set({ error: null })
    },

    reset: () => {
      set({
        currentDashboard: null,
        dashboards: [],
        widgets: [],
        isLoading: false,
        error: null,
        isEditMode: false,
        selectedWidgetId: null,
        draggedWidget: null,
        isDragging: false,
        globalFilters: [],
        appliedFilters: {},
        collaborators: [],
      })
    },

    // Computed values
    getWidgetById: (widgetId: string) => {
      return get().widgets.find((widget) => widget.id === widgetId)
    },

    getDashboardById: (dashboardId: string) => {
      return get().dashboards.find((dashboard) => dashboard.id === dashboardId)
    },

    getFilteredWidgets: () => {
      const { widgets, appliedFilters } = get()

      if (Object.keys(appliedFilters).length === 0) {
        return widgets
      }

      // Apply filters to widgets based on their configurations
      // This is a simplified implementation - in practice, you'd need
      // to apply filters based on the widget's data and filter configuration
      return widgets.filter((widget) => {
        // Apply filters based on widget metadata, tags, etc.
        return true // Simplified - implement actual filtering logic
      })
    },

    hasUnsavedChanges: () => {
      // Check if there are unsaved changes in the current dashboard
      // This would compare current state with saved state
      const { currentDashboard, widgets } = get()

      if (!currentDashboard) return false

      // Simplified check - in practice, you'd compare with last saved state
      return (
        widgets.length !== currentDashboard.widgets.length ||
        widgets.some((widget, index) => {
          const savedWidget = currentDashboard.widgets[index]
          return (
            !savedWidget ||
            widget.position.x !== savedWidget.position.x ||
            widget.position.y !== savedWidget.position.y ||
            widget.size.width !== savedWidget.size.width ||
            widget.size.height !== savedWidget.size.height
          )
        })
      )
    },
  }))
)

// Subscription to handle real-time updates
useDashboardStore.subscribe(
  (state) => state.currentDashboard,
  (currentDashboard) => {
    if (currentDashboard) {
      // Set up real-time subscriptions for the current dashboard
      console.log('Setting up real-time subscriptions for dashboard:', currentDashboard.id)
    }
  }
)
