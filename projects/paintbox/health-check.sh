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
