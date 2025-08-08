#!/bin/bash

# Candlefish AI Dashboard - Complete Installation Script
# This script installs and configures everything needed for the dashboard

set -e

echo "🐟 Candlefish AI Dashboard Installation"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "No package.json found. Are you in the project directory?"
    exit 1
fi

# Check system requirements
print_info "Checking system requirements..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: v$NPM_VERSION"
else
    print_error "npm not found. Please install npm."
    exit 1
fi

# Check Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    print_status "Git found: $GIT_VERSION"
else
    print_error "Git not found. Please install Git from https://git-scm.com/"
    exit 1
fi

echo ""
print_info "Installing @candlefish/create-dashboard CLI..."

# Install and run the setup
npx @candlefish/create-dashboard@latest setup

echo ""
print_status "Installation complete!"
echo ""
echo "🎉 Your Candlefish AI Dashboard is ready!"
echo ""
echo "Next commands you can run:"
echo -e "  ${BLUE}npm run dev${NC}                    # Start development server"
echo -e "  ${BLUE}npm run build${NC}                  # Build for production"
echo -e "  ${BLUE}npm run deploy${NC}                 # Deploy to production"
echo -e "  ${BLUE}npm run test${NC}                   # Run tests"
echo -e "  ${BLUE}npm run validate${NC}               # Validate configuration"
echo ""
echo "Family dashboard commands:"
echo -e "  ${BLUE}npm run family:dev${NC}             # Family dashboard dev server"
echo -e "  ${BLUE}npm run family:build${NC}           # Build family dashboard"
echo -e "  ${BLUE}npm run family:deploy${NC}          # Deploy family dashboard"
echo ""
echo "Configuration files created:"
echo -e "  ${GREEN}.env.example${NC}                  # Copy to .env and configure"
echo -e "  ${GREEN}deployment.config.json${NC}        # Multi-target deployment config"
echo -e "  ${GREEN}scripts/deploy.js${NC}             # Unified deployment script"
echo ""
echo "📖 View complete guide: ./INSTALLATION_GUIDE.md"
echo ""
