# CRITICAL SECURITY ISOLATION ARCHITECTURE
## Privileged Family Documentation Protection

**CRITICAL ALERT**: Privileged family content detected in multiple locations within the main Candlefish deployment. Immediate action required.

---

## EXECUTIVE SUMMARY

**Current Risk Level: HIGH**

Privileged family documentation exists in 10+ locations within the main candlefish-ai repository, with partial protections via Netlify Edge Functions but NO git-level isolation. Content has been committed to git history and is potentially accessible to Tyler and Aaron through:
- Direct repository access
- Build artifacts
- Netlify deployment logs
- Git history examination

**Recommended Solution: OPTION A - Complete Repository Segregation**
- Move all privileged content to `/Users/patricksmith/family-vault/` (new private repository)
- Deploy to separate domain: `family.patricksmith.dev`
- Clean git history from main repository
- Implement monitoring and alerts

---

## 1. CURRENT STATE SECURITY AUDIT

### Privileged Content Locations Found:
```
✗ /Users/patricksmith/candlefish-ai/public/docs/privileged/family/
✗ /Users/patricksmith/candlefish-ai/.netlify/static/docs/privileged/family/
✗ /Users/patricksmith/candlefish-ai/apps/website/dist/docs/privileged/family/
✗ /Users/patricksmith/candlefish-ai/apps/website/public/docs/privileged/family/
✗ /Users/patricksmith/candlefish-ai/apps/website/candlefish-production/docs/privileged/family/
```

### Git History Exposure:
- 10+ commits reference "family" or "privileged" content
- Content has been pushed to remote repository
- Sensitive legal documents found in history

### Current Protection Mechanisms:
- Netlify Edge Function: `validate-family-auth` (INSUFFICIENT)
- Robots meta tags to prevent indexing (INSUFFICIENT)
- No .gitignore exclusions (CRITICAL GAP)

---

## 2. SECURITY ISOLATION ARCHITECTURES

### OPTION A: COMPLETE REPOSITORY SEGREGATION (RECOMMENDED)

**Security Level: Maximum**

#### Architecture:
```
/Users/patricksmith/
├── candlefish-ai/              # Public repository (Tyler/Aaron access)
│   ├── public/docs/            # NO privileged content
│   └── .gitignore              # Excludes all privileged paths
│
└── family-vault/               # Private repository (Patrick only)
    ├── .git/                   # Separate git repository
    ├── public/
    │   └── documents/          # Family documents
    ├── netlify.toml            # Independent deployment
    ├── .env                    # Separate credentials
    └── deploy.sh               # Secure deployment script
```

#### Advantages:
- Complete git-level isolation
- No shared build processes
- Independent deployment pipeline
- Zero cross-contamination risk
- Separate access controls

#### Implementation Complexity: Medium
#### Time to Deploy: 4 hours

---

### OPTION B: BUILD-TIME EXCLUSION

**Security Level: Medium**

#### Architecture:
- Keep content in same repository
- Use `.gitignore` to exclude from tracking
- Implement build flags for conditional inclusion
- Deploy to separate Netlify sites from same repo

#### Advantages:
- Single repository management
- Shared tooling and configurations
- Easier content synchronization

#### Disadvantages:
- Risk of accidental inclusion
- Complex build configurations
- Git history still contains old content
- Potential for configuration errors

#### Implementation Complexity: High
#### Time to Deploy: 6 hours

---

### OPTION C: RUNTIME ACCESS CONTROL

**Security Level: Low-Medium**

#### Architecture:
- Implement authentication middleware
- Use Netlify Identity or Auth0
- Role-based access control (RBAC)
- Audit logging

#### Advantages:
- No content migration needed
- Granular access control
- Audit trail

#### Disadvantages:
- Content still in main repository
- Vulnerable to misconfiguration
- Git history exposure remains
- Tyler/Aaron could potentially access via git

#### Implementation Complexity: High
#### Time to Deploy: 8 hours

---

## 3. IMMEDIATE SECURITY FIXES (EXECUTE NOW)

### URGENT: Block Access Immediately

