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

export type PlaythroughStatus = 'in-progress' | 'completed' | 'paused' | 'abandoned';

export interface GamePlaythrough {
  id: string;
  title: string;
  status: PlaythroughStatus;
  startDate: string;
  endDate: string;
  hours: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
/** Individually logged, dated activity. Game-level time is tracked separately. */
export interface GameSession {
  id:string;
  date:string; // YYYY-MM-DD, user's local date
  minutes:number;
  note:string;
  addedToHours?:boolean;
  createdAt:string;
}
export interface GameJournalEntry {
  id: string;
  title: string;
  body: string;
  playthroughId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  title: string;
  year: number | null;
  platform: string; // user-owned/played platform, never inferred from RAWG
  availablePlatforms?: string; // supported platform names listed by RAWG
  shelves?: string[]; // user-defined synced library shelves
  priority?: number; // 0 unranked, 1-5 personal backlog priority
  progress?: number | null; // optional 0-100% personal progress
  sessions?: GameSession[]; // recorded gaming sessions, separate from the running hours total
  genres: string;
  coverUrl: string;
  description?: string;
  /** RAWG catalogue metadata. Kept separate from personal game information. */
  released?: string;
  developers?: string;
  publishers?: string;
  screenshots?: string[];
  catalogId?: string;
  catalogUrl?: string;
  catalogSource?: 'rawg' | 'wikipedia';
  dlcs?: GameDlc[];
  playthroughs?: GamePlaythrough[];
  journal?: GameJournalEntry[];
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

/** Strict calendar validation; Date.parse alone accepts rolled-over dates. */
export function validGameDate(value:string):boolean {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number);
  if(year<1900||year>2200||month<1||month>12||day<1||day>31)return false;
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year && date.getUTCMonth()+1===month && date.getUTCDate()===day;
}

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
  playthroughs: [], journal: [], shelves: [], sessions: [],
  priority: 0, progress: null,
  notes: '', completedAt: '', priceTarget: null, favourite: false,
  released: '', developers: '', publishers: '',
};

export function normalizeGame(raw: unknown): Game | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  if (typeof g.title !== 'string' || !g.title.trim()) return null;
  const text = (key: string, fallback = '') => typeof g[key] === 'string' ? String(g[key]).slice(0, 15000) : fallback;
  const numberOrNull = (value: unknown, max: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
  const now = new Date().toISOString();
  const safeDate = (value: unknown): string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
  const safeIso = (value: unknown): string => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value.slice(0,40) : now;
  const safeId = (value: unknown): string => typeof value === 'string' && value.length > 0 && value.length <= 130 ? value : crypto.randomUUID();
  const normalizeRun = (value: unknown): GamePlaythrough | null => {
    if (!value || typeof value !== 'object') return null;
    const run = value as Record<string,unknown>;
    if (typeof run.title !== 'string' || !run.title.trim()) return null;
    const status: PlaythroughStatus[] = ['in-progress','completed','paused','abandoned'];
    return {
      id:safeId(run.id),title:run.title.trim().slice(0,100),
      status:status.includes(run.status as PlaythroughStatus) ? run.status as PlaythroughStatus : 'in-progress',
      startDate:safeDate(run.startDate),endDate:safeDate(run.endDate),
      hours:numberOrNull(run.hours,1000000)??0,notes:typeof run.notes==='string'?run.notes.slice(0,4000):'',
      createdAt:safeIso(run.createdAt),updatedAt:safeIso(run.updatedAt),
    };
  };
  const normalizeEntry = (value: unknown): GameJournalEntry | null => {
    if (!value || typeof value !== 'object') return null;
    const entry=value as Record<string,unknown>;
    if (typeof entry.body !== 'string' || !entry.body.trim()) return null;
    return {
      id:safeId(entry.id),title:typeof entry.title==='string'?entry.title.trim().slice(0,100):'',
      body:entry.body.trim().slice(0,6000),
      playthroughId:typeof entry.playthroughId==='string'?entry.playthroughId.slice(0,130):'',
      createdAt:safeIso(entry.createdAt),updatedAt:safeIso(entry.updatedAt)
    };
  };
  return {
    id: text('id') || crypto.randomUUID(),
    title: text('title').trim().slice(0, 160),
    year: numberOrNull(g.year, 2200),
    platform: text('platform', 'PS5').slice(0, 60),
    availablePlatforms: text('availablePlatforms').slice(0, 600),
    shelves: Array.isArray(g.shelves)
      ? [...new Set(g.shelves.filter((x): x is string => typeof x==='string')
          .map(s=>s.trim().replace(/\s+/g,' ').slice(0,40))
          .filter(s=>s.length>0))].slice(0,12)
      : [],
    genres: text('genres').slice(0, 240),
    priority: typeof g.priority==='number' && Number.isInteger(g.priority) && g.priority>=1 && g.priority<=5 ? g.priority : 0,
    progress: numberOrNull(g.progress,100),
    sessions: Array.isArray(g.sessions)?g.sessions.slice(0,500).flatMap(item=>{
      if(!item||typeof item!=='object')return [];
      const v=item as Record<string,unknown>;
      if(typeof v.date!=='string'||!validGameDate(v.date))return [];
      const duration=typeof v.minutes==='number'&&Number.isInteger(v.minutes)&&v.minutes>=1&&v.minutes<=1440?v.minutes:null;
      if(duration===null)return [];
      return [{id:safeId(v.id),date:v.date,minutes:duration,
        note:typeof v.note==='string'?v.note.slice(0,500):'',
        addedToHours:v.addedToHours===true,
        createdAt:safeIso(v.createdAt)} satisfies GameSession];
    }):[],
    coverUrl: text('coverUrl').slice(0, 2048),
    description: text('description').slice(0, 5000),
    released: /^\d{4}-\d{2}-\d{2}$/.test(text('released')) ? text('released').slice(0,10) : '',
    developers: text('developers').slice(0,400),
    publishers: text('publishers').slice(0,400),
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
    playthroughs:Array.isArray(g.playthroughs) ? g.playthroughs.slice(0,50)
      .map(normalizeRun).filter((v):v is GamePlaythrough=>v!==null) : [],
    journal:Array.isArray(g.journal) ? g.journal.slice(0,200)
      .map(normalizeEntry).filter((v):v is GameJournalEntry=>v!==null) : [],
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
