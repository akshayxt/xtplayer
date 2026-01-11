import { useState, useEffect } from 'react';
import { Play, Plus, Trash2, Music2, MoreVertical } from 'lucide-react';
import { useUserPlaylists, type UserPlaylist, type PlaylistSong } from '@/hooks/useUserPlaylists';
import { useAudioPlayer, type Video } from '@/contexts/AudioPlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CreatePlaylistModal from './CreatePlaylistModal';
import PlaylistDetailModal from './PlaylistDetailModal';
import { cn } from '@/lib/utils';

const UserPlaylistsSection = () => {
  const { user } = useAuth();
  const { playlists, isLoading, deletePlaylist, getPlaylistSongs, fetchPlaylists } = useUserPlaylists();
  const { play, setPlaylist: setPlayerPlaylist, currentVideo, isPlaying } = useAudioPlayer();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<UserPlaylist | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handlePlayPlaylist = async (playlist: UserPlaylist) => {
    const songs = await getPlaylistSongs(playlist.id);
    
    if (songs.length === 0) {
      return;
    }

    // Convert playlist songs to Video format
    const videos: Video[] = songs.map(song => ({
      id: song.video_id,
      title: song.title,
      thumbnail: song.thumbnail || '',
      channelTitle: song.channel_title || 'Unknown Artist',
      duration: song.duration || undefined,
      // For free music tracks, we need to get the stream URL
      // The video_id starts with 'free_' for Jamendo tracks
      streamUrl: song.video_id.startsWith('free_') 
        ? `https://mp3d.jamendo.com/download/track/${song.video_id.replace('free_', '')}/mp32`
        : undefined,
    }));

    setPlayerPlaylist(videos);
    play(videos[0]);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deletePlaylist(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Music2 className="w-5 h-5 text-primary" />
            Your Playlists
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create
          </Button>
        </div>

        {playlists.length === 0 ? (
          <div className="bg-muted/30 rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Music2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No Playlists Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first playlist or import from Spotify/YouTube
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Playlist
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Create New Card */}
            <div
              onClick={() => setShowCreateModal(true)}
              className="group relative cursor-pointer"
            >
              <div className="aspect-square rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                <Plus className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm text-muted-foreground mt-2 group-hover:text-primary transition-colors">
                  New Playlist
                </span>
              </div>
            </div>

            {/* Playlist Cards */}
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="group relative cursor-pointer"
                onClick={() => setSelectedPlaylist(playlist)}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                  {playlist.cover_url ? (
                    <img
                      src={playlist.cover_url}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-12 h-12 text-primary/40" />
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="icon"
                      className="rounded-full w-12 h-12"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPlaylist(playlist);
                      }}
                    >
                      <Play className="w-6 h-6 ml-0.5" />
                    </Button>
                  </div>

                  {/* Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4 text-white" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPlaylist(playlist);
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Play
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(playlist.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-1">
                  {playlist.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {playlist.song_count || 0} songs
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPlaylistCreated={() => fetchPlaylists()}
      />

      {selectedPlaylist && (
        <PlaylistDetailModal
          playlist={selectedPlaylist}
          isOpen={!!selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
        />
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All songs in this playlist will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserPlaylistsSection;
