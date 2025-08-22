# Real-time Agent Performance Monitoring Dashboard (RTPM)

A comprehensive React dashboard for monitoring AI agent performance in real-time, built with modern frontend technologies and designed to handle 1000+ agents efficiently.

## Features

### 🚀 Real-time Monitoring
- **WebSocket Integration**: Live metrics streaming from backend
- **Real-time Visualizations**: Interactive charts updating every few seconds
- **Connection State Management**: Automatic reconnection and error handling
- **Live Alerts**: Instant notifications for performance issues

### 📊 Advanced Visualizations
- **Recharts Integration**: Professional charts with smooth animations
- **Multiple Chart Types**: Line, area, bar, pie, radial, and gauge charts
- **Interactive Tooltips**: Detailed information on hover
- **Responsive Design**: Charts adapt to screen size automatically

### 📈 Historical Analysis
- **Time Range Controls**: 1h, 6h, 24h, 7d, 30d views with custom ranges
- **Trend Analysis**: Statistical insights and performance patterns
- **Data Aggregation**: Configurable metrics grouping and filtering
- **Export Integration**: Historical data export in multiple formats

### 🎯 Virtualized Agent Grid
- **High Performance**: Efficiently handles 1000+ agents using react-window
- **Multiple View Modes**: Grid, list, and compact views
- **Advanced Filtering**: Search, status, region, and platform filters
- **Sorting & Pagination**: Flexible data organization
- **Bulk Operations**: Multi-agent selection and actions

### 🔔 Alert Management
- **Rule-based Alerts**: Configurable conditions and thresholds
- **Multiple Actions**: Email, webhook, Slack, SMS, and dashboard notifications
- **Severity Levels**: Info, warning, error, and critical classifications
- **Alert History**: Comprehensive tracking and acknowledgment system
- **Template System**: Pre-built alert configurations

### 📤 Export Capabilities
- **Multiple Formats**: CSV, Excel, JSON, and PDF reports
- **Configurable Data**: Select metrics, time ranges, and agents
- **Batch Processing**: Background export jobs with progress tracking
- **Chart Inclusion**: Visual reports with embedded charts (PDF)

### 🎨 Theme & Responsiveness
- **Dark/Light Mode**: System preference detection with manual override
- **Mobile-first Design**: Optimized for all screen sizes
- **Touch-friendly**: Mobile gesture support and navigation
- **Accessibility**: WCAG compliant with ARIA labels

## Technology Stack

### Core Technologies
- **React 18** with TypeScript for type safety
- **Framer Motion** for smooth animations and transitions
- **Tailwind CSS** with custom design system
- **Recharts** for professional data visualizations

### Performance & Scalability
- **react-window** for virtualization of large datasets
- **WebSocket** with automatic reconnection and heartbeat
- **Memoization** and optimization for 60fps performance
- **Code splitting** for efficient bundle loading

### Development Tools
- **Vite** for fast development and building
- **ESLint & TypeScript** for code quality
- **Playwright** for end-to-end testing
- **Vitest** for unit testing

## Architecture

### Component Structure
```
src/components/rtpm/
├── RTPMDashboard.tsx          # Main dashboard layout
├── RealtimeCharts.tsx         # Live metrics visualization
├── HistoricalCharts.tsx       # Trend analysis with time controls
├── VirtualizedAgentGrid.tsx   # Efficient agent grid view
├── AlertConfiguration.tsx     # Alert management interface
├── ExportManager.tsx          # Data export functionality
└── ThemeProvider.tsx          # Theme and responsive utilities
```

### Type System
```
src/types/rtpm.types.ts        # Comprehensive type definitions
```

### Services
```
src/services/websocket.service.ts  # WebSocket connection management
```

### API Integration
The dashboard is designed to work with the following backend API:

#### REST Endpoints
- `GET /api/v1/agents` - List all agents with status
- `GET /api/v1/agents/{id}/metrics` - Get specific agent metrics
- `GET /api/v1/metrics/realtime` - Current system metrics
- `GET /api/v1/metrics/aggregate` - Historical aggregated data
- `POST /api/v1/alerts` - Create new alert rules
- `PUT /api/v1/alerts/{id}` - Update alert rules
- `DELETE /api/v1/alerts/{id}` - Delete alert rules

#### WebSocket Streams
- `ws://api/v1/metrics/stream` - Live metrics updates
  - Agent metrics updates
  - System health metrics
  - Alert notifications
  - Agent status changes

### Data Models

#### Agent
```typescript
interface Agent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning' | 'error' | 'maintenance';
  version: string;
  capabilities: string[];
  lastSeen: Date;
  region?: string;
  platform?: string;
}
```

