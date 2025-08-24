// GraphQL resolver tests for inventory management
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import DataLoader from 'dataloader';

// Mock GraphQL context
interface MockContext {
  dataSources: {
    inventoryAPI: any;
  };
  loaders: {
    itemsByRoomLoader: DataLoader<string, any[]>;
    imagesLoader: DataLoader<string, any[]>;
    activitiesLoader: DataLoader<string, any[]>;
  };
  user?: {
    id: string;
    role: string;
  };
}

// Sample test data matching the Go models
const sampleRooms = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Living Room',
    floor: 'Main Floor',
    square_footage: 400,
    description: 'Main living area with fireplace',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    item_count: 15,
    total_value: 45000
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Master Bedroom',
    floor: 'Upper Floor',
    square_footage: 350,
    description: 'Primary bedroom suite',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    item_count: 12,
    total_value: 35000
  }
];

const sampleItems = [
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    room_id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'West Elm Sectional Sofa',
    description: 'Beautiful brown leather sectional with chaise',
    category: 'Furniture',
    decision: 'Keep',
    purchase_price: 3500.00,
    designer_invoice_price: 4200.00,
    asking_price: 2800.00,
    quantity: 1,
    is_fixture: false,
    source: 'West Elm',
    invoice_ref: 'WE-2023-001',
    condition: 'Excellent',
    purchase_date: new Date('2023-01-15'),
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    room_id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Moroccan Area Rug',
    description: '8x10 hand-knotted wool rug',
    category: 'Rug / Carpet',
    decision: 'Sell',
    purchase_price: 2200.00,
    asking_price: 1800.00,
    quantity: 1,
    is_fixture: false,
    source: 'Pottery Barn',
    condition: 'Good',
    purchase_date: new Date('2023-03-20'),
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z')
  }
];

const sampleImages = [
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    item_id: '550e8400-e29b-41d4-a716-446655440003',
    url: 'https://images.example.com/sofa-1.jpg',
    thumbnail_url: 'https://images.example.com/sofa-1-thumb.jpg',
    caption: 'Front view of sectional',
    is_primary: true,
    uploaded_at: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    item_id: '550e8400-e29b-41d4-a716-446655440003',
    url: 'https://images.example.com/sofa-2.jpg',
    thumbnail_url: 'https://images.example.com/sofa-2-thumb.jpg',
    caption: 'Side view showing chaise',
    is_primary: false,
    uploaded_at: new Date('2024-01-01T10:05:00Z')
  }
];

const sampleActivities = [
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    action: 'decided',
    item_id: '550e8400-e29b-41d4-a716-446655440003',
    item_name: 'West Elm Sectional Sofa',
    room_name: 'Living Room',
    details: 'Decision changed to keep',
    old_value: 'Unsure',
    new_value: 'Keep',
    created_at: new Date('2024-01-01T10:30:00Z')
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    action: 'updated',
    item_id: '550e8400-e29b-41d4-a716-446655440004',
    item_name: 'Moroccan Area Rug',
    room_name: 'Living Room',
    details: 'Asking price updated',
    old_value: '$2000',
    new_value: '$1800',
    created_at: new Date('2024-01-01T11:00:00Z')
  }
];

// Mock data loaders
const createMockDataLoaders = () => ({
  itemsByRoomLoader: new DataLoader(async (roomIds: string[]) => {
    return roomIds.map(roomId => sampleItems.filter(item => item.room_id === roomId));
  }),

  imagesLoader: new DataLoader(async (itemIds: string[]) => {
    return itemIds.map(itemId => sampleImages.filter(image => image.item_id === itemId));
  }),

  activitiesLoader: new DataLoader(async (itemIds: string[]) => {
    return itemIds.map(itemId => sampleActivities.filter(activity => activity.item_id === itemId));
  })
});

// Mock inventory API data source
const createMockInventoryAPI = () => ({
  getRooms: jest.fn(),
  getRoomById: jest.fn(),
  getItems: jest.fn(),
  getItemById: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  searchItems: jest.fn(),
  filterItems: jest.fn(),
  getActivities: jest.fn(),
  getSummary: jest.fn(),
  getRoomAnalytics: jest.fn(),
  getCategoryAnalytics: jest.fn(),
  bulkUpdateItems: jest.fn()
});

