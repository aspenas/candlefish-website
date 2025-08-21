'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AssessmentPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the maturity-map page which has the proper dark theme
    router.replace('/maturity-map');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[#3FD3C6] text-lg">Redirecting to assessment...</p>
      </div>
    </div>
  );
}
