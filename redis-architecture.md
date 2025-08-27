# Redis Architecture for High-Throughput Security Dashboard

## Overview
Redis configuration optimized for handling 15,000 security events/second with real-time processing, caching, and message queuing.

## Redis Data Structures & Key Patterns

### 1. Event Processing Queue (Stream-based)
```redis
# Primary event ingestion stream
XADD events:stream * 
    org_id "org_uuid"
    event_type "failed_login"
    severity "high"
    source_ip "192.168.1.100"
    timestamp "1698765432"
    payload "{json_data}"

# Consumer groups for parallel processing
XGROUP CREATE events:stream processors $ MKSTREAM
XGROUP CREATE events:stream ml_processors $ MKSTREAM
XGROUP CREATE events:stream alert_processors $ MKSTREAM

# Reading events with consumer groups
XREADGROUP GROUP processors worker-1 COUNT 100 BLOCK 1000 STREAMS events:stream >
```

### 2. Real-time Event Counters (Time Series)
```redis
# Event counts per minute using sorted sets
ZADD events:minute:2024:01:15:14:30 1 "failed_login:192.168.1.100"
ZADD events:minute:2024:01:15:14:30 1 "brute_force:192.168.1.100"

# Event counts by severity
HINCRBY events:severity:org:uuid critical 1
HINCRBY events:severity:org:uuid high 5
HINCRBY events:severity:org:uuid medium 10

# Asset-specific counters
HINCRBY events:asset:asset_uuid:hourly total 15
HINCRBY events:asset:asset_uuid:hourly critical 2
```

### 3. Threat Detection Cache
```redis
# IP reputation cache (30-day TTL)
SET ip:reputation:192.168.1.100 '{"score":85,"last_seen":"2024-01-15","threat_types":["brute_force"]}' EX 2592000

# Failed login tracking (15-minute sliding window)
ZADD failed_logins:192.168.1.100 1705318800 "attempt_1"
ZADD failed_logins:192.168.1.100 1705318860 "attempt_2"
EXPIRE failed_logins:192.168.1.100 900

# Threat detection rule results cache
SET threat:rule:brute_force:192.168.1.100 '{"triggered":true,"count":10,"last_reset":"2024-01-15T14:30:00Z"}' EX 3600
```

### 4. Alert Deduplication
```redis
# Alert fingerprinting (prevent duplicate alerts)
SET alert:hash:sha256_hash '{"rule_id":"uuid","first_seen":"timestamp","count":5}' EX 3600

# Alert suppression tracking
SETEX alert:suppressed:rule_uuid:asset_uuid 3600 "suppressed_until_timestamp"
```

### 5. Session Management
```redis
# User sessions with JWT token mapping
SET session:token:jwt_token_hash '{"user_id":"uuid","org_id":"uuid","expires":"timestamp","permissions":["read","write"]}' EX 28800

# Active user sessions per organization
SADD sessions:org:uuid session:token:jwt_token_hash
EXPIRE sessions:org:uuid 28800

# Rate limiting per user/API key
SET rate_limit:user:uuid:minute 150 EX 60
SET rate_limit:api_key:key_hash:minute 1000 EX 60
```

### 6. Real-time Dashboard Cache
```redis
# Organization security metrics (5-minute cache)
HMSET dashboard:org:uuid 
    events_24h 1500
    critical_events_24h 25
    open_alerts 12
    open_incidents 3
    avg_response_time 450
    last_updated 1705318800

# Asset health status
HMSET asset:health:asset_uuid
    status "healthy"
    security_score 85
    last_scan "2024-01-15T10:00:00Z"
    vulnerabilities_count 3
    events_1h 5

# Top threats cache (hourly refresh)
ZADD top_threats:org:uuid 25 "failed_login"
ZADD top_threats:org:uuid 15 "brute_force_attempt"
ZADD top_threats:org:uuid 8 "sql_injection_attempt"
```

### 7. WebSocket Connection Management
```redis
# Active WebSocket connections
SADD websocket:org:uuid "connection_id_1"
SADD websocket:org:uuid "connection_id_2"

# Connection metadata
HMSET websocket:connection:connection_id_1
    user_id "uuid"
    org_id "uuid" 
    connected_at 1705318800
    last_ping 1705318860
    subscriptions "events,alerts,incidents"

# Publish events to subscribers
PUBLISH websocket:org:uuid '{"type":"new_event","data":{...}}'
```

### 8. Configuration Cache
```redis
# Organization configuration
HMSET config:org:uuid
    rate_limit_per_minute 1000
    retention_days 90
    alert_thresholds '{"critical":1,"high":5,"medium":20}'
    notification_channels '["email","slack"]'
    
# Feature flags
HMSET features:org:uuid
    ml_threat_detection true
    auto_incident_creation false
    compliance_monitoring true
    siem_integration true
```

## Message Queue Architecture

### 1. Event Processing Pipeline
```
Incoming Events → Redis Stream → Consumer Groups → Processing Workers
                                    ↓
                             ┌─ Alert Engine
                             ├─ ML Processors  
                             ├─ SIEM Forwarder
                             └─ Database Writer
```

