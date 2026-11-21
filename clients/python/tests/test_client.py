import asyncio
import io
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from xtplayer import ApiError, XTPlayerClient


class FakeResponse(io.BytesIO):
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


class XTPlayerClientTests(unittest.TestCase):
    def test_search_sends_query_and_account_token(self):
        client = XTPlayerClient("https://api.example/functions/v1/music-api", "test-token")
        response_body = json.dumps({"query": "night drive", "tracks": []}).encode()
        with patch("xtplayer.client.urlopen", return_value=FakeResponse(response_body)) as open_url:
            result = asyncio.run(client.search_music("night drive"))

        request = open_url.call_args.args[0]
        self.assertIn("q=night+drive", request.full_url)
        self.assertEqual(request.get_header("Authorization"), "Bearer test-token")
        self.assertEqual(result["query"], "night drive")

    def test_expired_access_token_is_exposed_as_api_error(self):
        client = XTPlayerClient("https://api.example/functions/v1/music-api", "expired")
        body = json.dumps({"error": {"code": "unauthorized", "message": "Sign in again."}}).encode()
        error = HTTPError("https://api.example", 401, "Unauthorized", {}, io.BytesIO(body))
        with patch("xtplayer.client.urlopen", side_effect=error):
            with self.assertRaises(ApiError) as raised:
                asyncio.run(client.get_playlists())
        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(raised.exception.code, "unauthorized")

    def test_download_policy_error_is_not_hidden(self):
        client = XTPlayerClient("https://api.example/functions/v1/music-api")
        body = json.dumps({"error": {"code": "downloads_disabled", "message": "Not enabled."}}).encode()
        error = HTTPError("https://api.example", 403, "Forbidden", {}, io.BytesIO(body))
        with patch("xtplayer.client.urlopen", side_effect=error):
            with self.assertRaises(ApiError) as raised:
                asyncio.run(client.download_track("jamendo:42"))
        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(raised.exception.code, "downloads_disabled")

    def test_stream_url_endpoint_is_available_to_async_client(self):
        client = XTPlayerClient("https://api.example/functions/v1/music-api")
        body = json.dumps({"url": "https://audio.example/track.mp3"}).encode()
        with patch("xtplayer.client.urlopen", return_value=FakeResponse(body)) as open_url:
            result = asyncio.run(client.get_stream_url("jamendo:42"))
        self.assertIn("/v1/tracks/jamendo:42/stream", open_url.call_args.args[0].full_url)
        self.assertTrue(result["url"].startswith("https://"))


if __name__ == "__main__":
    unittest.main()