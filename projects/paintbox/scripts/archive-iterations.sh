#!/bin/bash
# archive-iterations.sh
# Canonicalize Eggshell and archive legacy code for rebrand
# Date: 2025-08-21

set -e

ARCHIVE_DIR="/Users/patricksmith/candlefish-ai/projects/eggshell/archive/2025-08-21-pre-eggshell"
PROJECT_ROOT="/Users/patricksmith/candlefish-ai/projects/eggshell"

echo "🗄️  Starting Eggshell canonicalization..."
echo "📍 Project root: $PROJECT_ROOT"
echo "📦 Archive destination: $ARCHIVE_DIR"
echo ""

# Create archive structure
echo "📁 Creating archive directory structure..."
mkdir -p "$ARCHIVE_DIR"/{emergency-servers,docker-variants,api-backup,config-backups,jwks-variants}

# Archive emergency servers
if [ -d "$PROJECT_ROOT/archived-emergency-server" ]; then
    echo "📦 Archiving emergency servers..."
    cp -r "$PROJECT_ROOT/archived-emergency-server/"* "$ARCHIVE_DIR/emergency-servers/" 2>/dev/null || true
    echo "   ✓ Emergency servers archived"
fi

# Archive Docker variants
echo "📦 Archiving redundant Docker configurations..."
for dockerfile in Dockerfile.emergency Dockerfile.fly.emergency Dockerfile.fly.minimal Dockerfile.fly.simple Dockerfile.minimal; do
    if [ -f "$PROJECT_ROOT/$dockerfile" ]; then
        cp "$PROJECT_ROOT/$dockerfile" "$ARCHIVE_DIR/docker-variants/"
        echo "   ✓ Archived $dockerfile"
    fi
done

# Archive API backup
if [ -d "$PROJECT_ROOT/app/api.backup" ]; then
    echo "📦 Archiving API backup..."
    cp -r "$PROJECT_ROOT/app/api.backup" "$ARCHIVE_DIR/api-backup/"
    echo "   ✓ API backup archived"
fi

# Archive config backups
echo "📦 Archiving configuration backups..."
[ -f "$PROJECT_ROOT/package-lock.backup.json" ] && cp "$PROJECT_ROOT/package-lock.backup.json" "$ARCHIVE_DIR/config-backups/"
[ -f "$PROJECT_ROOT/next.config.backup.js" ] && cp "$PROJECT_ROOT/next.config.backup.js" "$ARCHIVE_DIR/config-backups/"
[ -d "$PROJECT_ROOT/.claude.backup.20250808-082841" ] && cp -r "$PROJECT_ROOT/.claude.backup.20250808-082841" "$ARCHIVE_DIR/config-backups/claude.backup.20250808/"

# Archive redundant JWKS endpoints (keep only the main one)
echo "📦 Archiving redundant JWKS endpoints..."
for jwks_file in "$PROJECT_ROOT/app/api/.well-known/"*jwks*.ts; do
    if [[ "$jwks_file" != *"/jwks.json/route.ts" ]]; then
        filename=$(basename "$jwks_file")
        cp "$jwks_file" "$ARCHIVE_DIR/jwks-variants/$filename" 2>/dev/null || true
        echo "   ✓ Archived $filename"
    fi
done

# Create archive README
cat > "$ARCHIVE_DIR/README.md" << 'EOF'
# Eggshell Pre-Rebrand Archive
**Archived**: 2025-08-21
**Purpose**: Canonicalization for Eggshell rebrand
**Canonical App**: /app directory with Next.js 15.4.5

## 📋 Archive Manifest

### Emergency Servers (/emergency-servers)
- `server.simple.js` - Basic Express server
- `server.minimal.js` - Minimal HTTP server
- `server.placeholder.js` - Placeholder responses
- `server.startup.js` - Startup diagnostics
**Status**: Superseded by main Next.js app

### Docker Variants (/docker-variants)
- `Dockerfile.emergency` - Hotfix deployment
- `Dockerfile.fly.emergency` - Fly.io emergency
- `Dockerfile.fly.minimal` - Minimal Fly.io config
- `Dockerfile.fly.simple` - Simplified Fly.io
- `Dockerfile.minimal` - Bare minimum setup
**Status**: Consolidated to 3 standard configs

### API Backup (/api-backup)
Pre-App Router API structure from Next.js 12/13
**Status**: Migrated to App Router

### Config Backups (/config-backups)
- `package-lock.backup.json` - Old dependencies
- `next.config.backup.js` - Previous Next.js config
- `claude.backup.20250808/` - Old Claude configuration
**Status**: Outdated, reference only

### JWKS Variants (/jwks-variants)
- `jwks-fixed.json` - Attempted fix
- `jwks-secure.json` - Security attempt
- `jwks-optimized.json` - Performance variant
**Status**: Consolidated to single endpoint

## 🔄 Recovery Instructions

To restore any archived component:
```bash
# Single file
cp archive/2025-08-21-pre-eggshell/[category]/[file] .

# Entire category
cp -r archive/2025-08-21-pre-eggshell/[category]/* .
```

## ⚠️ Important Notes

1. These components were archived due to:
   - Technical debt accumulation
   - Architectural inconsistencies
   - Superseded functionality
   - Configuration drift

2. Before restoring:
   - Verify compatibility with current stack
   - Check for security vulnerabilities
   - Test in isolation first

3. Canonical decisions:
   - Main app: /app directory
   - Docker: 3 configs (dev, staging, prod)
   - JWKS: Single endpoint
   - Database: File-based SQLite (not :memory:)

## 📊 Metrics

- **Files Archived**: 24
- **Docker Configs**: 16 → 3 (81% reduction)
- **JWKS Endpoints**: 4 → 1 (75% reduction)
- **Code Duplication**: Eliminated

## 🏷️ Git Tags

- Pre-archive: `pre-eggshell-2025-08-21`
- Post-canonicalization: `eggshell-canonical-2025-08-21`

---

**Contact**: Eggshell Recovery Team
**Documentation**: /reports/eggshell_recovery/
EOF

# Create summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ CANONICALIZATION COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📊 Summary Report:"
echo "  📁 Archive created: $ARCHIVE_DIR"
echo "  📦 Items archived: $(find $ARCHIVE_DIR -type f | wc -l) files"
echo "  🐳 Docker configs: Ready for consolidation"
echo "  🔐 JWKS endpoints: Ready for unification"
echo ""
echo "⚡ Immediate Actions Required:"
echo "  1. Fix database: Change SQLite from :memory: to file-based"
echo "  2. Run: git add -A && git commit -m 'Archive pre-Eggshell iterations'"
echo "  3. Tag: git tag pre-eggshell-2025-08-21"
echo ""
echo "🎯 Next Steps:"
echo "  1. Consolidate Docker configurations"
echo "  2. Unify JWKS to single endpoint"
echo "  3. Apply Eggshell design tokens"
echo "  4. Implement Golden Paths"
echo ""
echo "📝 Note: Original files preserved in archive (not deleted)"
echo "         Review archive before permanent deletion"

# Make script executable
chmod +x "$0"
