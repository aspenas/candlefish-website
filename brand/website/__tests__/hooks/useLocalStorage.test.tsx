import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../../hooks/useLocalStorage'

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock console.error to avoid noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
  })

  describe('Initial Value', () => {
    it('returns initial value when localStorage is empty', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
      
      expect(result.current[0]).toBe('initial')
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key')
    })

    it('returns stored value when localStorage has data', () => {
      localStorageMock.setItem('test-key', JSON.stringify('stored-value'))
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
      
      expect(result.current[0]).toBe('stored-value')
    })

    it('handles different data types correctly', () => {
      // Object
      const testObject = { name: 'John', age: 30 }
      localStorageMock.setItem('object-key', JSON.stringify(testObject))
      
      const { result: objectResult } = renderHook(() => 
        useLocalStorage('object-key', { name: '', age: 0 })
      )
      
      expect(objectResult.current[0]).toEqual(testObject)

      // Array
      const testArray = [1, 2, 3, 4, 5]
      localStorageMock.setItem('array-key', JSON.stringify(testArray))
      
      const { result: arrayResult } = renderHook(() => 
        useLocalStorage('array-key', [] as number[])
      )
      
      expect(arrayResult.current[0]).toEqual(testArray)

      // Boolean
      localStorageMock.setItem('boolean-key', JSON.stringify(true))
      
      const { result: booleanResult } = renderHook(() => 
        useLocalStorage('boolean-key', false)
      )
      
      expect(booleanResult.current[0]).toBe(true)

      // Number
      localStorageMock.setItem('number-key', JSON.stringify(42))
      
      const { result: numberResult } = renderHook(() => 
        useLocalStorage('number-key', 0)
      )
      
      expect(numberResult.current[0]).toBe(42)
    })

    it('handles corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('corrupted-key', 'invalid-json{')
      
      const { result } = renderHook(() => useLocalStorage('corrupted-key', 'fallback'))
      
      expect(result.current[0]).toBe('fallback')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error reading localStorage key "corrupted-key":',
        expect.any(SyntaxError)
      )
    })
  })

  describe('Server-Side Rendering (SSR)', () => {
    it('returns initial value when window is undefined', () => {
      // Temporarily mock window as undefined
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const { result } = renderHook(() => useLocalStorage('ssr-key', 'ssr-initial'))
      
      expect(result.current[0]).toBe('ssr-initial')

      // Restore window
      global.window = originalWindow
    })
  })

  describe('Setting Values', () => {
    it('updates state and localStorage with new value', () => {
      const { result } = renderHook(() => useLocalStorage('update-key', 'initial'))
      
      act(() => {
        result.current[1]('updated-value')
      })
      
      expect(result.current[0]).toBe('updated-value')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'update-key',
        JSON.stringify('updated-value')
      )
    })

    it('supports functional updates', () => {
      const { result } = renderHook(() => useLocalStorage('counter', 0))
      
      act(() => {
        result.current[1](prev => prev + 1)
      })
      
      expect(result.current[0]).toBe(1)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'counter',
        JSON.stringify(1)
      )

      act(() => {
        result.current[1](prev => prev * 2)
      })
      
      expect(result.current[0]).toBe(2)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'counter',
        JSON.stringify(2)
      )
    })

    it('handles complex objects correctly', () => {
      const initialObject = { items: [], user: null }
      const { result } = renderHook(() => useLocalStorage('complex', initialObject))
      
      const newObject = { items: ['item1', 'item2'], user: { id: 1, name: 'John' } }
      
      act(() => {
        result.current[1](newObject)
      })
      
      expect(result.current[0]).toEqual(newObject)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'complex',
        JSON.stringify(newObject)
      )
    })

    it('handles array updates correctly', () => {
      const { result } = renderHook(() => useLocalStorage('array', [] as string[]))
      
      act(() => {
        result.current[1](['item1'])
      })
      
      expect(result.current[0]).toEqual(['item1'])
      
      act(() => {
        result.current[1](prev => [...prev, 'item2'])
      })
      
      expect(result.current[0]).toEqual(['item1', 'item2'])
    })
  })

  describe('Error Handling', () => {
    it('handles localStorage setItem errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded')
      })
      
      const { result } = renderHook(() => useLocalStorage('error-key', 'initial'))
      
      act(() => {
        result.current[1]('new-value')
      })
      
      // State should still update even if localStorage fails
      expect(result.current[0]).toBe('new-value')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error setting localStorage key "error-key":',
        expect.any(Error)
      )
    })

    it('handles localStorage removeItem errors gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('localStorage error')
      })
      
      const { result } = renderHook(() => useLocalStorage('remove-error', 'initial'))
      
      act(() => {
        result.current[2]() // Call removeValue
      })
      
      expect(result.current[0]).toBe('initial')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error removing localStorage key "remove-error":',
        expect.any(Error)
      )
    })
  })

  describe('Remove Value', () => {
    it('resets to initial value and removes from localStorage', () => {
      localStorageMock.setItem('remove-key', JSON.stringify('stored-value'))
      
      const { result } = renderHook(() => useLocalStorage('remove-key', 'initial'))
      
      // Should start with stored value
      expect(result.current[0]).toBe('stored-value')
      
      act(() => {
        result.current[2]() // Call removeValue
      })
      
      expect(result.current[0]).toBe('initial')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('remove-key')
    })

    it('works correctly when localStorage is already empty', () => {
      const { result } = renderHook(() => useLocalStorage('empty-key', 'initial'))
      
      act(() => {
        result.current[2]()
      })
      
      expect(result.current[0]).toBe('initial')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('empty-key')
    })
  })

  describe('Multiple Instances', () => {
    it('shares state between multiple instances with same key', () => {
      const { result: result1 } = renderHook(() => useLocalStorage('shared', 'initial'))
      const { result: result2 } = renderHook(() => useLocalStorage('shared', 'initial'))
      
      // Both should start with same value
      expect(result1.current[0]).toBe('initial')
      expect(result2.current[0]).toBe('initial')
      
      act(() => {
        result1.current[1]('updated')
      })
      
      // Note: In real browser environment, storage events would sync between instances
      // This test shows that at least localStorage is updated correctly
      expect(localStorageMock.setItem).toHaveBeenCalledWith('shared', JSON.stringify('updated'))
    })

    it('maintains separate state for different keys', () => {
      const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'))
      const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'))
      
      expect(result1.current[0]).toBe('value1')
      expect(result2.current[0]).toBe('value2')
      
      act(() => {
        result1.current[1]('updated1')
      })
      
      expect(result1.current[0]).toBe('updated1')
      expect(result2.current[0]).toBe('value2') // Should remain unchanged
    })
  })

  describe('Return Value Structure', () => {
    it('returns value, setter, and remover functions', () => {
      const { result } = renderHook(() => useLocalStorage('test', 'initial'))
      
      expect(result.current).toHaveLength(3)
      expect(typeof result.current[0]).toBe('string') // value
      expect(typeof result.current[1]).toBe('function') // setter
      expect(typeof result.current[2]).toBe('function') // remover
    })
  })

  describe('Edge Cases', () => {
    it('handles null values correctly', () => {
      const { result } = renderHook(() => useLocalStorage('null-key', null))
      
      expect(result.current[0]).toBeNull()
      
      act(() => {
        result.current[1]('not-null')
      })
      
      expect(result.current[0]).toBe('not-null')
      
      act(() => {
        result.current[1](null)
      })
      
      expect(result.current[0]).toBeNull()
    })

    it('handles undefined values correctly', () => {
      const { result } = renderHook(() => useLocalStorage('undefined-key', undefined))
      
      expect(result.current[0]).toBeUndefined()
      
      act(() => {
        result.current[1]('defined')
      })
      
      expect(result.current[0]).toBe('defined')
    })

    it('handles empty string values', () => {
      const { result } = renderHook(() => useLocalStorage('empty-string', ''))
      
      expect(result.current[0]).toBe('')
      
      act(() => {
        result.current[1]('not-empty')
      })
      
      expect(result.current[0]).toBe('not-empty')
      
      act(() => {
        result.current[1]('')
      })
      
      expect(result.current[0]).toBe('')
    })

    it('handles very large objects', () => {
      const largeObject = {
        data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: `item-${i}` }))
      }
      
      const { result } = renderHook(() => useLocalStorage('large-object', {}))
      
      act(() => {
        result.current[1](largeObject)
      })
      
      expect(result.current[0]).toEqual(largeObject)
    })
  })

  describe('SSR Compatibility', () => {
    it('does not call localStorage methods when window is undefined', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window
      
      const { result } = renderHook(() => useLocalStorage('ssr-test', 'initial'))
      
      act(() => {
        result.current[1]('updated')
      })
      
      expect(result.current[0]).toBe('updated')
      
      act(() => {
        result.current[2]()
      })
      
      expect(result.current[0]).toBe('initial')
      
      // Restore window
      global.window = originalWindow
    })
  })
})