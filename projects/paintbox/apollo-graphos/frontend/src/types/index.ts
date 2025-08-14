// Base types for the application
export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  status: CustomerStatus
  salesforceId?: string
  lastSyncAt?: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  customerId: string
  name: string
  description?: string
  status: ProjectStatus
  companyCamPhotos: ProjectPhoto[]
  timeline: ProjectTimelineEntry[]
  estimateId?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectPhoto {
  id: string
  url: string
  thumbnailUrl?: string
  caption?: string
  uploadedAt: string
  uploadedBy: string
  metadata?: {
    size: number
    dimensions?: {
      width: number
      height: number
    }
    location?: {
      latitude: number
      longitude: number
    }
  }
}

export interface ProjectTimelineEntry {
  id: string
  type: TimelineEventType
  title: string
  description?: string
  timestamp: string
  userId?: string
  metadata?: Record<string, any>
}

export interface IntegrationStatus {
  id: string
  name: string
  type: IntegrationType
  status: HealthStatus
  lastCheckAt: string
  responseTime?: number
  errorMessage?: string
  metadata?: {
    version?: string
    endpoint?: string
    rateLimitRemaining?: number
    rateLimitResetAt?: string
  }
}

export interface SyncProgress {
  id: string
  integration: string
  status: SyncStatus
  progress: number
  total?: number
  startedAt: string
  completedAt?: string
  errorMessage?: string
  recordsProcessed?: number
}

export interface WebSocketConnectionStatus {
  connected: boolean
  reconnecting: boolean
  lastConnectedAt?: string
  lastDisconnectedAt?: string
  reconnectAttempts: number
}

export interface NetworkStatus {
  online: boolean
  downlink?: number
  effectiveType?: string
  rtt?: number
}

// Enums
export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PROSPECT = 'PROSPECT',
  ARCHIVED = 'ARCHIVED'
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED'
}

export enum TimelineEventType {
  CREATED = 'CREATED',
  STATUS_CHANGE = 'STATUS_CHANGE',
  PHOTO_UPLOADED = 'PHOTO_UPLOADED',
  ESTIMATE_GENERATED = 'ESTIMATE_GENERATED',
  NOTE_ADDED = 'NOTE_ADDED',
  SYNC_COMPLETED = 'SYNC_COMPLETED'
}

export enum IntegrationType {
  SALESFORCE = 'SALESFORCE',
  COMPANY_CAM = 'COMPANY_CAM',
  STRIPE = 'STRIPE',
  QUICKBOOKS = 'QUICKBOOKS',
  EMAIL = 'EMAIL'
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  UNKNOWN = 'UNKNOWN'
}

export enum SyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// Filter and pagination types
export interface CustomerFilter {
  status?: CustomerStatus
  search?: string
  salesforceSynced?: boolean
  createdAfter?: string
  createdBefore?: string
}

export interface ProjectFilter {
  customerId?: string
  status?: ProjectStatus
  hasPhotos?: boolean
  hasEstimate?: boolean
  createdAfter?: string
  createdBefore?: string
}

export interface PaginationInput {
  limit?: number
  offset?: number
}

export interface PaginationInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  totalCount: number
  currentPage: number
  totalPages: number
}

// Component prop types
export interface DashboardComponentProps {
  className?: string
}

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export interface FilterDropdownProps {
  options: Array<{ label: string; value: string }>
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export interface StatusBadgeProps {
  status: CustomerStatus | ProjectStatus | HealthStatus | SyncStatus
  className?: string
}

export interface PhotoGridProps {
  photos: ProjectPhoto[]
  onPhotoSelect?: (photo: ProjectPhoto) => void
  onPhotoUpload?: (files: FileList) => void
  className?: string
}

export interface TimelineProps {
  entries: ProjectTimelineEntry[]
  className?: string
}

// API response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
}

// Utility types
export type Nullable<T> = T | null
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
