/**
 * @fileoverview Type definitions for Candlefish Claude Config SDK
 * @version 2.0.0
 * @author Candlefish AI <https://candlefish.ai>
 */

/**
 * Configuration profile settings - nested configuration object
 */
export interface ConfigProfileSettings {
  /**
   * Programming languages supported
   */
  languages?: string[];
  /**
   * Development tools and dependencies
   */
  tools?: string[];
  /**
   * Environment-specific settings
   */
  environment?: {
    [key: string]: any;
  };
  /**
   * AI model preferences
   */
  models?: {
    primary?: string;
    fallback?: string[];
    routing?: ModelRoutingConfig;
  };
  /**
   * Security and access controls
   */
  security?: SecurityConfig;
  /**
   * Performance and optimization settings
   */
  performance?: PerformanceConfig;
  /**
   * Additional custom settings
   */
  [key: string]: any;
}

/**
 * Configuration profile metadata
 */
export interface ConfigProfileMetadata {
  /**
   * Creation timestamp
   */
  created_at?: string;
  /**
   * Last update timestamp
   */
  updated_at?: string;
  /**
   * Profile creator/owner
   */
  owner?: string;
  /**
   * Tags for organization
   */
  tags?: string[];
  /**
   * Usage analytics
   */
  analytics?: AnalyticsMetadata;
  /**
   * Additional metadata fields
   */
  [key: string]: any;
}

/**
 * Main configuration profile interface
 */
export interface ConfigProfile {
  /**
   * Unique identifier for the configuration profile
   */
  profile_id?: string;
  /**
   * Human-readable name of the configuration profile
   */
  name: string;
  /**
   * Semantic version of the configuration
   */
  version: string;
  /**
   * Optional description of the profile's purpose
   */
  description?: string;
  /**
   * Nested configuration settings
   */
  settings?: ConfigProfileSettings;
  /**
   * Additional metadata about the profile
   */
  metadata?: ConfigProfileMetadata;
}

/**
 * Model routing configuration
 */
export interface ModelRoutingConfig {
  /**
   * Routing strategy (round-robin, load-based, etc.)
   */
  strategy?: 'round-robin' | 'load-based' | 'priority' | 'geographic';
  /**
   * Routing rules and conditions
   */
  rules?: RoutingRule[];
  /**
   * Fallback behavior
   */
  fallback?: 'queue' | 'reject' | 'route-to-alternative';
}

/**
 * Individual routing rule
 */
export interface RoutingRule {
  /**
   * Condition for applying this rule
   */
  condition: string;
  /**
   * Target model or endpoint
   */
  target: string;
  /**
   * Rule priority (higher = more important)
   */
  priority: number;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /**
   * API key management
   */
  api_keys?: {
    rotation_days?: number;
    allow_multiple?: boolean;
  };
  /**
   * OAuth2 settings
   */
  oauth2?: {
    scopes?: string[];
    refresh_token_ttl?: number;
  };
  /**
   * Rate limiting configuration
   */
  rate_limits?: RateLimitConfig;
  /**
   * Access control lists
   */
  acl?: AccessControlList[];
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /**
   * Requests per minute limit
   */
  requests_per_minute?: number;
  /**
   * Maximum concurrent requests
   */
  concurrent_requests?: number;
  /**
   * Burst allowance
   */
  burst_allowance?: number;
}

/**
 * Access control list entry
 */
export interface AccessControlList {
  /**
   * Resource pattern
   */
  resource: string;
  /**
   * Allowed actions
   */
  actions: string[];
  /**
   * User/role identifiers
   */
  principals: string[];
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  /**
   * Request timeout in milliseconds
   */
  timeout_ms?: number;
  /**
   * Connection pooling settings
   */
  connection_pool?: {
    max_connections?: number;
    idle_timeout_ms?: number;
  };
  /**
   * Caching configuration
   */
  caching?: CachingConfig;
  /**
   * Analytics and monitoring
   */
  monitoring?: MonitoringConfig;
}

/**
 * Caching configuration
 */
export interface CachingConfig {
  /**
   * Enable response caching
   */
  enabled?: boolean;
  /**
   * Cache TTL in seconds
   */
  ttl_seconds?: number;
  /**
   * Cache key patterns
   */
  key_patterns?: string[];
}

/**
 * Monitoring and analytics configuration
 */
