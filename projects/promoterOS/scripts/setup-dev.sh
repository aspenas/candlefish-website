#!/bin/bash

# PromoterOS Development Environment Setup Script
# This script automates the setup of a local development environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        log_info "✅ $1 is installed"
        return 0
    else
        log_error "❌ $1 is not installed"
        return 1
    fi
}

# Main setup process
main() {
    echo "======================================"
    echo "  PromoterOS Development Setup"
    echo "======================================"
    echo ""

    # Step 1: Check prerequisites
    log_info "Checking prerequisites..."
    
    local missing_deps=0
    check_command "node" || missing_deps=$((missing_deps + 1))
    check_command "npm" || missing_deps=$((missing_deps + 1))
    check_command "git" || missing_deps=$((missing_deps + 1))
    
    if [ $missing_deps -gt 0 ]; then
        log_error "Please install missing dependencies before continuing"
        exit 1
    fi

    # Check Node version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "16" ]; then
        log_error "Node.js version 16 or higher is required (current: $(node -v))"
        exit 1
    fi
    log_info "Node.js version: $(node -v)"

    # Step 2: Install dependencies
    log_info "Installing project dependencies..."
    npm ci || npm install

    # Install function dependencies
    if [ -d "netlify/functions" ]; then
        log_info "Installing Netlify function dependencies..."
        cd netlify/functions
        npm ci || npm install
        cd ../..
    fi

    # Step 3: Setup environment variables
    log_info "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "Created .env from .env.example"
            log_warn "Please update .env with your actual values"
        else
            cat > .env << 'EOF'
# PromoterOS Environment Variables
NODE_ENV=development
JWT_SECRET=development-secret-change-in-production

# AWS Configuration (optional for local dev)
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=

# API Keys (obtain from respective services)
# TIKTOK_CLIENT_KEY=
# TIKTOK_CLIENT_SECRET=
# SPOTIFY_API_KEY=
# YOUTUBE_API_KEY=

# Netlify Configuration
NETLIFY_SITE_ID=ef0d6f05-62ba-46dd-82ad-39afbaa267ae
EOF
            log_info "Created default .env file"
            log_warn "Please add your API keys to .env"
        fi
    else
        log_info ".env file already exists"
    fi

    # Step 4: Install global tools
    log_info "Installing development tools..."
    
    # Install Netlify CLI if not present
    if ! command -v netlify &> /dev/null; then
        log_info "Installing Netlify CLI..."
        npm install -g netlify-cli
    fi

    # Install other useful tools
    npm install --save-dev \
        eslint \
        prettier \
        jest \
        @types/node \
        husky \
        lint-staged \
        commitizen \
        cz-conventional-changelog

    # Step 5: Setup Git hooks
    log_info "Setting up Git hooks..."
    
    # Initialize Husky
    npx husky install

    # Add pre-commit hook
    npx husky add .husky/pre-commit "npm run lint:fix && npm test -- --passWithNoTests"
    
    # Add commit-msg hook for conventional commits
    npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'

    # Step 6: Create necessary directories
    log_info "Creating project directories..."
    mkdir -p src/services
    mkdir -p src/utils
    mkdir -p src/config
    mkdir -p tests/unit
    mkdir -p tests/integration
    mkdir -p docs

    # Step 7: Setup test infrastructure
    log_info "Setting up test infrastructure..."
    
    # Create basic Jest config if not exists
    if [ ! -f "jest.config.js" ]; then
        cat > jest.config.js << 'EOF'
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    'netlify/functions/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};
EOF
        log_info "Created jest.config.js"
    fi

    # Step 8: Verify setup
    log_info "Verifying setup..."
    
    # Run linting
    npm run lint:fix || log_warn "Linting needs attention"
    
    # Run tests
    npm test -- --passWithNoTests || log_warn "Tests need attention"
    
    # Check if Netlify dev works
    log_info "Testing Netlify dev server..."
    timeout 5 npx netlify dev --offline &> /dev/null && log_info "Netlify dev works" || log_warn "Netlify dev needs configuration"

    # Step 9: Generate documentation
    log_info "Generating initial documentation..."
    
    cat > README_DEV.md << 'EOF'
# PromoterOS Development Guide

## Quick Start

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Lint code:**
   ```bash
   npm run lint
   ```

4. **Deploy to staging:**
   ```bash
   npm run deploy:staging
   ```

## Available Scripts

- `npm run dev` - Start local development server
- `npm test` - Run test suite
- `npm run lint` - Check code quality
- `npm run lint:fix` - Fix linting issues
- `npm run security:check` - Run security audit
- `npm run deploy` - Deploy to production

## Environment Variables

Update `.env` with your API keys and configuration.

## Git Workflow

This project uses conventional commits. Use:
```bash
npm run commit
```

## Testing

- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`

## Documentation

See `docs/` for detailed documentation.
EOF

    # Step 10: Final summary
    echo ""
    echo "======================================"
    echo "  Setup Complete! 🎉"
    echo "======================================"
    echo ""
    log_info "Development environment is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Update .env with your API keys"
    echo "2. Run 'npm run dev' to start development"
    echo "3. Visit http://localhost:8888"
    echo ""
    echo "Useful commands:"
    echo "  npm run dev          - Start dev server"
    echo "  npm test            - Run tests"
    echo "  npm run lint        - Check code quality"
    echo "  npm run deploy      - Deploy to production"
    echo ""
}

# Run main function
main "$@"