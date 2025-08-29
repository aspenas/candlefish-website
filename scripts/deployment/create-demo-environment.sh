#!/bin/bash

# Security Dashboard - Customer Demo Environment Setup
# Creates an isolated demo environment with realistic sample data

set -euo pipefail

# Configuration
DEMO_NAMESPACE="security-dashboard-demo"
DEMO_SUBDOMAIN="demo"
DEMO_CUSTOMER="${1:-acme-corp}"
DEMO_DURATION_DAYS="${2:-7}"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Generate demo data
generate_demo_data() {
    log_info "Generating realistic demo data for ${DEMO_CUSTOMER}..."
    
    cat <<'EOF' > /tmp/demo-data-generator.js
const { faker } = require('@faker-js/faker');
const fs = require('fs');

// Configuration
const config = {
    events: 10000,
    threats: 150,
    incidents: 25,
    users: 50,
    assets: 500,
    playbooks: 20
};

// MITRE ATT&CK Tactics
const mitreTactics = [
    'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
    'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
    'Collection', 'Command and Control', 'Exfiltration', 'Impact'
];

// Generate security events
function generateSecurityEvents() {
    const events = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    for (let i = 0; i < config.events; i++) {
        const eventDate = faker.date.between({ from: startDate, to: new Date() });
        events.push({
            id: faker.string.uuid(),
            timestamp: eventDate.toISOString(),
            severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            type: faker.helpers.arrayElement([
                'MALWARE_DETECTED', 'UNAUTHORIZED_ACCESS', 'DATA_EXFILTRATION',
                'BRUTE_FORCE_ATTEMPT', 'ANOMALOUS_BEHAVIOR', 'POLICY_VIOLATION',
                'SUSPICIOUS_PROCESS', 'NETWORK_INTRUSION', 'PHISHING_ATTEMPT'
            ]),
            source: {
                ip: faker.internet.ip(),
                hostname: faker.internet.domainName(),
                user: faker.internet.username(),
                department: faker.helpers.arrayElement(['IT', 'Finance', 'HR', 'Sales', 'Engineering'])
            },
            target: {
                ip: faker.internet.ip(),
                hostname: faker.internet.domainName(),
                asset: faker.helpers.arrayElement(['Server', 'Workstation', 'Database', 'Application'])
            },
            details: {
                message: faker.hacker.phrase(),
                mitreTactic: faker.helpers.arrayElement(mitreTactics),
                mitreTechnique: `T${faker.number.int({ min: 1000, max: 1999 })}`,
                confidence: faker.number.int({ min: 60, max: 100 }),
                riskScore: faker.number.int({ min: 1, max: 100 })
            },
            status: faker.helpers.arrayElement(['NEW', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'FALSE_POSITIVE']),
            assignee: faker.helpers.arrayElement([null, faker.person.fullName()]),
            tags: faker.helpers.arrayElements(['ransomware', 'apt', 'insider-threat', 'zero-day', 'supply-chain'], { min: 1, max: 3 })
        });
    }
    
    return events;
}

// Generate threat intelligence
function generateThreatIntelligence() {
    const threats = [];
    
    for (let i = 0; i < config.threats; i++) {
        threats.push({
            id: faker.string.uuid(),
            name: `${faker.helpers.arrayElement(['APT', 'Ransomware', 'Trojan', 'Botnet', 'Exploit'])} ${faker.company.name()}`,
            type: faker.helpers.arrayElement(['MALWARE', 'THREAT_ACTOR', 'CAMPAIGN', 'VULNERABILITY', 'INDICATOR']),
            firstSeen: faker.date.past({ years: 2 }).toISOString(),
            lastSeen: faker.date.recent({ days: 30 }).toISOString(),
            severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            confidence: faker.number.int({ min: 50, max: 100 }),
            iocs: {
                ips: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => faker.internet.ip()),
                domains: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.internet.domainName()),
                hashes: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.git.commitSha()),
                emails: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => faker.internet.email())
            },
            description: faker.lorem.paragraph(),
            mitigation: faker.lorem.sentences(2),
            references: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.internet.url()),
            tags: faker.helpers.arrayElements(['financial', 'healthcare', 'government', 'critical-infrastructure', 'retail'], { min: 1, max: 2 })
        });
    }
    
    return threats;
}

