// Integration tests for inventory management system with test containers
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Client } from 'pg';
import Redis from 'ioredis';
import fetch from 'node-fetch';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

// Test data factories
interface TestItem {
  id?: string;
  room_id: string;
  name: string;
  description?: string;
  category: string;
  decision: 'Keep' | 'Sell' | 'Donate' | 'Unsure' | 'Sold';
  purchase_price: number;
  asking_price?: number;
  sold_price?: number;
  quantity: number;
  is_fixture: boolean;
  source?: string;
  invoice_ref?: string;
  designer_invoice_price?: number;
  condition?: string;
  placement_notes?: string;
  purchase_date?: Date;
}

interface TestRoom {
  id?: string;
  name: string;
  floor: string;
  square_footage?: number;
  description?: string;
}

class TestDataFactory {
  static createRoom(overrides: Partial<TestRoom> = {}): TestRoom {
    return {
      name: 'Test Room',
      floor: 'Main Floor',
      square_footage: 300,
      description: 'Test room description',
      ...overrides
    };
  }

  static createItem(room_id: string, overrides: Partial<TestItem> = {}): TestItem {
    return {
      room_id,
      name: 'Test Item',
      description: 'Test item description',
      category: 'Furniture',
      decision: 'Unsure',
      purchase_price: 1000.00,
      quantity: 1,
      is_fixture: false,
      source: 'Test Store',
      condition: 'Good',
      purchase_date: new Date('2023-01-15'),
      ...overrides
    };
  }

  static createBulkItems(room_id: string, count: number): TestItem[] {
    return Array.from({ length: count }, (_, i) =>
      TestDataFactory.createItem(room_id, {
        name: `Test Item ${i + 1}`,
        purchase_price: (i + 1) * 100,
        category: i % 2 === 0 ? 'Furniture' : 'Lighting'
      })
    );
  }
}

