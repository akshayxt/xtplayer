// Autoplay Queue Panel - Shows upcoming songs with management controls
import { X, GripVertical, Play, Loader2, Sparkles } from 'lucide-react';
import { useAudioPlayer, type Video } from '@/contexts/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface AutoplayQueueProps {
  isOpen: boolean;
  onClose: () => void;
}

const AutoplayQueue = ({ isOpen, onClose }: AutoplayQueueProps) => {
  const {
    autoplayQueue,
    isQueueBuilding,
    currentVideo,
    isAutoplay,
    play,
    removeFromQueue,
  } = useAudioPlayer();

  if (!isOpen) return null;

  const handlePlay = (video: Video) => {
    play(video);
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 z-50 glass-effect border-l border-border animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Up Next</h2>
          {isQueueBuilding && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Current Playing */}
      {currentVideo && (
        <div className="p-4 border-b border-border bg-primary/5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Now Playing</p>
          <div className="flex items-center gap-3">
            <img
              src={currentVideo.thumbnail}
              alt={currentVideo.title}
              className="w-12 h-12 rounded-lg object-cover ring-2 ring-primary"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">
                {currentVideo.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentVideo.channelTitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Queue */}
      <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
        {!isAutoplay ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Autoplay is disabled
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Enable autoplay to see upcoming songs
            </p>
          </div>
        ) : autoplayQueue.length === 0 ? (
          <div className="p-8 text-center">
            {isQueueBuilding ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Building your queue...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Finding similar songs
                </p>
              </>
            ) : (
              <>
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Play a song to start autoplay
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="p-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide px-2 mb-2">
              Playing Next ({autoplayQueue.length} songs)
            </p>
            {autoplayQueue.map((video, index) => (
              <div
                key={video.id}
                className={cn(
                  "group flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                  "hover:bg-accent/50 cursor-pointer"
                )}
              >
                <span className="w-5 text-xs text-muted-foreground text-center">
                  {index + 1}
                </span>
                <div className="relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <button
                    onClick={() => handlePlay(video)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded"
                  >
                    <Play className="w-4 h-4 text-white" fill="white" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {video.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {video.channelTitle}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(video.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {autoplayQueue.length > 0 && (
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Songs selected based on your current track
          </p>
        </div>
      )}
    </div>
  );
};

export default AutoplayQueue;
