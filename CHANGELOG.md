# GameVault — Changelog

All meaningful app updates receive dated, versioned patch notes. These match the in-app **What's New** panel. Entries list changes actually shipped, never planned features.

## [1.9.1] — 2026-10-30
**Final stability and mobile polish.**

- Added strict session calendar validation so invalid leap days and month rollover dates cannot be recorded or silently restored as valid sessions.
- Added a 180 KB game-record size guard for new session logs to reduce cloud-sync failures. New logs stop at 250 per game; previously saved records are retained, and full JSON backups remain available.
- Session save/remove controls now handle failed or thrown persistence safely; no permanently stuck busy state.
- Hardened completion-progress numeric entry against incomplete/invalid values.
- Fixed a statistics inconsistency: journal entries on wishlist-only games no longer inflate played-library journal totals.
- Clarified **Sessions & runs** in the five-tab game profile; maintained generous mobile buttons and profile safe-area layout.
- Suppressed update prompts behind active modals so game edits aren't obscured.
- Added Node regression tests for legacy saves, DLC/journal/playthrough compatibility, valid session dates and flags, safe artwork URLs, and basic analytics. CI now runs these checks before building/deploying.
- No changes to installed Worker, Supabase schema, ownership data or backup format.

## [1.9.0] — 2026-10-30
**The final feature bundle before moving focus to Gaia Atlas.**

### Play history and progress
- Log dated gaming sessions inside each game's Playthroughs section, with an optional short note and a toggle to add session time to the game-level hours total.
- Session records live inside the original game object, included automatically in local saves, JSON exports and cloud sync.
- Optional game completion percentage (0–100) and backlog priority (0–5) are editable per game.
- Game cards and profile overview can show priority and progress.

### Discovery and statistics
- Backlog command centre in Discover: priority-weighted suggestions, surprise pick, queued-game rankings, filters and Start playing.
- Activity insights in Statistics: monthly logged-session hours, current logging streak, most frequently logged games and highest completion progress.
- Session hours are reported separately from game totals, so previous manually logged playtime is not silently counted twice.

### Library and export
- New Library sorting by completion progress or backlog priority.
- Export library inventory as UTF-8 CSV via Settings & backups or the More tab. Escapes leading spreadsheet formulas. Includes status, platform, rating, hours, progress, priority, genre, shelves, dates, and more.
- CSV is a readable report, **not** a lossless backup. Continue exporting JSON for full restoration of nested DLC, journals, playthroughs and sessions.

### Compatibility
- Optional additive metadata only; old game records remain valid. No Worker redeployment, new SQL schema, account, paid service, or new secrets.
- Versioned offline cache and release notes updated.

## [1.8.4] — 2026-10-28
**Proper phone navigation.**

- Removed the inaccessible app-wide topbar on mobile screens instead of continuing to shuffle small icons inside it.
- Added a sixth bottom navigation tab: **More**. It includes large, touch-friendly actions for **Find game**, **Add manually**, **Cloud sync**, **Settings & backups**, and **What's new**.
- All five existing bottom tabs remain; the Library tile still opens Library, and analytics stay under Statistics.
- Added status-bar-safe padding for the first content and for settings, catalogue and other general-purpose modal sheets. Bottom navigation respects the iPhone home indicator.
- The More page shows the current version, online/offline status and whether a RAWG Worker is connected on this device.
- Desktop layout and side navigation remain unchanged. No database migration, changes to saved games, Worker redeployment or settings reset needed.

## [1.8.3] — 2026-10-28
**Clearer updates for installed Home Screen apps.**

- When a new service worker takes control, the app displays a **GameVault update available** notice with a user-controlled **Reload now** button.
- Checks for updates on mount, while returning to the foreground, on focus and after coming online.
- Users can dismiss the notice. It never automatically reloads away from unsaved form changes.
- Refreshed the offline app cache identifier. Version 1.8.2's correct Library shortcut remains unchanged.
- No game schema, saved records, cloud sync, Worker or settings changes.
- Note: this new update notice is only available after the device successfully loads 1.8.3 once. For older installed versions, fully close and reopen the Home Screen app to pick up the latest release.