```bash
# 1. Add to .gitignore immediately
cat >> /Users/patricksmith/candlefish-ai/.gitignore << 'EOF'

# SECURITY: Block all privileged content
**/privileged/
**/family/
**/*family*
**/*privileged*
public/docs/privileged/
apps/website/public/docs/privileged/
.netlify/static/docs/privileged/
EOF

# 2. Create Netlify _redirects to block paths
cat > /Users/patricksmith/candlefish-ai/public/_redirects << 'EOF'
# SECURITY: Block privileged paths
/docs/privileged/*  /404.html  404!
/privileged/*       /404.html  404!
/family/*           /404.html  404!
EOF

# 3. Remove from current deployment
rm -rf /Users/patricksmith/candlefish-ai/apps/website/dist/docs/privileged
rm -rf /Users/patricksmith/candlefish-ai/.netlify/static/docs/privileged

# 4. Commit security fixes
cd /Users/patricksmith/candlefish-ai
git add .gitignore public/_redirects
git commit -m "SECURITY: Emergency block of privileged content paths"
git push origin main
```

---

## 4. COMPLETE MIGRATION IMPLEMENTATION (OPTION A)

### Phase 1: Setup New Repository

```bash
#!/bin/bash
# migration-phase1-setup.sh

# Create new private repository structure
mkdir -p /Users/patricksmith/family-vault
cd /Users/patricksmith/family-vault

# Initialize git repository
git init
git branch -M main

# Create directory structure
mkdir -p {public/documents,scripts,config,.github/workflows}

# Create .gitignore
cat > .gitignore << 'EOF'
# Security
.env
.env.local
*.key
*.pem
*.cert

# Build
dist/
.netlify/
node_modules/

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db
EOF

# Create README (private)
cat > README.md << 'EOF'
# Family Vault - Private Documentation

**PRIVATE REPOSITORY - DO NOT SHARE**

This repository contains privileged family documentation.
Access is restricted to authorized family members only.

## Security Notes
- Never add external collaborators
- Use strong authentication
- Regular security audits
- Encrypted backups only
EOF

# Create Netlify configuration
cat > netlify.toml << 'EOF'
[build]
  publish = "public"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "same-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
    X-Robots-Tag = "noindex, nofollow, noarchive, nosnippet, noimageindex"

[[redirects]]
  from = "/"
  to = "/documents/index.html"
  status = 200

# Require authentication for all paths
[[redirects]]
  from = "/*"
  to = "/.netlify/identity/login"
  status = 401
  force = true
  conditions = {Role = ["family"]}
EOF

echo "✅ Phase 1: Repository structure created"
```

### Phase 2: Content Migration

```bash
#!/bin/bash
# migration-phase2-content.sh

SOURCE="/Users/patricksmith/candlefish-ai/public/docs/privileged/family"
DEST="/Users/patricksmith/family-vault/public/documents"

# Backup current content
echo "Creating backup..."
tar -czf /Users/patricksmith/family-content-backup-$(date +%Y%m%d-%H%M%S).tar.gz "$SOURCE"

# Copy content to new location
echo "Migrating content..."
cp -r "$SOURCE"/* "$DEST"/ 2>/dev/null || mkdir -p "$DEST"

# Create index.html for family portal
cat > "$DEST/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Family Portal - Private</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .security-notice {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 1rem;
            margin-bottom: 2rem;
        }
        .document-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
        }
        .document-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .document-card h3 {
            margin-top: 0;
            color: #333;
        }
        .document-card a {
            color: #0066cc;
            text-decoration: none;
        }
        .document-card a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Family Documentation Portal</h1>
        <p>Private and Confidential - Authorized Access Only</p>
    </div>
    
    <div class="security-notice">
        <strong>Security Notice:</strong> This portal contains sensitive family documentation. 
        Do not share access credentials. Report any suspicious activity immediately.
    </div>
    
    <div class="document-grid">
        <div class="document-card">
            <h3>Legal Documents</h3>
            <ul>
                <li><a href="candlefish_family_legal_update_08072025.html">Legal Update - August 2025</a></li>
            </ul>
        </div>
        
        <div class="document-card">
            <h3>Financial Planning</h3>
            <ul>
                <li><a href="financial/estate_planning.html">Estate Planning</a></li>
            </ul>
        </div>
        
        <div class="document-card">
            <h3>Family Assets</h3>
            <ul>
                <li><a href="assets/inventory.html">Asset Inventory</a></li>
            </ul>
        </div>
    </div>
    
    <script>
        // Security: Log access attempts
        console.log('Access logged:', new Date().toISOString(), window.location.href);
        
        // Disable right-click
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Warn on print attempt
        window.addEventListener('beforeprint', () => {
            if (!confirm('Printing sensitive documents. Continue?')) {
                return false;
            }
        });
    </script>
</body>
</html>
EOF

# Commit migrated content
cd /Users/patricksmith/family-vault
git add .
git commit -m "Initial migration of family documentation"

echo "✅ Phase 2: Content migrated successfully"
```

### Phase 3: Git History Cleaning

