import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MobilePromptResponse } from '@/types';

interface ExecutionsState {
  executions: MobilePromptResponse[];
  recentExecutions: MobilePromptResponse[];
  activeExecutions: MobilePromptResponse[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: ExecutionsState = {
  executions: [],
  recentExecutions: [],
  activeExecutions: [],
  loading: false,
  error: null,
  lastFetch: null,
};

const executionsSlice = createSlice({
  name: 'executions',
  initialState,
  reducers: {
    fetchExecutionsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchExecutionsSuccess: (state, action: PayloadAction<MobilePromptResponse[]>) => {
      state.loading = false;
      state.executions = action.payload;
      state.lastFetch = Date.now();
      state.error = null;
    },
    fetchExecutionsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addExecution: (state, action: PayloadAction<MobilePromptResponse>) => {
      state.executions.unshift(action.payload);
      state.recentExecutions.unshift(action.payload);
      // Keep only the 50 most recent
      state.recentExecutions = state.recentExecutions.slice(0, 50);
    },
    updateExecution: (state, action: PayloadAction<MobilePromptResponse>) => {
      const index = state.executions.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.executions[index] = action.payload;
      }
      
      const recentIndex = state.recentExecutions.findIndex(e => e.id === action.payload.id);
      if (recentIndex !== -1) {
        state.recentExecutions[recentIndex] = action.payload;
      }

      // Remove from active executions if completed
      if (!action.payload.error) {
        state.activeExecutions = state.activeExecutions.filter(e => e.id !== action.payload.id);
      }
    },
    startExecution: (state, action: PayloadAction<Partial<MobilePromptResponse>>) => {
      const execution = {
        ...action.payload,
        timestamp: new Date(),
      } as MobilePromptResponse;
      
      state.activeExecutions.push(execution);
    },
    completeExecution: (state, action: PayloadAction<MobilePromptResponse>) => {
      const activeIndex = state.activeExecutions.findIndex(e => e.id === action.payload.id);
      if (activeIndex !== -1) {
        state.activeExecutions.splice(activeIndex, 1);
      }
      
      state.executions.unshift(action.payload);
      state.recentExecutions.unshift(action.payload);
      state.recentExecutions = state.recentExecutions.slice(0, 50);
    },
    failExecution: (state, action: PayloadAction<{ id: string; error: any }>) => {
      const activeIndex = state.activeExecutions.findIndex(e => e.id === action.payload.id);
      if (activeIndex !== -1) {
        state.activeExecutions[activeIndex].error = action.payload.error;
      }
    },
    deleteExecution: (state, action: PayloadAction<string>) => {
      state.executions = state.executions.filter(e => e.id !== action.payload);
      state.recentExecutions = state.recentExecutions.filter(e => e.id !== action.payload);
      state.activeExecutions = state.activeExecutions.filter(e => e.id !== action.payload);
    },
    clearExecutions: (state) => {
      state.executions = [];
      state.recentExecutions = [];
      state.activeExecutions = [];
      state.lastFetch = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchExecutionsStart,
  fetchExecutionsSuccess,
  fetchExecutionsFailure,
  addExecution,
  updateExecution,
  startExecution,
  completeExecution,
  failExecution,
  deleteExecution,
  clearExecutions,
  clearError,
} = executionsSlice.actions;

export default executionsSlice.reducer;