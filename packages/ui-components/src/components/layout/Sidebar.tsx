import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui'
import type { NavigationItem } from './Navigation'

const sidebarVariants = cva(
  'fixed left-0 top-0 z-40 h-full w-64 transform border-r bg-gray-900 border-gray-800 transition-transform duration-300 ease-out',
  {
    variants: {
      isOpen: {
        true: 'translate-x-0',
        false: '-translate-x-full',
      },
    },
    defaultVariants: {
      isOpen: false,
    },
  }
)

export interface SidebarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {
  items: NavigationItem[]
  header?: React.ReactNode
  footer?: React.ReactNode
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({
    className,
    items,
    header,
    footer,
    ...props
  }, ref) => {
    const { isSidebarOpen, setSidebarOpen } = useUIStore()

    // Close sidebar when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const sidebar = document.getElementById('sidebar')
        if (sidebar && !sidebar.contains(event.target as Node) && isSidebarOpen) {
          setSidebarOpen(false)
        }
      }

      if (isSidebarOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isSidebarOpen, setSidebarOpen])

    return (
      <>
        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          id="sidebar"
          className={cn(sidebarVariants({ isOpen: isSidebarOpen }), className)}
          ref={ref}
          {...props}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              {header}
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-white lg:hidden"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {items.map((item) => (
                  <SidebarItem key={item.href} item={item} />
                ))}
              </div>
            </nav>

            {/* Footer */}
            {footer && (
              <div className="border-t border-gray-800 p-4">
                {footer}
              </div>
            )}
          </div>
        </div>
      </>
    )
  }
)

Sidebar.displayName = 'Sidebar'

// Sidebar item component with collapsible children
const SidebarItem: React.FC<{ item: NavigationItem; level?: number }> = ({
  item,
  level = 0
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const hasChildren = item.children && item.children.length > 0
  const paddingLeft = level * 16 + 16

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault()
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div>
      <a
        href={item.href}
        onClick={handleClick}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors',
          'group focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-gray-900'
        )}
        style={{ paddingLeft }}
      >
        <div className="flex items-center gap-3">
          {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
          <span className="truncate">{item.label}</span>
        </div>

        <div className="flex items-center gap-2">
          {item.badge && (
            <span className="rounded-full bg-teal-400 px-2 py-0.5 text-xs text-black">
              {item.badge}
            </span>
          )}

          {hasChildren && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          )}
        </div>
      </a>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {item.children?.map((child) => (
            <SidebarItem
              key={child.href}
              item={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
