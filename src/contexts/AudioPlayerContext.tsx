import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration?: string;
}

interface AudioPlayerContextType {
  currentVideo: Video | null;
  isPlaying: boolean;
  isMinimized: boolean;
  play: (video: Video) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  toggleMinimize: () => void;
  progress: number;
  duration: number;
  seek: (time: number) => void;
}

// YouTube IFrame API types
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

interface YTPlayerEvent {
  data: number;
}

interface YTPlayerOptions {
  height: string;
  width: string;
  videoId: string;
  playerVars?: {
    autoplay?: number;
    controls?: number;
    disablekb?: number;
    fs?: number;
    modestbranding?: number;
  };
  events?: {
    onReady?: () => void;
    onStateChange?: (event: YTPlayerEvent) => void;
  };
}

interface YTPlayerState {
  PLAYING: number;
  PAUSED: number;
  ENDED: number;
}

interface YTNamespace {
  Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer;
  PlayerState: YTPlayerState;
}

declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady: () => void;
  }
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const initPlayer = (videoId: string) => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    const onReady = () => {
      playerRef.current?.playVideo();
      const dur = playerRef.current?.getDuration() || 0;
      setDuration(dur);
      
      intervalRef.current = setInterval(() => {
        const currentTime = playerRef.current?.getCurrentTime() || 0;
        setProgress(currentTime);
      }, 1000);
    };

    const onStateChange = (event: YTPlayerEvent) => {
      if (event.data === 1) { // PLAYING
        setIsPlaying(true);
      } else if (event.data === 2) { // PAUSED
        setIsPlaying(false);
      } else if (event.data === 0) { // ENDED
        setIsPlaying(false);
        setProgress(0);
      }
    };

    // Create hidden player for background audio
    let playerDiv = document.getElementById('youtube-player');
    if (!playerDiv) {
      const div = document.createElement('div');
      div.id = 'youtube-player';
      div.style.position = 'absolute';
      div.style.left = '-9999px';
      document.body.appendChild(div);
    }

    const checkYT = () => {
      if (window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player('youtube-player', {
          height: '1',
          width: '1',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
          },
          events: {
            onReady: onReady,
            onStateChange: onStateChange,
          },
        });
      } else {
        setTimeout(checkYT, 100);
      }
    };

    checkYT();
  };

  const play = (video: Video) => {
    setCurrentVideo(video);
    setIsMinimized(false);
    initPlayer(video.id);
  };

  const pause = () => {
    playerRef.current?.pauseVideo();
    setIsPlaying(false);
  };

  const resume = () => {
    playerRef.current?.playVideo();
    setIsPlaying(true);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    playerRef.current?.stopVideo();
    setCurrentVideo(null);
    setIsPlaying(false);
    setProgress(0);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const seek = (time: number) => {
    playerRef.current?.seekTo(time, true);
    setProgress(time);
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentVideo,
        isPlaying,
        isMinimized,
        play,
        pause,
        resume,
        stop,
        toggleMinimize,
        progress,
        duration,
        seek,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
