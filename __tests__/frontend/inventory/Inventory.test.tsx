// Comprehensive React frontend tests for Inventory component
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import Inventory from '../../../5470_S_Highline_Circle/frontend/src/pages/Inventory';
import * as api from '../../../5470_S_Highline_Circle/frontend/src/services/api';

// Mock dependencies
jest.mock('react-hot-toast');
jest.mock('../../../5470_S_Highline_Circle/frontend/src/services/api');

// Mock components
jest.mock('../../../5470_S_Highline_Circle/frontend/src/components/ItemTable', () => {
  return function MockItemTable({ items, selectedItems, onSelectItem, onSelectAll, onUpdateItem, onSort, sortBy, sortOrder }: any) {
    return (
      <div data-testid="item-table">
        <div data-testid="item-count">{items.length} items</div>
        <div data-testid="selected-count">{selectedItems.length} selected</div>
        {items.map((item: any, index: number) => (
          <div key={item.id || index} data-testid={`item-${item.id}`}>
            <input
              type="checkbox"
              checked={selectedItems.includes(item.id)}
              onChange={() => onSelectItem(item.id)}
              data-testid={`checkbox-${item.id}`}
            />
            <span>{item.name}</span>
            <button onClick={() => onSort('name')} data-testid="sort-name">Sort by Name</button>
            <button
              onClick={() => onUpdateItem({ id: item.id, decision: 'Sell' })}
              data-testid={`update-${item.id}`}
            >
              Update Item
            </button>
          </div>
        ))}
        <button
          onClick={() => onSelectAll(items.map((item: any) => item.id))}
          data-testid="select-all"
        >
          Select All
        </button>
        <div data-testid="sort-info">Sort: {sortBy} {sortOrder}</div>
      </div>
    );
  };
});

jest.mock('../../../5470_S_Highline_Circle/frontend/src/components/FilterPanel', () => {
  return function MockFilterPanel({ filters, onFilterChange, rooms, categories }: any) {
    return (
      <div data-testid="filter-panel">
        <div data-testid="categories-count">{categories.length} categories</div>
        <div data-testid="rooms-count">{rooms.length} rooms</div>
        <button
          onClick={() => onFilterChange({...filters, categories: ['Furniture']})}
          data-testid="filter-furniture"
        >
          Filter Furniture
        </button>
        <button
          onClick={() => onFilterChange({...filters, decisions: ['Sell']})}
          data-testid="filter-sell"
        >
          Filter Sell
        </button>
        <button
          onClick={() => onFilterChange({...filters, minValue: 100, maxValue: 1000})}
          data-testid="filter-price"
        >
          Filter Price Range
        </button>
      </div>
    );
  };
});

jest.mock('../../../5470_S_Highline_Circle/frontend/src/components/SearchBar', () => {
  return function MockSearchBar({ onSearch, placeholder, initialValue }: any) {
    return (
      <div data-testid="search-bar">
        <input
          type="text"
          placeholder={placeholder}
          defaultValue={initialValue}
          onChange={(e) => onSearch(e.target.value)}
          data-testid="search-input"
        />
      </div>
    );
  };
});

jest.mock('../../../5470_S_Highline_Circle/frontend/src/components/BulkActions', () => {
  return function MockBulkActions({ selectedItems, onBulkUpdate, onClearSelection }: any) {
    return (
      <div data-testid="bulk-actions">
        <span data-testid="bulk-selected-count">{selectedItems.length} selected</span>
        <button
          onClick={() => onBulkUpdate(selectedItems, { decision: 'Sell' })}
          data-testid="bulk-update-sell"
        >
          Bulk Update to Sell
        </button>
        <button
          onClick={onClearSelection}
          data-testid="clear-selection"
        >
          Clear Selection
        </button>
      </div>
    );
  };
});

jest.mock('../../../5470_S_Highline_Circle/frontend/src/components/ErrorBoundary', () => {
  return function MockErrorBoundary({ children, fallback }: any) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});

// Sample test data
const sampleRooms = [
  { id: '1', name: 'Living Room', floor: 'Main Floor' },
  { id: '2', name: 'Master Bedroom', floor: 'Upper Floor' },
  { id: '3', name: 'Kitchen', floor: 'Main Floor' }
];

