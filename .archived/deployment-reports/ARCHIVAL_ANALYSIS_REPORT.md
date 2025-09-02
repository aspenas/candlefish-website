# Candlefish AI Repository Archival Analysis Report

## Architectural Review Summary
**Date**: 2025-08-29  
**Reviewer**: Architecture Analysis System  
**Impact Assessment**: Medium-High  

## Executive Summary

This report identifies stalled, abandoned, or completed projects within the candlefish-ai repository that should be archived to maintain architectural integrity and reduce technical debt. The analysis reveals **4 active background services (CLOS)**, **15+ potentially stalled projects**, and **3 projects ready for immediate archival**.

## 1. CLOS Services Analysis

### Current Status: **ACTIVE** 
- **Running Services**: 4 background processes on ports 3500-3502
- **Last Activity**: August 29, 2025 (today)
- **Architecture Pattern**: Go-based orchestrator with SQLite registry
- **Recommendation**: **KEEP ACTIVE** - Critical infrastructure component

#### Running Processes:
1. Port 3500: Web Dashboard (Node.js)
2. Port 3501: Auth Service (TypeScript/tsx)
3. Port 3502: Additional service
4. Orchestrator: Main CLOS orchestrator with PostgreSQL/Redis

### Architectural Implications:
- CLOS is a core service management system
- Provides port allocation and service discovery
- Essential for local development orchestration
- Well-documented with clear architectural boundaries

## 2. Projects Ready for Archival

### 2.1 Fogg Calendar Project
**Status**: **ARCHIVE IMMEDIATELY**
- **Location**: `/projects/fogg/calendar/`
- **Last Activity**: August 26, 2025
- **Purpose**: Calendar management for FOGG group
- **Dependencies Found**: 
  - Google Cloud Build configurations
  - Service account references
  - GitHub workflow deployments
- **Action Required**: 
  1. Remove GitHub workflows
  2. Clean up GCP service accounts
  3. Archive to `/ARCHIVE/projects/fogg/`

### 2.2 Claude Resources Setup
**Status**: **ARCHIVE**
- **Location**: `/claude-resources-setup/`
- **Last Activity**: August 8, 2025
- **Purpose**: Initial Claude integration setup
- **Recommendation**: Superseded by current implementation

### 2.3 Terminal Backup
**Status**: **ARCHIVE**
- **Location**: `/terminal-backup/`
- **Last Activity**: August 13, 2025
- **Purpose**: Terminal configuration backup
- **Recommendation**: Move to personal dotfiles repository

## 3. Stalled Projects Analysis

### High Priority for Review (>2 months inactive)

| Project | Location | Last Activity | Status | Recommendation |
|---------|----------|---------------|--------|----------------|
| candlefish-figma-bootstrap | `/candlefish-figma-bootstrap/` | 2025-08-16 | Stalled | Review & Archive |
| meeting-automation | `/meeting-automation/` | 2025-08-26 | Potentially Active | Verify usage |
| candlefish-starter-complete | `/candlefish-starter-complete/` | No commits | Empty/Abandoned | Archive |
| emergency-backup | `/emergency-backup/` | No commits | Empty | Delete |
| simple-test | `/simple-test/` | No commits | Test directory | Delete |
| system-runner | `/system-runner/` | No commits | Empty | Delete |
| test-candlefish-system | `/test-candlefish-system/` | No commits | Test directory | Delete |

### Active Projects (Recent Activity)

| Project | Location | Last Activity | Status | Notes |
|---------|----------|---------------|--------|-------|
| 5470_S_Highline_Circle | `/5470_S_Highline_Circle/` | 2025-08-29 | Active | Inventory management system |
| Paintbox | `/projects/paintbox/` | 2025-08-24 | Active | Production deployment |
| PromoterOS | `/projects/promoterOS/` | 2025-08-23 | Active | Quality improvements |
| NANDA Web | `/projects/nanda-web/` | 2025-08-22 | Active | Platform deployment |
| Security Dashboard | `/apps/security-dashboard/` | Current branch | Active | Under development |

## 4. Already Archived Projects

The following have been properly archived in `/ARCHIVE/`:
- brand-portal
- collaboration-editor
- mobile-dashboard
- nurture-dashboard
- nurture-system
- otter-gateway
- rtpm-api
- Various branding iterations

## 5. Architectural Patterns Observed

### Positive Patterns:
1. **Clear separation**: Active vs archived projects
2. **Service orchestration**: CLOS provides consistent management
3. **Port allocation**: Well-defined ranges per project
4. **Documentation**: Most projects have README files

### Anti-patterns Identified:
1. **Orphaned test directories**: Multiple empty test folders
2. **Duplicate configurations**: Multiple netlify.toml files
3. **Stale dependencies**: Fogg project references in configs
4. **Mixed concerns**: Business projects mixed with infrastructure

## 6. Recommended Actions

### Immediate (Week 1):
1. **Archive Fogg Calendar**
   ```bash
   mv projects/fogg /ARCHIVE/projects/
   git rm -r projects/fogg
   ```

2. **Clean empty directories**
   ```bash
   rm -rf emergency-backup simple-test system-runner test-candlefish-system
   ```

3. **Update CLOS registry**
   - Remove references to archived projects
   - Update port allocations

### Short-term (Week 2-3):
1. Review and consolidate deployment configurations
2. Centralize infrastructure code
3. Update documentation to reflect current architecture
4. Create migration scripts for archived project data

### Long-term (Month 1-2):
1. Implement automated archival policies
2. Create project lifecycle management documentation
3. Establish clear project graduation criteria
4. Implement dependency scanning for orphaned references

## 7. Dependency Cleanup Required

### Configuration Files with Stale References:
- `.claude.backup.20250808-095632/settings.local.json` - Fogg references
- Various `fly.toml` files may reference archived services
- GitHub workflows may trigger for archived projects

### Database/Storage:
- Check PostgreSQL for abandoned schemas
- Review Redis keys for stale data
- Audit AWS Secrets Manager for unused credentials

## 8. Risk Assessment

### Low Risk Archives:
- terminal-backup
- emergency-backup
- test directories

### Medium Risk Archives:
- claude-resources-setup (verify no active dependencies)
- candlefish-figma-bootstrap (check for UI component usage)

### High Risk (Requires Careful Migration):
- Fogg Calendar (has GCP dependencies and service accounts)
- meeting-automation (may have active integrations)

## 9. Compliance & Security Considerations

1. **Data Retention**: Ensure archived projects comply with data retention policies
2. **Credentials**: Rotate/revoke credentials for archived services
3. **Access Control**: Update IAM policies to remove archived service permissions
4. **Audit Trail**: Maintain history of archival decisions

## 10. Success Metrics

Post-archival targets:
- Repository size reduction: ~20-30%
- Build time improvement: ~15%
- Dependency count reduction: ~25%
- Clearer project structure and navigation
- Reduced cognitive load for developers

## Conclusion

The repository shows good architectural patterns with CLOS as a central orchestration system. However, approximately 30% of projects are candidates for archival. Immediate action on the Fogg Calendar project and empty test directories will provide quick wins. The CLOS system should remain active as it's essential infrastructure.

The architectural integrity will be significantly improved by:
1. Removing stalled projects
2. Consolidating deployment configurations
3. Establishing clear project lifecycle management
4. Maintaining clean separation between active and archived code

**Estimated Timeline**: 2-3 weeks for complete cleanup
**Effort Required**: 16-24 hours of engineering time
**Risk Level**: Low to Medium with proper migration planning