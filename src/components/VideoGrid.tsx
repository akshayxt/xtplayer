import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Search, Music } from 'lucide-react';
import VideoCard from './VideoCard';
import { useApiKey } from '@/contexts/ApiKeyContext';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount?: string;
  duration?: string;
}

interface VideoGridProps {
  searchQuery: string;
}

const VideoGrid = ({ searchQuery }: VideoGridProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { apiKey, isApiKeySet } = useApiKey();

  useEffect(() => {
    if (!isApiKeySet || !searchQuery) {
      setVideos([]);
      return;
    }

    const fetchVideos = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Search for videos
        const searchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(
            searchQuery
          )}&type=video&key=${apiKey}`
        );

        if (!searchResponse.ok) {
          throw new Error('Failed to fetch videos. Please check your API key.');
        }

        const searchData = await searchResponse.json();

        if (!searchData.items || searchData.items.length === 0) {
          setVideos([]);
          return;
        }

        const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

        // Get video details including duration and view count
        const detailsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${apiKey}`
        );

        const detailsData = await detailsResponse.json();

        const videosWithDetails = searchData.items.map((item: any) => {
          const details = detailsData.items?.find((d: any) => d.id === item.id.videoId);
          const duration = details?.contentDetails?.duration;
          const viewCount = details?.statistics?.viewCount;

          return {
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            viewCount,
            duration: duration ? formatDuration(duration) : undefined,
          };
        });

        setVideos(videosWithDetails);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [searchQuery, apiKey, isApiKeySet]);

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Initial state - no API key
  if (!isApiKeySet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Music className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to XT Builds</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          To start streaming music and videos, please configure your YouTube API key in the settings.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          Click the settings icon in the header to add your API key
        </div>
      </div>
    );
  }

  // No search yet
  if (!searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
          <Search className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Search for Music</h2>
        <p className="text-muted-foreground max-w-md">
          Enter a search term above to find videos and music to play
        </p>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Searching for "{searchQuery}"...</p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
      </div>
    );
  }

  // No results
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
          <Search className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">No results found</h2>
        <p className="text-muted-foreground">Try a different search term</p>
      </div>
    );
  }

  // Results
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Results for "{searchQuery}"
        </h2>
        <span className="text-sm text-muted-foreground">{videos.length} videos</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <VideoCard video={video} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;
