import { faker } from '@faker-js/faker';

// Enums for consistency
export enum ThreatSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IOCType {
  IP = 'IP',
  DOMAIN = 'DOMAIN',
  URL = 'URL',
  HASH = 'HASH',
  EMAIL = 'EMAIL',
  FILE_PATH = 'FILE_PATH'
}

export enum ThreatActorType {
  NATION_STATE = 'NATION_STATE',
  APT = 'APT',
  CYBERCRIMINAL = 'CYBERCRIMINAL',
  HACKTIVIST = 'HACKTIVIST',
  INSIDER = 'INSIDER'
}

export enum IncidentStatus {
  NEW = 'NEW',
  INVESTIGATING = 'INVESTIGATING',
  CONTAINED = 'CONTAINED',
  ERADICATED = 'ERADICATED',
  RECOVERED = 'RECOVERED',
  CLOSED = 'CLOSED'
}

// Threat Factory
export const mockThreatData = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.hacker.noun() + ' Advanced Persistent Threat',
  description: faker.lorem.sentences(2),
  severity: faker.helpers.enumValue(ThreatSeverity),
  confidence: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
  first_seen: faker.date.past({ years: 1 }).toISOString(),
  last_seen: faker.date.recent({ days: 30 }).toISOString(),
  created_at: faker.date.past({ years: 1 }).toISOString(),
  updated_at: faker.date.recent({ days: 7 }).toISOString(),
  version: faker.number.int({ min: 1, max: 10 }),
  tags: faker.helpers.arrayElements(['malware', 'phishing', 'apt', 'trojan', 'ransomware'], 
    { min: 1, max: 3 }),
  mitre_tactics: faker.helpers.arrayElements([
    'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
    'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
    'Collection', 'Command and Control', 'Exfiltration', 'Impact'
  ], { min: 1, max: 4 }),
  mitre_techniques: faker.helpers.arrayElements([
    'T1566.001', 'T1204.002', 'T1547.001', 'T1055', 'T1027',
    'T1003', 'T1082', 'T1021.001', 'T1119', 'T1105', 'T1041', 'T1486'
  ], { min: 1, max: 5 }),
  kill_chain_phases: faker.helpers.arrayElements([
    'reconnaissance', 'weaponization', 'delivery', 'exploitation',
    'installation', 'command-control', 'actions-objectives'
  ], { min: 1, max: 3 }),
  source: faker.company.name(),
  external_references: [
    {
      source_name: faker.company.name(),
      url: faker.internet.url(),
      description: faker.lorem.sentence()
    }
  ],
  indicators: [],
  associated_actors: [],
  campaigns: [],
  risk_score: faker.number.int({ min: 1, max: 100 }),
  affected_systems: faker.number.int({ min: 0, max: 50 }),
  is_active: faker.datatype.boolean(),
  tlp_marking: faker.helpers.arrayElement(['WHITE', 'GREEN', 'AMBER', 'RED']),
  ...overrides
});

// IOC Factory
export const mockIOCData = (overrides = {}) => {
  const type = overrides.type || faker.helpers.enumValue(IOCType);
  let value: string;

  // Generate appropriate value based on IOC type
  switch (type) {
    case IOCType.IP:
      value = faker.internet.ipv4();
      break;
    case IOCType.DOMAIN:
      value = faker.internet.domainName();
      break;
    case IOCType.URL:
      value = faker.internet.url();
      break;
    case IOCType.EMAIL:
      value = faker.internet.email();
      break;
    case IOCType.HASH:
      value = faker.string.hexadecimal({ length: 64, prefix: '' });
      break;
    case IOCType.FILE_PATH:
      value = faker.system.filePath();
      break;
    default:
      value = faker.string.alphanumeric(32);
  }

  return {
    id: faker.string.uuid(),
    type,
    value: overrides.value || value,
    confidence: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
    threat_id: overrides.threat_id || faker.string.uuid(),
    first_seen: faker.date.past({ years: 1 }).toISOString(),
    last_seen: faker.date.recent({ days: 30 }).toISOString(),
    created_at: faker.date.past({ years: 1 }).toISOString(),
    updated_at: faker.date.recent({ days: 7 }).toISOString(),
    tags: faker.helpers.arrayElements(['malicious', 'suspicious', 'benign'], 
      { min: 0, max: 2 }),
    description: faker.lorem.sentence(),
    source: faker.company.name(),
    is_active: faker.datatype.boolean(),
    kill_chain_phases: faker.helpers.arrayElements([
      'reconnaissance', 'weaponization', 'delivery', 'exploitation'
    ], { min: 0, max: 2 }),
    mitre_techniques: faker.helpers.arrayElements([
      'T1566.001', 'T1204.002', 'T1547.001'
    ], { min: 0, max: 2 }),
    tlp_marking: faker.helpers.arrayElement(['WHITE', 'GREEN', 'AMBER', 'RED']),
    ...overrides
  };
};

