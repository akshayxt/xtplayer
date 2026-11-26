"""Example: search the XTPlayer catalog and link back to the licensed source."""

from pyrogram import Client, filters
from pyrogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from xtplayer import ApiError, XTPlayerClient

api = XTPlayerClient("https://<your-cloud-host>/functions/v1/music-api")
bot = Client("xtplayer_music_bot")


@bot.on_message(filters.command("play") & filters.private)
async def search_and_link(client, message):
    query = " ".join(message.command[1:]).strip()
    if not query:
        await message.reply_text("Usage: /play song or artist")
        return

    try:
        result = await api.search_music(query, limit=5)
    except ApiError as error:
        await message.reply_text(error.message)
        return

    tracks = result.get("tracks", [])
    if not tracks:
        await message.reply_text("No catalog tracks found.")
        return

    for track in tracks:
        title = f"{track['title']} — {track['artist']}"
        attribution = f"Creator: {track['creator']}\nLicense: {track['licenseUrl'] or 'not supplied'}"
        source = track.get("sourceUrl")
        keyboard = InlineKeyboardMarkup([[InlineKeyboardButton("Open source track", url=source)]]) if source else None
        await message.reply_text(f"{title}\n{attribution}", reply_markup=keyboard, disable_web_page_preview=True)


bot.run()