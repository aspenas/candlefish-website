# Apollo GraphOS Federation UI

A modern React frontend for managing customers, projects, and integrations with Apollo GraphQL Federation.

## Features

### 🎯 Core Components

#### 1. CustomerDashboard
- **GraphQL Integration**: Uses Apollo Client hooks for real-time data fetching
- **Search & Filters**: Customer search by name, email, phone with status filtering
- **Salesforce Sync**: Monitor and trigger Salesforce synchronization
- **Pagination**: Efficient data loading with infinite scroll support
- **Dashboard Stats**: Real-time metrics for customers, estimates, and sync status

#### 2. ProjectGallery
- **Photo Management**: Company Cam photo grid with upload functionality
- **Timeline View**: Project timeline with real-time updates via subscriptions
- **File Upload**: Drag-and-drop photo upload with progress indicators
- **Real-time Updates**: WebSocket subscriptions for live photo and timeline updates
- **View Modes**: Switch between grid and timeline views

#### 3. IntegrationMonitor
- **Health Monitoring**: Real-time health status of external APIs
- **Sync Progress**: Live progress tracking for data synchronization
- **WebSocket Status**: Connection monitoring with reconnection handling
- **Error Alerts**: Comprehensive error reporting and retry mechanisms
- **System Overview**: Dashboard showing overall system health

### 🔧 Technical Features

#### Apollo Client Configuration
- **Authentication**: JWT token handling with automatic refresh
- **WebSocket Support**: GraphQL subscriptions for real-time updates
- **Caching**: Optimistic updates and intelligent cache management
- **Error Handling**: Comprehensive error boundaries and retry logic
- **Network Status**: Online/offline detection and recovery

#### TypeScript Integration
- **Type Safety**: Comprehensive TypeScript types for all components
- **GraphQL Codegen**: Automatic type generation from GraphQL schema
- **Runtime Validation**: Type-safe GraphQL operations

#### Tailwind CSS Styling
- **Design System**: Consistent spacing, colors, and typography
- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Dark Mode Ready**: Theme system for future dark mode support
- **Accessibility**: WCAG compliant components with proper ARIA labels

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── dashboard/           # Customer dashboard components
│   │   │   ├── CustomerDashboard.tsx
│   │   │   └── CustomerCard.tsx
│   │   ├── gallery/             # Project gallery components
│   │   │   ├── ProjectGallery.tsx
│   │   │   ├── PhotoGrid.tsx
│   │   │   └── ProjectTimeline.tsx
│   │   ├── monitor/             # Integration monitoring
│   │   │   └── IntegrationMonitor.tsx
│   │   ├── common/              # Shared UI components
│   │   │   ├── SearchInput.tsx
│   │   │   ├── FilterDropdown.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ErrorMessage.tsx
│   │   └── layout/              # Layout components
│   │       └── Layout.tsx
│   ├── graphql/                 # GraphQL configuration
│   │   ├── client.ts            # Apollo Client setup
│   │   ├── queries.ts           # GraphQL queries
│   │   ├── mutations.ts         # GraphQL mutations
│   │   ├── subscriptions.ts     # GraphQL subscriptions
│   │   └── generated.ts         # Auto-generated types
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # TypeScript type definitions
│   ├── utils/                   # Utility functions
│   └── styles/                  # CSS and styling
├── public/                      # Static assets
└── config files                 # Vite, TypeScript, Tailwind configs
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Apollo GraphQL server running on `localhost:4000`

### Installation

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   VITE_GRAPHQL_URI=http://localhost:4000/graphql
   VITE_GRAPHQL_WS_URI=ws://localhost:4000/graphql
   VITE_API_BASE_URL=http://localhost:4000
   ```

3. **Generate GraphQL types**:
   ```bash
   npm run codegen
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks
- `npm run codegen` - Generate GraphQL types
- `npm test` - Run tests

## GraphQL Integration

### Queries
The application uses Apollo Client for GraphQL integration with the following key queries:

