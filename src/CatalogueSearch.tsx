import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ExternalLink, Gamepad2, Image, LoaderCircle, Plus, Search, X } from 'lucide-react';
import { fetchRawgScreenshots, readRawgProxy, searchRawg, searchWikipedia } from './catalog';
import type { CatalogueGame, CatalogueSource } from './catalog';
import type { GameStatus } from './types';
import { safeCover } from './types';

export default function CatalogueSearch({
  onClose, onImport, onOpenSettings
}: {
  onClose: () => void;
  onImport: (entry: CatalogueGame, status: GameStatus) => Promise<boolean>;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<CatalogueSource>('wikipedia');
  const [results, setResults] = useState<CatalogueGame[]>([]);
  const [selected, setSelected] = useState<CatalogueGame | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [shotsLoading, setShotsLoading] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const proxy = readRawgProxy();
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!selected || selected.source !== 'rawg' || !proxy) { setShots([]); return; }
    const ctl = new AbortController();
    setShotsLoading(true);
    setShots(selected.screenshots);
    fetchRawgScreenshots(selected.id, proxy, ctl.signal)
      .then(images => setShots(images.length ? images : selected.screenshots))
      .catch(() => { /* list preview screenshots still available */ })
      .finally(() => setShotsLoading(false));
    return () => ctl.abort();
  }, [selected, proxy]);

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) { setError('Enter at least two characters.'); return; }
    controller.current?.abort();
    controller.current = new AbortController();
    setSelected(null); setResults([]); setError(''); setLoading(true);
    try {
      const found = source === 'rawg'
        ? await searchRawg(query, proxy, controller.current.signal)
        : await searchWikipedia(query, controller.current.signal);
      setResults(found);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') setError(err.message);
    } finally { setLoading(false); }
  }
  async function importSelected(status: GameStatus) {
    if (!selected) return;
    setAdding(true);
    try { if (await onImport({ ...selected, screenshots: shots }, status)) onClose(); }
    finally { setAdding(false); }
  }
  return <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) onClose(); }}>
    <section className="modal catalogue-modal" role="dialog" aria-modal="true" aria-label="Find a game in the catalogue">
      <header className="modal-heading">
        <div><span className="eyebrow">REAL GAMES, REAL ARTWORK</span><h2>Find a game</h2></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close catalogue"><X size={20}/></button>
      </header>
      <div className="catalogue-body">
        <div className="catalogue-providers" aria-label="Catalogue provider">
          <button className={source === 'wikipedia' ? 'selected' : ''} onClick={() => {setSource('wikipedia');setResults([]);setSelected(null);setError('');}}>Wikipedia <span>No key needed</span></button>
          <button className={source === 'rawg' ? 'selected' : ''} onClick={() => {setSource('rawg');setResults([]);setSelected(null);setError('');}}>RAWG <span>Huge game database</span></button>
        </div>
        {source === 'rawg' && !proxy && <div className="catalogue-hint">RAWG offers a larger dedicated game database and screenshots, but requires your own free API key stored in a separate Worker — never in this site's public code. <button onClick={onOpenSettings}>Configure RAWG <ArrowRight size={14}/></button></div>}
        {source === 'wikipedia' && <p className="catalogue-description">Search Wikipedia articles and import real thumbnail artwork when available. This is a useful no-key fallback, <strong>not</strong> a complete game catalogue. Check that the result is actually the right game.</p>}
        <form className="catalogue-searchline" onSubmit={runSearch}>
          <Search size={19}/>
          <input autoFocus aria-label="Search game catalogue" placeholder="Try Red Dead Redemption 2…" maxLength={100} value={query} onChange={e => setQuery(e.target.value)}/>
          <button type="submit" className="btn btn-primary" disabled={loading || (source === 'rawg' && !proxy)}>{loading ? <LoaderCircle size={16} className="spin"/> : <Search size={16}/>} Search</button>
        </form>
        {error && <div className="catalogue-error" role="alert">{error}</div>}
        {!selected ? <>
          {!loading && !results.length && !error && <div className="catalogue-start"><Gamepad2 size={29}/><h3>Find your next game.</h3><p>Search for an existing title. Imported information is editable, and nothing is added until you choose it.</p></div>}
          {loading && <div className="catalogue-start"><LoaderCircle className="spin" size={27}/><p>Looking up real game records…</p></div>}
          {!loading && results.length > 0 && <div className="catalogue-results">
            <div className="catalogue-result-count">{results.length} matches · Select the correct game or edition</div>
            {results.map(game => <button key={game.id} className="catalogue-result" onClick={() => setSelected(game)}>
              <div className="catalogue-result-img">{safeCover(game.coverUrl) ? <img alt="" src={game.coverUrl} loading="lazy"/> : <Gamepad2 size={21}/>}</div>
              <div><strong>{game.title}</strong><span>{game.year || 'Year not listed'} · {game.source === 'rawg' ? 'RAWG' : 'Wikipedia'}{game.genres ? ' · ' + game.genres : ''}</span></div><ArrowRight size={16}/></button>)}
          </div>}
          {!loading && !results.length && query.trim().length > 1 && !error && <p className="catalogue-noresults">No matches in this provider. Try a different spelling or use manual entry.</p>}
        </> : <div className="catalogue-preview">
          <button className="icon-text" onClick={() => setSelected(null)}><ArrowRight size={15} style={{transform:'rotate(180deg)'}}/> Back to results</button>
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
        <p className="catalogue-footer-note">GameVault is independent of Wikipedia, Wikimedia and RAWG. External images and information remain credited to their sources.</p>
      </div>
    </section>
  </div>;
}
