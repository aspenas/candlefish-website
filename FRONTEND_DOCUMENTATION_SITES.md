# Candlefish AI Documentation Sites

This repository contains three interconnected documentation sites for the Candlefish AI platform, built with Next.js 15, TypeScript, and a shared component architecture.

## 🏗️ Architecture Overview

### Sites Structure

1. **docs.candlefish.ai** (`apps/docs-site`) - Technical documentation and guides
2. **partners.candlefish.ai** (`apps/partners-site`) - Partner portal with operator network
3. **api.candlefish.ai** (`apps/api-site`) - Interactive API reference

### Shared Components (`packages/shared`)

All sites share a common design system and component library that includes:

- **UI Components**: Buttons, cards, inputs, badges with Candlefish branding
- **Layout Components**: Navigation, footer with site-specific configurations
- **Content Components**: Code blocks with syntax highlighting, search dialog
- **GraphQL Client**: Apollo Client with authentication and real-time subscriptions
- **Utilities**: Formatting, debouncing, and common helper functions

## 🎨 Design Philosophy

Built on Candlefish's core principles:

- **Operational Craft**: Focus on functionality and maintainability
- **Systems that Outlive Creators**: Clear, well-documented code architecture
- **Evolutionary not Revolutionary**: Building on proven patterns
- **Workshop Notes Aesthetic**: Minimalist, thoughtful design

### Brand Colors

- **Charcoal**: `#1A1A1A` - Primary text and headings
- **Warm White**: `#FAFAF8` - Background color
- **Amber Flame**: `#FFB347` - Primary accent (docs site)
- **Deep Indigo**: `#3A3A60` - Secondary accent (partners site)
- **Emerald**: `#10b981` - API-specific accent (api site)
- **Slate**: `#6B6B6B` - Secondary text
- **Muted Sand**: `#D8D3C4` - Subtle backgrounds

## 📁 Repository Structure

```
candlefish-ai/
├── packages/
│   └── shared/                    # Shared component library
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/           # Base UI components
│       │   │   ├── layout/       # Navigation, Footer
│       │   │   ├── content/      # CodeBlock, etc.
│       │   │   └── search/       # SearchDialog
│       │   ├── lib/
│       │   │   ├── utils.ts      # Utility functions
│       │   │   └── apollo-client.ts # GraphQL setup
│       │   └── index.ts          # Exports
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── docs-site/                # docs.candlefish.ai
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── globals.css
│   │   │   └── components/
│   │   │       └── sections/     # Page sections
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   ├── partners-site/            # partners.candlefish.ai
│   │   ├── src/
│   │   │   ├── app/
│   │   │   └── components/
│   │   └── [config files]
│   └── api-site/                 # api.candlefish.ai
│       ├── src/
│       │   ├── app/
│       │   └── components/
│       └── [config files]
├── graphql/                      # Backend GraphQL API
│   ├── schema.graphql
│   ├── server.ts
│   ├── context.ts
│   ├── federation.ts
│   ├── queries.ts
│   └── resolvers/
└── pnpm-workspace.yaml
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm package manager
- GraphQL backend running (see graphql/ directory)

### Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Build shared components**:
   ```bash
   cd packages/shared
   pnpm build
   ```

3. **Start development servers**:
   ```bash
   # Documentation site (port 3001)
   cd apps/docs-site
   pnpm dev

   # Partners site (port 3002)  
   cd apps/partners-site
   pnpm dev

   # API site (port 3003)
   cd apps/api-site
   pnpm dev
   ```

4. **Start GraphQL backend**:
   ```bash
   cd graphql
   pnpm install
   pnpm dev  # Usually runs on port 4000
   ```

### Environment Variables

Each site supports the following environment variables:

```bash
# GraphQL API endpoints
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT=ws://localhost:4000/graphql

# For API site specifically
OPENAPI_SPEC_URL=http://localhost:4000/openapi.json

# SEO
GOOGLE_SITE_VERIFICATION=your_verification_code
```

## 🏃‍♂️ Development

### Building for Production

```bash
# Build all sites
pnpm build

# Or build individual sites
cd apps/docs-site && pnpm build
cd apps/partners-site && pnpm build
cd apps/api-site && pnpm build
```

### Linting and Type Checking

```bash
# Lint all sites
pnpm lint

