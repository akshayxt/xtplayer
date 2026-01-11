import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Jamendo API - Free legal music with streaming
const JAMENDO_CLIENT_ID = "b6747d04"; // Public client ID for demo purposes

interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  streamUrl: string;
  duration: number;
  genre?: string;
}

// Fetch trending tracks from Jamendo
async function fetchTrendingTracks(limit: number = 20): Promise<Track[]> {
  try {
    const response = await fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${limit}&order=popularity_week&include=musicinfo&imagesize=400`
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
        genre: track.musicinfo?.tags?.genres?.[0] || 'Music',
      }));
    }
    return [];
  } catch (error) {
    console.error("Jamendo fetch error:", error);
    return [];
  }
}

// Search tracks from Jamendo
async function searchTracks(query: string, limit: number = 20): Promise<Track[]> {
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
        genre: track.musicinfo?.tags?.genres?.[0] || 'Music',
      }));
    }
    return [];
  } catch (error) {
    console.error("Jamendo search error:", error);
    return [];
  }
}

// Fetch tracks by genre/mood
async function fetchByGenre(genre: string, limit: number = 10): Promise<Track[]> {
  try {
    const response = await fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${limit}&tags=${encodeURIComponent(genre)}&order=popularity_week&include=musicinfo&imagesize=400`
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
        genre: track.musicinfo?.tags?.genres?.[0] || genre,
      }));
    }
    return [];
  } catch (error) {
    console.error("Jamendo genre fetch error:", error);
    return [];
  }
}

// Get similar tracks (for recommendations)
async function getSimilarTracks(trackId: string, limit: number = 10): Promise<Track[]> {
  try {
    // Get the track first to find its tags
    const trackResponse = await fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&id=${trackId}&include=musicinfo`
    );
    const trackData = await trackResponse.json();
    
    if (trackData.results && trackData.results[0]) {
      const track = trackData.results[0];
      const tags = track.musicinfo?.tags?.genres?.slice(0, 2) || [];
      
      if (tags.length > 0) {
        return await fetchByGenre(tags.join('+'), limit);
      }
    }
    
    // Fallback to popular tracks
    return await fetchTrendingTracks(limit);
  } catch (error) {
    console.error("Similar tracks error:", error);
    return await fetchTrendingTracks(limit);
  }
}

// Curated playlists by mood/genre
async function getCuratedPlaylists(): Promise<{ name: string; genre: string; tracks: Track[] }[]> {
  const genres = [
    { name: "Chill Vibes", genre: "chillout" },
    { name: "Energize", genre: "electronic" },
    { name: "Focus Mode", genre: "ambient" },
    { name: "Feel Good Pop", genre: "pop" },
    { name: "Rock Classics", genre: "rock" },
    { name: "Hip Hop Beats", genre: "hiphop" },
  ];

  const playlists = await Promise.all(
    genres.map(async ({ name, genre }) => {
      const tracks = await fetchByGenre(genre, 8);
      return { name, genre, tracks };
    })
  );

  return playlists.filter(p => p.tracks.length > 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, genre, trackId, limit } = await req.json();

    let result: any;

    switch (action) {
      case "trending":
        result = await fetchTrendingTracks(limit || 20);
        break;
      case "search":
        if (!query) {
          return new Response(
            JSON.stringify({ error: "Query is required for search" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await searchTracks(query, limit || 20);
        break;
      case "genre":
        if (!genre) {
          return new Response(
            JSON.stringify({ error: "Genre is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await fetchByGenre(genre, limit || 10);
        break;
      case "similar":
        if (!trackId) {
          return new Response(
            JSON.stringify({ error: "Track ID is required for similar tracks" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await getSimilarTracks(trackId, limit || 10);
        break;
      case "playlists":
        result = await getCuratedPlaylists();
        break;
      case "home":
        // Get all home data at once
        const [trending, playlists] = await Promise.all([
          fetchTrendingTracks(12),
          getCuratedPlaylists(),
        ]);
        result = { trending, playlists };
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Music catalog error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
