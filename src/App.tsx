import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BarChart3, BookOpen, Check,
  ChevronDown, Clock3, Compass, Download, Filter, Gamepad2, Heart,
  Home, LayoutGrid, List, Library, Menu, MoreHorizontal, Pencil, Plus,
  RefreshCw, Search, Settings2, ShieldCheck, Shuffle, SlidersHorizontal,
  Sparkles, Star, Trash2, Upload, X
} from 'lucide-react';
import { loadGames, mergeGames, removeGame, saveGame, recordPending } from './db';
import { Cloud } from 'lucide-react';
import CloudPanel from './CloudPanel';
import {
  emptyGame, normalizeGame, ownershipLabel, OWNERSHIPS,
  safeCover, statusLabel, STATUSES
} from './types';
import type { Game, GameDlc, GameInput, GameStatus, Ownership } from './types';
import { APP_VERSION } from './releaseNotes';
import CatalogueSearch from './CatalogueSearch';
 
import type { CatalogueGame } from './catalog';
import { readRawgProxy, saveRawgProxy, searchRawg } from './catalog';
import PatchNotes from './PatchNotes';
import GameProfile from './GameProfile';
import UpdateNotice from './UpdateNotice';
import StatDetailPanel from './StatDetailPanel';
import type { StatFocus } from './StatDetailPanel';
import InsightsPanel from './InsightsPanel';
import DiscoveryRecommendations from './DiscoveryRecommendations';

type Page = 'home' | 'library' | 'discover' | 'wishlist' | 'stats' | 'more';
type Sort = 'recent' | 'title' | 'rating' | 'hours' | 'year';
const NAV = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
] as const;
// The desktop has a full sidebar and header. On a phone, the inaccessible
// topbar is removed and all its actions live in the bottom-accessible More tab.
const MOBILE_NAV = [...NAV, { id: 'more', label: 'More', icon: MoreHorizontal }] as const;

const dateLabel = (iso: string) => {
  if (!iso) return 'Not recorded';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtHours = (n: number) => new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 }).format(n);
const currency = (n: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 }).format(n);
// Platform recorded by the user is not the same thing as platform availability on RAWG.
function platformSummary(game: Game): string {
  if (game.platform.trim()) return game.platform;
  const available = game.availablePlatforms?.split(', ').filter(Boolean) ?? [];
  if (!available.length) return 'Platform not set';
  const preview = available.slice(0,2).join(', ');
  return 'Available: ' + preview + (available.length > 2 ? ' +' + (available.length-2) : '');
}

function parseShelves(text:string):string[] {
  const out:string[]=[];
  const seen=new Set<string>();
  for(const part of text.split(',')) {
    const name=part.trim().replace(/\s+/g,' ').slice(0,40);
    if(name && !seen.has(name.toLocaleLowerCase())) {out.push(name);seen.add(name.toLocaleLowerCase());}
    if(out.length>=12)break;
  }
  return out;
}

