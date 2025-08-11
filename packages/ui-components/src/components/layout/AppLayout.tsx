import React from 'react'
import { cn } from '@/lib/utils'
import { Navigation, type NavigationProps } from './Navigation'
import { Sidebar, type SidebarProps } from './Sidebar'
import { useUIStore } from '@/stores/ui'

export interface AppLayoutProps {
  children: React.ReactNode
  className?: string
  navigation?: NavigationProps
  sidebar?: SidebarProps
  showNavigation?: boolean
  showSidebar?: boolean
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  className,
  navigation,
  sidebar,
  showNavigation = true,
  showSidebar = false,
}) => {
  const { isSidebarOpen } = useUIStore()

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      {showNavigation && <Navigation {...navigation} />}

      {/* Sidebar */}
      {showSidebar && sidebar && <Sidebar {...sidebar} />}

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 ease-out',
          showNavigation && 'pt-16',
          showSidebar && isSidebarOpen && 'lg:ml-64',
          className
        )}
      >
        {children}
      </main>
    </div>
  )
}

// Specialized layout variants
export const DashboardLayout: React.FC<{
  children: React.ReactNode
  sidebarItems: SidebarProps['items']
  navigationItems?: NavigationProps['items']
  sidebarHeader?: React.ReactNode
  sidebarFooter?: React.ReactNode
}> = ({
  children,
  sidebarItems,
  navigationItems = [],
  sidebarHeader,
  sidebarFooter,
}) => {
  return (
    <AppLayout
      showNavigation={true}
      showSidebar={true}
      navigation={{ items: navigationItems }}
      sidebar={{
        items: sidebarItems,
        header: sidebarHeader,
        footer: sidebarFooter,
      }}
      className="px-6 py-8"
    >
      {children}
    </AppLayout>
  )
}

export const PublicLayout: React.FC<{
  children: React.ReactNode
  navigationItems?: NavigationProps['items']
  showSearch?: boolean
}> = ({
  children,
  navigationItems = [],
  showSearch = false,
}) => {
  return (
    <AppLayout
      showNavigation={true}
      showSidebar={false}
      navigation={{
        items: navigationItems,
        showSearch,
        showNotifications: false,
        showProfile: true,
      }}
    >
      {children}
    </AppLayout>
  )
}
