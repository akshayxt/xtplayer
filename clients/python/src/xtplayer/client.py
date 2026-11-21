"""Small asynchronous XTPlayer API client with no runtime dependencies."""

from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


class ApiError(Exception):
    """An HTTP or API error returned by XTPlayer."""

    def __init__(self, status_code: int, code: str, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


class XTPlayerClient:
    """Async methods for catalog search, playback resolution, and user playlists.

    The access token is an XTPlayer account access token, not a developer API key.
    Refresh it by signing in through XTPlayer again when the API returns 401.
    """

    def __init__(self, base_url: str, access_token: str | None = None, timeout: float = 15.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.access_token = access_token
        self.timeout = timeout

    def set_access_token(self, access_token: str | None) -> None:
        """Set or clear the account access token used on subsequent requests."""
        self.access_token = access_token

    async def _request(self, method: str, path: str, *, params: dict[str, Any] | None = None,
                       body: dict[str, Any] | None = None) -> dict[str, Any]:
        return await asyncio.to_thread(self._request_sync, method, path, params, body)

    def _request_sync(self, method: str, path: str, params: dict[str, Any] | None,
                      body: dict[str, Any] | None) -> dict[str, Any]:
        url = f"{self.base_url}/{path.lstrip('/')}"
        if params:
            filtered = {key: value for key, value in params.items() if value is not None}
            if filtered:
                url = f"{url}?{urlencode(filtered)}"

        headers = {"Accept": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        encoded_body = None
        if body is not None:
            encoded_body = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = Request(url, data=encoded_body, headers=headers, method=method)
        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read()
                status = response.status
        except HTTPError as error:
            raw = error.read()
            status = error.code
            self._raise_api_error(status, raw)
        except (URLError, TimeoutError) as error:
            raise ApiError(0, "network_error", "Could not reach the XTPlayer API.") from error

        try:
            payload = json.loads(raw.decode("utf-8")) if raw else {}
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ApiError(status, "invalid_response", "XTPlayer returned an invalid JSON response.") from error
        if not isinstance(payload, dict):
            raise ApiError(status, "invalid_response", "XTPlayer returned an unexpected response.")
        if status >= 400 or "error" in payload:
            error = payload.get("error", {})
            if not isinstance(error, dict):
                error = {"message": str(error)}
            raise ApiError(status, str(error.get("code", "api_error")),
                           str(error.get("message", "The XTPlayer API request failed.")), error.get("details"))
        return payload

    @staticmethod
    def _raise_api_error(status: int, raw: bytes) -> None:
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            payload = {}
        error = payload.get("error", {}) if isinstance(payload, dict) else {}
        if not isinstance(error, dict):
            error = {"message": str(error)}
        raise ApiError(status, str(error.get("code", "http_error")),
                       str(error.get("message", "The XTPlayer API request failed.")), error.get("details"))

    async def search_music(self, query: str, *, limit: int = 20, offset: int = 0) -> dict[str, Any]:
        return await self._request("GET", "v1/search", params={"q": query, "limit": limit, "offset": offset})

    async def get_suggestions(self, query: str, *, limit: int = 5) -> dict[str, Any]:
        return await self._request("GET", "v1/suggestions", params={"q": query, "limit": limit})

    async def get_trending(self, *, limit: int = 20, offset: int = 0) -> dict[str, Any]:
        return await self._request("GET", "v1/trending", params={"limit": limit, "offset": offset})

    async def get_track(self, track_id: str) -> dict[str, Any]:
        return await self._request("GET", f"v1/tracks/{quote(track_id, safe=':')}")

    async def get_stream_url(self, track_id: str) -> dict[str, Any]:
        return await self._request("GET", f"v1/tracks/{quote(track_id, safe=':')}/stream")

    async def get_recommendations(self, track_id: str, *, limit: int = 10) -> dict[str, Any]:
        return await self._request("GET", f"v1/tracks/{quote(track_id, safe=':')}/recommendations",
                                   params={"limit": limit})

    async def get_playlists(self, *, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        return await self._request("GET", "v1/playlists", params={"limit": limit, "offset": offset})

    async def get_playlist(self, playlist_id: str) -> dict[str, Any]:
        return await self._request("GET", f"v1/playlists/{quote(playlist_id, safe='')}")

    async def create_playlist(self, name: str, *, description: str | None = None) -> dict[str, Any]:
        return await self._request("POST", "v1/playlists", body={"name": name, "description": description})

    async def add_track_to_playlist(self, playlist_id: str, track_id: str,
                                    *, position: int | None = None) -> dict[str, Any]:
        return await self._request("POST", f"v1/playlists/{quote(playlist_id, safe='')}/tracks",
                                   body={"trackId": track_id, "position": position})

    async def remove_track_from_playlist(self, playlist_id: str, track_record_id: str) -> dict[str, Any]:
        return await self._request("DELETE", f"v1/playlists/{quote(playlist_id, safe='')}/tracks/{quote(track_record_id, safe='')}")

    async def delete_playlist(self, playlist_id: str) -> dict[str, Any]:
        return await self._request("DELETE", f"v1/playlists/{quote(playlist_id, safe='')}")

    async def get_recently_played(self, *, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        return await self._request("GET", "v1/history", params={"limit": limit, "offset": offset})

    async def record_play(self, track_id: str) -> dict[str, Any]:
        return await self._request("POST", "v1/history", body={"trackId": track_id})

    async def download_track(self, track_id: str) -> dict[str, Any]:
        """Ask the API for a download; current policy returns downloads_disabled (403)."""
        return await self._request("GET", f"v1/tracks/{quote(track_id, safe=':')}/download")

    async def close(self) -> None:
        """Provided for compatibility with clients that manage resources."""
        return None