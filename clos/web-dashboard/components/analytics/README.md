# Analytics Dashboard System

A comprehensive React/Next.js analytics dashboard for the CLOS (Candlefish Operating System) web dashboard, providing real-time monitoring and historical analysis of system performance.

## Architecture Overview

### State Management
- **Zustand Store** (`stores/analyticsStore.ts`): Centralized state management for all analytics data
- **Real-time WebSocket Integration**: Live updates for metrics and alerts
- **Local State Caching**: Optimized data fetching and caching strategies

### Core Components

#### 1. Main Dashboard (`AnalyticsDashboard.tsx`)
- **Responsive Design**: Automatically switches to mobile layout on small screens
- **Customizable Widgets**: Drag-and-drop widget system with configurable layouts
- **Real-time Updates**: WebSocket-powered live data updates
- **Fullscreen Mode**: Expandable dashboard view

#### 2. Mobile Analytics (`MobileAnalytics.tsx`)
- **Touch-Optimized Interface**: Designed for mobile interaction
- **Tab-Based Navigation**: Overview, Agents, Services, and Alerts tabs
- **Collapsible Menu**: Space-efficient navigation
- **Quick Actions**: Refresh and essential controls accessible

#### 3. Widget System

##### System Overview Widget (`widgets/SystemOverviewWidget.tsx`)
- **System Metrics**: CPU, Memory, Disk, Network usage
- **Agent & Service Counts**: Active vs total counts
- **Health Indicators**: Visual status indicators
- **Trend Indicators**: Performance trend arrows

##### Agent Performance Chart (`widgets/AgentPerformanceChart.tsx`)
- **Multiple Chart Types**: Line, Area, Bar charts
- **Configurable Metrics**: Response time, success rate, resource usage
- **Real-time Data**: Live updating performance metrics
- **Statistical Summary**: Min, max, average, and trend calculations

##### Service Health Grid (`widgets/ServiceHealthGrid.tsx`)
- **Service Status Cards**: Color-coded health indicators
- **Resource Monitoring**: Memory, CPU, response time tracking
- **Error Rate Visualization**: Progress bars for error rates
- **Uptime Tracking**: Service availability metrics

##### Alerts Widget (`widgets/AlertsWidget.tsx`)
- **Alert Management**: Acknowledge and resolve alerts
- **Filtering Options**: Filter by type, status, severity
- **Real-time Notifications**: Live alert updates
- **Compact & Detailed Views**: Responsive alert display

#### 4. Historical Trends (`HistoricalTrends.tsx`)
- **Trend Analysis**: Compare metrics over time
- **Period Comparisons**: Previous period, week, month comparisons
- **Multiple View Types**: Trend, comparison, and distribution charts
- **Interactive Controls**: Metric selection and time range filtering

#### 5. Dashboard Filters (`DashboardFilters.tsx`)
- **Time Range Selection**: 1h, 4h, 12h, 24h, 7d options
- **Agent Filtering**: Select specific agents to monitor
- **Service Filtering**: Focus on particular services
- **Alert Filtering**: Filter alerts by status and type

### Data Flow

```
WebSocket Server → Zustand Store → React Components
                           ↓
                  Real-time Updates
                           ↓
              Chart Libraries (Recharts)
```

### API Integration

#### Base URL
```
/api/v1/analytics
```

#### Endpoints
- `GET /agents/performance?timeRange={range}` - Agent performance metrics
- `GET /services/health` - Service health status
- `GET /system/overview` - System-wide overview
- `GET /alerts?filter={filter}` - Alerts and notifications
- `POST /alerts/{id}/acknowledge` - Acknowledge alert
- `POST /alerts/{id}/resolve` - Resolve alert

#### WebSocket Events
- `agent_performance_update` - Real-time agent metrics
- `service_health_update` - Service status changes
- `system_overview_update` - System metrics update
- `new_alert` - New alert notifications
- `alert_updated` - Alert status changes

## Features

### Real-time Monitoring
- **Live Data Updates**: WebSocket-powered real-time metrics
- **Connection Status**: Visual connection indicators
- **Auto-refresh**: Fallback polling for disconnected states

