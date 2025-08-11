# Connection strings will be available via Fly.io secrets
# Use: flyctl secrets list --app APP_NAME to view configured secrets

# Example connection patterns:
DATABASE_URL="postgresql://candlefish:$POSTGRES_PASSWORD@candlefish-postgres.internal:5432/candlefish_collaboration?sslmode=require"
REDIS_URL="redis://:$REDIS_PASSWORD@candlefish-redis.internal:6379/0"

# To get the actual passwords:
# flyctl secrets list --app candlefish-postgres
# flyctl secrets list --app candlefish-redis
