# XTPlayer Music API v1

This API exposes XTPlayer's Jamendo-backed catalog and each signed-in user's own XTPlayer playlists and listening history. It is independent of the web UI and can be called from Python services, including Pyrogram bots.

## Legal and playback limits

- Catalog records include the creator, the provider's track page, and the track's Creative Commons license URL so clients can show attribution and link back to the source.
- Jamendo's API terms state that API use is non-commercial unless separately authorized, require attribution/backlinks, and require developers and third parties to follow the applicable track license. Review the current terms and every track license before using the API: [Jamendo API Terms of Use](https://devportal.jamendo.com/api_terms_of_use).
- The API does not download, proxy, cache, or re-host music. `/stream` resolves an upstream provider URL only when the provider supplies a track license and source page. The client should play that URL directly and keep attribution visible.
- `/download` is intentionally disabled. A provider's download flag alone is not permission for XTPlayer or a bot to redistribute a file. Do not upload catalog audio into Telegram or another host using this API.
- Direct playback URLs are provider-controlled; their lifetime, availability, MIME details, and byte-range behavior are not guaranteed. The API does not provide a media proxy or promise seamless seeking.
- YouTube/Spotify/Apple Music scraping, unofficial endpoints, DRM bypass, and their page-based imports are not part of this API.

## Base URL and authentication

Set `XTPLAYER_API_BASE_URL` to the deployed Edge Function base ending in `/functions/v1/music-api`. A generic example is `https://<your-cloud-host>/functions/v1/music-api`.

Catalog reads are public and rate-limited. Playlist and listening-history endpoints require a valid **XTPlayer account access token**:

```http
Authorization: Bearer <XTPLAYER_ACCESS_TOKEN>
```

Obtain the token from the signed-in XTPlayer session. Do not commit it, put it in a browser URL, or log it. Account tokens expire; on `401 unauthorized`, sign in again through XTPlayer and replace the token. This API does not issue developer API keys or refresh tokens.

## Common response formats

Successful responses use JSON. Errors use:

```json
{
  "error": { "code": "invalid_request", "message": "limit must be an integer from 1 to 100." },
  "requestId": "..."
}
```

Provider errors return `502 provider_error`; rate limits return `429 rate_limited` and a `Retry-After` header. Pagination uses `limit` and `offset`; maximum limit is 100. Rate limits are currently per function instance, not a distributed production quota.

### Track object

```json
{
  "id": "jamendo:123456",
  "provider": "jamendo",
  "title": "Example Song",
  "artist": "Example Artist",
  "album": null,
  "durationSeconds": 185,
  "durationMs": 185000,
  "thumbnailUrl": "https://...",
  "genre": "ambient",
  "sourceUrl": "https://www.jamendo.com/track/...",
  "licenseUrl": "https://creativecommons.org/licenses/...",
  "creator": "Example Artist",
  "downloadAllowed": false,
  "providerAllowsDownload": false
}
```

`downloadAllowed` is always false for this API. `providerAllowsDownload` is provider metadata, not an XTPlayer redistribution grant.

## Endpoints

