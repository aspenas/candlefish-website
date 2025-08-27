import { BiometricService } from '../../../../apps/mobile-maturity-map/src/services/biometric';
import { createUserFactory } from '../../../utils/test-data-factories';

// Mock react-native-biometrics
jest.mock('react-native-biometrics', () => ({
  BiometryTypes: {
    TouchID: 'TouchID',
    FaceID: 'FaceID',
    Biometrics: 'Biometrics',
  },
  default: jest.fn(() => ({
    isSensorAvailable: jest.fn(),
    createKeys: jest.fn(),
    deleteKeys: jest.fn(),
    createSignature: jest.fn(),
    simplePrompt: jest.fn(),
  })),
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

// Mock Keychain for secure storage
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
  canImplyAuthentication: jest.fn(),
  getSupportedBiometryType: jest.fn(),
  BIOMETRY_TYPE: {
    TOUCH_ID: 'TouchID',
    FACE_ID: 'FaceID',
    FINGERPRINT: 'Fingerprint',
    FACE: 'Face',
    IRIS: 'Iris',
  },
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '15.0',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

describe('Biometric Authentication Service', () => {
  let biometricService: BiometricService;
  let mockBiometrics: any;
  let mockExpoAuth: any;
  let mockKeychain: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockBiometrics = require('react-native-biometrics').default();
    mockExpoAuth = require('expo-local-authentication');
    mockKeychain = require('react-native-keychain');

    biometricService = new BiometricService();
  });

  describe('Device Capability Detection', () => {
    it('should detect TouchID availability on iOS', async () => {
      // Arrange
      mockBiometrics.isSensorAvailable.mockResolvedValue({
        available: true,
        biometryType: 'TouchID',
      });

      mockExpoAuth.hasHardwareAsync.mockResolvedValue(true);
      mockExpoAuth.isEnrolledAsync.mockResolvedValue(true);
      mockExpoAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1]); // Fingerprint

      // Act
      const capability = await biometricService.getBiometricCapability();

      // Assert
      expect(capability).toEqual({
        isAvailable: true,
        biometryType: 'TouchID',
        isEnrolled: true,
        supportedTypes: ['TouchID'],
      });
    });

    it('should detect FaceID availability on newer iOS devices', async () => {
      // Arrange
      mockBiometrics.isSensorAvailable.mockResolvedValue({
        available: true,
        biometryType: 'FaceID',
      });

      mockExpoAuth.hasHardwareAsync.mockResolvedValue(true);
      mockExpoAuth.isEnrolledAsync.mockResolvedValue(true);
      mockExpoAuth.supportedAuthenticationTypesAsync.mockResolvedValue([2]); // Facial recognition

      // Act
      const capability = await biometricService.getBiometricCapability();

      // Assert
      expect(capability).toEqual({
        isAvailable: true,
        biometryType: 'FaceID',
        isEnrolled: true,
        supportedTypes: ['FaceID'],
      });
    });

    it('should detect fingerprint on Android devices', async () => {
      // Arrange
      const mockPlatform = require('react-native').Platform;
      mockPlatform.OS = 'android';

      mockBiometrics.isSensorAvailable.mockResolvedValue({
        available: true,
        biometryType: 'Biometrics',
      });

      mockExpoAuth.hasHardwareAsync.mockResolvedValue(true);
      mockExpoAuth.isEnrolledAsync.mockResolvedValue(true);
      mockExpoAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1]);

      // Act
      const capability = await biometricService.getBiometricCapability();

      // Assert
      expect(capability).toEqual({
        isAvailable: true,
        biometryType: 'Biometrics',
        isEnrolled: true,
        supportedTypes: ['Fingerprint'],
      });
    });

    it('should handle devices without biometric hardware', async () => {
      // Arrange
      mockBiometrics.isSensorAvailable.mockResolvedValue({
        available: false,
        error: 'BiometryNotAvailable',
      });

      mockExpoAuth.hasHardwareAsync.mockResolvedValue(false);

      // Act
      const capability = await biometricService.getBiometricCapability();

      // Assert
      expect(capability).toEqual({
        isAvailable: false,
        biometryType: null,
        isEnrolled: false,
        supportedTypes: [],
        error: 'BiometryNotAvailable',
      });
    });

    it('should handle devices with hardware but no enrollment', async () => {
      // Arrange
      mockBiometrics.isSensorAvailable.mockResolvedValue({
        available: true,
        biometryType: 'TouchID',
      });

      mockExpoAuth.hasHardwareAsync.mockResolvedValue(true);
      mockExpoAuth.isEnrolledAsync.mockResolvedValue(false);

      // Act
      const capability = await biometricService.getBiometricCapability();

      // Assert
      expect(capability).toEqual({
        isAvailable: true,
        biometryType: 'TouchID',
        isEnrolled: false,
        supportedTypes: ['TouchID'],
        error: 'BiometryNotEnrolled',
      });
    });
  });

  describe('Biometric Authentication', () => {
    beforeEach(() => {
      // Setup default successful biometric capability
      mockBiometrics.isSensorAvailable.mockResolvedValue({
        available: true,
        biometryType: 'TouchID',
      });
      mockExpoAuth.hasHardwareAsync.mockResolvedValue(true);
      mockExpoAuth.isEnrolledAsync.mockResolvedValue(true);
    });

    it('should successfully authenticate with TouchID', async () => {
      // Arrange
      mockBiometrics.simplePrompt.mockResolvedValue({
        success: true,
      });

      mockExpoAuth.authenticateAsync.mockResolvedValue({
        success: true,
      });

      // Act
      const result = await biometricService.authenticate({
        reason: 'Please authenticate to access your assessments',
        fallbackEnabled: true,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        biometryType: 'TouchID',
      });

      expect(mockBiometrics.simplePrompt).toHaveBeenCalledWith({
        promptMessage: 'Please authenticate to access your assessments',
        fallbackPromptMessage: 'Use passcode',
        cancelButtonText: 'Cancel',
      });
    });

    it('should handle authentication cancellation', async () => {
      // Arrange
      mockBiometrics.simplePrompt.mockResolvedValue({
        success: false,
        error: 'User canceled',
      });

      mockExpoAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'UserCancel',
      });

      // Act
      const result = await biometricService.authenticate({
        reason: 'Authentication required',
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'User canceled',
        errorCode: 'UserCancel',
      });
    });

    it('should handle authentication failure after multiple attempts', async () => {
      // Arrange
      mockBiometrics.simplePrompt.mockResolvedValue({
        success: false,
        error: 'Authentication failed',
      });

      mockExpoAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'AuthenticationFailed',
      });

      // Act
      const result = await biometricService.authenticate({
        reason: 'Authentication required',
        maxAttempts: 3,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Authentication failed',
        errorCode: 'AuthenticationFailed',
      });
    });

    it('should fallback to device passcode when biometrics fail', async () => {
      // Arrange
      mockBiometrics.simplePrompt.mockResolvedValue({
        success: false,
        error: 'BiometricsFailed',
      });

      // Simulate fallback to device passcode
      mockExpoAuth.authenticateAsync
        .mockResolvedValueOnce({
          success: false,
          error: 'AuthenticationFailed',
        })
        .mockResolvedValueOnce({
          success: true,
        });

      // Act
      const result = await biometricService.authenticate({
        reason: 'Authentication required',
        fallbackEnabled: true,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        biometryType: 'Passcode',
        usedFallback: true,
      });
    });

    it('should handle biometric lockout scenarios', async () => {
      // Arrange
      mockBiometrics.simplePrompt.mockResolvedValue({
        success: false,
        error: 'BiometryLockout',
      });

      mockExpoAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'BiometryNotAvailable',
      });

      // Act
      const result = await biometricService.authenticate({
        reason: 'Authentication required',
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'BiometryLockout',
        errorCode: 'BiometryNotAvailable',
        requiresDevicePasscode: true,
      });
    });
  });

  describe('Secure Key Management', () => {
    it('should generate and store biometric keys securely', async () => {
      // Arrange
      mockBiometrics.createKeys.mockResolvedValue({
        publicKey: 'mock-public-key',
      });

      mockKeychain.setInternetCredentials.mockResolvedValue(true);

      const user = createUserFactory({
        id: 'user-1',
        email: 'user@example.com',
      });

      // Act
      const result = await biometricService.enableBiometric(user);

      // Assert
      expect(result).toEqual({
        success: true,
        publicKey: 'mock-public-key',
        keyAlias: expect.stringContaining('biometric_key_user-1'),
      });

      expect(mockBiometrics.createKeys).toHaveBeenCalledWith({
        allowDeviceCredentials: false,
        invalidateOnEnrollmentChanges: true,
      });

      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'biometric_user-1',
        'user@example.com',
        expect.any(String)
      );
    });

    it('should handle key generation failures', async () => {
      // Arrange
      mockBiometrics.createKeys.mockRejectedValue(new Error('Key generation failed'));

      const user = createUserFactory({
        id: 'user-1',
        email: 'user@example.com',
      });

      // Act
      const result = await biometricService.enableBiometric(user);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Key generation failed',
      });
    });

    it('should create cryptographic signatures for authentication', async () => {
      // Arrange
      const mockSignature = 'mock-biometric-signature';
      mockBiometrics.createSignature.mockResolvedValue({
        success: true,
        signature: mockSignature,
      });

      const challenge = 'auth-challenge-12345';

      // Act
      const result = await biometricService.createBiometricSignature(challenge, {
        reason: 'Sign authentication challenge',
      });

      // Assert
      expect(result).toEqual({
        success: true,
        signature: mockSignature,
        challenge,
      });

      expect(mockBiometrics.createSignature).toHaveBeenCalledWith({
        promptMessage: 'Sign authentication challenge',
        payload: challenge,
      });
    });

    it('should invalidate keys when biometric enrollment changes', async () => {
      // Arrange
      mockBiometrics.deleteKeys.mockResolvedValue(true);
      mockKeychain.resetInternetCredentials.mockResolvedValue(true);

      // Act
      const result = await biometricService.invalidateBiometricKeys('user-1');

      // Assert
      expect(result).toEqual({ success: true });

      expect(mockBiometrics.deleteKeys).toHaveBeenCalled();
      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith('biometric_user-1');
    });
  });

  describe('Security and Privacy', () => {
    it('should not store biometric templates locally', async () => {
      // Arrange
      const user = createUserFactory();

      // Act
      await biometricService.enableBiometric(user);

      // Assert
      // Verify no biometric template data is stored in keychain
      const keychainCalls = mockKeychain.setInternetCredentials.mock.calls;
      keychainCalls.forEach(([service, username, password]) => {
        expect(password).not.toContain('biometric_template');
        expect(password).not.toContain('fingerprint_data');
        expect(password).not.toContain('face_data');
      });
    });

    it('should validate biometric authentication integrity', async () => {
      // Arrange
      const mockChallenge = 'server-challenge-xyz';
      const mockSignature = 'biometric-signature-abc';

      mockBiometrics.createSignature.mockResolvedValue({
        success: true,
        signature: mockSignature,
      });

      // Act
      const result = await biometricService.validateBiometricAuth({
        challenge: mockChallenge,
        reason: 'Verify identity for assessment access',
      });

      // Assert
      expect(result).toEqual({
        success: true,
        signature: mockSignature,
        challenge: mockChallenge,
        timestamp: expect.any(Number),
      });

      // Verify challenge was signed properly
      expect(mockBiometrics.createSignature).toHaveBeenCalledWith({
        promptMessage: 'Verify identity for assessment access',
        payload: mockChallenge,
      });
    });

    it('should implement anti-spoofing measures', async () => {
      // Arrange
      // Mock a spoofing attempt (rapid successive calls)
      const rapidCalls = Array(5).fill(null).map(() => 
        biometricService.authenticate({ reason: 'Test' })
      );

      mockBiometrics.simplePrompt.mockResolvedValue({
        success: false,
        error: 'Too many attempts',
      });

      // Act
      const results = await Promise.all(rapidCalls);

      // Assert
      // Should rate limit and detect potential spoofing
      expect(results.some(result => 
        result.error === 'Too many attempts' || result.error === 'Rate limited'
      )).toBe(true);
    });

    it('should handle jailbreak/root detection', async () => {
      // Arrange
      // Mock device that appears to be jailbroken
      const mockJailbreakCheck = jest.spyOn(biometricService, 'isDeviceCompromised')
        .mockResolvedValue(true);

      // Act
      const result = await biometricService.authenticate({
        reason: 'Authentication required',
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Device security compromised',
        errorCode: 'DeviceCompromised',
      });

      mockJailbreakCheck.mockRestore();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle biometric hardware failures gracefully', async () => {
      // Arrange
      mockBiometrics.isSensorAvailable.mockRejectedValue(
        new Error('Biometric hardware unavailable')
      );

      // Act
      const capability = await biometricService.getBiometricCapability();

      // Assert
      expect(capability).toEqual({
        isAvailable: false,
        biometryType: null,
        isEnrolled: false,
        supportedTypes: [],
        error: 'Biometric hardware unavailable',
      });
    });

    it('should provide user-friendly error messages', async () => {
      // Arrange
      const testCases = [
        {
          error: 'BiometryNotEnrolled',
          expected: 'Please set up biometric authentication in your device settings',
        },
        {
          error: 'BiometryLockout',
          expected: 'Too many failed attempts. Please use your device passcode',
        },
        {
          error: 'UserCancel',
          expected: 'Authentication was cancelled',
        },
        {
          error: 'AuthenticationFailed',
          expected: 'Biometric authentication failed. Please try again',
        },
      ];

      // Act & Assert
      for (const testCase of testCases) {
        const friendlyMessage = biometricService.getErrorMessage(testCase.error);
        expect(friendlyMessage).toBe(testCase.expected);
      }
    });

    it('should implement exponential backoff for repeated failures', async () => {
      // Arrange
      let attemptCount = 0;
      mockBiometrics.simplePrompt.mockImplementation(() => {
        attemptCount++;
        return Promise.resolve({
          success: false,
          error: 'AuthenticationFailed',
        });
      });

      const startTime = Date.now();

      // Act
      const result = await biometricService.authenticate({
        reason: 'Authentication required',
        maxAttempts: 3,
        useBackoff: true,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(result.success).toBe(false);
      expect(attemptCount).toBe(3);
      
      // Should have taken time for backoff delays
      expect(duration).toBeGreaterThan(1000); // At least 1 second for backoff
    });

    it('should recover from temporary system failures', async () => {
      // Arrange
      mockBiometrics.simplePrompt
        .mockRejectedValueOnce(new Error('System busy'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ success: true });

      // Act
      const result = await biometricService.authenticate({
        reason: 'Authentication required',
        maxAttempts: 3,
        retryOnSystemError: true,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockBiometrics.simplePrompt).toHaveBeenCalledTimes(3);
    });
  });

  describe('Platform-Specific Features', () => {
    it('should handle iOS-specific biometric features', async () => {
      // Arrange
      const mockPlatform = require('react-native').Platform;
      mockPlatform.OS = 'ios';
      mockPlatform.Version = '15.0';

      mockKeychain.getSupportedBiometryType.mockResolvedValue('FaceID');

      // Act
      const result = await biometricService.authenticate({
        reason: 'Access your secure assessments',
        iosOptions: {
          fallbackLabel: 'Use Passcode',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        },
      });

      // Assert
      expect(mockBiometrics.simplePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackPromptMessage: 'Use Passcode',
          cancelButtonText: 'Cancel',
        })
      );
    });

    it('should handle Android-specific biometric features', async () => {
      // Arrange
      const mockPlatform = require('react-native').Platform;
      mockPlatform.OS = 'android';
      mockPlatform.Version = 30;

      // Act
      const result = await biometricService.authenticate({
        reason: 'Authenticate to continue',
        androidOptions: {
          title: 'Biometric Authentication',
          subtitle: 'Verify your identity',
          description: 'Use your fingerprint to authenticate',
          negativeButtonText: 'Cancel',
        },
      });

      // Assert
      expect(mockExpoAuth.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: 'Use your fingerprint to authenticate',
          cancelLabel: 'Cancel',
        })
      );
    });
  });

  describe('Integration with Assessment Security', () => {
    it('should create assessment-specific biometric challenges', async () => {
      // Arrange
      const assessmentId = 'assessment-123';
      const expectedChallenge = `auth_${assessmentId}_${expect.any(Number)}`;

      mockBiometrics.createSignature.mockResolvedValue({
        success: true,
        signature: 'assessment-specific-signature',
      });

      // Act
      const result = await biometricService.authenticateForAssessment(assessmentId, {
        reason: 'Access confidential assessment data',
      });

      // Assert
      expect(result).toEqual({
        success: true,
        signature: 'assessment-specific-signature',
        challenge: expect.stringContaining(`auth_${assessmentId}_`),
        assessmentId,
      });
    });

    it('should validate biometric sessions for assessment access', async () => {
      // Arrange
      const sessionToken = 'biometric_session_token_xyz';
      const assessmentId = 'assessment-456';

      // Act
      const isValid = await biometricService.validateAssessmentSession(
        sessionToken,
        assessmentId
      );

      // Assert
      expect(isValid).toBe(true);
      
      // Verify session was checked against assessment-specific requirements
      expect(mockKeychain.getInternetCredentials).toHaveBeenCalledWith(
        `session_${assessmentId}`
      );
    });

    it('should implement time-based session expiration', async () => {
      // Arrange
      const expiredSessionToken = 'expired_session_token';
      const assessmentId = 'assessment-789';

      // Mock expired session
      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'user-1',
        password: JSON.stringify({
          token: expiredSessionToken,
          timestamp: Date.now() - 3600000, // 1 hour ago
          expiresIn: 1800, // 30 minutes
        }),
      });

      // Act
      const isValid = await biometricService.validateAssessmentSession(
        expiredSessionToken,
        assessmentId
      );

      // Assert
      expect(isValid).toBe(false);
    });
  });
});