import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface YTSong {
  videoId: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  views: string;
  isOfficial: boolean;
  isVerified: boolean;
  score: number;
}

export interface SearchResult {
  query: string;
  songs: YTSong[];
  suggestions: string[];
}

export interface ArtistInfo {
  artist: string;
  verified: boolean;
  channelId: string;
  topTracks: YTSong[];
  thumbnail: string;
}

export interface HomeFeed {
  trending: YTSong[];
  genres: { name: string; songs: YTSong[] }[];
}

export const useYTMusicAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callYTMusic = useCallback(async (action: string, params: Record<string, any> = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('youtube-music', {
        body: { action, ...params }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data?.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch music';
      setError(message);
      console.error('[YTMusic]', message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search for songs
  const search = useCallback(async (query: string, limit?: number): Promise<SearchResult | null> => {
    const result = await callYTMusic('search', { query, limit });
    return result;
  }, [callYTMusic]);

  // Get search suggestions
  const getSuggestions = useCallback(async (query: string): Promise<string[]> => {
    const result = await callYTMusic('suggestions', { query });
    return result || [];
  }, [callYTMusic]);

  // Get trending songs
  const getTrending = useCallback(async (limit?: number): Promise<YTSong[]> => {
    const result = await callYTMusic('trending', { limit });
    return result || [];
  }, [callYTMusic]);

  // Get related songs (for autoplay/radio)
  const getRelated = useCallback(async (videoId: string, limit?: number): Promise<YTSong[]> => {
    const result = await callYTMusic('related', { videoId, limit });
    return result || [];
  }, [callYTMusic]);

  // Get artist info
  const getArtist = useCallback(async (channelId: string): Promise<ArtistInfo | null> => {
    const result = await callYTMusic('artist', { channelId });
    return result;
  }, [callYTMusic]);

  // Get home feed
  const getHomeFeed = useCallback(async (): Promise<HomeFeed | null> => {
    const result = await callYTMusic('home');
    return result;
  }, [callYTMusic]);

  // Convert YTSong to Video format for the player
  const toVideoFormat = useCallback((song: YTSong) => ({
    id: song.videoId,
    title: song.title,
    thumbnail: song.thumbnail,
    channelTitle: song.artist,
    duration: song.duration,
  }), []);

  return {
    isLoading,
    error,
    search,
    getSuggestions,
    getTrending,
    getRelated,
    getArtist,
    getHomeFeed,
    toVideoFormat,
  };
};
