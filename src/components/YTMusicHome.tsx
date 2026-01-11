import { useState, useEffect } from 'react';
import { Play, TrendingUp, Music2, Disc3, Sparkles, Radio } from 'lucide-react';
import { useFreeMusicCatalog, type FreeTrack, type CuratedPlaylist } from '@/hooks/useFreeMusicCatalog';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const YTMusicHome = () => {
  const [trending, setTrending] = useState<FreeTrack[]>([]);
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getHomeData, toVideoFormat } = useFreeMusicCatalog();
  const { play, currentVideo, isPlaying, setPlaylist } = useAudioPlayer();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await getHomeData();
      if (data) {
        setTrending(data.trending);
        setPlaylists(data.playlists);
        
        // Set playlist for the player
        if (data.trending.length > 0) {
          setPlaylist(data.trending.map(toVideoFormat));
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, [getHomeData, toVideoFormat, setPlaylist]);

  const handlePlay = (track: FreeTrack) => {
    play(toVideoFormat(track));
  };

  const handlePlayPlaylist = (playlist: CuratedPlaylist) => {
    if (playlist.tracks.length > 0) {
      const videos = playlist.tracks.map(toVideoFormat);
      setPlaylist(videos);
      play(videos[0]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Trending Skeleton */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </section>

        {/* Playlists Skeleton */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Picks / Trending */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Trending Now
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {trending.slice(0, 12).map((track, index) => {
            const isCurrentlyPlaying = currentVideo?.id === `free_${track.id}` && isPlaying;
            
            return (
              <div
                key={track.id}
                className="group relative cursor-pointer"
                onClick={() => handlePlay(track)}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {index < 10 && (
                    <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                      #{index + 1}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-6 h-6 text-primary-foreground ml-1" />
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
      </section>

      {/* Curated Playlists by Genre */}
      {playlists.map((playlist) => (
        <section key={playlist.genre}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              {playlist.genre === 'chillout' && <Radio className="w-5 h-5 text-primary" />}
              {playlist.genre === 'electronic' && <Sparkles className="w-5 h-5 text-primary" />}
              {playlist.genre === 'ambient' && <Music2 className="w-5 h-5 text-primary" />}
              {playlist.genre === 'pop' && <Disc3 className="w-5 h-5 text-primary" />}
              {!['chillout', 'electronic', 'ambient', 'pop'].includes(playlist.genre) && (
                <Music2 className="w-5 h-5 text-primary" />
              )}
              {playlist.name}
            </h2>
            <button
              onClick={() => handlePlayPlaylist(playlist)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Play className="w-4 h-4" />
              Play All
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {playlist.tracks.slice(0, 4).map((track) => {
              const isCurrentlyPlaying = currentVideo?.id === `free_${track.id}` && isPlaying;
              
              return (
                <div
                  key={track.id}
                  className="group relative cursor-pointer"
                  onClick={() => handlePlay(track)}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
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
        </section>
      ))}

      {/* No API Key Needed Notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Music2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Free Music Mode Active</p>
          <p className="text-xs text-muted-foreground">
            Enjoying legal, royalty-free music. No API key required!
          </p>
        </div>
      </div>
    </div>
  );
};

export default YTMusicHome;
