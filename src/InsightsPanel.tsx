import { useMemo, useState } from 'react';
import { Activity, CalendarDays, ChartNoAxesColumn, Clock3, Star } from 'lucide-react';
import type { Game } from './types';
import { buildLibraryInsights, type GenreInsight } from './insights';

const textNumber=(value:number,decimal=0)=>value.toLocaleString('en-AU',{maximumFractionDigits:decimal});
export default function InsightsPanel({games}:{games:Game[]}){
  const data=useMemo(()=>buildLibraryInsights(games),[games]);
  const [genreMeasure,setGenreMeasure]=useState<'count'|'rating'|'hours'>('count');
  const [showGenres,setShowGenres]=useState(7);
  const rows=useMemo(()=>{
    const source=genreMeasure==='rating'?data.genreRows.filter(g=>g.rated>=1):data.genreRows;
    return [...source].sort((a,b)=>{
      if(genreMeasure==='rating')return (b.meanRating??-1)-(a.meanRating??-1)||b.rated-a.rated||a.name.localeCompare(b.name);
      if(genreMeasure==='hours')return b.hours-a.hours||b.count-a.count||a.name.localeCompare(b.name);
      return b.count-a.count||a.name.localeCompare(b.name);
    });
  },[data.genreRows,genreMeasure]);
  const top=rows.slice(0,showGenres);
  const biggestCount=Math.max(1,...top.map(g=>genreMeasure==='hours'?g.hours:genreMeasure==='rating'?g.meanRating??0:g.count));
  const biggestRating=Math.max(1,...data.ratingBands.map(r=>r.count));
  const biggestMonth=Math.max(1,...data.completionMonths.map(m=>m.count));
  const genreValue=(g:GenreInsight)=>genreMeasure==='rating'
    ? (g.meanRating===null?'—':textNumber(g.meanRating,1)+'/10')
    :genreMeasure==='hours'?textNumber(g.hours,1)+'h':String(g.count);
  const genreProgress=(g:GenreInsight)=>{
    const val=genreMeasure==='rating'?g.meanRating??0:genreMeasure==='hours'?g.hours:g.count;
    return 100*val/biggestCount;
  };
  return <div className="deep-insights" aria-label="Detailed game analytics">
    <section className="panel">
      <div className="insights-heading"><div><span className="eyebrow">A CLOSER LOOK</span><h2>Your gaming patterns</h2></div><Activity size={22}/></div>
      <div className="insights-metrics">
        <div><strong>{data.completionPercent}%</strong><span>Library completed</span><small>{data.completedCount} of {data.collectionCount} games</small></div>
        <div><strong>{data.averageRating===null?'—':textNumber(data.averageRating,1)}</strong><span>Average rating</span><small>{data.ratedCount} rated games</small></div>
        <div><strong>{data.medianRating===null?'—':textNumber(data.medianRating,1)}</strong><span>Median rating</span><small>Out of 10</small></div>
        <div><strong>{data.backlogCount}</strong><span>Waiting to play</span><small>Backlog + on hold</small></div>
      </div>
      <p className="insights-explanation">Calculated from your logged games. Wishlist items are excluded from completion and rating statistics; unrecorded ratings aren't treated as zero.</p>
    </section>
    <div className="analytics-grid insights-two-column">
      <section className="panel">
        <div className="section-title small"><div><span className="eyebrow">YOUR COLLECTION</span><h2>Genre breakdown</h2></div></div>
        <div className="insights-segmented" aria-label="Genre sorting">
          <button aria-pressed={genreMeasure==='count'} className={genreMeasure==='count'?'active':''} onClick={()=>{setGenreMeasure('count');setShowGenres(7);}}>Game count</button>
          <button aria-pressed={genreMeasure==='rating'} className={genreMeasure==='rating'?'active':''} onClick={()=>{setGenreMeasure('rating');setShowGenres(7);}}>Avg. rating</button>
          <button aria-pressed={genreMeasure==='hours'} className={genreMeasure==='hours'?'active':''} onClick={()=>{setGenreMeasure('hours');setShowGenres(7);}}>Hours</button>
        </div>
        {top.length>0?
          <div className="insights-bar-list">{top.map(g=><div className="insights-bar-row" key={g.name}>
            <div className="insights-bar-label"><span>{g.name}</span><strong>{genreValue(g)}</strong></div>
            <div className="insights-bar-track"><div className="insights-bar-fill" style={{width:genreProgress(g)+'%'}}/></div>
            {genreMeasure==='rating'&&<small>Based on {g.rated} rated {g.rated===1?'game':'games'}</small>}
          </div>)}</div>
          : <p className="empty-inline">Not enough {genreMeasure==='rating'?'genre ratings':'genre data'} yet. Add genres to your games to see patterns here.</p>}
        {rows.length>showGenres&&<button className="insights-showmore" onClick={()=>setShowGenres(v=>Math.min(rows.length,v+7))}>Show more genres ({rows.length-showGenres} remaining)</button>}
        {genreMeasure==='hours'&&<p className="insights-explanation">Games with more than one genre contribute their logged hours to each genre. These bars should not be summed.</p>}
      </section>
      <section className="panel">
        <div className="section-title small"><div><span className="eyebrow">YOUR OPINIONS</span><h2>Ratings distribution</h2></div><Star size={20}/></div>
        {data.ratedCount>0?<div className="insights-rating-chart">
          {data.ratingBands.map(b=><div className="insights-rating-col" key={b.label}>
            <div className="insights-rating-value">{b.count}</div>
            <div className="insights-rating-track"><div style={{height:(100*b.count/biggestRating)+'%'}}/></div>
            <span>{b.label}</span>
          </div>)}
        </div>:<p className="empty-inline">Rate some games from 0 to 10 to see your score distribution.</p>}
        <p className="insights-explanation">Only your personal scores. Ratings are grouped into ranges; no review-site averages are used.</p>
      </section>
    </div>
    <section className="panel insights-timeline-section">
      <div className="insights-heading"><div><span className="eyebrow">THE LAST 12 MONTHS</span><h2>Completion timeline</h2></div><CalendarDays size={21}/></div>
      <div className="insights-timeline" role="img" aria-label={'Monthly completions in the last 12 months: '+data.completionMonths.map(m=>m.label+' '+m.count).join(', ')}>
        {data.completionMonths.map(month=><div className="insights-month" key={month.key}>
          <strong>{month.count}</strong>
          <div className="insights-month-track"><div style={{height:(month.count?Math.max(6,100*month.count/biggestMonth):0)+'%'}}/></div>
          <span>{month.label}</span>
        </div>)}
      </div>
      <p className="insights-explanation">Counts completed games with an actual completion date in that month, not every game marked Completed. {data.datedCompletions} completed {data.datedCompletions===1?'game has':'games have'} a valid date recorded. Replay completions are tracked separately.</p>
    </section>
    <section className="panel insights-run-section">
      <div className="insights-heading"><div><span className="eyebrow">REPLAY HISTORY</span><h2>Your playthrough records</h2></div><ChartNoAxesColumn size={21}/></div>
      <div className="insights-metrics">
        <div><strong>{data.runs}</strong><span>Runs logged</span></div>
        <div><strong>{data.finishedRuns}</strong><span>Runs completed</span></div>
        <div><strong>{data.journalEntries}</strong><span>Journal entries</span></div>
        <div><strong>{textNumber(data.runHours,1)}h</strong><span>Hours in runs</span></div>
      </div>
      <div className="insights-note"><Clock3 size={17}/> Run hours are not added to your {textNumber(data.loggedHours,1)}h game-level total, because previously logged time could include these runs.</div>
    </section>
  </div>;
}