// Threat Actor Factory
export const mockThreatActorData = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.hacker.noun() + ' Group',
  aliases: [
    faker.hacker.noun() + ' Team',
    'APT-' + faker.number.int({ min: 10, max: 99 })
  ],
  type: faker.helpers.enumValue(ThreatActorType),
  description: faker.lorem.paragraph(),
  sophistication: faker.helpers.arrayElement(['novice', 'practitioner', 'expert', 'innovator']),
  resource_level: faker.helpers.arrayElement(['individual', 'club', 'contest', 'team', 
    'organization', 'government']),
  motivation: faker.helpers.arrayElements([
    'ideology', 'notoriety', 'organizational-gain', 'personal-gain', 
    'personal-satisfaction', 'revenge', 'unpredictable'
  ], { min: 1, max: 3 }),
  goals: faker.helpers.arrayElements([
    'data-theft', 'financial-gain', 'espionage', 'sabotage', 'harassment'
  ], { min: 1, max: 3 }),
  attribution: {
    confidence: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
    country: faker.location.country(),
    region: faker.location.continent(),
    sources: [faker.company.name(), faker.company.name()]
  },
  first_seen: faker.date.past({ years: 3 }).toISOString(),
  last_seen: faker.date.recent({ days: 90 }).toISOString(),
  created_at: faker.date.past({ years: 2 }).toISOString(),
  updated_at: faker.date.recent({ days: 14 }).toISOString(),
  tools: faker.helpers.arrayElements([
    'Cobalt Strike', 'Mimikatz', 'PowerShell Empire', 'Metasploit'
  ], { min: 0, max: 3 }),
  techniques: faker.helpers.arrayElements([
    'T1566.001', 'T1204.002', 'T1547.001', 'T1055', 'T1027'
  ], { min: 1, max: 4 }),
  sectors_targeted: faker.helpers.arrayElements([
    'financial-services', 'government', 'healthcare', 'technology', 
    'energy', 'manufacturing'
  ], { min: 1, max: 3 }),
  regions_targeted: faker.helpers.arrayElements([
    'North America', 'Europe', 'Asia Pacific', 'South America'
  ], { min: 1, max: 3 }),
  is_active: faker.datatype.boolean(),
  ...overrides
});

