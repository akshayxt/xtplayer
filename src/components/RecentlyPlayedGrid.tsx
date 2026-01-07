import { Play } from 'lucide-react';
import { useAudioPlayer, type Video } from '@/contexts/AudioPlayerContext';

const RecentlyPlayedGrid = () => {
  const { recentlyPlayed, play, currentVideo, isPlaying } = useAudioPlayer();

  if (recentlyPlayed.length === 0) {
    return null;
  }

  const handlePlay = (video: Video) => {
    play(video);
  };

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-foreground mb-4">Recently Played</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {recentlyPlayed.slice(0, 12).map((video) => {
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

export default RecentlyPlayedGrid;
