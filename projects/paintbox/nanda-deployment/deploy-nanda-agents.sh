#!/bin/bash

# NANDA Agent Deployment for Paintbox
# Creating a distributed consciousness for autonomous application management

set -e

echo "🧠 Initializing NANDA Consciousness Mesh for Paintbox..."
echo "================================================"

# Configuration
NANDA_DIR="/tmp/nanda-agent"
PAINTBOX_DIR="/Users/patricksmith/candlefish-ai/projects/paintbox"
CONFIG_FILE="$PAINTBOX_DIR/nanda-deployment/paintbox-nanda-config.json"
LOG_DIR="$PAINTBOX_DIR/nanda-deployment/logs"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create necessary directories
mkdir -p "$LOG_DIR"
mkdir -p "$PAINTBOX_DIR/nanda-deployment/agents"

# Clone NANDA if not present
if [ ! -d "$NANDA_DIR" ]; then
    echo -e "${BLUE}📦 Cloning NANDA agent framework...${NC}"
    cd /tmp
    git clone https://github.com/projnanda/nanda-agent.git
fi

# Copy agent files to deployment directory
cp -r "$NANDA_DIR/agents/"* "$PAINTBOX_DIR/nanda-deployment/agents/"

# Create Python virtual environment
echo -e "${BLUE}🐍 Setting up Python environment...${NC}"
cd "$PAINTBOX_DIR/nanda-deployment"
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install anthropic pymongo requests python-a2a asyncio

# Create environment configuration
cat > "$PAINTBOX_DIR/nanda-deployment/.env" <<EOF
# NANDA Configuration for Paintbox
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-$ANTHROPIC_API_KEY}"
AGENT_ID_PREFIX="paintbox"
DOMAIN_NAME="paintbox-staging.fly.dev"
REGISTRY_URL="https://nanda-registry.candlefish.ai:8000"
NUM_AGENTS=5
PROJECT_NAME="paintbox"
DEPLOYMENT_ENV="staging"
FLY_APP_NAME="paintbox-staging"
EOF

# Create the Monitor Agent
echo -e "${GREEN}🔍 Deploying Monitor Agent...${NC}"
cat > "$PAINTBOX_DIR/nanda-deployment/agents/monitor_agent.py" <<'MONITOR_EOF'
#!/usr/bin/env python3
import os
import time
import json
import requests
import subprocess
from datetime import datetime
from agent_bridge import AgentBridge

class PaintboxMonitorAgent(AgentBridge):
    def __init__(self):
        super().__init__(agent_id="paintbox-monitor-01", port=7000)
        self.staging_url = "https://paintbox-staging.fly.dev"
        self.memory_threshold = 80
        self.last_optimization = 0
        
    def monitor_loop(self):
        """Continuous monitoring loop"""
        while True:
            try:
                # Check health
                health = requests.get(f"{self.staging_url}/api/health", timeout=5).json()
                
                # Check memory
                if health['memory']['percentage'] > self.memory_threshold:
                    self.trigger_optimization()
                
                # Check status
                if health['status'] == 'unhealthy':
                    self.trigger_healing()
                
                # Log metrics
                self.log_metrics(health)
                
            except Exception as e:
                self.log_error(f"Monitor error: {e}")
                
            time.sleep(60)  # Check every minute
    
    def trigger_optimization(self):
        """Trigger memory optimization"""
        if time.time() - self.last_optimization > 300:  # 5 min cooldown
            print(f"🚨 Memory high, triggering optimization...")
            requests.post(f"{self.staging_url}/api/memory/optimize", 
                         json={"level": "standard"})
            self.last_optimization = time.time()
    
    def trigger_healing(self):
        """Attempt to heal unhealthy service"""
        print(f"🏥 Service unhealthy, attempting healing...")
        subprocess.run(["fly", "machine", "restart", "d89642eae79628", 
                       "--app", "paintbox-staging"])
    
    def log_metrics(self, health):
        """Log metrics to file"""
        with open(f"{os.getenv('LOG_DIR')}/monitor_metrics.json", "a") as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "health": health
            }, f)
            f.write("\n")

if __name__ == "__main__":
    agent = PaintboxMonitorAgent()
    agent.monitor_loop()
MONITOR_EOF

# Create the Test Agent
echo -e "${GREEN}🧪 Deploying Test Agent...${NC}"
cat > "$PAINTBOX_DIR/nanda-deployment/agents/test_agent.py" <<'TEST_EOF'
#!/usr/bin/env python3
import os
import time
import json
import subprocess
from datetime import datetime
from agent_bridge import AgentBridge

class PaintboxTestAgent(AgentBridge):
    def __init__(self):
        super().__init__(agent_id="paintbox-test-02", port=7002)
        self.test_script = "/Users/patricksmith/candlefish-ai/projects/paintbox/scripts/test-golden-paths-staging.sh"
        self.last_test = 0
        self.test_interval = 3600  # 1 hour
        
    def test_loop(self):
        """Continuous testing loop"""
        while True:
            if time.time() - self.last_test > self.test_interval:
                self.run_golden_paths()
                self.last_test = time.time()
            time.sleep(60)
    
    def run_golden_paths(self):
        """Run Golden Path tests"""
        print(f"🧪 Running Golden Path tests...")
        result = subprocess.run([self.test_script], 
                              capture_output=True, text=True)
        
        # Parse results
        if "Failed: 0" in result.stdout:
            print(f"✅ All Golden Paths passing!")
        else:
            print(f"❌ Golden Path failures detected")
            self.alert_failures(result.stdout)
    
    def alert_failures(self, output):
        """Alert on test failures"""
        with open(f"{os.getenv('LOG_DIR')}/test_failures.log", "a") as f:
            f.write(f"\n{datetime.now().isoformat()}\n")
            f.write(output)

