import { faker } from '@faker-js/faker';

// Re-export main factories from the web version
export {
  mockThreatData,
  mockIOCData,
  mockThreatActorData,
  mockSecurityEventData,
  mockIncidentData,
  mockAlertData,
  mockAssetData,
  mockUserData,
  mockCampaignData,
  mockCorrelationData,
  createMockThreats,
  createMockIOCs,
  createMockThreatActors,
  createMockSecurityEvents,
  createMockIncidents,
  createMockAlerts,
  createMockAssets,
  mockPagination,
  ThreatSeverity,
  IOCType,
  ThreatActorType,
  IncidentStatus
} from '../../../../../../src/test/factories/ThreatFactory';

// Mobile-specific factories
export const mockLocationData = (overrides = {}) => ({
  latitude: faker.location.latitude(),
  longitude: faker.location.longitude(),
  altitude: faker.number.float({ min: 0, max: 1000 }),
  accuracy: faker.number.float({ min: 1, max: 20 }),
  timestamp: Date.now(),
  address: {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    country: faker.location.country(),
    postalCode: faker.location.zipCode()
  },
  ...overrides
});

export const mockDeviceInfo = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.helpers.arrayElement([
    'iPhone 14 Pro', 'Samsung Galaxy S23', 'Google Pixel 7', 'OnePlus 11'
  ]),
  platform: faker.helpers.arrayElement(['ios', 'android']),
  version: faker.helpers.arrayElement(['16.0', '13.0', '14.0', '11.0']),
  model: faker.helpers.arrayElement([
    'iPhone15,2', 'SM-S911B', 'Pixel 7', 'CPH2449'
  ]),
  manufacturer: faker.helpers.arrayElement([
    'Apple', 'Samsung', 'Google', 'OnePlus'
  ]),
  isDevice: true,
  brand: faker.helpers.arrayElement([
    'Apple', 'samsung', 'google', 'oneplus'
  ]),
  fingerprint: faker.string.alphanumeric(64),
  hardware: faker.string.alphanumeric(16),
  host: faker.internet.domainName(),
  product: faker.string.alphanumeric(16),
  tags: faker.string.alphanumeric(16),
  type: faker.helpers.arrayElement(['user', 'eng']),
  buildId: faker.string.alphanumeric(16),
  display: faker.string.alphanumeric(32),
  systemName: faker.helpers.arrayElement(['iOS', 'Android']),
  systemVersion: faker.system.semver(),
  ...overrides
});

export const mockNetworkInfo = (overrides = {}) => ({
  type: faker.helpers.arrayElement([
    'wifi', 'cellular', 'bluetooth', 'ethernet', 'vpn', 'other'
  ]),
  isConnected: faker.datatype.boolean({ probability: 0.9 }),
  isInternetReachable: faker.datatype.boolean({ probability: 0.85 }),
  details: {
    isConnectionExpensive: faker.datatype.boolean({ probability: 0.3 }),
    ssid: faker.internet.domainWord(),
    bssid: faker.internet.mac(),
    strength: faker.number.int({ min: -100, max: -30 }),
    ipAddress: faker.internet.ipv4(),
    subnet: faker.internet.ipv4(),
    frequency: faker.number.int({ min: 2400, max: 5800 }),
    linkSpeed: faker.number.int({ min: 10, max: 1000 }),
    rxLinkSpeed: faker.number.int({ min: 10, max: 1000 }),
    txLinkSpeed: faker.number.int({ min: 10, max: 1000 })
  },
  ...overrides
});

export const mockBiometricData = (overrides = {}) => ({
  isAvailable: faker.datatype.boolean({ probability: 0.8 }),
  supportedTypes: faker.helpers.arrayElements([
    'fingerprint', 'faceId', 'iris', 'voice'
  ], { min: 1, max: 3 }),
  isEnrolled: faker.datatype.boolean({ probability: 0.7 }),
  isHardwareDetected: faker.datatype.boolean({ probability: 0.9 }),
  hasCompatibleFingerprint: faker.datatype.boolean({ probability: 0.8 }),
  securityLevel: faker.helpers.arrayElement([
    'weak', 'strong', 'very_strong'
  ]),
  ...overrides
});

