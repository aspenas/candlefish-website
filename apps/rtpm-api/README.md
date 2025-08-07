# Real-time Performance Monitoring (RTPM) API

A high-performance, production-ready API for real-time metrics ingestion, storage, querying, and alerting built with FastAPI, TimescaleDB, and Redis.

## Features

- **High-throughput Metrics Ingestion**: Batch and single metric ingestion with async processing
- **TimescaleDB Storage**: Optimized time-series database with automatic compression and retention
- **Real-time Queries**: Fast metric queries with caching and filtering
- **WebSocket Updates**: Real-time metric and alert notifications
- **Alert Management**: Flexible alerting system with rule-based evaluation
- **Background Processing**: Celery-based metric aggregation and alert evaluation
- **Prometheus Integration**: Built-in metrics export for monitoring
- **Production Ready**: Docker containerization, security, rate limiting, and logging

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Metrics       │    │   Query API     │    │   WebSocket     │
│   Ingestion     │    │                 │    │   Updates       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   FastAPI       │
                    │   Application   │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   TimescaleDB   │    │     Redis       │    │   Celery        │
│   (Metrics)     │    │   (Cache)       │    │   (Workers)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone and Setup**:
   ```bash
   git clone <repository>
   cd rtpm-api
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start Services**:
   ```bash
   docker-compose up -d
   ```

3. **Verify Installation**:
   ```bash
   curl http://localhost:8000/health
   ```

4. **Access Services**:
   - API Documentation: http://localhost:8000/docs
   - Flower (Task Monitor): http://localhost:5555
   - API Health: http://localhost:8000/health

### Manual Installation

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Setup Database**:
   ```bash
   # Install TimescaleDB
   # Run init.sql to create schema
   psql -d rtpm_db -f init.sql
   ```

3. **Start Redis**:
   ```bash
   redis-server
   ```

4. **Run Services**:
   ```bash
   # API Server
   python -m uvicorn src.main:app --reload
   
   # Celery Worker
   celery worker -A src.workers.aggregation.celery_app --loglevel=info
   
   # Celery Beat
   celery beat -A src.workers.aggregation.celery_app --loglevel=info
   ```

## API Endpoints

### Metrics Ingestion
- `POST /api/v1/metrics/ingest` - Ingest single metric
- `POST /api/v1/metrics/batch` - Ingest metrics batch
- `GET /api/v1/metrics/latest/{metric_name}` - Get latest metric value

### Querying
- `POST /api/v1/metrics/query` - Query metrics with filters
- `GET /api/v1/metrics/query/range` - Prometheus-style range queries
- `GET /api/v1/metrics/query/instant` - Instant metric queries
- `GET /api/v1/metrics/aggregated` - Get pre-aggregated data

### Alert Management
- `POST /api/v1/alerts/rules` - Create alert rule
- `GET /api/v1/alerts/rules` - List alert rules
- `GET /api/v1/alerts/active` - Get active alerts
- `POST /api/v1/alerts/resolve/{alert_id}` - Resolve alert

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed service health
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe
- `GET /metrics` - Prometheus metrics

### WebSocket
- `WS /ws/metrics` - Real-time metric and alert updates

## Authentication

The API uses JWT authentication. Most endpoints require a valid bearer token:

```bash
# Login to get token (implementation needed)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}'

# Use token in requests
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/metrics/latest/cpu_usage
```

## Usage Examples

### Ingesting Metrics

```bash
# Single metric
curl -X POST http://localhost:8000/api/v1/metrics/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "cpu_usage_percent",
    "type": "gauge",
    "value": 45.2,
    "labels": {"host": "server01", "region": "us-east-1"},
    "help_text": "CPU usage percentage",
    "unit": "percent"
  }'

# Batch metrics
curl -X POST http://localhost:8000/api/v1/metrics/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "metrics": [
      {
        "name": "cpu_usage_percent",
        "type": "gauge",
        "value": 45.2,
        "labels": {"host": "server01"}
      },
      {
        "name": "memory_usage_percent", 
        "type": "gauge",
        "value": 78.5,
        "labels": {"host": "server01"}
      }
    ]
  }'
```

### Querying Metrics

```bash
# Query with time range
curl -X POST http://localhost:8000/api/v1/metrics/query \
  -H "Content-Type: application/json" \
  -d '{
    "metric_name": "cpu_usage_percent",
    "start_time": "2024-01-01T00:00:00Z",
    "end_time": "2024-01-01T01:00:00Z",
    "step": "5m",
    "aggregation": "avg"
  }'

# Get latest value
curl http://localhost:8000/api/v1/metrics/latest/cpu_usage_percent
```

### Creating Alert Rules

```bash
curl -X POST http://localhost:8000/api/v1/alerts/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "High CPU Alert",
    "metric_name": "cpu_usage_percent",
    "condition": "> 80",
    "threshold": 80.0,
    "severity": "high",
    "evaluation_interval": 60,
    "for_duration": 300,
    "annotations": {
      "description": "CPU usage is above 80% for 5 minutes"
    }
  }'
