// Universal Playlist Types

export type Platform = 'youtube' | 'spotify' | 'apple_music' | 'soundcloud' | 'jiosaavn' | 'wynk' | 'local' | 'manual';

export interface NormalizedTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  track_id: string;
  duration_ms?: number;
  release_year?: number;
  genre?: string;
  mood?: string;
  popularity_score?: number;
  is_explicit?: boolean;
  isrc_code?: string;
  bpm?: number;
  key?: string;
  source_platform: Platform;
  thumb_url?: string;
  video_id?: string;
  original_url?: string;
  match_confidence?: number;
  selected?: boolean;
}

export interface PlaylistResult {
  status: 'success' | 'warning' | 'error';
  error_code?: string;
  error_message?: string;
  playlist_source: Platform;
  playlist_name: string;
  playlist_url?: string;
  total_tracks: number;
  deduplicated: number;
  enriched_fields: string[];
  tracks: NormalizedTrack[];
  warnings?: string[];
}

export type SortMode = 
  | 'original_order'
  | 'title'
  | 'artist'
  | 'duration'
  | 'release_year'
  | 'popularity'
  | 'mood'
  | 'bpm'
  | 'random_shuffle';

export type SelectionMode = 'single' | 'multi' | 'range' | 'all' | 'invert';

export interface FilterOptions {
  searchQuery?: string;
  genres?: string[];
  moods?: string[];
  years?: { min?: number; max?: number };
  platforms?: Platform[];
  explicit?: boolean | null;
  minDuration?: number;
  maxDuration?: number;
  regex?: string;
}

export interface ExportFormat {
  type: 'json' | 'csv' | 'm3u' | 'txt';
  filename?: string;
}

export interface ImportOptions {
  url?: string;
  fileContent?: string;
  fileFormat?: 'json' | 'csv' | 'm3u' | 'txt';
  manualInput?: string;
  deduplicate?: boolean;
  enrichWithYouTube?: boolean;
}

export const PLATFORM_INFO: Record<Platform, { name: string; color: string; icon: string }> = {
  youtube: { name: 'YouTube', color: '#FF0000', icon: '▶️' },
  spotify: { name: 'Spotify', color: '#1DB954', icon: '🎵' },
  apple_music: { name: 'Apple Music', color: '#FA243C', icon: '🍎' },
  soundcloud: { name: 'SoundCloud', color: '#FF5500', icon: '☁️' },
  jiosaavn: { name: 'JioSaavn', color: '#2BC5B4', icon: '🎧' },
  wynk: { name: 'Wynk', color: '#ED1C24', icon: '🎶' },
  local: { name: 'Local File', color: '#6B7280', icon: '📁' },
  manual: { name: 'Manual', color: '#8B5CF6', icon: '✍️' },
};
