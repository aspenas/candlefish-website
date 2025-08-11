import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  UserCheck,
  Shield,
  Settings,
  FileText,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Activity,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  roles?: string[];
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users, roles: ['ADMIN'] },
  { name: 'Contractors', href: '/contractors', icon: UserCheck, roles: ['ADMIN'] },
  { name: 'Secrets', href: '/secrets', icon: Shield },
  { name: 'Audit Logs', href: '/audit', icon: FileText, roles: ['ADMIN'] },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const filteredNavigation = navigation.filter(item =>
    !item.roles || item.roles.some(role => hasRole(role))
  );

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={toggleSidebar}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-gray-700 px-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Tyler Setup</h1>
                <p className="text-xs text-muted-foreground">v1.0.0</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <Badge variant={isActive ? 'secondary' : 'default'} className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.fullName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
              <Badge
                variant={user?.role === 'ADMIN' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {user?.role}
              </Badge>
            </div>

            {/* Quick stats for admins */}
            {hasRole('ADMIN') && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-center">
                  <Activity className="h-4 w-4 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-green-600 dark:text-green-400">Online</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-center">
                  <Bell className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">Alerts</p>
                </div>
              </div>
            )}

            {/* Logout button */}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
