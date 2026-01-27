import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PLATFORM_INFO, type NormalizedTrack } from '@/types/playlist';
import { Music, AlertTriangle } from 'lucide-react';

interface PlaylistTrackItemProps {
  track: NormalizedTrack;
  index: number;
  isSelected: boolean;
  onToggle: () => void;
}

const PlaylistTrackItem = ({ track, index, isSelected, onToggle }: PlaylistTrackItemProps) => {
  const formatDuration = (ms?: number) => {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const platformInfo = PLATFORM_INFO[track.source_platform];
  const hasYouTubeMatch = !!track.video_id;

  return (
    <div
      onClick={onToggle}
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
        isSelected 
          ? "bg-primary/10 border border-primary/30" 
          : "hover:bg-muted border border-transparent"
      )}
    >
      {/* Checkbox */}
      <Checkbox checked={isSelected} className="pointer-events-none" />

      {/* Index */}
      <span className="w-6 text-xs text-muted-foreground text-right">
        {index}
      </span>

      {/* Thumbnail */}
      <div className="relative w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
        {track.thumb_url ? (
          <img
            src={track.thumb_url}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        
        {/* Platform indicator */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 flex items-center justify-center text-[8px] rounded-tl"
          style={{ backgroundColor: platformInfo.color }}
        >
          {platformInfo.icon}
        </div>
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {track.title}
          </p>
          {track.is_explicit && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">E</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{track.artist}</span>
          {track.album && (
            <>
              <span>•</span>
              <span className="truncate">{track.album}</span>
            </>
          )}
        </div>
      </div>

      {/* Metadata badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {track.genre && (
          <Badge variant="secondary" className="text-[10px]">
            {track.genre}
          </Badge>
        )}
        
        {track.bpm && (
          <Badge variant="outline" className="text-[10px]">
            {track.bpm} BPM
          </Badge>
        )}

        {/* Match status */}
        {!hasYouTubeMatch && track.source_platform !== 'youtube' && (
          <div className="text-amber-500" title="No YouTube match found">
            <AlertTriangle className="w-4 h-4" />
          </div>
        )}

        {track.match_confidence && track.match_confidence < 90 && (
          <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
            {track.match_confidence}%
          </Badge>
        )}
      </div>

      {/* Duration */}
      <span className="text-xs text-muted-foreground w-12 text-right">
        {formatDuration(track.duration_ms)}
      </span>
    </div>
  );
};

export default PlaylistTrackItem;
