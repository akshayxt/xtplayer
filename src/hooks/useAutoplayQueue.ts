// Intelligent Autoplay Queue Hook - Spotify-like smart queue management
import { useState, useCallback, useRef, useEffect } from 'react';
import { useApiKey } from '@/contexts/ApiKeyContext';

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  channelId?: string;
  duration?: string;
  // Smart metadata for autoplay
  genre?: string;
  mood?: string;
  tempo?: 'slow' | 'medium' | 'fast';
  tags?: string[];
  playCount?: number;
  skipCount?: number;
  lastPlayed?: number;
}

interface AutoplayState {
  queue: VideoMetadata[];
  history: VideoMetadata[];
  isBuilding: boolean;
  seedVideo: VideoMetadata | null;
}

const AUTOPLAY_QUEUE_SIZE = 20;
const PRELOAD_THRESHOLD = 2; // Preload when 2 songs remain
const SKIP_PENALTY_THRESHOLD = 3; // Songs skipped 3+ times get deprioritized

// Genre/mood keywords for classification
const GENRE_KEYWORDS: Record<string, string[]> = {
  pop: ['pop', 'hits', 'chart', 'top 40', 'mainstream'],
  rock: ['rock', 'guitar', 'band', 'alternative', 'indie rock'],
  hiphop: ['hip hop', 'rap', 'trap', 'beats', 'mc', 'rapper'],
  electronic: ['edm', 'electronic', 'house', 'techno', 'dubstep', 'trance', 'dj'],
  rnb: ['r&b', 'soul', 'rnb', 'rhythm', 'blues'],
  jazz: ['jazz', 'swing', 'blues', 'saxophone', 'improvisation'],
  classical: ['classical', 'orchestra', 'symphony', 'piano', 'violin', 'composer'],
  country: ['country', 'western', 'nashville', 'folk'],
  latin: ['latin', 'reggaeton', 'salsa', 'bachata', 'spanish'],
  kpop: ['k-pop', 'kpop', 'korean', 'bts', 'blackpink'],
};

const MOOD_KEYWORDS: Record<string, string[]> = {
  energetic: ['energy', 'pump', 'workout', 'hype', 'party', 'dance'],
  chill: ['chill', 'relax', 'calm', 'peaceful', 'ambient', 'lofi'],
  sad: ['sad', 'heartbreak', 'melancholy', 'emotional', 'crying'],
  happy: ['happy', 'joy', 'upbeat', 'fun', 'cheerful'],
  romantic: ['love', 'romantic', 'romance', 'heart', 'ballad'],
  dark: ['dark', 'intense', 'aggressive', 'heavy', 'angry'],
};

// Analyze video metadata to extract genre/mood
const analyzeMetadata = (video: VideoMetadata): VideoMetadata => {
  const text = `${video.title} ${video.channelTitle}`.toLowerCase();
  
  // Detect genre
  let detectedGenre = 'pop'; // default
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      detectedGenre = genre;
      break;
    }
  }
  
  // Detect mood
  let detectedMood = 'neutral';
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      detectedMood = mood;
      break;
    }
  }
  
  // Estimate tempo from keywords
  let tempo: 'slow' | 'medium' | 'fast' = 'medium';
  if (text.match(/slow|ballad|acoustic|piano|ambient|lofi/)) tempo = 'slow';
  else if (text.match(/fast|party|dance|edm|hype|workout/)) tempo = 'fast';
  
  return {
    ...video,
    genre: video.genre || detectedGenre,
    mood: video.mood || detectedMood,
    tempo: video.tempo || tempo,
    playCount: video.playCount || 0,
    skipCount: video.skipCount || 0,
  };
};

