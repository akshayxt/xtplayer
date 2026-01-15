import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Loader2, Search, Music, CheckCircle, TrendingUp } from 'lucide-react';
import { useYTMusicAPI, type YTSong } from '@/hooks/useYTMusicAPI';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import ArtistProfileModal from './ArtistProfileModal';
import { cn } from '@/lib/utils';

interface YTMusicSearchNewProps {
  searchQuery: string;
  onSearchChange?: (query: string) => void;
}

const YTMusicSearchNew = ({ searchQuery, onSearchChange }: YTMusicSearchNewProps) => {
  const [results, setResults] = useState<YTSong[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [liveSuggestions, setLiveSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<{ name: string; channelId?: string } | null>(null);
  const { search, getSuggestions, toVideoFormat } = useYTMusicAPI();
  const { play, currentVideo, isPlaying, setPlaylist } = useAudioPlayer();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const suggestTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch live suggestions as user types
  const fetchLiveSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setLiveSuggestions([]);
      return;
    }
    
    const suggestions = await getSuggestions(query);
    setLiveSuggestions(suggestions);
  }, [getSuggestions]);

  // Debounced live suggestions
  useEffect(() => {
    if (suggestTimeoutRef.current) {
      clearTimeout(suggestTimeoutRef.current);
    }
    suggestTimeoutRef.current = setTimeout(() => fetchLiveSuggestions(searchQuery), 150);
    return () => {
      if (suggestTimeoutRef.current) {
        clearTimeout(suggestTimeoutRef.current);
      }
    };
  }, [searchQuery, fetchLiveSuggestions]);

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    setLiveSuggestions([]); // Clear live suggestions when searching
    const data = await search(searchQuery, 25);
    if (data) {
      setResults(data.songs);
      setSuggestions(data.suggestions);
      
      // Set playlist for queue
      if (data.songs.length > 0) {
        setPlaylist(data.songs.map(toVideoFormat));
      }
    }
    setIsSearching(false);
  }, [searchQuery, search, setPlaylist, toVideoFormat]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(performSearch, 500);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [performSearch]);

  const handlePlay = (song: YTSong, index: number) => {
    const video = toVideoFormat(song);
    // Set remaining songs as queue
    const queue = results.slice(index).map(toVideoFormat);
    setPlaylist(queue);
    play(video);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (onSearchChange) {
      onSearchChange(suggestion);
    }
  };

  if (!searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
          <Search className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Search YouTube Music</h2>
        <p className="text-muted-foreground max-w-md">
          Search for any song, artist, or album - powered by YouTube
        </p>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Searching for "{searchQuery}"...</p>
      </div>
    );
  }

  if (results.length === 0 && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
          <Music className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">No results found</h2>
        <p className="text-muted-foreground">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Results for "{searchQuery}"
        </h2>
        <span className="text-sm text-muted-foreground">{results.length} songs</span>
      </div>

      {/* Live Suggestions (while typing) */}
      {liveSuggestions.length > 0 && !isSearching && (
        <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 border border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Did you mean:</p>
          <div className="flex flex-wrap gap-2">
            {liveSuggestions.map((suggestion, i) => (
              <button
                key={i}
                className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 rounded-full text-foreground transition-colors border border-primary/20"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Related Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground py-1.5">Related:</span>
          {suggestions.slice(0, 5).map((suggestion, i) => (
            <button
              key={i}
              className="px-3 py-1.5 text-sm bg-secondary/80 hover:bg-secondary rounded-full text-foreground transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map((song, index) => {
          const isCurrentlyPlaying = currentVideo?.id === song.videoId && isPlaying;
          
          return (
            <div
              key={`${song.videoId}-${index}`}
              className="group relative cursor-pointer bg-card/50 hover:bg-card rounded-xl p-3 transition-all duration-200"
              onClick={() => handlePlay(song, index)}
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                  {isCurrentlyPlaying && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
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
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                    {song.title}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedArtist({ name: song.artist });
                      }}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline line-clamp-1 text-left transition-colors"
                    >
                      {song.artist}
                    </button>
                    {song.isVerified && (
                      <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{song.duration}</span>
                    {song.views && song.views !== "0" && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          {song.views}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Official Badge */}
              {song.isOfficial && (
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-medium bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                    OFFICIAL
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Artist Profile Modal */}
      <ArtistProfileModal
        artistName={selectedArtist?.name || ''}
        channelId={selectedArtist?.channelId}
        isOpen={!!selectedArtist}
        onClose={() => setSelectedArtist(null)}
      />
    </div>
  );
};

export default YTMusicSearchNew;
