#!/bin/bash
# Clean Git History - Remove all traces of privileged content
# WARNING: This will rewrite git history - ensure all team members pull fresh

set -e

echo "⚠️  GIT HISTORY CLEANING SCRIPT"
echo "================================"
echo "This will permanently remove privileged content from git history"
echo "WARNING: This is a destructive operation that rewrites history!"
echo ""

# Check if we're in the right repository
if [ ! -d ".git" ]; then
    echo "ERROR: Not in a git repository"
    exit 1
fi

REPO_NAME=$(basename $(pwd))
if [ "$REPO_NAME" != "candlefish-ai" ]; then
    echo "ERROR: This script should only be run in candlefish-ai repository"
    echo "Current directory: $REPO_NAME"
    exit 1
fi

# Confirmation
echo "This will:"
echo "1. Download BFG Repo Cleaner"
echo "2. Remove all 'privileged' and 'family' folders from history"
echo "3. Clean commit messages containing sensitive terms"
echo "4. Force push the cleaned history"
echo ""
read -p "Are you SURE you want to proceed? Type 'yes-clean-history': " confirm
if [ "$confirm" != "yes-clean-history" ]; then
    echo "Aborted"
    exit 0
fi

# Step 1: Create backup
echo ""
echo "Step 1: Creating backup of current repository..."
echo "-----------------------------------------------"
BACKUP_DIR="$HOME/candlefish-history-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
echo "✅ Backup created at: $BACKUP_DIR"

# Step 2: Download BFG if not present
echo ""
echo "Step 2: Setting up BFG Repo Cleaner..."
echo "--------------------------------------"
if [ ! -f "bfg.jar" ]; then
    echo "Downloading BFG Repo Cleaner..."
    curl -L https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar -o bfg.jar
    echo "✅ BFG downloaded"
else
    echo "✅ BFG already present"
fi

# Step 3: Create a fresh clone for cleaning
echo ""
echo "Step 3: Creating fresh clone for cleaning..."
echo "-------------------------------------------"
CLEAN_DIR="/tmp/candlefish-clean-$(date +%Y%m%d-%H%M%S)"
git clone --mirror . "$CLEAN_DIR"
echo "✅ Fresh clone created"

# Step 4: Clean folders from history
echo ""
echo "Step 4: Removing privileged folders from history..."
echo "--------------------------------------------------"
cd "$CLEAN_DIR"

# Remove folders
java -jar ../bfg.jar --delete-folders "privileged" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "family" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "private" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "confidential" --no-blob-protection .

echo "✅ Folders removed from history"

# Step 5: Clean sensitive filenames
echo ""
echo "Step 5: Removing sensitive files..."
echo "-----------------------------------"

# Create patterns file for BFG
cat > ../sensitive-files.txt << 'EOF'
*family*
*privileged*
*private*
*confidential*
*estate*
*trust*
*legal_structure*
EOF

java -jar ../bfg.jar --delete-files-found-in ../sensitive-files.txt --no-blob-protection .

echo "✅ Sensitive files removed"

# Step 6: Clean commit messages
echo ""
echo "Step 6: Cleaning commit messages..."
echo "----------------------------------"

# Create replacement file
cat > ../replacements.txt << 'EOF'
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
EOF

java -jar ../bfg.jar --replace-text ../replacements.txt --no-blob-protection .

echo "✅ Commit messages cleaned"

# Step 7: Cleanup and garbage collection
echo ""
echo "Step 7: Running git garbage collection..."
echo "----------------------------------------"
git reflog expire --expire=now --all
git gc --prune=now --aggressive
echo "✅ Repository cleaned and optimized"

# Step 8: Verify cleaning
echo ""
echo "Step 8: Verifying cleaning..."
echo "----------------------------"

# Check for remaining sensitive content
echo "Checking for 'privileged' in history..."
if git log --all --full-history -- "*privileged*" | grep -q .; then
    echo "⚠️  WARNING: Some 'privileged' references may remain"
else
    echo "✅ No 'privileged' found"
fi

echo "Checking for 'family' in history..."
if git log --all --full-history -- "*family*" | grep -q .; then
    echo "⚠️  WARNING: Some 'family' references may remain"
else
    echo "✅ No 'family' found"
fi

# Step 9: Apply changes to original repository
echo ""
echo "Step 9: Applying cleaned history..."
echo "----------------------------------"
cd -

echo ""
echo "⚠️  FINAL WARNING:"
echo "This will force-push and rewrite the entire repository history!"
echo "All team members will need to re-clone the repository!"
echo ""
read -p "Apply cleaned history? (type 'apply-clean-history'): " apply
if [ "$apply" != "apply-clean-history" ]; then
    echo "Cleaned repository available at: $CLEAN_DIR"
    echo "You can manually review and push when ready"
    exit 0
fi

# Fetch the cleaned history
git remote add cleaned "$CLEAN_DIR"
git fetch cleaned --all

# Reset all branches to cleaned versions
for branch in $(git branch -r | grep -v HEAD | sed 's/origin\///' | grep -v cleaned); do
    echo "Resetting branch: $branch"
    git checkout "$branch" 2>/dev/null || git checkout -b "$branch" "origin/$branch"
    git reset --hard "cleaned/$branch" 2>/dev/null || echo "Branch $branch not in cleaned repo"
done

# Return to main branch
git checkout main

# Step 10: Force push
echo ""
echo "Step 10: Force pushing cleaned history..."
echo "----------------------------------------"
echo "This is the point of no return!"
read -p "Force push to origin? (type 'force-push'): " push
if [ "$push" = "force-push" ]; then
    git push origin --force --all
    git push origin --force --tags
    echo "✅ Cleaned history pushed to origin"
else
    echo "⚠️  Not pushed. Clean history is ready but not pushed."
    echo "To push manually: git push origin --force --all"
fi

# Cleanup
rm -f bfg.jar sensitive-files.txt replacements.txt
git remote remove cleaned

# Final report
echo ""
echo "================================="
echo "✅ GIT HISTORY CLEANING COMPLETE"
echo "================================="
echo ""
echo "CRITICAL NEXT STEPS:"
echo ""
echo "1. NOTIFY ALL TEAM MEMBERS:"
echo "   Send this message to Tyler and Aaron:"
echo "   "
echo "   'The candlefish-ai repository has been updated."
echo "   Please delete your local copy and re-clone:"
echo "   rm -rf candlefish-ai"
echo "   git clone https://github.com/candlefish-ai/candlefish-ai.git'"
echo ""
echo "2. VERIFY DEPLOYMENTS:"
echo "   - Check Netlify is still deploying correctly"
echo "   - Verify CI/CD pipelines are working"
echo ""
echo "3. BACKUP LOCATION:"
echo "   Original repository backed up at: $BACKUP_DIR"
echo ""
echo "4. MONITOR:"
echo "   Watch for any issues over the next 24 hours"
echo ""
echo "================================="
echo ""
echo "⚠️  IMPORTANT SECURITY NOTE:"
echo "While the history is cleaned in the main repository,"
echo "anyone who has previously cloned may still have the old history."
echo "Ensure Tyler and Aaron delete and re-clone their local copies."
echo "================================="
