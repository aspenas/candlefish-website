import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  CameraIcon,
  QrCodeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ViewColumnsIcon,
  DocumentTextIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon,
  CameraIcon as CameraSolidIcon,
  QrCodeIcon as QrCodeSolidIcon,
  ChartBarIcon as ChartBarSolidIcon,
  Cog6ToothIcon as CogSolidIcon,
  ViewColumnsIcon as ViewColumnsSolidIcon,
  DocumentTextIcon as DocumentSolidIcon,
  UserGroupIcon as UserGroupSolidIcon
} from '@heroicons/react/24/solid';
import { useSwipeNavigation, useHapticFeedback } from '../../hooks/useMobileGestures';
import clsx from 'clsx';

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  solidIcon: React.ComponentType<{ className?: string }>;
  badge?: number;
  color?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: HomeIcon,
    solidIcon: HomeSolidIcon,
    color: 'text-blue-600'
  },
  {
    id: 'inventory',
    label: 'Inventory',
    path: '/inventory',
    icon: ViewColumnsIcon,
    solidIcon: ViewColumnsSolidIcon,
    color: 'text-green-600'
  },
  {
    id: 'capture',
    label: 'Capture',
    path: '/photos/capture',
    icon: CameraIcon,
    solidIcon: CameraSolidIcon,
    color: 'text-purple-600'
  },
  {
    id: 'scanner',
    label: 'Scanner',
    path: '/scanner',
    icon: QrCodeIcon,
    solidIcon: QrCodeSolidIcon,
    color: 'text-orange-600'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: ChartBarIcon,
    solidIcon: ChartBarSolidIcon,
    color: 'text-indigo-600'
  },
  {
    id: 'valuations',
    label: 'Valuations',
    path: '/valuations',
    icon: DocumentTextIcon,
    solidIcon: DocumentSolidIcon,
    color: 'text-yellow-600'
  },
  {
    id: 'collaboration',
    label: 'Team',
    path: '/collaboration',
    icon: UserGroupIcon,
    solidIcon: UserGroupSolidIcon,
    color: 'text-red-600'
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Cog6ToothIcon,
    solidIcon: CogSolidIcon,
    color: 'text-gray-600'
  }
];

interface MobileNavigationProps {
  className?: string;
  variant?: 'bottom' | 'sidebar' | 'drawer';
  maxItems?: number;
  showLabels?: boolean;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  className = '',
  variant = 'bottom',
  maxItems = 5,
  showLabels = true
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { impact } = useHapticFeedback();

  const currentPath = location.pathname;

  // Handle navigation
  const handleNavigation = useCallback((path: string) => {
    impact('light');
    navigate(path);
    
    if (variant === 'drawer') {
      setIsDrawerOpen(false);
    }
  }, [navigate, impact, variant]);

  // Swipe gestures for drawer
  const swipeGestures = useSwipeNavigation({
    onSwipeLeft: () => {
      if (variant === 'drawer' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    },
    onSwipeRight: () => {
      if (variant === 'drawer' && !isDrawerOpen) {
        setIsDrawerOpen(true);
      }
    }
  });

  // Get visible items based on maxItems
  const visibleItems = navigationItems.slice(0, maxItems);
  const overflowItems = navigationItems.slice(maxItems);

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };

  // Render navigation item
  const renderNavItem = (item: NavigationItem, isCompact = false) => {
    const active = isActive(item.path);
    const IconComponent = active ? item.solidIcon : item.icon;

    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item.path)}
        className={clsx(
          'flex flex-col items-center justify-center relative transition-all duration-200',
          'hover:bg-gray-100 active:bg-gray-200 rounded-lg',
          'touch-manipulation select-none',
          isCompact ? 'p-2' : 'p-3',
          active && 'text-indigo-600',
          !active && 'text-gray-600'
        )}
        aria-label={item.label}
      >
        {/* Icon */}
        <div className="relative">
          <IconComponent 
            className={clsx(
              isCompact ? 'h-5 w-5' : 'h-6 w-6',
              'transition-transform duration-200',
              active && 'scale-110'
            )} 
          />
          
          {/* Badge */}
          {item.badge && item.badge > 0 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {item.badge > 9 ? '9+' : item.badge}
            </div>
          )}

          {/* Active indicator */}
          {active && (
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full" />
          )}
        </div>

        {/* Label */}
        {showLabels && !isCompact && (
          <span className={clsx(
            'text-xs mt-1 font-medium',
            active ? 'text-indigo-600' : 'text-gray-600'
          )}>
            {item.label}
          </span>
        )}
      </button>
    );
  };

  // Bottom navigation
  if (variant === 'bottom') {
    return (
      <nav className={clsx(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white border-t border-gray-200',
        'safe-area-pb',
        className
      )}>
        <div className="flex items-center justify-around px-2 py-1">
          {visibleItems.map(renderNavItem)}
          
          {/* More button if there are overflow items */}
          {overflowItems.length > 0 && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex flex-col items-center justify-center p-3 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <div className="grid grid-cols-2 gap-0.5 h-6 w-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-current rounded-full" />
                ))}
              </div>
              {showLabels && (
                <span className="text-xs mt-1 font-medium">More</span>
              )}
            </button>
          )}
        </div>
      </nav>
    );
  }

  // Sidebar navigation
  if (variant === 'sidebar') {
    return (
      <nav className={clsx(
        'fixed left-0 top-0 bottom-0 z-40',
        'w-20 bg-white border-r border-gray-200',
        'flex flex-col items-center py-4 space-y-2',
        'safe-area-pt safe-area-pb',
        className
      )}>
        {navigationItems.map(item => renderNavItem(item, true))}
      </nav>
    );
  }

  // Drawer navigation
  if (variant === 'drawer') {
    return (
      <>
        {/* Backdrop */}
        {isDrawerOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}

        {/* Drawer */}
        <nav
          {...swipeGestures()}
          className={clsx(
            'fixed left-0 top-0 bottom-0 z-50',
            'w-72 bg-white shadow-xl transform transition-transform duration-300',
            'flex flex-col',
            'safe-area-pt safe-area-pb',
            isDrawerOpen ? 'translate-x-0' : '-translate-x-full',
            className
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Inventory System
            </h2>
          </div>

          {/* Navigation items */}
          <div className="flex-1 py-4">
            {navigationItems.map(item => {
              const active = isActive(item.path);
              const IconComponent = active ? item.solidIcon : item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={clsx(
                    'w-full flex items-center px-4 py-3',
                    'hover:bg-gray-100 active:bg-gray-200',
                    'transition-colors duration-200',
                    'touch-manipulation select-none',
                    active && 'bg-indigo-50 border-r-2 border-indigo-600'
                  )}
                >
                  <IconComponent 
                    className={clsx(
                      'h-6 w-6 mr-3',
                      active ? 'text-indigo-600' : 'text-gray-600'
                    )} 
                  />
                  <span className={clsx(
                    'font-medium',
                    active ? 'text-indigo-600' : 'text-gray-900'
                  )}>
                    {item.label}
                  </span>
                  
                  {item.badge && item.badge > 0 && (
                    <div className="ml-auto h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              Swipe left to close
            </div>
          </div>
        </nav>

        {/* Menu trigger (when drawer is closed) */}
        {!isDrawerOpen && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md border border-gray-200"
            aria-label="Open navigation menu"
          >
            <div className="space-y-1">
              <div className="w-5 h-0.5 bg-gray-600" />
              <div className="w-5 h-0.5 bg-gray-600" />
              <div className="w-5 h-0.5 bg-gray-600" />
            </div>
          </button>
        )}
      </>
    );
  }

  return null;
};

export default MobileNavigation;