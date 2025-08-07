/**
 * Dashboard Layout Component
 * 
 * Provides the main layout structure for the system analyzer dashboard
 * with responsive design and flexible content areas.
 */

'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
  className?: string;
}

export function DashboardLayout({ 
  children, 
  sidebar, 
  header, 
  className 
}: DashboardLayoutProps) {
  return (
    <div className={cn('flex h-screen overflow-hidden', className)}>
      {/* Sidebar */}
      <aside className="flex-shrink-0 transition-all duration-300 ease-in-out">
        {sidebar}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-30">
          {header}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;