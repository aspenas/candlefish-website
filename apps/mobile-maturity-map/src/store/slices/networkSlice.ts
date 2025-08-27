import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NetworkState {
  isOnline: boolean;
  connectionType: string | null;
  isConnected: boolean;
  lastOnline: string | null;
}

const initialState: NetworkState = {
  isOnline: true,
  connectionType: null,
  isConnected: true,
  lastOnline: new Date().toISOString(),
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      const wasOnline = state.isOnline;
      state.isOnline = action.payload;
      state.isConnected = action.payload;
      
      if (action.payload) {
        state.lastOnline = new Date().toISOString();
      }
      
      // Log network state changes
      if (wasOnline !== action.payload) {
        console.log(`Network status changed: ${action.payload ? 'Online' : 'Offline'}`);
      }
    },
    
    setConnectionType: (state, action: PayloadAction<string>) => {
      state.connectionType = action.payload;
    },
  },
});

export const { setOnlineStatus, setConnectionType } = networkSlice.actions;

export default networkSlice.reducer;