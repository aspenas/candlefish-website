import { AWS } from 'aws-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Keychain from 'react-native-keychain';
import DeviceInfo from 'react-native-device-info';

// Types
interface Credentials {
  apiKey: string;
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface AWSConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

// Constants
const AWS_REGION = 'us-east-1';
const SECRETS_MANAGER_SECRET_ID = 'paintbox/mobile/api-keys';
const KEYCHAIN_SERVICE = 'com.paintbox.mobile';
const KEYCHAIN_ACCESS_GROUP = 'group.com.paintbox.mobile';

// Cache keys
const CACHE_KEYS = {
  CREDENTIALS: '@paintbox/credentials',
  AWS_CONFIG: '@paintbox/aws_config',
  DEVICE_ID: '@paintbox/device_id',
  LAST_SYNC: '@paintbox/last_credentials_sync',
};

// Initialize AWS SDK
const initializeAWS = async (): Promise<AWS.SecretsManager | null> => {
  try {
    // Try to get AWS credentials from Keychain
    const awsCredentials = await Keychain.getInternetCredentials('aws-credentials');
    
    let config: AWSConfig = { region: AWS_REGION };
    
    if (awsCredentials && awsCredentials.password) {
      const parsedCreds = JSON.parse(awsCredentials.password);
      config = {
        ...config,
        accessKeyId: parsedCreds.accessKeyId,
        secretAccessKey: parsedCreds.secretAccessKey,
        sessionToken: parsedCreds.sessionToken,
      };
    }
    
    AWS.config.update(config);
    
    return new AWS.SecretsManager({ region: AWS_REGION });
  } catch (error) {
    console.error('Failed to initialize AWS:', error);
    return null;
  }
};

// Get device ID for identification
const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem(CACHE_KEYS.DEVICE_ID);
    
