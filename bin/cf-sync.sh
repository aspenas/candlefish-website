#!/usr/bin/env bash
# Candlefish AI Worktree Sync Tool
# Safe synchronization for all git worktrees

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAIN_REPO="${CANDLEFISH_REPO:-/Users/patricksmith/candlefish-ai}"
WORKTREE_DIR="${CANDLEFISH_WORKTREES:-/Users/patricksmith/candlefish-worktrees}"
LOG_FILE="${HOME}/.candlefish/sync-$(date +%Y%m%d-%H%M%S).log"
DRY_RUN=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      cat << EOF
Usage: $0 [OPTIONS]

Synchronize all candlefish-ai git worktrees with remote repository.

Options:
  --dry-run    Show what would be done without making changes
  --verbose    Show detailed output
  --help       Show this help message

Environment Variables:
  CANDLEFISH_REPO       Main repository path (default: /Users/patricksmith/candlefish-ai)
  CANDLEFISH_WORKTREES  Worktrees directory (default: /Users/patricksmith/candlefish-worktrees)

Examples:
  $0                    # Sync all worktrees
  $0 --dry-run          # Preview sync operations
  $0 --verbose          # Show detailed progress
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Logging functions
log() {
  local message="$1"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Check prerequisites
check_prerequisites() {
  if ! command -v git &> /dev/null; then
    log_error "git is not installed"
    exit 1
  fi

  if [[ ! -d "$MAIN_REPO" ]]; then
    log_error "Main repository not found: $MAIN_REPO"
    exit 1
  fi

  if [[ ! -d "$MAIN_REPO/.git" ]]; then
    log_error "Not a git repository: $MAIN_REPO"
    exit 1
  fi
}

# Get worktree information
get_worktrees() {
  cd "$MAIN_REPO"
  git worktree list --porcelain | awk '
    /^worktree / { path = substr($0, 10) }
    /^HEAD / { head = substr($0, 6) }
    /^branch / { branch = substr($0, 8); print path "|" head "|" branch }
  '
}

# Check for uncommitted changes
has_uncommitted_changes() {
  local path="$1"
  cd "$path"
  ! git diff --quiet || ! git diff --cached --quiet
}

# Check if branch is behind remote
is_behind_remote() {
  local path="$1"
  cd "$path"
  local upstream
  upstream=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "")

  if [[ -z "$upstream" ]]; then
    return 1  # No upstream
  fi

  local behind
  behind=$(git rev-list --count HEAD.."$upstream" 2>/dev/null || echo "0")
  [[ "$behind" -gt 0 ]]
}

# Sync a single worktree
sync_worktree() {
  local path="$1"
  local branch="$2"

  log_info "Syncing worktree: $path (branch: $branch)"

  if [[ ! -d "$path" ]]; then
    log_warning "Worktree path does not exist: $path"
    return 1
  fi

  cd "$path"

  # Check for uncommitted changes
  if has_uncommitted_changes "$path"; then
    log_warning "Uncommitted changes in $path - skipping sync"
    if [[ "$VERBOSE" == true ]]; then
      git status --short
    fi
    return 1
  fi

  # Fetch latest changes
  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would fetch from origin"
  else
    if git fetch origin 2>&1 | tee -a "$LOG_FILE"; then
      log_success "Fetched latest changes"
    else
      log_error "Failed to fetch from origin"
      return 1
    fi
  fi

  # Check if behind remote
  if is_behind_remote "$path"; then
    local behind
    behind=$(git rev-list --count HEAD..@{u})
    log_info "Branch is $behind commits behind remote"

    if [[ "$DRY_RUN" == true ]]; then
      log_info "[DRY RUN] Would pull $behind commits"
    else
      if git pull --ff-only 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Pulled latest changes"
      else
        log_error "Failed to pull changes (may need manual merge)"
        return 1
      fi
    fi
  else
    log_info "Already up to date"
  fi

  return 0
}

# Prune stale worktrees
prune_worktrees() {
  log_info "Pruning stale worktrees..."

  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would prune stale worktrees"
    cd "$MAIN_REPO"
    git worktree list --porcelain | grep -E "^prunable" || echo "No prunable worktrees"
  else
    cd "$MAIN_REPO"
    if git worktree prune -v 2>&1 | tee -a "$LOG_FILE"; then
      log_success "Pruned stale worktrees"
    else
      log_warning "Failed to prune worktrees"
    fi
  fi
}

# Generate status report
generate_report() {
  log_info "Generating worktree status report..."

  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "                    WORKTREE STATUS REPORT"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""

  local total=0
  local synced=0
  local skipped=0

  while IFS='|' read -r path head branch; do
    ((total++))
    printf "%-50s " "$path"

    if [[ -d "$path" ]]; then
      cd "$path"

      # Check status
      if has_uncommitted_changes "$path"; then
        echo -e "${YELLOW}[DIRTY]${NC}"
        ((skipped++))
      elif is_behind_remote "$path"; then
        local behind
        behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "?")
        echo -e "${YELLOW}[BEHIND: $behind]${NC}"
        ((synced++))
      else
        echo -e "${GREEN}[SYNCED]${NC}"
        ((synced++))
      fi

      if [[ "$VERBOSE" == true ]]; then
        echo "  Branch: $branch"
        echo "  HEAD: ${head:0:8}"
      fi
    else
      echo -e "${RED}[MISSING]${NC}"
      ((skipped++))
    fi
  done < <(get_worktrees)

  echo ""
  echo "───────────────────────────────────────────────────────────────"
  echo "Total: $total | Synced: $synced | Skipped: $skipped"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""

  log_info "Full log saved to: $LOG_FILE"
}

# Main execution
main() {
  log "Starting candlefish-ai worktree sync"

  check_prerequisites

  # Get timestamp for commit message
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

  # Process each worktree
  local success_count=0
  local fail_count=0

  while IFS='|' read -r path head branch; do
    if sync_worktree "$path" "$branch"; then
      ((success_count++))
    else
      ((fail_count++))
    fi
    echo ""
  done < <(get_worktrees)

  # Prune stale worktrees
  prune_worktrees

  # Generate report
  generate_report

  # Summary
  if [[ "$fail_count" -eq 0 ]]; then
    log_success "Sync completed successfully ($success_count worktrees)"
    exit 0
  else
    log_warning "Sync completed with issues (Success: $success_count, Failed: $fail_count)"
    exit 1
  fi
}

# Run main function
main "$@"
