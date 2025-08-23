#!/bin/bash
# EMERGENCY SECURITY FIX - Block Privileged Content Access
# Run immediately to prevent Tyler/Aaron access to family documents

set -e

echo "🚨 EMERGENCY SECURITY FIX - Starting..."
echo "======================================"

# Change to repository root
cd /Users/patricksmith/candlefish-ai

# Step 1: Update .gitignore to block all privileged paths
echo "Step 1: Updating .gitignore..."
cat >> .gitignore << 'EOF'

# CRITICAL SECURITY: Block all privileged family content
**/privileged/
**/family/
**/*family*
**/*privileged*
**/private/
**/confidential/
**/sensitive/
public/docs/privileged/
apps/website/public/docs/privileged/
apps/website/dist/docs/privileged/
.netlify/static/docs/privileged/
# Backup files that might contain sensitive data
*.backup
*.bak
family-vault/
EOF

echo "✅ .gitignore updated"

# Step 2: Create Netlify redirects to block access
echo "Step 2: Creating Netlify access blocks..."
mkdir -p public
cat > public/_redirects << 'EOF'
# SECURITY: Block all privileged paths with 404
/docs/privileged/*      /404.html   404!
/privileged/*           /404.html   404!
/family/*               /404.html   404!
/private/*              /404.html   404!
/confidential/*         /404.html   404!
/sensitive/*            /404.html   404!
/docs/family/*          /404.html   404!

# Default SPA routing (must be last)
/*                      /index.html 200
EOF

# Also create in apps/website if it exists
if [ -d "apps/website" ]; then
    mkdir -p apps/website/public
    cp public/_redirects apps/website/public/_redirects
    echo "✅ Created redirects in apps/website"
fi

echo "✅ Netlify redirects created"

# Step 3: Remove privileged content from build outputs
echo "Step 3: Removing privileged content from build directories..."
rm -rf public/docs/privileged 2>/dev/null || true
rm -rf apps/website/dist/docs/privileged 2>/dev/null || true
rm -rf apps/website/public/docs/privileged 2>/dev/null || true
rm -rf .netlify/static/docs/privileged 2>/dev/null || true
rm -rf apps/website/candlefish-production/docs/privileged 2>/dev/null || true

echo "✅ Removed privileged content from build directories"

# Step 4: Create 404 page if it doesn't exist
echo "Step 4: Creating 404 page..."
if [ ! -f "public/404.html" ]; then
    cat > public/404.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Not Found</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .error-container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 4rem;
            margin: 0;
            color: #333;
        }
        p {
            font-size: 1.2rem;
            color: #666;
            margin: 1rem 0;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>404</h1>
        <p>Page not found</p>
        <p><a href="/">Return to homepage</a></p>
    </div>
</body>
</html>
EOF
    echo "✅ Created 404.html"
else
    echo "✅ 404.html already exists"
fi

# Step 5: Update Netlify configuration
echo "Step 5: Updating Netlify configuration..."
if [ -f "netlify.toml" ]; then
    # Remove any existing privileged path configurations
    cp netlify.toml netlify.toml.backup
    sed -i.bak '/privileged\|family/d' netlify.toml 2>/dev/null || sed -i '' '/privileged\|family/d' netlify.toml
    echo "✅ Cleaned netlify.toml"
fi

# Step 6: Commit changes
echo "Step 6: Committing security fixes..."
git add .gitignore public/_redirects public/404.html
git add -u  # Add deletions

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "⚠️  No changes to commit (already secured?)"
else
    git commit -m "CRITICAL SECURITY: Emergency block of privileged family content

- Added comprehensive .gitignore rules to exclude all privileged paths
- Created Netlify _redirects to return 404 for sensitive paths
- Removed all privileged content from build directories
- Prevented Tyler/Aaron access to family documentation

This is an emergency security fix to immediately block access."

    echo "✅ Changes committed"
    echo ""
    echo "⚠️  IMPORTANT: Push these changes immediately!"
    echo "Run: git push origin main"
fi

# Step 7: Verify the fix
echo ""
echo "Step 7: Verifying security fix..."
echo "======================================"

# Check no privileged content remains
if find . -type d -name "privileged" -o -name "family" 2>/dev/null | grep -v ".git" | grep -q .; then
    echo "⚠️  WARNING: Privileged directories still found:"
    find . -type d -name "privileged" -o -name "family" 2>/dev/null | grep -v ".git"
else
    echo "✅ No privileged directories found in working tree"
fi

# Check .gitignore contains rules
if grep -q "privileged" .gitignore; then
    echo "✅ .gitignore contains privileged exclusions"
else
    echo "❌ ERROR: .gitignore missing privileged rules!"
fi

# Check redirects exist
if [ -f "public/_redirects" ] && grep -q "privileged" public/_redirects; then
    echo "✅ Redirects configured to block privileged paths"
else
    echo "❌ ERROR: Redirects not properly configured!"
fi

echo ""
echo "======================================"
echo "🔒 EMERGENCY SECURITY FIX COMPLETE"
echo ""
echo "NEXT STEPS:"
echo "1. Push changes immediately: git push origin main"
echo "2. Trigger Netlify redeploy to apply blocks"
echo "3. Run the full migration script: ./migrate-to-family-vault.sh"
echo "4. Clean git history with BFG: ./clean-git-history.sh"
echo ""
echo "⚠️  CRITICAL: The content is blocked but still in git history!"
echo "    Complete the full migration within 24 hours."
echo "======================================"
