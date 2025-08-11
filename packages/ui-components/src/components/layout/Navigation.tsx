import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Menu, X, ChevronDown, Search, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/Logo'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

const navigationVariants = cva(
  'sticky top-0 z-50 w-full border-b backdrop-blur-sm transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-black/80 border-gray-800',
        transparent: 'bg-transparent border-transparent',
        solid: 'bg-black border-gray-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface NavigationItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string | number
  children?: NavigationItem[]
}

export interface NavigationProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof navigationVariants> {
  items?: NavigationItem[]
  logo?: React.ReactNode
  showSearch?: boolean
  showNotifications?: boolean
  showProfile?: boolean
}

export const Navigation = React.forwardRef<HTMLElement, NavigationProps>(
  ({
    className,
    variant,
    items = [],
    logo,
    showSearch = true,
    showNotifications = true,
    showProfile = true,
    ...props
  }, ref) => {
    const { isSidebarOpen, toggleSidebar } = useUIStore()
    const { user, isAuthenticated } = useAuthStore()
    const [isScrolled, setIsScrolled] = React.useState(false)

    React.useEffect(() => {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 10)
      }

      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const finalVariant = variant || (isScrolled ? 'default' : 'transparent')

    return (
      <nav
        className={cn(navigationVariants({ variant: finalVariant }), className)}
        ref={ref}
        {...props}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Logo and Mobile menu button */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="p-2 text-gray-400 hover:text-white lg:hidden"
                aria-label="Toggle menu"
              >
                {isSidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              {logo || (
                <Logo
                  variant="horizontal"
                  size="md"
                  href="/"
                  className="flex-shrink-0"
                />
              )}
            </div>

            {/* Center - Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:gap-8">
              {items.map((item) => (
                <NavigationItem key={item.href} item={item} />
              ))}
            </div>

            {/* Right side - Search, Notifications, Profile */}
            <div className="flex items-center gap-4">
              {showSearch && (
                <button
                  className="p-2 text-gray-400 hover:text-white"
                  aria-label="Search"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}

              {showNotifications && isAuthenticated && (
                <button
                  className="relative p-2 text-gray-400 hover:text-white"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-teal-400" />
                </button>
              )}

              {showProfile && isAuthenticated && user && (
                <div className="relative">
                  <button
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white"
                    aria-label="User menu"
                  >
                    <div className="h-6 w-6 rounded-full bg-teal-400 flex items-center justify-center text-black text-xs font-medium">
                      {user.name?.charAt(0) || user.email.charAt(0)}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}

              {!isAuthenticated && (
                <div className="flex items-center gap-2">
                  <a
                    href="/login"
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Sign In
                  </a>
                  <a
                    href="/signup"
                    className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-medium text-black hover:bg-teal-300"
                  >
                    Get Started
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    )
  }
)

Navigation.displayName = 'Navigation'

// Navigation item component
const NavigationItem: React.FC<{ item: NavigationItem }> = ({ item }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          {item.icon && <item.icon className="h-4 w-4" />}
          {item.label}
          <ChevronDown className="h-4 w-4" />
          {item.badge && (
            <span className="ml-2 rounded-full bg-teal-400 px-2 py-0.5 text-xs text-black">
              {item.badge}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 rounded-lg bg-gray-900 border border-gray-800 shadow-lg">
            {item.children?.map((child) => (
              <a
                key={child.href}
                href={child.href}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg"
              >
                {child.icon && <child.icon className="h-4 w-4" />}
                {child.label}
                {child.badge && (
                  <span className="ml-auto rounded-full bg-teal-400 px-2 py-0.5 text-xs text-black">
                    {child.badge}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <a
      href={item.href}
      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
    >
      {item.icon && <item.icon className="h-4 w-4" />}
      {item.label}
      {item.badge && (
        <span className="ml-2 rounded-full bg-teal-400 px-2 py-0.5 text-xs text-black">
          {item.badge}
        </span>
      )}
    </a>
  )
}
