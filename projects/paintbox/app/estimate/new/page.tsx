'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewEstimate() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to details page - no intro needed for staff workflow
    router.replace('/estimate/new/details');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-paintbox-primary/5 via-paintbox-background to-paintbox-accent/5 flex items-center justify-center">
      <div className="paintbox-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-paintbox-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-paintbox-text-muted">Starting new estimate...</p>
      </div>
    </div>
  );
}
