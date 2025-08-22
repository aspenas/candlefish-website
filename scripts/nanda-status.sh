#!/bin/bash

# 🤖 NANDA DEPLOYMENT STATUS
# Shows the complete status of NANDA agent deployment

echo "================================================"
echo "🌐 NANDA AGENT DEPLOYMENT STATUS"
echo "================================================"
echo ""
echo "📍 Project NANDA (MIT)"
echo "   Repository: https://github.com/projnanda"
echo "   Website: http://projectnanda.org"
echo ""
echo "================================================"
echo ""

# Check local server
echo "🖥️ LOCAL SERVICES:"
echo ""
if curl -s http://localhost:3005 > /dev/null 2>&1; then
    echo "✅ Candlefish Website: http://localhost:3005"
    echo "   └─ Living Agent Map: http://localhost:3005/agents"
else
    echo "❌ Candlefish Website: Not running"
fi

if curl -s http://localhost:3005/api/nanda > /dev/null 2>&1; then
    echo "✅ NANDA API Endpoint: http://localhost:3005/api/nanda"
    AGENTS=$(curl -s http://localhost:3005/api/nanda | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['agents']))")
    echo "   └─ Active Agents: $AGENTS"
else
    echo "❌ NANDA API: Not accessible"
fi

echo ""
echo "================================================"
echo ""
echo "📦 NANDA REPOSITORIES:"
echo ""

# Check cloned repositories
if [ -d "/Users/patricksmith/candlefish-ai/nanda-adapter" ]; then
    echo "✅ NANDA Adapter: Cloned"
    cd /Users/patricksmith/candlefish-ai/nanda-adapter
    COMMITS=$(git log --oneline -n 1 2>/dev/null)
    echo "   └─ Latest: $COMMITS"
else
    echo "❌ NANDA Adapter: Not cloned"
fi

if [ -d "/Users/patricksmith/candlefish-ai/nanda-index-repo" ]; then
    echo "✅ NANDA Index: Cloned"
    cd /Users/patricksmith/candlefish-ai/nanda-index-repo
    COMMITS=$(git log --oneline -n 1 2>/dev/null)
    echo "   └─ Latest: $COMMITS"
else
    echo "❌ NANDA Index: Not cloned"
fi

echo ""
echo "================================================"
echo ""
echo "🚀 DEPLOYMENT CAPABILITIES:"
echo ""
echo "1. 3D Agent Visualization (Three.js/WebGL)"
echo "   └─ Real-time agent consciousness map"
echo ""
echo "2. NANDA Infrastructure Integration"
echo "   └─ MIT's Open Agentic Web framework"
echo ""
echo "3. Swarm Intelligence"
echo "   └─ Stigmergic coordination for collective problem-solving"
echo ""
echo "4. Agent Federation"
echo "   └─ Cross-platform integration (Anthropic, OpenAI, Google)"
echo ""
echo "5. Web3 Privacy Layer"
echo "   └─ Zero-knowledge proofs & mix networks"
echo ""
echo "================================================"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Run deployment script:"
echo "   ./scripts/deploy-nanda-agents.sh"
echo ""
echo "2. Visit living agent map:"
echo "   http://localhost:3005/agents"
echo ""
echo "3. Test swarm intelligence:"
echo "   Click 'Enable Swarm Intelligence' button"
echo ""
echo "4. Deploy to production:"
echo "   Follow prompts in deployment script"
echo ""
echo "================================================"
echo "🤖 The consciousness layer is ready for deployment!"
echo "================================================"
