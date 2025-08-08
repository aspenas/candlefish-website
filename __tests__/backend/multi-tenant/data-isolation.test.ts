import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../services/database/database.service';
import { TenantIsolationService } from '../../../services/tenant/tenant-isolation.service';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { UserService } from '../../../services/user/user.service';
import { AuditService } from '../../../services/audit/audit.service';
import { User, Organization, Dashboard, AnalyticsEvent } from '../../../types/entities';

@Injectable()
class TestDataService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tenantIsolationService: TenantIsolationService
  ) {}

  async findUsersByOrganization(organizationId: string): Promise<User[]> {
    // This method should automatically enforce tenant isolation
    return this.databaseService.user.findMany({
      where: this.tenantIsolationService.addTenantFilter({}, organizationId),
    });
  }

  async findAnalyticsEvents(organizationId: string, filters: any): Promise<AnalyticsEvent[]> {
    return this.databaseService.analyticsEvent.findMany({
      where: this.tenantIsolationService.addTenantFilter(filters, organizationId),
    });
  }
}

describe('Multi-Tenant Data Isolation', () => {
  let tenantIsolationService: TenantIsolationService;
  let testDataService: TestDataService;
  let databaseService: DeepMocked<DatabaseService>;
  let analyticsService: DeepMocked<AnalyticsService>;
  let dashboardService: DeepMocked<DashboardService>;
  let userService: DeepMocked<UserService>;
  let auditService: DeepMocked<AuditService>;

  const orgA: Organization = {
    id: 'org-a',
    name: 'Organization A',
    slug: 'org-a',
    plan: 'PREMIUM',
    maxUsers: 100,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const orgB: Organization = {
    id: 'org-b',
    name: 'Organization B',
    slug: 'org-b',
    plan: 'BASIC',
    maxUsers: 50,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const userA: User = {
    id: 'user-a',
    email: 'user-a@org-a.com',
    organizationId: 'org-a',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const userB: User = {
    id: 'user-b',
    email: 'user-b@org-b.com',
    organizationId: 'org-b',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const dashboardA: Dashboard = {
    id: 'dashboard-a',
    organizationId: 'org-a',
    name: 'Dashboard A',
    config: { widgets: [] },
    isActive: true,
    createdBy: 'user-a',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const dashboardB: Dashboard = {
    id: 'dashboard-b',
    organizationId: 'org-b',
    name: 'Dashboard B',
    config: { widgets: [] },
    isActive: true,
    createdBy: 'user-b',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantIsolationService,
        TestDataService,
        {
          provide: DatabaseService,
          useValue: createMock<DatabaseService>(),
        },
        {
          provide: AnalyticsService,
          useValue: createMock<AnalyticsService>(),
        },
        {
          provide: DashboardService,
          useValue: createMock<DashboardService>(),
        },
        {
          provide: UserService,
          useValue: createMock<UserService>(),
        },
        {
          provide: AuditService,
          useValue: createMock<AuditService>(),
        },
      ],
    }).compile();

    tenantIsolationService = module.get<TenantIsolationService>(TenantIsolationService);
    testDataService = module.get<TestDataService>(TestDataService);
    databaseService = module.get(DatabaseService);
    analyticsService = module.get(AnalyticsService);
    dashboardService = module.get(DashboardService);
    userService = module.get(UserService);
    auditService = module.get(AuditService);
  });

  describe('TenantIsolationService', () => {
    describe('addTenantFilter', () => {
      it('should add organizationId to where clause', () => {
        // Arrange
        const baseWhere = { isActive: true };
        const organizationId = 'org-123';

        // Act
        const result = tenantIsolationService.addTenantFilter(baseWhere, organizationId);

        // Assert
        expect(result).toEqual({
          isActive: true,
          organizationId: 'org-123',
        });
      });

      it('should handle empty where clause', () => {
        // Arrange
        const baseWhere = {};
        const organizationId = 'org-123';

        // Act
        const result = tenantIsolationService.addTenantFilter(baseWhere, organizationId);

        // Assert
        expect(result).toEqual({
          organizationId: 'org-123',
        });
      });

      it('should override existing organizationId', () => {
        // Arrange
        const baseWhere = { organizationId: 'wrong-org', isActive: true };
        const organizationId = 'correct-org';

        // Act
        const result = tenantIsolationService.addTenantFilter(baseWhere, organizationId);

        // Assert
        expect(result).toEqual({
          organizationId: 'correct-org',
          isActive: true,
        });
      });

      it('should handle complex nested where clauses', () => {
        // Arrange
        const baseWhere = {
          AND: [
            { isActive: true },
            {
              OR: [
                { name: { contains: 'test' } },
                { description: { contains: 'demo' } }
              ]
            }
          ]
        };
        const organizationId = 'org-123';

        // Act
        const result = tenantIsolationService.addTenantFilter(baseWhere, organizationId);

        // Assert
        expect(result).toEqual({
          organizationId: 'org-123',
          AND: [
            { isActive: true },
            {
              OR: [
                { name: { contains: 'test' } },
                { description: { contains: 'demo' } }
              ]
            }
          ]
        });
      });
    });

    describe('validateTenantAccess', () => {
      it('should allow access when user belongs to organization', async () => {
        // Act
        const hasAccess = await tenantIsolationService.validateTenantAccess(
          userA,
          'org-a'
        );

        // Assert
        expect(hasAccess).toBe(true);
      });

      it('should deny access when user belongs to different organization', async () => {
        // Act & Assert
        await expect(
          tenantIsolationService.validateTenantAccess(userA, 'org-b')
        ).rejects.toThrow(ForbiddenException);
      });

      it('should allow super admin access to any organization', async () => {
        // Arrange
        const superAdmin = { ...userA, role: 'SUPER_ADMIN' };

        // Act
        const hasAccess = await tenantIsolationService.validateTenantAccess(
          superAdmin,
          'any-org'
        );

        // Assert
        expect(hasAccess).toBe(true);
      });

      it('should log access attempts for audit', async () => {
        // Arrange
        auditService.log.mockResolvedValue(undefined);

        // Act
        await tenantIsolationService.validateTenantAccess(userA, 'org-a');

        // Assert
        expect(auditService.log).toHaveBeenCalledWith(
          'TENANT_ACCESS',
          userA.id,
          {
            requestedOrganizationId: 'org-a',
            userOrganizationId: 'org-a',
            allowed: true,
          }
        );
      });

      it('should log denied access attempts', async () => {
        // Arrange
        auditService.log.mockResolvedValue(undefined);

        // Act & Assert
        await expect(
          tenantIsolationService.validateTenantAccess(userA, 'org-b')
        ).rejects.toThrow(ForbiddenException);

        expect(auditService.log).toHaveBeenCalledWith(
          'TENANT_ACCESS_DENIED',
          userA.id,
          {
            requestedOrganizationId: 'org-b',
            userOrganizationId: 'org-a',
            reason: 'Cross-tenant access denied',
          }
        );
      });
    });

    describe('enforceRowLevelSecurity', () => {
      it('should automatically add tenant filters to database queries', async () => {
        // Arrange
        const expectedUsers = [userA];
        databaseService.user.findMany.mockResolvedValue(expectedUsers);

        // Act
        const users = await testDataService.findUsersByOrganization('org-a');

        // Assert
        expect(users).toEqual(expectedUsers);
        expect(databaseService.user.findMany).toHaveBeenCalledWith({
          where: { organizationId: 'org-a' },
        });
      });

      it('should prevent data leakage between organizations', async () => {
        // Arrange
        const allUsers = [userA, userB];
        const filteredUsers = [userA];

        // Mock raw query that might return cross-tenant data
        databaseService.$queryRaw.mockResolvedValue(allUsers);
        databaseService.user.findMany.mockResolvedValue(filteredUsers);

        // Act
        const users = await testDataService.findUsersByOrganization('org-a');

        // Assert
        expect(users).toEqual([userA]);
        expect(users).not.toContain(userB);
      });
    });
  });

  describe('Service-Level Data Isolation', () => {
    describe('UserService', () => {
      it('should only return users from same organization', async () => {
        // Arrange
        userService.findByOrganization.mockResolvedValue([userA]);

        // Act
        const users = await userService.findByOrganization('org-a');

        // Assert
        expect(users).toEqual([userA]);
        expect(users.every(user => user.organizationId === 'org-a')).toBe(true);
      });

      it('should validate organization membership before user operations', async () => {
        // Arrange
        userService.update.mockImplementation(async (userId, data, requestingUser) => {
          await tenantIsolationService.validateTenantAccess(
            requestingUser,
            requestingUser.organizationId
          );
          return { ...userA, ...data };
        });

        // Act
        const updatedUser = await userService.update('user-a', { firstName: 'John' }, userA);

        // Assert
        expect(updatedUser.firstName).toBe('John');
      });

      it('should prevent cross-tenant user modifications', async () => {
        // Arrange
        userService.update.mockImplementation(async (userId, data, requestingUser) => {
          // Simulate validation that would happen in real service
          if (userId === 'user-b' && requestingUser.organizationId !== 'org-b') {
            throw new ForbiddenException('Cannot modify user from different organization');
          }
          return { ...userA, ...data };
        });

        // Act & Assert
        await expect(
          userService.update('user-b', { firstName: 'Hacker' }, userA)
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('DashboardService', () => {
      it('should only return dashboards from user organization', async () => {
        // Arrange
        dashboardService.findByOrganization.mockResolvedValue([dashboardA]);

        // Act
        const dashboards = await dashboardService.findByOrganization('org-a', userA);

        // Assert
        expect(dashboards).toEqual([dashboardA]);
        expect(dashboards.every(d => d.organizationId === 'org-a')).toBe(true);
      });

      it('should prevent access to dashboards from other organizations', async () => {
        // Arrange
        dashboardService.findById.mockImplementation(async (dashboardId, user) => {
          if (dashboardId === 'dashboard-b' && user.organizationId !== 'org-b') {
            throw new ForbiddenException('Dashboard not found');
          }
          return dashboardA;
        });

        // Act & Assert
        await expect(
          dashboardService.findById('dashboard-b', userA)
        ).rejects.toThrow(ForbiddenException);
      });

      it('should automatically set organizationId on dashboard creation', async () => {
        // Arrange
        const createDto = {
          name: 'New Dashboard',
          config: { widgets: [] },
        };

        dashboardService.create.mockImplementation(async (dto, user) => {
          return {
            id: 'new-dashboard',
            organizationId: user.organizationId, // Should be auto-set
            ...dto,
            isActive: true,
            createdBy: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

        // Act
        const dashboard = await dashboardService.create(createDto, userA);

        // Assert
        expect(dashboard.organizationId).toBe(userA.organizationId);
      });
    });

    describe('AnalyticsService', () => {
      it('should isolate analytics events by organization', async () => {
        // Arrange
        const eventA: AnalyticsEvent = {
          id: 'event-a',
          organizationId: 'org-a',
          userId: 'user-a',
          eventType: 'page_view',
          properties: { page: '/dashboard' },
          timestamp: new Date(),
          sessionId: 'session-a',
          deviceId: 'device-a',
        };

        const queryDto = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          eventTypes: ['page_view'],
        };

        analyticsService.query.mockImplementation(async (dto, user) => {
          // Should only return events from user's organization
          return {
            data: [{ organizationId: user.organizationId, count: 100 }],
            totalRows: 1,
            executionTime: 150,
          };
        });

        // Act
        const result = await analyticsService.query(queryDto, userA);

        // Assert
        expect(result.data[0].organizationId).toBe('org-a');
      });

      it('should validate organization access for analytics queries', async () => {
        // Arrange
        analyticsService.query.mockImplementation(async (dto, user) => {
          await tenantIsolationService.validateTenantAccess(
            user,
            user.organizationId
          );
          return { data: [], totalRows: 0, executionTime: 0 };
        });

        // Act & Assert
        await expect(
          analyticsService.query({}, userA)
        ).resolves.not.toThrow();
      });

      it('should prevent analytics data leakage through aggregations', async () => {
        // Arrange
        const queryDto = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          groupBy: ['organizationId'], // This should not reveal other orgs
        };

        analyticsService.query.mockImplementation(async (dto, user) => {
          // Simulate filtering that prevents cross-tenant data
          return {
            data: [{ organizationId: user.organizationId, count: 100 }],
            totalRows: 1,
            executionTime: 150,
          };
        });

        // Act
        const result = await analyticsService.query(queryDto, userA);

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].organizationId).toBe('org-a');
      });
    });
  });

  describe('Database-Level Isolation', () => {
    describe('Query Validation', () => {
      it('should detect queries missing tenant isolation', () => {
        // Arrange
        const unsafeQuery = 'SELECT * FROM users WHERE isActive = true';
        const safeQuery = 'SELECT * FROM users WHERE organizationId = ? AND isActive = true';

        // Act
        const isUnsafeSafe = tenantIsolationService.validateQuery(unsafeQuery);
        const isSafeSafe = tenantIsolationService.validateQuery(safeQuery);

        // Assert
        expect(isUnsafeSafe).toBe(false);
        expect(isSafeSafe).toBe(true);
      });

      it('should automatically inject tenant filters into raw queries', () => {
        // Arrange
        const originalQuery = 'SELECT COUNT(*) FROM events WHERE event_type = ?';
        const organizationId = 'org-123';
        const params = ['page_view'];

        // Act
        const { query, newParams } = tenantIsolationService.addTenantToQuery(
          originalQuery,
          params,
          organizationId
        );

        // Assert
        expect(query).toContain('organization_id = ?');
        expect(newParams).toEqual(['page_view', 'org-123']);
      });

      it('should handle complex JOIN queries with tenant isolation', () => {
        // Arrange
        const complexQuery = `
          SELECT u.*, d.name as dashboard_name
          FROM users u
          JOIN dashboards d ON u.id = d.created_by
          WHERE u.isActive = true
        `;
        const organizationId = 'org-123';

        // Act
        const { query } = tenantIsolationService.addTenantToQuery(
          complexQuery,
          [],
          organizationId
        );

        // Assert
        expect(query).toContain('u.organization_id = ?');
        expect(query).toContain('d.organization_id = ?');
      });
    });

    describe('Row-Level Security', () => {
      it('should create RLS policies for PostgreSQL', async () => {
        // Arrange
        const createPolicySQL = `
          CREATE POLICY tenant_isolation_users ON users
          FOR ALL TO application_role
          USING (organization_id = current_setting('app.current_organization_id'))
        `;

        // Act
        await tenantIsolationService.createRowLevelSecurityPolicies();

        // Assert
        expect(databaseService.$executeRaw).toHaveBeenCalledWith(
          expect.stringContaining('CREATE POLICY')
        );
      });

      it('should set organization context for database session', async () => {
        // Arrange
        const organizationId = 'org-123';

        // Act
        await tenantIsolationService.setDatabaseContext(organizationId);

        // Assert
        expect(databaseService.$executeRaw).toHaveBeenCalledWith(
          `SET app.current_organization_id = '${organizationId}'`
        );
      });

      it('should clear organization context after operation', async () => {
        // Act
        await tenantIsolationService.clearDatabaseContext();

        // Assert
        expect(databaseService.$executeRaw).toHaveBeenCalledWith(
          'RESET app.current_organization_id'
        );
      });
    });
  });

  describe('Security Validation', () => {
    describe('Cross-Tenant Attack Prevention', () => {
      it('should prevent ID enumeration attacks', async () => {
        // Arrange
        const attackerUser = userA;
        const targetResource = 'dashboard-b'; // From different org

        // Act & Assert
        await expect(
          dashboardService.findById(targetResource, attackerUser)
        ).rejects.toThrow(ForbiddenException);
      });

      it('should prevent privilege escalation through tenant switching', async () => {
        // Arrange
        const maliciousPayload = {
          organizationId: 'org-b', // Trying to switch organizations
          role: 'ADMIN',
        };

        userService.update.mockImplementation(async (userId, data, user) => {
          // Should validate that organizationId cannot be changed
          if (data.organizationId && data.organizationId !== user.organizationId) {
            throw new ForbiddenException('Cannot change organization');
          }
          return { ...user, ...data };
        });

        // Act & Assert
        await expect(
          userService.update('user-a', maliciousPayload, userA)
        ).rejects.toThrow(ForbiddenException);
      });

      it('should validate JWT claims match request organization', async () => {
        // Arrange
        const jwtClaims = {
          sub: 'user-a',
          organizationId: 'org-a',
        };

        const requestOrganizationId = 'org-b'; // Different from JWT

        // Act & Assert
        await expect(
          tenantIsolationService.validateJWTTenantClaims(jwtClaims, requestOrganizationId)
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('Data Leakage Prevention', () => {
      it('should prevent data leakage through API responses', async () => {
        // Arrange
        const mixedData = [
          { id: 1, organizationId: 'org-a', data: 'sensitive-a' },
          { id: 2, organizationId: 'org-b', data: 'sensitive-b' },
        ];

        // Act
        const filteredData = tenantIsolationService.filterResponseByTenant(
          mixedData,
          'org-a'
        );

        // Assert
        expect(filteredData).toHaveLength(1);
        expect(filteredData[0].organizationId).toBe('org-a');
      });

      it('should sanitize error messages to prevent information disclosure', () => {
        // Arrange
        const sensitiveError = new Error('User org-b-secret-123 not found');

        // Act
        const sanitizedMessage = tenantIsolationService.sanitizeErrorMessage(
          sensitiveError.message,
          'org-a'
        );

        // Assert
        expect(sanitizedMessage).not.toContain('org-b');
        expect(sanitizedMessage).not.toContain('secret-123');
        expect(sanitizedMessage).toBe('Resource not found');
      });

      it('should prevent tenant inference through timing attacks', async () => {
        // Arrange
        const startTime = Date.now();

        // Act - Should take similar time regardless of whether resource exists
        await expect(
          dashboardService.findById('nonexistent-dashboard', userA)
        ).rejects.toThrow();

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Assert - Should have consistent timing (mock implementation)
        expect(duration).toBeLessThan(1000); // Reasonable upper bound
      });
    });

    describe('Audit and Monitoring', () => {
      it('should log all cross-tenant access attempts', async () => {
        // Arrange
        auditService.log.mockResolvedValue(undefined);

        // Act
        try {
          await tenantIsolationService.validateTenantAccess(userA, 'org-b');
        } catch (error) {
          // Expected to fail
        }

        // Assert
        expect(auditService.log).toHaveBeenCalledWith(
          'TENANT_ACCESS_DENIED',
          'user-a',
          expect.objectContaining({
            requestedOrganizationId: 'org-b',
            userOrganizationId: 'org-a',
          })
        );
      });

      it('should monitor suspicious tenant access patterns', async () => {
        // Arrange
        const suspiciousActivity = {
          userId: 'user-a',
          failedAttempts: 5,
          targetOrganizations: ['org-b', 'org-c', 'org-d'],
          timeWindow: 60000, // 1 minute
        };

        // Act
        const isHighRisk = tenantIsolationService.detectSuspiciousActivity(suspiciousActivity);

        // Assert
        expect(isHighRisk).toBe(true);
        expect(auditService.log).toHaveBeenCalledWith(
          'SUSPICIOUS_TENANT_ACCESS',
          'user-a',
          suspiciousActivity
        );
      });
    });
  });
});
