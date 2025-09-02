/**
 * @fileoverview React hooks for Candlefish Claude Config SDK
 * @version 2.0.0
 * @author Candlefish AI <https://candlefish.ai>
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ConfigProfile,
  UseConfigProfileOptions,
  UseConfigProfileReturn,
  WebSocketEvent,
  WebSocketEventHandlers
} from '../types';
import { CandlefishConfigClient } from '../client';

/**
 * Context for providing the client instance to hooks
 */
import { createContext, useContext, ReactNode } from 'react';

interface ConfigClientContextType {
  client: CandlefishConfigClient;
}

const ConfigClientContext = createContext<ConfigClientContextType | null>(null);

/**
 * Provider component for the config client
 */
export interface ConfigClientProviderProps {
  client: CandlefishConfigClient;
  children: ReactNode;
}

export function ConfigClientProvider({ client, children }: ConfigClientProviderProps) {
  return React.createElement(
    ConfigClientContext.Provider,
    { value: { client } },
    children
  );
}

/**
 * Hook to get the client instance from context
 */
function useConfigClient(): CandlefishConfigClient {
  const context = useContext(ConfigClientContext);
  if (!context) {
    throw new Error('useConfigClient must be used within a ConfigClientProvider');
  }
  return context.client;
}

/**
 * Hook for managing a single configuration profile
 */
export function useConfigProfile(
  profileId?: string,
  options: UseConfigProfileOptions = {}
): UseConfigProfileReturn {
  const client = useConfigClient();
  const [profile, setProfile] = useState<ConfigProfile | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch profile data
   */
  const fetchProfile = useCallback(async () => {
    if (!profileId) return;

    setLoading(true);
    setError(undefined);

    try {
      const fetchedProfile = await client.getProfile(profileId);
      setProfile(fetchedProfile);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [client, profileId]);

  /**
   * Create a new profile
   */
  const createProfile = useCallback(async (
    newProfile: Omit<ConfigProfile, 'profile_id'>
  ): Promise<ConfigProfile> => {
    setLoading(true);
    setError(undefined);

    try {
      const createdProfile = await client.createProfile(newProfile);
      setProfile(createdProfile);
      return createdProfile;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * Update existing profile
   */
  const updateProfile = useCallback(async (
    updatedProfile: ConfigProfile
  ): Promise<ConfigProfile> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await client.updateProfile(updatedProfile);
      setProfile(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * Delete profile
   */
  const deleteProfile = useCallback(async (profileIdToDelete: string): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      await client.deleteProfile(profileIdToDelete);
      if (profileId === profileIdToDelete) {
        setProfile(undefined);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, profileId]);

  // Set up real-time updates via WebSocket
  useEffect(() => {
    if (!options.realtime || !profileId) return;

    const handlers: WebSocketEventHandlers = {
      onMessage: (event: WebSocketEvent) => {
        if (event.event_type === 'profile_updated' && 
            event.payload?.profile_id === profileId) {
          setProfile(event.payload);
        } else if (event.event_type === 'profile_deleted' && 
                   event.payload?.profile_id === profileId) {
          setProfile(undefined);
        }
      },
      onError: (event) => {
        console.error('WebSocket error in useConfigProfile:', event);
        setError(new Error('WebSocket connection error'));
      }
    };

    wsRef.current = client.connectToConfigEvents(handlers);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [client, options.realtime, profileId]);

  // Set up polling for updates (if not using WebSocket)
  useEffect(() => {
    if (options.realtime || !options.pollInterval || !profileId) return;

    pollIntervalRef.current = setInterval(fetchProfile, options.pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchProfile, options.realtime, options.pollInterval, profileId]);

  // Initial fetch
  useEffect(() => {
    if (profileId) {
      fetchProfile();
    }
  }, [fetchProfile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    createProfile,
    updateProfile,
    deleteProfile
  };
}

/**
 * Hook for managing multiple configuration profiles
 */
export function useConfigProfiles(
  options: UseConfigProfileOptions = {}
): Omit<UseConfigProfileReturn, 'profile'> & { profiles: ConfigProfile[] } {
  const client = useConfigClient();
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch all profiles
   */
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const fetchedProfiles = await client.listProfiles();
      setProfiles(fetchedProfiles);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * Create a new profile
   */
  const createProfile = useCallback(async (
    newProfile: Omit<ConfigProfile, 'profile_id'>
  ): Promise<ConfigProfile> => {
    setLoading(true);
    setError(undefined);

    try {
      const createdProfile = await client.createProfile(newProfile);
      setProfiles(prev => [...prev, createdProfile]);
      return createdProfile;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * Update existing profile
   */
  const updateProfile = useCallback(async (
    updatedProfile: ConfigProfile
  ): Promise<ConfigProfile> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await client.updateProfile(updatedProfile);
      setProfiles(prev => 
        prev.map(p => p.profile_id === result.profile_id ? result : p)
      );
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * Delete profile
   */
  const deleteProfile = useCallback(async (profileId: string): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      await client.deleteProfile(profileId);
      setProfiles(prev => prev.filter(p => p.profile_id !== profileId));
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Set up real-time updates via WebSocket
  useEffect(() => {
    if (!options.realtime) return;

    const handlers: WebSocketEventHandlers = {
      onMessage: (event: WebSocketEvent) => {
        if (event.event_type === 'profile_created') {
          setProfiles(prev => [...prev, event.payload]);
        } else if (event.event_type === 'profile_updated') {
          setProfiles(prev => 
            prev.map(p => p.profile_id === event.payload.profile_id ? event.payload : p)
          );
        } else if (event.event_type === 'profile_deleted') {
          setProfiles(prev => 
            prev.filter(p => p.profile_id !== event.payload.profile_id)
          );
        }
      },
      onError: (event) => {
        console.error('WebSocket error in useConfigProfiles:', event);
        setError(new Error('WebSocket connection error'));
      }
    };

    wsRef.current = client.connectToConfigEvents(handlers);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [client, options.realtime]);

  // Set up polling for updates (if not using WebSocket)
  useEffect(() => {
    if (options.realtime || !options.pollInterval) return;

    pollIntervalRef.current = setInterval(fetchProfiles, options.pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchProfiles, options.realtime, options.pollInterval]);

  // Initial fetch
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    profiles,
    loading,
    error,
    refetch: fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile
  };
}

/**
 * Hook for WebSocket connection management
 */
export function useConfigWebSocket(
  handlers: WebSocketEventHandlers
) {
  const client = useConfigClient();
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed'>('closed');
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionState('connecting');

    const enhancedHandlers: WebSocketEventHandlers = {
      ...handlers,
      onOpen: (event) => {
        setConnectionState('open');
        handlers.onOpen?.(event);
      },
      onClose: (event) => {
        setConnectionState('closed');
        handlers.onClose?.(event);
      }
    };

    wsRef.current = client.connectToConfigEvents(enhancedHandlers);
  }, [client, handlers]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('closed');
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    connect,
    disconnect
  };
}

/**
 * Hook for client health monitoring
 */
export function useConfigHealth() {
  const client = useConfigClient();
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const healthData = await client.healthCheck();
      setHealth(healthData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    health,
    loading,
    error,
    refetch: checkHealth
  };
}