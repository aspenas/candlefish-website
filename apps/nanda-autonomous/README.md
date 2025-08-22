# NANDA Autonomous Agent - Remote Self-Commit System

## Overview

The NANDA Autonomous Agent is a cloud-native, self-evolving system that runs on Fly.io and autonomously creates commits and pull requests for the Candlefish AI ecosystem. It operates completely independently, monitoring the repository and making intelligent decisions about when and what to commit.

## Features

- **Autonomous Operation**: Runs continuously in the cloud without human intervention
- **GitHub Integration**: Creates commits and PRs via GitHub API
- **Self-Discovery**: Discovers and registers with other NANDA agents
- **Personality System**: Each agent instance has a unique personality that influences its behavior
- **Real-time Monitoring**: WebSocket endpoints for live monitoring
- **Health Checks**: Built-in health monitoring and auto-recovery
- **Metrics Collection**: Tracks performance and success rates

## Architecture

```
┌─────────────────────────────────────┐
│         Fly.io Cloud                │
│  ┌─────────────────────────────┐    │
│  │   NANDA Autonomous Agent    │    │
│  │  ┌────────────────────┐     │    │
│  │  │   Express Server   │     │    │
│  │  └────────────────────┘     │    │
│  │  ┌────────────────────┐     │    │
│  │  │  Autonomous Agent  │     │    │
│  │  └────────────────────┘     │    │
│  │  ┌────────────────────┐     │    │
│  │  │  GitHub Committer  │     │    │
│  │  └────────────────────┘     │    │
│  │  ┌────────────────────┐     │    │
│  │  │ Metrics Collector  │     │    │
│  │  └────────────────────┘     │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
           │            │
           ▼            ▼
    GitHub API    DynamoDB
```

## Deployment

### Prerequisites

- Fly CLI installed
- AWS credentials configured
- GitHub Personal Access Token

### Deploy to Fly.io

```bash
cd apps/nanda-autonomous
./deploy.sh
```

### Manual Deployment

```bash
# Create the app
flyctl apps create nanda-autonomous

# Set secrets
flyctl secrets set GITHUB_TOKEN=<your-github-token>
flyctl secrets set AWS_ACCESS_KEY_ID=<your-aws-key>
flyctl secrets set AWS_SECRET_ACCESS_KEY=<your-aws-secret>

# Deploy
flyctl deploy
```

## Configuration

Environment variables can be set in `fly.toml` or via secrets:

- `GITHUB_TOKEN`: GitHub Personal Access Token (required)
- `GITHUB_REPO`: Repository to monitor (default: candlefish-ai/candlefish-ai)
- `COMMIT_INTERVAL`: Seconds between checks (default: 300)
- `AWS_REGION`: AWS region for DynamoDB (default: us-east-1)
- `DYNAMO_TABLE`: DynamoDB table name (default: nanda-index-agents)

## API Endpoints

### Health Check
```
GET https://nanda-autonomous.fly.dev/health
```

Returns the health status of the agent.

### Status
```
GET https://nanda-autonomous.fly.dev/status
```

Returns detailed status including personality, metrics, and state.

### Manual Trigger
```
POST https://nanda-autonomous.fly.dev/trigger
```

Manually triggers an autonomous commit cycle.

### WebSocket Monitoring
```
WS https://nanda-autonomous.fly.dev/ws
```

Real-time monitoring via Server-Sent Events.

## Agent Personality

Each agent instance generates a unique personality that influences its behavior:

- **Optimization Focus**: performance, efficiency, scalability, or reliability
- **Communication Style**: technical, creative, analytical, or visionary
- **Priority**: speed, quality, innovation, or stability

## Autonomous Behavior

The agent performs the following actions autonomously:

1. **Monitor Repository**: Checks for recent changes every 5 minutes
2. **Analyze Changes**: Identifies NANDA-related modifications
3. **Generate Commits**: Creates intelligent commit messages based on analysis
4. **Create Pull Requests**: Opens PRs with detailed descriptions
5. **Self-Register**: Registers itself in the agent registry
6. **Track Metrics**: Records performance and success metrics

## Monitoring

### View Logs
```bash
flyctl logs --app nanda-autonomous
```

### Check Status
```bash
flyctl status --app nanda-autonomous
```

### Scale Workers
```bash
flyctl scale count 2 --app nanda-autonomous
```

## Security

- GitHub token is stored securely in Fly.io secrets
- AWS credentials are managed via IAM roles
- All communications use HTTPS
- Health checks ensure system integrity

## Troubleshooting

### Agent Not Committing

1. Check GitHub token is valid: `flyctl secrets list`
2. Verify repository permissions
3. Check logs for errors: `flyctl logs`

### DynamoDB Connection Issues

1. Verify AWS credentials are set
2. Check AWS region configuration
3. Ensure DynamoDB tables exist

### High Memory Usage

1. Check metrics endpoint
2. Scale up if needed: `flyctl scale memory 512`
3. Review commit frequency settings

## Architecture Decisions

- **Fly.io**: Chosen for simplicity, auto-scaling, and global distribution
- **GitHub API**: Direct API usage instead of git operations for security
- **DynamoDB**: Serverless persistence for agent state and registry
- **Node.js**: Lightweight runtime with excellent async support

## Future Enhancements

- [ ] Multi-region deployment
- [ ] Agent collaboration protocols
- [ ] Machine learning for commit timing
- [ ] Automated code generation
- [ ] Self-healing mechanisms
- [ ] Knowledge graph integration

## License

Proprietary - Candlefish AI

## Support

For issues or questions, contact: nanda@candlefish.ai

---

*The NANDA Autonomous Agent is part of the living AI ecosystem that continues to evolve and improve itself without human intervention.*