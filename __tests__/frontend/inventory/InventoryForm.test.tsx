import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InventoryForm } from '../../../5470_S_Highline_Circle/frontend/src/components/InventoryForm';
import {
  CREATE_INVENTORY_ITEM,
  UPDATE_INVENTORY_ITEM,
  GET_CATEGORIES
} from '../../../5470_S_Highline_Circle/frontend/src/graphql/queries';

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'item-1' }),
}));

// Mock data
const mockCategories = [
  'Furniture',
  'Lighting',
  'Decor',
  'Electronics',
  'Textiles',
];

const mockExistingItem = {
  id: 'item-1',
  name: 'Modern Sofa',
  description: 'Comfortable 3-seat modern sofa',
  category: 'Furniture',
  sku: 'SOFA-001',
  barcode: '1234567890123',
  quantity: 1,
  minQuantity: 1,
  maxQuantity: 5,
  unitPrice: 1200.00,
  location: 'Living Room',
  supplier: 'Furniture Plus',
  imageUri: '/images/sofa.jpg',
  tags: 'modern,comfortable,3-seat',
};

// GraphQL mocks
const createMock = {
  request: {
    query: CREATE_INVENTORY_ITEM,
    variables: {
      input: {
        name: 'New Coffee Table',
        description: 'Glass coffee table with metal legs',
        category: 'Furniture',
        sku: 'TABLE-002',
        barcode: '9876543210987',
        quantity: 1,
        minQuantity: 1,
        maxQuantity: 3,
        unitPrice: 450.00,
        location: 'Living Room',
        supplier: 'Glass Works',
        tags: 'glass,metal,modern',
      },
    },
  },
  result: {
    data: {
      createInventoryItem: {
        id: 'item-new',
        ...mockExistingItem,
        name: 'New Coffee Table',
        sku: 'TABLE-002',
        unitPrice: 450.00,
      },
    },
  },
};

const updateMock = {
  request: {
    query: UPDATE_INVENTORY_ITEM,
    variables: {
      id: 'item-1',
      input: {
        name: 'Updated Modern Sofa',
        description: 'Updated description',
        quantity: 2,
        unitPrice: 1300.00,
      },
    },
  },
  result: {
    data: {
      updateInventoryItem: {
        ...mockExistingItem,
        name: 'Updated Modern Sofa',
        description: 'Updated description',
        quantity: 2,
        unitPrice: 1300.00,
      },
    },
  },
};

const categoriesMock = {
  request: {
    query: GET_CATEGORIES,
  },
  result: {
    data: {
      categories: mockCategories,
    },
  },
};

const mocks = [createMock, updateMock, categoriesMock];

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

