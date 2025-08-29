// CLOS-Aware Intelligent Security Monitor for Candlefish AI
const { Pool } = require('pg');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

// Database connections
const securityPool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'security_dashboard',
  user: 'dashboard_user',
  password: 'secure_password_2024',
});

const closPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'clos',
  user: 'postgres',
  password: 'postgres',
});

class CLOSAwareSecurityMonitor {
  constructor() {
    this.portRegistry = new Map();
    this.serviceRegistry = new Map();
    this.knownServices = new Set();
    this.baselineMode = true;
    this.learningPeriod = 300000; // 5 minutes learning period
    this.suspiciousActivity = new Map();
    this.serviceFingerprints = new Map();
    
    // CLOS Port Ranges (from architectural analysis)
    this.portRanges = {
      infrastructure: { start: 2000, end: 2999, severity: 'high' },
      frontend: { start: 3000, end: 3999, severity: 'medium' },
      backend: { start: 4000, end: 4999, severity: 'high' },
      aiml: { start: 5000, end: 5999, severity: 'high' },
      postgres: { start: 5432, end: 5500, severity: 'critical' },
      redis: { start: 6379, end: 6400, severity: 'high' },
      control: { start: 7000, end: 7999, severity: 'critical' },
      agents: { start: 8000, end: 8999, severity: 'medium' },
      monitoring: { start: 9000, end: 9999, severity: 'low' },
      llm: { start: 11000, end: 12000, severity: 'medium' }
    };
    
    // Known CLOS services (from infrastructure analysis)
    this.closServices = {
      // Core Infrastructure
      'clos-postgres': { port: 5432, type: 'database', critical: true },
      'clos-redis': { port: 6379, type: 'cache', critical: true },
      'clos-caddy': { ports: [80, 443, 2019], type: 'gateway', critical: true },
      
      // Monitoring Stack
      'security-dashboard-prometheus': { port: 9092, type: 'monitoring' },
      'security-prometheus': { port: 9091, type: 'monitoring' },
      'security-grafana': { port: 3003, type: 'monitoring' },
      'deploy-prometheus-1': { port: 9090, type: 'monitoring' },
      
      // Security Dashboard
      'security-postgres': { port: 5433, type: 'database' },
      'security-redis': { port: 6380, type: 'cache' },
      'security-neo4j': { ports: [7475, 7688], type: 'database' },
      
      // Agent Services
      'deploy-clark-county-agent-1': { port: 8091, type: 'agent' },
      'deploy-paintbox-agent-1': { port: 8088, type: 'agent' },
      'deploy-crown-trophy-agent-1': { port: 8089, type: 'agent' },
      'deploy-temporal-agent-1': { port: 8090, type: 'agent' },
      'deploy-agent-registry-1': { port: 8087, type: 'agent' },
      
      // Application Services
      'clos-api': { port: 3501, type: 'api', critical: true },
      'clos-frontend': { port: 3001, type: 'frontend' },
      'temporal-frontend': { port: 7233, type: 'control' },
      'temporal-worker': { port: 8233, type: 'worker' },
      'ollama': { port: 11434, type: 'llm' },
      'goose-ai': { port: 7768, type: 'ai' },
      
      // Development Services
      'backend-api': { port: 4001, type: 'api' },
      'frontend-server': { port: 8081, type: 'frontend' }
    };
  }

  async start() {
    console.log('🔍 Starting CLOS-Aware Security Monitor...');
    console.log('📚 Loading CLOS infrastructure knowledge...');
    
    // Load CLOS configuration
    await this.loadCLOSConfiguration();
    
    // Start baseline learning
    console.log('🎓 Entering learning mode for 5 minutes...');
    setTimeout(() => {
      this.baselineMode = false;
      console.log('✅ Learning complete. Now monitoring for anomalies.');
      this.reportBaseline();
    }, this.learningPeriod);
    
    // Start monitoring
    this.startMonitoring();
  }

