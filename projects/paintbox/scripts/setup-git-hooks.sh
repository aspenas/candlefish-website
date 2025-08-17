#!/bin/bash

# Setup Git Hooks for Paintbox Project
# Installs Husky and configures pre-commit hooks for dependency management

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository!"
        exit 1
    fi
    print_success "Git repository detected"
}

# Install Husky if not already installed
install_husky() {
    print_status "Installing Husky..."

    if ! command -v npx >/dev/null 2>&1; then
        print_error "npx not found. Please install Node.js and npm"
        exit 1
    fi

    # Install husky as dev dependency if not present
    if ! npm list husky >/dev/null 2>&1; then
        npm install --save-dev husky
        print_success "Husky installed as dev dependency"
    else
        print_success "Husky already installed"
    fi

    # Initialize husky
    npx husky install
    print_success "Husky initialized"
}

# Install additional tools needed for hooks
install_hook_dependencies() {
    print_status "Installing hook dependencies..."

    local dev_dependencies=(
        "license-checker"
        "bundlesize"
        "npm-check-updates"
    )

    local missing_deps=()

    for dep in "${dev_dependencies[@]}"; do
        if ! npm list "$dep" >/dev/null 2>&1; then
            missing_deps+=("$dep")
        fi
    done

    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_status "Installing missing dependencies: ${missing_deps[*]}"
        npm install --save-dev "${missing_deps[@]}"
        print_success "Hook dependencies installed"
    else
        print_success "All hook dependencies already installed"
    fi
}

# Setup git hook scripts
setup_hook_scripts() {
    print_status "Setting up git hook scripts..."

    # Create .husky directory if it doesn't exist
    mkdir -p .husky

    # Ensure hook scripts are executable
    chmod +x .husky/pre-commit 2>/dev/null || true
    chmod +x .husky/pre-push 2>/dev/null || true
    chmod +x .husky/commit-msg 2>/dev/null || true

    # Add hooks to Husky
    npx husky add .husky/pre-commit
    npx husky add .husky/pre-push
    npx husky add .husky/commit-msg

    print_success "Git hooks configured"
}

# Add npm scripts for manual hook execution
add_npm_scripts() {
    print_status "Adding npm scripts for manual hook execution..."

    # Check if scripts already exist
    local scripts_to_add=(
        "precommit:./husky/pre-commit"
        "prepush:./.husky/pre-push"
        "validate-commit:./.husky/commit-msg"
        "deps:check:./scripts/dependency-health-check.sh check"
        "deps:audit:npm audit --audit-level=moderate"
        "deps:outdated:npm outdated"
        "deps:licenses:license-checker"
        "security:audit:npm audit --audit-level=low"
        "hooks:install:./scripts/setup-git-hooks.sh"
    )

    print_status "Manual script execution available:"
    echo "  npm run precommit     - Run pre-commit checks manually"
    echo "  npm run prepush       - Run pre-push checks manually"
    echo "  npm run deps:check    - Run dependency health check"
    echo "  npm run deps:audit    - Run security audit"
    echo "  npm run deps:outdated - Check for outdated packages"
    echo "  npm run deps:licenses - Check license compliance"
    echo "  npm run security:audit - Run strict security audit"

    print_success "Manual execution scripts documented"
}

# Configure git settings for better hook experience
configure_git_settings() {
    print_status "Configuring git settings for hooks..."

    # Set up git to use the hooks
    git config core.hooksPath .husky

    # Configure commit template if it doesn't exist
    if [ ! -f ".gitmessage" ]; then
        cat > .gitmessage << 'EOF'
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>
#
# Type should be one of the following:
# * feat: A new feature
# * fix: A bug fix
# * docs: Documentation only changes
# * style: Changes that do not affect the meaning of the code
# * refactor: A code change that neither fixes a bug nor adds a feature
# * test: Adding missing tests or correcting existing tests
# * chore: Changes to the build process or auxiliary tools
# * perf: A code change that improves performance
# * ci: Changes to CI configuration files and scripts
# * build: Changes that affect the build system or dependencies
# * revert: Reverts a previous commit
# * deps: Dependency updates
#
# Scope is optional and should be a noun describing the section of the codebase
#
# Subject should be 50 characters or less, start with a verb in imperative mood
#
# Body should wrap at 72 characters and explain what and why
#
# Footer should contain any BREAKING CHANGE or issue references
EOF

        git config commit.template .gitmessage
        print_success "Git commit template configured"
    fi

    print_success "Git settings configured"
}

