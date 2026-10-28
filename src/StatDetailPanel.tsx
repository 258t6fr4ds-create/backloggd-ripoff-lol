import { useMemo } from 'react';
import { BarChart3, CalendarDays, Check, Clock3, Gamepad2, Library, Play, Trophy } from 'lucide-react';
import type { Game } from './types';
import { buildLibraryInsights } from './insights';
import { statusLabel } from './types';

export type StatFocus = 'library' | 'playing' | 'completed' | 'hours';
const categories:{id:StatFocus;label:string;subtitle:string;icon:typeof Library}[]=[
  {id:'library',label:'Library',subtitle:'Collection and genres',icon:Library},
  {id:'playing',label:'Playing',subtitle:'Current game rotation',icon:Play},
  {id:'completed',label:'Completed',subtitle:'Finishes and progress',icon:Check},
  {id:'hours',label:'Hours logged',subtitle:'Where your time went',icon:Clock3},
];
const n=(val:number)=>val.toLocaleString('en-AU',{maximumFractionDigits:1});
const genres=(game:Game)=>[...new Set((game.genres||'').split(/[,;/|]/).map(x=>x.trim()).filter(Boolean))];
type Row={key:string;value:number;info?:string;game?:Game};
function ChartBars({title,rows,maxCount=8,suffix='',empty,onOpen}:{
  title:string;rows:Row[];maxCount?:number;suffix?:string;empty:string;onOpen?:(id:string)=>void
}){
  const visible=rows.slice(0,maxCount);
  const maximum=Math.max(1,...visible.map(r=>r.value));
  return <section className="panel gv-stat-chart">
    <div className="section-title small"><div><span className="eyebrow">YOUR COLLECTION</span><h2>{title}</h2></div></div>
    {visible.length===0?<p className="empty-inline">{empty}</p>:
      <div className="gv-stat-bars">{visible.map((row,i)=><div className="gv-stat-bar-item" key={row.key+'-'+i}>
        <div className="gv-stat-bar-heading">
          {row.game&&onOpen?<button onClick={()=>onOpen(row.game!.id)}>{row.key}</button>:<span>{row.key}</span>}
          <strong>{n(row.value)}{suffix}</strong>
        </div>
        <div className="gv-stat-bar-track"><div style={{width:row.value>0?Math.max(2,(row.value/maximum)*100)+'%':'0%'}}/></div>
        {row.info&&<small>{row.info}</small>}
      </div>)}</div>}
  </section>;
}
export default function StatDetailPanel({games,focus,onFocus,onOpen}:{
  games:Game[];focus:StatFocus;onFocus:(next:StatFocus)=>void;onOpen:(id:string)=>void;
}){
  const stats=useMemo(()=>buildLibraryInsights(games),[games]);
  const library=useMemo(()=>games.filter(g=>g.status!=='wishlist'),[games]);
  const playing=useMemo(()=>library.filter(g=>g.status==='playing'),[library]);
  const completed=useMemo(()=>library.filter(g=>g.status==='completed'),[library]);
  const ratedCompleted=useMemo(()=>completed.filter(g=>g.rating!==null),[completed]);
  const statusRows=useMemo(()=>stats.statusRows.map(r=>({key:statusLabel[r.status],value:r.count})),[stats]);
  const libraryGenres=useMemo(()=>stats.genreRows.map(row=>({key:row.name,value:row.count,info:row.favourites?row.favourites+' favourites':undefined})),[stats]);
  const platforms=useMemo(()=>{
    const map=new Map<string,number>();
    for(const game of library){
      const p=game.platform.trim()||'Unspecified';
      map.set(p,(map.get(p)??0)+1);
    }
    return [...map.entries()].map(([key,value])=>({key,value})).sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key));
  },[library]);
  const byHours=(items:Game[])=>[...items].filter(g=>g.hours>0).sort((a,b)=>b.hours-a.hours||a.title.localeCompare(b.title))
    .map(g=>({key:g.title,value:g.hours,game:g,info:g.platform||undefined}));
  const playingHours=useMemo(()=>byHours(playing),[playing]);
  const overallHours=useMemo(()=>byHours(library),[library]);
  const completedScores=useMemo(()=>[...ratedCompleted].sort((a,b)=>(b.rating??0)-(a.rating??0))
    .map(g=>({key:g.title,value:g.rating??0,game:g,info:'Your rating out of 10'})),[ratedCompleted]);
  const playingGenres=useMemo(()=>{
    const map=new Map<string,number>();
    for(const game of playing)for(const genre of genres(game))map.set(genre,(map.get(genre)??0)+1);
    return [...map.entries()].map(([key,value])=>({key,value})).sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key));
  },[playing]);
  const hoursByGenre=useMemo(()=>{
    const map=new Map<string,number>();
    for(const game of library)for(const genre of genres(game))map.set(genre,(map.get(genre)??0)+game.hours);
    return [...map.entries()].map(([key,value])=>({key,value})).sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key));
  },[library]);
  const active=categories.find(c=>c.id===focus)!;
  const activeSummary:Record<StatFocus,string>={
    library:stats.collectionCount+' games in your collection, across '+stats.genreRows.length+' recorded genres.',
    playing:playing.length+' games currently marked Playing. Charts use the hours and genres you entered.',
    completed:stats.completedCount+' games completed ('+stats.completionPercent+'% of your non-wishlist library).',
    hours:n(stats.loggedHours)+' hours logged at game level. Individual playthrough hours are reported separately.'
  };
  return <section className="gv-stat-detail" aria-label="Detailed home screen statistics">
    <div className="gv-stat-detail-heading"><div><span className="eyebrow">EXPLORE YOUR NUMBERS</span><h2>{active.label} insights</h2><p>{activeSummary[focus]}</p></div><BarChart3 size={26}/></div>
    <nav className="gv-stat-focus-tabs" aria-label="Statistic categories">
      {categories.map(item=>{const Icon=item.icon;return <button key={item.id} onClick={()=>onFocus(item.id)}
        className={focus===item.id?'active':''} aria-current={focus===item.id?'page':undefined}>
        <Icon size={19}/><span><strong>{item.label}</strong><small>{item.subtitle}</small></span>
      </button>;})}
    </nav>
    {focus==='library'&&<>
      <div className="gv-stat-highlights">
        <div><Library size={19}/><strong>{stats.collectionCount}</strong><span>In library</span></div>
        <div><Trophy size={19}/><strong>{stats.genreRows.length}</strong><span>Genres recorded</span></div>
        <div><Gamepad2 size={19}/><strong>{platforms.length}</strong><span>Personal platform labels</span></div>
      </div>
      <div className="analytics-grid gv-stat-focus-grid">
        <ChartBars title="Games by status" rows={statusRows} empty="No games in your library yet."/>
        <ChartBars title="Most collected genres" rows={libraryGenres} empty="Enter genres on your games to see a breakdown."/>
        <ChartBars title="Your platforms" rows={platforms} empty="Add games to see platform counts."/>
      </div>
    </>}
    {focus==='playing'&&<>
      <div className="gv-stat-highlights">
        <div><Play size={19}/><strong>{playing.length}</strong><span>Currently playing</span></div>
        <div><Clock3 size={19}/><strong>{n(playing.reduce((s,g)=>s+g.hours,0))}h</strong><span>Logged across playing games</span></div>
        <div><Trophy size={19}/><strong>{playing.filter(g=>g.favourite).length}</strong><span>Marked favourites</span></div>
      </div>
      <div className="analytics-grid gv-stat-focus-grid">
        <ChartBars title="Time in your current games" rows={playingHours} suffix="h" empty="Log hours for games marked Playing to see them here." onOpen={onOpen}/>
        <ChartBars title="Genres in your rotation" rows={playingGenres} empty="Mark games Playing and give them genres to see patterns."/>
      </div>
      {!!playing.length&&<p className="gv-stat-explainer">Select a game's title in the chart to open its profile. Logged hours reflect your game records, not live PSN activity.</p>}
    </>}
    {focus==='completed'&&<>
      <div className="gv-stat-highlights">
        <div><Check size={19}/><strong>{stats.completedCount}</strong><span>Games completed</span></div>
        <div><Trophy size={19}/><strong>{stats.completionPercent}%</strong><span>Collection finished</span></div>
        <div><CalendarDays size={19}/><strong>{stats.datedCompletions}</strong><span>Recorded finish dates</span></div>
      </div>
      <div className="analytics-grid gv-stat-focus-grid">
        <ChartBars title="Your highest-rated completions" rows={completedScores} suffix="/10" empty="Rate completed games to see them here." onOpen={onOpen}/>
        <ChartBars title="Finishes by month (last 12 months)"
          rows={stats.completionMonths.filter(m=>m.count>0).map(m=>({key:m.label,value:m.count}))}
          maxCount={12} empty="Add completion dates to finished games to build this timeline."/>
      </div>
      <p className="gv-stat-explainer">The monthly chart counts only games marked Completed with a recorded date. It doesn't infer completion dates from when you edited a game.</p>
    </>}
    {focus==='hours'&&<>
      <div className="gv-stat-highlights">
        <div><Clock3 size={19}/><strong>{n(stats.loggedHours)}h</strong><span>Game-level hours</span></div>
        <div><Play size={19}/><strong>{n(stats.runHours)}h</strong><span>Hours in separately logged runs</span></div>
        <div><Gamepad2 size={19}/><strong>{overallHours.length}</strong><span>Games with time logged</span></div>
      </div>
      <div className="analytics-grid gv-stat-focus-grid">
        <ChartBars title="Most played games" rows={overallHours} suffix="h" maxCount={10} empty="Record hours in your games to chart your playtime." onOpen={onOpen}/>
        <ChartBars title="Playtime by genre" rows={hoursByGenre} suffix="h" maxCount={10} empty="Add genres and playtime to see your top categories."/>
      </div>
      <p className="gv-stat-explainer">Game-level time may already include your playthroughs, so the separate run total isn't added to it. A game with multiple genres contributes its hours to each genre; genre totals shouldn't be summed.</p>
    </>}
  </section>;
}
