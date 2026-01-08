import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Video, SavedPlaylist } from '@/contexts/AudioPlayerContext';
import { toast } from 'sonner';

interface LikedSong {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string | null;
  channel_title: string | null;
  duration: string | null;
  liked_at: string;
}

interface CloudPlaylist {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
}

interface PlaylistSong {
  id: string;
  playlist_id: string;
  video_id: string;
  title: string;
  thumbnail: string | null;
  channel_title: string | null;
  duration: string | null;
  position: number;
}

export const useLibrarySync = () => {
  const { user } = useAuth();
  const [likedSongs, setLikedSongs] = useState<Video[]>([]);
  const [playlists, setPlaylists] = useState<CloudPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch liked songs
  const fetchLikedSongs = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('liked_songs')
      .select('*')
      .eq('user_id', user.id)
      .order('liked_at', { ascending: false });

    if (error) {
      console.error('Error fetching liked songs:', error);
      return;
    }

    const videos: Video[] = (data as LikedSong[]).map((song) => ({
      id: song.video_id,
      title: song.title,
      thumbnail: song.thumbnail || '',
      channelTitle: song.channel_title || '',
      duration: song.duration || undefined,
    }));

    setLikedSongs(videos);
  }, [user]);

  // Fetch playlists
  const fetchPlaylists = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching playlists:', error);
      return;
    }

    setPlaylists(data as CloudPlaylist[]);
  }, [user]);

  // Like/unlike a song
  const toggleLike = useCallback(async (video: Video): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to like songs');
      return false;
    }

    const isLiked = likedSongs.some((s) => s.id === video.id);

    if (isLiked) {
      const { error } = await supabase
        .from('liked_songs')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', video.id);

      if (error) {
        toast.error('Failed to unlike song');
        return false;
      }

      setLikedSongs((prev) => prev.filter((s) => s.id !== video.id));
      toast.success('Removed from liked songs');
      return false;
    } else {
      const { error } = await supabase.from('liked_songs').insert({
        user_id: user.id,
        video_id: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        channel_title: video.channelTitle,
        duration: video.duration,
      });

      if (error) {
        toast.error('Failed to like song');
        return false;
      }

      setLikedSongs((prev) => [video, ...prev]);
      toast.success('Added to liked songs');
      return true;
    }
  }, [user, likedSongs]);

  // Check if song is liked
  const isLiked = useCallback((videoId: string) => {
    return likedSongs.some((s) => s.id === videoId);
  }, [likedSongs]);

  // Create playlist
  const createPlaylist = useCallback(async (name: string, description?: string): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to create playlists');
      return null;
    }

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        user_id: user.id,
        name,
        description,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create playlist');
      return null;
    }

    setPlaylists((prev) => [data as CloudPlaylist, ...prev]);
    toast.success('Playlist created');
    return data.id;
  }, [user]);

  // Add song to playlist
  const addToPlaylist = useCallback(async (playlistId: string, video: Video): Promise<boolean> => {
    if (!user) return false;

    // Get current max position
    const { data: existing } = await supabase
      .from('playlist_songs')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existing && existing.length > 0 ? (existing[0] as PlaylistSong).position + 1 : 0;

    const { error } = await supabase.from('playlist_songs').insert({
      playlist_id: playlistId,
      video_id: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      channel_title: video.channelTitle,
      duration: video.duration,
      position: nextPosition,
    });

    if (error) {
      toast.error('Failed to add to playlist');
      return false;
    }

    toast.success('Added to playlist');
    return true;
  }, [user]);

  // Get playlist songs
  const getPlaylistSongs = useCallback(async (playlistId: string): Promise<Video[]> => {
    const { data, error } = await supabase
      .from('playlist_songs')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching playlist songs:', error);
      return [];
    }

    return (data as PlaylistSong[]).map((song) => ({
      id: song.video_id,
      title: song.title,
      thumbnail: song.thumbnail || '',
      channelTitle: song.channel_title || '',
      duration: song.duration || undefined,
    }));
  }, []);

  // Delete playlist
  const deletePlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to delete playlist');
      return false;
    }

    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    toast.success('Playlist deleted');
    return true;
  }, [user]);

  // Record play in history
  const recordPlay = useCallback(async (video: Video) => {
    if (!user) return;

    // Check if already in history
    const { data: existing } = await supabase
      .from('listening_history')
      .select('id, play_count')
      .eq('user_id', user.id)
      .eq('video_id', video.id)
      .maybeSingle();

    if (existing) {
      // Update play count
      await supabase
        .from('listening_history')
        .update({
          play_count: ((existing as any).play_count || 1) + 1,
          played_at: new Date().toISOString(),
        })
        .eq('id', (existing as any).id);
    } else {
      // Insert new record
      await supabase.from('listening_history').insert({
        user_id: user.id,
        video_id: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        channel_title: video.channelTitle,
        duration: video.duration,
      });
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([fetchLikedSongs(), fetchPlaylists()]).finally(() => {
        setIsLoading(false);
      });
    } else {
      setLikedSongs([]);
      setPlaylists([]);
    }
  }, [user, fetchLikedSongs, fetchPlaylists]);

  return {
    likedSongs,
    playlists,
    isLoading,
    toggleLike,
    isLiked,
    createPlaylist,
    addToPlaylist,
    getPlaylistSongs,
    deletePlaylist,
    recordPlay,
    refetch: () => {
      fetchLikedSongs();
      fetchPlaylists();
    },
  };
};
