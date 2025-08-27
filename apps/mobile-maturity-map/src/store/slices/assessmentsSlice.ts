import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Assessment, AssessmentStatus, OfflineAssessment } from '@/types/assessment';
import { RootState } from '../index';
import { addToSyncQueue } from './syncSlice';

interface AssessmentsState {
  assessments: Assessment[];
  offlineAssessments: OfflineAssessment[];
  currentAssessment: Assessment | null;
  loading: boolean;
  error: string | null;
}

const initialState: AssessmentsState = {
  assessments: [],
  offlineAssessments: [],
  currentAssessment: null,
  loading: false,
  error: null,
};

// Async thunks
export const createOfflineAssessment = createAsyncThunk(
  'assessments/createOffline',
  async (assessmentData: Partial<Assessment>, { dispatch, getState }) => {
    const state = getState() as RootState;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineAssessment: OfflineAssessment = {
      tempId,
      title: assessmentData.title || 'New Assessment',
      description: assessmentData.description,
      status: AssessmentStatus.PENDING,
      progress: 0,
      assessmentType: assessmentData.assessmentType || 'standard',
      industry: assessmentData.industry || 'TECHNOLOGY',
      complexity: assessmentData.complexity || 5,
      estimatedDuration: assessmentData.estimatedDuration || 30,
      operator: state.auth.user as any,
      operatorId: state.auth.user?.id || '',
      documents: [],
      responses: [],
      reports: [],
      recommendations: [],
      benchmarks: [],
      nextSteps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: state.auth.user?.id || '',
      updatedBy: state.auth.user?.id || '',
      version: 1,
      synced: false,
      lastModified: new Date().toISOString(),
    };

    // Add to sync queue if online
    if (state.network.isOnline) {
      dispatch(addToSyncQueue({
        type: 'assessment',
        action: 'create',
        data: offlineAssessment,
      }));
    }

    return offlineAssessment;
  }
);

export const updateAssessmentProgress = createAsyncThunk(
  'assessments/updateProgress',
  async (
    { assessmentId, progress }: { assessmentId: string; progress: number },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    
    // Add to sync queue if online
    if (state.network.isOnline) {
      dispatch(addToSyncQueue({
        type: 'assessment',
        action: 'update',
        data: { assessmentId, progress, updatedAt: new Date().toISOString() },
      }));
    }

    return { assessmentId, progress };
  }
);

export const submitAssessmentResponse = createAsyncThunk(
  'assessments/submitResponse',
  async (
    {
      assessmentId,
      questionId,
      response,
      confidence,
    }: {
      assessmentId: string;
      questionId: string;
      response: any;
      confidence: number;
    },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    const responseData = {
      assessmentId,
      questionId,
      response,
      confidence,
      timestamp: new Date().toISOString(),
    };

    // Add to sync queue
    if (state.network.isOnline) {
      dispatch(addToSyncQueue({
        type: 'response',
        action: 'create',
        data: responseData,
      }));
    }

    return responseData;
  }
);