// Security Event Factory
export const mockSecurityEventData = (overrides = {}) => ({
  id: faker.string.uuid(),
  timestamp: faker.date.recent({ days: 7 }).toISOString(),
  event_type: faker.helpers.arrayElement([
    'MALWARE_DETECTED', 'PHISHING_ATTEMPT', 'BRUTE_FORCE_ATTACK',
    'DATA_EXFILTRATION', 'PRIVILEGE_ESCALATION', 'LATERAL_MOVEMENT'
  ]),
  severity: faker.helpers.enumValue(ThreatSeverity),
  source_ip: faker.internet.ipv4(),
  destination_ip: faker.internet.ipv4(),
  source_port: faker.internet.port(),
  destination_port: faker.internet.port(),
  protocol: faker.helpers.arrayElement(['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS']),
  description: faker.lorem.sentence(),
  raw_data: faker.lorem.paragraph(),
  assets_affected: [faker.string.uuid(), faker.string.uuid()],
  user_affected: faker.internet.email(),
  mitre_tactics: faker.helpers.arrayElements([
    'Initial Access', 'Execution', 'Persistence', 'Credential Access'
  ], { min: 1, max: 2 }),
  mitre_techniques: faker.helpers.arrayElements([
    'T1566.001', 'T1204.002', 'T1547.001'
  ], { min: 1, max: 2 }),
  confidence: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
  false_positive_probability: faker.number.float({ min: 0.0, max: 0.3, fractionDigits: 2 }),
  rule_id: 'RULE-' + faker.string.alphanumeric(8),
  rule_name: faker.hacker.noun() + ' Detection Rule',
  correlation_id: faker.string.uuid(),
  incident_id: null,
  tags: faker.helpers.arrayElements(['automated', 'high-priority', 'review'], 
    { min: 0, max: 2 }),
  metadata: {
    source: faker.helpers.arrayElement(['SIEM', 'EDR', 'Network Monitor', 'Firewall']),
    sensor_id: faker.string.uuid(),
    collection_time: faker.date.recent({ hours: 1 }).toISOString()
  },
  created_at: faker.date.recent({ days: 7 }).toISOString(),
  updated_at: faker.date.recent({ days: 1 }).toISOString(),
  ...overrides
});

// Incident Factory
export const mockIncidentData = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.hacker.noun() + ' Security Incident',
  description: faker.lorem.paragraph(),
  severity: faker.helpers.enumValue(ThreatSeverity),
  status: faker.helpers.enumValue(IncidentStatus),
  assignee_id: faker.string.uuid(),
  assignee: {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'SECURITY_ANALYST'
  },
  reporter_id: faker.string.uuid(),
  reporter: {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'SECURITY_ANALYST'
  },
  created_at: faker.date.past({ days: 30 }).toISOString(),
  updated_at: faker.date.recent({ days: 3 }).toISOString(),
  resolved_at: null,
  due_date: faker.date.future({ days: 7 }).toISOString(),
  sla_breached: faker.datatype.boolean(),
  priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: faker.helpers.arrayElement([
    'Malware', 'Phishing', 'Data Breach', 'System Compromise', 'Policy Violation'
  ]),
  subcategory: faker.helpers.arrayElement([
    'Trojan', 'Spear Phishing', 'Credential Theft', 'Privilege Escalation'
  ]),
  events: [],
  assets_affected: [faker.string.uuid(), faker.string.uuid()],
  tags: faker.helpers.arrayElements(['investigation', 'containment', 'eradication'], 
    { min: 1, max: 2 }),
  impact_assessment: {
    confidentiality: faker.helpers.arrayElement(['NONE', 'LOW', 'MEDIUM', 'HIGH']),
    integrity: faker.helpers.arrayElement(['NONE', 'LOW', 'MEDIUM', 'HIGH']),
    availability: faker.helpers.arrayElement(['NONE', 'LOW', 'MEDIUM', 'HIGH']),
    business_impact: faker.lorem.sentence()
  },
  containment_actions: [
    {
      action: faker.lorem.sentence(),
      timestamp: faker.date.recent({ days: 2 }).toISOString(),
      performer: faker.person.fullName(),
      status: 'COMPLETED'
    }
  ],
  investigation_notes: [
    {
      note: faker.lorem.paragraph(),
      timestamp: faker.date.recent({ days: 1 }).toISOString(),
      author: faker.person.fullName()
    }
  ],
  playbook_id: faker.string.uuid(),
  playbook_execution: {
    status: 'IN_PROGRESS',
    current_step: 3,
    total_steps: 8,
    started_at: faker.date.recent({ days: 1 }).toISOString()
  },
  ...overrides
});

