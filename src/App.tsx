import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BarChart3, BookOpen, Check,
  ChevronDown, Clock3, Compass, Download, Filter, Gamepad2, Heart,
  Home, LayoutGrid, Library, Menu, MoreHorizontal, Pencil, Plus,
  RefreshCw, Search, Settings2, ShieldCheck, Shuffle, SlidersHorizontal,
  Sparkles, Star, Trash2, Upload, X
} from 'lucide-react';
import { loadGames, mergeGames, removeGame, saveGame } from './db';
import {
  emptyGame, normalizeGame, ownershipLabel, OWNERSHIPS,
  safeCover, statusLabel, STATUSES
} from './types';
import type { Game, GameInput, GameStatus, Ownership } from './types';
import { APP_VERSION } from './releaseNotes';
import CatalogueSearch from './CatalogueSearch';
import type { CatalogueGame } from './catalog';
import { readRawgProxy, saveRawgProxy } from './catalog';
import PatchNotes from './PatchNotes';

type Page = 'home' | 'library' | 'discover' | 'wishlist' | 'stats';
type Sort = 'recent' | 'title' | 'rating' | 'hours' | 'year';
const NAV = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
] as const;

const dateLabel = (iso: string) => {
  if (!iso) return 'Not recorded';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtHours = (n: number) => new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 }).format(n);
