# NPM Backlinks Management

This directory contains scripts to manage SEO backlinks across all Candlefish AI NPM packages.

## Scripts

### `update-npm-backlinks.sh`

Automatically updates package.json files across all Candlefish AI projects to include proper SEO backlinks to candlefish.ai.

#### What it updates:
- `homepage`: Points to https://candlefish.ai
- `repository.url`: Points to the correct GitHub repository under candlefish-ai org
- `author`: Sets to Candlefish AI with candlefish.ai URL
- `bugs.url`: Points to GitHub issues for the specific project

#### Usage:
```bash
# Make executable (first time only)
chmod +x scripts/update-npm-backlinks.sh

# Run the update
./scripts/update-npm-backlinks.sh

# Or run from anywhere
/Users/patricksmith/candlefish-ai/scripts/update-npm-backlinks.sh
```

#### Features:
- ✅ Creates automatic backups before making changes
- ✅ Validates all backlinks after updating
- ✅ Scans for additional package.json files that might need updates
- ✅ Safe JSON parsing and writing
- ✅ Colored output for easy reading

#### Currently manages:
1. **PromoterOS** (`projects/promoterOS/package.json`)
2. **Paintbox** (`projects/paintbox/package.json`) 
3. **NANDA Web Dashboard** (`nanda-web-dashboard/package.json`)
4. **TypeScript SDK** (`sdks/typescript/package.json`)

## SEO Benefits

Proper NPM backlinks help with:
- **Domain Authority**: Links from NPM registry back to candlefish.ai
- **Brand Consistency**: Unified author and homepage across all packages
- **Developer Trust**: Professional package metadata increases adoption
- **Search Rankings**: More high-quality backlinks improve SEO performance

## Maintenance

Run this script periodically (suggested monthly) or whenever:
- Creating new NPM packages
- Updating existing packages
- Before major releases
- As part of your CI/CD pipeline

The script will automatically detect and report any packages missing proper backlinks.