import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-lg border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'border-[#0f172a]/20 bg-[#0b0f13] text-[#e6f9f6]',
        destructive: 'destructive group border-[#ef4444]/50 bg-[#ef4444] text-white',
        success: 'border-[#10b981]/50 bg-[#10b981] text-white',
        warning: 'border-[#f59e0b]/50 bg-[#f59e0b] text-[#0b0f13]',
        info: 'border-[#22d3ee]/50 bg-[#22d3ee] text-[#0b0f13]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = 'Toast'

const ToastAction = React.forwardRef<
  React.ElementRef<'button'>,
  React.ComponentPropsWithoutRef<'button'>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-[#0f172a]/20 focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  />
))
ToastAction.displayName = 'ToastAction'

const ToastClose = React.forwardRef<
  React.ElementRef<'button'>,
  React.ComponentPropsWithoutRef<'button'>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-current/50 opacity-0 transition-opacity hover:text-current focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100',
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
))
ToastClose.displayName = 'ToastClose'

const ToastTitle = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
))
ToastTitle.displayName = 'ToastTitle'

const ToastDescription = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
))
ToastDescription.displayName = 'ToastDescription'

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

const getToastIcon = (variant: 'default' | 'destructive' | 'success' | 'warning' | 'info' | null | undefined) => {
  switch (variant) {
    case 'success':
      return <CheckCircle className="h-5 w-5" />
    case 'destructive':
      return <AlertCircle className="h-5 w-5" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5" />
    case 'info':
      return <Info className="h-5 w-5" />
    default:
      return null
  }
}

export {
  type ToastProps,
  type ToastActionElement,
  Toast,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription,
  getToastIcon,
}
