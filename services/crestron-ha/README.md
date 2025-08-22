# Crestron HA - Home Automation Service

## 🏠 Overview

Crestron HA provides home automation integration and control services.

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
bash ../../scripts/secrets-bootstrap.sh crestron-ha dev
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

- **Service**: `https://candlefish-crestron-ha.fly.dev`
- **Health**: `https://candlefish-crestron-ha.fly.dev/health`

## 📊 Monitoring

```bash
# Tail logs
flyctl logs --tail

# View metrics
flyctl dashboard

# Check health
curl https://candlefish-crestron-ha.fly.dev/health
```

## 🧪 Testing

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# Device simulation
pnpm test:devices
```

## 📁 Project Structure

```
crestron-ha/
├── src/
│   ├── devices/      # Device controllers
│   ├── protocols/    # Communication protocols
│   ├── automation/   # Automation rules
│   └── index.ts      # Entry point
├── Dockerfile        # Container definition
├── fly.toml         # Fly.io configuration
└── package.json     # Dependencies
```

## 🔄 API Endpoints

- `GET /health` - Health check
- `GET /devices` - List connected devices
- `POST /control` - Send control command
- `GET /status` - System status
- `WS /events` - Real-time device events

## 🔌 Integrations

- Crestron Control Systems
- Home Assistant
- Apple HomeKit
- Google Home
- Amazon Alexa

## 👥 Team

- **Owner**: Patrick Smith (@aspenas)
- **Platform**: Fly.io

## 📝 Notes

- Runs on Node.js 22
- Uses Express.js for API
- MQTT for device communication
- WebSocket support for real-time control
- Auto-discovery for compatible devices
