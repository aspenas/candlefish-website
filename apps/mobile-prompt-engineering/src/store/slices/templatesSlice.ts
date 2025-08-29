import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PromptTemplate } from '@candlefish/prompt-engineering/types';

interface TemplatesState {
  templates: PromptTemplate[];
  recentTemplates: PromptTemplate[];
  popularTemplates: PromptTemplate[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: TemplatesState = {
  templates: [],
  recentTemplates: [],
  popularTemplates: [],
  loading: false,
  error: null,
  lastFetch: null,
};

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    fetchTemplatesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchTemplatesSuccess: (state, action: PayloadAction<PromptTemplate[]>) => {
      state.loading = false;
      state.templates = action.payload;
      state.lastFetch = Date.now();
      state.error = null;
    },
    fetchTemplatesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addTemplate: (state, action: PayloadAction<PromptTemplate>) => {
      state.templates.push(action.payload);
    },
    updateTemplate: (state, action: PayloadAction<PromptTemplate>) => {
      const index = state.templates.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.templates[index] = action.payload;
      }
    },
    deleteTemplate: (state, action: PayloadAction<string>) => {
      state.templates = state.templates.filter(t => t.id !== action.payload);
      state.recentTemplates = state.recentTemplates.filter(t => t.id !== action.payload);
      state.popularTemplates = state.popularTemplates.filter(t => t.id !== action.payload);
    },
    setRecentTemplates: (state, action: PayloadAction<PromptTemplate[]>) => {
      state.recentTemplates = action.payload;
    },
    setPopularTemplates: (state, action: PayloadAction<PromptTemplate[]>) => {
      state.popularTemplates = action.payload;
    },
    addToRecent: (state, action: PayloadAction<PromptTemplate>) => {
      const existing = state.recentTemplates.findIndex(t => t.id === action.payload.id);
      if (existing !== -1) {
        state.recentTemplates.splice(existing, 1);
      }
      state.recentTemplates.unshift(action.payload);
      // Keep only the 10 most recent
      state.recentTemplates = state.recentTemplates.slice(0, 10);
    },
    incrementUsage: (state, action: PayloadAction<string>) => {
      const template = state.templates.find(t => t.id === action.payload);
      if (template) {
        template.metadata.usageCount = (template.metadata.usageCount || 0) + 1;
        template.updatedAt = new Date();
      }
    },
    clearTemplates: (state) => {
      state.templates = [];
      state.recentTemplates = [];
      state.popularTemplates = [];
      state.lastFetch = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchTemplatesStart,
  fetchTemplatesSuccess,
  fetchTemplatesFailure,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  setRecentTemplates,
  setPopularTemplates,
  addToRecent,
  incrementUsage,
  clearTemplates,
  clearError,
} = templatesSlice.actions;

export default templatesSlice.reducer;