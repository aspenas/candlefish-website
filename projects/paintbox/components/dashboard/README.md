# System Analyzer Dashboard

A comprehensive React-based dashboard for monitoring and analyzing system performance in real-time. The dashboard provides an intuitive interface for "run all open so we can analyze status" system monitoring with advanced visualization and alerting capabilities.

## Features

### 🚀 Real-time Monitoring
- Live service status updates via GraphQL subscriptions
- Real-time metrics visualization with Chart.js
- Automatic refresh intervals for data freshness
- WebSocket-based live notifications

### 📊 Advanced Analytics
- System health scoring with visual indicators  
- Performance insights and anomaly detection
- Trend analysis with predictive recommendations
- Resource utilization tracking (CPU, Memory, Disk, Network)

### 🔔 Smart Alerting
- Multi-severity alert system (Critical, High, Medium, Low)
- Alert acknowledgment and resolution workflows
- Automated notification routing
- Alert suppression capabilities

### 🎯 Service Management
- Service discovery and auto-registration
- Dependency mapping and health impact analysis
- Container and process monitoring
- Environment-based filtering

### 📱 Responsive Design
- Mobile-first responsive layout
- Tablet and desktop optimized views
- Dark mode support with system preference detection
- Collapsible sidebar for space efficiency

### ⚡ Performance Optimized
- Apollo Client caching and error handling
- Virtualized lists for large datasets
- Lazy loading and code splitting
- Optimistic UI updates

## Architecture

### Technology Stack
- **Frontend**: React 18+ with TypeScript
- **State Management**: Apollo Client + React Context
- **GraphQL**: Queries, mutations, and subscriptions
- **Charts**: Chart.js with react-chartjs-2
- **Styling**: Tailwind CSS with dark mode
- **Icons**: Heroicons
- **Animations**: Framer Motion
- **Notifications**: Sonner toast system

### Component Structure
```
components/dashboard/
├── SystemAnalyzerDashboard.tsx     # Main dashboard orchestrator
├── layout/
│   ├── DashboardLayout.tsx         # Overall layout structure
│   ├── DashboardSidebar.tsx        # Navigation and controls
│   └── DashboardHeader.tsx         # Top bar with search/filters
├── views/
│   ├── OverviewDashboard.tsx       # System overview page
│   ├── ServicesView.tsx            # Services management
│   ├── AlertsView.tsx              # Alert management
│   ├── MetricsView.tsx             # Detailed metrics
│   └── InsightsView.tsx            # AI insights and recommendations
├── components/
│   ├── DashboardCard.tsx           # Metric display cards
│   ├── MetricChart.tsx             # Chart visualization
│   ├── SystemHealthScore.tsx       # Health score component
│   ├── RecommendationsList.tsx     # AI recommendations
│   ├── ServiceGrid.tsx             # Service grid display
│   └── AlertList.tsx               # Alert list management
└── README.md
```

### GraphQL Integration
- **Queries**: Service data, alerts, metrics, system analysis
- **Mutations**: Alert management, service actions
- **Subscriptions**: Real-time updates for services, alerts, metrics
- **Error Handling**: Comprehensive error boundaries and retry logic
- **Caching**: Optimized cache policies for performance

## Getting Started

### Prerequisites
- Node.js 18+
- GraphQL API server (see `/lib/graphql/schema.graphql`)
- WebSocket support for real-time features

### Installation
The dashboard is already integrated into the project. Dependencies are managed in the root `package.json`:

```json
{
  "@apollo/client": "^3.11.8",
  "graphql": "^16.9.0",
  "graphql-ws": "^5.16.0",
  "chart.js": "^4.4.6",
  "react-chartjs-2": "^5.2.0",
  "chartjs-adapter-date-fns": "^3.0.0"
}
```

### Environment Configuration
Set the following environment variables:

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:4000/graphql
```

### Usage
1. Navigate to `/system-analyzer` to access the dashboard
2. The dashboard will automatically connect to the GraphQL API
3. Real-time updates will be enabled by default
4. Use the sidebar to navigate between different views

## Dashboard Views

### 1. Overview Dashboard
- **Health Score**: Visual system health indicator with trend analysis
- **Key Metrics**: Service counts, alert summaries, resource utilization
- **Quick Charts**: CPU, Memory, Disk, Network utilization trends  
- **Service Grid**: Overview of top services with status indicators
- **Recent Alerts**: Latest alerts requiring attention
- **Recommendations**: AI-generated optimization suggestions

### 2. Services View
- **Service Grid**: Detailed view of all discovered services
- **Status Filtering**: Filter by health status and environment
- **Service Details**: Click to view detailed service information
- **Bulk Operations**: Multi-select for batch actions

### 3. Alerts View
- **Alert Management**: Acknowledge, resolve, or suppress alerts
- **Severity Filtering**: Filter by alert severity levels
- **Alert Details**: Detailed view with trigger conditions
- **Notification History**: Track alert notification delivery

### 4. Metrics View
- **Real-time Charts**: Live metric visualization with multiple timeframes
- **Resource Monitoring**: System-wide resource utilization
- **Performance Metrics**: Response times, throughput, error rates
- **Custom Dashboards**: User-configurable metric combinations

### 5. Insights View  
- **System Health Analysis**: Comprehensive health scoring methodology
- **Performance Insights**: AI-powered performance analysis
- **Recommendations**: Actionable improvement suggestions
- **Trend Analysis**: Historical performance trends and predictions

## Real-time Features

### WebSocket Subscriptions
- **Service Status Changes**: Live service health updates
- **Alert Notifications**: Instant alert delivery with toast notifications
- **Metric Streaming**: Real-time metric data updates
- **System Analysis**: Live system health recalculation

### Notification System
- **Toast Notifications**: Non-intrusive status updates
- **Alert Badges**: Real-time counter updates
- **Status Indicators**: Live status dots and animations
- **Sound Notifications**: Configurable audio alerts

## Customization

### Theming
The dashboard supports dark mode with automatic system preference detection:

```typescript
// Toggle dark mode
const { toggleDarkMode, darkMode } = useDashboard();

