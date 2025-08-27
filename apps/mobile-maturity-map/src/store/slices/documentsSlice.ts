import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Document, OfflineDocument, DocumentType, ProcessingStage } from '@/types/assessment';
import { RootState } from '../index';
import { addToSyncQueue } from './syncSlice';
import { FileSystemService } from '@/services/fileSystem';

interface DocumentsState {
  documents: Document[];
  offlineDocuments: OfflineDocument[];
  loading: boolean;
  error: string | null;
  uploadProgress: Record<string, number>;
}

const initialState: DocumentsState = {
  documents: [],
  offlineDocuments: [],
  loading: false,
  error: null,
  uploadProgress: {},
};

export const uploadDocument = createAsyncThunk(
  'documents/upload',
  async (
    {
      uri,
      filename,
      assessmentId,
      type,
    }: {
      uri: string;
      filename: string;
      assessmentId: string;
      type?: DocumentType;
    },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get file info
      const fileInfo = await FileSystemService.getFileInfo(uri);
      
      // Save file locally
      const localUri = await FileSystemService.saveFile(uri, filename);
      
      // Create offline document
      const offlineDocument: OfflineDocument = {
        tempId,
        filename,
        originalName: filename,
        mimeType: fileInfo.mimeType || 'application/octet-stream',
        size: fileInfo.size,
        type: type || getDocumentTypeFromMimeType(fileInfo.mimeType),
        status: ProcessingStage.UPLOAD,
        processingProgress: 0,
        extractedText: '',
        metadata: {},
        annotations: [],
        aiSummary: '',
        keyInsights: [],
        topics: [],
        assessment: {} as any, // Will be populated when synced
        assessmentId,
        localUri,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false,
        uploadQueued: true,
      };

      // Add to sync queue if online
      if (state.network.isOnline) {
        dispatch(addToSyncQueue({
          type: 'document',
          action: 'create',
          data: {
            ...offlineDocument,
            file: {
              uri: localUri,
              name: filename,
              type: fileInfo.mimeType,
            },
          },
        }));
      }

      return offlineDocument;
    } catch (error) {
      console.error('Document upload error:', error);
      throw new Error(error instanceof Error ? error.message : 'Upload failed');
    }
  }
);

export const processDocument = createAsyncThunk(
  'documents/process',
  async (documentId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    
    // Find document
    const document = state.documents.documents.find(d => d.id === documentId) ||
                   state.documents.offlineDocuments.find(d => d.tempId === documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    // Simulate processing stages
    const stages = [
      ProcessingStage.PARSING,
      ProcessingStage.ANALYSIS,
      ProcessingStage.EXTRACTION,
      ProcessingStage.VALIDATION,
      ProcessingStage.COMPLETION,
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const progress = (i + 1) / stages.length;

      dispatch(updateDocumentProgress({
        documentId,
        status: stage,
        progress,
      }));

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return documentId;
  }
);

function getDocumentTypeFromMimeType(mimeType?: string): DocumentType {
  if (!mimeType) return DocumentType.TEXT;
  
  if (mimeType.startsWith('image/')) return DocumentType.IMAGE;
  if (mimeType.includes('pdf')) return DocumentType.PDF;
  if (mimeType.includes('word') || mimeType.includes('document')) return DocumentType.WORD;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return DocumentType.EXCEL;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return DocumentType.PRESENTATION;
  if (mimeType.startsWith('text/')) return DocumentType.TEXT;
  if (mimeType.startsWith('video/')) return DocumentType.VIDEO;
  if (mimeType.startsWith('audio/')) return DocumentType.AUDIO;
  
  return DocumentType.TEXT;
}

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setDocuments: (state, action: PayloadAction<Document[]>) => {
      state.documents = action.payload;
    },
    
    updateDocument: (state, action: PayloadAction<Partial<Document> & { id: string }>) => {
      const index = state.documents.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.documents[index] = {
          ...state.documents[index],
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    
    updateOfflineDocument: (state, action: PayloadAction<Partial<OfflineDocument> & { tempId: string }>) => {
      const index = state.offlineDocuments.findIndex(d => d.tempId === action.payload.tempId);
      if (index !== -1) {
        state.offlineDocuments[index] = {
          ...state.offlineDocuments[index],
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    
    updateDocumentProgress: (state, action: PayloadAction<{
      documentId: string;
      status: ProcessingStage;
      progress: number;
    }>) => {
      const { documentId, status, progress } = action.payload;
      
      // Update online document
      const onlineIndex = state.documents.findIndex(d => d.id === documentId);
      if (onlineIndex !== -1) {
        state.documents[onlineIndex].status = status;
        state.documents[onlineIndex].processingProgress = progress;
        state.documents[onlineIndex].updatedAt = new Date().toISOString();
      }
      
      // Update offline document
      const offlineIndex = state.offlineDocuments.findIndex(d => d.tempId === documentId);
      if (offlineIndex !== -1) {
        state.offlineDocuments[offlineIndex].status = status;
        state.offlineDocuments[offlineIndex].processingProgress = progress;
        state.offlineDocuments[offlineIndex].updatedAt = new Date().toISOString();
      }
    },
    
    setUploadProgress: (state, action: PayloadAction<{ documentId: string; progress: number }>) => {
      const { documentId, progress } = action.payload;
      state.uploadProgress[documentId] = progress;
    },
    
    removeUploadProgress: (state, action: PayloadAction<string>) => {
      delete state.uploadProgress[action.payload];
    },
    
    markDocumentSynced: (state, action: PayloadAction<string>) => {
      const offlineIndex = state.offlineDocuments.findIndex(d => d.tempId === action.payload);
      if (offlineIndex !== -1) {
        // Remove from offline documents when synced
        state.offlineDocuments.splice(offlineIndex, 1);
      }
    },
    
    removeOfflineDocument: (state, action: PayloadAction<string>) => {
      state.offlineDocuments = state.offlineDocuments.filter(d => d.tempId !== action.payload);
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
      .addCase(uploadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.offlineDocuments.push(action.payload);
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Upload failed';
      })
      .addCase(processDocument.fulfilled, (state, action) => {
        // Document processing completed
        const documentId = action.payload;
        console.log(`Document ${documentId} processing completed`);
      });
  },
});

export const {
  setDocuments,
  updateDocument,
  updateOfflineDocument,
  updateDocumentProgress,
  setUploadProgress,
  removeUploadProgress,
  markDocumentSynced,
  removeOfflineDocument,
  setLoading,
  setError,
  clearError,
} = documentsSlice.actions;

export default documentsSlice.reducer;

// Selectors
export const selectAllDocuments = (state: RootState) => [
  ...state.documents.documents,
  ...state.documents.offlineDocuments,
];

export const selectDocumentById = (id: string) => (state: RootState) =>
  state.documents.documents.find(d => d.id === id) ||
  state.documents.offlineDocuments.find(d => d.tempId === id);

export const selectOfflineDocuments = (state: RootState) =>
  state.documents.offlineDocuments;

export const selectUploadProgress = (documentId: string) => (state: RootState) =>
  state.documents.uploadProgress[documentId] || 0;

export const selectDocumentsLoading = (state: RootState) =>
  state.documents.loading;

export const selectDocumentsError = (state: RootState) =>
  state.documents.error;