import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../services/database/database.service';
import { ClickHouseService } from '../../../services/database/clickhouse.service';
import { RedisService } from '../../../services/cache/redis.service';
import { KafkaService } from '../../../services/messaging/kafka.service';
import { testDbConfig, testRedisConfig, testKafkaConfig } from '../../config/test-config';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { createClient } from '@clickhouse/client';

describe('Database Integration Tests', () => {
  let module: TestingModule;
  let databaseService: DatabaseService;
  let clickHouseService: ClickHouseService;
  let redisService: RedisService;
  let kafkaService: KafkaService;
  let prisma: PrismaClient;
  let redis: Redis;
  let kafka: Kafka;
  let producer: Producer;
  let consumer: Consumer;

  // Test data
  const testOrganization = {
    id: 'test-org-123',
    name: 'Test Organization',
    slug: 'test-org',
    plan: 'PREMIUM',
    maxUsers: 100,
    isActive: true,
  };

  const testUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    organizationId: testOrganization.id,
    role: 'USER',
    isActive: true,
  };

  const testDashboard = {
    id: 'test-dashboard-123',
    organizationId: testOrganization.id,
    name: 'Test Dashboard',
    config: {
      widgets: [
        {
          id: 'widget-1',
          type: 'line_chart',
          query: 'SELECT count() FROM events WHERE organization_id = {organizationId:String}',
          position: { x: 0, y: 0, width: 6, height: 4 },
        },
      ],
    },
    isActive: true,
    createdBy: testUser.id,
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [testDbConfig, testRedisConfig, testKafkaConfig],
          isGlobal: true,
        }),
      ],
      providers: [
        DatabaseService,
        ClickHouseService,
        RedisService,
        KafkaService,
      ],
    }).compile();

    databaseService = module.get<DatabaseService>(DatabaseService);
    clickHouseService = module.get<ClickHouseService>(ClickHouseService);
    redisService = module.get<RedisService>(RedisService);
    kafkaService = module.get<KafkaService>(KafkaService);

    // Initialize connections
    await databaseService.onModuleInit();
    await clickHouseService.onModuleInit();
    await redisService.onModuleInit();
    await kafkaService.onModuleInit();

    // Get underlying clients for direct testing
    prisma = databaseService['prisma'];
    redis = redisService['redis'];
    kafka = kafkaService['kafka'];
    producer = kafkaService['producer'];
    consumer = kafkaService['consumer'];
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();

    // Close connections
    await databaseService.onModuleDestroy();
    await clickHouseService.onModuleDestroy();
    await redisService.onModuleDestroy();
    await kafkaService.onModuleDestroy();

    await module.close();
  });

  beforeEach(async () => {
    // Clean state before each test
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      // Delete in reverse dependency order
      await prisma.dashboard.deleteMany({
        where: { organizationId: testOrganization.id },
      });

      await prisma.user.deleteMany({
        where: { organizationId: testOrganization.id },
      });

      await prisma.organization.deleteMany({
        where: { id: testOrganization.id },
      });

      // Clear Redis test keys
      const keys = await redis.keys('test:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      // Clear ClickHouse test data
      await clickHouseService.execute(
        'DELETE FROM events WHERE organization_id = {organizationId:String}',
        { organizationId: testOrganization.id }
      );
    } catch (error) {
      console.warn('Cleanup error (may be expected):', error.message);
    }
  }

  describe('PostgreSQL Integration', () => {
    describe('Basic Operations', () => {
      it('should connect to PostgreSQL successfully', async () => {
        // Act
        const result = await prisma.$queryRaw`SELECT 1 as connected`;

        // Assert
        expect(result).toEqual([{ connected: 1 }]);
      });

      it('should create organization with proper schema', async () => {
        // Act
        const organization = await prisma.organization.create({
          data: testOrganization,
        });

        // Assert
        expect(organization).toMatchObject(testOrganization);
        expect(organization.createdAt).toBeInstanceOf(Date);
        expect(organization.updatedAt).toBeInstanceOf(Date);
      });

      it('should enforce foreign key constraints', async () => {
        // Arrange - Create organization first
        await prisma.organization.create({ data: testOrganization });

        // Act & Assert - Should fail without valid organizationId
        await expect(
          prisma.user.create({
            data: {
              ...testUser,
              organizationId: 'nonexistent-org',
            },
          })
        ).rejects.toThrow();
      });

      it('should handle unique constraints', async () => {
        // Arrange
        await prisma.organization.create({ data: testOrganization });
        await prisma.user.create({ data: testUser });

        // Act & Assert - Should fail on duplicate email
        await expect(
          prisma.user.create({
            data: {
              ...testUser,
              id: 'different-id',
            },
          })
        ).rejects.toThrow();
      });
    });

    describe('Transactions', () => {
      it('should rollback transaction on error', async () => {
        // Arrange
        await prisma.organization.create({ data: testOrganization });

        // Act & Assert
        await expect(
          prisma.$transaction(async (tx) => {
            // Valid operation
            await tx.user.create({ data: testUser });

            // Invalid operation that should rollback
            await tx.user.create({
              data: {
                ...testUser,
                id: 'duplicate-id', // This will fail due to duplicate email
              },
            });
          })
        ).rejects.toThrow();

        // Verify rollback
        const users = await prisma.user.findMany({
          where: { organizationId: testOrganization.id },
        });
        expect(users).toHaveLength(0);
      });

      it('should commit successful transaction', async () => {
        // Act
        await prisma.$transaction(async (tx) => {
          await tx.organization.create({ data: testOrganization });
          await tx.user.create({ data: testUser });
          await tx.dashboard.create({ data: testDashboard });
        });

        // Assert
        const organization = await prisma.organization.findUnique({
          where: { id: testOrganization.id },
          include: {
            users: true,
            dashboards: true,
          },
        });

        expect(organization).toBeTruthy();
        expect(organization.users).toHaveLength(1);
        expect(organization.dashboards).toHaveLength(1);
      });
    });

    describe('Complex Queries', () => {
      beforeEach(async () => {
        // Setup test data
        await prisma.organization.create({ data: testOrganization });
        await prisma.user.create({ data: testUser });
        await prisma.dashboard.create({ data: testDashboard });
      });

      it('should perform complex joins and aggregations', async () => {
        // Act
        const result = await prisma.organization.findUnique({
          where: { id: testOrganization.id },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                users: true,
                dashboards: true,
              },
            },
            users: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        });

        // Assert
        expect(result).toMatchObject({
          id: testOrganization.id,
          name: testOrganization.name,
          _count: {
            users: 1,
            dashboards: 1,
          },
          users: [
            {
              id: testUser.id,
              email: testUser.email,
              role: testUser.role,
            },
          ],
        });
      });

      it('should handle pagination correctly', async () => {
        // Arrange - Create multiple users
        const additionalUsers = Array.from({ length: 10 }, (_, i) => ({
          id: `user-${i}`,
          email: `user${i}@example.com`,
          organizationId: testOrganization.id,
          role: 'USER',
          isActive: true,
        }));

        await prisma.user.createMany({ data: additionalUsers });

        // Act
        const firstPage = await prisma.user.findMany({
          where: { organizationId: testOrganization.id },
          take: 5,
          skip: 0,
          orderBy: { email: 'asc' },
        });

        const secondPage = await prisma.user.findMany({
          where: { organizationId: testOrganization.id },
          take: 5,
          skip: 5,
          orderBy: { email: 'asc' },
        });

        // Assert
        expect(firstPage).toHaveLength(5);
        expect(secondPage).toHaveLength(5);
        expect(firstPage[0].email).toBeLessThan(secondPage[0].email);
      });
    });
  });

  describe('ClickHouse Integration', () => {
    describe('Connection and Basic Operations', () => {
      it('should connect to ClickHouse successfully', async () => {
        // Act
        const result = await clickHouseService.query('SELECT 1 as connected');

        // Assert
        expect(result).toEqual([{ connected: 1 }]);
      });

      it('should insert and query analytics events', async () => {
        // Arrange
        const events = [
          {
            organization_id: testOrganization.id,
            user_id: testUser.id,
            event_type: 'page_view',
            properties: JSON.stringify({ page: '/dashboard' }),
            timestamp: new Date().toISOString(),
            session_id: 'session-123',
            device_id: 'device-123',
          },
          {
            organization_id: testOrganization.id,
            user_id: testUser.id,
            event_type: 'button_click',
            properties: JSON.stringify({ button_id: 'submit' }),
            timestamp: new Date().toISOString(),
            session_id: 'session-123',
            device_id: 'device-123',
          },
        ];

        // Act
        await clickHouseService.insertBatch('events', events);

        // Wait for eventual consistency
        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = await clickHouseService.query(
          'SELECT COUNT() as count FROM events WHERE organization_id = {organizationId:String}',
          { organizationId: testOrganization.id }
        );

        // Assert
        expect(result[0].count).toBe(2);
      });

      it('should handle large batch inserts efficiently', async () => {
        // Arrange
        const batchSize = 1000;
        const events = Array.from({ length: batchSize }, (_, i) => ({
          organization_id: testOrganization.id,
          user_id: testUser.id,
          event_type: 'page_view',
          properties: JSON.stringify({ page: `/page-${i}` }),
          timestamp: new Date().toISOString(),
          session_id: `session-${Math.floor(i / 100)}`,
          device_id: 'device-123',
        }));

        // Act
        const startTime = Date.now();
        await clickHouseService.insertBatch('events', events);
        const endTime = Date.now();

        // Wait for eventual consistency
        await new Promise(resolve => setTimeout(resolve, 2000));

        const result = await clickHouseService.query(
          'SELECT COUNT() as count FROM events WHERE organization_id = {organizationId:String}',
          { organizationId: testOrganization.id }
        );

        // Assert
        expect(result[0].count).toBe(batchSize);
        expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      });
    });

    describe('Analytics Queries', () => {
      beforeEach(async () => {
        // Setup analytics test data
        const events = [
          {
            organization_id: testOrganization.id,
            user_id: testUser.id,
            event_type: 'page_view',
            properties: JSON.stringify({ page: '/dashboard' }),
            timestamp: '2024-01-01 10:00:00',
            session_id: 'session-1',
            device_id: 'device-1',
          },
          {
            organization_id: testOrganization.id,
            user_id: testUser.id,
            event_type: 'page_view',
            properties: JSON.stringify({ page: '/analytics' }),
            timestamp: '2024-01-01 11:00:00',
            session_id: 'session-1',
            device_id: 'device-1',
          },
          {
            organization_id: testOrganization.id,
            user_id: testUser.id,
            event_type: 'button_click',
            properties: JSON.stringify({ button_id: 'export' }),
            timestamp: '2024-01-01 11:30:00',
            session_id: 'session-1',
            device_id: 'device-1',
          },
        ];

        await clickHouseService.insertBatch('events', events);
        await new Promise(resolve => setTimeout(resolve, 1000));
      });

      it('should perform time-based aggregations', async () => {
        // Act
        const result = await clickHouseService.query(`
          SELECT
            toStartOfHour(toDateTime(timestamp)) as hour,
            COUNT() as events
          FROM events
          WHERE organization_id = {organizationId:String}
            AND timestamp >= '2024-01-01 00:00:00'
            AND timestamp < '2024-01-02 00:00:00'
          GROUP BY hour
          ORDER BY hour
        `, { organizationId: testOrganization.id });

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].events).toBe(1);
        expect(result[1].events).toBe(2);
      });

      it('should perform funnel analysis queries', async () => {
        // Act
        const result = await clickHouseService.query(`
          WITH funnel AS (
            SELECT
              user_id,
              windowFunnel(3600)(toDateTime(timestamp), event_type = 'page_view', event_type = 'button_click') as step
            FROM events
            WHERE organization_id = {organizationId:String}
            GROUP BY user_id
          )
          SELECT
            step,
            COUNT() as users
          FROM funnel
          GROUP BY step
          ORDER BY step
        `, { organizationId: testOrganization.id });

        // Assert
        expect(result).toBeTruthy();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should handle complex JSON property queries', async () => {
        // Act
        const result = await clickHouseService.query(`
          SELECT
            JSONExtractString(properties, 'page') as page,
            COUNT() as views
          FROM events
          WHERE organization_id = {organizationId:String}
            AND event_type = 'page_view'
          GROUP BY page
          ORDER BY views DESC
        `, { organizationId: testOrganization.id });

        // Assert
        expect(result).toHaveLength(2);
        expect(result.some(r => r.page === '/dashboard')).toBe(true);
        expect(result.some(r => r.page === '/analytics')).toBe(true);
      });
    });
  });

  describe('Redis Integration', () => {
    describe('Basic Operations', () => {
      it('should connect to Redis successfully', async () => {
        // Act
        const result = await redis.ping();

        // Assert
        expect(result).toBe('PONG');
      });

      it('should set and get values', async () => {
        // Arrange
        const key = 'test:basic';
        const value = 'test-value';

        // Act
        await redisService.set(key, value, 60);
        const retrieved = await redisService.get(key);

        // Assert
        expect(retrieved).toBe(value);
      });

      it('should handle JSON serialization automatically', async () => {
        // Arrange
        const key = 'test:json';
        const value = { id: 1, name: 'Test', data: [1, 2, 3] };

        // Act
        await redisService.setJson(key, value, 60);
        const retrieved = await redisService.getJson(key);

        // Assert
        expect(retrieved).toEqual(value);
      });

      it('should handle expiration correctly', async () => {
        // Arrange
        const key = 'test:expiration';
        const value = 'expires-soon';

        // Act
        await redisService.set(key, value, 1); // 1 second expiration

        // Verify it exists initially
        let retrieved = await redisService.get(key);
        expect(retrieved).toBe(value);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 1100));
        retrieved = await redisService.get(key);

        // Assert
        expect(retrieved).toBeNull();
      });
    });

    describe('Advanced Operations', () => {
      it('should handle hash operations', async () => {
        // Arrange
        const key = 'test:hash';
        const hashData = {
          field1: 'value1',
          field2: 'value2',
          field3: 'value3',
        };

        // Act
        await Promise.all([
          redis.hset(key, 'field1', hashData.field1),
          redis.hset(key, 'field2', hashData.field2),
          redis.hset(key, 'field3', hashData.field3),
        ]);

        const retrieved = await redis.hgetall(key);

        // Assert
        expect(retrieved).toEqual(hashData);
      });

      it('should handle list operations', async () => {
        // Arrange
        const key = 'test:list';
        const items = ['item1', 'item2', 'item3'];

        // Act
        await Promise.all(items.map(item => redis.lpush(key, item)));
        const length = await redis.llen(key);
        const allItems = await redis.lrange(key, 0, -1);

        // Assert
        expect(length).toBe(3);
        expect(allItems).toEqual(items.reverse()); // LPUSH reverses order
      });

      it('should handle sorted sets', async () => {
        // Arrange
        const key = 'test:zset';
        const members = [
          { score: 100, member: 'user1' },
          { score: 200, member: 'user2' },
          { score: 150, member: 'user3' },
        ];

        // Act
        await Promise.all(
          members.map(({ score, member }) => redis.zadd(key, score, member))
        );

        const topMembers = await redis.zrevrange(key, 0, 2, 'WITHSCORES');

        // Assert
        expect(topMembers).toEqual(['user2', '200', 'user3', '150', 'user1', '100']);
      });
    });

    describe('Pub/Sub Operations', () => {
      it('should handle publish/subscribe messaging', async () => {
        // Arrange
        const channel = 'test:channel';
        const message = JSON.stringify({ type: 'test', data: 'hello' });
        const receivedMessages: string[] = [];

        const subscriber = redis.duplicate();
        await subscriber.subscribe(channel);

        subscriber.on('message', (receivedChannel, receivedMessage) => {
          if (receivedChannel === channel) {
            receivedMessages.push(receivedMessage);
          }
        });

        // Wait for subscription to be established
        await new Promise(resolve => setTimeout(resolve, 100));

        // Act
        await redis.publish(channel, message);

        // Wait for message delivery
        await new Promise(resolve => setTimeout(resolve, 100));

        // Assert
        expect(receivedMessages).toContain(message);

        // Cleanup
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
      });
    });
  });

  describe('Kafka Integration', () => {
    describe('Basic Operations', () => {
      it('should connect to Kafka successfully', async () => {
        // Act & Assert - If we get here without throwing, connection is successful
        expect(producer).toBeTruthy();
        expect(consumer).toBeTruthy();
      });

      it('should produce and consume messages', async () => {
        // Arrange
        const topic = 'test-topic';
        const message = {
          organizationId: testOrganization.id,
          userId: testUser.id,
          eventType: 'test_event',
          timestamp: new Date().toISOString(),
        };

        const receivedMessages: any[] = [];

        // Setup consumer
        await consumer.subscribe({ topic });

        const consumerRun = consumer.run({
          eachMessage: async ({ message: kafkaMessage }) => {
            const parsed = JSON.parse(kafkaMessage.value?.toString() || '{}');
            receivedMessages.push(parsed);
          },
        });

        // Wait for consumer to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Act
        await kafkaService.publish(topic, message);

        // Wait for message processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Assert
        expect(receivedMessages).toHaveLength(1);
        expect(receivedMessages[0]).toMatchObject(message);

        // Cleanup
        await consumer.stop();
      });

      it('should handle batch message production', async () => {
        // Arrange
        const topic = 'test-batch-topic';
        const messages = Array.from({ length: 100 }, (_, i) => ({
          organizationId: testOrganization.id,
          userId: testUser.id,
          eventType: 'batch_event',
          sequenceNumber: i,
          timestamp: new Date().toISOString(),
        }));

        const receivedMessages: any[] = [];

        // Setup consumer
        await consumer.subscribe({ topic });

        consumer.run({
          eachMessage: async ({ message: kafkaMessage }) => {
            const parsed = JSON.parse(kafkaMessage.value?.toString() || '{}');
            receivedMessages.push(parsed);
          },
        });

        // Wait for consumer to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Act
        await kafkaService.publishBatch(topic, messages);

        // Wait for message processing
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Assert
        expect(receivedMessages).toHaveLength(100);
        expect(receivedMessages.every(msg => msg.eventType === 'batch_event')).toBe(true);

        // Cleanup
        await consumer.stop();
      });
    });

    describe('Error Handling', () => {
      it('should handle producer errors gracefully', async () => {
        // Arrange
        const invalidTopic = ''; // Invalid topic name

        // Act & Assert
        await expect(
          kafkaService.publish(invalidTopic, { test: 'data' })
        ).rejects.toThrow();
      });

      it('should handle consumer errors gracefully', async () => {
        // Arrange
        const topic = 'test-error-topic';
        let errorHandled = false;

        // Setup consumer with error handler
        await consumer.subscribe({ topic });

        consumer.run({
          eachMessage: async ({ message }) => {
            // Simulate processing error
            throw new Error('Processing failed');
          },
        });

        consumer.on('consumer.crash', () => {
          errorHandled = true;
        });

        // Act
        await kafkaService.publish(topic, { test: 'data' });

        // Wait for error handling
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Assert - Error should be handled without crashing the test
        expect(errorHandled).toBe(true);

        // Cleanup
        await consumer.stop();
      });
    });

    describe('Message Ordering and Partitioning', () => {
      it('should maintain message order within partitions', async () => {
        // Arrange
        const topic = 'test-ordered-topic';
        const partitionKey = testOrganization.id; // Use org ID as partition key
        const messageCount = 10;
        const messages = Array.from({ length: messageCount }, (_, i) => ({
          organizationId: testOrganization.id,
          sequenceNumber: i,
          timestamp: new Date().toISOString(),
        }));

        const receivedMessages: any[] = [];

        // Setup consumer
        await consumer.subscribe({ topic });

        consumer.run({
          eachMessage: async ({ message }) => {
            const parsed = JSON.parse(message.value?.toString() || '{}');
            receivedMessages.push(parsed);
          },
        });

        // Wait for consumer to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Act - Send messages with the same partition key
        for (const message of messages) {
          await kafkaService.publish(topic, message, partitionKey);
        }

        // Wait for all messages to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Assert - Messages should be in order
        expect(receivedMessages).toHaveLength(messageCount);
        for (let i = 0; i < messageCount; i++) {
          expect(receivedMessages[i].sequenceNumber).toBe(i);
        }

        // Cleanup
        await consumer.stop();
      });
    });
  });

  describe('Cross-Database Integration', () => {
    describe('Data Pipeline', () => {
      it('should handle end-to-end data flow from PostgreSQL to ClickHouse via Kafka', async () => {
        // Arrange - Setup initial data in PostgreSQL
        await prisma.organization.create({ data: testOrganization });
        await prisma.user.create({ data: testUser });

        const topic = 'analytics-events';
        const analyticsEvents: any[] = [];

        // Setup Kafka consumer for analytics events
        await consumer.subscribe({ topic });

        consumer.run({
          eachMessage: async ({ message }) => {
            const event = JSON.parse(message.value?.toString() || '{}');
            analyticsEvents.push(event);

            // Insert into ClickHouse (simulating analytics service)
            await clickHouseService.insert('events', {
              organization_id: event.organizationId,
              user_id: event.userId,
              event_type: event.eventType,
              properties: JSON.stringify(event.properties || {}),
              timestamp: event.timestamp,
              session_id: event.sessionId || 'unknown',
              device_id: event.deviceId || 'unknown',
            });
          },
        });

        // Wait for consumer setup
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Act - Simulate user activity generating events
        const userEvents = [
          {
            organizationId: testOrganization.id,
            userId: testUser.id,
            eventType: 'login',
            properties: { source: 'web' },
            timestamp: new Date().toISOString(),
            sessionId: 'session-123',
          },
          {
            organizationId: testOrganization.id,
            userId: testUser.id,
            eventType: 'page_view',
            properties: { page: '/dashboard' },
            timestamp: new Date().toISOString(),
            sessionId: 'session-123',
          },
          {
            organizationId: testOrganization.id,
            userId: testUser.id,
            eventType: 'button_click',
            properties: { buttonId: 'create-dashboard' },
            timestamp: new Date().toISOString(),
            sessionId: 'session-123',
          },
        ];

        // Send events to Kafka
        for (const event of userEvents) {
          await kafkaService.publish(topic, event);
        }

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Assert - Events should be in ClickHouse
        const clickhouseEvents = await clickHouseService.query(
          'SELECT COUNT() as count FROM events WHERE organization_id = {organizationId:String}',
          { organizationId: testOrganization.id }
        );

        expect(clickhouseEvents[0].count).toBe(userEvents.length);

        // Cleanup
        await consumer.stop();
      });

      it('should maintain data consistency across databases', async () => {
        // Arrange
        await prisma.organization.create({ data: testOrganization });
        await prisma.user.create({ data: testUser });
        await prisma.dashboard.create({ data: testDashboard });

        // Cache dashboard in Redis
        await redisService.setJson(
          `dashboard:${testDashboard.id}`,
          testDashboard,
          3600
        );

        // Act - Verify data consistency
        const pgDashboard = await prisma.dashboard.findUnique({
          where: { id: testDashboard.id },
        });

        const cachedDashboard = await redisService.getJson(`dashboard:${testDashboard.id}`);

        // Assert
        expect(pgDashboard).toBeTruthy();
        expect(cachedDashboard).toBeTruthy();
        expect(pgDashboard?.name).toBe(cachedDashboard?.name);
        expect(pgDashboard?.organizationId).toBe(cachedDashboard?.organizationId);
      });
    });

    describe('Transaction Consistency', () => {
      it('should handle distributed transaction rollback', async () => {
        // Arrange
        const tempOrgData = {
          ...testOrganization,
          id: 'temp-org-rollback',
        };

        // Act - Simulate transaction that should rollback
        try {
          await prisma.$transaction(async (tx) => {
            // Create organization
            await tx.organization.create({ data: tempOrgData });

            // Cache in Redis
            await redisService.setJson(`org:${tempOrgData.id}`, tempOrgData, 3600);

            // Simulate error that should trigger rollback
            throw new Error('Simulated error');
          });
        } catch (error) {
          // Expected error
        }

        // Assert - PostgreSQL should have rolled back
        const pgOrg = await prisma.organization.findUnique({
          where: { id: tempOrgData.id },
        });
        expect(pgOrg).toBeNull();

        // Redis data should be cleaned up manually (in real app)
        await redisService.del(`org:${tempOrgData.id}`);
        const cachedOrg = await redisService.getJson(`org:${tempOrgData.id}`);
        expect(cachedOrg).toBeNull();
      });
    });
  });
});