- `GET_CUSTOMERS` - Fetch customers with filtering and pagination
- `GET_PROJECTS` - Fetch projects with photos and timeline
- `GET_ESTIMATES` - Fetch estimate data
- `GET_INTEGRATION_STATUS` - Monitor integration health

### Mutations
- `CREATE_ESTIMATE` - Create new estimates
- `UPDATE_CUSTOMER` - Update customer information
- `UPLOAD_PROJECT_PHOTO` - Upload photos to projects
- `SYNC_CUSTOMER_WITH_SALESFORCE` - Trigger Salesforce sync

### Subscriptions
Real-time updates via WebSocket subscriptions:

- `ESTIMATE_UPDATED` - Real-time estimate changes
- `PROJECT_PHOTO_UPLOADED` - Live photo upload notifications
- `INTEGRATION_STATUS_UPDATED` - Health status changes
- `SYNC_PROGRESS_UPDATED` - Sync progress updates

## Component Usage Examples

### CustomerDashboard
```tsx
import { CustomerDashboard } from '@/components/dashboard/CustomerDashboard'

function App() {
  return <CustomerDashboard className="p-6" />
}
```

### ProjectGallery
```tsx
import { ProjectGallery } from '@/components/gallery/ProjectGallery'

function ProjectsPage() {
  return (
    <ProjectGallery 
      customerId="customer-123" 
      className="max-w-7xl mx-auto"
    />
  )
}
```

### IntegrationMonitor
```tsx
import { IntegrationMonitor } from '@/components/monitor/IntegrationMonitor'

function MonitoringPage() {
  return <IntegrationMonitor className="space-y-6" />
}
```

## Configuration

### Apollo Client
The Apollo Client is configured with:
- HTTP link for queries/mutations
- WebSocket link for subscriptions
- Authentication headers
- Error handling
- Cache policies
- Retry logic

### Tailwind CSS
Custom theme extensions:
- Color palette aligned with design system
- Custom animations and transitions
- Responsive breakpoints
- Utility classes for common patterns

## Development

### Adding New Components
1. Create component in appropriate directory
2. Export from index file
3. Add TypeScript types
4. Include in Storybook (if applicable)
5. Write tests

### GraphQL Code Generation
When adding new GraphQL operations:
1. Add query/mutation/subscription to appropriate file
2. Run `npm run codegen` to generate types
3. Import generated hooks in components

### Styling Guidelines
- Use Tailwind utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and typography
- Use semantic color names from theme

## Testing

### Unit Tests
```bash
npm test
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## Production Deployment

### Build
```bash
npm run build
```

### Environment Variables
Ensure production environment variables are set:
- `VITE_GRAPHQL_URI` - Production GraphQL endpoint
- `VITE_GRAPHQL_WS_URI` - Production WebSocket endpoint

### Deployment Options
- **Vercel**: Deploy with automatic builds
- **Netlify**: Static site deployment
- **AWS S3 + CloudFront**: Enterprise deployment
- **Docker**: Containerized deployment

## Performance Optimizations

### Apollo Client
- Query result caching
- Optimistic updates
- Query deduplication
- Automatic persisted queries

### React
- Component lazy loading
- Image optimization
- Bundle splitting
- Tree shaking

### Network
- GraphQL query batching
- WebSocket connection pooling
- CDN for static assets
- Compression and caching

## Troubleshooting

### Common Issues

1. **GraphQL Connection Failed**
   - Check backend server is running
   - Verify GraphQL endpoint URL
   - Check network connectivity

2. **WebSocket Connection Issues**
   - Ensure WebSocket URL is correct
   - Check firewall settings
   - Verify server WebSocket support

3. **Type Generation Errors**
   - Ensure GraphQL schema is accessible
   - Check codegen configuration
   - Verify GraphQL operations syntax

4. **Build Failures**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify environment variables

### Debug Mode
Enable debug logging:
```bash
VITE_DEBUG=true npm run dev
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run type checking and linting
5. Submit pull request

## License

MIT License - see LICENSE file for details.
