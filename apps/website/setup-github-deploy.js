#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔗 Setting up GitHub continuous deployment...\n');

// Get current site data
try {
  // Update site configuration with build settings
  const updateCommand = `netlify api updateSite --data '{
    "site_id": "ed200909-886f-47ca-950c-58727dca0b9c",
    "body": {
      "build_settings": {
        "cmd": "npm install && npm run build",
        "dir": "dist",
        "base": "apps/website"
      },
      "repo": {
        "provider": "github",
        "repo": "aspenas/candlefish-ai",
        "branch": "main",
        "dir": "apps/website",
        "cmd": "npm install && npm run build"
      }
    }
  }'`;

  console.log('Updating site configuration...');
  const result = execSync(updateCommand, { encoding: 'utf8' });
  console.log('✅ Site configuration updated!\n');

  console.log('📝 Next steps:');
  console.log('1. Go to: https://app.netlify.com/sites/candlefish-grotto/settings/deploys');
  console.log('2. Click "Link site to Git"');
  console.log('3. Select GitHub and authorize if needed');
  console.log('4. Choose repository: aspenas/candlefish-ai');
  console.log('5. Confirm these settings:');
  console.log('   - Branch: main');
  console.log('   - Base directory: apps/website');
  console.log('   - Build command: npm install && npm run build');
  console.log('   - Publish directory: dist');

} catch (error) {
  console.error('Error:', error.message);
  console.log('\n⚠️  Manual setup required:');
  console.log('1. Go to: https://app.netlify.com/sites/candlefish-grotto/settings/deploys');
  console.log('2. Click "Link site to Git" and follow the prompts');
}