### Health and catalog

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/health` | No | API status and supported catalog |
| GET | `/v1/search?q=...&limit=20&offset=0` | No | Search tracks by keywords |
| GET | `/v1/suggestions?q=...&limit=5` | No | Up to 10 title/artist suggestions based on catalog matches |
| GET | `/v1/trending?limit=20&offset=0` | No | Weekly-popularity catalog results |
| GET | `/v1/tracks/{trackId}` | No | Track metadata and attribution |
| GET | `/v1/tracks/{trackId}/recommendations?limit=10` | No | Genre-related tracks, with popular fallback |
| GET | `/v1/tracks/{trackId}/stream` | No | Resolve a provider-controlled URL when attribution/license metadata exists |
| GET | `/v1/tracks/{trackId}/download` | No | Always returns `403 downloads_disabled` |

Track IDs use `jamendo:<numeric-id>`; existing `free_<numeric-id>` IDs are accepted for compatibility. Other IDs are rejected.

Example search:

```http
GET /v1/search?q=night%20drive&limit=10
```

```json
{
  "query": "night drive",
  "tracks": [{ "id": "jamendo:123456", "title": "Example Song", "artist": "Example Artist", "downloadAllowed": false }],
  "pagination": { "limit": 10, "offset": 0, "hasMore": false }
}
```

Example stream resolution:

```json
{
  "trackId": "jamendo:123456",
  "url": "https://provider-controlled-audio-url",
  "mimeType": "audio/mpeg",
  "sourceUrl": "https://www.jamendo.com/track/...",
  "licenseUrl": "https://creativecommons.org/licenses/...",
  "expiresAt": null,
  "rangeRequests": "provider-dependent",
  "downloadAllowed": false
}
```

`expiresAt: null` means the provider did not provide an expiry timestamp; it does not mean the URL is permanent.

### User playlists and listening history

Every request below requires a valid account access token. Queries are constrained to the authenticated account, and backend row policies are also applied.

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/playlists?limit=50&offset=0` | List the caller's playlists |
| POST | `/v1/playlists` | Create a playlist (`name`, optional `description`) |
| GET | `/v1/playlists/{playlistId}` | Fetch playlist metadata and ordered track records |
| DELETE | `/v1/playlists/{playlistId}` | Delete the caller's playlist |
| POST | `/v1/playlists/{playlistId}/tracks` | Add a Jamendo catalog track (`trackId`, optional `position`) |
| DELETE | `/v1/playlists/{playlistId}/tracks/{trackRecordId}` | Remove a track record |
| GET | `/v1/history?limit=50&offset=0` | Read the caller's recently played records |
| POST | `/v1/history` | Record a catalog play (`trackId`) |

Playlist names are 1–100 characters; descriptions are at most 500. Duplicate tracks return `409 duplicate_track`. Playlist tracks are resolved from the catalog server-side; caller-supplied titles and stream URLs are not trusted or stored.

## Errors

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `invalid_request`, `invalid_track_id`, `invalid_json` | Malformed or out-of-range input |
| 401 | `unauthorized` | Missing, invalid, or expired XTPlayer access token |
| 403 | `downloads_disabled` | Download/redistribution is not offered |
| 404 | `not_found`, `playback_unavailable` | Resource is absent or has no eligible provider playback URL |
| 409 | `duplicate_track` | Track already belongs to the playlist |
| 413 | `payload_too_large` | Request body exceeds 16 KiB |
| 429 | `rate_limited` | Rate limit reached; respect `Retry-After` |
| 502 | `provider_error` | Catalog provider failed or returned an invalid result |
| 503 | `auth_unavailable` | Account-token verification is temporarily unavailable |

## Python / Pyrogram quick start

Install the local client with `pip install -e clients/python`. Set `XTPLAYER_API_BASE_URL` and `XTPLAYER_ACCESS_TOKEN` in the bot's runtime environment; never put a real token in source control.

```python
import os
from xtplayer import ApiError, XTPlayerClient

api = XTPlayerClient(
    os.environ["XTPLAYER_API_BASE_URL"],
    access_token=os.environ.get("XTPLAYER_ACCESS_TOKEN"),
)

async def find_songs(query: str):
    try:
        return await api.search_music(query, limit=8)
    except ApiError as error:
        if error.status_code == 401:
            # Obtain a fresh token from the user's XTPlayer sign-in session.
            raise RuntimeError("XTPlayer sign-in expired; refresh the configured access token.") from error
        raise
```

See [`clients/python/examples/pyrogram_bot.py`](../clients/python/examples/pyrogram_bot.py) for a search command that links users to the licensed source page rather than copying provider audio into Telegram.

## Postman

Import [`docs/xtplayer-music-api.postman_collection.json`](./xtplayer-music-api.postman_collection.json), then set `baseUrl`, `accessToken`, `trackId`, and `playlistId`. Use a short-lived account token only in a private local Postman environment.

## Operational notes

- Search/trending/recommendations call the upstream catalog; the API does not cache audio or metadata beyond in-memory request processing.
- Current rate limiting is per Edge Function instance. Add a shared quota store before treating it as a hard distributed limit.
- The current catalog app ID is reused from the existing site integration. Register/confirm the deployed application with the provider and update its configured identifier before production use.
- The API supports only the Jamendo catalog. Existing scraped YouTube/Spotify playlist flows are not exposed or reused here.