  async loadCLOSConfiguration() {
    try {
      // Try to load port allocations from CLOS config
      const configPath = '/Users/patricksmith/candlefish-ai/clos/config/port-allocations.yaml';
      const configContent = await fs.readFile(configPath, 'utf8').catch(() => null);
      
      if (configContent) {
        const config = yaml.load(configContent);
        console.log('✅ Loaded CLOS port configuration');
        // Process config...
      }
      
      // Load active services from CLOS database
      const result = await closPool.query(`
        SELECT name, port, status, health_status 
        FROM services 
        WHERE status = 'active'
      `).catch(() => ({ rows: [] }));
      
      result.rows.forEach(service => {
        this.serviceRegistry.set(service.name, {
          port: service.port,
          status: service.status,
          health: service.health_status
        });
      });
      
      console.log(`✅ Loaded ${this.serviceRegistry.size} services from CLOS database`);
    } catch (error) {
      console.log('⚠️ Could not load full CLOS config, using built-in knowledge');
    }
  }

  async startMonitoring() {
    // Monitor every 10 seconds
    setInterval(() => this.performIntelligentScan(), 10000);
    
    // Initial scan
    await this.performIntelligentScan();
    
    // Real-time Docker monitoring
    this.monitorDockerEvents();
    
    // Monitor CLOS API health
    this.monitorCLOSHealth();
  }

  async performIntelligentScan() {
    const timestamp = new Date().toISOString();
    
    // Get current system state
    const currentState = await this.getSystemState();
    
    // Analyze for anomalies
    await this.analyzeSecurityPosture(currentState);
    
    // NANDA assessment
    await this.performNANDAAssessment(currentState);
  }

  async getSystemState() {
    const state = {
      containers: [],
      ports: [],
      processes: [],
      connections: []
    };
    
    // Get Docker containers
    await new Promise((resolve) => {
      exec('docker ps --format "{{.Names}}|{{.Status}}|{{.Ports}}"', (error, stdout) => {
        if (!error && stdout) {
          state.containers = stdout.trim().split('\n').map(line => {
            const [name, status, ports] = line.split('|');
            return { name, status, ports };
          });
        }
        resolve();
      });
    });
    
    // Get listening ports
    await new Promise((resolve) => {
      exec('lsof -i -P -n | grep LISTEN', (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.trim().split('\n');
          const portSet = new Set();
          
          lines.forEach(line => {
            const match = line.match(/:(\d+)\s+\(LISTEN\)/);
            if (match) {
              portSet.add(parseInt(match[1]));
            }
          });
          
          state.ports = Array.from(portSet);
        }
        resolve();
      });
    });
    