## [1.8.2] — 2026-10-28
**Library tile goes to Library.**

### Fixed
- Clicking the **Games in library** home tile now opens **Library**, not the Statistics dashboard.
- Updated the tile's hint and accessibility label to say **Open library**.
- Library breakdown charts are still available under **Statistics**. The other home tiles keep their focused statistics shortcuts.
- No saved records, sync logic or data formats changed.

## [1.8.1] — 2026-10-28
**Mobile profile fixes and interactive home stats.**

### Mobile fixes
- Enlarged the game profile **Return to library** control and positioned the profile within iPhone safe areas.
- Prevented rubber-band scrolling from exposing bottom navigation behind the game profile. All modals lock background page scrolling and hide bottom app navigation until closed.
- Added an explanatory **Game sections** label before the five Overview, DLC, Playthroughs, Journal and Gallery tabs. Tabs remain horizontally scrollable on iPhone.
- Existing game library, profile details and modal actions are preserved.

### Interactive statistics
- All four home summary cards (Games in library, Currently playing, Completed, Hours logged) now open Statistics with that category selected.
- Category dashboards show real data and separate charts: game statuses, genres, platforms, currently playing hours, completed-game ratings, dated monthly finishes and top games by hours.
- Game chart labels can open the corresponding saved game. Counts and graph empty states are explicit. Run-specific hours are not double-counted with total logged hours.

### Default platform
- PS5 is the editable default personal platform for new manually added games (already supported) and now for single and bulk catalogue imports too.
- RAWG-supported platforms remain separate; existing saved games with different platforms are not overwritten.
- Cloud and storage formats are unchanged. Refreshed the installed-app offline cache version.

## [1.8.0] — 2026-10-28
**Game Profiles 2.0.**

### Redesigned game profiles
- Dedicated **Overview**, **DLC**, **Playthroughs**, **Journal** and **Gallery** tabs. No more giant stacked profile sections.
- Tabs open content independently, and existing DLC, playthrough and journal editors remain accessible only in their relevant areas.
- Full-width gallery of saved RAWG and user-provided screenshots, with link-out image viewing, and a responsive mobile layout.

### Metadata
- Optional full release date, developer and publisher fields stored on existing game records and editable manually.
- **Fill missing game info** fetches RAWG by exact catalogue ID (not a fuzzy title match) and only fills empty metadata, genres, supported-platform details, cover or screenshots. It **does not** replace the user-selected playing platform, ratings, notes, owned status, custom artwork or history.
- Basic metadata refresh falls back to existing RAWG Worker search when the new details endpoint has not been deployed. A new Worker endpoint for **GET /games/:id** unlocks full details.
- Optional **More in the series** carousel lists other titles connected by RAWG's **GET /games/:id/game-series** endpoint without auto-adding them to the library.

### DLC
- Filter RAWG-linked add-ons by title and type: labelled DLC, unclassified releases, editions and extras.
- Unknown additions are no longer automatically described as DLC, acknowledging RAWG's imperfect add-on categorisation.

### Setup and compatibility
- To unlock full metadata and series discovery, **redeploy** the updated `worker/index.js` to your existing Cloudflare Worker once. Your existing URL, RAWG secret and CORS origin remain the same. The web UI and basic metadata fallback work without redeployment.
- Bumped the offline cache version for updated frontend assets.
- No IndexedDB or Supabase schema migration, new secrets or account changes. All existing game, DLC, playthrough, journal and backup data remains compatible.

## [1.7.1] — 2026-10-27
**Cleaner DLC and playthrough details.**

- DLC and expansions now come before the Playthroughs & Journal section in game profiles.
- Removed the oversized "Your first playthrough starts here" empty-state card, which made unrelated DLC workflows feel repetitive.
- Games with no saved runs or journal entries show a compact collapsed history section by default. Existing recorded playthroughs and journals continue to open expanded.
- Open history and Collapse controls remain accessible on narrow mobile displays.
- Expanded empty history uses a short one-line note instead of a large placeholder.
- Updated offline cache version so installed Home Screen apps receive this layout patch.
- No changes to saved games, DLCs, playthroughs, cloud sync or backup formats.

