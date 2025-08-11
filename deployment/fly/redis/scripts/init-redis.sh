#!/bin/bash
# Redis initialization script for Candlefish AI Collaboration System
# This script configures Redis for real-time collaboration, caching, and pub/sub

set -e

# Configuration
REDIS_HOST=${REDIS_HOST:-"candlefish-redis.internal"}
REDIS_PORT=${REDIS_PORT:-"6379"}
REDIS_CLI="redis-cli -h $REDIS_HOST -p $REDIS_PORT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐠 Candlefish AI - Redis Initialization${NC}"
echo "========================================"

# Wait for Redis to be ready
echo -e "${YELLOW}⏳ Waiting for Redis to be ready...${NC}"
until $REDIS_CLI ping | grep -q "PONG"; do
    echo "  Redis is not ready yet, waiting 2 seconds..."
    sleep 2
done

echo -e "${GREEN}✅ Redis is ready!${NC}"

# Configure Redis for collaboration system
echo -e "${YELLOW}⚙️ Configuring Redis for collaboration...${NC}"

# Set up key namespaces and expiration policies
$REDIS_CLI << 'EOF'
# Configure memory policies
CONFIG SET maxmemory-policy allkeys-lru
CONFIG SET maxmemory 256mb

# Enable keyspace notifications for real-time features
CONFIG SET notify-keyspace-events "Ex"

# Set up database aliases (Redis supports 16 databases by default)
# DB 0: Session storage and presence
# DB 1: Document caching
# DB 2: User caching
# DB 3: Notification queues
# DB 4: Rate limiting
# DB 5: CRDT operation caching
# DB 6: WebSocket connection tracking
# DB 7: Temporary data/locks
# DB 8-15: Available for future use

SELECT 0
FLUSHDB

# Set up initial key patterns with TTL
# Presence sessions expire after 5 minutes of inactivity
SETEX presence:heartbeat:config 0 300

# Document locks expire after 30 minutes
SETEX locks:config 0 1800

# User sessions expire after 24 hours
SETEX sessions:config 0 86400

# Rate limiting windows (1 minute)
SETEX ratelimit:config 0 60

# Cache TTLs
SETEX cache:document:ttl 0 1800  # 30 minutes
SETEX cache:user:ttl 0 3600      # 1 hour
SETEX cache:collection:ttl 0 7200 # 2 hours

PING
EOF

# Set up pub/sub channels for real-time collaboration
echo -e "${YELLOW}📡 Setting up pub/sub channels...${NC}"
$REDIS_CLI << 'EOF'
# Create channel patterns for different event types
# Document changes: doc:changes:{document_id}
# Presence updates: doc:presence:{document_id}
# Comments: doc:comments:{document_id}
# Notifications: user:notifications:{user_id}
# System events: system:events

# Set up channel metadata
HSET channels:metadata doc:changes "Real-time document content changes"
HSET channels:metadata doc:presence "User presence and cursor updates"
HSET channels:metadata doc:comments "New comments and reactions"
HSET channels:metadata user:notifications "User-specific notifications"
HSET channels:metadata system:events "System-wide events and maintenance"

PING
EOF

# Set up Lua scripts for atomic operations
echo -e "${YELLOW}📜 Installing Lua scripts for atomic operations...${NC}"

