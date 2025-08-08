import * as React from "react"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"
import { Button } from "./button"
import { Menu, X } from "lucide-react"

export interface NavigationProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode
  items?: Array<{
    label: string
    href: string
    active?: boolean
  }>
  actions?: React.ReactNode
  transparent?: boolean
  sticky?: boolean
}

const Navigation = React.forwardRef<HTMLElement, NavigationProps>(
  ({
    className,
    logo,
    items = [],
    actions,
    transparent = false,
    sticky = true,
    ...props
  }, ref) => {
    const [isScrolled, setIsScrolled] = React.useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

    React.useEffect(() => {
      if (!sticky) return

      const handleScroll = () => {
        setIsScrolled(window.scrollY > 10)
      }

      window.addEventListener("scroll", handleScroll)
      return () => window.removeEventListener("scroll", handleScroll)
    }, [sticky])

    return (
      <nav
        ref={ref}
        className={cn(
          "w-full z-50 transition-all duration-300",
          sticky && "fixed top-0 left-0 right-0",
          transparent && !isScrolled
            ? "bg-transparent"
            : "bg-background/80 backdrop-blur-md border-b border-border",
          isScrolled && "shadow-lg",
          className
        )}
        {...props}
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              {logo || <Logo href="/" size="default" animated />}
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {/* Nav Items */}
              <div className="flex items-center gap-6">
                {items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      item.active
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              {/* Actions */}
              {actions && <div className="flex items-center gap-4">{actions}</div>}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="container mx-auto px-6 py-4">
              <div className="flex flex-col gap-4">
                {items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium py-2 transition-colors hover:text-primary",
                      item.active
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
                {actions && (
                  <div className="pt-4 border-t border-border">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    )
  }
)
Navigation.displayName = "Navigation"

/**
 * Navigation Item Component
 */
export interface NavItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean
}

const NavItem = React.forwardRef<HTMLAnchorElement, NavItemProps>(
  ({ className, active, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          active ? "text-primary" : "text-muted-foreground",
          className
        )}
        {...props}
      />
    )
  }
)
NavItem.displayName = "NavItem"

/**
 * Breadcrumb Navigation
 */
export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: Array<{
    label: string
    href?: string
  }>
  separator?: React.ReactNode
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, items, separator = "/", ...props }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn("flex items-center gap-2 text-sm", className)}
        {...props}
      >
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="text-muted-foreground/50">{separator}</span>
            )}
            {item.href && index < items.length - 1 ? (
              <a
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <span className={index === items.length - 1 ? "text-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>
    )
  }
)
Breadcrumb.displayName = "Breadcrumb"

export { Navigation, NavItem, Breadcrumb }
