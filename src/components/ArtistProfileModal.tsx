import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Play, CheckCircle, Users, Music2, Disc3, Radio, X, Loader2, TrendingUp } from 'lucide-react';
import { useYTMusicAPI, type YTSong, type ArtistInfo } from '@/hooks/useYTMusicAPI';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ArtistProfileModalProps {
  artistName: string;
  channelId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const ArtistProfileModal = ({ artistName, channelId, isOpen, onClose }: ArtistProfileModalProps) => {
  const [artistInfo, setArtistInfo] = useState<ArtistInfo | null>(null);
  const [relatedSongs, setRelatedSongs] = useState<YTSong[]>([]);
  const [similarArtists, setSimilarArtists] = useState<{ name: string; thumbnail: string; channelId: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tracks' | 'similar'>('tracks');
  
  const { getArtist, search, toVideoFormat, getRelated } = useYTMusicAPI();
  const { play, currentVideo, isPlaying, setPlaylist } = useAudioPlayer();

  useEffect(() => {
    const loadArtistData = async () => {
      if (!isOpen) return;
      
      setIsLoading(true);
      
      // Try to get artist from channel ID first
      if (channelId) {
        const info = await getArtist(channelId);
        if (info) {
          setArtistInfo(info);
        }
      }
      
      // Search for artist's songs
      const searchResult = await search(`${artistName} songs`, 20);
      if (searchResult?.songs) {
        setRelatedSongs(searchResult.songs);
        
        // Extract unique artists from results as "similar artists"
        const artistsMap = new Map<string, { name: string; thumbnail: string; channelId: string }>();
        searchResult.songs.forEach(song => {
          if (song.artist.toLowerCase() !== artistName.toLowerCase() && !artistsMap.has(song.artist)) {
            artistsMap.set(song.artist, {
              name: song.artist,
              thumbnail: song.thumbnail,
              channelId: '', // We don't have channelId from search
            });
          }
        });
        setSimilarArtists(Array.from(artistsMap.values()).slice(0, 8));
      }
      
      setIsLoading(false);
    };

    loadArtistData();
  }, [isOpen, artistName, channelId, getArtist, search]);

  const handlePlayAll = () => {
    const songs = artistInfo?.topTracks || relatedSongs;
    if (songs.length > 0) {
      const videos = songs.map(toVideoFormat);
      setPlaylist(videos);
      play(videos[0]);
    }
  };

  const handlePlaySong = (song: YTSong, index: number) => {
    const songs = artistInfo?.topTracks || relatedSongs;
    const videos = songs.slice(index).map(toVideoFormat);
    setPlaylist(videos);
    play(toVideoFormat(song));
  };

  const handleStartRadio = async () => {
    const songs = artistInfo?.topTracks || relatedSongs;
    if (songs.length > 0) {
      const firstSong = songs[0];
      play(toVideoFormat(firstSong));
      
      // Get related for radio
      const related = await getRelated(firstSong.videoId, 30);
      if (related.length > 0) {
        setPlaylist([toVideoFormat(firstSong), ...related.map(toVideoFormat)]);
      }
    }
  };

  const tracks = artistInfo?.topTracks || relatedSongs;
  const displayName = artistInfo?.artist || artistName;
  const isVerified = artistInfo?.verified || tracks.some(t => t.isVerified);
  const artistThumbnail = artistInfo?.thumbnail || tracks[0]?.thumbnail;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden bg-background border-border">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading artist profile...</p>
          </div>
        ) : (
          <>
            {/* Header with Artist Info */}
            <div className="relative">
              {/* Background Gradient */}
              <div 
                className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/10 to-background"
                style={{
                  backgroundImage: artistThumbnail 
                    ? `linear-gradient(to bottom, rgba(0,0,0,0.7), hsl(var(--background))), url(${artistThumbnail})`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              
              <div className="relative z-10 p-6 pt-8">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-end gap-6">
                  {/* Artist Avatar */}
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-background shadow-xl flex-shrink-0">
                    {artistThumbnail ? (
                      <img
                        src={artistThumbnail}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/20">
                        <Users className="w-12 h-12 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Artist Details */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      {isVerified && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Verified Artist
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">{displayName}</h1>
                    <p className="text-sm text-muted-foreground">
                      {tracks.length} songs available
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-6">
                  <Button onClick={handlePlayAll} className="gap-2">
                    <Play className="w-4 h-4" />
                    Play All
                  </Button>
                  <Button variant="outline" onClick={handleStartRadio} className="gap-2">
                    <Radio className="w-4 h-4" />
                    Start Radio
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border px-6">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('tracks')}
                  className={cn(
                    "py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === 'tracks'
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Music2 className="w-4 h-4" />
                    Top Tracks
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('similar')}
                  className={cn(
                    "py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === 'similar'
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Similar Artists
                  </span>
                </button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="h-[400px]">
              {activeTab === 'tracks' ? (
                <div className="p-6 space-y-2">
                  {tracks.map((song, index) => {
                    const isCurrentlyPlaying = currentVideo?.id === song.videoId && isPlaying;
                    
                    return (
                      <div
                        key={`${song.videoId}-${index}`}
                        onClick={() => handlePlaySong(song, index)}
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors group",
                          isCurrentlyPlaying 
                            ? "bg-primary/10" 
                            : "hover:bg-secondary/50"
                        )}
                      >
                        {/* Track Number / Playing Indicator */}
                        <div className="w-8 text-center">
                          {isCurrentlyPlaying ? (
                            <div className="flex items-center justify-center gap-0.5">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="w-1 bg-primary rounded-full animate-pulse"
                                  style={{
                                    height: `${8 + i * 4}px`,
                                    animationDelay: `${i * 0.15}s`,
                                  }}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground group-hover:hidden">
                              {index + 1}
                            </span>
                          )}
                          <Play className="w-4 h-4 text-foreground hidden group-hover:block mx-auto" />
                        </div>

                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "text-sm font-medium line-clamp-1",
                            isCurrentlyPlaying ? "text-primary" : "text-foreground"
                          )}>
                            {song.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                            {song.artist}
                            {song.isOfficial && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">
                                OFFICIAL
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Duration & Views */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-muted-foreground">{song.duration}</p>
                          {song.views && song.views !== "0" && (
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {song.views}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6">
                  {similarArtists.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {similarArtists.map((artist, index) => (
                        <div
                          key={`${artist.name}-${index}`}
                          className="flex flex-col items-center p-4 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors"
                          onClick={() => {
                            onClose();
                            // This would open the artist modal for the similar artist
                          }}
                        >
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-muted mb-3">
                            <img
                              src={artist.thumbnail}
                              alt={artist.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <h3 className="text-sm font-medium text-foreground text-center line-clamp-2">
                            {artist.name}
                          </h3>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No similar artists found</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ArtistProfileModal;
