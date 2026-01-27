import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  checkRateLimit, 
  getClientIdentifier, 
  createRateLimitResponse,
  getRateLimitHeaders 
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============== TYPES ==============

type Platform = 'youtube' | 'spotify' | 'apple_music' | 'soundcloud' | 'jiosaavn' | 'wynk' | 'local' | 'manual';

interface NormalizedTrack {
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
}

interface PlaylistResult {
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

// ============== URL EXTRACTORS ==============

function extractSpotifyPlaylistId(url: string): string | null {
  const patterns = [
    /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /spotify\.com\/embed\/playlist\/([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractYouTubePlaylistId(url: string): string | null {
  const patterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/.*\?list=([a-zA-Z0-9_-]+)/,
    /music\.youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractAppleMusicPlaylistId(url: string): string | null {
  const patterns = [
    /music\.apple\.com\/.*\/playlist\/[^\/]+\/pl\.([a-zA-Z0-9-]+)/,
    /music\.apple\.com\/.*\/playlist\/.*\/([a-zA-Z0-9-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractSoundCloudPlaylistUrl(url: string): string | null {
  if (url.includes('soundcloud.com') && (url.includes('/sets/') || url.includes('/playlist'))) {
    return url;
  }
  return null;
}

function extractJioSaavnPlaylistId(url: string): string | null {
  const patterns = [
    /jiosaavn\.com\/featured\/[^\/]+\/([a-zA-Z0-9_-]+)/,
    /jiosaavn\.com\/s\/playlist\/[^\/]+\/([a-zA-Z0-9_-]+)/,
    /saavn\.com\/.*\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractWynkPlaylistId(url: string): string | null {
  const patterns = [
    /wynk\.in\/music\/playlist\/[^\/]+\/([a-zA-Z0-9_-]+)/,
    /wynk\.in\/.*playlist.*\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function detectPlatform(url: string): Platform | null {
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('music.youtube.com')) return 'youtube';
  if (url.includes('music.apple.com')) return 'apple_music';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('jiosaavn.com') || url.includes('saavn.com')) return 'jiosaavn';
  if (url.includes('wynk.in')) return 'wynk';
  return null;
}

// ============== YOUTUBE PARSER ==============

async function parseYouTubePlaylist(playlistId: string): Promise<PlaylistResult> {
  try {
    console.log(`[ImportPlaylist] Parsing YouTube playlist: ${playlistId}`);
    
    const response = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      return createErrorResult('youtube', 'FETCH_FAILED', `Failed to fetch playlist: ${response.status}`);
    }

    const html = await response.text();
    
    // Check for private playlist
    if (html.includes('This playlist is private') || html.includes('Sign in to confirm your age')) {
      return createErrorResult('youtube', 'PRIVATE_PLAYLIST', 'This playlist is private or age-restricted');
    }

    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || 
                      html.match(/ytInitialData\s*=\s*({.*?});/s);
    
    if (!dataMatch) {
      return createErrorResult('youtube', 'PARSE_FAILED', 'Could not parse playlist data');
    }

    const data = JSON.parse(dataMatch[1]);
    const tracks: NormalizedTrack[] = [];

    const playlistTitle = data?.metadata?.playlistMetadataRenderer?.title || 
                         data?.header?.playlistHeaderRenderer?.title?.simpleText ||
                         "YouTube Playlist";

    // Try multiple paths for playlist items
    let contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || [];
    
    if (contents.length === 0) {
      contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || [];
    }
    
    if (contents.length === 0) {
      const sectionContents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const section of sectionContents) {
        const playlistRenderer = section?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer;
        if (playlistRenderer?.contents) {
          contents = playlistRenderer.contents;
          break;
        }
      }
    }

    for (const item of contents) {
      const videoRenderer = item.playlistVideoRenderer;
      if (!videoRenderer) continue;

      const videoId = videoRenderer.videoId;
      if (!videoId) continue;

      const title = videoRenderer.title?.runs?.[0]?.text || "";
      const channelName = videoRenderer.shortBylineText?.runs?.[0]?.text || 
                         videoRenderer.longBylineText?.runs?.[0]?.text || "";
      const thumbnail = videoRenderer.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || 
                       `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      
      const durationText = videoRenderer.lengthText?.simpleText || "";
      let durationMs = 0;
      if (durationText) {
        const parts = durationText.split(':').map(Number);
        if (parts.length === 2) {
          durationMs = (parts[0] * 60 + parts[1]) * 1000;
        } else if (parts.length === 3) {
          durationMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        }
      }

      // Parse artist and title from video title
      const { parsedTitle, parsedArtist } = parseTrackInfo(title, channelName);

      tracks.push({
        id: videoId,
        title: parsedTitle,
        artist: parsedArtist,
        track_id: videoId,
        duration_ms: durationMs,
        source_platform: 'youtube',
        thumb_url: thumbnail,
        video_id: videoId,
        match_confidence: 100,
      });
    }

    return {
      status: tracks.length > 0 ? 'success' : 'warning',
      playlist_source: 'youtube',
      playlist_name: playlistTitle,
      playlist_url: `https://www.youtube.com/playlist?list=${playlistId}`,
      total_tracks: tracks.length,
      deduplicated: 0,
      enriched_fields: [],
      tracks,
      warnings: tracks.length === 0 ? ['No playable tracks found in this playlist'] : undefined,
    };
  } catch (error) {
    console.error("[ImportPlaylist] YouTube parse error:", error);
    return createErrorResult('youtube', 'PARSE_ERROR', error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============== SPOTIFY PARSER ==============

async function parseSpotifyPlaylist(playlistId: string): Promise<PlaylistResult> {
  try {
    console.log(`[ImportPlaylist] Parsing Spotify playlist: ${playlistId}`);
    
    const embedResponse = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await embedResponse.text();
    
    // Check for private/unavailable
    if (html.includes('unavailable') || html.includes('not found')) {
      return createErrorResult('spotify', 'PLAYLIST_UNAVAILABLE', 'Playlist is private or unavailable');
    }

    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>({.*?})<\/script>/s);
    
    let playlistName = "Spotify Playlist";
    const tracks: NormalizedTrack[] = [];

    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const entity = nextData?.props?.pageProps?.state?.data?.entity;
        
        if (entity) {
          playlistName = entity.name || playlistName;
          
          const trackList = entity.trackList || [];
          for (const track of trackList) {
            if (track.title && track.subtitle) {
              tracks.push({
                id: track.uid || `spotify_${Date.now()}_${Math.random()}`,
                title: track.title,
                artist: track.subtitle,
                album: track.album?.name,
                track_id: track.uri || track.uid,
                duration_ms: track.duration,
                source_platform: 'spotify',
                thumb_url: track.images?.[0]?.url || "",
                is_explicit: track.isExplicit,
                match_confidence: 100,
              });
            }
          }
        }
      } catch (e) {
        console.error("[ImportPlaylist] Failed to parse Spotify __NEXT_DATA__:", e);
      }
    }

    // Fallback: try oembed for playlist name
    if (playlistName === "Spotify Playlist") {
      try {
        const oembedResponse = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${playlistId}`);
        const oembedData = await oembedResponse.json();
        if (oembedData.title) {
          playlistName = oembedData.title;
        }
      } catch (e) {
        console.error("[ImportPlaylist] Failed to fetch oembed:", e);
      }
    }

    // Find YouTube matches for Spotify tracks
    if (tracks.length > 0) {
      const enrichedTracks = await enrichWithYouTubeMatches(tracks);
      return {
        status: 'success',
        playlist_source: 'spotify',
        playlist_name: playlistName,
        playlist_url: `https://open.spotify.com/playlist/${playlistId}`,
        total_tracks: tracks.length,
        deduplicated: 0,
        enriched_fields: ['video_id', 'thumb_url'],
        tracks: enrichedTracks,
        warnings: enrichedTracks.length < tracks.length 
          ? [`Found ${enrichedTracks.length} of ${tracks.length} tracks on YouTube`]
          : undefined,
      };
    }

    return {
      status: 'warning',
      playlist_source: 'spotify',
      playlist_name: playlistName,
      playlist_url: `https://open.spotify.com/playlist/${playlistId}`,
      total_tracks: 0,
      deduplicated: 0,
      enriched_fields: [],
      tracks: [],
      warnings: ['Spotify playlist parsed but track details require authentication'],
    };
  } catch (error) {
    console.error("[ImportPlaylist] Spotify parse error:", error);
    return createErrorResult('spotify', 'PARSE_ERROR', error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============== APPLE MUSIC PARSER ==============

async function parseAppleMusicPlaylist(playlistId: string, url: string): Promise<PlaylistResult> {
  try {
    console.log(`[ImportPlaylist] Parsing Apple Music playlist: ${playlistId}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    
    // Extract playlist data from meta tags and structured data
    let playlistName = "Apple Music Playlist";
    const tracks: NormalizedTrack[] = [];
    
    // Try to extract from JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>({.*?})<\/script>/s);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.name) playlistName = jsonLd.name;
        
        if (jsonLd.track && Array.isArray(jsonLd.track)) {
          for (const track of jsonLd.track) {
            tracks.push({
              id: `apple_${Date.now()}_${Math.random()}`,
              title: track.name || '',
              artist: track.byArtist?.name || '',
              album: track.inAlbum?.name,
              track_id: track['@id'] || '',
              duration_ms: track.duration ? parseDuration(track.duration) : undefined,
              source_platform: 'apple_music',
              thumb_url: track.image?.[0] || '',
              match_confidence: 100,
            });
          }
        }
      } catch (e) {
        console.error("[ImportPlaylist] Failed to parse Apple Music JSON-LD:", e);
      }
    }

    // Try meta tags as fallback
    if (!playlistName || playlistName === "Apple Music Playlist") {
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      if (titleMatch) playlistName = titleMatch[1];
    }

    // Extract from server data
    const serverDataMatch = html.match(/data-hypernova-key="ServerData"[^>]*><!--({.*?})-->/s);
    if (serverDataMatch && tracks.length === 0) {
      try {
        const serverData = JSON.parse(serverDataMatch[1]);
        const playlist = serverData?.data?.seoData?.ogSongs || [];
        for (const song of playlist) {
          tracks.push({
            id: song.id || `apple_${Date.now()}_${Math.random()}`,
            title: song.name || '',
            artist: song.artist || '',
            album: song.album,
            track_id: song.id || '',
            source_platform: 'apple_music',
            thumb_url: song.artwork || '',
            match_confidence: 100,
          });
        }
      } catch (e) {
        console.error("[ImportPlaylist] Failed to parse Apple Music server data:", e);
      }
    }

    if (tracks.length > 0) {
      const enrichedTracks = await enrichWithYouTubeMatches(tracks);
      return {
        status: 'success',
        playlist_source: 'apple_music',
        playlist_name: playlistName,
        playlist_url: url,
        total_tracks: tracks.length,
        deduplicated: 0,
        enriched_fields: ['video_id'],
        tracks: enrichedTracks,
      };
    }

    return {
      status: 'warning',
      playlist_source: 'apple_music',
      playlist_name: playlistName,
      playlist_url: url,
      total_tracks: 0,
      deduplicated: 0,
      enriched_fields: [],
      tracks: [],
      warnings: ['Could not extract tracks from Apple Music playlist. The playlist may be private or region-locked.'],
    };
  } catch (error) {
    console.error("[ImportPlaylist] Apple Music parse error:", error);
    return createErrorResult('apple_music', 'PARSE_ERROR', error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============== SOUNDCLOUD PARSER ==============

async function parseSoundCloudPlaylist(url: string): Promise<PlaylistResult> {
  try {
    console.log(`[ImportPlaylist] Parsing SoundCloud playlist: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    
    let playlistName = "SoundCloud Playlist";
    const tracks: NormalizedTrack[] = [];
    
    // Extract from meta tags
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (titleMatch) playlistName = titleMatch[1];

    // Try to extract hydration data
    const hydrationMatch = html.match(/window\.__sc_hydration\s*=\s*(\[.*?\]);/s);
    if (hydrationMatch) {
      try {
        const hydration = JSON.parse(hydrationMatch[1]);
        for (const item of hydration) {
          if (item.hydratable === 'playlist' && item.data) {
            const playlist = item.data;
            playlistName = playlist.title || playlistName;
            
            if (playlist.tracks && Array.isArray(playlist.tracks)) {
              for (const track of playlist.tracks) {
                if (track.title) {
                  tracks.push({
                    id: String(track.id) || `sc_${Date.now()}_${Math.random()}`,
                    title: track.title,
                    artist: track.user?.username || '',
                    track_id: String(track.id),
                    duration_ms: track.duration,
                    source_platform: 'soundcloud',
                    thumb_url: track.artwork_url?.replace('-large', '-t500x500') || '',
                    genre: track.genre,
                    match_confidence: 100,
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("[ImportPlaylist] Failed to parse SoundCloud hydration:", e);
      }
    }

    if (tracks.length > 0) {
      const enrichedTracks = await enrichWithYouTubeMatches(tracks);
      return {
        status: 'success',
        playlist_source: 'soundcloud',
        playlist_name: playlistName,
        playlist_url: url,
        total_tracks: tracks.length,
        deduplicated: 0,
        enriched_fields: ['video_id'],
        tracks: enrichedTracks,
      };
    }

    return {
      status: 'warning',
      playlist_source: 'soundcloud',
      playlist_name: playlistName,
      playlist_url: url,
      total_tracks: 0,
      deduplicated: 0,
      enriched_fields: [],
      tracks: [],
      warnings: ['Could not extract tracks from SoundCloud playlist'],
    };
  } catch (error) {
    console.error("[ImportPlaylist] SoundCloud parse error:", error);
    return createErrorResult('soundcloud', 'PARSE_ERROR', error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============== JIOSAAVN PARSER ==============

async function parseJioSaavnPlaylist(playlistId: string, url: string): Promise<PlaylistResult> {
  try {
    console.log(`[ImportPlaylist] Parsing JioSaavn playlist: ${playlistId}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    
    let playlistName = "JioSaavn Playlist";
    const tracks: NormalizedTrack[] = [];
    
    // Extract from meta tags
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (titleMatch) playlistName = titleMatch[1].replace(' - JioSaavn', '');

    // Try to extract from window.__INITIAL_DATA__
    const initialDataMatch = html.match(/window\.__INITIAL_DATA__\s*=\s*({.*?});/s);
    if (initialDataMatch) {
      try {
        const initialData = JSON.parse(initialDataMatch[1]);
        const songs = initialData?.playlist?.list || initialData?.songs || [];
        
        for (const song of songs) {
          tracks.push({
            id: song.id || `jiosaavn_${Date.now()}_${Math.random()}`,
            title: song.title || song.song || '',
            artist: song.primary_artists || song.singers || song.artist || '',
            album: song.album,
            track_id: song.id || '',
            duration_ms: song.duration ? parseInt(song.duration) * 1000 : undefined,
            source_platform: 'jiosaavn',
            thumb_url: song.image?.replace('150x150', '500x500') || '',
            release_year: song.year ? parseInt(song.year) : undefined,
            match_confidence: 100,
          });
        }
      } catch (e) {
        console.error("[ImportPlaylist] Failed to parse JioSaavn data:", e);
      }
    }

    if (tracks.length > 0) {
      const enrichedTracks = await enrichWithYouTubeMatches(tracks);
      return {
        status: 'success',
        playlist_source: 'jiosaavn',
        playlist_name: playlistName,
        playlist_url: url,
        total_tracks: tracks.length,
        deduplicated: 0,
        enriched_fields: ['video_id'],
        tracks: enrichedTracks,
      };
    }

    return {
      status: 'warning',
      playlist_source: 'jiosaavn',
      playlist_name: playlistName,
      playlist_url: url,
      total_tracks: 0,
      deduplicated: 0,
      enriched_fields: [],
      tracks: [],
      warnings: ['Could not extract tracks from JioSaavn playlist'],
    };
  } catch (error) {
    console.error("[ImportPlaylist] JioSaavn parse error:", error);
    return createErrorResult('jiosaavn', 'PARSE_ERROR', error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============== WYNK PARSER ==============

async function parseWynkPlaylist(playlistId: string, url: string): Promise<PlaylistResult> {
  try {
    console.log(`[ImportPlaylist] Parsing Wynk playlist: ${playlistId}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    
    let playlistName = "Wynk Playlist";
    const tracks: NormalizedTrack[] = [];
    
    // Extract from meta tags
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (titleMatch) playlistName = titleMatch[1];

    // Try to extract from __NEXT_DATA__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>({.*?})<\/script>/s);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const playlist = nextData?.props?.pageProps?.playlist || nextData?.props?.pageProps?.data;
        
        if (playlist) {
          playlistName = playlist.title || playlist.name || playlistName;
          const songs = playlist.songs || playlist.items || [];
          
          for (const song of songs) {
            tracks.push({
              id: song.id || `wynk_${Date.now()}_${Math.random()}`,
              title: song.title || song.name || '',
              artist: song.artist || song.singers || '',
              album: song.album,
              track_id: song.id || '',
              duration_ms: song.duration ? song.duration * 1000 : undefined,
              source_platform: 'wynk',
              thumb_url: song.image || song.artwork || '',
              match_confidence: 100,
            });
          }
        }
      } catch (e) {
        console.error("[ImportPlaylist] Failed to parse Wynk data:", e);
      }
    }

    if (tracks.length > 0) {
      const enrichedTracks = await enrichWithYouTubeMatches(tracks);
      return {
        status: 'success',
        playlist_source: 'wynk',
        playlist_name: playlistName,
        playlist_url: url,
        total_tracks: tracks.length,
        deduplicated: 0,
        enriched_fields: ['video_id'],
        tracks: enrichedTracks,
      };
    }

    return {
      status: 'warning',
      playlist_source: 'wynk',
      playlist_name: playlistName,
      playlist_url: url,
      total_tracks: 0,
      deduplicated: 0,
      enriched_fields: [],
      tracks: [],
      warnings: ['Could not extract tracks from Wynk playlist'],
    };
  } catch (error) {
    console.error("[ImportPlaylist] Wynk parse error:", error);
    return createErrorResult('wynk', 'PARSE_ERROR', error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============== LOCAL FILE PARSER ==============

function parseLocalFile(content: string, format: string): PlaylistResult {
  console.log(`[ImportPlaylist] Parsing local file format: ${format}`);
  
  const tracks: NormalizedTrack[] = [];
  
  try {
    if (format === 'json') {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : data.tracks || data.songs || data.items || [];
      
      for (const item of items) {
        tracks.push({
          id: item.id || `local_${Date.now()}_${Math.random()}`,
          title: item.title || item.name || '',
          artist: item.artist || item.artists?.join(', ') || '',
          album: item.album,
          track_id: item.id || `local_${Date.now()}`,
          duration_ms: item.duration_ms || item.duration,
          source_platform: 'local',
          thumb_url: item.thumb_url || item.image || item.artwork || '',
          match_confidence: 100,
        });
      }
    } else if (format === 'csv') {
      const lines = content.split('\n').filter(l => l.trim());
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const track: Record<string, string> = {};
        
        headers.forEach((h, idx) => {
          track[h] = values[idx] || '';
        });
        
        if (track.title || track.name) {
          tracks.push({
            id: `local_${Date.now()}_${i}`,
            title: track.title || track.name || '',
            artist: track.artist || track.artists || '',
            album: track.album,
            track_id: `local_${Date.now()}_${i}`,
            source_platform: 'local',
            match_confidence: 100,
          });
        }
      }
    } else if (format === 'm3u') {
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Try to extract title from filename
        const filename = line.split('/').pop()?.replace(/\.(mp3|m4a|flac|wav|ogg)$/i, '') || line;
        const parts = filename.split(' - ');
        
        tracks.push({
          id: `local_${Date.now()}_${i}`,
          title: parts.length > 1 ? parts[1] : filename,
          artist: parts.length > 1 ? parts[0] : 'Unknown Artist',
          track_id: `local_${Date.now()}_${i}`,
          source_platform: 'local',
          match_confidence: 80,
        });
      }
    } else if (format === 'txt') {
      const lines = content.split('\n').filter(l => l.trim());
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Assume format: "Artist - Title" or just "Title"
        const parts = line.split(' - ');
        
        tracks.push({
          id: `local_${Date.now()}_${i}`,
          title: parts.length > 1 ? parts[1].trim() : line,
          artist: parts.length > 1 ? parts[0].trim() : 'Unknown Artist',
          track_id: `local_${Date.now()}_${i}`,
          source_platform: 'local',
          match_confidence: 80,
        });
      }
    }

    return {
      status: tracks.length > 0 ? 'success' : 'warning',
      playlist_source: 'local',
      playlist_name: 'Imported Playlist',
      total_tracks: tracks.length,
      deduplicated: 0,
      enriched_fields: [],
      tracks,
      warnings: tracks.length === 0 ? ['No valid tracks found in file'] : undefined,
    };
  } catch (error) {
    console.error("[ImportPlaylist] Local file parse error:", error);
    return createErrorResult('local', 'PARSE_ERROR', error instanceof Error ? error.message : 'Invalid file format');
  }
}

// ============== MANUAL INPUT PARSER ==============

function parseManualInput(input: string): PlaylistResult {
  console.log(`[ImportPlaylist] Parsing manual input`);
  
  const tracks: NormalizedTrack[] = [];
  const lines = input.split('\n').filter(l => l.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Assume format: "Artist - Title" or just "Title"
    const parts = line.split(' - ');
    
    tracks.push({
      id: `manual_${Date.now()}_${i}`,
      title: parts.length > 1 ? parts[1].trim() : line,
      artist: parts.length > 1 ? parts[0].trim() : 'Unknown Artist',
      track_id: `manual_${Date.now()}_${i}`,
      source_platform: 'manual',
      match_confidence: 80,
    });
  }

  return {
    status: tracks.length > 0 ? 'success' : 'warning',
    playlist_source: 'manual',
    playlist_name: 'Manual Playlist',
    total_tracks: tracks.length,
    deduplicated: 0,
    enriched_fields: [],
    tracks,
    warnings: tracks.length === 0 ? ['No valid tracks in input'] : undefined,
  };
}

// ============== HELPER FUNCTIONS ==============

function createErrorResult(source: Platform, code: string, message: string): PlaylistResult {
  return {
    status: 'error',
    error_code: code,
    error_message: message,
    playlist_source: source,
    playlist_name: '',
    total_tracks: 0,
    deduplicated: 0,
    enriched_fields: [],
    tracks: [],
  };
}

function parseTrackInfo(title: string, channelName: string): { parsedTitle: string; parsedArtist: string } {
  // Try to extract artist - title from common formats
  const patterns = [
    /^(.+?)\s*[-–—]\s*(.+)$/,  // Artist - Title
    /^(.+?)\s*[:|]\s*(.+)$/,   // Artist : Title or Artist | Title
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      // Check if first part looks like an artist name
      const first = match[1].trim();
      const second = match[2].trim();
      
      // Remove common suffixes
      const cleanSecond = second
        .replace(/\s*\(Official.*?\)/gi, '')
        .replace(/\s*\[Official.*?\]/gi, '')
        .replace(/\s*\(Lyric.*?\)/gi, '')
        .replace(/\s*\(Audio.*?\)/gi, '')
        .replace(/\s*\(Music Video.*?\)/gi, '')
        .trim();
      
      return { parsedArtist: first, parsedTitle: cleanSecond || second };
    }
  }
  
  // Clean up the title
  const cleanTitle = title
    .replace(/\s*\(Official.*?\)/gi, '')
    .replace(/\s*\[Official.*?\]/gi, '')
    .replace(/\s*\(Lyric.*?\)/gi, '')
    .replace(/\s*\(Audio.*?\)/gi, '')
    .trim();
  
  return { parsedTitle: cleanTitle || title, parsedArtist: channelName };
}

function parseDuration(isoDuration: string): number {
  // Parse ISO 8601 duration (PT3M45S)
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (match) {
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  return 0;
}

// ============== YOUTUBE ENRICHMENT ==============

async function searchYouTubeForTrack(query: string): Promise<NormalizedTrack | null> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " official audio")}&sp=EgIQAQ%253D%253D`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || 
                      html.match(/ytInitialData\s*=\s*({.*?});/s);
    
    if (!dataMatch) return null;

    const data = JSON.parse(dataMatch[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    
    if (!contents) return null;

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      
      for (const item of items) {
        const videoRenderer = item.videoRenderer;
        if (!videoRenderer) continue;

        const videoId = videoRenderer.videoId;
        if (!videoId) continue;

        const title = videoRenderer.title?.runs?.[0]?.text || "";
        const channelName = videoRenderer.ownerText?.runs?.[0]?.text || "";
        const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        
        const durationText = videoRenderer.lengthText?.simpleText || "";
        let durationMs = 0;
        if (durationText) {
          const parts = durationText.split(':').map(Number);
          if (parts.length === 2) {
            durationMs = (parts[0] * 60 + parts[1]) * 1000;
          }
        }

        return {
          id: videoId,
          title,
          artist: channelName,
          track_id: videoId,
          duration_ms: durationMs,
          source_platform: 'youtube',
          thumb_url: thumbnail,
          video_id: videoId,
          match_confidence: 85,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("[ImportPlaylist] YouTube search error:", error);
    return null;
  }
}

async function enrichWithYouTubeMatches(tracks: NormalizedTrack[]): Promise<NormalizedTrack[]> {
  const results: NormalizedTrack[] = [];
  const batchSize = 3;
  
  // Limit to first 50 tracks for performance
  const tracksToProcess = tracks.slice(0, 50);
  
  for (let i = 0; i < tracksToProcess.length; i += batchSize) {
    const batch = tracksToProcess.slice(i, i + batchSize);
    const promises = batch.map(async (track) => {
      const query = `${track.artist} ${track.title}`;
      const ytResult = await searchYouTubeForTrack(query);
      
      if (ytResult) {
        return {
          ...track,
          video_id: ytResult.video_id,
          thumb_url: track.thumb_url || ytResult.thumb_url,
          duration_ms: track.duration_ms || ytResult.duration_ms,
          match_confidence: ytResult.match_confidence,
        };
      }
      return track;
    });
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < tracksToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// ============== DEDUPLICATION ==============

function deduplicateTracks(tracks: NormalizedTrack[]): { tracks: NormalizedTrack[]; removed: number } {
  const seen = new Map<string, NormalizedTrack>();
  let removed = 0;
  
  for (const track of tracks) {
    // Create composite key for deduplication
    const key = `${track.title.toLowerCase().trim()}|${track.artist.toLowerCase().trim()}`;
    const isrcKey = track.isrc_code ? `isrc:${track.isrc_code}` : null;
    
    // Check ISRC first (most reliable)
    if (isrcKey && seen.has(isrcKey)) {
      removed++;
      continue;
    }
    
    // Check title+artist
    if (seen.has(key)) {
      removed++;
      continue;
    }
    
    seen.set(key, track);
    if (isrcKey) seen.set(isrcKey, track);
  }
  
  return { tracks: Array.from(new Set(seen.values())), removed };
}

// ============== SEARCH FUNCTION ==============

async function searchSongs(query: string): Promise<NormalizedTrack[]> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " song")}&sp=EgIQAQ%253D%253D`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || 
                      html.match(/ytInitialData\s*=\s*({.*?});/s);
    
    if (!dataMatch) return [];

    const data = JSON.parse(dataMatch[1]);
    const tracks: NormalizedTrack[] = [];
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    
    if (!contents) return [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      
      for (const item of items) {
        const videoRenderer = item.videoRenderer;
        if (!videoRenderer) continue;

        const videoId = videoRenderer.videoId;
        if (!videoId) continue;

        const title = videoRenderer.title?.runs?.[0]?.text || "";
        const channelName = videoRenderer.ownerText?.runs?.[0]?.text || "";
        const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        
        const durationText = videoRenderer.lengthText?.simpleText || "";
        let durationMs = 0;
        if (durationText) {
          const parts = durationText.split(':').map(Number);
          if (parts.length === 2) {
            durationMs = (parts[0] * 60 + parts[1]) * 1000;
          } else if (parts.length === 3) {
            durationMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
          }
        }

        const durationSec = durationMs / 1000;
        // Filter shorts
        if (durationSec > 30 && durationSec < 600) {
          const { parsedTitle, parsedArtist } = parseTrackInfo(title, channelName);
          
          tracks.push({
            id: videoId,
            title: parsedTitle,
            artist: parsedArtist,
            track_id: videoId,
            duration_ms: durationMs,
            source_platform: 'youtube',
            thumb_url: thumbnail,
            video_id: videoId,
            match_confidence: 100,
          });
        }
      }
    }

    return tracks.slice(0, 20);
  } catch (error) {
    console.error("[ImportPlaylist] Search error:", error);
    return [];
  }
}

// ============== MAIN HANDLER ==============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimitResult = checkRateLimit(clientId, { maxRequests: 10, windowMs: 60000 });
    
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const body = await req.json();
    const { 
      url, 
      searchQuery, 
      fileContent, 
      fileFormat, 
      manualInput,
      deduplicate = true,
      enrichWithYouTube = true,
    } = body;

    console.log(`[ImportPlaylist] Request: url=${url}, searchQuery=${searchQuery}, fileFormat=${fileFormat}`);

    // Handle search request
    if (searchQuery) {
      const tracks = await searchSongs(searchQuery);
      return new Response(
        JSON.stringify({ 
          status: 'success',
          data: { tracks } 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle manual input
    if (manualInput) {
      let result = parseManualInput(manualInput);
      
      if (deduplicate) {
        const { tracks, removed } = deduplicateTracks(result.tracks);
        result.tracks = tracks;
        result.deduplicated = removed;
      }
      
      if (enrichWithYouTube && result.tracks.length > 0) {
        result.tracks = await enrichWithYouTubeMatches(result.tracks);
        result.enriched_fields.push('video_id', 'thumb_url');
      }
      
      return new Response(
        JSON.stringify({ data: result, success: result.status !== 'error' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle local file
    if (fileContent && fileFormat) {
      let result = parseLocalFile(fileContent, fileFormat);
      
      if (deduplicate) {
        const { tracks, removed } = deduplicateTracks(result.tracks);
        result.tracks = tracks;
        result.deduplicated = removed;
      }
      
      if (enrichWithYouTube && result.tracks.length > 0) {
        result.tracks = await enrichWithYouTubeMatches(result.tracks);
        result.enriched_fields.push('video_id', 'thumb_url');
      }
      
      return new Response(
        JSON.stringify({ data: result, success: result.status !== 'error' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle URL import
    if (!url) {
      return new Response(
        JSON.stringify({ 
          status: 'error',
          error: "URL, searchQuery, fileContent, or manualInput is required" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ 
          status: 'error',
          error_code: 'INVALID_URL',
          error: "Invalid URL format" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const platform = detectPlatform(url);
    let result: PlaylistResult;

    switch (platform) {
      case 'youtube': {
        const playlistId = extractYouTubePlaylistId(url);
        if (!playlistId) {
          return new Response(
            JSON.stringify({ status: 'error', error_code: 'INVALID_URL', error: "Invalid YouTube playlist URL" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await parseYouTubePlaylist(playlistId);
        break;
      }
      
      case 'spotify': {
        const playlistId = extractSpotifyPlaylistId(url);
        if (!playlistId) {
          return new Response(
            JSON.stringify({ status: 'error', error_code: 'INVALID_URL', error: "Invalid Spotify playlist URL" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await parseSpotifyPlaylist(playlistId);
        break;
      }
      
      case 'apple_music': {
        const playlistId = extractAppleMusicPlaylistId(url);
        if (!playlistId) {
          return new Response(
            JSON.stringify({ status: 'error', error_code: 'INVALID_URL', error: "Invalid Apple Music playlist URL" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await parseAppleMusicPlaylist(playlistId, url);
        break;
      }
      
      case 'soundcloud': {
        const playlistUrl = extractSoundCloudPlaylistUrl(url);
        if (!playlistUrl) {
          return new Response(
            JSON.stringify({ status: 'error', error_code: 'INVALID_URL', error: "Invalid SoundCloud playlist URL" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await parseSoundCloudPlaylist(playlistUrl);
        break;
      }
      
      case 'jiosaavn': {
        const playlistId = extractJioSaavnPlaylistId(url);
        if (!playlistId) {
          return new Response(
            JSON.stringify({ status: 'error', error_code: 'INVALID_URL', error: "Invalid JioSaavn playlist URL" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await parseJioSaavnPlaylist(playlistId, url);
        break;
      }
      
      case 'wynk': {
        const playlistId = extractWynkPlaylistId(url);
        if (!playlistId) {
          return new Response(
            JSON.stringify({ status: 'error', error_code: 'INVALID_URL', error: "Invalid Wynk playlist URL" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await parseWynkPlaylist(playlistId, url);
        break;
      }
      
      default:
        return new Response(
          JSON.stringify({ 
            status: 'error',
            error_code: 'UNSUPPORTED_PLATFORM',
            error: "Unsupported platform. Supported: YouTube, Spotify, Apple Music, SoundCloud, JioSaavn, Wynk" 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Apply deduplication
    if (deduplicate && result.tracks.length > 0) {
      const { tracks, removed } = deduplicateTracks(result.tracks);
      result.tracks = tracks;
      result.deduplicated = removed;
    }

    console.log(`[ImportPlaylist] Returning ${result.tracks.length} tracks for ${result.playlist_name}`);

    return new Response(
      JSON.stringify({ 
        data: result,
        success: result.status !== 'error'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error("[ImportPlaylist] Error:", error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error_code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