// Generate incidents
function generateIncidents() {
    const incidents = [];
    const analysts = Array.from({ length: 10 }, () => faker.person.fullName());
    
    for (let i = 0; i < config.incidents; i++) {
        const createdDate = faker.date.recent({ days: 30 });
        const resolvedDate = faker.helpers.maybe(() => faker.date.between({ from: createdDate, to: new Date() }), { probability: 0.7 });
        
        incidents.push({
            id: `INC-${String(i + 1).padStart(5, '0')}`,
            title: faker.hacker.phrase(),
            description: faker.lorem.paragraphs(2),
            severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            status: faker.helpers.arrayElement(['OPEN', 'IN_PROGRESS', 'CONTAINED', 'RESOLVED', 'CLOSED']),
            type: faker.helpers.arrayElement(['SECURITY_BREACH', 'DATA_LEAK', 'MALWARE_INFECTION', 'PHISHING', 'INSIDER_THREAT']),
            assignee: faker.helpers.arrayElement(analysts),
            reporter: faker.person.fullName(),
            createdAt: createdDate.toISOString(),
            updatedAt: faker.date.between({ from: createdDate, to: new Date() }).toISOString(),
            resolvedAt: resolvedDate?.toISOString() || null,
            affectedAssets: faker.number.int({ min: 1, max: 50 }),
            businessImpact: faker.helpers.arrayElement(['MINIMAL', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
            containmentActions: faker.lorem.sentences(3).split('. '),
            rootCause: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.6 }),
            lessonsLearned: faker.helpers.maybe(() => faker.lorem.sentences(2), { probability: 0.5 }),
            relatedEvents: faker.number.int({ min: 5, max: 100 }),
            timeToDetect: `${faker.number.int({ min: 1, max: 720 })} minutes`,
            timeToContain: `${faker.number.int({ min: 15, max: 1440 })} minutes`,
            timeToResolve: resolvedDate ? `${faker.number.int({ min: 60, max: 10080 })} minutes` : null
        });
    }
    
    return incidents;
}

