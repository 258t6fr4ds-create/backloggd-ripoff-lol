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
