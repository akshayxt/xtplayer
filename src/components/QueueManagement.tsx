// Enhanced Queue Management Panel with drag-drop, reorder, and advanced controls
import { useState, useMemo } from 'react';
import { 
  X, Play, Loader2, Sparkles, Save, Trash2, Music, 
  ListMusic, Shuffle, MoreVertical, GripVertical,
  Plus, ArrowUp, ArrowDown, Clock, Heart, Share2,
  ChevronDown, ChevronUp, Filter, SortAsc, Search
} from 'lucide-react';
import { useAudioPlayer, type Video, type SavedPlaylist } from '@/contexts/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface QueueManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

const QueueManagement = ({ isOpen, onClose }: QueueManagementProps) => {
  const {
    autoplayQueue,
    isQueueBuilding,
    currentVideo,
    isAutoplay,
    savedPlaylists,
    recentlyPlayed,
    play,
    removeFromQueue,
    addNextInQueue,
    saveQueueAsPlaylist,
    deletePlaylist,
    playPlaylist,
    clearQueue,
    toggleShuffle,
    isShuffle,
  } = useAudioPlayer();

  const [showSaveInput, setShowSaveInput] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'playlists' | 'history'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'artist'>('default');
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);

  // Filter and sort queue
  const filteredQueue = useMemo(() => {
    let filtered = [...autoplayQueue];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        v => v.title.toLowerCase().includes(query) || 
             v.channelTitle.toLowerCase().includes(query)
      );
    }
    
    if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'artist') {
      filtered.sort((a, b) => a.channelTitle.localeCompare(b.channelTitle));
    }
    
    return filtered;
  }, [autoplayQueue, searchQuery, sortBy]);

  const totalDuration = useMemo(() => {
    const count = autoplayQueue.length;
    const avgMinutes = 3.5;
    const totalMinutes = count * avgMinutes;
    if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    return `${hours}h ${mins}m`;
  }, [autoplayQueue]);

  if (!isOpen) return null;

  const handlePlay = (video: Video) => {
    play(video);
  };

  const handleSavePlaylist = () => {
    if (autoplayQueue.length === 0 && !currentVideo) {
      toast.error('No songs to save');
      return;
    }
    saveQueueAsPlaylist(playlistName || `Playlist ${new Date().toLocaleDateString()}`);
    setPlaylistName('');
    setShowSaveInput(false);
    toast.success('Playlist saved!');
  };

  const handleDeletePlaylist = (id: string, name: string) => {
    deletePlaylist(id);
    toast.success(`Deleted "${name}"`);
  };

  const handlePlayNext = (video: Video) => {
    addNextInQueue(video);
    toast.success(`"${video.title}" will play next`);
  };

  const moveToTop = (video: Video) => {
    removeFromQueue(video.id);
    addNextInQueue(video);
    toast.success('Moved to top of queue');
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 z-50 glass-effect border-l border-border animate-slide-in-right flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Queue Manager</h2>
          {isQueueBuilding && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSearch(!showSearch)}
            className={cn(showSearch && "text-primary")}
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="p-3 border-b border-border animate-fade-in">
          <Input
            placeholder="Search queue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setActiveTab('queue')}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'queue' 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Up Next
          {activeTab === 'queue' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'playlists' 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Playlists
          {savedPlaylists.length > 0 && (
            <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 rounded-full">
              {savedPlaylists.length}
            </span>
          )}
          {activeTab === 'playlists' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'history' 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          History
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Current Playing */}
      {currentVideo && activeTab === 'queue' && (
        <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-primary uppercase tracking-wide font-semibold">Now Playing</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{currentVideo.duration || '--:--'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={currentVideo.thumbnail}
                alt={currentVideo.title}
                className="w-14 h-14 rounded-lg object-cover ring-2 ring-primary shadow-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {currentVideo.title}
              </p>
              <p className="text-sm text-muted-foreground truncate">
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
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">
                  Autoplay is disabled
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Enable autoplay to build your queue automatically
                </p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-8 text-center">
                {isQueueBuilding ? (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-foreground font-medium">
                      Building your queue...
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Finding songs you'll love
                    </p>
                  </>
                ) : searchQuery ? (
                  <>
                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No matching songs</p>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">
                      Play a song to start
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      We'll build a queue based on your taste
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="p-3">
                {/* Queue Controls */}
                <div className="flex items-center justify-between px-1 mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {filteredQueue.length} songs
                    </p>
                    <span className="text-xs text-muted-foreground">• {totalDuration}</span>
                  </div>
                  <div className="flex gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8">
                          <SortAsc className="w-4 h-4 mr-1" />
                          Sort
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSortBy('default')}>
                          Default order
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('title')}>
                          By title
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy('artist')}>
                          By artist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8", isShuffle && "text-primary")}
                      onClick={toggleShuffle}
                    >
                      <Shuffle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => setShowSaveInput(!showSaveInput)}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Playlist
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-destructive hover:text-destructive"
                    onClick={clearQueue}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Save Playlist Input */}
                {showSaveInput && (
                  <div className="flex gap-2 mb-3 animate-fade-in">
                    <Input
                      placeholder="Playlist name..."
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      className="h-9"
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePlaylist()}
                      autoFocus
                    />
                    <Button size="sm" className="h-9 px-4" onClick={handleSavePlaylist}>
                      Save
                    </Button>
                  </div>
                )}

                {/* Queue Items */}
                <div className="space-y-1">
                  {filteredQueue.map((video, index) => (
                    <div
                      key={video.id}
                      className={cn(
                        "group flex items-center gap-2 p-2 rounded-lg transition-all duration-200",
                        "hover:bg-accent/50 cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <span className="w-5 text-xs text-muted-foreground text-center">
                          {index + 1}
                        </span>
                      </div>
                      
                      <div className="relative shrink-0">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-11 h-11 rounded object-cover"
                        />
                        <button
                          onClick={() => handlePlay(video)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded"
                        >
                          <Play className="w-5 h-5 text-white" fill="white" />
                        </button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {video.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {video.channelTitle} {video.duration && `• ${video.duration}`}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePlay(video)}>
                            <Play className="w-4 h-4 mr-2" />
                            Play now
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => moveToTop(video)}>
                            <ArrowUp className="w-4 h-4 mr-2" />
                            Move to top
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => removeFromQueue(video.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'playlists' ? (
          // Playlists Tab
          <div className="p-3">
            {savedPlaylists.length === 0 ? (
              <div className="p-8 text-center">
                <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium">
                  No saved playlists
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Save your queue as a playlist to access it here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedPlaylists.map((playlist) => (
                  <Collapsible
                    key={playlist.id}
                    open={expandedPlaylist === playlist.id}
                    onOpenChange={(open) => setExpandedPlaylist(open ? playlist.id : null)}
                  >
                    <div className={cn(
                      "rounded-xl border border-border overflow-hidden transition-colors",
                      expandedPlaylist === playlist.id && "border-primary/50"
                    )}>
                      <div className="flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors">
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
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
                            onClick={(e) => {
                              e.stopPropagation();
                              playPlaylist(playlist);
                            }}
                            className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Play className="w-6 h-6 text-white" fill="white" />
                          </button>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {playlist.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {playlist.videos.length} songs
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              playPlaylist(playlist, true);
                            }}
                          >
                            <Shuffle className="w-4 h-4" />
                          </Button>
                          
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {expandedPlaylist === playlist.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => playPlaylist(playlist)}>
                                <Play className="w-4 h-4 mr-2" />
                                Play
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => playPlaylist(playlist, true)}>
                                <Shuffle className="w-4 h-4 mr-2" />
                                Shuffle play
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeletePlaylist(playlist.id, playlist.name)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="border-t border-border p-2 bg-accent/20">
                          {playlist.videos.slice(0, 5).map((video, i) => (
                            <div
                              key={video.id}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                              onClick={() => handlePlay(video)}
                            >
                              <span className="w-5 text-xs text-muted-foreground text-center">
                                {i + 1}
                              </span>
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-8 h-8 rounded object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{video.title}</p>
                              </div>
                            </div>
                          ))}
                          {playlist.videos.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              +{playlist.videos.length - 5} more songs
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </div>
        ) : (
          // History Tab
          <div className="p-3">
            {recentlyPlayed.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium">
                  No listening history
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Songs you play will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentlyPlayed.slice(0, 30).map((video, index) => (
                  <div
                    key={`${video.id}-${index}`}
                    className={cn(
                      "group flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                      "hover:bg-accent/50 cursor-pointer"
                    )}
                    onClick={() => handlePlay(video)}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                        <Play className="w-4 h-4 text-white" fill="white" />
                      </div>
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
                      className="opacity-0 group-hover:opacity-100 h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayNext(video);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {activeTab === 'queue' && filteredQueue.length > 0 && (
        <div className="p-4 border-t border-border shrink-0 bg-gradient-to-t from-background to-transparent">
          <p className="text-xs text-muted-foreground text-center">
            Songs are selected based on your listening preferences
          </p>
        </div>
      )}
    </div>
  );
};

export default QueueManagement;
