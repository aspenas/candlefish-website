'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Calculator, FileText, ArrowRight, Sparkles } from 'lucide-react';

export default function NewEstimate() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Brief delay to show loading state, then redirect
    const timer = setTimeout(() => {
      setIsLoading(false);
      router.replace('/estimate/new/details');
    }, 800);

    return () => clearTimeout(timer);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-paintbox-brand/5 via-paintbox-background to-paintbox-accent/5 flex items-center justify-center safe-area-inset">
        <div className="paintbox-card p-12 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-gradient-to-r from-paintbox-brand to-paintbox-accent rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6">
            <Calculator className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-paintbox-text mb-3">
            Creating New Estimate
          </h2>

          <p className="text-paintbox-text-muted mb-8">
            Setting up your professional estimate workspace...
          </p>

          <LoadingSpinner size="lg" variant="primary" />

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-paintbox-text-muted">
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
