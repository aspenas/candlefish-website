import React, { useState, useEffect } from 'react';
import {
  Bars3Icon,
  BellIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useDashboardStore } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import DashboardNavigation from './DashboardNavigation';
import clsx from 'clsx';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCriticalAlert, setShowCriticalAlert] = useState(true);
  
  const { sidebarOpen, setSidebarOpen, connectionStatus } = useDashboardStore();
  const { user, logout } = useAuthStore();
  const { notifications } = useNotificationStore();

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-soc-background flex">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-soc-surface border-r border-soc-border transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center space-x-3 p-6 border-b border-soc-border">
            <div className="p-2 bg-security-600 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Security Dashboard</h1>
              <p className="text-sm text-soc-muted">Candlefish</p>
            </div>
          </div>

          {/* Navigation */}
          <DashboardNavigation />
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="bg-soc-surface border-b border-soc-border px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-soc-muted hover:text-white lg:hidden"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>

              {/* Connection status */}
              <div className="flex items-center space-x-2">
                <div className={clsx(
                  'w-2 h-2 rounded-full',
                  connectionStatus.connected ? 'bg-success-500' : 'bg-critical-500'
                )} />
                <span className="text-sm text-soc-muted">
                  {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <div className="relative">
                <button className="p-2 text-soc-muted hover:text-white transition-colors">
                  <BellIcon className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-critical-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>
              </div>

              {/* Settings */}
              <button className="p-2 text-soc-muted hover:text-white transition-colors">
                <Cog6ToothIcon className="w-5 h-5" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 text-soc-muted hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 bg-security-600 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </span>
                </button>

                {/* User dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-soc-elevated border border-soc-border rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-soc-border">
                        <p className="text-sm font-medium text-white">
                          {user?.email || 'user@example.com'}
                        </p>
                        <p className="text-xs text-soc-muted">
                          {user?.role || 'Security Analyst'}
                        </p>
                      </div>
                      <button className="w-full text-left px-4 py-2 text-sm text-soc-muted hover:text-white hover:bg-soc-surface">
                        Profile Settings
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-soc-muted hover:text-white hover:bg-soc-surface">
                        Preferences
                      </button>
                      <div className="border-t border-soc-border mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-critical-400 hover:bg-soc-surface"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Critical Alert Banner */}
        {showCriticalAlert && (
          <div className="bg-critical-950 border-b border-critical-800 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-critical-400" />
                <span className="text-sm text-white">
                  <strong>CRITICAL:</strong> Kong Admin API vulnerability detected - HTTP protocol in use.
                  Immediate action required to secure your API gateway.
                </span>
              </div>
              <button
                onClick={() => setShowCriticalAlert(false)}
                className="p-1 text-critical-400 hover:text-critical-300 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
