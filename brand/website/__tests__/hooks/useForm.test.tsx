import { renderHook, act } from '@testing-library/react'
import { useForm, FormConfig, ValidationRule } from '../../hooks/useForm'

interface TestFormData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  phone: string
  age: number
  terms: boolean
}

const createTestConfig = (overrides: Partial<FormConfig> = {}): FormConfig => ({
  email: {
    initialValue: '',
    validation: {
      required: true,
      email: true,
    },
  },
  password: {
    initialValue: '',
    validation: {
      required: true,
      minLength: 8,
    },
  },
  confirmPassword: {
    initialValue: '',
    validation: {
      required: true,
      custom: (value: string) => {
        // Note: In real implementation, this would compare with password
        // For testing, we'll simulate the comparison
        return value !== 'password123' ? 'Passwords must match' : undefined
      },
    },
  },
  firstName: {
    initialValue: '',
    validation: {
      required: true,
      minLength: 2,
      maxLength: 50,
    },
  },
  lastName: {
    initialValue: 'Doe', // Test with initial value
    validation: {
      required: true,
    },
  },
  phone: {
    initialValue: '',
    validation: {
      phone: true,
    },
  },
  age: {
    initialValue: 0,
    validation: {
      required: true,
      custom: (value: number) => {
        return value < 18 ? 'Must be 18 or older' : undefined
      },
    },
  },
  terms: {
    initialValue: false,
    validation: {
      required: true,
      custom: (value: boolean) => {
        return !value ? 'You must accept the terms' : undefined
      },
    },
  },
  ...overrides,
})

