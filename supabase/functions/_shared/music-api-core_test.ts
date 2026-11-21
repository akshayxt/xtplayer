import { assertEquals, assertNull } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { boundedInteger, formatTrackDuration, normalizeJamendoTrack, parseTrackId } from './music-api-core.ts';

Deno.test('accepts normalized and legacy Jamendo track identifiers', () => {
  assertEquals(parseTrackId('jamendo:123456'), '123456');
  assertEquals(parseTrackId('free_123456'), '123456');
  assertEquals(parseTrackId('123456'), '123456');
});

Deno.test('rejects malformed track identifiers', () => {
  assertNull(parseTrackId('jamendo:1/2'));
  assertNull(parseTrackId('https://provider.example/audio.mp3'));
  assertNull(parseTrackId(''));
});

Deno.test('bounds pagination values and rejects invalid limits', () => {
  assertEquals(boundedInteger('25', 20, 1, 100), 25);
  assertEquals(boundedInteger(null, 20, 1, 100), 20);
  assertNull(boundedInteger('101', 20, 1, 100));
  assertNull(boundedInteger('-1', 20, 1, 100));
  assertNull(boundedInteger('1e2', 20, 1, 100));
});

Deno.test('normalizes metadata, keeps attribution, and disables API downloads', () => {
  const track = normalizeJamendoTrack({
    id: 42,
    name: ' A Song ',
    artist_name: 'A Creator',
    duration: 185,
    shareurl: 'https://www.jamendo.com/track/42',
    license_ccurl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    audiodownload_allowed: true,
    audio: 'https://audio.example/42.mp3',
    image: 'http://insecure.example/art.jpg',
    album_image: 'https://images.example/art.jpg',
    musicinfo: { tags: { genres: ['ambient'] } },
  });

  assertEquals(track.id, 'jamendo:42');
  assertEquals(track.durationMs, 185000);
  assertEquals(track.thumbnailUrl, 'https://images.example/art.jpg');
  assertEquals(track.licenseUrl, 'https://creativecommons.org/licenses/by-nc/4.0/');
  assertEquals(track.sourceUrl, 'https://www.jamendo.com/track/42');
  assertEquals(track.creator, 'A Creator');
  assertEquals(track.downloadAllowed, false);
  assertEquals(track.providerAllowsDownload, true);
});

Deno.test('formats player durations', () => {
  assertEquals(formatTrackDuration(185), '3:05');
  assertEquals(formatTrackDuration(null), null);
});