describe('Inventory Integration Tests', () => {
  let postgresContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let goServerContainer: StartedTestContainer;
  let pgClient: Client;
  let redisClient: Redis;
  let apiBaseUrl: string;
  let graphqlServer: ApolloServer;
  let graphqlUrl: string;

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new GenericContainer('postgres:15-alpine')
      .withEnvironment({
        POSTGRES_DB: 'inventory_test',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test'
      })
      .withExposedPorts(5432)
      .start();

    // Start Redis container
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    // Setup database client
    pgClient = new Client({
      host: postgresContainer.getHost(),
      port: postgresContainer.getMappedPort(5432),
      database: 'inventory_test',
      user: 'test',
      password: 'test'
    });
    await pgClient.connect();

    // Setup Redis client
    redisClient = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(6379)
    });

    // Initialize database schema
    await setupDatabase(pgClient);

    // Start Go API server container
    goServerContainer = await new GenericContainer('golang:1.21-alpine')
      .withCommand([
        'sh', '-c', `
        cd /app &&
        go mod init inventory-api &&
        go mod tidy &&
        go run main.go
        `
      ])
      .withEnvironment({
        DATABASE_URL: `postgres://test:test@${postgresContainer.getHost()}:5432/inventory_test?sslmode=disable`,
        REDIS_URL: `redis://${redisContainer.getHost()}:6379`,
        PORT: '8080'
      })
      .withExposedPorts(8080)
      .withBindMounts([
        {
          source: '/Users/patricksmith/candlefish-ai/5470_S_Highline_Circle/backend',
          target: '/app',
          mode: 'ro'
        }
      ])
      .start();

    apiBaseUrl = `http://${goServerContainer.getHost()}:${goServerContainer.getMappedPort(8080)}`;

    // Wait for API server to be ready
    await waitForApiReady(apiBaseUrl);

    // Start GraphQL server (mocked for integration testing)
    // In a real scenario, this would be your actual GraphQL server
    graphqlServer = await setupMockGraphQLServer();
    const { url } = await startStandaloneServer(graphqlServer, {
      listen: { port: 0 } // Use random available port
    });
    graphqlUrl = url;

  }, 120000); // 2 minute timeout for container startup

  afterAll(async () => {
    await pgClient?.end();
    await redisClient?.disconnect();
    await postgresContainer?.stop();
    await redisContainer?.stop();
    await goServerContainer?.stop();
    await graphqlServer?.stop();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await pgClient.query('DELETE FROM activities');
    await pgClient.query('DELETE FROM images');
    await pgClient.query('DELETE FROM items');
    await pgClient.query('DELETE FROM rooms');
    await redisClient.flushdb();
  });

  describe('Database Integration', () => {
    it('should connect to PostgreSQL and create tables', async () => {
      const result = await pgClient.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);

      const tableNames = result.rows.map(row => row.table_name);
      expect(tableNames).toContain('rooms');
      expect(tableNames).toContain('items');
      expect(tableNames).toContain('images');
      expect(tableNames).toContain('activities');
    });

    it('should handle concurrent database operations', async () => {
      const room = TestDataFactory.createRoom();

      // Insert room
      const roomResult = await pgClient.query(
        'INSERT INTO rooms (name, floor, description) VALUES ($1, $2, $3) RETURNING id',
        [room.name, room.floor, room.description]
      );
      const roomId = roomResult.rows[0].id;

      // Create multiple items concurrently
      const items = TestDataFactory.createBulkItems(roomId, 10);
      const insertPromises = items.map(item =>
        pgClient.query(
          `INSERT INTO items (room_id, name, description, category, decision, purchase_price, quantity, is_fixture, source, condition, purchase_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
          [item.room_id, item.name, item.description, item.category, item.decision,
           item.purchase_price, item.quantity, item.is_fixture, item.source, item.condition, item.purchase_date]
        )
      );

      const results = await Promise.all(insertPromises);
      expect(results).toHaveLength(10);

      // Verify all items were inserted
      const countResult = await pgClient.query('SELECT COUNT(*) FROM items WHERE room_id = $1', [roomId]);
      expect(parseInt(countResult.rows[0].count)).toBe(10);
    });

    it('should maintain referential integrity', async () => {
      // Try to insert item with non-existent room_id
      const item = TestDataFactory.createItem('non-existent-room-id');

      await expect(
        pgClient.query(
          'INSERT INTO items (room_id, name, category, decision, purchase_price, quantity, is_fixture) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [item.room_id, item.name, item.category, item.decision, item.purchase_price, item.quantity, item.is_fixture]
        )
      ).rejects.toThrow();
    });

    it('should handle database transactions correctly', async () => {
      const room = TestDataFactory.createRoom();

      try {
        await pgClient.query('BEGIN');

        // Insert room
        const roomResult = await pgClient.query(
          'INSERT INTO rooms (name, floor, description) VALUES ($1, $2, $3) RETURNING id',
          [room.name, room.floor, room.description]
        );
        const roomId = roomResult.rows[0].id;

        // Insert item
        const item = TestDataFactory.createItem(roomId);
        await pgClient.query(
          'INSERT INTO items (room_id, name, category, decision, purchase_price, quantity, is_fixture) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [item.room_id, item.name, item.category, item.decision, item.purchase_price, item.quantity, item.is_fixture]
        );

        // Simulate error - try to insert duplicate room with same name (assuming unique constraint)
        await pgClient.query(
          'INSERT INTO rooms (name, floor, description) VALUES ($1, $2, $3)',
          [room.name, room.floor, 'Different description']
        );

        await pgClient.query('COMMIT');
      } catch (error) {
        await pgClient.query('ROLLBACK');

        // Verify rollback worked - no data should be inserted
        const roomCount = await pgClient.query('SELECT COUNT(*) FROM rooms');
        const itemCount = await pgClient.query('SELECT COUNT(*) FROM items');

        expect(parseInt(roomCount.rows[0].count)).toBe(0);
        expect(parseInt(itemCount.rows[0].count)).toBe(0);
      }
    });
  });

  describe('Redis Integration', () => {
    it('should connect to Redis and perform basic operations', async () => {
      await redisClient.set('test-key', 'test-value');
      const value = await redisClient.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should handle cache invalidation patterns', async () => {
      // Set up cached inventory summary
      const cacheKey = 'inventory:summary';
      const summaryData = {
        totalItems: 100,
        totalValue: 50000,
        categories: ['Furniture', 'Lighting'],
        lastUpdated: new Date().toISOString()
      };

      await redisClient.setex(cacheKey, 3600, JSON.stringify(summaryData));

      // Verify cache exists
      const cached = await redisClient.get(cacheKey);
      expect(JSON.parse(cached!)).toMatchObject(summaryData);

      // Simulate cache invalidation on item update
      await redisClient.del(cacheKey);
      const afterDeletion = await redisClient.get(cacheKey);
      expect(afterDeletion).toBeNull();
    });

    it('should handle Redis pub/sub for real-time updates', async () => {
      const subscriber = new Redis({
        host: redisContainer.getHost(),
        port: redisContainer.getMappedPort(6379)
      });

      const publisher = new Redis({
        host: redisContainer.getHost(),
        port: redisContainer.getMappedPort(6379)
      });

      const receivedMessages: string[] = [];

      subscriber.subscribe('inventory:updates');
      subscriber.on('message', (channel, message) => {
        if (channel === 'inventory:updates') {
          receivedMessages.push(message);
        }
      });

      // Give subscription time to establish
      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish update message
      await publisher.publish('inventory:updates', JSON.stringify({
        type: 'item_updated',
        itemId: '123',
        changes: { decision: 'Sell' }
      }));

      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedMessages).toHaveLength(1);
      const message = JSON.parse(receivedMessages[0]);
      expect(message.type).toBe('item_updated');
      expect(message.itemId).toBe('123');

      await subscriber.disconnect();
      await publisher.disconnect();
    });
  });

  describe('API Integration', () => {
    it('should handle end-to-end item creation workflow', async () => {
      // Create room first
      const room = TestDataFactory.createRoom({ name: 'Integration Test Room' });
      const roomResponse = await fetch(`${apiBaseUrl}/api/v1/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });

      expect(roomResponse.status).toBe(201);
      const createdRoom = await roomResponse.json();
      expect(createdRoom.id).toBeDefined();

      // Create item in the room
      const item = TestDataFactory.createItem(createdRoom.id, {
        name: 'Integration Test Item'
      });

      const itemResponse = await fetch(`${apiBaseUrl}/api/v1/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });

      expect(itemResponse.status).toBe(201);
      const createdItem = await itemResponse.json();
      expect(createdItem.id).toBeDefined();
      expect(createdItem.name).toBe('Integration Test Item');

      // Verify item appears in room's items
      const roomItemsResponse = await fetch(`${apiBaseUrl}/api/v1/rooms/${createdRoom.id}/items`);
      expect(roomItemsResponse.status).toBe(200);
      const roomItems = await roomItemsResponse.json();
      expect(roomItems.items).toHaveLength(1);
      expect(roomItems.items[0].id).toBe(createdItem.id);
    });

    it('should handle bulk operations efficiently', async () => {
      // Create room
      const room = TestDataFactory.createRoom({ name: 'Bulk Test Room' });
      const roomResponse = await fetch(`${apiBaseUrl}/api/v1/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      const createdRoom = await roomResponse.json();

      // Create multiple items
      const items = TestDataFactory.createBulkItems(createdRoom.id, 50);
      const bulkCreateResponse = await fetch(`${apiBaseUrl}/api/v1/items/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      expect(bulkCreateResponse.status).toBe(201);
      const bulkResult = await bulkCreateResponse.json();
      expect(bulkResult.created).toBe(50);

      // Bulk update items
      const itemIds = bulkResult.items.map((item: any) => item.id);
      const bulkUpdateResponse = await fetch(`${apiBaseUrl}/api/v1/items/bulk-update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: itemIds.slice(0, 25), // Update first 25 items
          updates: { decision: 'Sell' }
        })
      });

      expect(bulkUpdateResponse.status).toBe(200);
      const updateResult = await bulkUpdateResponse.json();
      expect(updateResult.updated).toBe(25);

      // Verify updates
      const verifyResponse = await fetch(`${apiBaseUrl}/api/v1/items?decision=Sell`);
      const sellItems = await verifyResponse.json();
      expect(sellItems.items).toHaveLength(25);
    });

    it('should handle search and filtering across large datasets', async () => {
      // Create room and multiple items with varied data
      const room = TestDataFactory.createRoom({ name: 'Search Test Room' });
      const roomResponse = await fetch(`${apiBaseUrl}/api/v1/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      const createdRoom = await roomResponse.json();

      // Create items with specific searchable attributes
      const searchableItems = [
        TestDataFactory.createItem(createdRoom.id, {
          name: 'Leather Sectional Sofa',
          category: 'Furniture',
          decision: 'Keep',
          purchase_price: 3500
        }),
        TestDataFactory.createItem(createdRoom.id, {
          name: 'Modern Table Lamp',
          category: 'Lighting',
          decision: 'Sell',
          purchase_price: 150
        }),
        TestDataFactory.createItem(createdRoom.id, {
          name: 'Vintage Persian Rug',
          category: 'Rug / Carpet',
          decision: 'Keep',
          purchase_price: 2200
        })
      ];

      // Create items
      for (const item of searchableItems) {
        await fetch(`${apiBaseUrl}/api/v1/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }

      // Test text search
      const searchResponse = await fetch(`${apiBaseUrl}/api/v1/search?q=leather`);
      expect(searchResponse.status).toBe(200);
      const searchResults = await searchResponse.json();
      expect(searchResults.items).toHaveLength(1);
      expect(searchResults.items[0].name).toContain('Leather');

      // Test category filter
      const categoryResponse = await fetch(`${apiBaseUrl}/api/v1/items?categories=Furniture`);
      const categoryResults = await categoryResponse.json();
      expect(categoryResults.items).toHaveLength(1);
      expect(categoryResults.items[0].category).toBe('Furniture');

      // Test price range filter
      const priceResponse = await fetch(`${apiBaseUrl}/api/v1/items?minValue=100&maxValue=500`);
      const priceResults = await priceResponse.json();
      expect(priceResults.items).toHaveLength(1);
      expect(priceResults.items[0].purchase_price).toBe(150);

      // Test combined filters
      const combinedResponse = await fetch(`${apiBaseUrl}/api/v1/items?decisions=Keep&minValue=2000`);
      const combinedResults = await combinedResponse.json();
      expect(combinedResults.items).toHaveLength(2); // Sofa and Rug
    });

    it('should handle error scenarios gracefully', async () => {
      // Test 404 for non-existent item
      const notFoundResponse = await fetch(`${apiBaseUrl}/api/v1/items/non-existent-id`);
      expect(notFoundResponse.status).toBe(404);

      // Test validation errors
      const invalidItemResponse = await fetch(`${apiBaseUrl}/api/v1/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '', // Invalid: empty name
          category: 'InvalidCategory',
          purchase_price: -100 // Invalid: negative price
        })
      });
      expect(invalidItemResponse.status).toBe(400);
      const errorResponse = await invalidItemResponse.json();
      expect(errorResponse.errors).toBeDefined();

      // Test database constraint violations
      const room = TestDataFactory.createRoom({ name: 'Constraint Test Room' });
      const roomResponse = await fetch(`${apiBaseUrl}/api/v1/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      const createdRoom = await roomResponse.json();

      // Try to create item with invalid room reference
      const invalidRoomItem = TestDataFactory.createItem('invalid-room-id');
      const invalidRoomResponse = await fetch(`${apiBaseUrl}/api/v1/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRoomItem)
      });
      expect(invalidRoomResponse.status).toBe(400);
    });
  });

  describe('GraphQL Integration', () => {
    it('should handle complex GraphQL queries with joins', async () => {
      // Create test data
      const room = TestDataFactory.createRoom({ name: 'GraphQL Test Room' });
      const roomResponse = await fetch(`${apiBaseUrl}/api/v1/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      const createdRoom = await roomResponse.json();

      const item = TestDataFactory.createItem(createdRoom.id);
      const itemResponse = await fetch(`${apiBaseUrl}/api/v1/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const createdItem = await itemResponse.json();

      // Complex GraphQL query
      const query = `
        query GetRoomWithItems($roomId: ID!) {
          room(id: $roomId) {
            id
            name
            floor
            items {
              id
              name
              category
              decision
              purchase_price
              room {
                name
              }
              activities(limit: 5) {
                id
                action
                details
                created_at
              }
            }
          }
        }
      `;

      const graphqlResponse = await fetch(graphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { roomId: createdRoom.id }
        })
      });

      expect(graphqlResponse.status).toBe(200);
      const result = await graphqlResponse.json();
      expect(result.errors).toBeUndefined();
      expect(result.data.room).toBeDefined();
      expect(result.data.room.items).toHaveLength(1);
      expect(result.data.room.items[0].room.name).toBe(createdRoom.name);
    });

    it('should handle GraphQL mutations with proper validation', async () => {
      const room = TestDataFactory.createRoom({ name: 'Mutation Test Room' });
      const roomResponse = await fetch(`${apiBaseUrl}/api/v1/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      const createdRoom = await roomResponse.json();

      const mutation = `
        mutation CreateItem($input: CreateItemInput!) {
          createItem(input: $input) {
            id
            name
            category
            purchase_price
            room {
              id
              name
            }
          }
        }
      `;

      const mutationResponse = await fetch(graphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              room_id: createdRoom.id,
              name: 'GraphQL Created Item',
              category: 'Furniture',
              decision: 'Unsure',
              purchase_price: 1500,
              quantity: 1,
              is_fixture: false
            }
          }
        })
      });

      expect(mutationResponse.status).toBe(200);
      const result = await mutationResponse.json();
      expect(result.errors).toBeUndefined();
      expect(result.data.createItem.name).toBe('GraphQL Created Item');
      expect(result.data.createItem.room.id).toBe(createdRoom.id);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Create a room for testing
      const room = TestDataFactory.createRoom({ name: 'Concurrency Test Room' });
      const roomResponse = await fetch(`${apiBaseUrl}/api/v1/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      const createdRoom = await roomResponse.json();

      // Create 20 concurrent requests to create items
      const concurrentRequests = Array.from({ length: 20 }, (_, i) =>
        fetch(`${apiBaseUrl}/api/v1/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(TestDataFactory.createItem(createdRoom.id, {
            name: `Concurrent Item ${i + 1}`
          }))
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // Verify all items were created
      const itemsResponse = await fetch(`${apiBaseUrl}/api/v1/rooms/${createdRoom.id}/items`);
      const items = await itemsResponse.json();
      expect(items.items).toHaveLength(20);
    });

    it('should handle large data sets with pagination', async () => {
      const room = TestDataFactory.createRoom({ name: 'Pagination Test Room' });
      const roomResponse = await fetch(`${apiBaseUrl}/api/v1/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      const createdRoom = await roomResponse.json();

      // Create 100 items using bulk operation
      const items = TestDataFactory.createBulkItems(createdRoom.id, 100);
      const bulkResponse = await fetch(`${apiBaseUrl}/api/v1/items/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      expect(bulkResponse.status).toBe(201);

      // Test pagination
      const page1Response = await fetch(`${apiBaseUrl}/api/v1/items?limit=20&offset=0`);
      const page1 = await page1Response.json();
      expect(page1.items).toHaveLength(20);
      expect(page1.total).toBe(100);
      expect(page1.hasMore).toBe(true);

      const page2Response = await fetch(`${apiBaseUrl}/api/v1/items?limit=20&offset=20`);
      const page2 = await page2Response.json();
      expect(page2.items).toHaveLength(20);

      // Last page should have remaining items
      const lastPageResponse = await fetch(`${apiBaseUrl}/api/v1/items?limit=20&offset=80`);
      const lastPage = await lastPageResponse.json();
      expect(lastPage.items).toHaveLength(20);
      expect(lastPage.hasMore).toBe(false);

      // Verify no duplicate items across pages
      const allItems = [...page1.items, ...page2.items, ...lastPage.items];
      const uniqueIds = new Set(allItems.map(item => item.id));
      expect(uniqueIds.size).toBe(60); // 20 items per page * 3 pages
    });
  });

  // Helper functions
  async function setupDatabase(client: Client): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        floor VARCHAR(100),
        square_footage INTEGER,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        decision VARCHAR(50) DEFAULT 'Unsure',
        purchase_price DECIMAL(10,2),
        asking_price DECIMAL(10,2),
        sold_price DECIMAL(10,2),
        quantity INTEGER DEFAULT 1,
        is_fixture BOOLEAN DEFAULT false,
        source VARCHAR(255),
        invoice_ref VARCHAR(255),
        designer_invoice_price DECIMAL(10,2),
        condition VARCHAR(100),
        placement_notes TEXT,
        purchase_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        thumbnail_url VARCHAR(500),
        caption VARCHAR(255),
        is_primary BOOLEAN DEFAULT false,
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(100) NOT NULL,
        item_id UUID REFERENCES items(id) ON DELETE CASCADE,
        item_name VARCHAR(255),
        room_name VARCHAR(255),
        details TEXT,
        old_value VARCHAR(255),
        new_value VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_items_room_id ON items(room_id);
      CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
      CREATE INDEX IF NOT EXISTS idx_items_decision ON items(decision);
      CREATE INDEX IF NOT EXISTS idx_items_purchase_price ON items(purchase_price);
      CREATE INDEX IF NOT EXISTS idx_activities_item_id ON activities(item_id);
      CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
      CREATE INDEX IF NOT EXISTS idx_images_item_id ON images(item_id);
    `);
  }

  async function waitForApiReady(baseUrl: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${baseUrl}/health`);
        if (response.status === 200) {
          return;
        }
      } catch (error) {
        // Connection refused, API not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('API server did not become ready within timeout');
  }

  async function setupMockGraphQLServer(): Promise<ApolloServer> {
    // This would be replaced with your actual GraphQL schema and resolvers
    const typeDefs = `
      type Query {
        room(id: ID!): Room
        items(filters: ItemFilters): ItemConnection
      }

      type Mutation {
        createItem(input: CreateItemInput!): Item
        updateItem(id: ID!, input: UpdateItemInput!): Item
      }

      type Room {
        id: ID!
        name: String!
        floor: String!
        items: [Item!]!
      }

      type Item {
        id: ID!
        name: String!
        category: String!
        decision: String!
        purchase_price: Float!
        room: Room!
        activities(limit: Int): [Activity!]!
      }

      type Activity {
        id: ID!
        action: String!
        details: String
        created_at: String!
      }

      type ItemConnection {
        items: [Item!]!
        total: Int!
        hasMore: Boolean!
      }

      input ItemFilters {
        category: String
        decision: String
      }

      input CreateItemInput {
        room_id: ID!
        name: String!
        category: String!
        decision: String!
        purchase_price: Float!
        quantity: Int!
        is_fixture: Boolean!
      }

      input UpdateItemInput {
        name: String
        decision: String
        purchase_price: Float
      }
    `;

    const resolvers = {
      Query: {
        room: async (parent: any, args: any) => {
          // Mock resolver - in real implementation, this would query your database
          return {
            id: args.id,
            name: 'Test Room',
            floor: 'Main Floor',
            items: []
          };
        },
        items: async (parent: any, args: any) => {
          return {
            items: [],
            total: 0,
            hasMore: false
          };
        }
      },
      Mutation: {
        createItem: async (parent: any, args: any) => {
          return {
            id: 'mock-id',
            ...args.input,
            room: {
              id: args.input.room_id,
              name: 'Test Room'
            },
            activities: []
          };
        }
      },
      Room: {
        items: async (parent: any) => {
          return [];
        }
      },
      Item: {
        room: async (parent: any) => {
          return {
            id: parent.room_id || 'mock-room-id',
            name: 'Test Room'
          };
        },
        activities: async (parent: any) => {
          return [];
        }
      }
    };

    return new ApolloServer({
      typeDefs,
      resolvers,
    });
  }
});