describe('useForm Hook', () => {
  describe('Initial State', () => {
    it('initializes with correct default values', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      expect(result.current.values).toEqual({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: 'Doe',
        phone: '',
        age: 0,
        terms: false,
      })

      expect(result.current.errors).toEqual({})
      expect(result.current.touched).toEqual({})
      expect(result.current.isValid).toBe(true) // No errors initially
      expect(result.current.isDirty).toBe(false)
    })

    it('initializes with custom initial values', () => {
      const config = createTestConfig({
        email: { initialValue: 'test@example.com' },
        firstName: { initialValue: 'John' },
      })

      const { result } = renderHook(() => useForm<TestFormData>(config))

      expect(result.current.values.email).toBe('test@example.com')
      expect(result.current.values.firstName).toBe('John')
    })
  })

  describe('setValue and setValues', () => {
    it('updates single field value', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      act(() => {
        result.current.setValue('email', 'test@example.com')
      })

      expect(result.current.values.email).toBe('test@example.com')
      expect(result.current.isDirty).toBe(true)
    })

    it('updates multiple field values', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      act(() => {
        result.current.setValues({
          email: 'test@example.com',
          firstName: 'John',
          age: 25,
        })
      })

      expect(result.current.values.email).toBe('test@example.com')
      expect(result.current.values.firstName).toBe('John')
      expect(result.current.values.age).toBe(25)
      expect(result.current.isDirty).toBe(true)
    })

    it('clears error when setting value', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      // First set an error
      act(() => {
        result.current.setError('email', 'Invalid email')
      })

      expect(result.current.errors.email).toBe('Invalid email')

      // Then set a value, which should clear the error
      act(() => {
        result.current.setValue('email', 'test@example.com')
      })

      expect(result.current.errors.email).toBeUndefined()
    })
  })

  describe('Error Management', () => {
    it('sets and clears errors manually', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      act(() => {
        result.current.setError('email', 'Custom error message')
      })

      expect(result.current.errors.email).toBe('Custom error message')
      expect(result.current.isValid).toBe(false)

      act(() => {
        result.current.clearError('email')
      })

      expect(result.current.errors.email).toBeUndefined()
      expect(result.current.isValid).toBe(true)
    })
  })

  describe('Touched State', () => {
    it('manages touched state for fields', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      expect(result.current.touched.email).toBeUndefined()

      act(() => {
        result.current.setTouched('email', true)
      })

      expect(result.current.touched.email).toBe(true)

      act(() => {
        result.current.setTouched('email', false)
      })

      expect(result.current.touched.email).toBe(false)
    })

    it('defaults to true when no value provided', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      act(() => {
        result.current.setTouched('email')
      })

      expect(result.current.touched.email).toBe(true)
    })
  })

  describe('Field Validation', () => {
    it('validates required fields', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      let error: string | undefined

      act(() => {
        error = result.current.validateField('email')
      })

      expect(error).toBe('This field is required')
      expect(result.current.errors.email).toBe('This field is required')
    })

    it('validates email format', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      act(() => {
        result.current.setValue('email', 'invalid-email')
      })

      let error: string | undefined

      act(() => {
        error = result.current.validateField('email')
      })

      expect(error).toBe('Please enter a valid email address')
    })

    it('validates minimum length', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      act(() => {
        result.current.setValue('password', '123')
      })

      let error: string | undefined

      act(() => {
        error = result.current.validateField('password')
      })

      expect(error).toBe('Must be at least 8 characters')
    })

    it('validates maximum length', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      act(() => {
        result.current.setValue('firstName', 'A'.repeat(51))
      })

      let error: string | undefined

      act(() => {
        error = result.current.validateField('firstName')
      })

      expect(error).toBe('Must be no more than 50 characters')
    })

    it('validates phone numbers', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      // Test invalid phone
      act(() => {
        result.current.setValue('phone', 'invalid-phone')
      })

      let error: string | undefined

      act(() => {
        error = result.current.validateField('phone')
      })

      expect(error).toBe('Please enter a valid phone number')

      // Test valid phone
      act(() => {
        result.current.setValue('phone', '+1234567890')
      })

      act(() => {
        error = result.current.validateField('phone')
      })

      expect(error).toBeUndefined()
    })

    it('validates custom rules', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      act(() => {
        result.current.setValue('age', 16)
      })

      let error: string | undefined

      act(() => {
        error = result.current.validateField('age')
      })

      expect(error).toBe('Must be 18 or older')

      // Test valid age
      act(() => {
        result.current.setValue('age', 25)
      })

      act(() => {
        error = result.current.validateField('age')
      })

      expect(error).toBeUndefined()
    })

    it('validates pattern matching', () => {
      const config: FormConfig = {
        code: {
          initialValue: '',
          validation: {
            pattern: /^[A-Z]{3}-\d{3}$/,
          },
        },
      }

      const { result } = renderHook(() => useForm(config))

      act(() => {
        result.current.setValue('code', 'invalid')
      })

      let error: string | undefined

      act(() => {
        error = result.current.validateField('code')
      })

      expect(error).toBe('Please enter a valid value')

      // Test valid pattern
      act(() => {
        result.current.setValue('code', 'ABC-123')
      })

      act(() => {
        error = result.current.validateField('code')
      })

      expect(error).toBeUndefined()
    })

    it('skips validation for optional empty fields', () => {
      const config: FormConfig = {
        optionalField: {
          initialValue: '',
          validation: {
            minLength: 5, // Should not apply if field is empty and not required
          },
        },
      }

      const { result } = renderHook(() => useForm(config))

      let error: string | undefined

      act(() => {
        error = result.current.validateField('optionalField')
      })

      expect(error).toBeUndefined()
    })
  })

  describe('Form Validation', () => {
    it('validates entire form and returns validity', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      let isValid: boolean = false

      act(() => {
        isValid = result.current.validateForm()
      })

      expect(isValid).toBe(false)
      expect(result.current.errors.email).toBe('This field is required')
      expect(result.current.errors.password).toBe('This field is required')
      expect(result.current.errors.firstName).toBe('This field is required')

      // Fill in required fields
      act(() => {
        result.current.setValues({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          firstName: 'John',
          age: 25,
          terms: true,
        })
      })

      act(() => {
        isValid = result.current.validateForm()
      })

      expect(isValid).toBe(true)
      expect(Object.keys(result.current.errors)).toHaveLength(0)
    })

    it('marks all fields as touched during form validation', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      act(() => {
        result.current.validateForm()
      })

      Object.keys(config).forEach((field) => {
        expect(result.current.touched[field as keyof TestFormData]).toBe(true)
      })
    })
  })

  describe('Form Submission', () => {
    it('submits valid form and calls onSubmit', () => {
      const onSubmit = jest.fn()
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config, onSubmit))

      // Fill valid data
      act(() => {
        result.current.setValues({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          age: 25,
          terms: true,
        })
      })

      let submitResult: TestFormData | null = null

      act(() => {
        submitResult = result.current.submit()
      })

      expect(submitResult).toEqual(result.current.values)
      expect(onSubmit).toHaveBeenCalledWith(result.current.values)
    })

    it('does not submit invalid form', () => {
      const onSubmit = jest.fn()
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config, onSubmit))

      let submitResult: TestFormData | null = null

      act(() => {
        submitResult = result.current.submit()
      })

      expect(submitResult).toBeNull()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('handles async onSubmit', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined)
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config, onSubmit))

      // Fill valid data
      act(() => {
        result.current.setValues({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          age: 25,
          terms: true,
        })
      })

      act(() => {
        result.current.submit()
      })

      expect(onSubmit).toHaveBeenCalled()
    })
  })

  describe('Reset Functionality', () => {
    it('resets form to initial state', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      // Modify form state
      act(() => {
        result.current.setValues({
          email: 'test@example.com',
          firstName: 'John',
        })
        result.current.setError('password', 'Some error')
        result.current.setTouched('email', true)
      })

      expect(result.current.isDirty).toBe(true)
      expect(result.current.errors.password).toBe('Some error')
      expect(result.current.touched.email).toBe(true)

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.values).toEqual({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: 'Doe',
        phone: '',
        age: 0,
        terms: false,
      })
      expect(result.current.errors).toEqual({})
      expect(result.current.touched).toEqual({})
      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('calculates isValid correctly', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      expect(result.current.isValid).toBe(true) // No errors initially

      act(() => {
        result.current.setError('email', 'Invalid email')
      })

      expect(result.current.isValid).toBe(false)

      act(() => {
        result.current.clearError('email')
      })

      expect(result.current.isValid).toBe(true)
    })

    it('calculates isDirty correctly', () => {
      const config = createTestConfig()
      const { result } = renderHook(() => useForm<TestFormData>(config))

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.setValue('email', 'test@example.com')
      })

      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.setValue('email', '') // Back to initial value
      })

      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('handles fields without validation config', () => {
      const config: FormConfig = {
        noValidation: {
          initialValue: 'test',
        },
      }

      const { result } = renderHook(() => useForm(config))

      let error: string | undefined

      act(() => {
        error = result.current.validateField('noValidation')
      })

      expect(error).toBeUndefined()
    })

    it('handles empty config', () => {
      const config: FormConfig = {}
      const { result } = renderHook(() => useForm(config))

      expect(result.current.values).toEqual({})
      expect(result.current.isValid).toBe(true)
      expect(result.current.isDirty).toBe(false)

      let isValid: boolean = false

      act(() => {
        isValid = result.current.validateForm()
      })

      expect(isValid).toBe(true)
    })

    it('handles null/undefined values in validation', () => {
      const config: FormConfig = {
        nullField: {
          initialValue: null,
          validation: {
            required: true,
          },
        },
      }

      const { result } = renderHook(() => useForm(config))

      let error: string | undefined

      act(() => {
        error = result.current.validateField('nullField')
      })

      expect(error).toBe('This field is required')
    })
  })
})
