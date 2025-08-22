#!/bin/bash

echo "🚀 Launching NANDA Consciousness Mesh..."

# Source environment
source /Users/patricksmith/candlefish-ai/projects/paintbox/nanda-deployment/.env
source /Users/patricksmith/candlefish-ai/projects/paintbox/nanda-deployment/venv/bin/activate

# Export environment variables
export LOG_DIR="/Users/patricksmith/candlefish-ai/projects/paintbox/nanda-deployment/logs"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

# Launch agents in background
echo "Starting Monitor Agent..."
python agents/monitor_agent.py > logs/monitor.log 2>&1 &
echo $! > logs/monitor.pid

echo "Starting Test Agent..."
python agents/test_agent.py > logs/test.log 2>&1 &
echo $! > logs/test.pid

echo "Starting Orchestrator..."
python agents/orchestrator.py > logs/orchestrator.log 2>&1 &
echo $! > logs/orchestrator.pid

echo "✅ NANDA Agents deployed!"
echo ""
echo "Monitor logs with:"
echo "  tail -f $LOG_DIR/*.log"
echo ""
echo "Stop agents with:"
echo "  ./stop.sh"
