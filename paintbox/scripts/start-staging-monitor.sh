#!/bin/bash
set -e

# Start Staging Monitoring in Background
# Date: January 19, 2025

MONITOR_SCRIPT="/Users/patricksmith/candlefish-ai/paintbox/scripts/monitor-staging.sh"
LOG_FILE="/Users/patricksmith/candlefish-ai/reports/staging-monitor-$(date +%Y%m%d-%H%M%S).log"
PID_FILE="/tmp/paintbox-staging-monitor.pid"

# Check if monitoring is already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "⚠️  Monitoring already running with PID $OLD_PID"
        echo "To stop it, run: kill $OLD_PID"
        exit 1
    else
        echo "Removing stale PID file"
        rm -f "$PID_FILE"
    fi
fi

echo "🚀 Starting staging environment monitoring..."
echo "Duration: 48 hours"
echo "Check interval: 5 minutes"
echo "Log file: $LOG_FILE"

# Start monitoring in background
nohup "$MONITOR_SCRIPT" continuous 48 300 > "$LOG_FILE" 2>&1 &
MONITOR_PID=$!

# Save PID
echo $MONITOR_PID > "$PID_FILE"

echo "✅ Monitoring started with PID: $MONITOR_PID"
echo ""
echo "Commands:"
echo "  View logs:    tail -f $LOG_FILE"
echo "  Check status: ps -p $MONITOR_PID"
echo "  Stop monitor: kill $MONITOR_PID"
echo ""
echo "The monitor will run for 48 hours and check every 5 minutes."
echo "Reports will be saved in the current directory."
