import { Play, Clock } from 'lucide-react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount?: string;
  duration?: string;
}

interface VideoCardProps {
  video: Video;
}

const VideoCard = ({ video }: VideoCardProps) => {
  const { play, currentVideo } = useAudioPlayer();
  const isCurrentlyPlaying = currentVideo?.id === video.id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const formatViews = (views?: string) => {
    if (!views) return '';
    const num = parseInt(views);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K views`;
    return `${num} views`;
  };

  const handlePlay = () => {
    play({
      id: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      channelTitle: video.channelTitle,
      duration: video.duration,
    });
  };

  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer hover-scale ${
        isCurrentlyPlaying ? 'ring-2 ring-primary' : ''
      }`}
      onClick={handlePlay}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center glow-effect">
            <Play className="w-7 h-7 text-primary-foreground fill-current ml-1" />
          </div>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-background/80 text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {video.duration}
          </div>
        )}

        {/* Now Playing indicator */}
        {isCurrentlyPlaying && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-primary text-xs font-medium text-primary-foreground flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
            Playing
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="truncate">{video.channelTitle}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {video.viewCount && <span>{formatViews(video.viewCount)}</span>}
          {video.viewCount && <span>•</span>}
          <span>{formatDate(video.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
