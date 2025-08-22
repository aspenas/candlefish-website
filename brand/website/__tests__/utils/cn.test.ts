import { cn } from '../../utils/cn'

describe('cn utility function', () => {
  describe('Basic functionality', () => {
    it('combines string classes correctly', () => {
      const result = cn('class1', 'class2', 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('handles empty strings', () => {
      const result = cn('class1', '', 'class3')
      expect(result).toBe('class1 class3')
    })

    it('handles undefined and null values', () => {
      const result = cn('class1', undefined, null, 'class3')
      expect(result).toBe('class1 class3')
    })

    it('returns empty string when no arguments provided', () => {
      const result = cn()
      expect(result).toBe('')
    })
  })

  describe('Conditional classes', () => {
    it('handles boolean conditions', () => {
      const isActive = true
      const isDisabled = false

      const result = cn(
        'base-class',
        isActive && 'active',
        isDisabled && 'disabled'
      )

      expect(result).toBe('base-class active')
    })

    it('handles complex conditional logic', () => {
      const variant: 'primary' | 'secondary' = 'primary'
      const size: 'large' | 'small' = 'large'
      const disabled = false

      const result = cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        size === 'large' && 'btn-lg',
        size === 'small' && 'btn-sm',
        disabled && 'btn-disabled'
      )

      expect(result).toBe('btn btn-primary btn-lg')
    })
  })

  describe('Object-style classes', () => {
    it('handles object with boolean values', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true,
      })

      expect(result).toBe('class1 class3')
    })

    it('combines objects with strings', () => {
      const result = cn(
        'base-class',
        {
          'conditional-class': true,
          'hidden-class': false,
        },
        'final-class'
      )

      expect(result).toBe('base-class conditional-class final-class')
    })
  })

  describe('Array-style classes', () => {
    it('handles arrays of classes', () => {
      const result = cn(['class1', 'class2'], ['class3', 'class4'])
      expect(result).toBe('class1 class2 class3 class4')
    })

    it('handles nested arrays and mixed types', () => {
      const result = cn(
        'base',
        ['array1', 'array2'],
        {
          'conditional': true,
          'hidden': false,
        },
        ['final-array']
      )

      expect(result).toBe('base array1 array2 conditional final-array')
    })
  })

  describe('Real-world usage scenarios', () => {
    it('works with Tailwind CSS classes', () => {
      const isLarge = true
      const isPrimary = true
      const isDisabled = false

      const result = cn(
        'px-4 py-2 rounded-md font-medium transition-colors',
        isPrimary ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-800',
        isLarge && 'text-lg px-6 py-3',
        isDisabled && 'opacity-50 cursor-not-allowed'
      )

      expect(result).toBe('px-4 py-2 rounded-md font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600 text-lg px-6 py-3')
    })

    it('handles component variant patterns', () => {
      const variant: 'primary' | 'outline' | 'ghost' = 'outline'
      const size: 'sm' | 'md' | 'lg' = 'md'
      const className = 'custom-class'

      const result = cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        {
          'bg-primary text-white': variant === 'primary',
          'border border-primary text-primary': variant === 'outline',
          'bg-transparent text-gray-600': variant === 'ghost',
        },
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
        },
        className
      )

      expect(result).toBe('inline-flex items-center justify-center rounded-md font-medium border border-primary text-primary h-10 px-4 custom-class')
    })

    it('handles responsive classes', () => {
      const isMobile = false
      const isTablet = true

      const result = cn(
        'w-full',
        isMobile && 'text-sm',
        isTablet && 'md:w-1/2 md:text-base',
        !isMobile && !isTablet && 'lg:w-1/3 lg:text-lg'
      )

      expect(result).toBe('w-full md:w-1/2 md:text-base')
    })

    it('handles state-based classes', () => {
      const state: 'loading' | 'success' | 'error' | 'idle' = 'loading'

      const result = cn(
        'btn',
        {
          'btn-loading': state === 'loading',
          'btn-success': state === 'success',
          'btn-error': state === 'error',
          'btn-idle': state === 'idle',
        }
      )

      expect(result).toBe('btn btn-loading')
    })
  })

  describe('Edge cases', () => {
    it('handles very long class lists', () => {
      const classes = Array.from({ length: 100 }, (_, i) => `class-${i}`)
      const result = cn(...classes)

      expect(result).toBe(classes.join(' '))
      expect(result.split(' ')).toHaveLength(100)
    })

    it('handles deeply nested conditionals', () => {
      const theme = 'dark'
      const size = 'large'
      const variant = 'primary'
      const state = 'active'

      const result = cn(
        'component',
        theme === 'dark' && [
          'dark-theme',
          size === 'large' && 'dark-large',
          variant === 'primary' && [
            'dark-primary',
            state === 'active' && 'dark-primary-active'
          ]
        ]
      )

      expect(result).toBe('component dark-theme dark-large dark-primary dark-primary-active')
    })

    it('handles duplicate classes', () => {
      // Note: clsx doesn't deduplicate by default, but this tests the behavior
      const result = cn('class1', 'class2', 'class1', 'class3')
      expect(result).toBe('class1 class2 class1 class3')
    })

    it('handles whitespace in classes', () => {
      const result = cn('  class1  ', '  class2  ')
      // clsx should handle whitespace appropriately
      expect(result.trim()).toBeTruthy()
    })
  })

  describe('Performance considerations', () => {
    it('handles many false conditions efficiently', () => {
      const result = cn(
        'base',
        false && 'class1',
        false && 'class2',
        false && 'class3',
        false && 'class4',
        false && 'class5',
        true && 'final'
      )

      expect(result).toBe('base final')
    })

    it('handles empty arrays', () => {
      const result = cn('base', [], 'final')
      expect(result).toBe('base final')
    })

    it('handles empty objects', () => {
      const result = cn('base', {}, 'final')
      expect(result).toBe('base final')
    })
  })

  describe('Type safety (runtime behavior)', () => {
    it('handles numbers as classes', () => {
      // While not recommended, numbers should be converted to strings
      const result = cn('base', 123, 'final')
      expect(result).toBe('base 123 final')
    })

    it('handles mixed types', () => {
      const result = cn(
        'string',
        123,
        true && 'conditional',
        false && 'hidden',
        ['array', 'items'],
        { 'object': true, 'hidden': false }
      )

      expect(result).toBe('string 123 conditional array items object')
    })
  })
})