describe('InventoryForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('should render empty form for creating new item', async () => {
      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      expect(screen.getByText('Add New Item')).toBeInTheDocument();
      expect(screen.getByLabelText('Item Name')).toHaveValue('');
      expect(screen.getByLabelText('SKU')).toHaveValue('');
      expect(screen.getByLabelText('Quantity')).toHaveValue(1);
      expect(screen.getByLabelText('Unit Price')).toHaveValue('');
      expect(screen.getByText('Save Item')).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      // Try to submit without filling required fields
      const saveButton = screen.getByText('Save Item');
      await user.click(saveButton);

      // Check for validation errors
      await waitFor(() => {
        expect(screen.getByText('Item name is required')).toBeInTheDocument();
        expect(screen.getByText('SKU is required')).toBeInTheDocument();
        expect(screen.getByText('Category is required')).toBeInTheDocument();
        expect(screen.getByText('Unit price is required')).toBeInTheDocument();
        expect(screen.getByText('Location is required')).toBeInTheDocument();
      });
    });

    it('should validate SKU format', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const skuInput = screen.getByLabelText('SKU');
      await user.type(skuInput, 'invalid sku');

      await user.tab(); // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText('SKU must be alphanumeric with hyphens only')).toBeInTheDocument();
      });
    });

    it('should validate price is positive', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const priceInput = screen.getByLabelText('Unit Price');
      await user.type(priceInput, '-100');

      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument();
      });
    });

    it('should validate quantity is non-negative', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText('Quantity');
      await user.clear(quantityInput);
      await user.type(quantityInput, '-5');

      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Quantity cannot be negative')).toBeInTheDocument();
      });
    });

    it('should auto-generate SKU when name changes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText('Item Name');
      await user.type(nameInput, 'Modern Coffee Table');

      const skuInput = screen.getByLabelText('SKU');

      await waitFor(() => {
        expect(skuInput).toHaveValue('MODERN-COFFEE-TABLE-001');
      });
    });

    it('should calculate total value when quantity or price changes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText('Quantity');
      const priceInput = screen.getByLabelText('Unit Price');

      await user.type(priceInput, '100.00');
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');

      await waitFor(() => {
        expect(screen.getByText('Total Value: $300.00')).toBeInTheDocument();
      });
    });

    it('should create new item successfully', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      // Fill out form
      await user.type(screen.getByLabelText('Item Name'), 'New Coffee Table');
      await user.type(screen.getByLabelText('Description'), 'Glass coffee table with metal legs');
      await user.selectOptions(screen.getByLabelText('Category'), 'Furniture');
      await user.type(screen.getByLabelText('SKU'), 'TABLE-002');
      await user.type(screen.getByLabelText('Barcode'), '9876543210987');

      const quantityInput = screen.getByLabelText('Quantity');
      await user.clear(quantityInput);
      await user.type(quantityInput, '1');

      await user.type(screen.getByLabelText('Min Quantity'), '1');
      await user.type(screen.getByLabelText('Max Quantity'), '3');
      await user.type(screen.getByLabelText('Unit Price'), '450.00');
      await user.type(screen.getByLabelText('Location'), 'Living Room');
      await user.type(screen.getByLabelText('Supplier'), 'Glass Works');
      await user.type(screen.getByLabelText('Tags'), 'glass,metal,modern');

      // Submit form
      const saveButton = screen.getByText('Save Item');
      await user.click(saveButton);

      // Verify success message and navigation
      await waitFor(() => {
        expect(screen.getByText('Item created successfully!')).toBeInTheDocument();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/inventory');
    });
  });

  describe('Edit Mode', () => {
    it('should pre-populate form with existing item data', async () => {
      render(
        <TestWrapper>
          <InventoryForm mode="edit" initialData={mockExistingItem} />
        </TestWrapper>
      );

      expect(screen.getByText('Edit Item')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Modern Sofa')).toBeInTheDocument();
      expect(screen.getByDisplayValue('SOFA-001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1234567890123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1200')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Living Room')).toBeInTheDocument();
      expect(screen.getByText('Update Item')).toBeInTheDocument();
    });

    it('should update existing item successfully', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="edit" initialData={mockExistingItem} />
        </TestWrapper>
      );

      // Update some fields
      const nameInput = screen.getByDisplayValue('Modern Sofa');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Modern Sofa');

      const descriptionInput = screen.getByDisplayValue('Comfortable 3-seat modern sofa');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');

      const quantityInput = screen.getByDisplayValue('1');
      await user.clear(quantityInput);
      await user.type(quantityInput, '2');

      const priceInput = screen.getByDisplayValue('1200');
      await user.clear(priceInput);
      await user.type(priceInput, '1300');

      // Submit form
      const updateButton = screen.getByText('Update Item');
      await user.click(updateButton);

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText('Item updated successfully!')).toBeInTheDocument();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/inventory');
    });
  });

  describe('Form Interactions', () => {
    it('should load and display categories in dropdown', async () => {
      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const categorySelect = screen.getByLabelText('Category');

      await waitFor(() => {
        expect(screen.getByText('Furniture')).toBeInTheDocument();
        expect(screen.getByText('Lighting')).toBeInTheDocument();
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });
    });

    it('should allow adding new category', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      // Select "Add New Category" option
      const categorySelect = screen.getByLabelText('Category');
      await user.selectOptions(categorySelect, 'add-new');

      // Type new category name
      const newCategoryInput = await screen.findByPlaceholderText('Enter new category');
      await user.type(newCategoryInput, 'Custom Category');

      // Confirm new category
      const confirmButton = screen.getByText('Add Category');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Custom Category')).toBeInTheDocument();
      });
    });

    it('should handle image upload', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const file = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText('Item Image');

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Verify image preview
      expect(screen.getByAltText('Item preview')).toBeInTheDocument();
    });

    it('should validate image file type', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const file = new File(['fake file'], 'test.txt', { type: 'text/plain' });
      const fileInput = screen.getByLabelText('Item Image');

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Please select a valid image file (JPG, PNG, GIF)')).toBeInTheDocument();
      });
    });

    it('should validate image file size', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      // Create a large file (over 5MB)
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg'
      });
      const fileInput = screen.getByLabelText('Item Image');

      await user.upload(fileInput, largeFile);

      await waitFor(() => {
        expect(screen.getByText('Image size must be less than 5MB')).toBeInTheDocument();
      });
    });

    it('should handle tag input with validation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const tagsInput = screen.getByLabelText('Tags');
      await user.type(tagsInput, 'modern,comfortable,3-seat,extra-tag,another-tag,too-many-tags');

      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Maximum 5 tags allowed')).toBeInTheDocument();
      });
    });

    it('should provide barcode scanner integration', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const scanButton = screen.getByText('Scan Barcode');
      await user.click(scanButton);

      // Mock successful scan
      const mockBarcode = '1234567890123';
      fireEvent.message(window, {
        data: { type: 'BARCODE_SCANNED', barcode: mockBarcode }
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue(mockBarcode)).toBeInTheDocument();
      });
    });

    it('should show unsaved changes warning', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      // Make changes to form
      await user.type(screen.getByLabelText('Item Name'), 'Test Item');

      // Try to navigate away
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('You have unsaved changes. Are you sure you want to leave?')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Leave without saving');
      await user.click(confirmButton);

      expect(mockNavigate).toHaveBeenCalledWith('/inventory');
    });

    it('should save form as draft', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      // Fill partial form
      await user.type(screen.getByLabelText('Item Name'), 'Draft Item');
      await user.type(screen.getByLabelText('Description'), 'This is a draft');

      // Save as draft
      const draftButton = screen.getByText('Save as Draft');
      await user.click(draftButton);

      await waitFor(() => {
        expect(screen.getByText('Draft saved successfully')).toBeInTheDocument();
      });

      // Verify draft is stored in localStorage
      const savedDraft = JSON.parse(localStorage.getItem('inventory_form_draft') || '{}');
      expect(savedDraft.name).toBe('Draft Item');
      expect(savedDraft.description).toBe('This is a draft');
    });

    it('should restore from draft', async () => {
      // Set up draft in localStorage
      const draftData = {
        name: 'Restored Item',
        description: 'Restored from draft',
        category: 'Furniture',
      };
      localStorage.setItem('inventory_form_draft', JSON.stringify(draftData));

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      // Should show draft restoration option
      await waitFor(() => {
        expect(screen.getByText('Restore from draft?')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const restoreButton = screen.getByText('Restore');
      await user.click(restoreButton);

      // Verify form is populated with draft data
      expect(screen.getByDisplayValue('Restored Item')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Restored from draft')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors on create', async () => {
      const errorMock = {
        request: createMock.request,
        error: new Error('Network error'),
      };

      const user = userEvent.setup();

      render(
        <TestWrapper apolloMocks={[errorMock, categoriesMock]}>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      // Fill and submit form
      await user.type(screen.getByLabelText('Item Name'), 'Test Item');
      await user.type(screen.getByLabelText('SKU'), 'TEST-001');
      await user.selectOptions(screen.getByLabelText('Category'), 'Furniture');
      await user.type(screen.getByLabelText('Unit Price'), '100');
      await user.type(screen.getByLabelText('Location'), 'Test Location');

      const saveButton = screen.getByText('Save Item');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create item. Please try again.')).toBeInTheDocument();
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should handle duplicate SKU error', async () => {
      const duplicateSkuMock = {
        request: createMock.request,
        result: {
          errors: [
            {
              message: 'SKU already exists',
              extensions: { code: 'DUPLICATE_SKU' },
            },
          ],
        },
      };

      const user = userEvent.setup();

      render(
        <TestWrapper apolloMocks={[duplicateSkuMock, categoriesMock]}>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      // Fill and submit form with duplicate SKU
      await user.type(screen.getByLabelText('Item Name'), 'Test Item');
      await user.type(screen.getByLabelText('SKU'), 'EXISTING-SKU');
      await user.selectOptions(screen.getByLabelText('Category'), 'Furniture');
      await user.type(screen.getByLabelText('Unit Price'), '100');
      await user.type(screen.getByLabelText('Location'), 'Test Location');

      const saveButton = screen.getByText('Save Item');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('This SKU already exists. Please use a different SKU.')).toBeInTheDocument();
      });

      // SKU field should be highlighted with error
      const skuInput = screen.getByLabelText('SKU');
      expect(skuInput).toHaveClass('border-red-500');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText('Item Name')).toHaveAttribute('required');
      expect(screen.getByLabelText('SKU')).toHaveAttribute('required');
      expect(screen.getByLabelText('Category')).toHaveAttribute('required');
      expect(screen.getByLabelText('Unit Price')).toHaveAttribute('required');
    });

    it('should announce form validation errors to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const saveButton = screen.getByText('Save Item');
      await user.click(saveButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
        expect(errorMessages[0]).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should support keyboard navigation', async () => {
      render(
        <TestWrapper>
          <InventoryForm mode="create" />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText('Item Name');
      nameInput.focus();

      // Tab through form fields
      fireEvent.keyDown(nameInput, { key: 'Tab' });
      expect(screen.getByLabelText('Description')).toHaveFocus();

      fireEvent.keyDown(screen.getByLabelText('Description'), { key: 'Tab' });
      expect(screen.getByLabelText('Category')).toHaveFocus();
    });
  });
});
