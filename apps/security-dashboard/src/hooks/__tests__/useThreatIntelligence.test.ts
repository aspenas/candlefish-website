import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThreatIntelligence } from '../useThreatIntelligence';
import { createMockThreats, createMockIOCs } from '@/test/factories/ThreatFactory';

// Mock Apollo Client
const mockQuery = vi.fn();
const mockMutation = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('@apollo/client', () => ({
  useQuery: () => mockQuery(),
  useMutation: () => mockMutation(),
  useSubscription: () => mockSubscribe(),
  gql: vi.fn((template) => template[0]),
}));

describe('useThreatIntelligence', () => {
  const mockThreats = createMockThreats(5);
  const mockIOCs = createMockIOCs(10);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading threats', () => {
    it('returns loading state initially', () => {
      mockQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useThreatIntelligence());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.threats).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('returns threats when loaded', () => {
      mockQuery.mockReturnValue({
        data: { threats: mockThreats },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useThreatIntelligence());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.threats).toEqual(mockThreats);
      expect(result.current.error).toBeNull();
    });

    it('returns error when query fails', () => {
      const error = new Error('Failed to load threats');
      mockQuery.mockReturnValue({
        data: null,
        loading: false,
        error,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useThreatIntelligence());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.threats).toEqual([]);
      expect(result.current.error).toBe(error);
    });
  });

  describe('filtering and searching', () => {
    beforeEach(() => {
      mockQuery.mockReturnValue({
        data: { threats: mockThreats },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('filters threats by severity', () => {
      const { result } = renderHook(() => useThreatIntelligence());

      act(() => {
        result.current.setFilters({ severity: 'CRITICAL' });
      });

      const criticalThreats = mockThreats.filter(t => t.severity === 'CRITICAL');
      expect(result.current.filteredThreats).toEqual(criticalThreats);
    });

    it('filters threats by tags', () => {
      const { result } = renderHook(() => useThreatIntelligence());

      act(() => {
        result.current.setFilters({ tags: ['malware'] });
      });

      const malwareThreats = mockThreats.filter(t => 
        t.tags.some(tag => tag.toLowerCase().includes('malware'))
      );
      expect(result.current.filteredThreats).toEqual(malwareThreats);
    });

    it('searches threats by name and description', () => {
      const { result } = renderHook(() => useThreatIntelligence());

      act(() => {
        result.current.setSearchTerm('advanced');
      });

      const searchResults = mockThreats.filter(t => 
        t.name.toLowerCase().includes('advanced') || 
        t.description.toLowerCase().includes('advanced')
      );
      expect(result.current.filteredThreats).toEqual(searchResults);
    });

    it('combines filters and search', () => {
      const { result } = renderHook(() => useThreatIntelligence());

      act(() => {
        result.current.setFilters({ severity: 'HIGH' });
        result.current.setSearchTerm('threat');
      });

      const combinedResults = mockThreats.filter(t => 
        t.severity === 'HIGH' && 
        (t.name.toLowerCase().includes('threat') || 
         t.description.toLowerCase().includes('threat'))
      );
      expect(result.current.filteredThreats).toEqual(combinedResults);
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      mockQuery.mockReturnValue({
        data: { threats: mockThreats },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('sorts threats by date', () => {
      const { result } = renderHook(() => useThreatIntelligence());

      act(() => {
        result.current.setSortBy('created_at');
        result.current.setSortOrder('desc');
      });

      const sortedThreats = [...mockThreats].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      expect(result.current.filteredThreats).toEqual(sortedThreats);
    });

    it('sorts threats by severity', () => {
      const { result } = renderHook(() => useThreatIntelligence());

      const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

      act(() => {
        result.current.setSortBy('severity');
        result.current.setSortOrder('desc');
      });

      const sortedThreats = [...mockThreats].sort((a, b) => 
        severityOrder[b.severity] - severityOrder[a.severity]
      );
      expect(result.current.filteredThreats).toEqual(sortedThreats);
    });
  });

  describe('pagination', () => {
    it('paginates results correctly', () => {
      mockQuery.mockReturnValue({
        data: { threats: mockThreats },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useThreatIntelligence());

      act(() => {
        result.current.setPageSize(2);
        result.current.setCurrentPage(1);
      });

      expect(result.current.paginatedThreats).toHaveLength(2);
      expect(result.current.totalPages).toBe(Math.ceil(mockThreats.length / 2));
      expect(result.current.currentPage).toBe(1);

      act(() => {
        result.current.setCurrentPage(2);
      });

      expect(result.current.paginatedThreats).toEqual(
        mockThreats.slice(2, 4)
      );
    });
  });

  describe('threat operations', () => {
    it('creates new threat', async () => {
      const createThreatMutation = vi.fn().mockResolvedValue({
        data: { createThreat: mockThreats[0] }
      });
      
      mockMutation.mockReturnValue([createThreatMutation, { loading: false }]);

      const { result } = renderHook(() => useThreatIntelligence());

      const threatData = {
        name: 'New Threat',
        description: 'Description',
        severity: 'HIGH',
      };

      await act(async () => {
        await result.current.createThreat(threatData);
      });

      expect(createThreatMutation).toHaveBeenCalledWith({
        variables: { input: threatData }
      });
    });

    it('updates existing threat', async () => {
      const updateThreatMutation = vi.fn().mockResolvedValue({
        data: { updateThreat: { ...mockThreats[0], name: 'Updated Threat' } }
      });
      
      mockMutation.mockReturnValue([updateThreatMutation, { loading: false }]);

      const { result } = renderHook(() => useThreatIntelligence());

      const updates = { name: 'Updated Threat' };

      await act(async () => {
        await result.current.updateThreat(mockThreats[0].id, updates);
      });

      expect(updateThreatMutation).toHaveBeenCalledWith({
        variables: { id: mockThreats[0].id, input: updates }
      });
    });

    it('deletes threat', async () => {
      const deleteThreatMutation = vi.fn().mockResolvedValue({
        data: { deleteThreat: { success: true } }
      });
      
      mockMutation.mockReturnValue([deleteThreatMutation, { loading: false }]);

      const { result } = renderHook(() => useThreatIntelligence());

      await act(async () => {
        await result.current.deleteThreat(mockThreats[0].id);
      });

      expect(deleteThreatMutation).toHaveBeenCalledWith({
        variables: { id: mockThreats[0].id }
      });
    });
  });

  describe('IOC operations', () => {
    beforeEach(() => {
      mockQuery.mockReturnValue({
        data: { 
          threats: mockThreats,
          iocs: mockIOCs
        },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('filters IOCs by type', () => {
      const { result } = renderHook(() => useThreatIntelligence());

      act(() => {
        result.current.setIOCFilters({ type: 'IP' });
      });

      const ipIOCs = mockIOCs.filter(ioc => ioc.type === 'IP');
      expect(result.current.filteredIOCs).toEqual(ipIOCs);
    });

    it('searches IOCs by value', () => {
      const { result } = renderHook(() => useThreatIntelligence());

      const searchValue = '192.168';

      act(() => {
        result.current.setIOCSearchTerm(searchValue);
      });

      const searchResults = mockIOCs.filter(ioc => 
        ioc.value.toLowerCase().includes(searchValue.toLowerCase())
      );
      expect(result.current.filteredIOCs).toEqual(searchResults);
    });

    it('creates new IOC', async () => {
      const createIOCMutation = vi.fn().mockResolvedValue({
        data: { createIOC: mockIOCs[0] }
      });
      
      mockMutation.mockReturnValue([createIOCMutation, { loading: false }]);

      const { result } = renderHook(() => useThreatIntelligence());

      const iocData = {
        type: 'IP',
        value: '192.168.1.100',
        threat_id: mockThreats[0].id,
      };

      await act(async () => {
        await result.current.createIOC(iocData);
      });

      expect(createIOCMutation).toHaveBeenCalledWith({
        variables: { input: iocData }
      });
    });
  });

  describe('real-time subscriptions', () => {
    it('subscribes to threat updates', () => {
      mockSubscribe.mockReturnValue({
        data: { threatUpdated: mockThreats[0] },
        loading: false,
        error: null,
      });

      renderHook(() => useThreatIntelligence());

      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('handles threat update subscription', () => {
      const updatedThreat = { ...mockThreats[0], name: 'Updated via Subscription' };
      
      mockQuery.mockReturnValue({
        data: { threats: mockThreats },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockSubscribe.mockReturnValue({
        data: { threatUpdated: updatedThreat },
        loading: false,
        error: null,
      });

      const { result } = renderHook(() => useThreatIntelligence());

      // Check that the threat was updated in the local state
      const threat = result.current.threats.find(t => t.id === updatedThreat.id);
      expect(threat?.name).toBe('Updated via Subscription');
    });
  });

  describe('analytics and metrics', () => {
    beforeEach(() => {
      mockQuery.mockReturnValue({
        data: { 
          threats: mockThreats,
          threatMetrics: {
            totalThreats: mockThreats.length,
            activeCampaigns: 5,
            newThreatsToday: 3,
            severityDistribution: {
              CRITICAL: 2,
              HIGH: 5,
              MEDIUM: 8,
              LOW: 3,
            },
          }
        },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('provides threat metrics', () => {
      const { result } = renderHook(() => useThreatIntelligence());

      expect(result.current.metrics).toEqual({
        totalThreats: mockThreats.length,
        activeCampaigns: 5,
        newThreatsToday: 3,
        severityDistribution: {
          CRITICAL: 2,
          HIGH: 5,
          MEDIUM: 8,
          LOW: 3,
        },
      });
    });

    it('calculates threat trends', () => {
      const { result } = renderHook(() => useThreatIntelligence());

      expect(result.current.threatTrends).toBeDefined();
      expect(Array.isArray(result.current.threatTrends)).toBe(true);
    });
  });

  describe('export functionality', () => {
    it('exports threats to CSV', async () => {
      mockQuery.mockReturnValue({
        data: { threats: mockThreats },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useThreatIntelligence());

      const csvData = await act(async () => {
        return await result.current.exportThreats('csv');
      });

      expect(csvData).toBeDefined();
      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('name,description,severity');
    });

    it('exports threats to JSON', async () => {
      mockQuery.mockReturnValue({
        data: { threats: mockThreats },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useThreatIntelligence());

      const jsonData = await act(async () => {
        return await result.current.exportThreats('json');
      });

      expect(jsonData).toBeDefined();
      expect(typeof jsonData).toBe('string');
      
      const parsed = JSON.parse(jsonData);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(mockThreats.length);
    });
  });

  describe('error handling', () => {
    it('handles create threat errors', async () => {
      const error = new Error('Failed to create threat');
      const createThreatMutation = vi.fn().mockRejectedValue(error);
      
      mockMutation.mockReturnValue([createThreatMutation, { loading: false }]);

      const { result } = renderHook(() => useThreatIntelligence());

      await act(async () => {
        try {
          await result.current.createThreat({ name: 'Test' });
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(result.current.operationError).toBe(error);
    });

    it('handles update threat errors', async () => {
      const error = new Error('Failed to update threat');
      const updateThreatMutation = vi.fn().mockRejectedValue(error);
      
      mockMutation.mockReturnValue([updateThreatMutation, { loading: false }]);

      const { result } = renderHook(() => useThreatIntelligence());

      await act(async () => {
        try {
          await result.current.updateThreat('123', { name: 'Updated' });
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(result.current.operationError).toBe(error);
    });
  });

  describe('caching and performance', () => {
    it('caches threat data', () => {
      const refetchFn = vi.fn();
      mockQuery.mockReturnValue({
        data: { threats: mockThreats },
        loading: false,
        error: null,
        refetch: refetchFn,
      });

      const { result } = renderHook(() => useThreatIntelligence());

      act(() => {
        result.current.refetchThreats();
      });

      expect(refetchFn).toHaveBeenCalled();
    });

    it('debounces search input', async () => {
      mockQuery.mockReturnValue({
        data: { threats: mockThreats },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useThreatIntelligence());

      act(() => {
        result.current.setSearchTerm('test1');
        result.current.setSearchTerm('test2');
        result.current.setSearchTerm('test3');
      });

      // Only the last search term should be applied after debounce
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(result.current.searchTerm).toBe('test3');
    });
  });
});