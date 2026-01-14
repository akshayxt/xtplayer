import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { FreeTrack } from './useFreeMusicCatalog';

export interface UserPlaylist {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  song_count?: number;
}

export interface PlaylistSong {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string | null;
  channel_title: string | null;
  duration: string | null;
  position: number;
  streamUrl?: string;
}

export const useUserPlaylists = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's playlists
  const fetchPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get song counts for each playlist
      const playlistsWithCounts = await Promise.all(
        (data || []).map(async (playlist) => {
          const { count } = await supabase
            .from('playlist_songs')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', playlist.id);
          
          return { ...playlist, song_count: count || 0 };
        })
      );

      setPlaylists(playlistsWithCounts);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create a new playlist
  const createPlaylist = useCallback(async (name: string, description?: string): Promise<UserPlaylist | null> => {
    if (!user) {
      toast.error('Please sign in to create playlists');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Playlist "${name}" created!`);
      await fetchPlaylists();
      return data;
    } catch (error) {
      console.error('Failed to create playlist:', error);
      toast.error('Failed to create playlist');
      return null;
    }
  }, [user, fetchPlaylists]);

  // Delete a playlist
  const deletePlaylist = useCallback(async (playlistId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Playlist deleted');
      await fetchPlaylists();
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      toast.error('Failed to delete playlist');
    }
  }, [user, fetchPlaylists]);

  // Add song to playlist
  const addSongToPlaylist = useCallback(async (
    playlistId: string, 
    track: FreeTrack | { id: string; title: string; artist: string; thumbnail: string; streamUrl?: string; duration?: number }
  ) => {
    if (!user) {
      toast.error('Please sign in to add songs');
      return false;
    }

    try {
      // Get current max position
      const { data: existing } = await supabase
        .from('playlist_songs')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { error } = await supabase
        .from('playlist_songs')
        .insert({
          playlist_id: playlistId,
          video_id: `free_${track.id}`,
          title: track.title,
          thumbnail: track.thumbnail,
          channel_title: 'artist' in track ? track.artist : null,
          duration: 'duration' in track && typeof track.duration === 'number' 
            ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`
            : null,
          position: nextPosition,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Song already in playlist');
          return false;
        }
        throw error;
      }

      // Update playlist timestamp
      await supabase
        .from('playlists')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', playlistId);

      toast.success('Song added to playlist');
      return true;
    } catch (error) {
      console.error('Failed to add song:', error);
      toast.error('Failed to add song');
      return false;
    }
  }, [user]);

  // Remove song from playlist
  const removeSongFromPlaylist = useCallback(async (playlistId: string, songId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('id', songId);

      if (error) throw error;

      toast.success('Song removed');
    } catch (error) {
      console.error('Failed to remove song:', error);
      toast.error('Failed to remove song');
    }
  }, [user]);

  // Get songs from a playlist
  const getPlaylistSongs = useCallback(async (playlistId: string): Promise<PlaylistSong[]> => {
    try {
      const { data, error } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get playlist songs:', error);
      return [];
    }
  }, []);

  // Import playlist from URL
  const importPlaylist = useCallback(async (url: string): Promise<UserPlaylist | null> => {
    if (!user) {
      toast.error('Please sign in to import playlists');
      return null;
    }

    try {
      console.log('[ImportPlaylist] Importing from URL:', url);
      
      const { data, error } = await supabase.functions.invoke('import-playlist', {
        body: { url }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const importData = data.data;
      
      console.log('[ImportPlaylist] Received data:', importData);
      
      if (!importData || !importData.tracks || importData.tracks.length === 0) {
        toast.error(importData?.note || 'No tracks found in playlist');
        return null;
      }
      
      // Create the playlist
      const playlist = await createPlaylist(
        importData.name,
        `Imported from ${importData.source}`
      );

      if (!playlist) return null;

      // Add tracks to playlist
      let addedCount = 0;
      for (const track of importData.tracks) {
        // Convert to format expected by addSongToPlaylist
        const trackData = {
          id: track.videoId || track.id,
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail,
          duration: track.duration,
        };
        
        const success = await addSongToPlaylist(playlist.id, trackData);
        if (success) addedCount++;
      }

      if (importData.note) {
        toast.info(importData.note);
      }

      toast.success(`Imported ${addedCount} tracks to "${importData.name}"!`);
      await fetchPlaylists();
      return playlist;
    } catch (error) {
      console.error('Failed to import playlist:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import playlist');
      return null;
    }
  }, [user, createPlaylist, addSongToPlaylist, fetchPlaylists]);

  // Search for songs to add
  const searchSongs = useCallback(async (query: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('import-playlist', {
        body: { searchQuery: query }
      });

      if (error) throw error;
      return data.data?.tracks || [];
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }, []);

  // Load playlists on mount
  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  return {
    playlists,
    isLoading,
    fetchPlaylists,
    createPlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    getPlaylistSongs,
    importPlaylist,
    searchSongs,
  };
};
