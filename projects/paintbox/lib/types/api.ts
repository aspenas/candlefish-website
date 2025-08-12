/**
 * Shared API types for Paintbox application
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Build Status Types
export interface BuildStatus {
  status: 'idle' | 'building' | 'success' | 'error' | 'cancelled';
  progress: number;
  stage: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  buildId?: string;
  version?: string;
  errors?: BuildError[];
  warnings?: BuildWarning[];
}

export interface BuildError {
  id: string;
  type: 'error' | 'warning';
  severity?: 'error' | 'warning';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
  source?: string;
  timestamp: string;
}

export interface BuildWarning {
  id: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  timestamp: string;
}

// Deployment Types
export interface DeploymentStatus {
  id: string;
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed' | 'cancelled';
  environment: 'development' | 'staging' | 'production';
  progress: number;
  url?: string;
  branch: string;
  commit: string;
  author: string;
  message: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  logs?: string[];
}

// Health Check Types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  services: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastCheck: string;
  error?: string;
}

// CompanyCam API Types
export interface CompanyCamProject {
  id: string;
  name: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
  photo_count: number;
  tags: string[];
}

export interface CompanyCamPhoto {
  id: string;
  project_id: string;
  url: string;
  thumbnail_url: string;
  filename: string;
  file_size: number;
  width: number;
  height: number;
  uploaded_at: string;
  tags: string[];
  description?: string;
  metadata?: Record<string, any>;
}

// Salesforce API Types
export interface SalesforceAccount {
  Id: string;
  Name: string;
  Type?: string;
  Industry?: string;
  Phone?: string;
  Website?: string;
  BillingAddress?: Address;
  ShippingAddress?: Address;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceContact {
  Id: string;
  AccountId?: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  Department?: string;
  MailingAddress?: Address;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceOpportunity {
  Id: string;
  AccountId?: string;
  Name: string;
  StageName: string;
  Amount?: number;
  CloseDate: string;
  Probability?: number;
  Type?: string;
  LeadSource?: string;
  Description?: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface APIError extends Error {
  status: number;
  code?: string;
  details?: any;
  validation?: ValidationError[];
}

// Webhook Types
export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: any;
  signature?: string;
  source: 'salesforce' | 'companycam' | 'internal';
}

// Metrics Types
export interface Metrics {
  timestamp: string;
  requests: {
    total: number;
    success: number;
    errors: number;
    average_response_time: number;
  };
  performance: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_io: {
      in: number;
      out: number;
    };
  };
  business: {
    active_users: number;
    api_calls: number;
    data_processed: number;
  };
}