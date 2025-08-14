import { NextRequest } from 'next/server';
import { GET as GET_SCANS, POST as POST_SCANS } from '@/app/api/v1/security/scans/route';
import { GET as GET_SCAN, DELETE as DELETE_SCAN } from '@/app/api/v1/security/scans/[id]/route';
import { POST as START_SCAN } from '@/app/api/v1/security/scans/[id]/start/route';
import { POST as STOP_SCAN } from '@/app/api/v1/security/scans/[id]/stop/route';
import { GET as GET_VULNERABILITIES } from '@/app/api/v1/security/vulnerabilities/route';
import { PUT as UPDATE_VULNERABILITY } from '@/app/api/v1/security/vulnerabilities/[id]/route';
import { GET as GET_COMPLIANCE } from '@/app/api/v1/security/compliance/route';
import { ProductionTestFactory } from '../../factories/productionFactory';
import type { SecurityScan, Vulnerability, ComplianceStatus } from '@/lib/types/production';

// Mock external dependencies
jest.mock('@/lib/db/prisma');
jest.mock('@/lib/services/security-scanner');
jest.mock('@/lib/services/vulnerability-database');
jest.mock('@/lib/services/compliance-checker');
jest.mock('@/lib/middleware/rate-limit');

// Mock security services
const mockSecurityScanner = {
  startScan: jest.fn(),
  stopScan: jest.fn(),
  getScanStatus: jest.fn(),
  getScanResults: jest.fn(),
};

const mockVulnerabilityDatabase = {
  searchVulnerabilities: jest.fn(),
  updateVulnerability: jest.fn(),
  getVulnerabilityDetails: jest.fn(),
};

const mockComplianceChecker = {
  runComplianceCheck: jest.fn(),
  getComplianceStatus: jest.fn(),
  generateComplianceReport: jest.fn(),
};

jest.mock('@/lib/services/security-scanner', () => mockSecurityScanner);
jest.mock('@/lib/services/vulnerability-database', () => mockVulnerabilityDatabase);
jest.mock('@/lib/services/compliance-checker', () => mockComplianceChecker);

