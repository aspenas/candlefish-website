#!/bin/bash

# Candlefish AI - Claude Code Agent Installation Script (Lite Version)
# This script installs the @agent functionality for Claude Code on any Mac
# Run: curl -sSL https://raw.githubusercontent.com/candlefish-ai/candlefish-ai/main/scripts/install-claude-agents-lite.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Candlefish AI - Claude Code Agent Installer (Lite)${NC}"
echo "======================================================"
echo ""

# Check if running on Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script is designed for macOS only${NC}"
    exit 1
fi

# Check if Claude Code is installed
if ! command -v claude-code &> /dev/null && ! command -v claude &> /dev/null; then
    echo -e "${YELLOW}⚠️  Claude Code not found. Installing...${NC}"
    npm install -g @anthropic/claude-code@latest || {
        echo -e "${RED}❌ Failed to install Claude Code${NC}"
        echo "Please install manually: npm install -g @anthropic/claude-code"
        exit 1
    }
fi

# Create .claude directory if it doesn't exist
CLAUDE_DIR="$HOME/.claude"
mkdir -p "$CLAUDE_DIR"
mkdir -p "$CLAUDE_DIR/agents"
mkdir -p "$CLAUDE_DIR/commands"

echo -e "${GREEN}✓ Claude directory structure created${NC}"

