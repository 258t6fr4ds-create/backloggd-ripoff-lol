export const STATUSES = ['playing', 'backlog', 'completed', 'paused', 'dropped', 'wishlist'] as const;
export type GameStatus = (typeof STATUSES)[number];

export const OWNERSHIPS = ['digital', 'physical', 'subscription', 'not-owned'] as const;
export type Ownership = (typeof OWNERSHIPS)[number];

export interface GameDlc {
  id: string;
  title: string;
  year: number | null;
  coverUrl: string;
  catalogId: string;
  catalogUrl: string;
  owned: boolean;
  addedAt: string;
}

export interface Game {
  id: string;
  title: string;
  year: number | null;
  platform: string; // user-owned/played platform, never inferred from RAWG
  availablePlatforms?: string; // supported platform names listed by RAWG
  genres: string;
  coverUrl: string;
  description?: string;
  screenshots?: string[];
  catalogId?: string;
  catalogUrl?: string;
  catalogSource?: 'rawg' | 'wikipedia';
  dlcs?: GameDlc[];
  status: GameStatus;
  ownership: Ownership;
  rating: number | null;
  hours: number;
  notes: string;
  completedAt: string;
  priceTarget: number | null;
  favourite: boolean;
  addedAt: string;
  updatedAt: string;
}

export type GameInput = Omit<Game, 'id' | 'addedAt' | 'updatedAt'>;

export const statusLabel: Record<GameStatus, string> = {
  playing: 'Playing',
  backlog: 'Backlog',
  completed: 'Completed',
  paused: 'On hold',
  dropped: 'Dropped',
  wishlist: 'Wishlist',
};

export const ownershipLabel: Record<Ownership, string> = {
  digital: 'Digital',
  physical: 'Physical',
  subscription: 'Subscription',
  'not-owned': 'Not owned',
};

export const emptyGame: GameInput = {
  title: '', year: null, platform: 'PS5', genres: '', coverUrl: '',
  status: 'backlog', ownership: 'digital', rating: null, hours: 0, dlcs: [],
  notes: '', completedAt: '', priceTarget: null, favourite: false,
};

export function normalizeGame(raw: unknown): Game | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  if (typeof g.title !== 'string' || !g.title.trim()) return null;
  const text = (key: string, fallback = '') => typeof g[key] === 'string' ? String(g[key]).slice(0, 15000) : fallback;
  const numberOrNull = (value: unknown, max: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
  const now = new Date().toISOString();
  return {
    id: text('id') || crypto.randomUUID(),
    title: text('title').trim().slice(0, 160),
    year: numberOrNull(g.year, 2200),
    platform: text('platform', 'PS5').slice(0, 60),
    availablePlatforms: text('availablePlatforms').slice(0, 600),
    genres: text('genres').slice(0, 240),
    coverUrl: text('coverUrl').slice(0, 2048),
    description: text('description').slice(0, 5000),
    screenshots: Array.isArray(g.screenshots) ? g.screenshots.filter((url): url is string => typeof url === 'string' && !!safeCover(url)).slice(0, 40) : [],
    catalogId: text('catalogId').slice(0, 120),
    catalogUrl: safeCover(text('catalogUrl').slice(0, 2048)),
    catalogSource: g.catalogSource === 'rawg' || g.catalogSource === 'wikipedia' ? g.catalogSource : undefined,
    dlcs: Array.isArray(g.dlcs) ? g.dlcs.slice(0,80).flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const d = item as Record<string,unknown>;
      if (typeof d.title !== 'string' || !d.title.trim()) return [];
      return [{
        id: typeof d.id === 'string' && d.id.length < 130 ? d.id : crypto.randomUUID(),
        title: d.title.trim().slice(0,160),
        year: numberOrNull(d.year,2200),
        coverUrl: typeof d.coverUrl === 'string' ? safeCover(d.coverUrl.slice(0,2048)) : '',
        catalogId: typeof d.catalogId === 'string' ? d.catalogId.slice(0,120) : '',
        catalogUrl: typeof d.catalogUrl === 'string' ? safeCover(d.catalogUrl.slice(0,2048)) : '',
        owned: d.owned === true,
        addedAt: typeof d.addedAt === 'string' ? d.addedAt.slice(0,40) : now,
      } satisfies GameDlc];
    }) : [],
    status: STATUSES.includes(g.status as GameStatus) ? g.status as GameStatus : 'backlog',
    ownership: OWNERSHIPS.includes(g.ownership as Ownership) ? g.ownership as Ownership : 'not-owned',
    rating: numberOrNull(g.rating, 10),
    hours: numberOrNull(g.hours, 1000000) ?? 0,
    notes: text('notes'),
    completedAt: text('completedAt').slice(0, 10),
    priceTarget: numberOrNull(g.priceTarget, 1000000),
    favourite: g.favourite === true,
    addedAt: text('addedAt', now),
    updatedAt: text('updatedAt', now),
  };
}

export function safeCover(url: string) {
  try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? url : ''; }
  catch { return ''; }
}
