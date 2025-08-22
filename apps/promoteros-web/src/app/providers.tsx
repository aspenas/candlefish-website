'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient, queryClient } from '@/lib/trpc';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
