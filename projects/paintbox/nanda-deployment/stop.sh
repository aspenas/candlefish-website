#!/bin/bash

echo "🛑 Stopping NANDA Agents..."

LOG_DIR="/Users/patricksmith/candlefish-ai/projects/paintbox/nanda-deployment/logs"

for pidfile in $LOG_DIR/*.pid; do
    if [ -f "$pidfile" ]; then
        PID=$(cat "$pidfile")
        if ps -p $PID > /dev/null; then
            echo "Stopping process $PID..."
            kill $PID
        fi
        rm "$pidfile"
    fi
done

echo "✅ All agents stopped"
