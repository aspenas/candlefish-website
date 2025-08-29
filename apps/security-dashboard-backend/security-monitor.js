// Real-time Security Monitor for Candlefish AI
const { Pool } = require('pg');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'security_dashboard',
  user: 'dashboard_user',
  password: 'secure_password_2024',
});

class CandlefishSecurityMonitor {
  constructor() {
    this.monitoringInterval = null;
    this.dockerContainers = new Set();
    this.knownProcesses = new Map();
    this.baselineEstablished = false;
  }

  async start() {
    console.log('🔍 Starting Candlefish AI Security Monitor...');
    
    // Initial scan
    await this.performSecurityScan();
    
    // Set up monitoring intervals
    this.monitoringInterval = setInterval(() => {
      this.performSecurityScan();
    }, 30000); // Every 30 seconds

    // Monitor specific events
    this.monitorDockerSecurity();
    this.monitorFileSystem();
    this.monitorNetworkConnections();
    this.monitorGitActivity();
  }

  async performSecurityScan() {
    console.log(`[${new Date().toISOString()}] Running security scan...`);
    
    // Check running processes
    await this.checkProcesses();
    
    // Check open ports
    await this.checkOpenPorts();
    
    // Check Docker containers
    await this.checkDockerContainers();
    
    // Check system logs
    await this.checkSystemLogs();
    
    // Check AWS security
    await this.checkAWSSecurity();
  }

