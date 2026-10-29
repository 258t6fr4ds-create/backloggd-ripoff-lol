import { useMemo, useState } from 'react';
import { Activity, CalendarDays, Clock3, Flame, Target } from 'lucide-react';
import type { Game } from './types';

const display=(n:number)=>n.toLocaleString('en-AU',{maximumFractionDigits:1});
function monthKey(date:string){return date.slice(0,7);}
const dateToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
export default function ActivityInsights({games,onOpen}:{
  games:Game[];onOpen:(id:string)=>void
}){
  const [range,setRange]=useState<3|6|12>(6);
  const data=useMemo(()=>{
    const sessions=games.flatMap(game=>(game.sessions??[]).map(item=>({...item,game})));
    const totalMinutes=sessions.reduce((sum,item)=>sum+item.minutes,0);
    const days=[...new Set(sessions.map(s=>s.date))].sort().reverse();
    const today=dateToday();
    const yesterday=new Date(today+'T12:00:00');yesterday.setDate(yesterday.getDate()-1);
    const yesterdayStr=[yesterday.getFullYear(),String(yesterday.getMonth()+1).padStart(2,'0'),String(yesterday.getDate()).padStart(2,'0')].join('-');
    let cursor=days.includes(today)?today:days.includes(yesterdayStr)?yesterdayStr:'';
    let streak=0;const all=new Set(days);
    while(cursor&&all.has(cursor)){
      streak++;
      const date=new Date(cursor+'T12:00:00');date.setDate(date.getDate()-1);
      cursor=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    }
    const perGame=games.map(g=>({game:g,minutes:(g.sessions??[]).reduce((sum,s)=>sum+s.minutes,0)}))
      .filter(g=>g.minutes>0).sort((a,b)=>b.minutes-a.minutes);
    const progress=games.filter(g=>g.progress!==null&&g.progress!==undefined)
      .sort((a,b)=>(b.progress??0)-(a.progress??0));
    const high=games.filter(g=>g.status==='backlog'||g.status==='paused').filter(g=>(g.priority??0)>=4);
    return {sessions,days,totalMinutes,streak,perGame,progress,high};
  },[games]);
  const months=useMemo(()=>{
    const now=new Date();
    const ms=Array.from({length:range},(_,i)=>{
      const date=new Date(now.getFullYear(),now.getMonth()-(range-1-i),1);
      const key=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
      const minutes=data.sessions.filter(s=>monthKey(s.date)===key).reduce((sum,s)=>sum+s.minutes,0);
      return {key,label:date.toLocaleDateString('en-AU',{month:'short'}),minutes};
    });
    return ms;
  },[range,data.sessions]);
  const max=Math.max(1,...months.map(m=>m.minutes));
  return <div className="gv-activity-dashboard" aria-label="Gaming session and progress insights">
    <section className="panel">
      <div className="gv-activity-heading"><div><span className="eyebrow">YOUR PLAY DIARY</span><h2>Gaming activity</h2><p>Only sessions you have actually logged. No invented PSN activity.</p></div><Activity size={23}/></div>
      <div className="gv-activity-metrics">
        <div><CalendarDays size={17}/><strong>{data.sessions.length}</strong><span>Sessions recorded</span></div>
        <div><Clock3 size={17}/><strong>{display(data.totalMinutes/60)}h</strong><span>Session time</span></div>
        <div><Flame size={17}/><strong>{data.streak} days</strong><span>Current logging streak</span></div>
        <div><Target size={17}/><strong>{data.high.length}</strong><span>Priority backlog games</span></div>
      </div>
      <div className="gv-activity-timebar">
        <div className="gv-activity-subhead"><h3>Time recorded by month</h3><div className="gv-activity-range" role="group" aria-label="Activity chart time range">
          {([3,6,12] as const).map(n=><button key={n} className={range===n?'active':''} aria-pressed={range===n} onClick={()=>setRange(n)}>{n}m</button>)}
        </div></div>
        <div className="gv-activity-chart" role="img" aria-label={months.map(m=>m.label+': '+display(m.minutes/60)+' hours').join(', ')}>
          {months.map(m=><div className="gv-activity-month" key={m.key}>
            <strong>{m.minutes?display(m.minutes/60)+'h':'—'}</strong>
            <div className="gv-activity-track"><div style={{height:m.minutes?Math.max(4,100*m.minutes/max)+'%':'0%'}}/></div>
            <span>{m.label}</span>
          </div>)}
        </div>
      </div>
    </section>
    <div className="gv-activity-grid">
      <section className="panel"><div className="gv-activity-subhead"><h3>Most logged in sessions</h3></div>
        {data.perGame.length===0?<p className="empty-inline">Log a gaming session on a game profile to see activity here.</p>:
          <div className="gv-activity-ranking">{data.perGame.slice(0,8).map((row,i)=><button key={row.game.id} onClick={()=>onOpen(row.game.id)}>
            <span>{i+1}</span><strong>{row.game.title}</strong><small>{display(row.minutes/60)}h</small>
          </button>)}</div>}
      </section>
      <section className="panel"><div className="gv-activity-subhead"><h3>Completion progress</h3></div>
        {data.progress.length===0?<p className="empty-inline">Set a game's completion percentage in Edit game to track progress here.</p>:
          <div className="gv-activity-ranking">{data.progress.slice(0,8).map(g=><button key={g.id} onClick={()=>onOpen(g.id)}>
            <strong>{g.title}</strong>
            <span className="gv-activity-progress"><span style={{width:(g.progress??0)+'%'}}/></span><small>{g.progress}%</small>
          </button>)}</div>}
      </section>
    </div>
    <p className="gv-activity-disclaimer">Session totals are a separate log and may overlap with your manually entered game hours. They are not added together. Streaks count consecutive dates with a logged session and are shown for reference, not as a score.</p>
  </div>;
}