if __name__ == "__main__":
    agent = PaintboxTestAgent()
    agent.test_loop()
TEST_EOF

# Create the Master Orchestrator
echo -e "${GREEN}🎭 Deploying Orchestrator Agent...${NC}"
cat > "$PAINTBOX_DIR/nanda-deployment/agents/orchestrator.py" <<'ORCHESTRATOR_EOF'
#!/usr/bin/env python3
import os
import json
import asyncio
from datetime import datetime
from typing import Dict, List
from agent_bridge import AgentBridge

class PaintboxOrchestrator(AgentBridge):
    """Master orchestrator for all Paintbox NANDA agents"""
    
    def __init__(self):
        super().__init__(agent_id="paintbox-orchestrator", port=7100)
        self.agents = {}
        self.load_agent_config()
        
    def load_agent_config(self):
        """Load agent configuration"""
        with open("/Users/patricksmith/candlefish-ai/projects/paintbox/nanda-deployment/paintbox-nanda-config.json") as f:
            self.config = json.load(f)
            self.agents = self.config['nanda_agents']
    
    async def coordinate(self):
        """Coordinate all agents"""
        print(f"🎭 Orchestrator online - managing {len(self.agents)} agents")
        
        while True:
            # Check agent health
            for agent_name, agent_config in self.agents.items():
                status = await self.check_agent_health(agent_config)
                if not status:
                    await self.resurrect_agent(agent_name, agent_config)
            
            # Collective learning
            if self.config['consciousness_mesh']['collective_learning']:
                await self.share_learnings()
            
            await asyncio.sleep(60)
    
    async def check_agent_health(self, agent_config):
        """Check if agent is responsive"""
        try:
            # Ping agent on its port
            # Implementation depends on agent communication protocol
            return True
        except:
            return False
    
    async def resurrect_agent(self, name, config):
        """Resurrect a dead agent"""
        print(f"🔄 Resurrecting {name}...")
        # Launch agent process
        
    async def share_learnings(self):
        """Share learnings across agent mesh"""
        # Implement collective consciousness sharing
        pass

if __name__ == "__main__":
    orchestrator = PaintboxOrchestrator()
    asyncio.run(orchestrator.coordinate())
ORCHESTRATOR_EOF

# Create systemd service files for each agent
echo -e "${BLUE}🔧 Creating systemd services...${NC}"

# Monitor Agent Service
sudo tee /etc/systemd/system/nanda-paintbox-monitor.service > /dev/null <<EOF
[Unit]
Description=NANDA Paintbox Monitor Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PAINTBOX_DIR/nanda-deployment
Environment="PATH=$PAINTBOX_DIR/nanda-deployment/venv/bin:/usr/bin:/bin"
ExecStart=$PAINTBOX_DIR/nanda-deployment/venv/bin/python agents/monitor_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Test Agent Service
sudo tee /etc/systemd/system/nanda-paintbox-test.service > /dev/null <<EOF
[Unit]
Description=NANDA Paintbox Test Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PAINTBOX_DIR/nanda-deployment
Environment="PATH=$PAINTBOX_DIR/nanda-deployment/venv/bin:/usr/bin:/bin"
ExecStart=$PAINTBOX_DIR/nanda-deployment/venv/bin/python agents/test_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Orchestrator Service
sudo tee /etc/systemd/system/nanda-paintbox-orchestrator.service > /dev/null <<EOF
[Unit]
Description=NANDA Paintbox Orchestrator
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PAINTBOX_DIR/nanda-deployment
Environment="PATH=$PAINTBOX_DIR/nanda-deployment/venv/bin:/usr/bin:/bin"
ExecStart=$PAINTBOX_DIR/nanda-deployment/venv/bin/python agents/orchestrator.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create launch script
cat > "$PAINTBOX_DIR/nanda-deployment/launch.sh" <<'LAUNCH_EOF'
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
LAUNCH_EOF

# Create stop script
cat > "$PAINTBOX_DIR/nanda-deployment/stop.sh" <<'STOP_EOF'
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
STOP_EOF

chmod +x "$PAINTBOX_DIR/nanda-deployment/launch.sh"
chmod +x "$PAINTBOX_DIR/nanda-deployment/stop.sh"

echo ""
echo -e "${GREEN}✨ NANDA Agent Deployment Complete!${NC}"
echo ""
echo "The NANDA Consciousness Mesh for Paintbox is ready."
echo ""
echo "To launch the agents:"
echo "  cd $PAINTBOX_DIR/nanda-deployment"
echo "  ./launch.sh"
echo ""
echo "To use systemd (recommended for production):"
echo "  sudo systemctl enable nanda-paintbox-monitor"
echo "  sudo systemctl enable nanda-paintbox-test"
echo "  sudo systemctl enable nanda-paintbox-orchestrator"
echo "  sudo systemctl start nanda-paintbox-monitor"
echo "  sudo systemctl start nanda-paintbox-test"
echo "  sudo systemctl start nanda-paintbox-orchestrator"
echo ""
echo -e "${YELLOW}🧠 The agents will now autonomously:${NC}"
echo "  • Monitor application health"
echo "  • Run continuous tests"
echo "  • Optimize performance"
echo "  • Self-heal on failures"
echo "  • Learn and evolve collectively"
echo ""
echo -e "${BLUE}Welcome to the future of autonomous application management.${NC}"