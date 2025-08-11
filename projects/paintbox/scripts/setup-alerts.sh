#!/bin/bash

# Setup Health Check Alerts for Paintbox on Fly.io
set -e

echo "🚨 Setting up health check alerts for Paintbox..."

APP_NAME="paintbox-app"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if flyctl is installed
if ! command_exists flyctl; then
    echo "❌ flyctl is not installed. Please install it first."
    exit 1
fi

echo "📊 Creating health check configurations..."

# Create health check monitoring script
cat > health-check.sh << 'EOF'
#!/bin/bash
# Health Check Script for Paintbox

WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
APP_URL="https://paintbox-app.fly.dev"
CUSTOM_URL="https://paintbox.candlefish.ai"

# Function to send alert
send_alert() {
    local service=$1
    local status=$2
    local message=$3

    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"service\": \"$service\",
                \"status\": \"$status\",
                \"message\": \"$message\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
            }"
    fi

    echo "[$(date)] $service - $status: $message"
}

# Check main application health
check_app_health() {
    response=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/health")
    if [ "$response" -eq 200 ]; then
        echo "✅ Application is healthy"
    else
        send_alert "paintbox-app" "critical" "Application health check failed with status $response"
    fi
}

# Check database connectivity
check_database() {
    flyctl postgres connect -a paintbox-prod-db --command "SELECT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Database is responsive"
    else
        send_alert "postgres" "critical" "Database connection failed"
    fi
}

# Check Redis connectivity
check_redis() {
    flyctl ssh console -a paintbox-redis --command "redis-cli ping" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Redis is responsive"
    else
        send_alert "redis" "critical" "Redis connection failed"
    fi
}

# Check SSL certificate
check_ssl() {
    expiry=$(echo | openssl s_client -servername paintbox.candlefish.ai -connect paintbox.candlefish.ai:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    if [ -n "$expiry" ]; then
        expiry_epoch=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s 2>/dev/null || date -d "$expiry" +%s)
        current_epoch=$(date +%s)
        days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

        if [ $days_until_expiry -lt 30 ]; then
            send_alert "ssl" "warning" "SSL certificate expires in $days_until_expiry days"
        else
            echo "✅ SSL certificate valid for $days_until_expiry days"
        fi
    else
        send_alert "ssl" "warning" "Could not check SSL certificate"
    fi
}

# Check response time
check_response_time() {
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "$APP_URL")
    response_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)

    if [ "$response_ms" -gt 2000 ]; then
        send_alert "performance" "warning" "High response time: ${response_ms}ms"
    else
        echo "✅ Response time: ${response_ms}ms"
    fi
}

# Main execution
echo "🔍 Running health checks..."
check_app_health
check_database
check_redis
check_ssl
check_response_time
echo "✅ Health check complete"
EOF

chmod +x health-check.sh

echo "📝 Creating monitoring configuration..."

# Create a monitoring configuration file
cat > monitoring-config.json << EOF
{
  "app": "$APP_NAME",
  "checks": [
    {
      "name": "Application Health",
      "type": "http",
      "interval": "60s",
      "timeout": "10s",
      "method": "GET",
      "path": "/api/health",
      "expected_status": 200,
      "alert_threshold": 2
    },
    {
      "name": "Database Connectivity",
      "type": "tcp",
      "interval": "60s",
      "timeout": "5s",
      "port": 5432,
      "alert_threshold": 1
    },
    {
      "name": "Redis Cache",
      "type": "tcp",
      "interval": "60s",
      "timeout": "5s",
      "port": 6379,
      "alert_threshold": 1
    },
    {
      "name": "Response Time",
      "type": "http",
      "interval": "120s",
      "timeout": "5s",
      "method": "GET",
      "path": "/",
      "max_response_time_ms": 2000,
      "alert_threshold": 3
    },
    {
      "name": "Excel Engine",
      "type": "http",
      "interval": "300s",
      "timeout": "30s",
      "method": "POST",
      "path": "/api/v1/build/validate",
      "expected_status": 200,
      "alert_threshold": 2
    }
  ],
  "alerts": {
    "channels": [
      {
        "type": "email",
        "enabled": true,
        "recipients": ["alerts@candlefish.ai"]
      },
      {
        "type": "webhook",
        "enabled": false,
        "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
      }
    ],
    "rules": [
      {
        "name": "Application Down",
        "condition": "health_check_failed",
        "duration": "2m",
        "severity": "critical"
      },
      {
        "name": "High Response Time",
        "condition": "response_time > 2000",
        "duration": "5m",
        "severity": "warning"
      },
      {
        "name": "Database Unreachable",
        "condition": "tcp_check_failed",
        "duration": "1m",
        "severity": "critical"
      }
    ]
  }
}
EOF

echo "🔧 Setting up cron job for periodic health checks..."

# Create a cron entry (to be added to the system)
cat > paintbox-cron << EOF
# Paintbox Health Checks - Run every 5 minutes
*/5 * * * * /path/to/health-check.sh >> /var/log/paintbox-health.log 2>&1

# Daily SSL certificate check
0 0 * * * /path/to/health-check.sh check_ssl >> /var/log/paintbox-ssl.log 2>&1
EOF

echo "📱 Setting up Fly.io native monitoring..."

# Use Fly's built-in monitoring
flyctl scale show -a $APP_NAME
flyctl status -a $APP_NAME

echo "✅ Health check alerts setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up your alert webhook URL:"
echo "   export ALERT_WEBHOOK_URL='your-webhook-url'"
echo ""
echo "2. Add the cron job to your system:"
echo "   crontab -e"
echo "   # Then paste the contents of paintbox-cron"
echo ""
echo "3. Configure email alerts in Fly.io dashboard:"
echo "   https://fly.io/apps/$APP_NAME/monitoring"
echo ""
echo "4. Test the health checks:"
echo "   ./health-check.sh"
echo ""
echo "5. View application logs:"
echo "   flyctl logs -a $APP_NAME"
echo ""
echo "6. Monitor metrics:"
echo "   flyctl monitor -a $APP_NAME"