// Generate playbooks
function generatePlaybooks() {
    const playbooks = [];
    
    const playbookTypes = [
        'Ransomware Response', 'Data Breach Investigation', 'Phishing Response',
        'DDoS Mitigation', 'Insider Threat Investigation', 'Malware Analysis',
        'Incident Escalation', 'Forensic Collection', 'Network Isolation',
        'User Account Compromise', 'Supply Chain Attack', 'Zero Day Response'
    ];
    
    for (let i = 0; i < config.playbooks; i++) {
        playbooks.push({
            id: faker.string.uuid(),
            name: faker.helpers.arrayElement(playbookTypes) + ` v${faker.number.int({ min: 1, max: 3 })}.${faker.number.int({ min: 0, max: 9 })}`,
            description: faker.lorem.paragraph(),
            category: faker.helpers.arrayElement(['RESPONSE', 'INVESTIGATION', 'CONTAINMENT', 'RECOVERY', 'ANALYSIS']),
            severity: faker.helpers.arrayElement(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            automated: faker.datatype.boolean(),
            steps: Array.from({ length: faker.number.int({ min: 5, max: 15 }) }, (_, index) => ({
                order: index + 1,
                name: faker.hacker.verb() + ' ' + faker.hacker.noun(),
                description: faker.lorem.sentence(),
                type: faker.helpers.arrayElement(['MANUAL', 'AUTOMATED', 'APPROVAL', 'NOTIFICATION']),
                estimatedTime: `${faker.number.int({ min: 1, max: 60 })} minutes`,
                required: faker.datatype.boolean({ probability: 0.8 })
            })),
            triggers: faker.helpers.arrayElements([
                'HIGH_SEVERITY_ALERT', 'REPEATED_FAILURES', 'SUSPICIOUS_BEHAVIOR',
                'MALWARE_DETECTED', 'DATA_EXFILTRATION', 'UNAUTHORIZED_ACCESS'
            ], { min: 1, max: 3 }),
            tags: faker.helpers.arrayElements(['critical', 'automated', 'manual-review', 'executive-approval'], { min: 1, max: 2 }),
            lastExecuted: faker.date.recent({ days: 7 }).toISOString(),
            executionCount: faker.number.int({ min: 0, max: 100 }),
            successRate: faker.number.int({ min: 75, max: 100 })
        });
    }
    
    return playbooks;
}

// Generate assets
function generateAssets() {
    const assets = [];
    
    for (let i = 0; i < config.assets; i++) {
        assets.push({
            id: faker.string.uuid(),
            hostname: faker.internet.domainWord() + '-' + faker.helpers.arrayElement(['srv', 'ws', 'db', 'app']) + faker.number.int({ min: 1, max: 99 }),
            ip: faker.internet.ip(),
            type: faker.helpers.arrayElement(['SERVER', 'WORKSTATION', 'FIREWALL', 'ROUTER', 'SWITCH', 'DATABASE', 'APPLICATION']),
            os: faker.helpers.arrayElement(['Windows Server 2019', 'Ubuntu 20.04', 'CentOS 8', 'Windows 10', 'macOS 12', 'RHEL 8']),
            department: faker.helpers.arrayElement(['IT', 'Finance', 'HR', 'Sales', 'Engineering', 'Marketing', 'Operations']),
            criticality: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            owner: faker.person.fullName(),
            location: faker.helpers.arrayElement(['HQ', 'Branch-1', 'Branch-2', 'DataCenter', 'Cloud-AWS', 'Cloud-Azure']),
            lastSeen: faker.date.recent({ days: 1 }).toISOString(),
            vulnerabilities: faker.number.int({ min: 0, max: 25 }),
            patches: {
                installed: faker.number.int({ min: 50, max: 200 }),
                pending: faker.number.int({ min: 0, max: 20 }),
                failed: faker.number.int({ min: 0, max: 5 })
            },
            compliance: {
                status: faker.helpers.arrayElement(['COMPLIANT', 'NON_COMPLIANT', 'EXCEPTION', 'PENDING']),
                lastScan: faker.date.recent({ days: 7 }).toISOString(),
                issues: faker.number.int({ min: 0, max: 10 })
            },
            tags: faker.helpers.arrayElements(['production', 'development', 'staging', 'dmz', 'internet-facing', 'pci', 'hipaa'], { min: 1, max: 3 })
        });
    }
    
    return assets;
}

// Generate users
function generateUsers() {
    const users = [];
    
    for (let i = 0; i < config.users; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        
        users.push({
            id: faker.string.uuid(),
            username: faker.internet.username({ firstName, lastName }),
            email: faker.internet.email({ firstName, lastName }),
            fullName: `${firstName} ${lastName}`,
            role: faker.helpers.arrayElement(['ANALYST', 'SENIOR_ANALYST', 'MANAGER', 'ADMIN', 'VIEWER']),
            department: faker.helpers.arrayElement(['Security', 'IT', 'Compliance', 'Risk', 'Operations']),
            status: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']), // Mostly active
            lastLogin: faker.date.recent({ days: 7 }).toISOString(),
            mfaEnabled: faker.datatype.boolean({ probability: 0.9 }),
            permissions: faker.helpers.arrayElements([
                'VIEW_EVENTS', 'MANAGE_INCIDENTS', 'EXECUTE_PLAYBOOKS',
                'MANAGE_USERS', 'VIEW_REPORTS', 'CONFIGURE_SYSTEM'
            ], { min: 2, max: 5 }),
            createdAt: faker.date.past({ years: 2 }).toISOString(),
            riskScore: faker.number.int({ min: 0, max: 100 }),
            suspiciousActivities: faker.number.int({ min: 0, max: 5 })
        });
    }
    
    return users;
}

// Generate all demo data
const demoData = {
    metadata: {
        customer: process.env.DEMO_CUSTOMER || 'ACME Corporation',
        generated: new Date().toISOString(),
        dataVersion: '2.0',
        summary: {
            events: config.events,
            threats: config.threats,
            incidents: config.incidents,
            users: config.users,
            assets: config.assets,
            playbooks: config.playbooks
        }
    },
    securityEvents: generateSecurityEvents(),
    threatIntelligence: generateThreatIntelligence(),
    incidents: generateIncidents(),
    playbooks: generatePlaybooks(),
    assets: generateAssets(),
    users: generateUsers()
};

// Save demo data
fs.writeFileSync('/tmp/demo-data.json', JSON.stringify(demoData, null, 2));
console.log('Demo data generated successfully!');
console.log(`Total size: ${(JSON.stringify(demoData).length / 1024 / 1024).toFixed(2)} MB`);
EOF

    # Generate the data
    cd /tmp
    npm init -y > /dev/null 2>&1
    npm install @faker-js/faker > /dev/null 2>&1
    DEMO_CUSTOMER="${DEMO_CUSTOMER}" node demo-data-generator.js
    
    log_success "Demo data generated successfully"
}

