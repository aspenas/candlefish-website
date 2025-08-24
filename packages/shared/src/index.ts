// UI Components
export * from './components/ui/button'
export * from './components/ui/card'
export * from './components/ui/input'
export * from './components/ui/badge'
export * from './components/ui/spinner'
export * from './components/ui/toast'
export * from './components/ui/dropdown-menu'
export * from './components/ui/dialog'

// Layout Components
export * from './components/layout/Navigation'
export * from './components/layout/Footer'

// Content Components
export * from './components/content/CodeBlock'
export * from './components/search/SearchDialog'

// Utilities
export * from './lib/utils'
export * from './lib/apollo-client'

// Re-export commonly used types from dependencies
export type { ButtonProps } from './components/ui/button'
export type { BadgeProps } from './components/ui/badge'
export type { SpinnerProps } from './components/ui/spinner'
export type { ToastProps, ToastActionElement } from './components/ui/toast'
export type {
  DropdownMenuProps,
  DropdownTriggerProps,
  DropdownContentProps,
  DropdownItemProps
} from './components/ui/dropdown-menu'
export type { DialogProps, DialogContentProps } from './components/ui/dialog'
