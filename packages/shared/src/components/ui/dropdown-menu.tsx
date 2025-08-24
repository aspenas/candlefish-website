import * as React from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const dropdownTriggerVariants = cva(
  'inline-flex items-center justify-between gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-[#0f172a]/20 bg-[#0b0f13] text-[#e6f9f6] hover:bg-[#0f172a]/50',
        outline: 'border-[#14b8a6]/20 bg-transparent text-[#14b8a6] hover:bg-[#14b8a6]/10',
      },
      size: {
        default: 'h-10',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const dropdownContentVariants = cva(
  'z-50 min-w-[8rem] overflow-hidden rounded-lg border bg-[#0b0f13] p-1 text-[#e6f9f6] shadow-lg',
  {
    variants: {
      size: {
        default: 'w-56',
        sm: 'w-48',
        lg: 'w-64',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

const dropdownItemVariants = cva(
  'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus:bg-[#0f172a]/50 focus:text-[#14b8a6] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      variant: {
        default: 'hover:bg-[#0f172a]/50 hover:text-[#14b8a6]',
        destructive: 'text-[#ef4444] hover:bg-[#ef4444]/10 focus:bg-[#ef4444]/10 focus:text-[#ef4444]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface DropdownMenuProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface DropdownTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dropdownTriggerVariants> {
  placeholder?: string
}

export interface DropdownContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dropdownContentVariants> {
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export interface DropdownItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dropdownItemVariants> {
  disabled?: boolean
  selected?: boolean
}

const DropdownMenuContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  selectedValue?: string
  onSelect?: (value: string) => void
}>({
  open: false,
  setOpen: () => {},
})

const DropdownMenu = React.forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ children, open: controlledOpen, onOpenChange, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen

    const setOpen = React.useCallback((newOpen: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    }, [controlledOpen, onOpenChange])

    return (
      <DropdownMenuContext.Provider value={{ open, setOpen }}>
        <div ref={ref} className="relative inline-block text-left" {...props}>
          {children}
        </div>
      </DropdownMenuContext.Provider>
    )
  }
)
DropdownMenu.displayName = 'DropdownMenu'

const DropdownTrigger = React.forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ className, variant, size, placeholder, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DropdownMenuContext)

    return (
      <button
        ref={ref}
        type="button"
        className={cn(dropdownTriggerVariants({ variant, size }), className)}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        {...props}
      >
        <span className="truncate">
          {children || placeholder || 'Select option'}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
    )
  }
)
DropdownTrigger.displayName = 'DropdownTrigger'

const DropdownContent = React.forwardRef<HTMLDivElement, DropdownContentProps>(
  ({ className, size, align = 'center', side = 'bottom', children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DropdownMenuContext)
    const contentRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          setOpen(false)
        }
      }

      if (open) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [open, setOpen])

    if (!open) return null

    const alignmentClasses = {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0',
    }

    const sideClasses = {
      top: 'bottom-full mb-1',
      bottom: 'top-full mt-1',
      left: 'right-full mr-1 top-0',
      right: 'left-full ml-1 top-0',
    }

    return (
      <div
        ref={contentRef}
        className={cn(
          'absolute z-50',
          alignmentClasses[align],
          sideClasses[side],
          dropdownContentVariants({ size }),
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DropdownContent.displayName = 'DropdownContent'

const DropdownItem = React.forwardRef<HTMLDivElement, DropdownItemProps>(
  ({ className, variant, disabled, selected, children, onClick, ...props }, ref) => {
    const { setOpen } = React.useContext(DropdownMenuContext)

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (!disabled) {
        onClick?.(event)
        setOpen(false)
      }
    }

    return (
      <div
        ref={ref}
        className={cn(dropdownItemVariants({ variant }), className)}
        onClick={handleClick}
        data-disabled={disabled}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        {...props}
      >
        {children}
        {selected && (
          <Check className="ml-auto h-4 w-4 text-[#14b8a6]" />
        )}
      </div>
    )
  }
)
DropdownItem.displayName = 'DropdownItem'

const DropdownSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('my-1 h-px bg-[#0f172a]/20', className)}
    {...props}
  />
))
DropdownSeparator.displayName = 'DropdownSeparator'

const DropdownLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-2 py-1.5 text-xs font-semibold text-[#a3b3bf]', className)}
    {...props}
  />
))
DropdownLabel.displayName = 'DropdownLabel'

export {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
}
