import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ClockIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  UsersIcon,
  Cog6ToothIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ClockIcon as ClockIconSolid,
  ShieldExclamationIcon as ShieldExclamationIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  DocumentCheckIcon as DocumentCheckIconSolid,
  UsersIcon as UsersIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  ChartBarIcon as ChartBarIconSolid,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  badge?: number;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Overview',
    href: '/',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    description: 'Security dashboard overview',
  },
  {
    name: 'Security Events',
    href: '/events',
    icon: ClockIcon,
    iconSolid: ClockIconSolid,
    badge: 12,
    description: 'Real-time security event timeline',
  },
  {
    name: 'Threat Detection',
    href: '/threats',
    icon: ShieldExclamationIcon,
    iconSolid: ShieldExclamationIconSolid,
    badge: 3,
    description: 'Active threat monitoring',
  },
  {
    name: 'Incidents',
    href: '/incidents',
    icon: ExclamationTriangleIcon,
    iconSolid: ExclamationTriangleIconSolid,
    badge: 5,
    description: 'Incident management workflow',
  },
  {
    name: 'Compliance',
    href: '/compliance',
    icon: DocumentCheckIcon,
    iconSolid: DocumentCheckIconSolid,
    description: 'Compliance reporting and audits',
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
    description: 'Security metrics and reports',
  },
  {
    name: 'User Management',
    href: '/users',
    icon: UsersIcon,
    iconSolid: UsersIconSolid,
    description: 'Manage users and permissions',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    iconSolid: Cog6ToothIconSolid,
    description: 'Dashboard configuration',
  },
];

const DashboardNavigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="flex-1 px-3 py-6 space-y-2">
      {navigationItems.map((item) => {
        const isActive = location.pathname === item.href || 
          (item.href !== '/' && location.pathname.startsWith(item.href));
        
        const Icon = isActive ? item.iconSolid : item.icon;

        return (
          <NavLink
            key={item.name}
            to={item.href}
            className={clsx(
              'group flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150',
              isActive
                ? 'bg-security-600 text-white shadow-glow-sm'
                : 'text-soc-muted hover:text-white hover:bg-soc-elevated'
            )}
            title={item.description}
          >
            <Icon className={clsx('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : 'text-soc-muted group-hover:text-security-400')} />
            
            <div className="flex-1 min-w-0">
              <span className="truncate">{item.name}</span>
              {item.description && (
                <div className="text-xs text-soc-muted group-hover:text-soc-muted/80 mt-0.5 truncate">
                  {item.description}
                </div>
              )}
            </div>
            
            {item.badge && item.badge > 0 && (
              <span className={clsx(
                'inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full min-w-0',
                isActive
                  ? 'bg-white text-security-600'
                  : 'bg-critical-600 text-white group-hover:bg-critical-500'
              )}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </NavLink>
        );
      })}
      
      {/* Integration Section */}
      <div className="pt-6 mt-6 border-t border-soc-border">
        <h3 className="px-3 text-xs font-semibold text-soc-muted uppercase tracking-wider mb-3">
          Integrations
        </h3>
        
        <div className="space-y-2">
          {/* Grafana Integration */}
          <a
            href="http://localhost:3003"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 text-soc-muted hover:text-white hover:bg-soc-elevated"
            title="Open Grafana dashboards in new tab"
          >
            <div className="w-5 h-5 flex-shrink-0 bg-orange-500 rounded-sm flex items-center justify-center">
              <span className="text-xs font-bold text-white">G</span>
            </div>
            <span className="truncate">Grafana</span>
            <span className="text-xs text-soc-muted">↗</span>
          </a>
          
          {/* Prometheus Integration */}
          <div className="group flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg text-soc-muted/50">
            <div className="w-5 h-5 flex-shrink-0 bg-red-500/50 rounded-sm flex items-center justify-center">
              <span className="text-xs font-bold text-white/50">P</span>
            </div>
            <span className="truncate">Prometheus</span>
            <span className="text-xs text-soc-muted/50">Coming Soon</span>
          </div>
        </div>
      </div>
      
      {/* Status Indicator */}
      <div className="pt-6 mt-6 border-t border-soc-border">
        <div className="px-3 py-2 bg-soc-elevated rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-white">System Status</span>
          </div>
          <div className="text-xs text-soc-muted">
            All systems operational
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavigation;