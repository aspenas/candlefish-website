#!/usr/bin/env node

/**
 * Mobile Inventory App - Feature Testing Script
 * Tests critical functionality before app store submission
 */

const fs = require('fs').promises;
const path = require('path');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${COLORS.GREEN}✅ ${msg}${COLORS.RESET}`),
  error: (msg) => console.log(`${COLORS.RED}❌ ${msg}${COLORS.RESET}`),
  warning: (msg) => console.log(`${COLORS.YELLOW}⚠️  ${msg}${COLORS.RESET}`),
  info: (msg) => console.log(`${COLORS.BLUE}ℹ️  ${msg}${COLORS.RESET}`),
  header: (msg) => console.log(`\n${COLORS.BOLD}${COLORS.BLUE}${msg}${COLORS.RESET}\n`)
};

class FeatureTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      total: 0
    };
  }

  async runAllTests() {
    log.header('🧪 MOBILE INVENTORY APP - FEATURE TESTING');

    await this.testProjectStructure();
    await this.testVersionConfiguration();
    await this.testCameraFeatures();
    await this.testOfflineSync();
    await this.testNotificationService();
    await this.testPermissions();
    await this.testAssets();
    await this.testBuildConfiguration();

    this.printSummary();
  }

  async testProjectStructure() {
    log.header('📁 Testing Project Structure');

    const requiredFiles = [
      'package.json',
      'app.json',
      'eas.json',
      'src/components/CameraCapture.tsx',
      'src/services/NotificationService.ts',
      'src/store/slices/syncSlice.ts',
      'src/graphql/client.ts',
      'src/database/repositories/InventoryRepository.ts'
    ];

    for (const file of requiredFiles) {
      await this.checkFileExists(file);
    }
  }

  async testVersionConfiguration() {
    log.header('🔢 Testing Version Configuration');

    try {
      // Check package.json version
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      if (packageJson.version === '1.0.1') {
        log.success('package.json version is 1.0.1');
        this.pass();
      } else {
        log.error(`package.json version is ${packageJson.version}, expected 1.0.1`);
        this.fail();
      }

      // Check app.json version
      const appJson = JSON.parse(await fs.readFile('app.json', 'utf8'));
      if (appJson.expo.version === '1.0.1') {
        log.success('app.json version is 1.0.1');
        this.pass();
      } else {
        log.error(`app.json version is ${appJson.expo.version}, expected 1.0.1`);
        this.fail();
      }

      // Check iOS build number
      if (appJson.expo.ios.buildNumber === '2') {
        log.success('iOS buildNumber is 2');
        this.pass();
      } else {
        log.error(`iOS buildNumber is ${appJson.expo.ios.buildNumber}, expected 2`);
        this.fail();
      }

      // Check Android version code
      if (appJson.expo.android.versionCode === 2) {
        log.success('Android versionCode is 2');
        this.pass();
      } else {
        log.error(`Android versionCode is ${appJson.expo.android.versionCode}, expected 2`);
        this.fail();
      }

    } catch (error) {
      log.error(`Failed to check version configuration: ${error.message}`);
      this.fail();
    }
  }

  async testCameraFeatures() {
    log.header('📸 Testing Camera Features');

    try {
      const cameraCode = await fs.readFile('src/components/CameraCapture.tsx', 'utf8');

      // Check for required imports
      const requiredImports = [
        'expo-camera',
        'expo-image-picker',
        'expo-file-system',
        'expo-media-library'
      ];

      requiredImports.forEach(imp => {
        if (cameraCode.includes(imp)) {
          log.success(`Camera import found: ${imp}`);
          this.pass();
        } else {
          log.error(`Missing camera import: ${imp}`);
          this.fail();
        }
      });

      // Check for key functionality
      const features = [
        { name: 'Permission request', pattern: 'requestCameraPermissionsAsync' },
        { name: 'Photo capture', pattern: 'takePictureAsync' },
        { name: 'Gallery picker', pattern: 'launchImageLibraryAsync' },
        { name: 'Photo processing', pattern: 'processPhoto' },
        { name: 'Focus handling', pattern: 'handleFocus' },
        { name: 'Flash control', pattern: 'toggleFlash' }
      ];

      features.forEach(feature => {
        if (cameraCode.includes(feature.pattern)) {
          log.success(`Camera feature implemented: ${feature.name}`);
          this.pass();
        } else {
          log.error(`Missing camera feature: ${feature.name}`);
          this.fail();
        }
      });

    } catch (error) {
      log.error(`Failed to test camera features: ${error.message}`);
      this.fail();
    }
  }

  async testOfflineSync() {
    log.header('🔄 Testing Offline Sync');

    try {
      const syncCode = await fs.readFile('src/store/slices/syncSlice.ts', 'utf8');

      const syncFeatures = [
        { name: 'Full sync', pattern: 'performFullSync' },
        { name: 'Incremental sync', pattern: 'performIncrementalSync' },
        { name: 'Network check', pattern: 'checkNetworkAndSync' },
        { name: 'Offline queue', pattern: 'offlineQueueManager' },
        { name: 'Conflict resolution', pattern: 'remoteUpdated > localUpdated' },
        { name: 'Error handling', pattern: 'SyncError' }
      ];

      syncFeatures.forEach(feature => {
        if (syncCode.includes(feature.pattern)) {
          log.success(`Sync feature implemented: ${feature.name}`);
          this.pass();
        } else {
          log.error(`Missing sync feature: ${feature.name}`);
          this.fail();
        }
      });

    } catch (error) {
      log.error(`Failed to test offline sync: ${error.message}`);
      this.fail();
    }
  }

  async testNotificationService() {
    log.header('🔔 Testing Push Notifications');

    try {
      const notificationCode = await fs.readFile('src/services/NotificationService.ts', 'utf8');

      const notificationFeatures = [
        { name: 'Expo notifications', pattern: 'expo-notifications' },
        { name: 'Permission request', pattern: 'requestPermissionsAsync' },
        { name: 'Push token registration', pattern: 'getExpoPushTokenAsync' },
        { name: 'Notification channels', pattern: 'setNotificationChannelAsync' },
        { name: 'Low stock alerts', pattern: 'LOW_STOCK' },
        { name: 'Out of stock alerts', pattern: 'OUT_OF_STOCK' },
        { name: 'Quiet hours', pattern: 'quietHoursEnabled' },
        { name: 'Local notifications', pattern: 'scheduleNotificationAsync' }
      ];

      notificationFeatures.forEach(feature => {
        if (notificationCode.includes(feature.pattern)) {
          log.success(`Notification feature implemented: ${feature.name}`);
          this.pass();
        } else {
          log.error(`Missing notification feature: ${feature.name}`);
          this.fail();
        }
      });

    } catch (error) {
      log.error(`Failed to test notification service: ${error.message}`);
      this.fail();
    }
  }

  async testPermissions() {
    log.header('🔐 Testing Permissions Configuration');

    try {
      const appJson = JSON.parse(await fs.readFile('app.json', 'utf8'));

      // iOS permissions
      const iosPermissions = [
        'NSCameraUsageDescription',
        'NSPhotoLibraryUsageDescription',
        'NSLocationWhenInUseUsageDescription',
        'NSFaceIDUsageDescription'
      ];

      iosPermissions.forEach(permission => {
        if (appJson.expo.ios.infoPlist[permission]) {
          log.success(`iOS permission configured: ${permission}`);
          this.pass();
        } else {
          log.error(`Missing iOS permission: ${permission}`);
          this.fail();
        }
      });

      // Android permissions
      const androidPermissions = [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_FINE_LOCATION',
        'USE_BIOMETRIC'
      ];

      androidPermissions.forEach(permission => {
        if (appJson.expo.android.permissions.includes(permission)) {
          log.success(`Android permission configured: ${permission}`);
          this.pass();
        } else {
          log.error(`Missing Android permission: ${permission}`);
          this.fail();
        }
      });

    } catch (error) {
      log.error(`Failed to test permissions: ${error.message}`);
      this.fail();
    }
  }

  async testAssets() {
    log.header('🎨 Testing Required Assets');

    const requiredAssets = [
      'assets/icon.png',
      'assets/splash.png',
      'assets/adaptive-icon.png',
      'assets/favicon.png',
      'assets/notification-icon.png'
    ];

    for (const asset of requiredAssets) {
      await this.checkFileExists(asset);
    }
  }

  async testBuildConfiguration() {
    log.header('🏗️ Testing Build Configuration');

    try {
      const easJson = JSON.parse(await fs.readFile('eas.json', 'utf8'));

      // Check build profiles
      const profiles = ['development', 'preview', 'production'];
      profiles.forEach(profile => {
        if (easJson.build[profile]) {
          log.success(`Build profile configured: ${profile}`);
          this.pass();
        } else {
          log.error(`Missing build profile: ${profile}`);
          this.fail();
        }
      });

      // Check iOS specific config
      if (easJson.build.production.ios && easJson.build.production.ios.resourceClass) {
        log.success('iOS build configuration is complete');
        this.pass();
      } else {
        log.warning('iOS build configuration might need adjustment');
        this.warn();
      }

      // Check Android specific config
      if (easJson.build.production.android && easJson.build.production.android.buildType === 'aab') {
        log.success('Android AAB build configuration is correct');
        this.pass();
      } else {
        log.error('Android should use AAB for production');
        this.fail();
      }

    } catch (error) {
      log.error(`Failed to test build configuration: ${error.message}`);
      this.fail();
    }
  }

  async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      log.success(`Required file exists: ${filePath}`);
      this.pass();
    } catch (error) {
      log.error(`Missing required file: ${filePath}`);
      this.fail();
    }
  }

  pass() {
    this.testResults.passed++;
    this.testResults.total++;
  }

  fail() {
    this.testResults.failed++;
    this.testResults.total++;
  }

  warn() {
    this.testResults.warnings++;
    this.testResults.total++;
  }

  printSummary() {
    log.header('📊 TEST SUMMARY');

    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`${COLORS.GREEN}Passed: ${this.testResults.passed}${COLORS.RESET}`);
    console.log(`${COLORS.RED}Failed: ${this.testResults.failed}${COLORS.RESET}`);
    console.log(`${COLORS.YELLOW}Warnings: ${this.testResults.warnings}${COLORS.RESET}`);

    const successRate = Math.round((this.testResults.passed / this.testResults.total) * 100);

    if (successRate >= 95) {
      log.success(`\n🎉 DEPLOYMENT READY! Success rate: ${successRate}%`);
      console.log('\n✅ App is ready for store submission');
    } else if (successRate >= 85) {
      log.warning(`\n⚠️  MOSTLY READY: Success rate: ${successRate}%`);
      console.log('\n🔧 Fix remaining issues before submission');
    } else {
      log.error(`\n❌ NOT READY: Success rate: ${successRate}%`);
      console.log('\n🚫 Critical issues must be resolved');
    }

    console.log('\n📋 Next steps:');
    console.log('1. eas login (authenticate with Expo)');
    console.log('2. eas build --platform ios --profile production');
    console.log('3. eas build --platform android --profile production');
    console.log('4. eas submit --platform ios');
    console.log('5. eas submit --platform android');
  }
}

// Run tests
async function main() {
  try {
    // Change to mobile-inventory directory
    process.chdir(path.join(__dirname));

    const tester = new FeatureTester();
    await tester.runAllTests();

    process.exit(tester.testResults.failed === 0 ? 0 : 1);
  } catch (error) {
    log.error(`Test runner failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { FeatureTester };
