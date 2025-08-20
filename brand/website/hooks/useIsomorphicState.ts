/**
 * Hook for handling hydration-safe dynamic values
 * Ensures server-client consistency for dynamic state
 */

import { useEffect, useState } from 'react';

export function useIsomorphicState<T>(
  staticValue: T,
  dynamicValueFactory: () => T
): [T, boolean] {
  const [isClient, setIsClient] = useState(false);
  const [state, setState] = useState<T>(staticValue);

  useEffect(() => {
    setIsClient(true);
    setState(dynamicValueFactory());
  }, []);

  return [state, isClient];
}

/**
 * Hook specifically for time-based values that change during SSR
 */
export function useClientOnlyTime() {
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
  }, []);

  return { isClient, currentTime };
}

/**
 * Hook for handling random values that must be consistent during hydration
 */
export function useHydrationSafeRandom(seed?: number): [number, boolean] {
  const [isClient, setIsClient] = useState(false);
  const [randomValue, setRandomValue] = useState(seed || 0.5);

  useEffect(() => {
    setIsClient(true);
    setRandomValue(Math.random());
  }, []);

  return [randomValue, isClient];
}