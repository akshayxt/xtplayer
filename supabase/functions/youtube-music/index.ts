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

interface Song {
  videoId: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  views: string;
  isOfficial: boolean;
  isVerified: boolean;
  score: number;
}

interface SearchResponse {
  query: string;
  songs: Song[];
  suggestions: string[];
}

interface ArtistResponse {
  artist: string;
  verified: boolean;
  channelId: string;
  topTracks: Song[];
  thumbnail: string;
}

// Music content detection heuristics
function isMusicContent(title: string, channelName: string): boolean {
  const musicIndicators = [
    /\(official\s*(video|audio|music|lyric|mv)\)/i,
    /\[official\s*(video|audio|music|lyric|mv)\]/i,
    /official\s*(video|audio|music|lyric|mv)/i,
    /\(audio\)/i,
    /\(lyrics?\)/i,
    /lyric\s*video/i,
    /audio\s*only/i,
    /full\s*(song|album|track)/i,
    /\s+ft\.?\s+/i,
    /\s+feat\.?\s+/i,
    /\s+x\s+/i,
  ];

  const channelIndicators = [
    /vevo$/i,
    /official$/i,
    /music$/i,
    /records$/i,
    /entertainment$/i,
    /^t-series/i,
    /sony\s*music/i,
    /universal\s*music/i,
    /warner\s*music/i,
  ];

  const titleMatch = musicIndicators.some(regex => regex.test(title));
  const channelMatch = channelIndicators.some(regex => regex.test(channelName));

  return titleMatch || channelMatch;
}

// Filter out non-music content
function isNotMusic(title: string): boolean {
  const nonMusicIndicators = [
    /gameplay/i,
    /walkthrough/i,
    /tutorial/i,
    /review/i,
    /unboxing/i,
    /podcast/i,
    /interview/i,
    /behind\s*the\s*scenes/i,
    /making\s*of/i,
    /reaction/i,
    /explained/i,
    /how\s*to/i,
    /vlog/i,
    /shorts/i,
    /#shorts/i,
    /episode\s*\d+/i,
  ];

  return nonMusicIndicators.some(regex => regex.test(title));
}

// Calculate music ranking score
function calculateScore(title: string, channelName: string, views: string, verified: boolean): number {
  let score = 50;

  // Official content bonus
  if (/official\s*(video|audio|music)/i.test(title)) score += 30;
  if (/\(official\)/i.test(title)) score += 25;
  if (/official\s*audio/i.test(title)) score += 20;
  if (/lyric\s*video/i.test(title)) score += 15;
  if (/\(audio\)/i.test(title)) score += 10;

  // Channel type bonus
  if (/vevo$/i.test(channelName)) score += 25;
  if (verified) score += 20;
  if (/official$/i.test(channelName)) score += 15;

  // View count bonus
  const viewNum = parseViewCount(views);
  if (viewNum > 1000000000) score += 20;
  else if (viewNum > 100000000) score += 15;
  else if (viewNum > 10000000) score += 10;
  else if (viewNum > 1000000) score += 5;

  // Penalty for covers/fan uploads
  if (/cover/i.test(title)) score -= 15;
  if (/fan\s*made/i.test(title)) score -= 20;
  if (/karaoke/i.test(title)) score -= 10;
  if (/remix/i.test(title) && !/official\s*remix/i.test(title)) score -= 5;

  return score;
}

function parseViewCount(views: string): number {
  if (!views) return 0;
  const cleaned = views.replace(/[^0-9.KMBkmb]/g, '');
  let num = parseFloat(cleaned) || 0;
  
  if (/[Bb]/.test(views)) num *= 1000000000;
  else if (/[Mm]/.test(views)) num *= 1000000;
  else if (/[Kk]/.test(views)) num *= 1000;
  
  return num;
}

