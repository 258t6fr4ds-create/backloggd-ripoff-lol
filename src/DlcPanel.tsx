import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Gamepad2, Layers3, LoaderCircle, Plus, RefreshCw, Search, X } from 'lucide-react';
import { fetchRawgAdditions, type CatalogueGame, type RawgAddition, type RawgAdditionKind } from './catalog';
import type { Game } from './types';
import { safeCover } from './types';

type ImportResult = { added:number; skipped:number };
export default function DlcPanel({
  game, proxy, onFindManually, onAttach, onModify, compact = false
}:{
  game: Game;
  proxy: string;
  onFindManually:()=>void;
  onAttach:(additions:CatalogueGame[])=>Promise<ImportResult>;
  onModify?:(id:string,action:'toggle'|'remove')=>Promise<void>;
  compact?: boolean;
}) {
  const [discoverOpen,setDiscoverOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [results,setResults]=useState<RawgAddition[] | null>(null);
  const [selected,setSelected]=useState<string[]>([]);
  const [saving,setSaving]=useState(false);
  const [showExtras,setShowExtras]=useState(false);
  const [filter,setFilter]=useState<'all'|RawgAdditionKind>('all');
  const [query,setQuery]=useState('');
  const [feedback,setFeedback]=useState('');
  const [retryCount,setRetryCount]=useState(0);
  const canLookup=!!proxy && /^rawg:\d+$/.test(game.catalogId??'');
  useEffect(()=>{setResults(null);setSelected([]);setError('');setDiscoverOpen(false);},[game.id]);
  useEffect(()=>{
    if(!discoverOpen || results!==null || !canLookup)return;
    const controller=new AbortController();
    setLoading(true);setError('');
    fetchRawgAdditions(game.catalogId!,proxy,controller.signal).then(list=>{
      if(!controller.signal.aborted)setResults(list);
    }).catch(reason=>{
      if(!controller.signal.aborted)setError(reason instanceof Error ? reason.message : 'Could not load RAWG additions.');
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[canLookup,discoverOpen,game.catalogId,proxy,results,retryCount]);
  const linked = useMemo(()=>new Set((game.dlcs??[]).flatMap(d=>[d.catalogId,d.title.toLowerCase()].filter(Boolean))),[game.dlcs]);
  const remaining=results?.filter(r=>!linked.has(r.id)&&!linked.has(r.title.toLowerCase())&&r.id!==game.catalogId)??[];
  const filtered=remaining.filter(item=>(filter==='all'||item.kind===filter)
    &&item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const primary=filtered.filter(item=>item.kind==='expansion');
  const unclassified=filtered.filter(item=>item.kind==='unclassified');
  const secondary=filtered.filter(item=>item.kind==='edition');
  const other=filtered.filter(item=>item.kind==='other');
  const selectedResults=remaining.filter(r=>selected.includes(r.id));
  async function attach(items:CatalogueGame[]) {
    if(!items.length||saving)return;
    setSaving(true);setError('');setFeedback('');
    try {
      const outcome=await onAttach(items);
      setSelected([]);
      setFeedback(outcome.added ? 'Added '+outcome.added+' to '+game.title+'.' : 'Those add-ons are already linked.');
    } catch(e){setError(e instanceof Error?e.message:'Could not add DLC.');}
    finally {setSaving(false);}
  }
  function renderRow(entry:RawgAddition) {
    const checked=selected.includes(entry.id);
    return <div key={entry.id} className="related-dlc-row">
      <button className="related-dlc-picker" onClick={()=>setSelected(old=>old.includes(entry.id)?old.filter(id=>id!==entry.id):[...old,entry.id])}
        aria-pressed={checked} aria-label={(checked?'Unselect ':'Select ')+entry.title}>
        {checked?<Check size={16}/>:<Plus size={16}/>}
      </button>
      <div className="related-dlc-art">{safeCover(entry.coverUrl)?<img src={entry.coverUrl} loading="lazy" alt=""/>:<Gamepad2 size={22}/>}</div>
      <div className="related-dlc-info"><strong>{entry.title}</strong><small>{entry.year??'Year not listed'} · {entry.kind==='expansion'?'Labelled DLC / expansion':entry.kind==='edition'?'Edition or bundle':entry.kind==='other'?'Non-game extra':'Related item (type unknown)'}</small></div>
      <button className="related-dlc-add" disabled={saving} onClick={()=>void attach([entry])} aria-label={'Attach '+entry.title+' to '+game.title}>Add</button>
    </div>;
  }
  return <section className={'detail-dlc'+(compact?' detail-dlc-compact':'')} aria-label={'DLC and expansions for '+game.title}>
    <div className="detail-dlc-head">
      <div><span className="eyebrow">CONNECTED TO THIS GAME</span><h3>Expansions & DLC <span className="heading-count">{game.dlcs?.length??0}</span></h3></div>
      <button className="btn btn-subtle" onClick={()=>{setDiscoverOpen(s=>!s);setFeedback('');}} aria-expanded={discoverOpen}>
        <Layers3 size={16}/>{discoverOpen?'Hide related':'Browse RAWG'} <ChevronDown size={15} className={discoverOpen?'dlc-chevron-open':''}/>
      </button>
    </div>
    {(game.dlcs?.length??0)===0
      ? <p className="detail-dlc-empty">Nothing linked yet. Browse add-ons that RAWG associates with this game and choose what to track.</p>
      : <div className="detail-dlc-list">{game.dlcs?.map(d=><div className="detail-dlc-row" key={d.id}>
        <div className="detail-dlc-image">{safeCover(d.coverUrl)?<img src={d.coverUrl} loading="lazy" alt=""/>:<Gamepad2 size={20}/>}</div>
        <div className="detail-dlc-title"><strong>{d.title}</strong><small>{d.year??'Year unknown'} · {d.owned?'Owned':'Not marked owned'}</small>{safeCover(d.catalogUrl)&&<a href={d.catalogUrl} target="_blank" rel="noopener noreferrer">View on RAWG ↗</a>}</div>
        {onModify&&<><button className="btn btn-subtle" onClick={()=>void onModify(d.id,'toggle')}>{d.owned?'Owned':'Mark owned'}</button><button className="icon-btn" aria-label={'Remove DLC '+d.title} onClick={()=>{if(window.confirm('Remove '+d.title+' from '+game.title+'?'))void onModify(d.id,'remove');}}><X size={17}/></button></>}
      </div>)}</div>}
    {discoverOpen&&<div className="related-dlc-browser">
      <div className="related-dlc-intro">
        <strong>Related add-ons from RAWG</strong>
        <p>RAWG lists items connected to this game, but doesn't reliably label every addition as DLC. Search and filter below; you decide what to link.</p>
      </div>
      {!canLookup&&<div className="related-dlc-notice">To browse linked DLC, the base game needs a RAWG catalogue record and a configured Worker. Use Find DLC to search manually.</div>}
      {loading&&<p className="related-dlc-loading"><LoaderCircle className="spin" size={17}/> Looking up add-ons…</p>}
      {error&&<div className="catalogue-error" role="alert">{error}
        {error.includes('Worker needs')&&<p className="related-dlc-help">The GitHub Worker script now includes the DLC route, but the deployed Cloudflare Worker needs to be updated separately. <a href="https://github.com/258t6fr4ds-create/backloggd-ripoff-lol/blob/main/worker/index.js" target="_blank" rel="noopener noreferrer">View updated Worker source ↗</a></p>}
        <button className="related-dlc-retry" onClick={()=>{setResults(null);setError('');setRetryCount(n=>n+1);}}>Retry</button>
      </div>}
      {results!==null&&<>
        {results.length>0&&<div className="gv-dlc-filters">
          <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter add-ons…" aria-label="Filter related additions"/>
          <div role="group" aria-label="Addition type">
            {([{id:'all',label:'All'}, {id:'expansion',label:'DLC'}, {id:'unclassified',label:'Unclassified'},
              {id:'edition',label:'Editions'}, {id:'other',label:'Extras'}] as const).map(opt=>
              <button key={opt.id} className={filter===opt.id?'active':''} aria-pressed={filter===opt.id}
                onClick={()=>{setFilter(opt.id);setShowExtras(opt.id==='other');}}>{opt.label}</button>)}
          </div>
        </div>}
        {!results.length&&<p className="detail-dlc-empty">RAWG doesn't currently list any related editions or DLC for this game.</p>}
        {primary.length>0&&<div className="related-dlc-group"><h4>Labelled DLC & expansions <span>{primary.length}</span></h4>{primary.map(renderRow)}</div>}
        {unclassified.length>0&&<div className="related-dlc-group"><h4>Other related releases <span>{unclassified.length}</span></h4>
          <p className="gv-dlc-explanation">RAWG connects these to the base game, but hasn't confirmed their type. Some may be genuine DLC.</p>
          {unclassified.map(renderRow)}</div>}
        {secondary.length>0&&<div className="related-dlc-group"><h4>Other editions & bundles <span>{secondary.length}</span></h4>{secondary.map(renderRow)}</div>
        {other.length>0&&<div className="related-dlc-group"><button className="related-dlc-extras-toggle" onClick={()=>setShowExtras(v=>!v)}>Other extras ({other.length}) <ChevronDown size={16} className={showExtras?'dlc-chevron-open':''}/></button>{showExtras&&other.map(renderRow)}</div>}
        {results.length>0&&!remaining.length&&<p className="detail-dlc-empty">All reported add-ons are already attached to this game.</p>}
        {!!remaining.length&&!filtered.length&&<p className="detail-dlc-empty">No related items match your filter.</p>}
      </>}
      {selectedResults.length>0&&<div className="related-dlc-batchbar">
        <span>{selectedResults.length} selected</span>
        <button className="btn btn-ghost" onClick={()=>setSelected([])}>Clear</button>
        <button className="btn btn-primary" disabled={saving} onClick={()=>void attach(selectedResults)}><Plus size={15}/>{saving?'Adding…':'Add selected'}</button>
      </div>}
      {feedback&&<p className="related-dlc-feedback" role="status">{feedback}</p>}
      <button className="related-dlc-manual" onClick={onFindManually}><Search size={15}/> Search manually instead</button>
    </div>}
  </section>;
}
