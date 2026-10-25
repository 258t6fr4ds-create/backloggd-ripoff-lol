import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ArrowRight, Check, ChevronDown, ExternalLink, Gamepad2, Image, LoaderCircle, Plus, Search, X } from 'lucide-react';
import { fetchRawgScreenshots, readRawgProxy, searchRawg, searchWikipedia } from './catalog';
import type { CatalogueGame, CatalogueSource } from './catalog';
import type { GameStatus } from './types';
import { safeCover } from './types';

const DEBOUNCE_MS = 420;
const MAX_SUGGESTIONS = 7;
const MAX_CACHED_LOOKUPS = 40;

export default function CatalogueSearch({
  onClose, onImport, onOpenSettings
}: {
  onClose: () => void;
  onImport: (entry: CatalogueGame, status: GameStatus) => Promise<boolean>;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState('');
  // RAWG is always the first choice. Wikipedia is an explicit fallback.
  const [source, setSource] = useState<CatalogueSource>('rawg');
  const [includeExtras, setIncludeExtras] = useState(false);
  const [results, setResults] = useState<CatalogueGame[]>([]);
  const [selected, setSelected] = useState<CatalogueGame | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [shotsLoading, setShotsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const proxy = readRawgProxy();
  const controller = useRef<AbortController | null>(null);
  const lookupId = useRef(0);
  const timer = useRef<number | null>(null);
  const cache = useRef(new Map<string, CatalogueGame[]>());

  const lookup = useCallback(async (text: string, provider: CatalogueSource, extras: boolean) => {
    const cleaned = text.trim();
    if (cleaned.length < 2 || (provider === 'rawg' && !proxy)) return;
    const current = ++lookupId.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    setSearched(false);
    setError('');
    const cacheKey = [provider, extras ? 'all' : 'games', cleaned.toLowerCase()].join(':');
    try {
      let found = cache.current.get(cacheKey);
      if (!found) {
        found = provider === 'rawg'
          ? await searchRawg(cleaned, proxy, abort.signal, extras)
          : await searchWikipedia(cleaned, abort.signal);
        if (abort.signal.aborted || current !== lookupId.current) return;
        if (cache.current.size >= MAX_CACHED_LOOKUPS) {
          const oldest = cache.current.keys().next().value;
          if (oldest) cache.current.delete(oldest);
        }
        cache.current.set(cacheKey, found);
      }
      if (abort.signal.aborted || current !== lookupId.current) return;
      setResults(found);
      setShowAll(false);
      setHighlighted(-1);
      setSearched(true);
    } catch (err) {
      if (abort.signal.aborted || current !== lookupId.current) return;
      setError(err instanceof Error ? err.message : 'Catalogue search failed. Try again.');
      setResults([]);
      setSearched(true);
    } finally {
      if (current === lookupId.current) setLoading(false);
    }
  }, [proxy]);

  // Debounced search-as-you-type: a quiet period, then one request.
  // Abort older requests so slow responses never overwrite newer suggestions.
  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    controller.current?.abort();
    lookupId.current += 1;
    const cleaned = query.trim();
    setHighlighted(-1);
    setShowAll(false);
    setError('');
    if (cleaned.length < 2 || (source === 'rawg' && !proxy)) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearched(false);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      void lookup(cleaned, source, includeExtras);
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      controller.current?.abort();
    };
  }, [query, source, includeExtras, proxy, lookup]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    controller.current?.abort();
  }, []);

  useEffect(() => {
    if (!selected || selected.source !== 'rawg' || !proxy) { setShots([]); return; }
    const ctl = new AbortController();
    setShotsLoading(true);
    setShots(selected.screenshots);
    fetchRawgScreenshots(selected.id, proxy, ctl.signal)
      .then(images => { if (!ctl.signal.aborted) setShots(images.length ? images : selected.screenshots); })
      .catch(() => { /* retain RAWG's preview screenshots */ })
      .finally(() => { if (!ctl.signal.aborted) setShotsLoading(false); });
    return () => ctl.abort();
  }, [selected, proxy]);

  function choose(game: CatalogueGame) {
    controller.current?.abort();
    setSelected(game);
    setShots(game.screenshots);
    setHighlighted(-1);
  }
  function changeQuery(value: string) {
    setSelected(null);
    setQuery(value);
  }
  function changeSource(next: CatalogueSource) {
    setSource(next);
    setSelected(null);
    setResults([]);
    setSearched(false);
    setError('');
  }
  function runSearch(event: FormEvent) {
    event.preventDefault();
    if (highlighted >= 0 && results[highlighted] && !showAll) {
      choose(results[highlighted]);
      return;
    }
    if (query.trim().length < 2) { setError('Enter at least two characters.'); return; }
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    void lookup(query, source, includeExtras);
  }
  function onQueryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (selected || loading || !results.length) return;
    const max = Math.min(results.length, showAll ? results.length : MAX_SUGGESTIONS) - 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted(previous => Math.min(max, previous + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted(previous => Math.max(-1, previous - 1));
    } else if (event.key === 'Escape') {
      setHighlighted(-1);
    }
  }
  async function importSelected(status: GameStatus) {
    if (!selected) return;
    setAdding(true);
    try { if (await onImport({ ...selected, screenshots: shots }, status)) onClose(); }
    finally { setAdding(false); }
  }

  const visibleResults = showAll ? results : results.slice(0, MAX_SUGGESTIONS);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal catalogue-modal" role="dialog" aria-modal="true" aria-label="Find a game in the catalogue">
      <header className="modal-heading">
        <div><span className="eyebrow">REAL GAMES, REAL ARTWORK</span><h2>Find a game</h2></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close catalogue"><X size={20}/></button>
      </header>
      <div className="catalogue-body">
        <div className="catalogue-providers" aria-label="Catalogue provider">
          <button className={source === 'rawg' ? 'selected' : ''} aria-pressed={source === 'rawg'} onClick={() => changeSource('rawg')}>RAWG <span>Games and DLC · Default</span></button>
          <button className={source === 'wikipedia' ? 'selected' : ''} aria-pressed={source === 'wikipedia'} onClick={() => changeSource('wikipedia')}>Wikipedia <span>Optional fallback</span></button>
        </div>
        {source === 'rawg' && !proxy && <div className="catalogue-hint">Connect your Cloudflare RAWG Worker once in Settings to enable real game results and live suggestions on this device. <button onClick={onOpenSettings}>Connect RAWG <ArrowRight size={14}/></button> Or use the Wikipedia fallback above.</div>}
        {source === 'rawg' && proxy && <div className="catalogue-typebar">
          <span>Games and DLC · Popular matches first</span>
          <label><input type="checkbox" checked={includeExtras} onChange={e => setIncludeExtras(e.target.checked)}/> Include soundtracks, demos and extras</label>
        </div>}
        {source === 'wikipedia' && <p className="catalogue-description">Wikipedia is a fallback for missing games. Search results may include unrelated articles; RAWG is the default game catalogue.</p>}
        <form className="catalogue-searchline" onSubmit={runSearch} role="search">
          <Search size={19}/>
          <input aria-label="Search game catalogue" aria-autocomplete="list"
            aria-controls="catalogue-suggestions"
            aria-expanded={!selected && visibleResults.length > 0}
            aria-activedescendant={highlighted >= 0 && !selected ? 'catalogue-option-' + highlighted : undefined}
            placeholder="Start typing a game title…" autoComplete="off" maxLength={100}
            value={query} onChange={e => changeQuery(e.target.value)} onKeyDown={onQueryKeyDown}/>
          {query && <button type="button" className="catalogue-clear" onClick={() => changeQuery('')} aria-label="Clear search"><X size={17}/></button>}
          <button type="submit" className="btn btn-primary" aria-label="Search games" disabled={source === 'rawg' && !proxy}>{loading ? <LoaderCircle size={16} className="spin"/> : <Search size={16}/>} Search</button>
        </form>
        <div className="catalogue-live-status" role="status" aria-live="polite">
          {loading ? 'Finding matching games…' : !selected && searched && !error ? (results.length ? results.length + ' matches suggested' : 'No matches found') : ''}
        </div>
        {error && <div className="catalogue-error" role="alert">{error}</div>}
        {!selected ? <>
          {query.trim().length < 2 && !error && <div className="catalogue-start"><Gamepad2 size={29}/><h3>Search real games and DLC.</h3><p>Start typing at least two characters to see live matches. Tap a suggestion to preview artwork, screenshots and details before adding it.</p></div>}
          {query.trim().length >= 2 && !loading && visibleResults.length > 0 && <div className="catalogue-results" id="catalogue-suggestions" role="listbox" aria-label="Suggested game matches">
            <div className="catalogue-result-count">{source === 'rawg' ? 'Popular matching games and DLC first' : 'Wikipedia article matches'} · Select a result</div>
            {visibleResults.map((game, index) => <button key={game.id} id={'catalogue-option-' + index} type="button"
              role="option" aria-selected={highlighted === index} className={'catalogue-result' + (highlighted === index ? ' keyboard-active' : '')}
              onMouseEnter={() => setHighlighted(index)} onClick={() => choose(game)}>
              <div className="catalogue-result-img">{safeCover(game.coverUrl) ? <img alt="" src={game.coverUrl} loading="lazy"/> : <Gamepad2 size={21}/>}</div>
              <div><strong>{game.title}</strong><span>{game.year || 'Year not listed'} · {game.source === 'rawg' ? 'RAWG' : 'Wikipedia'}{game.genres ? ' · ' + game.genres : ''}</span></div><ArrowRight size={16}/></button>)}
            {!showAll && results.length > MAX_SUGGESTIONS && <button className="catalogue-showmore" onClick={() => {setShowAll(true);setHighlighted(-1);}}>Show all {results.length} results <ChevronDown size={16}/></button>}
          </div>}
          {query.trim().length >= 2 && searched && !loading && !results.length && !error && <p className="catalogue-noresults">No matching {source === 'rawg' ? 'games or DLC' : 'articles'} found. Try another spelling{source === 'rawg' && !includeExtras ? ', enable extras' : ''}, or add the game manually.</p>}
        </> : <div className="catalogue-preview">
          <button className="icon-text" onClick={() => setSelected(null)}><ArrowRight size={15} style={{transform:'rotate(180deg)'}}/> Back to suggestions</button>
          <div className="catalogue-preview-main">
            <div className="catalogue-large-cover">{safeCover(selected.coverUrl) ? <img src={selected.coverUrl} alt={'Artwork for ' + selected.title}/> : <Gamepad2 size={42}/>}</div>
            <div><span className="eyebrow">{selected.source.toUpperCase()}</span><h3>{selected.title}</h3><p className="catalogue-meta">{selected.year ?? 'Release year unknown'}{selected.genres ? ' · ' + selected.genres : ''}</p>
              {selected.description && <p className="catalogue-description">{selected.description.slice(0, 500)}</p>}
              <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="catalogue-attribution">Source: {selected.source === 'rawg' ? 'RAWG' : 'Wikipedia'} <ExternalLink size={13}/></a>
            </div>
          </div>
          {shots.length > 0 && <><div className="eyebrow catalogue-gallery-heading"><Image size={14}/> REAL GAME SCREENSHOTS · {shots.length}</div><div className="catalogue-gallery">{shots.slice(0,8).map((url, i) => <a key={url + i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={selected.title + ' screenshot ' + (i+1)} loading="lazy"/></a>)}</div></>}
          {shotsLoading && <p className="catalogue-description">Loading screenshot gallery…</p>}
          <div className="catalogue-import-tip">Artwork and screenshots are fetched from third parties and might be unavailable later. You can edit all fields after importing; your personal ratings and stats are never overwritten.</div>
          <div className="catalogue-buttons"><button className="btn btn-primary" onClick={() => importSelected('backlog')} disabled={adding}><Plus size={16}/> Add to library</button><button className="btn btn-subtle" onClick={() => importSelected('wishlist')} disabled={adding}><Check size={16}/> Add to wishlist</button></div>
        </div>}
        <p className="catalogue-footer-note">GameVault is independent of Wikipedia, Wikimedia and RAWG. External images and information remain credited to their sources. Filtering obvious extras is best-effort; RAWG does not provide a guaranteed content-type field in these search results.</p>
      </div>
    </section>
  </div>;
}