function Cover({ game, className = '' }: { game: Game; className?: string }) {
  const url = safeCover(game.coverUrl);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  return (
    <div className={'cover ' + className}>
      {url && !broken ? (
        <img src={url} alt={'Artwork for ' + game.title} loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="cover-fallback" aria-label="No cover image"><Gamepad2 size={34} strokeWidth={1.25} /></div>
      )}
    </div>
  );
}
function Pill({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={'pill ' + tone}>{children}</span>;
}
function Empty({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon ?? <Gamepad2 size={28}/>}</div><h3>{title}</h3><p>{description}</p>{action}</div>;
}
function GameCard({ game, onClick, selecting = false, checked = false }: { game: Game; onClick: () => void; selecting?: boolean; checked?: boolean }) {
  return (
    <button className={'game-card'+(selecting?' game-card-selecting':'')+(checked?' game-card-checked':'')} onClick={onClick} aria-label={(selecting?(checked?'Unselect ':'Select '):'Open ') + game.title} aria-pressed={selecting?checked:undefined}>
      {selecting&&<span className="gv-selection-check" aria-hidden="true">{checked?<Check size={18}/>:<Plus size={18}/>}</span>}
      <div className="poster">
        <Cover game={game}/>
        {game.favourite && <span className="poster-favourite" title="Favourite"><Heart size={15} fill="currentColor"/></span>}
        {game.rating!==null&&<span className="gv-poster-rating"><Star size={12} fill="currentColor"/> {game.rating.toFixed(1)}</span>}
      </div>
      <div className="card-meta"><h3 title={game.title}>{game.title}</h3><p>{game.year || 'Year unknown'} <span>·</span> {platformSummary(game)}</p></div>
      <div className="card-bottom"><Pill tone={'status-' + game.status}>{statusLabel[game.status]}</Pill>{(game.dlcs?.length ?? 0) > 0 && <span className="rating-small">{game.dlcs!.length} DLC</span>}{(game.playthroughs?.length ?? 0) > 0 && <span className="rating-small">{game.playthroughs!.length} runs</span>}{(game.shelves?.length??0)>0&&<span className="rating-small gv-card-shelf">{game.shelves![0]}</span>}</div>
    </button>
  );
}
function StatCard({ value, label, icon, onClick, destination = 'charts' }: {
  value: string; label: string; icon: ReactNode; onClick?:()=>void; destination?: 'charts'|'library'
}) {
  const actionText=destination==='library'?'Open library':'View charts';
  const inside=<><div className="stat-top">{icon}</div><strong>{value}</strong><span>{label}</span>{onClick&&<span className="gv-stat-view-hint">{actionText} <ArrowRight size={13}/></span>}</>;
  return onClick
    ? <button type="button" className="stat-card gv-stat-card-link" onClick={onClick} aria-label={label+': '+value+'. '+actionText+'.'}>{inside}</button>
    : <div className="stat-card">{inside}</div>;
}
function GameForm({ initial, onClose, onSave }: {
  initial: Game | null; onClose: () => void; onSave: (value: GameInput) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<GameInput>(() => initial ? {
    title: initial.title, year: initial.year, platform: initial.platform,
    availablePlatforms: initial.availablePlatforms ?? '', genres: initial.genres,
    shelves: initial.shelves ?? [],
    coverUrl: initial.coverUrl, description: initial.description,
    released: initial.released ?? '', developers: initial.developers ?? '', publishers: initial.publishers ?? '',
    catalogId: initial.catalogId, catalogUrl: initial.catalogUrl,
    catalogSource: initial.catalogSource, screenshots: initial.screenshots ?? [],
    status: initial.status, ownership: initial.ownership,
    rating: initial.rating, hours: initial.hours, notes: initial.notes,
    completedAt: initial.completedAt, priceTarget: initial.priceTarget, favourite: initial.favourite, dlcs: initial.dlcs ?? [],
    playthroughs: initial.playthroughs ?? [], journal: initial.journal ?? [],
  } : { ...emptyGame });
  const [working, setWorking] = useState(false);
  const [shelfText,setShelfText] = useState(()=>(initial?.shelves??[]).join(', '));
  const set = <K extends keyof GameInput>(key: K, value: GameInput[K]) => setDraft(d => ({ ...d, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setWorking(true);
    try { if (await onSave({ ...draft, title: draft.title.trim(), shelves:parseShelves(shelfText) })) onClose(); }
    finally { setWorking(false); }
  };
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal edit-modal" role="dialog" aria-modal="true" aria-label={initial ? 'Edit game' : 'Add game'}>
        <header className="modal-heading"><div><span className="eyebrow">GAME RECORD</span><h2>{initial ? 'Edit game' : 'Add a game'}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20}/></button></header>
        <form onSubmit={submit} className="editor-form">
          <div className="form-grid">
            <label className="field span-2">Game title <input required maxLength={160} placeholder="e.g. Kingdom Come: Deliverance" value={draft.title} onChange={e => set('title', e.target.value)}/></label>
            <label className="field">Your platform <input maxLength={60} placeholder="PS5, PC, Switch…" value={draft.platform} onChange={e => set('platform', e.target.value)}/><span className="field-help">Where you personally play or own the game. RAWG availability is listed separately.</span></label>
            <label className="field">Release year <input type="number" min="1950" max="2200" placeholder="Optional" value={draft.year ?? ''} onChange={e => set('year', e.target.value ? Number(e.target.value) : null)}/></label>
            <label className="field">Full release date (optional) <input type="date" value={draft.released??''} onChange={e=>set('released',e.target.value)}/></label>
            <label className="field">Developer <input maxLength={400} value={draft.developers??''} onChange={e=>set('developers',e.target.value)} placeholder="Studio name"/></label>
            <label className="field">Publisher <input maxLength={400} value={draft.publishers??''} onChange={e=>set('publishers',e.target.value)} placeholder="Publisher name"/></label>
            <label className="field">Status <select value={draft.status} onChange={e => { const status = e.target.value as GameStatus; setDraft(d => ({ ...d, status, ownership: status === 'wishlist' && d.ownership === 'digital' ? 'not-owned' : d.ownership })); }}>{STATUSES.map(s => <option value={s} key={s}>{statusLabel[s]}</option>)}</select></label>
            <label className="field">How you access it <select value={draft.ownership} onChange={e => set('ownership', e.target.value as Ownership)}>{OWNERSHIPS.map(s => <option value={s} key={s}>{ownershipLabel[s]}</option>)}</select></label>
            <label className="field">Your rating (0–10) <input type="number" min="0" max="10" step="0.5" placeholder="Unrated" value={draft.rating ?? ''} onChange={e => set('rating', e.target.value === '' ? null : Number(e.target.value))}/></label>
            <label className="field">Hours played <input type="number" min="0" max="1000000" step="0.1" value={draft.hours} onChange={e => set('hours', e.target.value === '' ? 0 : Number(e.target.value))}/></label>
            <label className="field span-2">Genres <input maxLength={240} placeholder="RPG, Open World, Adventure" value={draft.genres} onChange={e => set('genres', e.target.value)}/><span className="field-help">Separate genres with commas.</span></label>
            <label className="field span-2">Custom shelves <input maxLength={500} placeholder="Physical collection, Favourites, Co-op…" value={shelfText} onChange={e=>setShelfText(e.target.value)}/><span className="field-help">Optional. Separate shelf names with commas; up to 12 per game. Your shelves travel with your cloud backup.</span></label>
            <label className="field span-2">Cover image URL <input type="url" maxLength={2048} placeholder="https://... (real artwork only)" value={draft.coverUrl} onChange={e => set('coverUrl', e.target.value)}/><span className="field-help">Optional. Paste a direct image link; no AI-generated artwork.</span></label>
            <label className="field span-2">Gameplay screenshot URLs <textarea rows={3} placeholder={'https://example.com/screenshot-1.jpg\nhttps://example.com/screenshot-2.jpg'} value={(draft.screenshots ?? []).join('\n')} onChange={e => set('screenshots', e.target.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,40))}/><span className="field-help">One direct image URL per line. Use your own captures or images you have permission to link to. Images are linked, not uploaded.</span></label>
            <label className="field">Completion date <input type="date" value={draft.completedAt} onChange={e => set('completedAt', e.target.value)}/></label>
            <label className="field">Wishlist target (AUD) <input type="number" min="0" step="0.01" placeholder="Optional" value={draft.priceTarget ?? ''} onChange={e => set('priceTarget', e.target.value === '' ? null : Number(e.target.value))}/></label>
            <label className="field span-2">Your notes <textarea maxLength={15000} rows={4} placeholder="Your thoughts, progress, favourite moments..." value={draft.notes} onChange={e => set('notes', e.target.value)}/></label>
          </div>
          <label className="check-label"><input type="checkbox" checked={draft.favourite} onChange={e => set('favourite', e.target.checked)}/> Add to favourites</label>
          <footer className="form-footer"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit" disabled={working || !draft.title.trim()}>{working ? 'Saving…' : initial ? 'Save changes' : 'Add to library'} <Check size={16}/></button></footer>
        </form>
      </section>
    </div>
  );
}

export default function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState<Page>('home');
  const [statFocus,setStatFocus] = useState<StatFocus>('library');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [shelfFilter,setShelfFilter] = useState('all');
  const [platformFilter,setPlatformFilter] = useState('all');
  const [favouritesOnly,setFavouritesOnly] = useState(false);
  const [libraryView,setLibraryView] = useState<'grid'|'list'>(() => {
    try {return localStorage.getItem('gamevault:libraryView')==='list'?'list':'grid';}
    catch{return 'grid';}
  });
  const [bulkMode,setBulkMode] = useState(false);
  const [selectedBulk,setSelectedBulk] = useState<string[]>([]);
  const [newShelfName,setNewShelfName] = useState('');
  const [bulkStatus,setBulkStatus] = useState<GameStatus>('backlog');
  const [bulkBusy,setBulkBusy] = useState(false);
  const [editing, setEditing] = useState<Game | 'new' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [dlcParentId, setDlcParentId] = useState<string | null>(null);
  const [showCloud, setShowCloud] = useState(false);
  const [workerAddress, setWorkerAddress] = useState(readRawgProxy);
  const [workerInput, setWorkerInput] = useState(readRawgProxy);
  const [platformRefresh, setPlatformRefresh] = useState<{busy:boolean;done:number;total:number;updated:number;failed:number}>({busy:false,done:0,total:0,updated:0,failed:0});
  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const [seenRelease, setSeenRelease] = useState(() => {
    try { return localStorage.getItem('gamevault:seenRelease') || ''; }
    catch { return ''; }
  });
  const hasUnreadPatchNotes = seenRelease !== APP_VERSION;
  const openPatchNotes = () => {
    try { localStorage.setItem('gamevault:seenRelease', APP_VERSION); }
    catch { /* Private browsing may block storage; patch notes remain accessible. */ }
    setSeenRelease(APP_VERSION);
    setShowSettings(false);
    setShowPatchNotes(true);
  };
   const [isOnline, setIsOnline] = useState(navigator.onLine);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    loadGames().then(items => { if (active) setGames(items); }).catch(error => {
      if (active) setFatal(error instanceof Error ? error.message : 'Could not load your games.');
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const online = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', online); window.addEventListener('offline', online);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', online); };
  }, []);
  // iOS keyboards resize the *visual* viewport rather than always changing
  // 100vh. Keep bottom sheets inside the visible area so Save/Close remain reachable.
  useEffect(() => {
    const visual = window.visualViewport;
    if (!visual) return;
    const update = () => {
      document.documentElement.style.setProperty('--gv-visual-height', Math.max(100, Math.round(visual.height)) + 'px');
      document.documentElement.style.setProperty('--gv-visual-top', Math.round(visual.offsetTop) + 'px');
    };
    update();
    visual.addEventListener('resize', update);
    visual.addEventListener('scroll', update);
    return () => {
      visual.removeEventListener('resize', update);
      visual.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--gv-visual-height');
      document.documentElement.style.removeProperty('--gv-visual-top');
    };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setEditing(null); setSelectedId(null); setShowSettings(false); setShowPatchNotes(false); setShowCatalogue(false); setShowCloud(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const modalOpen=Boolean(editing || selectedId || showSettings || showPatchNotes || showCatalogue || showCloud);
  useEffect(() => {
    if(!modalOpen)return;
    // iOS Safari rubber-band scrolling can expose the app underneath overflow:hidden.
    const body=document.body;
    const top=window.scrollY;
    const previous={
      position:body.style.position,top:body.style.top,left:body.style.left,
      right:body.style.right,width:body.style.width,overflow:body.style.overflow
    };
    document.documentElement.classList.add('gv-modal-active');
    body.style.position='fixed';
    body.style.top=-top+'px';
    body.style.left='0';body.style.right='0';body.style.width='100%';
    body.style.overflow='hidden';
    return ()=>{
      document.documentElement.classList.remove('gv-modal-active');
      Object.assign(body.style,previous);
      window.scrollTo(0,top);
    };
  },[modalOpen]);

  const selected = games.find(g => g.id === selectedId) ?? null;
  const shelfNames = [...new Map(games.flatMap(g=>g.shelves??[])
    .map(s=>[s.toLocaleLowerCase(),s] as const)).values()].sort((a,b)=>a.localeCompare(b));
  const ownedPlatforms=[...new Set(games.map(g=>g.platform.trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  const collection = games.filter(g => g.status !== 'wishlist');
  const wishlist = games.filter(g => g.status === 'wishlist');
  const playing = collection.filter(g => g.status === 'playing').sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  const queue = games.filter(g => g.status === 'backlog' || g.status === 'paused').sort((a,b) => b.addedAt.localeCompare(a.addedAt));
  const completed = collection.filter(g => g.status === 'completed');
  const favourites = collection.filter(g => g.favourite);
  const totalHours = collection.reduce((sum,g) => sum + g.hours, 0);
   const ratings = collection.filter(g => g.rating !== null).map(g => g.rating!);
  const avgRating = ratings.length ? (ratings.reduce((a,b) => a+b, 0) / ratings.length).toFixed(1) : '—';
   const sortedLibrary = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const filtered = games.filter(g => {
      const matchesText = !lower || [g.title, g.genres, g.platform, g.notes].some(s => s.toLowerCase().includes(lower));
      const matchesStatus = statusFilter === 'all' || statusFilter === g.status;
      const matchesShelf = shelfFilter === 'all' || (g.shelves??[]).some(s=>s.toLocaleLowerCase()===shelfFilter.toLocaleLowerCase());
      const matchesPlatform = platformFilter==='all' || g.platform===platformFilter;
      return matchesText && matchesStatus && matchesShelf && matchesPlatform && (!favouritesOnly || g.favourite);
    });
    return [...filtered].sort((a,b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title);
      if (sort === 'hours') return b.hours - a.hours || a.title.localeCompare(b.title);
      if (sort === 'year') return (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [games, query, statusFilter, sort, shelfFilter, platformFilter, favouritesOnly]);


  function toggleBulk(id:string) {
    setSelectedBulk(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  }
  function selectVisibleBulk() {
    const visible=sortedLibrary.map(g=>g.id);
    setSelectedBulk(old=>[...new Set([...old,...visible])]);
  }
  function changeLibraryView(mode:'grid'|'list') {
    setLibraryView(mode);
    try{localStorage.setItem('gamevault:libraryView',mode);}catch{ /* keeps session preference */ }
  }
  async function applyBulkUpdate(action:'addShelf'|'removeShelf'|'status') {
    if(bulkBusy||!selectedBulk.length)return;
    const name=newShelfName.trim().replace(/\s+/g,' ').slice(0,40);
    if(action!=='status' && !name) {setNotice('Enter the shelf name to add or remove.');return;}
    const selectedSet=new Set(selectedBulk);
    const matched=games.filter(g=>selectedSet.has(g.id));
    const now=new Date().toISOString();
    const updates=matched.map(g=>{
      if(action==='status')return {...g,status:bulkStatus,updatedAt:now};
      const existing=g.shelves??[];
      const shelves=action==='addShelf'
        ? existing.some(s=>s.toLocaleLowerCase()===name.toLocaleLowerCase())?existing:[...existing,name].slice(0,12)
        : existing.filter(s=>s.toLocaleLowerCase()!==name.toLocaleLowerCase());
      return {...g,shelves,updatedAt:now};
    }).filter(g=>{
      const previous=games.find(original=>original.id===g.id);
      return previous && (action==='status'?previous.status!==g.status:JSON.stringify(previous.shelves??[])!==JSON.stringify(g.shelves??[]));
    });
    if(!updates.length){setNotice('Nothing changed for those games.');return;}
    setBulkBusy(true);
    try{
      await mergeGames(updates);
      for(const game of updates)await recordPending(game,game.id);
      const replacements=new Map(updates.map(g=>[g.id,g]));
      setGames(prev=>prev.map(g=>replacements.get(g.id)??g));
      setSelectedBulk([]);
      setBulkMode(false);
      setNotice('Updated '+updates.length+' game'+(updates.length===1?'':'s')+'. Changes will sync with your library.');
    }catch(e) {
      setGames(await loadGames().catch(()=>games));
      setNotice('Some changes may have saved locally; check Cloud Sync and retry: '+String(e));
    }finally{setBulkBusy(false);}
  }
  async function persist(input: GameInput): Promise<boolean> {
    const now = new Date().toISOString();
    const old = typeof editing === 'object' && editing !== null ? games.find(g => g.id === editing.id) : undefined;
    const game: Game = { ...input, id: old?.id ?? crypto.randomUUID(), addedAt: old?.addedAt ?? now, updatedAt: now };
    try {
      await saveGame(game);
      await recordPending(game, game.id);
      setGames(items => [...items.filter(g => g.id !== game.id), game]);
      setNotice(old ? 'Game updated.' : 'Game added to your collection.');
      return true;
    } catch (e) { setNotice('Could not save: ' + String(e)); return false; }
  }
  async function importCatalogue(entry: CatalogueGame, status: GameStatus): Promise<boolean> {
    const exists = games.find(g => (g.catalogId && g.catalogId === entry.id) ||
      (g.title.toLowerCase() === entry.title.toLowerCase() && g.year === entry.year));
    if (exists) {
      setNotice('That game is already in your library. Open it there to edit it.');
      return false;
    }
    const now = new Date().toISOString();
    const game: Game = {
      ...emptyGame,
      id: crypto.randomUUID(),
      title: entry.title.slice(0, 160), year: entry.year, platform: 'PS5',
      released: entry.released??'', developers: entry.developers??'', publishers: entry.publishers??'',
      availablePlatforms: entry.platform.slice(0,600),
      genres: entry.genres.slice(0, 240), coverUrl: entry.coverUrl,
      description: entry.description.slice(0, 5000),
      catalogId: entry.id, catalogUrl: entry.sourceUrl, catalogSource: entry.source,
      screenshots: entry.screenshots.filter(safeCover).slice(0, 40),
      status, ownership: 'not-owned', addedAt: now, updatedAt: now,
    };
    try {
      await saveGame(game);
      await recordPending(game, game.id);
      setGames(old => [...old, game]);
      setNotice('Imported ' + game.title + ' with PS5 as your default platform. You can change it in Edit game.');
      return true;
    } catch (error) {
      setNotice('Could not import: ' + String(error));
      return false;
    }
  }

  /** Games are added in one local DB transaction. DLCs are nested in their
   * parent, and only that parent is queued for cloud sync. */
  async function importManyCatalogue(entries: CatalogueGame[], status: GameStatus, parentId?: string): Promise<{added:number;skipped:number}> {
    if (!entries.length) return {added:0,skipped:0};
    const uniqueEntries=[...new Map(entries.map(item=>[item.id,item])).values()].slice(0,80);
    const now=new Date().toISOString();
    try {
      if(parentId){
        const parent=games.find(g=>g.id===parentId);
        if(!parent)throw Error('Parent game was not found in your library.');
        const original=parent.dlcs??[];
        const existing=new Set(original.flatMap(d=>[d.catalogId,d.title.toLowerCase()].filter(Boolean)));
        const additions:GameDlc[]=[];
        for(const entry of uniqueEntries){
          if(existing.has(entry.id)||existing.has(entry.title.toLowerCase())||original.length+additions.length>=80
            || entry.id===parent.catalogId || entry.title.toLowerCase()===parent.title.toLowerCase())continue;
          additions.push({id:crypto.randomUUID(),title:entry.title.slice(0,160),
            year:entry.year,coverUrl:safeCover(entry.coverUrl),catalogId:entry.id,
            catalogUrl:safeCover(entry.sourceUrl),owned:false,addedAt:now});
          existing.add(entry.id);existing.add(entry.title.toLowerCase());
        }
        if(additions.length){
          const changed:Game={...parent,dlcs:[...original,...additions],updatedAt:now};
          await saveGame(changed);
          await recordPending(changed,changed.id);
          setGames(items=>items.map(g=>g.id===changed.id?changed:g));
          setNotice('Added '+additions.length+' DLC/expansion'+(additions.length===1?'':'s')+' under '+parent.title+'.');
        }else setNotice('Those DLCs are already linked, or the parent reached its 80-DLC limit.');
        return {added:additions.length,skipped:uniqueEntries.length-additions.length};
      }
      const existing=new Set(games.flatMap(g=>[g.catalogId||'',g.title.toLowerCase()+'|'+(g.year??'')]));
      const additions:Game[]=[];
      for(const entry of uniqueEntries){
        const titleKey=entry.title.toLowerCase()+'|'+(entry.year??'');
        if(existing.has(entry.id)||existing.has(titleKey))continue;
        const game:Game={...emptyGame,id:crypto.randomUUID(),title:entry.title.slice(0,160),
          year:entry.year,platform:'PS5',availablePlatforms:entry.platform.slice(0,600),genres:entry.genres.slice(0,240),
          released:entry.released??'',developers:entry.developers??'',publishers:entry.publishers??'',
          coverUrl:safeCover(entry.coverUrl),description:entry.description.slice(0,5000),
          catalogId:entry.id,catalogUrl:safeCover(entry.sourceUrl),
          catalogSource:entry.source,screenshots:entry.screenshots.filter(safeCover).slice(0,40),
          status,ownership:'not-owned',addedAt:now,updatedAt:now,dlcs:[]};
        additions.push(game);existing.add(entry.id);existing.add(titleKey);
      }
      if(additions.length){
        await mergeGames(additions);
        for(const game of additions)await recordPending(game,game.id);
        setGames(items=>[...items,...additions]);
        setNotice('Added '+additions.length+' game'+(additions.length===1?'':'s')+' to '+(status==='wishlist'?'wishlist':'your library')+'.');
      }else setNotice('All selected games are already in your library.');
      return {added:additions.length,skipped:uniqueEntries.length-additions.length};
    }catch(error){
      setNotice('Import failed: '+String(error));
      throw error;
    }
  }
  function startDlcSearch(parent:Game){
    setSelectedId(null);
    setDlcParentId(parent.id);
    setShowCatalogue(true);
  }
  async function updateDlc(parent:Game,id:string,action:'toggle'|'remove'){
    const dlcs=(parent.dlcs??[])
      .filter(d=>action!=='remove'||d.id!==id)
      .map(d=>d.id===id&&action==='toggle'?{...d,owned:!d.owned}:d);
    await patchGame(parent,{dlcs});
  }


  // Explicit, safe backfill for old RAWG imports. Match by catalogue ID (never
  // fuzzy title alone), only write new supported-platform metadata, and never
  // replace a user's personally entered platform. Cap requests per click.
  async function refreshMissingPlatforms() {
    if(platformRefresh.busy)return;
    if(!workerAddress){
      setNotice('Connect your RAWG Worker in Settings first.');return;
    }
    const targets=games.filter(g=>/^rawg:\d+$/.test(g.catalogId??'')&&!g.availablePlatforms?.trim()).slice(0,25);
    if(!targets.length){
      setNotice('No RAWG games with missing supported-platform information found.');return;
    }
    setPlatformRefresh({busy:true,done:0,total:targets.length,updated:0,failed:0});
    let updated=0,failed=0;
    const successful:Game[]=[];
    for(const original of targets) {
      try {
        // Worker /games?search= is already deployed on all connected devices.
        const suggestions=await searchRawg(original.title,workerAddress,undefined,true,false);
        const exact=suggestions.find(g=>g.id===original.catalogId);
        const available=exact?.platform?.trim().slice(0,600);
        if(available){
          const changed:Game={...original,availablePlatforms:available};
          await saveGame(changed);
          await recordPending(changed,changed.id);
          successful.push(changed);
          updated++;
        }else failed++;
      }catch {failed++;}
      setPlatformRefresh({busy:true,done:updated+failed,total:targets.length,updated,failed});
    }
    if(successful.length) {
      const map=new Map(successful.map(g=>[g.id,g]));
      setGames(old=>old.map(g=>map.get(g.id)??g));
    }
    setPlatformRefresh({busy:false,done:targets.length,total:targets.length,updated,failed});
    setNotice('RAWG platform lookup: '+updated+' updated, '+failed+' not matched. Personal platform entries were not changed.');
  }

  function saveWorkerAddress() {
    try {
      const saved = saveRawgProxy(workerInput);
      setWorkerAddress(saved);
      setNotice(saved ? 'RAWG Worker address saved on this device.' : 'RAWG Worker connection cleared.');
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
  }
  async function patchGame(game: Game, change: Partial<Game>): Promise<boolean> {
    const next = { ...game, ...change, updatedAt: new Date().toISOString() };
    try {
      await saveGame(next);
      await recordPending(next, next.id);
      setGames(items => items.map(g => g.id === game.id ? next : g));
      setNotice('Game updated.');
      return true;
    } catch (e) {
      setNotice('Could not save: ' + String(e));
      return false;
    }
  }
  async function deleteGame(game: Game) {
    if (!window.confirm('Permanently remove "' + game.title + '" from this device? Export a backup first if needed.')) return;
    try {
      await removeGame(game.id); await recordPending(null, game.id); setGames(items => items.filter(g => g.id !== game.id));
      setSelectedId(null); setNotice('Game removed.');
    } catch(e) { setNotice('Could not delete: ' + String(e)); }
  }
  function exportBackup() {
    const backup = { app: 'GameVault', version: 1, exportedAt: new Date().toISOString(), games };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'gamevault-backup-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Backup downloaded. Keep it somewhere safe.');
  }
  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 15_000_000) { setNotice('Backup is too large to import.'); return; }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || (parsed as { app?: unknown }).app !== 'GameVault' ||
        !Array.isArray((parsed as { games?: unknown }).games)) throw new Error('Not a GameVault backup.');
      const originals = (parsed as { games: unknown[] }).games;
      if (originals.length > 30000) throw new Error('Too many records in backup.');
      const normalized = originals.map(normalizeGame).filter((g): g is Game => g !== null);
      if (!normalized.length) throw new Error('No valid games found.');
      const existing = new Set(games.map(g => g.id));
      const replacements = normalized.filter(g => existing.has(g.id)).length;
      const question = 'Import ' + normalized.length + ' games? ' + replacements + ' matching IDs will be updated; other existing games stay untouched.';
      if (!window.confirm(question)) return;
      await mergeGames(normalized);
      for (const game of normalized) await recordPending(game, game.id);
      setGames(await loadGames());
      setNotice('Imported ' + normalized.length + ' records. ' + (originals.length - normalized.length) + ' invalid records skipped.');
      setShowSettings(false);
    } catch(e) { setNotice('Import failed: ' + (e instanceof Error ? e.message : String(e))); }
  }
  function openPage(next: Page) { setPage(next); window.scrollTo({ top: 0, behavior: 'auto' }); }
  function openStatFocus(focus:StatFocus) {
    setStatFocus(focus);
    openPage('stats');
  }
  const action = <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus size={17}/> Add manually</button>;
  const searchAction = <button className="btn btn-primary" onClick={() => setShowCatalogue(true)}><Search size={17}/> Find game</button>;
  const renderCards = (items: Game[], limit?: number) => (
    <div className="game-grid">{(limit ? items.slice(0,limit) : items).map(g => <GameCard key={g.id} game={g} onClick={() => setSelectedId(g.id)}/>)}</div>
  );

  return (
    <div className="app-shell">
      <UpdateNotice/>
      <aside className="sidebar">
        <button className="brand" onClick={() => openPage('home')} aria-label="GameVault home"><span className="brand-symbol"><Gamepad2 size={23} strokeWidth={1.75}/></span><span>GAMEVAULT<span className="brand-dot">.</span></span></button>
        <div className="nav-section-title">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {NAV.map(item => { const Icon = item.icon; return <button key={item.id} className={'nav-item ' + (page === item.id ? 'active' : '')} onClick={() => openPage(item.id)}><Icon size={18}/><span>{item.label}</span>{item.id === 'wishlist' && wishlist.length > 0 && <small>{wishlist.length}</small>}</button>; })}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-callout"><div className="callout-icon"><ShieldCheck size={18}/></div><strong>Yours to keep.</strong><span>Your library lives on this device. Remember to back it up.</span><button onClick={() => setShowSettings(true)}>Manage data <ArrowRight size={14}/></button></div>
          <button className="nav-item" onClick={() => setShowCloud(true)}><Cloud size={18}/><span>Cloud sync</span></button>
          <button className="nav-item" onClick={openPatchNotes}><BookOpen size={18}/><span>Patch notes</span>{hasUnreadPatchNotes && <small className="notes-new">NEW</small>}</button>
          <button className="nav-item" onClick={() => setShowSettings(true)}><Settings2 size={18}/> Settings & backups</button>
          <div className="sidebar-version">GAMEVAULT / {APP_VERSION}</div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-brand" onClick={() => openPage('home')} aria-label="GameVault home"><Gamepad2 size={23}/></button><span className="breadcrumb">MY SPACE</span><span className="crumb-slash">/</span><strong>{NAV.find(n => n.id === page)?.label ?? 'More'}</strong></div>
          <div className="topbar-right">
            {!isOnline && <Pill>Offline</Pill>}
            <button className="cloud-shortcut" onClick={() => setShowCloud(true)} aria-label="Cloud sync"><Cloud size={18}/><span>Cloud sync</span></button>
            <button className="updates-button" onClick={openPatchNotes} aria-label={'Patch notes for GameVault ' + APP_VERSION + (hasUnreadPatchNotes ? ' - new updates' : '')}>
              <BookOpen size={17}/><span>What's new</span>{hasUnreadPatchNotes && <i className="updates-dot" aria-hidden="true"/>}
            </button>
            <button className="icon-btn settings-shortcut" onClick={() => setShowSettings(true)} aria-label="Settings and backup"><Settings2 size={19}/></button>
            <button className="icon-btn mobile-find" onClick={() => setShowCatalogue(true)} aria-label="Find a game" title="Find a game"><Search size={20}/></button>
            <div className="topbar-add">{searchAction}</div>
          </div>
        </header>
        <div className="page-content">
          {fatal && <div className="alert error"><strong>Local storage is unavailable.</strong> {fatal} Your changes cannot be saved until this is fixed.</div>}
          {notice && <div className="alert" role="status"><span>{notice}</span><button className="icon-btn" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={16}/></button></div>}
          {!ready ? <div className="loading"><RefreshCw size={24} className="spin"/> Loading your library…</div> : (
            <>
              {page === 'home' && <>
                <section className="hero">
                  <div className="hero-copy"><div className="eyebrow eyebrow-light"><span className="live-dot"/> YOUR PERSONAL GAMING HQ</div><h1>Your games.<br/><em>All in one place.</em></h1><p>Track the worlds you love. Build a library worth exploring.</p><div className="hero-actions">{searchAction}<button className="btn btn-outline-light" onClick={() => setEditing('new')}>Add manually <Plus size={17}/></button></div></div>
                  <div className="hero-illustration" aria-hidden="true">
                    {(playing[0]??favourites[0]??collection[0])?.coverUrl&&safeCover((playing[0]??favourites[0]??collection[0]).coverUrl)
                      ? <img className="gv-hero-art" src={(playing[0]??favourites[0]??collection[0]).coverUrl} alt=""/>
                      : <><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><Gamepad2 size={134} strokeWidth={0.85}/></>}
                  </div>
                </section>
                <div className="stat-grid">
                  <StatCard icon={<Library size={18}/>} value={String(collection.length)} label="Games in library" destination="library" onClick={()=>openPage('library')}/>
                  <StatCard icon={<Gamepad2 size={18}/>} value={String(playing.length)} label="Currently playing" onClick={()=>openStatFocus('playing')}/>
                  <StatCard icon={<Check size={18}/>} value={String(completed.length)} label="Completed" onClick={()=>openStatFocus('completed')}/>
                  <StatCard icon={<Clock3 size={18}/>} value={fmtHours(totalHours) + 'h'} label="Hours logged" onClick={()=>openStatFocus('hours')}/>
                </div>
                <section className="section-block"><div className="section-title"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Currently playing</h2></div><button className="text-link" onClick={() => openPage('library')}>View library <ArrowRight size={16}/></button></div>
                  {playing.length ? renderCards(playing, 6) : <Empty title="Nothing in progress yet" description="Find a game and set its status to Playing. It'll show up here." action={<button className="btn btn-subtle" onClick={() => setShowCatalogue(true)}><Search size={16}/> Find game</button>}/>}
                </section>
                <section className="section-block"><div className="section-title"><div><span className="eyebrow">ON DECK</span><h2>From your backlog</h2></div><button className="text-link" onClick={() => openPage('discover')}>What should I play? <ArrowRight size={16}/></button></div>
                  {queue.length ? renderCards(queue, 6) : <Empty icon={<LayoutGrid size={28}/>} title="A clean slate" description="Games marked Backlog or On hold appear here. Nothing is added automatically."/>}
                </section>
              </>}
              {page === 'library' && <>
                <div className="page-heading"><div><span className="eyebrow">ALL YOUR GAMES</span><h1>Your library<span className="heading-count">{games.length}</span></h1><p>Every adventure, all in one place.</p></div><div className="library-actionrow">{searchAction}{action}</div></div>
                <div className="gv-shelf-row" aria-label="Library shelves">
                  <button className={shelfFilter==='all'?'active':''} onClick={()=>setShelfFilter('all')} aria-pressed={shelfFilter==='all'}>All games <span>{games.length}</span></button>
                  {shelfNames.map(name=><button key={name} aria-pressed={shelfFilter===name} className={shelfFilter.toLocaleLowerCase()===name.toLocaleLowerCase()?'active':''}
                    onClick={()=>setShelfFilter(name)}>{name} <span>{games.filter(g=>(g.shelves??[]).some(s=>s.toLocaleLowerCase()===name.toLocaleLowerCase())).length}</span></button>)}
                </div>
                <div className="filterbar gv-filterbar">
                  <div className="search-field"><Search size={18}/><input aria-label="Search games" placeholder="Search titles, genres, notes…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={16}/></button>}</div>
                  <label className="select-wrap"><Filter size={16}/><select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}</select><ChevronDown size={15}/></label>
                  <label className="select-wrap"><Gamepad2 size={15}/><select aria-label="Filter by owned platform" value={platformFilter} onChange={e=>setPlatformFilter(e.target.value)}><option value="all">All platforms</option>{ownedPlatforms.map(p=><option key={p} value={p}>{p}</option>)}</select><ChevronDown size={15}/></label>
                  <label className="select-wrap"><SlidersHorizontal size={16}/><select aria-label="Sort games" value={sort} onChange={e => setSort(e.target.value as Sort)}><option value="recent">Recently updated</option><option value="title">Title A–Z</option><option value="rating">Top rated</option><option value="hours">Most played</option><option value="year">Newest release</option></select><ChevronDown size={15}/></label>
                </div>
                <div className="gv-library-toolbar">
                  <button className={'gv-favourites-filter'+(favouritesOnly?' active':'')} aria-pressed={favouritesOnly} onClick={()=>setFavouritesOnly(v=>!v)}><Heart size={16} fill={favouritesOnly?'currentColor':'none'}/> Favourites</button>
                  <span className="gv-library-counter">{sortedLibrary.length} {sortedLibrary.length===1?'game':'games'} displayed</span>
                  <div className="gv-library-tools">
                    <div className="gv-view-toggle" role="group" aria-label="Library layout">
                      <button aria-label="Grid view" aria-pressed={libraryView==='grid'} className={libraryView==='grid'?'active':''} onClick={()=>changeLibraryView('grid')}><LayoutGrid size={17}/></button>
                      <button aria-label="List view" aria-pressed={libraryView==='list'} className={libraryView==='list'?'active':''} onClick={()=>changeLibraryView('list')}><List size={17}/></button>
                    </div>
                    <button className={'gv-manage-button'+(bulkMode?' active':'')} aria-pressed={bulkMode} onClick={()=>{setBulkMode(v=>!v);setSelectedBulk([]);}}>
                      <Check size={15}/>{bulkMode?'Finish selecting':'Manage games'}
                    </button>
                  </div>
                </div>
                {bulkMode&&<div className="gv-bulk-toolbar">
                  <div className="gv-bulk-head"><strong>{selectedBulk.length} selected</strong><button onClick={selectVisibleBulk}>Select visible</button><button onClick={()=>setSelectedBulk([])}>Clear</button></div>
                  <div className="gv-bulk-controls">
                    <label>Shelf name <input aria-label="Shelf name for bulk changes" placeholder="e.g. Co-op nights" value={newShelfName} maxLength={40} onChange={e=>setNewShelfName(e.target.value)}/></label>
                    <button disabled={bulkBusy||!selectedBulk.length} onClick={()=>void applyBulkUpdate('addShelf')}>Add to shelf</button>
                    <button disabled={bulkBusy||!selectedBulk.length} onClick={()=>void applyBulkUpdate('removeShelf')}>Remove from shelf</button>
                    <label>Status <select aria-label="Bulk status" value={bulkStatus} onChange={e=>setBulkStatus(e.target.value as GameStatus)}>
                      {STATUSES.map(value=><option value={value} key={value}>{statusLabel[value]}</option>)}
                    </select></label>
                    <button disabled={bulkBusy||!selectedBulk.length} onClick={()=>void applyBulkUpdate('status')}>{bulkBusy?'Saving…':'Set status'}</button>
                  </div>
                  <p>Shelves are labels stored with each game, so they sync and export with your library. Bulk updates won't delete games or change their ratings.</p>
                </div>}
 
                {games.some(g=>/^rawg:\d+$/.test(g.catalogId??'')&&!g.availablePlatforms?.trim())&&
                  <div className="platform-refresh-banner">
                    <div><strong>Missing supported-platform information?</strong><p>Older RAWG imports didn't save platform availability. Refresh up to 25 per batch without changing your personal platform.</p>
                      {platformRefresh.busy&&<small>Checked {platformRefresh.done} of {platformRefresh.total} · {platformRefresh.updated} updated</small>}
                    </div>
                    <button className="btn btn-subtle" disabled={platformRefresh.busy||!workerAddress} onClick={()=>void refreshMissingPlatforms()}>
                      <RefreshCw size={16} className={platformRefresh.busy?'spin':''}/>{platformRefresh.busy?'Checking…':'Fill missing platforms'}
                    </button>
                  </div>}
                {sortedLibrary.length ?
                  <div className={'game-grid gv-library-results'+(libraryView==='list'?' gv-library-list':'')}>
                    {sortedLibrary.map(g=><GameCard key={g.id} game={g} selecting={bulkMode}
                      checked={selectedBulk.includes(g.id)}
                      onClick={()=>bulkMode?toggleBulk(g.id):setSelectedId(g.id)}/>)}
                  </div> : games.length ?
                  <Empty icon={<Search size={28}/>} title="No matching games" description="Try adjusting the shelf, platform or search filters."
                    action={<button className="btn btn-subtle" onClick={()=>{setQuery('');setStatusFilter('all');setShelfFilter('all');setPlatformFilter('all');setFavouritesOnly(false);}}>Clear filters</button>}/> :
                  <Empty title="Your library starts here" description="Find your first game and make GameVault your own."
                    action={<button className="btn btn-primary" onClick={()=>setShowCatalogue(true)}><Search size={17}/> Find first game</button>}/>}
                {shelfNames.length===0&&games.length>0&&!bulkMode&&<p className="gv-shelf-hint">Want custom shelves? Select <strong>Manage games</strong> to organise several games at once, or add shelf names when editing a game.</p>}
              </>}
              {page === 'discover' && <>
                <div className="page-heading"><div><span className="eyebrow">YOUR NEXT ADVENTURE</span><h1>Discover</h1><p>Find your next game from your own backlog, with recommendations that explain why.</p></div></div>
                <DiscoveryRecommendations
                  games={games}
                  onOpen={setSelectedId}
                  onStart={game=>patchGame(game,{status:'playing'})}
                />
                {favourites.length>0&&<section className="section-block">
                  <div className="section-title"><div><span className="eyebrow">YOUR HIGHLIGHTS</span><h2>Your favourites</h2></div></div>
                  {renderCards(favourites,6)}
                </section>}
              </>}
              {page === 'wishlist' && <>
                <div className="page-heading"><div><span className="eyebrow">COMING UP</span><h1>Wishlist<span className="heading-count">{wishlist.length}</span></h1><p>Games you want, without losing track of what they cost.</p></div><div className="library-actionrow">{searchAction}{action}</div></div>
                {wishlist.length ? <>{renderCards(wishlist)}<div className="muted-note"><Heart size={17}/> Prices are targets you enter yourself. This version doesn't pretend to show live PS Store prices.</div></> : <Empty icon={<Heart size={28}/>} title="Nothing on your wishlist" description="Add a game with its status set to Wishlist. Set an AUD target price if you like." action={<button className="btn btn-primary" onClick={() => setShowCatalogue(true)}><Search size={17}/> Find wanted game</button>}/>}
              </>}
              {page === 'stats' && <>
                <div className="page-heading"><div><span className="eyebrow">YOUR PLAY HISTORY</span><h1>Statistics</h1><p>Numbers calculated from the games you've logged.</p></div></div>
                <StatDetailPanel games={games} focus={statFocus} onFocus={setStatFocus} onOpen={setSelectedId}/>
                <div className="stat-grid">
                  <StatCard icon={<Library size={18}/>} value={String(collection.length)} label="Library games"/>
                  <StatCard icon={<Clock3 size={18}/>} value={fmtHours(totalHours) + 'h'} label="Total playtime"/>
                  <StatCard icon={<Check size={18}/>} value={String(completed.length)} label="Games completed"/>
                  <StatCard icon={<Star size={18}/>} value={avgRating} label="Average rating"/>
                </div>
                <div className="analytics-grid">
                  <section className="panel"><div className="section-title small"><div><span className="eyebrow">PROGRESS</span><h2>Library breakdown</h2></div></div>
                    {STATUSES.filter(s=>s !== 'wishlist').map(s => { const count = collection.filter(g => g.status === s).length; const percent = collection.length ? Math.round(100 * count / collection.length) : 0; return <div className="bar-row" key={s}><div className="bar-label"><span>{statusLabel[s]}</span><strong>{count}</strong></div><div className="bar-track"><div className="bar-fill" style={{width: percent + '%'}}/></div></div>; })}
                  </section>
                  <section className="panel"><div className="section-title small"><div><span className="eyebrow">HARDWARE</span><h2>Platform breakdown</h2></div></div>
                    {Object.entries(collection.reduce<Record<string,number>>((acc,g)=> { const key = g.platform.trim() || 'Unspecified'; acc[key] = (acc[key] || 0) + 1; return acc; },{})).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([name,count])=> <div className="bar-row" key={name}><div className="bar-label"><span>{name}</span><strong>{count}</strong></div><div className="bar-track"><div className="bar-fill blue" style={{width:(collection.length ? 100*count/collection.length:0)+'%'}}/></div></div>)}
                    {!collection.length && <p className="empty-inline">Your platform breakdown appears when you add games.</p>}
                  </section>
                </div>
                <InsightsPanel games={games}/>
              </>}
              {page === 'more' && <>
                <div className="page-heading gv-more-heading">
                  <div><span className="eyebrow">YOUR GAMEVAULT</span><h1>More</h1><p>Everything you need to manage your collection, in one place.</p></div>
                </div>
                <div className="gv-more-actions" aria-label="GameVault actions">
                  <div className="gv-more-section-label">YOUR GAMES</div>
                  <button type="button" className="gv-more-action" onClick={() => setShowCatalogue(true)}>
                    <span className="gv-more-icon"><Search size={22}/></span>
                    <span className="gv-more-copy"><strong>Find a game</strong><small>Search the catalogue and add games or expansions</small></span><ArrowRight size={20}/>
                  </button>
                  <button type="button" className="gv-more-action" onClick={() => setEditing('new')}>
                    <span className="gv-more-icon"><Plus size={22}/></span>
                    <span className="gv-more-copy"><strong>Add manually</strong><small>Create your own game record with PS5 as the default platform</small></span><ArrowRight size={20}/>
                  </button>
                  <div className="gv-more-section-label">YOUR ACCOUNT & SETTINGS</div>
                  <button type="button" className="gv-more-action" onClick={() => setShowCloud(true)}>
                    <span className="gv-more-icon"><Cloud size={22}/></span>
                    <span className="gv-more-copy"><strong>Cloud sync</strong><small>Sync your saved games across devices</small></span><ArrowRight size={20}/>
                  </button>
                  <button type="button" className="gv-more-action" onClick={() => setShowSettings(true)}>
                    <span className="gv-more-icon"><Settings2 size={22}/></span>
                    <span className="gv-more-copy"><strong>Settings & backups</strong><small>RAWG connection, export and import your library</small></span><ArrowRight size={20}/>
                  </button>
                  <button type="button" className="gv-more-action" onClick={openPatchNotes}>
                    <span className="gv-more-icon"><BookOpen size={22}/></span>
                    <span className="gv-more-copy"><strong>What's new {hasUnreadPatchNotes && <span className="gv-more-unread">New</span>}</strong><small>Update history and release notes</small></span><ArrowRight size={20}/>
                  </button>
                </div>
                <div className="gv-more-info">
                  <span><Gamepad2 size={17}/> GameVault v{APP_VERSION}</span>
                  <span>{isOnline ? 'Online' : 'Offline'} · {workerAddress ? 'RAWG connected on this device' : 'RAWG not connected'}</span>
                </div>
              </>}
            </>
          )}
        </div>
        <footer className="site-footer"><span>GAMEVAULT © 2026 · YOUR LIBRARY, YOUR RULES</span><div className="footer-links"><button onClick={openPatchNotes}>v{APP_VERSION} · Patch notes <BookOpen size={14}/></button><button onClick={() => setShowSettings(true)}>Local data & backups <ArrowDownToLine size={14}/></button></div></footer>
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">{MOBILE_NAV.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => openPage(item.id)} aria-current={page === item.id ? 'page' : undefined} aria-label={item.label}><Icon size={21}/><span>{item.label === 'Statistics' ? 'Stats' : item.label}</span></button>; })}</nav>
      {selected && <GameProfile key={selected.id}
        game={selected}
        proxy={workerAddress}
        onClose={()=>setSelectedId(null)}
        onEdit={()=>{setEditing(selected);setSelectedId(null);}}
        onToggleFavourite={()=>patchGame(selected,{favourite:!selected.favourite})}
        onDelete={()=>void deleteGame(selected)}
        onUpdate={changes=>patchGame(selected,changes)}
        onDlcSearch={()=>startDlcSearch(selected)}
        onDlcAttach={entries=>importManyCatalogue(entries,'backlog',selected.id)}
        onDlcModify={(id,action)=>updateDlc(selected,id,action)}
      />}
      {editing && <GameForm key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={persist}/>}
      <CloudPanel visible={showCloud} onClose={() => setShowCloud(false)} onRemote={games=>setGames(games)} onNotify={message=>setNotice(message)}/>
      {showCatalogue && <CatalogueSearch
        onClose={() => {setShowCatalogue(false);setDlcParentId(null);}}
        onImport={importCatalogue}
        onImportMany={importManyCatalogue}
        library={games}
        initialParentId={dlcParentId}
        onOpenSettings={() => {setShowCatalogue(false);setDlcParentId(null);setShowSettings(true);}}
      />}
      {showPatchNotes && <PatchNotes onClose={() => setShowPatchNotes(false)}/>}
      {showSettings && <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) setShowSettings(false); }}>
        <section className="modal settings-modal" role="dialog" aria-modal="true" aria-label="Settings and backups"><header className="modal-heading"><div><span className="eyebrow">PREFERENCES</span><h2>Settings & backups</h2></div><button className="icon-btn" onClick={() => setShowSettings(false)} aria-label="Close"><X size={20}/></button></header>
          <div className="settings-content"><div className="settings-callout"><ShieldCheck size={22}/><div><strong>Your data belongs to you.</strong><p>Saved on this browser using IndexedDB. GitHub Pages does not sync devices. Export regularly; browser data can be cleared.</p></div></div>
            <div className="settings-catalogue">
              <span className="eyebrow">GAME CATALOGUE</span>
              <h3>Optional RAWG connection</h3>
              <p>Wikipedia search works without setup. To use RAWG's dedicated game catalogue and screenshot API, connect your own HTTPS Cloudflare Worker. The RAWG API key stays in the Worker, not in GameVault.</p>
              <div className="settings-worker"><input type="url" aria-label="RAWG Worker HTTPS URL" placeholder="https://your-worker.workers.dev" value={workerInput} onChange={e=>setWorkerInput(e.target.value)} /><button className="btn btn-subtle" onClick={saveWorkerAddress}>Save</button></div>
              <small>{workerAddress ? 'Worker configured on this device.' : 'No Worker connected. Keyless Wikipedia search is still available.'}</small>
              <a href="https://github.com/258t6fr4ds-create/backloggd-ripoff-lol/blob/main/CATALOG_SETUP.md" target="_blank" rel="noopener noreferrer">Read browser-only setup instructions ↗</a>
            </div>
            <button className="setting-action" onClick={() => {setShowSettings(false);setShowCloud(true);}}><span className="setting-icon"><Cloud size={20}/></span><span><strong>Cloud sync</strong><small>Sync your game library with another device using Supabase</small></span><ArrowRight size={18}/></button>
            <button className="setting-action" onClick={openPatchNotes}><span className="setting-icon"><BookOpen size={20}/></span><span><strong>What's new in GameVault</strong><small>Patch notes, improvements and fixes · v{APP_VERSION}</small></span><ArrowRight size={18}/></button>
            <button className="setting-action" onClick={exportBackup}><span className="setting-icon"><Download size={20}/></span><span><strong>Export your library</strong><small>Download all game records as a JSON backup</small></span><ArrowRight size={18}/></button>
            <button className="setting-action" onClick={() => importRef.current?.click()}><span className="setting-icon"><Upload size={20}/></span><span><strong>Import a backup</strong><small>Merge game records from another device or browser</small></span><ArrowRight size={18}/></button>
            <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importBackup}/>
            <div className="settings-fineprint"><strong>About artwork:</strong> Cover URLs reference external images, which might disappear. This JSON backup saves links, not the images themselves. A media-inclusive export is planned.</div>
          </div><footer className="modal-version">GameVault v{APP_VERSION} · Free, open source, no account required</footer>
        </section>
      </div>}
    </div>
  );
}