export const useAutoplayQueue = () => {
  const { apiKey, isApiKeySet } = useApiKey();
  const [state, setState] = useState<AutoplayState>({
    queue: [],
    history: [],
    isBuilding: false,
    seedVideo: null,
  });
  
  const skipDataRef = useRef<Map<string, number>>(new Map());
  const preloadedRef = useRef<Set<string>>(new Set());

  // Load skip data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('autoplay_skip_data');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        skipDataRef.current = new Map(Object.entries(data));
      } catch (e) {
        console.error('Failed to load skip data:', e);
      }
    }
  }, []);

  // Save skip data
  const saveSkipData = useCallback(() => {
    const obj = Object.fromEntries(skipDataRef.current);
    localStorage.setItem('autoplay_skip_data', JSON.stringify(obj));
  }, []);

  // Record a skip
  const recordSkip = useCallback((videoId: string) => {
    const current = skipDataRef.current.get(videoId) || 0;
    skipDataRef.current.set(videoId, current + 1);
    saveSkipData();
  }, [saveSkipData]);

  // Build intelligent search queries based on seed video
  const buildSearchQueries = useCallback((seed: VideoMetadata): string[] => {
    const queries: string[] = [];
    const meta = analyzeMetadata(seed);
    
    // Priority 1: Same artist
    queries.push(`${seed.channelTitle} music`);
    
    // Priority 2: Similar genre + mood
    if (meta.genre) {
      queries.push(`${meta.genre} music ${meta.mood || ''}`);
    }
    
    // Priority 3: Related by title keywords
    const titleWords = seed.title
      .replace(/\(.*?\)|\[.*?\]/g, '') // Remove brackets
      .split(/\s+/)
      .filter(w => w.length > 3 && !w.match(/official|video|audio|lyrics|hd|4k/i))
      .slice(0, 2);
    if (titleWords.length > 0) {
      queries.push(`${titleWords.join(' ')} ${meta.genre || 'music'}`);
    }
    
    // Priority 4: Tempo-based discovery
    if (meta.tempo === 'fast') queries.push('upbeat hits music');
    else if (meta.tempo === 'slow') queries.push('chill acoustic music');
    
    // Priority 5: Mix discovery (introduce variety)
    queries.push(`${meta.genre || 'popular'} mix 2024`);
    
    return queries;
  }, []);

  // Fetch related videos from YouTube API
  const fetchRelatedVideos = useCallback(async (
    seed: VideoMetadata,
    excludeIds: Set<string>
  ): Promise<VideoMetadata[]> => {
    if (!isApiKeySet || !apiKey) return [];
    
    const queries = buildSearchQueries(seed);
    const allVideos: VideoMetadata[] = [];
    
    // Fetch from multiple queries for variety
    for (const query of queries.slice(0, 3)) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${apiKey}`
        );
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const videos = (data.items || [])
          .filter((item: any) => !excludeIds.has(item.id.videoId))
          .map((item: any) => analyzeMetadata({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
          }));
        
        allVideos.push(...videos);
      } catch (error) {
        console.error('Error fetching related videos:', error);
      }
    }
    
    return allVideos;
  }, [apiKey, isApiKeySet, buildSearchQueries]);

  // Score and rank videos for autoplay
  const rankVideos = useCallback((
    videos: VideoMetadata[],
    seed: VideoMetadata,
    history: VideoMetadata[]
  ): VideoMetadata[] => {
    const seedMeta = analyzeMetadata(seed);
    const historyIds = new Set(history.map(v => v.id));
    const historyChannels = new Set(history.slice(-5).map(v => v.channelId));
    
    const scored = videos
      .filter(v => !historyIds.has(v.id)) // Remove duplicates
      .map(video => {
        let score = 50; // Base score
        const meta = analyzeMetadata(video);
        
        // Same artist bonus (highest priority)
        if (video.channelId === seed.channelId || 
            video.channelTitle.toLowerCase() === seed.channelTitle.toLowerCase()) {
          score += 30;
        }
        
        // Same genre bonus
        if (meta.genre === seedMeta.genre) score += 15;
        
        // Same mood bonus
        if (meta.mood === seedMeta.mood) score += 10;
        
        // Same tempo bonus
        if (meta.tempo === seedMeta.tempo) score += 5;
        
        // Variety penalty (avoid same channel repeatedly)
        if (historyChannels.has(video.channelId)) score -= 20;
        
        // Skip penalty (learn from user behavior)
        const skipCount = skipDataRef.current.get(video.id) || 0;
        if (skipCount >= SKIP_PENALTY_THRESHOLD) score -= 30;
        
        // Random variety factor (10% randomness for discovery)
        score += Math.random() * 10;
        
        return { video, score };
      })
      .sort((a, b) => b.score - a.score);
    
    return scored.map(s => s.video);
  }, []);

  // Build the autoplay queue
  const buildQueue = useCallback(async (seed: VideoMetadata) => {
    setState(prev => ({ ...prev, isBuilding: true, seedVideo: seed }));
    
    const excludeIds = new Set([
      seed.id,
      ...state.history.map(v => v.id),
      ...state.queue.map(v => v.id),
    ]);
    
    try {
      const relatedVideos = await fetchRelatedVideos(seed, excludeIds);
      const rankedVideos = rankVideos(relatedVideos, seed, state.history);
      const newQueue = rankedVideos.slice(0, AUTOPLAY_QUEUE_SIZE);
      
      setState(prev => ({
        ...prev,
        queue: newQueue,
        isBuilding: false,
      }));
      
      console.log(`[Autoplay] Built queue with ${newQueue.length} songs based on "${seed.title}"`);
      return newQueue;
    } catch (error) {
      console.error('[Autoplay] Error building queue:', error);
      setState(prev => ({ ...prev, isBuilding: false }));
      return [];
    }
  }, [state.history, state.queue, fetchRelatedVideos, rankVideos]);

  // Rebuild queue when seed changes
  const resetQueue = useCallback(async (newSeed: VideoMetadata) => {
    setState(prev => ({
      ...prev,
      queue: [],
      history: [],
      seedVideo: newSeed,
    }));
    return buildQueue(newSeed);
  }, [buildQueue]);

  // Get next song from queue
  const getNextSong = useCallback(async (): Promise<VideoMetadata | null> => {
    const { queue, seedVideo } = state;
    
    if (queue.length === 0) {
      if (seedVideo) {
        const newQueue = await buildQueue(seedVideo);
        return newQueue[0] || null;
      }
      return null;
    }
    
    const nextSong = queue[0];
    const remainingQueue = queue.slice(1);
    
    // Update state
    setState(prev => ({
      ...prev,
      queue: remainingQueue,
      history: [...prev.history.slice(-50), nextSong], // Keep last 50 in history
    }));
    
    // Preload more songs if queue is getting low
    if (remainingQueue.length <= PRELOAD_THRESHOLD && seedVideo) {
      buildQueue(seedVideo);
    }
    
    return nextSong;
  }, [state, buildQueue]);

  // Add song to history (when played manually)
  const addToHistory = useCallback((video: VideoMetadata) => {
    setState(prev => ({
      ...prev,
      history: [...prev.history.slice(-50), analyzeMetadata(video)],
    }));
  }, []);

  // Preload next video (for seamless playback)
  const preloadNext = useCallback(() => {
    const nextVideo = state.queue[0];
    if (nextVideo && !preloadedRef.current.has(nextVideo.id)) {
      // Create preload link
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = nextVideo.thumbnail;
      document.head.appendChild(link);
      preloadedRef.current.add(nextVideo.id);
      console.log(`[Autoplay] Preloaded: ${nextVideo.title}`);
    }
  }, [state.queue]);

  // Queue management
  const removeFromQueue = useCallback((videoId: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.filter(v => v.id !== videoId),
    }));
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const newQueue = [...prev.queue];
      const [removed] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, removed);
      return { ...prev, queue: newQueue };
    });
  }, []);

  const clearQueue = useCallback(() => {
    setState(prev => ({ ...prev, queue: [] }));
  }, []);

  return {
    queue: state.queue,
    history: state.history,
    isBuilding: state.isBuilding,
    seedVideo: state.seedVideo,
    getNextSong,
    buildQueue,
    resetQueue,
    addToHistory,
    recordSkip,
    preloadNext,
    removeFromQueue,
    reorderQueue,
    clearQueue,
  };
};
