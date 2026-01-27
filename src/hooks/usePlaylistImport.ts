import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  NormalizedTrack, 
  PlaylistResult, 
  SortMode, 
  FilterOptions, 
  ImportOptions,
  Platform 
} from '@/types/playlist';

interface UsePlaylistImportReturn {
  // State
  result: PlaylistResult | null;
  tracks: NormalizedTrack[];
  selectedTracks: NormalizedTrack[];
  isLoading: boolean;
  error: string | null;
  
  // Import functions
  importFromUrl: (url: string, options?: Partial<ImportOptions>) => Promise<void>;
  importFromFile: (content: string, format: 'json' | 'csv' | 'm3u' | 'txt') => Promise<void>;
  importFromManual: (input: string) => Promise<void>;
  searchTracks: (query: string) => Promise<NormalizedTrack[]>;
  
  // Selection functions
  selectTrack: (trackId: string) => void;
  deselectTrack: (trackId: string) => void;
  toggleTrackSelection: (trackId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  invertSelection: () => void;
  selectRange: (start: number, end: number) => void;
  
  // Filter & Sort
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  filteredTracks: NormalizedTrack[];
  
  // Export
  exportToFile: (format: 'json' | 'csv' | 'm3u' | 'txt', selectedOnly?: boolean) => void;
  
  // Utils
  reset: () => void;
  getTracksByPlatform: () => Record<Platform, NormalizedTrack[]>;
  getDuplicates: () => NormalizedTrack[][];
}

export const usePlaylistImport = (): UsePlaylistImportReturn => {
  const [result, setResult] = useState<PlaylistResult | null>(null);
  const [tracks, setTracks] = useState<NormalizedTrack[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('original_order');
  const [filters, setFilters] = useState<FilterOptions>({});

  // Import from URL
  const importFromUrl = useCallback(async (url: string, options?: Partial<ImportOptions>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('import-playlist', {
        body: { 
          url,
          deduplicate: options?.deduplicate ?? true,
          enrichWithYouTube: options?.enrichWithYouTube ?? true,
        }
      });

      if (invokeError) throw invokeError;
      if (data.status === 'error') {
        throw new Error(data.error || data.error_message || 'Import failed');
      }

      const importResult: PlaylistResult = data.data;
      setResult(importResult);
      setTracks(importResult.tracks.map(t => ({ ...t, selected: false })));
      setSelectedIds(new Set());

      if (importResult.warnings?.length) {
        importResult.warnings.forEach(w => toast.warning(w));
      }
      
      if (importResult.tracks.length > 0) {
        toast.success(`Imported ${importResult.tracks.length} tracks from ${importResult.playlist_name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Import from file
  const importFromFile = useCallback(async (content: string, format: 'json' | 'csv' | 'm3u' | 'txt') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('import-playlist', {
        body: { 
          fileContent: content,
          fileFormat: format,
          deduplicate: true,
          enrichWithYouTube: true,
        }
      });

      if (invokeError) throw invokeError;
      if (data.status === 'error') {
        throw new Error(data.error || 'Import failed');
      }

      const importResult: PlaylistResult = data.data;
      setResult(importResult);
      setTracks(importResult.tracks.map(t => ({ ...t, selected: false })));
      setSelectedIds(new Set());

      toast.success(`Imported ${importResult.tracks.length} tracks from file`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Import from manual input
  const importFromManual = useCallback(async (input: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('import-playlist', {
        body: { 
          manualInput: input,
          deduplicate: true,
          enrichWithYouTube: true,
        }
      });

      if (invokeError) throw invokeError;
      if (data.status === 'error') {
        throw new Error(data.error || 'Import failed');
      }

      const importResult: PlaylistResult = data.data;
      setResult(importResult);
      setTracks(importResult.tracks.map(t => ({ ...t, selected: false })));
      setSelectedIds(new Set());

      toast.success(`Parsed ${importResult.tracks.length} tracks`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search tracks
  const searchTracks = useCallback(async (query: string): Promise<NormalizedTrack[]> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('import-playlist', {
        body: { searchQuery: query }
      });

      if (invokeError) throw invokeError;
      return data.data?.tracks || [];
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    }
  }, []);

  // Selection functions
  const selectTrack = useCallback((trackId: string) => {
    setSelectedIds(prev => new Set([...prev, trackId]));
  }, []);

  const deselectTrack = useCallback((trackId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });
  }, []);

  const toggleTrackSelection = useCallback((trackId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(tracks.map(t => t.id)));
  }, [tracks]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const invertSelection = useCallback(() => {
    setSelectedIds(prev => {
      const allIds = new Set(tracks.map(t => t.id));
      const inverted = new Set<string>();
      allIds.forEach(id => {
        if (!prev.has(id)) inverted.add(id);
      });
      return inverted;
    });
  }, [tracks]);

  const selectRange = useCallback((start: number, end: number) => {
    const rangeIds = tracks.slice(start, end + 1).map(t => t.id);
    setSelectedIds(prev => new Set([...prev, ...rangeIds]));
  }, [tracks]);

  // Selected tracks
  const selectedTracks = useMemo(() => {
    return tracks.filter(t => selectedIds.has(t.id));
  }, [tracks, selectedIds]);

  // Filtered and sorted tracks
  const filteredTracks = useMemo(() => {
    let filtered = [...tracks];

    // Apply filters
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        t.album?.toLowerCase().includes(query)
      );
    }

    if (filters.regex) {
      try {
        const regex = new RegExp(filters.regex, 'i');
        filtered = filtered.filter(t => 
          regex.test(t.title) || regex.test(t.artist)
        );
      } catch {
        // Invalid regex, ignore
      }
    }

    if (filters.genres?.length) {
      filtered = filtered.filter(t => 
        t.genre && filters.genres!.includes(t.genre)
      );
    }

    if (filters.moods?.length) {
      filtered = filtered.filter(t => 
        t.mood && filters.moods!.includes(t.mood)
      );
    }

    if (filters.platforms?.length) {
      filtered = filtered.filter(t => 
        filters.platforms!.includes(t.source_platform)
      );
    }

    if (filters.years) {
      if (filters.years.min) {
        filtered = filtered.filter(t => 
          t.release_year && t.release_year >= filters.years!.min!
        );
      }
      if (filters.years.max) {
        filtered = filtered.filter(t => 
          t.release_year && t.release_year <= filters.years!.max!
        );
      }
    }

    if (filters.explicit !== null && filters.explicit !== undefined) {
      filtered = filtered.filter(t => t.is_explicit === filters.explicit);
    }

    if (filters.minDuration) {
      filtered = filtered.filter(t => 
        t.duration_ms && t.duration_ms >= filters.minDuration! * 1000
      );
    }

    if (filters.maxDuration) {
      filtered = filtered.filter(t => 
        t.duration_ms && t.duration_ms <= filters.maxDuration! * 1000
      );
    }

    // Apply sorting
    switch (sortMode) {
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'artist':
        filtered.sort((a, b) => a.artist.localeCompare(b.artist));
        break;
      case 'duration':
        filtered.sort((a, b) => (a.duration_ms || 0) - (b.duration_ms || 0));
        break;
      case 'release_year':
        filtered.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
        break;
      case 'popularity':
        filtered.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
        break;
      case 'bpm':
        filtered.sort((a, b) => (a.bpm || 0) - (b.bpm || 0));
        break;
      case 'random_shuffle':
        filtered.sort(() => Math.random() - 0.5);
        break;
      // 'original_order' and default: keep original order
    }

    return filtered;
  }, [tracks, filters, sortMode]);

  // Export to file
  const exportToFile = useCallback((format: 'json' | 'csv' | 'm3u' | 'txt', selectedOnly = false) => {
    const tracksToExport = selectedOnly ? selectedTracks : tracks;
    let content = '';
    let filename = `playlist_${Date.now()}`;

    switch (format) {
      case 'json':
        content = JSON.stringify({
          exported_at: new Date().toISOString(),
          total_tracks: tracksToExport.length,
          tracks: tracksToExport,
        }, null, 2);
        filename += '.json';
        break;
      
      case 'csv':
        const headers = ['title', 'artist', 'album', 'duration_ms', 'source_platform'];
        content = headers.join(',') + '\n';
        content += tracksToExport.map(t => 
          headers.map(h => `"${(t[h as keyof NormalizedTrack] || '').toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        filename += '.csv';
        break;
      
      case 'm3u':
        content = '#EXTM3U\n';
        content += tracksToExport.map(t => {
          const duration = Math.floor((t.duration_ms || 0) / 1000);
          return `#EXTINF:${duration},${t.artist} - ${t.title}\n${t.video_id ? `https://www.youtube.com/watch?v=${t.video_id}` : t.title}`;
        }).join('\n');
        filename += '.m3u';
        break;
      
      case 'txt':
        content = tracksToExport.map(t => `${t.artist} - ${t.title}`).join('\n');
        filename += '.txt';
        break;
    }

    // Download file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${tracksToExport.length} tracks to ${filename}`);
  }, [tracks, selectedTracks]);

  // Reset state
  const reset = useCallback(() => {
    setResult(null);
    setTracks([]);
    setSelectedIds(new Set());
    setError(null);
    setSortMode('original_order');
    setFilters({});
  }, []);

  // Get tracks grouped by platform
  const getTracksByPlatform = useCallback(() => {
    const grouped: Record<Platform, NormalizedTrack[]> = {
      youtube: [],
      spotify: [],
      apple_music: [],
      soundcloud: [],
      jiosaavn: [],
      wynk: [],
      local: [],
      manual: [],
    };
    
    tracks.forEach(track => {
      grouped[track.source_platform].push(track);
    });
    
    return grouped;
  }, [tracks]);

  // Find potential duplicates
  const getDuplicates = useCallback(() => {
    const groups = new Map<string, NormalizedTrack[]>();
    
    tracks.forEach(track => {
      const key = `${track.title.toLowerCase()}|${track.artist.toLowerCase()}`;
      const existing = groups.get(key) || [];
      existing.push(track);
      groups.set(key, existing);
    });
    
    return Array.from(groups.values()).filter(g => g.length > 1);
  }, [tracks]);

  return {
    result,
    tracks,
    selectedTracks,
    isLoading,
    error,
    importFromUrl,
    importFromFile,
    importFromManual,
    searchTracks,
    selectTrack,
    deselectTrack,
    toggleTrackSelection,
    selectAll,
    deselectAll,
    invertSelection,
    selectRange,
    sortMode,
    setSortMode,
    filters,
    setFilters,
    filteredTracks,
    exportToFile,
    reset,
    getTracksByPlatform,
    getDuplicates,
  };
};
