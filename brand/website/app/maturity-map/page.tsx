'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MaturityMapRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Immediate redirect to assessment
    router.replace('/assessment');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <h1 className="text-2xl text-[#3FD3C6] mb-4">Redirecting to Assessment...</h1>
        <p className="text-[#888]">
          If you are not redirected automatically, <a href="/assessment" className="text-[#3FD3C6] hover:underline">click here</a>.
        </p>
      </div>
    </div>
  );
}
