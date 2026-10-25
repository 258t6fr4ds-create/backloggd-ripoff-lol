# GameVault — Changelog

All meaningful app updates receive dated, versioned patch notes. These match the in-app **What's New** panel. Entries list changes actually shipped, never planned features.

## [1.3.2] — 2026-10-25
**Mobile usability overhaul.**

### Fixed
- All important input and select controls are 16px or larger on mobile, preventing Safari's automatic focus zoom.
- Search/add game modal no longer automatically opens the on-screen keyboard.
- Modal layouts respond to the iOS visual viewport as the keyboard appears and keep save/close controls accessible.
- Game editor uses a single-column layout on phones with a sticky action footer, avoiding inaccessible save buttons.
- Long metadata, game names, URLs and filters no longer cause avoidable horizontal overflow.

### Improved
- Mobile header includes a persistent Find game control on every page.
- Game cover grid is two columns with larger tap targets, while the mobile bottom navigation remains reachable above safe areas.
- Cloud sync login/conflict handling, RAWG settings, catalogue search/import and game details receive responsive tap-target and scrolling refinements.
- Smaller screens and landscape heights get tailored layouts.

**No data changes:** All IndexedDB game records, offline sync queues, Supabase settings, RAWG Worker URLs and JSON backup formats remain unchanged.

## [1.3.1] — 2026-10-25
**A GameVault icon of its own.**

### Fixed
- Dedicated 180×180 PNG Apple touch icon added for Safari's **Add to Home Screen** flow, avoiding the previous ambiguous SVG-only fallback.

### Improved
- Versioned Apple touch icon and refreshed web-app manifest/icon reference so new installs get the correct controller branding.
- Updated service-worker offline cache version while preserving local library storage, cloud connection settings, and JSON backup compatibility.

**iOS note:** iPhone Home Screen icons are often captured at installation time. If an old shortcut still displays the wrong image, export a backup if you have local games, then remove only the **GameVault** shortcut and add it again from Safari (do not remove Sidequest).

## [1.3.0] — 2026-10-25
**Your games, across devices.**

### Added
- Optional Supabase Auth and per-user GameVault cloud table, separate from Sidequest's records.
- Automatic sync while the app is open, foreground/reconnect checks and manual Sync now.
- Persistent offline changes queue and cloud deletion tombstones.
- Explicit conflict handling for independently modified games.
- Sync status, pending changes, last-check timestamp and recovery guidance.
- Browser-only Supabase SQL setup and project connection instructions.

### Improved
- Existing local games and exported JSON backups remain compatible.
- Sync operations use cloud revision checks to prevent stale devices overwriting newer records.

**Required setup:** The user must run `supabase/gamevault.sql` in their own existing Supabase project, then supply only its public Project URL and publishable/anon key inside the app. Code deployment alone does not connect devices.

## [1.2.0] — 2026-10-25
**Real games. Real artwork.**

### Added
- Browser-native Wikipedia game/article search with real images when Wikipedia supplies them.
- One-click catalogue import into your game library or wishlist.
- Optional dedicated RAWG game catalogue via a securely configured Cloudflare Worker (requires user's own key).
- Real gameplay screenshot galleries in imported game profiles and manual screenshot URL editing.
- Source attribution, descriptions and links in game profiles.
- Browser-only `CATALOG_SETUP.md` guide and Worker code.

### Improved
- Mobile-friendly catalogue results, search and image previews.
- Preserve all previous saved games while adding optional new metadata fields.

**Scope:** Wikipedia search works without configuration, though it is incomplete and may return unrelated articles. RAWG search and screenshot fetching require a separately deployed Worker. No paid API or generated artwork is part of the default app.

## [0.1.1] — 2026-10-25
**Patch notes, permanently.**

### Added
- In-app What's New panel with the complete release history.
- Patch notes shortcuts in the header, sidebar, settings and footer.
- A NEW indicator until the latest notes are read on that device.
- Permanent changelog and repeatable release checklist.

### Improved
- Consistent visible app version and package version.

## [0.1.0] — 2026-10-25
**The foundation.**

### Added
- Home, Library, Discover, Wishlist and Statistics.
- Create, edit, rate, favourite, search, filter and delete games.
- Per-game metadata, playtime, notes, status, ownership and optional artwork URL.
- Backlog picker and data-driven statistics.
- Persistent browser-local IndexedDB library with JSON import/export.
- Responsive, installable web app shell and GitHub Pages deployment.

## Rules for future updates
- Bump `package.json` version for every deployed change: patch for fixes, minor for new backward-compatible features, major for breaking changes.
- Put the matching release at the top of `src/releaseNotes.ts` and at the top of this file.
- Explain actual additions, improvements and fixes precisely.
- Keep release history; do not erase earlier versions.
- Never remove or reset a user's game data during an update.
- Check deployment success before saying an update is live.