export const mockPushNotification = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.hacker.noun() + ' Security Alert',
  body: faker.lorem.sentence(),
  data: {
    type: faker.helpers.arrayElement([
      'CRITICAL_ALERT', 'INCIDENT_UPDATE', 'THREAT_DETECTED', 'SYSTEM_STATUS'
    ]),
    severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    entityId: faker.string.uuid(),
    timestamp: new Date().toISOString(),
    actionUrl: faker.internet.url()
  },
  sound: faker.helpers.arrayElement(['default', 'critical', 'warning']),
  badge: faker.number.int({ min: 0, max: 99 }),
  priority: faker.helpers.arrayElement(['default', 'high', 'max']),
  channelId: faker.helpers.arrayElement([
    'critical_alerts', 'incident_updates', 'system_notifications'
  ]),
  ...overrides
});

export const mockCameraData = (overrides = {}) => ({
  uri: faker.image.url(),
  width: faker.number.int({ min: 1920, max: 4096 }),
  height: faker.number.int({ min: 1080, max: 3072 }),
  type: faker.helpers.arrayElement(['image', 'video']),
  base64: faker.string.alphanumeric(1000),
  exif: {
    DateTime: new Date().toISOString(),
    GPS: {
      Latitude: faker.location.latitude(),
      Longitude: faker.location.longitude(),
      Altitude: faker.number.float({ min: 0, max: 1000 })
    },
    Make: faker.helpers.arrayElement(['Apple', 'Samsung', 'Google']),
    Model: faker.helpers.arrayElement([
      'iPhone 14 Pro', 'Galaxy S23', 'Pixel 7'
    ]),
    Orientation: faker.number.int({ min: 1, max: 8 }),
    XResolution: faker.number.int({ min: 72, max: 300 }),
    YResolution: faker.number.int({ min: 72, max: 300 })
  },
  ...overrides
});

export const mockQRCodeData = (overrides = {}) => ({
  type: faker.helpers.arrayElement([
    'incident_report', 'asset_tag', 'threat_indicator', 'authentication'
  ]),
  data: faker.string.alphanumeric(32),
  bounds: {
    origin: {
      x: faker.number.int({ min: 0, max: 100 }),
      y: faker.number.int({ min: 0, max: 100 })
    },
    size: {
      width: faker.number.int({ min: 100, max: 300 }),
      height: faker.number.int({ min: 100, max: 300 })
    }
  },
  cornerPoints: [
    { x: faker.number.int({ min: 0, max: 100 }), y: faker.number.int({ min: 0, max: 100 }) },
    { x: faker.number.int({ min: 100, max: 200 }), y: faker.number.int({ min: 0, max: 100 }) },
    { x: faker.number.int({ min: 100, max: 200 }), y: faker.number.int({ min: 100, max: 200 }) },
    { x: faker.number.int({ min: 0, max: 100 }), y: faker.number.int({ min: 100, max: 200 }) }
  ],
  ...overrides
});

export const mockOfflineQueueItem = (overrides = {}) => ({
  id: faker.string.uuid(),
  type: faker.helpers.arrayElement([
    'CREATE_INCIDENT', 'UPDATE_ALERT', 'SYNC_DATA', 'UPLOAD_IMAGE'
  ]),
  data: {
    endpoint: faker.internet.url(),
    method: faker.helpers.arrayElement(['POST', 'PUT', 'PATCH']),
    payload: {
      id: faker.string.uuid(),
      timestamp: new Date().toISOString(),
      data: faker.lorem.paragraph()
    }
  },
  priority: faker.number.int({ min: 1, max: 10 }),
  attempts: faker.number.int({ min: 0, max: 3 }),
  maxAttempts: 3,
  createdAt: faker.date.recent({ days: 1 }).toISOString(),
  scheduledFor: faker.date.future({ days: 1 }).toISOString(),
  status: faker.helpers.arrayElement(['PENDING', 'PROCESSING', 'FAILED', 'SUCCESS']),
  error: null,
  ...overrides
});

