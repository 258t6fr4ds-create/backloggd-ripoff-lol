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
