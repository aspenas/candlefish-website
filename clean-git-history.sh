#!/bin/bash
# Clean Git History - Remove all traces of privileged content
# WARNING: This will rewrite git history - ensure all team members pull fresh
# Enhanced version with comprehensive pattern matching and safety checks

set -e

echo "⚠️  GIT HISTORY CLEANING SCRIPT v2.0"
echo "===================================="
echo "This will permanently remove privileged content from git history"
echo "WARNING: This is a destructive operation that rewrites history!"
echo ""

# Enhanced repository validation
if [ ! -d ".git" ]; then
    echo "ERROR: Not in a git repository"
    exit 1
fi

REPO_NAME=$(basename $(pwd))
REPO_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

if [ "$REPO_NAME" != "candlefish-ai" ] && [ "$REPO_NAME" != "candlefish-ai-clean" ]; then
    echo "ERROR: This script should only be run in candlefish-ai repository"
    echo "Current directory: $REPO_NAME"
    echo "Remote URL: $REPO_REMOTE"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: You have uncommitted changes. Please commit or stash them first."
    git status --short
    exit 1
fi

# Verify we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "ERROR: Please switch to main branch before running this script"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Pre-execution analysis
echo "🔍 ANALYZING REPOSITORY FOR SENSITIVE CONTENT"
echo "=============================================="
echo "Scanning git history for patterns that will be removed..."

# Check current state
SENSITIVE_FILES=$(git log --all --name-only --pretty=format: | grep -iE "(family|privileged|estate|trust)" | wc -l | tr -d ' ')
SENSITIVE_COMMITS=$(git log --all --oneline --grep="family\|privileged\|estate\|trust" -i | wc -l | tr -d ' ')

echo "📊 Analysis Results:"
echo "  • Files with sensitive patterns: $SENSITIVE_FILES"
echo "  • Commits with sensitive terms: $SENSITIVE_COMMITS"
echo ""

if [ "$SENSITIVE_FILES" -eq 0 ] && [ "$SENSITIVE_COMMITS" -eq 0 ]; then
    echo "✅ No sensitive content detected in git history"
    echo "This script may not be necessary to run."
    echo ""
    read -p "Continue anyway? (y/N): " continue_anyway
    if [ "$continue_anyway" != "y" ] && [ "$continue_anyway" != "Y" ]; then
        echo "Aborted - no sensitive content found"
        exit 0
    fi
fi

# Show sample of what will be removed
if [ "$SENSITIVE_FILES" -gt 0 ]; then
    echo "🗂️  Sample files that will be removed from history:"
    git log --all --name-only --pretty=format: | grep -iE "(family|privileged|estate|trust)" | head -10 | sed 's/^/    • /'
    echo ""
fi

if [ "$SENSITIVE_COMMITS" -gt 0 ]; then
    echo "📝 Sample commit messages that will be cleaned:"
    git log --all --oneline --grep="family\|privileged\|estate\|trust" -i | head -5 | sed 's/^/    • /'
    echo ""
fi

# Final confirmation
echo "This will:"
echo "1. Download BFG Repo Cleaner if not present"
echo "2. Remove ALL folders: privileged, family, private, confidential, estate, trust"
echo "3. Remove ALL files matching: *family*, *privileged*, *private*, etc."
echo "4. Clean commit messages by replacing sensitive terms with [REDACTED]"
echo "5. Force push the cleaned history (DESTRUCTIVE OPERATION)"
echo ""
echo "⚠️  TEAM IMPACT: Tyler and Aaron will need to delete and re-clone their repositories"
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

# Remove folders with comprehensive patterns
java -jar ../bfg.jar --delete-folders "privileged" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "family" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "private" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "confidential" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "family-dashboard" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "family-auth" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "family-data" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "estate" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "trust" --no-blob-protection .
java -jar ../bfg.jar --delete-folders "legal_structure" --no-blob-protection .

echo "✅ Folders removed from history"

# Step 5: Clean sensitive filenames
echo ""
echo "Step 5: Removing sensitive files..."
echo "-----------------------------------"

# Create comprehensive patterns file for BFG
cat > ../sensitive-files.txt << 'EOF'
*family*
*privileged*
*private*
*confidential*
*estate*
*trust*
*legal_structure*
family-dashboard*
*family-dashboard*
family-auth*
*family-auth*
family-data*
*family-data*
family-logout*
*family-logout*
*family-letter*
family-plan*
*family-plan*
validate-family-auth*
*family-business*
EOF

java -jar ../bfg.jar --delete-files-found-in ../sensitive-files.txt --no-blob-protection .

echo "✅ Sensitive files removed"

# Step 6: Clean commit messages
echo ""
echo "Step 6: Cleaning commit messages..."
echo "----------------------------------"

# Create comprehensive replacement file for commit messages
cat > ../replacements.txt << 'EOF'
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
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

# Comprehensive verification of cleaning
echo "Performing comprehensive verification..."
VERIFICATION_FAILED=false

# Check for remaining sensitive content in file paths
echo "Checking for 'privileged' in file paths..."
if git log --all --name-only --pretty=format: | grep -i privileged | head -1 | grep -q .; then
    echo "⚠️  WARNING: 'privileged' references remain in file paths"
    git log --all --name-only --pretty=format: | grep -i privileged | head -5
    VERIFICATION_FAILED=true
else
    echo "✅ No 'privileged' found in file paths"
fi

echo "Checking for 'family' in file paths..."
if git log --all --name-only --pretty=format: | grep -i family | head -1 | grep -q .; then
    echo "⚠️  WARNING: 'family' references remain in file paths"
    git log --all --name-only --pretty=format: | grep -i family | head -5
    VERIFICATION_FAILED=true
else
    echo "✅ No 'family' found in file paths"
fi

# Check commit messages for sensitive terms
echo "Checking for sensitive terms in commit messages..."
if git log --all --oneline --grep="family\|privileged\|estate\|trust" -i | head -1 | grep -q .; then
    echo "⚠️  WARNING: Sensitive terms remain in commit messages"
    git log --all --oneline --grep="family\|privileged\|estate\|trust" -i | head -5
    VERIFICATION_FAILED=true
else
    echo "✅ No sensitive terms found in commit messages"
fi

# Check for specific sensitive files
echo "Checking for specific sensitive file patterns..."
SENSITIVE_PATTERNS="family-dashboard family-auth family-data family-logout family-letter family-plan"
for pattern in $SENSITIVE_PATTERNS; do
    if git log --all --name-only --pretty=format: | grep "$pattern" | head -1 | grep -q .; then
        echo "⚠️  WARNING: '$pattern' files remain"
        VERIFICATION_FAILED=true
    fi
done

if [ "$VERIFICATION_FAILED" = true ]; then
    echo ""
    echo "🚨 VERIFICATION FAILED: Some sensitive content may still exist"
    echo "Review the warnings above before proceeding"
    echo ""
    read -p "Continue anyway? (type 'force-continue'): " force
    if [ "$force" != "force-continue" ]; then
        echo "Aborted. Cleaned repository available at: $CLEAN_DIR"
        exit 1
    fi
else
    echo "✅ All verification checks passed"
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
