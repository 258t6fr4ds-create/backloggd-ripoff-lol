# GameVault

A minimal, mobile-first personal gaming library and backlog tracker.

**Live URL (once Pages is enabled):** https://258t6fr4ds-create.github.io/backloggd-ripoff-lol/

## Versioned patch notes

Every release must have complete notes in **both** the app's **What's New** panel and [CHANGELOG.md](CHANGELOG.md).

**Release checklist (do not skip):**
1. Update the version in `package.json` using semantic versioning.
2. Add the new release at the **top** of `src/releaseNotes.ts`, describing only changes actually included.
3. Add the corresponding dated entry to `CHANGELOG.md`, categorised as Added, Improved, or Fixed.
4. Test and deploy via GitHub Actions; do not claim a release is live until deployment succeeds.
5. Preserve existing user data and exported backup compatibility. Do not use fabricated release notes.

The app always displays the current version and a **What's New** history, with an unread marker per browser until the latest entry is viewed. The notes remain available after the user's ChatGPT subscription ends.

## v1.8.1 — Mobile navigation, PS5 defaults and detailed home statistics

- Game profiles use a safe-area-aware, reachable **Return to library** button, and scrolling a modal never reveals or activates the bottom navigation underneath.
- The Game sections hint identifies the five profile tabs: Overview, DLC, Playthroughs, Journal and Gallery. On mobile, swipe sideways across tabs.
- Home's **Games in library**, **Currently playing**, **Completed** and **Hours logged** cards all open their matching focused Statistics dashboard with live charts of your own saved records.
- New catalogue imports default to PS5 as your own editable platform. RAWG-supported platforms remain distinct; existing platform entries are preserved.
- No Worker, SQL or database migration required.

## v1.8.0 — Game Profiles 2.0

- Open any game in your library to access **Overview**, **DLC**, **Playthroughs**, **Journal** and **Gallery** without one giant scroll.
- Overview shows saved ratings, hours, notes, release date, developer, publisher, RAWG-supported platforms, and related games in the same series where the API provides them.
- **Fill missing game info** only fills fields which are currently empty. It never changes your personal platform, rating, ownership, notes, existing artwork or DLC/playthrough records.
- DLC browsing includes title and category filters. Unclassified RAWG additions are no longer labelled as DLC by default.
- Full catalogue details and game series need a one-time deployed Worker code update: copy latest [worker/index.js](worker/index.js) into your existing Cloudflare Worker and deploy it. Your API key, Worker URL and environment variables stay as-is. Older Workers still support a limited exact-ID search fallback for missing basic metadata.
- No database migrations or new keys.

## v1.7.1 — Compact playthrough section in DLC profiles

- DLC and expansions now appear before playthroughs in game details.
- Empty playthrough history is collapsed, rather than showing a large repeated-looking card. Expand **Open history** whenever you want to log a first run or journal entry.
- Saved playthroughs and journals remain visible by default, with a Collapse action when you prefer a compact view.
- The installed Home Screen app's offline cache is refreshed automatically. No migration or setup required.

## v1.7.0 — Cinematic visual refresh and custom shelves

- Refined slate/graphite theme, wide game-art cards, cinematic details, home spotlight, improved typography, accessible contrast, mobile-safe spacing and reduced-motion support.
- Library grid/list toggle (stored locally), scrollable shelf tabs, filter by favourites and personally chosen platform in addition to title/status/sorting.
- Create a custom shelf by editing a game → **Custom shelves** (comma-separated), or Library → **Manage games** → select titles → enter a shelf name → Add to shelf. Remove shelves or bulk-update statuses in the same panel.
- Custom shelves are optional labels in existing game records, so they sync and export with your game collection. They do not duplicate games or alter DLC and playthrough data.
- The redesign reuses stored RAWG artwork and screenshots. It neither generates fake game art nor requires extra API services.
- No Cloudflare Worker, Supabase schema, account or installed homescreen app changes needed.

## v1.6.0 — Personal insights and discovery

- Discover offers **For your taste**, **Recently added**, **Overlooked** and **Something different**. Recommendations only consider your own Backlog and On hold games. Taste matching uses explicitly rated (7+/10) or favourited genres, with clear explanations and fallbacks when your library has little preference data.
- Browse matches, rotate suggestions or mark one Playing directly; this uses existing local/cloud sync and does not modify ownership or saved history.
- Statistics now includes interactive genre breakdown by count, rating or hours, 0–10 rating distribution, average/median rating, completion rate, 12-month timeline of dated game completions, and separate run/journal counts.
- All insights are local calculations of existing game data. Missing ratings and dates remain missing, wishlist records aren't counted as played games, and run hours are never automatically added to game-level playtime.
- No backend, database, Cloudflare Worker or paid service changes.