// Alert Factory
export const mockAlertData = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.hacker.noun() + ' Alert',
  description: faker.lorem.sentence(),
  severity: faker.helpers.enumValue(ThreatSeverity),
  status: faker.helpers.arrayElement(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  type: faker.helpers.arrayElement([
    'MALWARE', 'PHISHING', 'INTRUSION', 'DATA_LOSS', 'POLICY_VIOLATION'
  ]),
  source: faker.helpers.arrayElement(['SIEM', 'EDR', 'Network Monitor', 'Email Security']),
  rule_id: 'ALERT-RULE-' + faker.string.alphanumeric(6),
  rule_name: faker.hacker.noun() + ' Detection Rule',
  triggered_at: faker.date.recent({ days: 3 }).toISOString(),
  acknowledged_at: null,
  resolved_at: null,
  assignee_id: faker.string.uuid(),
  false_positive: faker.datatype.boolean({ probability: 0.1 }),
  confidence: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
  assets_affected: [faker.string.uuid()],
  events: [faker.string.uuid(), faker.string.uuid()],
  incident_id: null,
  escalation_level: faker.number.int({ min: 0, max: 3 }),
  sla_deadline: faker.date.future({ hours: 24 }).toISOString(),
  investigation_notes: [
    {
      note: faker.lorem.sentence(),
      timestamp: faker.date.recent({ hours: 2 }).toISOString(),
      author: faker.person.fullName()
    }
  ],
  response_actions: [
    {
      action: faker.lorem.sentence(),
      status: 'PENDING',
      assigned_to: faker.person.fullName(),
      due_date: faker.date.future({ hours: 8 }).toISOString()
    }
  ],
  tags: faker.helpers.arrayElements(['automated', 'manual-review', 'escalated'], 
    { min: 0, max: 2 }),
  created_at: faker.date.recent({ days: 3 }).toISOString(),
  updated_at: faker.date.recent({ hours: 12 }).toISOString(),
  ...overrides
});

// Asset Factory
export const mockAssetData = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.helpers.arrayElement(['SERVER', 'WORKSTATION', 'LAPTOP', 'MOBILE']) + 
    '-' + faker.string.alphanumeric(3).toUpperCase(),
  type: faker.helpers.arrayElement(['SERVER', 'WORKSTATION', 'NETWORK_DEVICE', 'MOBILE_DEVICE']),
  ip_address: faker.internet.ipv4(),
  mac_address: faker.internet.mac(),
  hostname: faker.internet.domainWord() + '.' + faker.internet.domainName(),
  operating_system: faker.helpers.arrayElement([
    'Windows 10', 'Windows Server 2019', 'Ubuntu 20.04', 'macOS Big Sur', 'iOS 15'
  ]),
  location: faker.location.city(),
  department: faker.helpers.arrayElement(['IT', 'Finance', 'HR', 'Operations', 'Security']),
  owner: faker.person.fullName(),
  criticality: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  last_seen: faker.date.recent({ days: 1 }).toISOString(),
  security_state: faker.helpers.arrayElement(['SECURE', 'AT_RISK', 'COMPROMISED', 'UNKNOWN']),
  vulnerabilities: faker.number.int({ min: 0, max: 15 }),
  patches_pending: faker.number.int({ min: 0, max: 8 }),
  antivirus_status: faker.helpers.arrayElement(['UP_TO_DATE', 'OUT_OF_DATE', 'DISABLED']),
  firewall_status: faker.helpers.arrayElement(['ENABLED', 'DISABLED', 'MISCONFIGURED']),
  created_at: faker.date.past({ years: 1 }).toISOString(),
  updated_at: faker.date.recent({ days: 3 }).toISOString(),
  tags: faker.helpers.arrayElements(['production', 'development', 'critical', 'monitored'], 
    { min: 1, max: 3 }),
  ...overrides
});

// User Factory
export const mockUserData = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: faker.helpers.arrayElement(['ADMIN', 'SECURITY_ANALYST', 'SECURITY_ENGINEER', 'USER']),
  permissions: faker.helpers.arrayElements([
    'READ_THREATS', 'WRITE_THREATS', 'READ_INCIDENTS', 'WRITE_INCIDENTS',
    'READ_ASSETS', 'WRITE_ASSETS', 'ADMIN'
  ], { min: 2, max: 5 }),
  last_login: faker.date.recent({ days: 7 }).toISOString(),
  created_at: faker.date.past({ years: 1 }).toISOString(),
  updated_at: faker.date.recent({ days: 30 }).toISOString(),
  is_active: faker.datatype.boolean({ probability: 0.9 }),
  profile: {
    department: faker.helpers.arrayElement(['Security', 'IT', 'Operations']),
    phone: faker.phone.number(),
    timezone: faker.location.timeZone(),
    preferences: {
      theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
      notifications: faker.datatype.boolean(),
      language: faker.helpers.arrayElement(['en', 'es', 'fr'])
    }
  },
  ...overrides
});

