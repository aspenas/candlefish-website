import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Dashboard, Widget, WidgetData } from '@/types/graphql';
import { DashboardService } from '@/services/dashboard';

interface DashboardState {
  dashboards: Dashboard[];
  currentDashboard: Dashboard | null;
  widgetData: Record<string, WidgetData>;
  isLoading: boolean;
  isLoadingWidget: Record<string, boolean>;
  error: string | null;
  lastRefresh: number | null;
  autoRefresh: boolean;
  refreshInterval: number;
  filters: Record<string, any>;
}

const initialState: DashboardState = {
  dashboards: [],
  currentDashboard: null,
  widgetData: {},
  isLoading: false,
  isLoadingWidget: {},
  error: null,
  lastRefresh: null,
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds
  filters: {},
};

// Async thunks
export const fetchDashboards = createAsyncThunk(
  'dashboard/fetchDashboards',
  async ({ organizationId }: { organizationId: string }, { rejectWithValue }) => {
    try {
      return await DashboardService.getDashboards(organizationId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch dashboards');
    }
  }
);

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchDashboard',
  async ({ dashboardId }: { dashboardId: string }, { rejectWithValue }) => {
    try {
      return await DashboardService.getDashboard(dashboardId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch dashboard');
    }
  }
);

export const fetchWidgetData = createAsyncThunk(
  'dashboard/fetchWidgetData',
  async ({
    widgetId,
    filters = {}
  }: {
    widgetId: string;
    filters?: Record<string, any>;
  }, { rejectWithValue }) => {
    try {
      const data = await DashboardService.getWidgetData(widgetId, filters);
      return { widgetId, data };
    } catch (error) {
      return rejectWithValue({
        widgetId,
        error: error instanceof Error ? error.message : 'Failed to fetch widget data'
      });
    }
  }
);

export const refreshDashboard = createAsyncThunk(
  'dashboard/refreshDashboard',
  async (dashboardId: string, { getState, dispatch }) => {
    const state = getState() as { dashboard: DashboardState };
    const dashboard = state.dashboard.currentDashboard;

    if (dashboard && dashboard.id === dashboardId) {
      // Refresh all widgets in the dashboard
      const refreshPromises = dashboard.widgets.map(widget =>
        dispatch(fetchWidgetData({
          widgetId: widget.id,
          filters: state.dashboard.filters
        }))
      );

      await Promise.all(refreshPromises);
      return Date.now();
    }

    return state.dashboard.lastRefresh;
  }
);

export const updateDashboardFilters = createAsyncThunk(
  'dashboard/updateFilters',
  async ({
    dashboardId,
    filters
  }: {
    dashboardId: string;
    filters: Record<string, any>;
  }, { dispatch, getState }) => {
    const state = getState() as { dashboard: DashboardState };
    const dashboard = state.dashboard.currentDashboard;

    if (dashboard && dashboard.id === dashboardId) {
      // Refresh all widgets with new filters
      const refreshPromises = dashboard.widgets.map(widget =>
        dispatch(fetchWidgetData({
          widgetId: widget.id,
          filters
        }))
      );

      await Promise.all(refreshPromises);
    }

    return filters;
  }
);

export const createDashboard = createAsyncThunk(
  'dashboard/create',
  async ({
    organizationId,
    dashboard
  }: {
    organizationId: string;
    dashboard: Partial<Dashboard>;
  }, { rejectWithValue }) => {
    try {
      return await DashboardService.createDashboard(organizationId, dashboard);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create dashboard');
    }
  }
);

export const updateDashboard = createAsyncThunk(
  'dashboard/update',
  async ({
    dashboardId,
    updates
  }: {
    dashboardId: string;
    updates: Partial<Dashboard>;
  }, { rejectWithValue }) => {
    try {
      return await DashboardService.updateDashboard(dashboardId, updates);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update dashboard');
    }
  }
);

export const deleteDashboard = createAsyncThunk(
  'dashboard/delete',
  async (dashboardId: string, { rejectWithValue }) => {
    try {
      await DashboardService.deleteDashboard(dashboardId);
      return dashboardId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete dashboard');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentDashboard: (state, action: PayloadAction<Dashboard>) => {
      state.currentDashboard = action.payload;
    },
    clearCurrentDashboard: (state) => {
      state.currentDashboard = null;
      state.widgetData = {};
      state.filters = {};
    },
    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.autoRefresh = action.payload;
    },
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
    clearDashboardData: (state) => {
      state.dashboards = [];
      state.currentDashboard = null;
      state.widgetData = {};
      state.filters = {};
    },
    updateWidgetInDashboard: (state, action: PayloadAction<Widget>) => {
      if (state.currentDashboard) {
        const widgetIndex = state.currentDashboard.widgets.findIndex(
          w => w.id === action.payload.id
        );
        if (widgetIndex !== -1) {
          state.currentDashboard.widgets[widgetIndex] = action.payload;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboards
      .addCase(fetchDashboards.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboards.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboards = action.payload;
      })
      .addCase(fetchDashboards.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch dashboard
      .addCase(fetchDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentDashboard = action.payload;
        // Update the dashboard in the list if it exists
        const index = state.dashboards.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.dashboards[index] = action.payload;
        }
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch widget data
      .addCase(fetchWidgetData.pending, (state, action) => {
        const { widgetId } = action.meta.arg;
        state.isLoadingWidget[widgetId] = true;
      })
      .addCase(fetchWidgetData.fulfilled, (state, action) => {
        const { widgetId, data } = action.payload;
        state.isLoadingWidget[widgetId] = false;
        state.widgetData[widgetId] = data;
      })
      .addCase(fetchWidgetData.rejected, (state, action) => {
        const { widgetId } = action.payload as { widgetId: string; error: string };
        state.isLoadingWidget[widgetId] = false;
        // Could store widget-specific errors if needed
      })

      // Refresh dashboard
      .addCase(refreshDashboard.fulfilled, (state, action) => {
        state.lastRefresh = action.payload;
      })

      // Update dashboard filters
      .addCase(updateDashboardFilters.fulfilled, (state, action) => {
        state.filters = action.payload;
      })

      // Create dashboard
      .addCase(createDashboard.fulfilled, (state, action) => {
        state.dashboards.push(action.payload);
      })
      .addCase(createDashboard.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Update dashboard
      .addCase(updateDashboard.fulfilled, (state, action) => {
        const index = state.dashboards.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.dashboards[index] = action.payload;
        }
        if (state.currentDashboard?.id === action.payload.id) {
          state.currentDashboard = action.payload;
        }
      })
      .addCase(updateDashboard.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Delete dashboard
      .addCase(deleteDashboard.fulfilled, (state, action) => {
        state.dashboards = state.dashboards.filter(d => d.id !== action.payload);
        if (state.currentDashboard?.id === action.payload) {
          state.currentDashboard = null;
          state.widgetData = {};
          state.filters = {};
        }
      })
      .addCase(deleteDashboard.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setCurrentDashboard,
  clearCurrentDashboard,
  setAutoRefresh,
  setRefreshInterval,
  clearDashboardData,
  updateWidgetInDashboard,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
