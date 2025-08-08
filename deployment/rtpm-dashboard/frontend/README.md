# RTPM Dashboard Frontend

A modern React-based frontend for the Real-time Performance Monitoring (RTPM) Dashboard, providing comprehensive system monitoring, deployment tracking, and infrastructure management capabilities.

## 🚀 Features

- **Real-time Monitoring**: Live metrics, alerts, and system health monitoring via WebSocket connections
- **Authentication**: JWT-based authentication with role-based access control (Admin, Operator, Viewer)
- **Interactive Dashboard**: Real-time charts, metrics cards, and monitoring controls
- **Infrastructure Management**: DNS, SSL, Kubernetes, and deployment status monitoring
- **Responsive Design**: Mobile-first design with Material-UI components
- **Performance Optimized**: Code splitting, lazy loading, and optimized bundle size
- **Production Ready**: Docker containerization with Nginx, security headers, and health checks

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Library**: Material-UI (MUI) 5
- **State Management**: Zustand with persistence
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts
- **WebSocket**: Socket.IO Client
- **Authentication**: JWT with automatic refresh
- **Build Tool**: Vite with fast HMR
- **Production Server**: Nginx with optimized configuration

## 📦 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Docker build and run
docker build -t rtpm-dashboard-frontend .
docker run -p 3000:80 rtpm-dashboard-frontend
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env.development` for local development:

```bash
cp .env.example .env.development
```

Key configuration options:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws/metrics

# Feature Flags
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_DEMO_MODE=true
VITE_ENABLE_WEBSOCKET=true

# Performance
VITE_METRICS_REFRESH_INTERVAL=30000
VITE_METRICS_MAX_DATA_POINTS=1000
```

### Demo Mode

The application includes a demo mode for testing without a backend:

- **Demo Email**: <admin@example.com>
- **Demo Password**: admin123
- **Demo Role**: Admin (full access)

## 🏗 Architecture

### Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── panels/         # Dashboard panels
│   │   └── ui/            # Base UI components
│   ├── hooks/              # Custom React hooks
│   ├── layouts/            # Page layouts
│   ├── pages/              # Route components
│   ├── router/             # Routing configuration
│   ├── services/           # API services
│   ├── store/              # Zustand stores
│   ├── styles/             # Global styles
│   ├── theme/              # MUI theme configuration
│   └── types/              # TypeScript types
├── public/                 # Static assets
├── nginx/                  # Nginx configuration
├── scripts/                # Build and utility scripts
└── docker-compose.yml      # Docker services
```

### State Management

The application uses Zustand for lightweight state management:

- **authStore**: User authentication, JWT tokens, roles/permissions
- **metricsStore**: Real-time metrics, alerts, system health, WebSocket connection

### Real-time Features

- **WebSocket Connection**: Automatic connection with reconnection logic
- **Live Metrics**: CPU, memory, disk usage, response times, error rates
- **Alert System**: Critical, warning, and info alerts with acknowledgment
- **System Health**: Service status monitoring with real-time updates

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication with automatic refresh
- **Role-Based Access Control**: Admin, Operator, and Viewer roles with different permissions
- **Security Headers**: CSP, HSTS, XSS protection, frame options
- **Input Validation**: Client-side validation with sanitization
- **HTTPS Enforcement**: Production HTTPS enforcement with HSTS

## 🐳 Docker Deployment

### Single Container

```bash
# Build production image
docker build -t rtpm-dashboard-frontend .

# Run container
docker run -d \
  --name rtpm-frontend \
  -p 3000:80 \
  -e VITE_API_BASE_URL=http://your-api-server/api/v1 \
  rtpm-dashboard-frontend
```

### Full Stack with Docker Compose

```bash
# Start all services
docker-compose up -d

# Start with monitoring stack
docker-compose --profile monitoring up -d

# Development mode with hot reload
docker-compose --profile dev up -d frontend-dev
```

### Health Checks

The Docker container includes comprehensive health checks:

- Nginx process monitoring
- HTTP endpoint verification
- File system checks
- Resource utilization monitoring

## 📊 Monitoring Integration

### Existing Panel Components

The dashboard integrates several pre-built monitoring panels:

- **DNS Management Panel**: DNS records, SSL certificates, propagation status
- **Infrastructure Status Panel**: Resource utilization, cost analysis, terraform status
- **Kubernetes Panel**: Deployment status, pod health, scaling controls
- **Validation Results Panel**: Pre/post deployment validations, performance tests

### Metrics Dashboard

- **Real-time Charts**: CPU, memory, disk, network, response time trends
- **Alert Management**: Critical alert display with acknowledgment workflow
- **System Health**: Overall system status with service-level details
- **Custom Queries**: Prometheus-style metric queries with visualization

## 🎨 Customization

### Theming

The application uses Material-UI's theming system with custom modifications:

```typescript
// src/theme/theme.ts
export const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    // ... custom colors
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          // ... custom styles
        }
      }
    }
  }
});
```

### Adding New Metrics

1. Update the metrics store with new metric types
2. Add data fetching in the metrics API service
3. Create visualization components
4. Add to the dashboard layout

### Custom Panels

Create new monitoring panels by extending the existing panel structure:

```typescript
// src/components/panels/CustomPanel.tsx
const CustomPanel: React.FC = () => {
  const { data, isLoading } = useMetrics(['custom_metric']);

  return (
    <Card>
      <CardHeader title="Custom Panel" />
      <CardContent>
        {/* Panel content */}
      </CardContent>
    </Card>
  );
};
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests (requires backend)
npm run test:e2e

# Lint code
npm run lint

# Format code
npm run format
```

## 📈 Performance

### Bundle Size Optimization

- Code splitting at route level
- Dynamic imports for heavy components
- Tree shaking for unused code elimination
- Compressed assets with Gzip/Brotli

### Runtime Performance

- React.memo for component memoization
- useMemo and useCallback for expensive computations
- Virtualized lists for large datasets
- Debounced search and input handling

### Monitoring

- Web Vitals integration for Core Web Vitals tracking
- Performance observer for navigation timing
- Error boundary for error tracking
- Real-time connection monitoring

## 🚀 Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Security headers enabled
- [ ] Monitoring endpoints configured
- [ ] Health checks verified
- [ ] Performance optimizations applied
- [ ] Error reporting configured

### CI/CD Pipeline

The application is designed to work with standard CI/CD pipelines:

1. **Build Stage**: `npm run build`
2. **Test Stage**: `npm run test`
3. **Docker Build**: Multi-stage Dockerfile
4. **Deploy**: Container orchestration (K8s, Docker Swarm)

## 📝 API Integration

The frontend expects a backend API with these endpoints:

- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/metrics/aggregated` - Metrics data
- `GET /api/v1/alerts/active` - Active alerts
- `GET /api/v1/health` - System health
- `WS /ws/metrics` - Real-time WebSocket

See the backend API documentation for detailed specifications.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Check the [Issues](https://github.com/your-org/rtpm-dashboard/issues) page
- Review the [Documentation](https://docs.your-domain.com)
- Contact the development team

---

Built with ❤️ by the RTPM Dashboard Team
