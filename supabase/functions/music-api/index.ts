import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { checkRateLimit, createRateLimitResponse, getClientIdentifier, getRateLimitHeaders } from '../_shared/rate-limit.ts';
import { boundedInteger, formatTrackDuration, parseTrackId } from '../_shared/music-api-core.ts';
import { getPlaybackUrl, getRecommendations, getSearchSuggestions, getTrackById, getTrendingTracks, searchTracks, ProviderError } from '../_shared/music-api-provider.ts';

const JSON_HEADERS = { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const MAX_BODY_BYTES = 16_384;

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function fail(status: number, code: string, message: string, requestId: string, details?: unknown): Response {
  return json({ error: { code, message, ...(details === undefined ? {} : { details }) }, requestId }, status);
}

function validText(value: unknown, name: string, maxLength: number, minLength = 1): string {
  if (typeof value !== 'string') throw new ApiError(400, 'invalid_request', `${name} must be text.`);
  const result = value.trim();
  if (result.length < minLength || result.length > maxLength) {
    throw new ApiError(400, 'invalid_request', `${name} must contain ${minLength} to ${maxLength} characters.`);
  }
  return result;
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) throw new ApiError(413, 'payload_too_large', 'Request body is too large.');
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'invalid_json', 'Request body must be valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'invalid_request', 'Request body must be a JSON object.');
  }
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > MAX_BODY_BYTES) {
    throw new ApiError(413, 'payload_too_large', 'Request body is too large.');
  }
  return body as Record<string, unknown>;
}

function parseLimit(url: URL, fallback = 20): number {
  const limit = boundedInteger(url.searchParams.get('limit'), fallback, 1, 100);
  if (limit === null) throw new ApiError(400, 'invalid_request', 'limit must be an integer from 1 to 100.');
  return limit;
}

function parseOffset(url: URL): number {
  const offset = boundedInteger(url.searchParams.get('offset'), 0, 0, 100_000);
  if (offset === null) throw new ApiError(400, 'invalid_request', 'offset must be an integer from 0 to 100000.');
  return offset;
}

function apiTrackId(value: string): string {
  if (!parseTrackId(value)) throw new ApiError(400, 'invalid_track_id', 'Track ID is not valid.');
  return value;
}

function requireDatabaseConfig(): { url: string; key: string } {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) throw new ApiError(503, 'auth_unavailable', 'Account features are temporarily unavailable.');
  return { url, key };
}

async function resolveCaller(req: Request): Promise<{ userId: string; db: ReturnType<typeof createClient> } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) throw new ApiError(401, 'unauthorized', 'Use a valid XTPlayer account access token.');

  const { url, key } = requireDatabaseConfig();
  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await db.auth.getClaims(match[1]);
  const userId = data?.claims?.sub;
  if (error || typeof userId !== 'string' || !userId) {
    throw new ApiError(401, 'unauthorized', 'Your XTPlayer access token is invalid or expired. Sign in again to get a fresh token.');
  }
  return { userId, db };
}

function requireCaller(caller: Awaited<ReturnType<typeof resolveCaller>>) {
  if (!caller) throw new ApiError(401, 'unauthorized', 'Sign in to XTPlayer and send your account access token.');
  return caller;
}

function parsePosition(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 100_000) return null;
  return value;
}

async function getOwnedPlaylist(db: ReturnType<typeof createClient>, userId: string, playlistId: string) {
  const { data, error } = await db.from('playlists').select('id, user_id, name, description, cover_url, is_public, created_at, updated_at')
    .eq('id', playlistId).eq('user_id', userId).maybeSingle();
  if (error) throw new ApiError(500, 'database_error', 'Could not load the playlist.');
  if (!data) throw new ApiError(404, 'not_found', 'Playlist was not found.');
  return data;
}

