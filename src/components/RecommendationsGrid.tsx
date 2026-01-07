import { useState, useEffect } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { useAudioPlayer, type Video } from '@/contexts/AudioPlayerContext';
import { useApiKey } from '@/contexts/ApiKeyContext';

const RecommendationsGrid = () => {
  const [recommendations, setRecommendations] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { recentlyPlayed, play, currentVideo, isPlaying, addToPlaylist } = useAudioPlayer();
  const { apiKey, isApiKeySet } = useApiKey();

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!isApiKeySet || !apiKey) {
        setIsLoading(false);
        return;
      }

      try {
        // Build recommendation query based on recently played
        let query = 'popular music 2024';
        if (recentlyPlayed.length > 0) {
          // Get unique artists/channels from recent plays
          const recentChannels = [...new Set(recentlyPlayed.slice(0, 5).map(v => v.channelTitle))];
          if (recentChannels.length > 0) {
            query = `${recentChannels[0]} similar artists music`;
          }
        }

        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${apiKey}`
        );
        const data = await response.json();

        if (data.items) {
          const videos: Video[] = data.items
            .filter((item: any) => !recentlyPlayed.find(v => v.id === item.id.videoId))
            .map((item: any) => ({
              id: item.id.videoId,
              title: item.snippet.title,
              thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
              channelTitle: item.snippet.channelTitle,
            }));
          setRecommendations(videos);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [apiKey, isApiKeySet, recentlyPlayed]);

  const handlePlay = (video: Video) => {
    addToPlaylist(video);
    play(video);
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Recommended For You
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-muted rounded-lg" />
              <div className="mt-2 h-4 bg-muted rounded w-3/4" />
              <div className="mt-1 h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        Recommended For You
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {recommendations.map((video) => {
          const isCurrentlyPlaying = currentVideo?.id === video.id && isPlaying;
          
          return (
            <div
              key={video.id}
              className="group relative cursor-pointer"
              onClick={() => handlePlay(video)}
            >
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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

export default RecommendationsGrid;