const sampleItems = [
  {
    id: '1',
    room_id: '1',
    name: 'West Elm Sectional Sofa',
    description: 'Beautiful brown leather sectional',
    category: 'Furniture',
    decision: 'Keep',
    purchase_price: 3500.00,
    asking_price: 2800.00,
    quantity: 1,
    is_fixture: false,
    source: 'West Elm',
    room: 'Living Room',
    floor: 'Main Floor',
    has_images: true,
    image_count: 2
  },
  {
    id: '2',
    room_id: '1',
    name: 'Moroccan Area Rug',
    description: '8x10 hand-knotted wool rug',
    category: 'Rug / Carpet',
    decision: 'Sell',
    purchase_price: 2200.00,
    asking_price: 1800.00,
    quantity: 1,
    is_fixture: false,
    source: 'Pottery Barn',
    room: 'Living Room',
    floor: 'Main Floor',
    has_images: false,
    image_count: 0
  },
  {
    id: '3',
    room_id: '2',
    name: 'Table Lamp',
    description: 'Modern brass table lamp',
    category: 'Lighting',
    decision: 'Unsure',
    purchase_price: 150.00,
    quantity: 2,
    is_fixture: false,
    source: 'CB2',
    room: 'Master Bedroom',
    floor: 'Upper Floor',
    has_images: true,
    image_count: 1
  }
];

// Test wrapper
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockApi = api as jest.Mocked<typeof api>;

