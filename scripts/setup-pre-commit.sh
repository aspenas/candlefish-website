#!/bin/bash

# Pre-commit Hooks Setup Script
# Installs and configures pre-commit hooks for code quality

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check Python installation
check_python() {
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        print_status "$RED" "❌ Python is not installed"
        echo "Please install Python 3.8 or higher"
        exit 1
    fi
    
    print_status "$GREEN" "✅ Python is installed: $($PYTHON_CMD --version)"
}

# Check pip installation
check_pip() {
    if ! $PYTHON_CMD -m pip --version &> /dev/null; then
        print_status "$YELLOW" "⚠️  pip is not installed, installing..."
        curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
        $PYTHON_CMD get-pip.py
        rm get-pip.py
    fi
    print_status "$GREEN" "✅ pip is installed"
}

# Install pre-commit
install_precommit() {
    print_status "$BLUE" "📦 Installing pre-commit..."
    
    # Install pre-commit
    $PYTHON_CMD -m pip install --user pre-commit
    
    # Add to PATH if needed
    if ! command -v pre-commit &> /dev/null; then
        export PATH="$HOME/.local/bin:$PATH"
        
        # Add to shell profile
        if [ -f ~/.zshrc ]; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
        elif [ -f ~/.bashrc ]; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        fi
        
        print_status "$YELLOW" "⚠️  Added ~/.local/bin to PATH. Please restart your terminal or run:"
        echo "export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
    
    # Verify installation
    if command -v pre-commit &> /dev/null; then
        print_status "$GREEN" "✅ pre-commit installed: $(pre-commit --version)"
    else
        print_status "$RED" "❌ pre-commit installation failed"
        exit 1
    fi
}

# Install hooks
install_hooks() {
    print_status "$BLUE" "🔗 Installing git hooks..."
    
    # Install pre-commit hooks
    pre-commit install
    print_status "$GREEN" "✅ Installed pre-commit hooks"
    
    # Install commit-msg hook for conventional commits
    pre-commit install --hook-type commit-msg
    print_status "$GREEN" "✅ Installed commit-msg hooks"
    
    # Install pre-push hooks
    pre-commit install --hook-type pre-push
    print_status "$GREEN" "✅ Installed pre-push hooks"
}

# Install additional tools
install_additional_tools() {
    print_status "$BLUE" "🛠️  Installing additional tools..."
    
    # Install Node.js tools
    if command -v npm &> /dev/null; then
        print_status "$BLUE" "Installing Node.js linting tools..."
        npm install -g \
            eslint \
            prettier \
            @commitlint/cli \
            @commitlint/config-conventional \
            markdownlint-cli
        print_status "$GREEN" "✅ Node.js tools installed"
    else
        print_status "$YELLOW" "⚠️  npm not found, skipping Node.js tools"
    fi
    
    # Install Python linting tools
    print_status "$BLUE" "Installing Python linting tools..."
    $PYTHON_CMD -m pip install --user \
        black \
        isort \
        flake8 \
        flake8-docstrings \
        pylint \
        mypy
    print_status "$GREEN" "✅ Python tools installed"
    
    # Install security tools
    print_status "$BLUE" "Installing security scanning tools..."
    $PYTHON_CMD -m pip install --user \
        detect-secrets \
        bandit \
        safety
    print_status "$GREEN" "✅ Security tools installed"
}

# Run initial checks
run_initial_checks() {
    print_status "$BLUE" "🔍 Running initial checks..."
    
    # Update hooks to latest version
    pre-commit autoupdate
    print_status "$GREEN" "✅ Updated hooks to latest versions"
    
    # Run against all files
    print_status "$BLUE" "Running pre-commit on all files (this may take a while)..."
    pre-commit run --all-files || true
    
    print_status "$GREEN" "✅ Initial check complete"
}

# Create commit message template
create_commit_template() {
    print_status "$BLUE" "📝 Creating commit message template..."
    
    cat > .gitmessage << 'EOF'
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>
#
# Type must be one of the following:
# - feat: A new feature
# - fix: A bug fix
# - docs: Documentation only changes
# - style: Changes that don't affect code meaning
# - refactor: Code changes that neither fix bugs nor add features
# - perf: Performance improvements
# - test: Adding missing tests or correcting existing tests
# - build: Changes that affect the build system or external dependencies
# - ci: Changes to CI configuration files and scripts
# - chore: Other changes that don't modify src or test files
# - revert: Reverts a previous commit
#
# Scope is optional and can be anything specifying the place of the commit change.
#
# Subject is a short description of the change:
# - Use imperative, present tense: "change" not "changed" nor "changes"
# - Don't capitalize the first letter
# - No period (.) at the end
#
# Body should include the motivation for the change and contrast with previous behavior.
#
# Footer should contain any information about Breaking Changes and is also the place
# to reference GitHub issues that this commit closes.
#
# Breaking Changes should start with "BREAKING CHANGE:" with a space or two newlines.
EOF
    
    # Set as default commit template
    git config --local commit.template .gitmessage
    print_status "$GREEN" "✅ Commit message template created"
}

# Create .secrets.baseline for detect-secrets
create_secrets_baseline() {
    print_status "$BLUE" "🔐 Creating secrets baseline..."
    
    if command -v detect-secrets &> /dev/null; then
        detect-secrets scan --baseline .secrets.baseline
        print_status "$GREEN" "✅ Secrets baseline created"
    else
        print_status "$YELLOW" "⚠️  detect-secrets not installed, skipping baseline"
    fi
}

# Main setup
main() {
    print_status "$BLUE" "🚀 Setting up Pre-commit Hooks"
    echo ""
    
    # Change to repository root
    cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
    
    # Check prerequisites
    check_python
    check_pip
    
    # Install pre-commit
    install_precommit
    
    # Install hooks
    install_hooks
    
    # Install additional tools
    read -p "Install additional linting tools? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_additional_tools
    fi
    
    # Create commit template
    create_commit_template
    
    # Create secrets baseline
    create_secrets_baseline
    
    # Run initial checks
    read -p "Run initial checks on all files? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_initial_checks
    fi
    
    echo ""
    print_status "$GREEN" "✅ Pre-commit setup complete!"
    echo ""
    print_status "$BLUE" "📋 Next steps:"
    echo "  1. Review and fix any issues found by pre-commit"
    echo "  2. Commit changes with conventional commit format"
    echo "  3. Pre-commit will automatically run on each commit"
    echo ""
    print_status "$YELLOW" "💡 Useful commands:"
    echo "  pre-commit run --all-files    # Run on all files"
    echo "  pre-commit run <hook-id>      # Run specific hook"
    echo "  pre-commit autoupdate          # Update hooks"
    echo "  git commit --no-verify         # Skip hooks (emergency only)"
}

# Show help
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "Pre-commit Hooks Setup Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "This script installs and configures pre-commit hooks for code quality."
    echo "It will:"
    echo "  - Install pre-commit framework"
    echo "  - Set up git hooks"
    echo "  - Install linting tools (optional)"
    echo "  - Create commit message template"
    echo "  - Run initial checks"
    exit 0
fi

main