// Campaign Factory
export const mockCampaignData = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: 'Operation ' + faker.hacker.noun(),
  description: faker.lorem.paragraph(),
  attribution: {
    actor_id: faker.string.uuid(),
    actor_name: faker.hacker.noun() + ' Group',
    confidence: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 })
  },
  objectives: faker.helpers.arrayElements([
    'data-theft', 'espionage', 'financial-gain', 'disruption', 'reconnaissance'
  ], { min: 1, max: 3 }),
  techniques: faker.helpers.arrayElements([
    'T1566.001', 'T1204.002', 'T1547.001', 'T1055', 'T1027'
  ], { min: 2, max: 6 }),
  targets: faker.helpers.arrayElements([
    'government', 'financial-services', 'healthcare', 'technology', 'energy'
  ], { min: 1, max: 3 }),
  first_activity: faker.date.past({ years: 2 }).toISOString(),
  last_activity: faker.date.recent({ days: 30 }).toISOString(),
  is_active: faker.datatype.boolean({ probability: 0.3 }),
  threat_count: faker.number.int({ min: 5, max: 50 }),
  ioc_count: faker.number.int({ min: 20, max: 200 }),
  event_count: faker.number.int({ min: 100, max: 1000 }),
  confidence_score: faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 }),
  impact_score: faker.number.int({ min: 1, max: 100 }),
  created_at: faker.date.past({ years: 2 }).toISOString(),
  updated_at: faker.date.recent({ days: 7 }).toISOString(),
  ...overrides
});

// Correlation Factory
export const mockCorrelationData = (overrides = {}) => ({
  id: faker.string.uuid(),
  primary_threat_id: faker.string.uuid(),
  correlated_threat_ids: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, 
    () => faker.string.uuid()),
  correlation_score: faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 3 }),
  correlation_type: faker.helpers.arrayElement([
    'TEMPORAL', 'BEHAVIORAL', 'INFRASTRUCTURE', 'TACTICAL', 'ATTRIBUTION'
  ]),
  common_indicators: faker.number.int({ min: 1, max: 10 }),
  common_techniques: faker.helpers.arrayElements([
    'T1566.001', 'T1204.002', 'T1547.001'
  ], { min: 1, max: 3 }),
  temporal_proximity: faker.number.int({ min: 0, max: 86400 }), // seconds
  geographic_overlap: faker.datatype.boolean(),
  infrastructure_overlap: faker.datatype.boolean(),
  created_at: faker.date.recent({ days: 30 }).toISOString(),
  updated_at: faker.date.recent({ days: 7 }).toISOString(),
  reviewed: faker.datatype.boolean({ probability: 0.7 }),
  reviewer_id: faker.string.uuid(),
  review_notes: faker.lorem.sentence(),
  ...overrides
});

// Batch Factory Functions
export const createMockThreats = (count: number) => 
  Array.from({ length: count }, () => mockThreatData());

export const createMockIOCs = (count: number) => 
  Array.from({ length: count }, () => mockIOCData());

export const createMockThreatActors = (count: number) => 
  Array.from({ length: count }, () => mockThreatActorData());

export const createMockSecurityEvents = (count: number) => 
  Array.from({ length: count }, () => mockSecurityEventData());

export const createMockIncidents = (count: number) => 
  Array.from({ length: count }, () => mockIncidentData());

export const createMockAlerts = (count: number) => 
  Array.from({ length: count }, () => mockAlertData());

export const createMockAssets = (count: number) => 
  Array.from({ length: count }, () => mockAssetData());

// Pagination Factory
export const mockPagination = (page = 1, limit = 10, total = 100) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
  hasNext: page < Math.ceil(total / limit),
  hasPrev: page > 1
});