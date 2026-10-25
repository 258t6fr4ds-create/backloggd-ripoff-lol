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
