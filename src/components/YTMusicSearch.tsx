import { useState, useEffect, useCallback } from 'react';
import { Play, Loader2, Search, Music } from 'lucide-react';
import { useFreeMusicCatalog, type FreeTrack } from '@/hooks/useFreeMusicCatalog';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { cn } from '@/lib/utils';

interface YTMusicSearchProps {
  searchQuery: string;
}

const YTMusicSearch = ({ searchQuery }: YTMusicSearchProps) => {
  const [results, setResults] = useState<FreeTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { search, toVideoFormat } = useFreeMusicCatalog();
  const { play, currentVideo, isPlaying, addToPlaylist } = useAudioPlayer();

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const tracks = await search(searchQuery, 20);
    setResults(tracks);
    setIsSearching(false);
  }, [searchQuery, search]);

  useEffect(() => {
    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [performSearch]);

  const handlePlay = (track: FreeTrack) => {
    const video = toVideoFormat(track);
    addToPlaylist(video);
    play(video);
  };

  if (!searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
          <Search className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Search Free Music</h2>
        <p className="text-muted-foreground max-w-md">
          Search through thousands of royalty-free tracks - no API key needed!
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

  if (results.length === 0) {
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Results for "{searchQuery}"
        </h2>
        <span className="text-sm text-muted-foreground">{results.length} tracks</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {results.map((track, index) => {
          const isCurrentlyPlaying = currentVideo?.id === `free_${track.id}` && isPlaying;
          
          return (
            <div
              key={track.id}
              className="group relative cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => handlePlay(track)}
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-7 h-7 text-primary-foreground ml-1" />
                  </div>
                </div>
                {isCurrentlyPlaying && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-primary/90 px-2 py-1 rounded-full">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary-foreground rounded-full animate-pulse"
                          style={{
                            height: `${8 + i * 4}px`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {track.genre && (
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-xs px-2 py-1 rounded-full">
                    {track.genre}
                  </div>
                )}
              </div>
              <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-2">
                {track.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {track.artist}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YTMusicSearch;
