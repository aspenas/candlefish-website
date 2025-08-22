# Candlefish AI Monorepo Cleanup Plan

## Priority 1: CRITICAL SECURITY ISSUES

### 🚨 IMMEDIATE ACTION REQUIRED: Exposed Credentials
**File**: `/apps/n8n/credentials-config.json` contains hardcoded API keys

**Exposed Credentials**:
- Porkbun API Key: `pk1_53a9830b44fdba7190c060c12053fa39e28c1e134c06043c443dfabaa57c0ad5`
- Porkbun Secret: `sk1_32f237d6bff118390f1f4e5b3c27130fbeac7c9db8f265e7d6b57d74fbfca60e`
- n8n JWT Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Immediate Actions**:
1. **Revoke Porkbun API keys immediately** at https://porkbun.com/account/api
2. **Regenerate n8n API token**
3. **Remove credentials file from git**: `git rm apps/n8n/credentials-config.json`
4. **Clean git history**: `git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch apps/n8n/credentials-config.json' --prune-empty --tag-name-filter cat -- --all`

## Priority 2: Submodule Resolution

### Current Status
All submodules show modified content but .gitmodules is disabled:
- `candlefish-temporal-platform`: 80+ modified files (major updates)
- `clark_county_permits_emergency`: 10 modified files (minor updates)  
- `ibm-watsonx-portfolio`: 10 modified files (website updates)
- `nanda-adapter`: Untracked changes

### Recommended Action: Convert to Regular Directories
```bash
# Remove submodule configuration
git submodule deinit --all
rm -rf .git/modules/*
git rm --cached candlefish-temporal-platform clark_county_permits_emergency ibm-watsonx-portfolio nanda-adapter

# Add as regular directories
git add candlefish-temporal-platform clark_county_permits_emergency ibm-watsonx-portfolio nanda-adapter
git commit -m "Convert submodules to regular directories for monorepo consolidation"
```

**Rationale**: Submodules complicate the monorepo structure and these appear to be tightly integrated components.

## Priority 3: Docker Configuration Consolidation

### Current Structure (4 files with overlap)
- `docker-compose.yml`: Full RTPM stack (102 lines)
- `docker-compose.simple.yml`: Basic NANDA only (50 lines)  
- `docker-compose.nanda-prod.yml`: Production NANDA with monitoring (253 lines)
- `docker-compose.promoteros.yml`: Simple PostgreSQL + Redis (39 lines)

### Recommended Consolidation
```
docker-compose.yml              # Local development (merge current + simple)
docker-compose.prod.yml         # Production (rename nanda-prod.yml)  
docker-compose.promoteros.yml   # Keep as-is (service-specific)
docker-compose.test.yml         # Keep as-is (testing)
```

### Consolidation Steps
1. **Merge** `docker-compose.simple.yml` into `docker-compose.yml` as lightweight profiles
2. **Rename** `docker-compose.nanda-prod.yml` to `docker-compose.prod.yml`
3. **Add profiles** to enable service subsets: `--profile nanda`, `--profile rtpm`

## Priority 4: n8n Secure Configuration

### Security Implementation
- ✅ Created `credentials-template.json` with environment variable placeholders
- ✅ Created `setup-secure-credentials.sh` for AWS Secrets Manager integration
- ✅ Updated .gitignore to prevent future credential exposure

### Deployment Process
```bash
# 1. Run secure setup
./apps/n8n/setup-secure-credentials.sh

# 2. Deploy with Fly.io
flyctl deploy --app n8n-candlefish

# 3. Access at https://n8n.candlefish.ai
```

## Priority 5: Project Structure Optimization

### Current Issues
- 23 apps in `/apps` directory (some may be inactive)
- Multiple similar services (nanda-api, nanda-dashboard, nanda-autonomous)
- Overlapping configurations

### Recommended Structure
```
apps/
├── active/           # Currently deployed services
│   ├── nanda-api/
│   ├── nanda-dashboard/
│   └── website/
├── development/      # In-development services  
│   ├── collaboration-editor/
│   └── mobile-dashboard/
└── experimental/     # Prototype services
    ├── n8n/
    └── analytics-dashboard/
```

## Implementation Timeline

### Week 1: Security & Critical Issues
- [ ] Revoke and regenerate exposed Porkbun credentials
- [ ] Remove credentials from git history
- [ ] Deploy secure n8n configuration
- [ ] Convert submodules to regular directories

### Week 2: Docker Consolidation  
- [ ] Merge docker-compose files with profiles
- [ ] Test consolidated configurations
- [ ] Update deployment scripts
- [ ] Document new structure

### Week 3: Project Organization
- [ ] Reorganize apps into active/development/experimental
- [ ] Update build scripts and CI/CD
- [ ] Create service inventory documentation
- [ ] Archive unused services

## Monitoring & Validation

### Security Validation
```bash
# Check for remaining hardcoded secrets
git log --all --full-history -- "*/credentials*" | grep -i "key\|token\|secret"

# Scan for API keys in current codebase  
grep -r "pk1_\|sk1_\|eyJ" . --exclude-dir=node_modules --exclude-dir=.git
```

### Build Validation
```bash
# Test consolidated docker configurations
docker-compose -f docker-compose.yml --profile nanda up --dry-run
docker-compose -f docker-compose.prod.yml up --dry-run
```

### Service Health Check
```bash
# Verify all services start correctly
./scripts/health-check-all-services.sh
```

## Success Criteria

- ✅ No hardcoded credentials in repository
- ✅ All Docker configurations work correctly  
- ✅ Submodules converted to regular directories
- ✅ n8n deployed with secure credential management
- ✅ Clear project structure with active/development/experimental separation
- ✅ All existing functionality preserved
- ✅ Improved developer experience for local development

## Risk Mitigation

- **Backup current state** before making changes
- **Test each change** in isolated environment first
- **Maintain rollback capability** for critical services
- **Document all changes** for team awareness
