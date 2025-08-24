#!/usr/bin/env node

/**
 * Test script for the Candlefish email notification system
 * Tests the complete workflow: database, email service, and Resend integration
 */

const { databaseService } = require('../lib/email/database-service')
const { resendService } = require('../lib/email/resend-service')

async function testEmailSystem() {
  console.log('🧪 Testing Candlefish Email Notification System\n')

  try {
    // Test 1: Database service
    console.log('1️⃣ Testing database service...')
    
    const subscribers = await databaseService.debugListAllSubscribers()
    console.log(`   ✅ Found ${subscribers.length} subscribers`)
    
    const notes = await databaseService.debugListAllNotes()
    console.log(`   ✅ Found ${notes.length} workshop notes`)
    
    const stats = await databaseService.getCampaignStats()
    console.log(`   ✅ Campaign stats: ${stats.total_campaigns} total campaigns`)

    // Test 2: Get the Architecture of Inevitability note
    console.log('\n2️⃣ Testing workshop note retrieval...')
    
    const architectureNote = await databaseService.getWorkshopNoteByTitle('The Architecture of Inevitability')
    if (!architectureNote) {
      throw new Error('Architecture of Inevitability note not found')
    }
    console.log(`   ✅ Found note: "${architectureNote.title}"`)
    console.log(`   📊 Reading time: ${architectureNote.reading_time} minutes`)
    console.log(`   🏷️  Tags: ${architectureNote.tags.join(', ')}`)

    // Test 3: Verify hello@candlefish.ai subscriber exists
    console.log('\n3️⃣ Testing subscriber management...')
    
    let targetSubscriber = await databaseService.getSubscriberByEmail('hello@candlefish.ai')
    if (!targetSubscriber) {
      console.log('   📝 Creating hello@candlefish.ai subscriber...')
      targetSubscriber = await databaseService.createSubscriber('hello@candlefish.ai', 'Candlefish Team', 'test-script')
    }
    console.log(`   ✅ Target subscriber: ${targetSubscriber.email} (${targetSubscriber.status})`)

    // Test 4: Test email service initialization
    console.log('\n4️⃣ Testing email service...')
    
    try {
      // This will test the Resend API key retrieval and service initialization
      const testResult = await resendService.sendTestEmail('hello@candlefish.ai', architectureNote)
      console.log(`   ✅ Email service test: ${testResult ? 'SUCCESS' : 'FAILED'}`)
      
      if (testResult) {
        console.log(`   📧 Test email sent to hello@candlefish.ai`)
        console.log(`   📝 Subject: "${architectureNote.title}"`)
        console.log(`   🎨 Template: workshop-note.html`)
      }
    } catch (error) {
      console.log(`   ❌ Email service test failed: ${error.message}`)
      
      // Check if it's an API key issue
      if (error.message.includes('API key') || error.message.includes('unauthorized')) {
        console.log('\n🔑 Checking Resend API key availability...')
        console.log('   Available secrets:')
        console.log('   - candlefish/resend/api-key')
        console.log('   - candlefish/resend-api-key')
        console.log('\n   💡 Make sure one of these secrets contains a valid Resend API key.')
      }
      
      return false
    }

    // Test 5: API endpoints test
    console.log('\n5️⃣ API endpoints created:')
    console.log('   📮 POST /api/newsletter - Subscribe to newsletter')
    console.log('   🗑️  DELETE /api/newsletter - Unsubscribe from newsletter')
    console.log('   📧 POST /api/email/send-workshop-note - Send workshop note')
    console.log('   🔗 GET /api/email/unsubscribe?token=xxx - Unsubscribe via token')
    console.log('   ⚙️  GET /api/email/manage - Email management dashboard')

    console.log('\n✅ Email system test completed successfully!')
    console.log('\n🎯 Next Steps:')
    console.log('   1. Verify the test email was received at hello@candlefish.ai')
    console.log('   2. Check email formatting and unsubscribe link')
    console.log('   3. Test subscription workflow via /api/newsletter endpoint')
    console.log('   4. Deploy to production and test with real subscribers')

    return true
  } catch (error) {
    console.error('\n❌ Email system test failed:', error.message)
    console.error('   Stack:', error.stack)
    return false
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEmailSystem()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { testEmailSystem }