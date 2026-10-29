import { useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Plus, Trash2 } from 'lucide-react';
import type { Game, GameSession } from './types';

const localDay=()=>{
  const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
};
function formatTime(minutes:number){
  if(minutes<60)return minutes+' min';
  const h=Math.floor(minutes/60),m=minutes%60;
  return h+'h'+(m?' '+m+'m':'');
}
export default function GameSessions({game,onUpdate}:{
  game:Game;onUpdate:(patch:Partial<Game>)=>Promise<boolean>
}){
  const [date,setDate]=useState(localDay);
  const [minutes,setMinutes]=useState('60');
  const [note,setNote]=useState('');
  const [addHours,setAddHours]=useState(true);
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const items=useMemo(()=>[...(game.sessions??[])].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)),[game.sessions]);
  const total=items.reduce((sum,x)=>sum+x.minutes,0);
  async function save(){
    const duration=Number(minutes);
    if(busy)return;
    if(!Number.isInteger(duration)||duration<1||duration>1440){setMessage('Enter between 1 and 1,440 whole minutes.');return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00'))||date>localDay()){setMessage('Choose a valid date, not in the future.');return;}
    if(items.length>=500){setMessage('Session history is full (500 entries).');return;}
    const nextHours=Number((game.hours+duration/60).toFixed(2));
    if(addHours&&nextHours>1000000){setMessage('Game hours cannot exceed 1,000,000. Uncheck Add to game hours.');return;}
    const item:GameSession={id:crypto.randomUUID(),date,minutes:duration,note:note.trim().slice(0,500),addedToHours:addHours,createdAt:new Date().toISOString()};
    const patch:Partial<Game>={sessions:[...(game.sessions??[]),item]};
    if(addHours)patch.hours=nextHours;
    setBusy(true);setMessage('');
    try{
      if(await onUpdate(patch)){setEditing(false);setNote('');setMinutes('60');setMessage('Session logged.');}
      else setMessage('Could not save session. Try again.');
    }finally{setBusy(false);}
  }
  async function remove(id:string){
    if(busy)return;
    if(!window.confirm('Remove this session entry? Hours already added to the game total will be kept.'))return;
    setBusy(true);setMessage('');
    try{
      if(await onUpdate({sessions:(game.sessions??[]).filter(item=>item.id!==id)}))
        setMessage('Session removed. Existing game hours were not changed.');
      else setMessage('Could not remove session.');
    }finally{setBusy(false);}
  }
  return <section className="gv-session-panel" aria-label={'Gaming sessions for '+game.title}>
    <div className="gv-session-head">
      <div><span className="eyebrow">ACTIVITY LOG</span><h3>Gaming sessions</h3><p>Track when you played, how long, and what happened.</p></div>
      <button className="btn btn-subtle" onClick={()=>setEditing(v=>!v)} aria-expanded={editing}><Plus size={16}/>{editing?'Close form':'Log session'}</button>
    </div>
    <div className="gv-session-summary">
      <span><CalendarDays size={16}/> {items.length} {items.length===1?'session':'sessions'}</span>
      <span><Clock3 size={16}/> {formatTime(total)} recorded</span>
    </div>
    {editing&&<form className="gv-session-form" onSubmit={e=>{e.preventDefault();void save();}}>
      <label>Date <input type="date" max={localDay()} value={date} onChange={e=>setDate(e.target.value)} required/></label>
      <label>Minutes played <input type="number" min="1" max="1440" step="1" value={minutes} onChange={e=>setMinutes(e.target.value)} required/></label>
      <label className="gv-session-note">Session note (optional) <textarea maxLength={500} rows={2} placeholder="What did you do? Story progress, boss defeated…" value={note} onChange={e=>setNote(e.target.value)}/></label>
      <label className="gv-session-check"><input type="checkbox" checked={addHours} onChange={e=>setAddHours(e.target.checked)}/> Also add this time to the game's total hours</label>
      <button className="btn btn-primary" type="submit" disabled={busy}><Check size={16}/>{busy?'Saving…':'Save session'}</button>
    </form>}
    {message&&<p className="gv-session-message" role="status">{message}</p>}
    {!items.length?<p className="gv-session-empty">No sessions logged yet. Add one after your next play session.</p>:
      <div className="gv-session-list">{items.slice(0,40).map(item=><div className="gv-session-row" key={item.id}>
        <div className="gv-session-date"><strong>{new Date(item.date+'T12:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}</strong><small>{formatTime(item.minutes)} {item.addedToHours?'· added to game hours':'· session only'}</small>{item.note&&<p>{item.note}</p>}</div>
        <button className="icon-btn" type="button" aria-label={'Remove session from '+item.date} disabled={busy} onClick={()=>void remove(item.id)}><Trash2 size={16}/></button>
      </div>)}</div>}
    {items.length>40&&<p className="gv-session-empty">Showing the 40 latest sessions of {items.length}. Older entries remain saved in your backup and cloud sync.</p>}
    <p className="gv-session-footnote">Sessions are stored within your game records, so they sync and export. Removing a session does not reverse game-level hours already added or manually edited.</p>
  </section>;
}