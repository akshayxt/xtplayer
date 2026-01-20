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

interface ParsedTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
  videoId?: string;
}

interface PlaylistData {
  name: string;
  source: 'youtube' | 'spotify';
  tracks: ParsedTrack[];
  note?: string;
}

// Extract Spotify playlist ID from URL
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

// Extract YouTube playlist ID from URL
function extractYouTubePlaylistId(url: string): string | null {
  const patterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/.*\?list=([a-zA-Z0-9_-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Parse YouTube playlist and extract track info
async function parseYouTubePlaylist(playlistId: string): Promise<PlaylistData> {
  try {
    console.log(`[ImportPlaylist] Parsing YouTube playlist: ${playlistId}`);
    
    // Fetch the playlist page
    const response = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    
    // Extract ytInitialData
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || 
                      html.match(/ytInitialData\s*=\s*({.*?});/s);
    
    if (!dataMatch) {
      console.log("[ImportPlaylist] Could not find ytInitialData for playlist");
      return { name: "YouTube Playlist", source: 'youtube', tracks: [], note: "Could not parse playlist data" };
    }

    const data = JSON.parse(dataMatch[1]);
    const tracks: ParsedTrack[] = [];

    // Get playlist title
    const playlistTitle = data?.metadata?.playlistMetadataRenderer?.title || 
                         data?.header?.playlistHeaderRenderer?.title?.simpleText ||
                         "YouTube Playlist";

    console.log(`[ImportPlaylist] Found playlist: ${playlistTitle}`);

    // Navigate to playlist items - try multiple paths
    let contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || [];
    
    // Alternative path for some playlist layouts
    if (contents.length === 0) {
      contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || [];
    }
    
    // Another alternative path
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

    console.log(`[ImportPlaylist] Found ${contents.length} items in playlist`);

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
      
      // Parse duration
      const durationText = videoRenderer.lengthText?.simpleText || "";
      let duration = 0;
      if (durationText) {
        const parts = durationText.split(':').map(Number);
        if (parts.length === 2) {
          duration = parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
          duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
      }

      tracks.push({
        id: videoId,
        title: title,
        artist: channelName,
        thumbnail,
        duration,
        videoId,
      });
    }

    console.log(`[ImportPlaylist] Parsed ${tracks.length} tracks from YouTube playlist`);

    return {
      name: playlistTitle,
      source: 'youtube',
      tracks,
      note: tracks.length > 0 ? undefined : "No playable tracks found in this playlist"
    };
  } catch (error) {
    console.error("[ImportPlaylist] YouTube playlist parse error:", error);
    return { name: "YouTube Playlist", source: 'youtube', tracks: [], note: "Failed to parse playlist" };
  }
}

// Parse Spotify playlist using embed page
async function parseSpotifyPlaylist(playlistId: string): Promise<PlaylistData> {
  try {
    console.log(`[ImportPlaylist] Parsing Spotify playlist: ${playlistId}`);
    
    // Use Spotify's embed page to get track info
    const embedResponse = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await embedResponse.text();
    
    // Extract __NEXT_DATA__ or resource data
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>({.*?})<\/script>/s);
    
    let playlistName = "Spotify Playlist";
    const tracks: ParsedTrack[] = [];

    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const entity = nextData?.props?.pageProps?.state?.data?.entity;
        
        if (entity) {
          playlistName = entity.name || playlistName;
          console.log(`[ImportPlaylist] Found Spotify playlist: ${playlistName}`);
          
          // Extract tracks from entity
          const trackList = entity.trackList || [];
          for (const track of trackList) {
            if (track.title && track.subtitle) {
              tracks.push({
                id: track.uid || `spotify_${Date.now()}_${Math.random()}`,
                title: track.title,
                artist: track.subtitle,
                thumbnail: track.images?.[0]?.url || "",
                duration: track.duration ? Math.floor(track.duration / 1000) : undefined,
              });
            }
          }
        }
      } catch (e) {
        console.error("[ImportPlaylist] Failed to parse __NEXT_DATA__:", e);
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

    console.log(`[ImportPlaylist] Parsed ${tracks.length} tracks from Spotify playlist`);

    // If we have tracks, find YouTube versions
    if (tracks.length > 0) {
      const ytTracks = await findYouTubeMatches(tracks);
      return {
        name: playlistName,
        source: 'spotify',
        tracks: ytTracks,
        note: ytTracks.length < tracks.length 
          ? `Found ${ytTracks.length} of ${tracks.length} tracks on YouTube`
          : undefined
      };
    }

    return {
      name: playlistName,
      source: 'spotify',
      tracks: [],
      note: "Spotify playlist parsed but track details require authentication. Try importing a YouTube playlist instead."
    };
  } catch (error) {
    console.error("[ImportPlaylist] Spotify playlist parse error:", error);
    return { name: "Spotify Playlist", source: 'spotify', tracks: [], note: "Failed to parse playlist" };
  }
}

// Search YouTube for matching tracks
async function searchYouTubeForTrack(query: string): Promise<ParsedTrack | null> {
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
        let duration = 0;
        if (durationText) {
          const parts = durationText.split(':').map(Number);
          if (parts.length === 2) {
            duration = parts[0] * 60 + parts[1];
          }
        }

        // Return the first music result
        return {
          id: videoId,
          title,
          artist: channelName,
          thumbnail,
          duration,
          videoId,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("[ImportPlaylist] YouTube search error:", error);
    return null;
  }
}

// Find YouTube videos for Spotify tracks
async function findYouTubeMatches(tracks: ParsedTrack[]): Promise<ParsedTrack[]> {
  const results: ParsedTrack[] = [];
  
  // Process in parallel with rate limiting
  const batchSize = 3;
  for (let i = 0; i < Math.min(tracks.length, 25); i += batchSize) {
    const batch = tracks.slice(i, i + batchSize);
    const promises = batch.map(async (track) => {
      const query = `${track.artist} ${track.title}`;
      const result = await searchYouTubeForTrack(query);
      if (result) {
        return {
          ...result,
          title: track.title, // Keep original title
          artist: track.artist, // Keep original artist
        };
      }
      return null;
    });
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter((r): r is ParsedTrack => r !== null));
    
    // Small delay between batches
    if (i + batchSize < tracks.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// Search for songs (for adding to playlist)
async function searchSongs(query: string): Promise<ParsedTrack[]> {
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
    const tracks: ParsedTrack[] = [];
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
        let duration = 0;
        if (durationText) {
          const parts = durationText.split(':').map(Number);
          if (parts.length === 2) {
            duration = parts[0] * 60 + parts[1];
          } else if (parts.length === 3) {
            duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
        }

        // Filter shorts
        if (duration > 30 && duration < 600) {
          tracks.push({
            id: videoId,
            title,
            artist: channelName,
            thumbnail,
            duration,
            videoId,
          });
        }
      }
    }

    return tracks.slice(0, 15);
  } catch (error) {
    console.error("[ImportPlaylist] Search error:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 10 requests per minute per client (resource-intensive)
    const clientId = getClientIdentifier(req);
    const rateLimitResult = checkRateLimit(clientId, { maxRequests: 10, windowMs: 60000 });
    
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const body = await req.json();
    const { url, searchQuery } = body;

    console.log(`[ImportPlaylist] Request received - url: ${url}, searchQuery: ${searchQuery}`);

    // Handle search request
    if (searchQuery) {
      const tracks = await searchSongs(searchQuery);
      return new Response(
        JSON.stringify({ data: { tracks } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle playlist import
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL or searchQuery is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let playlistData: PlaylistData;

    if (url.includes("spotify.com")) {
      const playlistId = extractSpotifyPlaylistId(url);
      if (!playlistId) {
        return new Response(
          JSON.stringify({ error: "Invalid Spotify playlist URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      playlistData = await parseSpotifyPlaylist(playlistId);
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const playlistId = extractYouTubePlaylistId(url);
      if (!playlistId) {
        return new Response(
          JSON.stringify({ error: "Invalid YouTube playlist URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      playlistData = await parseYouTubePlaylist(playlistId);
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported URL. Please use YouTube or Spotify playlist links." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ImportPlaylist] Returning ${playlistData.tracks.length} tracks for playlist: ${playlistData.name}`);

    return new Response(
      JSON.stringify({ 
        data: playlistData,
        success: playlistData.tracks.length > 0
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
