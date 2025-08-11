import { create } from 'zustand'

interface UIState {
  isSidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  isCommandPaletteOpen: boolean

  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  theme: 'system',
  isCommandPaletteOpen: false,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  setTheme: (theme) => set({ theme }),

  toggleCommandPalette: () => set((state) => ({
    isCommandPaletteOpen: !state.isCommandPaletteOpen
  })),

  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
}))