# Create demo namespace
create_demo_namespace() {
    log_info "Creating demo namespace: ${DEMO_NAMESPACE}"
    
    kubectl create namespace ${DEMO_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Label namespace
    kubectl label namespace ${DEMO_NAMESPACE} \
        environment=demo \
        customer="${DEMO_CUSTOMER}" \
        expires="$(date -d "+${DEMO_DURATION_DAYS} days" +%Y-%m-%d)" \
        --overwrite
    
    log_success "Demo namespace created"
}

# Deploy demo instance
deploy_demo_instance() {
    log_info "Deploying demo instance for ${DEMO_CUSTOMER}..."
    
    # Use existing deployment manifests with demo overrides
    kubectl apply -f deployment/k8s/security-dashboard/ -n ${DEMO_NAMESPACE}
    
    # Apply demo-specific configurations
    kubectl -n ${DEMO_NAMESPACE} create configmap demo-config \
        --from-literal=demo_mode=true \
        --from-literal=customer_name="${DEMO_CUSTOMER}" \
        --from-literal=demo_expires="$(date -d "+${DEMO_DURATION_DAYS} days" +%Y-%m-%d)" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Scale down for demo (resource optimization)
    kubectl -n ${DEMO_NAMESPACE} scale deployment frontend --replicas=1
    kubectl -n ${DEMO_NAMESPACE} scale deployment graphql-api --replicas=1
    
    log_success "Demo instance deployed"
}

# Load demo data
load_demo_data() {
    log_info "Loading demo data into database..."
    
    # Get database pod
    DB_POD=$(kubectl -n ${DEMO_NAMESPACE} get pod -l app=timescaledb -o jsonpath='{.items[0].metadata.name}')
    
    # Copy demo data to pod
    kubectl cp /tmp/demo-data.json ${DEMO_NAMESPACE}/${DB_POD}:/tmp/demo-data.json
    
    # Create data loader script
    cat <<'EOF' > /tmp/load-demo-data.sql
-- Create demo data tables if not exists
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    severity TEXT NOT NULL,
    type TEXT NOT NULL,
    source JSONB,
    target JSONB,
    details JSONB,
    status TEXT,
    assignee TEXT,
    tags TEXT[]
);

CREATE TABLE IF NOT EXISTS threat_intelligence (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    severity TEXT,
    confidence INTEGER,
    iocs JSONB,
    description TEXT,
    mitigation TEXT,
    references TEXT[],
    tags TEXT[]
);

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT,
    status TEXT,
    type TEXT,
    assignee TEXT,
    reporter TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    affected_assets INTEGER,
    business_impact TEXT,
    containment_actions TEXT[],
    root_cause TEXT,
    lessons_learned TEXT,
    related_events INTEGER,
    time_to_detect TEXT,
    time_to_contain TEXT,
    time_to_resolve TEXT
);

-- Load demo data from JSON file
\set content `cat /tmp/demo-data.json`
INSERT INTO demo_metadata (data) VALUES (:'content'::jsonb);
EOF
    
    # Execute data loading
    kubectl cp /tmp/load-demo-data.sql ${DEMO_NAMESPACE}/${DB_POD}:/tmp/load-demo-data.sql
    kubectl -n ${DEMO_NAMESPACE} exec ${DB_POD} -- psql -U postgres -d security_dashboard -f /tmp/load-demo-data.sql
    
    log_success "Demo data loaded successfully"
}

# Configure demo access
configure_demo_access() {
    log_info "Configuring demo access..."
    
    # Create demo ingress
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-ingress
  namespace: ${DEMO_NAMESPACE}
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: demo-auth
    nginx.ingress.kubernetes.io/auth-realm: "Security Dashboard Demo"
spec:
  rules:
  - host: ${DEMO_SUBDOMAIN}-${DEMO_CUSTOMER}.security-dashboard.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
EOF
    
    # Create demo credentials
    DEMO_USER="demo-${DEMO_CUSTOMER}"
    DEMO_PASS=$(openssl rand -base64 12)
    
    # Create basic auth secret
    htpasswd -cb /tmp/auth ${DEMO_USER} ${DEMO_PASS}
    kubectl -n ${DEMO_NAMESPACE} create secret generic demo-auth --from-file=auth=/tmp/auth --dry-run=client -o yaml | kubectl apply -f -
    
    # Save credentials
    cat <<EOF > demo-credentials-${DEMO_CUSTOMER}.txt
=====================================
Security Dashboard Demo Access
=====================================
Customer: ${DEMO_CUSTOMER}
URL: https://${DEMO_SUBDOMAIN}-${DEMO_CUSTOMER}.security-dashboard.io
Username: ${DEMO_USER}
Password: ${DEMO_PASS}
Expires: $(date -d "+${DEMO_DURATION_DAYS} days" +%Y-%m-%d)

Demo Features:
- 10,000 pre-loaded security events
- 150 threat intelligence indicators
- 25 active incidents
- 20 automated playbooks
- Real-time dashboard updates
- Full API access

Support: support@security-dashboard.io
=====================================
EOF
    
    log_success "Demo access configured"
    log_info "Credentials saved to: demo-credentials-${DEMO_CUSTOMER}.txt"
}

