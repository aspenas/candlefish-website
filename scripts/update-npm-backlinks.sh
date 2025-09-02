#!/bin/bash

# Update NPM Backlinks Script
# Ensures all Candlefish AI packages have proper SEO backlinks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/Users/patricksmith/candlefish-ai"
BACKUP_DIR="$BASE_DIR/.backlinks-backup-$(date +%Y%m%d-%H%M%S)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}🔗 Candlefish AI NPM Backlinks Updater${NC}"
echo "======================================="

# Function to backup and update package.json
update_package_json() {
    local package_path="$1"
    local project_name="$2"
    local description="$3"
    
    if [[ ! -f "$package_path" ]]; then
        echo -e "${YELLOW}⚠️  Warning: $package_path not found, skipping...${NC}"
        return
    fi
    
    echo -e "${GREEN}📦 Updating $project_name...${NC}"
    
    # Create backup
    cp "$package_path" "$BACKUP_DIR/$(basename $(dirname $package_path))-package.json"
    
    # Use Node.js to safely update JSON
    node -e "
        const fs = require('fs');
        const path = '$package_path';
        const projectName = '$project_name';
        const description = '$description';
        
        try {
            const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
            
            // Add/update backlink fields
            pkg.homepage = 'https://candlefish.ai';
            
            if (!pkg.repository) {
                pkg.repository = {};
            }
            pkg.repository.type = 'git';
            pkg.repository.url = \`https://github.com/candlefish-ai/\${projectName}\`;
            
            if (!pkg.author || typeof pkg.author === 'string') {
                pkg.author = {
                    name: 'Candlefish AI',
                    url: 'https://candlefish.ai'
                };
            } else {
                pkg.author.name = 'Candlefish AI';
                pkg.author.url = 'https://candlefish.ai';
            }
            
            pkg.bugs = {
                url: \`https://github.com/candlefish-ai/\${projectName}/issues\`
            };
            
            // Update description if provided and not already set
            if (description && (!pkg.description || pkg.description.length < 10)) {
                pkg.description = description;
            }
            
            // Write back to file with proper formatting
            fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
            console.log('✅ Updated successfully');
        } catch (error) {
            console.error('❌ Error updating package.json:', error.message);
            process.exit(1);
        }
    "
}

# Function to validate package.json backlinks
validate_backlinks() {
    local package_path="$1"
    local project_name="$2"
    
    if [[ ! -f "$package_path" ]]; then
        echo -e "${RED}❌ $package_path not found${NC}"
        return 1
    fi
    
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$package_path', 'utf8'));
        
        const checks = [
            { field: 'homepage', expected: 'https://candlefish.ai' },
            { field: 'repository.url', expected: 'https://github.com/candlefish-ai/$project_name' },
            { field: 'author.url', expected: 'https://candlefish.ai' },
            { field: 'bugs.url', expected: 'https://github.com/candlefish-ai/$project_name/issues' }
        ];
        
        let allValid = true;
        checks.forEach(check => {
            const value = check.field.split('.').reduce((obj, key) => obj?.[key], pkg);
            if (value !== check.expected) {
                console.log(\`❌ \${check.field}: expected '\${check.expected}', got '\${value}'\`);
                allValid = false;
            }
        });
        
        if (allValid) {
            console.log('✅ All backlinks valid for $project_name');
        }
        
        process.exit(allValid ? 0 : 1);
    "
}

# Update packages
echo -e "${GREEN}🔄 Updating package.json files...${NC}"

update_package_json \
    "$BASE_DIR/projects/promoterOS/package.json" \
    "promoteros" \
    "AI-Powered Concert Booking Platform for 1,200-3,500 Capacity Venues"

update_package_json \
    "$BASE_DIR/projects/paintbox/package.json" \
    "paintbox" \
    "Paintbox - Creative AI tools and brand management platform powered by Candlefish AI"

update_package_json \
    "$BASE_DIR/nanda-web-dashboard/package.json" \
    "nanda-web-dashboard" \
    "NANDA Agent Management Dashboard - Web Interface for Distributed Consciousness"

# The TypeScript SDK should already be properly configured, but let's validate it
echo -e "${GREEN}🔍 Validating existing backlinks...${NC}"

validate_backlinks "$BASE_DIR/sdks/typescript/package.json" "claude-config"
validate_backlinks "$BASE_DIR/projects/promoterOS/package.json" "promoteros"
validate_backlinks "$BASE_DIR/projects/paintbox/package.json" "paintbox"
validate_backlinks "$BASE_DIR/nanda-web-dashboard/package.json" "nanda-web-dashboard"

echo
echo -e "${GREEN}✅ Backlinks update completed!${NC}"
echo -e "${YELLOW}📋 Backup created at: $BACKUP_DIR${NC}"

# Optional: Find other package.json files that might need updating
echo
echo -e "${GREEN}🔍 Scanning for additional package.json files...${NC}"
find "$BASE_DIR" -name "package.json" -not -path "*/node_modules/*" -not -path "*/.git/*" | while read -r pkg_file; do
    if ! grep -q "candlefish.ai" "$pkg_file" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Found package.json without backlinks: $pkg_file${NC}"
    fi
done

echo
echo -e "${GREEN}🚀 Ready for SEO optimization!${NC}"
echo "Next steps:"
echo "  1. Review the updated package.json files"
echo "  2. Test the packages locally"
echo "  3. Commit and publish to NPM"
echo "  4. Run this script periodically to maintain backlinks"