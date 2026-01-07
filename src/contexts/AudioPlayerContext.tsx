// Audio Player Context with intelligent Spotify-like autoplay system
import React, { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback } from 'react';

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  channelId?: string;
  duration?: string;
  // Smart metadata
  genre?: string;
  mood?: string;
  tempo?: 'slow' | 'medium' | 'fast';
}

export interface SavedPlaylist {
  id: string;
  name: string;
  videos: Video[];
  createdAt: number;
}

interface AudioPlayerContextType {
  currentVideo: Video | null;
  isPlaying: boolean;
  isMinimized: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isAutoplay: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
  playlist: Video[];
  recentlyPlayed: Video[];
  autoplayQueue: Video[];
  savedPlaylists: SavedPlaylist[];
  isQueueBuilding: boolean;
  play: (video: Video) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  toggleMinimize: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleAutoplay: () => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: 'off' | 'one' | 'all') => void;
  playNext: () => void;
  playPrevious: () => void;
  addToPlaylist: (video: Video) => void;
  setPlaylist: (videos: Video[]) => void;
  skipCurrent: () => void;
  removeFromQueue: (videoId: string) => void;
  clearQueue: () => void;
  saveQueueAsPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  playPlaylist: (playlist: SavedPlaylist, shuffle?: boolean) => void;
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
  setVolume: (volume: number) => void;
  getVolume: () => number;
  isMuted: () => boolean;
  mute: () => void;
  unMute: () => void;
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
const AUTOPLAY_QUEUE_KEY = 'autoplayQueue';
const SKIP_DATA_KEY = 'autoplaySkipData';
const SAVED_PLAYLISTS_KEY = 'savedPlaylists';
const VOLUME_KEY = 'playerVolume';
const MAX_RECENT = 50;
const QUEUE_SIZE = 25;
const PRELOAD_THRESHOLD = 3;
const DEFAULT_VOLUME = 80;

// Genre/mood detection
const GENRE_KEYWORDS: Record<string, string[]> = {
  pop: ['pop', 'hits', 'chart', 'top 40', 'mainstream'],
  rock: ['rock', 'guitar', 'band', 'alternative', 'indie'],
  hiphop: ['hip hop', 'rap', 'trap', 'beats', 'rapper'],
  electronic: ['edm', 'electronic', 'house', 'techno', 'dubstep', 'dj'],
  rnb: ['r&b', 'soul', 'rnb', 'rhythm'],
  jazz: ['jazz', 'swing', 'blues', 'saxophone'],
  classical: ['classical', 'orchestra', 'symphony', 'piano', 'violin'],
  country: ['country', 'western', 'nashville', 'folk'],
  latin: ['latin', 'reggaeton', 'salsa', 'bachata', 'spanish'],
  kpop: ['k-pop', 'kpop', 'korean', 'bts', 'blackpink'],
};

const MOOD_KEYWORDS: Record<string, string[]> = {
  energetic: ['energy', 'pump', 'workout', 'hype', 'party', 'dance'],
  chill: ['chill', 'relax', 'calm', 'peaceful', 'ambient', 'lofi'],
  sad: ['sad', 'heartbreak', 'melancholy', 'emotional'],
  happy: ['happy', 'joy', 'upbeat', 'fun', 'cheerful'],
  romantic: ['love', 'romantic', 'romance', 'heart', 'ballad'],
};

