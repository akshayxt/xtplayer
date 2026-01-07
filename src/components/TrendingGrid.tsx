import { useState, useEffect } from 'react';
import { Play, TrendingUp } from 'lucide-react';
import { useAudioPlayer, type Video } from '@/contexts/AudioPlayerContext';
import { useApiKey } from '@/contexts/ApiKeyContext';

const TrendingGrid = () => {
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { play, currentVideo, isPlaying, setPlaylist } = useAudioPlayer();
  const { apiKey, isApiKeySet } = useApiKey();

  useEffect(() => {
    const fetchTrending = async () => {
      if (!isApiKeySet || !apiKey) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch trending music videos
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=trending music 2024&type=video&videoCategoryId=10&key=${apiKey}`
        );
        const data = await response.json();

        if (data.items) {
          const videos: Video[] = data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
            channelTitle: item.snippet.channelTitle,
          }));
          setTrendingVideos(videos);
          setPlaylist(videos);
        }
      } catch (error) {
        console.error('Failed to fetch trending:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
  }, [apiKey, isApiKeySet, setPlaylist]);

  const handlePlay = (video: Video) => {
    play(video);
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Trending Now
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-muted rounded-lg" />
              <div className="mt-2 h-4 bg-muted rounded w-3/4" />
              <div className="mt-1 h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (trendingVideos.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Trending Now
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {trendingVideos.map((video, index) => {
          const isCurrentlyPlaying = currentVideo?.id === video.id && isPlaying;
          
          return (
            <div
              key={video.id}
              className="group relative cursor-pointer"
              onClick={() => handlePlay(video)}
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                  #{index + 1}
                </div>
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
                {video.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {video.channelTitle}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TrendingGrid;
