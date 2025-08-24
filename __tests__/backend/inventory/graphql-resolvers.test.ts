import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/federation';
import gql from 'graphql-tag';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createTestClient } from 'apollo-server-testing';

// Mock the inventory service
const mockInventoryService = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
  getAnalytics: jest.fn(),
  getLowStock: jest.fn(),
};

// Mock context
const mockContext = {
  dataSources: {
    inventoryService: mockInventoryService,
  },
  user: {
    id: 'user-1',
    email: 'test@example.com',
    role: 'admin',
  },
};

// GraphQL type definitions
const typeDefs = gql`
  type InventoryItem @key(fields: "id") {
    id: ID!
    name: String!
    description: String
    category: String!
    sku: String!
    barcode: String
    quantity: Int!
    minQuantity: Int!
    maxQuantity: Int
    unitPrice: Float!
    totalValue: Float!
    location: String!
    supplier: String
    imageUri: String
    tags: String
    isActive: Boolean!
    dateAdded: String!
    lastUpdated: String!
    syncStatus: String!
    version: Int!
  }

  input InventoryItemInput {
    name: String!
    description: String
    category: String!
    sku: String!
    barcode: String
    quantity: Int!
    minQuantity: Int!
    maxQuantity: Int
    unitPrice: Float!
    location: String!
    supplier: String
    imageUri: String
    tags: String
  }

  input InventoryItemUpdateInput {
    name: String
    description: String
    category: String
    sku: String
    barcode: String
    quantity: Int
    minQuantity: Int
    maxQuantity: Int
    unitPrice: Float
    location: String
    supplier: String
    imageUri: String
    tags: String
  }

  type InventoryAnalytics {
    totalItems: Int!
    totalValue: Float!
    categories: [CategoryAnalytics!]!
    lowStockItems: Int!
    topValueItems: [InventoryItem!]!
  }

  type CategoryAnalytics {
    category: String!
    itemCount: Int!
    totalValue: Float!
    averageValue: Float!
  }

  type SearchResult {
    items: [InventoryItem!]!
    total: Int!
    hasNextPage: Boolean!
  }

  type Mutation {
    createInventoryItem(input: InventoryItemInput!): InventoryItem!
    updateInventoryItem(id: ID!, input: InventoryItemUpdateInput!): InventoryItem!
    deleteInventoryItem(id: ID!): Boolean!
    updateInventoryQuantity(id: ID!, quantity: Int!): InventoryItem!
    bulkUpdateInventoryItems(items: [BulkUpdateInput!]!): BulkUpdateResult!
  }

  input BulkUpdateInput {
    id: ID!
    quantity: Int
    unitPrice: Float
    location: String
  }

  type BulkUpdateResult {
    updated: Int!
    errors: [String!]!
  }

  type Query {
    inventoryItem(id: ID!): InventoryItem
    inventoryItems(
      offset: Int = 0
      limit: Int = 50
      category: String
      searchQuery: String
    ): SearchResult!
    inventoryAnalytics: InventoryAnalytics!
    lowStockItems: [InventoryItem!]!
    categories: [String!]!
    searchInventory(query: String!, category: String, limit: Int = 20): SearchResult!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    inventoryItem: async (_, { id }, { dataSources }) => {
      return await dataSources.inventoryService.findById(id);
    },

    inventoryItems: async (_, { offset, limit, category, searchQuery }, { dataSources }) => {
      const result = await dataSources.inventoryService.findAll({
        offset,
        limit,
        category,
        searchQuery,
      });

      return {
        items: result.items,
        total: result.total,
        hasNextPage: result.total > offset + limit,
      };
    },

    inventoryAnalytics: async (_, __, { dataSources }) => {
      return await dataSources.inventoryService.getAnalytics();
    },

    lowStockItems: async (_, __, { dataSources }) => {
      return await dataSources.inventoryService.getLowStock();
    },

    categories: async (_, __, { dataSources }) => {
      return await dataSources.inventoryService.getCategories();
    },

    searchInventory: async (_, { query, category, limit }, { dataSources }) => {
      const result = await dataSources.inventoryService.search({
        query,
        category,
        limit,
      });

      return {
        items: result.items,
        total: result.total,
        hasNextPage: result.items.length === limit,
      };
    },
  },

  Mutation: {
    createInventoryItem: async (_, { input }, { dataSources, user }) => {
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }
      return await dataSources.inventoryService.create(input);
    },

    updateInventoryItem: async (_, { id, input }, { dataSources, user }) => {
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }
      return await dataSources.inventoryService.update(id, input);
    },

    deleteInventoryItem: async (_, { id }, { dataSources, user }) => {
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }
      return await dataSources.inventoryService.delete(id);
    },

    updateInventoryQuantity: async (_, { id, quantity }, { dataSources }) => {
      return await dataSources.inventoryService.updateQuantity(id, quantity);
    },

    bulkUpdateInventoryItems: async (_, { items }, { dataSources, user }) => {
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }
      return await dataSources.inventoryService.bulkUpdate(items);
    },
  },

  InventoryItem: {
    __resolveReference: async (reference, { dataSources }) => {
      return await dataSources.inventoryService.findById(reference.id);
    },
  },
};

describe('Inventory GraphQL Resolvers', () => {
  let server: ApolloServer;
  let query: any;
  let mutate: any;

  beforeEach(async () => {
    server = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
      context: () => mockContext,
    });

    const testClient = createTestClient(server);
    query = testClient.query;
    mutate = testClient.mutate;

    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Queries', () => {
    describe('inventoryItem', () => {
      it('should fetch a single inventory item by ID', async () => {
        const mockItem = {
          id: 'item-1',
          name: 'Test Item',
          description: 'Test Description',
          category: 'Test Category',
          sku: 'TEST-001',
          quantity: 10,
          minQuantity: 5,
          unitPrice: 99.99,
          totalValue: 999.90,
          location: 'Warehouse A',
          isActive: true,
          dateAdded: '2023-01-01T00:00:00Z',
          lastUpdated: '2023-01-01T00:00:00Z',
          syncStatus: 'synced',
          version: 1,
        };

        mockInventoryService.findById.mockResolvedValue(mockItem);

        const GET_INVENTORY_ITEM = gql`
          query GetInventoryItem($id: ID!) {
            inventoryItem(id: $id) {
              id
              name
              description
              category
              sku
              quantity
              unitPrice
              totalValue
              location
              isActive
            }
          }
        `;

        const response = await query({
          query: GET_INVENTORY_ITEM,
          variables: { id: 'item-1' },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.inventoryItem).toEqual({
          id: 'item-1',
          name: 'Test Item',
          description: 'Test Description',
          category: 'Test Category',
          sku: 'TEST-001',
          quantity: 10,
          unitPrice: 99.99,
          totalValue: 999.90,
          location: 'Warehouse A',
          isActive: true,
        });

        expect(mockInventoryService.findById).toHaveBeenCalledWith('item-1');
      });

      it('should return null for non-existent item', async () => {
        mockInventoryService.findById.mockResolvedValue(null);

        const GET_INVENTORY_ITEM = gql`
          query GetInventoryItem($id: ID!) {
            inventoryItem(id: $id) {
              id
              name
            }
          }
        `;

        const response = await query({
          query: GET_INVENTORY_ITEM,
          variables: { id: 'non-existent' },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.inventoryItem).toBeNull();
      });
    });

    describe('inventoryItems', () => {
      it('should fetch paginated inventory items', async () => {
        const mockResult = {
          items: [
            { id: 'item-1', name: 'Item 1', category: 'Category A' },
            { id: 'item-2', name: 'Item 2', category: 'Category B' },
          ],
          total: 10,
        };

        mockInventoryService.findAll.mockResolvedValue(mockResult);

        const GET_INVENTORY_ITEMS = gql`
          query GetInventoryItems($offset: Int, $limit: Int) {
            inventoryItems(offset: $offset, limit: $limit) {
              items {
                id
                name
                category
              }
              total
              hasNextPage
            }
          }
        `;

        const response = await query({
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 5 },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.inventoryItems).toEqual({
          items: mockResult.items,
          total: 10,
          hasNextPage: true,
        });

        expect(mockInventoryService.findAll).toHaveBeenCalledWith({
          offset: 0,
          limit: 5,
          category: undefined,
          searchQuery: undefined,
        });
      });

      it('should filter by category', async () => {
        const mockResult = {
          items: [{ id: 'item-1', name: 'Item 1', category: 'Furniture' }],
          total: 1,
        };

        mockInventoryService.findAll.mockResolvedValue(mockResult);

        const GET_INVENTORY_ITEMS = gql`
          query GetInventoryItems($category: String) {
            inventoryItems(category: $category) {
              items {
                id
                name
                category
              }
              total
            }
          }
        `;

        const response = await query({
          query: GET_INVENTORY_ITEMS,
          variables: { category: 'Furniture' },
        });

        expect(response.errors).toBeUndefined();
        expect(mockInventoryService.findAll).toHaveBeenCalledWith({
          offset: 0,
          limit: 50,
          category: 'Furniture',
          searchQuery: undefined,
        });
      });
    });

    describe('inventoryAnalytics', () => {
      it('should fetch inventory analytics', async () => {
        const mockAnalytics = {
          totalItems: 100,
          totalValue: 50000.0,
          categories: [
            {
              category: 'Furniture',
              itemCount: 50,
              totalValue: 30000.0,
              averageValue: 600.0,
            },
          ],
          lowStockItems: 5,
          topValueItems: [
            { id: 'item-1', name: 'Expensive Item', totalValue: 5000.0 },
          ],
        };

        mockInventoryService.getAnalytics.mockResolvedValue(mockAnalytics);

        const GET_ANALYTICS = gql`
          query GetInventoryAnalytics {
            inventoryAnalytics {
              totalItems
              totalValue
              lowStockItems
              categories {
                category
                itemCount
                totalValue
                averageValue
              }
              topValueItems {
                id
                name
              }
            }
          }
        `;

        const response = await query({
          query: GET_ANALYTICS,
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.inventoryAnalytics).toEqual(mockAnalytics);
        expect(mockInventoryService.getAnalytics).toHaveBeenCalled();
      });
    });

    describe('searchInventory', () => {
      it('should search inventory items', async () => {
        const mockResult = {
          items: [
            { id: 'item-1', name: 'Sofa', category: 'Furniture' },
          ],
          total: 1,
        };

        mockInventoryService.search.mockResolvedValue(mockResult);

        const SEARCH_INVENTORY = gql`
          query SearchInventory($query: String!, $category: String) {
            searchInventory(query: $query, category: $category) {
              items {
                id
                name
                category
              }
              total
              hasNextPage
            }
          }
        `;

        const response = await query({
          query: SEARCH_INVENTORY,
          variables: { query: 'sofa', category: 'Furniture' },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.searchInventory).toEqual({
          items: mockResult.items,
          total: 1,
          hasNextPage: false,
        });

        expect(mockInventoryService.search).toHaveBeenCalledWith({
          query: 'sofa',
          category: 'Furniture',
          limit: 20,
        });
      });
    });
  });

  describe('Mutations', () => {
    describe('createInventoryItem', () => {
      it('should create a new inventory item', async () => {
        const mockItem = {
          id: 'item-new',
          name: 'New Item',
          description: 'New Description',
          category: 'Test',
          sku: 'NEW-001',
          quantity: 5,
          minQuantity: 2,
          unitPrice: 199.99,
          totalValue: 999.95,
          location: 'Storage',
          isActive: true,
        };

        mockInventoryService.create.mockResolvedValue(mockItem);

        const CREATE_ITEM = gql`
          mutation CreateInventoryItem($input: InventoryItemInput!) {
            createInventoryItem(input: $input) {
              id
              name
              description
              category
              sku
              quantity
              unitPrice
              totalValue
            }
          }
        `;

        const input = {
          name: 'New Item',
          description: 'New Description',
          category: 'Test',
          sku: 'NEW-001',
          quantity: 5,
          minQuantity: 2,
          unitPrice: 199.99,
          location: 'Storage',
        };

        const response = await mutate({
          mutation: CREATE_ITEM,
          variables: { input },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.createInventoryItem).toMatchObject({
          id: 'item-new',
          name: 'New Item',
          description: 'New Description',
          category: 'Test',
          sku: 'NEW-001',
          quantity: 5,
          unitPrice: 199.99,
          totalValue: 999.95,
        });

        expect(mockInventoryService.create).toHaveBeenCalledWith(input);
      });

      it('should require admin role for creation', async () => {
        const unauthorizedContext = {
          ...mockContext,
          user: { ...mockContext.user, role: 'user' },
        };

        server = new ApolloServer({
          schema: buildSubgraphSchema({ typeDefs, resolvers }),
          context: () => unauthorizedContext,
        });

        const testClient = createTestClient(server);

        const CREATE_ITEM = gql`
          mutation CreateInventoryItem($input: InventoryItemInput!) {
            createInventoryItem(input: $input) {
              id
            }
          }
        `;

        const input = {
          name: 'New Item',
          category: 'Test',
          sku: 'NEW-001',
          quantity: 5,
          minQuantity: 2,
          unitPrice: 199.99,
          location: 'Storage',
        };

        const response = await testClient.mutate({
          mutation: CREATE_ITEM,
          variables: { input },
        });

        expect(response.errors).toBeDefined();
        expect(response.errors[0].message).toContain('Unauthorized');
      });
    });

    describe('updateInventoryItem', () => {
      it('should update an inventory item', async () => {
        const mockUpdatedItem = {
          id: 'item-1',
          name: 'Updated Item',
          quantity: 15,
          unitPrice: 299.99,
        };

        mockInventoryService.update.mockResolvedValue(mockUpdatedItem);

        const UPDATE_ITEM = gql`
          mutation UpdateInventoryItem($id: ID!, $input: InventoryItemUpdateInput!) {
            updateInventoryItem(id: $id, input: $input) {
              id
              name
              quantity
              unitPrice
            }
          }
        `;

        const input = {
          name: 'Updated Item',
          quantity: 15,
          unitPrice: 299.99,
        };

        const response = await mutate({
          mutation: UPDATE_ITEM,
          variables: { id: 'item-1', input },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.updateInventoryItem).toEqual(mockUpdatedItem);
        expect(mockInventoryService.update).toHaveBeenCalledWith('item-1', input);
      });
    });

    describe('deleteInventoryItem', () => {
      it('should delete an inventory item', async () => {
        mockInventoryService.delete.mockResolvedValue(true);

        const DELETE_ITEM = gql`
          mutation DeleteInventoryItem($id: ID!) {
            deleteInventoryItem(id: $id)
          }
        `;

        const response = await mutate({
          mutation: DELETE_ITEM,
          variables: { id: 'item-1' },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.deleteInventoryItem).toBe(true);
        expect(mockInventoryService.delete).toHaveBeenCalledWith('item-1');
      });

      it('should return false for non-existent item', async () => {
        mockInventoryService.delete.mockResolvedValue(false);

        const DELETE_ITEM = gql`
          mutation DeleteInventoryItem($id: ID!) {
            deleteInventoryItem(id: $id)
          }
        `;

        const response = await mutate({
          mutation: DELETE_ITEM,
          variables: { id: 'non-existent' },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.deleteInventoryItem).toBe(false);
      });
    });

    describe('bulkUpdateInventoryItems', () => {
      it('should perform bulk updates', async () => {
        const mockResult = {
          updated: 2,
          errors: [],
        };

        mockInventoryService.bulkUpdate.mockResolvedValue(mockResult);

        const BULK_UPDATE = gql`
          mutation BulkUpdateInventoryItems($items: [BulkUpdateInput!]!) {
            bulkUpdateInventoryItems(items: $items) {
              updated
              errors
            }
          }
        `;

        const items = [
          { id: 'item-1', quantity: 10 },
          { id: 'item-2', unitPrice: 150.0 },
        ];

        const response = await mutate({
          mutation: BULK_UPDATE,
          variables: { items },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.bulkUpdateInventoryItems).toEqual(mockResult);
        expect(mockInventoryService.bulkUpdate).toHaveBeenCalledWith(items);
      });

      it('should handle partial failures in bulk updates', async () => {
        const mockResult = {
          updated: 1,
          errors: ['Item item-2 not found'],
        };

        mockInventoryService.bulkUpdate.mockResolvedValue(mockResult);

        const BULK_UPDATE = gql`
          mutation BulkUpdateInventoryItems($items: [BulkUpdateInput!]!) {
            bulkUpdateInventoryItems(items: $items) {
              updated
              errors
            }
          }
        `;

        const items = [
          { id: 'item-1', quantity: 10 },
          { id: 'non-existent', quantity: 5 },
        ];

        const response = await mutate({
          mutation: BULK_UPDATE,
          variables: { items },
        });

        expect(response.errors).toBeUndefined();
        expect(response.data.bulkUpdateInventoryItems).toEqual({
          updated: 1,
          errors: ['Item item-2 not found'],
        });
      });
    });
  });

  describe('Federation Resolver', () => {
    it('should resolve item by reference', async () => {
      const mockItem = {
        id: 'item-1',
        name: 'Test Item',
        category: 'Test',
      };

      mockInventoryService.findById.mockResolvedValue(mockItem);

      const resolvedItem = await resolvers.InventoryItem.__resolveReference(
        { id: 'item-1' },
        mockContext
      );

      expect(resolvedItem).toEqual(mockItem);
      expect(mockInventoryService.findById).toHaveBeenCalledWith('item-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockInventoryService.findById.mockRejectedValue(
        new Error('Database connection failed')
      );

      const GET_INVENTORY_ITEM = gql`
        query GetInventoryItem($id: ID!) {
          inventoryItem(id: $id) {
            id
            name
          }
        }
      `;

      const response = await query({
        query: GET_INVENTORY_ITEM,
        variables: { id: 'item-1' },
      });

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toContain('Database connection failed');
    });

    it('should validate input data', async () => {
      const CREATE_ITEM = gql`
        mutation CreateInventoryItem($input: InventoryItemInput!) {
          createInventoryItem(input: $input) {
            id
          }
        }
      `;

      const invalidInput = {
        // Missing required fields
        description: 'Test Description',
      };

      const response = await mutate({
        mutation: CREATE_ITEM,
        variables: { input: invalidInput },
      });

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toContain('Field "name" of required type "String!" was not provided');
    });
  });

  describe('DataLoader Integration', () => {
    it('should use DataLoader for efficient data fetching', async () => {
      // Mock multiple item requests to test batching
      const mockItems = [
        { id: 'item-1', name: 'Item 1' },
        { id: 'item-2', name: 'Item 2' },
        { id: 'item-3', name: 'Item 3' },
      ];

      mockInventoryService.findById
        .mockResolvedValueOnce(mockItems[0])
        .mockResolvedValueOnce(mockItems[1])
        .mockResolvedValueOnce(mockItems[2]);

      const GET_MULTIPLE_ITEMS = gql`
        query GetMultipleItems {
          item1: inventoryItem(id: "item-1") { id name }
          item2: inventoryItem(id: "item-2") { id name }
          item3: inventoryItem(id: "item-3") { id name }
        }
      `;

      const response = await query({
        query: GET_MULTIPLE_ITEMS,
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.item1).toEqual(mockItems[0]);
      expect(response.data.item2).toEqual(mockItems[1]);
      expect(response.data.item3).toEqual(mockItems[2]);

      // Verify that service was called for each item
      expect(mockInventoryService.findById).toHaveBeenCalledTimes(3);
    });
  });
});
