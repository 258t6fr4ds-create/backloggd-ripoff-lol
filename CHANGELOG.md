# GameVault — Changelog

All meaningful app updates receive dated, versioned patch notes. These match the in-app **What's New** panel. Entries list changes actually shipped, never planned features.

## [1.4.2] — 2026-10-26
**Platform information, properly.**

### Fixed
- RAWG single and bulk game imports now retain `platforms` returned by the RAWG search API rather than saving empty platform information.
- Game cards no longer display “Platform unknown” for imported games whose catalogue-supported platforms are available.

### Added
- Separate `availablePlatforms` metadata to distinguish **RAWG availability** from the **user's actual platform**. Never claim the user owns a game on every available system.
- Library action **Fill missing platforms** to backfill older RAWG games, up to 25 per run. The existing Worker searches titles, matches results by exact RAWG game ID, and updates only previously missing supported-platform metadata.
- Progress counter, failure summary and additional platform display in catalogue and game details.

### Data safety
- No change to IndexedDB schema version, Supabase tables, saved cloud settings or JSON backup format.
- Existing manually selected platforms are never overwritten.
- Availability metadata is optional and travels inside existing game records; no Cloudflare Worker redeploy needed.
- Backfill may miss obscure titles absent from RAWG's first-page search results; those are left unchanged.

## [1.4.1] — 2026-10-26
**DLC that actually belongs to the game.**

### Added
- Related DLC and editions browser, directly inside each RAWG-linked game profile and inside saved-game catalogue previews.
- RAWG's real `/games/{id}/additions` endpoint replaces guessed title-matching for related add-ons, with one-request lazy loading.
- Grouping into **Likely DLC & expansions**, **Other editions & bundles**, and an optionally expanded **Other extras** section.
- One-click attachment or selection of multiple additions, skipping any already linked.

### Improved
- The existing DLC inventory and owned/unowned controls remain in place.
- Dedicated manual-search fallback for titles not linked by RAWG.
- Clear messaging if an old Cloudflare Worker returns HTTP 404 for DLC endpoints.

**Required step:** Update the deployed Cloudflare Worker script with the revised `worker/index.js` from this repository. The GitHub Pages application can deploy automatically; your personal Cloudflare Worker does not deploy from GitHub automatically. The stored `RAWG_API_KEY` secret and `ALLOWED_ORIGIN` variable are reused unchanged.

**Limitations:** RAWG's additions endpoint includes editions, bundles and companion apps as well as actual DLC; labels are conservative best-effort filters, and the displayed page includes up to 40 RAWG additions. Results are user-reviewed and never automatically added.

**Data safety:** No IndexedDB version or cloud database migration; existing DLC records, games, backups and account details remain compatible.

## [1.4.0] — 2026-10-26
**Smarter discovery and DLC collections.**

### Added
- Optional Smart search (on by default) that recognises common gaming acronyms, shorthand, popular game keywords and minor spelling mistakes. The option stays on/off per device.
- “rivals” expands to “Marvel Rivals” while also searching the original term; exact recognised game matches are prioritised above lesser-known keyword collisions.
- Multi-select catalogue import: select games across several searches, pick library/wishlist status, or select a parent game to add multiple DLCs in one batch.
- Nested DLC records inside parent games, with artwork, release year, source links, owned toggles and removal controls.
- DLC section in each game's detail view, with Find DLC directly launching the catalogue and returning linked expansions under the parent.
- Linked DLC counts on library game cards and DLC lists in matching search previews.

### Improved
- Two-query maximum per RAWG search when Smart search provides a different lookup; debounced typing, request cancellation and previous search result caching remain.
- Duplicate catalogue IDs and identical game/year records are skipped; DLC imports skip existing add-ons and prevent self-linking.
- Normalised nested DLC records travel with their parent through the existing JSON backup and cloud sync flows.
- Mobile-friendly bulk-selection and DLC management UI.

**Limitations:** Smart search uses a local dictionary of popular titles plus small-edit corrections to common game terms; it is not a full internet-scale spelling service. DLC relationships are user-selected, not automatically claimed from RAWG's imperfect content metadata. Library expansion records are stored inside their parent game, up to 80 DLC per parent.

**No migration or new backend required:** Existing database, Supabase tables, RAWG Worker key, and saved games remain intact.

## [1.3.6] — 2026-10-26
**Better searches, tidier layout.**

### Fixed
- Search clear-X now remains beside the input instead of moving onto a second row when typing on narrow mobile screens.
- Narrow iPhone manual Search action becomes a compact icon, preserving room for typing and the X without horizontal overflow.

### Improved
- RAWG suggestions rank exact title matches first, group other matches by text relevance, and sort by RAWG popularity within each group.
- Popularity uses RAWG's `added` library-additions count with `ratings_count` as a smaller supporting signal, rather than sorting nearly everything by minor text score differences.
- Game/DLC filtering and Wikipedia fallback remain unchanged.

**Note:** Popularity ordering applies to the candidate results supplied by the existing RAWG Worker (its current page size is 15); it is not an exhaustive global ranking. No Worker redeployment or database migration required.

**Data safety:** All existing IndexedDB games, sync settings, queue, Supabase records and backups are preserved.

## [1.3.5] — 2026-10-26
**Find games as you type.**

### Added
- Live, debounced catalogue suggestions after two characters. Tap a result for its normal preview and add-to-library/wishlist actions.
- Arrow-key suggestion navigation, visible match statuses, and a Show all results control.
- Optional “Include soundtracks, demos and extras” checkbox, initially off.

### Improved
- RAWG is the default catalogue tab, with Wikipedia still available as a fallback.
- Search uses RAWG's existing games endpoint, retaining base games, DLC, expansions and editions. Obvious non-game extras are hidden by default with a conservative title-based filter.
- Exact and prefix game title matches rank above less relevant fuzzy matches.
- Cached lookups and aborted stale requests reduce duplicate searches and prevent old results replacing newer ones.
- Mobile-friendly suggestion rows and filter controls.

**Limitations:** RAWG's games search does not expose a reliable type field to identify every add-on versus every unrelated item. Filtering is best-effort, and the optional Include extras toggle lets you recover excluded results. This change works with the existing deployed Cloudflare Worker; no Worker code or RAWG key changes required.

**Data safety:** No changes to local games, IndexedDB schema, Supabase cloud tables, backup formats or private settings.

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
