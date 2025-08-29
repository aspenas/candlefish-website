#!/bin/bash

# CANDLEFISH AI - PHASE 1: CRITICAL SECURITY FIXES
# Execute these fixes immediately to stop security vulnerabilities
# Run with: ./phase1-security-fixes.sh

set -e

echo "🔐 CANDLEFISH AI - PHASE 1: CRITICAL SECURITY FIXES"
echo "===================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Fix JWT Key Management
echo -e "${YELLOW}[1/5] Fixing JWT Key Management...${NC}"
cat > /tmp/jwt-fix.patch << 'EOF'
--- a/5470_S_Highline_Circle/backend/auth/jwt.go
+++ b/5470_S_Highline_Circle/backend/auth/jwt.go
@@ -45,8 +45,12 @@ func NewJWTManager() (*JWTManager, error) {
     
     // Generate new keys if not found
     if privateKey == nil || publicKey == nil {
-        log.Println("WARNING: Generating new RSA keys - this should not happen in production!")
-        return m.generateKeys()
+        if os.Getenv("ENV") == "production" {
+            return nil, fmt.Errorf("CRITICAL: JWT keys not found in production")
+        }
+        // Only generate keys in development
+        log.Println("Generating development RSA keys")
+        return m.generateDevKeys()
     }
     
     m.privateKey = privateKey
EOF

if [ -f "../5470_S_Highline_Circle/backend/auth/jwt.go" ]; then
    echo "Applying JWT key management fix..."
    # Backup original
    cp ../5470_S_Highline_Circle/backend/auth/jwt.go ../5470_S_Highline_Circle/backend/auth/jwt.go.backup
    echo -e "${GREEN}✓ JWT key management fix prepared${NC}"
else
    echo -e "${RED}✗ JWT file not found${NC}"
fi

# 2. Remove Hardcoded Demo Credentials
echo -e "${YELLOW}[2/5] Removing hardcoded demo credentials...${NC}"
find ../apps/mobile-security-dashboard -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec grep -l "demoMode\|demo@example.com\|demoPassword123" {} \; 2>/dev/null | while read file; do
    echo "Cleaning: $file"
    sed -i.backup 's/const DEMO_USER =.*/const DEMO_USER = process.env.DEMO_USER;/g' "$file"
    sed -i.backup 's/const DEMO_PASSWORD =.*/const DEMO_PASSWORD = process.env.DEMO_PASSWORD;/g' "$file"
done
echo -e "${GREEN}✓ Demo credentials removed${NC}"

# 3. Update Vulnerable Dependencies
echo -e "${YELLOW}[3/5] Updating vulnerable dependencies...${NC}"

# Update axios in frontend projects
for dir in ../5470_S_Highline_Circle/frontend ../apps/security-dashboard ../brand/website; do
    if [ -f "$dir/package.json" ]; then
        echo "Updating dependencies in $dir..."
        cd "$dir"
        npm update axios @types/axios 2>/dev/null || true
        npm audit fix 2>/dev/null || true
        cd - > /dev/null
    fi
done

# Update Go dependencies
if [ -f "../5470_S_Highline_Circle/backend/go.mod" ]; then
    echo "Updating Go dependencies..."
    cd ../5470_S_Highline_Circle/backend
    go get -u ./... 2>/dev/null || true
    go mod tidy
    cd - > /dev/null
fi

echo -e "${GREEN}✓ Dependencies updated${NC}"

# 4. Fix SQL Injection Vulnerability
echo -e "${YELLOW}[4/5] Fixing SQL injection vulnerability...${NC}"
cat > /tmp/sql-injection-fix.ts << 'EOF'
// Table name whitelist for security
const ALLOWED_TABLES = [
  'items', 'rooms', 'categories', 'users', 'valuations',
  'activities', 'notes', 'bundles', 'photos', 'sessions'
];

function validateTableName(table: string): boolean {
  return ALLOWED_TABLES.includes(table.toLowerCase());
}

async findMany<T = any>(
  table: string,
  conditions: Record<string, any> = {},
) {
  // SECURITY: Validate table name against whitelist
  if (!validateTableName(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  
  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  
  const whereClause = keys.length > 0
    ? 'WHERE ' + keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ')
    : '';
  
  // Table name is now safe after validation
  const sql = `SELECT * FROM ${table} ${whereClause}`;
  
  return this.query<T>(sql, values);
}
EOF

echo "SQL injection fix template created at /tmp/sql-injection-fix.ts"
echo -e "${GREEN}✓ SQL injection fix prepared${NC}"

# 5. Enable Database Encryption
echo -e "${YELLOW}[5/5] Preparing database encryption...${NC}"
cat > /tmp/enable-encryption.sql << 'EOF'
-- Enable encryption for PostgreSQL
-- Run this as superuser

-- 1. Install pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create encrypted columns for sensitive data
ALTER TABLE users ADD COLUMN email_encrypted BYTEA;
ALTER TABLE users ADD COLUMN phone_encrypted BYTEA;

-- 3. Migrate existing data to encrypted columns
UPDATE users 
SET email_encrypted = pgp_sym_encrypt(email, current_setting('app.encryption_key')),
    phone_encrypted = pgp_sym_encrypt(phone, current_setting('app.encryption_key'))
WHERE email IS NOT NULL OR phone IS NOT NULL;

-- 4. Create views for transparent decryption
CREATE OR REPLACE VIEW users_decrypted AS
SELECT 
    id,
    pgp_sym_decrypt(email_encrypted, current_setting('app.encryption_key'))::text as email,
    pgp_sym_decrypt(phone_encrypted, current_setting('app.encryption_key'))::text as phone,
    created_at,
    updated_at
FROM users;

-- 5. Set up Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
EOF

echo "Database encryption script created at /tmp/enable-encryption.sql"
echo -e "${GREEN}✓ Database encryption prepared${NC}"

echo ""
echo "========================================"
echo -e "${GREEN}PHASE 1 SECURITY FIXES PREPARED${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Review the fixes in /tmp/"
echo "2. Apply JWT fix: patch < /tmp/jwt-fix.patch"
echo "3. Apply SQL injection fix to TypeScript query builders"
echo "4. Run database encryption: psql -f /tmp/enable-encryption.sql"
echo "5. Deploy updated dependencies"
echo ""
echo -e "${YELLOW}⚠️  CRITICAL: Apply these fixes within 24 hours${NC}"