```

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/metrics');

ws.onopen = function() {
    // Subscribe to metric updates
    ws.send(JSON.stringify({
        type: 'subscribe',
        data: { subscription: 'metrics' }
    }));
    
    // Subscribe to alerts
    ws.send(JSON.stringify({
        type: 'subscribe', 
        data: { subscription: 'alerts' }
    }));
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
    
    if (message.type === 'metric_update') {
        // Handle new metrics
        console.log('New metrics:', message.data.metrics);
    } else if (message.type === 'alert') {
        // Handle alert
        console.log('Alert:', message.data);
    }
};
```

## Configuration

Configuration is managed through environment variables. In production, CORS and strict settings are auto-configured:

- If `NODE_ENV=production` or `PY_ENV=production` is set, CORS defaults to strict candlefish domains.
- Override with `CORS_ORIGINS` (comma-separated list) as needed.

See `.env.example` for all available options.

### Key Configuration

- **DATABASE_URL**: TimescaleDB connection string
- **REDIS_URL**: Redis connection string
- **SECRET_KEY**: Application secret key
- **JWT_SECRET_KEY**: JWT signing key
- **CORS_ORIGINS**: Allowed CORS origins
- **RATE_LIMIT_PER_MINUTE**: Rate limiting

### Performance Tuning

- **DATABASE_POOL_SIZE**: Database connection pool size (default: 20)
- **BATCH_INSERT_SIZE**: Batch insert size (default: 1000)
- **CACHE_TTL**: Cache time-to-live (default: 300s)
- **WEBSOCKET_MAX_CONNECTIONS**: Max WebSocket connections (default: 1000)

## Production Deployment

### Docker Deployment

```bash
# Production build
docker-compose -f docker-compose.yml up -d

# Scale workers
docker-compose up -d --scale celery-worker=4
```

### Kubernetes Deployment

```yaml
# Example Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rtpm-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rtpm-api
  template:
    metadata:
      labels:
        app: rtpm-api
    spec:
      containers:
      - name: rtpm-api
        image: rtpm-api:production
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: rtpm-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: rtpm-secrets
              key: redis-url
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Security Considerations

1. **Change Default Secrets**: Update all secret keys in production
2. **Enable HTTPS**: Use TLS encryption for API endpoints
3. **Network Security**: Restrict database/Redis access
4. **Rate Limiting**: Configure appropriate rate limits
5. **Authentication**: Implement proper user authentication
6. **Input Validation**: All inputs are validated by Pydantic models

## Monitoring

### Prometheus Metrics

The API exports Prometheus metrics at `/metrics`:

- `metrics_ingested_total` - Total metrics ingested
- `query_requests_total` - Total query requests
- `active_alerts_total` - Active alerts by severity
- `websocket_connections` - Active WebSocket connections

### Logging

Structured logging with configurable format (JSON/console):

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "event": "HTTP request",
  "method": "POST",
  "path": "/api/v1/metrics/ingest",
  "status_code": 201,
  "duration_ms": 45.2
}
```

### Health Checks

- `/health` - Basic health status
- `/health/detailed` - Detailed service health
- `/health/ready` - Kubernetes readiness
- `/health/live` - Kubernetes liveness

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-mock

# Run tests
pytest

# Run with coverage
pytest --cov=src
```

### Code Quality

```bash
# Format code
black src/

# Lint
flake8 src/

# Type checking
mypy src/
```

### Development Server

```bash
# Start with auto-reload
python -m uvicorn src.main:app --reload --port 8000

# Or use the development Docker target
docker-compose -f docker-compose.yml up rtpm-api-dev
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check TimescaleDB is running and accessible
   - Verify DATABASE_URL configuration
   - Check network connectivity

2. **Redis Connection Failed** 
   - Ensure Redis is running
   - Verify REDIS_URL configuration
   - Check Redis memory limits

3. **High Memory Usage**
   - Tune DATABASE_POOL_SIZE
   - Reduce BATCH_INSERT_SIZE
   - Configure Redis maxmemory policy

4. **WebSocket Connections Dropping**
   - Check WEBSOCKET_HEARTBEAT_INTERVAL
   - Verify client heartbeat handling
   - Monitor connection limits

### Performance Tuning

1. **Database Optimization**
   - Tune chunk_time_interval for your data pattern
   - Enable compression for older data
   - Monitor query performance with EXPLAIN

2. **Cache Optimization**
   - Adjust CACHE_TTL based on data freshness needs
   - Monitor cache hit rates
   - Use Redis memory optimization

3. **Worker Scaling**
   - Scale Celery workers based on queue length
   - Monitor task execution times
   - Adjust concurrency settings

## License

[Add your license here]

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation at `/docs`
- Review logs for error details