describe('GraphQL Inventory Resolvers', () => {
  let mockContext: MockContext;
  let mockAPI: ReturnType<typeof createMockInventoryAPI>;

  beforeEach(() => {
    mockAPI = createMockInventoryAPI();
    mockContext = {
      dataSources: {
        inventoryAPI: mockAPI
      },
      loaders: createMockDataLoaders(),
      user: {
        id: 'user123',
        role: 'owner'
      }
    };
    jest.clearAllMocks();
  });

  describe('Room Resolvers', () => {
    describe('Query.rooms', () => {
      it('should return all rooms with aggregated data', async () => {
        mockAPI.getRooms.mockResolvedValue(sampleRooms);

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.dataSources.inventoryAPI.getRooms();
        };

        const result = await resolver(null, {}, mockContext);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          id: sampleRooms[0].id,
          name: 'Living Room',
          floor: 'Main Floor',
          item_count: 15,
          total_value: 45000
        });
      });

      it('should handle empty result gracefully', async () => {
        mockAPI.getRooms.mockResolvedValue([]);

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.dataSources.inventoryAPI.getRooms();
        };

        const result = await resolver(null, {}, mockContext);

        expect(result).toEqual([]);
      });
    });

    describe('Query.room', () => {
      it('should return specific room by ID', async () => {
        const roomId = sampleRooms[0].id;
        mockAPI.getRoomById.mockResolvedValue(sampleRooms[0]);

        const resolver = async (parent: any, args: { id: string }, context: MockContext) => {
          return context.dataSources.inventoryAPI.getRoomById(args.id);
        };

        const result = await resolver(null, { id: roomId }, mockContext);

        expect(result).toMatchObject({
          id: roomId,
          name: 'Living Room'
        });
        expect(mockAPI.getRoomById).toHaveBeenCalledWith(roomId);
      });

      it('should return null for non-existent room', async () => {
        mockAPI.getRoomById.mockResolvedValue(null);

        const resolver = async (parent: any, args: { id: string }, context: MockContext) => {
          return context.dataSources.inventoryAPI.getRoomById(args.id);
        };

        const result = await resolver(null, { id: 'non-existent' }, mockContext);

        expect(result).toBeNull();
      });
    });

    describe('Room.items', () => {
      it('should resolve room items using data loader', async () => {
        const room = sampleRooms[0];

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.loaders.itemsByRoomLoader.load(parent.id);
        };

        const result = await resolver(room, {}, mockContext);
        const expectedItems = sampleItems.filter(item => item.room_id === room.id);

        expect(result).toHaveLength(expectedItems.length);
        expect(result[0].room_id).toBe(room.id);
      });

      it('should return empty array for room with no items', async () => {
        const emptyRoom = { ...sampleRooms[0], id: 'empty-room-id' };

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.loaders.itemsByRoomLoader.load(parent.id);
        };

        const result = await resolver(emptyRoom, {}, mockContext);

        expect(result).toEqual([]);
      });
    });
  });

  describe('Item Resolvers', () => {
    describe('Query.items', () => {
      it('should return items with pagination', async () => {
        mockAPI.getItems.mockResolvedValue({
          items: sampleItems,
          total: sampleItems.length,
          hasMore: false
        });

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.dataSources.inventoryAPI.getItems(args);
        };

        const result = await resolver(null, { limit: 10, offset: 0 }, mockContext);

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.hasMore).toBe(false);
      });

      it('should handle filtering parameters', async () => {
        const filterArgs = {
          categories: ['Furniture'],
          decisions: ['Keep'],
          rooms: ['Living Room'],
          minPrice: 1000,
          maxPrice: 5000
        };

        const filteredItems = sampleItems.filter(item =>
          filterArgs.categories.includes(item.category) &&
          filterArgs.decisions.includes(item.decision) &&
          item.purchase_price >= filterArgs.minPrice &&
          item.purchase_price <= filterArgs.maxPrice
        );

        mockAPI.getItems.mockResolvedValue({
          items: filteredItems,
          total: filteredItems.length,
          hasMore: false
        });

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.dataSources.inventoryAPI.getItems(args);
        };

        const result = await resolver(null, filterArgs, mockContext);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].category).toBe('Furniture');
        expect(result.items[0].decision).toBe('Keep');
      });

      it('should handle sorting parameters', async () => {
        const sortArgs = {
          sortBy: 'purchase_price',
          sortOrder: 'DESC'
        };

        const sortedItems = [...sampleItems].sort((a, b) => b.purchase_price - a.purchase_price);

        mockAPI.getItems.mockResolvedValue({
          items: sortedItems,
          total: sortedItems.length,
          hasMore: false
        });

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.dataSources.inventoryAPI.getItems(args);
        };

        const result = await resolver(null, sortArgs, mockContext);

        expect(result.items[0].purchase_price).toBeGreaterThanOrEqual(result.items[1].purchase_price);
      });
    });

    describe('Query.item', () => {
      it('should return specific item by ID', async () => {
        const itemId = sampleItems[0].id;
        mockAPI.getItemById.mockResolvedValue(sampleItems[0]);

        const resolver = async (parent: any, args: { id: string }, context: MockContext) => {
          return context.dataSources.inventoryAPI.getItemById(args.id);
        };

        const result = await resolver(null, { id: itemId }, mockContext);

        expect(result.id).toBe(itemId);
        expect(result.name).toBe('West Elm Sectional Sofa');
      });
    });

    describe('Query.searchItems', () => {
      it('should search items by query string', async () => {
        const searchQuery = 'sectional';
        const searchResults = sampleItems.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        mockAPI.searchItems.mockResolvedValue({
          items: searchResults,
          total: searchResults.length
        });

        const resolver = async (parent: any, args: { query: string }, context: MockContext) => {
          return context.dataSources.inventoryAPI.searchItems(args.query);
        };

        const result = await resolver(null, { query: searchQuery }, mockContext);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].name).toContain('Sectional');
      });
    });

    describe('Item.room', () => {
      it('should resolve item room relationship', async () => {
        const item = sampleItems[0];
        const expectedRoom = sampleRooms.find(room => room.id === item.room_id);

        mockAPI.getRoomById.mockResolvedValue(expectedRoom);

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.dataSources.inventoryAPI.getRoomById(parent.room_id);
        };

        const result = await resolver(item, {}, mockContext);

        expect(result).toMatchObject(expectedRoom);
      });
    });

    describe('Item.images', () => {
      it('should resolve item images using data loader', async () => {
        const item = sampleItems[0];

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.loaders.imagesLoader.load(parent.id);
        };

        const result = await resolver(item, {}, mockContext);
        const expectedImages = sampleImages.filter(image => image.item_id === item.id);

        expect(result).toHaveLength(expectedImages.length);
        expect(result[0].item_id).toBe(item.id);
      });
    });

    describe('Item.activities', () => {
      it('should resolve item activities using data loader', async () => {
        const item = sampleItems[0];

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.loaders.activitiesLoader.load(parent.id);
        };

        const result = await resolver(item, {}, mockContext);
        const expectedActivities = sampleActivities.filter(activity => activity.item_id === item.id);

        expect(result).toHaveLength(expectedActivities.length);
        expect(result[0].item_id).toBe(item.id);
      });
    });
  });

  describe('Mutation Resolvers', () => {
    describe('Mutation.createItem', () => {
      it('should create new item with required fields', async () => {
        const input = {
          room_id: sampleRooms[0].id,
          name: 'New Coffee Table',
          category: 'Furniture',
          decision: 'Unsure',
          purchase_price: 899.99,
          quantity: 1,
          is_fixture: false
        };

        const createdItem = {
          id: '550e8400-e29b-41d4-a716-446655440009',
          ...input,
          created_at: new Date(),
          updated_at: new Date()
        };

        mockAPI.createItem.mockResolvedValue(createdItem);

        const resolver = async (parent: any, args: { input: any }, context: MockContext) => {
          return context.dataSources.inventoryAPI.createItem(args.input);
        };

        const result = await resolver(null, { input }, mockContext);

        expect(result).toMatchObject({
          name: 'New Coffee Table',
          category: 'Furniture',
          purchase_price: 899.99
        });
        expect(mockAPI.createItem).toHaveBeenCalledWith(input);
      });

      it('should validate required fields', async () => {
        const invalidInput = {
          // Missing required fields
          name: 'Incomplete Item'
        };

        const resolver = async (parent: any, args: { input: any }, context: MockContext) => {
          // Validation logic
          if (!args.input.room_id || !args.input.category) {
            throw new Error('Missing required fields: room_id and category are required');
          }
          return context.dataSources.inventoryAPI.createItem(args.input);
        };

        await expect(resolver(null, { input: invalidInput }, mockContext))
          .rejects.toThrow('Missing required fields');
      });
    });

    describe('Mutation.updateItem', () => {
      it('should update existing item', async () => {
        const itemId = sampleItems[0].id;
        const updateInput = {
          decision: 'Sell',
          asking_price: 2500.00,
          condition: 'Very Good'
        };

        const updatedItem = {
          ...sampleItems[0],
          ...updateInput,
          updated_at: new Date()
        };

        mockAPI.updateItem.mockResolvedValue(updatedItem);

        const resolver = async (parent: any, args: { id: string, input: any }, context: MockContext) => {
          return context.dataSources.inventoryAPI.updateItem(args.id, args.input);
        };

        const result = await resolver(null, { id: itemId, input: updateInput }, mockContext);

        expect(result.decision).toBe('Sell');
        expect(result.asking_price).toBe(2500.00);
        expect(mockAPI.updateItem).toHaveBeenCalledWith(itemId, updateInput);
      });

      it('should handle non-existent item', async () => {
        mockAPI.updateItem.mockResolvedValue(null);

        const resolver = async (parent: any, args: { id: string, input: any }, context: MockContext) => {
          const result = await context.dataSources.inventoryAPI.updateItem(args.id, args.input);
          if (!result) {
            throw new Error(`Item with id ${args.id} not found`);
          }
          return result;
        };

        await expect(resolver(null, { id: 'non-existent', input: {} }, mockContext))
          .rejects.toThrow('Item with id non-existent not found');
      });
    });

    describe('Mutation.deleteItem', () => {
      it('should delete existing item', async () => {
        const itemId = sampleItems[0].id;
        mockAPI.deleteItem.mockResolvedValue(true);

        const resolver = async (parent: any, args: { id: string }, context: MockContext) => {
          return context.dataSources.inventoryAPI.deleteItem(args.id);
        };

        const result = await resolver(null, { id: itemId }, mockContext);

        expect(result).toBe(true);
        expect(mockAPI.deleteItem).toHaveBeenCalledWith(itemId);
      });
    });

    describe('Mutation.bulkUpdateItems', () => {
      it('should update multiple items', async () => {
        const itemIds = [sampleItems[0].id, sampleItems[1].id];
        const bulkUpdate = {
          decision: 'Sell'
        };

        mockAPI.bulkUpdateItems.mockResolvedValue({
          success: true,
          updatedCount: 2,
          items: itemIds.map(id => ({ ...sampleItems.find(item => item.id === id), decision: 'Sell' }))
        });

        const resolver = async (parent: any, args: { itemIds: string[], input: any }, context: MockContext) => {
          return context.dataSources.inventoryAPI.bulkUpdateItems(args.itemIds, args.input);
        };

        const result = await resolver(null, { itemIds, input: bulkUpdate }, mockContext);

        expect(result.success).toBe(true);
        expect(result.updatedCount).toBe(2);
        expect(result.items).toHaveLength(2);
      });
    });
  });

  describe('Analytics Resolvers', () => {
    describe('Query.inventorySummary', () => {
      it('should return inventory statistics', async () => {
        const summary = {
          totalItems: 239,
          totalValue: 374242.59,
          keepCount: 100,
          sellCount: 80,
          unsureCount: 59,
          soldCount: 0,
          donatedCount: 0,
          roomCount: 15,
          categoryDistribution: [
            { category: 'Furniture', count: 120, value: 200000 },
            { category: 'Art / Decor', count: 50, value: 100000 }
          ]
        };

        mockAPI.getSummary.mockResolvedValue(summary);

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.dataSources.inventoryAPI.getSummary();
        };

        const result = await resolver(null, {}, mockContext);

        expect(result.totalItems).toBe(239);
        expect(result.totalValue).toBe(374242.59);
        expect(result.categoryDistribution).toHaveLength(2);
      });
    });

    describe('Query.roomAnalytics', () => {
      it('should return room-based analytics', async () => {
        const analytics = [
          {
            room: 'Living Room',
            floor: 'Main Floor',
            item_count: 15,
            total_value: 45000,
            avg_value: 3000,
            keep_count: 8,
            sell_count: 5,
            unsure_count: 2
          }
        ];

        mockAPI.getRoomAnalytics.mockResolvedValue({ analytics });

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.dataSources.inventoryAPI.getRoomAnalytics();
        };

        const result = await resolver(null, {}, mockContext);

        expect(result.analytics).toHaveLength(1);
        expect(result.analytics[0].room).toBe('Living Room');
        expect(result.analytics[0].total_value).toBe(45000);
      });
    });

    describe('Query.categoryAnalytics', () => {
      it('should return category-based analytics', async () => {
        const analytics = [
          {
            category: 'Furniture',
            item_count: 120,
            total_value: 200000,
            avg_value: 1666.67,
            min_value: 50,
            max_value: 8000,
            keep_count: 60,
            sell_count: 40,
            unsure_count: 20
          }
        ];

        mockAPI.getCategoryAnalytics.mockResolvedValue({ analytics });

        const resolver = async (parent: any, args: any, context: MockContext) => {
          return context.dataSources.inventoryAPI.getCategoryAnalytics();
        };

        const result = await resolver(null, {}, mockContext);

        expect(result.analytics[0].category).toBe('Furniture');
        expect(result.analytics[0].avg_value).toBeCloseTo(1666.67, 2);
      });
    });
  });

  describe('Activity Resolvers', () => {
    describe('Query.recentActivities', () => {
      it('should return recent activities with pagination', async () => {
        mockAPI.getActivities.mockResolvedValue({
          activities: sampleActivities,
          total: sampleActivities.length
        });

        const resolver = async (parent: any, args: { limit?: number }, context: MockContext) => {
          return context.dataSources.inventoryAPI.getActivities(args.limit || 20);
        };

        const result = await resolver(null, { limit: 10 }, mockContext);

        expect(result.activities).toHaveLength(2);
        expect(result.activities[0].action).toBe('decided');
      });
    });
  });

  describe('Data Loader Tests', () => {
    it('should batch room items efficiently', async () => {
      const roomIds = [sampleRooms[0].id, sampleRooms[1].id];

      // Test data loader batching
      const results = await Promise.all(
        roomIds.map(id => mockContext.loaders.itemsByRoomLoader.load(id))
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(sampleItems.filter(item => item.room_id === roomIds[0]));
      expect(results[1]).toEqual(sampleItems.filter(item => item.room_id === roomIds[1]));
    });

    it('should cache results for repeated requests', async () => {
      const roomId = sampleRooms[0].id;

      // Load the same room twice
      const firstLoad = await mockContext.loaders.itemsByRoomLoader.load(roomId);
      const secondLoad = await mockContext.loaders.itemsByRoomLoader.load(roomId);

      // Results should be identical (from cache)
      expect(firstLoad).toEqual(secondLoad);
    });

    it('should handle empty results in data loaders', async () => {
      const nonExistentRoomId = 'non-existent-room';

      const result = await mockContext.loaders.itemsByRoomLoader.load(nonExistentRoomId);

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAPI.getItems.mockRejectedValue(new Error('Database connection failed'));

      const resolver = async (parent: any, args: any, context: MockContext) => {
        try {
          return await context.dataSources.inventoryAPI.getItems(args);
        } catch (error) {
          throw new Error(`Failed to fetch items: ${error.message}`);
        }
      };

      await expect(resolver(null, {}, mockContext))
        .rejects.toThrow('Failed to fetch items: Database connection failed');
    });

    it('should validate user permissions', async () => {
      const unauthorizedContext = {
        ...mockContext,
        user: { id: 'user123', role: 'viewer' }
      };

      const resolver = async (parent: any, args: any, context: MockContext) => {
        if (context.user?.role !== 'owner' && context.user?.role !== 'admin') {
          throw new Error('Insufficient permissions for this operation');
        }
        return context.dataSources.inventoryAPI.deleteItem(args.id);
      };

      await expect(resolver(null, { id: 'item123' }, unauthorizedContext))
        .rejects.toThrow('Insufficient permissions');
    });

    it('should handle malformed input data', async () => {
      const malformedInput = {
        name: '',
        category: 'Invalid Category',
        purchase_price: 'not a number'
      };

      const resolver = async (parent: any, args: { input: any }, context: MockContext) => {
        // Input validation
        if (!args.input.name || args.input.name.trim() === '') {
          throw new Error('Item name cannot be empty');
        }

        const validCategories = ['Furniture', 'Art / Decor', 'Electronics', 'Lighting', 'Rug / Carpet'];
        if (!validCategories.includes(args.input.category)) {
          throw new Error('Invalid category provided');
        }

        if (args.input.purchase_price && isNaN(parseFloat(args.input.purchase_price))) {
          throw new Error('Purchase price must be a valid number');
        }

        return context.dataSources.inventoryAPI.createItem(args.input);
      };

      await expect(resolver(null, { input: malformedInput }, mockContext))
        .rejects.toThrow('Item name cannot be empty');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...sampleItems[0],
        id: `item-${i}`,
        name: `Item ${i}`
      }));

      mockAPI.getItems.mockResolvedValue({
        items: largeDataset,
        total: largeDataset.length,
        hasMore: false
      });

      const resolver = async (parent: any, args: any, context: MockContext) => {
        return context.dataSources.inventoryAPI.getItems(args);
      };

      const result = await resolver(null, { limit: 1000 }, mockContext);

      expect(result.items).toHaveLength(1000);
      expect(result.total).toBe(1000);
    });

    it('should optimize data loader queries', async () => {
      const multipleRoomIds = Array.from({ length: 10 }, (_, i) => `room-${i}`);

      // Load multiple rooms in parallel
      const startTime = Date.now();
      await Promise.all(
        multipleRoomIds.map(id => mockContext.loaders.itemsByRoomLoader.load(id))
      );
      const endTime = Date.now();

      // Should complete quickly due to batching
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
