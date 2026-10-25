# GameVault

A minimal, mobile-first personal gaming library and backlog tracker.

**Live URL (once Pages is enabled):** https://258t6fr4ds-create.github.io/backloggd-ripoff-lol/

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

**Important:** This version does **not** connect to a catalogue API or automatically retrieve screenshots and covers. It supports real image URLs entered by the user. RAWG/SteamGridDB integrations and personal screenshots are planned, pending API terms, secure credentials, and storage decisions. JSON backups preserve artwork *links*, not image bytes. Your data is stored **per browser/device**; GitHub Pages does not sync it.

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
