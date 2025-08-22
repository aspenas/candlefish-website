# NANDA Index - Autonomous Agent System

## 🤖 Overview

NANDA Index is the autonomous agent coordination system for the Candlefish platform.

## 🚀 Quick Start

### Local Development

```bash
# From service directory
pnpm install
pnpm dev

# Service runs on http://localhost:8080
```

### Environment Variables

```bash
# Load from AWS Secrets Manager
bash ../../scripts/secrets-bootstrap.sh nanda-index dev
```

## 🔊 Deployment

### Fly.io Deployment

```bash
# Deploy to Fly.io
flyctl deploy --config fly.toml

# View logs
flyctl logs

# SSH into container
flyctl ssh console

# Check status
flyctl status
```

### Production URL

- **Service**: `https://candlefish-nanda-index.fly.dev`
- **Health**: `https://candlefish-nanda-index.fly.dev/health`

## 📊 Monitoring

```bash
# Tail logs
flyctl logs --tail

# View metrics
flyctl dashboard

# Check health
curl https://candlefish-nanda-index.fly.dev/health
```

## 🧪 Testing

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# Load testing
pnpm test:load
```

## 📁 Project Structure

```
nanda-index/
├── src/
│   ├── agents/       # Agent implementations
│   ├── controllers/  # API controllers
│   ├── services/     # Business logic
│   └── index.ts      # Entry point
├── Dockerfile        # Container definition
├── fly.toml         # Fly.io configuration
└── package.json     # Dependencies
```

## 🔄 API Endpoints

- `GET /health` - Health check
- `GET /agents` - List active agents
- `POST /agents/execute` - Execute agent task
- `GET /metrics` - Prometheus metrics
- `WS /events` - Real-time event stream

## 👥 Team

- **Owners**: Patrick Smith (@aspenas), Tyler Robinson (@tyler-robinson)
- **Platform**: Fly.io

## 📝 Notes

- Runs on Node.js 22
- Uses Express.js for API
- DynamoDB for state persistence
- WebSocket support for real-time updates
- Auto-scaling enabled on Fly.io
