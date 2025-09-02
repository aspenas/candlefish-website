'use client';

import { ReactNode } from 'react';
import { ApolloProvider as BaseApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/graphql-client';
import { Toaster } from 'react-hot-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useScreenReaderAnnouncements } from '@/hooks/useAccessibility';
import { AccessibilitySettings } from '@/components/accessibility/AccessibilitySettings';

interface ProvidersProps {
  children: ReactNode;
}

function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { LiveRegion } = useScreenReaderAnnouncements();

  return (
    <>
      {children}
      <LiveRegion />
      
      {/* Accessibility Settings - Available globally */}
      <div className="fixed bottom-4 right-4 z-50">
        <AccessibilitySettings />
      </div>
    </>
  );
}

export function ApolloProvider({ children }: ProvidersProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Global error:', error, errorInfo);
      }}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      <BaseApolloProvider client={apolloClient}>
        <TooltipProvider delayDuration={300}>
          <AccessibilityProvider>
            {children}
            
            {/* Global Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: 'hsl(var(--primary))',
                    secondary: 'hsl(var(--primary-foreground))',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: 'hsl(var(--destructive))',
                    secondary: 'hsl(var(--destructive-foreground))',
                  },
                },
              }}
              containerStyle={{
                top: 20,
                right: 20,
              }}
            />
          </AccessibilityProvider>
        </TooltipProvider>
      </BaseApolloProvider>
    </ErrorBoundary>
  );
}