# Type check
pnpm typecheck
```

## 🔧 Key Features

### Documentation Site (docs.candlefish.ai)

- **Hero Section**: Welcome with quick stats and search
- **Quick Start Guide**: Step-by-step implementation
- **Featured Guides**: GraphQL-powered content with real-time updates
- **Popular Topics**: Categorized topic exploration
- **Search**: Full-text search with keyboard shortcuts
- **Code Examples**: Syntax-highlighted code blocks

### Partners Site (partners.candlefish.ai) 

- **Partner Directory**: Searchable, filterable partner listings
- **Operator Network**: Real-time operator availability
- **Success Stories**: Case studies and testimonials
- **Partner Application**: Multi-step application form
- **Tier System**: Gold/Silver/Bronze partner tiers
- **Performance Metrics**: Partner statistics and ratings

### API Site (api.candlefish.ai)

- **Interactive Playground**: Live API testing
- **Endpoint Documentation**: Auto-generated from OpenAPI spec
- **SDK Showcase**: Multi-language SDK examples
- **Real-time Status**: API health monitoring
- **Rate Limiting**: Visual rate limit indicators
- **Authentication**: OAuth and API key management

## 🔌 GraphQL Integration

All sites use Apollo Client for GraphQL integration with:

- **Authentication**: JWT token management
- **Real-time Subscriptions**: Live updates via WebSockets
- **Caching**: Intelligent caching with pagination support
- **Error Handling**: Comprehensive error boundaries
- **DataLoader Pattern**: N+1 query prevention

### Key Queries

- `GET_FEATURED_DOCUMENTATION` - Homepage content
- `GET_ALL_PARTNERS` - Partner directory with filtering
- `GET_OPERATORS` - Real-time operator availability  
- `GET_API_REFERENCES` - API endpoint documentation
- `SEARCH_CONTENT` - Global search across all content types

### Subscriptions

- `documentationUpdated` - Live documentation changes
- `partnerStatusChanged` - Partner status updates
- `operatorAvailabilityChanged` - Real-time operator updates
- `systemNotification` - System-wide notifications

## 🎨 Component Architecture

### Shared Component Library

The shared package provides:

#### UI Components
- `Button` - Multi-variant button with Candlefish styling
- `Card` - Glass-morphism cards with hover effects
- `Input` - Form inputs with focus states
- `Badge` - Status and category badges

#### Layout Components  
- `Navigation` - Site-specific navigation with search
- `Footer` - Branded footer with site-appropriate links

#### Content Components
- `CodeBlock` - Syntax highlighted code with copy functionality
- `SearchDialog` - Global search with keyboard navigation

#### Utilities
- Apollo Client setup with authentication
- Common utility functions (formatting, debouncing, etc.)
- TypeScript types and interfaces

### Site-Specific Components

Each site has custom sections while sharing the core components:

- **Docs**: HeroSection, QuickStartSection, FeaturedGuides, PopularTopics
- **Partners**: HeroSection, PartnerDirectory, OperatorNetwork, SuccessStories
- **API**: HeroSection, QuickStart, EndpointShowcase, InteractivePlayground

## 🌐 Deployment

### Build Process

1. **Shared Library**: Built first as dependency for all sites
2. **Site Builds**: Each site builds independently using shared components
3. **GraphQL Schema**: Federation-ready schema for distributed deployment
4. **Environment Configuration**: Site-specific environment variables

### Deployment Targets

- **Documentation**: Vercel/Netlify static hosting
- **Partners**: Server-side rendering for dynamic content
- **API**: Edge deployment for global performance
- **GraphQL**: Container deployment with federation support

## 📊 Performance Considerations

### Frontend Optimizations

- **Code Splitting**: Automatic Next.js code splitting
- **Image Optimization**: Next.js Image component
- **Tree Shaking**: Shared component optimizations
- **Bundle Analysis**: Build-time bundle size reporting

### Backend Optimizations  

- **DataLoader**: N+1 query prevention
- **Caching**: Redis-backed GraphQL caching
- **Federation**: Distributed GraphQL architecture
- **Real-time**: Efficient WebSocket subscriptions

## 🔒 Security

### Authentication

- JWT tokens with refresh mechanism
- Role-based access control (RBAC)
- OAuth integration for partner portal
- API key management for developers

### Security Headers

- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## 🧪 Testing

### Unit Tests
- Jest for utility functions
- React Testing Library for components
- Apollo Client MockedProvider for GraphQL

### E2E Tests
- Playwright for critical user journeys
- Cross-browser testing
- Performance testing with Lighthouse

### API Tests
- GraphQL query validation
- Schema compliance testing
- Real-time subscription testing

## 📈 Analytics & Monitoring

### Performance Monitoring
- Core Web Vitals tracking
- Real User Monitoring (RUM)
- Error tracking and alerting
- GraphQL query performance

### User Analytics
- Page view tracking
- Search query analytics
- Partner application funnel
- API usage metrics

## 🛠️ Development Tools

### Code Quality
- ESLint with Next.js config
- Prettier code formatting
- TypeScript strict mode
- Husky git hooks

### Development Experience
- Fast Refresh for instant updates
- TypeScript IntelliSense
- GraphQL Code Generator
- Component Storybook (planned)

## 📚 Documentation

### Code Documentation
- TSDoc comments for all public APIs
- README files for each package
- Architecture decision records (ADRs)
- API schema documentation

### User Documentation  
- Getting started guides
- Component usage examples
- GraphQL query examples
- Deployment guides

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch from `main`
3. Implement changes with tests
4. Submit pull request with description

### Code Standards
- Follow TypeScript strict mode
- Use semantic commit messages
- Maintain test coverage above 80%
- Document public APIs with TSDoc

---

Built with operational craft by the Candlefish AI team. This implementation embodies our philosophy of building systems that outlive their creators through thoughtful engineering and comprehensive documentation.