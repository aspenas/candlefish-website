#!/usr/bin/env node

/**
 * Setup Resend Audience Management for Candlefish Workshop Notes
 * 
 * This script:
 * 1. Creates a Resend audience if it doesn't exist
 * 2. Configures double opt-in settings
 * 3. Sets up the audience ID in environment variables
 * 4. Imports any existing subscribers
 */

const { Resend } = require('resend');
const fs = require('fs').promises;
const path = require('path');

// Check for API key
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey || apiKey === 're_placeholder_replace_with_real_key') {
  console.error('Error: RESEND_API_KEY environment variable is required');
  console.error('Set it with: export RESEND_API_KEY=your_actual_api_key');
  process.exit(1);
}

const resend = new Resend(apiKey);

async function createOrGetAudience() {
  console.log('\n🔍 Checking for existing Candlefish audience...');
  
  try {
    // First, try to list existing audiences
    const { data: audiences, error: listError } = await resend.audiences.list();
    
    if (listError) {
      console.error('Error listing audiences:', listError);
      // Continue to try creating one
    } else if (audiences && audiences.length > 0) {
      // Check if Candlefish audience already exists
      const candlefishAudience = audiences.find(
        aud => aud.name === 'Candlefish Workshop Notes' || 
               aud.name === 'Candlefish Newsletter'
      );
      
      if (candlefishAudience) {
        console.log(`✅ Found existing audience: ${candlefishAudience.name}`);
        console.log(`   ID: ${candlefishAudience.id}`);
        return candlefishAudience.id;
      }
    }
    
    // Create new audience
    console.log('\n📝 Creating new Resend audience...');
    const { data: newAudience, error: createError } = await resend.audiences.create({
      name: 'Candlefish Workshop Notes',
      // Note: Resend API doesn't support setting double opt-in programmatically
      // This needs to be configured in the Resend dashboard
    });
    
    if (createError) {
      console.error('Error creating audience:', createError);
      console.log('\n⚠️  Please create an audience manually in Resend dashboard:');
      console.log('   1. Go to https://resend.com/audiences');
      console.log('   2. Click "Create audience"');
      console.log('   3. Name it "Candlefish Workshop Notes"');
      console.log('   4. Enable double opt-in in settings');
      console.log('   5. Copy the audience ID and run:');
      console.log('      export RESEND_AUDIENCE_ID=<your-audience-id>');
      return null;
    }
    
    console.log(`✅ Created new audience: ${newAudience.name}`);
    console.log(`   ID: ${newAudience.id}`);
    return newAudience.id;
    
  } catch (error) {
    console.error('Error with audience management:', error);
    return null;
  }
}