## [1.7.0] — 2026-10-26
**The visual overhaul.**

### Design
- Redesigned GameVault's slate/graphite visual system while retaining its minimalist identity. More cohesive type, borders, accent colours, hover states and surfaces.
- Cinematic home hero using cover artwork from a saved currently-playing, favourite, or other library game, with a safe fallback.
- Richer game tiles featuring wide artwork, better imagery cropping, saved ratings, favourites, status and shelf metadata.
- Immersive game profiles with backdrop images drawn from existing screenshots or covers, while preserving all existing DLC, journal and playthrough content.
- Mobile-first styles for iPhone screens, responsive grids, safe-area navigation and low-clutter controls. Respects reduced-motion settings.

### Library experience
- Switch between media-grid and compact-list browsing layouts; the preference is stored locally.
- Create your own named shelves by editing a game or selecting multiple library entries.
- Shelf chips across Library allow one-tap filtering, with platform, favourites, status, title search and sorting available together.
- Multi-select games to add/remove a custom shelf or set their game status in one bulk change.
- Shelves are stored directly inside GameVault game records, in optional `shelves` metadata, so they are preserved in JSON backup and Supabase cloud sync.

### Compatibility
- No schema migration, SQL updates, new Worker endpoint, paid services or reset required.
- Existing game metadata, artwork, platform, DLC, journal and playthrough histories remain intact.
- Bumped app's service worker cache identifier so newly deployed assets replace older cached resources; no reinstall needed.

## [1.6.0] — 2026-10-26
**Insights and better next-game picks.**

### Added
- Discover now recommends only your saved Backlog and On hold games, in four selectable modes: **For your taste**, **Recently added**, **Overlooked**, and **Something different**.
- Each recommended game explains its score in plain language based on your personally rated or favourited genres, or its position in the backlog. Rotate picks, view details, start playing, or show more.
- Interactive Statistics panels with genre breakdown by library count, your average genre rating, or logged hours.
- Personal rating histogram, average and median rating, completion percentage, backlog count, and a 12-month chart of dated game completions.
- Playthrough analytics summarising runs, completed runs, journal entries and separately tracked run-specific hours.

### Improved
- Analysis is deterministic, client-side and works offline. It uses existing records only, no new service, RAWG key requests or hidden profile.
- Games without ratings remain unrated, wishlist items are excluded from core completion/ratings, and genres are deduplicated per game.
- Completion trend only counts completed games with valid dates. Playthrough completions are not mixed into it or game-level hours.
- Empty states explain missing data instead of fabricating trends or recommending games the user doesn't own.
- No new data schema; recommendation mode is UI-only and actions use existing local and Supabase sync.

**Data safety:** No database migrations, Cloudflare Worker edits or new third-party API services. Existing game, DLC, platform, journal, playthrough and JSON backup data remains intact.

## [1.5.0] — 2026-10-26
**Every playthrough has a story.**

### Added
- Per-game **Playthroughs & Journal** panel in every game detail view, with separate tabs and mobile-friendly forms.
- Up to 50 playthroughs per game, each with an independent title, status, started/finished dates, duration and private run notes.
- Personal gaming journal with entries that can optionally be assigned to a specific playthrough, edited, filtered and removed.
- Playthrough count on game cards and summary counts (runs, completed runs, journal entries) in Statistics.

### Improved
- Run and journal entries are embedded in their existing game records and are retained by the current JSON backup and Supabase cloud sync.
- No fabricated historical playthroughs: existing saved hours, ratings and notes are left untouched.
- Overall game-level playtime totals remain separate from new run-specific durations, avoiding accidental double-counting.
- Deleting a run unlinks attached journal entries without deleting those entries.
- New and edited run/journal entries are size-checked to stay below GameVault's per-record Supabase limit.

**Data safety:** No IndexedDB migration, Cloudflare Worker redeploy or SQL changes. Existing platform, DLC, artwork, stats, library, cloud credentials and backups remain compatible.

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
