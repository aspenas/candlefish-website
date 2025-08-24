import * as React from 'react'
import { X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const dialogOverlayVariants = cva(
  'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
)

const dialogContentVariants = cva(
  'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-[#0b0f13] p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
  {
    variants: {
      size: {
        default: 'max-w-lg rounded-lg',
        sm: 'max-w-md rounded-lg',
        lg: 'max-w-2xl rounded-lg',
        xl: 'max-w-4xl rounded-lg',
        full: 'max-w-screen max-h-screen rounded-none',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

export interface DialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface DialogContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dialogContentVariants> {}

const DialogContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ children, open: controlledOpen, onOpenChange, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen

    const setOpen = React.useCallback((newOpen: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    }, [controlledOpen, onOpenChange])

    React.useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && open) {
          setOpen(false)
        }
      }

      if (open) {
        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'
        return () => {
          document.removeEventListener('keydown', handleEscape)
          document.body.style.overflow = 'unset'
        }
      }
    }, [open, setOpen])

    return (
      <DialogContext.Provider value={{ open, setOpen }}>
        <div ref={ref} {...props}>
          {children}
          {open && <DialogPortal />}
        </div>
      </DialogContext.Provider>
    )
  }
)
Dialog.displayName = 'Dialog'

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const { setOpen } = React.useContext(DialogContext)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(true)
    onClick?.(event)
  }

  return (
    <button ref={ref} onClick={handleClick} {...props}>
      {children}
    </button>
  )
})
DialogTrigger.displayName = 'DialogTrigger'

const DialogPortal = () => {
  const { open, setOpen } = React.useContext(DialogContext)

  if (!open) return null

  return (
    <>
      <div
        className={cn(dialogOverlayVariants())}
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div onClick={(e) => e.stopPropagation()}>
          {/* Content will be rendered by DialogContent */}
        </div>
      </div>
    </>
  )
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, size, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DialogContext)

    if (!open) return null

    return (
      <>
        <div
          className={cn(dialogOverlayVariants())}
          onClick={() => setOpen(false)}
        />
        <div
          ref={ref}
          className={cn(dialogContentVariants({ size }), className)}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
          <DialogClose />
        </div>
      </>
    )
  }
)
DialogContent.displayName = 'DialogContent'

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 text-left', className)}
    {...props}
  />
))
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
))
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-[#e6f9f6]', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-[#a3b3bf]', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = React.useContext(DialogContext)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(false)
    onClick?.(event)
  }

  return (
    <button
      ref={ref}
      className={cn(
        'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-[#0b0f13] transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:ring-offset-2',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <X className="h-4 w-4 text-[#a3b3bf] hover:text-[#e6f9f6]" />
      <span className="sr-only">Close</span>
    </button>
  )
})
DialogClose.displayName = 'DialogClose'

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
