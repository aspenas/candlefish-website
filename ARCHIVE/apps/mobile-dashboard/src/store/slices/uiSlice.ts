import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Theme } from '@/types/graphql';

interface UIState {
  theme: Theme;
  colorScheme: 'light' | 'dark';
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
  statusBarHeight: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  activeModal: string | null;
  showSidebar: boolean;
  sidebarWidth: number;
  refreshing: boolean;
  toasts: Toast[];
  bottomSheetVisible: boolean;
  keyboardVisible: boolean;
  keyboardHeight: number;
  hapticFeedbackEnabled: boolean;
  animationsEnabled: boolean;
  pullToRefreshEnabled: boolean;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration: number;
  timestamp: number;
}

const initialState: UIState = {
  theme: Theme.AUTO,
  colorScheme: 'light',
  isTablet: false,
  orientation: 'portrait',
  statusBarHeight: 0,
  safeAreaInsets: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  activeModal: null,
  showSidebar: false,
  sidebarWidth: 280,
  refreshing: false,
  toasts: [],
  bottomSheetVisible: false,
  keyboardVisible: false,
  keyboardHeight: 0,
  hapticFeedbackEnabled: true,
  animationsEnabled: true,
  pullToRefreshEnabled: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
    setColorScheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.colorScheme = action.payload;
    },
    setIsTablet: (state, action: PayloadAction<boolean>) => {
      state.isTablet = action.payload;
    },
    setOrientation: (state, action: PayloadAction<'portrait' | 'landscape'>) => {
      state.orientation = action.payload;
    },
    setStatusBarHeight: (state, action: PayloadAction<number>) => {
      state.statusBarHeight = action.payload;
    },
    setSafeAreaInsets: (state, action: PayloadAction<{
      top: number;
      bottom: number;
      left: number;
      right: number;
    }>) => {
      state.safeAreaInsets = action.payload;
    },
    showModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },
    hideModal: (state) => {
      state.activeModal = null;
    },
    toggleSidebar: (state) => {
      state.showSidebar = !state.showSidebar;
    },
    setSidebarVisible: (state, action: PayloadAction<boolean>) => {
      state.showSidebar = action.payload;
    },
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.sidebarWidth = action.payload;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },
    showToast: (state, action: PayloadAction<Omit<Toast, 'id' | 'timestamp'>>) => {
      const toast: Toast = {
        ...action.payload,
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      state.toasts.push(toast);

      // Keep only the latest 5 toasts
      if (state.toasts.length > 5) {
        state.toasts = state.toasts.slice(-5);
      }
    },
    hideToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    clearAllToasts: (state) => {
      state.toasts = [];
    },
    setBottomSheetVisible: (state, action: PayloadAction<boolean>) => {
      state.bottomSheetVisible = action.payload;
    },
    setKeyboardVisible: (state, action: PayloadAction<boolean>) => {
      state.keyboardVisible = action.payload;
    },
    setKeyboardHeight: (state, action: PayloadAction<number>) => {
      state.keyboardHeight = action.payload;
    },
    setHapticFeedbackEnabled: (state, action: PayloadAction<boolean>) => {
      state.hapticFeedbackEnabled = action.payload;
    },
    setAnimationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.animationsEnabled = action.payload;
    },
    setPullToRefreshEnabled: (state, action: PayloadAction<boolean>) => {
      state.pullToRefreshEnabled = action.payload;
    },
  },
});

export const {
  setTheme,
  setColorScheme,
  setIsTablet,
  setOrientation,
  setStatusBarHeight,
  setSafeAreaInsets,
  showModal,
  hideModal,
  toggleSidebar,
  setSidebarVisible,
  setSidebarWidth,
  setRefreshing,
  showToast,
  hideToast,
  clearAllToasts,
  setBottomSheetVisible,
  setKeyboardVisible,
  setKeyboardHeight,
  setHapticFeedbackEnabled,
  setAnimationsEnabled,
  setPullToRefreshEnabled,
} = uiSlice.actions;

export default uiSlice.reducer;
export type { Toast };
