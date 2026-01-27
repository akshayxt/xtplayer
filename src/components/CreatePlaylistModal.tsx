import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Link, Loader2, Music, Search, Check, Globe } from 'lucide-react';
import { useUserPlaylists } from '@/hooks/useUserPlaylists';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { FreeTrack } from '@/hooks/useFreeMusicCatalog';
import UniversalPlaylistImport from './UniversalPlaylistImport';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistCreated?: (playlistId: string) => void;
}

const CreatePlaylistModal = ({ isOpen, onClose, onPlaylistCreated }: CreatePlaylistModalProps) => {
  const { user } = useAuth();
  const { createPlaylist, importPlaylist, searchSongs, addSongToPlaylist } = useUserPlaylists();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FreeTrack[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<FreeTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [showUniversalImport, setShowUniversalImport] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setIsLoading(true);
    const playlist = await createPlaylist(name, description);
    
    if (playlist && selectedSongs.length > 0) {
      for (const song of selectedSongs) {
        await addSongToPlaylist(playlist.id, song);
      }
    }
    
    setIsLoading(false);
    
    if (playlist) {
      onPlaylistCreated?.(playlist.id);
      handleClose();
    }
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    
    setIsLoading(true);
    const playlist = await importPlaylist(importUrl);
    setIsLoading(false);
    
    if (playlist) {
      onPlaylistCreated?.(playlist.id);
      handleClose();
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const results = await searchSongs(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const toggleSongSelection = (song: FreeTrack) => {
    setSelectedSongs(prev => {
      const exists = prev.find(s => s.id === song.id);
      if (exists) {
        return prev.filter(s => s.id !== song.id);
      }
      return [...prev, song];
    });
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setImportUrl('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSongs([]);
    setActiveTab('create');
    onClose();
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Please sign in to create and manage playlists.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Playlist</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Playlist
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Playlist Name</label>
                <Input
                  placeholder="My Awesome Playlist"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Description (optional)</label>
                <Textarea
                  placeholder="What's this playlist about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>
            </div>

            {/* Song Search */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <label className="text-sm font-medium text-foreground mb-2">Add Songs (optional)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search for songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Selected Songs */}
              {selectedSongs.length > 0 && (
                <div className="mt-2 p-2 bg-primary/5 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {selectedSongs.length} song{selectedSongs.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSongs.slice(0, 3).map(song => (
                      <span key={song.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {song.title.slice(0, 20)}...
                      </span>
                    ))}
                    {selectedSongs.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{selectedSongs.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto mt-2 space-y-1">
                {searchResults.map(song => {
                  const isSelected = selectedSongs.find(s => s.id === song.id);
                  return (
                    <div
                      key={song.id}
                      onClick={() => toggleSongSelection(song)}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                        isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                      )}
                    >
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button 
              onClick={handleCreate} 
              disabled={!name.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Playlist
            </Button>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Quick import options */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Music className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Spotify / YouTube</p>
                    <p className="text-xs text-muted-foreground">Public playlists only</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Playlist URL</label>
                <Input
                  placeholder="https://open.spotify.com/playlist/... or https://youtube.com/playlist?list=..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  <strong>Note:</strong> We'll find similar tracks from our free music library. 
                  Exact matches depend on availability.
                </p>
              </div>

              <Button 
                onClick={handleImport} 
                disabled={!importUrl.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Link className="w-4 h-4 mr-2" />
                )}
                Quick Import
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button 
                variant="outline"
                onClick={() => setShowUniversalImport(true)}
                className="w-full"
              >
                <Globe className="w-4 h-4 mr-2" />
                Advanced Multi-Platform Import
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Supports Spotify, YouTube, Apple Music, SoundCloud, JioSaavn, Wynk, and local files
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Universal Import Modal */}
        <UniversalPlaylistImport
          isOpen={showUniversalImport}
          onClose={() => setShowUniversalImport(false)}
          onImportComplete={(playlistId) => {
            onPlaylistCreated?.(playlistId);
            handleClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlaylistModal;
