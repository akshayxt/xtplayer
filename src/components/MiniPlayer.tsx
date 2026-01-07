import { useState } from 'react';
import { 
  Play, Pause, X, ChevronUp, ChevronDown, 
  SkipBack, SkipForward, Repeat, Repeat1, 
  ListMusic, Sparkles, Loader2, Shuffle,
  Volume2, Volume1, VolumeX
} from 'lucide-react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AutoplayQueue from './AutoplayQueue';
import { cn } from '@/lib/utils';

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
    volume,
    isMuted,
    setVolume,
    toggleMute,
    isAutoplay,
    isShuffle,
    repeatMode,
    toggleAutoplay,
    toggleShuffle,
    setRepeatMode,
    playPrevious,
    autoplayQueue,
    isQueueBuilding,
    skipCurrent,
  } = useAudioPlayer();

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const cycleRepeatMode = () => {
    if (repeatMode === 'off') setRepeatMode('one');
    else if (repeatMode === 'one') setRepeatMode('all');
    else setRepeatMode('off');
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'one') return <Repeat1 className="w-5 h-5" />;
    return <Repeat className="w-5 h-5" />;
  };

  const getRepeatLabel = () => {
    if (repeatMode === 'off') return 'Repeat Off';
    if (repeatMode === 'one') return 'Repeat One';
    return 'Repeat All';
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-5 h-5" />;
    if (volume < 50) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  if (!currentVideo) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (isMinimized) {
    return (
      <>
        <div className="fixed bottom-4 right-4 z-50 glass-effect rounded-xl p-3 shadow-2xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={currentVideo.thumbnail}
                alt={currentVideo.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              {isQueueBuilding && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Loader2 className="w-3 h-3 animate-spin text-primary-foreground" />
                </div>
              )}
            </div>
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
        <AutoplayQueue isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 glass-effect border-t border-border animate-slide-in">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
          {isQueueBuilding && (
            <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-primary/50 to-transparent animate-pulse" />
          )}
        </div>

        <div className="container px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Thumbnail & Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative">
                <img
                  src={currentVideo.thumbnail}
                  alt={currentVideo.title}
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
                {isQueueBuilding && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-foreground truncate">{currentVideo.title}</h4>
                <p className="text-sm text-muted-foreground truncate">{currentVideo.channelTitle}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("hidden sm:flex", isShuffle && "text-primary")}
                      onClick={toggleShuffle}
                    >
                      <Shuffle className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isShuffle ? 'Shuffle On' : 'Shuffle Off'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={playPrevious}>
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                onClick={isPlaying ? pause : resume}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover-scale"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="hidden sm:flex" 
                onClick={skipCurrent}
              >
                <SkipForward className="w-5 h-5" />
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cycleRepeatMode}
                      className={cn("hidden sm:flex", repeatMode !== 'off' && "text-primary")}
                    >
                      {getRepeatIcon()}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{getRepeatLabel()}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

            {/* Volume Control */}
            <div 
              className="hidden lg:flex items-center gap-2 relative"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                    >
                      {getVolumeIcon()}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <div className={cn(
                "flex items-center transition-all duration-200 overflow-hidden",
                showVolumeSlider ? "w-24 opacity-100" : "w-0 opacity-0"
              )}>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={100}
                  step={1}
                  onValueChange={([value]) => setVolume(value)}
                  className="w-20"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleAutoplay}
                      className={isAutoplay ? 'text-primary' : ''}
                    >
                      <ListMusic className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isAutoplay ? 'Autoplay On' : 'Autoplay Off'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsQueueOpen(!isQueueOpen)}
                      className={isQueueOpen ? 'text-primary bg-primary/10' : ''}
                    >
                      <div className="relative">
                        <Sparkles className="w-5 h-5" />
                        {autoplayQueue.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                            {autoplayQueue.length > 9 ? '9+' : autoplayQueue.length}
                          </span>
                        )}
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Up Next Queue</TooltipContent>
                </Tooltip>
              </TooltipProvider>

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
      
      <AutoplayQueue isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
    </>
  );
};

export default MiniPlayer;