export interface MonitoringConfig {
  /**
   * Enable detailed analytics
   */
  detailed_analytics?: boolean;
  /**
   * Metrics collection interval
   */
  metrics_interval_ms?: number;
  /**
   * Log level
   */
  log_level?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Analytics metadata
 */
export interface AnalyticsMetadata {
  /**
   * Total usage count
   */
  usage_count?: number;
  /**
   * Last access timestamp
   */
  last_accessed?: string;
  /**
   * Performance metrics
   */
  performance_metrics?: PerformanceMetrics;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /**
   * Average response time in milliseconds
   */
  avg_response_time_ms?: number;
  /**
   * Success rate percentage
   */
  success_rate?: number;
  /**
   * Error count
   */
  error_count?: number;
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  /**
   * Error code
   */
  code: string;
  /**
   * Human-readable error message
   */
  message: string;
  /**
   * Detailed error information
   */
  details?: string[];
  /**
   * Field-specific errors
   */
  field_errors?: FieldError[];
}

/**
 * Field-specific validation error
 */
export interface FieldError {
  /**
   * Field name or path
   */
  field: string;
  /**
   * Error message for this field
   */
  message: string;
  /**
   * Invalid value
   */
  invalid_value?: any;
}

/**
 * WebSocket event structure
 */
export interface WebSocketEvent {
  /**
   * Type of event
   */
  event_type: string;
  /**
   * Event payload data
   */
  payload: any;
  /**
   * Event timestamp
   */
  timestamp: string;
  /**
   * Event metadata
   */
  metadata?: {
    source?: string;
    correlation_id?: string;
    [key: string]: any;
  };
}

/**
 * Service tier enumeration
 */
export enum ServiceTier {
  Free = 'Free',
  Pro = 'Pro',
  Enterprise = 'Enterprise'
}

/**
 * Authentication method types
 */
export enum AuthMethod {
  APIKey = 'api_key',
  OAuth2 = 'oauth2',
  Bearer = 'bearer'
}

/**
 * WebSocket connection states
 */
export enum WebSocketState {
  Connecting = 'connecting',
  Open = 'open',
  Closing = 'closing',
  Closed = 'closed'
}

/**
 * API client configuration
 */
export interface ClientConfig {
  /**
   * Base API URL
   */
  baseURL?: string;
  /**
   * Service tier
   */
  tier?: ServiceTier;
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  /**
   * Retry configuration
   */
  retry?: RetryConfig;
  /**
   * Custom headers
   */
  headers?: Record<string, string>;
}

/**
 * Retry configuration for failed requests
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   */
  max_attempts?: number;
  /**
   * Base delay between retries in milliseconds
   */
  base_delay_ms?: number;
  /**
   * Maximum delay between retries in milliseconds
   */
  max_delay_ms?: number;
  /**
   * Exponential backoff multiplier
   */
  backoff_multiplier?: number;
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  /**
   * Authentication method
   */
  method: AuthMethod;
  /**
   * API key (for APIKey method)
   */
  apiKey?: string;
  /**
   * Access token (for OAuth2/Bearer methods)
   */
  accessToken?: string;
  /**
   * Refresh token (for OAuth2 method)
   */
  refreshToken?: string;
  /**
   * Token expiration timestamp
   */
  expiresAt?: number;
}

/**
 * List profiles query parameters
 */
export interface ListProfilesQuery {
  /**
   * Number of profiles to return
   */
  limit?: number;
  /**
   * Offset for pagination
   */
  offset?: number;
  /**
   * Filter by name pattern
   */
  name_filter?: string;
  /**
   * Filter by version
   */
  version_filter?: string;
  /**
   * Filter by tags
   */
  tags?: string[];
  /**
   * Sort field
   */
  sort_by?: 'name' | 'version' | 'created_at' | 'updated_at';
  /**
   * Sort order
   */
  sort_order?: 'asc' | 'desc';
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  /**
   * Response data
   */
  data?: T;
  /**
   * Success indicator
   */
  success: boolean;
  /**
   * Error information (if any)
   */
  error?: ConfigValidationError;
  /**
   * Response metadata
   */
  metadata?: ResponseMetadata;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  /**
   * Request ID for tracking
   */
  request_id?: string;
  /**
   * Rate limit information
   */
  rate_limit?: RateLimitInfo;
  /**
   * Pagination information
   */
  pagination?: PaginationInfo;
}

/**
 * Rate limit information in response headers
 */
export interface RateLimitInfo {
  /**
   * Requests remaining in current window
   */
  remaining: number;
  /**
   * Total requests allowed in window
   */
  limit: number;
  /**
   * Window reset timestamp
   */
  reset_at: number;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  /**
   * Current page/offset
   */
  offset: number;
  /**
   * Number of items per page
   */
  limit: number;
  /**
   * Total number of items
   */
  total: number;
  /**
   * Whether there are more pages
   */
  has_more: boolean;
}

/**
 * Event handler types for WebSocket
 */
export interface WebSocketEventHandlers {
  /**
   * Connection opened
   */
  onOpen?: (event: Event) => void;
  /**
   * Message received
   */
  onMessage?: (event: WebSocketEvent) => void;
  /**
   * Connection closed
   */
  onClose?: (event: CloseEvent) => void;
  /**
   * Error occurred
   */
  onError?: (event: Event) => void;
}

/**
 * React hook options
 */
export interface UseConfigProfileOptions {
  /**
   * Profile ID to fetch
   */
  profileId?: string;
  /**
   * Enable real-time updates via WebSocket
   */
  realtime?: boolean;
  /**
   * Polling interval in milliseconds (if not using WebSocket)
   */
  pollInterval?: number;
  /**
   * Enable automatic retries
   */
  retry?: boolean;
}

/**
 * React hook return type
 */
export interface UseConfigProfileReturn {
  /**
   * Current profile data
   */
  profile?: ConfigProfile;
  /**
   * All profiles (if fetching list)
   */
  profiles?: ConfigProfile[];
  /**
   * Loading state
   */
  loading: boolean;
  /**
   * Error state
   */
  error?: Error;
  /**
   * Refetch function
   */
  refetch: () => Promise<void>;
  /**
   * Create profile function
   */
  createProfile: (profile: Omit<ConfigProfile, 'profile_id'>) => Promise<ConfigProfile>;
  /**
   * Update profile function
   */
  updateProfile: (profile: ConfigProfile) => Promise<ConfigProfile>;
  /**
   * Delete profile function
   */
  deleteProfile: (profileId: string) => Promise<void>;
}