## v1.5.0 — Playthroughs and gaming journal

- Open any game in your library → **Playthroughs & Journal**.
- Log each replay separately with title, status, start/finish dates, hours and run-specific notes. This does not replace your existing total playtime or game notes.
- The Journal tab stores written entries, optionally attached to a playthrough. It supports edit/delete and per-run filters.
- Game cards display run counts. Statistics shows recorded runs, completed runs and journal entries, while game-level hours continue to count only manually entered legacy totals so replay hours are not double-counted.
- All records stay inside the existing game object, so the established IndexedDB + optional Supabase + JSON backup flows preserve them. The editor also retains the new fields.
- The UI checks game payload sizes below the Supabase sync limit before saving new history. No SQL, RAWG Worker or storage schema changes are needed.

## v1.4.2 — RAWG supported platforms

- Games imported from RAWG (individually or in batches) retain the platforms RAWG lists for the game. Game cards show that catalogue availability when you haven't entered your own platform.
- **Your platform** is kept separate from **Available on (RAWG)**. No platform is guessed as your owned/played system.
- For existing RAWG imports, go to **Library → Fill missing platforms**. The action looks up up to 25 games per click using the existing Worker, matches exact RAWG IDs, and changes only missing availability metadata. Run again for larger libraries. Some older obscure titles may not be found.
- Metadata is saved within existing game records and retained in cloud sync and JSON backups. No new Worker deployment or database migration needed.

## v1.4.1 — Actual DLC relationships via RAWG

- Open a saved game's detail panel → **Expansions & DLC → Browse RAWG**. This uses the dedicated RAWG `/games/{game_pk}/additions` route and groups expansions separately from editions/bundles and miscellaneous extras.
- From a RAWG game's catalogue preview, the same browser is available if that game is already in your GameVault library.
- Choose and attach individual add-ons, or select several and add in one operation. Existing linked DLC records and owned toggles remain intact. **Search manually instead** remains available.
- RAWG additions are broader than just DLC: lists may include editions and companion apps. Groups are heuristic labels; the user chooses what to link.
- **One-time requirement:** Update your **deployed** Cloudflare Worker with the latest [worker/index.js](worker/index.js), which now forwards `/games/:id/additions` and `/games/:id/parent-games`. Existing secrets and URLs do not change. See [CATALOG_SETUP.md](CATALOG_SETUP.md). If the Worker is not yet updated, the interface explains the HTTP 404 and offers manual search.

## v1.4.0 — Smart search, DLC and batch import

- RAWG's **Smart search** is enabled by default, detects common game acronyms and small typos, and handles keyword shortcuts like `rivals` → `Marvel Rivals`. The switch can be disabled in Find Game; the preference stays on the device. Searches use at most two RAWG requests.
- **Select multiple games** in Find Game, keep selecting across different searches, choose a status and add in a single batch; duplicate game IDs/titles are skipped.
- **DLC belongs under a base game**, not as another main-grid game: open a library game → DLC → Find DLC, or in a search result choose an existing parent game and Attach as DLC. The same destination is available for bulk selections.
- DLCs are stored with the parent (including ownership toggles) in local IndexedDB, optional Supabase sync and existing JSON backups. Game editor saves retain linked DLCs.
- All additions require selection/confirmation; there is no guessing parent relationships based on a title.
- No backend schema changes, Worker redeployment or paid services.

## v1.3.6 — Mobile search bar and popularity

- The clear-search X stays on the same horizontal row as the input on all iPhone widths.
- On very narrow screens, Search becomes an accessible icon button to make space for input and X.
- RAWG games and DLC are ranked by match relevance, then by popularity from RAWG's public library-additions count (`added`) and rating count (`ratings_count`). Exact matches stay on top. The existing Worker currently serves up to 15 candidate results per query.
- No RAWG Worker redeployment, migration or device-data reset required.

## v1.3.5 — Search suggestions and games first

