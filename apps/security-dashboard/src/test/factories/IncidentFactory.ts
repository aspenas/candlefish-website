import { faker } from '@faker-js/faker';
import { SecurityEventFactory } from './SecurityEventFactory';

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' | 'FALSE_POSITIVE';
  assignee?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  events: any[];
  assets_affected: string[];
  tags: string[];
  priority: number;
  source: string;
  category: string;
  timeline?: Array<{
    timestamp: string;
    action: string;
    user: string;
    details?: string;
  }>;
}

export class IncidentFactory {
  static create(overrides: Partial<Incident> = {}): Incident {
    const createdAt = faker.date.past();
    const updatedAt = faker.date.between({ from: createdAt, to: new Date() });
    
    return {
      id: faker.string.uuid(),
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      status: faker.helpers.arrayElement(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED', 'FALSE_POSITIVE']),
      assignee: faker.person.fullName(),
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
      resolved_at: faker.helpers.maybe(() => 
        faker.date.between({ from: updatedAt, to: new Date() }).toISOString()
      ),
      events: SecurityEventFactory.createBatch(faker.number.int({ min: 1, max: 5 })),
      assets_affected: Array.from(
        { length: faker.number.int({ min: 1, max: 8 }) },
        () => faker.helpers.arrayElement(['SERVER', 'WORKSTATION', 'NETWORK', 'APPLICATION']) + 
              '-' + faker.string.alphanumeric(3).toUpperCase()
      ),
      tags: faker.helpers.arrayElements([
        'malware', 'phishing', 'intrusion', 'data-breach', 'insider-threat',
        'ddos', 'ransomware', 'apt', 'vulnerability', 'compliance',
      ], { min: 1, max: 4 }),
      priority: faker.number.int({ min: 1, max: 5 }),
      source: faker.helpers.arrayElement([
        'SIEM', 'EDR', 'Network Monitor', 'User Report', 'Threat Intelligence',
        'Vulnerability Scanner', 'Email Security', 'Web Gateway',
      ]),
      category: faker.helpers.arrayElement([
        'Security Breach', 'Policy Violation', 'System Compromise',
        'Data Loss', 'Malware Infection', 'Unauthorized Access',
        'Network Intrusion', 'Phishing Attack',
      ]),
      timeline: Array.from(
        { length: faker.number.int({ min: 2, max: 8 }) },
        (_, index) => ({
          timestamp: faker.date.between({
            from: createdAt,
            to: updatedAt,
          }).toISOString(),
          action: faker.helpers.arrayElement([
            'Incident Created', 'Investigation Started', 'Evidence Collected',
            'Containment Applied', 'Analysis Completed', 'Mitigation Deployed',
            'Status Updated', 'Escalation Triggered', 'Resolution Implemented',
          ]),
          user: faker.person.fullName(),
          details: faker.helpers.maybe(() => faker.lorem.sentence()),
        })
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      ...overrides,
    };
  }

  static createBatch(count: number, overrides: Partial<Incident> = {}): Incident[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createCriticalIncident(overrides: Partial<Incident> = {}): Incident {
    return this.create({
      severity: 'CRITICAL',
      status: 'INVESTIGATING',
      priority: 1,
      category: 'Security Breach',
      tags: ['data-breach', 'critical', 'escalated'],
      ...overrides,
    });
  }

  static createResolvedIncident(overrides: Partial<Incident> = {}): Incident {
    const createdAt = faker.date.past();
    const resolvedAt = faker.date.between({ from: createdAt, to: new Date() });
    
    return this.create({
      status: 'RESOLVED',
      resolved_at: resolvedAt.toISOString(),
      updated_at: resolvedAt.toISOString(),
      ...overrides,
    });
  }

  static createPhishingIncident(overrides: Partial<Incident> = {}): Incident {
    return this.create({
      title: 'Phishing Campaign Detected',
      description: 'Multiple users received suspicious emails attempting to steal credentials',
      category: 'Phishing Attack',
      tags: ['phishing', 'email', 'credentials'],
      priority: 2,
      ...overrides,
    });
  }
}

export interface Asset {
  id: string;
  name: string;
  type: 'SERVER' | 'WORKSTATION' | 'NETWORK_DEVICE' | 'APPLICATION' | 'DATABASE' | 'MOBILE_DEVICE';
  ip_address?: string;
  mac_address?: string;
  os: string;
  os_version: string;
  location: string;
  owner: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
  last_seen: string;
  vulnerabilities?: Array<{
    id: string;
    severity: string;
    cve_id?: string;
    description: string;
    status: 'OPEN' | 'PATCHED' | 'MITIGATED' | 'ACCEPTED';
  }>;
}

export class AssetFactory {
  static create(overrides: Partial<Asset> = {}): Asset {
    return {
      id: faker.string.uuid(),
      name: faker.helpers.arrayElement(['SERVER', 'WS', 'DB', 'APP', 'NET']) + 
            '-' + faker.string.alphanumeric(3).toUpperCase(),
      type: faker.helpers.arrayElement([
        'SERVER', 'WORKSTATION', 'NETWORK_DEVICE', 'APPLICATION', 'DATABASE', 'MOBILE_DEVICE'
      ]),
      ip_address: faker.internet.ipv4(),
      mac_address: faker.internet.mac(),
      os: faker.helpers.arrayElement([
        'Windows Server 2019', 'Windows Server 2022', 'Windows 10', 'Windows 11',
        'Ubuntu 20.04', 'Ubuntu 22.04', 'RHEL 8', 'RHEL 9', 'macOS Monterey',
        'macOS Ventura', 'iOS 16', 'Android 13'
      ]),
      os_version: faker.system.semver(),
      location: faker.helpers.arrayElement([
        'DC-East-1', 'DC-West-1', 'Office-NYC', 'Office-LA', 'Office-CHI',
        'Cloud-AWS', 'Cloud-Azure', 'Remote-Work', 'Branch-Office'
      ]),
      owner: faker.person.fullName(),
      criticality: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED']),
      last_seen: faker.date.recent().toISOString(),
      vulnerabilities: Array.from(
        { length: faker.number.int({ min: 0, max: 5 }) },
        () => ({
          id: faker.string.uuid(),
          severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
          cve_id: faker.helpers.maybe(() => 'CVE-' + faker.date.recent().getFullYear() + '-' + faker.string.numeric(4)),
          description: faker.lorem.sentence(),
          status: faker.helpers.arrayElement(['OPEN', 'PATCHED', 'MITIGATED', 'ACCEPTED']),
        })
      ),
      ...overrides,
    };
  }

  static createBatch(count: number, overrides: Partial<Asset> = {}): Asset[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createCriticalAsset(overrides: Partial<Asset> = {}): Asset {
    return this.create({
      criticality: 'CRITICAL',
      type: 'SERVER',
      name: 'PROD-DB-001',
      ...overrides,
    });
  }
}