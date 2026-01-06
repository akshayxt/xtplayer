import { Play, Pause, X, ChevronUp, ChevronDown, SkipBack, SkipForward } from 'lucide-react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

const MiniPlayer = () => {
  const {
    currentVideo,
    isPlaying,
    isMinimized,
    pause,
    resume,
    stop,
    toggleMinimize,
    progress,
    duration,
    seek,
  } = useAudioPlayer();

  if (!currentVideo) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 glass-effect rounded-xl p-3 shadow-2xl animate-fade-in">
        <div className="flex items-center gap-3">
          <img
            src={currentVideo.thumbnail}
            alt={currentVideo.title}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={isPlaying ? pause : resume}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleMinimize}>
              <ChevronUp className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-effect border-t border-border animate-slide-in">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="container px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Thumbnail & Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={currentVideo.thumbnail}
              alt={currentVideo.title}
              className="w-14 h-14 rounded-lg object-cover shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-medium text-foreground truncate">{currentVideo.title}</h4>
              <p className="text-sm text-muted-foreground truncate">{currentVideo.channelTitle}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              onClick={isPlaying ? pause : resume}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Time & Seek */}
          <div className="hidden md:flex items-center gap-3 flex-1">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(progress)}
            </span>
            <Slider
              value={[progress]}
              max={duration || 100}
              step={1}
              onValueChange={([value]) => seek(value)}
              className="w-full max-w-xs"
            />
            <span className="text-xs text-muted-foreground w-10">{formatTime(duration)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleMinimize}>
              <ChevronDown className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={stop}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
