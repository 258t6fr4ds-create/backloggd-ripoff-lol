# GameVault catalogue and real game artwork

GameVault **never creates AI-generated game covers or screenshots**.

## Works without accounts or keys

Open **Find game → Wikipedia**, search for the title, select the correct article, and choose **Add to library** or **Add to wishlist**. This uses Wikipedia's public browser-compatible MediaWiki API. If that article has an image, it appears as the game's artwork. Many articles do not have suitable images, and some results may be non-game pages: always check the source before importing.

This method is *not* a complete dedicated games database and it does not provide an automatic gameplay screenshot gallery.

## Optional: connect RAWG for dedicated game results and screenshots

RAWG requires an API key. Direct browser access may fail with CORS and publishing an API key in public JavaScript or GitHub is unsafe. The code in \`worker/index.js\` is a small, optional Cloudflare Worker proxy designed to keep the key on the server.

You **do not need to install anything** on your laptop. This configuration is done through browser dashboards, and remains independent of ChatGPT Plus.

1. Register for your own personal/hobby RAWG developer API key at https://rawg.io/apidocs and read their current usage terms.
2. Create a Cloudflare account, open **Workers & Pages**, create a Worker and paste in the source of \`worker/index.js\`. Deploy it.
3. Under your Worker's **Settings → Variables and Secrets**, add the secret \`RAWG_API_KEY\` with your actual RAWG key. Add \`ALLOWED_ORIGIN\` with value \`https://258t6fr4ds-create.github.io\`. Never put the key in a GitHub file, browser settings or the URL.
4. Copy only the Worker's public URL (for example \`https://your-worker.your-subdomain.workers.dev\`).
5. Open GameVault → Settings & backups → Catalogue connection. Paste the Worker URL, then open **Find game → RAWG**.
6. Search for games and choose a result. The app requests up to 16 real screenshots for preview and saves their URLs alongside the game record.

**Important:** Cloudflare Worker availability, free limits and the RAWG API's pricing/usage rules can change. Nothing in core GameVault requires a paid plan or this optional integration.

RAWG free-tier data and images must be attributed with links to RAWG on pages where displayed. GameVault includes source links in imported game profiles and its search preview. RAWG's primary image is often a *landscape game background*, not necessarily a vertical box cover.

## Personal PS5 screenshots

At this stage, screenshot galleries accept direct HTTPS image links that you enter via **Edit game → Screenshot URLs**. URLs are stored in IndexedDB and exported in JSON backups; **the image bytes are not included**, so links may expire. Uploading captures straight from iPhone/PS5 and building media-inclusive backups are planned features, not shipped yet.

## Backups and compatibility

GameVault v1.2.0 adds optional screenshot, description and attribution metadata to existing game records. IndexedDB records from v0.1.1 are not discarded or migrated destructively. JSON backups preserve all optional new metadata. Back up your library periodically.


## v1.4.1 — Enable RAWG-linked DLC and editions (one-time Worker update)

RAWG has a dedicated `GET /games/{id}/additions` endpoint that lists add-ons related to a particular base game. It can contain DLC, GOTY editions, bundles, companion apps and other additions. GameVault sorts these into tentative groups and lets you choose what to track.

**The GitHub Pages site update does not automatically redeploy your Cloudflare Worker.** Update your existing Worker once:

1. Open [Cloudflare dashboard](https://dash.cloudflare.com/), select **Workers & Pages**, and open your existing **gamevault-rawg** Worker.
2. Choose **Edit code** (or **Quick edit**, depending on Cloudflare's current UI).
3. In a second tab, open [worker/index.js](worker/index.js) in this repository on `main`, copy its entire JavaScript contents, and replace the old Worker source in the Cloudflare editor.
4. Click **Deploy** or **Save and deploy**. Leave the existing `RAWG_API_KEY` secret and `ALLOWED_ORIGIN` variable untouched.
5. Test the existing public Worker URL by visiting `https://YOUR-WORKER.workers.dev/games/3328/additions` in a browser. `3328` is an example RAWG game ID. A successful endpoint returns JSON with a `results` array (it may be empty); an HTTP 404 indicates the old code remains deployed. Do not append the RAWG API key to the URL.
6. Open GameVault → Library → a RAWG-imported game → **Expansions & DLC → Browse RAWG**. The related additions appear, with editions and other extras grouped separately. No new Worker URL or Supabase settings are needed.

The add-on browser fetches only when opened, never automatically attaches anything, preserves all previously linked DLC and allows **Search manually instead** as a fallback.


## v1.8.0 — Full game details and related series

The v1.8 Game Profiles 2.0 update adds optional RAWG metadata on the Overview tab. To obtain the developer, publisher and detailed release information, and to show other games in the same series, the Worker must expose two more RAWG paths:

- `GET /games/{id}` — exact game details including `developers`, `publishers`, `released` and `description_raw`.
- `GET /games/{id}/game-series` — related games in the series (where RAWG supplies that relationship).

Update the code of your **existing** Worker in Cloudflare Workers & Pages with the latest [worker/index.js](worker/index.js) on `main`, and click **Deploy**. Do not create another Worker or regenerate your `RAWG_API_KEY` secret. Keep `ALLOWED_ORIGIN` unchanged.

You can test the new route using `https://YOUR-WORKER.workers.dev/games/3328`; it should return a RAWG game JSON object with an `id` rather than `{"error":"Not found."}`. The original Worker root URL `/` intentionally still returns Not found.

The GameVault **Fill missing game info** action will safely fall back to exact-ID RAWG search when the new route is not present, but search results generally lack developer/publisher data. It fills **only missing fields** and never replaces your own ratings, owned platform, saved notes, DLC or playthrough history. Series links are informational; they do not automatically add games.