export const mockSensorData = (overrides = {}) => ({
  accelerometer: {
    x: faker.number.float({ min: -10, max: 10 }),
    y: faker.number.float({ min: -10, max: 10 }),
    z: faker.number.float({ min: -10, max: 10 }),
    timestamp: Date.now()
  },
  gyroscope: {
    x: faker.number.float({ min: -5, max: 5 }),
    y: faker.number.float({ min: -5, max: 5 }),
    z: faker.number.float({ min: -5, max: 5 }),
    timestamp: Date.now()
  },
  magnetometer: {
    x: faker.number.float({ min: -100, max: 100 }),
    y: faker.number.float({ min: -100, max: 100 }),
    z: faker.number.float({ min: -100, max: 100 }),
    timestamp: Date.now()
  },
  barometer: {
    pressure: faker.number.float({ min: 950, max: 1050 }),
    relativeAltitude: faker.number.float({ min: -100, max: 1000 }),
    timestamp: Date.now()
  },
  ...overrides
});

export const mockSecureStorageData = (overrides = {}) => ({
  authToken: faker.string.alphanumeric(64),
  refreshToken: faker.string.alphanumeric(64),
  userId: faker.string.uuid(),
  userProfile: {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: faker.helpers.arrayElement(['ADMIN', 'ANALYST', 'USER']),
    permissions: faker.helpers.arrayElements([
      'READ_THREATS', 'WRITE_INCIDENTS', 'MANAGE_ASSETS'
    ], { min: 1, max: 3 })
  },
  deviceId: faker.string.uuid(),
  encryptionKey: faker.string.alphanumeric(32),
  biometricToken: faker.string.alphanumeric(32),
  lastSync: new Date().toISOString(),
  appVersion: faker.system.semver(),
  ...overrides
});

export const mockAppStateData = (overrides = {}) => ({
  currentState: faker.helpers.arrayElement(['active', 'background', 'inactive']),
  previousState: faker.helpers.arrayElement(['active', 'background', 'inactive']),
  isInForeground: faker.datatype.boolean({ probability: 0.7 }),
  isVisible: faker.datatype.boolean({ probability: 0.8 }),
  hasFocus: faker.datatype.boolean({ probability: 0.8 }),
  memoryWarning: faker.datatype.boolean({ probability: 0.1 }),
  batteryLevel: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
  batteryState: faker.helpers.arrayElement([
    'unknown', 'unplugged', 'charging', 'full'
  ]),
  isLowPowerMode: faker.datatype.boolean({ probability: 0.2 }),
  screenBrightness: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
  ...overrides
});

export const mockPerformanceMetrics = (overrides = {}) => ({
  timestamp: Date.now(),
  memoryUsage: {
    used: faker.number.int({ min: 50, max: 500 }), // MB
    total: faker.number.int({ min: 1000, max: 8000 }), // MB
    available: faker.number.int({ min: 500, max: 4000 }), // MB
  },
  cpuUsage: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
  batteryLevel: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
  diskUsage: {
    used: faker.number.int({ min: 10, max: 100 }), // GB
    total: faker.number.int({ min: 64, max: 512 }), // GB
    available: faker.number.int({ min: 10, max: 200 }) // GB
  },
  networkLatency: faker.number.int({ min: 10, max: 500 }), // ms
  renderTime: faker.number.float({ min: 8, max: 32, fractionDigits: 2 }), // ms
  jsHeapSize: faker.number.int({ min: 10, max: 100 }), // MB
  bundleSize: faker.number.int({ min: 5, max: 50 }), // MB
  ...overrides
});

export const mockAnalyticsEvent = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.helpers.arrayElement([
    'screen_view', 'threat_viewed', 'incident_created', 'alert_acknowledged',
    'search_performed', 'filter_applied', 'export_data', 'user_login'
  ]),
  parameters: {
    screen_name: faker.helpers.arrayElement([
      'Dashboard', 'ThreatDetails', 'IncidentManagement', 'AlertsList'
    ]),
    user_id: faker.string.uuid(),
    session_id: faker.string.uuid(),
    app_version: faker.system.semver(),
    platform: faker.helpers.arrayElement(['ios', 'android']),
    device_model: faker.helpers.arrayElement([
      'iPhone14,2', 'SM-S911B', 'Pixel 7'
    ]),
    network_type: faker.helpers.arrayElement(['wifi', 'cellular']),
    battery_level: faker.number.int({ min: 0, max: 100 }),
    memory_usage: faker.number.int({ min: 50, max: 500 })
  },
  timestamp: new Date().toISOString(),
  userId: faker.string.uuid(),
  sessionId: faker.string.uuid(),
  deviceId: faker.string.uuid(),
  ...overrides
});

