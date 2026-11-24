# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## XTPlayer Music API and Python client

XTPlayer exposes a versioned REST API through its Cloud Edge Function and an async Python SDK for external applications and Pyrogram bots. See [`docs/api.md`](docs/api.md), [`docs/openapi.yaml`](docs/openapi.yaml), and the [Postman collection](docs/xtplayer-music-api.postman_collection.json).

The API uses Jamendo catalog metadata, XTPlayer account access tokens for user playlists/history, and provider-controlled playback URLs. It does not proxy or download audio; downloads and Telegram audio uploads are disabled. Jamendo's API terms restrict use to non-commercial applications unless separately authorized, and require creator/provider attribution plus a source-page backlink. Review each returned track license and the current [Jamendo API terms](https://devportal.jamendo.com/api_terms_of_use) before deploying a bot.

Catalog search requires a registered Jamendo application Client ID configured server-side as `JAMENDO_CLIENT_ID`; the app's existing demo ID currently returns no tracks. Bot users do not need this provider configuration.

Install the Python client with `pip install -e clients/python`. Configure `XTPLAYER_API_BASE_URL` and, for user-owned playlists/history, a short-lived `XTPLAYER_ACCESS_TOKEN` in the bot runtime environment. Never commit real account tokens. See [`clients/python/README.md`](clients/python/README.md) and [`clients/python/examples/pyrogram_bot.py`](clients/python/examples/pyrogram_bot.py).

Run client tests with `python -m pytest clients/python/tests`; the Edge Function contract tests are under `supabase/functions/_shared/music-api-core_test.ts`.