describe('/api/v1/security', () => {
  let mockScans: SecurityScan[];
  let mockVulnerabilities: Vulnerability[];
  let mockComplianceStatuses: ComplianceStatus[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockScans = Array.from({ length: 5 }, () => ProductionTestFactory.createSecurityScan());
    mockVulnerabilities = Array.from({ length: 10 }, () => ProductionTestFactory.createVulnerability());
    mockComplianceStatuses = Array.from({ length: 3 }, () => ProductionTestFactory.createComplianceStatus());
  });

  describe('GET /api/v1/security/scans', () => {
    it('should return all security scans', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.findMany.mockResolvedValue(mockScans);

      const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_SCANS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(5);
      expect(data.data[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        type: expect.stringMatching(/^(vulnerability|compliance|dependency|secret)$/),
        status: expect.stringMatching(/^(pending|running|completed|failed|cancelled)$/),
        target: expect.any(Object),
      });
    });

    it('should filter scans by type and status', async () => {
      const vulnerabilityScans = mockScans.filter(scan => 
        scan.type === 'vulnerability' && scan.status === 'completed'
      );
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.findMany.mockResolvedValue(vulnerabilityScans);

      const request = new NextRequest('http://localhost:3000/api/v1/security/scans?type=vulnerability&status=completed', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_SCANS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.securityScan.findMany).toHaveBeenCalledWith({
        where: {
          type: 'vulnerability',
          status: 'completed',
        },
        orderBy: { startedAt: 'desc' },
        include: { results: true },
      });
    });

    it('should support pagination', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.findMany.mockResolvedValue(mockScans.slice(0, 2));
      mockPrisma.securityScan.count.mockResolvedValue(50);

      const request = new NextRequest('http://localhost:3000/api/v1/security/scans?page=1&limit=2', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_SCANS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 50,
      });
    });

    it('should require security read permissions', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:metrics'] // Wrong permission
          }),
        },
      });

      const response = await GET_SCANS(request);
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/security/scans', () => {
    it('should create a new security scan', async () => {
      const newScan = ProductionTestFactory.createSecurityScan({ status: 'pending' });
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.create.mockResolvedValue(newScan);

      const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
        body: JSON.stringify({
          name: newScan.name,
          type: newScan.type,
          target: newScan.target,
          config: newScan.config,
        }),
      });

      const response = await POST_SCANS(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        name: newScan.name,
        type: newScan.type,
        status: 'pending',
      });
    });

    it('should validate scan configuration', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
        body: JSON.stringify({
          name: '', // Empty name
          type: 'invalid-type', // Invalid type
          target: {}, // Empty target
        }),
      });

      const response = await POST_SCANS(request);
      expect(response.status).toBe(400);
    });

    it('should validate target accessibility and security', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
        body: JSON.stringify({
          name: 'Test Scan',
          type: 'vulnerability',
          target: {
            type: 'repository',
            identifier: 'http://localhost:22/internal-repo', // Internal service
          },
        }),
      });

      const response = await POST_SCANS(request);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('target not accessible');
    });

    it('should prevent scanning of unauthorized targets', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security'],
            role: 'user' // Not admin
          }),
        },
        body: JSON.stringify({
          name: 'Admin Scan',
          type: 'vulnerability',
          target: {
            type: 'api',
            identifier: 'https://admin.example.com/api',
          },
        }),
      });

      const response = await POST_SCANS(request);
      expect(response.status).toBe(403);
    });

    it('should enforce scan creation rate limits', async () => {
      const rateLimitMock = require('@/lib/middleware/rate-limit');
      rateLimitMock.checkRateLimit.mockResolvedValue({
        allowed: false,
        resetTime: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
          'X-Forwarded-For': '192.168.1.1',
        },
        body: JSON.stringify({
          name: 'Rate Limited Scan',
          type: 'vulnerability',
          target: {
            type: 'repository',
            identifier: 'https://github.com/example/repo',
          },
        }),
      });

      const response = await POST_SCANS(request);
      expect(response.status).toBe(429);
    });
  });

  describe('POST /api/v1/security/scans/[id]/start', () => {
    it('should start a security scan', async () => {
      const pendingScan = ProductionTestFactory.createSecurityScan({ status: 'pending' });
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.findUnique.mockResolvedValue(pendingScan);
      mockPrisma.securityScan.update.mockResolvedValue({
        ...pendingScan,
        status: 'running',
      });
      mockSecurityScanner.startScan.mockResolvedValue({
        scanId: pendingScan.id,
        status: 'running',
        estimatedDuration: 300, // 5 minutes
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/security/scans/${pendingScan.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
      });

      const response = await START_SCAN(request, { params: { id: pendingScan.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('running');
      expect(mockSecurityScanner.startScan).toHaveBeenCalledWith(pendingScan);
    });

    it('should prevent starting already running scans', async () => {
      const runningScan = ProductionTestFactory.createSecurityScan({ status: 'running' });
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.findUnique.mockResolvedValue(runningScan);

      const request = new NextRequest(`http://localhost:3000/api/v1/security/scans/${runningScan.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
      });

      const response = await START_SCAN(request, { params: { id: runningScan.id } });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('already running');
    });

    it('should handle scan initialization failures', async () => {
      const pendingScan = ProductionTestFactory.createSecurityScan({ status: 'pending' });
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.findUnique.mockResolvedValue(pendingScan);
      mockSecurityScanner.startScan.mockRejectedValue(new Error('Scanner service unavailable'));

      const request = new NextRequest(`http://localhost:3000/api/v1/security/scans/${pendingScan.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
      });

      const response = await START_SCAN(request, { params: { id: pendingScan.id } });
      expect(response.status).toBe(500);
      expect((await response.json()).error).toContain('Failed to start scan');
    });
  });

  describe('POST /api/v1/security/scans/[id]/stop', () => {
    it('should stop a running scan', async () => {
      const runningScan = ProductionTestFactory.createSecurityScan({ status: 'running' });
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.findUnique.mockResolvedValue(runningScan);
      mockPrisma.securityScan.update.mockResolvedValue({
        ...runningScan,
        status: 'cancelled',
      });
      mockSecurityScanner.stopScan.mockResolvedValue({ success: true });

      const request = new NextRequest(`http://localhost:3000/api/v1/security/scans/${runningScan.id}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
      });

      const response = await STOP_SCAN(request, { params: { id: runningScan.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('cancelled');
      expect(mockSecurityScanner.stopScan).toHaveBeenCalledWith(runningScan.id);
    });

    it('should prevent stopping non-running scans', async () => {
      const completedScan = ProductionTestFactory.createSecurityScan({ status: 'completed' });
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.findUnique.mockResolvedValue(completedScan);

      const request = new NextRequest(`http://localhost:3000/api/v1/security/scans/${completedScan.id}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
      });

      const response = await STOP_SCAN(request, { params: { id: completedScan.id } });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/security/vulnerabilities', () => {
    it('should return vulnerabilities with filtering', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.vulnerability.findMany.mockResolvedValue(mockVulnerabilities);

      const request = new NextRequest('http://localhost:3000/api/v1/security/vulnerabilities?severity=critical&status=open', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_VULNERABILITIES(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(10);
      expect(mockPrisma.vulnerability.findMany).toHaveBeenCalledWith({
        where: {
          severity: 'critical',
          status: 'open',
        },
        orderBy: { firstDetected: 'desc' },
        include: { remediation: true },
      });
    });

    it('should support vulnerability search by CVE', async () => {
      const cveVulnerabilities = mockVulnerabilities.filter(vuln => vuln.cve);
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.vulnerability.findMany.mockResolvedValue(cveVulnerabilities);

      const request = new NextRequest('http://localhost:3000/api/v1/security/vulnerabilities?search=CVE-2024', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_VULNERABILITIES(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.vulnerability.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { cve: { contains: 'CVE-2024', mode: 'insensitive' } },
            { title: { contains: 'CVE-2024', mode: 'insensitive' } },
            { description: { contains: 'CVE-2024', mode: 'insensitive' } },
          ],
        },
        orderBy: { firstDetected: 'desc' },
        include: { remediation: true },
      });
    });

    it('should aggregate vulnerability statistics', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.vulnerability.findMany.mockResolvedValue(mockVulnerabilities);
      mockPrisma.vulnerability.groupBy.mockResolvedValue([
        { severity: 'critical', _count: { id: 2 } },
        { severity: 'high', _count: { id: 3 } },
        { severity: 'medium', _count: { id: 4 } },
        { severity: 'low', _count: { id: 1 } },
      ]);

      const request = new NextRequest('http://localhost:3000/api/v1/security/vulnerabilities?aggregate=true', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_VULNERABILITIES(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.statistics).toMatchObject({
        total: 10,
        severityBreakdown: {
          critical: 2,
          high: 3,
          medium: 4,
          low: 1,
        },
      });
    });
  });

  describe('PUT /api/v1/security/vulnerabilities/[id]', () => {
    it('should update vulnerability status', async () => {
      const vulnerability = mockVulnerabilities[0];
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.vulnerability.findUnique.mockResolvedValue(vulnerability);
      mockPrisma.vulnerability.update.mockResolvedValue({
        ...vulnerability,
        status: 'fixed',
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/security/vulnerabilities/${vulnerability.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
        body: JSON.stringify({
          status: 'fixed',
          notes: 'Patched in version 1.2.3',
        }),
      });

      const response = await UPDATE_VULNERABILITY(request, { params: { id: vulnerability.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('fixed');
    });

    it('should validate status transitions', async () => {
      const fixedVulnerability = ProductionTestFactory.createVulnerability({ status: 'fixed' });
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.vulnerability.findUnique.mockResolvedValue(fixedVulnerability);

      const request = new NextRequest(`http://localhost:3000/api/v1/security/vulnerabilities/${fixedVulnerability.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
        body: JSON.stringify({
          status: 'open', // Invalid transition
        }),
      });

      const response = await UPDATE_VULNERABILITY(request, { params: { id: fixedVulnerability.id } });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('Invalid status transition');
    });

    it('should log vulnerability status changes for audit', async () => {
      const vulnerability = mockVulnerabilities[0];
      const mockPrisma = require('@/lib/db/prisma');
      
      mockPrisma.vulnerability.findUnique.mockResolvedValue(vulnerability);
      mockPrisma.vulnerability.update.mockResolvedValue(vulnerability);
      mockPrisma.auditLog.create = jest.fn();

      const request = new NextRequest(`http://localhost:3000/api/v1/security/vulnerabilities/${vulnerability.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
        body: JSON.stringify({
          status: 'accepted',
          notes: 'Risk accepted by security team',
        }),
      });

      await UPDATE_VULNERABILITY(request, { params: { id: vulnerability.id } });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'vulnerability_updated',
          resource: 'vulnerability',
          resourceId: vulnerability.id,
          userId: expect.any(String),
          changes: expect.any(Object),
        },
      });
    });
  });

  describe('GET /api/v1/security/compliance', () => {
    it('should return compliance status for all frameworks', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.complianceStatus.findMany.mockResolvedValue(mockComplianceStatuses);

      const request = new NextRequest('http://localhost:3000/api/v1/security/compliance', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_COMPLIANCE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
      expect(data.data[0]).toMatchObject({
        framework: expect.any(String),
        score: expect.any(Number),
        status: expect.stringMatching(/^(compliant|non_compliant|in_progress)$/),
        controls: expect.any(Array),
      });
    });

    it('should filter compliance by framework', async () => {
      const soc2Compliance = mockComplianceStatuses.filter(status => status.framework === 'SOC2');
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.complianceStatus.findMany.mockResolvedValue(soc2Compliance);

      const request = new NextRequest('http://localhost:3000/api/v1/security/compliance?framework=SOC2', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_COMPLIANCE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.complianceStatus.findMany).toHaveBeenCalledWith({
        where: { framework: 'SOC2' },
        include: { controls: true },
      });
    });

    it('should generate compliance reports', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.complianceStatus.findMany.mockResolvedValue(mockComplianceStatuses);
      mockComplianceChecker.generateComplianceReport.mockResolvedValue({
        reportId: 'report-123',
        url: '/api/v1/security/compliance/reports/report-123',
        generatedAt: new Date().toISOString(),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/security/compliance?generateReport=true', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_COMPLIANCE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.report).toBeDefined();
      expect(data.data.report.url).toContain('/reports/');
    });
  });

  describe('Security and Validation', () => {
    it('should prevent unauthorized scan target enumeration', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security'],
            role: 'guest'
          }),
        },
      });

      const response = await GET_SCANS(request);
      expect(response.status).toBe(403);
    });

    it('should sanitize scan inputs to prevent injection', async () => {
      const maliciousInputs = global.securityTestHelpers.sqlInjectionPayloads;

      for (const payload of maliciousInputs) {
        const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['write:security']
            }),
          },
          body: JSON.stringify({
            name: payload,
            type: 'vulnerability',
            target: {
              type: 'repository',
              identifier: 'https://github.com/example/repo',
            },
          }),
        });

        const response = await POST_SCANS(request);
        expect(response.status).toBe(400);
      }
    });

    it('should validate scan target URLs to prevent SSRF', async () => {
      const ssrfPayloads = [
        'http://169.254.169.254/latest/meta-data', // AWS metadata
        'http://localhost:6379/info', // Redis
        'file:///etc/passwd', // File protocol
        'gopher://internal.service:9000', // Gopher protocol
      ];

      for (const payload of ssrfPayloads) {
        const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['write:security']
            }),
          },
          body: JSON.stringify({
            name: 'SSRF Test',
            type: 'vulnerability',
            target: {
              type: 'api',
              identifier: payload,
            },
          }),
        });

        const response = await POST_SCANS(request);
        expect(response.status).toBe(400);
      }
    });

    it('should enforce scan concurrency limits', async () => {
      const runningScans = Array.from({ length: 10 }, () => 
        ProductionTestFactory.createSecurityScan({ status: 'running' })
      );
      
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.count.mockResolvedValue(10); // Max concurrent scans

      const request = new NextRequest('http://localhost:3000/api/v1/security/scans', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
        body: JSON.stringify({
          name: 'Concurrent Test',
          type: 'vulnerability',
          target: {
            type: 'repository',
            identifier: 'https://github.com/example/repo',
          },
        }),
      });

      const response = await POST_SCANS(request);
      expect(response.status).toBe(429);
      expect((await response.json()).error).toContain('concurrent scan limit');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large vulnerability datasets efficiently', async () => {
      const largeVulnerabilityDataset = Array.from({ length: 10000 }, () => 
        ProductionTestFactory.createVulnerability()
      );
      
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.vulnerability.findMany.mockResolvedValue(largeVulnerabilityDataset.slice(0, 100));
      mockPrisma.vulnerability.count.mockResolvedValue(10000);

      const request = new NextRequest('http://localhost:3000/api/v1/security/vulnerabilities?limit=100', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const startTime = Date.now();
      const response = await GET_VULNERABILITIES(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle concurrent scan status requests', async () => {
      const scan = mockScans[0];
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.findUnique.mockResolvedValue(scan);

      const concurrentRequests = Array.from({ length: 100 }, () =>
        new NextRequest(`http://localhost:3000/api/v1/security/scans/${scan.id}`, {
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['read:security']
            }),
          },
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests.map(req => GET_SCAN(req, { params: { id: scan.id } })));
      const endTime = Date.now();

      const successfulResponses = responses.filter(res => res.status === 200);
      expect(successfulResponses.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('should efficiently process vulnerability updates', async () => {
      const vulnerabilities = Array.from({ length: 50 }, () => 
        ProductionTestFactory.createVulnerability()
      );
      
      const updateRequests = vulnerabilities.map(vuln =>
        new NextRequest(`http://localhost:3000/api/v1/security/vulnerabilities/${vuln.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['write:security']
            }),
          },
          body: JSON.stringify({
            status: 'accepted',
            notes: 'Bulk update test',
          }),
        })
      );

      const mockPrisma = require('@/lib/db/prisma');
      vulnerabilities.forEach(vuln => {
        mockPrisma.vulnerability.findUnique.mockResolvedValueOnce(vuln);
        mockPrisma.vulnerability.update.mockResolvedValueOnce(vuln);
      });

      const startTime = Date.now();
      const responses = await Promise.all(
        updateRequests.map((req, index) => 
          UPDATE_VULNERABILITY(req, { params: { id: vulnerabilities[index].id } })
        )
      );
      const endTime = Date.now();

      const successfulResponses = responses.filter(res => res.status === 200);
      expect(successfulResponses.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('Integration and External Services', () => {
    it('should handle external vulnerability database failures', async () => {
      mockVulnerabilityDatabase.searchVulnerabilities.mockRejectedValue(
        new Error('External vulnerability database unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/v1/security/vulnerabilities?search=CVE-2024', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_VULNERABILITIES(request);
      const data = await response.json();

      // Should fall back to local database
      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });

    it('should handle compliance service integration errors', async () => {
      mockComplianceChecker.getComplianceStatus.mockRejectedValue(
        new Error('Compliance service timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/v1/security/compliance', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:security']
          }),
        },
      });

      const response = await GET_COMPLIANCE(request);
      expect(response.status).toBe(503); // Service unavailable
    });

    it('should validate external scanner integration', async () => {
      const pendingScan = ProductionTestFactory.createSecurityScan({ status: 'pending' });
      mockSecurityScanner.startScan.mockRejectedValue(new Error('Scanner not configured'));

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.securityScan.findUnique.mockResolvedValue(pendingScan);

      const request = new NextRequest(`http://localhost:3000/api/v1/security/scans/${pendingScan.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
      });

      const response = await START_SCAN(request, { params: { id: pendingScan.id } });
      expect(response.status).toBe(500);
      expect((await response.json()).error).toContain('Scanner not configured');
    });
  });
});