- **Find game** now defaults to **RAWG**, using the existing configured Cloudflare Worker.
- Typing at least two characters searches after a short pause; matching titles appear immediately under the search field and can be selected directly.
- Results prefer exact/prefix game matches and hide obvious non-game extras by default without excluding DLC and expansions. Use **Include soundtracks, demos and extras** to override the conservative title filter.
- Wikipedia remains accessible as an optional fallback.
- The RAWG Worker code does **not** need to be redeployed; this is an app-side release. Personal game data, cloud sync and JSON backups are unchanged.

## iPhone layout fixes (v1.3.2)

- Form inputs have readable 16px mobile text to stop iOS auto-zoom.
- Game editor, RAWG search, cloud setup, patch notes and settings scroll inside the available visible screen, including when a software keyboard opens. Save/Cancel stays pinned at the bottom of the game editor.
- The mobile header always shows **Find game**; controls support safe areas and narrow displays.
- No storage schema, saved game records, connection settings or JSON backup format were changed.

## iPhone Home Screen icon (v1.3.1)

Safari uses `icon-180-v1.3.1.png` as the Apple touch icon rather than falling back to the SVG favicon. On an iPhone, open GameVault's GitHub Pages URL in **Safari → Share → Add to Home Screen**. If an existing shortcut still shows the old Sidequest icon, save a JSON backup of any GameVault games first, then delete **only that GameVault shortcut** and add it again; removing a web app can remove its device-local IndexedDB storage. Do not delete Sidequest.

## v1.3 — Optional Supabase cloud sync

- Uses the **same Supabase project and app login as Sidequest**, but its own `gamevault_games` table.
- Keeps local saves and an offline edit/delete queue, with revision-checked writes and per-game conflict decisions.
- Checks while the app is open, on foreground/reconnection, and via **Sync now**.
- Requires you to execute [supabase/gamevault.sql](supabase/gamevault.sql) in your project, and connect with its **public** URL/key. No credentials are included in the GitHub source.
- Follow [SYNC_SETUP.md](SYNC_SETUP.md). Use backups before connecting other devices.

## v1.2 — Catalogue and media

- **Find game** uses public Wikipedia search without an API key; verify correct game articles. Results may include genuine artwork if supplied by Wikipedia.
- A user-configured Cloudflare Worker enables **RAWG** catalogue search and real game screenshots, requiring a separately obtained free RAWG API key held by the Worker.
- Imported data includes source attribution, an optional game description, screenshots and artwork URLs.
- Existing game records and JSON backups are preserved. Media backups contain links, **not image bytes**.
- See [CATALOG_SETUP.md](CATALOG_SETUP.md) for optional API configuration. No laptop installations are necessary.

## v0.1 — Foundation

- Home, Library, Discover, Wishlist, and Statistics
- Create, edit, rate, sort, favourite, and delete games
- Playing/backlog/completed/on-hold/dropped/wishlist statuses
- Ownership, platform, playtime, notes, genres, and optional cover-art URL
- Genuine data-driven statistics and backlog suggestions; no fake game records
- IndexedDB local persistence
- JSON export/import backups (merges using IDs)
- Responsive design, GitHub Pages deployment, installable PWA shell
- No paid services, installation, account system, or ChatGPT runtime dependency

**Important:** Wikipedia search is built in. RAWG game screenshots and metadata require optional Worker configuration. Direct PS5 captures and media-inclusive backups are not yet implemented. JSON backups preserve artwork and screenshot *links*, not image bytes. Your data is stored **per browser/device**; GitHub Pages does not sync it.

## Deploying without installing software

1. In **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Open **Actions** to watch the build and deployment triggered by pushes to `main`.
3. Visit the live URL above after the deployment succeeds.
4. On iPhone, open the site in Safari and choose **Share → Add to Home Screen**.

For browser-based code editing, press `.` on the repository's GitHub page to open github.dev.

## Local development (optional)

```sh
npm install
npm run dev
npm run build
```

The project uses React, TypeScript, Vite and lucide-react. `vite.config.ts` sets the GitHub Pages base path to `/backloggd-ripoff-lol/`.

## Data safety

Your library lives in IndexedDB on the device. Back up frequently using **Settings → Export backup** and store the JSON safely. Importing merges by ID, updating matching entries. Browser data can be cleared by the operating system or browser. Do not treat the browser as your only copy.

## Roadmap

Catalogue search and real artwork, game screenshots/personal gallery, gaming journal, richer playthrough tracking, recommendation engine, optional external integrations, and downloadable media-inclusive backups.
