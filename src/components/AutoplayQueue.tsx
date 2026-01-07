// Autoplay Queue Panel - Shows upcoming songs with management controls
import { useState } from 'react';
import { X, Play, Loader2, Sparkles, Save, Trash2, Music } from 'lucide-react';
import { useAudioPlayer, type Video } from '@/contexts/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
    savedPlaylists,
    play,
    removeFromQueue,
    saveQueueAsPlaylist,
    deletePlaylist,
    playPlaylist,
    clearQueue,
  } = useAudioPlayer();

  const [showSaveInput, setShowSaveInput] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'playlists'>('queue');

  if (!isOpen) return null;

  const handlePlay = (video: Video) => {
    play(video);
  };

  const handleSavePlaylist = () => {
    if (autoplayQueue.length === 0 && !currentVideo) {
      toast.error('No songs to save');
      return;
    }
    saveQueueAsPlaylist(playlistName);
    setPlaylistName('');
    setShowSaveInput(false);
    toast.success('Playlist saved!');
  };

  const handleDeletePlaylist = (id: string, name: string) => {
    deletePlaylist(id);
    toast.success(`Deleted "${name}"`);
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 z-50 glass-effect border-l border-border animate-slide-in-right flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Music</h2>
          {isQueueBuilding && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setActiveTab('queue')}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors",
            activeTab === 'queue' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Up Next
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors",
            activeTab === 'playlists' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Playlists ({savedPlaylists.length})
        </button>
      </div>

      {/* Current Playing */}
      {currentVideo && activeTab === 'queue' && (
        <div className="p-4 border-b border-border bg-primary/5 shrink-0">
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

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'queue' ? (
          // Queue Tab
          <>
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
                <div className="flex items-center justify-between px-2 mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Playing Next ({autoplayQueue.length})
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowSaveInput(!showSaveInput)}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={clearQueue}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Save Playlist Input */}
                {showSaveInput && (
                  <div className="flex gap-2 px-2 mb-3">
                    <Input
                      placeholder="Playlist name..."
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePlaylist()}
                    />
                    <Button size="sm" className="h-8" onClick={handleSavePlaylist}>
                      Save
                    </Button>
                  </div>
                )}

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
          </>
        ) : (
          // Playlists Tab
          <div className="p-2">
            {savedPlaylists.length === 0 ? (
              <div className="p-8 text-center">
                <Music className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No saved playlists
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Save your queue as a playlist to see it here
                </p>
              </div>
            ) : (
              savedPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  className={cn(
                    "group p-3 rounded-lg transition-all duration-200",
                    "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted">
                      {playlist.videos[0] ? (
                        <img
                          src={playlist.videos[0].thumbnail}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        onClick={() => playPlaylist(playlist)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Play className="w-5 h-5 text-white" fill="white" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {playlist.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {playlist.videos.length} songs
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist.id, playlist.name);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {activeTab === 'queue' && autoplayQueue.length > 0 && (
        <div className="p-4 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground text-center">
            Songs selected based on your current track
          </p>
        </div>
      )}
    </div>
  );
};

export default AutoplayQueue;
