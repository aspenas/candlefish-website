#!/bin/bash

# Paintbox Deployment Monitor
# Monitor deployment status and health

APP_NAME="paintbox-app"
TIMEOUT_SECONDS=1200  # 20 minutes
CHECK_INTERVAL=10     # 10 seconds

echo "🔍 Starting deployment monitoring for $APP_NAME"
echo "⏱️  Timeout: ${TIMEOUT_SECONDS}s, Check interval: ${CHECK_INTERVAL}s"
echo "🌐 Target URL: https://${APP_NAME}.fly.dev"
echo ""

start_time=$(date +%s)

while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))

    if [ $elapsed -gt $TIMEOUT_SECONDS ]; then
        echo "❌ Deployment monitoring timeout after ${TIMEOUT_SECONDS}s"
        exit 1
    fi

    echo "⏱️  Elapsed: ${elapsed}s - Checking deployment status..."

    # Check Fly.io status
    status_output=$(flyctl status --app "$APP_NAME" 2>&1)
    status_exit_code=$?

    if [ $status_exit_code -eq 0 ]; then
        echo "✅ Fly.io app exists and accessible"

        # Extract key information
        if echo "$status_output" | grep -q "Status.*running"; then
            echo "🟢 App Status: RUNNING"

            # Test health endpoint
            echo "🏥 Testing health endpoint..."
            health_response=$(curl -s -o /dev/null -w "%{http_code}" "https://${APP_NAME}.fly.dev/api/health" 2>/dev/null || echo "000")

            if [ "$health_response" = "200" ]; then
                echo "✅ DEPLOYMENT SUCCESSFUL!"
                echo "🌐 Application is live at: https://${APP_NAME}.fly.dev"
                echo "🏥 Health check: https://${APP_NAME}.fly.dev/api/health"
                echo "📊 Logs: flyctl logs --app $APP_NAME"
                echo "📈 Status: flyctl status --app $APP_NAME"
                exit 0
            elif [ "$health_response" = "000" ]; then
                echo "🟡 App running but health endpoint not responding yet..."
            else
                echo "🟡 Health endpoint returned: $health_response (expected 200)"
            fi
        else
            echo "🟡 App Status: $(echo "$status_output" | grep "Status" | head -1 || echo "Unknown")"
        fi
    else
        echo "🟡 Fly.io status check failed, app may still be deploying..."
    fi

    echo "🔄 Next check in ${CHECK_INTERVAL}s..."
    echo ""
    sleep $CHECK_INTERVAL
done
