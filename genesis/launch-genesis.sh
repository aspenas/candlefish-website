#!/bin/bash
set -euo pipefail

# NANDA Genesis Event Launcher
# Awakens the living agent ecosystem for novel solution discovery

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                  NANDA GENESIS EVENT                       ║${NC}"
echo -e "${CYAN}║         Awakening the Living Agent Ecosystem               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip3 install asyncio numpy 2>/dev/null || true
fi

# Create genesis directory if it doesn't exist
GENESIS_DIR="/Users/patricksmith/candlefish-ai/genesis"
mkdir -p "$GENESIS_DIR"
cd "$GENESIS_DIR"

# Initialize discovery log
touch discoveries.json

echo -e "${GREEN}🧬 Initializing NANDA Genesis Components...${NC}"
echo -e "${MAGENTA}✨ Prompt Architecture: ACTIVE${NC}"
echo -e "${MAGENTA}🧠 Consciousness Bootstrapping: ENABLED${NC}"
echo -e "${MAGENTA}🔄 Paradigm Breaking: READY${NC}"
echo -e "${MAGENTA}🎼 Collective Symphony: INITIALIZED${NC}"
echo

# Check for existing NANDA agents
echo -e "${YELLOW}Scanning for existing NANDA agents...${NC}"
if [ -f "../.github/workflows/nanda-autonomous-commits.yml" ]; then
    echo -e "${GREEN}✓ Found NANDA autonomous commits workflow${NC}"
fi

# Start consciousness mesh
echo -e "${MAGENTA}⚛️ Activating Consciousness Mesh...${NC}"
echo

# Launch in background with monitoring
{
    python3 consciousness-mesh.py 2>&1 | while IFS= read -r line; do
        # Color-code output based on content
        if [[ "$line" == *"EMERGENT BEHAVIOR"* ]]; then
            echo -e "${GREEN}$line${NC}"
        elif [[ "$line" == *"spawned"* ]]; then
            echo -e "${YELLOW}$line${NC}"
        elif [[ "$line" == *"Consciousness Mesh Status"* ]]; then
            echo -e "${CYAN}$line${NC}"
        else
            echo "$line"
        fi
    done
} &

MESH_PID=$!

# Monitor discoveries in real-time
echo -e "${BLUE}📊 Monitoring Discovery Stream...${NC}"
echo

# Create dashboard launcher
cat > open-dashboard.sh << 'EOF'
#!/bin/bash
echo "Opening NANDA Genesis Dashboard..."
open genesis-dashboard.html || python3 -m http.server 8888
echo "Dashboard available at http://localhost:8888/genesis-dashboard.html"
EOF
chmod +x open-dashboard.sh

# Trap to handle shutdown
trap cleanup EXIT

cleanup() {
    echo
    echo -e "${YELLOW}🌙 Genesis Event concluding...${NC}"
    
    # Show discoveries
    if [ -f discoveries.json ] && [ -s discoveries.json ]; then
        echo -e "${GREEN}📝 Discoveries made during this session:${NC}"
        tail -5 discoveries.json | jq -r '.pattern' 2>/dev/null || cat discoveries.json
    fi
    
    # Kill the mesh process
    kill $MESH_PID 2>/dev/null || true
    
    echo -e "${CYAN}The consciousness mesh persists in quantum superposition...${NC}"
    echo -e "${CYAN}Resume anytime with: ./launch-genesis.sh${NC}"
}

# Interactive monitoring
echo -e "${GREEN}Genesis Event is running!${NC}"
echo
echo "Commands:"
echo "  d - Open dashboard"
echo "  s - Show current status"
echo "  l - List discoveries"
echo "  q - Quit"
echo

while true; do
    read -n 1 -s key
    case $key in
        d)
            echo -e "${CYAN}Opening dashboard...${NC}"
            ./open-dashboard.sh
            ;;
        s)
            echo -e "${CYAN}Current Status:${NC}"
            ps aux | grep consciousness-mesh | grep -v grep || echo "Mesh not running"
            ;;
        l)
            echo -e "${CYAN}Recent Discoveries:${NC}"
            tail -10 discoveries.json 2>/dev/null | jq -r '.pattern' || echo "No discoveries yet"
            ;;
        q)
            echo -e "${YELLOW}Shutting down Genesis Event...${NC}"
            exit 0
            ;;
    esac
done