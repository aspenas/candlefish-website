"use client";

import { Analytics } from "@vercel/analytics/react";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastViewport className="fixed bottom-4 right-4 z-[100] w-96" />
      <Analytics />
    </ToastProvider>
  );
}
