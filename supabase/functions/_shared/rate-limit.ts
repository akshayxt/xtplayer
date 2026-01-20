// Simple in-memory rate limiting for edge functions
// Note: This is per-instance rate limiting. For production, use Redis/Upstash

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (per edge function instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for rate limiting (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 30, windowMs: 60000 }
): RateLimitResult {
  cleanupOldEntries();
  
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }
  
  // Increment count
  entry.count++;
  
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client identifier from request headers
 * Uses X-Forwarded-For if available, otherwise falls back to a hash
 */
export function getClientIdentifier(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Get the first IP in the chain (client IP)
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback to a combination of headers
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const acceptLanguage = req.headers.get('accept-language') || 'unknown';
  
  // Create a simple hash
  const combined = `${userAgent}:${acceptLanguage}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `anon_${Math.abs(hash)}`;
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        'Retry-After': retryAfter.toString(),
        'Content-Type': 'application/json',
      },
    }
  );
}
