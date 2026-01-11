import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Trash2, Plus, Search, Music2, Loader2, GripVertical } from 'lucide-react';
import { useUserPlaylists, type UserPlaylist, type PlaylistSong } from '@/hooks/useUserPlaylists';
import { useAudioPlayer, type Video } from '@/contexts/AudioPlayerContext';
import { cn } from '@/lib/utils';
import type { FreeTrack } from '@/hooks/useFreeMusicCatalog';

interface PlaylistDetailModalProps {
  playlist: UserPlaylist;
  isOpen: boolean;
  onClose: () => void;
}

const PlaylistDetailModal = ({ playlist, isOpen, onClose }: PlaylistDetailModalProps) => {
  const { getPlaylistSongs, removeSongFromPlaylist, searchSongs, addSongToPlaylist } = useUserPlaylists();
  const { play, currentVideo, isPlaying, pause, resume, setPlaylist: setPlayerPlaylist } = useAudioPlayer();
  
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FreeTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen && playlist) {
      loadSongs();
    }
  }, [isOpen, playlist]);

  const loadSongs = async () => {
    setIsLoading(true);
    const loadedSongs = await getPlaylistSongs(playlist.id);
    setSongs(loadedSongs);
    setIsLoading(false);
  };

  const handlePlayAll = () => {
    if (songs.length === 0) return;

    const videos: Video[] = songs.map(song => ({
      id: song.video_id,
      title: song.title,
      thumbnail: song.thumbnail || '',
      channelTitle: song.channel_title || 'Unknown Artist',
      duration: song.duration || undefined,
      streamUrl: song.video_id.startsWith('free_') 
        ? `https://mp3d.jamendo.com/download/track/${song.video_id.replace('free_', '')}/mp32`
        : undefined,
    }));

    setPlayerPlaylist(videos);
    play(videos[0]);
  };

  const handlePlaySong = (song: PlaylistSong, index: number) => {
    const videos: Video[] = songs.map(s => ({
      id: s.video_id,
      title: s.title,
      thumbnail: s.thumbnail || '',
      channelTitle: s.channel_title || 'Unknown Artist',
      duration: s.duration || undefined,
      streamUrl: s.video_id.startsWith('free_') 
        ? `https://mp3d.jamendo.com/download/track/${s.video_id.replace('free_', '')}/mp32`
        : undefined,
    }));

    setPlayerPlaylist(videos);
    play(videos[index]);
  };

  const handleRemoveSong = async (songId: string) => {
    await removeSongFromPlaylist(playlist.id, songId);
    setSongs(prev => prev.filter(s => s.id !== songId));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const results = await searchSongs(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleAddSong = async (track: FreeTrack) => {
    const added = await addSongToPlaylist(playlist.id, track);
    if (added) {
      await loadSongs();
      // Remove from search results
      setSearchResults(prev => prev.filter(t => t.id !== track.id));
    }
  };

  const formatDuration = (duration: string | null) => {
    if (!duration) return '';
    return duration;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
              {playlist.cover_url ? (
                <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Music2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{playlist.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {songs.length} song{songs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button onClick={handlePlayAll} disabled={songs.length === 0}>
            <Play className="w-4 h-4 mr-2" />
            Play All
          </Button>
          <Button variant="outline" onClick={() => setShowAddSongs(!showAddSongs)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Songs
          </Button>
        </div>

        {/* Add Songs Section */}
        {showAddSongs && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="flex gap-2">
              <Input
                placeholder="Search for songs to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="secondary" size="icon" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {searchResults.map(track => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleAddSong(track)}
                  >
                    <img src={track.thumbnail} alt={track.title} className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <Plus className="w-5 h-5 text-primary flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Songs List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : songs.length === 0 ? (
            <div className="text-center py-8">
              <Music2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No songs in this playlist</p>
              <Button variant="link" onClick={() => setShowAddSongs(true)} className="mt-2">
                Add some songs
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {songs.map((song, index) => {
                const isCurrentSong = currentVideo?.id === song.video_id;
                const isCurrentlyPlaying = isCurrentSong && isPlaying;

                return (
                  <div
                    key={song.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg group cursor-pointer transition-colors",
                      isCurrentSong ? "bg-primary/10" : "hover:bg-muted"
                    )}
                    onClick={() => handlePlaySong(song, index)}
                  >
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                      {isCurrentlyPlaying ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="w-1 bg-primary rounded-full animate-pulse"
                              style={{
                                height: `${8 + i * 4}px`,
                                animationDelay: `${i * 0.15}s`,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground group-hover:hidden">
                          {index + 1}
                        </span>
                      )}
                      {!isCurrentlyPlaying && (
                        <Play className="w-4 h-4 text-foreground hidden group-hover:block" />
                      )}
                    </div>
                    
                    <img
                      src={song.thumbnail || ''}
                      alt={song.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isCurrentSong ? "text-primary" : "text-foreground"
                      )}>
                        {song.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.channel_title}
                      </p>
                    </div>
                    
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDuration(song.duration)}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 opacity-0 group-hover:opacity-100 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSong(song.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PlaylistDetailModal;
