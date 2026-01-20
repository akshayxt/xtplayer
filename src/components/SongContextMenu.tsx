import { useState } from 'react';
import { MoreVertical, ListPlus, ListMusic, Sparkles, Heart, PlayCircle, Share2, Copy, Twitter, Facebook } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAudioPlayer, Video } from '@/contexts/AudioPlayerContext';
import { useSmartAutoplay } from '@/hooks/useSmartAutoplay';
import { useLibrarySync } from '@/hooks/useLibrarySync';
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
  const { addToPlaylist, addNextInQueue } = useAudioPlayer();
  const { buildQueue } = useSmartAutoplay();
  const { toggleLike, isLiked } = useLibrarySync();

  const songIsLiked = isLiked(song.id);

  const videoData: Video = {
    id: song.id,
    title: song.title,
    thumbnail: song.thumbnail,
    channelTitle: song.channelTitle || song.artist || 'Unknown Artist',
    duration: song.duration,
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPlaylistModal(true);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToPlaylist(videoData);
    toast.success('Added to queue', {
      description: song.title,
    });
  };

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    addNextInQueue(videoData);
    toast.success('Playing next', {
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

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleLike(videoData);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://music.youtube.com/watch?v=${song.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://music.youtube.com/watch?v=${song.id}`;
    const text = `Check out "${song.title}" by ${song.channelTitle || song.artist || 'Unknown Artist'}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleShareFacebook = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://music.youtube.com/watch?v=${song.id}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
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
        <DropdownMenuContent align="end" className="w-52 bg-popover border-border z-50">
          {/* Like/Unlike */}
          <DropdownMenuItem onClick={handleToggleLike} className="cursor-pointer">
            <Heart className={`w-4 h-4 mr-2 ${songIsLiked ? 'fill-red-500 text-red-500' : ''}`} />
            {songIsLiked ? 'Remove from Liked' : 'Add to Liked Songs'}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Queue options */}
          <DropdownMenuItem onClick={handlePlayNext} className="cursor-pointer">
            <PlayCircle className="w-4 h-4 mr-2" />
            Play Next
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddToQueue} className="cursor-pointer">
            <ListMusic className="w-4 h-4 mr-2" />
            Add to Queue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddToAIQueue} className="cursor-pointer">
            <Sparkles className="w-4 h-4 mr-2" />
            Add to AI Queue
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Playlist */}
          <DropdownMenuItem onClick={handleAddToPlaylist} className="cursor-pointer">
            <ListPlus className="w-4 h-4 mr-2" />
            Add to Playlist
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Share submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-popover border-border">
              <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareTwitter} className="cursor-pointer">
                <Twitter className="w-4 h-4 mr-2" />
                Share on X
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareFacebook} className="cursor-pointer">
                <Facebook className="w-4 h-4 mr-2" />
                Share on Facebook
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
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
