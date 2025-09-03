/**
 * TypeScript interfaces matching backend data models for candlefish animation system
 */

// Animation Configuration Types
export interface AnimationConfig {
  animationId: string
  enabled: boolean
  speed: number // 0.1 - 3.0
  colors: {
    primary: string // hex color for glow
    background: string // hex color for background
    trail: string // hex color for trail
  }
  behavior: {
    curiosityRadius: number // pixel distance for cursor interaction
    dartFrequency: number // 0-1 probability per frame
    trailLength: number // number of trail points
    glowIntensity: number // 0-1 base glow intensity
  }
  performance: {
    maxFPS: number // target FPS cap
    qualityLevel: 'low' | 'medium' | 'high' // rendering quality
    enableTrail: boolean
    enableRipples: boolean
    enableBubbles: boolean
  }
  responsive: {
    mobileHeight: number // mobile canvas height
    desktopHeight: number // desktop canvas height
    disableOnMobile: boolean
  }
  createdAt: string
  updatedAt: string
}

// Feature Flag Types
export interface FeatureFlag {
  flagId: string
  name: string
  description: string
  enabled: boolean
  variants: FeatureFlagVariant[]
  targeting: {
    userSegments: string[]
    percentage: number
  }
  createdAt: string
  updatedAt: string
}

export interface FeatureFlagVariant {
  id: string
  name: string
  weight: number // 0-100 percentage
  config: Partial<AnimationConfig>
}

export interface FeatureFlagOverride {
  flagId: string
  userId: string
  variant: string
  expiresAt?: string
}

// Analytics Types
export interface AnimationEvent {
  eventId: string
  animationId: string
  userId?: string
  sessionId: string
  eventType: 'view' | 'interaction' | 'error' | 'performance'
  eventData: {
    timestamp: number
    duration?: number // for view/interaction events
    cursorPosition?: { x: number; y: number }
    clickPosition?: { x: number; y: number }
    fps?: number // for performance events
    memoryUsage?: number
    errorMessage?: string // for error events
    errorStack?: string
  }
  metadata: {
    userAgent: string
    viewport: { width: number; height: number }
    devicePixelRatio: number
    reducedMotion: boolean
    variant?: string // A/B test variant
  }
  createdAt: string
}

export interface AnimationMetrics {
  animationId: string
  timeRange: {
    start: string
    end: string
  }
  views: {
    total: number
    unique: number
    averageDuration: number
  }
  interactions: {
    clicks: number
    hovers: number
    ripples: number
  }
  performance: {
    averageFPS: number
    memoryUsage: {
      average: number
      peak: number
    }
    errorRate: number
    loadTime: {
      average: number
      p95: number
    }
  }
  variants: {
    [variantId: string]: {
      views: number
      interactions: number
      conversionRate?: number
    }
  }
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  timestamp: string
}

// Hook State Types
export interface AnimationConfigState {
  config: AnimationConfig | null
  loading: boolean
  error: string | null
}

export interface AnimationAnalyticsState {
  metrics: AnimationMetrics | null
  loading: boolean
  error: string | null
}

export interface FeatureFlagsState {
  flags: Record<string, FeatureFlag>
  activeVariants: Record<string, string>
  loading: boolean
  error: string | null
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  timestamp: number
}

export interface PerformanceAlert {
  type: 'fps_drop' | 'memory_leak' | 'render_error'
  message: string
  severity: 'low' | 'medium' | 'high'
  timestamp: number
  metrics?: PerformanceMetrics
}

// Component Props Types
export interface AnimationConfigPanelProps {
  animationId: string
  onConfigChange?: (config: AnimationConfig) => void
  readOnly?: boolean
}

export interface PerformanceMonitorProps {
  animationId: string
  onAlert?: (alert: PerformanceAlert) => void
  showVisualIndicators?: boolean
}

export interface ABTestWrapperProps {
  children: React.ReactNode
  testId: string
  userId?: string
  fallback?: React.ReactNode
  onVariantAssigned?: (variant: string) => void
}

export interface AnimationErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}