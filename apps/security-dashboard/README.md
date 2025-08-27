# Candlefish Security Dashboard

A comprehensive, real-time security operations center (SOC) dashboard built with React 18, TypeScript, and Tailwind CSS. Features include real-time threat detection, incident management, security event timeline, and compliance reporting.

## 🚀 Features

- **Real-time Security Monitoring**: Live WebSocket updates for security events and threats
- **Security Event Timeline**: Comprehensive event tracking with filtering and search
- **Threat Detection Panel**: Advanced threat monitoring with severity indicators
- **Incident Management**: Kanban-style workflow for security incident response
- **Compliance Dashboard**: Reporting and audit management
- **User Management**: Role-based access control (RBAC)
- **Grafana Integration**: Embedded dashboards from existing monitoring
- **Dark Theme SOC UI**: Optimized for security operations center environments
- **Mobile Responsive**: Fully responsive design for all screen sizes
- **JWT Authentication**: Secure RS256 token-based authentication

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Query** for API state management
- **Socket.io Client** for WebSocket connections
- **Recharts** for data visualization
- **React Hook Form** for form handling
- **Zustand** for global state management
- **React Router DOM** for navigation
- **Heroicons** for icons

### Backend Integration
- REST API endpoints at `http://localhost:4000/api/v1`
- WebSocket connection at `ws://localhost:4000/ws`
- JWT RS256 authentication
- Real-time event streaming

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── dashboard/      # Main dashboard components
│   ├── events/         # Security event components
│   ├── threats/        # Threat detection components
│   ├── incidents/      # Incident management components
│   ├── layout/         # Layout components
│   ├── notifications/  # Notification system
│   └── ui/            # Base UI components
├── hooks/              # React Query hooks and API integration
├── lib/                # Utility libraries and API client
├── pages/              # Route components
├── store/              # Zustand stores
├── styles/             # Global styles and Tailwind config
└── types/              # TypeScript type definitions
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Backend API server running on port 4000
- Grafana instance (optional, running on port 3003)

### Installation

1. **Install dependencies:**
   ```bash
   cd apps/security-dashboard
   npm install
   ```

2. **Set environment variables:**
   ```bash
   # .env.local
   VITE_API_BASE_URL=http://localhost:4000/api/v1
   VITE_WS_URL=ws://localhost:4000/ws
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:5173`

### Demo Login
- **Email**: admin@candlefish.ai
- **Password**: admin123

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
