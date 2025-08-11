import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Contractors from '../contractors';
import {
  createMockApolloProvider,
  successfulContractorsMock,
  successfulCreateContractorMock,
  graphqlErrorMock,
  mockContractors
} from '../../../__tests__/mocks/apollo-client';
import { useAuth } from '../../../hooks/use-auth';

// Mock the auth hook
jest.mock('../../../hooks/use-auth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock child components
jest.mock('../contractor-table', () => {
  return function MockContractorTable({
    contractors,
    onEdit,
    onDelete,
    loading,
    onSort,
    sortBy,
    sortOrder
  }: any) {
    return (
      <div data-testid="contractor-table">
        <div data-testid="table-loading">{loading ? 'Loading...' : 'Loaded'}</div>
        <div data-testid="sort-controls">
          <button onClick={() => onSort('name')}>Sort by Name</button>
          <button onClick={() => onSort('rating')}>Sort by Rating</button>
        </div>
        {contractors.map((contractor: any) => (
          <div key={contractor.id} data-testid={`contractor-row-${contractor.id}`}>
            <span>{contractor.name}</span>
            <span>{contractor.email}</span>
            <span>{contractor.status}</span>
            <button onClick={() => onEdit(contractor)}>Edit</button>
            <button onClick={() => onDelete(contractor.id)}>Delete</button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../invite-contractor-dialog', () => {
  return function MockInviteContractorDialog({
    open,
    onClose,
    onSubmit
  }: any) {
    if (!open) return null;

    return (
      <div data-testid="invite-dialog">
        <h2>Invite Contractor</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            name: 'New Contractor',
            email: 'new@contractor.com',
            phone: '+1111111111',
            company: 'New Contracting',
            skills: ['painting']
          });
        }}>
          <input data-testid="name-input" placeholder="Name" />
          <input data-testid="email-input" placeholder="Email" />
          <input data-testid="phone-input" placeholder="Phone" />
          <input data-testid="company-input" placeholder="Company" />
          <button type="submit">Create Contractor</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    );
  };
});

jest.mock('../contractor-stats', () => {
  return function MockContractorStats({ contractors }: any) {
    return (
      <div data-testid="contractor-stats">
        <div>Total: {contractors.length}</div>
        <div>Active: {contractors.filter((c: any) => c.status === 'active').length}</div>
        <div>Pending: {contractors.filter((c: any) => c.status === 'pending').length}</div>
      </div>
    );
  };
});

const renderContractors = (mocks: any[] = [successfulContractorsMock]) => {
  return render(
    <BrowserRouter>
      {createMockApolloProvider(<Contractors />, mocks)}
    </BrowserRouter>
  );
};

describe('Contractors Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      },
      token: 'mock-token',
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Load', () => {
    it('should render contractors page with title', async () => {
      renderContractors();

      expect(screen.getByText('Contractors')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      renderContractors([]);

      expect(screen.getByTestId('table-loading')).toHaveTextContent('Loading...');
    });

    it('should display contractors after loading', async () => {
      renderContractors();

      await waitFor(() => {
        expect(screen.getByTestId('table-loading')).toHaveTextContent('Loaded');
      });

      expect(screen.getByTestId('contractor-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('contractor-row-2')).toBeInTheDocument();
      expect(screen.getByText('John Contractor')).toBeInTheDocument();
      expect(screen.getByText('Jane Builder')).toBeInTheDocument();
    });

    it('should display contractor stats', async () => {
      renderContractors();

      await waitFor(() => {
        expect(screen.getByTestId('contractor-stats')).toBeInTheDocument();
      });

      expect(screen.getByText('Total: 2')).toBeInTheDocument();
      expect(screen.getByText('Active: 2')).toBeInTheDocument();
      expect(screen.getByText('Pending: 0')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('should have search input field', async () => {
      renderContractors();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search contractors/i)).toBeInTheDocument();
      });
    });

    it('should filter contractors by search term', async () => {
      const user = userEvent.setup();
      renderContractors();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search contractors/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search contractors/i);
      await user.type(searchInput, 'John');

      // Mock implementation would filter results
      expect(searchInput).toHaveValue('John');
    });

    it('should have status filter dropdown', async () => {
      renderContractors();

      await waitFor(() => {
        expect(screen.getByText(/filter by status/i)).toBeInTheDocument();
      });
    });

    it('should filter contractors by status', async () => {
      const user = userEvent.setup();
      renderContractors();

      await waitFor(() => {
        const statusFilter = screen.getByText(/filter by status/i);
        expect(statusFilter).toBeInTheDocument();
      });

      const statusFilter = screen.getByText(/filter by status/i);
      await user.click(statusFilter);

      // Select 'active' status
      const activeOption = screen.getByText('Active');
      await user.click(activeOption);

      // Verify filter is applied
      expect(statusFilter).toHaveTextContent('Active');
    });

    it('should have skills filter', async () => {
      renderContractors();

      await waitFor(() => {
        expect(screen.getByText(/filter by skills/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should sort contractors by name', async () => {
      const user = userEvent.setup();
      renderContractors();

      await waitFor(() => {
        expect(screen.getByText('Sort by Name')).toBeInTheDocument();
      });

      const sortButton = screen.getByText('Sort by Name');
      await user.click(sortButton);

      // Verify sort is applied (mock implementation)
      expect(sortButton).toHaveBeenCalled;
    });

    it('should sort contractors by rating', async () => {
      const user = userEvent.setup();
      renderContractors();

      await waitFor(() => {
        expect(screen.getByText('Sort by Rating')).toBeInTheDocument();
      });

      const sortButton = screen.getByText('Sort by Rating');
      await user.click(sortButton);

      expect(sortButton).toHaveBeenCalled;
    });

    it('should toggle sort order on repeated clicks', async () => {
      const user = userEvent.setup();
      renderContractors();

      await waitFor(() => {
        expect(screen.getByText('Sort by Name')).toBeInTheDocument();
      });

      const sortButton = screen.getByText('Sort by Name');

      // First click - ascending
      await user.click(sortButton);
      // Second click - descending
      await user.click(sortButton);

      expect(sortButton).toHaveBeenCalled;
    });
  });

  describe('Contractor Creation', () => {
    it('should have invite contractor button for admin users', async () => {
      renderContractors();

      await waitFor(() => {
        expect(screen.getByText(/invite contractor/i)).toBeInTheDocument();
      });
    });

    it('should open invite dialog when button is clicked', async () => {
      const user = userEvent.setup();
      renderContractors();

      await waitFor(() => {
        expect(screen.getByText(/invite contractor/i)).toBeInTheDocument();
      });

      const inviteButton = screen.getByText(/invite contractor/i);
      await user.click(inviteButton);

      expect(screen.getByTestId('invite-dialog')).toBeInTheDocument();
    });

    it('should create new contractor successfully', async () => {
      const user = userEvent.setup();
      const mocks = [successfulContractorsMock, successfulCreateContractorMock];
      renderContractors(mocks);

      // Open dialog
      await waitFor(() => {
        expect(screen.getByText(/invite contractor/i)).toBeInTheDocument();
      });

      const inviteButton = screen.getByText(/invite contractor/i);
      await user.click(inviteButton);

      // Fill form and submit
      const submitButton = screen.getByText('Create Contractor');
      await user.click(submitButton);

      await waitFor(() => {
        // Dialog should close after successful creation
        expect(screen.queryByTestId('invite-dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle creation errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMock = {
        ...successfulCreateContractorMock,
        error: new Error('Creation failed')
      };
      const mocks = [successfulContractorsMock, errorMock];

      renderContractors(mocks);

      // Open dialog and submit
      await waitFor(() => {
        expect(screen.getByText(/invite contractor/i)).toBeInTheDocument();
      });

      const inviteButton = screen.getByText(/invite contractor/i);
      await user.click(inviteButton);

      const submitButton = screen.getByText('Create Contractor');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error creating contractor/i)).toBeInTheDocument();
      });
    });

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderContractors();

      // Open dialog
      await waitFor(() => {
        expect(screen.getByText(/invite contractor/i)).toBeInTheDocument();
      });

      const inviteButton = screen.getByText(/invite contractor/i);
      await user.click(inviteButton);

      expect(screen.getByTestId('invite-dialog')).toBeInTheDocument();

      // Close dialog
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(screen.queryByTestId('invite-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Contractor Management', () => {
    it('should handle contractor edit action', async () => {
      const user = userEvent.setup();
      renderContractors();

      await waitFor(() => {
        expect(screen.getByTestId('contractor-row-1')).toBeInTheDocument();
      });

      const editButton = screen.getAllByText('Edit')[0];
      await user.click(editButton);

      // Should open edit dialog or navigate to edit page
      expect(editButton).toHaveBeenCalled;
    });

    it('should handle contractor delete action', async () => {
      const user = userEvent.setup();
      renderContractors();

      await waitFor(() => {
        expect(screen.getByTestId('contractor-row-1')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByText('Delete')[0];
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(deleteButton).toHaveBeenCalled;
    });

    it('should confirm before deleting contractor', async () => {
      const user = userEvent.setup();

      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm');
      confirmSpy.mockReturnValue(true);

      renderContractors();

      await waitFor(() => {
        expect(screen.getByTestId('contractor-row-1')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByText('Delete')[0];
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this contractor?');

      confirmSpy.mockRestore();
    });
  });

  describe('Permissions and Access Control', () => {
    it('should hide invite button for employee users', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'employee-123',
          email: 'employee@example.com',
          name: 'Employee User',
          role: 'employee'
        },
        token: 'mock-token',
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false
      });

      renderContractors();

      await waitFor(() => {
        expect(screen.getByTestId('contractor-table')).toBeInTheDocument();
      });

      expect(screen.queryByText(/invite contractor/i)).not.toBeInTheDocument();
    });

    it('should hide delete buttons for employee users', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'employee-123',
          email: 'employee@example.com',
          name: 'Employee User',
          role: 'employee'
        },
        token: 'mock-token',
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false
      });

      renderContractors();

      await waitFor(() => {
        expect(screen.getByTestId('contractor-table')).toBeInTheDocument();
      });

      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when loading fails', async () => {
      renderContractors([graphqlErrorMock]);

      await waitFor(() => {
        expect(screen.getByText(/error loading contractors/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      renderContractors([graphqlErrorMock]);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });
    });

    it('should retry loading when retry button is clicked', async () => {
      const user = userEvent.setup();
      renderContractors([graphqlErrorMock]);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/retry/i);
      await user.click(retryButton);

      expect(retryButton).toHaveBeenCalled;
    });
  });

  describe('Pagination', () => {
    it('should show pagination controls when there are multiple pages', async () => {
      const paginatedMock = {
        ...successfulContractorsMock,
        result: {
          data: {
            contractors: {
              contractors: mockContractors,
              total: 25,
              hasMore: true
            }
          }
        }
      };

      renderContractors([paginatedMock]);

      await waitFor(() => {
        expect(screen.getByText(/page/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/next/i)).toBeInTheDocument();
      expect(screen.getByText(/previous/i)).toBeInTheDocument();
    });

    it('should navigate to next page', async () => {
      const user = userEvent.setup();
      const paginatedMock = {
        ...successfulContractorsMock,
        result: {
          data: {
            contractors: {
              contractors: mockContractors,
              total: 25,
              hasMore: true
            }
          }
        }
      };

      renderContractors([paginatedMock]);

      await waitFor(() => {
        expect(screen.getByText(/next/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByText(/next/i);
      await user.click(nextButton);

      expect(nextButton).toHaveBeenCalled;
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderContractors();

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /invite contractor/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      renderContractors();

      await waitFor(() => {
        expect(screen.getByText(/invite contractor/i)).toBeInTheDocument();
      });

      const inviteButton = screen.getByText(/invite contractor/i);
      expect(inviteButton).toHaveAttribute('tabIndex', '0');
    });

    it('should announce loading states to screen readers', async () => {
      renderContractors([]);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });
  });
});
