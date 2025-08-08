import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface Modal {
  id: string
  component: React.ComponentType<any>
  props?: any
  backdrop?: boolean
  closeOnEscape?: boolean
}

export interface Sidebar {
  id: string
  component: React.ComponentType<any>
  props?: any
  position: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark' | 'auto'
  sidebarCollapsed: boolean
  compactMode: boolean

  // Layout
  layout: 'grid' | 'fluid' | 'masonry'
  gridSize: 'sm' | 'md' | 'lg'

  // Notifications
  toasts: Toast[]

  // Modals and overlays
  modals: Modal[]
  sidebars: Sidebar[]

  // Loading states
  globalLoading: boolean
  loadingStates: Record<string, boolean>

  // Command palette
  commandPaletteOpen: boolean

  // Search
  searchQuery: string
  searchResults: any[]
  searchLoading: boolean

  // Accessibility
  highContrast: boolean
  reducedMotion: boolean
  screenReaderAnnouncements: string[]

  // Performance
  performanceMetrics: {
    renderTime?: number
    queryTime?: number
    cacheHitRate?: number
  }

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCompactMode: (compact: boolean) => void
  setLayout: (layout: 'grid' | 'fluid' | 'masonry') => void
  setGridSize: (size: 'sm' | 'md' | 'lg') => void

  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void

  // Modal actions
  openModal: (modal: Omit<Modal, 'id'>) => string
  closeModal: (id: string) => void
  closeAllModals: () => void

  // Sidebar actions
  openSidebar: (sidebar: Omit<Sidebar, 'id'>) => string
  closeSidebar: (id: string) => void
  closeAllSidebars: () => void

  // Loading actions
  setGlobalLoading: (loading: boolean) => void
  setLoading: (key: string, loading: boolean) => void

  // Command palette actions
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void

  // Search actions
  setSearchQuery: (query: string) => void
  setSearchResults: (results: any[]) => void
  setSearchLoading: (loading: boolean) => void
  clearSearch: () => void

  // Accessibility actions
  setHighContrast: (highContrast: boolean) => void
  setReducedMotion: (reducedMotion: boolean) => void
  announceToScreenReader: (message: string) => void
  clearAnnouncements: () => void

  // Performance actions
  updatePerformanceMetrics: (metrics: Partial<UIState['performanceMetrics']>) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'auto',
      sidebarCollapsed: false,
      compactMode: false,
      layout: 'grid',
      gridSize: 'md',
      toasts: [],
      modals: [],
      sidebars: [],
      globalLoading: false,
      loadingStates: {},
      commandPaletteOpen: false,
      searchQuery: '',
      searchResults: [],
      searchLoading: false,
      highContrast: false,
      reducedMotion: false,
      screenReaderAnnouncements: [],
      performanceMetrics: {},

      // Theme and layout actions
      setTheme: (theme) => {
        set({ theme })

        // Apply theme to document
        const root = document.documentElement
        if (theme === 'auto') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.className = prefersDark ? 'dark' : 'light'
        } else {
          root.className = theme
        }
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed })
      },

      setCompactMode: (compact) => {
        set({ compactMode: compact })
      },

      setLayout: (layout) => {
        set({ layout })
      },

      setGridSize: (size) => {
        set({ gridSize: size })
      },

      // Toast actions
      addToast: (toast) => {
        const id = crypto.randomUUID()
        const fullToast: Toast = {
          ...toast,
          id,
          duration: toast.duration ?? 5000,
        }

        set((state) => ({
          toasts: [...state.toasts, fullToast],
        }))

        // Auto-remove toast after duration
        if (fullToast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id)
          }, fullToast.duration)
        }

        return id
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        }))
      },

      clearToasts: () => {
        set({ toasts: [] })
      },

      // Modal actions
      openModal: (modal) => {
        const id = crypto.randomUUID()
        const fullModal: Modal = {
          ...modal,
          id,
          backdrop: modal.backdrop ?? true,
          closeOnEscape: modal.closeOnEscape ?? true,
        }

        set((state) => ({
          modals: [...state.modals, fullModal],
        }))

        return id
      },

      closeModal: (id) => {
        set((state) => ({
          modals: state.modals.filter((modal) => modal.id !== id),
        }))
      },

      closeAllModals: () => {
        set({ modals: [] })
      },

      // Sidebar actions
      openSidebar: (sidebar) => {
        const id = crypto.randomUUID()
        const fullSidebar: Sidebar = {
          ...sidebar,
          id,
          size: sidebar.size ?? 'md',
        }

        set((state) => ({
          sidebars: [...state.sidebars, fullSidebar],
        }))

        return id
      },

      closeSidebar: (id) => {
        set((state) => ({
          sidebars: state.sidebars.filter((sidebar) => sidebar.id !== id),
        }))
      },

      closeAllSidebars: () => {
        set({ sidebars: [] })
      },

      // Loading actions
      setGlobalLoading: (loading) => {
        set({ globalLoading: loading })
      },

      setLoading: (key, loading) => {
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: loading,
          },
        }))
      },

      // Command palette actions
      setCommandPaletteOpen: (open) => {
        set({ commandPaletteOpen: open })
      },

      toggleCommandPalette: () => {
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }))
      },

      // Search actions
      setSearchQuery: (query) => {
        set({ searchQuery: query })
      },

      setSearchResults: (results) => {
        set({ searchResults: results })
      },

      setSearchLoading: (loading) => {
        set({ searchLoading: loading })
      },

      clearSearch: () => {
        set({
          searchQuery: '',
          searchResults: [],
          searchLoading: false,
        })
      },

      // Accessibility actions
      setHighContrast: (highContrast) => {
        set({ highContrast })

        // Apply high contrast to document
        document.documentElement.style.setProperty(
          '--contrast-multiplier',
          highContrast ? '1.2' : '1'
        )
      },

      setReducedMotion: (reducedMotion) => {
        set({ reducedMotion })

        // Apply reduced motion to document
        document.documentElement.style.setProperty(
          '--animation-duration',
          reducedMotion ? '0.01ms' : '200ms'
        )
      },

      announceToScreenReader: (message) => {
        set((state) => ({
          screenReaderAnnouncements: [...state.screenReaderAnnouncements, message],
        }))

        // Clear announcement after a delay to avoid spam
        setTimeout(() => {
          set((state) => ({
            screenReaderAnnouncements: state.screenReaderAnnouncements.slice(1),
          }))
        }, 3000)
      },

      clearAnnouncements: () => {
        set({ screenReaderAnnouncements: [] })
      },

      // Performance actions
      updatePerformanceMetrics: (metrics) => {
        set((state) => ({
          performanceMetrics: {
            ...state.performanceMetrics,
            ...metrics,
          },
        }))
      },
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user preferences
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        compactMode: state.compactMode,
        layout: state.layout,
        gridSize: state.gridSize,
        highContrast: state.highContrast,
        reducedMotion: state.reducedMotion,
      }),
    }
  )
)

// Initialize theme on load
if (typeof window !== 'undefined') {
  const { theme } = useUIStore.getState()
  const root = document.documentElement

  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.className = prefersDark ? 'dark' : 'light'
  } else {
    root.className = theme
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { theme } = useUIStore.getState()
    if (theme === 'auto') {
      root.className = e.matches ? 'dark' : 'light'
    }
  })

  // Listen for reduced motion preference
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (reducedMotionQuery.matches) {
    useUIStore.getState().setReducedMotion(true)
  }
  reducedMotionQuery.addEventListener('change', (e) => {
    useUIStore.getState().setReducedMotion(e.matches)
  })
}
