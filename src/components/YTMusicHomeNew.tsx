import { useState, useEffect } from 'react';
import { Play, TrendingUp, Music2, Sparkles, Radio, Disc3, CheckCircle, Loader2 } from 'lucide-react';
import { useYTMusicAPI, type YTSong, type HomeFeed } from '@/hooks/useYTMusicAPI';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Skeleton } from '@/components/ui/skeleton';
import UserPlaylistsSection from './UserPlaylistsSection';
import { cn } from '@/lib/utils';

const YTMusicHomeNew = () => {
  const [homeFeed, setHomeFeed] = useState<HomeFeed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getHomeFeed, toVideoFormat, getRelated } = useYTMusicAPI();
  const { play, currentVideo, isPlaying, setPlaylist } = useAudioPlayer();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await getHomeFeed();
      if (data) {
        setHomeFeed(data);
        // Set initial playlist
        if (data.trending.length > 0) {
          setPlaylist(data.trending.map(toVideoFormat));
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, [getHomeFeed, toVideoFormat, setPlaylist]);

  const handlePlay = async (song: YTSong, allSongs: YTSong[]) => {
    const video = toVideoFormat(song);
    
    // Set the current section as playlist
    const videos = allSongs.map(toVideoFormat);
    setPlaylist(videos);
    
    play(video);
  };

  const handleStartRadio = async (song: YTSong) => {
    const video = toVideoFormat(song);
    play(video);
    
    // Get related songs for radio
    const related = await getRelated(song.videoId, 25);
    if (related.length > 0) {
      setPlaylist([video, ...related.map(toVideoFormat)]);
    }
  };

  const genreIcons: Record<string, typeof Music2> = {
    'Bollywood Hits': Sparkles,
    'International Pop': Radio,
    'Punjabi Beats': Disc3,
    'Hip Hop & Rap': Music2,
    'Romantic': Sparkles,
    'Party Mix': Radio,
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* User Playlists */}
        <UserPlaylistsSection />

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

        {/* Genre Sections Skeleton */}
        {[...Array(3)].map((_, i) => (
          <section key={i}>
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="aspect-video rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (!homeFeed) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
          <Music2 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Unable to load music</h2>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User's Playlists */}
      <UserPlaylistsSection />

      {/* Trending Section */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Trending Now
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {homeFeed.trending.slice(0, 12).map((song, index) => {
            const isCurrentlyPlaying = currentVideo?.id === song.videoId && isPlaying;
            
            return (
              <div
                key={`${song.videoId}-${index}`}
                className="group relative cursor-pointer"
                onClick={() => handlePlay(song, homeFeed.trending)}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={song.thumbnail}
                    alt={song.title}
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
                  {song.isVerified && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="w-4 h-4 text-white drop-shadow-lg" />
                    </div>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-2">
                  {song.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                  {song.artist}
                  {song.isOfficial && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">OFFICIAL</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Genre Sections */}
      {homeFeed.genres.map((genre) => {
        const Icon = genreIcons[genre.name] || Music2;
        
        return (
          <section key={genre.name}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Icon className="w-5 h-5 text-primary" />
                {genre.name}
              </h2>
              <button
                onClick={() => {
                  if (genre.songs.length > 0) {
                    const videos = genre.songs.map(toVideoFormat);
                    setPlaylist(videos);
                    play(videos[0]);
                  }
                }}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Play className="w-4 h-4" />
                Play All
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {genre.songs.slice(0, 4).map((song, index) => {
                const isCurrentlyPlaying = currentVideo?.id === song.videoId && isPlaying;
                
                return (
                  <div
                    key={`${song.videoId}-${index}`}
                    className="group relative cursor-pointer"
                    onClick={() => handlePlay(song, genre.songs)}
                  >
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={song.thumbnail}
                        alt={song.title}
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
                      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-xs px-2 py-1 rounded-full">
                        {song.duration}
                      </div>
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-2">
                      {song.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {song.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* YouTube Music Notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Music2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">YouTube Music Mode Active</p>
          <p className="text-xs text-muted-foreground">
            Streaming music from YouTube - no API key required!
          </p>
        </div>
      </div>
    </div>
  );
};

export default YTMusicHomeNew;