# Download agents directly from GitHub using git sparse-checkout
echo -e "${BLUE}📥 Downloading Candlefish AI agents...${NC}"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Use git sparse checkout to only get agent files
if command -v git &> /dev/null; then
    echo "Using git to fetch agents..."
    git clone --filter=blob:none --sparse https://github.com/candlefish-ai/candlefish-ai.git
    cd candlefish-ai
    git sparse-checkout set .claude/agents .claude/wshobson-agents
    
    # Copy agent files
    if [ -d ".claude/agents" ]; then
        cp -r .claude/agents/* "$CLAUDE_DIR/agents/" 2>/dev/null || true
    fi
    if [ -d ".claude/wshobson-agents" ]; then
        cp -r .claude/wshobson-agents/* "$CLAUDE_DIR/agents/" 2>/dev/null || true
    fi
else
    # Fallback: Download individual agent files
    echo "Downloading core agents directly..."
    
    # List of essential agents to download
    AGENTS=(
        "python-pro"
        "typescript-pro"
        "backend-architect"
        "frontend-developer"
        "deployment-engineer"
        "cloud-architect"
        "security-auditor"
        "test-automator"
        "data-scientist"
        "api-documenter"
        "debugger"
        "golang-pro"
        "rust-pro"
        "java-pro"
        "csharp-pro"
        "sql-pro"
        "ml-engineer"
        "performance-engineer"
        "code-reviewer"
        "devops-troubleshooter"
    )
    
    for agent in "${AGENTS[@]}"; do
        echo "  Downloading @${agent}..."
        curl -sSL "https://raw.githubusercontent.com/candlefish-ai/candlefish-ai/main/.claude/agents/${agent}.md" \
            -o "$CLAUDE_DIR/agents/${agent}.md" 2>/dev/null || true
    done
fi

# Count installed agents
AGENT_COUNT=$(ls -1 "$CLAUDE_DIR/agents"/*.md 2>/dev/null | wc -l | tr -d ' ')
echo -e "${GREEN}✓ Installed $AGENT_COUNT agents${NC}"

# Create the MCP agent server
echo -e "${BLUE}🔧 Setting up MCP agent server...${NC}"

cat > "$CLAUDE_DIR/agent-server.js" << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// MCP Server for Claude Code Agents
class AgentServer {
  constructor() {
    this.agentsPath = process.env.AGENTS_PATH?.replace('~', os.homedir()) || 
                      path.join(os.homedir(), '.claude', 'agents');
  }

  async handleRequest(request) {
    const { method, params } = request;
    
    switch (method) {
      case 'list':
        return this.listAgents();
      case 'load':
        return this.loadAgent(params.name);
      case 'search':
        return this.searchAgents(params.query);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  listAgents() {
    const agents = [];
    const files = fs.readdirSync(this.agentsPath);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const name = file.replace('.md', '');
        const content = fs.readFileSync(path.join(this.agentsPath, file), 'utf8');
        const lines = content.split('\n');
        let description = '';
        
        for (const line of lines) {
          if (line.startsWith('description:')) {
            description = line.replace('description:', '').trim();
            break;
          }
        }
        
        agents.push({
          name: `@${name}`,
          description: description || name,
          file
        });
      }
    }
    
    return agents;
  }

  loadAgent(name) {
    const agentName = name.replace('@', '');
    const agentPath = path.join(this.agentsPath, `${agentName}.md`);
    
    if (!fs.existsSync(agentPath)) {
      throw new Error(`Agent not found: ${name}`);
    }
    
    return fs.readFileSync(agentPath, 'utf8');
  }

  searchAgents(query) {
    const agents = this.listAgents();
    return agents.filter(agent => 
      agent.name.toLowerCase().includes(query.toLowerCase()) ||
      agent.description.toLowerCase().includes(query.toLowerCase())
    );
  }
}

// MCP Protocol Implementation
const server = new AgentServer();

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    const response = await server.handleRequest(request);
    
    console.log(JSON.stringify({
      id: request.id,
      result: response
    }));
  } catch (error) {
    console.error(JSON.stringify({
      id: request?.id,
      error: {
        code: -32603,
        message: error.message
      }
    }));
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  process.exit(0);
});

console.error('Agent MCP Server started');
EOF

chmod +x "$CLAUDE_DIR/agent-server.js"

# Create agent command wrapper
cat > "$CLAUDE_DIR/agent" << 'EOF'
#!/bin/bash

# Agent command for Claude Code
# Usage: agent <agent-name> [prompt]

AGENT_NAME="$1"
shift
PROMPT="$*"

CLAUDE_DIR="$HOME/.claude"

if [ -z "$AGENT_NAME" ]; then
  echo "🤖 Available Candlefish AI Agents:"
  echo ""
  ls -1 "$CLAUDE_DIR/agents"/*.md 2>/dev/null | xargs -n1 basename | sed 's/.md$//' | sed 's/^/  @/' | column
  echo ""
  echo "Usage: agent <agent-name> [prompt]"
  echo "Example: agent python-pro 'optimize this code'"
  exit 0
fi

# Load agent context
AGENT_FILE="$CLAUDE_DIR/agents/${AGENT_NAME}.md"
if [ ! -f "$AGENT_FILE" ]; then
  # Try with @ prefix removed
  AGENT_NAME="${AGENT_NAME#@}"
  AGENT_FILE="$CLAUDE_DIR/agents/${AGENT_NAME}.md"
fi

if [ ! -f "$AGENT_FILE" ]; then
  echo "❌ Agent not found: $AGENT_NAME"
  echo ""
  echo "Available agents:"
  ls -1 "$CLAUDE_DIR/agents"/*.md 2>/dev/null | xargs -n1 basename | sed 's/.md$//' | sed 's/^/  @/' | column
  exit 1
fi

echo "🤖 Loading @${AGENT_NAME} agent..."
echo ""
cat "$AGENT_FILE"
if [ -n "$PROMPT" ]; then
  echo ""
  echo "Prompt: $PROMPT"
fi
EOF

chmod +x "$CLAUDE_DIR/agent"

# Update Claude settings
echo -e "${BLUE}📝 Updating Claude Code settings...${NC}"

# Backup existing settings
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    cp "$CLAUDE_DIR/settings.json" "$CLAUDE_DIR/settings.json.backup.$(date +%Y%m%d-%H%M%S)"
fi

# Create new settings with agent support
cat > "$CLAUDE_DIR/settings.json" << EOF
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem"]
    },
    "agents": {
      "command": "node",
      "args": ["$CLAUDE_DIR/agent-server.js"],
      "env": {
        "AGENTS_PATH": "$CLAUDE_DIR/agents"
      }
    }
  },
  "agentsEnabled": true,
  "agentTrigger": "@",
  "agentsPath": "$CLAUDE_DIR/agents"
}
EOF

# Add to shell configuration
echo -e "${BLUE}🔧 Setting up shell integration...${NC}"

# Function to add to shell config
add_to_shell_config() {
    local shell_config="$1"
    local marker="# Candlefish AI Claude Agents"
    
    if [ -f "$shell_config" ]; then
        # Remove old configuration if exists
        sed -i.bak "/$marker/,/# End Candlefish AI/d" "$shell_config" 2>/dev/null || true
        
        # Add new configuration
        cat >> "$shell_config" << EOF

$marker
export CLAUDE_AGENTS_PATH="$CLAUDE_DIR/agents"
export CLAUDE_AGENTS_ENABLED=true
alias agent="$CLAUDE_DIR/agent"
alias cf@="$CLAUDE_DIR/agent"
# End Candlefish AI
EOF
        echo -e "${GREEN}✓ Updated $shell_config${NC}"
    fi
}

# Update both bash and zsh configs
add_to_shell_config "$HOME/.bashrc"
add_to_shell_config "$HOME/.zshrc"
add_to_shell_config "$HOME/.bash_profile"

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Final instructions
echo ""
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Installed $AGENT_COUNT agents${NC}"
echo ""

if [ $AGENT_COUNT -gt 0 ]; then
    echo "Sample agents installed:"
    ls -1 "$CLAUDE_DIR/agents"/*.md 2>/dev/null | xargs -n1 basename | sed 's/.md$//' | sed 's/^/  @/' | head -10
    if [ $AGENT_COUNT -gt 10 ]; then
        echo "  ... and $(($AGENT_COUNT - 10)) more"
    fi
else
    echo -e "${YELLOW}⚠️  No agents were downloaded. You may need to install git and run again.${NC}"
fi

echo ""
echo -e "${BLUE}🎯 How to Use:${NC}"
echo ""
echo "1. From terminal (works now):"
echo "   ${GREEN}agent python-pro${NC}"
echo "   ${GREEN}agent backend-architect 'design a REST API'${NC}"
echo ""
echo "2. In Claude Code (after restart):"
echo "   ${GREEN}@python-pro help me optimize this code${NC}"
echo "   ${GREEN}@backend-architect design a microservices architecture${NC}"
echo ""
echo "3. List all agents:"
echo "   ${GREEN}agent${NC} (without arguments)"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT: To activate @ commands in Claude Code:${NC}"
echo "   1. Restart Claude Code: ${GREEN}pkill 'Claude Code' && open -a 'Claude Code'${NC}"
echo "   2. Reload your shell: ${GREEN}source ~/.zshrc${NC} or open a new terminal"
echo ""

echo -e "${BLUE}📚 Documentation:${NC}"
echo "   View agent details: ${GREEN}cat ~/.claude/agents/<agent-name>.md${NC}"
echo ""

echo -e "${GREEN}🚀 Candlefish AI Agents ready to use!${NC}"

# Test the installation
echo ""
echo -e "${BLUE}🧪 Testing installation...${NC}"
if [ -f "$CLAUDE_DIR/agent" ] && [ -x "$CLAUDE_DIR/agent" ]; then
    echo -e "${GREEN}✓ Agent command is working${NC}"
else
    echo -e "${RED}❌ Agent command not properly installed${NC}"
fi

if [ $AGENT_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Agents downloaded successfully${NC}"
else
    echo -e "${RED}❌ No agents downloaded - please install git and run again${NC}"
fi