import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useOfflineStore } from './useOfflineStore';
import { v4 as uuidv4 } from 'uuid';

interface EstimateStore {
  estimate: any;
  isOfflineMode: boolean;
  lastSavedAt: Date | null;
  updateClientInfo: (info: any) => void;
  updateExteriorInfo: (info: any) => void;
  updateInteriorInfo: (info: any) => void;
  markStepCompleted: (step: string) => void;
  updateEstimate: (data: any) => void;
  saveEstimate: () => Promise<void>;
  loadEstimate: (estimateId: string) => Promise<void>;
  clearEstimate: () => void;
  setOfflineMode: (offline: boolean) => void;
}

export const useEstimateStore = create<EstimateStore>()(
  persist(
    (set, get) => ({
      estimate: {
        id: null,
        clientInfo: {},
        measurements: {
          exterior: {},
          interior: {}
        },
        pricing: {},
        stepsCompleted: [],
        createdAt: null,
        updatedAt: null,
        syncStatus: 'pending'
      },
      isOfflineMode: false,
      lastSavedAt: null,

      updateClientInfo: (info) => {
        const estimate = {
          ...get().estimate,
          clientInfo: info,
          updatedAt: new Date().toISOString()
        };

        set({ estimate });

        // Auto-save after client info updates
        setTimeout(() => get().saveEstimate(), 500);
      },

      updateExteriorInfo: (info) => {
        const estimate = {
          ...get().estimate,
          measurements: {
            ...get().estimate.measurements,
            exterior: info
          },
          updatedAt: new Date().toISOString()
        };

        set({ estimate });

        // Auto-save after exterior info updates
        setTimeout(() => get().saveEstimate(), 500);
      },

      updateInteriorInfo: (info) => {
        const estimate = {
          ...get().estimate,
          measurements: {
            ...get().estimate.measurements,
            interior: info
          },
          updatedAt: new Date().toISOString()
        };

        set({ estimate });

        // Auto-save after interior info updates
        setTimeout(() => get().saveEstimate(), 500);
      },

      markStepCompleted: (step) => {
        const estimate = {
          ...get().estimate,
          stepsCompleted: [...get().estimate.stepsCompleted, step],
          updatedAt: new Date().toISOString()
        };

        set({ estimate });

        // Auto-save after step completion
        setTimeout(() => get().saveEstimate(), 500);
      },

      updateEstimate: (data) => {
        const estimate = {
          ...get().estimate,
          ...data,
          updatedAt: new Date().toISOString()
        };

        set({ estimate });

        // Auto-save after estimate updates
        setTimeout(() => get().saveEstimate(), 1000);
      },

      saveEstimate: async () => {
        try {
          const state = get();
          let { estimate } = state;

          // Generate ID if new estimate
          if (!estimate.id) {
            estimate = {
              ...estimate,
              id: uuidv4(),
              createdAt: new Date().toISOString()
            };
            set({ estimate });
          }

          // Check if we're offline or in offline mode
          const offlineStore = useOfflineStore.getState();
          const shouldSaveOffline = !offlineStore.networkStatus.isOnline || state.isOfflineMode;

          if (shouldSaveOffline) {
            // Save to IndexedDB for offline use
            await offlineStore.saveEstimateOffline(estimate.id, estimate);
            console.log('Estimate saved offline');
          } else {
            // Try to save to server
            try {
              const response = await fetch('/api/estimates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(estimate)
              });

              if (response.ok) {
                const savedEstimate = await response.json();
                set({
                  estimate: { ...savedEstimate, syncStatus: 'synced' },
                  lastSavedAt: new Date()
                });
                console.log('Estimate saved to server');
              } else {
                console.warn(`Server save failed with status ${response.status}`);
                // Server save failed, try offline backup
                try {
                  await offlineStore.saveEstimateOffline(estimate.id, estimate);
                  console.log('Server save failed, saved offline as backup');
                } catch (offlineError) {
                  console.error('Both server and offline save failed:', offlineError);
                }
              }
            } catch (error) {
              console.warn('Network error during server save:', error);
              // Network error, try offline save
              try {
                await offlineStore.saveEstimateOffline(estimate.id, estimate);
                console.log('Network error, saved offline');
              } catch (offlineError) {
                console.error('Offline save also failed:', offlineError);
                // Continue execution - don't block the UI
              }
            }
          }

          set({ lastSavedAt: new Date() });
        } catch (error) {
          console.error('Failed to save estimate:', error);
        }
      },

      loadEstimate: async (estimateId: string) => {
        try {
          const offlineStore = useOfflineStore.getState();

          // Try to load from server first if online
          if (offlineStore.networkStatus.isOnline && !get().isOfflineMode) {
            try {
              const response = await fetch(`/api/estimates/${estimateId}`);
              if (response.ok) {
                const estimate = await response.json();
                set({
                  estimate: { ...estimate, syncStatus: 'synced' },
                  lastSavedAt: new Date()
                });
                return;
              }
            } catch (error) {
              console.log('Server load failed, trying offline...');
            }
          }

          // Load from offline storage
          const offlineDB = await import('@/lib/db/offline-db');
          const offlineEstimate = await offlineDB.offlineDB.getEstimate(estimateId);

          if (offlineEstimate) {
            set({
              estimate: { ...offlineEstimate.data, syncStatus: offlineEstimate.syncStatus },
              lastSavedAt: offlineEstimate.updatedAt
            });
          }
        } catch (error) {
          console.error('Failed to load estimate:', error);
        }
      },

      clearEstimate: () => {
        set({
          estimate: {
            id: null,
            clientInfo: {},
            measurements: {
              exterior: {},
              interior: {}
            },
            pricing: {},
            stepsCompleted: [],
            createdAt: null,
            updatedAt: null,
            syncStatus: 'pending'
          },
          lastSavedAt: null
        });
      },

      setOfflineMode: (offline) => {
        set({ isOfflineMode: offline });
      }
    }),
    {
      name: 'paintbox-estimate-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        estimate: state.estimate,
        lastSavedAt: state.lastSavedAt,
        isOfflineMode: state.isOfflineMode
      }),
      skipHydration: typeof window === 'undefined', // Prevent SSR hydration issues
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Estimate store rehydrated successfully');
        }
      }
    }
  )
);
