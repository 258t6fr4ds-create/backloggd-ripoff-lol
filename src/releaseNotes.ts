export type ChangeType = 'Added' | 'Improved' | 'Fixed';

export interface Release {
  version: string;
  date: string;
  title: string;
  summary: string;
  changes: { type: ChangeType; text: string }[];
}

/**
 * Newest release first. For EVERY deployed update:
 * 1. Bump package.json version.
 * 2. Add a release here.
 * 3. Add the same release to CHANGELOG.md.
 * 4. Verify the GitHub Actions build before considering it released.
 */
export const RELEASE_NOTES: Release[] = [
  {
    version:'1.9.1',
    date:'2026-10-30',
    title:'Final stability and mobile polish.',
    summary:'Validated session inputs and cloud limits, improved touch and update overlays, and added a repeatable regression test suite.',
    changes:[
      {type:'Fixed',text:'Session dates now reject impossible calendar dates, including incorrect leap days and invalid month lengths.'},
      {type:'Fixed',text:'Session logging checks game-record size before saving to avoid exceeding the practical per-record cloud sync limit.'},
      {type:'Fixed',text:'Protected session saves and deletes from unexpected write failures, keeping controls responsive after an error.'},
      {type:'Fixed',text:'Completion progress entry no longer produces NaN for an incomplete numeric input.'},
      {type:'Fixed',text:'Wishlist journal notes are no longer counted in the main played-library journal statistics, matching how run totals are calculated.'},
      {type:'Improved',text:'Clarified Sessions & runs tab wording and adjusted mobile touch targets for saved sessions and backlog queues.'},
      {type:'Fixed',text:'Update notices are hidden while an editing or game modal is active, avoiding accidental overlays.'},
      {type:'Added',text:'Regression tests for legacy save compatibility, session validation, ratings and analytics; required by GitHub Actions before deployment.'},
      {type:'Improved',text:'No game data reset, database migration, API endpoint change or app reinstall required.'},
    ],
  },

  {
    version:'1.9.0',
    date:'2026-10-30',
    title:'The final feature bundle.',
    summary:'Gaming session diary, backlog command centre, per-game progress and priorities, richer activity charts, and CSV exports.',
    changes:[
      {type:'Added',text:'Log dated gaming sessions with duration and notes from a game\'s Playthroughs tab. Optionally add each session to its game-level hours.'},
      {type:'Added',text:'Personal completion percentages and backlog priority rankings (0–5) per game. They are optional and stored with your games.'},
      {type:'Added',text:'Discover now includes a backlog command centre with ranked queues, priority filtering, weighted surprise picks and one-click Start playing.'},
      {type:'Added',text:'Statistics includes monthly session activity charts, top session games, progress tracking and logging streaks from recorded dates only.'},
      {type:'Added',text:'Sort the Library by backlog priority or completion progress, with progress and priority chips on saved cards.'},
      {type:'Added',text:'Export a spreadsheet-friendly CSV inventory, with formula-safe fields. JSON remains the complete restorable backup.'},
      {type:'Improved',text:'Session logs, priorities and progress stay within each game for existing JSON backups and Supabase sync. No extra API or database migration.'},
    ]
  },

  {
    version: '1.8.4',
    date: '2026-10-28',
    title: 'A proper phone navigation.',
    summary: 'Removed the inaccessible topbar on phones and moved its actions to a dedicated More tab with reachable, safe-area-aware controls.',
    changes: [
      { type: 'Fixed', text: 'The main app topbar no longer appears on phone-sized screens, avoiding controls hidden under the iPhone status bar.' },
      { type: 'Added', text: 'A sixth mobile bottom-navigation tab called More provides Find game, Add manually, Cloud sync, Settings & backups, and What\'s new.' },
      { type: 'Improved', text: 'The More page has large touch-friendly action rows, release-version information and online/RAWG connection status.' },
      { type: 'Improved', text: 'Home, Library, Discover, Wishlist and Stats stay in bottom navigation without moving charts out of Statistics.' },
      { type: 'Fixed', text: 'Page content and general app modals respect the iPhone safe area, including the status bar, while the bottom navigation clears the home indicator.' },
      { type: 'Improved', text: 'Desktop navigation remains unchanged; no existing game, DLC, cloud or backup data is altered.' },
    ],
  },

  {
    version: '1.8.3',
    date: '2026-10-28',
    title: 'Clearer app updates.',
    summary: 'Installed Home Screen apps now check for new versions on reopen and foreground, with a safe in-app Reload now notice.',
    changes: [
      { type: 'Added', text: 'A GameVault update available banner appears when a newer service worker takes control of the installed app.' },
      { type: 'Improved', text: 'GameVault checks for service-worker updates when reopened, brought to the foreground or reconnected to the internet.' },
      { type: 'Improved', text: 'Updates require a user-tapped Reload now, rather than interrupting unsaved game edits.' },
      { type: 'Improved', text: 'Refreshed app offline cache to pick up new frontend assets without reinstalling the Home Screen app.' },
    ],
  },

  {
    version: '1.8.2',
    date: '2026-10-28',
    title: 'Library tile goes to Library.',
    summary: 'The home library count now opens your actual game collection; all breakdown charts remain available in Statistics.',
    changes: [
      { type: 'Fixed', text: 'The Games in library home tile opens the Library tab instead of the Statistics dashboard.' },
      { type: 'Improved', text: 'The library tile now says Open library, with matching accessible button text.' },
      { type: 'Improved', text: 'Currently playing, Completed and Hours logged still lead to their focused statistics, and Library charts remain in the Statistics tab.' },
    ],
  },

  {
    version: '1.8.1',
    date: '2026-10-28',
    title: 'Mobile profile fixes and interactive home stats.',
    summary: 'Reachable back navigation, PS5 imports, game-profile tab guidance, and charts behind every home metric.',
    changes: [
      { type: 'Fixed', text: 'The Return to library control is now a larger touch target positioned below iPhone safe areas in game profiles.' },
      { type: 'Fixed', text: 'Opening a modal freezes background scrolling and hides mobile bottom navigation, preventing it appearing through the profile when overscrolling.' },
      { type: 'Improved', text: 'The five game-profile tabs are clearly introduced as Overview, DLC, Playthroughs, Journal, and Gallery with horizontal swipe guidance on mobile.' },
      { type: 'Added', text: 'All four home summary cards are clickable shortcuts to focused Statistics screens for Library, Playing, Completed and Hours logged.' },
      { type: 'Added', text: 'Focused charts: library statuses, genres, platforms, current playtime, completed ratings and dated finishes, top games by hours and playtime genres.' },
      { type: 'Fixed', text: 'New RAWG and Wikipedia single and bulk game imports use PS5 as the editable default personal platform, separate from RAWG available-platform information.' },
      { type: 'Improved', text: 'Empty-state hints for statistics use real saved data only; run-specific hours remain separate to prevent double counting.' },
    ],
  },

  {
    version: '1.8.0',
    date: '2026-10-28',
    title: 'Game Profiles 2.0',
    summary: 'Five proper game tabs, smarter DLC browsing, richer catalogue details and safe missing-metadata refresh.',
    changes: [
      { type: 'Added', text: 'Immersive game profiles with separate Overview, DLC, Playthroughs, Journal and Gallery tabs. Each tab shows only its own content.' },
      { type: 'Improved', text: 'DLC browser now has search and type filters and labels unclassified RAWG additions honestly instead of assuming every item is an expansion.' },
      { type: 'Added', text: 'Release date, developers and publishers in game metadata, preserved in edits, JSON exports and optional cloud sync.' },
      { type: 'Added', text: 'Fill missing game info fetches the exact RAWG game ID and fills only empty fields, retaining personal platforms, ratings, artwork edits, notes, DLC and playthrough data.' },
      { type: 'Added', text: 'Related titles from RAWG game-series endpoint, where available, and a dedicated image gallery with safe external source links.' },
      { type: 'Improved', text: 'Mobile-friendly tab navigation, responsive gallery, clearer metadata cards and reduced profile scrolling.' },
      { type: 'Improved', text: 'Existing Cloudflare Workers can refresh basic metadata via exact-ID search fallback. Full publisher/developer details and series browsing require one manual Worker script update.' },
      { type: 'Fixed', text: 'Playthrough and journal editors no longer crowd DLC screens; existing entries remain intact.' },
    ],
  },

  {
    version: '1.7.1',
    date: '2026-10-27',
    title: 'Cleaner DLC and playthrough details.',
    summary: 'DLC appears before playthrough history, and unused history no longer floods the screen with empty-state cards.',
    changes: [
      { type: 'Fixed', text: 'Removed the large Your first playthrough starts here placeholder from empty game histories.' },
      { type: 'Improved', text: 'Playthroughs and journal are initially collapsed when no runs or entries exist, with a clear Open history control.' },
      { type: 'Improved', text: 'DLC and expansions now appear ahead of the playthrough section in game details, making add-on browsing easier.' },
      { type: 'Improved', text: 'Expanded history uses a small plain-text empty state instead of a large repetitive card.' },
      { type: 'Fixed', text: 'New mobile styling keeps the compact history controls reachable without obscuring DLC entries.' },
    ],
  },

  {
    version: '1.7.0',
    date: '2026-10-26',
    title: 'The visual overhaul.',
    summary: 'A more cinematic gaming library with richer game art, elegant profiles, flexible browsing and custom synced shelves.',
    changes: [
      { type: 'Improved', text: 'Overhauled the graphite-and-slate design with more cohesive typography, spacious cards, muted blue highlights and refined surfaces.' },
      { type: 'Improved', text: 'Game covers now appear in cinematic artwork tiles with ratings, polished status chips, favourites and optional shelf labels.' },
      { type: 'Improved', text: 'Game details have a cinematic banner using your saved screenshot or image, with a more immersive cover, actions and metadata layout.' },
      { type: 'Added', text: 'Library grid and compact list views, with the view preference remembered on the device.' },
      { type: 'Added', text: 'Custom library shelves saved within each game record, viewable as library tabs and editable on the game form.' },
      { type: 'Added', text: 'Bulk library management: select games, assign or remove a named shelf, or change statuses together.' },
      { type: 'Added', text: 'Library filtering by personal platform and favourites alongside the existing title, status and sort controls.' },
      { type: 'Improved', text: 'The mobile layout includes a two-column media grid, scrollable shelf chips, narrower controls and more accessible game profile content.' },
      { type: 'Fixed', text: 'Updated offline app cache version for the release while preserving game data and existing homescreen app installation.' },
    ],
  },

  {
    version: '1.6.0',
    date: '2026-10-26',
    title: 'Insights and better next-game picks.',
    summary: 'Deeper personal analytics, explainable backlog recommendations and several ways to choose your next game.',
    changes: [
      { type: 'Added', text: 'Four backlog recommendation modes: For your taste, Recently added, Overlooked, and Something different.' },
      { type: 'Added', text: 'Clear reasons behind recommendations drawn from your own ratings, favourites, genres and backlog dates.' },
      { type: 'Added', text: 'Start playing from a recommendation without opening the game editor or changing other game data.' },
      { type: 'Added', text: 'Interactive genre breakdowns ranked by game count, average personal rating or logged hours.' },
      { type: 'Added', text: 'Personal ratings distribution, median score, completion percentage and monthly dated-completion timeline.' },
      { type: 'Improved', text: 'Playthrough history, completed runs and journal entries now have a dedicated analytics summary, with run hours kept separate from game totals.' },
      { type: 'Improved', text: 'Recommendations and charts work offline without external APIs, tracking or invented scores; sparse libraries show helpful empty states.' },
      { type: 'Fixed', text: 'Wishlist entries are excluded from completion and rating statistics, and unrecorded ratings are not treated as zero.' },
    ],
  },

  {
    version: '1.5.0',
    date: '2026-10-26',
    title: 'Every playthrough has a story.',
    summary: 'Replay tracking and a personal gaming journal now live inside each game.',
    changes: [
      { type: 'Added', text: 'Separate playthrough records for every game, including run name, status, start/end dates, hours, and notes.' },
      { type: 'Added', text: 'Editable journal entries for favourite moments, choices, reviews and progress, with optional links to specific playthroughs.' },
      { type: 'Added', text: 'Per-game Playthroughs and Journal tabs with editing, deletion and filter-by-run controls.' },
      { type: 'Improved', text: 'Game cards show recorded run counts, and Statistics now summarises runs, completed runs and journal entries.' },
      { type: 'Improved', text: 'Playthrough and journal data is stored inside existing game records, so it follows current JSON backups and optional Supabase sync.' },
      { type: 'Fixed', text: 'Deleting a run preserves journal entries by unlinking them instead of discarding personal notes.' },
      { type: 'Improved', text: 'Existing game-level hours remain separate from playthrough hours, preventing accidental double-counting of old playtime in analytics.' },
      { type: 'Improved', text: 'New history entries check a conservative cloud record size limit and never overwrite existing game notes, DLCs or ratings.' },
    ],
  },

  {
    version: '1.4.2',
    date: '2026-10-26',
    title: 'Platform information, properly.',
    summary: 'Imported RAWG games now show their available platforms without guessing where you play them.',
    changes: [
      { type: 'Fixed', text: 'RAWG imports and bulk imports no longer throw away the platform availability supplied by the catalogue.' },
      { type: 'Improved', text: 'Game cards display supported platforms when no personal platform was entered, instead of Platform unknown.' },
      { type: 'Added', text: 'Game details distinguish Your platform from Available on (RAWG), so supported systems are never mistaken for owned systems.' },
      { type: 'Added', text: 'Library action to fill missing RAWG platform metadata on older imported games, up to 25 per batch, with progress and exact RAWG-ID matching.' },
      { type: 'Improved', text: 'Catalogue previews show the available systems and game editor clearly labels personal platform separately.' },
      { type: 'Fixed', text: 'The metadata backfill preserves user-selected platforms, unrelated game data, Supabase compatibility and existing backups.' },
    ],
  },

  {
    version: '1.4.1',
    date: '2026-10-26',
    title: 'DLC that actually belongs to the game.',
    summary: 'Direct RAWG DLC relationships, cleaner add-on browsing and batch attachment from game profiles.',
    changes: [
      { type: 'Added', text: 'Use the dedicated RAWG additions endpoint to discover expansions associated with a specific game, rather than guessing from a text search.' },
      { type: 'Improved', text: 'DLC browsing groups likely expansions separately from editions, bundles and non-game extras.' },
      { type: 'Added', text: 'Add individual add-ons or select several to attach to a parent game at once; already linked DLC is excluded.' },
      { type: 'Improved', text: 'Browse related DLC directly inside Library game details and from an existing game catalogue preview.' },
      { type: 'Improved', text: 'Clear explanation when the optional Cloudflare Worker is still on its older version, with manual search available as a fallback.' },
      { type: 'Fixed', text: 'DLC browsing no longer requires typing a parent game title into a generic catalogue search when related additions are available.' },
    ],
  },

  {
    version: '1.4.0',
    date: '2026-10-26',
    title: 'Smarter discovery and DLC collections.',
    summary: 'Find the games you mean, import several together, and organise DLCs under their parent games.',
    changes: [
      { type: 'Added', text: 'Optional Smart search with common acronyms, recognised shorthand, minor typo corrections, and a switch to disable it.' },
      { type: 'Improved', text: 'Ambiguous searches such as Rivals also query the popular intended title Marvel Rivals, with exact preferred matches ranked first.' },
      { type: 'Added', text: 'Select multiple results across catalogue searches and import them together to library or wishlist.' },
      { type: 'Added', text: 'Add one or several DLCs under an existing game directly from the search catalogue.' },
      { type: 'Added', text: 'Each library game now has its own DLC section, with owned/not-owned toggles, source links and removable entries.' },
      { type: 'Improved', text: 'Game cards show their DLC count; searching a library game reveals its linked DLCs.' },
      { type: 'Improved', text: 'Bulk imports skip existing catalogue IDs and duplicate game titles, and preserve local/cloud-sync record compatibility.' },
      { type: 'Fixed', text: 'The parent game cannot be attached to itself as its own DLC.' },
    ],
  },

  {
    version: '1.3.6',
    date: '2026-10-26',
    title: 'Better searches, tidier layout.',
    summary: 'Keeps the search clear button on the same line while putting popular RAWG games and DLC near the top.',
    changes: [
      { type: 'Fixed', text: 'The clear-search X remains next to the typing field on small iPhones instead of wrapping to a second row.' },
      { type: 'Improved', text: 'On narrow iPhones the manual Search button becomes a compact icon so the title field and clear button have room.' },
      { type: 'Improved', text: 'RAWG suggestions are now ordered by game popularity (library additions, supplemented by rating count) within title-relevance groups.' },
      { type: 'Improved', text: 'Exact title matches still come first, keeping highly popular but unrelated titles from crowding out what you searched for.' },
    ],
  },

  {
    version: '1.3.5',
    date: '2026-10-26',
    title: 'Find games as you type.',
    summary: 'RAWG-first discovery, debounced live suggestions, improved game/DLC relevance and fewer unrelated extras.',
    changes: [
      { type: 'Added', text: 'Live search suggestions after two characters, with a short typing debounce to avoid unnecessary RAWG requests.' },
      { type: 'Added', text: 'Keyboard up/down navigation, highlighted suggestions, and tap-to-preview game results.' },
      { type: 'Improved', text: 'RAWG now opens as the default catalogue, with Wikipedia kept as an explicit alternative.' },
      { type: 'Improved', text: 'Game and DLC results are prioritised; obvious soundtracks, guides, trailers, demos and other extras are hidden by default.' },
      { type: 'Added', text: 'Include extras switch for seeing all RAWG results when the default filter is too restrictive.' },
      { type: 'Improved', text: 'Abort old requests, reuse recent query results within search, and show clear loading and no-results states.' },
      { type: 'Fixed', text: 'Fast typing no longer allows older search results to replace newer suggestions.' },
    ],
  },

  {
    version: '1.3.2',
    date: '2026-10-25',
    title: 'Mobile usability overhaul.',
    summary: 'Repairs iPhone input zoom, modal actions blocked by the keyboard, tiny controls, and navigation on narrow screens.',
    changes: [
      { type: 'Fixed', text: 'Safari input focus no longer zooms the entire screen when searching, editing games, configuring RAWG or signing into Supabase.' },
      { type: 'Fixed', text: 'Edit, catalogue, settings, cloud sync and patch notes panels scroll inside the visible viewport, including when the iPhone keyboard opens.' },
      { type: 'Fixed', text: 'Save, Cancel, Close and import actions remain accessible on narrow screens; form save actions are pinned at the bottom of the editor.' },
      { type: 'Improved', text: 'A dedicated Find game icon is always available in the mobile header from every tab.' },
      { type: 'Improved', text: 'Touch-friendly navigation and controls, more legible two-column game cards and better small-screen text wrapping.' },
      { type: 'Improved', text: 'Better iPhone safe-area spacing, improved cloud conflict and catalogue result layouts, and fewer unintended keyboard popups.' },
      { type: 'Fixed', text: 'Responsive form fields no longer crush into unusably narrow columns on phones.' },
    ],
  },

  {
    version: '1.3.1',
    date: '2026-10-25',
    title: 'A GameVault icon of its own.',
    summary: 'Fixes the iPhone Home Screen shortcut icon by providing a dedicated Apple touch image and refreshed app metadata.',
    changes: [
      { type: 'Fixed', text: 'Added a real 180×180 PNG Apple touch icon so iPhone Home Screen shortcuts display the GameVault controller instead of an incorrect cached icon.' },
      { type: 'Improved', text: 'Refreshed manifest and icon version references so newly installed shortcuts use the latest GameVault art.' },
      { type: 'Improved', text: 'Updated the offline cache version while preserving all existing local game records and cloud settings.' },
    ],
  },

  {
    version: '1.3.0',
    date: '2026-10-25',
    title: 'Your games, across devices.',
    summary: 'Optional Supabase cloud sync with offline changes, device merging, and explicit conflict resolution.',
    changes: [
      { type: 'Added', text: 'Sign in through Supabase using the same account/project as Sidequest, with a separate GameVault table.' },
      { type: 'Added', text: 'Cross-device game sync, local offline edit queue and deletion protection via tombstones.' },
      { type: 'Added', text: 'Visible sync state, pending-change count, last-check time and manual Sync now control.' },
      { type: 'Added', text: 'Per-game conflict review so another device cannot silently overwrite a newer record.' },
      { type: 'Improved', text: 'Cloud checks while the app is open, on network reconnection and when the app becomes visible.' },
      { type: 'Added', text: 'Additive Supabase SQL setup and browser-only configuration documentation.' },
    ],
  },

  {
    version: '1.2.0',
    date: '2026-10-25',
    title: 'Real games. Real artwork.',
    summary: 'Find real game records without typing everything yourself, with an optional richer RAWG catalogue and screenshot gallery.',
    changes: [
      { type: 'Added', text: 'No-key Wikipedia game/article search with real thumbnails where available.' },
      { type: 'Added', text: 'Import search results directly into Library or Wishlist and keep source attribution.' },
      { type: 'Added', text: 'Optional RAWG catalogue and gameplay screenshot support through a separately configured secure Worker.' },
      { type: 'Added', text: 'Gameplay screenshot galleries on game profiles, including manually entered real image URLs.' },
      { type: 'Improved', text: 'Expanded profiles with catalogue descriptions, image galleries and source links.' },
      { type: 'Improved', text: 'Existing IndexedDB records and JSON backups remain compatible; no library reset.' },
      { type: 'Added', text: 'Browser-only connection instructions for RAWG; its API key never enters public GitHub code.' },
    ],
  },

  {
    version: '0.1.1',
    date: '2026-10-25',
    title: 'Patch notes, permanently.',
    summary: 'Every GameVault release now has its own visible, versioned patch notes.',
    changes: [
      { type: 'Added', text: 'An in-app What\'s New panel containing release history and individual changes.' },
      { type: 'Added', text: 'Patch notes shortcuts in the header, sidebar, settings and footer.' },
      { type: 'Added', text: 'A subtle NEW indicator until you read the latest notes on this device.' },
      { type: 'Improved', text: 'Consistent version numbers throughout the interface and package metadata.' },
      { type: 'Added', text: 'A permanent CHANGELOG.md file and a release checklist for future updates.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-25',
    title: 'The foundation.',
    summary: 'GameVault is born: a free, minimalist, browser-based personal game library.',
    changes: [
      { type: 'Added', text: 'Home, Library, Discover, Wishlist and Statistics screens.' },
      { type: 'Added', text: 'Create, edit, organise, rate, favourite and remove game records.' },
      { type: 'Added', text: 'Custom cover image URLs, game notes, platform, status, ownership and playtime.' },
      { type: 'Added', text: 'Search, sorting, status filters and a backlog picker.' },
      { type: 'Added', text: 'IndexedDB saves and portable JSON backup import/export.' },
      { type: 'Added', text: 'Responsive Minimal interface, offline-ready PWA shell and GitHub Pages deployment.' },
    ],
  },
];

export const APP_VERSION = RELEASE_NOTES[0].version;
