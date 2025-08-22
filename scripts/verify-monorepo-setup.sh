#!/usr/bin/env bash
set -euo pipefail

# Verify the monorepo setup is complete and working

echo "🔍 Verifying Candlefish AI Monorepo Setup"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Helper functions
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1 exists"
    else
        echo "❌ $1 missing"
        ((ERRORS++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1 exists"
    else
        echo "❌ $1 missing"
        ((ERRORS++))
    fi
}

check_command() {
    if command -v "$1" &> /dev/null; then
        echo "✅ $1 installed"
    else
        echo "⚠️  $1 not installed"
        ((WARNINGS++))
    fi
}

echo "📁 Checking directory structure..."
check_dir ".devcontainer"
check_dir "infra/devcontainer"
check_dir "scripts"
check_dir "apps"
check_dir "services"
check_dir ".github/workflows"
echo ""

echo "📄 Checking configuration files..."
check_file ".devcontainer/devcontainer.json"
check_file "infra/devcontainer/post-create.sh"
check_file "pnpm-workspace.yaml"
check_file "turbo.json"
check_file "pyproject.toml"
check_file ".pre-commit-config.yaml"
check_file ".editorconfig"
check_file ".gitattributes"
check_file ".gitignore"
check_file "CODEOWNERS"
echo ""

echo "🔧 Checking CI/CD..."
check_file ".github/workflows/ci.yml"
echo ""

echo "🔑 Checking scripts..."
check_file "scripts/secrets-bootstrap.sh"
check_file "scripts/migrate-repos-to-monorepo.sh"
check_file "scripts/setup-github-repo.sh"
echo ""

echo "📦 Checking tools..."
check_command "pnpm"
check_command "node"
check_command "git"
check_command "gh"
check_command "aws"
echo ""

echo "🧑‍💻 Checking Node.js setup..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  Node version: $NODE_VERSION"
    if [[ $NODE_VERSION == v22* ]] || [[ $NODE_VERSION == v20* ]] || [[ $NODE_VERSION == v18* ]]; then
        echo "  ✅ Node version compatible"
    else
        echo "  ⚠️  Node version may be outdated"
        ((WARNINGS++))
    fi
fi
echo ""

echo "📦 Checking pnpm setup..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo "  pnpm version: $PNPM_VERSION"
    if [ -f "pnpm-lock.yaml" ]; then
        echo "  ✅ pnpm lockfile exists"
    else
        echo "  ⚠️  No pnpm lockfile found"
        ((WARNINGS++))
    fi
fi
echo ""

echo "🐍 Checking Python setup..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "  Python version: $PYTHON_VERSION"
fi
if command -v uv &> /dev/null; then
    echo "  ✅ uv installed"
else
    echo "  ⚠️  uv not installed (optional for Python packages)"
    ((WARNINGS++))
fi
echo ""

echo "🌐 Checking Git configuration..."
if [ -d ".git" ]; then
    echo "  ✅ Git repository initialized"
    REMOTES=$(git remote -v | grep origin | head -1)
    if [ -n "$REMOTES" ]; then
        echo "  ✅ Remote origin configured"
        echo "     $REMOTES"
    else
        echo "  ⚠️  No remote origin configured"
        ((WARNINGS++))
    fi
else
    echo "  ❌ Not a git repository"
    ((ERRORS++))
fi
echo ""

echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✨ Perfect! Monorepo setup is complete and verified!"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Run: pnpm install"
    echo "  2. Run: pre-commit install"
    echo "  3. Load secrets: bash scripts/secrets-bootstrap.sh <app> dev"
    echo "  4. Start developing!"
elif [ $ERRORS -eq 0 ]; then
    echo "✅ Setup complete with $WARNINGS warnings"
    echo ""
    echo "💡 Recommendations:"
    [ $WARNINGS -gt 0 ] && echo "  - Review warnings above for optional improvements"
    echo "  - Run 'pnpm install' to install dependencies"
    echo "  - Run 'pre-commit install' to setup git hooks"
else
    echo "❌ Setup incomplete: $ERRORS errors, $WARNINGS warnings"
    echo ""
    echo "🔧 Please fix the errors above before proceeding"
    exit 1
fi

echo ""
