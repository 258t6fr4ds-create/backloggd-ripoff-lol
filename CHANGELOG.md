# GameVault — Changelog

All meaningful app updates receive dated, versioned patch notes. These match the in-app **What's New** panel. Entries list changes actually shipped, never planned features.

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
