import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Video } from '@/contexts/AudioPlayerContext';
import { RealtimeChannel } from '@supabase/supabase-js';

// Sync event types
export type SyncEventType = 'play' | 'pause' | 'seek' | 'stop' | 'song_change' | 'heartbeat';

export interface SyncEvent {
  event: SyncEventType;
  timestamp: number;
  position?: number;
  video?: Video;
}

export interface SyncSession {
  id: string;
  syncKey: string;
  hostUserId: string;
  currentVideo: Video | null;
  startTimestamp: number | null;
  currentPosition: number;
  isPlaying: boolean;
  status: 'active' | 'paused' | 'ended';
}

export interface SyncParticipant {
  id: string;
  deviceId: string;
  displayName: string | null;
  isHost: boolean;
  latencyMs: number;
  status: 'connected' | 'disconnected' | 'syncing';
}

interface UseMusicSyncReturn {
  // Session state
  session: SyncSession | null;
  participants: SyncParticipant[];
  isHost: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  
  // Session management
  createSession: (video: Video) => Promise<string | null>;
  joinSession: (syncKey: string, displayName?: string) => Promise<boolean>;
  leaveSession: () => Promise<void>;
  endSession: () => Promise<void>;
  
  // Playback events (host only)
  broadcastPlay: (position: number) => void;
  broadcastPause: (position: number) => void;
  broadcastSeek: (position: number) => void;
  broadcastSongChange: (video: Video, position: number) => void;
  broadcastStop: () => void;
  
  // Sync utilities
  getCurrentSyncPosition: () => number;
  measureLatency: () => Promise<number>;
  
  // Event callback
  onSyncEvent: (callback: (event: SyncEvent) => void) => void;
}

// Generate unique sync key format: XT-XXXXXX
const generateSyncKey = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let key = 'XT-';
  for (let i = 0; i < 6; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

// Generate unique device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('xt_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('xt_device_id', deviceId);
  }
  return deviceId;
};