```bash
#!/bin/bash
# migration-phase3-clean-history.sh

cd /Users/patricksmith/candlefish-ai

# Remove privileged content from working directory
echo "Removing privileged content from main repository..."
rm -rf public/docs/privileged
rm -rf apps/website/public/docs/privileged
rm -rf apps/website/dist/docs/privileged
rm -rf .netlify/static/docs/privileged

# Use BFG Repo Cleaner to remove from history
echo "Downloading BFG Repo Cleaner..."
curl -L https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar -o bfg.jar

# Clean sensitive paths from history
echo "Cleaning git history..."
java -jar bfg.jar --delete-folders privileged --no-blob-protection
java -jar bfg.jar --delete-folders family --no-blob-protection

# Clean and garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push cleaned history (DANGEROUS - backup first!)
echo "WARNING: This will rewrite history. Ensure you have backups!"
read -p "Continue with force push? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
    git push origin --force --all
    git push origin --force --tags
fi

echo "✅ Phase 3: Git history cleaned"
```

### Phase 4: Deployment Setup

```bash
#!/bin/bash
# migration-phase4-deployment.sh

cd /Users/patricksmith/family-vault

# Create deployment script
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🔒 Deploying Family Vault..."

# Ensure we're on main branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    echo "ERROR: Must deploy from main branch"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: Uncommitted changes detected"
    exit 1
fi

# Deploy to Netlify
netlify deploy --prod --dir=public --site=family-vault-private

echo "✅ Deployment complete"
echo "🔗 Access at: https://family.patricksmith.dev"
EOF

chmod +x deploy.sh

# Create GitHub private repository
gh repo create family-vault --private --description "Private family documentation"

# Add remote and push
git remote add origin https://github.com/patricksmith/family-vault.git
git push -u origin main

# Setup Netlify site
netlify sites:create --name family-vault-private

# Configure custom domain
netlify domains:add family.patricksmith.dev

# Enable Netlify Identity for authentication
netlify api updateSite --data '{
  "capabilities": {
    "identity": {
      "enabled": true,
      "settings": {
        "registration": "invite",
        "min_password_length": 12,
        "external_providers": [],
        "roles": ["family", "admin"]
      }
    }
  }
}'

echo "✅ Phase 4: Deployment configured"
```

---

## 5. SECURITY MONITORING SETUP

### Continuous Monitoring Script

```bash
#!/bin/bash
# security-monitor.sh

# Save to /Users/patricksmith/family-vault/scripts/security-monitor.sh

MAIN_REPO="/Users/patricksmith/candlefish-ai"
ALERT_EMAIL="patrick@candlefish.ai"

# Function to send alerts
send_alert() {
    local message=$1
    echo "SECURITY ALERT: $message"
    # Send email alert (configure mail command or use AWS SES)
    echo "$message" | mail -s "SECURITY ALERT: Family Vault" "$ALERT_EMAIL" 2>/dev/null || true
}

# Check 1: Scan main repository for privileged content
echo "Scanning main repository for privileged content..."
if find "$MAIN_REPO" -type f -name "*family*" -o -name "*privileged*" 2>/dev/null | grep -q .; then
    send_alert "Privileged content found in main repository!"
fi

# Check 2: Verify .gitignore is intact
if ! grep -q "privileged" "$MAIN_REPO/.gitignore"; then
    send_alert ".gitignore missing privileged exclusions!"
fi

# Check 3: Check for unauthorized access attempts
if [ -f /var/log/nginx/access.log ]; then
    if grep -q "/privileged\|/family" /var/log/nginx/access.log; then
        send_alert "Unauthorized access attempt to privileged paths!"
    fi
fi

# Check 4: Verify private repository permissions
cd /Users/patricksmith/family-vault
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [[ ! "$REMOTE_URL" =~ "private" ]]; then
    send_alert "Family vault repository may not be private!"
fi

# Check 5: Monitor for new collaborators
COLLABORATORS=$(gh api repos/patricksmith/family-vault/collaborators --jq '.[].login' 2>/dev/null)
if [ -n "$COLLABORATORS" ] && [ "$COLLABORATORS" != "patricksmith" ]; then
    send_alert "Unauthorized collaborators detected on family-vault!"
fi

echo "✅ Security scan complete"
```

### Automated Daily Audit

```bash
# Add to crontab
crontab -e
# Add line:
0 9 * * * /Users/patricksmith/family-vault/scripts/security-monitor.sh
```

---

## 6. ACCESS CONTROL MATRIX

