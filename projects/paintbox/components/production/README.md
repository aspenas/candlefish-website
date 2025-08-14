# Production Deployment Components

This directory contains React components for managing production deployment features in the Paintbox application. These components integrate with the backend API endpoints and provide comprehensive management interfaces for production infrastructure.

## Components Overview

### 1. TemporalDashboard
**File**: `TemporalDashboard.tsx`
**Purpose**: Manage Temporal Cloud connections and monitor workflows

**Features**:
- Create, update, and delete Temporal connections
- Test connection status with real-time feedback
- View and monitor workflow executions
- TLS configuration support
- Connection health monitoring

**API Endpoints**:
- `GET /api/v1/temporal/connections` - List connections
- `POST /api/v1/temporal/connections` - Create connection
- `PUT /api/v1/temporal/connections/{id}` - Update connection
- `DELETE /api/v1/temporal/connections/{id}` - Delete connection
- `POST /api/v1/temporal/connections/{id}/test` - Test connection
- `GET /api/v1/temporal/workflows` - List workflows

### 2. APIKeyManager
**File**: `APIKeyManager.tsx`
**Purpose**: Comprehensive API key lifecycle management

**Features**:
- Create API keys with custom permissions and rate limits
- Secure key rotation with automatic invalidation
- Usage analytics and monitoring
- Permission management system
- Key expiration and scheduling
- Clipboard integration for secure credential handling

**API Endpoints**:
- `GET /api/v1/keys` - List API keys
- `POST /api/v1/keys` - Create API key
- `POST /api/v1/keys/{id}/rotate` - Rotate key
- `DELETE /api/v1/keys/{id}` - Revoke key
- `GET /api/v1/keys/{id}/usage` - Get usage stats

### 3. MonitoringDashboard
**File**: `MonitoringDashboard.tsx`
**Purpose**: Real-time metrics monitoring and alerting system

**Features**:
- Real-time metric visualization with custom charts
- Alert configuration and management
- Notification channel setup (Email, Slack, Webhook, SMS)
- Custom dashboards and time range selection
- Auto-refresh capabilities
- Threshold-based alerting system

**API Endpoints**:
- `GET /api/v1/monitoring/metrics` - Get metrics
- `POST /api/v1/monitoring/alerts` - Create alert
- `GET /api/v1/monitoring/alerts` - List alerts
- `POST /api/v1/monitoring/notifications/channels` - Create notification channel

### 4. CircuitBreakerPanel
**File**: `CircuitBreakerPanel.tsx`
**Purpose**: Service reliability and circuit breaker management

**Features**:
- Create and configure circuit breakers
- Real-time health score visualization
- Failure threshold and recovery timeout configuration
- Manual circuit breaker reset capabilities
- Metrics visualization with custom charts
- Automatic recovery settings

**API Endpoints**:
- `GET /api/v1/circuit-breakers` - List circuit breakers
- `POST /api/v1/circuit-breakers` - Create circuit breaker
- `POST /api/v1/circuit-breakers/{name}/reset` - Reset breaker
- `GET /api/v1/circuit-breakers/{name}/metrics` - Get metrics

### 5. SecurityScanner
**File**: `SecurityScanner.tsx`
**Purpose**: Security vulnerability scanning and management

**Features**:
- Multiple scan types (vulnerability, compliance, dependency, secret)
- Comprehensive vulnerability management
- Severity-based filtering and categorization
- Vulnerability status tracking and remediation
- Scan result analysis and reporting
- Target configuration for different asset types

**API Endpoints**:
- `POST /api/v1/security/scans` - Create scan
- `GET /api/v1/security/scans` - List scans
- `GET /api/v1/security/vulnerabilities` - List vulnerabilities

## Shared Features

### State Management
All components use Zustand for state management with the `useProductionStore` hook. The store provides:
- Centralized API calls
- Loading states
- Error handling
- Real-time data updates
- WebSocket integration (planned)

### Design System Integration
Components follow the existing Paintbox design patterns:
- Consistent use of shadcn/ui components
- Tailwind CSS for styling
- Responsive design for tablet/mobile
- Accessibility compliance (ARIA labels, keyboard navigation)
- Loading states and error boundaries

### Real-time Updates
Components support real-time updates through:
- Polling mechanisms with configurable intervals
- WebSocket integration (infrastructure in place)
- Automatic refresh capabilities
- Live status indicators

## Usage Examples

### Basic Component Usage
```tsx
import { 
  TemporalDashboard, 
  APIKeyManager, 
  MonitoringDashboard,
  CircuitBreakerPanel,
  SecurityScanner 
} from '@/components/production';

// In your route/page component
export default function ProductionPage() {
  return (
    <div className="space-y-8">
      <TemporalDashboard />
      <APIKeyManager />
      <MonitoringDashboard />
      <CircuitBreakerPanel />
      <SecurityScanner />
    </div>
  );
}
```

### Individual Component Integration
```tsx
import { MonitoringDashboard } from '@/components/production';

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-8">
      <MonitoringDashboard />
    </div>
  );
}
```

### Store Integration
```tsx
import { useProductionStore } from '@/stores/useProductionStore';

function CustomComponent() {
  const { 
    temporal, 
    fetchTemporalConnections,
    createTemporalConnection 
  } = useProductionStore();

  // Use store methods and state
  useEffect(() => {
    fetchTemporalConnections();
  }, []);

  return (
    <div>
      {temporal.connections.map(conn => (
        <div key={conn.id}>{conn.name}</div>
      ))}
    </div>
  );
}
```

## Responsive Design

All components are designed to work across different screen sizes:

- **Desktop** (≥1024px): Full feature set with multi-column layouts
- **Tablet** (768px-1023px): Adapted layouts with touch-friendly interactions
- **Mobile** (≤767px): Simplified interfaces with drawer/modal patterns

## Accessibility Features

Components include comprehensive accessibility support:
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- High contrast support
- Focus management
- Semantic HTML structure

## Performance Considerations

- **Lazy Loading**: Components support code splitting
- **Memoization**: Expensive operations are memoized
- **Virtual Scrolling**: Large lists use virtual scrolling
- **Debounced Inputs**: Search and filter inputs are debounced
- **Optimistic Updates**: UI updates immediately with rollback on errors

## Security Features

- **Secure Credential Handling**: API keys are masked and copied securely
- **Input Validation**: All forms include client-side validation
- **CSRF Protection**: Forms include CSRF tokens
- **Permission Checks**: Components respect user permissions
- **Audit Logging**: Actions are logged for compliance

## Testing

Components include comprehensive testing:
- Unit tests for component logic
- Integration tests for API interactions
- E2E tests for user workflows
- Performance tests for large datasets
- Accessibility tests for compliance

## WebSocket Integration

Infrastructure is in place for WebSocket integration:
- Real-time metric updates
- Live alert notifications
- Circuit breaker state changes
- Scan progress updates
- Connection status changes

## Browser Support

Components support modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

Planned improvements include:
- Advanced chart customization
- Export functionality for reports
- Bulk operations for management
- Advanced filtering and search
- Custom dashboard builder
- Mobile app integration
- Offline support capabilities

## Contributing

When contributing to these components:
1. Follow the existing TypeScript patterns
2. Ensure responsive design compliance
3. Add appropriate test coverage
4. Update documentation as needed
5. Follow the established design system
6. Include accessibility considerations
