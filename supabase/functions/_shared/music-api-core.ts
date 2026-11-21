export interface JamendoTrack {
  id: string | number;
  name?: string;
  artist_name?: string;
  album_name?: string;
  duration?: number;
  image?: string;
  album_image?: string;
  shareurl?: string;
  license_ccurl?: string;
  audiodownload_allowed?: boolean;
  audio?: string;
  musicinfo?: { tags?: { genres?: string[] } };
}

export interface ApiTrack {
  id: string;
  provider: 'jamendo';
  title: string;
  artist: string;
  album: string | null;
  durationSeconds: number | null;
  durationMs: number | null;
  thumbnailUrl: string | null;
  genre: string | null;
  sourceUrl: string | null;
  licenseUrl: string | null;
  creator: string;
  downloadAllowed: false;
  providerAllowsDownload: boolean;
}

const TRACK_ID_PATTERN = /^(?:jamendo:|free_)?([0-9]{1,20})$/;

export function parseTrackId(value: string): string | null {
  const match = value.trim().match(TRACK_ID_PATTERN);
  return match?.[1] ?? null;
}

export function boundedInteger(value: string | null, fallback: number, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return fallback;
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function safeHttpsUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeJamendoTrack(track: JamendoTrack): ApiTrack {
  const duration = typeof track.duration === 'number' && Number.isFinite(track.duration) && track.duration >= 0
    ? Math.floor(track.duration)
    : null;

  return {
    id: `jamendo:${String(track.id)}`,
    provider: 'jamendo',
    title: (track.name ?? '').trim(),
    artist: (track.artist_name ?? '').trim(),
    album: track.album_name?.trim() || null,
    durationSeconds: duration,
    durationMs: duration === null ? null : duration * 1000,
    thumbnailUrl: safeHttpsUrl(track.image) ?? safeHttpsUrl(track.album_image),
    genre: track.musicinfo?.tags?.genres?.[0]?.trim() || null,
    sourceUrl: safeHttpsUrl(track.shareurl),
    licenseUrl: safeHttpsUrl(track.license_ccurl),
    creator: (track.artist_name ?? '').trim(),
    // XTPlayer does not redistribute or proxy provider audio files.
    downloadAllowed: false,
    providerAllowsDownload: track.audiodownload_allowed === true,
  };
}

export function formatTrackDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}