#### Agent Metrics
```typescript
interface AgentMetrics {
  agentId: string;
  timestamp: Date;
  cpu: number;              // 0-100 percentage
  memory: number;           // 0-100 percentage
  requestRate: number;      // requests per second
  errorRate: number;        // 0-100 percentage
  responseTime: number;     // milliseconds
  throughput?: number;      // operations per second
  activeConnections?: number;
}
```

#### Alert Configuration
```typescript
interface Alert {
  id: string;
  name: string;
  agentId?: string;         // Optional for global alerts
  metric: MetricType;
  operator: AlertOperator;
  threshold: number;
  actions: AlertAction[];
  enabled: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
}
```

## Usage

### Basic Integration

```tsx
import { RTMPDashboard } from './components/rtpm/RTPMDashboard';

function App() {
  return (
    <div className="h-screen">
      <RTMPDashboard />
    </div>
  );
}
```

### Custom Configuration

```tsx
import { ThemeProvider, RTMPDashboard } from './components/rtpm';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <RTMPDashboard className="custom-dashboard" />
    </ThemeProvider>
  );
}
```

### WebSocket Configuration

```typescript
import { WebSocketService } from './services/websocket.service';

const wsService = new WebSocketService(
  {
    url: 'ws://your-api-server/ws/metrics/stream',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    subscriptions: ['metrics', 'alerts', 'agent_status']
  },
  {
    onMetrics: (metrics) => console.log('New metrics:', metrics),
    onAlert: (alert) => console.log('New alert:', alert),
    onConnectionStateChange: (state) => console.log('Connection:', state)
  }
);
```

## Performance Optimizations

### Virtualization
- **Agent Grid**: Uses react-window for efficient rendering of 1000+ agents
- **Row Height**: Dynamic sizing based on content and view mode
- **Lazy Loading**: Only renders visible items plus buffer

### Memory Management
- **Metric History**: Automatic cleanup of old data points (configurable limits)
- **WebSocket**: Efficient message processing with batching
- **Chart Data**: Optimized data structures for smooth animations

### Network Efficiency
- **Data Compression**: WebSocket message compression
- **Incremental Updates**: Only sends changed data
- **Connection Pooling**: Reuses connections for multiple subscriptions

## Responsive Design

### Breakpoints
- **Mobile**: < 768px (Single column, touch-optimized)
- **Tablet**: 768px - 1024px (Two columns, adaptive layouts)
- **Desktop**: > 1024px (Multi-column, full feature set)

### Mobile Optimizations
- **Touch Gestures**: Swipe navigation and pull-to-refresh
- **Simplified Charts**: Reduced complexity for small screens
- **Collapsible Sidebar**: Space-efficient navigation
- **Adaptive Content**: Context-sensitive information density

## Accessibility

### WCAG Compliance
- **Color Contrast**: Meets AA standards for all text
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Comprehensive ARIA labels
- **Focus Management**: Logical tab order and focus indicators

### Features
- **High Contrast Mode**: Enhanced visibility options
- **Reduced Motion**: Respects user motion preferences
- **Text Scaling**: Supports browser zoom up to 200%
- **Alternative Text**: Descriptive labels for all visual elements

## Development

### Getting Started
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Type checking
pnpm typecheck
```

### Environment Variables
```env
VITE_WS_URL=ws://localhost:8000/ws/metrics/stream
VITE_API_URL=http://localhost:8000/api/v1
VITE_ENABLE_MOCK_DATA=true
```

### Testing Strategy
- **Unit Tests**: Component logic and utilities (Vitest)
- **Integration Tests**: WebSocket and API integration
- **E2E Tests**: Complete user workflows (Playwright)
- **Performance Tests**: Load testing with large datasets

## Production Deployment

### Build Optimization
```bash
# Production build with optimizations
pnpm build

# Analyze bundle size
pnpm analyze

# Performance audit
pnpm lighthouse
```

### Environment Configuration
- **CDN**: Static assets served via CDN
- **Compression**: Gzip/Brotli compression enabled
- **Caching**: Aggressive caching for static resources
- **Monitoring**: Real User Monitoring (RUM) integration

### Security Considerations
- **CSP Headers**: Content Security Policy implementation
- **HTTPS Only**: All communications encrypted
- **API Authentication**: JWT token-based authentication
- **Data Validation**: Client-side input sanitization

## Browser Support

### Supported Browsers
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### Polyfills Included
- **ResizeObserver**: For responsive components
- **IntersectionObserver**: For virtualization
- **WebSocket**: Fallback for older browsers

## Contributing

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React and TypeScript
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Semantic commit messages

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation if needed
4. Submit PR with description
5. Address review feedback
6. Merge after approval

## License

MIT License - see LICENSE file for details.

## Support

For questions, issues, or contributions:
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and community support
- **Documentation**: Additional guides and examples

---

**Note**: This dashboard is designed as a comprehensive monitoring solution for AI agent environments. It can be adapted for other monitoring use cases by modifying the data models and API integrations.
