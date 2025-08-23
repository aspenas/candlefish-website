#!/bin/bash
set -e

echo "🚀 Candlefish Website - Pre-Deployment Test Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Change to website directory
cd "$(dirname "$0")/.."

# Check Node.js version
echo ""
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node --version | cut -c2-)
REQUIRED_NODE_MAJOR=20

if [[ ${NODE_VERSION%%.*} -ge $REQUIRED_NODE_MAJOR ]]; then
    print_status "Node.js version: $NODE_VERSION (✓ >= $REQUIRED_NODE_MAJOR)"
else
    print_error "Node.js version $NODE_VERSION is too old. Required: >= $REQUIRED_NODE_MAJOR"
    exit 1
fi

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
if npm ci --include=dev --silent; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Check for required WebGL dependencies
echo ""
echo "🎮 Checking WebGL dependencies..."
REQUIRED_DEPS=("three" "@react-three/fiber" "@react-three/drei" "raw-loader")

for dep in "${REQUIRED_DEPS[@]}"; do
    if npm ls "$dep" --depth=0 &> /dev/null; then
        print_status "$dep is installed"
    else
        print_error "Missing required dependency: $dep"
        exit 1
    fi
done

# Check TypeScript compilation
echo ""
echo "🔧 Checking TypeScript compilation..."
if npx tsc --noEmit --skipLibCheck; then
    print_status "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# Lint check
echo ""
echo "🧹 Running ESLint..."
if npm run lint; then
    print_status "ESLint passed"
else
    print_warning "ESLint found issues (non-blocking)"
fi

# Test mock data refresh
echo ""
echo "🔄 Testing mock data refresh..."
if npm run refresh-mocks; then
    print_status "Mock data refresh successful"
else
    print_warning "Mock data refresh failed (will use existing mocks)"
fi

# Verify mock files exist
MOCK_FILES=("mock/workshop.json" "mock/franchises.json" "mock/systemActivity.json")
for file in "${MOCK_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        print_status "Mock file exists: $file"
    else
        print_error "Missing mock file: $file"
        exit 1
    fi
done

# Test build process
echo ""
echo "🏗️ Testing build process..."
if npm run export; then
    print_status "Build successful"
else
    print_error "Build failed"
    exit 1
fi

# Check critical output files
echo ""
echo "📁 Verifying build output..."
CRITICAL_FILES=("out/index.html" "out/_next")

for file in "${CRITICAL_FILES[@]}"; do
    if [[ -e "out/$file" ]] || [[ -e "$file" ]]; then
        print_status "Build output exists: $file"
    else
        print_error "Missing critical build output: $file"
        exit 1
    fi
done

# Check for WebGL-specific files
echo ""
echo "🎮 Checking WebGL build artifacts..."
if find out -name "*.js" -exec grep -l "WebGL\|three\|THREE" {} \; | head -1 > /dev/null; then
    print_status "WebGL/Three.js code found in build"
else
    print_warning "WebGL/Three.js code not found in build (check tree shaking)"
fi

# Verify configuration files
echo ""
echo "⚙️ Verifying configuration..."
CONFIG_FILES=("netlify.toml" "next.config.js" "package.json")

for file in "${CONFIG_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        print_status "Config file exists: $file"
    else
        print_error "Missing config file: $file"
        exit 1
    fi
done

# Check Netlify configuration
if grep -q "WebGL" netlify.toml; then
    print_status "Netlify WebGL configuration detected"
else
    print_warning "WebGL configuration not found in netlify.toml"
fi

# Estimate bundle size
echo ""
echo "📊 Build output analysis..."
if [[ -d "out/_next/static" ]]; then
    BUNDLE_SIZE=$(du -sh out/_next/static | cut -f1)
    print_status "Bundle size: $BUNDLE_SIZE"

    # Check for large files
    find out -size +1M -type f -exec ls -lh {} \; | while read -r line; do
        print_warning "Large file detected: $line"
    done
fi

# Test server startup (if available)
echo ""
echo "🌐 Testing server startup..."
if command -v npx &> /dev/null; then
    # Start server in background and test
    timeout 10s npx serve -s out -p 8080 &
    SERVER_PID=$!
    sleep 3

    if curl -f http://localhost:8080 > /dev/null 2>&1; then
        print_status "Server startup test passed"
    else
        print_warning "Server startup test failed (check manually)"
    fi

    # Clean up
    kill $SERVER_PID 2>/dev/null || true
fi

# Final summary
echo ""
echo "🎉 Pre-deployment test completed!"
echo "=================================="
print_status "All critical checks passed"
print_warning "Review any warnings above before deploying"

echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Commit and push to trigger Netlify deployment"
echo "2. Monitor deployment in Netlify dashboard"
echo "3. Test WebGL features in production"
echo "4. Check performance monitoring alerts"

exit 0
