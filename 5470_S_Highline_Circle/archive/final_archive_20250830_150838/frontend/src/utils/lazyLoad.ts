import { lazy, ComponentType } from 'react';

export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(importFn);
}