function formatViewCount(count: number): string {
  if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B`;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function parseDuration(duration: string): string {
  if (!duration) return "";
  // ISO 8601 duration (PT4M33S) to MM:SS
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Get YouTube search suggestions
async function getSuggestions(query: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return (data[1] || []).slice(0, 8);
  } catch (error) {
    console.error("Suggestions error:", error);
    return [];
  }
}

// Search YouTube for music - uses Invidious API as primary (more reliable)
async function searchYouTube(query: string, limit: number = 20): Promise<Song[]> {
  // Try Invidious first (more reliable in edge functions)
  const invidiousResults = await searchYouTubeFallback(query, limit);
  if (invidiousResults.length > 0) {
    return invidiousResults;
  }

  // Fallback to direct YouTube scraping (may hit redirect limits)
  try {
    const musicQuery = query.includes("song") || query.includes("music") 
      ? query 
      : `${query} song`;

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(musicQuery)}&sp=EgIQAQ%253D%253D`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log(`YouTube direct search failed: ${response.status}`);
      return [];
    }

    const html = await response.text();
    
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || 
                      html.match(/ytInitialData\s*=\s*({.*?});/s);
    
    if (!dataMatch) {
      console.log("Could not find ytInitialData");
      return [];
    }

    const data = JSON.parse(dataMatch[1]);
    const videos: Song[] = [];

    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    
    if (!contents) return [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      
      for (const item of items) {
        const videoRenderer = item.videoRenderer;
        if (!videoRenderer) continue;

        const videoId = videoRenderer.videoId;
        const title = videoRenderer.title?.runs?.[0]?.text || "";
        const channelName = videoRenderer.ownerText?.runs?.[0]?.text || "";
        const thumbnail = videoRenderer.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || 
                         `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const duration = videoRenderer.lengthText?.simpleText || "";
        const viewCountText = videoRenderer.viewCountText?.simpleText || videoRenderer.viewCountText?.runs?.[0]?.text || "0";
        const verified = !!videoRenderer.ownerBadges?.some((badge: any) => 
          badge.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_VERIFIED" ||
          badge.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_VERIFIED_ARTIST"
        );

        if (isNotMusic(title)) continue;

        const durationParts = duration.split(":").map(Number);
        const totalSeconds = durationParts.length === 3 
          ? durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2]
          : durationParts[0] * 60 + (durationParts[1] || 0);
        
        if (totalSeconds < 60 || totalSeconds > 900) continue;

        const isOfficial = isMusicContent(title, channelName);
        const score = calculateScore(title, channelName, viewCountText, verified);

        videos.push({
          videoId,
          title,
          artist: channelName,
          duration,
          thumbnail,
          views: viewCountText,
          isOfficial,
          isVerified: verified,
          score,
        });
      }
    }

    const seen = new Map<string, Song>();
    for (const video of videos) {
      const key = video.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
      if (!seen.has(key) || seen.get(key)!.score < video.score) {
        seen.set(key, video);
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (error) {
    console.error("YouTube direct search error:", error);
    return [];
  }
}

// Fallback search using a different approach
async function searchYouTubeFallback(query: string, limit: number): Promise<Song[]> {
  try {
    // Use Invidious API as fallback (privacy-respecting YouTube frontend)
    const instances = [
      "https://inv.nadeko.net",
      "https://invidious.fdn.fr",
      "https://yt.artemislena.eu",
    ];

    for (const instance of instances) {
      try {
        const response = await fetch(
          `${instance}/api/v1/search?q=${encodeURIComponent(query + " song")}&type=video&sort=relevance`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (!response.ok) continue;

        const data = await response.json();
        
        return data.slice(0, limit).map((item: any) => {
          const verified = item.authorVerified || false;
          const isOfficial = isMusicContent(item.title, item.author);
          const viewCount = item.viewCount || 0;
          
          return {
            videoId: item.videoId,
            title: item.title,
            artist: item.author,
            duration: formatSeconds(item.lengthSeconds),
            thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            views: formatViewCount(viewCount),
            isOfficial,
            isVerified: verified,
            score: calculateScore(item.title, item.author, formatViewCount(viewCount), verified),
          };
        }).filter((s: Song) => !isNotMusic(s.title));
      } catch {
        continue;
      }
    }
    
    return [];
  } catch (error) {
    console.error("Fallback search error:", error);
    return [];
  }
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get trending music
async function getTrending(limit: number = 20): Promise<Song[]> {
  try {
    // Use YouTube Music trending page
    const response = await fetch("https://www.youtube.com/feed/trending?bp=4gINGgt5dG1hX2NoYXJ0cw%3D%3D", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
                      html.match(/ytInitialData\s*=\s*({.*?});/s);

    if (!dataMatch) {
      // Fallback to search for trending songs
      return await searchYouTube("trending songs 2024", limit);
    }

    const data = JSON.parse(dataMatch[1]);
    const videos: Song[] = [];

    // Navigate trending content
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    for (const tab of tabs) {
      const contents = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents?.[0]?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items || 
                     section?.itemSectionRenderer?.contents || [];
        
        for (const item of items) {
          const videoRenderer = item.videoRenderer;
          if (!videoRenderer) continue;

          const videoId = videoRenderer.videoId;
          const title = videoRenderer.title?.runs?.[0]?.text || "";
          const channelName = videoRenderer.ownerText?.runs?.[0]?.text || "";
          
          if (isNotMusic(title)) continue;

          videos.push({
            videoId,
            title,
            artist: channelName,
            duration: videoRenderer.lengthText?.simpleText || "",
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            views: videoRenderer.viewCountText?.simpleText || "0",
            isOfficial: isMusicContent(title, channelName),
            isVerified: false,
            score: 80,
          });
        }
      }
    }

    if (videos.length === 0) {
      return await searchYouTube("trending songs 2024", limit);
    }

    return videos.slice(0, limit);
  } catch (error) {
    console.error("Trending error:", error);
    return await searchYouTube("top songs 2024", limit);
  }
}

// Get related videos for autoplay/radio
async function getRelated(videoId: string, limit: number = 15): Promise<Song[]> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
                      html.match(/ytInitialData\s*=\s*({.*?});/s);

    if (!dataMatch) {
      return [];
    }

    const data = JSON.parse(dataMatch[1]);
    const videos: Song[] = [];

    // Get secondary results (related videos)
    const secondaryResults = data?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || [];
    
    for (const item of secondaryResults) {
      const compactRenderer = item.compactVideoRenderer;
      if (!compactRenderer) continue;

      const relVideoId = compactRenderer.videoId;
      const title = compactRenderer.title?.simpleText || compactRenderer.title?.runs?.[0]?.text || "";
      const channelName = compactRenderer.longBylineText?.runs?.[0]?.text || "";
      
      if (isNotMusic(title)) continue;
      if (relVideoId === videoId) continue;

      const isOfficial = isMusicContent(title, channelName);
      const views = compactRenderer.viewCountText?.simpleText || "0";
      
      videos.push({
        videoId: relVideoId,
        title,
        artist: channelName,
        duration: compactRenderer.lengthText?.simpleText || "",
        thumbnail: `https://i.ytimg.com/vi/${relVideoId}/hqdefault.jpg`,
        views,
        isOfficial,
        isVerified: false,
        score: calculateScore(title, channelName, views, false),
      });
    }

    // Sort and deduplicate
    const seen = new Set<string>();
    return videos
      .filter(v => {
        if (seen.has(v.videoId)) return false;
        seen.add(v.videoId);
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (error) {
    console.error("Related videos error:", error);
    return [];
  }
}

// Get artist info and top tracks
async function getArtist(channelId: string): Promise<ArtistResponse | null> {
  try {
    const response = await fetch(`https://www.youtube.com/channel/${channelId}/videos`, {
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
    
    const metadata = data?.metadata?.channelMetadataRenderer;
    const header = data?.header?.c4TabbedHeaderRenderer;
    
    const artistName = metadata?.title || header?.title || "";
    const verified = !!header?.badges?.some((b: any) => 
      b.metadataBadgeRenderer?.style?.includes("VERIFIED")
    );
    const thumbnail = header?.avatar?.thumbnails?.slice(-1)?.[0]?.url || "";

    // Get videos from tabs
    const videos: Song[] = [];
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    
    for (const tab of tabs) {
      const contents = tab?.tabRenderer?.content?.richGridRenderer?.contents || [];
      
      for (const item of contents) {
        const videoRenderer = item?.richItemRenderer?.content?.videoRenderer;
        if (!videoRenderer) continue;

        const videoId = videoRenderer.videoId;
        const title = videoRenderer.title?.runs?.[0]?.text || "";
        
        if (isNotMusic(title)) continue;

        videos.push({
          videoId,
          title,
          artist: artistName,
          duration: videoRenderer.lengthText?.simpleText || "",
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          views: videoRenderer.viewCountText?.simpleText || "0",
          isOfficial: true,
          isVerified: verified,
          score: 80,
        });
      }
    }

    return {
      artist: artistName,
      verified,
      channelId,
      topTracks: videos.slice(0, 20),
      thumbnail,
    };
  } catch (error) {
    console.error("Artist fetch error:", error);
    return null;
  }
}

// Home feed with categories
async function getHomeFeed(): Promise<{ trending: Song[]; genres: { name: string; songs: Song[] }[] }> {
  const [trending, ...genreResults] = await Promise.all([
    getTrending(12),
    searchYouTube("bollywood hits 2024", 8),
    searchYouTube("english pop songs 2024", 8),
    searchYouTube("punjabi songs latest", 8),
    searchYouTube("hip hop rap 2024", 8),
    searchYouTube("romantic songs best", 8),
    searchYouTube("party dance songs", 8),
  ]);

  const genreNames = [
    "Bollywood Hits",
    "International Pop",
    "Punjabi Beats",
    "Hip Hop & Rap",
    "Romantic",
    "Party Mix",
  ];

  const genres = genreNames.map((name, i) => ({
    name,
    songs: genreResults[i] || [],
  })).filter(g => g.songs.length > 0);

  return { trending, genres };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 30 requests per minute per client
    const clientId = getClientIdentifier(req);
    const rateLimitResult = checkRateLimit(clientId, { maxRequests: 30, windowMs: 60000 });
    
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { action, query, videoId, channelId, limit } = await req.json();

    let result: any;

    switch (action) {
      case "search":
        if (!query) {
          return new Response(
            JSON.stringify({ error: "Query is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const songs = await searchYouTube(query, limit || 20);
        const suggestions = await getSuggestions(query);
        result = { query, songs, suggestions };
        break;

      case "suggestions":
        if (!query) {
          return new Response(
            JSON.stringify({ error: "Query is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await getSuggestions(query);
        break;

      case "trending":
        result = await getTrending(limit || 20);
        break;

      case "related":
        if (!videoId) {
          return new Response(
            JSON.stringify({ error: "Video ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await getRelated(videoId, limit || 15);
        break;

      case "artist":
        if (!channelId) {
          return new Response(
            JSON.stringify({ error: "Channel ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await getArtist(channelId);
        break;

      case "home":
        result = await getHomeFeed();
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ data: result }),
      { 
        headers: { 
          ...corsHeaders, 
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("YouTube Music API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