export const useMusicSync = (): UseMusicSyncReturn => {
  const { user, profile } = useAuth();
  const deviceId = useRef(getDeviceId());
  
  // State
  const [session, setSession] = useState<SyncSession | null>(null);
  const [participants, setParticipants] = useState<SyncParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Refs for realtime
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncEventCallbackRef = useRef<((event: SyncEvent) => void) | null>(null);
  const serverTimeOffsetRef = useRef<number>(0);
  const latencyRef = useRef<number>(50); // Default 50ms
  
  const isHost = session?.hostUserId === user?.id;

  // Measure network latency (RTT/2)
  const measureLatency = useCallback(async (): Promise<number> => {
    const samples: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      try {
        await supabase.from('sync_sessions').select('id').limit(1);
        const rtt = performance.now() - start;
        samples.push(rtt / 2); // One-way latency estimate
      } catch {
        samples.push(50); // Default fallback
      }
    }
    
    // Use median to reduce outlier impact
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    latencyRef.current = Math.round(median);
    
    return latencyRef.current;
  }, []);

  // Get synchronized server timestamp
  const getServerTime = useCallback((): number => {
    return Date.now() + serverTimeOffsetRef.current;
  }, []);

  // Calculate current sync position based on start timestamp
  const getCurrentSyncPosition = useCallback((): number => {
    if (!session || !session.startTimestamp || !session.isPlaying) {
      return session?.currentPosition || 0;
    }
    
    const elapsed = (getServerTime() - session.startTimestamp) / 1000;
    return session.currentPosition + elapsed;
  }, [session, getServerTime]);

  // Subscribe to realtime events
  const subscribeToSession = useCallback(async (sessionId: string) => {
    // Unsubscribe from previous channel
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`sync_${sessionId}`)
      // Session changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const data = payload.new as any;
            setSession(prev => prev ? {
              ...prev,
              currentVideo: data.current_video_id ? {
                id: data.current_video_id,
                title: data.current_video_title || '',
                thumbnail: data.current_video_thumbnail || '',
                channelTitle: data.current_video_channel || '',
              } : null,
              startTimestamp: data.start_timestamp,
              currentPosition: data.current_position,
              isPlaying: data.is_playing,
              status: data.status,
            } : null);
          } else if (payload.eventType === 'DELETE') {
            setSession(null);
            setIsConnected(false);
          }
        }
      )
      // Participant changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const data = payload.new as any;
            setParticipants(prev => [...prev, {
              id: data.id,
              deviceId: data.device_id,
              displayName: data.display_name,
              isHost: data.is_host,
              latencyMs: data.latency_ms,
              status: data.status,
            }]);
          } else if (payload.eventType === 'UPDATE') {
            const data = payload.new as any;
            setParticipants(prev => prev.map(p => 
              p.id === data.id ? {
                ...p,
                displayName: data.display_name,
                latencyMs: data.latency_ms,
                status: data.status,
              } : p
            ));
          } else if (payload.eventType === 'DELETE') {
            const data = payload.old as any;
            setParticipants(prev => prev.filter(p => p.id !== data.id));
          }
        }
      )
      // Sync events (for immediate playback control)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sync_events',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const data = payload.new as any;
          
          // Don't process own events
          if (data.sender_device_id === deviceId.current) return;
          
          const event: SyncEvent = {
            event: data.event_type,
            timestamp: data.timestamp,
            position: data.payload?.position,
            video: data.payload?.video,
          };
          
          // Trigger callback
          if (syncEventCallbackRef.current) {
            syncEventCallbackRef.current(event);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback((sessionId: string, participantId: string) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(async () => {
      const latency = await measureLatency();
      
      await supabase
        .from('sync_participants')
        .update({
          last_heartbeat: new Date().toISOString(),
          latency_ms: latency,
          status: 'connected',
        })
        .eq('id', participantId);
    }, 5000); // Every 5 seconds
  }, [measureLatency]);

  // Create a new sync session
  const createSession = useCallback(async (video: Video): Promise<string | null> => {
    if (!user) {
      console.error('[MusicSync] User must be logged in to create session');
      return null;
    }

    try {
      await measureLatency();
      const syncKey = generateSyncKey();
      const now = getServerTime();

      // Create session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sync_sessions')
        .insert({
          sync_key: syncKey,
          host_user_id: user.id,
          current_video_id: video.id,
          current_video_title: video.title,
          current_video_thumbnail: video.thumbnail,
          current_video_channel: video.channelTitle,
          start_timestamp: now,
          current_position: 0,
          is_playing: true,
          status: 'active',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add host as participant
      const { data: participantData, error: participantError } = await supabase
        .from('sync_participants')
        .insert({
          session_id: sessionData.id,
          user_id: user.id,
          device_id: deviceId.current,
          display_name: profile?.display_name || 'Host',
          is_host: true,
          latency_ms: latencyRef.current,
          status: 'connected',
        })
        .select()
        .single();

      if (participantError) throw participantError;

      // Set session state
      setSession({
        id: sessionData.id,
        syncKey: sessionData.sync_key,
        hostUserId: sessionData.host_user_id,
        currentVideo: video,
        startTimestamp: sessionData.start_timestamp,
        currentPosition: sessionData.current_position,
        isPlaying: sessionData.is_playing,
        status: sessionData.status as 'active' | 'paused' | 'ended',
      });

      setParticipants([{
        id: participantData.id,
        deviceId: participantData.device_id,
        displayName: participantData.display_name,
        isHost: participantData.is_host,
        latencyMs: participantData.latency_ms,
        status: participantData.status as 'connected' | 'disconnected' | 'syncing',
      }]);

      // Subscribe to realtime updates
      await subscribeToSession(sessionData.id);
      startHeartbeat(sessionData.id, participantData.id);

      console.log(`[MusicSync] Created session: ${syncKey}`);
      return syncKey;
    } catch (error) {
      console.error('[MusicSync] Error creating session:', error);
      return null;
    }
  }, [user, profile, measureLatency, getServerTime, subscribeToSession, startHeartbeat]);

  // Join an existing session
  const joinSession = useCallback(async (syncKey: string, displayName?: string): Promise<boolean> => {
    try {
      setIsSyncing(true);
      await measureLatency();

      // Find session by sync key
      const { data: sessionData, error: sessionError } = await supabase
        .from('sync_sessions')
        .select('*')
        .eq('sync_key', syncKey.toUpperCase())
        .eq('status', 'active')
        .single();

      if (sessionError || !sessionData) {
        console.error('[MusicSync] Session not found:', syncKey);
        setIsSyncing(false);
        return false;
      }

      // Add as participant
      const { data: participantData, error: participantError } = await supabase
        .from('sync_participants')
        .insert({
          session_id: sessionData.id,
          user_id: user?.id || null,
          device_id: deviceId.current,
          display_name: displayName || profile?.display_name || `Guest ${Math.floor(Math.random() * 1000)}`,
          is_host: false,
          latency_ms: latencyRef.current,
          status: 'syncing',
        })
        .select()
        .single();

      if (participantError) throw participantError;

      // Fetch all participants
      const { data: allParticipants } = await supabase
        .from('sync_participants')
        .select('*')
        .eq('session_id', sessionData.id);

      // Set session state
      setSession({
        id: sessionData.id,
        syncKey: sessionData.sync_key,
        hostUserId: sessionData.host_user_id,
        currentVideo: sessionData.current_video_id ? {
          id: sessionData.current_video_id,
          title: sessionData.current_video_title || '',
          thumbnail: sessionData.current_video_thumbnail || '',
          channelTitle: sessionData.current_video_channel || '',
        } : null,
        startTimestamp: sessionData.start_timestamp,
        currentPosition: sessionData.current_position,
        isPlaying: sessionData.is_playing,
        status: sessionData.status as 'active' | 'paused' | 'ended',
      });

      setParticipants((allParticipants || []).map((p: any) => ({
        id: p.id,
        deviceId: p.device_id,
        displayName: p.display_name,
        isHost: p.is_host,
        latencyMs: p.latency_ms,
        status: p.status as 'connected' | 'disconnected' | 'syncing',
      })));

      // Subscribe to realtime updates
      await subscribeToSession(sessionData.id);
      startHeartbeat(sessionData.id, participantData.id);

      // Update status to connected after sync
      setTimeout(async () => {
        await supabase
          .from('sync_participants')
          .update({ status: 'connected' })
          .eq('id', participantData.id);
        setIsSyncing(false);
      }, 1000);

      console.log(`[MusicSync] Joined session: ${syncKey}`);
      return true;
    } catch (error) {
      console.error('[MusicSync] Error joining session:', error);
      setIsSyncing(false);
      return false;
    }
  }, [user, profile, measureLatency, subscribeToSession, startHeartbeat]);

  // Leave session (for participants)
  const leaveSession = useCallback(async () => {
    if (!session) return;

    try {
      // Remove self from participants
      await supabase
        .from('sync_participants')
        .delete()
        .eq('session_id', session.id)
        .eq('device_id', deviceId.current);

      // Cleanup
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      setSession(null);
      setParticipants([]);
      setIsConnected(false);

      console.log('[MusicSync] Left session');
    } catch (error) {
      console.error('[MusicSync] Error leaving session:', error);
    }
  }, [session]);

  // End session (host only)
  const endSession = useCallback(async () => {
    if (!session || !isHost) return;

    try {
      // Update session status
      await supabase
        .from('sync_sessions')
        .update({ status: 'ended' })
        .eq('id', session.id);

      // Cleanup
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      setSession(null);
      setParticipants([]);
      setIsConnected(false);

      console.log('[MusicSync] Ended session');
    } catch (error) {
      console.error('[MusicSync] Error ending session:', error);
    }
  }, [session, isHost]);

  // Broadcast helper
  const broadcastEvent = useCallback(async (
    eventType: SyncEventType,
    payload: Record<string, any> = {}
  ) => {
    if (!session || !isHost) return;

    const now = getServerTime();

    try {
      await supabase.from('sync_events').insert({
        session_id: session.id,
        event_type: eventType,
        timestamp: now,
        payload,
        sender_device_id: deviceId.current,
      });

      console.log(`[MusicSync] Broadcast: ${eventType}`);
    } catch (error) {
      console.error('[MusicSync] Error broadcasting event:', error);
    }
  }, [session, isHost, getServerTime]);

  // Broadcast play
  const broadcastPlay = useCallback((position: number) => {
    if (!session) return;
    
    const now = getServerTime();
    
    // Update session
    supabase
      .from('sync_sessions')
      .update({
        is_playing: true,
        start_timestamp: now,
        current_position: position,
      })
      .eq('id', session.id)
      .then(() => {
        broadcastEvent('play', { position });
      });
  }, [session, getServerTime, broadcastEvent]);

  // Broadcast pause
  const broadcastPause = useCallback((position: number) => {
    if (!session) return;
    
    // Update session
    supabase
      .from('sync_sessions')
      .update({
        is_playing: false,
        current_position: position,
        start_timestamp: null,
      })
      .eq('id', session.id)
      .then(() => {
        broadcastEvent('pause', { position });
      });
  }, [session, broadcastEvent]);

  // Broadcast seek
  const broadcastSeek = useCallback((position: number) => {
    if (!session) return;
    
    const now = getServerTime();
    
    // Update session
    supabase
      .from('sync_sessions')
      .update({
        current_position: position,
        start_timestamp: session.isPlaying ? now : null,
      })
      .eq('id', session.id)
      .then(() => {
        broadcastEvent('seek', { position });
      });
  }, [session, getServerTime, broadcastEvent]);

  // Broadcast song change
  const broadcastSongChange = useCallback((video: Video, position: number = 0) => {
    if (!session) return;
    
    const now = getServerTime();
    
    // Update session
    supabase
      .from('sync_sessions')
      .update({
        current_video_id: video.id,
        current_video_title: video.title,
        current_video_thumbnail: video.thumbnail,
        current_video_channel: video.channelTitle,
        current_position: position,
        start_timestamp: now,
        is_playing: true,
      })
      .eq('id', session.id)
      .then(() => {
        broadcastEvent('song_change', { video, position });
      });
  }, [session, getServerTime, broadcastEvent]);

  // Broadcast stop
  const broadcastStop = useCallback(() => {
    if (!session) return;
    
    // Update session
    supabase
      .from('sync_sessions')
      .update({
        is_playing: false,
        current_position: 0,
        start_timestamp: null,
      })
      .eq('id', session.id)
      .then(() => {
        broadcastEvent('stop', {});
      });
  }, [session, broadcastEvent]);

  // Register sync event callback
  const onSyncEvent = useCallback((callback: (event: SyncEvent) => void) => {
    syncEventCallbackRef.current = callback;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  return {
    session,
    participants,
    isHost,
    isConnected,
    isSyncing,
    createSession,
    joinSession,
    leaveSession,
    endSession,
    broadcastPlay,
    broadcastPause,
    broadcastSeek,
    broadcastSongChange,
    broadcastStop,
    getCurrentSyncPosition,
    measureLatency,
    onSyncEvent,
  };
};
