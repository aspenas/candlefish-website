'use client';

import React from 'react';
import { useOfflineInitialization } from '@/stores/useOfflineStore';

/**
 * Offline Provider Component
 *
 * Initializes offline functionality including:
 * - Network status monitoring
 * - IndexedDB setup
 * - Service worker integration
 * - Periodic cleanup tasks
 */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  // Initialize offline functionality
  useOfflineInitialization();

  return <>{children}</>;
}
