import { faker } from '@faker-js/faker';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  destination: string;
  description: string;
  mitre_tactics: string[];
  mitre_techniques: string[];
  raw_log?: string;
  metadata?: Record<string, any>;
}

export class SecurityEventFactory {
  static create(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
    return {
      id: faker.string.uuid(),
      timestamp: faker.date.recent().toISOString(),
      type: faker.helpers.arrayElement([
        'MALWARE_DETECTED',
        'INTRUSION_ATTEMPT',
        'SUSPICIOUS_NETWORK_ACTIVITY',
        'UNAUTHORIZED_ACCESS',
        'DATA_EXFILTRATION',
        'PHISHING_ATTEMPT',
        'ANOMALOUS_BEHAVIOR',
      ]),
      severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      source: faker.internet.ipv4(),
      destination: faker.internet.ipv4(),
      description: faker.lorem.sentence(),
      mitre_tactics: faker.helpers.arrayElements([
        'Initial Access',
        'Execution',
        'Persistence',
        'Privilege Escalation',
        'Defense Evasion',
        'Credential Access',
        'Discovery',
        'Lateral Movement',
        'Collection',
        'Command and Control',
        'Exfiltration',
        'Impact',
      ], { min: 1, max: 3 }),
      mitre_techniques: faker.helpers.arrayElements([
        'T1566.001', 'T1204.002', 'T1547.001', 'T1055.001',
        'T1027', 'T1003.001', 'T1057', 'T1021.001',
        'T1005', 'T1071.001', 'T1041', 'T1486',
      ], { min: 1, max: 4 }),
      raw_log: faker.lorem.paragraph(),
      metadata: {
        user_agent: faker.internet.userAgent(),
        process_name: faker.system.fileName(),
        process_id: faker.number.int({ min: 1000, max: 65535 }),
        file_hash: faker.string.alphanumeric(64),
      },
      ...overrides,
    };
  }

  static createBatch(count: number, overrides: Partial<SecurityEvent> = {}): SecurityEvent[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createCriticalEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
    return this.create({
      severity: 'CRITICAL',
      type: 'DATA_EXFILTRATION',
      mitre_tactics: ['Collection', 'Exfiltration'],
      mitre_techniques: ['T1005', 'T1041'],
      ...overrides,
    });
  }

  static createMalwareEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
    return this.create({
      type: 'MALWARE_DETECTED',
      severity: 'HIGH',
      mitre_tactics: ['Initial Access', 'Execution'],
      mitre_techniques: ['T1566.001', 'T1204.002'],
      ...overrides,
    });
  }
}

export interface ThreatIntelligence {
  id: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  first_seen: string;
  last_seen: string;
  indicators: Array<{
    type: 'IP' | 'DOMAIN' | 'HASH' | 'URL' | 'EMAIL';
    value: string;
    confidence: number;
  }>;
  mitre_mapping: {
    tactics: string[];
    techniques: string[];
  };
  source: string;
  tags: string[];
}

export class ThreatIntelligenceFactory {
  static create(overrides: Partial<ThreatIntelligence> = {}): ThreatIntelligence {
    return {
      id: faker.string.uuid(),
      name: faker.lorem.words(3),
      severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      confidence: faker.number.float({ min: 0.1, max: 1.0, multipleOf: 0.01 }),
      first_seen: faker.date.past().toISOString(),
      last_seen: faker.date.recent().toISOString(),
      indicators: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
        type: faker.helpers.arrayElement(['IP', 'DOMAIN', 'HASH', 'URL', 'EMAIL']),
        value: faker.internet.ip(),
        confidence: faker.number.float({ min: 0.1, max: 1.0, multipleOf: 0.01 }),
      })),
      mitre_mapping: {
        tactics: faker.helpers.arrayElements([
          'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
          'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
          'Collection', 'Command and Control', 'Exfiltration', 'Impact',
        ], { min: 1, max: 4 }),
        techniques: faker.helpers.arrayElements([
          'T1566.001', 'T1204.002', 'T1547.001', 'T1055.001',
          'T1027', 'T1003.001', 'T1057', 'T1021.001',
          'T1005', 'T1071.001', 'T1041', 'T1486',
        ], { min: 1, max: 5 }),
      },
      source: faker.helpers.arrayElement(['Commercial TI', 'Open Source', 'Internal Research', 'Government']),
      tags: faker.helpers.arrayElements([
        'apt', 'malware', 'phishing', 'ransomware', 'botnet',
        'c2', 'exfiltration', 'backdoor', 'trojan', 'worm',
      ], { min: 1, max: 4 }),
      ...overrides,
    };
  }

  static createBatch(count: number, overrides: Partial<ThreatIntelligence> = {}): ThreatIntelligence[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}