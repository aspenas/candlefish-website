'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Calculator, FileText, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';

export default function NewEstimate() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Initialize new estimate with error handling and retry logic
    const initializeEstimate = () => {
      try {
        console.log('Initializing new estimate...');

        // Brief delay to show loading state, then redirect
        const timer = setTimeout(() => {
          try {
            setIsLoading(false);
            console.log('Redirecting to details page...');
            router.replace('/estimate/new/details');
          } catch (redirectError) {
            console.error('Error during redirect:', redirectError);
            setError('Failed to navigate to details page');
            setIsLoading(false);
          }
        }, 800);

        return () => clearTimeout(timer);
      } catch (initError) {
        console.error('Error initializing estimate:', initError);
        setError('Failed to initialize estimate');
        setIsLoading(false);
      }
    };

    const cleanup = initializeEstimate();

    // Fallback timer in case something goes wrong
    const fallbackTimer = setTimeout(() => {
      if (isLoading && retryCount < 3) {
        console.warn('Loading timeout reached, retrying...');
        setRetryCount(prev => prev + 1);
        setError(null);
        setIsLoading(true);
      } else if (isLoading) {
        console.error('Max retries reached, showing error');
        setError('Unable to load estimate page. Please try again.');
        setIsLoading(false);
      }
    }, 5000); // 5 second fallback

    return () => {
      if (cleanup) cleanup();
      clearTimeout(fallbackTimer);
    };
  }, [router, retryCount]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-eggshell-brand/5 via-eggshell-background to-eggshell-accent/5 flex items-center justify-center safe-area-inset">
        <div className="eggshell-card p-12 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          <h2 className="text-2xl font-bold text-eggshell-text mb-3">
            Unable to Load Estimate
          </h2>

          <p className="text-eggshell-text-muted mb-8">
            {error}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                setRetryCount(0);
              }}
              className="w-full bg-eggshell-brand text-white py-2 px-4 rounded-lg hover:bg-eggshell-brand/90 transition-colors"
            >
              Try Again
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-eggshell-background text-eggshell-text py-2 px-4 rounded-lg hover:bg-eggshell-accent/10 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-eggshell-brand/5 via-eggshell-background to-eggshell-accent/5 flex items-center justify-center safe-area-inset">
        <div className="eggshell-card p-12 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-gradient-to-r from-eggshell-brand to-eggshell-accent rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6">
            <Calculator className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-eggshell-text mb-3">
            Creating New Estimate
          </h2>

          <p className="text-eggshell-text-muted mb-8">
            Setting up your professional estimate workspace...
            {retryCount > 0 && ` (Attempt ${retryCount + 1}/4)`}
          </p>

          <LoadingSpinner size="lg" variant="primary" />

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-eggshell-text-muted">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>Client Details</span>
            </div>
            <ArrowRight className="w-3 h-3 opacity-50" />
            <div className="flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              <span>Ready to Start</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null; // This won't be shown as we redirect immediately
}
