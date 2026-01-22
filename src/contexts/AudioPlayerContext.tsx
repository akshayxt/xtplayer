// Audio Player Context with intelligent Spotify-like autoplay system
// Includes Media Session API for background playback on mobile
// Supports both YouTube (via IFrame API) and direct audio streaming (for free music)
// Enhanced with YouTube Music API + AI-powered suggestions
import React, { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  // Direct audio URL (for free music mode)
  streamUrl?: string;
}

// Media Session API for lock screen controls and background playback
const updateMediaSession = (video: Video | null, isPlaying: boolean) => {
  if (!('mediaSession' in navigator) || !video) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: video.title,
    artist: video.channelTitle,
    album: 'XT Builds',
    artwork: [
      { src: video.thumbnail, sizes: '96x96', type: 'image/jpeg' },
      { src: video.thumbnail, sizes: '128x128', type: 'image/jpeg' },
      { src: video.thumbnail, sizes: '192x192', type: 'image/jpeg' },
      { src: video.thumbnail, sizes: '256x256', type: 'image/jpeg' },
      { src: video.thumbnail, sizes: '384x384', type: 'image/jpeg' },
      { src: video.thumbnail, sizes: '512x512', type: 'image/jpeg' },
    ],
  });

  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
};

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
  audioElement: HTMLAudioElement | null;
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
  addNextInQueue: (video: Video) => void;
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
  const audioRef = useRef<HTMLAudioElement | null>(null); // For direct audio streaming
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playNextRef = useRef<() => void>(() => {});
  const skipDataRef = useRef<Map<string, number>>(new Map());
  const apiKeyRef = useRef<string>('');
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousVolumeRef = useRef<number>(DEFAULT_VOLUME);
  const isDirectAudioRef = useRef<boolean>(false); // Track if using direct audio

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

  // Fetch related songs using YouTube Music edge function
  const fetchRelatedFromYTMusic = useCallback(async (videoId: string): Promise<Video[]> => {
    try {
      console.log(`[Autoplay] Fetching related songs for: ${videoId}`);
      const { data, error } = await supabase.functions.invoke('youtube-music', {
        body: { action: 'related', videoId, limit: 25 }
      });

      if (error) throw error;
      
      const songs = data?.data || [];
      return songs.map((song: any) => ({
        id: song.videoId,
        title: song.title,
        thumbnail: song.thumbnail,
        channelTitle: song.artist,
        duration: song.duration,
      }));
    } catch (err) {
      console.error('[Autoplay] Error fetching related:', err);
      return [];
    }
  }, []);

  // Get AI-enhanced suggestions for variety
  const getAISuggestions = useCallback(async (seed: Video): Promise<string[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('smart-suggestions', {
        body: {
          currentSong: { title: seed.title, artist: seed.channelTitle },
          recentHistory: recentlyPlayed.slice(0, 10).map(v => v.channelTitle),
        }
      });

      if (error) throw error;
      return data?.suggestions || [];
    } catch (err) {
      console.error('[Autoplay] AI suggestions error:', err);
      return [];
    }
  }, [recentlyPlayed]);

  // Search songs from suggestions
  const searchFromSuggestion = useCallback(async (query: string): Promise<Video[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-music', {
        body: { action: 'search', query, limit: 6 }
      });

      if (error) throw error;
      const songs = data?.data?.songs || [];
      return songs.map((song: any) => ({
        id: song.videoId,
        title: song.title,
        thumbnail: song.thumbnail,
        channelTitle: song.artist,
        duration: song.duration,
      }));
    } catch (err) {
      console.error('[Autoplay] Search error:', err);
      return [];
    }
  }, []);

  // Build autoplay queue using YouTube Music API + AI
  const buildAutoplayQueue = useCallback(async (seed: Video) => {
    setIsQueueBuilding(true);
    console.log(`[Autoplay] Building smart queue from: "${seed.title}"`);
    
    const excludeIds = new Set([
      seed.id,
      ...recentlyPlayed.slice(0, 20).map(v => v.id),
      ...autoplayQueue.map(v => v.id),
    ]);
    
    let allVideos: Video[] = [];

    try {
      // Step 1: Get related songs from YouTube Music (primary source)
      const relatedVideos = await fetchRelatedFromYTMusic(seed.id);
      const filteredRelated = relatedVideos.filter(v => !excludeIds.has(v.id));
      allVideos.push(...filteredRelated);
      filteredRelated.forEach(v => excludeIds.add(v.id));
      
      console.log(`[Autoplay] Got ${filteredRelated.length} related songs`);

      // Step 2: Get AI suggestions for variety (runs in parallel)
      const aiSuggestions = await getAISuggestions(seed);
      
      // Step 3: Search for AI suggestions (limited to 2 for performance)
      if (aiSuggestions.length > 0) {
        const searchPromises = aiSuggestions.slice(0, 2).map(query => searchFromSuggestion(query));
        const searchResults = await Promise.all(searchPromises);
        
        for (const songs of searchResults) {
          const filtered = songs.filter(v => !excludeIds.has(v.id));
          allVideos.push(...filtered);
          filtered.forEach(v => excludeIds.add(v.id));
        }
        
        console.log(`[Autoplay] Added songs from ${aiSuggestions.length} AI suggestions`);
      }
    } catch (error) {
      console.error('[Autoplay] Error building queue:', error);
    }

    // If we got no results from edge function, try legacy API method
    if (allVideos.length === 0) {
      const apiKey = apiKeyRef.current || localStorage.getItem('youtube_api_key');
      if (apiKey) {
        console.log('[Autoplay] Falling back to direct API');
        try {
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(seed.channelTitle + ' songs')}&type=video&videoCategoryId=10&key=${apiKey}`
          );
          
          if (response.ok) {
            const data = await response.json();
            allVideos = (data.items || [])
              .filter((item: any) => !excludeIds.has(item.id.videoId))
              .map((item: any) => analyzeVideo({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                channelTitle: item.snippet.channelTitle,
                channelId: item.snippet.channelId,
              }));
          }
        } catch (e) {
          console.error('[Autoplay] Fallback API error:', e);
        }
      }
    }
    
    // Rank videos
    const seedAnalyzed = analyzeVideo(seed);
    const recentChannels = new Set(recentlyPlayed.slice(0, 5).map(v => v.channelId));
    
    let ranked = allVideos
      .map(video => {
        const analyzed = analyzeVideo(video);
        let score = 50;
        
        // Same artist bonus
        if (video.channelTitle?.toLowerCase() === seed.channelTitle?.toLowerCase()) {
          score += 35;
        }
        
        // Same genre
        if (analyzed.genre === seedAnalyzed.genre) score += 15;
        
        // Same mood
        if (analyzed.mood === seedAnalyzed.mood) score += 10;
        
        // Same tempo
        if (analyzed.tempo === seedAnalyzed.tempo) score += 5;
        
        // Variety penalty
        if (recentChannels.has(video.channelId)) score -= 15;
        
        // Skip penalty
        const skips = skipDataRef.current.get(video.id) || 0;
        if (skips >= 3) score -= 25;
        
        // Discovery bonus (10% chance of variety)
        score += Math.random() * 12;
        
        return { video: analyzed, score };
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
    console.log(`[Autoplay] Smart queue built with ${ranked.length} songs${isShuffle ? ' (shuffled)' : ''}`);
  }, [recentlyPlayed, autoplayQueue, fetchRelatedFromYTMusic, getAISuggestions, searchFromSuggestion, isShuffle]);

  // Load YouTube API and ensure background playback
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Prevent playback interruption when switching tabs
    // Some browsers may pause media when tab loses focus
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - ensure audio continues
        // Direct audio element should continue automatically
        // YouTube iframe may need special handling in some browsers
        console.log('[AudioPlayer] Tab hidden - maintaining playback');
      } else {
        // Tab is visible again - sync state
        console.log('[AudioPlayer] Tab visible - syncing state');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (preloadTimeoutRef.current) clearTimeout(preloadTimeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Apply volume to player (both YT and direct audio)
  const applyVolume = useCallback((vol: number) => {
    if (playerRef.current) {
      playerRef.current.setVolume(vol);
    }
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
    }
  }, []);

  // Initialize direct audio player (for free music)
  const initDirectAudio = useCallback((streamUrl: string, video: Video) => {
    // Clean up YouTube player if exists
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    
    isDirectAudioRef.current = true;
    
    // Create or reuse audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    audio.src = streamUrl;
    audio.volume = isMuted ? 0 : volume / 100;
    
    // Set up event handlers
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };
    
    audio.onplay = () => {
      setIsPlaying(true);
      updateMediaSession(video, true);
    };
    
    audio.onpause = () => {
      setIsPlaying(false);
      updateMediaSession(video, false);
    };
    
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      playNextRef.current();
    };
    
    audio.onerror = (e) => {
      console.error('[DirectAudio] Playback error:', e);
      // Try next song on error
      playNextRef.current();
    };
    
    // Start playback
    audio.play().catch(e => {
      console.error('[DirectAudio] Failed to start:', e);
    });
    
    // Progress tracking
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (audioRef.current) {
        setProgress(audioRef.current.currentTime);
      }
    }, 500);
  }, [volume, isMuted]);

  // Initialize YouTube player
  const initPlayer = useCallback((videoId: string) => {
    // Clean up direct audio if exists
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    isDirectAudioRef.current = false;
    
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
        // Update media session for lock screen
        if (currentVideo) {
          updateMediaSession(currentVideo, true);
        }
      } else if (event.data === 2) {
        setIsPlaying(false);
        if (currentVideo) {
          updateMediaSession(currentVideo, false);
        }
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
  }, [autoplayQueue, volume, isMuted, currentVideo]);

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
      if (isDirectAudioRef.current && audioRef.current) {
        audioRef.current.currentTime = 0;
      } else {
        playerRef.current?.seekTo(0, true);
      }
      setProgress(0);
    } else if (currentIndex > 0) {
      const prevVideo = playlist[currentIndex - 1];
      setCurrentIndex(prev => prev - 1);
      setCurrentVideo(prevVideo);
      addToRecentlyPlayed(prevVideo);
      
      // Check if direct audio or YouTube
      if (prevVideo.streamUrl) {
        initDirectAudio(prevVideo.streamUrl, prevVideo);
      } else {
        initPlayer(prevVideo.id);
      }
    }
  }, [currentIndex, playlist, progress, initPlayer, initDirectAudio, addToRecentlyPlayed]);

  // Main play function - supports both YouTube and direct audio
  const play = useCallback((video: Video) => {
    const analyzed = analyzeVideo(video);
    // Preserve streamUrl if present
    if (video.streamUrl) {
      analyzed.streamUrl = video.streamUrl;
    }
    
    setCurrentVideo(analyzed);
    setIsMinimized(false);
    addToRecentlyPlayed(analyzed);
    
    // Update media session for lock screen controls
    updateMediaSession(analyzed, true);
    
    // Reset queue for new context
    setAutoplayQueue([]);
    
    const index = playlist.findIndex(v => v.id === video.id);
    if (index >= 0) {
      setCurrentIndex(index);
    } else {
      setPlaylistState(prev => [...prev, analyzed]);
      setCurrentIndex(playlist.length);
    }
    
    // Use direct audio for free music, YouTube for API mode
    if (video.streamUrl) {
      initDirectAudio(video.streamUrl, analyzed);
    } else {
      initPlayer(video.id);
    }
    
    // Build autoplay queue in background (only for YouTube mode)
    if (isAutoplay && !video.streamUrl) {
      setTimeout(() => buildAutoplayQueue(analyzed), 1000);
    }
  }, [initPlayer, initDirectAudio, addToRecentlyPlayed, playlist, isAutoplay, buildAutoplayQueue]);

  // Skip current (with learning)
  const skipCurrent = useCallback(() => {
    if (currentVideo) {
      recordSkip(currentVideo.id);
    }
    playNext();
  }, [currentVideo, recordSkip, playNext]);

  const pause = () => {
    if (isDirectAudioRef.current && audioRef.current) {
      audioRef.current.pause();
    } else {
      playerRef.current?.pauseVideo();
    }
    setIsPlaying(false);
    if (currentVideo) {
      updateMediaSession(currentVideo, false);
    }
  };

  const resume = () => {
    if (isDirectAudioRef.current && audioRef.current) {
      audioRef.current.play();
    } else {
      playerRef.current?.playVideo();
    }
    setIsPlaying(true);
    if (currentVideo) {
      updateMediaSession(currentVideo, true);
    }
  };

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    if (isDirectAudioRef.current && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    } else {
      playerRef.current?.stopVideo();
    }
    
    setCurrentVideo(null);
    setIsPlaying(false);
    setProgress(0);
    setAutoplayQueue([]);
    isDirectAudioRef.current = false;
    
    // Clear media session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
    }
  };

  // Set up Media Session action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ['play', () => resume()],
      ['pause', () => pause()],
      ['nexttrack', () => playNextRef.current()],
      ['previoustrack', () => playPrevious()],
      ['seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      }],
      ['seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        seek(Math.max(progress - skipTime, 0));
      }],
      ['seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        seek(Math.min(progress + skipTime, duration));
      }],
    ];

    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {
        console.log(`Media Session action "${action}" not supported`);
      }
    });

    return () => {
      handlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    };
  }, [progress, duration, playPrevious]);

  const toggleMinimize = () => setIsMinimized(!isMinimized);

  const seek = (time: number) => {
    if (isDirectAudioRef.current && audioRef.current) {
      audioRef.current.currentTime = time;
    } else {
      playerRef.current?.seekTo(time, true);
    }
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

  // Add song to play next (right after current song)
  const addNextInQueue = useCallback((video: Video) => {
    setPlaylistState(prev => {
      // Remove if already exists
      const filtered = prev.filter(v => v.id !== video.id);
      // Insert after current index (or at start if nothing playing)
      const insertIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
      return [
        ...filtered.slice(0, insertIndex),
        analyzeVideo(video),
        ...filtered.slice(insertIndex)
      ];
    });
  }, [currentIndex]);

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
        audioElement: audioRef.current,
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
        addNextInQueue,
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
