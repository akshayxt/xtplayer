import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Music2, Loader2 } from 'lucide-react';
import { useUserPlaylists, type UserPlaylist } from '@/hooks/useUserPlaylists';
import { useAuth } from '@/contexts/AuthContext';
import type { FreeTrack } from '@/hooks/useFreeMusicCatalog';
import { cn } from '@/lib/utils';

interface AddToPlaylistModalProps {
  track: FreeTrack | null;
  isOpen: boolean;
  onClose: () => void;
}

const AddToPlaylistModal = ({ track, isOpen, onClose }: AddToPlaylistModalProps) => {
  const { user } = useAuth();
  const { playlists, addSongToPlaylist, createPlaylist } = useUserPlaylists();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddToPlaylist = async (playlist: UserPlaylist) => {
    if (!track) return;
    
    setIsLoading(playlist.id);
    await addSongToPlaylist(playlist.id, track);
    setIsLoading(null);
    onClose();
  };

  const handleCreateAndAdd = async () => {
    if (!track) return;
    
    setIsCreating(true);
    const playlist = await createPlaylist(`${track.title} Mix`);
    if (playlist) {
      await addSongToPlaylist(playlist.id, track);
    }
    setIsCreating(false);
    onClose();
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Please sign in to add songs to playlists.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
        </DialogHeader>

        {track && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-4">
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-12 h-12 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{track.title}</p>
              <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {/* Create New Playlist Option */}
          <button
            onClick={handleCreateAndAdd}
            disabled={isCreating}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {isCreating ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <Plus className="w-5 h-5 text-primary" />
              )}
            </div>
            <span className="font-medium text-foreground">Create New Playlist</span>
          </button>

          {/* Existing Playlists */}
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => handleAddToPlaylist(playlist)}
              disabled={!!isLoading}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                {playlist.cover_url ? (
                  <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{playlist.name}</p>
                <p className="text-xs text-muted-foreground">
                  {playlist.song_count || 0} songs
                </p>
              </div>
              {isLoading === playlist.id && (
                <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              )}
            </button>
          ))}

          {playlists.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No playlists yet. Create one above!
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToPlaylistModal;