// Check system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

### Chart Configuration
Charts are highly customizable via the `MetricChart` component:

```typescript
<MetricChart
  title="Custom Metric"
  value={currentValue}
  unit="units"
  trend={TrendDirection.INCREASING}
  data={chartData}
  color="blue"
  height={200}
/>
```

### Alert Customization
Alert severity and styling can be customized:

```typescript
const alertConfig = {
  CRITICAL: { color: 'red', sound: true, persist: true },
  HIGH: { color: 'orange', sound: true, persist: false },
  MEDIUM: { color: 'yellow', sound: false, persist: false },
  LOW: { color: 'blue', sound: false, persist: false }
};
```

## Performance Considerations

### Optimization Strategies
- **Apollo Client Caching**: Normalized cache with smart cache policies
- **Chart.js Performance**: Canvas rendering with data decimation
- **React Optimization**: Memoization, lazy loading, virtualization
- **Bundle Splitting**: Dynamic imports for view components
- **Image Optimization**: Lazy loading and responsive images

### Monitoring
- **Bundle Analysis**: Use `npm run analyze` to inspect bundle size
- **Performance Metrics**: Core Web Vitals tracking integration
- **Memory Usage**: React DevTools Profiler integration
- **Network Requests**: Apollo Client DevTools monitoring

## API Requirements

### GraphQL Schema
The dashboard expects the GraphQL schema defined in `/lib/graphql/schema.graphql`. Key requirements:

- **Queries**: services, systemAnalysis, alerts, metrics
- **Mutations**: acknowledgeAlert, resolveAlert, restartService
- **Subscriptions**: serviceStatusChanged, alertTriggered, metricsUpdated

### Data Requirements
- Services must include health status and basic metadata
- Alerts must include severity, status, and trigger information  
- Metrics must include timestamps and numerical values
- System analysis must include health scores and recommendations

## Troubleshooting

### Common Issues

1. **GraphQL Connection Errors**
   - Verify API endpoint configuration
   - Check CORS settings on GraphQL server
   - Ensure WebSocket support is enabled

2. **Real-time Updates Not Working**
   - Confirm WebSocket URL is correct
   - Check browser WebSocket support
   - Verify subscription resolvers on server

3. **Chart Rendering Issues**
   - Ensure Chart.js dependencies are installed
   - Check for data format compatibility
   - Verify canvas element support

4. **Performance Issues**
   - Enable Apollo Client DevTools
   - Check for memory leaks in subscriptions
   - Optimize query frequency and caching

### Debug Mode
Enable debug logging:

```typescript
// Enable Apollo Client debug logging
const client = new ApolloClient({
  // ... other options
  connectToDevTools: process.env.NODE_ENV === 'development',
});

// Enable dashboard debug mode
localStorage.setItem('dashboard-debug', 'true');
```

## Contributing

### Development Setup
1. Install dependencies: `npm install`
2. Start GraphQL server (separate process)
3. Start Next.js dev server: `npm run dev`
4. Navigate to `http://localhost:3000/system-analyzer`

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier formatting
- Tailwind CSS for styling
- Functional components with hooks

### Testing
- Unit tests with Jest + Testing Library
- Integration tests for GraphQL operations
- Visual regression tests with Storybook
- E2E tests with Playwright

## Future Enhancements

### Planned Features
- **Advanced Filtering**: Custom filter builder with saved presets
- **Custom Dashboards**: User-configurable dashboard layouts
- **Export Capabilities**: PDF/CSV report generation
- **Incident Management**: Integrated incident response workflows
- **Machine Learning**: Predictive alerting and anomaly detection
- **Multi-tenant Support**: Organization-level data isolation

### Integration Opportunities
- **Slack/Teams Integration**: Alert notifications and bot commands
- **JIRA Integration**: Automatic ticket creation for critical alerts
- **Prometheus/Grafana**: Metric data source integration
- **AWS CloudWatch**: Native AWS service monitoring
- **Kubernetes**: Pod and deployment monitoring

---

*This dashboard provides a comprehensive foundation for system monitoring with room for extensive customization and integration with existing infrastructure.*