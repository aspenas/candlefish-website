# Tyler Setup Frontend

A comprehensive React frontend for the Tyler Setup platform, providing a modern web interface for managing development environment setup with GraphQL API integration, real-time telemetry, and secret validation.

## Features

- **Real-time Dashboard** - Live analytics and system monitoring
- **Authentication & Authorization** - JWT-based auth with role-based access control
- **Contractor Management** - Invite and manage temporary contractor access
- **AWS Secrets Integration** - Secure secret management interface
- **Audit Logging** - Comprehensive audit trail with real-time updates
- **Responsive Design** - Mobile-first design with dark mode support
- **PWA Support** - Offline capabilities and app-like experience

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **State Management**: Apollo Client, Zustand
- **UI Framework**: Tailwind CSS, Radix UI
- **Charts**: Recharts
- **Forms**: React Hook Form, Zod validation
- **Real-time**: GraphQL subscriptions over WebSocket

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Access to the Tyler Setup GraphQL API

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tyler-setup/frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Update environment variables:
```bash
# .env.local
VITE_GRAPHQL_ENDPOINT=https://your-api-endpoint/graphql
VITE_WS_ENDPOINT=wss://your-api-endpoint/graphql
```

5. Start development server:
```bash
pnpm dev
```

### Building for Production

```bash
# Build the application
pnpm build

# Preview the production build
pnpm preview
```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (buttons, inputs, etc.)
│   ├── layout/          # Layout components (sidebar, header)
│   ├── dashboard/       # Dashboard-specific components
│   └── contractors/     # Contractor management components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and configurations
│   ├── apollo.ts        # Apollo Client setup
│   ├── utils.ts         # Utility functions
│   └── graphql/         # GraphQL operations
├── pages/               # Page components
└── types/               # TypeScript type definitions
```

## Key Features

### Authentication
- JWT-based authentication with refresh tokens
- Role-based access control (Admin, User, Contractor)
- Protected routes and permission-based UI
- Automatic token refresh and session management

### Real-time Updates
- WebSocket subscriptions for live data
- Real-time audit events and notifications
- Live dashboard metrics and charts
- System health monitoring

### Contractor Management
- Invite contractors with custom permissions
- Time-limited access controls
- Usage tracking and analytics
- Bulk operations and filtering

### Data Management
- Apollo Client for GraphQL operations
- Optimistic UI updates
- Cache management and persistence
- Offline support with cache restoration

## Development

### Code Style
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety
- Conventional commit messages

### Testing
```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Type checking
pnpm type-check
```

### Code Generation
```bash
# Generate GraphQL types from schema
pnpm generate-types
```

## Deployment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GRAPHQL_ENDPOINT` | GraphQL API endpoint | - |
| `VITE_WS_ENDPOINT` | WebSocket endpoint for subscriptions | - |
| `VITE_APP_NAME` | Application name | Tyler Setup Management System |
| `VITE_APP_VERSION` | Application version | 1.0.0 |

### Production Build

The application is optimized for production deployment with:
- Code splitting and lazy loading
- PWA capabilities with offline support
- CDN-ready static assets
- Gzip compression
- Bundle analysis and optimization

### Hosting Options

- **Static Hosting**: Deploy to AWS S3, Netlify, or Vercel
- **Container**: Use the included Dockerfile
- **CDN**: CloudFront or similar for global distribution

## Security

- CSP headers for XSS protection
- Secure authentication flow
- Input validation and sanitization
- HTTPS enforcement
- Audit logging for all actions

## Performance

- Lazy loading of routes and components
- Apollo Client caching strategies
- Image optimization
- Bundle splitting
- Service worker for caching

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

Private - Candlefish AI
