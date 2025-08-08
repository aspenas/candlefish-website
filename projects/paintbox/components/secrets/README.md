# Secrets Management UI Components

This directory contains React components for managing and monitoring the Paintbox application's secrets management system, which uses AWS Secrets Manager for secure credential storage.

## Components Overview

### 1. SecretsManagementDashboard

**File**: `SecretsManagementDashboard.tsx`

Main dashboard component providing an overview of the entire secrets management system.

**Features**:

- Service health status display
- Secret rotation status tracking
- AWS Secrets Manager connectivity status
- Real-time data refresh (30-second intervals)
- Error handling with retry functionality

**Props**:

```typescript
interface DashboardProps {
  className?: string;
}
```

**Usage**:

```jsx
import { SecretsManagementDashboard } from '@/components/secrets';

<SecretsManagementDashboard className="my-custom-class" />
```

### 2. ServiceStatusMonitor

**File**: `ServiceStatusMonitor.tsx`

Real-time monitoring component for external service integrations (Salesforce, CompanyCam).

**Features**:

- Live service health monitoring
- Response time tracking
- Error alerts and notifications
- Auto-refresh capability (configurable interval)
- Status change notifications
- Alert acknowledgment system

**Props**:

```typescript
interface ServiceStatusMonitorProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}
```

**Usage**:

```jsx
import { ServiceStatusMonitor } from '@/components/secrets';

<ServiceStatusMonitor
  autoRefresh={true}
  refreshInterval={10000}
  className="monitor-container"
/>
```

### 3. AuditLogViewer

**File**: `AuditLogViewer.tsx`

Component for viewing and analyzing security audit events.

**Features**:

- Filterable audit events table
- Search functionality
- Date range filtering
- Service and action filtering
- Event detail modal
- CSV export capability
- Pagination support

**Props**:

```typescript
interface AuditLogViewerProps {
  className?: string;
  pageSize?: number;
}
```

**Usage**:

```jsx
import { AuditLogViewer } from '@/components/secrets';

<AuditLogViewer
  pageSize={50}
  className="audit-viewer"
/>
```

### 4. SecurityConfigurationPanel

**File**: `SecurityConfigurationPanel.tsx`

Comprehensive security configuration and migration tracking panel.

**Features**:

- Security checklist with status indicators
- Environment variable validation
- Migration progress tracking
- Security score calculation
- Step-by-step migration execution
- Configuration validation

**Props**:

```typescript
interface SecurityConfigurationPanelProps {
  className?: string;
}
```

**Usage**:

```jsx
import { SecurityConfigurationPanel } from '@/components/secrets';

<SecurityConfigurationPanel className="security-panel" />
```

## Types

### Core Types

All components use TypeScript interfaces defined in `types.ts`:

```typescript
// Service health status
interface ServiceStatus {
  service: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  lastCheck: string;
  lastSuccess?: string;
  error?: string;
  latency?: number;
}

// Secret rotation status
interface SecretStatus {
  name: string;
  service?: string;
  lastRotated?: string;
  nextRotation?: string;
  status: 'current' | 'expiring' | 'expired' | 'error';
}

// Audit event record
interface AuditEvent {
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

// Application configuration
interface AppConfig {
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

// Security check item
interface SecurityCheckItem {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'warning' | 'failed' | 'pending';
  required: boolean;
  details?: string;
}
```

## API Integration

The components integrate with the following API endpoints:

### Configuration

- `GET /api/v1/secrets/config` - Application configuration
- `GET /api/v1/secrets/health` - Health check endpoint

### Service Management

- `POST /api/v1/secrets/token` - Request temporary access token
- `POST /api/v1/services/salesforce/auth` - Salesforce authentication
- `POST /api/v1/services/companycam/auth` - CompanyCam authentication
- `GET /api/v1/services/{service}/status` - Service status check

### Audit & Security

- `GET /api/v1/audit/events` - Retrieve audit events
- `GET /api/v1/audit/events/export` - Export audit events as CSV
- `POST /api/v1/security/check/{checkId}` - Run security check
- `POST /api/v1/migration/step/{stepId}` - Execute migration step

## Styling

Components use Tailwind CSS with the existing Paintbox design system:

- **Colors**: Consistent with brand palette (blue primary, green success, red error, yellow warning)
- **Typography**: Standard heading and body text styles
- **Spacing**: 4px grid system
- **Components**: Built on existing Card and Button components

### Status Color Coding

- **Green**: Healthy, current, passed, completed
- **Yellow**: Warning, expiring, in progress
- **Red**: Error, expired, failed
- **Gray**: Unknown, pending, neutral

## Error Handling

All components implement comprehensive error handling:

1. **Network Errors**: Graceful degradation with mock data
2. **API Failures**: User-friendly error messages with retry options
3. **Loading States**: Proper loading indicators and skeleton screens
4. **Timeout Handling**: Configurable request timeouts

## Performance Considerations

- **Auto-refresh**: Configurable intervals to balance freshness vs. load
- **Pagination**: Large datasets are paginated for performance
- **Memoization**: Expensive calculations are memoized
- **Debounced Search**: Search inputs are debounced to reduce API calls

## Security Features

- **No Sensitive Data**: API keys and secrets are never displayed in full
- **Audit Trail**: All user actions are logged
- **Access Control**: Components respect user permissions
- **Secure Export**: CSV exports exclude sensitive fields

## Usage Examples

### Complete Admin Page

```jsx
'use client';

import React, { useState } from 'react';
import {
  SecretsManagementDashboard,
  ServiceStatusMonitor,
  AuditLogViewer,
  SecurityConfigurationPanel
} from '@/components/secrets';

export default function AdminSecretsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Secrets Management</h1>
        <nav className="mt-4 flex space-x-4">
          <button onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button onClick={() => setActiveTab('monitor')}>Monitor</button>
          <button onClick={() => setActiveTab('audit')}>Audit</button>
          <button onClick={() => setActiveTab('security')}>Security</button>
        </nav>
      </div>

      {activeTab === 'dashboard' && <SecretsManagementDashboard />}
      {activeTab === 'monitor' && <ServiceStatusMonitor />}
      {activeTab === 'audit' && <AuditLogViewer />}
      {activeTab === 'security' && <SecurityConfigurationPanel />}
    </div>
  );
}
```

### Individual Component Usage

```jsx
// Dashboard with custom refresh
<SecretsManagementDashboard className="mb-8" />

// Monitor with custom settings
<ServiceStatusMonitor
  autoRefresh={true}
  refreshInterval={15000}
  className="service-monitor"
/>

// Audit viewer with large page size
<AuditLogViewer
  pageSize={100}
  className="audit-container"
/>

// Security panel
<SecurityConfigurationPanel className="security-config" />
```

## Development Notes

- Components are fully TypeScript with strict typing
- All API calls include proper error boundaries
- Mock data is provided for development when APIs are unavailable
- Components are responsive and work on desktop and tablet devices
- Accessibility features include proper ARIA labels and keyboard navigation

## Testing

Components should be tested with:

- Unit tests for component logic
- Integration tests for API interactions
- Visual regression tests for UI consistency
- Accessibility tests for WCAG compliance

Example test structure:

```typescript
describe('SecretsManagementDashboard', () => {
  it('renders without errors', () => {});
  it('fetches and displays config data', () => {});
  it('handles API errors gracefully', () => {});
  it('refreshes data on interval', () => {});
});
```
