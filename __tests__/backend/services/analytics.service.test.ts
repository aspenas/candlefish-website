import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { ClickHouseService } from '../../../services/database/clickhouse.service';
import { CacheService } from '../../../services/cache/cache.service';
import { OrganizationService } from '../../../services/organization/organization.service';
import { KafkaService } from '../../../services/messaging/kafka.service';
import { User, AnalyticsEvent, Dashboard } from '../../../types/entities';
import { CreateEventDto, AnalyticsQueryDto } from '../../../dto/analytics.dto';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let clickHouseService: DeepMocked<ClickHouseService>;
  let cacheService: DeepMocked<CacheService>;
  let organizationService: DeepMocked<OrganizationService>;
  let kafkaService: DeepMocked<KafkaService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-123',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvent: AnalyticsEvent = {
    id: 'event-123',
    organizationId: 'org-123',
    userId: 'user-123',
    eventType: 'page_view',
    properties: {
      page: '/dashboard',
      url: 'https://app.example.com/dashboard',
      referrer: 'https://google.com',
      userAgent: 'Mozilla/5.0...',
    },
    timestamp: new Date(),
    sessionId: 'session-123',
    deviceId: 'device-123',
  };

  const mockDashboard: Dashboard = {
    id: 'dashboard-123',
    organizationId: 'org-123',
    name: 'Test Dashboard',
    config: {
      widgets: [
        {
          id: 'widget-1',
          type: 'line_chart',
          query: 'SELECT * FROM events WHERE event_type = "page_view"',
          position: { x: 0, y: 0, width: 6, height: 4 },
        },
      ],
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: ClickHouseService,
          useValue: createMock<ClickHouseService>(),
        },
        {
          provide: CacheService,
          useValue: createMock<CacheService>(),
        },
        {
          provide: OrganizationService,
          useValue: createMock<OrganizationService>(),
        },
        {
          provide: KafkaService,
          useValue: createMock<KafkaService>(),
        },
      ],
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    clickHouseService = module.get(ClickHouseService);
    cacheService = module.get(CacheService);
    organizationService = module.get(OrganizationService);
    kafkaService = module.get(KafkaService);
  });

  describe('trackEvent', () => {
    const createEventDto: CreateEventDto = {
      eventType: 'button_click',
      properties: {
        buttonId: 'submit-button',
        page: '/forms/contact',
      },
      sessionId: 'session-456',
      deviceId: 'device-456',
    };

    it('should track event successfully', async () => {
      // Arrange
      kafkaService.publish.mockResolvedValue(undefined);

      // Act
      await analyticsService.trackEvent(createEventDto, mockUser);

      // Assert
      expect(kafkaService.publish).toHaveBeenCalledWith('analytics-events', {
        organizationId: mockUser.organizationId,
        userId: mockUser.id,
        eventType: createEventDto.eventType,
        properties: createEventDto.properties,
        sessionId: createEventDto.sessionId,
        deviceId: createEventDto.deviceId,
        timestamp: expect.any(Date),
      });
    });

    it('should validate event properties', async () => {
      // Arrange
      const invalidEventDto = {
        ...createEventDto,
        properties: null,
      };

      // Act & Assert
      await expect(
        analyticsService.trackEvent(invalidEventDto, mockUser)
      ).rejects.toThrow(BadRequestException);
    });

    it('should add user context to event', async () => {
      // Arrange
      kafkaService.publish.mockResolvedValue(undefined);

      // Act
      await analyticsService.trackEvent(createEventDto, mockUser);

      // Assert
      expect(kafkaService.publish).toHaveBeenCalledWith(
        'analytics-events',
        expect.objectContaining({
          organizationId: mockUser.organizationId,
          userId: mockUser.id,
        })
      );
    });

    it('should handle Kafka publish failure gracefully', async () => {
      // Arrange
      kafkaService.publish.mockRejectedValue(new Error('Kafka unavailable'));

      // Act & Assert
      // Should not throw error but log it
      await expect(
        analyticsService.trackEvent(createEventDto, mockUser)
      ).resolves.not.toThrow();
    });
  });

  describe('batchTrackEvents', () => {
    it('should track multiple events in batch', async () => {
      // Arrange
      const events = [
        { ...mockEvent, eventType: 'page_view' },
        { ...mockEvent, eventType: 'button_click' },
        { ...mockEvent, eventType: 'form_submit' },
      ];
      kafkaService.publishBatch.mockResolvedValue(undefined);

      // Act
      await analyticsService.batchTrackEvents(events, mockUser);

      // Assert
      expect(kafkaService.publishBatch).toHaveBeenCalledWith('analytics-events', events);
    });

    it('should validate batch size limits', async () => {
      // Arrange
      const largeEventBatch = Array(1001).fill(mockEvent);

      // Act & Assert
      await expect(
        analyticsService.batchTrackEvents(largeEventBatch, mockUser)
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter out invalid events from batch', async () => {
      // Arrange
      const mixedEvents = [
        { ...mockEvent, eventType: 'page_view' },
        { ...mockEvent, eventType: null }, // Invalid
        { ...mockEvent, eventType: 'button_click' },
      ];
      kafkaService.publishBatch.mockResolvedValue(undefined);

      // Act
      await analyticsService.batchTrackEvents(mixedEvents, mockUser);

      // Assert
      expect(kafkaService.publishBatch).toHaveBeenCalledWith(
        'analytics-events',
        expect.arrayContaining([
          expect.objectContaining({ eventType: 'page_view' }),
          expect.objectContaining({ eventType: 'button_click' }),
        ])
      );
      expect(kafkaService.publishBatch).toHaveBeenCalledWith(
        'analytics-events',
        expect.not.arrayContaining([
          expect.objectContaining({ eventType: null }),
        ])
      );
    });
  });

  describe('query', () => {
    const queryDto: AnalyticsQueryDto = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      eventTypes: ['page_view', 'button_click'],
      groupBy: ['eventType'],
      metrics: ['count', 'unique_users'],
      filters: {
        page: '/dashboard',
      },
    };

    it('should execute analytics query successfully', async () => {
      // Arrange
      const mockResults = [
        { eventType: 'page_view', count: 1000, unique_users: 50 },
        { eventType: 'button_click', count: 500, unique_users: 30 },
      ];

      organizationService.validateMultiTenantAccess.mockResolvedValue(true);
      clickHouseService.query.mockResolvedValue(mockResults);
      cacheService.get.mockResolvedValue(null);
      cacheService.setex.mockResolvedValue('OK');

      // Act
      const result = await analyticsService.query(queryDto, mockUser);

      // Assert
      expect(result).toEqual({
        data: mockResults,
        totalRows: 2,
        executionTime: expect.any(Number),
      });
      expect(organizationService.validateMultiTenantAccess).toHaveBeenCalledWith(
        mockUser,
        mockUser.organizationId
      );
    });

    it('should use cached results when available', async () => {
      // Arrange
      const cachedResults = {
        data: [{ eventType: 'page_view', count: 1000 }],
        totalRows: 1,
        executionTime: 150,
      };

      organizationService.validateMultiTenantAccess.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(JSON.stringify(cachedResults));

      // Act
      const result = await analyticsService.query(queryDto, mockUser);

      // Assert
      expect(result).toEqual(cachedResults);
      expect(clickHouseService.query).not.toHaveBeenCalled();
    });

    it('should validate date range', async () => {
      // Arrange
      const invalidQueryDto = {
        ...queryDto,
        startDate: new Date('2024-01-31'),
        endDate: new Date('2024-01-01'),
      };

      // Act & Assert
      await expect(
        analyticsService.query(invalidQueryDto, mockUser)
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce organization data isolation', async () => {
      // Arrange
      organizationService.validateMultiTenantAccess.mockRejectedValue(
        new ForbiddenException('Access denied')
      );

      // Act & Assert
      await expect(analyticsService.query(queryDto, mockUser)).rejects.toThrow(
        ForbiddenException
      );
      expect(clickHouseService.query).not.toHaveBeenCalled();
    });

    it('should apply tenant filtering to queries', async () => {
      // Arrange
      organizationService.validateMultiTenantAccess.mockResolvedValue(true);
      clickHouseService.query.mockResolvedValue([]);

      // Act
      await analyticsService.query(queryDto, mockUser);

      // Assert
      expect(clickHouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = ?'),
        expect.arrayContaining([mockUser.organizationId])
      );
    });
  });

  describe('getEventsBySession', () => {
    it('should retrieve events by session ID', async () => {
      // Arrange
      const sessionId = 'session-123';
      const mockEvents = [
        { ...mockEvent, sessionId, eventType: 'page_view' },
        { ...mockEvent, sessionId, eventType: 'button_click' },
      ];

      organizationService.validateMultiTenantAccess.mockResolvedValue(true);
      clickHouseService.query.mockResolvedValue(mockEvents);

      // Act
      const result = await analyticsService.getEventsBySession(sessionId, mockUser);

      // Assert
      expect(result).toEqual(mockEvents);
      expect(clickHouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('session_id = ?'),
        expect.arrayContaining([sessionId, mockUser.organizationId])
      );
    });

    it('should return empty array for non-existent session', async () => {
      // Arrange
      const sessionId = 'nonexistent-session';
      organizationService.validateMultiTenantAccess.mockResolvedValue(true);
      clickHouseService.query.mockResolvedValue([]);

      // Act
      const result = await analyticsService.getEventsBySession(sessionId, mockUser);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getUserJourney', () => {
    it('should retrieve user journey events', async () => {
      // Arrange
      const userId = 'user-123';
      const days = 7;
      const mockJourney = [
        { ...mockEvent, eventType: 'login', timestamp: new Date() },
        { ...mockEvent, eventType: 'page_view', timestamp: new Date() },
        { ...mockEvent, eventType: 'form_submit', timestamp: new Date() },
      ];

      organizationService.validateMultiTenantAccess.mockResolvedValue(true);
      clickHouseService.query.mockResolvedValue(mockJourney);

      // Act
      const result = await analyticsService.getUserJourney(userId, days, mockUser);

      // Assert
      expect(result).toEqual(mockJourney);
      expect(clickHouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ? AND organization_id = ?'),
        expect.arrayContaining([userId, mockUser.organizationId])
      );
    });

    it('should limit journey lookback period', async () => {
      // Arrange
      const userId = 'user-123';
      const excessiveDays = 400; // Over 1 year limit

      // Act & Assert
      await expect(
        analyticsService.getUserJourney(userId, excessiveDays, mockUser)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFunnelAnalysis', () => {
    it('should calculate funnel conversion rates', async () => {
      // Arrange
      const funnelSteps = ['page_view', 'button_click', 'form_submit', 'conversion'];
      const mockFunnelData = [
        { step: 'page_view', users: 1000, conversion_rate: 1.0 },
        { step: 'button_click', users: 500, conversion_rate: 0.5 },
        { step: 'form_submit', users: 200, conversion_rate: 0.4 },
        { step: 'conversion', users: 50, conversion_rate: 0.25 },
      ];

      organizationService.validateMultiTenantAccess.mockResolvedValue(true);
      clickHouseService.query.mockResolvedValue(mockFunnelData);

      // Act
      const result = await analyticsService.getFunnelAnalysis(funnelSteps, mockUser);

      // Assert
      expect(result).toEqual({
        steps: mockFunnelData,
        totalDropoff: 0.95, // (1000 - 50) / 1000
        overallConversionRate: 0.05, // 50 / 1000
      });
    });

    it('should validate funnel step order', async () => {
      // Arrange
      const emptyFunnelSteps: string[] = [];

      // Act & Assert
      await expect(
        analyticsService.getFunnelAnalysis(emptyFunnelSteps, mockUser)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCohortAnalysis', () => {
    it('should calculate cohort retention', async () => {
      // Arrange
      const cohortType = 'weekly';
      const mockCohortData = [
        {
          cohort: '2024-W01',
          period_0: 100,
          period_1: 80,
          period_2: 60,
          period_3: 45,
        },
        {
          cohort: '2024-W02',
          period_0: 120,
          period_1: 90,
          period_2: 70,
          period_3: 50,
        },
      ];

      organizationService.validateMultiTenantAccess.mockResolvedValue(true);
      clickHouseService.query.mockResolvedValue(mockCohortData);

      // Act
      const result = await analyticsService.getCohortAnalysis(cohortType, mockUser);

      // Assert
      expect(result).toEqual({
        cohorts: mockCohortData,
        retentionRates: expect.any(Array),
        averageRetention: expect.any(Object),
      });
    });

    it('should support different cohort types', async () => {
      // Arrange
      organizationService.validateMultiTenantAccess.mockResolvedValue(true);
      clickHouseService.query.mockResolvedValue([]);

      // Act
      await analyticsService.getCohortAnalysis('daily', mockUser);
      await analyticsService.getCohortAnalysis('weekly', mockUser);
      await analyticsService.getCohortAnalysis('monthly', mockUser);

      // Assert
      expect(clickHouseService.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('getRealtimeMetrics', () => {
    it('should return real-time analytics metrics', async () => {
      // Arrange
      const mockMetrics = {
        activeUsers: 45,
        pageViews: 1200,
        sessionsToday: 300,
        avgSessionDuration: 180, // seconds
        topPages: [
          { page: '/dashboard', views: 500 },
          { page: '/profile', views: 300 },
          { page: '/settings', views: 200 },
        ],
      };

      cacheService.get.mockResolvedValue(JSON.stringify(mockMetrics));

      // Act
      const result = await analyticsService.getRealtimeMetrics(mockUser);

      // Assert
      expect(result).toEqual(mockMetrics);
      expect(cacheService.get).toHaveBeenCalledWith(
        `realtime:metrics:${mockUser.organizationId}`
      );
    });

    it('should calculate metrics when not cached', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      organizationService.validateMultiTenantAccess.mockResolvedValue(true);

      const mockQueries = [
        Promise.resolve([{ count: 45 }]), // active users
        Promise.resolve([{ count: 1200 }]), // page views
        Promise.resolve([{ count: 300 }]), // sessions
        Promise.resolve([{ avg_duration: 180 }]), // avg session duration
        Promise.resolve([{ page: '/dashboard', views: 500 }]), // top pages
      ];

      clickHouseService.query.mockImplementation(() => mockQueries.shift());
      cacheService.setex.mockResolvedValue('OK');

      // Act
      const result = await analyticsService.getRealtimeMetrics(mockUser);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        activeUsers: 45,
        pageViews: 1200,
        sessionsToday: 300,
        avgSessionDuration: 180,
      }));
      expect(cacheService.setex).toHaveBeenCalledWith(
        `realtime:metrics:${mockUser.organizationId}`,
        60, // 1 minute cache
        expect.any(String)
      );
    });
  });

  describe('cleanupExpiredEvents', () => {
    it('should clean up events based on data retention policy', async () => {
      // Arrange
      const retentionDays = 90;
      organizationService.getDataRetentionPolicy.mockReturnValue(retentionDays);
      clickHouseService.execute.mockResolvedValue({ affected_rows: 1000 });

      // Act
      const result = await analyticsService.cleanupExpiredEvents(mockUser.organizationId);

      // Assert
      expect(result).toEqual({ deletedRows: 1000 });
      expect(clickHouseService.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM events'),
        expect.arrayContaining([mockUser.organizationId])
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      organizationService.getDataRetentionPolicy.mockReturnValue(90);
      clickHouseService.execute.mockRejectedValue(new Error('Cleanup failed'));

      // Act & Assert
      await expect(
        analyticsService.cleanupExpiredEvents(mockUser.organizationId)
      ).rejects.toThrow('Cleanup failed');
    });
  });
});
