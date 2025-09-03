// Main components
export { EnhancedCandleFish } from '../../web/aquarium/react/EnhancedCandleFish'
export { CandleFish } from '../../web/aquarium/react/CandleFish'

// Admin components
export { AnimationConfigPanel } from '../admin/AnimationConfigPanel'
export { AnalyticsDashboard } from '../admin/AnalyticsDashboard'

// Performance monitoring
export { PerformanceMonitor } from '../performance/PerformanceMonitor'
export { FPSCounter } from '../performance/FPSCounter'

// A/B testing
export { 
  ABTestWrapper, 
  useABTest, 
  withABTest, 
  ABTestConsumer, 
  Variant,
  ABTestExample 
} from '../testing/ABTestWrapper'

// Error handling
export { 
  AnimationErrorBoundary, 
  useErrorHandler, 
  withErrorBoundary 
} from '../errors/AnimationErrorBoundary'

// Hooks
export { useAnimationConfig } from '../../hooks/useAnimationConfig'
export { useAnimationAnalytics } from '../../hooks/useAnimationAnalytics'
export { useFeatureFlags } from '../../hooks/useFeatureFlags'

// Types
export * from '../../types/animation'