  async checkProcesses() {
    exec('ps aux | grep -E "node|python|docker|postgres|redis|neo4j" | grep -v grep', async (error, stdout) => {
      if (error) return;
      
      const lines = stdout.trim().split('\n');
      const currentProcesses = new Map();
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const pid = parts[1];
        const cpu = parseFloat(parts[2]);
        const mem = parseFloat(parts[3]);
        const command = parts.slice(10).join(' ');
        
        currentProcesses.set(pid, { cpu, mem, command });
        
        // Detect anomalies
        if (cpu > 80) {
          await this.createSecurityEvent(
            'high_cpu_usage',
            'medium',
            null,
            `Process ${pid} using ${cpu}% CPU: ${command.substring(0, 100)}`
          );
        }
        
        if (mem > 50) {
          await this.createSecurityEvent(
            'high_memory_usage',
            'medium',
            null,
            `Process ${pid} using ${mem}% memory: ${command.substring(0, 100)}`
          );
        }
        
        // Detect new processes
        if (!this.knownProcesses.has(pid) && this.baselineEstablished) {
          await this.createSecurityEvent(
            'new_process_detected',
            'info',
            null,
            `New process started: ${command.substring(0, 100)}`
          );
        }
      }
      
      this.knownProcesses = currentProcesses;
      if (!this.baselineEstablished) this.baselineEstablished = true;
    });
  }

  async checkOpenPorts() {
    exec('lsof -i -P -n | grep LISTEN', async (error, stdout) => {
      if (error) return;
      
      const lines = stdout.trim().split('\n');
      const openPorts = new Set();
      
      for (const line of lines) {
        const match = line.match(/:(\d+)\s+\(LISTEN\)/);
        if (match) {
          const port = match[1];
          openPorts.add(port);
          
          // Check for unusual ports
          const knownPorts = ['3000', '3003', '4000', '4001', '4002', '5432', '5433', '6379', '6380', '7474', '7475', '7687', '7688', '8080', '8081', '8087', '8088', '8089', '8090', '8091', '9090', '9091', '9092'];
          
          if (!knownPorts.includes(port)) {
            await this.createSecurityEvent(
              'unusual_port_open',
              'high',
              '127.0.0.1',
              `Unusual port ${port} is open and listening`
            );
            
            await this.createAlert(
              'network',
              'high',
              `Unusual Port Activity Detected`,
              `Port ${port} is open and listening, which is not in the list of known application ports`
            );
          }
        }
      }
    });
  }

  async checkDockerContainers() {
    exec('docker ps --format "{{.ID}}|{{.Names}}|{{.Status}}|{{.Ports}}"', async (error, stdout) => {
      if (error) return;
      
      const lines = stdout.trim().split('\n').filter(line => line);
      const currentContainers = new Set();
      
      for (const line of lines) {
        const [id, name, status, ports] = line.split('|');
        currentContainers.add(name);
        
        // Check container health
        if (status.includes('unhealthy')) {
          await this.createSecurityEvent(
            'container_unhealthy',
            'medium',
            null,
            `Docker container ${name} is unhealthy`
          );
        }
        
        // Detect new containers
        if (!this.dockerContainers.has(name)) {
          await this.createSecurityEvent(
            'new_container_started',
            'info',
            null,
            `New Docker container started: ${name}`
          );
        }
      }
      
      // Detect stopped containers
      for (const container of this.dockerContainers) {
        if (!currentContainers.has(container)) {
          await this.createSecurityEvent(
            'container_stopped',
            'info',
            null,
            `Docker container stopped: ${container}`
          );
        }
      }
      
      this.dockerContainers = currentContainers;
    });
  }

  async checkSystemLogs() {
    // Check for SSH attempts
    exec('grep -i "failed password\\|authentication failure" /var/log/system.log 2>/dev/null | tail -5', async (error, stdout) => {
      if (!error && stdout) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          if (line.includes('failed password') || line.includes('authentication failure')) {
            await this.createSecurityEvent(
              'authentication_failed',
              'medium',
              null,
              'Failed authentication attempt detected in system logs'
            );
          }
        }
      }
    });
  }

  async checkAWSSecurity() {
    // Check AWS CloudTrail events
    exec('aws cloudtrail lookup-events --max-items 10 --region us-east-1 2>/dev/null', async (error, stdout) => {
      if (!error && stdout) {
        try {
          const events = JSON.parse(stdout);
          if (events.Events) {
            for (const event of events.Events) {
              // Check for security-relevant events
              if (event.EventName && (
                event.EventName.includes('Delete') ||
                event.EventName.includes('Terminate') ||
                event.EventName.includes('CreateAccessKey') ||
                event.EventName.includes('PutBucketPolicy')
              )) {
                await this.createSecurityEvent(
                  'aws_security_event',
                  'high',
                  event.SourceIPAddress || null,
                  `AWS Event: ${event.EventName} by ${event.Username || 'unknown'}`
                );
              }
            }
          }
        } catch (e) {
          // JSON parse error, ignore
        }
      }
    });

    // Check for exposed S3 buckets
    exec('aws s3api list-buckets --query "Buckets[].Name" --output text 2>/dev/null', async (error, stdout) => {
      if (!error && stdout) {
        const buckets = stdout.trim().split(/\s+/);
        for (const bucket of buckets) {
          if (bucket) {
            exec(`aws s3api get-bucket-acl --bucket ${bucket} 2>/dev/null`, async (err, aclOutput) => {
              if (!err && aclOutput) {
                if (aclOutput.includes('AllUsers') || aclOutput.includes('AuthenticatedUsers')) {
                  await this.createSecurityEvent(
                    's3_bucket_public',
                    'critical',
                    null,
                    `S3 bucket ${bucket} has public access permissions`
                  );
                  
                  await this.createAlert(
                    'aws',
                    'critical',
                    'Public S3 Bucket Detected',
                    `S3 bucket ${bucket} is publicly accessible. Review and restrict permissions immediately.`
                  );
                }
              }
            });
          }
        }
      }
    });
  }

  async monitorDockerSecurity() {
    // Monitor Docker events
    const dockerEvents = exec('docker events --format "{{json .}}"');
    
    dockerEvents.stdout?.on('data', async (data) => {
      try {
        const event = JSON.parse(data.toString());
        if (event.Type === 'container') {
          await this.createSecurityEvent(
            'docker_event',
            'info',
            null,
            `Docker ${event.Action}: ${event.Actor?.Attributes?.name || event.id}`
          );
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
  }

  async monitorFileSystem() {
    // Monitor critical directories
    const criticalDirs = [
      '/Users/patricksmith/candlefish-ai/.env',
      '/Users/patricksmith/candlefish-ai/apps/security-dashboard-backend/.env',
      '/Users/patricksmith/.ssh',
      '/Users/patricksmith/.aws/credentials'
    ];

    for (const dir of criticalDirs) {
      exec(`ls -la "${dir}" 2>/dev/null`, async (error, stdout, stderr) => {
        if (!error && stdout) {
          // Check for recent modifications
          exec(`find "${dir}" -type f -mmin -5 2>/dev/null`, async (err, modified) => {
            if (!err && modified) {
              const files = modified.trim().split('\n').filter(f => f);
              for (const file of files) {
                await this.createSecurityEvent(
                  'sensitive_file_modified',
                  'high',
                  null,
                  `Sensitive file modified: ${file}`
                );
              }
            }
          });
        }
      });
    }
  }

  async monitorNetworkConnections() {
    exec('netstat -an | grep ESTABLISHED', async (error, stdout) => {
      if (error) return;
      
      const lines = stdout.trim().split('\n');
      const externalConnections = [];
      
      for (const line of lines) {
        // Look for external IPs (not localhost/local network)
        if (!line.includes('127.0.0.1') && 
            !line.includes('::1') && 
            !line.includes('192.168.') && 
            !line.includes('10.0.') &&
            !line.includes('172.')) {
          
          const match = line.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (match) {
            externalConnections.push(match[1]);
          }
        }
      }
      
      if (externalConnections.length > 0) {
        for (const ip of externalConnections) {
          // Check if IP is suspicious
          await this.checkIPReputation(ip);
        }
      }
    });
  }

  async monitorGitActivity() {
    exec('cd /Users/patricksmith/candlefish-ai && git log --oneline -n 1', async (error, stdout) => {
      if (!error && stdout) {
        const lastCommit = stdout.trim();
        // Store and compare with previous commit
        if (this.lastKnownCommit && this.lastKnownCommit !== lastCommit) {
          await this.createSecurityEvent(
            'git_commit',
            'info',
            null,
            `New git commit: ${lastCommit}`
          );
        }
        this.lastKnownCommit = lastCommit;
      }
    });
  }

  async checkIPReputation(ip) {
    // Check against known malicious IPs
    const maliciousIPs = [
      '185.220.100.240', // TOR exit node
      '45.155.205.233',  // Known scanner
    ];
    
    if (maliciousIPs.includes(ip)) {
      await this.createSecurityEvent(
        'malicious_ip_connection',
        'critical',
        ip,
        `Connection detected to known malicious IP: ${ip}`
      );
      
      await this.createAlert(
        'network',
        'critical',
        'Malicious IP Connection',
        `Active connection to known malicious IP address ${ip} detected`
      );
    }
  }

  async createSecurityEvent(eventType, severity, sourceIp, description) {
    try {
      await pool.query(
        `INSERT INTO security_events (event_type, severity, source_ip, description, timestamp)
         VALUES ($1, $2, $3, $4, NOW())`,
        [eventType, severity, sourceIp, description]
      );
      console.log(`📝 Event: [${severity.toUpperCase()}] ${eventType} - ${description.substring(0, 50)}`);
    } catch (error) {
      console.error('Error creating security event:', error.message);
    }
  }

  async createAlert(alertType, severity, title, description) {
    try {
      await pool.query(
        `INSERT INTO alerts (alert_type, severity, title, description, status, triggered_at)
         VALUES ($1, $2, $3, $4, 'active', NOW())`,
        [alertType, severity, title, description]
      );
      console.log(`🚨 Alert: [${severity.toUpperCase()}] ${title}`);
    } catch (error) {
      console.error('Error creating alert:', error.message);
    }
  }

  async createIncident(title, description, priority) {
    try {
      const incidentNumber = `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      await pool.query(
        `INSERT INTO incidents (incident_number, title, description, status, priority, created_at)
         VALUES ($1, $2, $3, 'open', $4, NOW())`,
        [incidentNumber, title, description, priority]
      );
      console.log(`📋 Incident created: ${incidentNumber} - ${title}`);
    } catch (error) {
      console.error('Error creating incident:', error.message);
    }
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('Security monitor stopped');
    }
  }
}

// Start the monitor
const monitor = new CandlefishSecurityMonitor();
monitor.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down security monitor...');
  monitor.stop();
  process.exit(0);
});

console.log('🛡️ Candlefish AI Security Monitor is running...');
console.log('Monitoring: Processes, Ports, Docker, AWS, Files, Network, Git');
console.log('Press Ctrl+C to stop\n');