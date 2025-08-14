/**
 * Security Scanner Service
 * Provides security scanning capabilities for the Paintbox application
 */

export interface SecurityScan {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  vulnerabilities: Vulnerability[];
  score?: number;
}

export interface Vulnerability {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation?: string;
  cve?: string;
  affectedComponent?: string;
}

export interface ComplianceStatus {
  id: string;
  framework: string;
  score: number;
  status: 'compliant' | 'non-compliant' | 'partial';
  lastChecked: Date;
  findings: string[];
}

export class SecurityScannerService {
  private scans: Map<string, SecurityScan> = new Map();
  private vulnerabilities: Vulnerability[] = [];
  private complianceStatuses: ComplianceStatus[] = [];

  async startScan(name: string): Promise<SecurityScan> {
    const scan: SecurityScan = {
      id: `scan-${Date.now()}`,
      name,
      status: 'running',
      startTime: new Date(),
      vulnerabilities: []
    };

    this.scans.set(scan.id, scan);

    // Simulate async scan
    setTimeout(() => {
      this.completeScan(scan.id);
    }, 5000);

    return scan;
  }

  async stopScan(scanId: string): Promise<void> {
    const scan = this.scans.get(scanId);
    if (scan && scan.status === 'running') {
      scan.status = 'failed';
      scan.endTime = new Date();
    }
  }

  async getScan(scanId: string): Promise<SecurityScan | undefined> {
    return this.scans.get(scanId);
  }

  async getAllScans(): Promise<SecurityScan[]> {
    return Array.from(this.scans.values());
  }

  async getVulnerabilities(): Promise<Vulnerability[]> {
    return this.vulnerabilities;
  }

  async updateVulnerability(id: string, updates: Partial<Vulnerability>): Promise<void> {
    const index = this.vulnerabilities.findIndex(v => v.id === id);
    if (index !== -1) {
      this.vulnerabilities[index] = { ...this.vulnerabilities[index], ...updates };
    }
  }

  async getComplianceStatus(): Promise<ComplianceStatus[]> {
    return this.complianceStatuses;
  }

  async checkCompliance(framework: string): Promise<ComplianceStatus> {
    const status: ComplianceStatus = {
      id: `compliance-${Date.now()}`,
      framework,
      score: Math.random() * 100,
      status: 'partial',
      lastChecked: new Date(),
      findings: []
    };

    const existingIndex = this.complianceStatuses.findIndex(s => s.framework === framework);
    if (existingIndex !== -1) {
      this.complianceStatuses[existingIndex] = status;
    } else {
      this.complianceStatuses.push(status);
    }

    return status;
  }

  private completeScan(scanId: string): void {
    const scan = this.scans.get(scanId);
    if (scan && scan.status === 'running') {
      // Simulate finding vulnerabilities
      scan.vulnerabilities = [
        {
          id: `vuln-${Date.now()}-1`,
          title: 'Outdated dependency',
          severity: 'medium',
          description: 'Package X is outdated',
          remediation: 'Update to latest version'
        }
      ];
      scan.status = 'completed';
      scan.endTime = new Date();
      scan.score = 85;

      // Add to global vulnerabilities
      this.vulnerabilities.push(...scan.vulnerabilities);
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; message: string }> {
    return {
      status: 'healthy',
      message: 'Security scanner service is operational'
    };
  }
}

// Export singleton instance
export const securityScannerService = new SecurityScannerService();
