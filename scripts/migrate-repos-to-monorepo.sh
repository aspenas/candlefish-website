#!/usr/bin/env bash
set -euo pipefail

# Migrate existing repos to candlefish-ai monorepo using git subtree
# This preserves full history without duplication

echo "🚀 Starting monorepo migration..."

# Check if we're in the correct directory
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "❌ Error: Must run from candlefish-ai root directory"
  exit 1
fi

# Function to migrate a repo as subtree
migrate_repo() {
  local REPO_PATH="$1"
  local MONOREPO_PATH="$2"
  local REPO_NAME="$(basename "$REPO_PATH")"

  echo "📦 Migrating $REPO_NAME to $MONOREPO_PATH..."

  # Check if source exists
  if [ ! -d "$REPO_PATH" ]; then
    echo "⚠️  Warning: $REPO_PATH not found, skipping..."
    return
  fi

  # Check if already exists in monorepo
  if [ -d "$MONOREPO_PATH" ]; then
    echo "✅ $MONOREPO_PATH already exists, skipping migration"
    return
  fi

  # Add remote and fetch
  git remote add "$REPO_NAME" "$REPO_PATH" 2>/dev/null || true
  git fetch "$REPO_NAME"

  # Add as subtree
  git subtree add --prefix="$MONOREPO_PATH" "$REPO_NAME" main

  echo "✅ Migrated $REPO_NAME successfully"
}

# Migrate repos if they exist
echo "📂 Checking for repos to migrate..."

# Apps
[ -d "/Users/patricksmith/paintbox" ] && migrate_repo "/Users/patricksmith/paintbox" "apps/paintbox"
[ -d "/Users/patricksmith/promoteros" ] && migrate_repo "/Users/patricksmith/promoteros" "apps/promoteros"
[ -d "/Users/patricksmith/crown-trophy" ] && migrate_repo "/Users/patricksmith/crown-trophy" "apps/crown-trophy"

# Services
[ -d "/Users/patricksmith/crestron-ha" ] && migrate_repo "/Users/patricksmith/crestron-ha" "services/crestron-ha"

echo ""
echo "✨ Migration complete!"
echo ""
echo "📝 Next steps:"
echo "1. Review the migrated code in apps/ and services/"
echo "2. Update import paths if needed"
echo "3. Run 'pnpm install' to link workspaces"
echo "4. Commit the changes: git add . && git commit -m 'chore: migrate repos to monorepo'"
echo "5. Push to remote: git push -u origin main"
echo ""
echo "🔄 To sync changes from legacy repos later:"
echo "   git fetch <repo-name> && git subtree pull --prefix=<path> <repo-name> main -m 'chore: sync <repo-name>'"
echo ""
