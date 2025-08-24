import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InventoryList } from '../../../5470_S_Highline_Circle/frontend/src/components/InventoryList';
import { GET_INVENTORY_ITEMS, DELETE_INVENTORY_ITEM } from '../../../5470_S_Highline_Circle/frontend/src/graphql/queries';

// Mock data
const mockItems = [
  {
    id: 'item-1',
    name: 'Modern Sofa',
    description: 'Comfortable 3-seat modern sofa',
    category: 'Furniture',
    sku: 'SOFA-001',
    quantity: 1,
    minQuantity: 1,
    unitPrice: 1200.00,
    totalValue: 1200.00,
    location: 'Living Room',
    supplier: 'Furniture Plus',
    imageUri: '/images/sofa.jpg',
    isActive: true,
    dateAdded: '2023-01-01T00:00:00Z',
    lastUpdated: '2023-01-01T00:00:00Z',
  },
  {
    id: 'item-2',
    name: 'Coffee Table',
    description: 'Glass coffee table with metal legs',
    category: 'Furniture',
    sku: 'TABLE-001',
    quantity: 1,
    minQuantity: 1,
    unitPrice: 350.00,
    totalValue: 350.00,
    location: 'Living Room',
    supplier: 'Glass Works',
    imageUri: '/images/table.jpg',
    isActive: true,
    dateAdded: '2023-01-02T00:00:00Z',
    lastUpdated: '2023-01-02T00:00:00Z',
  },
  {
    id: 'item-3',
    name: 'Table Lamp',
    description: 'Modern table lamp with LED bulb',
    category: 'Lighting',
    sku: 'LAMP-001',
    quantity: 2,
    minQuantity: 1,
    unitPrice: 85.00,
    totalValue: 170.00,
    location: 'Living Room',
    supplier: 'Light Source',
    imageUri: '/images/lamp.jpg',
    isActive: true,
    dateAdded: '2023-01-03T00:00:00Z',
    lastUpdated: '2023-01-03T00:00:00Z',
  },
];

const mockAnalytics = {
  totalItems: 3,
  totalValue: 1720.00,
  categories: [
    { category: 'Furniture', itemCount: 2, totalValue: 1550.00, averageValue: 775.00 },
    { category: 'Lighting', itemCount: 1, totalValue: 170.00, averageValue: 170.00 },
  ],
  lowStockItems: 0,
  topValueItems: mockItems.slice(0, 2),
};

// GraphQL mocks
const mocks = [
  {
    request: {
      query: GET_INVENTORY_ITEMS,
      variables: {
        offset: 0,
        limit: 50,
      },
    },
    result: {
      data: {
        inventoryItems: {
          items: mockItems,
          total: 3,
          hasNextPage: false,
        },
      },
    },
  },
  {
    request: {
      query: GET_INVENTORY_ITEMS,
      variables: {
        offset: 0,
        limit: 50,
        category: 'Furniture',
      },
    },
    result: {
      data: {
        inventoryItems: {
          items: mockItems.filter(item => item.category === 'Furniture'),
          total: 2,
          hasNextPage: false,
        },
      },
    },
  },
  {
    request: {
      query: GET_INVENTORY_ITEMS,
      variables: {
        offset: 0,
        limit: 50,
        searchQuery: 'sofa',
      },
    },
    result: {
      data: {
        inventoryItems: {
          items: [mockItems[0]],
          total: 1,
          hasNextPage: false,
        },
      },
    },
  },
  {
    request: {
      query: DELETE_INVENTORY_ITEM,
      variables: {
        id: 'item-1',
      },
    },
    result: {
      data: {
        deleteInventoryItem: true,
      },
    },
  },
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; apolloMocks?: any[] }> = ({
  children,
  apolloMocks = mocks
}) => (
  <BrowserRouter>
    <MockedProvider mocks={apolloMocks} addTypename={false}>
      {children}
    </MockedProvider>
  </BrowserRouter>
);

