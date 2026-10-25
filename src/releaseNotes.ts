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
