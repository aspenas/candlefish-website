#!/bin/bash

# CLOS Production Stop Script

echo "🛑 Stopping CLOS Production Environment"
echo "======================================="

# Read PIDs if file exists
if [ -f /tmp/clos-production.pid ]; then
    source /tmp/clos-production.pid
    
    echo "Stopping NANDA Orchestrator (PID: $NANDA_PID)..."
    kill $NANDA_PID 2>/dev/null || true
    
    echo "Stopping Auth Service (PID: $AUTH_PID)..."
    kill $AUTH_PID 2>/dev/null || true
    
    echo "Stopping Dashboard (PID: $DASHBOARD_PID)..."
    kill $DASHBOARD_PID 2>/dev/null || true
    
    rm /tmp/clos-production.pid
fi

# Kill any remaining services
echo "Cleaning up any remaining services..."
pkill -f "node.*orchestrator" || true
pkill -f "node.*server-auth" || true
pkill -f "node.*3500" || true
pkill -f "node.*3501" || true
pkill -f "node.*5100" || true

echo ""
echo "✅ All CLOS services stopped"
echo ""
echo "Note: PostgreSQL and Redis are still running (system services)"
echo "To stop them:"
echo "  • brew services stop postgresql@14"
echo "  • brew services stop redis"