async function handle(req: Request, requestId: string): Promise<Response> {
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const functionIndex = segments.indexOf('music-api');
  const route = segments.slice(functionIndex >= 0 ? functionIndex + 1 : 0);
  if (route[0] !== 'v1') throw new ApiError(404, 'not_found', 'API version was not found.');
  const parts = route.slice(1).map((part) => decodeURIComponent(part));

  const caller = await resolveCaller(req);
  const protectedRoute = parts[0] === 'playlists' || parts[0] === 'history';
  const user = protectedRoute ? requireCaller(caller) : caller;
  const limitResult = checkRateLimit(user ? `user:${user.userId}` : getClientIdentifier(req), { maxRequests: user ? 60 : 30, windowMs: 60_000 });
  if (!limitResult.allowed) return createRateLimitResponse(limitResult, corsHeaders);
  const rateHeaders = getRateLimitHeaders(limitResult);

  if (parts.length === 1 && parts[0] === 'health' && req.method === 'GET') {
    return json({ status: 'ok', apiVersion: 'v1', catalog: 'Jamendo API', timestamp: new Date().toISOString(), downloads: 'disabled' }, 200, rateHeaders);
  }

  if (parts.length === 1 && parts[0] === 'search' && req.method === 'GET') {
    const query = validText(url.searchParams.get('q'), 'q', 200);
    const limit = parseLimit(url);
    const offset = parseOffset(url);
    const tracks = await searchTracks(query, limit, offset);
    return json({ query, tracks, pagination: { limit, offset, hasMore: tracks.length === limit } }, 200, rateHeaders);
  }

  if (parts.length === 1 && parts[0] === 'suggestions' && req.method === 'GET') {
    const query = validText(url.searchParams.get('q'), 'q', 200);
    const suggestions = await getSearchSuggestions(query, Math.min(parseLimit(url, 5), 10));
    return json({ query, suggestions }, 200, rateHeaders);
  }

  if (parts.length === 1 && parts[0] === 'trending' && req.method === 'GET') {
    const limit = parseLimit(url);
    const offset = parseOffset(url);
    const tracks = await getTrendingTracks(limit, offset);
    return json({ tracks, pagination: { limit, offset, hasMore: tracks.length === limit } }, 200, rateHeaders);
  }

  if (parts[0] === 'tracks' && parts.length === 2 && req.method === 'GET') {
    const track = await getTrackById(apiTrackId(parts[1]));
    if (!track) throw new ApiError(404, 'not_found', 'Track was not found in the available catalog.');
    return json({ track }, 200, rateHeaders);
  }

  if (parts[0] === 'tracks' && parts.length === 3 && parts[2] === 'recommendations' && req.method === 'GET') {
    const trackId = apiTrackId(parts[1]);
    const tracks = await getRecommendations(trackId, parseLimit(url, 10));
    return json({ seedTrackId: `jamendo:${parseTrackId(trackId)}`, tracks }, 200, rateHeaders);
  }

  if (parts[0] === 'tracks' && parts.length === 3 && parts[2] === 'stream' && req.method === 'GET') {
    const resolved = await getPlaybackUrl(apiTrackId(parts[1]));
    if (!resolved) throw new ApiError(404, 'playback_unavailable', 'A provider-authorized playback URL is not available for this track.');
    return json({
      trackId: resolved.track.id,
      url: resolved.url,
      mimeType: 'audio/mpeg',
      sourceUrl: resolved.track.sourceUrl,
      licenseUrl: resolved.track.licenseUrl,
      expiresAt: null,
      rangeRequests: 'provider-dependent',
      downloadAllowed: false,
    }, 200, rateHeaders);
  }

  if (parts[0] === 'tracks' && parts.length === 3 && parts[2] === 'download' && req.method === 'GET') {
    throw new ApiError(403, 'downloads_disabled', 'Audio downloads and redistribution are not enabled by this API.');
  }

  if (parts[0] === 'playlists' && parts.length === 1 && req.method === 'GET') {
    const { db, userId } = requireCaller(user);
    const limit = parseLimit(url, 50);
    const offset = parseOffset(url);
    const { data, error } = await db.from('playlists').select('id, name, description, cover_url, is_public, created_at, updated_at')
      .eq('user_id', userId).order('updated_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw new ApiError(500, 'database_error', 'Could not load playlists.');
    const playlists = data ?? [];
    const ids = playlists.map((playlist) => playlist.id);
    let counts = new Map<string, number>();
    if (ids.length) {
      const { data: songs, error: songsError } = await db.from('playlist_songs').select('playlist_id').in('playlist_id', ids);
      if (songsError) throw new ApiError(500, 'database_error', 'Could not load playlist tracks.');
      counts = new Map<string, number>();
      for (const song of songs ?? []) counts.set(song.playlist_id, (counts.get(song.playlist_id) ?? 0) + 1);
    }
    return json({ playlists: playlists.map((playlist) => ({ ...playlist, trackCount: counts.get(playlist.id) ?? 0 })), pagination: { limit, offset, hasMore: playlists.length === limit } }, 200, rateHeaders);
  }

  if (parts[0] === 'playlists' && parts.length === 1 && req.method === 'POST') {
    const { db, userId } = requireCaller(user);
    const body = await readBody(req);
    const name = validText(body.name, 'name', 100);
    const description = body.description === undefined || body.description === null ? null : validText(body.description, 'description', 500, 0);
    const { data, error } = await db.from('playlists').insert({ user_id: userId, name, description }).select('id, name, description, cover_url, is_public, created_at, updated_at').single();
    if (error) throw new ApiError(500, 'database_error', 'Could not create playlist.');
    return json({ playlist: { ...data, trackCount: 0 } }, 201, rateHeaders);
  }

  if (parts[0] === 'playlists' && parts.length === 2 && req.method === 'GET') {
    const { db, userId } = requireCaller(user);
    const playlist = await getOwnedPlaylist(db, userId, parts[1]);
    const { data: tracks, error } = await db.from('playlist_songs').select('id, video_id, title, thumbnail, channel_title, duration, position, added_at')
      .eq('playlist_id', playlist.id).order('position', { ascending: true });
    if (error) throw new ApiError(500, 'database_error', 'Could not load playlist tracks.');
    return json({ playlist: { ...playlist, tracks: tracks ?? [] } }, 200, rateHeaders);
  }

  if (parts[0] === 'playlists' && parts.length === 2 && req.method === 'DELETE') {
    const { db, userId } = requireCaller(user);
    await getOwnedPlaylist(db, userId, parts[1]);
    const { error } = await db.from('playlists').delete().eq('id', parts[1]).eq('user_id', userId);
    if (error) throw new ApiError(500, 'database_error', 'Could not delete playlist.');
    return json({ deleted: true, playlistId: parts[1] }, 200, rateHeaders);
  }

  if (parts[0] === 'playlists' && parts.length === 3 && parts[2] === 'tracks' && req.method === 'POST') {
    const { db, userId } = requireCaller(user);
    const playlist = await getOwnedPlaylist(db, userId, parts[1]);
    const body = await readBody(req);
    const trackId = apiTrackId(validText(body.trackId, 'trackId', 80));
    const track = await getTrackById(trackId);
    if (!track) throw new ApiError(404, 'not_found', 'Track was not found in the available catalog.');
    const position = parsePosition(body.position);
    const { data: last, error: lastError } = await db.from('playlist_songs').select('position').eq('playlist_id', playlist.id).order('position', { ascending: false }).limit(1).maybeSingle();
    if (lastError) throw new ApiError(500, 'database_error', 'Could not determine playlist order.');
    const nextPosition = position ?? ((last?.position ?? -1) + 1);
    const { data: existing } = await db.from('playlist_songs').select('id').eq('playlist_id', playlist.id).eq('video_id', `free_${parseTrackId(track.id)}`).maybeSingle();
    if (existing) throw new ApiError(409, 'duplicate_track', 'Track is already in this playlist.');
    const { data, error } = await db.from('playlist_songs').insert({
      playlist_id: playlist.id,
      video_id: `free_${parseTrackId(track.id)}`,
      title: track.title,
      thumbnail: track.thumbnailUrl,
      channel_title: track.artist,
      duration: formatTrackDuration(track.durationSeconds),
      position: nextPosition,
    }).select('id, video_id, title, thumbnail, channel_title, duration, position, added_at').single();
    if (error) throw new ApiError(500, 'database_error', 'Could not add track to playlist.');
    await db.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlist.id).eq('user_id', userId);
    return json({ track: data }, 201, rateHeaders);
  }

  if (parts[0] === 'playlists' && parts.length === 4 && parts[2] === 'tracks' && req.method === 'DELETE') {
    const { db, userId } = requireCaller(user);
    const playlist = await getOwnedPlaylist(db, userId, parts[1]);
    const { data, error: readError } = await db.from('playlist_songs').select('id').eq('id', parts[3]).eq('playlist_id', playlist.id).maybeSingle();
    if (readError) throw new ApiError(500, 'database_error', 'Could not load playlist track.');
    if (!data) throw new ApiError(404, 'not_found', 'Playlist track was not found.');
    const { error } = await db.from('playlist_songs').delete().eq('id', data.id).eq('playlist_id', playlist.id);
    if (error) throw new ApiError(500, 'database_error', 'Could not remove track from playlist.');
    await db.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlist.id).eq('user_id', userId);
    return json({ deleted: true, trackRecordId: data.id }, 200, rateHeaders);
  }

  if (parts[0] === 'history' && parts.length === 1 && req.method === 'GET') {
    const { db, userId } = requireCaller(user);
    const { data, error } = await db.from('listening_history').select('video_id, title, thumbnail, channel_title, duration, played_at, play_count, skip_count')
      .eq('user_id', userId).order('played_at', { ascending: false }).range(parseOffset(url), parseOffset(url) + parseLimit(url, 50) - 1);
    if (error) throw new ApiError(500, 'database_error', 'Could not load listening history.');
    return json({ tracks: data ?? [] }, 200, rateHeaders);
  }

  if (parts[0] === 'history' && parts.length === 1 && req.method === 'POST') {
    const { db, userId } = requireCaller(user);
    const body = await readBody(req);
    const trackId = apiTrackId(validText(body.trackId, 'trackId', 80));
    const track = await getTrackById(trackId);
    if (!track) throw new ApiError(404, 'not_found', 'Track was not found in the available catalog.');
    const { data, error } = await db.from('listening_history').insert({
      user_id: userId,
      video_id: `free_${parseTrackId(track.id)}`,
      title: track.title,
      thumbnail: track.thumbnailUrl,
      channel_title: track.artist,
      duration: formatTrackDuration(track.durationSeconds),
    }).select('video_id, title, thumbnail, channel_title, duration, played_at, play_count, skip_count').single();
    if (error) throw new ApiError(500, 'database_error', 'Could not save listening history.');
    return json({ track: data }, 201, rateHeaders);
  }

  throw new ApiError(404, 'not_found', 'API endpoint was not found.');
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    return fail(405, 'method_not_allowed', 'Use GET, POST, or DELETE for this endpoint.', requestId, { allowed: ['GET', 'POST', 'DELETE'] });
  }
  try {
    return await handle(req, requestId);
  } catch (error) {
    if (error instanceof ApiError) return fail(error.status, error.code, error.message, requestId, error.details);
    if (error instanceof ProviderError) return fail(502, 'provider_error', 'The music catalog provider is temporarily unavailable.', requestId, { providerStatus: error.status, details: error.details });
    console.error(`Music API request ${requestId} failed:`, error instanceof Error ? error.message : 'Unknown error');
    return fail(500, 'internal_error', 'The request could not be completed.', requestId);
  }
});