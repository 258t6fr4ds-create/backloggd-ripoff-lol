import { useMemo, useState } from 'react';
import { ArrowRight, Clock3, Compass, Flag, Gamepad2, Heart, Shuffle, Sparkles, Star } from 'lucide-react';
import type { Game } from './types';
import { safeCover } from './types';

const eligible=(g:Game)=>g.status==='backlog'||g.status==='paused';
const priority=(g:Game)=>Math.max(0,Math.min(5,Math.floor(g.priority??0)));
const sortGames=(a:Game,b:Game)=>priority(b)-priority(a)||Number(b.favourite)-Number(a.favourite)||
  (a.hours-b.hours)||a.title.localeCompare(b.title);
export default function BacklogCommand({games,onOpen,onStart}:{
  games:Game[];onOpen:(id:string)=>void;onStart:(game:Game)=>Promise<boolean>
}){
  const [level,setLevel]=useState<'all'|'high'|'unstarted'>('all');
  const [pick,setPick]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const backlog=useMemo(()=>games.filter(eligible).sort(sortGames),[games]);
  const filtered=backlog.filter(g=>
    level==='high'?priority(g)>=4:level==='unstarted'?g.hours===0: true
  );
  const selected=filtered.find(g=>g.id===pick)??filtered[0]??null;
  const queuedHours=backlog.reduce((sum,g)=>sum+g.hours,0);
  function surprise(){
    if(!filtered.length)return;
    const ranked=filtered.flatMap(g=>Array.from({length:Math.max(1,priority(g)+1)},()=>g.id));
    const id=ranked[Math.floor(Math.random()*ranked.length)];
    setPick(id);
  }
  async function start(game:Game){
    if(busy)return;
    setBusy(true);
    try{if(await onStart(game))setPick(null);}finally{setBusy(false);}
  }
  return <section className="gv-backlog-command panel" aria-label="Backlog command centre">
    <div className="gv-backlog-head">
      <div><span className="eyebrow">DECIDE WHAT'S NEXT</span><h2>Backlog command centre</h2>
        <p>Prioritise your library and pick your next adventure without adding random games.</p></div>
      <Compass size={24}/>
    </div>
    <div className="gv-backlog-metrics">
      <div><strong>{backlog.length}</strong><span>Waiting games</span></div>
      <div><strong>{backlog.filter(g=>priority(g)>=4).length}</strong><span>High priority</span></div>
      <div><strong>{backlog.filter(g=>g.progress!==null&&g.progress!==undefined&&g.progress>0).length}</strong><span>Already started</span></div>
      <div><strong>{Number(queuedHours.toFixed(1))}h</strong><span>Logged so far</span></div>
    </div>
    <div className="gv-backlog-tools">
      <div className="gv-backlog-segments" role="group" aria-label="Backlog filters">
        <button className={level==='all'?'active':''} aria-pressed={level==='all'} onClick={()=>{setLevel('all');setPick(null);}}>All queued</button>
        <button className={level==='high'?'active':''} aria-pressed={level==='high'} onClick={()=>{setLevel('high');setPick(null);}}>High priority</button>
        <button className={level==='unstarted'?'active':''} aria-pressed={level==='unstarted'} onClick={()=>{setLevel('unstarted');setPick(null);}}>No hours logged</button>
      </div>
      <button className="btn btn-subtle" onClick={surprise} disabled={!filtered.length}><Shuffle size={16}/> Surprise me</button>
    </div>
    {!selected?<p className="gv-backlog-empty">No queued games match this filter. Add games as Backlog or On hold, or set their priority in Edit game.</p>:
      <div className="gv-backlog-feature">
        <div className="gv-backlog-art">
          {safeCover(selected.coverUrl)?<img src={selected.coverUrl} alt="" loading="lazy"/>:<Gamepad2 size={38}/>}
        </div>
        <div className="gv-backlog-selected">
          <span className="eyebrow"><Sparkles size={13}/> {pick?'YOUR RANDOM PICK':'TOP BACKLOG PICK'}</span>
          <h3>{selected.title}</h3>
          <div className="gv-backlog-tags"><span><Flag size={14}/> Priority {priority(selected)||'not set'}/5</span>
            <span><Clock3 size={14}/> {selected.hours}h logged</span>
            {selected.progress!==null&&selected.progress!==undefined&&<span>{selected.progress}% progress</span>}
            {selected.favourite&&<span><Heart size={14}/> Favourite</span>}
          </div>
          <div className="gv-backlog-actions">
            <button className="btn btn-primary" onClick={()=>void start(selected)} disabled={busy}>{busy?'Saving…':'Start playing'} <ArrowRight size={16}/></button>
            <button className="btn btn-subtle" onClick={()=>onOpen(selected.id)}>View details</button>
          </div>
        </div>
      </div>}
    {filtered.length>0&&<div className="gv-backlog-queue">
      <h3>Your priority queue <small>{filtered.length} games</small></h3>
      {filtered.slice(0,12).map((g,i)=><button type="button" key={g.id} className="gv-backlog-queue-row" onClick={()=>{setPick(g.id);onOpen(g.id);}}>
        <span className="gv-backlog-place">{i+1}</span>
        <span className="gv-backlog-name">{g.title}<small>{g.platform||'No platform'}{g.progress!==null&&g.progress!==undefined?' · '+g.progress+'%':''}</small></span>
        {g.rating!==null&&<span className="gv-backlog-rating"><Star size={13} fill="currentColor"/> {g.rating}/10</span>}
        <span className="gv-backlog-priority">P{priority(g)||'—'}</span>
        <ArrowRight size={15}/>
      </button>)}
    </div>}
    <p className="gv-backlog-help">Priorities are set per game from Edit game (0–5). Surprise me weights higher-priority games without hiding the rest. Your choices stay private and are based on your own library.</p>
  </section>;
}