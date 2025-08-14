#!/bin/bash

# Candlefish GitHub Repository Access Management Script
# Purpose: Manage team member access to all Candlefish repositories

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_OWNER="aspenas"
TYLER_USERNAME="tyler-cf"

# List of all Candlefish repositories
REPOSITORIES=(
    "candlefish-ai"
    "candlefish-ai-demo"
    "candlefish-crown"
    "candlefish-temporal-platform"
    "fogg-calendar-dashboard"
    "paintbox-backend"
    "paintbox-production"
    "bart"
    "bart-excel"
)

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if user has GitHub CLI installed
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        print_color "$RED" "Error: GitHub CLI (gh) is not installed."
        print_color "$YELLOW" "Please install it with: brew install gh"
        exit 1
    fi
}

# Function to check GitHub authentication
check_auth() {
    if ! gh auth status &> /dev/null; then
        print_color "$RED" "Error: Not authenticated with GitHub."
        print_color "$YELLOW" "Please run: gh auth login"
        exit 1
    fi
}

# Function to add collaborator with admin access
add_collaborator() {
    local repo=$1
    local username=$2
    local permission=${3:-admin}

    print_color "$BLUE" "Adding $username to $GITHUB_OWNER/$repo with $permission permission..."

    if gh api -X PUT "/repos/$GITHUB_OWNER/$repo/collaborators/$username" \
        --field permission="$permission" &> /dev/null; then
        print_color "$GREEN" "✓ Successfully added $username to $repo"
    else
        print_color "$YELLOW" "⚠ Could not add $username to $repo (may already have access or repo doesn't exist)"
    fi
}

# Function to remove collaborator
remove_collaborator() {
    local repo=$1
    local username=$2

    print_color "$BLUE" "Removing $username from $GITHUB_OWNER/$repo..."

    if gh api -X DELETE "/repos/$GITHUB_OWNER/$repo/collaborators/$username" &> /dev/null; then
        print_color "$GREEN" "✓ Successfully removed $username from $repo"
    else
        print_color "$YELLOW" "⚠ Could not remove $username from $repo"
    fi
}

# Function to check user's current access
check_access() {
    local repo=$1
    local username=$2

    local response=$(gh api "/repos/$GITHUB_OWNER/$repo/collaborators/$username/permission" 2>/dev/null || echo "{}")
    local permission=$(echo "$response" | jq -r '.permission // "none"')

    if [ "$permission" != "none" ]; then
        echo "$permission"
    else
        echo "no access"
    fi
}

# Function to list all collaborators for a repository
list_collaborators() {
    local repo=$1

    print_color "$BLUE" "\nCollaborators for $GITHUB_OWNER/$repo:"
    gh api "/repos/$GITHUB_OWNER/$repo/collaborators" 2>/dev/null | \
        jq -r '.[] | "\(.login) - \(.permissions)"' || \
        print_color "$YELLOW" "Could not fetch collaborators (repo may not exist)"
}

# Function to grant Tyler full access to all repositories
grant_tyler_full_access() {
    print_color "$GREEN" "\n🚀 Granting Tyler full admin access to all Candlefish repositories..."
    print_color "$YELLOW" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    for repo in "${REPOSITORIES[@]}"; do
        add_collaborator "$repo" "$TYLER_USERNAME" "admin"
    done

    print_color "$GREEN" "\n✅ Tyler access setup complete!"
}

# Function to check Tyler's current access status
check_tyler_status() {
    print_color "$BLUE" "\n📊 Tyler's Current Access Status:"
    print_color "$YELLOW" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    for repo in "${REPOSITORIES[@]}"; do
        local access=$(check_access "$repo" "$TYLER_USERNAME")
        if [ "$access" = "admin" ]; then
            print_color "$GREEN" "✓ $repo: $access"
        elif [ "$access" = "no access" ]; then
            print_color "$RED" "✗ $repo: $access"
        else
            print_color "$YELLOW" "⚠ $repo: $access"
        fi
    done
}

# Function to add a new repository to the list
add_new_repo() {
    local new_repo=$1

    print_color "$BLUE" "Adding new repository to management list: $new_repo"

    # Add to the script itself
    sed -i '' "/^REPOSITORIES=(/a\\
    \"$new_repo\"
" "$0"

    print_color "$GREEN" "✓ Added $new_repo to repository list"

    # Grant Tyler access immediately
    add_collaborator "$new_repo" "$TYLER_USERNAME" "admin"
}

# Main menu
show_menu() {
    print_color "$BLUE" "\n🐠 Candlefish GitHub Access Management"
    print_color "$YELLOW" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1) Grant Tyler full access to all repositories"
    echo "2) Check Tyler's current access status"
    echo "3) Add Tyler to a specific repository"
    echo "4) Remove Tyler from a specific repository"
    echo "5) List all collaborators for a repository"
    echo "6) Add new repository to management list"
    echo "7) Exit"
    print_color "$YELLOW" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main execution
main() {
    check_gh_cli
    check_auth

    if [ $# -eq 0 ]; then
        # Interactive mode
        while true; do
            show_menu
            read -p "Select an option (1-7): " choice

            case $choice in
                1)
                    grant_tyler_full_access
                    ;;
                2)
                    check_tyler_status
                    ;;
                3)
                    read -p "Enter repository name: " repo
                    add_collaborator "$repo" "$TYLER_USERNAME" "admin"
                    ;;
                4)
                    read -p "Enter repository name: " repo
                    remove_collaborator "$repo" "$TYLER_USERNAME"
                    ;;
                5)
                    read -p "Enter repository name: " repo
                    list_collaborators "$repo"
                    ;;
                6)
                    read -p "Enter new repository name: " new_repo
                    add_new_repo "$new_repo"
                    ;;
                7)
                    print_color "$GREEN" "Goodbye!"
                    exit 0
                    ;;
                *)
                    print_color "$RED" "Invalid option. Please try again."
                    ;;
            esac
        done
    else
        # Command line argument mode
        case $1 in
            --grant-tyler)
                grant_tyler_full_access
                ;;
            --check-tyler)
                check_tyler_status
                ;;
            --add-repo)
                if [ -z "$2" ]; then
                    print_color "$RED" "Error: Please provide a repository name"
                    exit 1
                fi
                add_new_repo "$2"
                ;;
            --help)
                echo "Usage: $0 [OPTION]"
                echo "Manage GitHub access for Candlefish repositories"
                echo ""
                echo "Options:"
                echo "  --grant-tyler    Grant Tyler full access to all repositories"
                echo "  --check-tyler    Check Tyler's current access status"
                echo "  --add-repo NAME  Add new repository to management list"
                echo "  --help           Show this help message"
                echo ""
                echo "Run without arguments for interactive mode"
                ;;
            *)
                print_color "$RED" "Unknown option: $1"
                echo "Run '$0 --help' for usage information"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"
