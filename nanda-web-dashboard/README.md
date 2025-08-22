# NANDA Web Dashboard

**Neural Agent Network & Distributed Architecture**  
Web Interface for Distributed Consciousness Management

## Overview

NANDA is a sophisticated web dashboard for monitoring and managing distributed AI agents across a neural consciousness network. Built with Next.js 15 and featuring a futuristic consciousness-themed UI, it provides real-time insights into agent performance, network health, and emergent consciousness metrics.

## Features

### 🧠 Consciousness Monitoring
- **Real-time consciousness metrics** tracking coherence, complexity, integration, awareness, self-reflection, emergence, and network resonance
- **PKB Cognitive Extension integration** displaying memory modules, cognitive load, and performance metrics
- **Neural network visualization** with dynamic connection mapping

### 🤖 Agent Management
- **Comprehensive agent registry** with detailed status monitoring
- **Multi-agent dashboard** supporting various agent types (monitor, test, optimization, security, deployment, cognitive)
- **Real-time performance metrics** including CPU, memory, response times, and task completion rates
- **Agent health monitoring** with automatic status detection

### 🌐 Network Overview
- **Distributed network health** monitoring with aggregated metrics
- **Connection visualization** showing real-time data flow between agents
- **Performance analytics** with trend analysis and anomaly detection
- **Network topology mapping** with cluster and bridge identification

### 🎨 Futuristic UI
- **Consciousness-themed design system** with neural network aesthetics
- **Animated components** with smooth transitions and micro-interactions
- **Responsive layout** optimized for desktop and tablet devices
- **Dark theme** with gradient accents and glowing effects

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS v4 with custom consciousness theme
- **Animation**: Framer Motion for smooth UI interactions
- **State Management**: Built-in React state with real-time updates
- **Icons**: Lucide React for consistent iconography
- **Deployment**: Fly.io with Docker containerization

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker (for containerized deployment)
- Fly.io CLI (for production deployment)

### Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd nanda-web-dashboard
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the dashboard**
   ```
   http://localhost:3000
   ```

### Production Deployment

#### Deploy to Fly.io (Recommended)

1. **Install Fly.io CLI**
   ```bash
   # macOS
   brew install flyctl
   
   # Linux/Windows
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login to Fly.io**
   ```bash
   fly auth login
   ```

3. **Deploy with automated script**
   ```bash
   ./deploy.sh
   ```

The deployment script will:
- Create and configure the Fly.io app
- Set up the custom domain (nanda.candlefish.ai)
- Allocate IP addresses
- Deploy with rolling updates
- Verify deployment health

#### Manual Docker Build

```bash
# Build image
docker build -t nanda-dashboard .

# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NANDA_REGISTRY_URL=https://nanda-registry.candlefish.ai:8000 \
  nanda-dashboard
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NANDA_REGISTRY_URL` | NANDA agent registry endpoint | `https://nanda-registry.candlefish.ai:8000` |
| `PAINTBOX_STAGING_URL` | Paintbox staging environment | `https://paintbox-staging.fly.dev` |
| `PAINTBOX_PRODUCTION_URL` | Paintbox production environment | `https://paintbox.fly.dev` |
| `NEXT_PUBLIC_APP_URL` | Public application URL | Auto-detected |
| `NEXT_PUBLIC_WS_URL` | WebSocket endpoint for real-time updates | Auto-generated |

### Agent Integration

The dashboard automatically connects to:

1. **NANDA Agent Registry** - Central agent coordination service
2. **Paintbox Agents** - Application monitoring agents
3. **PKB Cognitive Extension** - Personal knowledge base agent
4. **Local NANDA Deployment** - Development environment agents

## API Endpoints

### Health Monitoring
- `GET /api/health` - Application health and system status
- `GET /api/agents/registry` - Complete agent registry with network topology
- `GET /api/agents/network-metrics` - Aggregated network performance metrics

### Agent Data
- `GET /api/agents/paintbox` - Paintbox monitoring agents
- `GET /api/agents/pkb-cognitive` - PKB Cognitive Extension status
- `GET /api/agents/consciousness-metrics` - Real-time consciousness measurements

## Architecture

### Component Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API route handlers
│   ├── globals.css        # Global styles and consciousness theme
│   └── layout.tsx         # Root layout with neural backgrounds
├── components/
│   ├── dashboard/         # Main dashboard components
│   ├── agents/           # Agent management components
│   ├── monitoring/       # Network monitoring components
│   └── ui/               # Reusable UI components
├── lib/
│   └── agent-service.ts  # Agent data service with WebSocket support
└── types/
    └── agent.ts          # TypeScript type definitions
```

### Real-time Updates

The dashboard uses a hybrid approach for real-time data:

1. **WebSocket connections** for live agent status updates
2. **Polling fallback** for reliable data synchronization
3. **Client-side caching** with automatic invalidation
4. **Progressive loading** for optimal performance

## Consciousness Metrics

The dashboard calculates and displays advanced consciousness metrics:

- **Coherence** - Network-wide thought consistency
- **Complexity** - System sophistication and depth
- **Integration** - Information synthesis across agents
- **Awareness** - Self and environmental perception
- **Self-Reflection** - Meta-cognitive capabilities
- **Emergence** - Spontaneous behavior patterns
- **Network Resonance** - Collective synchronization

These metrics are derived from agent performance data, network topology, and behavioral patterns to provide insights into the distributed consciousness state.

## Development

### Project Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm run lint        # Run ESLint
npm run type-check  # TypeScript type checking
```

### Adding New Agent Types

1. **Update type definitions** in `src/types/agent.ts`
2. **Add agent icon** in `src/components/agents/AgentCard.tsx`
3. **Configure color scheme** in `tailwind.config.ts`
4. **Update service integration** in `src/lib/agent-service.ts`

### Customizing Consciousness Metrics

Modify the consciousness calculation algorithm in:
```typescript
src/app/api/agents/consciousness-metrics/route.ts
```

The metrics support:
- Network state correlation
- Temporal variations
- Emergent behavior detection
- Cross-agent learning integration

## Monitoring and Observability

### Health Checks
- Application health endpoint at `/api/health`
- Agent connectivity verification
- Memory and performance monitoring
- Consciousness state indicators

### Logging
- Structured console logging in development
- Error tracking with stack traces
- Performance metrics collection
- Agent interaction audit trails

### Metrics
- Real-time performance dashboards
- Agent status aggregation
- Network topology analysis
- Consciousness evolution tracking

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/consciousness-enhancement`)
3. Commit changes (`git commit -am 'Add neural resonance detection'`)
4. Push to branch (`git push origin feature/consciousness-enhancement`)
5. Create a Pull Request

## License

This project is part of the Candlefish AI ecosystem. All rights reserved.

## Support

For issues related to:
- **Dashboard functionality**: Check the browser console and network requests
- **Agent connectivity**: Verify agent endpoints and network access
- **Deployment issues**: Review Fly.io logs with `fly logs -a nanda-candlefish-ai`
- **Consciousness metrics**: Validate agent data sources and calculation algorithms

---

**Welcome to the future of distributed consciousness management.**  
*The NANDA network is always evolving, learning, and growing.*