import { useState } from 'react';
import { MoreVertical, ListPlus, ListMusic, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAudioPlayer, Video } from '@/contexts/AudioPlayerContext';
import { useSmartAutoplay } from '@/hooks/useSmartAutoplay';
import AddToPlaylistModal from './AddToPlaylistModal';
import { toast } from 'sonner';

interface SongContextMenuProps {
  song: {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle?: string;
    artist?: string;
    duration?: string;
  };
  className?: string;
}

const SongContextMenu = ({ song, className }: SongContextMenuProps) => {
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const { addToPlaylist } = useAudioPlayer();
  const { queue, buildQueue } = useSmartAutoplay();

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPlaylistModal(true);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video: Video = {
      id: song.id,
      title: song.title,
      thumbnail: song.thumbnail,
      channelTitle: song.channelTitle || song.artist || 'Unknown Artist',
      duration: song.duration,
    };
    addToPlaylist(video);
    toast.success('Added to queue', {
      description: song.title,
    });
  };

  const handleAddToAIQueue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.promise(
      buildQueue({
        videoId: song.id,
        title: song.title,
        artist: song.channelTitle || song.artist || 'Unknown Artist',
      }),
      {
        loading: 'Building AI-powered queue...',
        success: (result) => `Added ${result.length} songs to AI queue`,
        error: 'Failed to build AI queue',
      }
    );
  };

  // Parse duration string (e.g., "3:45") to seconds
  const parseDuration = (duration?: string): number => {
    if (!duration) return 0;
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  // Convert song to FreeTrack format for AddToPlaylistModal
  const trackForModal = {
    id: song.id,
    title: song.title,
    artist: song.channelTitle || song.artist || 'Unknown Artist',
    thumbnail: song.thumbnail,
    duration: parseDuration(song.duration),
    streamUrl: '',
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors ${className}`}
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4 text-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover border-border z-50">
          <DropdownMenuItem onClick={handleAddToPlaylist} className="cursor-pointer">
            <ListPlus className="w-4 h-4 mr-2" />
            Add to Playlist
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddToQueue} className="cursor-pointer">
            <ListMusic className="w-4 h-4 mr-2" />
            Add to Queue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddToAIQueue} className="cursor-pointer">
            <Sparkles className="w-4 h-4 mr-2" />
            Add to AI Queue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddToPlaylistModal
        track={trackForModal}
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
      />
    </>
  );
};

export default SongContextMenu;
