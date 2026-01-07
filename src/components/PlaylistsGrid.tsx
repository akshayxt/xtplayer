import { useState, useEffect } from 'react';
import { Play, ListMusic, Shuffle } from 'lucide-react';
import { useAudioPlayer, type Video } from '@/contexts/AudioPlayerContext';
import { useApiKey } from '@/contexts/ApiKeyContext';
import { Button } from '@/components/ui/button';

interface Playlist {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  videos: Video[];
  gradient: string;
}

const PLAYLIST_QUERIES = [
  { query: 'chill lofi beats', name: 'Chill Vibes', gradient: 'from-violet-600 to-indigo-600' },
  { query: 'workout music mix', name: 'Workout Energy', gradient: 'from-orange-600 to-red-600' },
  { query: 'top hits 2024', name: 'Top Hits', gradient: 'from-green-600 to-emerald-600' },
  { query: 'relaxing piano music', name: 'Piano Relaxation', gradient: 'from-blue-600 to-cyan-600' },
  { query: 'hip hop beats', name: 'Hip Hop Mix', gradient: 'from-yellow-600 to-orange-600' },
  { query: 'electronic dance music', name: 'EDM Party', gradient: 'from-pink-600 to-purple-600' },
];

const PlaylistsGrid = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { play, setPlaylist } = useAudioPlayer();
  const { apiKey, isApiKeySet } = useApiKey();

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!isApiKeySet || !apiKey) {
        setIsLoading(false);
        return;
      }

      try {
        const playlistPromises = PLAYLIST_QUERIES.map(async (pq) => {
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(pq.query)}&type=video&videoCategoryId=10&key=${apiKey}`
          );
          const data = await response.json();

          if (data.items) {
            const videos: Video[] = data.items.map((item: any) => ({
              id: item.id.videoId,
              title: item.snippet.title,
              thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
              channelTitle: item.snippet.channelTitle,
            }));

            return {
              id: pq.query.replace(/\s+/g, '-'),
              name: pq.name,
              description: `${videos.length} tracks`,
              thumbnail: videos[0]?.thumbnail || '',
              videos,
              gradient: pq.gradient,
            };
          }
          return null;
        });

        const results = await Promise.all(playlistPromises);
        setPlaylists(results.filter(Boolean) as Playlist[]);
      } catch (error) {
        console.error('Failed to fetch playlists:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, [apiKey, isApiKeySet]);

  const handlePlayPlaylist = (playlist: Playlist, shuffle = false) => {
    let videos = [...playlist.videos];
    if (shuffle) {
      videos = videos.sort(() => Math.random() - 0.5);
    }
    setPlaylist(videos);
    if (videos.length > 0) {
      play(videos[0]);
    }
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-primary" />
          Playlists For You
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

  if (playlists.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <ListMusic className="w-5 h-5 text-primary" />
        Playlists For You
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className="group relative cursor-pointer"
          >
            <div className={`relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${playlist.gradient} p-4 flex flex-col justify-end`}>
              <div className="absolute inset-0 bg-black/20" />
              {playlist.thumbnail && (
                <img
                  src={playlist.thumbnail}
                  alt={playlist.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
                />
              )}
              <div className="relative z-10">
                <h3 className="text-lg font-bold text-white drop-shadow-lg">
                  {playlist.name}
                </h3>
                <p className="text-xs text-white/80">
                  {playlist.description}
                </p>
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPlaylist(playlist);
                  }}
                >
                  <Play className="w-5 h-5 ml-0.5" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-10 h-10 rounded-full shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPlaylist(playlist, true);
                  }}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PlaylistsGrid;
