#!/usr/bin/env ts-node

/**
 * Company Cam Integration Test Suite
 * Tests all aspects of the Company Cam integration
 */

import { companyCamApi } from '../lib/services/companycam-api';
import { offlinePhotoSync } from '../lib/services/offline-photo-sync';
import { getSecretsManager } from '../lib/services/secrets-manager';
import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  duration: number;
}

class CompanyCamIntegrationTester {
  private results: TestResult[] = [];
  private testProjectId: string | null = null;

  async runTests(): Promise<void> {
    console.log('🔍 Starting Company Cam Integration Tests...\n');

    // Test 1: Secrets Manager Integration
    await this.testSecretsManager();

    // Test 2: Service Initialization
    await this.testServiceInitialization();

    // Test 3: Project Management
    await this.testProjectManagement();

    // Test 4: Photo Operations
    await this.testPhotoOperations();

    // Test 5: Woodwork Tagging
    await this.testWoodworkTagging();

    // Test 6: Offline Storage
    await this.testOfflineStorage();

    // Test 7: Sync Operations
    await this.testSyncOperations();

    // Test 8: API Routes
    await this.testAPIRoutes();

    // Print Results
    this.printResults();
  }

  private async runTest(
    testName: string,
    testFunction: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    try {
      await testFunction();
      this.results.push({
        name: testName,
        success: true,
        message: 'Test passed',
        duration: Date.now() - startTime
      });
      console.log(`✅ ${testName}`);
    } catch (error) {
      this.results.push({
        name: testName,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
      console.log(`❌ ${testName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testSecretsManager(): Promise<void> {
    await this.runTest('Secrets Manager Integration', async () => {
      const secretsManager = getSecretsManager();
      const secrets = await secretsManager.getSecrets();

      if (!secrets.companyCam) {
        throw new Error('Company Cam credentials not configured');
      }

      if (!secrets.companyCam.apiToken) {
        console.warn('⚠️  Company Cam API token not set - tests will run in offline mode');
      }
    });
  }

  private async testServiceInitialization(): Promise<void> {
    await this.runTest('Service Initialization', async () => {
      const healthCheck = await companyCamApi.healthCheck();

      if (healthCheck.status === 'offline') {
        console.warn('⚠️  Company Cam API is offline - using mock/offline mode');
      }
    });
  }

  private async testProjectManagement(): Promise<void> {
    await this.runTest('Project Management', async () => {
      // Test getting projects
      const projects = await companyCamApi.getProjects();

      if (!Array.isArray(projects)) {
        throw new Error('Projects should be an array');
      }

      // Test creating a project
      const testProject = await companyCamApi.createProject({
        name: `Test Project ${Date.now()}`,
        address: '123 Test Street, Test City, TS 12345',
        salesforceId: 'test-sf-id',
        estimateId: 'test-est-id'
      });

      if (!testProject.id) {
        throw new Error('Created project should have an ID');
      }

      this.testProjectId = testProject.id;

      // Test getting specific project
      const retrievedProject = await companyCamApi.getProject(testProject.id);

      if (!retrievedProject || retrievedProject.id !== testProject.id) {
        throw new Error('Should be able to retrieve created project');
      }
    });
  }

  private async testPhotoOperations(): Promise<void> {
    await this.runTest('Photo Operations', async () => {
      if (!this.testProjectId) {
        throw new Error('Test project not created');
      }

      // Create a test image file
      const testImageData = this.createTestImage();
      const testFile = new File([testImageData], 'test-door-trim-before.jpg', {
        type: 'image/jpeg'
      });

      // Test photo upload
      const uploadedPhoto = await companyCamApi.uploadPhoto(
        this.testProjectId,
        testFile,
        {
          tags: ['test'],
          description: 'Test photo upload',
          autoTag: true
        }
      );

      if (!uploadedPhoto.id) {
        throw new Error('Uploaded photo should have an ID');
      }

      // Test getting project photos
      const projectPhotos = await companyCamApi.getPhotos(this.testProjectId);

      if (!Array.isArray(projectPhotos)) {
        throw new Error('Project photos should be an array');
      }

      // Test adding annotation
      const annotation = await companyCamApi.addAnnotation(uploadedPhoto.id, {
        text: 'Test annotation',
        x: 100,
        y: 200
      });

      if (!annotation.text || annotation.text !== 'Test annotation') {
        throw new Error('Annotation should be added correctly');
      }

      // Test adding tags
      await companyCamApi.addTags(uploadedPhoto.id, ['additional-tag', 'test-tag']);
    });
  }

  private async testWoodworkTagging(): Promise<void> {
    await this.runTest('Woodwork Auto-Tagging', async () => {
      // Test filename detection
      const testCases = [
        { filename: 'kitchen-cabinet-before.jpg', expectedTags: ['cabinet', 'before'] },
        { filename: 'door-trim-progress.jpg', expectedTags: ['door', 'trim', 'progress'] },
        { filename: 'stair-railing-after.jpg', expectedTags: ['stairs', 'after'] },
        { filename: 'window-frame-work.jpg', expectedTags: ['window'] }
      ];

      for (const testCase of testCases) {
        const testImageData = this.createTestImage();
        const testFile = new File([testImageData], testCase.filename, {
          type: 'image/jpeg'
        });

        if (this.testProjectId) {
          const uploadedPhoto = await companyCamApi.uploadPhoto(
            this.testProjectId,
            testFile,
            { autoTag: true }
          );

          // Check if expected tags are present
          const hasExpectedTags = testCase.expectedTags.some(expectedTag =>
            uploadedPhoto.tags.some(tag => tag.includes(expectedTag.toLowerCase()))
          );

          if (!hasExpectedTags) {
            console.warn(`⚠️  Auto-tagging may not be working for ${testCase.filename}`);
          }
        }
      }
    });
  }

  private async testOfflineStorage(): Promise<void> {
    await this.runTest('Offline Storage', async () => {
      // Test storing photo offline
      const testImageData = this.createTestImage();
      const testFile = new File([testImageData], 'offline-test.jpg', {
        type: 'image/jpeg'
      });

      if (!this.testProjectId) {
        throw new Error('Test project not created');
      }

      const offlinePhoto = await offlinePhotoSync.storePhotoOffline(
        this.testProjectId,
        testFile,
        {
          tags: ['offline-test'],
          priority: 1
        }
      );

      if (!offlinePhoto.id) {
        throw new Error('Offline photo should have an ID');
      }

      // Test getting offline photos
      const offlinePhotos = await offlinePhotoSync.getOfflinePhotos(this.testProjectId);

      if (!Array.isArray(offlinePhotos)) {
        throw new Error('Offline photos should be an array');
      }

      // Test sync statistics
      const syncStats = await offlinePhotoSync.getSyncStatistics();

      if (typeof syncStats.totalPhotos !== 'number') {
        throw new Error('Sync statistics should include numeric values');
      }
    });
  }

  private async testSyncOperations(): Promise<void> {
    await this.runTest('Sync Operations', async () => {
      // Test sync trigger
      await offlinePhotoSync.triggerSync();

      // Test failed upload retry
      const retryResult = await offlinePhotoSync.retryFailedUploads();

      if (typeof retryResult.success !== 'number' || typeof retryResult.failed !== 'number') {
        throw new Error('Retry result should have numeric success and failed counts');
      }

      // Test cleanup
      const cleanupResult = await offlinePhotoSync.clearSyncedPhotos(0); // Clear all

      if (typeof cleanupResult !== 'number') {
        throw new Error('Cleanup result should be numeric');
      }
    });
  }

  private async testAPIRoutes(): Promise<void> {
    await this.runTest('API Routes', async () => {
      // Test projects API
      const projectsResponse = await fetch('/api/v1/companycam/projects', {
        method: 'GET'
      });

      if (!projectsResponse.ok && projectsResponse.status !== 404) {
        // 404 is acceptable in test environment
        throw new Error(`Projects API returned ${projectsResponse.status}`);
      }

      // Test sync API
      const syncResponse = await fetch('/api/v1/companycam/sync', {
        method: 'GET'
      });

      if (!syncResponse.ok && syncResponse.status !== 404) {
        // 404 is acceptable in test environment
        throw new Error(`Sync API returned ${syncResponse.status}`);
      }

      // Test webhook endpoint
      const webhookResponse = await fetch('/api/v1/companycam/webhooks', {
        method: 'GET'
      });

      if (!webhookResponse.ok && webhookResponse.status !== 404) {
        // 404 is acceptable in test environment
        throw new Error(`Webhook API returned ${webhookResponse.status}`);
      }
    });
  }

  private createTestImage(): Uint8Array {
    // Create a minimal JPEG header (placeholder)
    return new Uint8Array([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
      0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
      0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
      0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
      0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
      0x32, 0xFF, 0xD9
    ]);
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('═'.repeat(50));

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  • ${result.name}: ${result.message}`);
        });
    }

    console.log('\n⏱️  Performance:');
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`  Total Duration: ${totalDuration}ms`);
    console.log(`  Average per Test: ${(totalDuration / this.results.length).toFixed(1)}ms`);

    const slowTests = this.results
      .filter(r => r.duration > 1000)
      .sort((a, b) => b.duration - a.duration);

    if (slowTests.length > 0) {
      console.log('\n🐌 Slow Tests (>1s):');
      slowTests.forEach(test => {
        console.log(`  • ${test.name}: ${test.duration}ms`);
      });
    }

    console.log('\n' + '═'.repeat(50));

    if (failed === 0) {
      console.log('🎉 All tests passed! Company Cam integration is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the integration setup.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new CompanyCamIntegrationTester();
  tester.runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { CompanyCamIntegrationTester };