    if (!deviceId) {
      deviceId = await DeviceInfo.getUniqueId();
      await AsyncStorage.setItem(CACHE_KEYS.DEVICE_ID, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('Failed to get device ID:', error);
    return 'unknown-device';
  }
};

// Store credentials securely
const storeCredentials = async (credentials: Credentials): Promise<void> => {
  try {
    // Store in Keychain (most secure)
    await Keychain.setInternetCredentials(
      KEYCHAIN_SERVICE,
      'paintbox-api-user',
      JSON.stringify(credentials),
      {
        accessGroup: KEYCHAIN_ACCESS_GROUP,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
      }
    );
    
    // Store non-sensitive metadata in AsyncStorage
    await AsyncStorage.setItem(CACHE_KEYS.CREDENTIALS, JSON.stringify({
      userId: credentials.userId,
      expiresAt: credentials.expiresAt,
      hasApiKey: !!credentials.apiKey,
    }));
    
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    
    console.log('Credentials stored successfully');
  } catch (error) {
    console.error('Failed to store credentials:', error);
    throw error;
  }
};

// Retrieve credentials securely
const retrieveCredentials = async (): Promise<Credentials | null> => {
  try {
    // Try to get from Keychain first
    const keychainCredentials = await Keychain.getInternetCredentials(KEYCHAIN_SERVICE);
    
    if (keychainCredentials && keychainCredentials.password) {
      const credentials = JSON.parse(keychainCredentials.password) as Credentials;
      
      // Check if credentials are expired
      if (credentials.expiresAt && credentials.expiresAt < Date.now()) {
        console.log('Credentials expired, will refresh');
        return null;
      }
      
      return credentials;
    }
    
    console.log('No credentials found in Keychain');
    return null;
  } catch (error) {
    console.error('Failed to retrieve credentials:', error);
    return null;
  }
};

// Fetch credentials from AWS Secrets Manager
const fetchCredentialsFromAWS = async (): Promise<Credentials | null> => {
  try {
    const secretsManager = await initializeAWS();
    
    if (!secretsManager) {
      console.error('AWS Secrets Manager not initialized');
      return null;
    }
    
    const deviceId = await getDeviceId();
    const deviceInfo = await DeviceInfo.getDeviceName();
    
    console.log(`Fetching credentials for device: ${deviceId}`);
    
    const result = await secretsManager.getSecretValue({
      SecretId: SECRETS_MANAGER_SECRET_ID,
      VersionStage: 'AWSCURRENT',
    }).promise();
    
    if (!result.SecretString) {
      console.error('No secret string found');
      return null;
    }
    
    const secretData = JSON.parse(result.SecretString);
    
    // Extract the appropriate API key based on environment
    const environment = __DEV__ ? 'development' : 'production';
    const apiKey = secretData[`${environment}_api_key`];
    
    if (!apiKey) {
      console.error(`No API key found for environment: ${environment}`);
      return null;
    }
    
    const credentials: Credentials = {
      apiKey,
      userId: secretData.default_user_id || 'mobile-user',
      accessToken: secretData.access_token,
      refreshToken: secretData.refresh_token,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
    };
    
    // Store the credentials
    await storeCredentials(credentials);
    
    return credentials;
  } catch (error) {
    console.error('Failed to fetch credentials from AWS:', error);
    return null;
  }
};

// Main function to get credentials
export const getCredentials = async (forceRefresh: boolean = false): Promise<Credentials | null> => {
  try {
    if (!forceRefresh) {
      // Try to get cached credentials first
      const cachedCredentials = await retrieveCredentials();
      if (cachedCredentials) {
        return cachedCredentials;
      }
    }
    
    // Fetch fresh credentials from AWS
    console.log('Fetching fresh credentials from AWS...');
    return await fetchCredentialsFromAWS();
  } catch (error) {
    console.error('Failed to get credentials:', error);
    return null;
  }
};

// Refresh credentials
export const refreshCredentials = async (): Promise<Credentials | null> => {
  return await getCredentials(true);
};

// Clear credentials (for logout)
export const clearCredentials = async (): Promise<void> => {
  try {
    await Keychain.resetInternetCredentials(KEYCHAIN_SERVICE);
    await AsyncStorage.removeItem(CACHE_KEYS.CREDENTIALS);
    await AsyncStorage.removeItem(CACHE_KEYS.LAST_SYNC);
    console.log('Credentials cleared successfully');
  } catch (error) {
    console.error('Failed to clear credentials:', error);
  }
};

// Check if credentials need refresh
export const needsRefresh = async (): Promise<boolean> => {
  try {
    const lastSync = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
    
    if (!lastSync) {
      return true;
    }
    
    const lastSyncTime = parseInt(lastSync, 10);
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000;
    
    return (now - lastSyncTime) > sixHours;
  } catch (error) {
    console.error('Failed to check refresh status:', error);
    return true;
  }
};

// Store AWS credentials (for initial setup)
export const storeAWSCredentials = async (awsCredentials: AWSConfig): Promise<void> => {
  try {
    await Keychain.setInternetCredentials(
      'aws-credentials',
      'aws-user',
      JSON.stringify(awsCredentials),
      {
        accessGroup: KEYCHAIN_ACCESS_GROUP,
      }
    );
    
    console.log('AWS credentials stored successfully');
  } catch (error) {
    console.error('Failed to store AWS credentials:', error);
    throw error;
  }
};

// Initialize credentials on app start
export const initializeCredentials = async (): Promise<Credentials | null> => {
  try {
    console.log('Initializing credentials...');
    
    // Check if we need to refresh
    const shouldRefresh = await needsRefresh();
    
    if (shouldRefresh) {
      console.log('Credentials need refresh, fetching new ones...');
      return await refreshCredentials();
    }
    
    // Use cached credentials
    return await getCredentials();
  } catch (error) {
    console.error('Failed to initialize credentials:', error);
    return null;
  }
};

// Export types
export type { Credentials, AWSConfig };