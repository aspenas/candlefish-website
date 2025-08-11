# Candlefish AI - Database Connection Strings

## Production-Ready Database Connections

### Internal Network Access (Fly.io Apps)

#### PostgreSQL
```bash
# Internal hostname (for apps deployed on Fly.io)
DATABASE_URL="postgresql://candlefish:[PASSWORD]@candlefish-postgres.internal:5432/candlefish_collaboration?sslmode=require"

# Individual components
POSTGRES_HOST="candlefish-postgres.internal"
POSTGRES_PORT="5432"
POSTGRES_USER="candlefish"
POSTGRES_DB="candlefish_collaboration"
POSTGRES_PASSWORD="[GET_FROM_SECRETS]"
```

#### Redis
```bash
# Internal hostname (for apps deployed on Fly.io)
REDIS_URL="redis://:[PASSWORD]@candlefish-redis.internal:6379/0"

# Individual components
REDIS_HOST="candlefish-redis.internal"
REDIS_PORT="6379"
REDIS_PASSWORD="[GET_FROM_SECRETS]"
REDIS_DB="0"
```

## How to Get Passwords

### PostgreSQL Password
```bash
flyctl secrets list --app candlefish-postgres
# Shows: POSTGRES_PASSWORD with digest (password is securely stored)
```

### Redis Password
```bash
flyctl secrets list --app candlefish-redis
# Shows: REDIS_PASSWORD with digest (password is securely stored)
```

## Setting Up Your Application

### For Node.js/TypeScript Applications
```javascript
// Environment variables to set in your Fly.io app
const config = {
  database: {
    url: process.env.DATABASE_URL,
    // or individual components:
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: { rejectUnauthorized: false }
  },
  redis: {
    url: process.env.REDIS_URL,
    // or individual components:
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  }
}
```

### For Python Applications
```python
import os
from sqlalchemy import create_engine
import redis

# PostgreSQL connection
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

# Redis connection  
REDIS_URL = os.getenv('REDIS_URL')
redis_client = redis.from_url(REDIS_URL)
```

## Setting Secrets in Your Application

### Example: Setting secrets for your API app
```bash
# Get the actual password values first (run these commands):
POSTGRES_PWD=$(flyctl secrets list --app candlefish-postgres --json | jq -r '.[] | select(.name=="POSTGRES_PASSWORD") | .digest')
REDIS_PWD=$(flyctl secrets list --app candlefish-redis --json | jq -r '.[] | select(.name=="REDIS_PASSWORD") | .digest')

# Then set them in your application:
flyctl secrets set \
  --app YOUR_APP_NAME \
  DATABASE_URL="postgresql://candlefish:[ACTUAL_PASSWORD]@candlefish-postgres.internal:5432/candlefish_collaboration?sslmode=require" \
  REDIS_URL="redis://:[ACTUAL_PASSWORD]@candlefish-redis.internal:6379/0" \
  POSTGRES_HOST="candlefish-postgres.internal" \
  POSTGRES_PORT="5432" \
  POSTGRES_USER="candlefish" \
  POSTGRES_DB="candlefish_collaboration" \
  POSTGRES_PASSWORD="[ACTUAL_PASSWORD]" \
  REDIS_HOST="candlefish-redis.internal" \
  REDIS_PORT="6379" \
  REDIS_PASSWORD="[ACTUAL_PASSWORD]"
```

## Connection Pool Recommendations

### PostgreSQL Connection Pool
```bash
# Recommended settings for production
DATABASE_POOL_SIZE="20"
DATABASE_MAX_OVERFLOW="10" 
DATABASE_POOL_TIMEOUT="30"
DATABASE_POOL_RECYCLE="3600"
```

### Redis Connection Pool
```bash
# Recommended settings for production
REDIS_MAX_CONNECTIONS="50"
REDIS_CONNECTION_TIMEOUT="10"
REDIS_SOCKET_TIMEOUT="10"
REDIS_RETRY_ON_TIMEOUT="true"
```

## Security Notes

1. **Passwords are encrypted** and stored in Fly.io secrets
2. **Internal network only** - databases are not exposed to public internet
3. **SSL/TLS enabled** for PostgreSQL connections
4. **Volume encryption** enabled for data at rest
5. **Regular password rotation** recommended every 90 days

## Monitoring & Health Checks

### Database Health Endpoints
```bash
# Check PostgreSQL health
flyctl ssh console --app candlefish-postgres --command "pg_isready -h localhost -p 5432 -U candlefish"

# Check Redis health  
flyctl ssh console --app candlefish-redis --command "redis-cli ping"
```

### Application Health Checks
Add these to your application's health check endpoint:
```javascript
// Example health check
app.get('/health', async (req, res) => {
  try {
    // Test PostgreSQL
    await db.raw('SELECT 1');
    
    // Test Redis
    await redis.ping();
    
    res.json({ 
      status: 'healthy',
      databases: {
        postgresql: 'connected',
        redis: 'connected'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message 
    });
  }
});
```

---

**Ready for production with 10+ initial users**  
**Estimated cost: ~$30-40/month**  
**Deployment completed**: August 10, 2025