const currency = (n: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 }).format(n);

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
function GameCard({ game, onClick }: { game: Game; onClick: () => void }) {
  return (
    <button className="game-card" onClick={onClick} aria-label={'Open ' + game.title}>
      <div className="poster">
        <Cover game={game}/>
        {game.favourite && <span className="poster-favourite" title="Favourite"><Heart size={15} fill="currentColor"/></span>}
      </div>
      <div className="card-meta"><h3 title={game.title}>{game.title}</h3><p>{game.year || 'Year unknown'} <span>·</span> {game.platform || 'Platform unknown'}</p></div>
      <div className="card-bottom"><Pill tone={'status-' + game.status}>{statusLabel[game.status]}</Pill>{game.rating !== null && <span className="rating-small"><Star size={13} fill="currentColor"/> {game.rating}/10</span>}</div>
    </button>
  );
}
function StatCard({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  return <div className="stat-card"><div className="stat-top">{icon}</div><strong>{value}</strong><span>{label}</span></div>;
}
function GameForm({ initial, onClose, onSave }: {
  initial: Game | null; onClose: () => void; onSave: (value: GameInput) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<GameInput>(() => initial ? {
    title: initial.title, year: initial.year, platform: initial.platform, genres: initial.genres,
    coverUrl: initial.coverUrl, description: initial.description,
    catalogId: initial.catalogId, catalogUrl: initial.catalogUrl,
    catalogSource: initial.catalogSource, screenshots: initial.screenshots ?? [],
    status: initial.status, ownership: initial.ownership,
    rating: initial.rating, hours: initial.hours, notes: initial.notes,
    completedAt: initial.completedAt, priceTarget: initial.priceTarget, favourite: initial.favourite,
  } : { ...emptyGame });
  const [working, setWorking] = useState(false);
  const set = <K extends keyof GameInput>(key: K, value: GameInput[K]) => setDraft(d => ({ ...d, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setWorking(true);
    try { if (await onSave({ ...draft, title: draft.title.trim() })) onClose(); }
    finally { setWorking(false); }
  };
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal edit-modal" role="dialog" aria-modal="true" aria-label={initial ? 'Edit game' : 'Add game'}>
        <header className="modal-heading"><div><span className="eyebrow">GAME RECORD</span><h2>{initial ? 'Edit game' : 'Add a game'}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20}/></button></header>
        <form onSubmit={submit} className="editor-form">
          <div className="form-grid">
            <label className="field span-2">Game title <input required maxLength={160} autoFocus placeholder="e.g. Kingdom Come: Deliverance" value={draft.title} onChange={e => set('title', e.target.value)}/></label>
            <label className="field">Platform <input maxLength={60} placeholder="PS5, PC, Switch..." value={draft.platform} onChange={e => set('platform', e.target.value)}/></label>
            <label className="field">Release year <input type="number" min="1950" max="2200" placeholder="Optional" value={draft.year ?? ''} onChange={e => set('year', e.target.value ? Number(e.target.value) : null)}/></label>
            <label className="field">Status <select value={draft.status} onChange={e => { const status = e.target.value as GameStatus; setDraft(d => ({ ...d, status, ownership: status === 'wishlist' && d.ownership === 'digital' ? 'not-owned' : d.ownership })); }}>{STATUSES.map(s => <option value={s} key={s}>{statusLabel[s]}</option>)}</select></label>
            <label className="field">How you access it <select value={draft.ownership} onChange={e => set('ownership', e.target.value as Ownership)}>{OWNERSHIPS.map(s => <option value={s} key={s}>{ownershipLabel[s]}</option>)}</select></label>
            <label className="field">Your rating (0–10) <input type="number" min="0" max="10" step="0.5" placeholder="Unrated" value={draft.rating ?? ''} onChange={e => set('rating', e.target.value === '' ? null : Number(e.target.value))}/></label>
            <label className="field">Hours played <input type="number" min="0" max="1000000" step="0.1" value={draft.hours} onChange={e => set('hours', e.target.value === '' ? 0 : Number(e.target.value))}/></label>
            <label className="field span-2">Genres <input maxLength={240} placeholder="RPG, Open World, Adventure" value={draft.genres} onChange={e => set('genres', e.target.value)}/><span className="field-help">Separate genres with commas.</span></label>
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
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [editing, setEditing] = useState<Game | 'new' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [workerAddress, setWorkerAddress] = useState(readRawgProxy);
  const [workerInput, setWorkerInput] = useState(readRawgProxy);
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
  const [pickIndex, setPickIndex] = useState(0);
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
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setEditing(null); setSelectedId(null); setShowSettings(false); setShowPatchNotes(false); setShowCatalogue(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    document.body.style.overflow = editing || selectedId || showSettings || showPatchNotes || showCatalogue ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [editing, selectedId, showSettings, showPatchNotes, showCatalogue]);

  const selected = games.find(g => g.id === selectedId) ?? null;
  const collection = games.filter(g => g.status !== 'wishlist');
  const wishlist = games.filter(g => g.status === 'wishlist');
  const playing = collection.filter(g => g.status === 'playing').sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  const queue = games.filter(g => g.status === 'backlog' || g.status === 'paused').sort((a,b) => b.addedAt.localeCompare(a.addedAt));
  const completed = collection.filter(g => g.status === 'completed');
  const favourites = collection.filter(g => g.favourite);
  const totalHours = collection.reduce((sum,g) => sum + g.hours, 0);
  const ratings = collection.filter(g => g.rating !== null).map(g => g.rating!);
  const avgRating = ratings.length ? (ratings.reduce((a,b) => a+b, 0) / ratings.length).toFixed(1) : '—';
  const suggested = queue.length ? queue[pickIndex % queue.length] : null;
  const sortedLibrary = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const filtered = games.filter(g => {
      const matchesText = !lower || [g.title, g.genres, g.platform, g.notes].some(s => s.toLowerCase().includes(lower));
      const matchesStatus = statusFilter === 'all' || statusFilter === g.status;
      return matchesText && matchesStatus;
    });
    return [...filtered].sort((a,b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title);
      if (sort === 'hours') return b.hours - a.hours || a.title.localeCompare(b.title);
      if (sort === 'year') return (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [games, query, statusFilter, sort]);

  async function persist(input: GameInput): Promise<boolean> {
    const now = new Date().toISOString();
    const old = typeof editing === 'object' && editing !== null ? games.find(g => g.id === editing.id) : undefined;
    const game: Game = { ...input, id: old?.id ?? crypto.randomUUID(), addedAt: old?.addedAt ?? now, updatedAt: now };
    try {
      await saveGame(game);
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
      title: entry.title.slice(0, 160), year: entry.year, platform: '',
      genres: entry.genres.slice(0, 240), coverUrl: entry.coverUrl,
      description: entry.description.slice(0, 5000),
      catalogId: entry.id, catalogUrl: entry.sourceUrl, catalogSource: entry.source,
      screenshots: entry.screenshots.filter(safeCover).slice(0, 40),
      status, ownership: 'not-owned', addedAt: now, updatedAt: now,
    };
    try {
      await saveGame(game);
      setGames(old => [...old, game]);
      setNotice('Imported ' + game.title + '. Edit it to set your platform and ownership.');
      return true;
    } catch (error) {
      setNotice('Could not import: ' + String(error));
      return false;
    }
  }
  function saveWorkerAddress() {
    try {
      const saved = saveRawgProxy(workerInput);
      setWorkerAddress(saved);
      setNotice(saved ? 'RAWG Worker address saved on this device.' : 'RAWG Worker connection cleared.');
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
  }
  async function patchGame(game: Game, change: Partial<Game>) {
    const next = { ...game, ...change, updatedAt: new Date().toISOString() };
    try { await saveGame(next); setGames(items => items.map(g => g.id === game.id ? next : g)); setNotice('Game updated.'); }
    catch(e) { setNotice('Could not save: ' + String(e)); }
  }
  async function deleteGame(game: Game) {
    if (!window.confirm('Permanently remove "' + game.title + '" from this device? Export a backup first if needed.')) return;
    try {
      await removeGame(game.id); setGames(items => items.filter(g => g.id !== game.id));
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
      setGames(await loadGames());
      setNotice('Imported ' + normalized.length + ' records. ' + (originals.length - normalized.length) + ' invalid records skipped.');
      setShowSettings(false);
    } catch(e) { setNotice('Import failed: ' + (e instanceof Error ? e.message : String(e))); }
  }
  function openPage(next: Page) { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  const action = <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus size={17}/> Add manually</button>;
  const searchAction = <button className="btn btn-primary" onClick={() => setShowCatalogue(true)}><Search size={17}/> Find game</button>;
  const renderCards = (items: Game[], limit?: number) => (
    <div className="game-grid">{(limit ? items.slice(0,limit) : items).map(g => <GameCard key={g.id} game={g} onClick={() => setSelectedId(g.id)}/>)}</div>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => openPage('home')} aria-label="GameVault home"><span className="brand-symbol"><Gamepad2 size={23} strokeWidth={1.75}/></span><span>GAMEVAULT<span className="brand-dot">.</span></span></button>
        <div className="nav-section-title">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {NAV.map(item => { const Icon = item.icon; return <button key={item.id} className={'nav-item ' + (page === item.id ? 'active' : '')} onClick={() => openPage(item.id)}><Icon size={18}/><span>{item.label}</span>{item.id === 'wishlist' && wishlist.length > 0 && <small>{wishlist.length}</small>}</button>; })}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-callout"><div className="callout-icon"><ShieldCheck size={18}/></div><strong>Yours to keep.</strong><span>Your library lives on this device. Remember to back it up.</span><button onClick={() => setShowSettings(true)}>Manage data <ArrowRight size={14}/></button></div>
          <button className="nav-item" onClick={openPatchNotes}><BookOpen size={18}/><span>Patch notes</span>{hasUnreadPatchNotes && <small className="notes-new">NEW</small>}</button>
          <button className="nav-item" onClick={() => setShowSettings(true)}><Settings2 size={18}/> Settings & backups</button>
          <div className="sidebar-version">GAMEVAULT / {APP_VERSION}</div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-brand" onClick={() => openPage('home')} aria-label="GameVault home"><Gamepad2 size={23}/></button><span className="breadcrumb">MY SPACE</span><span className="crumb-slash">/</span><strong>{NAV.find(n => n.id === page)?.label}</strong></div>
          <div className="topbar-right">
            {!isOnline && <Pill>Offline</Pill>}
            <button className="updates-button" onClick={openPatchNotes} aria-label={'Patch notes for GameVault ' + APP_VERSION + (hasUnreadPatchNotes ? ' - new updates' : '')}>
              <BookOpen size={17}/><span>What's new</span>{hasUnreadPatchNotes && <i className="updates-dot" aria-hidden="true"/>}
            </button>
            <button className="icon-btn settings-shortcut" onClick={() => setShowSettings(true)} aria-label="Settings and backup"><Settings2 size={19}/></button>
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
                  <div className="hero-copy"><div className="eyebrow eyebrow-light"><span className="live-dot"/> YOUR PERSONAL GAMING HQ</div><h1>Your games.<br/><em>All in one place.</em></h1><p>Track what you love. Remember what you played. Find what's next.</p><div className="hero-actions">{searchAction}<button className="btn btn-outline-light" onClick={() => setEditing('new')}>Add manually <Plus size={17}/></button></div></div>
                  <div className="hero-illustration" aria-hidden="true"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><Gamepad2 size={134} strokeWidth={0.85}/></div>
                </section>
                <div className="stat-grid">
                  <StatCard icon={<Library size={18}/>} value={String(collection.length)} label="Games in library"/>
                  <StatCard icon={<Gamepad2 size={18}/>} value={String(playing.length)} label="Currently playing"/>
                  <StatCard icon={<Check size={18}/>} value={String(completed.length)} label="Completed"/>
                  <StatCard icon={<Clock3 size={18}/>} value={fmtHours(totalHours) + 'h'} label="Hours logged"/>
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
                <div className="filterbar">
                  <div className="search-field"><Search size={18}/><input aria-label="Search games" placeholder="Search titles, genres, notes..." value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={16}/></button>}</div>
                  <label className="select-wrap"><Filter size={16}/><select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}</select><ChevronDown size={15}/></label>
                  <label className="select-wrap"><SlidersHorizontal size={16}/><select aria-label="Sort games" value={sort} onChange={e => setSort(e.target.value as Sort)}><option value="recent">Recently updated</option><option value="title">Title A–Z</option><option value="rating">Top rated</option><option value="hours">Most played</option><option value="year">Newest release</option></select><ChevronDown size={15}/></label>
                </div>
                <div className="results-line">{sortedLibrary.length} {sortedLibrary.length === 1 ? 'game' : 'games'} found</div>
                {sortedLibrary.length ? renderCards(sortedLibrary) : games.length ? <Empty icon={<Search size={28}/>} title="No games match" description="Try changing the search or filters." action={<button className="btn btn-subtle" onClick={() => {setQuery('');setStatusFilter('all');}}>Clear filters</button>}/> : <Empty title="Your library starts here" description="Add your first game. Your collection will stay saved on this device." action={<button className="btn btn-primary" onClick={() => setShowCatalogue(true)}><Search size={17}/> Find first game</button>}/>}
              </>}
              {page === 'discover' && <>
                <div className="page-heading"><div><span className="eyebrow">MAKE A CHOICE</span><h1>Discover</h1><p>A little help deciding what to play next.</p></div></div>
                <div className="discover-layout">
                  <section className="panel recommendation"><div className="eyebrow">BACKLOG PICKER</div><h2>Your next adventure</h2><p>Only picks from games you've actually put in your Backlog or On hold.</p>
                    {suggested ? <div className="recommend-game"><Cover game={suggested}/><div><Pill tone={'status-' + suggested.status}>{statusLabel[suggested.status]}</Pill><h3>{suggested.title}</h3><p>{suggested.platform}{suggested.year ? ' · ' + suggested.year : ''}</p><div className="button-row"><button className="btn btn-primary" onClick={() => setSelectedId(suggested.id)}>View game <ArrowRight size={16}/></button><button className="btn btn-subtle" onClick={() => setPickIndex(n => n + 1)}><Shuffle size={16}/> Another pick</button></div></div></div>
                    : <Empty icon={<Shuffle size={28}/>} title="Nothing to pick yet" description="Add games to your backlog, and we'll suggest one." action={<button className="btn btn-subtle" onClick={() => setEditing('new')}>Add game</button>}/>}
                  </section>
                  <section className="panel discover-side"><div className="mini-icon"><Sparkles size={21}/></div><h2>Built around your taste.</h2><p>GameVault won't pretend to know what you like. Recommendations will use your real library, ratings and play history as we expand this feature.</p><div className="side-metric"><strong>{queue.length}</strong><span>Games waiting in your queue</span></div></section>
                </div>
                {favourites.length > 0 && <section className="section-block"><div className="section-title"><div><span className="eyebrow">YOUR HIGHLIGHTS</span><h2>All-time favourites</h2></div></div>{renderCards(favourites, 6)}</section>}
              </>}
              {page === 'wishlist' && <>
                <div className="page-heading"><div><span className="eyebrow">COMING UP</span><h1>Wishlist<span className="heading-count">{wishlist.length}</span></h1><p>Games you want, without losing track of what they cost.</p></div><div className="library-actionrow">{searchAction}{action}</div></div>
                {wishlist.length ? <>{renderCards(wishlist)}<div className="muted-note"><Heart size={17}/> Prices are targets you enter yourself. This version doesn't pretend to show live PS Store prices.</div></> : <Empty icon={<Heart size={28}/>} title="Nothing on your wishlist" description="Add a game with its status set to Wishlist. Set an AUD target price if you like." action={<button className="btn btn-primary" onClick={() => setShowCatalogue(true)}><Search size={17}/> Find wanted game</button>}/>}
              </>}
              {page === 'stats' && <>
                <div className="page-heading"><div><span className="eyebrow">YOUR PLAY HISTORY</span><h1>Statistics</h1><p>Numbers calculated from the games you've logged.</p></div></div>
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
                <div className="muted-note"><BookOpen size={17}/> Only manually entered playtime and ratings are counted. No invented PSN data.</div>
              </>}
            </>
          )}
        </div>
        <footer className="site-footer"><span>GAMEVAULT © 2026 · YOUR LIBRARY, YOUR RULES</span><div className="footer-links"><button onClick={openPatchNotes}>v{APP_VERSION} · Patch notes <BookOpen size={14}/></button><button onClick={() => setShowSettings(true)}>Local data & backups <ArrowDownToLine size={14}/></button></div></footer>
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">{NAV.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => openPage(item.id)} aria-current={page === item.id ? 'page' : undefined}><Icon size={21}/><span>{item.label === 'Statistics' ? 'Stats' : item.label}</span></button>; })}</nav>
      {selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedId(null); }}>
        <section className="modal detail-modal" role="dialog" aria-modal="true" aria-label={'Details for ' + selected.title}>
          <header className="modal-heading"><button className="icon-text" onClick={() => setSelectedId(null)}><ArrowLeft size={18}/> Back to library</button><button className="icon-btn" onClick={() => setSelectedId(null)} aria-label="Close"><X size={20}/></button></header>
          <div className="detail-main"><Cover game={selected} className="detail-cover"/><div className="detail-copy"><span className="eyebrow">{selected.platform}{selected.year ? ' / ' + selected.year : ''}</span><h2>{selected.title}</h2><div className="detail-pills"><Pill tone={'status-'+selected.status}>{statusLabel[selected.status]}</Pill><Pill>{ownershipLabel[selected.ownership]}</Pill>{selected.favourite && <Pill><Heart size={12} fill="currentColor"/> Favourite</Pill>}</div><p className="detail-genres">{selected.genres || 'No genres added yet'}</p><div className="detail-actions"><button className="btn btn-primary" onClick={() => { setEditing(selected); setSelectedId(null); }}><Pencil size={16}/> Edit game</button><button className="btn btn-subtle" onClick={() => patchGame(selected,{favourite: !selected.favourite})}><Heart size={16} fill={selected.favourite ? 'currentColor' : 'none'}/> {selected.favourite ? 'Unfavourite' : 'Favourite'}</button></div></div></div>
          <div className="detail-stats"><div><strong>{selected.rating !== null ? selected.rating+'/10' : '—'}</strong><span>Your rating</span></div><div><strong>{fmtHours(selected.hours)}h</strong><span>Playtime logged</span></div><div><strong>{dateLabel(selected.completedAt)}</strong><span>Completed</span></div></div>
          {selected.status === 'wishlist' && selected.priceTarget !== null && <div className="note-box">Your target price: <strong>{currency(selected.priceTarget)}</strong> AUD tracking only — not a live quote.</div>}
          {selected.description && <div className="detail-description"><span className="eyebrow">ABOUT THE GAME</span><p>{selected.description}</p></div>}
          {(selected.screenshots ?? []).filter(safeCover).length > 0 && <div className="detail-gallery"><div className="detail-gallery-title"><span className="eyebrow">REAL SCREENSHOTS</span><span>{selected.screenshots?.length ?? 0} images</span></div><div className="detail-gallery-strip">{(selected.screenshots ?? []).filter(safeCover).map((url,i) => <a key={url+'-'+i} href={url} target="_blank" rel="noopener noreferrer"><img loading="lazy" src={url} alt={selected.title + ' screenshot ' + (i+1)}/></a>)}</div><small>External image links. Open an image to see it full size.</small></div>}
          {selected.catalogUrl && safeCover(selected.catalogUrl) && <div className="detail-catalog-source">Game information and artwork: <a href={selected.catalogUrl} target="_blank" rel="noopener noreferrer">{selected.catalogSource === 'rawg' ? 'RAWG' : 'Wikipedia'} ↗</a></div>}
          <div className="detail-notes"><span className="eyebrow">YOUR NOTES</span><p>{selected.notes || 'No notes yet. Edit this game to add your thoughts or progress.'}</p></div>
          <footer className="detail-footer"><small>Added {dateLabel(selected.addedAt)} · Updated {dateLabel(selected.updatedAt)}</small><button className="danger-link" onClick={() => deleteGame(selected)}><Trash2 size={16}/> Remove game</button></footer>
        </section>
      </div>}
      {editing && <GameForm key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={persist}/>}
      {showCatalogue && <CatalogueSearch onClose={() => setShowCatalogue(false)} onImport={importCatalogue} onOpenSettings={() => {setShowCatalogue(false);setShowSettings(true);}}/>}
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
