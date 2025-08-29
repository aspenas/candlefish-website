# CLOS Web Dashboard

Real-time monitoring and management dashboard for the Candlefish Localhost Orchestration System.

## Features

- **Real-time Service Monitoring**: Live status updates via WebSocket
- **Port Management**: Visual port allocation map and conflict resolution
- **Service Control**: Start/stop/restart services from the UI
- **Log Viewer**: Stream logs from any service
- **Health Monitoring**: Service health checks and metrics
- **Network Topology**: Interactive service dependency visualization

## Quick Start

```bash
# Install dependencies
cd /Users/patricksmith/candlefish-ai/clos/web-dashboard
npm install

# Start development server
npm run dev

# Open http://localhost:3500
```

## Architecture

- **Frontend**: Next.js 14 with App Router
- **State Management**: React Query + WebSocket
- **UI Components**: Radix UI + Tailwind CSS
- **Charts**: Recharts for metrics visualization
- **Real-time**: Socket.IO for live updates

## API Integration

The dashboard connects to the CLOS API on port 4200 (to be implemented) for:
- Service status
- Port registry
- Health checks
- Log streaming
- Configuration management

## Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

The dashboard will be accessible at `http://dashboard.local` via Caddy reverse proxy.