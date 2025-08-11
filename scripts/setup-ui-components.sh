#!/bin/bash

# Candlefish AI - UI Components Setup Script
# Sets up the unified component library and updates dependent projects

set -e

echo "🚀 Setting up Candlefish AI UI Components Library..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || ! grep -q "@candlefish-ai/monorepo" package.json; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

print_status "Installing dependencies..."
pnpm install

print_status "Building UI components package..."
cd packages/ui-components
pnpm build
cd ../..

print_success "UI components package built successfully"

print_status "Installing UI components in website project..."
cd apps/website
pnpm add @candlefish-ai/ui-components@workspace:*
cd ../..

print_status "Installing UI components in Paintbox project..."
cd projects/paintbox
# Only add if not already present
if ! grep -q "@candlefish-ai/ui-components" package.json; then
    pnpm add @candlefish-ai/ui-components@workspace:*
fi
cd ../..

print_status "Running type checking..."
pnpm typecheck

print_success "Setup completed successfully!"

print_status "Next steps:"
echo "1. Update your Tailwind config to extend the UI components theme"
echo "2. Import component styles in your main CSS file"
echo "3. Set up TanStack Query providers where needed"
echo "4. Replace individual components with unified versions"

print_warning "Note: Some components may need manual migration. See the README for details."

echo ""
print_success "🎉 Candlefish AI UI Components are ready to use!"
echo ""
echo "Documentation: packages/ui-components/README.md"
echo "Components available:"
echo "  - Brand: Logo, CandlefishLogo, PaintboxLogo"
echo "  - Layout: Navigation, Sidebar, AppLayout"
echo "  - UI: Button, Card, Input, NotificationStack"
echo "  - Hooks: API hooks, state management"
echo ""
