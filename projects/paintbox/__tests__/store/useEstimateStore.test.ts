import { renderHook, act } from '@testing-library/react';
import { useEstimateStore } from '@/stores/useEstimateStore';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useEstimateStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset store state before each test
    const { result } = renderHook(() => useEstimateStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have default initial state', () => {
      const { result } = renderHook(() => useEstimateStore());

      expect(result.current.currentEstimate).toBeNull();
      expect(result.current.customer).toBeNull();
      expect(result.current.project).toBeNull();
      expect(result.current.measurements).toEqual({});
      expect(result.current.selectedTier).toBe('BETTER');
      expect(result.current.status).toBe('DRAFT');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load state from localStorage if available', () => {
      const savedState = {
        customer: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        selectedTier: 'BEST',
        status: 'IN_PROGRESS',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useEstimateStore());

      expect(result.current.customer).toEqual(savedState.customer);
      expect(result.current.selectedTier).toBe('BEST');
      expect(result.current.status).toBe('IN_PROGRESS');
    });
  });

  describe('Customer Management', () => {
    it('should set customer information', () => {
      const { result } = renderHook(() => useEstimateStore());
      
      const customer = {
        id: '1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '(555) 123-4567',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
        },
      };

      act(() => {
        result.current.setCustomer(customer);
      });

      expect(result.current.customer).toEqual(customer);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'paintbox_estimate_draft',
        JSON.stringify(expect.objectContaining({ customer }))
      );
    });

    it('should clear customer information', () => {
      const { result } = renderHook(() => useEstimateStore());
      
      const customer = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      act(() => {
        result.current.setCustomer(customer);
      });

      expect(result.current.customer).toEqual(customer);

      act(() => {
        result.current.setCustomer(null);
      });

      expect(result.current.customer).toBeNull();
    });
  });

  describe('Project Management', () => {
    it('should set project information', () => {
      const { result } = renderHook(() => useEstimateStore());
      
      const project = {
        id: '1',
        name: 'Kitchen Renovation',
        description: 'Paint kitchen walls and cabinets',
        propertyType: 'RESIDENTIAL',
        rooms: ['Kitchen'],
      };

      act(() => {
        result.current.setProject(project);
      });

      expect(result.current.project).toEqual(project);
    });

    it('should update project details', () => {
      const { result } = renderHook(() => useEstimateStore());
      
      const initialProject = {
        id: '1',
        name: 'Kitchen Renovation',
        description: 'Paint kitchen walls',
      };

      act(() => {
        result.current.setProject(initialProject);
      });

      const updatedProject = {
        ...initialProject,
        description: 'Paint kitchen walls and cabinets',
        rooms: ['Kitchen', 'Dining Room'],
      };

      act(() => {
        result.current.setProject(updatedProject);
      });

      expect(result.current.project).toEqual(updatedProject);
    });
  });

  describe('Measurements Management', () => {
    it('should add room measurements', () => {
      const { result } = renderHook(() => useEstimateStore());
      
      const roomMeasurements = {
        roomId: 'kitchen',
        roomName: 'Kitchen',
        walls: [
          { id: 'wall1', length: 12, height: 9, area: 108 },
          { id: 'wall2', length: 10, height: 9, area: 90 },
        ],
        totalArea: 198,
        ceilingArea: 120,
        doors: 2,
        windows: 3,
      };

      act(() => {
        result.current.addRoomMeasurements('kitchen', roomMeasurements);
      });

      expect(result.current.measurements.kitchen).toEqual(roomMeasurements);
      expect(result.current.getTotalSquareFootage()).toBe(198);
    });

    it('should update existing room measurements', () => {
      const { result } = renderHook(() => useEstimateStore());
      
      const initialMeasurements = {
        roomId: 'kitchen',
        roomName: 'Kitchen',
        totalArea: 150,
      };

      act(() => {
        result.current.addRoomMeasurements('kitchen', initialMeasurements);
      });

      const updatedMeasurements = {
        ...initialMeasurements,
        totalArea: 200,
        ceilingArea: 120,
      };

      act(() => {
        result.current.addRoomMeasurements('kitchen', updatedMeasurements);
      });

      expect(result.current.measurements.kitchen).toEqual(updatedMeasurements);
      expect(result.current.getTotalSquareFootage()).toBe(200);
    });

    it('should remove room measurements', () => {
      const { result } = renderHook(() => useEstimateStore());
      
      const kitchenMeasurements = {
        roomId: 'kitchen',
        totalArea: 150,
      };

      const bathroomMeasurements = {
        roomId: 'bathroom',
        totalArea: 80,
      };

      act(() => {
        result.current.addRoomMeasurements('kitchen', kitchenMeasurements);
        result.current.addRoomMeasurements('bathroom', bathroomMeasurements);
      });

      expect(result.current.getTotalSquareFootage()).toBe(230);

      act(() => {
        result.current.removeRoomMeasurements('kitchen');
      });

      expect(result.current.measurements.kitchen).toBeUndefined();
      expect(result.current.measurements.bathroom).toEqual(bathroomMeasurements);
      expect(result.current.getTotalSquareFootage()).toBe(80);
    });

    it('should calculate total square footage correctly', () => {
      const { result } = renderHook(() => useEstimateStore());
      
      act(() => {
        result.current.addRoomMeasurements('kitchen', { totalArea: 150 });
        result.current.addRoomMeasurements('livingroom', { totalArea: 300 });
        result.current.addRoomMeasurements('bedroom', { totalArea: 180 });
      });

      expect(result.current.getTotalSquareFootage()).toBe(630);
    });
  });

  describe('Pricing Tier Management', () => {
    it('should set pricing tier', () => {
      const { result } = renderHook(() => useEstimateStore());

      act(() => {
        result.current.setSelectedTier('BEST');
      });

      expect(result.current.selectedTier).toBe('BEST');
    });

    it('should validate pricing tier values', () => {
      const { result } = renderHook(() => useEstimateStore());

      // Valid tiers
      const validTiers = ['GOOD', 'BETTER', 'BEST'] as const;
      
      validTiers.forEach(tier => {
        act(() => {
          result.current.setSelectedTier(tier);
        });
        expect(result.current.selectedTier).toBe(tier);
      });
    });
  });

  describe('Status Management', () => {
    it('should set estimate status', () => {
      const { result } = renderHook(() => useEstimateStore());

      act(() => {
        result.current.setStatus('IN_PROGRESS');
      });

      expect(result.current.status).toBe('IN_PROGRESS');
    });

    it('should handle status transitions correctly', () => {
      const { result } = renderHook(() => useEstimateStore());

      const statusTransitions = [
        'DRAFT',
        'IN_PROGRESS',
        'REVIEW',
        'SENT',
        'ACCEPTED',
      ] as const;

      statusTransitions.forEach(status => {
        act(() => {
          result.current.setStatus(status);
        });
        expect(result.current.status).toBe(status);
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should manage loading state', () => {
      const { result } = renderHook(() => useEstimateStore());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should manage error state', () => {
      const { result } = renderHook(() => useEstimateStore());

      expect(result.current.error).toBeNull();

      const error = new Error('Something went wrong');

      act(() => {
        result.current.setError(error);
      });

      expect(result.current.error).toBe(error);

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear error when loading starts', () => {
      const { result } = renderHook(() => useEstimateStore());

      const error = new Error('Previous error');

      act(() => {
        result.current.setError(error);
      });

      expect(result.current.error).toBe(error);

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Estimate CRUD Operations', () => {
    it('should create estimate with current state', () => {
      const { result } = renderHook(() => useEstimateStore());

      const customer = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      const project = {
        id: '1',
        name: 'Test Project',
      };

      act(() => {
        result.current.setCustomer(customer);
        result.current.setProject(project);
        result.current.addRoomMeasurements('kitchen', { totalArea: 200 });
        result.current.setSelectedTier('BEST');
      });

      const estimateData = result.current.getEstimateData();

      expect(estimateData).toEqual({
        customer,
        project,
        measurements: { kitchen: { totalArea: 200 } },
        selectedTier: 'BEST',
        status: 'DRAFT',
        totalSquareFootage: 200,
      });
    });

    it('should update current estimate', () => {
      const { result } = renderHook(() => useEstimateStore());

      const estimate = {
        id: '1',
        customerId: 'customer1',
        selectedTier: 'BETTER' as const,
        status: 'SENT' as const,
        totalSquareFootage: 1500,
      };

      act(() => {
        result.current.setCurrentEstimate(estimate);
      });

      expect(result.current.currentEstimate).toEqual(estimate);
      expect(result.current.selectedTier).toBe('BETTER');
      expect(result.current.status).toBe('SENT');
    });
  });

  describe('Persistence', () => {
    it('should save state to localStorage on changes', () => {
      const { result } = renderHook(() => useEstimateStore());

      const customer = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      act(() => {
        result.current.setCustomer(customer);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'paintbox_estimate_draft',
        JSON.stringify(expect.objectContaining({ customer }))
      );
    });

    it('should not save when loading from localStorage', () => {
      const savedState = {
        customer: {
          id: '1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

      renderHook(() => useEstimateStore());

      // setItem should not be called during initialization
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should handle localStorage errors gracefully', () => {
      const { result } = renderHook(() => useEstimateStore());

      // Mock localStorage.setItem to throw an error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw when trying to save
      expect(() => {
        act(() => {
          result.current.setSelectedTier('BEST');
        });
      }).not.toThrow();

      expect(result.current.selectedTier).toBe('BEST');
    });

    it('should clear localStorage on reset', () => {
      const { result } = renderHook(() => useEstimateStore());

      act(() => {
        result.current.setCustomer({ id: '1', firstName: 'John', lastName: 'Doe' });
        result.current.reset();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('paintbox_estimate_draft');
      expect(result.current.customer).toBeNull();
      expect(result.current.selectedTier).toBe('BETTER');
      expect(result.current.status).toBe('DRAFT');
    });
  });

  describe('Computed Properties', () => {
    it('should calculate estimated labor hours based on square footage', () => {
      const { result } = renderHook(() => useEstimateStore());

      act(() => {
        result.current.addRoomMeasurements('kitchen', { totalArea: 200 });
        result.current.addRoomMeasurements('livingroom', { totalArea: 300 });
      });

      const laborHours = result.current.getEstimatedLaborHours();

      // Assuming 0.02 hours per square foot (standard rate)
      expect(laborHours).toBe(10); // (200 + 300) * 0.02
    });

    it('should adjust labor hours based on complexity', () => {
      const { result } = renderHook(() => useEstimateStore());

      act(() => {
        result.current.addRoomMeasurements('kitchen', { 
          totalArea: 200,
          complexity: 'HIGHLY_COMPLEX',
        });
      });

      const laborHours = result.current.getEstimatedLaborHours();

      // Should be higher than standard rate for complex work
      expect(laborHours).toBeGreaterThan(4); // 200 * 0.02
    });

    it('should validate estimate completeness', () => {
      const { result } = renderHook(() => useEstimateStore());

      expect(result.current.isEstimateComplete()).toBe(false);

      act(() => {
        result.current.setCustomer({
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        });
      });

      expect(result.current.isEstimateComplete()).toBe(false);

      act(() => {
        result.current.addRoomMeasurements('kitchen', { totalArea: 200 });
      });

      expect(result.current.isEstimateComplete()).toBe(true);
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle rapid consecutive updates', () => {
      const { result } = renderHook(() => useEstimateStore());

      act(() => {
        // Simulate rapid updates that might happen in real usage
        result.current.setSelectedTier('GOOD');
        result.current.setSelectedTier('BETTER');
        result.current.setSelectedTier('BEST');
        result.current.setStatus('IN_PROGRESS');
        result.current.setLoading(true);
        result.current.setLoading(false);
      });

      expect(result.current.selectedTier).toBe('BEST');
      expect(result.current.status).toBe('IN_PROGRESS');
      expect(result.current.isLoading).toBe(false);
    });

    it('should maintain data consistency during multiple operations', async () => {
      const { result } = renderHook(() => useEstimateStore());

      // Simulate multiple async operations happening concurrently
      await act(async () => {
        const promises = [
          Promise.resolve().then(() => result.current.setSelectedTier('BEST')),
          Promise.resolve().then(() => result.current.addRoomMeasurements('room1', { totalArea: 100 })),
          Promise.resolve().then(() => result.current.addRoomMeasurements('room2', { totalArea: 150 })),
          Promise.resolve().then(() => result.current.setStatus('IN_PROGRESS')),
        ];

        await Promise.all(promises);
      });

      expect(result.current.selectedTier).toBe('BEST');
      expect(result.current.status).toBe('IN_PROGRESS');
      expect(result.current.getTotalSquareFootage()).toBe(250);
    });
  });
});