const assessmentsSlice = createSlice({
  name: 'assessments',
  initialState,
  reducers: {
    setAssessments: (state, action: PayloadAction<Assessment[]>) => {
      state.assessments = action.payload;
    },
    
    setCurrentAssessment: (state, action: PayloadAction<Assessment | null>) => {
      state.currentAssessment = action.payload;
    },
    
    updateAssessment: (state, action: PayloadAction<Partial<Assessment> & { id: string }>) => {
      const index = state.assessments.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.assessments[index] = {
          ...state.assessments[index],
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    
    updateOfflineAssessment: (state, action: PayloadAction<Partial<OfflineAssessment> & { tempId: string }>) => {
      const index = state.offlineAssessments.findIndex(a => a.tempId === action.payload.tempId);
      if (index !== -1) {
        state.offlineAssessments[index] = {
          ...state.offlineAssessments[index],
          ...action.payload,
          lastModified: new Date().toISOString(),
        };
      }
    },
    
    markAssessmentSynced: (state, action: PayloadAction<string>) => {
      const offlineIndex = state.offlineAssessments.findIndex(a => a.tempId === action.payload);
      if (offlineIndex !== -1) {
        const offlineAssessment = state.offlineAssessments[offlineIndex];
        // Move from offline to online assessments
        state.offlineAssessments.splice(offlineIndex, 1);
        // In real implementation, this would be replaced by server data
      }
    },
    
    removeOfflineAssessment: (state, action: PayloadAction<string>) => {
      state.offlineAssessments = state.offlineAssessments.filter(a => a.tempId !== action.payload);
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(createOfflineAssessment.fulfilled, (state, action) => {
        state.offlineAssessments.push(action.payload);
      })
      .addCase(updateAssessmentProgress.fulfilled, (state, action) => {
        const { assessmentId, progress } = action.payload;
        
        // Update online assessment
        const onlineIndex = state.assessments.findIndex(a => a.id === assessmentId);
        if (onlineIndex !== -1) {
          state.assessments[onlineIndex].progress = progress;
          state.assessments[onlineIndex].updatedAt = new Date().toISOString();
        }
        
        // Update offline assessment
        const offlineIndex = state.offlineAssessments.findIndex(a => a.tempId === assessmentId);
        if (offlineIndex !== -1) {
          state.offlineAssessments[offlineIndex].progress = progress;
          state.offlineAssessments[offlineIndex].lastModified = new Date().toISOString();
        }
      })
      .addCase(submitAssessmentResponse.fulfilled, (state, action) => {
        const { assessmentId, questionId, response, confidence, timestamp } = action.payload;
        
        // Update online assessment responses
        const onlineIndex = state.assessments.findIndex(a => a.id === assessmentId);
        if (onlineIndex !== -1) {
          const existingResponseIndex = state.assessments[onlineIndex].responses.findIndex(
            r => r.questionId === questionId
          );
          
          if (existingResponseIndex !== -1) {
            state.assessments[onlineIndex].responses[existingResponseIndex] = {
              questionId,
              response,
              confidence,
              timestamp,
            };
          } else {
            state.assessments[onlineIndex].responses.push({
              questionId,
              response,
              confidence,
              timestamp,
            });
          }
          
          state.assessments[onlineIndex].updatedAt = timestamp;
        }
        
        // Update offline assessment responses
        const offlineIndex = state.offlineAssessments.findIndex(a => a.tempId === assessmentId);
        if (offlineIndex !== -1) {
          const existingResponseIndex = state.offlineAssessments[offlineIndex].responses.findIndex(
            r => r.questionId === questionId
          );
          
          if (existingResponseIndex !== -1) {
            state.offlineAssessments[offlineIndex].responses[existingResponseIndex] = {
              questionId,
              response,
              confidence,
              timestamp,
            };
          } else {
            state.offlineAssessments[offlineIndex].responses.push({
              questionId,
              response,
              confidence,
              timestamp,
            });
          }
          
          state.offlineAssessments[offlineIndex].lastModified = timestamp;
        }
      });
  },
});

export const {
  setAssessments,
  setCurrentAssessment,
  updateAssessment,
  updateOfflineAssessment,
  markAssessmentSynced,
  removeOfflineAssessment,
  setLoading,
  setError,
  clearError,
} = assessmentsSlice.actions;

export default assessmentsSlice.reducer;

// Selectors
export const selectAllAssessments = (state: RootState) => [
  ...state.assessments.assessments,
  ...state.assessments.offlineAssessments,
];

export const selectAssessmentById = (id: string) => (state: RootState) =>
  state.assessments.assessments.find(a => a.id === id) ||
  state.assessments.offlineAssessments.find(a => a.tempId === id);

export const selectOfflineAssessments = (state: RootState) =>
  state.assessments.offlineAssessments;

export const selectAssessmentsLoading = (state: RootState) =>
  state.assessments.loading;

export const selectAssessmentsError = (state: RootState) =>
  state.assessments.error;