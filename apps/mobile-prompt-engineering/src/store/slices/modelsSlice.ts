import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ModelProvider } from '@/types';

interface ModelStatus {
  provider: ModelProvider;
  model: string;
  status: 'online' | 'offline' | 'limited' | 'maintenance';
  latency?: number;
  errorRate?: number;
  rateLimitRemaining?: number;
  lastChecked: Date;
}

interface ModelsState {
  modelStatuses: ModelStatus[];
  availableModels: Record<ModelProvider, string[]>;
  loading: boolean;
  error: string | null;
  lastHealthCheck: number | null;
}

const initialState: ModelsState = {
  modelStatuses: [],
  availableModels: {
    anthropic: [
      'claude-opus-4-1-20250805',
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307'
    ],
    openai: [
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ],
    together: [
      'meta-llama/Llama-2-70b-chat-hf',
      'mistralai/Mixtral-8x7B-Instruct-v0.1'
    ],
    fireworks: [
      'accounts/fireworks/models/llama-v2-70b-chat'
    ],
    local: [],
    custom: []
  },
  loading: false,
  error: null,
  lastHealthCheck: null,
};

const modelsSlice = createSlice({
  name: 'models',
  initialState,
  reducers: {
    fetchModelStatusStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchModelStatusSuccess: (state, action: PayloadAction<ModelStatus[]>) => {
      state.loading = false;
      state.modelStatuses = action.payload;
      state.lastHealthCheck = Date.now();
      state.error = null;
    },
    fetchModelStatusFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateModelStatus: (state, action: PayloadAction<ModelStatus>) => {
      const index = state.modelStatuses.findIndex(
        m => m.provider === action.payload.provider && m.model === action.payload.model
      );
      if (index !== -1) {
        state.modelStatuses[index] = action.payload;
      } else {
        state.modelStatuses.push(action.payload);
      }
    },
    setAvailableModels: (state, action: PayloadAction<Record<ModelProvider, string[]>>) => {
      state.availableModels = action.payload;
    },
    addCustomModel: (state, action: PayloadAction<string>) => {
      if (!state.availableModels.custom.includes(action.payload)) {
        state.availableModels.custom.push(action.payload);
      }
    },
    removeCustomModel: (state, action: PayloadAction<string>) => {
      state.availableModels.custom = state.availableModels.custom.filter(
        model => model !== action.payload
      );
    },
    clearModelStatuses: (state) => {
      state.modelStatuses = [];
      state.lastHealthCheck = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchModelStatusStart,
  fetchModelStatusSuccess,
  fetchModelStatusFailure,
  updateModelStatus,
  setAvailableModels,
  addCustomModel,
  removeCustomModel,
  clearModelStatuses,
  clearError,
} = modelsSlice.actions;

export default modelsSlice.reducer;