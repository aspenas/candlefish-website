import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { ClientInfoFormEnhanced } from '@/components/workflow/ClientInfoFormEnhanced';
import { CREATE_CUSTOMER, SEARCH_CUSTOMERS } from '@/lib/graphql/queries';
import { useEstimateStore } from '@/stores/useEstimateStore';

// Mock the store
jest.mock('@/stores/useEstimateStore');
const mockUseEstimateStore = useEstimateStore as jest.MockedFunction<typeof useEstimateStore>;

const mockCustomers = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '(555) 123-4567',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
    },
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phone: '(555) 987-6543',
    address: {
      street: '456 Oak Ave',
      city: 'Somewhere',
      state: 'NY',
      zipCode: '67890',
    },
  },
];

const mocks = [
  {
    request: {
      query: SEARCH_CUSTOMERS,
      variables: { query: 'John' },
    },
    result: {
      data: {
        searchCustomers: [mockCustomers[0]],
      },
    },
  },
  {
    request: {
      query: CREATE_CUSTOMER,
      variables: {
        input: {
          firstName: 'New',
          lastName: 'Customer',
          email: 'new.customer@example.com',
          phone: '(555) 111-2222',
          address: {
            street: '789 Pine St',
            city: 'Newtown',
            state: 'TX',
            zipCode: '54321',
          },
        },
      },
    },
    result: {
      data: {
        createCustomer: {
          id: '3',
          firstName: 'New',
          lastName: 'Customer',
          email: 'new.customer@example.com',
          phone: '(555) 111-2222',
          address: {
            street: '789 Pine St',
            city: 'Newtown',
            state: 'TX',
            zipCode: '54321',
          },
        },
      },
    },
  },
];