const analyzeVideo = (video: Video): Video => {
  const text = `${video.title} ${video.channelTitle}`.toLowerCase();
  
  let genre = 'pop';
  for (const [g, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      genre = g;
      break;
    }
  }
  
  let mood = 'neutral';
  for (const [m, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      mood = m;
      break;
    }
  }
  
  let tempo: 'slow' | 'medium' | 'fast' = 'medium';
  if (text.match(/slow|ballad|acoustic|piano|ambient|lofi/)) tempo = 'slow';
  else if (text.match(/fast|party|dance|edm|hype|workout/)) tempo = 'fast';
  
  return { ...video, genre, mood, tempo };
};

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<'off' | 'one' | 'all'>('off');
  const [playlist, setPlaylistState] = useState<Video[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Video[]>([]);
  const [autoplayQueue, setAutoplayQueue] = useState<Video[]>([]);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [isQueueBuilding, setIsQueueBuilding] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playNextRef = useRef<() => void>(() => {});
  const skipDataRef = useRef<Map<string, number>>(new Map());
  const apiKeyRef = useRef<string>('');
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousVolumeRef = useRef<number>(DEFAULT_VOLUME);

  // Load data from localStorage
  useEffect(() => {
    const storedRecent = localStorage.getItem(RECENTLY_PLAYED_KEY);
    if (storedRecent) {
      try {
        setRecentlyPlayed(JSON.parse(storedRecent));
      } catch (e) {
        console.error('Failed to parse recently played:', e);
      }
    }
    
    const storedQueue = localStorage.getItem(AUTOPLAY_QUEUE_KEY);
    if (storedQueue) {
      try {
        setAutoplayQueue(JSON.parse(storedQueue));
      } catch (e) {
        console.error('Failed to parse autoplay queue:', e);
      }
    }
    
    const storedSkips = localStorage.getItem(SKIP_DATA_KEY);
    if (storedSkips) {
      try {
        skipDataRef.current = new Map(Object.entries(JSON.parse(storedSkips)));
      } catch (e) {
        console.error('Failed to parse skip data:', e);
      }
    }

    const storedPlaylists = localStorage.getItem(SAVED_PLAYLISTS_KEY);
    if (storedPlaylists) {
      try {
        setSavedPlaylists(JSON.parse(storedPlaylists));
      } catch (e) {
        console.error('Failed to parse saved playlists:', e);
      }
    }

    const storedVolume = localStorage.getItem(VOLUME_KEY);
    if (storedVolume) {
      const vol = parseInt(storedVolume, 10);
      setVolumeState(vol);
      previousVolumeRef.current = vol;
    }
    
    const storedApiKey = localStorage.getItem('youtube_api_key');
    if (storedApiKey) {
      apiKeyRef.current = storedApiKey;
    }
  }, []);

  // Save autoplay queue
  useEffect(() => {
    if (autoplayQueue.length > 0) {
      localStorage.setItem(AUTOPLAY_QUEUE_KEY, JSON.stringify(autoplayQueue));
    }
  }, [autoplayQueue]);

  // Save playlists
  useEffect(() => {
    localStorage.setItem(SAVED_PLAYLISTS_KEY, JSON.stringify(savedPlaylists));
  }, [savedPlaylists]);

  // Add to recently played
  const addToRecentlyPlayed = useCallback((video: Video) => {
    const analyzed = analyzeVideo(video);
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(v => v.id !== video.id);
      const updated = [analyzed, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Record skip for learning
  const recordSkip = useCallback((videoId: string) => {
    const count = (skipDataRef.current.get(videoId) || 0) + 1;
    skipDataRef.current.set(videoId, count);
    localStorage.setItem(SKIP_DATA_KEY, JSON.stringify(Object.fromEntries(skipDataRef.current)));
  }, []);

  // Build search queries for autoplay
  const buildSearchQueries = useCallback((seed: Video): string[] => {
    const analyzed = analyzeVideo(seed);
    const queries: string[] = [];
    
    // Same artist (highest priority)
    queries.push(`${seed.channelTitle} songs`);
    
    // Genre + mood mix
    if (analyzed.genre) {
      queries.push(`${analyzed.genre} ${analyzed.mood || ''} music 2024`);
    }
    
    // Title keyword extraction
    const keywords = seed.title
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !w.match(/official|video|audio|lyrics|hd|4k|mv/i))
      .slice(0, 2);
    if (keywords.length > 0) {
      queries.push(`${keywords.join(' ')} similar songs`);
    }
    
    // Discovery query
    queries.push(`${analyzed.genre || 'popular'} music mix`);
    
    return queries;
  }, []);

  // Fetch and build autoplay queue
  const buildAutoplayQueue = useCallback(async (seed: Video) => {
    const apiKey = apiKeyRef.current || localStorage.getItem('youtube_api_key');
    if (!apiKey) {
      console.log('[Autoplay] No API key available');
      return;
    }
    
    setIsQueueBuilding(true);
    console.log(`[Autoplay] Building queue from: "${seed.title}"`);
    
    const excludeIds = new Set([
      seed.id,
      ...recentlyPlayed.slice(0, 10).map(v => v.id),
      ...autoplayQueue.map(v => v.id),
    ]);
    
    const queries = buildSearchQueries(seed);
    const allVideos: Video[] = [];
    
    for (const query of queries.slice(0, 3)) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${apiKey}`
        );
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const videos = (data.items || [])
          .filter((item: any) => !excludeIds.has(item.id.videoId))
          .map((item: any) => analyzeVideo({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
          }));
        
        allVideos.push(...videos);
        videos.forEach((v: Video) => excludeIds.add(v.id));
      } catch (error) {
        console.error('[Autoplay] Fetch error:', error);
      }
    }
    
    // Rank videos
    const seedAnalyzed = analyzeVideo(seed);
    const recentChannels = new Set(recentlyPlayed.slice(0, 5).map(v => v.channelId));
    
    let ranked = allVideos
      .map(video => {
        let score = 50;
        
        // Same artist bonus
        if (video.channelTitle.toLowerCase() === seed.channelTitle.toLowerCase()) {
          score += 35;
        }
        
        // Same genre
        if (video.genre === seedAnalyzed.genre) score += 15;
        
        // Same mood
        if (video.mood === seedAnalyzed.mood) score += 10;
        
        // Same tempo
        if (video.tempo === seedAnalyzed.tempo) score += 5;
        
        // Variety penalty
        if (recentChannels.has(video.channelId)) score -= 15;
        
        // Skip penalty
        const skips = skipDataRef.current.get(video.id) || 0;
        if (skips >= 3) score -= 25;
        
        // Discovery bonus (10% chance of variety)
        score += Math.random() * 12;
        
        return { video, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(s => s.video)
      .slice(0, QUEUE_SIZE);
    
    // Apply shuffle if enabled
    if (isShuffle) {
      ranked = shuffleArray(ranked);
    }
    
    setAutoplayQueue(ranked);
    setIsQueueBuilding(false);
    console.log(`[Autoplay] Queue built with ${ranked.length} songs${isShuffle ? ' (shuffled)' : ''}`);
  }, [recentlyPlayed, autoplayQueue, buildSearchQueries, isShuffle]);

  // Load YouTube API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (preloadTimeoutRef.current) clearTimeout(preloadTimeoutRef.current);
    };
  }, []);

  // Apply volume to player
  const applyVolume = useCallback((vol: number) => {
    if (playerRef.current) {
      playerRef.current.setVolume(vol);
    }
  }, []);

  // Initialize player
  const initPlayer = useCallback((videoId: string) => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    const onReady = () => {
      playerRef.current?.playVideo();
      // Apply saved volume
      playerRef.current?.setVolume(isMuted ? 0 : volume);
      const dur = playerRef.current?.getDuration() || 0;
      setDuration(dur);
      
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const currentTime = playerRef.current?.getCurrentTime() || 0;
        setProgress(currentTime);
        
        // Preload next song when near end (5 seconds before)
        const remaining = dur - currentTime;
        if (remaining <= 5 && remaining > 4 && autoplayQueue.length > 0) {
          const next = autoplayQueue[0];
          console.log(`[Autoplay] Preloading: "${next.title}"`);
        }
      }, 500);
    };

    const onStateChange = (event: YTPlayerEvent) => {
      if (event.data === 1) {
        setIsPlaying(true);
      } else if (event.data === 2) {
        setIsPlaying(false);
      } else if (event.data === 0) {
        setIsPlaying(false);
        setProgress(0);
        playNextRef.current();
      }
    };

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
            onReady,
            onStateChange,
          },
        });
      } else {
        setTimeout(checkYT, 100);
      }
    };

    checkYT();
  }, [autoplayQueue, volume, isMuted]);

  // Play next logic
  const playNext = useCallback(() => {
    // Repeat one
    if (repeatMode === 'one' && currentVideo) {
      initPlayer(currentVideo.id);
      return;
    }

    // Check playlist first
    let nextIndex: number;
    if (isShuffle && playlist.length > 1) {
      // Pick random index different from current
      do {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } while (nextIndex === currentIndex && playlist.length > 1);
    } else {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex < playlist.length) {
      const nextVideo = playlist[nextIndex];
      setCurrentIndex(nextIndex);
      setCurrentVideo(nextVideo);
      addToRecentlyPlayed(nextVideo);
      initPlayer(nextVideo.id);
      return;
    }
    
    // Repeat all playlist
    if (repeatMode === 'all' && playlist.length > 0) {
      const startIndex = isShuffle ? Math.floor(Math.random() * playlist.length) : 0;
      setCurrentIndex(startIndex);
      setCurrentVideo(playlist[startIndex]);
      addToRecentlyPlayed(playlist[startIndex]);
      initPlayer(playlist[startIndex].id);
      return;
    }

    // Autoplay from queue
    if (isAutoplay && autoplayQueue.length > 0) {
      const nextVideo = autoplayQueue[0];
      setAutoplayQueue(prev => prev.slice(1));
      setCurrentVideo(nextVideo);
      addToRecentlyPlayed(nextVideo);
      initPlayer(nextVideo.id);
      
      // Rebuild queue if running low
      if (autoplayQueue.length <= PRELOAD_THRESHOLD && currentVideo) {
        buildAutoplayQueue(currentVideo);
      }
      return;
    }

    // Autoplay enabled but queue empty - build it
    if (isAutoplay && currentVideo) {
      buildAutoplayQueue(currentVideo);
    }
  }, [
    repeatMode, currentVideo, currentIndex, playlist, isShuffle,
    isAutoplay, autoplayQueue, initPlayer, addToRecentlyPlayed, buildAutoplayQueue
  ]);

  // Keep ref updated
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // Play previous
  const playPrevious = useCallback(() => {
    if (progress > 3) {
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

  // Main play function
  const play = useCallback((video: Video) => {
    const analyzed = analyzeVideo(video);
    setCurrentVideo(analyzed);
    setIsMinimized(false);
    addToRecentlyPlayed(analyzed);
    
    // Reset queue for new context
    setAutoplayQueue([]);
    
    const index = playlist.findIndex(v => v.id === video.id);
    if (index >= 0) {
      setCurrentIndex(index);
    } else {
      setPlaylistState(prev => [...prev, analyzed]);
      setCurrentIndex(playlist.length);
    }
    
    initPlayer(video.id);
    
    // Build autoplay queue in background
    if (isAutoplay) {
      setTimeout(() => buildAutoplayQueue(analyzed), 1000);
    }
  }, [initPlayer, addToRecentlyPlayed, playlist, isAutoplay, buildAutoplayQueue]);

  // Skip current (with learning)
  const skipCurrent = useCallback(() => {
    if (currentVideo) {
      recordSkip(currentVideo.id);
    }
    playNext();
  }, [currentVideo, recordSkip, playNext]);

  const pause = () => {
    playerRef.current?.pauseVideo();
    setIsPlaying(false);
  };

  const resume = () => {
    playerRef.current?.playVideo();
    setIsPlaying(true);
  };

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    playerRef.current?.stopVideo();
    setCurrentVideo(null);
    setIsPlaying(false);
    setProgress(0);
    setAutoplayQueue([]);
  };

  const toggleMinimize = () => setIsMinimized(!isMinimized);

  const seek = (time: number) => {
    playerRef.current?.seekTo(time, true);
    setProgress(time);
  };

  // Volume control
  const setVolume = useCallback((vol: number) => {
    const clampedVol = Math.max(0, Math.min(100, vol));
    setVolumeState(clampedVol);
    setIsMuted(clampedVol === 0);
    applyVolume(clampedVol);
    localStorage.setItem(VOLUME_KEY, clampedVol.toString());
    if (clampedVol > 0) {
      previousVolumeRef.current = clampedVol;
    }
  }, [applyVolume]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      const restoreVol = previousVolumeRef.current || DEFAULT_VOLUME;
      setVolumeState(restoreVol);
      setIsMuted(false);
      applyVolume(restoreVol);
    } else {
      previousVolumeRef.current = volume;
      setVolumeState(0);
      setIsMuted(true);
      applyVolume(0);
    }
  }, [isMuted, volume, applyVolume]);

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay(prev => {
      const newValue = !prev;
      if (newValue && currentVideo && autoplayQueue.length === 0) {
        buildAutoplayQueue(currentVideo);
      }
      return newValue;
    });
  }, [currentVideo, autoplayQueue.length, buildAutoplayQueue]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => {
      const newValue = !prev;
      // Reshuffle queue if enabling shuffle
      if (newValue && autoplayQueue.length > 0) {
        setAutoplayQueue(shuffleArray(autoplayQueue));
      }
      console.log(`[Shuffle] ${newValue ? 'Enabled' : 'Disabled'}`);
      return newValue;
    });
  }, [autoplayQueue]);

  const setRepeatMode = useCallback((mode: 'off' | 'one' | 'all') => {
    setRepeatModeState(mode);
  }, []);

  const addToPlaylist = useCallback((video: Video) => {
    setPlaylistState(prev => {
      if (prev.find(v => v.id === video.id)) return prev;
      return [...prev, analyzeVideo(video)];
    });
  }, []);

  const setPlaylist = useCallback((videos: Video[]) => {
    setPlaylistState(videos.map(analyzeVideo));
    setCurrentIndex(-1);
  }, []);

  const removeFromQueue = useCallback((videoId: string) => {
    setAutoplayQueue(prev => prev.filter(v => v.id !== videoId));
  }, []);

  const clearQueue = useCallback(() => {
    setAutoplayQueue([]);
  }, []);

  // Save current queue as playlist
  const saveQueueAsPlaylist = useCallback((name: string) => {
    if (autoplayQueue.length === 0 && !currentVideo) return;
    
    const videos = currentVideo 
      ? [currentVideo, ...autoplayQueue]
      : autoplayQueue;
    
    const newPlaylist: SavedPlaylist = {
      id: `playlist_${Date.now()}`,
      name: name.trim() || `My Playlist ${savedPlaylists.length + 1}`,
      videos,
      createdAt: Date.now(),
    };
    
    setSavedPlaylists(prev => [newPlaylist, ...prev]);
    console.log(`[Playlist] Saved "${newPlaylist.name}" with ${videos.length} songs`);
  }, [autoplayQueue, currentVideo, savedPlaylists.length]);

  const deletePlaylist = useCallback((id: string) => {
    setSavedPlaylists(prev => prev.filter(p => p.id !== id));
  }, []);

  const playPlaylist = useCallback((savedPlaylist: SavedPlaylist, shuffle = false) => {
    if (savedPlaylist.videos.length === 0) return;
    
    const videos = shuffle ? shuffleArray(savedPlaylist.videos) : savedPlaylist.videos;
    setPlaylistState(videos);
    setCurrentIndex(0);
    setCurrentVideo(videos[0]);
    addToRecentlyPlayed(videos[0]);
    initPlayer(videos[0].id);
  }, [initPlayer, addToRecentlyPlayed]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentVideo,
        isPlaying,
        isMinimized,
        progress,
        duration,
        volume,
        isMuted,
        isAutoplay,
        isShuffle,
        repeatMode,
        playlist,
        recentlyPlayed,
        autoplayQueue,
        savedPlaylists,
        isQueueBuilding,
        play,
        pause,
        resume,
        stop,
        toggleMinimize,
        seek,
        setVolume,
        toggleMute,
        toggleAutoplay,
        toggleShuffle,
        setRepeatMode,
        playNext,
        playPrevious,
        addToPlaylist,
        setPlaylist,
        skipCurrent,
        removeFromQueue,
        clearQueue,
        saveQueueAsPlaylist,
        deletePlaylist,
        playPlaylist,
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
