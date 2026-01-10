import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useMusicSync, SyncSession, SyncParticipant, SyncEvent } from '@/hooks/useMusicSync';
import { useAudioPlayer, Video } from '@/contexts/AudioPlayerContext';
import { toast } from 'sonner';

interface MusicSyncContextType {
  // Session state
  session: SyncSession | null;
  participants: SyncParticipant[];
  isHost: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  isSyncActive: boolean;
  
  // Session management
  startSyncSession: () => Promise<string | null>;
  joinSyncSession: (syncKey: string, displayName?: string) => Promise<boolean>;
  leaveSyncSession: () => Promise<void>;
  endSyncSession: () => Promise<void>;
  
  // Sync info
  syncKey: string | null;
  participantCount: number;
}

const MusicSyncContext = createContext<MusicSyncContextType | undefined>(undefined);

// Drift correction constants
const DRIFT_THRESHOLD_MS = 500; // Correct if drift > 500ms
const DRIFT_CHECK_INTERVAL = 3000; // Check every 3 seconds
const MAX_SEEK_ADJUSTMENT = 2; // Max 2 second adjustment

export const MusicSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const {
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
    onSyncEvent,
  } = useMusicSync();

  const {
    currentVideo,
    isPlaying,
    progress,
    play,
    pause,
    resume,
    seek,
    stop,
  } = useAudioPlayer();

  const [isSyncActive, setIsSyncActive] = useState(false);
  const driftCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  const isProcessingEventRef = useRef<boolean>(false);

  // Start sync session with current video
  const startSyncSession = useCallback(async (): Promise<string | null> => {
    if (!currentVideo) {
      toast.error('Play a song first to start a sync session');
      return null;
    }

    const syncKey = await createSession(currentVideo);
    if (syncKey) {
      setIsSyncActive(true);
      toast.success(`Sync session created! Key: ${syncKey}`);
    }
    return syncKey;
  }, [currentVideo, createSession]);

  // Join sync session
  const joinSyncSession = useCallback(async (syncKey: string, displayName?: string): Promise<boolean> => {
    const success = await joinSession(syncKey, displayName);
    if (success) {
      setIsSyncActive(true);
      toast.success('Joined sync session!');
    } else {
      toast.error('Failed to join session. Check the sync key.');
    }
    return success;
  }, [joinSession]);

  // Leave sync session
  const leaveSyncSession = useCallback(async () => {
    await leaveSession();
    setIsSyncActive(false);
    toast.info('Left sync session');
  }, [leaveSession]);

  // End sync session
  const endSyncSession = useCallback(async () => {
    await endSession();
    setIsSyncActive(false);
    toast.info('Sync session ended');
  }, [endSession]);

  // Handle incoming sync events (for participants)
  useEffect(() => {
    if (!isSyncActive || isHost) return;

    onSyncEvent((event: SyncEvent) => {
      if (isProcessingEventRef.current) return;
      isProcessingEventRef.current = true;

      console.log('[MusicSync] Received event:', event);

      switch (event.event) {
        case 'play':
          if (event.position !== undefined) {
            seek(event.position);
            resume();
          }
          break;

        case 'pause':
          if (event.position !== undefined) {
            seek(event.position);
          }
          pause();
          break;

        case 'seek':
          if (event.position !== undefined) {
            seek(event.position);
          }
          break;

        case 'song_change':
          if (event.video) {
            play(event.video);
            if (event.position !== undefined && event.position > 0) {
              setTimeout(() => seek(event.position!), 500);
            }
          }
          break;

        case 'stop':
          stop();
          break;
      }

      setTimeout(() => {
        isProcessingEventRef.current = false;
      }, 100);
    });
  }, [isSyncActive, isHost, onSyncEvent, play, pause, resume, seek, stop]);

  // Sync initial state when joining
  useEffect(() => {
    if (!isSyncActive || !session || isHost) return;

    // Load the current song and sync to position
    if (session.currentVideo && (!currentVideo || currentVideo.id !== session.currentVideo.id)) {
      play(session.currentVideo);
      
      // Calculate catch-up position
      const targetPosition = getCurrentSyncPosition();
      setTimeout(() => {
        seek(targetPosition);
        if (session.isPlaying) {
          resume();
        } else {
          pause();
        }
      }, 1000);
    }
  }, [isSyncActive, session, isHost, currentVideo, play, pause, resume, seek, getCurrentSyncPosition]);

  // Drift correction for participants
  useEffect(() => {
    if (!isSyncActive || isHost || !session?.isPlaying) {
      if (driftCheckIntervalRef.current) {
        clearInterval(driftCheckIntervalRef.current);
        driftCheckIntervalRef.current = null;
      }
      return;
    }

    driftCheckIntervalRef.current = setInterval(() => {
      const targetPosition = getCurrentSyncPosition();
      const drift = Math.abs(targetPosition - progress);

      if (drift > DRIFT_THRESHOLD_MS / 1000) {
        // Apply correction with max limit
        const adjustment = Math.min(drift, MAX_SEEK_ADJUSTMENT);
        const correctedPosition = progress < targetPosition 
          ? progress + adjustment 
          : progress - adjustment;

        console.log(`[MusicSync] Drift correction: ${drift.toFixed(2)}s, adjusting to ${correctedPosition.toFixed(2)}s`);
        seek(correctedPosition);
      }
    }, DRIFT_CHECK_INTERVAL);

    return () => {
      if (driftCheckIntervalRef.current) {
        clearInterval(driftCheckIntervalRef.current);
      }
    };
  }, [isSyncActive, isHost, session?.isPlaying, progress, getCurrentSyncPosition, seek]);

  // Host broadcasts playback changes
  useEffect(() => {
    if (!isSyncActive || !isHost) return;

    // Debounce broadcasts
    const now = Date.now();
    if (now - lastBroadcastRef.current < 200) return;
    lastBroadcastRef.current = now;

    // This effect runs when isPlaying changes
    if (isPlaying) {
      broadcastPlay(progress);
    } else {
      broadcastPause(progress);
    }
  }, [isSyncActive, isHost, isPlaying, progress, broadcastPlay, broadcastPause]);

  // Host broadcasts song changes
  useEffect(() => {
    if (!isSyncActive || !isHost || !currentVideo) return;

    // Check if song changed
    if (session?.currentVideo?.id !== currentVideo.id) {
      broadcastSongChange(currentVideo, 0);
    }
  }, [isSyncActive, isHost, currentVideo, session?.currentVideo?.id, broadcastSongChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driftCheckIntervalRef.current) {
        clearInterval(driftCheckIntervalRef.current);
      }
    };
  }, []);

  return (
    <MusicSyncContext.Provider
      value={{
        session,
        participants,
        isHost,
        isConnected,
        isSyncing,
        isSyncActive,
        startSyncSession,
        joinSyncSession,
        leaveSyncSession,
        endSyncSession,
        syncKey: session?.syncKey || null,
        participantCount: participants.length,
      }}
    >
      {children}
    </MusicSyncContext.Provider>
  );
};

export const useMusicSyncContext = () => {
  const context = useContext(MusicSyncContext);
  if (!context) {
    throw new Error('useMusicSyncContext must be used within a MusicSyncProvider');
  }
  return context;
};
