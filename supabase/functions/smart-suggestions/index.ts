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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 20 requests per minute per client (AI-intensive)
    const clientId = getClientIdentifier(req);
    const rateLimitResult = checkRateLimit(clientId, { maxRequests: 20, windowMs: 60000 });
    
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { currentSong, recentHistory } = await req.json();
    
    if (!currentSong?.title) {
      return new Response(
        JSON.stringify({ error: "Current song is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      // Fallback to basic suggestions without AI
      console.log("[SmartSuggestions] No API key, using fallback suggestions");
      return new Response(
        JSON.stringify({
          suggestions: generateFallbackSuggestions(currentSong, recentHistory)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI for intelligent suggestions
    const systemPrompt = `You are a music recommendation AI. Given a currently playing song and recent listening history, suggest search queries that would find similar music. Consider:
- Genre and style matching
- Artist similarity
- Mood and tempo
- Era/decade
- Introducing variety while staying relevant

Return exactly 5 search queries that would find great songs to play next. Make them specific and varied.`;

    const userPrompt = `Currently playing: "${currentSong.title}" by ${currentSong.artist}
${recentHistory?.length > 0 ? `\nRecent history (for variety, avoid these artists if possible): ${recentHistory.slice(0, 5).join(', ')}` : ''}

Generate 5 YouTube Music search queries for the next songs. Return only the queries, one per line, no numbers or bullets.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      console.error(`[SmartSuggestions] AI gateway error: ${statusCode}`);
      
      if (statusCode === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded",
            suggestions: generateFallbackSuggestions(currentSong, recentHistory)
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (statusCode === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Payment required",
            suggestions: generateFallbackSuggestions(currentSong, recentHistory)
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback for other errors
      return new Response(
        JSON.stringify({
          suggestions: generateFallbackSuggestions(currentSong, recentHistory)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse suggestions from AI response
    const suggestions = content
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && line.length < 100)
      .slice(0, 5);

    console.log(`[SmartSuggestions] Generated ${suggestions.length} AI suggestions for "${currentSong.title}"`);

    return new Response(
      JSON.stringify({ suggestions }),
      { 
        headers: { 
          ...corsHeaders, 
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("[SmartSuggestions] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        suggestions: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback suggestions when AI is not available
function generateFallbackSuggestions(
  currentSong: { title: string; artist: string },
  recentHistory?: string[]
): string[] {
  const suggestions: string[] = [];
  
  // Extract meaningful words from title (remove common words)
  const stopWords = ['official', 'video', 'audio', 'lyrics', 'lyric', 'hd', '4k', 'mv', 'music', 'the', 'a', 'an'];
  const titleWords = currentSong.title
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '') // Remove parentheses content
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 3);

  // Artist-based suggestion
  suggestions.push(`${currentSong.artist} songs`);
  
  // Similar artists suggestion
  suggestions.push(`artists like ${currentSong.artist}`);
  
  // Genre detection from common patterns
  const title = currentSong.title.toLowerCase();
  const artist = currentSong.artist.toLowerCase();
  
  if (title.includes('romantic') || title.includes('love')) {
    suggestions.push('romantic love songs');
  } else if (title.includes('party') || title.includes('dance')) {
    suggestions.push('party dance hits');
  } else if (artist.includes('vevo') || title.includes('pop')) {
    suggestions.push('pop hits 2024');
  } else {
    suggestions.push(`${titleWords.join(' ')} songs`);
  }
  
  // Mood-based suggestion
  if (title.includes('sad') || title.includes('broken')) {
    suggestions.push('emotional ballads');
  } else if (title.includes('happy') || title.includes('feel good')) {
    suggestions.push('feel good music');
  } else {
    suggestions.push('trending songs');
  }
  
  // Discovery suggestion
  suggestions.push('new music releases');
  
  return suggestions.slice(0, 5);
}
