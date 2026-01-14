import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Video } from '@/contexts/AudioPlayerContext';
import { RealtimeChannel } from '@supabase/supabase-js';

// Sync event types
export type SyncEventType = 
  | 'play' | 'pause' | 'seek' | 'stop' | 'song_change' | 'heartbeat'
  | 'queue_add' | 'queue_remove' | 'queue_reorder' | 'queue_clear'
  | 'vote_cast' | 'vote_skip' | 'chat_message' | 'reaction'
  | 'host_transfer' | 'cohost_add' | 'cohost_remove'
  | 'session_lock' | 'session_unlock' | 'member_kick';

export interface SyncEvent {
  event: SyncEventType;
  timestamp: number;
  position?: number;
  video?: Video;
  payload?: Record<string, any>;
  senderId?: string;
}

export interface QueueItem {
  id: string;
  video: Video;
  addedBy: string;
  addedAt: number;
  votes: number;
  voterIds: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  type: 'text' | 'reaction' | 'system';
}

export interface SyncSession {
  id: string;
  syncKey: string;
  hostUserId: string;
  cohostIds: string[];
  currentVideo: Video | null;
  startTimestamp: number | null;
  currentPosition: number;
  isPlaying: boolean;
  status: 'active' | 'paused' | 'ended';
  isLocked: boolean;
  votingPolicy: 'majority' | 'host_override' | 'free';
  queue: QueueItem[];
  createdAt: number;
}

export interface SyncParticipant {
  id: string;
  participantId: string;
  deviceId: string;
  userId: string | null;
  displayName: string | null;
  avatar?: string;
  isHost: boolean;
  isCohost: boolean;
  latencyMs: number;
  status: 'connected' | 'disconnected' | 'syncing';
  deviceType: 'phone' | 'tablet' | 'desktop' | 'tv' | 'speaker' | 'car';
  role: 'controller' | 'playback' | 'listener';
  joinedAt: number;
}

// Constants
const DRIFT_THRESHOLD_MS = 100; // Sub-100ms sync accuracy target
const DRIFT_CHECK_INTERVAL = 2000;
const HEARTBEAT_INTERVAL = 3000;
const JITTER_BUFFER_SIZE = 5;
const MAX_PARTICIPANTS = 30;

// Generate unique sync key format: XT-XXXXXX
const generateSyncKey = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

// Detect device type
const detectDeviceType = (): SyncParticipant['deviceType'] => {
  const ua = navigator.userAgent.toLowerCase();
  if (/android.*mobile|iphone|ipod/.test(ua)) return 'phone';
  if (/android|ipad|tablet/.test(ua)) return 'tablet';
  if (/smart-tv|smarttv|googletv|appletv|hbbtv/.test(ua)) return 'tv';
  return 'desktop';
};

