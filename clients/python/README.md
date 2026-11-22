# XTPlayer Python client

Async Python client for the XTPlayer Music API. Runtime requires Python 3.10+ and uses only the standard library.

```bash
pip install -e clients/python
```

Configure these values in the process environment (do not commit account tokens):

```text
XTPLAYER_API_BASE_URL=https://<your-cloud-host>/functions/v1/music-api
XTPLAYER_ACCESS_TOKEN=<short-lived XTPlayer account access token>
```

```python
import os
from xtplayer import XTPlayerClient

api = XTPlayerClient(
    os.environ["XTPLAYER_API_BASE_URL"],
    os.environ.get("XTPLAYER_ACCESS_TOKEN"),
)
results = await api.search_music("night drive", limit=10)
for track in results["tracks"]:
    print(track["title"], track["artist"], track["sourceUrl"], track["licenseUrl"])
```

Available methods include `search_music`, `get_track`, `get_stream_url`, `get_recommendations`, `get_trending`, `get_suggestions`, playlist CRUD, and recently-played history. `download_track` exists to return the documented `403 downloads_disabled` response; the API does not transfer or re-host audio.

`ApiError` provides `status_code`, `code`, `message`, and optional `details`. On `401`, refresh the configured token through a new XTPlayer sign-in. The client does not store or refresh credentials.

The Jamendo-backed catalog is subject to provider terms and per-track Creative Commons licenses. The API is not authorized for commercial use by default; check current terms before deploying a public bot. The Pyrogram example links to each provider track page and does not upload audio to Telegram.

Run tests with `python -m pytest clients/python/tests` from the repository root.