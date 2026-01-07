// Audio Player Context with autoplay, repeat, and recently played features
import React, { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback } from 'react';

export interface Video {
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
  progress: number;
  duration: number;
  isAutoplay: boolean;
  repeatMode: 'off' | 'one' | 'all';
  playlist: Video[];
  recentlyPlayed: Video[];
  play: (video: Video) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  toggleMinimize: () => void;
  seek: (time: number) => void;
  toggleAutoplay: () => void;
  setRepeatMode: (mode: 'off' | 'one' | 'all') => void;
  playNext: () => void;
  playPrevious: () => void;
  addToPlaylist: (video: Video) => void;
  setPlaylist: (videos: Video[]) => void;
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

const RECENTLY_PLAYED_KEY = 'recentlyPlayed';
const MAX_RECENT = 20;

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [repeatMode, setRepeatModeState] = useState<'off' | 'one' | 'all'>('off');
  const [playlist, setPlaylistState] = useState<Video[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playNextRef = useRef<() => void>(() => {});

  // Load recently played from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENTLY_PLAYED_KEY);
    if (stored) {
      try {
        setRecentlyPlayed(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recently played:', e);
      }
    }
  }, []);

  // Save recently played to localStorage
  const addToRecentlyPlayed = useCallback((video: Video) => {
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(v => v.id !== video.id);
      const updated = [video, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

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

  const initPlayer = useCallback((videoId: string) => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    const onReady = () => {
      playerRef.current?.playVideo();
      const dur = playerRef.current?.getDuration() || 0;
      setDuration(dur);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
        // Handle autoplay/repeat
        playNextRef.current();
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
  }, []);

  const playNext = useCallback(() => {
    if (repeatMode === 'one' && currentVideo) {
      // Repeat the same song
      initPlayer(currentVideo.id);
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < playlist.length) {
      const nextVideo = playlist[nextIndex];
      setCurrentIndex(nextIndex);
      setCurrentVideo(nextVideo);
      addToRecentlyPlayed(nextVideo);
      initPlayer(nextVideo.id);
    } else if (repeatMode === 'all' && playlist.length > 0) {
      // Loop back to start
      setCurrentIndex(0);
      setCurrentVideo(playlist[0]);
      addToRecentlyPlayed(playlist[0]);
      initPlayer(playlist[0].id);
    } else if (isAutoplay && playlist.length > 0 && nextIndex >= playlist.length) {
      // Autoplay but reached end - just stop
      setIsPlaying(false);
    }
  }, [repeatMode, currentVideo, currentIndex, playlist, isAutoplay, initPlayer, addToRecentlyPlayed]);

  // Keep playNextRef updated
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const playPrevious = useCallback(() => {
    if (progress > 3) {
      // If more than 3 seconds in, restart current song
      playerRef.current?.seekTo(0, true);
      setProgress(0);
    } else if (currentIndex > 0) {
      const prevVideo = playlist[currentIndex - 1];
      setCurrentIndex(prev => prev - 1);
      setCurrentVideo(prevVideo);
      addToRecentlyPlayed(prevVideo);
      initPlayer(prevVideo.id);
    }
  }, [currentIndex, playlist, progress, initPlayer, addToRecentlyPlayed]);

  const play = useCallback((video: Video) => {
    setCurrentVideo(video);
    setIsMinimized(false);
    addToRecentlyPlayed(video);
    
    // Find index in playlist or add to it
    const index = playlist.findIndex(v => v.id === video.id);
    if (index >= 0) {
      setCurrentIndex(index);
    } else {
      setPlaylistState(prev => [...prev, video]);
      setCurrentIndex(playlist.length);
    }
    
    initPlayer(video.id);
  }, [initPlayer, addToRecentlyPlayed, playlist]);

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

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay(prev => !prev);
  }, []);

  const setRepeatMode = useCallback((mode: 'off' | 'one' | 'all') => {
    setRepeatModeState(mode);
  }, []);

  const addToPlaylist = useCallback((video: Video) => {
    setPlaylistState(prev => {
      if (prev.find(v => v.id === video.id)) return prev;
      return [...prev, video];
    });
  }, []);

  const setPlaylist = useCallback((videos: Video[]) => {
    setPlaylistState(videos);
    setCurrentIndex(-1);
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentVideo,
        isPlaying,
        isMinimized,
        progress,
        duration,
        isAutoplay,
        repeatMode,
        playlist,
        recentlyPlayed,
        play,
        pause,
        resume,
        stop,
        toggleMinimize,
        seek,
        toggleAutoplay,
        setRepeatMode,
        playNext,
        playPrevious,
        addToPlaylist,
        setPlaylist,
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