### 2. Queue Configuration
```redis
# Configure consumer groups for parallel processing
XGROUP CREATE events:stream alert_engine $ MKSTREAM
XGROUP CREATE events:stream ml_engine $ MKSTREAM
XGROUP CREATE events:stream db_writer $ MKSTREAM
XGROUP CREATE events:stream siem_forwarder $ MKSTREAM

# Dead letter queue for failed processing
XGROUP CREATE events:failed_processing dlq $ MKSTREAM
```

### 3. Priority Queues
```redis
# High priority events (critical/high severity)
LPUSH queue:events:priority '{"event_id":"uuid","severity":"critical",...}'

# Standard priority events
LPUSH queue:events:standard '{"event_id":"uuid","severity":"medium",...}'

# Background processing (vulnerability scans, compliance checks)
LPUSH queue:background:tasks '{"task_type":"vulnerability_scan","asset_id":"uuid"}'
```

## Redis Cluster Configuration

### 1. Memory Optimization
```redis
# Configure Redis for high throughput
maxmemory 8gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000

# Enable compression
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
```

### 2. Performance Tuning
```redis
# Network and I/O optimization
timeout 300
keepalive 300
tcp-backlog 511

# Disable slow operations in production
slowlog-log-slower-than 10000
slowlog-max-len 128

# Enable pipelining for bulk operations
# Set client output buffer limits
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
```

### 3. Persistence Strategy
```redis
# Use AOF for durability with performance balance
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

## Real-time Analytics Patterns

### 1. Sliding Window Counters
```redis
# 5-minute sliding window for event rates
MULTI
ZREMRANGEBYSCORE events:sliding:5min 0 (now-300)
ZADD events:sliding:5min now event_id
ZCARD events:sliding:5min
EXEC
```

### 2. HyperLogLog for Unique Counts
```redis
# Count unique source IPs per hour
PFADD unique_ips:2024:01:15:14 192.168.1.100
PFADD unique_ips:2024:01:15:14 192.168.1.101
PFCOUNT unique_ips:2024:01:15:14
```

### 3. Bloom Filters for Duplicate Detection
```redis
# Check if event signature has been seen before
BF.ADD event_signatures:24h "event_signature_hash"
BF.EXISTS event_signatures:24h "event_signature_hash"
```

## Monitoring and Health Checks

### 1. Redis Metrics Collection
```redis
# Get Redis performance metrics
INFO stats
INFO memory
INFO replication
INFO commandstats

# Monitor key metrics
MONITOR
LATENCY LATEST
SLOWLOG GET 10
```

### 2. Queue Health Monitoring
```redis
# Check stream length and consumer lag
XLEN events:stream
XPENDING events:stream processors
XINFO GROUPS events:stream
```

### 3. Connection Pool Management
```redis
# Monitor client connections
INFO clients
CLIENT LIST
CLIENT TRACKING ON
```

## Scaling Strategy

### 1. Horizontal Scaling (Redis Cluster)
```bash
# 6-node Redis cluster (3 masters, 3 replicas)
redis-cli --cluster create 
  10.0.1.1:6379 10.0.1.2:6379 10.0.1.3:6379 
  10.0.1.4:6379 10.0.1.5:6379 10.0.1.6:6379 
  --cluster-replicas 1
```

### 2. Read Scaling with Replicas
```redis
# Configure read replicas for dashboard queries
READONLY  # On replica nodes
READWRITE # On master nodes
```

### 3. Data Partitioning Strategy
```redis
# Partition by organization ID
{org:uuid}:events:stream
{org:uuid}:alerts:active
{org:uuid}:dashboard:metrics

# Use hash tags to keep related data on same shard
```

## Security Configuration

### 1. Authentication and Authorization
```redis
# Enable AUTH and configure users
AUTH default_password

# Create application user with limited permissions
ACL SETUSER security_dashboard on >app_password ~* +@read +@write -@dangerous
ACL SETUSER security_readonly on >readonly_password ~* +@read -@write -@dangerous
```

### 2. Network Security
```redis
# Bind to specific interfaces
bind 127.0.0.1 10.0.1.1

# Enable TLS encryption
tls-port 6380
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
```

### 3. Data Encryption
```redis
# Enable encryption at rest (Redis Enterprise feature)
# For open source Redis, use disk encryption

# Encrypt sensitive data before storing
SET sensitive:data:uuid "encrypted_payload_base64" EX 3600
```

## Local Development Setup

### 1. Docker Compose Configuration
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    
  redis-insight:
    image: redislabs/redisinsight:latest
    ports:
      - "8001:8001"
    volumes:
      - redis_insight_data:/db
      
volumes:
  redis_data:
  redis_insight_data:
```

### 2. Configuration for Development
```redis
# redis.conf for local development
port 6379
save 60 1000
appendonly yes
appendfsync everysec
maxmemory 512mb
maxmemory-policy allkeys-lru
```

This Redis architecture provides:
- **High throughput**: Handles 15,000+ events/second
- **Low latency**: Sub-millisecond read/write operations  
- **Real-time processing**: Stream-based event processing
- **Scalability**: Horizontal scaling with Redis Cluster
- **Reliability**: Persistence, replication, and failover
- **Security**: Authentication, authorization, and encryption
- **Monitoring**: Comprehensive metrics and health checks

The design maintains the current $0/month local deployment option while providing a clear path to production scaling.