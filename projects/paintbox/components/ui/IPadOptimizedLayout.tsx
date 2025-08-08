'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { useSwipeNavigation, useHapticFeedback } from '@/hooks/useTabletGestures';
import { OfflineIndicator, SyncStatusBadge, ConnectionQuality } from './OfflineIndicator';
import { PWAStatus } from './PWAInstallPrompt';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface IPadLayoutProps {
  children: ReactNode;
  title?: string;
  showNavigation?: boolean;
  onNavigateBack?: () => void;
  onNavigateNext?: () => void;
  sidebar?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function IPadOptimizedLayout({
  children,
  title = 'Paintbox',
  showNavigation = true,
  onNavigateBack,
  onNavigateNext,
  sidebar,
  footer,
  className = ''
}: IPadLayoutProps) {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [screenSize, setScreenSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { triggerSelection } = useHapticFeedback();

  // Handle swipe navigation
  const swipeGestures = useSwipeNavigation({
    onSwipeLeft: () => {
      if (onNavigateNext) {
        triggerSelection();
        onNavigateNext();
      }
    },
    onSwipeRight: () => {
      if (onNavigateBack) {
        triggerSelection();
        onNavigateBack();
      } else if (sidebarOpen) {
        setSidebarOpen(false);
      }
    }
  }, {
    threshold: 100,
    preventScroll: false
  });

  // Monitor orientation and screen size changes
  useEffect(() => {
    const updateLayout = () => {
      const { innerWidth, innerHeight } = window;

      // Determine orientation
      setOrientation(innerWidth > innerHeight ? 'landscape' : 'portrait');

      // Determine screen size category
      if (innerWidth >= 1024) {
        setScreenSize('large'); // iPad Pro 12.9" and larger
      } else if (innerWidth >= 834) {
        setScreenSize('medium'); // iPad Air/Pro 11"
      } else {
        setScreenSize('small'); // iPad mini and smaller
      }

      // Check if we're in fullscreen PWA mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone;
      setIsFullscreen(isStandalone);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  // Auto-close sidebar on orientation change to landscape
  useEffect(() => {
    if (orientation === 'landscape' && screenSize === 'large') {
      setSidebarOpen(false);
    }
  }, [orientation, screenSize]);

  const layoutClasses = `
    min-h-screen bg-gradient-to-br from-gray-50 to-gray-100
    ${orientation === 'landscape' ? 'landscape' : 'portrait'}
    ${screenSize}
    ${isFullscreen ? 'standalone' : 'browser'}
    ${className}
  `.trim();

  const containerClasses = `
    flex flex-col h-screen
    ${orientation === 'landscape' && screenSize === 'large' ? 'md:flex-row' : ''}
  `;

  return (
    <div className={layoutClasses} {...swipeGestures.bind()}>
      <div className={containerClasses}>
        {/* Header */}
        <header className={`
          flex-shrink-0 bg-white border-b border-gray-200 shadow-sm
          ${isFullscreen ? 'pt-safe-top' : ''}
          ${orientation === 'landscape' && screenSize === 'large' ? 'md:hidden' : ''}
        `}>
          <div className="px-4 py-3 flex items-center justify-between">
            {/* Left section */}
            <div className="flex items-center space-x-3">
              {sidebar && (
                <button
                  onClick={() => {
                    setSidebarOpen(!sidebarOpen);
                    triggerSelection();
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              {onNavigateBack && (
                <button
                  onClick={() => {
                    triggerSelection();
                    onNavigateBack();
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <h1 className="text-xl font-semibold text-gray-900 truncate">
                {title}
              </h1>
            </div>

            {/* Center section - Connection status */}
            <div className="hidden sm:flex items-center space-x-2">
              <ConnectionQuality />
              <SyncStatusBadge />
            </div>

            {/* Right section */}
            <div className="flex items-center space-x-2">
              <div className="sm:hidden">
                <OfflineIndicator />
              </div>

              <div className="hidden sm:block">
                <OfflineIndicator />
              </div>

              <PWAStatus />

              {onNavigateNext && (
                <button
                  onClick={() => {
                    triggerSelection();
                    onNavigateNext();
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Desktop landscape layout */}
          {sidebar && orientation === 'landscape' && screenSize === 'large' && (
            <aside className="hidden md:flex md:flex-shrink-0">
              <div className="flex flex-col w-80 bg-white border-r border-gray-200">
                <div className="flex-1 overflow-y-auto">
                  {sidebar}
                </div>
              </div>
            </aside>
          )}

          {/* Sidebar - Mobile/Portrait overlay */}
          {sidebar && sidebarOpen && (orientation === 'portrait' || screenSize !== 'large') && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />

              {/* Sidebar panel */}
              <div className={`
                fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                ${isFullscreen ? 'pt-safe-top' : ''}
              `}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {sidebar}
                </div>
              </div>
            </>
          )}

          {/* Main content */}
          <main className={`
            flex-1 overflow-y-auto
            ${orientation === 'landscape' && screenSize === 'large' ? 'md:flex md:flex-col' : 'flex flex-col'}
          `}>
            <div className={`
              flex-1 px-4 py-6
              ${screenSize === 'large' ? 'max-w-none' : 'max-w-4xl mx-auto'}
              ${orientation === 'landscape' ? 'lg:px-8' : 'px-4'}
            `}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <footer className={`
                flex-shrink-0 bg-white border-t border-gray-200
                ${isFullscreen ? 'pb-safe-bottom' : ''}
              `}>
                {footer}
              </footer>
            )}
          </main>
        </div>
      </div>

      {/* Safe area styles for notched devices */}
      <style jsx>{`
        .standalone {
          padding-top: env(safe-area-inset-top, 0);
        }
        .pt-safe-top {
          padding-top: env(safe-area-inset-top, 0);
        }
        .pb-safe-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }

        /* iPad-specific optimizations */
        @media screen and (min-width: 768px) {
          .landscape.large {
            --content-max-width: none;
          }
          .portrait.large {
            --content-max-width: 800px;
          }
        }

        /* Touch target optimizations for iPad */
        button, .touch-target {
          min-height: 44px;
          min-width: 44px;
        }

        /* Prevent overscroll bounce on iOS */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
        }

        /* Custom scrollbars for better iPad experience */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        /* Split screen support */
        @media screen and (min-width: 1024px) {
          .landscape.large main {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
          }
          .landscape.large main.single-column {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// iPad-specific navigation component
export function IPadNavigation({
  currentStep,
  totalSteps,
  onStepChange,
  stepLabels = []
}: {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  stepLabels?: string[];
}) {
  const { triggerSelection } = useHapticFeedback();

  return (
    <nav className="bg-white border-b border-gray-200 overflow-x-auto">
      <div className="flex items-center px-4 py-2 space-x-1">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isAvailable = stepNumber <= currentStep + 1;

          return (
            <button
              key={stepNumber}
              onClick={() => {
                if (isAvailable) {
                  triggerSelection();
                  onStepChange(stepNumber);
                }
              }}
              disabled={!isAvailable}
              className={`
                flex-1 min-w-0 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200
                ${isActive
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : isCompleted
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : isAvailable
                  ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <div className="flex items-center justify-center space-x-1">
                <span className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${isActive ? 'bg-blue-500 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-transparent'}
                `}>
                  {isCompleted ? '✓' : stepNumber}
                </span>
                {stepLabels[index] && (
                  <span className="truncate hidden sm:inline">
                    {stepLabels[index]}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// iPad-specific form layout
export function IPadFormLayout({
  children,
  columns = 'auto'
}: {
  children: ReactNode;
  columns?: 'auto' | 1 | 2;
}) {
  return (
    <div className={`
      grid gap-6
      ${columns === 'auto'
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'
        : columns === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1'
      }
    `}>
      {children}
    </div>
  );
}

// iPad-specific card layout with touch optimization
export function IPadCard({
  children,
  className = '',
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border border-gray-200
        hover:shadow-md transition-shadow duration-200
        touch-manipulation select-none
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