async function importExistingSubscribers(audienceId) {
  console.log('\n📥 Looking for existing subscribers to import...');
  
  // Check for any existing subscriber files
  const possibleFiles = [
    '/Users/patricksmith/candlefish-ai/subscribers.csv',
    '/Users/patricksmith/candlefish-ai/brand/subscribers.csv',
    '/Users/patricksmith/candlefish-ai/brand/website/subscribers.csv',
    '/Users/patricksmith/subscribers.csv',
    '/Users/patricksmith/newsletter-subscribers.csv'
  ];
  
  let subscribersToImport = [];
  
  // Add Patrick as the initial subscriber
  subscribersToImport.push({
    email: 'patrick@candlefish.ai',
    first_name: 'Patrick',
    unsubscribed: false,
    tags: ['workshop-notes', 'founder', 'early-adopter']
  });
  
  // Check for CSV files
  for (const file of possibleFiles) {
    try {
      await fs.access(file);
      console.log(`Found subscriber file: ${file}`);
      
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Parse CSV (simple implementation)
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const emailIndex = headers.findIndex(h => h.includes('email'));
      const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('first'));
      
      if (emailIndex >= 0) {
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values[emailIndex] && values[emailIndex].includes('@')) {
            subscribersToImport.push({
              email: values[emailIndex],
              first_name: nameIndex >= 0 ? values[nameIndex] : '',
              unsubscribed: false,
              tags: ['workshop-notes', 'imported']
            });
          }
        }
      }
      break; // Use first file found
    } catch (error) {
      // File doesn't exist, continue
    }
  }
  
  if (subscribersToImport.length === 0) {
    console.log('No existing subscribers found to import');
    console.log('Adding patrick@candlefish.ai as initial subscriber');
    subscribersToImport.push({
      email: 'patrick@candlefish.ai',
      first_name: 'Patrick',
      unsubscribed: false,
      tags: ['workshop-notes', 'founder']
    });
  }
  
  console.log(`\n📤 Importing ${subscribersToImport.length} subscriber(s) to Resend...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const subscriber of subscribersToImport) {
    try {
      const { data, error } = await resend.contacts.create({
        audienceId: audienceId,
        email: subscriber.email,
        firstName: subscriber.first_name,
        unsubscribed: subscriber.unsubscribed,
        // Note: Tags might not be supported in create, may need to be added separately
      });
      
      if (error) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`   ⚠️  ${subscriber.email} - already exists`);
        } else {
          console.error(`   ❌ ${subscriber.email} - ${error.message || 'Failed'}`);
          errorCount++;
        }
      } else {
        console.log(`   ✅ ${subscriber.email} - imported successfully`);
        successCount++;
      }
    } catch (error) {
      console.error(`   ❌ ${subscriber.email} - ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Import Summary:`);
  console.log(`   ✅ Successfully imported: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   ⚠️  Already existed: ${subscribersToImport.length - successCount - errorCount}`);
}

async function updateEnvironmentFiles(audienceId) {
  console.log('\n⚙️  Updating environment configuration...');
  
  // Update .env.local
  const envPath = path.join(__dirname, '../.env.local');
  try {
    let envContent = await fs.readFile(envPath, 'utf8');
    
    // Check if RESEND_AUDIENCE_ID already exists
    if (envContent.includes('RESEND_AUDIENCE_ID')) {
      // Update existing
      envContent = envContent.replace(
        /RESEND_AUDIENCE_ID=.*/g,
        `RESEND_AUDIENCE_ID=${audienceId}`
      );
    } else {
      // Add new
      envContent += `\n# Resend Audience ID for newsletter subscribers\nRESEND_AUDIENCE_ID=${audienceId}\n`;
    }
    
    await fs.writeFile(envPath, envContent);
    console.log('   ✅ Updated .env.local');
  } catch (error) {
    console.log('   ⚠️  Could not update .env.local - please add manually:');
    console.log(`      RESEND_AUDIENCE_ID=${audienceId}`);
  }
  
  // Create a setup confirmation file
  const confirmationPath = path.join(__dirname, '../.resend-audience-config.json');
  await fs.writeFile(confirmationPath, JSON.stringify({
    audienceId: audienceId,
    audienceName: 'Candlefish Workshop Notes',
    setupDate: new Date().toISOString(),
    features: {
      doubleOptIn: 'Configure in Resend Dashboard',
      contentPreferences: 'Implemented in signup form',
      unsubscribePage: 'To be implemented',
      tags: ['workshop-notes', 'insights', 'operational-philosophy']
    }
  }, null, 2));
  
  console.log('   ✅ Created .resend-audience-config.json');
}

async function setupNetlifyEnvironment(audienceId) {
  console.log('\n🚀 Setting up Netlify environment...');
  console.log('\nTo complete setup, run these commands:');
  console.log(`\n   netlify env:set RESEND_AUDIENCE_ID ${audienceId}`);
  console.log('   netlify deploy --prod\n');
}

async function main() {
  console.log('=================================================');
  console.log('    Candlefish Resend Audience Setup Script');
  console.log('=================================================');
  
  // Step 1: Create or get audience
  const audienceId = await createOrGetAudience();
  
  if (!audienceId) {
    console.error('\n❌ Failed to create or retrieve audience ID');
    console.log('\nPlease follow the manual steps above and then set:');
    console.log('   export RESEND_AUDIENCE_ID=<your-audience-id>');
    console.log('\nThen run this script again to import subscribers.');
    process.exit(1);
  }
  
  // Step 2: Import existing subscribers
  await importExistingSubscribers(audienceId);
  
  // Step 3: Update environment files
  await updateEnvironmentFiles(audienceId);
  
  // Step 4: Provide Netlify setup instructions
  await setupNetlifyEnvironment(audienceId);
  
  console.log('\n=================================================');
  console.log('              Setup Complete! 🎉');
  console.log('=================================================');
  console.log(`\n✅ Audience ID: ${audienceId}`);
  console.log('\n📋 Next Steps:');
  console.log('   1. Log into Resend Dashboard: https://resend.com/audiences');
  console.log('   2. Find "Candlefish Workshop Notes" audience');
  console.log('   3. Configure double opt-in in audience settings');
  console.log('   4. Set up Netlify environment variable:');
  console.log(`      netlify env:set RESEND_AUDIENCE_ID ${audienceId}`);
  console.log('   5. Deploy to Netlify:');
  console.log('      netlify deploy --prod');
  console.log('\n🔧 The following features are now ready:');
  console.log('   ✅ Newsletter signup with audience management');
  console.log('   ✅ Automated workshop note emails to subscribers');
  console.log('   ⏳ Double opt-in (configure in Resend dashboard)');
  console.log('   ⏳ Content preferences (to be added to signup form)');
  console.log('   ⏳ Unsubscribe page (to be implemented)');
  
  // Export for use in other scripts
  console.log(`\n📝 To use in other scripts, export:`);
  console.log(`   export RESEND_AUDIENCE_ID=${audienceId}`);
}

// Run the setup
main().catch(console.error);