import { useEffect, useState } from 'react';
import {
  ArrowLeft, BookOpen, CalendarDays, Check, Clock3, ExternalLink, Film,
  Gamepad2, Heart, Images, Info, Layers3, LoaderCircle, Pencil,
  RefreshCw, Star, Trash2, X
} from 'lucide-react';
import type { Game, GameDlc } from './types';
import { ownershipLabel, safeCover, statusLabel } from './types';
import {
  fetchRawgMetadata, fetchRawgSeries, type CatalogueGame
} from './catalog';
import DlcPanel from './DlcPanel';
import PlaythroughJournal from './PlaythroughJournal';

type ProfileTab='overview'|'dlc'|'runs'|'journal'|'gallery';
const tabs: {id:ProfileTab;label:string;icon:typeof Info}[]=[
  {id:'overview',label:'Overview',icon:Info},
  {id:'dlc',label:'DLC',icon:Layers3},
  {id:'runs',label:'Playthroughs',icon:Clock3},
  {id:'journal',label:'Journal',icon:BookOpen},
  {id:'gallery',label:'Gallery',icon:Images},
];
const fmtDate=(value:string)=>{
  if(!value)return 'Not recorded';
  const date=new Date(value.includes('T')?value:value+'T12:00:00');
  return Number.isNaN(date.getTime())?'Not recorded':date.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
};
const fmtHours=(n:number)=>new Intl.NumberFormat('en-AU',{maximumFractionDigits:1}).format(n);
const currency=(n:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(n);

export default function GameProfile({
  game,proxy,onClose,onEdit,onToggleFavourite,onDelete,onUpdate,
  onDlcSearch,onDlcAttach,onDlcModify
}: {
  game:Game;
  proxy:string;
  onClose:()=>void;
  onEdit:()=>void;
  onToggleFavourite:()=>Promise<boolean>;
  onDelete:()=>void;
  onUpdate:(patch:Partial<Game>)=>Promise<boolean>;
  onDlcSearch:()=>void;
  onDlcAttach:(entries:CatalogueGame[])=>Promise<{added:number;skipped:number}>;
  onDlcModify:(id:string,action:'toggle'|'remove')=>Promise<void>;
}){
  const [tab,setTab]=useState<ProfileTab>('overview');
  const [coverBroken,setCoverBroken]=useState(false);
  const [bannerBroken,setBannerBroken]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [refreshMessage,setRefreshMessage]=useState('');
  const [series,setSeries]=useState<CatalogueGame[]>([]);
  const [seriesFetched,setSeriesFetched]=useState(false);
  const [seriesError,setSeriesError]=useState('');
  const isRawg=/^rawg:\d+$/.test(game.catalogId??'');
  const canRefresh=isRawg&&!!proxy;
  const banner=safeCover(game.screenshots?.[0]??'')||safeCover(game.coverUrl);
  const screenshotUrls=[...new Set((game.screenshots??[]).map(safeCover).filter(Boolean))];
  const tabCount:Record<ProfileTab,string>={
    overview:'',
    dlc:String(game.dlcs?.length??0),
    runs:String(game.playthroughs?.length??0),
    journal:String(game.journal?.length??0),
    gallery:String(screenshotUrls.length)
  };
  useEffect(()=>{
    setCoverBroken(false);setBannerBroken(false);
  },[game.id,game.coverUrl,banner]);
  useEffect(()=>{
    if(tab!=='overview'||!canRefresh||seriesFetched)return;
    const controller=new AbortController();
    setSeriesFetched(true);setSeriesError('');
    fetchRawgSeries(game.catalogId!,proxy,controller.signal)
      .then(items=>{if(!controller.signal.aborted)setSeries(items);})
      .catch(err=>{if(!controller.signal.aborted)setSeriesError(err instanceof Error?err.message:'Series lookup unavailable.');});
    return ()=>controller.abort();
  },[tab,canRefresh,seriesFetched,game.catalogId,proxy]);

  async function refreshMetadata(){
    if(!canRefresh||refreshing)return;
    setRefreshing(true);setRefreshMessage('');
    try{
      const found=await fetchRawgMetadata(game.catalogId!,game.title,proxy);
      if(found.id!==game.catalogId)throw Error('RAWG returned a mismatched ID. No changes were applied.');
      const patch:Partial<Game>={};
      if(!game.year&&found.year)patch.year=found.year;
      if(!game.released&&found.released)patch.released=found.released;
      if(!game.availablePlatforms?.trim()&&found.platform)patch.availablePlatforms=found.platform.slice(0,600);
      if(!game.genres.trim()&&found.genres)patch.genres=found.genres.slice(0,240);
      if(!game.description?.trim()&&found.description)patch.description=found.description.slice(0,5000);
      if(!game.developers?.trim()&&found.developers)patch.developers=found.developers.slice(0,400);
      if(!game.publishers?.trim()&&found.publishers)patch.publishers=found.publishers.slice(0,400);
      if(!safeCover(game.coverUrl)&&safeCover(found.coverUrl))patch.coverUrl=found.coverUrl;
      if(!(game.screenshots??[]).length&&found.screenshots.length)patch.screenshots=found.screenshots.filter(safeCover).slice(0,24);
      const count=Object.keys(patch).length;
      if(!count){
        setRefreshMessage(found.full?'Everything RAWG supplied is already filled in. Your saved fields are unchanged.':'Basic RAWG fields are filled in. Update the Cloudflare Worker for developer/publisher metadata.');
        return;
      }
      if(new TextEncoder().encode(JSON.stringify({...game,...patch})).byteLength>180000){
        throw Error('This game record is near its cloud-sync size limit. No changes were applied.');
      }
      if(!await onUpdate(patch))throw Error('Could not save metadata. No personal game details were intentionally changed.');
      setRefreshMessage('Filled '+count+' missing catalogue '+(count===1?'field':'fields')+'. '+(found.full?'':'The Worker still needs the detail endpoint for developer/publisher metadata.'));
    }catch(err){
      setRefreshMessage(err instanceof Error?err.message:'Metadata refresh failed.');
    }finally{setRefreshing(false);}
  }

  const notes=game.notes.trim();
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="modal detail-modal gv-profile-v18" role="dialog" aria-modal="true" aria-label={'Details for '+game.title}>
      <header className="modal-heading">
        <button className="icon-text" onClick={onClose}><ArrowLeft size={18}/> Back to library</button>
        <button className="icon-btn" onClick={onClose} aria-label="Close game profile"><X size={20}/></button>
      </header>
      {banner&&!bannerBroken?
        <div className="gv-detail-banner"><img src={banner} onError={()=>setBannerBroken(true)} alt=""/></div>:
        <div className="gv-detail-banner gv-detail-banner-fallback" aria-hidden="true"><Gamepad2 size={70}/></div>}
      <div className="detail-main">
        <div className="detail-cover cover">
          {safeCover(game.coverUrl)&&!coverBroken?
            <img src={safeCover(game.coverUrl)} onError={()=>setCoverBroken(true)} alt={'Cover artwork for '+game.title}/>:
            <div className="cover-fallback"><Gamepad2 size={34}/></div>}
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{game.platform?'YOUR PLATFORM: '+game.platform:'PLATFORM NOT SET'}{game.year?' / '+game.year:''}</span>
          <h2>{game.title}</h2>
          <div className="detail-pills">
            <span className={'pill status-'+game.status}>{statusLabel[game.status]}</span>
            <span className="pill">{ownershipLabel[game.ownership]}</span>
            {game.favourite&&<span className="pill"><Heart size={12} fill="currentColor"/> Favourite</span>}
          </div>
          <p className="detail-genres">{game.genres||'No genres recorded yet'}</p>
          {!!game.shelves?.length&&<div className="gv-profile-shelves" aria-label="Custom shelves">
            {game.shelves.map(name=><span key={name}>{name}</span>)}
          </div>}
          <div className="detail-actions">
            <button className="btn btn-primary" onClick={onEdit}><Pencil size={16}/> Edit game</button>
            <button className="btn btn-subtle" onClick={()=>void onToggleFavourite()}>
              <Heart size={16} fill={game.favourite?'currentColor':'none'}/>{game.favourite?'Unfavourite':'Favourite'}
            </button>
          </div>
        </div>
      </div>
      <nav className="gv-profile-tabs" role="tablist" aria-label="Game profile sections">
        {tabs.map(entry=>{const Icon=entry.icon;return <button key={entry.id} type="button"
          role="tab" id={'gv-tab-'+entry.id} aria-selected={tab===entry.id}
          aria-controls={'gv-panel-'+entry.id}
          className={tab===entry.id?'active':''}
          onClick={()=>setTab(entry.id)}>
          <Icon size={16}/><span>{entry.label}</span>{tabCount[entry.id]&&<small>{tabCount[entry.id]}</small>}
        </button>;})}
      </nav>
      <div role="tabpanel" id={'gv-panel-'+tab} aria-labelledby={'gv-tab-'+tab} className="gv-profile-tab-content">
        {tab==='overview'&&<>
          <div className="detail-stats">
            <div><strong>{game.rating!==null?game.rating+'/10':'—'}</strong><span>Your rating</span></div>
            <div><strong>{fmtHours(game.hours)}h</strong><span>Time logged</span></div>
            <div><strong>{fmtDate(game.completedAt)}</strong><span>Completed</span></div>
          </div>
          {game.status==='wishlist'&&game.priceTarget!==null&&<div className="note-box">
            Wishlist target: <strong>{currency(game.priceTarget)}</strong> (your own target, not a live price)
          </div>}
          {(game.description||notes)&&<div className="gv-profile-overview-copy">
            {game.description&&<section className="detail-description"><span className="eyebrow">ABOUT THE GAME</span><p>{game.description}</p></section>}
            {notes&&<section className="detail-notes"><span className="eyebrow">YOUR NOTES</span><p>{notes}</p></section>}
          </div>}
          <section className="gv-profile-metadata">
            <div className="gv-profile-section-title"><div><span className="eyebrow">CATALOGUE DETAILS</span><h3>Game information</h3></div></div>
            <div className="gv-profile-facts">
              <div><span>Released</span><strong>{game.released?fmtDate(game.released):game.year??'Unknown'}</strong></div>
              <div><span>Developer</span><strong>{game.developers||'Not available'}</strong></div>
              <div><span>Publisher</span><strong>{game.publishers||'Not available'}</strong></div>
              <div><span>Available on RAWG</span><strong>{game.availablePlatforms||'Not listed'}</strong></div>
            </div>
            {isRawg&&<div className="gv-profile-refresh">
              <button className="btn btn-subtle" disabled={!canRefresh||refreshing} onClick={()=>void refreshMetadata()}>
                {refreshing?<LoaderCircle size={16} className="spin"/>:<RefreshCw size={16}/>}
                {refreshing?'Checking RAWG…':'Fill missing game info'}
              </button>
              <p>Only missing catalogue fields are filled. Your artwork, ratings, personal platform, notes, DLC and play history are never replaced.</p>
              {!proxy&&<p>Connect your RAWG Worker in Settings to use refresh.</p>}
              {refreshMessage&&<p className="gv-profile-refresh-status" role="status">{refreshMessage}</p>}
            </div>}
          </section>
          {series.length>0&&<section className="gv-profile-series">
            <div className="gv-profile-section-title"><div><span className="eyebrow">FROM RAWG</span><h3>More in the series</h3></div></div>
            <div className="gv-profile-series-grid">{series.map(item=><a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
              {safeCover(item.coverUrl)?<img src={item.coverUrl} alt="" loading="lazy"/>:<span><Gamepad2 size={23}/></span>}
              <strong>{item.title}</strong><small>{item.year??'Year unknown'}</small>
            </a>)}</div>
          </section>}
          {seriesError&&<p className="gv-profile-series-note">Series information couldn't be loaded: {seriesError}</p>}
          {safeCover(game.catalogUrl)&&<div className="detail-catalog-source">
            Game catalogue: <a href={game.catalogUrl} target="_blank" rel="noopener noreferrer">
              {game.catalogSource==='rawg'?'RAWG':'Wikipedia'} <ExternalLink size={13}/>
            </a>
          </div>}
        </>}
        {tab==='dlc'&&<DlcPanel key={game.id} game={game} proxy={proxy}
          onFindManually={onDlcSearch} onAttach={onDlcAttach} onModify={onDlcModify}/>}
        {tab==='runs'&&<PlaythroughJournal key={game.id+':runs'} game={game}
          onUpdate={onUpdate} initialSection="runs" embedded/>}
        {tab==='journal'&&<PlaythroughJournal key={game.id+':journal'} game={game}
          onUpdate={onUpdate} initialSection="journal" embedded/>}
        {tab==='gallery'&&<section className="gv-profile-gallery">
          <div className="gv-profile-section-title"><div><span className="eyebrow">GAME ARTWORK</span><h3>Screenshots & gallery</h3></div><small>{screenshotUrls.length} images</small></div>
          {screenshotUrls.length?
            <div className="gv-profile-gallery-grid">{screenshotUrls.map((url,i)=><a key={url+'-'+i} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt={game.title+' screenshot '+(i+1)} loading="lazy"/>
              <span><Film size={14}/> View image {i+1}</span>
            </a>)}</div>:
            <div className="gv-profile-gallery-empty"><Images size={25}/><strong>No screenshots saved yet</strong><p>Use Fill missing game info on the Overview tab to find RAWG artwork. Your own links are editable in Edit game.</p></div>}
        </section>}
      </div>
      <footer className="detail-footer">
        <small><CalendarDays size={13}/> Added {fmtDate(game.addedAt)} · Updated {fmtDate(game.updatedAt)}</small>
        <button className="danger-link" onClick={onDelete}><Trash2 size={16}/> Remove game</button>
      </footer>
    </section>
  </div>;
}
