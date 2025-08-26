# Candlefish Security Dashboard

A comprehensive, real-time security monitoring dashboard built with React, TypeScript, Apollo Client, and Material-UI. Designed specifically for Security Operations Centers (SOC) with dark mode optimization and enterprise-grade features.

## 🚀 Features

### Core Security Monitoring
- **Real-time Security Overview** - Live dashboard with key security metrics
- **Kong API Gateway Monitoring** - Critical HTTP vulnerability detection and alerts
- **Vulnerability Management** - Track, prioritize, and remediate security vulnerabilities
- **Alert Management** - Incident response workflows with escalation and assignment
- **Asset Inventory** - Multi-platform asset discovery and monitoring (AWS, Netlify, Vercel, Kubernetes, etc.)
- **Compliance Reporting** - Automated compliance assessments and reporting

### Real-time Capabilities
- **WebSocket Subscriptions** - Live updates for security events, alerts, and status changes
- **1000+ Concurrent Connections** - Optimized for large security operations teams
- **Real-time Charts** - Live vulnerability trends and threat activity monitoring

### Enterprise Features
- **Dark Mode Optimized** - Designed for 24/7 SOC environments
- **Accessibility Compliant** - WCAG 2.1 AA compliant for all users
- **Performance Optimized** - Code splitting, lazy loading, and caching strategies
- **Mobile Responsive** - Full functionality on desktop and tablet devices

## 🛠 Technology Stack

- **Frontend**: React 18+ with TypeScript
- **GraphQL**: Apollo Client with subscriptions and caching
- **UI Framework**: Material-UI (MUI) with custom security-focused theme
- **Charts**: Recharts with D3.js for advanced visualizations  
- **State Management**: Zustand for client-side state
- **Real-time**: GraphQL subscriptions over WebSocket
- **Build Tool**: Vite with PWA support
- **Testing**: Vitest with React Testing Library

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_GRAPHQL_HTTP_URI=https://api.candlefish.ai/graphql
VITE_GRAPHQL_WS_URI=wss://api.candlefish.ai/graphql
VITE_APP_ENV=development
```

## 📱 Component Architecture

### Layout Components
- `DashboardLayout` - Main application layout with navigation and header
- `Navigation` - Sidebar navigation with security-focused organization
- `ThemeProvider` - Dark mode optimized theme for SOC environments

### Monitoring Components
- `SecurityOverview` - Main dashboard with key metrics and alerts
- `KongSecurityStatus` - Real-time Kong API Gateway security monitoring
- `RecentAlertsPanel` - Live feed of security alerts and incidents

### Visualization Components
- `VulnerabilityTrendsChart` - Historical vulnerability data with filtering
- `ThreatActivityChart` - Real-time threat activity visualization
- `SecurityMetricsGrid` - Key performance indicators grid

### Management Interfaces
- `AlertManagement` - Alert triage, assignment, and resolution
- `AssetManagement` - Multi-platform asset inventory and health
- `VulnerabilityManagement` - Vulnerability lifecycle management
- `ComplianceDashboard` - Compliance frameworks and reporting

## 🔐 Security Features

### Kong Gateway Monitoring
- **HTTP Vulnerability Detection** - Immediate alerts for insecure Kong Admin API
- **Real-time Status Updates** - Live monitoring of Kong security configuration
- **Automated Remediation** - Guided security configuration improvements

### Multi-Platform Asset Support
- **Cloud Providers**: AWS, Azure, Google Cloud
- **Container Platforms**: Kubernetes, Docker
- **Hosting Platforms**: Netlify, Vercel, Fly.io, Heroku
- **On-premise Infrastructure**: Traditional servers and network devices

### Real-time Alerting
- **Severity-based Classification** - Critical, High, Medium, Low severity levels
- **Intelligent Routing** - Automatic assignment based on alert type and severity
- **Escalation Workflows** - Time-based escalation for unaddressed alerts
- **Multi-channel Notifications** - Email, Slack, webhook integration

## 🎨 Design System

### Color Palette (Dark Mode Optimized)
- **Critical**: `#d32f2f` - Critical threats and vulnerabilities
- **High**: `#f57c00` - High severity issues  
- **Medium**: `#fbc02d` - Medium severity warnings
- **Low**: `#388e3c` - Low severity or resolved issues
- **Kong Status**: Specialized colors for Kong security states

### Typography
- **Primary Font**: System font stack for optimal readability
- **Monospace**: Fira Code for technical data and logs
- **Hierarchy**: Clear H1-H6 hierarchy optimized for dashboard scanning

### Accessibility
- **High Contrast**: Optimized text contrast for 24/7 viewing
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Comprehensive ARIA labels and announcements
- **Focus Management**: Clear focus indicators and logical tab order

## 📊 Performance Optimizations

### Code Splitting
- **Route-based Splitting** - Each page loaded on demand
- **Component-level Splitting** - Heavy components lazy loaded
- **Vendor Chunking** - Separate chunks for external libraries

### Caching Strategy
- **Apollo Client Caching** - Intelligent GraphQL result caching
- **Service Worker Caching** - Offline support for core functionality
- **CDN Integration** - Static asset delivery optimization

### Bundle Analysis
```bash
# Analyze bundle size
pnpm build
pnpm preview

# Bundle analyzer (if configured)
pnpm analyze
```

## 🧪 Testing Strategy

### Test Categories
- **Unit Tests** - Individual component and utility testing
- **Integration Tests** - Component interaction testing
- **E2E Tests** - End-to-end user workflow testing
- **Accessibility Tests** - WCAG compliance verification

### Running Tests
```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Coverage reporting
pnpm test:coverage

# UI testing interface
pnpm test:ui
```

### Test Coverage Goals
- **Branches**: 80%+ coverage
- **Functions**: 80%+ coverage  
- **Lines**: 80%+ coverage
- **Statements**: 80%+ coverage

## 🚀 Deployment

### Build Process
```bash
# Production build
pnpm build

# Preview production build
pnpm preview
```

### Environment-specific Builds
- **Development**: Full debugging, hot reload
- **Staging**: Production build with debugging
- **Production**: Optimized, minified, no debugging

### PWA Support
- **Service Worker** - Offline functionality for critical features
- **App Manifest** - Installable web app
- **Push Notifications** - Critical security alert notifications

## 📈 Monitoring & Analytics

### Performance Monitoring
- **Core Web Vitals** - LCP, FID, CLS tracking
- **Bundle Analysis** - Asset size and load time monitoring
- **Error Tracking** - Comprehensive error logging and reporting

### Security Monitoring
- **CSP Headers** - Content Security Policy enforcement
- **HTTPS Only** - Secure transport layer requirements
- **Input Validation** - Client-side input sanitization

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run the test suite (`pnpm test`)
5. Run type checking (`pnpm type-check`)
6. Run linting (`pnpm lint:fix`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Code Standards
- **TypeScript** - Strict type checking required
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting (integrated with ESLint)
- **Conventional Commits** - Standardized commit messages

### Review Process
- All code changes require review
- Automated tests must pass
- Type checking must pass
- Accessibility tests must pass
- Performance budget must be maintained

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Email: security-dashboard@candlefish.ai
- Documentation: [Security Dashboard Docs](https://docs.candlefish.ai/security-dashboard)

---

**Security Dashboard v1.0.0** - Built with ❤️ for Security Operations Centers
