import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FreeTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  streamUrl: string;
  duration: number;
  genre?: string;
}

export interface CuratedPlaylist {
  name: string;
  genre: string;
  tracks: FreeTrack[];
}

export interface HomeData {
  trending: FreeTrack[];
  playlists: CuratedPlaylist[];
}

export const useFreeMusicCatalog = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callMusicCatalog = useCallback(async (action: string, params: Record<string, any> = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('music-catalog', {
        body: { action, ...params }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch music';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTrending = useCallback(async (limit?: number): Promise<FreeTrack[]> => {
    const result = await callMusicCatalog('trending', { limit });
    return result || [];
  }, [callMusicCatalog]);

  const search = useCallback(async (query: string, limit?: number): Promise<FreeTrack[]> => {
    const result = await callMusicCatalog('search', { query, limit });
    return result || [];
  }, [callMusicCatalog]);

  const getByGenre = useCallback(async (genre: string, limit?: number): Promise<FreeTrack[]> => {
    const result = await callMusicCatalog('genre', { genre, limit });
    return result || [];
  }, [callMusicCatalog]);

  const getSimilar = useCallback(async (trackId: string, limit?: number): Promise<FreeTrack[]> => {
    const result = await callMusicCatalog('similar', { trackId, limit });
    return result || [];
  }, [callMusicCatalog]);

  const getPlaylists = useCallback(async (): Promise<CuratedPlaylist[]> => {
    const result = await callMusicCatalog('playlists');
    return result || [];
  }, [callMusicCatalog]);

  const getHomeData = useCallback(async (): Promise<HomeData | null> => {
    const result = await callMusicCatalog('home');
    return result;
  }, [callMusicCatalog]);

  // Convert FreeTrack to Video format for the player
  const toVideoFormat = useCallback((track: FreeTrack) => ({
    id: `free_${track.id}`,
    title: track.title,
    thumbnail: track.thumbnail,
    channelTitle: track.artist,
    duration: formatDuration(track.duration),
    streamUrl: track.streamUrl, // Direct audio URL
  }), []);

  return {
    isLoading,
    error,
    getTrending,
    search,
    getByGenre,
    getSimilar,
    getPlaylists,
    getHomeData,
    toVideoFormat,
  };
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