describe('ClientInfoFormEnhanced Component', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    onBack: jest.fn(),
  };

  const mockStoreState = {
    currentEstimate: null,
    setCustomer: jest.fn(),
    setProject: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEstimateStore.mockReturnValue(mockStoreState as any);
  });

  it('should render the form with all required fields', () => {
    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    expect(screen.getByRole('heading', { name: 'Client Information' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search existing customers')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Street Address')).toBeInTheDocument();
    expect(screen.getByLabelText('City')).toBeInTheDocument();
    expect(screen.getByLabelText('State')).toBeInTheDocument();
    expect(screen.getByLabelText('ZIP Code')).toBeInTheDocument();
  });

  it('should search for existing customers', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    const searchInput = screen.getByLabelText('Search existing customers');
    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('john.smith@example.com')).toBeInTheDocument();
    expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
  });

  it('should populate form when selecting existing customer', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    const searchInput = screen.getByLabelText('Search existing customers');
    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    const customerOption = screen.getByText('John Smith');
    await user.click(customerOption);

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john.smith@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(555) 123-4567')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Anytown')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });

    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Phone is required')).toBeInTheDocument();
    expect(screen.getByText('Street address is required')).toBeInTheDocument();
    expect(screen.getByText('City is required')).toBeInTheDocument();
    expect(screen.getByText('State is required')).toBeInTheDocument();
    expect(screen.getByText('ZIP code is required')).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'invalid-email');

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should validate phone number format', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    const phoneInput = screen.getByLabelText('Phone');
    await user.type(phoneInput, '123');

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });
  });

  it('should format phone number automatically', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    const phoneInput = screen.getByLabelText('Phone');
    await user.type(phoneInput, '5551234567');

    await waitFor(() => {
      expect(phoneInput).toHaveValue('(555) 123-4567');
    });
  });

  it('should validate ZIP code format', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    const zipInput = screen.getByLabelText('ZIP Code');
    await user.type(zipInput, '123');

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('ZIP code must be 5 or 9 digits')).toBeInTheDocument();
    });
  });

  it('should create new customer successfully', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    // Fill out form
    await user.type(screen.getByLabelText('First Name'), 'New');
    await user.type(screen.getByLabelText('Last Name'), 'Customer');
    await user.type(screen.getByLabelText('Email'), 'new.customer@example.com');
    await user.type(screen.getByLabelText('Phone'), '5551112222');
    await user.type(screen.getByLabelText('Street Address'), '789 Pine St');
    await user.type(screen.getByLabelText('City'), 'Newtown');
    await user.selectOptions(screen.getByLabelText('State'), 'TX');
    await user.type(screen.getByLabelText('ZIP Code'), '54321');

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        id: '3',
        firstName: 'New',
        lastName: 'Customer',
        email: 'new.customer@example.com',
        phone: '(555) 111-2222',
        address: {
          street: '789 Pine St',
          city: 'Newtown',
          state: 'TX',
          zipCode: '54321',
        },
      });
    });
  });

  it('should handle back button click', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    const backButton = screen.getByRole('button', { name: 'Back' });
    await user.click(backButton);

    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('should show loading state during form submission', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    // Fill out form
    await user.type(screen.getByLabelText('First Name'), 'New');
    await user.type(screen.getByLabelText('Last Name'), 'Customer');
    await user.type(screen.getByLabelText('Email'), 'new.customer@example.com');
    await user.type(screen.getByLabelText('Phone'), '5551112222');
    await user.type(screen.getByLabelText('Street Address'), '789 Pine St');
    await user.type(screen.getByLabelText('City'), 'Newtown');
    await user.selectOptions(screen.getByLabelText('State'), 'TX');
    await user.type(screen.getByLabelText('ZIP Code'), '54321');

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    expect(screen.getByText('Creating customer...')).toBeInTheDocument();
    expect(continueButton).toBeDisabled();
  });

  it('should handle network errors gracefully', async () => {
    const errorMocks = [
      {
        request: {
          query: CREATE_CUSTOMER,
          variables: {
            input: {
              firstName: 'Error',
              lastName: 'Customer',
              email: 'error.customer@example.com',
              phone: '(555) 999-9999',
              address: {
                street: '999 Error St',
                city: 'Errortown',
                state: 'CA',
                zipCode: '99999',
              },
            },
          },
        },
        error: new Error('Network error'),
      },
    ];

    const user = userEvent.setup();

    render(
      <MockedProvider mocks={errorMocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    // Fill out form
    await user.type(screen.getByLabelText('First Name'), 'Error');
    await user.type(screen.getByLabelText('Last Name'), 'Customer');
    await user.type(screen.getByLabelText('Email'), 'error.customer@example.com');
    await user.type(screen.getByLabelText('Phone'), '5559999999');
    await user.type(screen.getByLabelText('Street Address'), '999 Error St');
    await user.type(screen.getByLabelText('City'), 'Errortown');
    await user.selectOptions(screen.getByLabelText('State'), 'CA');
    await user.type(screen.getByLabelText('ZIP Code'), '99999');

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create customer. Please try again.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('should preserve form data when switching between new and existing customer', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    // Fill out new customer form
    await user.type(screen.getByLabelText('First Name'), 'Test');
    await user.type(screen.getByLabelText('Last Name'), 'User');
    await user.type(screen.getByLabelText('Email'), 'test.user@example.com');

    // Search for existing customer
    const searchInput = screen.getByLabelText('Search existing customers');
    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    // Select existing customer
    const customerOption = screen.getByText('John Smith');
    await user.click(customerOption);

    // Clear search to go back to new customer mode
    await user.clear(searchInput);

    // Check that original form data is preserved
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test.user@example.com')).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA labels and keyboard navigation', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    // Check form has proper ARIA labels
    expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Client information form');

    // Check required fields have aria-required
    expect(screen.getByLabelText('First Name')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Last Name')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-required', 'true');

    // Test keyboard navigation
    const firstNameInput = screen.getByLabelText('First Name');
    firstNameInput.focus();

    await user.tab();
    expect(screen.getByLabelText('Last Name')).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('should handle auto-fill from browser or password manager', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    const firstNameInput = screen.getByLabelText('First Name');
    const lastNameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');

    // Simulate browser auto-fill
    act(() => {
      fireEvent.change(firstNameInput, { target: { value: 'Auto' } });
      fireEvent.change(lastNameInput, { target: { value: 'Fill' } });
      fireEvent.change(emailInput, { target: { value: 'auto.fill@example.com' } });
    });

    expect(firstNameInput).toHaveValue('Auto');
    expect(lastNameInput).toHaveValue('Fill');
    expect(emailInput).toHaveValue('auto.fill@example.com');
  });

  it('should clear search results when clicking outside', async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={mocks}>
        <ClientInfoFormEnhanced {...defaultProps} />
      </MockedProvider>
    );

    const searchInput = screen.getByLabelText('Search existing customers');
    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    // Click outside the search dropdown
    const formTitle = screen.getByRole('heading', { name: 'Client Information' });
    await user.click(formTitle);

    await waitFor(() => {
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    });
  });
});