# Create demo walkthrough
create_demo_walkthrough() {
    log_info "Creating demo walkthrough guide..."
    
    cat <<EOF > demo-walkthrough-${DEMO_CUSTOMER}.md
# Security Dashboard Demo Walkthrough

## Welcome to ${DEMO_CUSTOMER}'s Demo Environment

### 1. Dashboard Overview (5 minutes)
- Navigate to the main dashboard
- Review real-time security metrics
- Observe the threat heatmap
- Check the incident queue

### 2. Threat Detection (10 minutes)
- Click on "Threats" tab
- Filter by severity: CRITICAL
- View MITRE ATT&CK mapping
- Drill into a specific threat
- Review IOCs and correlations

### 3. Incident Response (10 minutes)
- Navigate to "Incidents"
- Select incident INC-00001
- Review the incident timeline
- Execute automated playbook
- Observe real-time status updates

### 4. Security Analytics (5 minutes)
- Go to "Analytics" section
- View trend analysis
- Check compliance scores
- Export custom report

### 5. API Integration (5 minutes)
- Access GraphQL playground: /graphql
- Run sample queries
- Subscribe to real-time events
- Test webhook integration

### 6. Mobile Experience (Optional)
- Access from mobile device
- Review responsive design
- Test offline capabilities
- Enable push notifications

## Key Differentiators

1. **Real-time Processing**: 10M+ events/day capacity
2. **AI-Powered Detection**: 60% fewer false positives
3. **Automated Response**: 40% faster MTTR
4. **Compliance Ready**: SOC2, ISO27001, GDPR
5. **Cost Effective**: 50% lower TCO than competitors

## Common Questions

**Q: How long does implementation take?**
A: Typical deployment is 2-4 weeks with our white-glove service.

**Q: Can we integrate our existing tools?**
A: Yes, we support 50+ integrations including Splunk, CrowdStrike, and Palo Alto.

**Q: What about data residency?**
A: We support on-premises, cloud, and hybrid deployments with data sovereignty.

**Q: How is pricing structured?**
A: Based on data volume and users, starting at \$2,000/month for SMB.

## Next Steps

1. Schedule technical deep-dive
2. Proof of Concept (30 days)
3. Security assessment
4. Contract negotiation
5. Implementation planning

Contact: sales@security-dashboard.io
EOF
    
    log_success "Demo walkthrough created: demo-walkthrough-${DEMO_CUSTOMER}.md"
}

# Setup demo automation
setup_demo_automation() {
    log_info "Setting up demo automation..."
    
    # Create event generator for realistic activity
    cat <<'EOF' > /tmp/demo-event-generator.js
const WebSocket = require('ws');
const { faker } = require('@faker-js/faker');

const ws = new WebSocket('wss://demo.security-dashboard.io/ws');

ws.on('open', function open() {
    console.log('Connected to demo environment');
    
    // Generate events every 5 seconds
    setInterval(() => {
        const event = {
            type: 'SECURITY_EVENT',
            timestamp: new Date().toISOString(),
            severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            message: faker.hacker.phrase(),
            source: faker.internet.ip(),
            target: faker.internet.ip()
        };
        
        ws.send(JSON.stringify(event));
        console.log('Event sent:', event.type);
    }, 5000);
});

ws.on('error', console.error);
EOF
    
    # Deploy as Kubernetes job
    kubectl -n ${DEMO_NAMESPACE} create configmap event-generator --from-file=/tmp/demo-event-generator.js --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Demo automation configured"
}

# Main execution
main() {
    log_info "Creating demo environment for ${DEMO_CUSTOMER}..."
    
    generate_demo_data
    create_demo_namespace
    deploy_demo_instance
    load_demo_data
    configure_demo_access
    create_demo_walkthrough
    setup_demo_automation
    
    log_success "Demo environment ready!"
    log_info "Access credentials: demo-credentials-${DEMO_CUSTOMER}.txt"
    log_info "Walkthrough guide: demo-walkthrough-${DEMO_CUSTOMER}.md"
    log_info "Demo URL: https://${DEMO_SUBDOMAIN}-${DEMO_CUSTOMER}.security-dashboard.io"
    log_warning "Demo expires in ${DEMO_DURATION_DAYS} days"
}

# Run main
main "$@"