### Customizable Dashboard
- **Widget Management**: Add, remove, and configure widgets
- **Layout Control**: Drag-and-drop widget positioning
- **Size Options**: Multiple widget sizes (quarter, half, full width)
- **Visibility Toggle**: Show/hide individual widgets

### Mobile Optimization
- **Responsive Design**: Automatic mobile layout detection
- **Touch Navigation**: Mobile-friendly tab navigation
- **Optimized Charts**: Mobile-responsive chart sizing
- **Gesture Support**: Touch-friendly interactions

### Data Visualization
- **Chart Library**: Recharts for interactive visualizations
- **Chart Types**: Line, area, bar, pie/donut charts
- **Color Coding**: Consistent color schemes for status
- **Tooltips**: Detailed hover information

### Alert Management
- **Real-time Alerts**: Instant alert notifications
- **Status Management**: Acknowledge and resolve workflows
- **Filtering**: Multiple filter options
- **Priority Indication**: Visual priority indicators

## Usage

### Basic Setup
```tsx
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';

function App() {
  return <AnalyticsDashboard className="h-screen" />;
}
```

### Mobile Usage
```tsx
import MobileAnalytics from './components/analytics/MobileAnalytics';

function MobileApp() {
  return <MobileAnalytics className="h-screen" />;
}
```

### Store Integration
```tsx
import { useAnalyticsStore } from './stores/analyticsStore';

function CustomComponent() {
  const { 
    agentPerformance, 
    serviceHealth, 
    isConnected,
    fetchAnalyticsData 
  } = useAnalyticsStore();
  
  // Component logic
}
```

## Configuration

### Widget Configuration
```tsx
const widgetConfig = {
  id: 'custom-widget',
  type: 'chart',
  title: 'Custom Performance Chart',
  position: { x: 0, y: 0, w: 6, h: 4 },
  config: {
    chartType: 'line',
    metrics: ['responseTime', 'successRate'],
    showComparison: true,
  },
  visible: true,
};
```

### Store Configuration
```tsx
// Initialize WebSocket connection
const token = localStorage.getItem('accessToken');
initializeSocket(token);

// Set time range for data fetching
setTimeRange('4h');

// Filter specific agents or services
setSelectedAgents(['agent-1', 'agent-2']);
setSelectedServices(['service-a', 'service-b']);
```

## Performance Considerations

### Optimization Strategies
- **Data Pagination**: Limited data loading for large datasets
- **Chart Virtualization**: Efficient rendering for large datasets
- **Memoization**: React.useMemo for expensive calculations
- **Debounced Updates**: Reduced re-renders for rapid updates
- **Lazy Loading**: Components loaded on demand

### Memory Management
- **Data Retention**: Limited historical data in memory
- **Cleanup Routines**: WebSocket cleanup on unmount
- **Efficient Rendering**: Optimized chart rendering

## Accessibility

### WCAG Compliance
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and descriptions
- **Color Contrast**: High contrast color schemes
- **Focus Management**: Proper focus indicators

### Responsive Features
- **Mobile-First Design**: Mobile-optimized layouts
- **Touch Targets**: Appropriately sized touch areas
- **Readable Text**: Scalable font sizes
- **Gesture Support**: Swipe and tap interactions

## Testing

### Unit Tests
```bash
npm test components/analytics
```

### Integration Tests
```bash
npm run test:integration
```

### Performance Tests
```bash
npm run test:performance
```

## Dependencies

### Core Dependencies
- `zustand`: State management
- `recharts`: Data visualization
- `socket.io-client`: WebSocket communication
- `date-fns`: Date manipulation
- `lucide-react`: Icons

### Development Dependencies
- `@types/react`: TypeScript support
- `tailwindcss`: Styling
- `@radix-ui/react-*`: UI components

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

### Planned Features
- **Advanced Filtering**: More granular filter options
- **Export Functionality**: CSV/PDF export capabilities
- **Custom Dashboards**: User-defined dashboard layouts
- **Notification System**: Email/SMS alert notifications
- **Advanced Analytics**: ML-powered insights and predictions

### Performance Improvements
- **Data Streaming**: More efficient real-time updates
- **Edge Caching**: CDN-based asset delivery
- **Progressive Loading**: Incremental data loading
- **Service Workers**: Offline functionality

## Contributing

See the main project README for contribution guidelines and development setup instructions.