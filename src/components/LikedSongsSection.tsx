import { Heart } from 'lucide-react';
import { useLibrarySync } from '@/hooks/useLibrarySync';
import { useAudioPlayer, Video } from '@/contexts/AudioPlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from './ui/skeleton';
import SongContextMenu from './SongContextMenu';

const LikedSongsSection = () => {
  const { user } = useAuth();
  const { likedSongs, isLoading } = useLibrarySync();
  const { play, currentVideo } = useAudioPlayer();

  if (!user) return null;
  if (isLoading) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          <h2 className="text-xl font-bold text-foreground">Liked Songs</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (likedSongs.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
        <h2 className="text-xl font-bold text-foreground">Liked Songs</h2>
        <span className="text-sm text-muted-foreground">({likedSongs.length})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {likedSongs.slice(0, 10).map((video) => (
          <div
            key={video.id}
            onClick={() => play(video)}
            className={`group relative rounded-xl overflow-hidden bg-card border cursor-pointer hover-scale ${
              currentVideo?.id === video.id ? 'ring-2 ring-primary' : 'border-border/50 hover:border-primary/50'
            }`}
          >
            <div className="relative aspect-video">
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
              {/* Three dot menu */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <SongContextMenu
                  song={{
                    id: video.id,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    channelTitle: video.channelTitle,
                    duration: video.duration,
                  }}
                />
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm text-foreground line-clamp-2">{video.title}</h3>
              <p className="text-xs text-muted-foreground truncate">{video.channelTitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LikedSongsSection;
