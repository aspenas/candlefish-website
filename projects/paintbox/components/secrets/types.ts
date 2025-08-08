// Types for secrets management components
export interface ServiceStatus {
  service: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  lastCheck: string;
  lastSuccess?: string;
  error?: string;
  latency?: number;
}

export interface SecretStatus {
  name: string;
  service?: string;
  lastRotated?: string;
  nextRotation?: string;
  status: 'current' | 'expiring' | 'expired' | 'error';
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  service: string;
  action: string;
  user?: string;
  ip?: string;
  success: boolean;
  details?: string;
  error?: string;
}

export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  features: {
    salesforce: boolean;
    companycam: boolean;
    audit: boolean;
  };
  security: {
    tokenExpiry: number;
    rateLimits: {
      global: number;
      perUser: number;
    };
  };
}

export interface SecurityCheckItem {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'warning' | 'failed' | 'pending';
  required: boolean;
  details?: string;
}
