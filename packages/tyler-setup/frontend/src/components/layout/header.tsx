import { useState, useEffect } from 'react';
import { Bell, Search, Sun, Moon, Monitor, Wifi, WifiOff } from 'lucide-react';
import { useQuery, useSubscription } from '@apollo/client';

import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GET_HEALTH_STATUS_QUERY } from '@/lib/graphql/dashboard';
import { cn } from '@/lib/utils';

export function Header() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifications, setNotifications] = useState(0);

  // Health status query
  const { data: healthData, loading: healthLoading } = useQuery(GET_HEALTH_STATUS_QUERY, {
    pollInterval: 30000, // Poll every 30 seconds
    errorPolicy: 'all',
  });

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const cycleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const getSystemStatus = () => {
    if (healthLoading) return { status: 'checking', color: 'bg-yellow-500' };
    if (!healthData?.health) return { status: 'unknown', color: 'bg-gray-500' };

    const status = healthData.health.status.toLowerCase();
    switch (status) {
      case 'healthy':
        return { status: 'online', color: 'bg-green-500' };
      case 'degraded':
        return { status: 'warning', color: 'bg-yellow-500' };
      case 'unhealthy':
        return { status: 'offline', color: 'bg-red-500' };
      default:
        return { status: 'unknown', color: 'bg-gray-500' };
    }
  };

  const systemStatus = getSystemStatus();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Search */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search users, secrets, contractors..."
              className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
            />
          </div>
        </div>

        {/* Right side - Status and controls */}
        <div className="flex items-center space-x-4">
          {/* System status */}
          <div className="hidden sm:flex items-center space-x-2">
            <div className={cn('w-2 h-2 rounded-full', systemStatus.color)} />
            <span className="text-sm text-muted-foreground">
              {systemStatus.status}
            </span>
          </div>

          {/* Network status */}
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={cycleTheme} title="Toggle theme">
            {getThemeIcon()}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {notifications > 99 ? '99+' : notifications}
              </Badge>
            )}
          </Button>

          {/* User info */}
          <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-gray-200 dark:border-gray-700">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <div className="bg-primary/10 p-2 rounded-full">
              <span className="text-sm font-medium text-primary">
                {user?.initials}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* System health details (when degraded/unhealthy) */}
      {healthData?.health && ['degraded', 'unhealthy'].includes(healthData.health.status.toLowerCase()) && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex items-center space-x-2">
            <div className={cn('w-2 h-2 rounded-full', systemStatus.color)} />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              System Status: {healthData.health.status}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {healthData.health.services.map((service: any) => (
              <div key={service.name} className="flex items-center justify-between text-xs">
                <span>{service.name}</span>
                <Badge
                  variant={service.status === 'healthy' ? 'success' : 'warning'}
                  className="text-xs"
                >
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