export const mockCrashReport = (overrides = {}) => ({
  id: faker.string.uuid(),
  timestamp: new Date().toISOString(),
  appVersion: faker.system.semver(),
  platform: faker.helpers.arrayElement(['ios', 'android']),
  deviceModel: faker.helpers.arrayElement([
    'iPhone14,2', 'SM-S911B', 'Pixel 7'
  ]),
  osVersion: faker.system.semver(),
  error: {
    name: faker.helpers.arrayElement([
      'TypeError', 'ReferenceError', 'NetworkError', 'SecurityError'
    ]),
    message: faker.lorem.sentence(),
    stack: faker.lorem.paragraphs(3, '\n'),
    componentStack: faker.lorem.paragraphs(2, '\n')
  },
  breadcrumbs: Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => ({
    timestamp: faker.date.recent({ hours: 1 }).toISOString(),
    message: faker.lorem.sentence(),
    category: faker.helpers.arrayElement([
      'navigation', 'user-interaction', 'network', 'ui'
    ]),
    level: faker.helpers.arrayElement(['info', 'warning', 'error'])
  })),
  userId: faker.string.uuid(),
  sessionId: faker.string.uuid(),
  tags: {
    environment: faker.helpers.arrayElement(['development', 'staging', 'production']),
    severity: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
    handled: faker.datatype.boolean()
  },
  ...overrides
});

// Mock test scenarios
export const mockOfflineScenario = () => ({
  isConnected: false,
  isInternetReachable: false,
  cachedData: {
    dashboardData: {
      totalThreats: 1247,
      activeIncidents: 23,
      criticalAlerts: 8,
      systemHealth: 'HEALTHY',
      lastSync: faker.date.recent({ hours: 2 }).toISOString()
    },
    events: Array.from({ length: 10 }, () => mockSecurityEventData()),
    queuedActions: Array.from({ length: 3 }, () => mockOfflineQueueItem())
  }
});

export const mockLowMemoryScenario = () => ({
  memoryUsage: {
    used: 950, // Close to limit
    total: 1000,
    available: 50
  },
  performanceMetrics: mockPerformanceMetrics({
    memoryUsage: { used: 950, total: 1000, available: 50 },
    cpuUsage: 85.5,
    renderTime: 28.3
  }),
  memoryWarning: true
});

export const mockBatteryLowScenario = () => ({
  batteryLevel: 0.15, // 15%
  isLowPowerMode: true,
  performanceMetrics: mockPerformanceMetrics({
    batteryLevel: 15,
    cpuUsage: 45.2, // Reduced due to power saving
    networkLatency: 250 // Slower due to power saving
  })
});

// Batch factory functions for mobile
export const createMockNotifications = (count: number) =>
  Array.from({ length: count }, () => mockPushNotification());

export const createMockQueueItems = (count: number) =>
  Array.from({ length: count }, () => mockOfflineQueueItem());

export const createMockAnalyticsEvents = (count: number) =>
  Array.from({ length: count }, () => mockAnalyticsEvent());

export const createMockCrashReports = (count: number) =>
  Array.from({ length: count }, () => mockCrashReport());

// Mock navigation actions
export const mockNavigationActions = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => false),
  getId: jest.fn(() => 'test-route-id'),
  getParent: jest.fn(),
  getState: jest.fn(() => ({
    key: 'test-state',
    index: 0,
    routeNames: ['Dashboard'],
    routes: [{ key: 'dashboard', name: 'Dashboard' }]
  }))
};

// Mock theme provider data
export const mockSecurityTheme = {
  colors: {
    primary: '#1e40af',
    secondary: '#64748b',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0284c7',
    background: '#ffffff',
    surface: '#f8fafc',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onSuccess: '#ffffff',
    onWarning: '#ffffff',
    onError: '#ffffff',
    onInfo: '#ffffff',
    onBackground: '#0f172a',
    onSurface: '#334155',
    border: '#e2e8f0',
    divider: '#f1f5f9',
    disabled: '#94a3b8',
    placeholder: '#64748b'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    h4: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
    body1: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 }
  },
  shadows: {
    sm: {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2
    },
    md: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4
    },
    lg: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8
    }
  }
};