describe('Inventory Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();

    // Default API mocks
    mockApi.getRooms.mockResolvedValue({ rooms: sampleRooms });
    mockApi.filterItems.mockResolvedValue({ items: sampleItems, total: sampleItems.length });
    mockApi.searchItems.mockResolvedValue({ items: [], total: 0 });
    mockApi.updateItem.mockResolvedValue({ success: true });
    mockApi.bulkUpdateItems.mockResolvedValue({ success: true });
    mockApi.exportExcel.mockResolvedValue();
    mockApi.exportPDF.mockResolvedValue();
    mockApi.exportCSV.mockResolvedValue();
  });

  describe('Initial Render', () => {
    it('should render the inventory page with header', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      expect(screen.getByText('Inventory Management')).toBeInTheDocument();
      expect(screen.getByText('3 items total • 0 selected')).toBeInTheDocument();

      // Check for export buttons
      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    it('should render search bar and filter panel', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });

    it('should load and display items', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
        expect(screen.getByTestId('item-count')).toHaveTextContent('3 items');
      });
    });

    it('should display loading skeleton while loading', async () => {
      // Mock delayed response
      mockApi.filterItems.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ items: sampleItems, total: 3 }), 100))
      );

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByText(/animate-pulse/)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should perform search when query is entered', async () => {
      mockApi.searchItems.mockResolvedValue({
        items: [sampleItems[0]],
        total: 1
      });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const searchInput = screen.getByTestId('search-input');

      await user.type(searchInput, 'sectional');

      await waitFor(() => {
        expect(mockApi.searchItems).toHaveBeenCalledWith(
          expect.objectContaining({ q: 'sectional' })
        );
      });
    });

    it('should display search filter pill when searching', async () => {
      mockApi.searchItems.mockResolvedValue({
        items: [sampleItems[0]],
        total: 1
      });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'sectional');

      await waitFor(() => {
        expect(screen.getByText('Search: "sectional"')).toBeInTheDocument();
      });
    });

    it('should clear search when clear button is clicked', async () => {
      mockApi.searchItems.mockResolvedValue({
        items: [sampleItems[0]],
        total: 1
      });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'sectional');

      await waitFor(() => {
        expect(screen.getByText('Search: "sectional"')).toBeInTheDocument();
      });

      // Click clear button in search pill
      const clearButton = screen.getByRole('button', { name: /×/ });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText('Search: "sectional"')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should apply category filter', async () => {
      const filteredItems = [sampleItems[0]]; // Only furniture item
      mockApi.filterItems.mockResolvedValue({
        items: filteredItems,
        total: 1
      });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const filterButton = screen.getByTestId('filter-furniture');
      await user.click(filterButton);

      await waitFor(() => {
        expect(mockApi.filterItems).toHaveBeenCalledWith(
          expect.objectContaining({
            get: expect.any(Function)
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Categories: 1 selected')).toBeInTheDocument();
      });
    });

    it('should apply decision filter', async () => {
      const filteredItems = [sampleItems[1]]; // Only sell decision
      mockApi.filterItems.mockResolvedValue({
        items: filteredItems,
        total: 1
      });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const filterButton = screen.getByTestId('filter-sell');
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Decisions: 1 selected')).toBeInTheDocument();
      });
    });

    it('should apply price range filter', async () => {
      const filteredItems = [sampleItems[2]]; // Only lamp in price range
      mockApi.filterItems.mockResolvedValue({
        items: filteredItems,
        total: 1
      });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const filterButton = screen.getByTestId('filter-price');
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Price: $100 - $1000')).toBeInTheDocument();
      });
    });

    it('should clear all filters when clear all button is clicked', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      // Apply a filter first
      const filterButton = screen.getByTestId('filter-furniture');
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Categories: 1 selected')).toBeInTheDocument();
      });

      // Clear all filters
      const clearAllButton = screen.getByText('Clear all');
      await user.click(clearAllButton);

      await waitFor(() => {
        expect(screen.queryByText('Categories: 1 selected')).not.toBeInTheDocument();
      });
    });

    it('should display active filter count', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      // Apply multiple filters
      const furnitureFilter = screen.getByTestId('filter-furniture');
      const sellFilter = screen.getByTestId('filter-sell');

      await user.click(furnitureFilter);
      await user.click(sellFilter);

      await waitFor(() => {
        expect(screen.getByText('2 filters active')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should sort items when sort button is clicked', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      const sortButton = screen.getByTestId('sort-name');
      await user.click(sortButton);

      await waitFor(() => {
        expect(screen.getByTestId('sort-info')).toHaveTextContent('Sort: name asc');
      });
    });

    it('should cycle through sort orders (asc -> desc -> none)', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      const sortButton = screen.getByTestId('sort-name');

      // First click: ascending
      await user.click(sortButton);
      await waitFor(() => {
        expect(screen.getByTestId('sort-info')).toHaveTextContent('Sort: name asc');
      });

      // Second click: descending
      await user.click(sortButton);
      await waitFor(() => {
        expect(screen.getByTestId('sort-info')).toHaveTextContent('Sort: name desc');
      });

      // Third click: clear sort
      await user.click(sortButton);
      await waitFor(() => {
        expect(screen.getByTestId('sort-info')).toHaveTextContent('Sort:  ');
      });
    });

    it('should display sort filter pill', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      const sortButton = screen.getByTestId('sort-name');
      await user.click(sortButton);

      await waitFor(() => {
        expect(screen.getByText('Sort: name (asc)')).toBeInTheDocument();
      });
    });
  });

  describe('Item Selection', () => {
    it('should select individual items', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      const checkbox = screen.getByTestId('checkbox-1');
      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1 selected');
      });

      // Header should update
      expect(screen.getByText('3 items total • 1 selected')).toBeInTheDocument();
    });

    it('should select all items', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      const selectAllButton = screen.getByTestId('select-all');
      await user.click(selectAllButton);

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('3 selected');
      });

      expect(screen.getByText('3 items total • 3 selected')).toBeInTheDocument();
    });

    it('should show bulk actions when items are selected', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      const checkbox = screen.getByTestId('checkbox-1');
      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should perform bulk update', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      // Select items
      const selectAllButton = screen.getByTestId('select-all');
      await user.click(selectAllButton);

      await waitFor(() => {
        expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
      });

      // Perform bulk update
      const bulkUpdateButton = screen.getByTestId('bulk-update-sell');
      await user.click(bulkUpdateButton);

      await waitFor(() => {
        expect(mockApi.bulkUpdateItems).toHaveBeenCalledWith({
          itemIds: ['1', '2', '3'],
          decision: 'Sell'
        });
      });
    });

    it('should clear selection after bulk update', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      // Select items
      const selectAllButton = screen.getByTestId('select-all');
      await user.click(selectAllButton);

      await waitFor(() => {
        expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
      });

      // Perform bulk update
      const bulkUpdateButton = screen.getByTestId('bulk-update-sell');
      await user.click(bulkUpdateButton);

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('0 selected');
      });
    });

    it('should clear selection manually', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      // Select items
      const checkbox = screen.getByTestId('checkbox-1');
      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
      });

      // Clear selection
      const clearButton = screen.getByTestId('clear-selection');
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('0 selected');
      });
    });
  });

  describe('Item Updates', () => {
    it('should update individual item', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      const updateButton = screen.getByTestId('update-1');
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockApi.updateItem).toHaveBeenCalledWith('1', { id: '1', decision: 'Sell' });
      });
    });

    it('should show success toast on successful update', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      const updateButton = screen.getByTestId('update-1');
      await user.click(updateButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Item updated successfully');
      });
    });

    it('should show error toast on failed update', async () => {
      mockApi.updateItem.mockRejectedValue(new Error('Update failed'));

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      const updateButton = screen.getByTestId('update-1');
      await user.click(updateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update item');
      });
    });
  });

  describe('Export Functions', () => {
    it('should export to Excel', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const excelButton = screen.getByText('Excel');
      await user.click(excelButton);

      expect(mockApi.exportExcel).toHaveBeenCalled();
    });

    it('should export to PDF', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const pdfButton = screen.getByText('PDF');
      await user.click(pdfButton);

      expect(mockApi.exportPDF).toHaveBeenCalled();
    });

    it('should export to CSV', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const csvButton = screen.getByText('CSV');
      await user.click(csvButton);

      expect(mockApi.exportCSV).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when API fails', async () => {
      mockApi.filterItems.mockRejectedValue(new Error('API Error'));

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to load inventory')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading on try again button click', async () => {
      mockApi.filterItems.mockRejectedValueOnce(new Error('API Error'))
                         .mockResolvedValueOnce({ items: sampleItems, total: 3 });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByText('Try Again');
      await user.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });
    });

    it('should display empty state when no items found', async () => {
      mockApi.filterItems.mockResolvedValue({ items: [], total: 0 });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
        expect(screen.getByText('Start by adding items to your inventory.')).toBeInTheDocument();
      });
    });

    it('should display empty state with search context', async () => {
      mockApi.searchItems.mockResolvedValue({ items: [], total: 0 });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
        expect(screen.getByText(/No items match your search for "nonexistent"/)).toBeInTheDocument();
        expect(screen.getByText('Clear search')).toBeInTheDocument();
      });
    });

    it('should display empty state with filter context', async () => {
      mockApi.filterItems.mockResolvedValue({ items: [], total: 0 });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      // Apply a filter
      const filterButton = screen.getByTestId('filter-furniture');
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
        expect(screen.getByText('No items match your current filters.')).toBeInTheDocument();
        expect(screen.getByText('Clear all filters')).toBeInTheDocument();
      });
    });
  });

  describe('UI State Management', () => {
    it('should display active filter count correctly', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      // Apply search and filter
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');

      const filterButton = screen.getByTestId('filter-furniture');
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('2 filters active')).toBeInTheDocument();
      });
    });

    it('should handle loading state during refetch', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      // Mock slow API response
      mockApi.filterItems.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ items: sampleItems, total: 3 }), 100))
      );

      // Trigger refetch by changing filter
      const filterButton = screen.getByTestId('filter-furniture');
      await user.click(filterButton);

      // Should show updating indicator
      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });
    });

    it('should properly format item counts in header', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('3 items total • 0 selected')).toBeInTheDocument();
      });

      // Select an item
      const checkbox = screen.getByTestId('checkbox-1');
      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.getByText('3 items total • 1 selected')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      // Check for main heading
      expect(screen.getByRole('heading', { name: 'Inventory Management' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      // Tab to search input and verify it's focusable
      const searchInput = screen.getByTestId('search-input');
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
    });

    it('should provide clear feedback for actions', async () => {
      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-table')).toBeInTheDocument();
      });

      // Update item and check for success feedback
      const updateButton = screen.getByTestId('update-1');
      await user.click(updateButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Item updated successfully');
      });
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...sampleItems[0],
        id: `item-${i}`,
        name: `Item ${i}`
      }));

      mockApi.filterItems.mockResolvedValue({ items: largeDataset, total: 100 });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('item-count')).toHaveTextContent('100 items');
      });

      expect(screen.getByText('100 items total • 0 selected')).toBeInTheDocument();
    });

    it('should debounce search input', async () => {
      mockApi.searchItems.mockResolvedValue({ items: [], total: 0 });

      render(
        <TestWrapper>
          <Inventory />
        </TestWrapper>
      );

      const searchInput = screen.getByTestId('search-input');

      // Type multiple characters quickly
      await user.type(searchInput, 'test');

      // Should only make one API call after debounce
      await waitFor(() => {
        expect(mockApi.searchItems).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });
});
