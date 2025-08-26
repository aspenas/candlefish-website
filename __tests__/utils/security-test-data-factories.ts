import { faker } from '@faker-js/faker';

// Security Dashboard specific types
export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AssetType {
  APPLICATION = 'APPLICATION',
  DATABASE = 'DATABASE',
  API = 'API',
  WEBSITE = 'WEBSITE',
}

export enum Environment {
  DEVELOPMENT = 'DEVELOPMENT',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
}

export enum Platform {
  KUBERNETES = 'KUBERNETES',
  AWS = 'AWS',
  GCP = 'GCP',
  AZURE = 'AZURE',
  ON_PREMISE = 'ON_PREMISE',
}

// Base factory interface
interface FactoryOptions {
  count?: number;
  overrides?: Partial<any>;
}

// Utility functions
export const randomChoice = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const randomDate = (start: Date, end: Date): string => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

export const randomBoolean = (probability = 0.5): boolean => {
  return Math.random() < probability;
};

// Security Dashboard Test Data Factories

export interface AssetFactoryOptions extends FactoryOptions {
  organizationId?: string;
  assetType?: AssetType;
  environment?: Environment;
  platform?: Platform;
  healthStatus?: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface VulnerabilityFactoryOptions extends FactoryOptions {
  assetId?: string;
  severity?: ThreatLevel;
  status?: string;
  hasResolution?: boolean;
}

export interface SecurityEventFactoryOptions extends FactoryOptions {
  assetId?: string;
  organizationId?: string;
  eventType?: string;
  severity?: ThreatLevel;
  acknowledged?: boolean;
}

export interface AlertFactoryOptions extends FactoryOptions {
  organizationId?: string;
  assetId?: string;
  severity?: ThreatLevel;
  status?: string;
  assignedTo?: string;
}

export interface UserFactoryOptions extends FactoryOptions {
  organizationId?: string;
  role?: string;
  isActive?: boolean;
}

// Asset Factory
export const createAsset = (options: AssetFactoryOptions = {}) => {
  const {
    organizationId = faker.string.uuid(),
    assetType = randomChoice(Object.values(AssetType)),
    environment = randomChoice(Object.values(Environment)),
    platform = randomChoice(Object.values(Platform)),
    healthStatus = randomChoice(['HEALTHY', 'WARNING', 'CRITICAL']),
    overrides = {},
  } = options;

  const baseAsset = {
    id: faker.string.uuid(),
    organizationId,
    name: faker.company.name() + ' ' + faker.hacker.noun(),
    assetType,
    environment,
    platform,
    url: assetType === AssetType.WEBSITE || assetType === AssetType.API
      ? faker.internet.url()
      : null,
    description: faker.lorem.sentence(),
    healthStatus,
    createdAt: randomDate(new Date('2023-01-01'), new Date()),
    updatedAt: randomDate(new Date('2023-06-01'), new Date()),
    ...overrides,
  };

  return baseAsset;
};

export const createAssets = (count: number, options: AssetFactoryOptions = {}) => {
  return Array.from({ length: count }, () => createAsset(options));
};

// Vulnerability Factory
export const createVulnerability = (options: VulnerabilityFactoryOptions = {}) => {
  const {
    assetId = faker.string.uuid(),
    severity = randomChoice(Object.values(ThreatLevel)),
    status = randomChoice(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']),
    hasResolution = randomBoolean(0.3),
    overrides = {},
  } = options;

  const detectedAt = new Date(randomDate(new Date('2023-01-01'), new Date()));
  const resolvedAt = hasResolution && status === 'RESOLVED'
    ? new Date(detectedAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) // Within 30 days
    : null;

  return {
    id: faker.string.uuid(),
    assetId,
    cveId: randomBoolean(0.7) ? `CVE-${faker.date.recent({ days: 365 }).getFullYear()}-${faker.string.numeric(4)}` : null,
    title: `${severity.toLowerCase()} ${faker.hacker.noun()} vulnerability`,
    description: faker.lorem.paragraph(),
    severity,
    status,
    detectedAt: detectedAt.toISOString(),
    resolvedAt: resolvedAt?.toISOString() || null,
    createdAt: detectedAt.toISOString(),
    updatedAt: resolvedAt?.toISOString() || detectedAt.toISOString(),
    ...overrides,
  };
};

export const createVulnerabilities = (count: number, options: VulnerabilityFactoryOptions = {}) => {
  return Array.from({ length: count }, () => createVulnerability(options));
};

// Security Event Factory
export const createSecurityEvent = (options: SecurityEventFactoryOptions = {}) => {
  const {
    assetId = faker.string.uuid(),
    organizationId = faker.string.uuid(),
    eventType = randomChoice([
      'LOGIN_ATTEMPT',
      'DATA_ACCESS',
      'CONFIGURATION_CHANGE',
      'SUSPICIOUS_ACTIVITY',
      'POLICY_VIOLATION',
      'MALWARE_DETECTED',
      'BRUTE_FORCE_ATTACK',
      'UNAUTHORIZED_ACCESS',
    ]),
    severity = randomChoice(Object.values(ThreatLevel)),
    acknowledged = randomBoolean(0.4),
    overrides = {},
  } = options;

  const eventTitles: Record<string, string> = {
    LOGIN_ATTEMPT: 'Suspicious login attempt detected',
    DATA_ACCESS: 'Unusual data access pattern',
    CONFIGURATION_CHANGE: 'Security configuration modified',
    SUSPICIOUS_ACTIVITY: 'Suspicious user activity detected',
    POLICY_VIOLATION: 'Security policy violation',
    MALWARE_DETECTED: 'Malware signature detected',
    BRUTE_FORCE_ATTACK: 'Brute force attack detected',
    UNAUTHORIZED_ACCESS: 'Unauthorized access attempt',
  };

  return {
    id: faker.string.uuid(),
    assetId,
    organizationId,
    eventType,
    severity,
    title: eventTitles[eventType] || faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    metadata: JSON.stringify({
      sourceIP: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      location: `${faker.location.city()}, ${faker.location.country()}`,
      timestamp: new Date().toISOString(),
    }),
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    acknowledged,
    createdAt: randomDate(new Date('2024-01-01'), new Date()),
    ...overrides,
  };
};

export const createSecurityEvents = (count: number, options: SecurityEventFactoryOptions = {}) => {
  return Array.from({ length: count }, () => createSecurityEvent(options));
};

// Alert Factory
export const createAlert = (options: AlertFactoryOptions = {}) => {
  const {
    organizationId = faker.string.uuid(),
    assetId = randomBoolean(0.8) ? faker.string.uuid() : null,
    severity = randomChoice(Object.values(ThreatLevel)),
    status = randomChoice(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']),
    assignedTo = randomBoolean(0.6) ? faker.string.uuid() : null,
    overrides = {},
  } = options;

  const triggeredAt = new Date(randomDate(new Date('2024-01-01'), new Date()));
  const resolvedAt = status === 'RESOLVED'
    ? new Date(triggeredAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) // Within 7 days
    : null;

  return {
    id: faker.string.uuid(),
    assetId,
    organizationId,
    title: `${severity} severity alert: ${faker.hacker.noun()}`,
    description: faker.lorem.paragraph(),
    severity,
    status,
    ruleId: `RULE_${faker.string.alphanumeric(8).toUpperCase()}`,
    triggeredAt: triggeredAt.toISOString(),
    resolvedAt: resolvedAt?.toISOString() || null,
    assignedTo,
    createdAt: triggeredAt.toISOString(),
    updatedAt: resolvedAt?.toISOString() || triggeredAt.toISOString(),
    ...overrides,
  };
};

export const createAlerts = (count: number, options: AlertFactoryOptions = {}) => {
  return Array.from({ length: count }, () => createAlert(options));
};

// User Factory
export const createUser = (options: UserFactoryOptions = {}) => {
  const {
    organizationId = faker.string.uuid(),
    role = randomChoice(['ADMIN', 'SECURITY_ANALYST', 'VIEWER']),
    isActive = randomBoolean(0.9),
    overrides = {},
  } = options;

  return {
    id: faker.string.uuid(),
    organizationId,
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role,
    isActive,
    lastLoginAt: randomDate(new Date('2024-01-01'), new Date()),
    createdAt: randomDate(new Date('2023-01-01'), new Date()),
    updatedAt: randomDate(new Date('2024-01-01'), new Date()),
    ...overrides,
  };
};

export const createUsers = (count: number, options: UserFactoryOptions = {}) => {
  return Array.from({ length: count }, () => createUser(options));
};

// Organization Factory
export const createOrganization = (overrides: Partial<any> = {}) => {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    domain: faker.internet.domainName(),
    plan: randomChoice(['FREE', 'PROFESSIONAL', 'ENTERPRISE']),
    settings: {
      alertingEnabled: true,
      complianceFrameworks: randomChoice([
        ['SOC2'],
        ['ISO27001'],
        ['SOC2', 'ISO27001'],
        ['PCI-DSS', 'SOC2'],
      ]),
      retentionPeriod: randomChoice([30, 90, 365]),
    },
    createdAt: randomDate(new Date('2023-01-01'), new Date('2023-12-31')),
    updatedAt: randomDate(new Date('2024-01-01'), new Date()),
    ...overrides,
  };
};

// Kong API Status Factory
export const createKongAPIStatus = (overrides: Partial<any> = {}) => {
  const isVulnerable = randomBoolean(0.3);
  const protocol = isVulnerable ? 'HTTP' : 'HTTPS';
  const riskLevel = isVulnerable ? ThreatLevel.CRITICAL : ThreatLevel.LOW;

  return {
    id: faker.string.uuid(),
    isSecure: !isVulnerable,
    protocol,
    isVulnerable,
    vulnerabilityDescription: isVulnerable
      ? 'Kong Admin API is accessible over HTTP protocol, exposing sensitive configuration'
      : null,
    riskLevel,
    recommendedActions: isVulnerable
      ? [
          'Immediately restrict Admin API access to internal networks only',
          'Configure Admin API to use HTTPS with valid SSL certificates',
          'Implement IP allowlisting for Admin API access',
        ]
      : [
          'Continue monitoring Admin API access patterns',
          'Regularly review Admin API authentication methods',
        ],
    lastChecked: randomDate(new Date(Date.now() - 60 * 60 * 1000), new Date()), // Last hour
    createdAt: randomDate(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()), // Last 24 hours
    ...overrides,
  };
};

// Security Overview Factory
export const createSecurityOverview = (organizationId: string, overrides: Partial<any> = {}) => {
  const totalAssets = faker.number.int({ min: 10, max: 100 });
  const criticalVulns = faker.number.int({ min: 0, max: Math.floor(totalAssets * 0.1) });
  const highVulns = faker.number.int({ min: 0, max: Math.floor(totalAssets * 0.2) });
  const mediumVulns = faker.number.int({ min: 0, max: Math.floor(totalAssets * 0.3) });
  const lowVulns = faker.number.int({ min: 0, max: Math.floor(totalAssets * 0.4) });
  const activeAlerts = faker.number.int({ min: 0, max: 20 });

  // Calculate compliance score based on vulnerabilities
  const totalVulns = criticalVulns + highVulns + mediumVulns + lowVulns;
  const complianceScore = totalAssets > 0
    ? Math.max(0, 100 - (totalVulns / totalAssets) * 100)
    : 100;

  // Determine threat level
  let threatLevel = ThreatLevel.LOW;
  if (criticalVulns > 0 || activeAlerts > 10) {
    threatLevel = ThreatLevel.CRITICAL;
  } else if (highVulns > 5 || activeAlerts > 5) {
    threatLevel = ThreatLevel.HIGH;
  } else if (mediumVulns > 0 || activeAlerts > 0) {
    threatLevel = ThreatLevel.MEDIUM;
  }

  return {
    organizationId,
    totalAssets,
    criticalVulnerabilities: criticalVulns,
    activeAlerts,
    complianceScore: Math.round(complianceScore * 10) / 10,
    threatLevel,
    vulnerabilitiesBySeverity: [
      { severity: ThreatLevel.CRITICAL, count: criticalVulns },
      { severity: ThreatLevel.HIGH, count: highVulns },
      { severity: ThreatLevel.MEDIUM, count: mediumVulns },
      { severity: ThreatLevel.LOW, count: lowVulns },
    ].filter(item => item.count > 0),
    kongAdminApiVulnerability: randomBoolean(0.3) ? {
      isVulnerable: true,
      riskLevel: ThreatLevel.CRITICAL,
      recommendedActions: [
        'Immediately restrict Admin API access to internal networks only',
        'Configure Admin API to use HTTPS with valid SSL certificates',
      ],
    } : null,
    ...overrides,
  };
};

// Realistic test scenario factories
export const createRealisticSecurityScenario = (organizationId: string) => {
  // Create base organization
  const organization = createOrganization({ id: organizationId });

  // Create realistic asset distribution
  const webApps = createAssets(5, {
    organizationId,
    assetType: AssetType.APPLICATION,
    environment: Environment.PRODUCTION,
    platform: Platform.KUBERNETES,
  });

  const apis = createAssets(8, {
    organizationId,
    assetType: AssetType.API,
    environment: Environment.PRODUCTION,
    platform: randomChoice([Platform.AWS, Platform.GCP]),
  });

  const databases = createAssets(3, {
    organizationId,
    assetType: AssetType.DATABASE,
    environment: randomChoice([Environment.PRODUCTION, Environment.STAGING]),
    platform: Platform.AWS,
  });

  const testAssets = createAssets(4, {
    organizationId,
    environment: Environment.STAGING,
  });

  const allAssets = [...webApps, ...apis, ...databases, ...testAssets];

  // Create vulnerabilities for some assets
  const vulnerabilities: any[] = [];
  allAssets.forEach(asset => {
    const vulnCount = Math.random() > 0.7 ? faker.number.int({ min: 1, max: 3 }) : 0;
    for (let i = 0; i < vulnCount; i++) {
      vulnerabilities.push(createVulnerability({
        assetId: asset.id,
        severity: asset.environment === Environment.PRODUCTION
          ? randomChoice([ThreatLevel.HIGH, ThreatLevel.CRITICAL])
          : randomChoice(Object.values(ThreatLevel)),
      }));
    }
  });

  // Create security events
  const securityEvents: any[] = [];
  allAssets.forEach(asset => {
    const eventCount = faker.number.int({ min: 0, max: 10 });
    for (let i = 0; i < eventCount; i++) {
      securityEvents.push(createSecurityEvent({
        assetId: asset.id,
        organizationId,
      }));
    }
  });

  // Create alerts based on vulnerabilities and events
  const alerts: any[] = [];
  const criticalVulns = vulnerabilities.filter(v => v.severity === ThreatLevel.CRITICAL);
  criticalVulns.forEach(vuln => {
    if (Math.random() > 0.3) { // 70% chance to create alert for critical vuln
      alerts.push(createAlert({
        organizationId,
        assetId: vuln.assetId,
        severity: ThreatLevel.CRITICAL,
        status: randomChoice(['OPEN', 'IN_PROGRESS']),
      }));
    }
  });

  // Add some general alerts
  const generalAlertCount = faker.number.int({ min: 2, max: 8 });
  for (let i = 0; i < generalAlertCount; i++) {
    alerts.push(createAlert({ organizationId }));
  }

  // Create users for the organization
  const users = [
    createUser({
      organizationId,
      role: 'ADMIN',
      email: 'admin@example.com',
    }),
    ...createUsers(3, {
      organizationId,
      role: 'SECURITY_ANALYST',
    }),
    ...createUsers(2, {
      organizationId,
      role: 'VIEWER',
    }),
  ];

  return {
    organization,
    assets: allAssets,
    vulnerabilities,
    securityEvents,
    alerts,
    users,
    securityOverview: createSecurityOverview(organizationId),
    kongApiStatus: createKongAPIStatus(),
  };
};

// Test fixture presets for common scenarios
export const testFixtures = {
  // Empty organization - good for testing empty states
  emptyOrganization: (organizationId: string) => ({
    organization: createOrganization({ id: organizationId }),
    assets: [],
    vulnerabilities: [],
    securityEvents: [],
    alerts: [],
    users: [createUser({ organizationId, role: 'ADMIN' })],
    securityOverview: createSecurityOverview(organizationId, {
      totalAssets: 0,
      criticalVulnerabilities: 0,
      activeAlerts: 0,
      complianceScore: 100,
      threatLevel: ThreatLevel.LOW,
    }),
  }),

  // High-risk organization - lots of critical issues
  highRiskOrganization: (organizationId: string) => {
    const assets = createAssets(20, { organizationId });
    const criticalVulns = createVulnerabilities(15, {
      severity: ThreatLevel.CRITICAL,
      status: 'OPEN',
    });
    const criticalAlerts = createAlerts(12, {
      organizationId,
      severity: ThreatLevel.CRITICAL,
      status: 'OPEN',
    });

    return {
      organization: createOrganization({ id: organizationId }),
      assets,
      vulnerabilities: criticalVulns,
      securityEvents: createSecurityEvents(50, { organizationId }),
      alerts: criticalAlerts,
      users: createUsers(5, { organizationId }),
      securityOverview: createSecurityOverview(organizationId, {
        totalAssets: 20,
        criticalVulnerabilities: 15,
        activeAlerts: 12,
        threatLevel: ThreatLevel.CRITICAL,
        complianceScore: 25.5,
      }),
      kongApiStatus: createKongAPIStatus({ isVulnerable: true }),
    };
  },

  // Secure organization - minimal issues
  secureOrganization: (organizationId: string) => {
    const assets = createAssets(15, {
      organizationId,
      healthStatus: 'HEALTHY',
    });
    const minorVulns = createVulnerabilities(3, {
      severity: ThreatLevel.LOW,
      status: 'RESOLVED',
    });

    return {
      organization: createOrganization({ id: organizationId }),
      assets,
      vulnerabilities: minorVulns,
      securityEvents: createSecurityEvents(5, { organizationId }),
      alerts: [],
      users: createUsers(3, { organizationId }),
      securityOverview: createSecurityOverview(organizationId, {
        totalAssets: 15,
        criticalVulnerabilities: 0,
        activeAlerts: 0,
        threatLevel: ThreatLevel.LOW,
        complianceScore: 95.8,
      }),
      kongApiStatus: createKongAPIStatus({ isVulnerable: false }),
    };
  },
};

// Export all factory functions
export * from './security-test-data-factories';
