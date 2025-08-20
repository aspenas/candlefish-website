import { renderHook, act, waitFor } from '@testing-library/react'
import { useApi, usePaginatedApi } from '../../hooks/useApi'
import { ApiResponse, PaginatedResponse } from '../../types/api'

// Mock API functions for testing
const createMockApiFunction = <T>(
  mockResponse: ApiResponse<T>,
  delay: number = 0
) => {
  return jest.fn().mockImplementation(
    (...args: any[]) =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (mockResponse.success) {
            resolve(mockResponse)
          } else {
            reject(new Error(mockResponse.error || 'API Error'))
          }
        }, delay)
      })
  )
}

describe('useApi Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const mockApi = createMockApiFunction({ success: true, data: 'test' })
      const { result } = renderHook(() => useApi(mockApi))

      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.execute).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })

    it('initializes with loading state when immediate is true', () => {
      const mockApi = createMockApiFunction({ success: true, data: 'test' })
      const { result } = renderHook(() => useApi(mockApi, { immediate: true }))

      expect(result.current.loading).toBe(true)
    })
  })

  describe('Successful API Calls', () => {
    it('handles successful API response', async () => {
      const mockData = { id: 1, name: 'Test' }
      const mockApi = createMockApiFunction({ success: true, data: mockData })
      const { result } = renderHook(() => useApi(mockApi))

      await act(async () => {
        await result.current.execute()
      })

      expect(result.current.data).toEqual(mockData)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(mockApi).toHaveBeenCalledTimes(1)
    })

    it('passes arguments to API function', async () => {
      const mockApi = createMockApiFunction({ success: true, data: 'test' })
      const { result } = renderHook(() => useApi(mockApi))

      await act(async () => {
        await result.current.execute('arg1', 'arg2', { param: 'value' })
      })

      expect(mockApi).toHaveBeenCalledWith('arg1', 'arg2', { param: 'value' })
    })

    it('calls onSuccess callback when provided', async () => {
      const mockData = { id: 1, name: 'Test' }
      const mockApi = createMockApiFunction({ success: true, data: mockData })
      const onSuccess = jest.fn()
      
      const { result } = renderHook(() => useApi(mockApi, { onSuccess }))

      await act(async () => {
        await result.current.execute()
      })

      expect(onSuccess).toHaveBeenCalledWith(mockData)
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    it('returns data from execute function', async () => {
      const mockData = { id: 1, name: 'Test' }
      const mockApi = createMockApiFunction({ success: true, data: mockData })
      const { result } = renderHook(() => useApi(mockApi))

      let returnedData: any
      await act(async () => {
        returnedData = await result.current.execute()
      })

      expect(returnedData).toEqual(mockData)
    })
  })

  describe('Error Handling', () => {
    it('handles API errors correctly', async () => {
      const errorMessage = 'Network error'
      const mockApi = createMockApiFunction({ success: false, error: errorMessage, data: null })
      const { result } = renderHook(() => useApi(mockApi))

      await act(async () => {
        try {
          await result.current.execute()
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe(errorMessage)
    })

    it('handles rejected promises', async () => {
      const mockApi = jest.fn().mockRejectedValue(new Error('Network failure'))
      const { result } = renderHook(() => useApi(mockApi))

      await act(async () => {
        try {
          await result.current.execute()
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.error?.message).toBe('Network failure')
      expect(result.current.loading).toBe(false)
    })

    it('calls onError callback when provided', async () => {
      const errorMessage = 'API Error'
      const mockApi = createMockApiFunction({ success: false, error: errorMessage, data: null })
      const onError = jest.fn()
      
      const { result } = renderHook(() => useApi(mockApi, { onError }))

      await act(async () => {
        try {
          await result.current.execute()
        } catch (error) {
          // Expected to throw
        }
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError).toHaveBeenCalledTimes(1)
    })

    it('handles non-Error exceptions', async () => {
      const mockApi = jest.fn().mockRejectedValue('String error')
      const { result } = renderHook(() => useApi(mockApi))

      await act(async () => {
        try {
          await result.current.execute()
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Unknown error')
    })
  })

  describe('Loading States', () => {
    it('manages loading state correctly during API call', async () => {
      const mockApi = createMockApiFunction({ success: true, data: 'test' }, 100)
      const { result } = renderHook(() => useApi(mockApi))

      expect(result.current.loading).toBe(false)

      act(() => {
        result.current.execute()
      })

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('sets loading to false even when API call fails', async () => {
      const mockApi = createMockApiFunction({ success: false, error: 'Error', data: null }, 50)
      const { result } = renderHook(() => useApi(mockApi))

      act(() => {
        result.current.execute().catch(() => {}) // Ignore error
      })

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('Immediate Execution', () => {
    it('executes immediately when immediate option is true', async () => {
      const mockApi = createMockApiFunction({ success: true, data: 'test' })
      renderHook(() => useApi(mockApi, { immediate: true }))

      await waitFor(() => {
        expect(mockApi).toHaveBeenCalledTimes(1)
      })
    })

    it('does not execute immediately by default', () => {
      const mockApi = createMockApiFunction({ success: true, data: 'test' })
      renderHook(() => useApi(mockApi))

      expect(mockApi).not.toHaveBeenCalled()
    })
  })

  describe('Reset Functionality', () => {
    it('resets state to initial values', async () => {
      const mockApi = createMockApiFunction({ success: true, data: 'test' })
      const { result } = renderHook(() => useApi(mockApi))

      // Execute and get data
      await act(async () => {
        await result.current.execute()
      })

      expect(result.current.data).toBe('test')

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.data).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.loading).toBe(false)
    })

    it('resets error state', async () => {
      const mockApi = createMockApiFunction({ success: false, error: 'Error', data: null })
      const { result } = renderHook(() => useApi(mockApi))

      // Execute and get error
      await act(async () => {
        try {
          await result.current.execute()
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.error).not.toBeNull()

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Multiple Calls', () => {
    it('handles multiple consecutive calls correctly', async () => {
      const mockApi = createMockApiFunction({ success: true, data: 'test' })
      const { result } = renderHook(() => useApi(mockApi))

      await act(async () => {
        await result.current.execute()
      })

      await act(async () => {
        await result.current.execute()
      })

      expect(mockApi).toHaveBeenCalledTimes(2)
      expect(result.current.data).toBe('test')
    })

    it('clears error on subsequent successful calls', async () => {
      let shouldFail = true
      const mockApi = jest.fn().mockImplementation(() => {
        if (shouldFail) {
          return Promise.resolve({ success: false, error: 'Failed', data: null })
        }
        return Promise.resolve({ success: true, data: 'success' })
      })

      const { result } = renderHook(() => useApi(mockApi))

      // First call fails
      await act(async () => {
        try {
          await result.current.execute()
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.error).not.toBeNull()

      // Second call succeeds
      shouldFail = false
      await act(async () => {
        await result.current.execute()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.data).toBe('success')
    })
  })
})

describe('usePaginatedApi Hook', () => {
  const createMockPaginatedResponse = (page: number, totalPages: number = 5): PaginatedResponse<any> => ({
    items: [`item${page}1`, `item${page}2`],
    total: totalPages * 2,
    page,
    limit: 2,
    totalPages
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(1)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi))

      expect(result.current.page).toBe(1)
      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.hasPrevPage).toBe(false)
      expect(result.current.hasNextPage).toBe(false)
    })

    it('initializes with custom initial page', () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(3)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 3))

      expect(result.current.page).toBe(3)
    })
  })

  describe('Pagination Controls', () => {
    it('setPage updates page number', () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(1)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi))

      act(() => {
        result.current.setPage(3)
      })

      expect(result.current.page).toBe(3)
    })

    it('nextPage increments page when possible', async () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(1, 5)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 1, { immediate: true }))

      await waitFor(() => {
        expect(result.current.data).not.toBeNull()
      })

      act(() => {
        result.current.nextPage()
      })

      expect(result.current.page).toBe(2)
    })

    it('nextPage does not increment when on last page', async () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(5, 5)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 5, { immediate: true }))

      await waitFor(() => {
        expect(result.current.data).not.toBeNull()
      })

      act(() => {
        result.current.nextPage()
      })

      expect(result.current.page).toBe(5)
    })

    it('prevPage decrements page when possible', () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(3)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 3))

      act(() => {
        result.current.prevPage()
      })

      expect(result.current.page).toBe(2)
    })

    it('prevPage does not decrement when on first page', () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(1)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 1))

      act(() => {
        result.current.prevPage()
      })

      expect(result.current.page).toBe(1)
    })
  })

  describe('Pagination State', () => {
    it('hasNextPage is true when not on last page', async () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(2, 5)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 2, { immediate: true }))

      await waitFor(() => {
        expect(result.current.hasNextPage).toBe(true)
      })
    })

    it('hasNextPage is false when on last page', async () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(5, 5)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 5, { immediate: true }))

      await waitFor(() => {
        expect(result.current.hasNextPage).toBe(false)
      })
    })

    it('hasPrevPage is true when not on first page', () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(2)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 2))

      expect(result.current.hasPrevPage).toBe(true)
    })

    it('hasPrevPage is false when on first page', () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(1)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 1))

      expect(result.current.hasPrevPage).toBe(false)
    })
  })

  describe('API Execution', () => {
    it('executes API call when page changes', async () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(1)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi))

      act(() => {
        result.current.setPage(2)
      })

      await waitFor(() => {
        expect(mockApi).toHaveBeenCalledWith(2)
      })
    })

    it('executes immediately when immediate option is true', async () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(1)
      })
      renderHook(() => usePaginatedApi(mockApi, 1, { immediate: true }))

      await waitFor(() => {
        expect(mockApi).toHaveBeenCalledWith(1)
      })
    })

    it('does not execute for initial page when immediate is false', () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(1)
      })
      renderHook(() => usePaginatedApi(mockApi, 1, { immediate: false }))

      expect(mockApi).not.toHaveBeenCalled()
    })

    it('executes for non-initial page even when immediate is false', async () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(2)
      })
      renderHook(() => usePaginatedApi(mockApi, 2, { immediate: false }))

      await waitFor(() => {
        expect(mockApi).toHaveBeenCalledWith(2)
      })
    })
  })

  describe('Integration with useApi', () => {
    it('inherits all useApi functionality', async () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(1)
      })
      const onSuccess = jest.fn()
      const { result } = renderHook(() => usePaginatedApi(mockApi, 1, { 
        immediate: true, 
        onSuccess 
      }))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
        expect(result.current.data).not.toBeNull()
      })
    })

    it('handles errors from useApi', async () => {
      const mockApi = createMockApiFunction({
        success: false,
        error: 'Pagination error',
        data: null
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 1, { immediate: true }))

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
        expect(result.current.error?.message).toBe('Pagination error')
      })
    })

    it('reset function works correctly', async () => {
      const mockApi = createMockApiFunction({
        success: true,
        data: createMockPaginatedResponse(2)
      })
      const { result } = renderHook(() => usePaginatedApi(mockApi, 2, { immediate: true }))

      await waitFor(() => {
        expect(result.current.data).not.toBeNull()
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.data).toBeNull()
      expect(result.current.page).toBe(2) // Page should not reset
    })
  })
})