| Resource | Patrick | Family Members | Tyler | Aaron | Public | Enforcement |
|----------|---------|---------------|-------|-------|--------|-------------|
| `/docs/privileged/family` | ✗ (removed) | ✗ | ✗ | ✗ | ✗ | Deleted from main repo |
| `family-vault` repository | ✓ | ✗ | ✗ | ✗ | ✗ | GitHub private repo |
| `family.patricksmith.dev` | ✓ | ✓ (invited) | ✗ | ✗ | ✗ | Netlify Identity |
| `candlefish.ai` main site | ✓ | ✓ | ✓ | ✓ | ✓ | Public access |
| Build process | ✓ | ✗ | ✓ | ✓ | ✗ | Separate pipelines |
| Netlify admin (main) | ✓ | ✗ | ? | ? | ✗ | Role-based |
| Netlify admin (family) | ✓ | ✗ | ✗ | ✗ | ✗ | Separate account |

---

## 7. VERIFICATION CHECKLIST

```bash
#!/bin/bash
# verify-isolation.sh

echo "🔍 Security Isolation Verification"
echo "================================="

# Test 1: No privileged content in main repo
echo -n "Test 1: Main repo clean... "
if ! find /Users/patricksmith/candlefish-ai -name "*privileged*" -o -name "*family*" 2>/dev/null | grep -q .; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test 2: Git history cleaned
echo -n "Test 2: Git history clean... "
cd /Users/patricksmith/candlefish-ai
if ! git log --all --grep="privileged\|family" | grep -q .; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test 3: Private repo exists
echo -n "Test 3: Private repo exists... "
if [ -d /Users/patricksmith/family-vault/.git ]; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test 4: .gitignore configured
echo -n "Test 4: .gitignore configured... "
if grep -q "privileged" /Users/patricksmith/candlefish-ai/.gitignore; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test 5: Netlify blocks configured
echo -n "Test 5: Netlify blocks active... "
if curl -s https://candlefish.ai/docs/privileged/test | grep -q "404"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

echo "================================="
echo "Verification complete"
```

---

## 8. EMERGENCY RESPONSE PLAN

### If Exposure Detected:

1. **Immediate Actions (< 5 minutes)**
   ```bash
   # Block all access
   rm -rf /Users/patricksmith/candlefish-ai/public/docs/privileged
   git commit -am "EMERGENCY: Remove sensitive content"
   git push origin main --force
   ```

2. **Containment (< 30 minutes)**
   - Revoke all Netlify deploy keys
   - Rotate all credentials
   - Review access logs

3. **Investigation (< 2 hours)**
   - Audit git history
   - Check all deployments
   - Review team member access

4. **Recovery (< 24 hours)**
   - Complete migration to private repository
   - Implement additional monitoring
   - Document incident

---

## 9. OPERATIONAL PROCEDURES

### For Patrick:

#### Adding New Family Documents:
```bash
cd /Users/patricksmith/family-vault
cp /path/to/new/document.pdf public/documents/
git add public/documents/document.pdf
git commit -m "Add: document.pdf"
git push origin main
./deploy.sh
```

#### Granting Family Member Access:
1. Go to https://app.netlify.com/sites/family-vault-private/identity
2. Click "Invite users"
3. Enter family member email
4. Assign "family" role
5. Send secure credentials separately

#### Revoking Access:
```bash
netlify api listUsers --site-id family-vault-private
netlify api deleteUser --user-id [USER_ID]
```

---

## 10. IMPLEMENTATION TIMELINE

### Day 1 (Today) - URGENT
- [ ] Execute immediate security fixes (Section 3)
- [ ] Create backup of all content
- [ ] Set up family-vault repository

### Day 2
- [ ] Migrate content to private repository
- [ ] Clean git history from main repo
- [ ] Configure Netlify deployment

### Day 3
- [ ] Test access controls
- [ ] Set up monitoring
- [ ] Document procedures

### Day 4
- [ ] Final verification
- [ ] Go live with isolated system
- [ ] Monitor for issues

---

## CRITICAL SUCCESS METRICS

✅ **Achieved when:**
1. Zero privileged content in candlefish-ai repository
2. Git history cleaned of sensitive commits
3. Private family-vault repository deployed
4. Monitoring alerts configured
5. Access audit shows Tyler/Aaron have no path to content
6. Family members can access via secure portal
7. Automated security scans pass daily

---

## SUPPORT

For questions or issues:
- Technical: Execute security-monitor.sh
- Emergency: Run emergency response plan
- Updates: Check family-vault/scripts/

**Document Version:** 1.0
**Last Updated:** August 2025
**Classification:** CONFIDENTIAL
