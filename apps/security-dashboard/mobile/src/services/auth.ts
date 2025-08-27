import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { apolloService } from './apollo-client';
import { NotificationService } from './notifications';

// Types
interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: Permission[];
  avatar?: string;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  biometricEnabled: boolean;
  lastAuthTime: number;
}

class AuthenticationService {
  private static instance: AuthenticationService;
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    biometricEnabled: false,
    lastAuthTime: 0
  };
  
  private listeners: Array<(state: AuthState) => void> = [];
  private refreshTokenInterval: NodeJS.Timeout | null = null;
  private sessionTimeoutInterval: NodeJS.Timeout | null = null;
  
  // Constants
  private readonly TOKEN_KEY = 'authToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly USER_KEY = 'userData';
  private readonly BIOMETRIC_KEY = 'biometricEnabled';
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

  public static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load stored authentication state
      await this.loadStoredAuthState();
      
      // Check if stored token is still valid
      if (this.authState.token) {
        const isValid = await this.validateToken(this.authState.token);
        if (isValid) {
          this.authState.isAuthenticated = true;
          this.startTokenRefreshScheduler();
          this.startSessionTimeout();
        } else {
          await this.clearAuthData();
        }
      }
    } catch (error) {
      console.error('Error initializing auth service:', error);
      await this.clearAuthData();
    }
  }

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-version': '1.0.0',
          'x-client-platform': 'mobile',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const loginData: LoginResponse = await response.json();
      
      // Store authentication data securely
      await this.storeAuthData(loginData);
      
      // Update auth state
      this.authState = {
        isAuthenticated: true,
        user: loginData.user,
        token: loginData.token,
        biometricEnabled: await this.isBiometricEnabled(),
        lastAuthTime: Date.now()
      };
      
      // Start token management
      this.startTokenRefreshScheduler();
      this.startSessionTimeout();
      
      // Notify listeners
      this.notifyAuthStateChange();
      
      // Log security event
      this.logSecurityEvent('LOGIN_SUCCESS', {
        userId: loginData.user.id,
        timestamp: Date.now()
      });
      
      return loginData;
    } catch (error) {
      this.logSecurityEvent('LOGIN_FAILED', {
        email: credentials.email,
        error: (error as Error).message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  async logout(force: boolean = false): Promise<void> {
    try {
      const currentUser = this.authState.user;
      
      if (!force && this.authState.token) {
        // Notify server of logout
        try {
          await fetch(`${this.getApiUrl()}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.authState.token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.warn('Server logout failed:', error);
        }
      }
      
      // Clear all stored data
      await this.clearAuthData();
      
      // Reset auth state
      this.authState = {
        isAuthenticated: false,
        user: null,
        token: null,
        biometricEnabled: false,
        lastAuthTime: 0
      };
      
      // Clear Apollo cache
      await apolloService.clearCache();
      
      // Stop schedulers
      this.stopTokenRefreshScheduler();
      this.stopSessionTimeout();
      
      // Notify listeners
      this.notifyAuthStateChange();
      
      // Log security event
      this.logSecurityEvent('LOGOUT', {
        userId: currentUser?.id,
        forced: force,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.getApiUrl()}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = await response.json();
      
      // Update stored tokens
      await SecureStore.setItemAsync(this.TOKEN_KEY, tokenData.token);
      await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, tokenData.refreshToken);
      
      // Update auth state
      this.authState.token = tokenData.token;
      this.authState.lastAuthTime = Date.now();
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logout(true);
      return false;
    }
  }

  // Biometric Authentication
  async checkBiometricSupport(): Promise<{
    isAvailable: boolean;
    supportedTypes: LocalAuthentication.AuthenticationType[];
    isEnrolled: boolean;
  }> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      return {
        isAvailable,
        supportedTypes,
        isEnrolled
      };
    } catch (error) {
      console.error('Biometric check failed:', error);
      return {
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false
      };
    }
  }

  async enableBiometricAuth(): Promise<boolean> {
    try {
      const { isAvailable, isEnrolled } = await this.checkBiometricSupport();
      
      if (!isAvailable || !isEnrolled) {
        throw new Error('Biometric authentication not available or not enrolled');
      }

      // Test biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
        requireConfirmation: true,
      });

      if (result.success) {
        await SecureStore.setItemAsync(this.BIOMETRIC_KEY, 'true');
        this.authState.biometricEnabled = true;
        
        this.logSecurityEvent('BIOMETRIC_ENABLED', {
          userId: this.authState.user?.id,
          timestamp: Date.now()
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Enable biometric failed:', error);
      return false;
    }
  }

  async disableBiometricAuth(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.BIOMETRIC_KEY);
      this.authState.biometricEnabled = false;
      
      this.logSecurityEvent('BIOMETRIC_DISABLED', {
        userId: this.authState.user?.id,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Disable biometric failed:', error);
    }
  }

  async authenticateWithBiometrics(): Promise<BiometricAuthResult> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return { success: false, error: 'Biometric authentication not enabled' };
      }

      const { isAvailable, isEnrolled, supportedTypes } = await this.checkBiometricSupport();
      
      if (!isAvailable || !isEnrolled) {
        return { 
          success: false, 
          error: 'Biometric authentication not available or not enrolled' 
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access the app',
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
        requireConfirmation: false,
      });

      if (result.success) {
        this.authState.lastAuthTime = Date.now();
        this.restartSessionTimeout();
        
        this.logSecurityEvent('BIOMETRIC_AUTH_SUCCESS', {
          userId: this.authState.user?.id,
          biometricType: this.getBiometricTypeString(supportedTypes),
          timestamp: Date.now()
        });
        
        return { 
          success: true, 
          biometricType: this.getBiometricTypeString(supportedTypes) 
        };
      }
      
      this.logSecurityEvent('BIOMETRIC_AUTH_FAILED', {
        userId: this.authState.user?.id,
        error: result.error,
        timestamp: Date.now()
      });
      
      return { success: false, error: result.error || 'Authentication failed' };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Session Management
  async extendSession(): Promise<void> {
    this.authState.lastAuthTime = Date.now();
    this.restartSessionTimeout();
  }

  private startSessionTimeout(): void {
    this.stopSessionTimeout();
    this.sessionTimeoutInterval = setTimeout(async () => {
      await this.handleSessionTimeout();
    }, this.SESSION_TIMEOUT);
  }

  private stopSessionTimeout(): void {
    if (this.sessionTimeoutInterval) {
      clearTimeout(this.sessionTimeoutInterval);
      this.sessionTimeoutInterval = null;
    }
  }

  private restartSessionTimeout(): void {
    this.startSessionTimeout();
  }

  private async handleSessionTimeout(): Promise<void> {
    NotificationService.showNotification({
      title: 'Session Expired',
      message: 'Please log in again for security',
      type: 'warning'
    });
    
    await this.logout(true);
  }

  // Token Management
  private startTokenRefreshScheduler(): void {
    this.stopTokenRefreshScheduler();
    
    // Check every minute if token needs refreshing
    this.refreshTokenInterval = setInterval(async () => {
      if (this.authState.token && await this.shouldRefreshToken()) {
        await this.refreshToken();
      }
    }, 60000);
  }

  private stopTokenRefreshScheduler(): void {
    if (this.refreshTokenInterval) {
      clearInterval(this.refreshTokenInterval);
      this.refreshTokenInterval = null;
    }
  }

  private async shouldRefreshToken(): Promise<boolean> {
    if (!this.authState.token) return false;
    
    try {
      // Decode JWT to check expiry
      const payload = JSON.parse(
        Buffer.from(this.authState.token.split('.')[1], 'base64').toString()
      );
      
      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();
      
      // Refresh if token expires within threshold
      return (expiryTime - currentTime) < this.TOKEN_REFRESH_THRESHOLD;
    } catch (error) {
      console.error('Token validation failed:', error);
      return true; // Force refresh if we can't validate
    }
  }

  private async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.getApiUrl()}/auth/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  // Storage Methods
  private async storeAuthData(loginData: LoginResponse): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(this.TOKEN_KEY, loginData.token),
      SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, loginData.refreshToken),
      AsyncStorage.setItem(this.USER_KEY, JSON.stringify(loginData.user)),
    ]);
  }

  private async loadStoredAuthState(): Promise<void> {
    try {
      const [token, userData, biometricEnabled] = await Promise.all([
        SecureStore.getItemAsync(this.TOKEN_KEY),
        AsyncStorage.getItem(this.USER_KEY),
        this.isBiometricEnabled(),
      ]);

      if (token && userData) {
        this.authState = {
          isAuthenticated: false, // Will be verified
          user: JSON.parse(userData),
          token,
          biometricEnabled,
          lastAuthTime: Date.now()
        };
      }
    } catch (error) {
      console.error('Error loading stored auth state:', error);
    }
  }

  private async clearAuthData(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(this.TOKEN_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY).catch(() => {}),
        AsyncStorage.removeItem(this.USER_KEY).catch(() => {}),
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  private async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(this.BIOMETRIC_KEY);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  // Utility Methods
  private getBiometricTypeString(types: LocalAuthentication.AuthenticationType[]): string {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    return 'Biometric';
  }

  private getApiUrl(): string {
    return __DEV__ ? 'http://localhost:4000' : 'https://api.candlefish.ai';
  }

  private logSecurityEvent(event: string, data: any): void {
    console.log(`[SECURITY EVENT] ${event}:`, data);
    
    // In production, send to security logging service
    if (!__DEV__) {
      // Send to security monitoring endpoint
    }
  }

  // Public State Methods
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  getCurrentUser(): User | null {
    return this.authState.user;
  }

  getToken(): string | null {
    return this.authState.token;
  }

  // Event Listeners
  addAuthStateListener(listener: (state: AuthState) => void): void {
    this.listeners.push(listener);
  }

  removeAuthStateListener(listener: (state: AuthState) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyAuthStateChange(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getAuthState());
      } catch (error) {
        console.error('Auth state listener error:', error);
      }
    });
  }
}

export const AuthService = AuthenticationService.getInstance();
export default AuthService;