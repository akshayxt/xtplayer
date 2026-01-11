import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JAMENDO_CLIENT_ID = "b6747d04";

interface TrackInfo {
  title: string;
  artist: string;
}

interface ImportedTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  streamUrl: string;
  duration: number;
  matchScore: number;
}

// Parse Spotify playlist URL using oEmbed (public, no API key needed)
async function parseSpotifyPlaylist(url: string): Promise<{ name: string; tracks: TrackInfo[] }> {
  try {
    // Get playlist info via oEmbed
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl);
    
    if (!oembedRes.ok) {
      throw new Error("Could not fetch Spotify playlist info");
    }
    
    const oembedData = await oembedRes.json();
    const playlistName = oembedData.title || "Imported Spotify Playlist";
    
    // Unfortunately, oEmbed doesn't give us track list
    // We need to use Spotify's public page and parse it
    // This is a limitation - we'll return the playlist name and ask user to manually search
    
    return {
      name: playlistName,
      tracks: [], // Can't get tracks without API key
    };
  } catch (error) {
    console.error("Spotify parse error:", error);
    throw new Error("Failed to parse Spotify playlist. Make sure the playlist is public.");
  }
}

// Parse YouTube playlist using public data
async function parseYouTubePlaylist(url: string): Promise<{ name: string; tracks: TrackInfo[] }> {
  try {
    // Extract playlist ID from URL
    const urlObj = new URL(url);
    const playlistId = urlObj.searchParams.get("list");
    
    if (!playlistId) {
      throw new Error("Invalid YouTube playlist URL");
    }
    
    // Try to get playlist info via oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    
    let playlistName = "Imported YouTube Playlist";
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      playlistName = oembedData.title || playlistName;
    }
    
    return {
      name: playlistName,
      tracks: [], // Can't get individual tracks without API key
    };
  } catch (error) {
    console.error("YouTube parse error:", error);
    throw new Error("Failed to parse YouTube playlist. Make sure the playlist is public.");
  }
}

// Search Jamendo for matching tracks
async function searchJamendo(query: string, limit: number = 5): Promise<ImportedTrack[]> {
  try {
    const response = await fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${limit}&search=${encodeURIComponent(query)}&include=musicinfo&imagesize=400`
    );
    const data = await response.json();
    
    if (data.results) {
      return data.results.map((track: any) => ({
        id: track.id,
        title: track.name,
        artist: track.artist_name,
        thumbnail: track.image || track.album_image || `https://picsum.photos/seed/${track.id}/400/400`,
        streamUrl: track.audio,
        duration: track.duration,
        matchScore: 0.8, // Approximate match
      }));
    }
    return [];
  } catch (error) {
    console.error("Jamendo search error:", error);
    return [];
  }
}

// Find similar tracks in Jamendo for imported playlist
async function findSimilarTracks(tracks: TrackInfo[]): Promise<ImportedTrack[]> {
  const results: ImportedTrack[] = [];
  
  for (const track of tracks.slice(0, 20)) { // Limit to 20 tracks
    const query = `${track.title} ${track.artist}`.trim();
    const matches = await searchJamendo(query, 1);
    
    if (matches.length > 0) {
      results.push(matches[0]);
    }
  }
  
  return results;
}

// Get curated tracks based on playlist theme (when we can't parse tracks)
async function getCuratedTracks(playlistName: string, count: number = 10): Promise<ImportedTrack[]> {
  // Extract keywords from playlist name
  const keywords = playlistName.toLowerCase();
  
  // Determine genre/mood based on keywords
  let searchQuery = "popular music";
  
  if (keywords.includes("chill") || keywords.includes("relax")) {
    searchQuery = "chillout ambient";
  } else if (keywords.includes("workout") || keywords.includes("gym") || keywords.includes("energy")) {
    searchQuery = "energetic electronic";
  } else if (keywords.includes("party") || keywords.includes("dance")) {
    searchQuery = "dance party";
  } else if (keywords.includes("focus") || keywords.includes("study")) {
    searchQuery = "focus ambient instrumental";
  } else if (keywords.includes("sleep") || keywords.includes("calm")) {
    searchQuery = "sleep calm ambient";
  } else if (keywords.includes("rock")) {
    searchQuery = "rock guitar";
  } else if (keywords.includes("pop")) {
    searchQuery = "pop hits";
  } else if (keywords.includes("hip") || keywords.includes("rap")) {
    searchQuery = "hiphop beats";
  } else if (keywords.includes("jazz")) {
    searchQuery = "jazz smooth";
  } else if (keywords.includes("classical")) {
    searchQuery = "classical piano";
  }
  
  return await searchJamendo(searchQuery, count);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, searchQuery } = await req.json();

    // If searchQuery is provided, just search Jamendo
    if (searchQuery) {
      const tracks = await searchJamendo(searchQuery, 20);
      return new Response(
        JSON.stringify({ data: { tracks } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let playlistInfo: { name: string; tracks: TrackInfo[] };
    let isSpotify = false;
    let isYouTube = false;

    // Detect platform and parse
    if (url.includes("spotify.com")) {
      isSpotify = true;
      playlistInfo = await parseSpotifyPlaylist(url);
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      isYouTube = true;
      playlistInfo = await parseYouTubePlaylist(url);
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported platform. Please use Spotify or YouTube playlist URLs." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let matchedTracks: ImportedTrack[];

    if (playlistInfo.tracks.length > 0) {
      // We have track info, find similar tracks
      matchedTracks = await findSimilarTracks(playlistInfo.tracks);
    } else {
      // No track info, get curated tracks based on playlist name
      matchedTracks = await getCuratedTracks(playlistInfo.name, 15);
    }

    return new Response(
      JSON.stringify({
        data: {
          name: playlistInfo.name,
          source: isSpotify ? "spotify" : "youtube",
          tracks: matchedTracks,
          note: playlistInfo.tracks.length === 0 
            ? "We found similar tracks based on your playlist theme. For exact matches, search for specific songs." 
            : undefined,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import playlist error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to import playlist" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
