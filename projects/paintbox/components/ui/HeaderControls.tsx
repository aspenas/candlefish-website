"use client";
import React from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { OfflineQueueManager, SyncButton } from '@/components/ui/OfflineQueueManager';

export default function HeaderControls() {
  return (
    <div className="flex items-center gap-3">
      <OfflineIndicator />
      <SyncButton />
      <ThemeToggle />
    </div>
  );
}
