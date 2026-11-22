import { normalizeJamendoTrack, parseTrackId, type ApiTrack, type JamendoTrack } from './music-api-core.ts';

const JAMENDO_API = 'https://api.jamendo.com/v3.0/tracks/';
// This is the same public application client ID used by XTPlayer's existing catalog function.
const JAMENDO_CLIENT_ID = 'b6747d04';

export class ProviderError extends Error {
  constructor(public status: number, public details: string) {
    super('Music catalog provider request failed');
    this.name = 'ProviderError';
  }
}

async function requestTracks(params: Record<string, string>): Promise<JamendoTrack[]> {
  const url = new URL(JAMENDO_API);
  url.searchParams.set('client_id', JAMENDO_CLIENT_ID);
  url.searchParams.set('format', 'json');
  url.searchParams.set('include', 'musicinfo');
  url.searchParams.set('imagesize', '400');
  url.searchParams.set('audioformat', 'mp32');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ProviderError(503, 'The catalog provider could not be reached.');
  }

  if (!response.ok) {
    const details = (await response.text()).slice(0, 1000).replaceAll(JAMENDO_CLIENT_ID, '[redacted]');
    throw new ProviderError(response.status, details || 'The catalog provider returned an error.');
  }

  const body = await response.json().catch(() => null) as { results?: JamendoTrack[]; headers?: { status?: string } } | null;
  if (!body || !Array.isArray(body.results)) {
    throw new ProviderError(502, 'The catalog provider returned an invalid response.');
  }
  if (body.headers?.status && body.headers.status !== 'success') {
    throw new ProviderError(502, `Provider status: ${body.headers.status}`);
  }
  return body.results;
}

export async function searchTracks(query: string, limit: number, offset: number): Promise<ApiTrack[]> {
  const results = await requestTracks({ search: query, limit: String(limit), offset: String(offset), order: 'searchweight' });
  return results.map(normalizeJamendoTrack);
}

export async function getTrendingTracks(limit: number, offset: number): Promise<ApiTrack[]> {
  const results = await requestTracks({ order: 'popularity_week', limit: String(limit), offset: String(offset) });
  return results.map(normalizeJamendoTrack);
}

export async function getTrackById(rawId: string): Promise<ApiTrack | null> {
  const providerId = parseTrackId(rawId);
  if (!providerId) return null;
  const results = await requestTracks({ id: providerId, limit: '1' });
  return results[0] ? normalizeJamendoTrack(results[0]) : null;
}

export async function getRecommendations(rawId: string, limit: number): Promise<ApiTrack[]> {
  const seed = await getTrackById(rawId);
  if (!seed) return [];

  let results: ApiTrack[] = [];
  if (seed.genre) {
    const related = await requestTracks({ tags: seed.genre, order: 'popularity_week', limit: String(limit + 1) });
    results = related.map(normalizeJamendoTrack);
  }
  if (results.length === 0) results = await getTrendingTracks(limit + 1, 0);
  return results.filter((track) => track.id !== seed.id).slice(0, limit);
}

export async function getSearchSuggestions(query: string, limit: number): Promise<string[]> {
  const results = await searchTracks(query, Math.min(limit * 2, 20), 0);
  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const track of results) {
    for (const suggestion of [track.title, `${track.artist} ${track.title}`]) {
      const value = suggestion.trim();
      const key = value.toLocaleLowerCase();
      if (value && !seen.has(key)) {
        seen.add(key);
        suggestions.push(value);
      }
      if (suggestions.length >= limit) return suggestions;
    }
  }
  return suggestions;
}

export async function getPlaybackUrl(rawId: string): Promise<{ track: ApiTrack; url: string } | null> {
  const providerId = parseTrackId(rawId);
  if (!providerId) return null;
  const results = await requestTracks({ id: providerId, limit: '1' });
  const rawTrack = results[0];
  if (!rawTrack) return null;
  const track = normalizeJamendoTrack(rawTrack);
  if (!track.licenseUrl || !track.sourceUrl || !rawTrack.audio) return null;
  let parsed: URL;
  try {
    parsed = new URL(rawTrack.audio);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  return { track, url: parsed.toString() };
}