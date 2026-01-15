// Smart Autoplay Hook using YouTube Music Edge Function + AI Enhancement
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { YTSong } from './useYTMusicAPI';

export interface AutoplayConfig {
  enabled: boolean;
  shuffle: boolean;
  seedVideoId: string | null;
}

interface AutoplayState {
  queue: YTSong[];
  history: string[];
  isBuilding: boolean;
  error: string | null;
}

const QUEUE_SIZE = 20;
const HISTORY_SIZE = 50;
const PRELOAD_THRESHOLD = 3;
const SKIP_PENALTY_KEY = 'autoplay_skip_data';

export const useSmartAutoplay = () => {
  const [state, setState] = useState<AutoplayState>({
    queue: [],
    history: [],
    isBuilding: false,
    error: null,
  });

  const skipDataRef = useRef<Map<string, number>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load skip data on mount
  useEffect(() => {
    const stored = localStorage.getItem(SKIP_PENALTY_KEY);
    if (stored) {
      try {
        skipDataRef.current = new Map(Object.entries(JSON.parse(stored)));
      } catch (e) {
        console.error('[SmartAutoplay] Failed to load skip data:', e);
      }
    }
  }, []);

  // Save skip data
  const saveSkipData = useCallback(() => {
    const obj = Object.fromEntries(skipDataRef.current);
    localStorage.setItem(SKIP_PENALTY_KEY, JSON.stringify(obj));
  }, []);

  // Record skip for learning
  const recordSkip = useCallback((videoId: string) => {
    const count = (skipDataRef.current.get(videoId) || 0) + 1;
    skipDataRef.current.set(videoId, count);
    saveSkipData();
    console.log(`[SmartAutoplay] Recorded skip for ${videoId}, count: ${count}`);
  }, [saveSkipData]);

  // Fetch related songs using YouTube Music edge function
  const fetchRelatedSongs = useCallback(async (videoId: string): Promise<YTSong[]> => {
    try {
      console.log(`[SmartAutoplay] Fetching related songs for: ${videoId}`);
      
      const { data, error } = await supabase.functions.invoke('youtube-music', {
        body: { action: 'related', videoId, limit: 25 }
      });

      if (error) throw error;
      
      const songs = data?.data || [];
      console.log(`[SmartAutoplay] Got ${songs.length} related songs`);
      return songs;
    } catch (err) {
      console.error('[SmartAutoplay] Error fetching related:', err);
      return [];
    }
  }, []);

  // Get AI-enhanced suggestions based on current song and history
  const getAISuggestions = useCallback(async (
    currentSong: { title: string; artist: string },
    recentHistory: string[]
  ): Promise<string[]> => {
    try {
      console.log('[SmartAutoplay] Getting AI suggestions...');
      
      const { data, error } = await supabase.functions.invoke('smart-suggestions', {
        body: {
          currentSong,
          recentHistory: recentHistory.slice(0, 10),
        }
      });

      if (error) throw error;
      
      const suggestions = data?.suggestions || [];
      console.log(`[SmartAutoplay] Got ${suggestions.length} AI suggestions`);
      return suggestions;
    } catch (err) {
      console.error('[SmartAutoplay] AI suggestions error:', err);
      return [];
    }
  }, []);

  // Search for songs using suggestions
  const searchSongs = useCallback(async (query: string): Promise<YTSong[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-music', {
        body: { action: 'search', query, limit: 8 }
      });

      if (error) throw error;
      return data?.data?.songs || [];
    } catch (err) {
      console.error('[SmartAutoplay] Search error:', err);
      return [];
    }
  }, []);

  // Rank and filter songs
  const rankSongs = useCallback((
    songs: YTSong[],
    historyIds: Set<string>,
    currentArtist: string
  ): YTSong[] => {
    const seen = new Set<string>();
    
    return songs
      .filter(song => {
        // Deduplicate
        if (seen.has(song.videoId) || historyIds.has(song.videoId)) return false;
        seen.add(song.videoId);
        return true;
      })
      .map(song => {
        let adjustedScore = song.score || 50;
        
        // Same artist bonus
        if (song.artist.toLowerCase() === currentArtist.toLowerCase()) {
          adjustedScore += 15;
        }
        
        // Verified/Official bonus
        if (song.isVerified) adjustedScore += 10;
        if (song.isOfficial) adjustedScore += 10;
        
        // Skip penalty
        const skips = skipDataRef.current.get(song.videoId) || 0;
        if (skips >= 3) adjustedScore -= 30;
        else if (skips >= 1) adjustedScore -= skips * 5;
        
        // Random variety factor (5% randomness for discovery)
        adjustedScore += Math.random() * 5;
        
        return { ...song, score: adjustedScore };
      })
      .sort((a, b) => b.score - a.score);
  }, []);

  // Build autoplay queue from a seed song
  const buildQueue = useCallback(async (
    seedSong: { videoId: string; title: string; artist: string },
    existingHistory: string[] = []
  ): Promise<YTSong[]> => {
    // Cancel any ongoing build
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isBuilding: true, error: null }));
    console.log(`[SmartAutoplay] Building queue from: "${seedSong.title}" by ${seedSong.artist}`);

    const historyIds = new Set([seedSong.videoId, ...existingHistory]);
    let allSongs: YTSong[] = [];

    try {
      // Step 1: Get related songs from YouTube
      const relatedSongs = await fetchRelatedSongs(seedSong.videoId);
      allSongs.push(...relatedSongs);

      // Step 2: Get AI-enhanced suggestions for variety
      const aiSuggestions = await getAISuggestions(
        { title: seedSong.title, artist: seedSong.artist },
        existingHistory
      );

      // Step 3: Search for AI suggestions in parallel
      if (aiSuggestions.length > 0) {
        const searchPromises = aiSuggestions.slice(0, 3).map(query => searchSongs(query));
        const searchResults = await Promise.all(searchPromises);
        searchResults.forEach(songs => allSongs.push(...songs));
      }

      // Step 4: Rank and deduplicate
      const rankedSongs = rankSongs(allSongs, historyIds, seedSong.artist);
      const finalQueue = rankedSongs.slice(0, QUEUE_SIZE);

      setState(prev => ({
        ...prev,
        queue: finalQueue,
        isBuilding: false,
        history: [...prev.history.slice(-HISTORY_SIZE), seedSong.videoId],
      }));

      console.log(`[SmartAutoplay] Queue built with ${finalQueue.length} songs`);
      return finalQueue;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to build queue';
      console.error('[SmartAutoplay] Build error:', error);
      setState(prev => ({ ...prev, isBuilding: false, error }));
      return [];
    }
  }, [fetchRelatedSongs, getAISuggestions, searchSongs, rankSongs]);

  // Get next song from queue
  const getNext = useCallback((): YTSong | null => {
    if (state.queue.length === 0) return null;
    
    const next = state.queue[0];
    setState(prev => ({
      ...prev,
      queue: prev.queue.slice(1),
      history: [...prev.history.slice(-HISTORY_SIZE), next.videoId],
    }));

    // Preload more if running low
    if (state.queue.length <= PRELOAD_THRESHOLD && state.queue.length > 0) {
      const lastSong = state.queue[state.queue.length - 1];
      buildQueue(
        { videoId: lastSong.videoId, title: lastSong.title, artist: lastSong.artist },
        state.history
      );
    }

    return next;
  }, [state.queue, state.history, buildQueue]);

  // Add song to history (called when user manually plays)
  const addToHistory = useCallback((videoId: string) => {
    setState(prev => ({
      ...prev,
      history: [...prev.history.slice(-HISTORY_SIZE), videoId],
    }));
  }, []);

  // Remove from queue
  const removeFromQueue = useCallback((videoId: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.filter(s => s.videoId !== videoId),
    }));
  }, []);

  // Clear queue
  const clearQueue = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(prev => ({ ...prev, queue: [], isBuilding: false }));
  }, []);

  // Shuffle queue
  const shuffleQueue = useCallback(() => {
    setState(prev => {
      const shuffled = [...prev.queue];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { ...prev, queue: shuffled };
    });
  }, []);

  return {
    queue: state.queue,
    history: state.history,
    isBuilding: state.isBuilding,
    error: state.error,
    buildQueue,
    getNext,
    addToHistory,
    removeFromQueue,
    clearQueue,
    shuffleQueue,
    recordSkip,
  };
};
