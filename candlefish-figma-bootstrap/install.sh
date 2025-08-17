#!/bin/bash

# Candlefish Figma Plugin Installation Script
# This script automates the setup process for the plugin

echo "🎨 Candlefish Figma Plugin Installer"
echo "===================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm $(npm --version) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Build the plugin
echo ""
echo "🔨 Building plugin..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Plugin built successfully"

# Build scripts
echo ""
echo "🔧 Building utility scripts..."
npm run build:scripts

if [ $? -ne 0 ]; then
    echo "⚠️  Scripts build failed (optional)"
fi

# Generate tokens
echo ""
echo "🎨 Generating design tokens..."
npm run tokens

if [ $? -ne 0 ]; then
    echo "⚠️  Token generation failed (optional)"
fi

# Check for Figma Desktop
echo ""
echo "📱 Checking for Figma Desktop..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if [ -d "/Applications/Figma.app" ]; then
        echo "✅ Figma Desktop detected on macOS"
    else
        echo "⚠️  Figma Desktop not found at /Applications/Figma.app"
        echo "   Please install from: https://www.figma.com/downloads/"
    fi
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows
    if [ -d "$LOCALAPPDATA/Figma" ]; then
        echo "✅ Figma Desktop detected on Windows"
    else
        echo "⚠️  Figma Desktop not found"
        echo "   Please install from: https://www.figma.com/downloads/"
    fi
else
    # Linux
    echo "ℹ️  Please ensure Figma Desktop is installed"
    echo "   Download from: https://www.figma.com/downloads/"
fi

# Installation instructions
echo ""
echo "📋 Installation Complete!"
echo "========================"
echo ""
echo "To use the plugin in Figma:"
echo ""
echo "1. Open Figma Desktop App"
echo "2. Go to Menu → Plugins → Development → Import plugin from manifest"
echo "3. Navigate to: $(pwd)/plugin/"
echo "4. Select 'manifest.json'"
echo "5. The plugin will appear as 'Candlefish Brand Bootstrap'"
echo ""
echo "To run the plugin:"
echo "- Open any Figma file"
echo "- Go to Plugins → Development → Candlefish Brand Bootstrap"
echo "- Wait for the design system to generate"
echo ""
echo "📚 Documentation:"
echo "- README.md: General information and usage"
echo "- DEVELOPMENT.md: Developer guide"
echo "- DESIGN_SYSTEM.md: Design system documentation"
echo "- API.md: API reference"
echo ""
echo "🚀 Happy designing!"
