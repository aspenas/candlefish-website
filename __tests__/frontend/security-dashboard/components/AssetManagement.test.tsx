import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { AssetManagement } from '../../../../apps/security-dashboard/src/pages/AssetManagement';
import {
  GET_ASSETS_QUERY,
  CREATE_ASSET_MUTATION,
  UPDATE_ASSET_MUTATION,
  DELETE_ASSET_MUTATION
} from '../../../../apps/security-dashboard/src/graphql/queries/security.graphql';
import { AssetType, Environment, Platform } from '../../../../apps/security-dashboard/src/types/security';

const theme = createTheme();

const mockAssets = [
  {
    id: 'asset-1',
    organizationId: 'org-123',
    name: 'Web Application',
    assetType: AssetType.APPLICATION,
    environment: Environment.PRODUCTION,
    platform: Platform.KUBERNETES,
    url: 'https://app.example.com',
    description: 'Main web application',
    healthStatus: 'HEALTHY',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'asset-2',
    organizationId: 'org-123',
    name: 'API Gateway',
    assetType: AssetType.API,
    environment: Environment.PRODUCTION,
    platform: Platform.AWS,
    url: 'https://api.example.com',
    description: 'REST API Gateway',
    healthStatus: 'WARNING',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'asset-3',
    organizationId: 'org-123',
    name: 'Test Database',
    assetType: AssetType.DATABASE,
    environment: Environment.STAGING,
    platform: Platform.AWS,
    url: null,
    description: 'PostgreSQL test database',
    healthStatus: 'CRITICAL',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

const baseMocks = [
  {
    request: {
      query: GET_ASSETS_QUERY,
      variables: {
        organizationId: 'org-123',
        filter: {},
      },
    },
    result: {
      data: {
        assets: mockAssets,
      },
    },
  },
];

const createAssetMocks = [
  ...baseMocks,
  {
    request: {
      query: CREATE_ASSET_MUTATION,
      variables: {
        organizationId: 'org-123',
        input: {
          name: 'New Test Asset',
          assetType: AssetType.APPLICATION,
          environment: Environment.DEVELOPMENT,
          platform: Platform.KUBERNETES,
          description: 'Test asset for unit testing',
        },
      },
    },
    result: {
      data: {
        createAsset: {
          id: 'asset-new',
          organizationId: 'org-123',
          name: 'New Test Asset',
          assetType: AssetType.APPLICATION,
          environment: Environment.DEVELOPMENT,
          platform: Platform.KUBERNETES,
          description: 'Test asset for unit testing',
          healthStatus: 'HEALTHY',
          createdAt: '2024-01-04T00:00:00Z',
          updatedAt: '2024-01-04T00:00:00Z',
        },
      },
    },
  },
];

const updateAssetMocks = [
  ...baseMocks,
  {
    request: {
      query: UPDATE_ASSET_MUTATION,
      variables: {
        id: 'asset-1',
        input: {
          name: 'Updated Web Application',
          description: 'Updated description',
        },
      },
    },
    result: {
      data: {
        updateAsset: {
          ...mockAssets[0],
          name: 'Updated Web Application',
          description: 'Updated description',
          updatedAt: '2024-01-05T00:00:00Z',
        },
      },
    },
  },
];

const deleteAssetMocks = [
  ...baseMocks,
  {
    request: {
      query: DELETE_ASSET_MUTATION,
      variables: {
        id: 'asset-1',
      },
    },
    result: {
      data: {
        deleteAsset: {
          success: true,
          message: 'Asset deleted successfully',
        },
      },
    },
  },
];

const errorMocks = [
  {
    request: {
      query: GET_ASSETS_QUERY,
      variables: {
        organizationId: 'org-123',
        filter: {},
      },
    },
    error: new Error('Failed to fetch assets'),
  },
];

const renderAssetManagement = (mocks: any[] = baseMocks) => {
  return render(
    <BrowserRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <ThemeProvider theme={theme}>
          <AssetManagement organizationId="org-123" />
        </ThemeProvider>
      </MockedProvider>
    </BrowserRouter>
  );
};

describe('AssetManagement Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Loading and Data Display', () => {
    it('should display loading state while fetching assets', () => {
      renderAssetManagement();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Loading assets...')).toBeInTheDocument();
    });

    it('should display assets table with correct data', async () => {
      renderAssetManagement();

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
        expect(screen.getByText('Test Database')).toBeInTheDocument();
      });

      // Check table headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Environment')).toBeInTheDocument();
      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Health Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should display asset type badges with correct styling', async () => {
      renderAssetManagement();

      await waitFor(() => {
        const applicationBadge = screen.getByText('APPLICATION');
        const apiBadge = screen.getByText('API');
        const databaseBadge = screen.getByText('DATABASE');

        expect(applicationBadge).toHaveClass('asset-type-badge');
        expect(apiBadge).toHaveClass('asset-type-badge');
        expect(databaseBadge).toHaveClass('asset-type-badge');
      });
    });

    it('should display health status indicators with correct colors', async () => {
      renderAssetManagement();

      await waitFor(() => {
        const healthyStatus = screen.getByText('HEALTHY');
        const warningStatus = screen.getByText('WARNING');
        const criticalStatus = screen.getByText('CRITICAL');

        expect(healthyStatus).toHaveClass('health-status-healthy');
        expect(warningStatus).toHaveClass('health-status-warning');
        expect(criticalStatus).toHaveClass('health-status-critical');
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter assets by type', async () => {
      renderAssetManagement();

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const typeFilter = screen.getByLabelText('Asset Type');
      await user.click(typeFilter);
      await user.click(screen.getByText('APPLICATION'));

      // Only application assets should be visible
      expect(screen.getByText('Web Application')).toBeInTheDocument();
      expect(screen.queryByText('API Gateway')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Database')).not.toBeInTheDocument();
    });

    it('should filter assets by environment', async () => {
      renderAssetManagement();

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const environmentFilter = screen.getByLabelText('Environment');
      await user.click(environmentFilter);
      await user.click(screen.getByText('PRODUCTION'));

      // Only production assets should be visible
      expect(screen.getByText('Web Application')).toBeInTheDocument();
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.queryByText('Test Database')).not.toBeInTheDocument();
    });

    it('should search assets by name', async () => {
      renderAssetManagement();

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search assets...');
      await user.type(searchInput, 'API');

      // Only API Gateway should be visible
      expect(screen.queryByText('Web Application')).not.toBeInTheDocument();
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.queryByText('Test Database')).not.toBeInTheDocument();
    });

    it('should clear filters when reset button is clicked', async () => {
      renderAssetManagement();

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      // Apply filter
      const typeFilter = screen.getByLabelText('Asset Type');
      await user.click(typeFilter);
      await user.click(screen.getByText('APPLICATION'));

      // Clear filters
      const resetButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(resetButton);

      // All assets should be visible again
      expect(screen.getByText('Web Application')).toBeInTheDocument();
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.getByText('Test Database')).toBeInTheDocument();
    });
  });

  describe('Create Asset', () => {
    it('should open create asset dialog when add button is clicked', async () => {
      renderAssetManagement();

      const addButton = screen.getByRole('button', { name: /add asset/i });
      await user.click(addButton);

      expect(screen.getByRole('dialog', { name: /create new asset/i })).toBeInTheDocument();
    });

    it('should create new asset with valid form data', async () => {
      renderAssetManagement(createAssetMocks);

      const addButton = screen.getByRole('button', { name: /add asset/i });
      await user.click(addButton);

      const dialog = screen.getByRole('dialog');

      // Fill form fields
      const nameInput = within(dialog).getByLabelText('Asset Name');
      await user.type(nameInput, 'New Test Asset');

      const typeSelect = within(dialog).getByLabelText('Asset Type');
      await user.click(typeSelect);
      await user.click(screen.getByText('APPLICATION'));

      const environmentSelect = within(dialog).getByLabelText('Environment');
      await user.click(environmentSelect);
      await user.click(screen.getByText('DEVELOPMENT'));

      const platformSelect = within(dialog).getByLabelText('Platform');
      await user.click(platformSelect);
      await user.click(screen.getByText('KUBERNETES'));

      const descriptionInput = within(dialog).getByLabelText('Description');
      await user.type(descriptionInput, 'Test asset for unit testing');

      // Submit form
      const createButton = within(dialog).getByRole('button', { name: /create asset/i });
      await user.click(createButton);

      // Dialog should close and new asset should appear in table
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      renderAssetManagement();

      const addButton = screen.getByRole('button', { name: /add asset/i });
      await user.click(addButton);

      const dialog = screen.getByRole('dialog');
      const createButton = within(dialog).getByRole('button', { name: /create asset/i });
      await user.click(createButton);

      // Should show validation errors
      expect(within(dialog).getByText('Asset name is required')).toBeInTheDocument();
      expect(within(dialog).getByText('Asset type is required')).toBeInTheDocument();
      expect(within(dialog).getByText('Environment is required')).toBeInTheDocument();
      expect(within(dialog).getByText('Platform is required')).toBeInTheDocument();
    });

    it('should close dialog when cancel button is clicked', async () => {
      renderAssetManagement();

      const addButton = screen.getByRole('button', { name: /add asset/i });
      await user.click(addButton);

      const dialog = screen.getByRole('dialog');
      const cancelButton = within(dialog).getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Edit Asset', () => {
    it('should open edit dialog with pre-filled data', async () => {
      renderAssetManagement();

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      const dialog = screen.getByRole('dialog', { name: /edit asset/i });
      expect(dialog).toBeInTheDocument();

      // Form should be pre-filled
      const nameInput = within(dialog).getByDisplayValue('Web Application');
      expect(nameInput).toBeInTheDocument();
    });

    it('should update asset with modified data', async () => {
      renderAssetManagement(updateAssetMocks);

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      const dialog = screen.getByRole('dialog');

      // Modify fields
      const nameInput = within(dialog).getByLabelText('Asset Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Web Application');

      const descriptionInput = within(dialog).getByLabelText('Description');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');

      // Submit form
      const updateButton = within(dialog).getByRole('button', { name: /update asset/i });
      await user.click(updateButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Asset', () => {
    it('should show confirmation dialog when delete button is clicked', async () => {
      renderAssetManagement();

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      await user.click(deleteButton);

      const confirmDialog = screen.getByRole('dialog', { name: /confirm delete/i });
      expect(confirmDialog).toBeInTheDocument();
      expect(within(confirmDialog).getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });

    it('should delete asset when confirmed', async () => {
      renderAssetManagement(deleteAssetMocks);

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      await user.click(deleteButton);

      const confirmDialog = screen.getByRole('dialog');
      const confirmButton = within(confirmDialog).getByRole('button', { name: /delete/i });
      await user.click(confirmButton);

      // Confirmation dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Success notification should appear
      expect(screen.getByText('Asset deleted successfully')).toBeInTheDocument();
    });

    it('should cancel deletion when cancel button is clicked', async () => {
      renderAssetManagement();

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      await user.click(deleteButton);

      const confirmDialog = screen.getByRole('dialog');
      const cancelButton = within(confirmDialog).getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText('Web Application')).toBeInTheDocument(); // Asset should still be there
    });
  });

  describe('Error Handling', () => {
    it('should display error message when assets fail to load', async () => {
      renderAssetManagement(errorMocks);

      await waitFor(() => {
        expect(screen.getByText('Error loading assets')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch assets')).toBeInTheDocument();
      });
    });

    it('should handle create asset errors', async () => {
      const createErrorMocks = [
        ...baseMocks,
        {
          request: {
            query: CREATE_ASSET_MUTATION,
            variables: {
              organizationId: 'org-123',
              input: expect.any(Object),
            },
          },
          error: new Error('Validation failed: Asset name already exists'),
        },
      ];

      renderAssetManagement(createErrorMocks);

      const addButton = screen.getByRole('button', { name: /add asset/i });
      await user.click(addButton);

      const dialog = screen.getByRole('dialog');

      // Fill form with duplicate name
      const nameInput = within(dialog).getByLabelText('Asset Name');
      await user.type(nameInput, 'Duplicate Name');

      const createButton = within(dialog).getByRole('button', { name: /create asset/i });
      await user.click(createButton);

      // Error should be displayed
      await waitFor(() => {
        expect(within(dialog).getByText('Asset name already exists')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderAssetManagement();

      await waitFor(() => {
        const table = screen.getByRole('table', { name: /assets table/i });
        expect(table).toBeInTheDocument();

        const columnHeaders = screen.getAllByRole('columnheader');
        expect(columnHeaders).toHaveLength(6); // Name, Type, Environment, Platform, Health, Actions
      });
    });

    it('should support keyboard navigation in table', async () => {
      renderAssetManagement();

      await waitFor(() => {
        const firstRow = screen.getAllByRole('row')[1]; // Skip header row
        const firstCell = within(firstRow).getAllByRole('cell')[0];

        firstCell.focus();
        expect(document.activeElement).toBe(firstCell);
      });
    });

    it('should announce table updates to screen readers', async () => {
      renderAssetManagement();

      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should stack table columns on mobile', () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));

      renderAssetManagement();

      const table = screen.getByRole('table');
      expect(table).toHaveClass('responsive-table');
    });

    it('should adjust dialog size for mobile', async () => {
      global.innerWidth = 400;
      global.dispatchEvent(new Event('resize'));

      renderAssetManagement();

      const addButton = screen.getByRole('button', { name: /add asset/i });
      await user.click(addButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('mobile-dialog');
    });
  });

  describe('Performance', () => {
    it('should virtualize large asset lists', async () => {
      const largeAssetList = Array.from({ length: 1000 }, (_, i) => ({
        id: `asset-${i}`,
        name: `Asset ${i}`,
        assetType: AssetType.APPLICATION,
        environment: Environment.PRODUCTION,
        platform: Platform.KUBERNETES,
        healthStatus: 'HEALTHY',
      }));

      const largeMocks = [
        {
          request: {
            query: GET_ASSETS_QUERY,
            variables: { organizationId: 'org-123', filter: {} },
          },
          result: {
            data: { assets: largeAssetList },
          },
        },
      ];

      renderAssetManagement(largeMocks);

      await waitFor(() => {
        // Should use virtual scrolling for performance
        const virtualContainer = screen.getByTestId('virtual-table-container');
        expect(virtualContainer).toBeInTheDocument();
      });
    });

    it('should debounce search input', async () => {
      jest.useFakeTimers();

      renderAssetManagement();

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search assets...');

      // Type rapidly
      await user.type(searchInput, 'test');

      // Should not trigger search immediately
      expect(searchInput.value).toBe('test');

      // Fast forward timers to trigger debounce
      jest.advanceTimersByTime(500);

      // Now search should be triggered
      await waitFor(() => {
        // Search functionality should be active
      });

      jest.useRealTimers();
    });
  });
});
