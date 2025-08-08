#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Fixing Netlify build configuration...\n');

try {
  // Update site configuration with correct build settings
  const updateCommand = `netlify api updateSite --data '{
    "site_id": "ed200909-886f-47ca-950c-58727dca0b9c",
    "body": {
      "build_settings": {
        "cmd": "cd apps/website && npm install && npm run build",
        "dir": "apps/website/dist",
        "base": "",
        "allowed_branches": ["main"],
        "stop_builds": false
      }
    }
  }'`;

  console.log('Updating build configuration...');
  const result = execSync(updateCommand, { encoding: 'utf8' });
  console.log('✅ Build configuration updated!\n');

  console.log('🚀 Triggering a new build...');
  const buildCommand = `netlify build --context production`;

  try {
    execSync(buildCommand, { encoding: 'utf8', stdio: 'inherit' });
  } catch (e) {
    console.log('\n📝 Manual trigger needed:');
    console.log('1. Go to: https://app.netlify.com/sites/candlefish-grotto/deploys');
    console.log('2. Click "Trigger deploy" → "Deploy site"');
  }

} catch (error) {
  console.error('Error:', error.message);
  console.log('\n⚠️  Please update build settings manually:');
  console.log('1. Go to: https://app.netlify.com/sites/candlefish-grotto/settings/deploys');
  console.log('2. Under "Build settings", click "Edit settings"');
  console.log('3. Set:');
  console.log('   - Base directory: (leave empty)');
  console.log('   - Build command: cd apps/website && npm install && npm run build');
  console.log('   - Publish directory: apps/website/dist');
  console.log('4. Save and trigger a new deploy');
}
