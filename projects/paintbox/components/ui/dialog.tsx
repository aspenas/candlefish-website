'use client'

import React, { forwardRef, createContext, useContext } from 'react'
import { cn } from '@/lib/utils/cn'

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => {},
})

interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const isOpen = open ?? internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  return (
    <DialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export const DialogTrigger = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { onOpenChange } = useContext(DialogContext)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    onOpenChange(true)
  }

  return <button ref={ref} onClick={handleClick} {...props} />
})

DialogTrigger.displayName = 'DialogTrigger'

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, ...props }, ref) => {
    const { open, onOpenChange } = useContext(DialogContext)

    if (!open) return null

    const handleClose = () => {
      onClose?.()
      onOpenChange(false)
    }

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden="true"
        />
        {/* Dialog */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={ref}
            className={cn(
              // Base styles with Tyler-Setup patterns
              "relative w-full max-w-lg rounded-[var(--radius)]",
              "border border-[hsl(var(--border))]",
              "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
              "shadow-lg",
              // Animation
              "animate-in fade-in-0 zoom-in-95",
              // Touch optimization
              "touch-manipulation",
              className
            )}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className={cn(
                "absolute right-4 top-4 rounded-sm opacity-70",
                "ring-offset-[hsl(var(--background))]",
                "transition-opacity hover:opacity-100",
                "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
                "focus:ring-offset-2",
                "disabled:pointer-events-none",
                // Touch optimization
                "min-h-[var(--touch-target)] min-w-[var(--touch-target)]",
                "flex items-center justify-center"
              )}
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
            {children}
          </div>
        </div>
      </>
    )
  }
)

DialogContent.displayName = 'DialogContent'

export const DialogHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-4",
      className
    )}
    {...props}
  />
))

DialogHeader.displayName = 'DialogHeader'

export const DialogFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4",
      className
    )}
    {...props}
  />
))

DialogFooter.displayName = 'DialogFooter'

export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))

DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-[hsl(var(--muted-foreground))]",
      className
    )}
    {...props}
  />
))

DialogDescription.displayName = 'DialogDescription'