    return state;
  }

  async analyzeSecurityPosture(state) {
    // Check each open port
    for (const port of state.ports) {
      const assessment = this.assessPort(port);
      
      if (assessment.suspicious && !this.baselineMode) {
        await this.createIntelligentAlert(port, assessment);
      } else if (this.baselineMode) {
        // Learning mode - record as known
        this.knownServices.add(port);
      }
    }
    
    // Check container health
    for (const container of state.containers) {
      if (container.status.includes('unhealthy')) {
        const service = this.closServices[container.name];
        if (service && service.critical) {
          await this.createSecurityEvent(
            'critical_service_unhealthy',
            'critical',
            null,
            `Critical CLOS service ${container.name} is unhealthy`
          );
          
          await this.createIncident(
            `Critical Service Failure: ${container.name}`,
            `The critical CLOS service ${container.name} is reporting unhealthy status. This may impact system functionality.`,
            'critical'
          );
        } else if (!this.baselineMode) {
          await this.createSecurityEvent(
            'service_unhealthy',
            'medium',
            null,
            `CLOS service ${container.name} is unhealthy`
          );
        }
      }
    }
  }

  assessPort(port) {
    // Check if it's a known CLOS service
    for (const [serviceName, config] of Object.entries(this.closServices)) {
      if (config.port === port || (config.ports && config.ports.includes(port))) {
        return {
          suspicious: false,
          service: serviceName,
          type: config.type,
          reason: 'Known CLOS service'
        };
      }
    }
    
    // Check if it's in a CLOS port range
    for (const [rangeName, range] of Object.entries(this.portRanges)) {
      if (port >= range.start && port <= range.end) {
        // It's in a CLOS range but not a known service
        return {
          suspicious: !this.knownServices.has(port),
          range: rangeName,
          severity: range.severity,
          reason: `Unknown service in CLOS ${rangeName} range`
        };
      }
    }
    
    // Check for privileged ports
    if (port < 1024) {
      return {
        suspicious: ![80, 443].includes(port), // HTTP/HTTPS are ok
        severity: 'critical',
        reason: 'Privileged port outside CLOS management'
      };
    }
    
    // Ephemeral ports (usually ok)
    if (port > 49152) {
      return {
        suspicious: false,
        severity: 'info',
        reason: 'Ephemeral port range'
      };
    }
    
    // Unknown port outside CLOS ranges
    return {
      suspicious: true,
      severity: 'medium',
      reason: 'Port outside CLOS management ranges'
    };
  }

  async createIntelligentAlert(port, assessment) {
    // Don't create duplicate alerts
    const recentAlert = this.suspiciousActivity.get(port);
    if (recentAlert && (Date.now() - recentAlert) < 300000) { // 5 minutes
      return;
    }
    
    this.suspiciousActivity.set(port, Date.now());
    
    await this.createSecurityEvent(
      'unauthorized_port',
      assessment.severity || 'medium',
      '127.0.0.1',
      `${assessment.reason}: Port ${port}`
    );
    
    if (assessment.severity === 'critical' || assessment.severity === 'high') {
      await this.createAlert(
        'network',
        assessment.severity,
        `Unauthorized Port Activity: ${port}`,
        `${assessment.reason}. This port is not registered in the CLOS infrastructure.`
      );
    }
  }

  async performNANDAAssessment(state) {
    // NANDA: Nursing Assessment, Diagnosis, Analysis adapted for security
    
    // Assessment: Collect objective data
    const assessment = {
      totalContainers: state.containers.length,
      healthyContainers: state.containers.filter(c => !c.status.includes('unhealthy')).length,
      openPorts: state.ports.length,
      knownPorts: state.ports.filter(p => !this.assessPort(p).suspicious).length,
      unknownPorts: state.ports.filter(p => this.assessPort(p).suspicious).length
    };
    
    // Diagnosis: Identify problems
    const diagnosis = [];
    
    if (assessment.unknownPorts > 0 && !this.baselineMode) {
      diagnosis.push({
        problem: 'Unauthorized Network Activity',
        severity: 'high',
        data: `${assessment.unknownPorts} unknown ports detected`
      });
    }
    
    if (assessment.healthyContainers < assessment.totalContainers) {
      diagnosis.push({
        problem: 'Service Health Degradation',
        severity: 'medium',
        data: `${assessment.totalContainers - assessment.healthyContainers} unhealthy services`
      });
    }
    
    // Analysis: Determine interventions
    if (diagnosis.length > 0 && !this.baselineMode) {
      console.log('🏥 NANDA Assessment Results:');
      diagnosis.forEach(d => {
        console.log(`  - ${d.problem}: ${d.data} [${d.severity.toUpperCase()}]`);
      });
      
      // Create compliance check
      await this.updateComplianceStatus(assessment, diagnosis);
    }
  }

  async updateComplianceStatus(assessment, diagnosis) {
    const complianceScore = (assessment.knownPorts / assessment.openPorts) * 100;
    const status = complianceScore > 95 ? 'compliant' : 
                   complianceScore > 80 ? 'partial' : 'non-compliant';
    
    await securityPool.query(`
      INSERT INTO compliance_checks (framework, control_id, control_name, status, evidence)
      VALUES ('CLOS', 'PORT-001', 'Port Management Compliance', $1, $2)
      ON CONFLICT (framework, control_id) 
      DO UPDATE SET status = $1, evidence = $2, last_checked = NOW()
    `, [status, JSON.stringify({ assessment, diagnosis })]);
  }

  monitorDockerEvents() {
    const dockerEvents = exec('docker events --format "{{json .}}"');
    
    dockerEvents.stdout?.on('data', async (data) => {
      try {
        const event = JSON.parse(data.toString());
        
        // Only log significant events
        if (event.Type === 'container' && ['start', 'die', 'kill'].includes(event.Action)) {
          const serviceName = event.Actor?.Attributes?.name;
          const isKnownService = this.closServices[serviceName];
          
          if (!isKnownService && !this.baselineMode) {
            await this.createSecurityEvent(
              'unknown_container_event',
              'high',
              null,
              `Unknown container ${event.Action}: ${serviceName}`
            );
          } else if (isKnownService && event.Action === 'die' && isKnownService.critical) {
            await this.createSecurityEvent(
              'critical_service_stopped',
              'critical',
              null,
              `Critical CLOS service stopped: ${serviceName}`
            );
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
  }

  async monitorCLOSHealth() {
    // Check CLOS API health every 30 seconds
    setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3501/api/health');
        if (!response.ok && !this.baselineMode) {
          await this.createSecurityEvent(
            'clos_api_down',
            'critical',
            null,
            'CLOS API server is not responding'
          );
        }
      } catch (error) {
        // API might not be running
      }
    }, 30000);
  }

  reportBaseline() {
    console.log('\n📊 Baseline Learning Complete:');
    console.log(`  - Known Services: ${this.knownServices.size}`);
    console.log(`  - CLOS Services: ${Object.keys(this.closServices).length}`);
    console.log(`  - Port Ranges Monitored: ${Object.keys(this.portRanges).length}`);
    console.log('\n🛡️ Now monitoring for deviations from baseline...\n');
  }

  async createSecurityEvent(eventType, severity, sourceIp, description) {
    try {
      await securityPool.query(
        `INSERT INTO security_events (event_type, severity, source_ip, description, timestamp, tags)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [eventType, severity, sourceIp, description, ['clos', 'intelligent']]
      );
      
      if (!this.baselineMode) {
        const icon = severity === 'critical' ? '🔴' :
                     severity === 'high' ? '🟠' :
                     severity === 'medium' ? '🟡' : '🔵';
        console.log(`${icon} [${severity.toUpperCase()}] ${eventType}: ${description.substring(0, 60)}`);
      }
    } catch (error) {
      console.error('Error creating security event:', error.message);
    }
  }

  async createAlert(alertType, severity, title, description) {
    if (this.baselineMode) return;
    
    try {
      await securityPool.query(
        `INSERT INTO alerts (alert_type, severity, title, description, status, triggered_at, metadata)
         VALUES ($1, $2, $3, $4, 'active', NOW(), $5)`,
        [alertType, severity, title, description, { source: 'clos-monitor' }]
      );
      console.log(`🚨 Alert: ${title}`);
    } catch (error) {
      console.error('Error creating alert:', error.message);
    }
  }

  async createIncident(title, description, priority) {
    if (this.baselineMode) return;
    
    try {
      const incidentNumber = `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      await securityPool.query(
        `INSERT INTO incidents (incident_number, title, description, status, priority, created_at, metadata)
         VALUES ($1, $2, $3, 'open', $4, NOW(), $5)`,
        [incidentNumber, title, description, priority, { source: 'clos-monitor' }]
      );
      console.log(`📋 Incident created: ${incidentNumber}`);
    } catch (error) {
      console.error('Error creating incident:', error.message);
    }
  }
}

// Start the intelligent monitor
const monitor = new CLOSAwareSecurityMonitor();
monitor.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n✋ Shutting down CLOS Security Monitor...');
  process.exit(0);
});

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     CLOS-Aware Intelligent Security Monitor for Candlefish AI  ║
╠════════════════════════════════════════════════════════════════╣
║  • Integrated with CLOS port management system                 ║
║  • Context-aware threat detection                              ║
║  • 5-minute baseline learning period                           ║
║  • NANDA assessment methodology                                ║
║  • Monitors: Containers, Ports, Services, Health               ║
╚════════════════════════════════════════════════════════════════╝
`);