describe('InventoryList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render inventory items correctly', async () => {
    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    // Check for loading state initially
    expect(screen.getByText('Loading inventory...')).toBeInTheDocument();

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Verify all items are rendered
    expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    expect(screen.getByText('Coffee Table')).toBeInTheDocument();
    expect(screen.getByText('Table Lamp')).toBeInTheDocument();

    // Verify item details
    expect(screen.getByText('SOFA-001')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('Living Room')).toBeInTheDocument();
  });

  it('should display correct item counts and totals', async () => {
    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Value: $1,720.00')).toBeInTheDocument();
  });

  it('should filter items by category', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Select category filter
    const categorySelect = screen.getByLabelText('Category');
    await user.selectOptions(categorySelect, 'Furniture');

    // Wait for filtered results
    await waitFor(() => {
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    // Verify only furniture items are shown
    expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    expect(screen.getByText('Coffee Table')).toBeInTheDocument();
    expect(screen.queryByText('Table Lamp')).not.toBeInTheDocument();
  });

  it('should search items by name', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Enter search query
    const searchInput = screen.getByPlaceholderText('Search items...');
    await user.type(searchInput, 'sofa');

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('1 items')).toBeInTheDocument();
    });

    // Verify only matching item is shown
    expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    expect(screen.queryByText('Coffee Table')).not.toBeInTheDocument();
    expect(screen.queryByText('Table Lamp')).not.toBeInTheDocument();
  });

  it('should clear search when input is emptied', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });

    // Enter and then clear search
    const searchInput = screen.getByPlaceholderText('Search items...');
    await user.type(searchInput, 'sofa');
    await user.clear(searchInput);

    // Wait for all items to reappear
    await waitFor(() => {
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });

    expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    expect(screen.getByText('Coffee Table')).toBeInTheDocument();
    expect(screen.getByText('Table Lamp')).toBeInTheDocument();
  });

  it('should handle item deletion', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Find and click delete button for first item
    const deleteButtons = screen.getAllByLabelText('Delete item');
    await user.click(deleteButtons[0]);

    // Confirm deletion in modal
    const confirmButton = await screen.findByText('Confirm Delete');
    await user.click(confirmButton);

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText('Item deleted successfully')).toBeInTheDocument();
    });
  });

  it('should sort items by different criteria', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Change sort order
    const sortSelect = screen.getByLabelText('Sort by');
    await user.selectOptions(sortSelect, 'price-desc');

    // Verify items are sorted by price (highest first)
    const itemNames = screen.getAllByTestId('item-name');
    expect(itemNames[0]).toHaveTextContent('Modern Sofa'); // $1200
    expect(itemNames[1]).toHaveTextContent('Coffee Table'); // $350
    expect(itemNames[2]).toHaveTextContent('Table Lamp'); // $85
  });

  it('should display low stock warnings', async () => {
    const lowStockMocks = [
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 50 },
        },
        result: {
          data: {
            inventoryItems: {
              items: [
                {
                  ...mockItems[0],
                  quantity: 0,
                  minQuantity: 1,
                },
              ],
              total: 1,
              hasNextPage: false,
            },
          },
        },
      },
    ];

    render(
      <TestWrapper apolloMocks={lowStockMocks}>
        <InventoryList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    expect(screen.getByTestId('low-stock-warning')).toBeInTheDocument();
  });

  it('should handle pagination', async () => {
    const paginationMocks = [
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 2 },
        },
        result: {
          data: {
            inventoryItems: {
              items: mockItems.slice(0, 2),
              total: 3,
              hasNextPage: true,
            },
          },
        },
      },
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 2, limit: 2 },
        },
        result: {
          data: {
            inventoryItems: {
              items: mockItems.slice(2),
              total: 3,
              hasNextPage: false,
            },
          },
        },
      },
    ];

    const user = userEvent.setup();

    render(
      <TestWrapper apolloMocks={paginationMocks}>
        <InventoryList itemsPerPage={2} />
      </TestWrapper>
    );

    // Wait for first page
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Verify pagination info
    expect(screen.getByText('Showing 1-2 of 3 items')).toBeInTheDocument();

    // Go to next page
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Wait for second page
    await waitFor(() => {
      expect(screen.getByText('Table Lamp')).toBeInTheDocument();
    });

    expect(screen.getByText('Showing 3-3 of 3 items')).toBeInTheDocument();
    expect(screen.queryByText('Modern Sofa')).not.toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    const errorMocks = [
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 50 },
        },
        error: new Error('Network error'),
      },
    ];

    render(
      <TestWrapper apolloMocks={errorMocks}>
        <InventoryList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error loading inventory items')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should retry loading on error', async () => {
    const user = userEvent.setup();
    const errorThenSuccessMocks = [
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 50 },
        },
        error: new Error('Network error'),
      },
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 50 },
        },
        result: {
          data: {
            inventoryItems: {
              items: mockItems,
              total: 3,
              hasNextPage: false,
            },
          },
        },
      },
    ];

    render(
      <TestWrapper apolloMocks={errorThenSuccessMocks}>
        <InventoryList />
      </TestWrapper>
    );

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText('Error loading inventory items')).toBeInTheDocument();
    });

    // Click retry
    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    // Wait for successful load
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    expect(screen.queryByText('Error loading inventory items')).not.toBeInTheDocument();
  });

  it('should display empty state when no items', async () => {
    const emptyMocks = [
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 50 },
        },
        result: {
          data: {
            inventoryItems: {
              items: [],
              total: 0,
              hasNextPage: false,
            },
          },
        },
      },
    ];

    render(
      <TestWrapper apolloMocks={emptyMocks}>
        <InventoryList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No inventory items found')).toBeInTheDocument();
    });

    expect(screen.getByText('Add your first item to get started')).toBeInTheDocument();
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('should navigate to item detail on click', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Click on item
    const itemLink = screen.getByText('Modern Sofa').closest('a');
    expect(itemLink).toHaveAttribute('href', '/items/item-1');
  });

  it('should display item images with fallback', async () => {
    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Check for image elements
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);

    // Verify alt text
    expect(screen.getByAltText('Modern Sofa')).toBeInTheDocument();
    expect(screen.getByAltText('Coffee Table')).toBeInTheDocument();
    expect(screen.getByAltText('Table Lamp')).toBeInTheDocument();

    // Test image fallback
    const image = screen.getByAltText('Modern Sofa');
    fireEvent.error(image);

    // Should show placeholder or default image
    expect(image).toHaveAttribute('src', '/images/placeholder-item.jpg');
  });

  it('should highlight matching text in search results', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Enter search query
    const searchInput = screen.getByPlaceholderText('Search items...');
    await user.type(searchInput, 'sofa');

    // Wait for search results and highlight
    await waitFor(() => {
      const highlighted = screen.getByTestId('highlighted-text');
      expect(highlighted).toHaveTextContent('sofa');
      expect(highlighted).toHaveClass('bg-yellow-200');
    });
  });

  it('should provide keyboard navigation support', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <InventoryList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Test keyboard navigation
    const firstItem = screen.getByTestId('inventory-item-item-1');
    firstItem.focus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByTestId('inventory-item-item-2')).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByTestId('inventory-item-item-1')).toHaveFocus();

    // Test Enter key to navigate
    await user.keyboard('{Enter}');
    // Should navigate to item detail (this would be tested with router mock)
  });

  it('should support bulk selection', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <InventoryList enableBulkActions={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    });

    // Select individual items
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // First item checkbox (0 is select all)
    await user.click(checkboxes[2]); // Second item checkbox

    // Verify selection state
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
    expect(screen.getByText('Bulk Actions')).toBeInTheDocument();

    // Test select all
    await user.click(checkboxes[0]);
    expect(screen.getByText('3 items selected')).toBeInTheDocument();
  });
});
