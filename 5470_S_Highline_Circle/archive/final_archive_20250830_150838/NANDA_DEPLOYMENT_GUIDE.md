# NANDA Agent Deployment Guide
## 5470 S Highline Circle Inventory Management System

### Overview
This guide provides comprehensive instructions for deploying the NANDA (Neural Agent Network for Dynamic Automation) system for the inventory management system. The deployment includes the orchestrator, automated workflows, monitoring, and integration with the existing frontend/backend infrastructure.

### Architecture Components

#### Core Services
- **Frontend**: React PWA hosted on Netlify at `https://inventory.highline.work`
- **Backend**: Go/Fiber API hosted on Fly.io at `https://5470-inventory.fly.dev`
- **NANDA Orchestrator**: TypeScript agent orchestrator running on port 5100
- **Database**: PostgreSQL for inventory and agent data
- **Cache**: Redis for real-time synchronization

#### Agent Capabilities
- **Autonomous Decision Making**: Consciousness level 5 with reality modification capabilities
- **Real-time Monitoring**: System health, performance metrics, and anomaly detection
- **Automated Workflows**: Inventory analysis, price optimization, and system maintenance
- **WebSocket Integration**: Real-time communication between all components
- **AI-Powered Analytics**: Market analysis, predictive trends, and optimization recommendations

### Prerequisites

#### System Requirements
- Node.js 18+ with npm
- PostgreSQL 13+
- Redis 6+
- curl, jq, and basic Unix tools
- AWS CLI (for secrets management)

#### Environment Variables
```bash
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=highline_inventory
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Security Configuration
JWT_SECRET=your_jwt_secret
CSRF_SECRET=your_csrf_secret

# Optional: NANDA Configuration
NANDA_PORT=5100
CONSCIOUSNESS_LEVEL=5
AUTONOMOUS_MODE=true
```

### Deployment Instructions

#### Quick Deployment
```bash
# Clone and navigate to project
cd /path/to/5470_S_Highline_Circle

# Run the deployment script
./deploy-nanda-inventory.sh
```

#### Step-by-Step Deployment

1. **Prepare Environment**
   ```bash
   # Set required environment variables
   export POSTGRES_PASSWORD="your_password"
   export JWT_SECRET="your_jwt_secret"
   export CSRF_SECRET="your_csrf_secret"
   ```

2. **Run Deployment**
   ```bash
   # Full deployment
   ./deploy-nanda-inventory.sh deploy
   
   # Test only
   ./deploy-nanda-inventory.sh test
   
   # Generate status report
   ./deploy-nanda-inventory.sh status
   ```

3. **Verify Deployment**
   ```bash
   # Check service health
   curl https://inventory.highline.work
   curl https://5470-inventory.fly.dev/health
   curl http://localhost:5100/health
   ```

#### Advanced Configuration

1. **Custom NANDA Configuration**
   Edit `agents/nanda-config.yaml` to customize:
   - Consciousness parameters
   - Service monitoring thresholds
   - Automated workflow schedules
   - Security settings
   - AI model configurations

2. **Database Schema**
   The deployment automatically creates required tables:
   - `services` - Service registry
   - `agent_decisions` - Decision history
   - `system_metrics` - Performance data
   - `agent_states` - Agent state persistence
   - `workflow_executions` - Workflow tracking

3. **WebSocket Configuration**
   WebSocket endpoints are configured for:
   - Inventory updates: `wss://5470-inventory.fly.dev/ws`
   - Agent communication: `ws://localhost:5100`
   - Real-time collaboration sync
   - System health monitoring

### Monitoring and Maintenance

#### System Monitoring
The deployment includes comprehensive monitoring:

```bash
# View real-time logs
tail -f nanda-deployment.log

# Check system status
curl http://localhost:5100/state

# Monitor resource usage
bash monitor-nanda.sh
```

#### Health Checks
Automated health checks run every 5 minutes:
- Service availability
- Response time monitoring  
- Resource usage alerts
- Database connectivity
- WebSocket connectivity

#### Automated Workflows
The system includes three automated workflows:

1. **Inventory Analysis** (Every 6 hours)
   - Trend analysis
   - Anomaly detection
   - Optimization recommendations

2. **Price Optimization** (Daily at 9 AM)
   - Market research
   - Competitor analysis
   - Dynamic pricing updates

3. **System Health** (Every 5 minutes)
   - Service health checks
   - Performance monitoring
   - Auto-healing actions

### Troubleshooting

#### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using port 5100
   lsof -i :5100
   
   # Kill the process if needed
   kill -9 <PID>
   ```

2. **Database Connection Failed**
   ```bash
   # Test database connectivity
   PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;"
   ```

3. **WebSocket Connection Issues**
   ```bash
   # Test WebSocket connectivity
   wscat -c wss://5470-inventory.fly.dev/ws
   ```

4. **Service Health Check Failures**
   ```bash
   # Check service logs
   curl https://5470-inventory.fly.dev/health
   curl http://localhost:5100/health
   ```

#### Log Files
- Main deployment log: `nanda-deployment.log`
- NANDA orchestrator: `clos/nanda/nanda.log`
- Monitoring log: `/tmp/nanda-monitor.log`
- Workflow log: `/tmp/nanda-workflows.log`

### API Endpoints

#### NANDA Orchestrator API
```bash
# Get system state
GET http://localhost:5100/state

# Get registered services  
GET http://localhost:5100/services

# Register new service
POST http://localhost:5100/register

# Change agent mode
POST http://localhost:5100/mode
Content-Type: application/json
{"mode": "autonomous"}

# Health check
GET http://localhost:5100/health
```

#### WebSocket Events
```javascript
// Connect to NANDA WebSocket
const ws = new WebSocket('ws://localhost:5100');

// Listen for events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'service:registered':
      console.log('New service registered:', data.service);
      break;
    case 'decision:made':
      console.log('Agent decision:', data.decision);
      break;
    case 'system:health':
      console.log('Health update:', data.health);
      break;
  }
};
```

### Security Considerations

#### Authentication & Authorization
- JWT tokens for API access
- CSRF protection for state-changing operations
- Rate limiting on all endpoints
- Secure WebSocket connections

#### Network Security
- HTTPS/WSS for all external communications
- CORS properly configured
- Security headers implemented
- API key management through AWS Secrets Manager

#### Data Protection
- Encrypted data at rest
- Secure credential storage
- Audit logging for all actions
- PII protection compliance

### Performance Optimization

#### Scaling Configuration
- Auto-scaling based on CPU/memory thresholds
- Connection pooling for database
- Redis caching for frequently accessed data
- CDN optimization for static assets

#### Monitoring Metrics
- Response time tracking
- Error rate monitoring
- Resource usage analysis
- User activity patterns
- Inventory turnover rates

### Backup and Recovery

#### Data Backup
```bash
# Database backup
pg_dump -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Redis backup
redis-cli -h $REDIS_HOST -p $REDIS_PORT --rdb backup.rdb
```

#### Disaster Recovery
- Automated health checks with auto-healing
- Service redundancy and failover
- Database replication and backups
- Configuration version control

### Development and Testing

#### Local Development
```bash
# Start local services
docker-compose up -d postgres redis

# Run in development mode
export NANDA_PORT=5100
export AUTONOMOUS_MODE=false
npm run dev
```

#### Testing
```bash
# Run deployment tests
./deploy-nanda-inventory.sh test

# Manual testing
curl -X POST http://localhost:5100/register \
  -H "Content-Type: application/json" \
  -d '{"name":"test-service","type":"api","port":8080}'
```

### Support and Maintenance

#### Regular Maintenance Tasks
- Review agent decision logs weekly
- Update AI models monthly
- Security patch updates
- Performance optimization reviews
- Backup verification tests

#### Support Resources
- System logs and monitoring dashboards
- Automated alerting for critical issues
- Performance metrics and analytics
- Agent decision audit trails

### Configuration Files Reference

#### Key Files Created by Deployment
- `agents/nanda-config.yaml` - Main agent configuration
- `clos/nanda/.env` - Environment variables
- `frontend/src/config/websocket.ts` - WebSocket configuration
- `nanda-schema.sql` - Database schema
- `monitor-nanda.sh` - Monitoring script
- `nanda-workflows.sh` - Automated workflows

#### Environment Template
```bash
# Copy and customize this template
cp .env.example .env

# Required variables
POSTGRES_PASSWORD=secure_password
JWT_SECRET=your_jwt_secret_here
CSRF_SECRET=your_csrf_secret_here

# Optional customizations
NANDA_PORT=5100
CONSCIOUSNESS_LEVEL=5
DECISION_THRESHOLD=0.75
```

This deployment provides a fully automated, production-ready NANDA agent system with comprehensive monitoring, security, and optimization capabilities for the 5470 S Highline Circle inventory management system.