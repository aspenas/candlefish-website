import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrganizationService } from '../../../services/organization/organization.service';
import { DatabaseService } from '../../../services/database/database.service';
import { CacheService } from '../../../services/cache/cache.service';
import { AuditService } from '../../../services/audit/audit.service';
import { Organization, User } from '../../../types/entities';
import { CreateOrganizationDto, UpdateOrganizationDto } from '../../../dto/organization.dto';

describe('OrganizationService', () => {
  let organizationService: OrganizationService;
  let databaseService: DeepMocked<DatabaseService>;
  let cacheService: DeepMocked<CacheService>;
  let auditService: DeepMocked<AuditService>;

  const mockOrganization: Organization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    plan: 'PREMIUM',
    maxUsers: 100,
    currentUsers: 5,
    isActive: true,
    settings: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      currency: 'USD',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'admin@test-org.com',
    organizationId: 'org-123',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: DatabaseService,
          useValue: createMock<DatabaseService>(),
        },
        {
          provide: CacheService,
          useValue: createMock<CacheService>(),
        },
        {
          provide: AuditService,
          useValue: createMock<AuditService>(),
        },
      ],
    }).compile();

    organizationService = module.get<OrganizationService>(OrganizationService);
    databaseService = module.get(DatabaseService);
    cacheService = module.get(CacheService);
    auditService = module.get(AuditService);
  });

  describe('create', () => {
    const createDto: CreateOrganizationDto = {
      name: 'New Organization',
      slug: 'new-org',
      plan: 'BASIC',
      adminEmail: 'admin@new-org.com',
      adminPassword: 'password123',
    };

    it('should create organization successfully', async () => {
      // Arrange
      databaseService.organization.findUnique.mockResolvedValue(null); // Slug available
      databaseService.user.findUnique.mockResolvedValue(null); // Email available
      databaseService.$transaction.mockImplementation(async (callback) => {
        return await callback(databaseService);
      });
      databaseService.organization.create.mockResolvedValue(mockOrganization);
      cacheService.del.mockResolvedValue(1);

      // Act
      const result = await organizationService.create(createDto);

      // Assert
      expect(result).toEqual(mockOrganization);
      expect(databaseService.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createDto.name,
          slug: createDto.slug,
          plan: createDto.plan,
        }),
      });
      expect(auditService.log).toHaveBeenCalledWith(
        'ORGANIZATION_CREATED',
        expect.any(String),
        expect.objectContaining({ name: createDto.name })
      );
    });

    it('should throw ConflictException when slug already exists', async () => {
      // Arrange
      databaseService.organization.findUnique.mockResolvedValue(mockOrganization);

      // Act & Assert
      await expect(organizationService.create(createDto)).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw ConflictException when admin email already exists', async () => {
      // Arrange
      databaseService.organization.findUnique.mockResolvedValue(null);
      databaseService.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(organizationService.create(createDto)).rejects.toThrow(
        ConflictException
      );
    });

    it('should handle database transaction failure', async () => {
      // Arrange
      databaseService.organization.findUnique.mockResolvedValue(null);
      databaseService.user.findUnique.mockResolvedValue(null);
      databaseService.$transaction.mockRejectedValue(new Error('Transaction failed'));

      // Act & Assert
      await expect(organizationService.create(createDto)).rejects.toThrow(
        'Transaction failed'
      );
    });
  });

  describe('findById', () => {
    it('should return organization when found in cache', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(JSON.stringify(mockOrganization));

      // Act
      const result = await organizationService.findById('org-123');

      // Assert
      expect(result).toEqual(mockOrganization);
      expect(cacheService.get).toHaveBeenCalledWith('org:org-123');
      expect(databaseService.organization.findUnique).not.toHaveBeenCalled();
    });

    it('should return organization when found in database', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      databaseService.organization.findUnique.mockResolvedValue(mockOrganization);
      cacheService.setex.mockResolvedValue('OK');

      // Act
      const result = await organizationService.findById('org-123');

      // Assert
      expect(result).toEqual(mockOrganization);
      expect(databaseService.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-123', isActive: true },
        include: {
          users: true,
          dashboards: true,
          apiKeys: true,
        },
      });
      expect(cacheService.setex).toHaveBeenCalledWith(
        'org:org-123',
        3600,
        JSON.stringify(mockOrganization)
      );
    });

    it('should return null when organization not found', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      databaseService.organization.findUnique.mockResolvedValue(null);

      // Act
      const result = await organizationService.findById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto: UpdateOrganizationDto = {
      name: 'Updated Organization',
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
      },
    };

    it('should update organization successfully', async () => {
      // Arrange
      const updatedOrg = { ...mockOrganization, ...updateDto };
      databaseService.organization.findUnique.mockResolvedValue(mockOrganization);
      databaseService.organization.update.mockResolvedValue(updatedOrg);
      cacheService.del.mockResolvedValue(1);

      // Act
      const result = await organizationService.update('org-123', updateDto, mockUser);

      // Assert
      expect(result).toEqual(updatedOrg);
      expect(databaseService.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: updateDto,
      });
      expect(cacheService.del).toHaveBeenCalledWith('org:org-123');
      expect(auditService.log).toHaveBeenCalledWith(
        'ORGANIZATION_UPDATED',
        'user-123',
        expect.any(Object)
      );
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      databaseService.organization.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        organizationService.update('nonexistent', updateDto, mockUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      // Arrange
      const nonAdminUser = { ...mockUser, role: 'USER' };
      databaseService.organization.findUnique.mockResolvedValue(mockOrganization);

      // Act & Assert
      await expect(
        organizationService.update('org-123', updateDto, nonAdminUser)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should soft delete organization successfully', async () => {
      // Arrange
      databaseService.organization.findUnique.mockResolvedValue(mockOrganization);
      databaseService.$transaction.mockImplementation(async (callback) => {
        return await callback(databaseService);
      });
      cacheService.del.mockResolvedValue(1);

      // Act
      await organizationService.delete('org-123', mockUser);

      // Assert
      expect(databaseService.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: { isActive: false },
      });
      expect(databaseService.user.updateMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        data: { isActive: false },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        'ORGANIZATION_DELETED',
        'user-123',
        expect.any(Object)
      );
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      databaseService.organization.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(organizationService.delete('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      // Arrange
      const nonAdminUser = { ...mockUser, role: 'USER' };
      databaseService.organization.findUnique.mockResolvedValue(mockOrganization);

      // Act & Assert
      await expect(
        organizationService.delete('org-123', nonAdminUser)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserCount', () => {
    it('should return current user count', async () => {
      // Arrange
      databaseService.user.count.mockResolvedValue(5);

      // Act
      const result = await organizationService.getUserCount('org-123');

      // Assert
      expect(result).toBe(5);
      expect(databaseService.user.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', isActive: true },
      });
    });
  });

  describe('canAddUser', () => {
    it('should return true when under user limit', async () => {
      // Arrange
      databaseService.organization.findUnique.mockResolvedValue(mockOrganization);
      databaseService.user.count.mockResolvedValue(5);

      // Act
      const result = await organizationService.canAddUser('org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when at user limit', async () => {
      // Arrange
      databaseService.organization.findUnique.mockResolvedValue(mockOrganization);
      databaseService.user.count.mockResolvedValue(100);

      // Act
      const result = await organizationService.canAddUser('org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for unlimited plans', async () => {
      // Arrange
      const unlimitedOrg = { ...mockOrganization, maxUsers: -1 };
      databaseService.organization.findUnique.mockResolvedValue(unlimitedOrg);
      databaseService.user.count.mockResolvedValue(1000);

      // Act
      const result = await organizationService.canAddUser('org-123');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      // Arrange
      const mockStats = {
        users: 5,
        dashboards: 10,
        apiCalls: 1000,
        storageUsed: 1024 * 1024 * 100, // 100MB
      };

      databaseService.user.count.mockResolvedValue(mockStats.users);
      databaseService.dashboard.count.mockResolvedValue(mockStats.dashboards);
      databaseService.apiLog.count.mockResolvedValue(mockStats.apiCalls);
      databaseService.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        storageUsed: mockStats.storageUsed,
      });

      // Act
      const result = await organizationService.getUsageStats('org-123');

      // Assert
      expect(result).toEqual(mockStats);
    });
  });

  describe('upgradePlan', () => {
    it('should upgrade organization plan successfully', async () => {
      // Arrange
      const upgradedOrg = { ...mockOrganization, plan: 'ENTERPRISE', maxUsers: 1000 };
      databaseService.organization.findUnique.mockResolvedValue(mockOrganization);
      databaseService.organization.update.mockResolvedValue(upgradedOrg);
      cacheService.del.mockResolvedValue(1);

      // Act
      const result = await organizationService.upgradePlan('org-123', 'ENTERPRISE', mockUser);

      // Assert
      expect(result).toEqual(upgradedOrg);
      expect(databaseService.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: {
          plan: 'ENTERPRISE',
          maxUsers: 1000,
          updatedAt: expect.any(Date),
        },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        'PLAN_UPGRADED',
        'user-123',
        expect.objectContaining({
          oldPlan: 'PREMIUM',
          newPlan: 'ENTERPRISE',
        })
      );
    });

    it('should throw ForbiddenException for plan downgrade', async () => {
      // Arrange
      databaseService.organization.findUnique.mockResolvedValue(mockOrganization);

      // Act & Assert
      await expect(
        organizationService.upgradePlan('org-123', 'BASIC', mockUser)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getDataRetentionPolicy', () => {
    it('should return retention policy based on plan', async () => {
      // Arrange
      const basicOrg = { ...mockOrganization, plan: 'BASIC' };
      const premiumOrg = { ...mockOrganization, plan: 'PREMIUM' };
      const enterpriseOrg = { ...mockOrganization, plan: 'ENTERPRISE' };

      // Act & Assert
      expect(organizationService.getDataRetentionPolicy(basicOrg)).toBe(30); // 30 days
      expect(organizationService.getDataRetentionPolicy(premiumOrg)).toBe(90); // 90 days
      expect(organizationService.getDataRetentionPolicy(enterpriseOrg)).toBe(365); // 1 year
    });
  });

  describe('ensureDataIsolation', () => {
    it('should validate tenant isolation', async () => {
      // Arrange
      const queryWithTenantFilter = {
        where: { organizationId: 'org-123' },
      };

      // Act
      const isIsolated = organizationService.ensureDataIsolation(queryWithTenantFilter);

      // Assert
      expect(isIsolated).toBe(true);
    });

    it('should detect missing tenant isolation', async () => {
      // Arrange
      const queryWithoutTenantFilter = {
        where: { userId: 'user-123' },
      };

      // Act
      const isIsolated = organizationService.ensureDataIsolation(queryWithoutTenantFilter);

      // Assert
      expect(isIsolated).toBe(false);
    });
  });
});