# Create hook bypass mechanism
create_bypass_mechanism() {
    print_status "Setting up hook bypass mechanism..."

    cat > scripts/bypass-hooks.sh << 'EOF'
#!/bin/bash
# Bypass git hooks for emergency commits
# Usage: ./scripts/bypass-hooks.sh "emergency commit message"

if [ $# -eq 0 ]; then
    echo "Usage: $0 \"commit message\""
    echo "This will commit without running any git hooks"
    exit 1
fi

echo "⚠️  BYPASSING ALL GIT HOOKS ⚠️"
echo "Commit message: $1"
read -p "Are you sure you want to bypass all hooks? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit --no-verify -m "$1"
    echo "✅ Emergency commit completed (hooks bypassed)"
else
    echo "❌ Commit cancelled"
fi
EOF

    chmod +x scripts/bypass-hooks.sh
    print_success "Hook bypass mechanism created: scripts/bypass-hooks.sh"
}

# Test the hooks
test_hooks() {
    print_status "Testing git hooks..."

    # Test if hooks are executable
    local hooks=(".husky/pre-commit" ".husky/pre-push" ".husky/commit-msg")

    for hook in "${hooks[@]}"; do
        if [ -f "$hook" ] && [ -x "$hook" ]; then
            print_success "✅ $hook is executable"
        else
            print_warning "⚠️  $hook may not be properly configured"
        fi
    done

    # Test dependency health check script
    if [ -f "scripts/dependency-health-check.sh" ] && [ -x "scripts/dependency-health-check.sh" ]; then
        print_success "✅ Dependency health check script is ready"
    else
        print_warning "⚠️  Dependency health check script not found or not executable"
    fi

    print_success "Hook testing completed"
}

# Display setup summary
show_summary() {
    echo
    print_success "=== GIT HOOKS SETUP COMPLETE ==="
    echo
    print_status "Configured hooks:"
    echo "  • pre-commit: Dependency security checks, license validation"
    echo "  • pre-push: Comprehensive validation, bundle size checks"
    echo "  • commit-msg: Message format validation, dependency change detection"
    echo
    print_status "Manual commands:"
    echo "  • npm run precommit - Test pre-commit hooks"
    echo "  • npm run prepush - Test pre-push hooks"
    echo "  • npm run deps:check - Run dependency health check"
    echo "  • ./scripts/bypass-hooks.sh \"message\" - Emergency bypass"
    echo
    print_status "Configuration files:"
    echo "  • .husky/ - Git hook scripts"
    echo "  • .gitmessage - Commit message template"
    echo "  • scripts/dependency-health-check.sh - Health checker"
    echo
    print_warning "Important notes:"
    echo "  • Hooks will run automatically on git commit and git push"
    echo "  • Failed hooks will prevent commits/pushes"
    echo "  • Use bypass script only for emergencies"
    echo "  • Keep dependencies up to date for best security"
    echo
    print_success "🎉 Git hooks are now active!"
}

# Main execution
main() {
    echo "🔧 Setting up Git Hooks for Paintbox"
    echo

    check_git_repo
    install_husky
    install_hook_dependencies
    setup_hook_scripts
    add_npm_scripts
    configure_git_settings
    create_bypass_mechanism
    test_hooks
    show_summary
}

# Handle script arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "test")
        test_hooks
        ;;
    "bypass")
        if [ -f "scripts/bypass-hooks.sh" ]; then
            ./scripts/bypass-hooks.sh "${2:-Emergency commit}"
        else
            print_error "Bypass script not found. Run setup first."
            exit 1
        fi
        ;;
    "help")
        echo "Git Hooks Setup Script"
        echo
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  setup (default) - Install and configure git hooks"
        echo "  test            - Test hook configuration"
        echo "  bypass \"msg\"    - Bypass hooks for emergency commit"
        echo "  help            - Show this help"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
