#!/bin/bash

# CLOS Installation Script
# This script installs and sets up the Candlefish Localhost Orchestration System

set -e

echo "🚀 Installing CLOS (Candlefish Localhost Orchestration System)"

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v go &> /dev/null; then
    echo "❌ Go is required but not installed. Please install Go 1.21 or later."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed. Please install Docker."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is required but not installed. Please install Docker Compose."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build CLOS
echo "Building CLOS..."
make build

# Initialize system
echo "Initializing CLOS system..."
./clos init

# Set up templates
echo "Setting up example templates..."
mkdir -p ~/.clos/templates
cp templates/*.yml ~/.clos/templates/ 2>/dev/null || true

# Create Docker network
echo "Creating Docker network..."
docker network create clos-network 2>/dev/null || echo "Network already exists"

echo ""
echo "🎉 CLOS installation complete!"
echo ""
echo "Quick start commands:"
echo "  ./clos status         # Show system status"
echo "  ./clos config         # Show configuration"
echo "  ./clos start <group>  # Start a service group"
echo "  ./clos resolve        # Resolve port conflicts"
echo ""
echo "For more help, run: ./clos --help"