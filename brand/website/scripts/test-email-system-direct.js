#!/usr/bin/env node

/**
 * Direct test of the Resend email system
 * This bypasses the Next.js API routes and tests the email service directly
 */

import { resendService } from '../lib/email/resend-service.js';
import { databaseService } from '../lib/email/database-service.js';

async function testEmailSystem() {
  console.log('🧪 Testing Candlefish Email System Direct Integration...\n');

  try {
    // Test 1: Check available workshop notes
    console.log('📝 Available Workshop Notes:');
    const notes = await databaseService.getAllWorkshopNotes();
    notes.forEach(note => {
      console.log(`  ✓ ${note.title} (${note.reading_time} min read)`);
      console.log(`    Summary: ${note.summary.substring(0, 100)}...`);
      console.log(`    Tags: ${note.tags.join(', ')}\n`);
    });

    // Test 2: Check subscribers
    console.log('👥 Active Subscribers:');
    const subscribers = await databaseService.getActiveSubscribers();
    console.log(`  Total active subscribers: ${subscribers.length}`);
    subscribers.forEach(sub => {
      console.log(`  ✓ ${sub.email} (${sub.name || 'No name'}) - Status: ${sub.status}`);
    });
    console.log();

    // Test 3: Send test email
    if (notes.length > 0) {
      const testNote = notes[0]; // Use the first available note
      const testEmail = process.argv[2] || 'hello@candlefish.ai';

      console.log(`📧 Sending test email to: ${testEmail}`);
      console.log(`   Workshop Note: "${testNote.title}"`);
      console.log('   Sending...');

      const success = await resendService.sendTestEmail(testEmail, testNote);

      if (success) {
        console.log('   ✅ Test email sent successfully!');
        console.log(`   📬 Check ${testEmail} for the email`);
      } else {
        console.log('   ❌ Failed to send test email');
      }
    } else {
      console.log('❌ No workshop notes available to send');
    }

  } catch (error) {
    console.error('❌ Email system test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  console.log('\n✅ Email system test completed!');
}

// Run the test
testEmailSystem();
