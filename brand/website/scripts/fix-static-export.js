#!/usr/bin/env node

/**
 * Fix Static Export Issues
 * Ensures all client-side features work properly in static export
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing static export issues...\n');

// 1. Create redirect page for maturity-map
const redirectPageContent = `import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MaturityMapRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/assessment');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <h1 className="text-2xl text-[#3FD3C6] mb-4">Redirecting to Assessment...</h1>
        <p className="text-[#888]">If you're not redirected, <a href="/assessment" className="text-[#3FD3C6] hover:underline">click here</a>.</p>
      </div>
    </div>
  );
}
`;

const maturityMapDir = path.join(__dirname, '../app/maturity-map');
if (!fs.existsSync(maturityMapDir)) {
  fs.mkdirSync(maturityMapDir, { recursive: true });
  fs.writeFileSync(path.join(maturityMapDir, 'page.tsx'), redirectPageContent);
  console.log('✅ Created maturity-map redirect page');
}

// 2. Fix NPM package link in layout or wherever it's referenced
const footerPath = path.join(__dirname, '../components/navigation/OperationalFooter.tsx');
if (fs.existsSync(footerPath)) {
  let footerContent = fs.readFileSync(footerPath, 'utf8');
  
  // Update GitHub link if it's pointing to wrong URL
  footerContent = footerContent.replace(
    /href="https:\/\/github\.com\/[^"]*"/g,
    'href="https://github.com/candlefish-ai/candlefish"'
  );
  
  fs.writeFileSync(footerPath, footerContent);
  console.log('✅ Fixed NPM package GitHub link');
}

// 3. Create static data export for dynamic components
const staticDataExport = `
// Static data exports for components that need data during build
export const workshopProjects = ${JSON.stringify(require('../workshop/index.json'), null, 2)};

export const archiveData = ${JSON.stringify(require('../app/archive/data').archiveEntries, null, 2)};

export const instrumentsData = ${JSON.stringify(require('../lib/instruments/data').instruments, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../lib/static-data.ts'), staticDataExport);
console.log('✅ Created static data exports');

// 4. Update next.config.js to ensure proper static export
const nextConfigPath = path.join(__dirname, '../next.config.js');
const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');

if (!nextConfig.includes('generateBuildId')) {
  const updatedConfig = nextConfig.replace(
    'const nextConfig = {',
    `const nextConfig = {
  generateBuildId: async () => {
    // Use a timestamp-based build ID for cache busting
    return Date.now().toString();
  },`
  );
  
  fs.writeFileSync(nextConfigPath, updatedConfig);
  console.log('✅ Updated next.config.js for better static export');
}

// 5. Create a wrapper script for static export that handles all edge cases
const exportScript = `#!/bin/bash
set -e

echo "🚀 Starting enhanced static export..."

# Clean previous builds
rm -rf .next out

# Set environment for static export
export STATIC_EXPORT=true
export NODE_ENV=production

# Run the fix script first
node scripts/fix-static-export.js

# Build with static export
npx next build

# Verify output directory exists
if [ ! -d "out" ]; then
  echo "❌ Static export failed - no output directory created"
  exit 1
fi

# Add _redirects file for Netlify
cat > out/_redirects << EOF
/maturity-map /assessment 301
EOF

echo "✅ Static export completed successfully!"
echo "📦 Files are in the 'out' directory"
`;

fs.writeFileSync(path.join(__dirname, 'enhanced-export.sh'), exportScript);
fs.chmodSync(path.join(__dirname, 'enhanced-export.sh'), '755');
console.log('✅ Created enhanced export script');

console.log('\n✨ All fixes applied! Run npm run export to build.');