# Script for updating presence with heartbeat
PRESENCE_SCRIPT_SHA=$($REDIS_CLI SCRIPT LOAD "
local document_id = ARGV[1]
local user_id = ARGV[2]
local presence_data = ARGV[3]
local ttl = 300

-- Update presence data
local presence_key = 'presence:' .. document_id .. ':' .. user_id
redis.call('SETEX', presence_key, ttl, presence_data)

-- Add to active users set with expiry
local active_key = 'presence:active:' .. document_id
redis.call('SADD', active_key, user_id)
redis.call('EXPIRE', active_key, ttl)

-- Publish presence update
local channel = 'doc:presence:' .. document_id
redis.call('PUBLISH', channel, cjson.encode({
    type = 'presence_update',
    user_id = user_id,
    data = presence_data,
    timestamp = redis.call('TIME')[1]
}))

return redis.call('SCARD', active_key)
")

# Script for atomic document update with conflict detection
DOC_UPDATE_SCRIPT_SHA=$($REDIS_CLI SCRIPT LOAD "
local document_id = ARGV[1]
local vector_clock = ARGV[2]
local operations = ARGV[3]
local author_id = ARGV[4]

-- Check for conflicts by comparing vector clocks
local current_clock_key = 'doc:clock:' .. document_id
local current_clock = redis.call('GET', current_clock_key)

local has_conflict = false
if current_clock and current_clock ~= vector_clock then
    has_conflict = true
end

-- Store operations in CRDT log
local ops_key = 'doc:operations:' .. document_id
local sequence = redis.call('INCR', 'doc:sequence:' .. document_id)
local operation_data = cjson.encode({
    sequence = sequence,
    vector_clock = vector_clock,
    operations = operations,
    author_id = author_id,
    timestamp = redis.call('TIME')[1],
    has_conflict = has_conflict
})

redis.call('LPUSH', ops_key, operation_data)
redis.call('LTRIM', ops_key, 0, 999)  -- Keep last 1000 operations

-- Update document vector clock
redis.call('SET', current_clock_key, vector_clock)
redis.call('EXPIRE', current_clock_key, 3600)  -- 1 hour

-- Publish document change
local channel = 'doc:changes:' .. document_id
redis.call('PUBLISH', channel, operation_data)

return {sequence, has_conflict}
")

# Script for rate limiting
RATE_LIMIT_SCRIPT_SHA=$($REDIS_CLI SCRIPT LOAD "
local key = ARGV[1]
local limit = tonumber(ARGV[2])
local window = tonumber(ARGV[3])

local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, window)
end

return {current, limit - current, redis.call('TTL', key)}
")

# Store script SHAs for application use
$REDIS_CLI << EOF
HSET scripts:sha presence_update "$PRESENCE_SCRIPT_SHA"
HSET scripts:sha document_update "$DOC_UPDATE_SCRIPT_SHA"
HSET scripts:sha rate_limit "$RATE_LIMIT_SCRIPT_SHA"
EOF

# Set up monitoring keys
echo -e "${YELLOW}📊 Setting up monitoring and metrics...${NC}"
$REDIS_CLI << 'EOF'
# Initialize counters for monitoring
SET stats:documents:active 0
SET stats:users:online 0
SET stats:operations:total 0
SET stats:connections:websocket 0

# Set up health check keys
SETEX health:redis 60 "OK"
SETEX health:scripts 60 "loaded"

PING
EOF

# Configure Redis persistence
echo -e "${YELLOW}💾 Configuring persistence...${NC}"
$REDIS_CLI << 'EOF'
# Configure RDB snapshots
CONFIG SET save "900 1 300 10 60 10000"

# Configure AOF persistence
CONFIG SET appendonly yes
CONFIG SET appendfsync everysec
CONFIG SET no-appendfsync-on-rewrite no

# Configure memory optimization
CONFIG SET hash-max-ziplist-entries 512
CONFIG SET hash-max-ziplist-value 64
CONFIG SET list-max-ziplist-size -2
CONFIG SET set-max-intset-entries 512
CONFIG SET zset-max-ziplist-entries 128
CONFIG SET zset-max-ziplist-value 64

PING
EOF

# Create cleanup script for old data
echo -e "${YELLOW}🧹 Setting up data cleanup...${NC}"
CLEANUP_SCRIPT_SHA=$($REDIS_CLI SCRIPT LOAD "
-- Clean up old presence data
local presence_keys = redis.call('KEYS', 'presence:*')
local cleaned = 0

for i = 1, #presence_keys do
    local ttl = redis.call('TTL', presence_keys[i])
    if ttl == -1 then
        redis.call('EXPIRE', presence_keys[i], 300)
        cleaned = cleaned + 1
    end
end

-- Clean up old operation logs (keep last 1000 per document)
local ops_keys = redis.call('KEYS', 'doc:operations:*')
for i = 1, #ops_keys do
    redis.call('LTRIM', ops_keys[i], 0, 999)
end

-- Update cleanup stats
redis.call('SET', 'stats:cleanup:last_run', redis.call('TIME')[1])
redis.call('INCR', 'stats:cleanup:total_runs')

return cleaned
")

$REDIS_CLI HSET scripts:sha cleanup "$CLEANUP_SCRIPT_SHA"

# Test all functionality
echo -e "${YELLOW}🧪 Running functionality tests...${NC}"
$REDIS_CLI << 'EOF'
# Test basic operations
SET test:key "Hello Candlefish"
GET test:key
DEL test:key

# Test pub/sub (this will just set up, actual testing needs separate connection)
PUBLISH test:channel "Test message"

# Test Lua script execution
EVALSHA
EOF

# Get the presence script SHA and test it
PRESENCE_SHA=$($REDIS_CLI HGET scripts:sha presence_update)
TEST_RESULT=$($REDIS_CLI EVALSHA $PRESENCE_SHA 0 "test-doc-123" "test-user-456" '{"cursor": {"x": 100, "y": 200}}')

echo -e "${GREEN}✅ Test completed - Active users in test document: $TEST_RESULT${NC}"

# Display configuration summary
echo -e "${GREEN}🎉 Redis initialization completed successfully!${NC}"
echo ""
echo "Redis Configuration:"
echo "  Host: $REDIS_HOST"
echo "  Port: $REDIS_PORT"
echo "  Max Memory: 256MB"
echo "  Policy: allkeys-lru"
echo "  Persistence: RDB + AOF"
echo ""
echo "Database Layout:"
echo "  DB 0: Sessions & Presence"
echo "  DB 1: Document Cache"
echo "  DB 2: User Cache"
echo "  DB 3: Notification Queues"
echo "  DB 4: Rate Limiting"
echo "  DB 5: CRDT Operations"
echo "  DB 6: WebSocket Tracking"
echo "  DB 7: Locks & Temp Data"
echo ""
echo "Pub/Sub Channels:"
echo "  doc:changes:{id} - Document updates"
echo "  doc:presence:{id} - User presence"
echo "  doc:comments:{id} - Comments/reactions"
echo "  user:notifications:{id} - User notifications"
echo "  system:events - System-wide events"
echo ""
echo "Available Scripts:"
echo "  presence_update - Atomic presence updates"
echo "  document_update - CRDT document operations"
echo "  rate_limit - Request rate limiting"
echo "  cleanup - Data cleanup utilities"
echo ""
echo -e "${YELLOW}💡 Run cleanup script periodically: EVALSHA \$(redis-cli HGET scripts:sha cleanup) 0${NC}"
