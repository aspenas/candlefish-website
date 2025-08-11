export interface BaseComponent {
  className?: string
  children?: React.ReactNode
}

export interface Organization {
  id: string
  name: string
  slug: string
  logo?: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  organizationId: string
  role: 'admin' | 'member' | 'viewer'
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  organizationId: string
  status: 'active' | 'archived' | 'draft'
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
  errors?: string[]
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: PaginationMeta
}

export type Size = 'sm' | 'md' | 'lg' | 'xl'
export type Variant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost'
export type Status = 'idle' | 'loading' | 'success' | 'error'

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio'
  required?: boolean
  placeholder?: string
  options?: Array<{ label: string; value: string }>
  validation?: {
    min?: number
    max?: number
    pattern?: RegExp
    custom?: (value: any) => string | null
  }
}

export interface NotificationItem {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
  timestamp: Date
}
