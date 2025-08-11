/**
 * Tyler Setup Platform - Mobile Test Setup
 * React Native specific test configuration
 */

import 'react-native-gesture-handler/jestSetup';

// Mock React Native modules
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
  };
});

// Mock NetInfo
jest.mock('@react-native-netinfo/netinfo', () => ({
  fetch: () => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock React Native Vector Icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('react-native-vector-icons/Feather', () => 'Feather');
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// Mock Biometrics
jest.mock('react-native-biometrics', () => ({
  isSensorAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'TouchID' })),
  createKeys: jest.fn(() => Promise.resolve({ publicKey: 'mock-public-key' })),
  deleteKeys: jest.fn(() => Promise.resolve(true)),
  createSignature: jest.fn(() => Promise.resolve({ success: true, signature: 'mock-signature' })),
  simplePrompt: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock Permissions
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
    },
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
  },
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve('granted')),
}));

// Mock Device Info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  getUniqueId: jest.fn(() => 'mock-device-id'),
  getSystemName: jest.fn(() => 'iOS'),
  getSystemVersion: jest.fn(() => '15.0'),
  getBrand: jest.fn(() => 'Apple'),
  getModel: jest.fn(() => 'iPhone 12'),
}));

// Mock Push Notifications
jest.mock('@react-native-firebase/messaging', () => ({
  getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
  requestPermission: jest.fn(() => Promise.resolve(true)),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  setBackgroundMessageHandler: jest.fn(),
}));

// Mock Keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve()),
  getInternetCredentials: jest.fn(() => Promise.resolve({
    username: 'test@example.com',
    password: 'mock-token',
  })),
  resetInternetCredentials: jest.fn(() => Promise.resolve()),
}));

// Mock Haptic Feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    selection: 'selection',
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
  },
}));

// Mock Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock React Native Testing Library utils
global.mockNavigate = jest.fn();
global.mockGoBack = jest.fn();

// Helper for creating navigation mock
global.createMockNavigation = (overrides = {}) => ({
  navigate: global.mockNavigate,
  goBack: global.mockGoBack,
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  isFocused: jest.fn(() => true),
  ...overrides,
});

// Helper for creating route mock
global.createMockRoute = (params = {}) => ({
  params,
  key: 'mock-route-key',
  name: 'MockScreen',
});

// Mock Apollo Client for mobile
global.createMockApolloClient = () => ({
  query: jest.fn(() => Promise.resolve({ data: {} })),
  mutate: jest.fn(() => Promise.resolve({ data: {} })),
  subscribe: jest.fn(() => ({
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  })),
  cache: {
    readQuery: jest.fn(),
    writeQuery: jest.fn(),
    reset: jest.fn(),
  },
});

// Mock React Hook Form for mobile
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn) => fn,
    formState: { errors: {} },
    reset: jest.fn(),
    setValue: jest.fn(),
    getValues: jest.fn(),
    watch: jest.fn(),
  }),
  Controller: ({ children, render }) =>
    render ? render({}) : children,
}));

// Clean up mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  global.mockNavigate.mockClear();
  global.mockGoBack.mockClear();
});
