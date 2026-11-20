# XTPlayer Music API

## Goal
Add a documented, versioned REST API and an asynchronous Python client that lets external apps and Pyrogram bots use XTPlayer's lawful catalog and existing user playlists without breaking the web player.

## Scope
- Add a versioned Edge Function API for health, catalog search, track metadata, trending, recommendations, suggestions, authorized playback URL resolution, and authenticated playlist operations.
- Reuse the existing catalog and playlist tables where their source and permission rules allow. Keep API responses normalized and consistent, with validation, pagination, safe error messages, and per-caller limits.
- Add OpenAPI documentation, request/response examples, a Postman collection, an environment-variable example, and an async Python package with a Pyrogram usage example.
- Add targeted API contract and Python client tests, then validate the public routes and authenticated behavior where credentials permit.

## Legal and service boundaries
- Keep YouTube/Spotify/Apple Music page scraping, Invidious, DRM bypass, and unauthorized stream proxying/downloads out of the API.
- The current Jamendo integration uses a demo client ID and does not retain license or download permissions. Treat it as a candidate catalog only; expose direct playback URLs only as allowed by the configured provider account and its terms. Do not promise downloads or redistribute audio without verified rights.
- Do not claim byte-range streaming, durable URLs, availability, or production readiness unless the source and deployed behavior support them.

## Technical approach
- Add a separate `/functions/v1/music-api/v1/...` REST entry point with shared validation, authentication, response/error formatting, and provider adapters; preserve the existing frontend function contracts.
- Use existing playlist ownership rules for user data. Resolve caller identity from a verified auth token and enforce ownership on every playlist operation.
- Package the Python client separately under `clients/python`, use an async HTTP client, and accept credentials through runtime configuration rather than checked-in secrets.
- Keep API docs in `docs/`, automated tests alongside the API/client, and add concise setup/limitations notes to the README.

## Acceptance checks
- Invalid inputs and unauthorized playlist access return documented 4xx responses; unknown provider tracks and provider failures do not look like empty success results.
- Search, metadata, health, recommendations, and playlist operations have documented schemas; streaming returns only provider-authorized playback information.
- Python client tests cover successful requests, errors, timeouts, and credentials without real secrets.
- Existing app interfaces remain unchanged; run the project's available checks and test relevant endpoints through the deployed function when available.

## Open decision
Choose how the Telegram/Python client authenticates: a dedicated revocable API key or a signed-in XTPlayer account token. The implementation will hold the auth-specific work until this is answered; the rest of the plan is unchanged.