export const useMusicSyncAdvanced = () => {
  const { user, profile } = useAuth();
  const deviceId = useRef(getDeviceId());
  const deviceType = useRef(detectDeviceType());
  
  // State
  const [session, setSession] = useState<SyncSession | null>(null);
  const [participants, setParticipants] = useState<SyncParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Refs for realtime
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const driftCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncEventCallbackRef = useRef<((event: SyncEvent) => void) | null>(null);
  const serverTimeOffsetRef = useRef<number>(0);
  const latencyRef = useRef<number>(50);
  const latencySamplesRef = useRef<number[]>([]);
  const participantIdRef = useRef<string>('');
  
  const isHost = session?.hostUserId === user?.id;
  const isCohost = session?.cohostIds?.includes(user?.id || '') || false;
  const canControl = isHost || isCohost || (session && !session.isLocked);

  // Measure network latency with jitter buffer
  const measureLatency = useCallback(async (): Promise<number> => {
    const samples: number[] = [];
    
    for (let i = 0; i < JITTER_BUFFER_SIZE; i++) {
      const start = performance.now();
      try {
        await supabase.from('sync_sessions').select('id').limit(1);
        const rtt = performance.now() - start;
        samples.push(rtt / 2);
      } catch {
        samples.push(50);
      }
    }
    
    // Sort and remove outliers
    samples.sort((a, b) => a - b);
    const trimmed = samples.slice(1, -1); // Remove min and max
    const median = trimmed[Math.floor(trimmed.length / 2)] || 50;
    
    latencySamplesRef.current.push(median);
    if (latencySamplesRef.current.length > 10) {
      latencySamplesRef.current.shift();
    }
    
    // Use rolling average
    const avgLatency = latencySamplesRef.current.reduce((a, b) => a + b, 0) / latencySamplesRef.current.length;
    latencyRef.current = Math.round(avgLatency);
    
    return latencyRef.current;
  }, []);

  // Get synchronized server timestamp with latency compensation
  const getServerTime = useCallback((): number => {
    return Date.now() + serverTimeOffsetRef.current + latencyRef.current;
  }, []);

  // Calculate current sync position with drift compensation
  const getCurrentSyncPosition = useCallback((): number => {
    if (!session || !session.startTimestamp || !session.isPlaying) {
      return session?.currentPosition || 0;
    }
    
    const elapsed = (getServerTime() - session.startTimestamp) / 1000;
    return session.currentPosition + elapsed;
  }, [session, getServerTime]);

  // Subscribe to realtime events
  const subscribeToSession = useCallback(async (sessionId: string) => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`sync_${sessionId}`)
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
            setParticipants(prev => {
              if (prev.length >= MAX_PARTICIPANTS) return prev;
              if (prev.find(p => p.deviceId === data.device_id)) return prev;
              return [...prev, {
                id: data.id,
                participantId: data.id,
                deviceId: data.device_id,
                userId: data.user_id,
                displayName: data.display_name,
                isHost: data.is_host,
                isCohost: false,
                latencyMs: data.latency_ms,
                status: data.status,
                deviceType: 'desktop',
                role: 'controller',
                joinedAt: Date.now(),
              }];
            });
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
          
          if (data.sender_device_id === deviceId.current) return;
          
          const event: SyncEvent = {
            event: data.event_type,
            timestamp: data.timestamp,
            position: data.payload?.position,
            video: data.payload?.video,
            payload: data.payload,
            senderId: data.sender_device_id,
          };
          
          // Handle queue events
          if (event.event === 'queue_add' && event.payload?.item) {
            setQueue(prev => [...prev, event.payload!.item]);
          } else if (event.event === 'queue_remove' && event.payload?.itemId) {
            setQueue(prev => prev.filter(q => q.id !== event.payload!.itemId));
          } else if (event.event === 'queue_clear') {
            setQueue([]);
          } else if (event.event === 'chat_message' && event.payload?.message) {
            setChatMessages(prev => [...prev, event.payload!.message].slice(-100));
          }
          
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

  // Start heartbeat with latency measurement
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
    }, HEARTBEAT_INTERVAL);
  }, [measureLatency]);

  // Create a new sync session
  const createSession = useCallback(async (video: Video, options?: {
    votingPolicy?: SyncSession['votingPolicy'];
    isLocked?: boolean;
  }): Promise<string | null> => {
    if (!user) {
      console.error('[MusicSync] User must be logged in to create session');
      return null;
    }

    try {
      await measureLatency();
      const syncKey = generateSyncKey();
      const now = getServerTime();

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

      participantIdRef.current = participantData.id;

      setSession({
        id: sessionData.id,
        syncKey: sessionData.sync_key,
        hostUserId: sessionData.host_user_id,
        cohostIds: [],
        currentVideo: video,
        startTimestamp: sessionData.start_timestamp,
        currentPosition: sessionData.current_position,
        isPlaying: sessionData.is_playing,
        status: sessionData.status as 'active',
        isLocked: options?.isLocked || false,
        votingPolicy: options?.votingPolicy || 'free',
        queue: [],
        createdAt: Date.now(),
      });

      setParticipants([{
        id: participantData.id,
        participantId: participantData.id,
        deviceId: participantData.device_id,
        userId: participantData.user_id,
        displayName: participantData.display_name,
        isHost: participantData.is_host,
        isCohost: false,
        latencyMs: participantData.latency_ms,
        status: participantData.status as 'connected',
        deviceType: deviceType.current,
        role: 'controller',
        joinedAt: Date.now(),
      }]);

      await subscribeToSession(sessionData.id);
      startHeartbeat(sessionData.id, participantData.id);

      console.log(`[MusicSync] Created session: ${syncKey}`);
      return syncKey;
    } catch (error) {
      console.error('[MusicSync] Error creating session:', error);
      return null;
    }
  }, [user, profile, measureLatency, getServerTime, subscribeToSession, startHeartbeat]);

  // Join an existing session with cold-join catch-up
  const joinSession = useCallback(async (syncKey: string, displayName?: string): Promise<boolean> => {
    try {
      setIsSyncing(true);
      await measureLatency();

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

      // Check participant limit
      const { count } = await supabase
        .from('sync_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionData.id);

      if ((count || 0) >= MAX_PARTICIPANTS) {
        console.error('[MusicSync] Session full');
        setIsSyncing(false);
        return false;
      }

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

      participantIdRef.current = participantData.id;

      const { data: allParticipants } = await supabase
        .from('sync_participants')
        .select('*')
        .eq('session_id', sessionData.id);

      setSession({
        id: sessionData.id,
        syncKey: sessionData.sync_key,
        hostUserId: sessionData.host_user_id,
        cohostIds: [],
        currentVideo: sessionData.current_video_id ? {
          id: sessionData.current_video_id,
          title: sessionData.current_video_title || '',
          thumbnail: sessionData.current_video_thumbnail || '',
          channelTitle: sessionData.current_video_channel || '',
        } : null,
        startTimestamp: sessionData.start_timestamp,
        currentPosition: sessionData.current_position,
        isPlaying: sessionData.is_playing,
        status: sessionData.status as 'active',
        isLocked: false,
        votingPolicy: 'free',
        queue: [],
        createdAt: Date.parse(sessionData.created_at),
      });

      setParticipants((allParticipants || []).map((p: any) => ({
        id: p.id,
        participantId: p.id,
        deviceId: p.device_id,
        userId: p.user_id,
        displayName: p.display_name,
        isHost: p.is_host,
        isCohost: false,
        latencyMs: p.latency_ms,
        status: p.status as 'connected' | 'disconnected' | 'syncing',
        deviceType: 'desktop',
        role: 'controller',
        joinedAt: Date.parse(p.joined_at),
      })));

      await subscribeToSession(sessionData.id);
      startHeartbeat(sessionData.id, participantData.id);

      // Quick status update for cold-join
      setTimeout(async () => {
        await supabase
          .from('sync_participants')
          .update({ status: 'connected' })
          .eq('id', participantData.id);
        setIsSyncing(false);
      }, 500);

      console.log(`[MusicSync] Joined session: ${syncKey}`);
      return true;
    } catch (error) {
      console.error('[MusicSync] Error joining session:', error);
      setIsSyncing(false);
      return false;
    }
  }, [user, profile, measureLatency, subscribeToSession, startHeartbeat]);

  // Leave session
  const leaveSession = useCallback(async () => {
    if (!session) return;

    try {
      await supabase
        .from('sync_participants')
        .delete()
        .eq('session_id', session.id)
        .eq('device_id', deviceId.current);

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
      setQueue([]);
      setChatMessages([]);
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
      await supabase
        .from('sync_sessions')
        .update({ status: 'ended' })
        .eq('id', session.id);

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
      setQueue([]);
      setChatMessages([]);
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
    if (!session) return;

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
  }, [session, getServerTime]);

  // Playback controls (host/cohost only)
  const broadcastPlay = useCallback((position: number) => {
    if (!session || !canControl) return;
    
    const now = getServerTime();
    
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
  }, [session, canControl, getServerTime, broadcastEvent]);

  const broadcastPause = useCallback((position: number) => {
    if (!session || !canControl) return;
    
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
  }, [session, canControl, broadcastEvent]);

  const broadcastSeek = useCallback((position: number) => {
    if (!session || !canControl) return;
    
    const now = getServerTime();
    
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
  }, [session, canControl, getServerTime, broadcastEvent]);

  const broadcastSongChange = useCallback((video: Video, position: number = 0) => {
    if (!session || !canControl) return;
    
    const now = getServerTime();
    
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
  }, [session, canControl, getServerTime, broadcastEvent]);

  const broadcastStop = useCallback(() => {
    if (!session || !canControl) return;
    
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
  }, [session, canControl, broadcastEvent]);

  // Queue management
  const addToQueue = useCallback(async (video: Video) => {
    if (!session) return;

    const item: QueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      video,
      addedBy: user?.id || deviceId.current,
      addedAt: Date.now(),
      votes: 0,
      voterIds: [],
    };

    setQueue(prev => [...prev, item]);
    await broadcastEvent('queue_add', { item });
  }, [session, user, broadcastEvent]);

  const removeFromQueue = useCallback(async (itemId: string) => {
    if (!session || !canControl) return;

    setQueue(prev => prev.filter(q => q.id !== itemId));
    await broadcastEvent('queue_remove', { itemId });
  }, [session, canControl, broadcastEvent]);

  const clearQueue = useCallback(async () => {
    if (!session || !canControl) return;

    setQueue([]);
    await broadcastEvent('queue_clear', {});
  }, [session, canControl, broadcastEvent]);

  const voteForSong = useCallback(async (itemId: string) => {
    if (!session) return;

    setQueue(prev => prev.map(item => {
      if (item.id === itemId) {
        const voterId = user?.id || deviceId.current;
        if (item.voterIds.includes(voterId)) return item;
        return {
          ...item,
          votes: item.votes + 1,
          voterIds: [...item.voterIds, voterId],
        };
      }
      return item;
    }));

    await broadcastEvent('vote_cast', { itemId, voterId: user?.id || deviceId.current });
  }, [session, user, broadcastEvent]);

  // Chat functionality
  const sendChatMessage = useCallback(async (message: string) => {
    if (!session || !message.trim()) return;

    const chatMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId: user?.id || deviceId.current,
      senderName: profile?.display_name || 'Guest',
      message: message.trim(),
      timestamp: Date.now(),
      type: 'text',
    };

    setChatMessages(prev => [...prev, chatMsg].slice(-100));
    await broadcastEvent('chat_message', { message: chatMsg });
  }, [session, user, profile, broadcastEvent]);

  const sendReaction = useCallback(async (emoji: string) => {
    if (!session) return;

    const reaction: ChatMessage = {
      id: `reaction_${Date.now()}`,
      senderId: user?.id || deviceId.current,
      senderName: profile?.display_name || 'Guest',
      message: emoji,
      timestamp: Date.now(),
      type: 'reaction',
    };

    setChatMessages(prev => [...prev, reaction].slice(-100));
    await broadcastEvent('reaction', { reaction });
  }, [session, user, profile, broadcastEvent]);

  // Host transfer
  const transferHost = useCallback(async (newHostUserId: string) => {
    if (!session || !isHost) return;

    await broadcastEvent('host_transfer', { newHostUserId });
    
    // Update session in database would need a migration
    // For now, we just broadcast the event
  }, [session, isHost, broadcastEvent]);

  // Add/remove cohost
  const addCohost = useCallback(async (userId: string) => {
    if (!session || !isHost) return;
    
    setSession(prev => prev ? {
      ...prev,
      cohostIds: [...prev.cohostIds, userId],
    } : null);

    await broadcastEvent('cohost_add', { userId });
  }, [session, isHost, broadcastEvent]);

  const removeCohost = useCallback(async (userId: string) => {
    if (!session || !isHost) return;
    
    setSession(prev => prev ? {
      ...prev,
      cohostIds: prev.cohostIds.filter(id => id !== userId),
    } : null);

    await broadcastEvent('cohost_remove', { userId });
  }, [session, isHost, broadcastEvent]);

  // Session lock/unlock
  const lockSession = useCallback(async () => {
    if (!session || !isHost) return;
    
    setSession(prev => prev ? { ...prev, isLocked: true } : null);
    await broadcastEvent('session_lock', {});
  }, [session, isHost, broadcastEvent]);

  const unlockSession = useCallback(async () => {
    if (!session || !isHost) return;
    
    setSession(prev => prev ? { ...prev, isLocked: false } : null);
    await broadcastEvent('session_unlock', {});
  }, [session, isHost, broadcastEvent]);

  // Kick member
  const kickMember = useCallback(async (participantId: string) => {
    if (!session || !isHost) return;

    await supabase
      .from('sync_participants')
      .delete()
      .eq('id', participantId);

    await broadcastEvent('member_kick', { participantId });
  }, [session, isHost, broadcastEvent]);

  // Register sync event callback
  const onSyncEvent = useCallback((callback: (event: SyncEvent) => void) => {
    syncEventCallbackRef.current = callback;
  }, []);

  // Get QR code data URL
  const getQRCodeData = useCallback(() => {
    if (!session) return null;
    return `https://xtplayer.lovable.app?join=${session.syncKey}`;
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (driftCheckIntervalRef.current) {
        clearInterval(driftCheckIntervalRef.current);
      }
    };
  }, []);

  return {
    // Session state
    session,
    participants,
    isHost,
    isCohost,
    canControl,
    isConnected,
    isSyncing,
    queue,
    chatMessages,
    
    // Session management
    createSession,
    joinSession,
    leaveSession,
    endSession,
    
    // Playback events
    broadcastPlay,
    broadcastPause,
    broadcastSeek,
    broadcastSongChange,
    broadcastStop,
    
    // Queue management
    addToQueue,
    removeFromQueue,
    clearQueue,
    voteForSong,
    
    // Chat
    sendChatMessage,
    sendReaction,
    
    // Host controls
    transferHost,
    addCohost,
    removeCohost,
    lockSession,
    unlockSession,
    kickMember,
    
    // Sync utilities
    getCurrentSyncPosition,
    measureLatency,
    getQRCodeData,
    
    // Event callback
    onSyncEvent,
    
    // Constants
    MAX_PARTICIPANTS,
    DRIFT_THRESHOLD_MS,
  };
};
