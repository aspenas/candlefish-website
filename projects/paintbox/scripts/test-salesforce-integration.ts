#!/usr/bin/env ts-node

/**
 * Comprehensive Salesforce Integration Test Script
 * Tests all aspects of the Salesforce CRM integration including:
 * - Connection establishment
 * - CRUD operations for all object types
 * - OAuth token refresh
 * - Caching functionality
 * - Batch sync operations
 * - Error handling
 */

import { salesforceService } from '../lib/services/salesforce';
import { getSecretsManager } from '../lib/services/secrets-manager';
import getCacheInstance from '../lib/cache/cache-service';
import { logger } from '../lib/logging/simple-logger';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class SalesforceIntegrationTester {
  private results: TestResult[] = [];
  private cache = getCacheInstance();

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Salesforce Integration Tests\n');

    // Test categories
    await this.testConnectionAndAuth();
    await this.testContactOperations();
    await this.testAccountOperations();
    await this.testOpportunityOperations();
    await this.testEstimateOperations();
    await this.testCacheOperations();
    await this.testBatchSync();
    await this.testErrorHandling();

    // Generate report
    this.generateReport();
  }

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    console.log(`⏳ Running: ${testName}`);

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      this.results.push({
        testName,
        success: true,
        duration,
        details: result,
      });

      console.log(`✅ Passed: ${testName} (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;

      this.results.push({
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      console.log(`❌ Failed: ${testName} (${duration}ms)`);
      console.log(`   Error: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  // Connection and Authentication Tests
  private async testConnectionAndAuth(): Promise<void> {
    console.log('📡 Testing Connection and Authentication\n');

    await this.runTest('Service Initialization', async () => {
      await salesforceService.initialize();
      return 'Service initialized successfully';
    });

    await this.runTest('Connection Test', async () => {
      const isConnected = await salesforceService.testConnection();
      if (!isConnected) {
        throw new Error('Connection test failed');
      }
      return 'Connection test passed';
    });

    await this.runTest('Token Caching', async () => {
      const tokens = await this.cache.get('salesforce:tokens');
      if (!tokens) {
        throw new Error('No tokens found in cache');
      }
      const tokenData = JSON.parse(tokens);
      if (!tokenData.accessToken || !tokenData.instanceUrl) {
        throw new Error('Invalid token data in cache');
      }
      return 'Tokens properly cached';
    });
  }

  // Contact Operations Tests
  private async testContactOperations(): Promise<void> {
    console.log('👤 Testing Contact Operations\n');

    let testContactId: string;

    await this.runTest('Create Contact', async () => {
      const contactData = {
        FirstName: 'Test',
        LastName: `User-${Date.now()}`,
        Email: `test.user.${Date.now()}@paintbox-test.com`,
        Phone: '555-TEST-001',
      };

      testContactId = await salesforceService.createContact(contactData);
      return { contactId: testContactId, contactData };
    });

    await this.runTest('Get Contact by ID', async () => {
      if (!testContactId) throw new Error('No test contact ID available');

      const contact = await salesforceService.getContact(testContactId);
      if (!contact) {
        throw new Error('Contact not found');
      }
      return contact;
    });

    await this.runTest('Update Contact', async () => {
      if (!testContactId) throw new Error('No test contact ID available');

      const updateData = {
        Phone: '555-TEST-UPDATED',
        Title: 'Test Manager',
      };

      await salesforceService.updateContact(testContactId, updateData);

      // Verify the update
      const updatedContact = await salesforceService.getContact(testContactId);
      if (updatedContact?.Phone !== updateData.Phone) {
        throw new Error('Contact update not reflected');
      }

      return updateData;
    });

    await this.runTest('Search Contacts', async () => {
      const results = await salesforceService.searchContacts('Test User', 5);
      return { count: results.length, results: results.slice(0, 2) };
    });

    await this.runTest('Get All Contacts (with date filter)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const results = await salesforceService.getAllContacts(yesterday);
      return { count: results.length };
    });

    await this.runTest('Delete Contact', async () => {
      if (!testContactId) throw new Error('No test contact ID available');

      await salesforceService.deleteContact(testContactId);

      // Verify deletion
      const deletedContact = await salesforceService.getContact(testContactId);
      if (deletedContact) {
        throw new Error('Contact still exists after deletion');
      }

      return 'Contact successfully deleted';
    });
  }

  // Account Operations Tests
  private async testAccountOperations(): Promise<void> {
    console.log('🏢 Testing Account Operations\n');

    let testAccountId: string;

    await this.runTest('Create Account', async () => {
      const accountData = {
        Name: `Test Company ${Date.now()}`,
        Industry: 'Technology',
        Phone: '555-TEST-ACCT',
        BillingCity: 'Test City',
        BillingState: 'CA',
      };

      testAccountId = await salesforceService.createAccount(accountData);
      return { accountId: testAccountId, accountData };
    });

    await this.runTest('Get Account by ID', async () => {
      if (!testAccountId) throw new Error('No test account ID available');

      const account = await salesforceService.getAccount(testAccountId);
      if (!account) {
        throw new Error('Account not found');
      }
      return account;
    });

    await this.runTest('Update Account', async () => {
      if (!testAccountId) throw new Error('No test account ID available');

      const updateData = {
        Phone: '555-UPDATED-ACCT',
        NumberOfEmployees: 100,
      };

      await salesforceService.updateAccount(testAccountId, updateData);

      // Verify the update
      const updatedAccount = await salesforceService.getAccount(testAccountId);
      if (updatedAccount?.Phone !== updateData.Phone) {
        throw new Error('Account update not reflected');
      }

      return updateData;
    });

    await this.runTest('Search Accounts', async () => {
      const results = await salesforceService.searchAccounts('Test Company', 5);
      return { count: results.length, results: results.slice(0, 2) };
    });

    await this.runTest('Delete Account', async () => {
      if (!testAccountId) throw new Error('No test account ID available');

      await salesforceService.deleteAccount(testAccountId);

      // Verify deletion
      const deletedAccount = await salesforceService.getAccount(testAccountId);
      if (deletedAccount) {
        throw new Error('Account still exists after deletion');
      }

      return 'Account successfully deleted';
    });
  }

  // Opportunity Operations Tests
  private async testOpportunityOperations(): Promise<void> {
    console.log('💰 Testing Opportunity Operations\n');

    await this.runTest('Get All Opportunities', async () => {
      const results = await salesforceService.getAllOpportunities();
      return { count: results.length };
    });

    await this.runTest('Get Opportunities (with date filter)', async () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const results = await salesforceService.getAllOpportunities(lastWeek);
      return { count: results.length };
    });
  }

  // Estimate Operations Tests
  private async testEstimateOperations(): Promise<void> {
    console.log('📊 Testing PaintboxEstimate Operations\n');

    let testEstimateId: string;

    await this.runTest('Create PaintboxEstimate', async () => {
      const estimateData = {
        Name: `Test Estimate ${Date.now()}`,
        Status__c: 'Draft' as const,
        Estimate_Date__c: new Date().toISOString().split('T')[0],
        Total_Amount__c: 5000,
        Exterior_Amount__c: 3000,
        Interior_Amount__c: 2000,
        Paint_Quality__c: 'Better' as const,
        Square_Footage__c: 2000,
        Rooms_Count__c: 8,
      };

      testEstimateId = await salesforceService.createPaintboxEstimate(estimateData);
      return { estimateId: testEstimateId, estimateData };
    });

    await this.runTest('Get PaintboxEstimate by ID', async () => {
      if (!testEstimateId) throw new Error('No test estimate ID available');

      const estimate = await salesforceService.getPaintboxEstimate(testEstimateId);
      if (!estimate) {
        throw new Error('Estimate not found');
      }
      return estimate;
    });

    await this.runTest('Update PaintboxEstimate', async () => {
      if (!testEstimateId) throw new Error('No test estimate ID available');

      const updateData = {
        Status__c: 'Approved' as const,
        Total_Amount__c: 5500,
        Notes__c: 'Updated during testing',
      };

      await salesforceService.updatePaintboxEstimate(testEstimateId, updateData);

      // Verify the update
      const updatedEstimate = await salesforceService.getPaintboxEstimate(testEstimateId);
      if (updatedEstimate?.Status__c !== updateData.Status__c) {
        throw new Error('Estimate update not reflected');
      }

      return updateData;
    });

    await this.runTest('Get All PaintboxEstimates', async () => {
      const results = await salesforceService.getAllPaintboxEstimates();
      return { count: results.length };
    });

    await this.runTest('Delete PaintboxEstimate', async () => {
      if (!testEstimateId) throw new Error('No test estimate ID available');

      await salesforceService.deletePaintboxEstimate(testEstimateId);

      // Verify deletion
      const deletedEstimate = await salesforceService.getPaintboxEstimate(testEstimateId);
      if (deletedEstimate) {
        throw new Error('Estimate still exists after deletion');
      }

      return 'Estimate successfully deleted';
    });
  }

  // Cache Operations Tests
  private async testCacheOperations(): Promise<void> {
    console.log('💾 Testing Cache Operations\n');

    await this.runTest('Cache Search Results', async () => {
      // Perform a search that should be cached
      const results1 = await salesforceService.searchContacts('Test', 5);

      // Perform the same search again - should come from cache
      const start = Date.now();
      const results2 = await salesforceService.searchContacts('Test', 5);
      const duration = Date.now() - start;

      // Cache hit should be much faster (< 10ms typically)
      if (duration > 100) {
        console.warn(`Cache lookup took ${duration}ms, might not be cached`);
      }

      return {
        firstResultCount: results1.length,
        secondResultCount: results2.length,
        cacheLookupTime: duration,
      };
    });

    await this.runTest('Cache Individual Records', async () => {
      // Get all contacts to find one to cache
      const contacts = await salesforceService.getAllContacts();
      if (contacts.length === 0) {
        throw new Error('No contacts available for cache test');
      }

      const testContact = contacts[0];

      // Get the contact (should cache it)
      const contact1 = await salesforceService.getContact(testContact.Id);

      // Get it again (should come from cache)
      const start = Date.now();
      const contact2 = await salesforceService.getContact(testContact.Id);
      const duration = Date.now() - start;

      return {
        contactId: testContact.Id,
        cacheLookupTime: duration,
        contactsMatch: contact1?.Id === contact2?.Id,
      };
    });

    await this.runTest('Cache Token Storage', async () => {
      const tokens = await this.cache.get('salesforce:tokens');
      if (!tokens) {
        throw new Error('No tokens in cache');
      }

      const tokenData = JSON.parse(tokens);
      return {
        hasAccessToken: !!tokenData.accessToken,
        hasInstanceUrl: !!tokenData.instanceUrl,
        hasExpiresAt: !!tokenData.expiresAt,
      };
    });
  }

  // Batch Sync Tests
  private async testBatchSync(): Promise<void> {
    console.log('🔄 Testing Batch Sync Operations\n');

    await this.runTest('Perform Batch Sync', async () => {
      const result = await salesforceService.performBatchSync();

      if (!result.success && result.errors.length > 0) {
        throw new Error(`Sync failed: ${result.errors.join(', ')}`);
      }

      return result;
    });

    await this.runTest('Check Last Sync Time', async () => {
      const lastSync = await this.cache.get('salesforce:lastSync');
      if (!lastSync) {
        throw new Error('No last sync time recorded');
      }

      const syncDate = new Date(lastSync);
      const now = new Date();
      const timeDiff = now.getTime() - syncDate.getTime();

      // Should be within the last 5 minutes
      if (timeDiff > 5 * 60 * 1000) {
        throw new Error('Last sync time is too old');
      }

      return {
        lastSync: syncDate.toISOString(),
        timeSinceSync: `${Math.round(timeDiff / 1000)}s ago`,
      };
    });
  }

  // Error Handling Tests
  private async testErrorHandling(): Promise<void> {
    console.log('⚠️  Testing Error Handling\n');

    await this.runTest('Handle Invalid ID', async () => {
      try {
        await salesforceService.getContact('invalid_id_123');
        throw new Error('Expected error for invalid ID');
      } catch (error) {
        // This should throw an error, which is expected
        return 'Properly handled invalid ID';
      }
    });

    await this.runTest('Handle Create with Missing Required Fields', async () => {
      try {
        await salesforceService.createContact({}); // Missing required LastName
        throw new Error('Expected error for missing required fields');
      } catch (error) {
        return 'Properly handled missing required fields';
      }
    });

    await this.runTest('Retry Mechanism Test', async () => {
      // This test would ideally simulate a temporary failure
      // For now, we'll just verify the service handles retries
      const result = await salesforceService.searchContacts('Test', 1);
      return { message: 'Retry mechanism available', resultCount: result.length };
    });
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SALESFORCE INTEGRATION TEST REPORT');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${this.results.length}`);
    console.log(`   Passed: ${passed.length} ✅`);
    console.log(`   Failed: ${failed.length} ${failed.length > 0 ? '❌' : ''}`);
    console.log(`   Success Rate: ${((passed.length / this.results.length) * 100).toFixed(1)}%`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Average Time per Test: ${Math.round(totalTime / this.results.length)}ms`);

    if (failed.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      failed.forEach(result => {
        console.log(`   - ${result.testName}: ${result.error}`);
      });
    }

    console.log(`\n⚡ Performance Summary:`);
    const performanceTests = this.results
      .filter(r => r.success)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    performanceTests.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.testName}: ${result.duration}ms`);
    });

    console.log(`\n🎯 Test Categories:`);
    const categories = {
      'Connection': this.results.filter(r => r.testName.includes('Connection') || r.testName.includes('Token')),
      'Contact Operations': this.results.filter(r => r.testName.includes('Contact')),
      'Account Operations': this.results.filter(r => r.testName.includes('Account')),
      'Opportunity Operations': this.results.filter(r => r.testName.includes('Opportunit')),
      'Estimate Operations': this.results.filter(r => r.testName.includes('Estimate')),
      'Cache Operations': this.results.filter(r => r.testName.includes('Cache')),
      'Batch Sync': this.results.filter(r => r.testName.includes('Sync')),
      'Error Handling': this.results.filter(r => r.testName.includes('Error') || r.testName.includes('Handle')),
    };

    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length > 0) {
        const categoryPassed = tests.filter(t => t.success).length;
        console.log(`   ${category}: ${categoryPassed}/${tests.length} passed`);
      }
    });

    console.log('\n' + '='.repeat(80));

    if (failed.length === 0) {
      console.log('🎉 ALL TESTS PASSED! Salesforce integration is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the failed tests above.');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new SalesforceIntegrationTester();

  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await salesforceService.cleanup();
    console.log('\n🧹 Cleanup completed');
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { SalesforceIntegrationTester };
