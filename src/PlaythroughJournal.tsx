import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, CalendarDays, Check, ChevronDown, Clock3, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { Game, GameJournalEntry, GamePlaythrough, PlaythroughStatus } from './types';

type RunForm = {
  title: string;
  status: PlaythroughStatus;
  startDate: string;
  endDate: string;
  hours: string;
  notes: string;
};
type JournalForm = {
  title: string;
  body: string;
  playthroughId: string;
};

const LIMIT_RUNS = 50;
const LIMIT_ENTRIES = 200;
const SAFE_CLOUD_RECORD_BYTES = 180000;
function safeToSync(game: Game, update: Partial<Game>): boolean {
  try { return new TextEncoder().encode(JSON.stringify({...game,...update})).byteLength < SAFE_CLOUD_RECORD_BYTES; }
  catch { return false; }
}
const emptyRun: RunForm = {
  title:'', status:'in-progress', startDate:'', endDate:'', hours:'0', notes:''
};
const emptyJournal: JournalForm = { title:'', body:'', playthroughId:'' };
const runNames: Record<PlaythroughStatus,string> = {
  'in-progress':'In progress', completed:'Completed', paused:'On hold', abandoned:'Abandoned'
};
const fmtDate = (date:string) => {
  if (!date) return 'Unspecified';
  const parsed = new Date(date + 'T12:00:00');
  return Number.isNaN(parsed.getTime()) ? 'Unspecified' : parsed.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
};

export default function PlaythroughJournal({
  game, onUpdate, initialSection = 'runs', embedded = false
}:{
  game:Game;
  onUpdate:(patch:Partial<Game>)=>Promise<boolean>;
  initialSection?: 'runs' | 'journal';
  embedded?: boolean;
}) {
  const runs=game.playthroughs??[];
  const entries=game.journal??[];
  // History is a compact disclosure until it contains actual user data.
  // This keeps empty playthrough placeholders away from DLC workflows.
  const [expanded,setExpanded]=useState(() => embedded || runs.length>0 || entries.length>0);
  const [section,setSection]=useState<'runs'|'journal'>(initialSection);
  const [editRunId,setEditRunId]=useState<string|null>(null);
  const [showRunEditor,setShowRunEditor]=useState(false);
  const [runDraft,setRunDraft]=useState<RunForm>({...emptyRun});
  const [editJournalId,setEditJournalId]=useState<string|null>(null);
  const [showJournalEditor,setShowJournalEditor]=useState(false);
  const [journalDraft,setJournalDraft]=useState<JournalForm>({...emptyJournal});
  const [journalFilter,setJournalFilter]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const logHours=runs.reduce((sum,run)=>sum+run.hours,0);
  const sortedRuns=useMemo(()=>[...runs].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),[game.playthroughs]);
  const sortedEntries=useMemo(()=>[...entries]
    .filter(e=>!journalFilter||e.playthroughId===journalFilter)
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),[game.journal,journalFilter]);

  function openNewRun() {
    setEditRunId(null);
    setRunDraft({...emptyRun,title:'Playthrough '+(runs.length+1)});
    setShowRunEditor(true);setMessage('');
  }
  function openRunEditor(run:GamePlaythrough) {
    setEditRunId(run.id);
    setRunDraft({title:run.title,status:run.status,startDate:run.startDate,endDate:run.endDate,
      hours:String(run.hours),notes:run.notes});
    setShowRunEditor(true);setMessage('');
  }
  function openNewJournal() {
    setEditJournalId(null);
    setJournalDraft({...emptyJournal,playthroughId:journalFilter});
    setShowJournalEditor(true);setMessage('');
  }
  function openJournalEditor(entry:GameJournalEntry) {
    setEditJournalId(entry.id);
    setJournalDraft({title:entry.title,body:entry.body,playthroughId:entry.playthroughId??''});
    setShowJournalEditor(true);setMessage('');
  }
  async function saveRun(event:FormEvent) {
    event.preventDefault();
    if(busy)return;
    const title=runDraft.title.trim();
    const hours=Number(runDraft.hours);
    if(!title||!Number.isFinite(hours)||hours<0||hours>1000000) {
      setMessage('Enter a title and a valid playtime (0 to 1,000,000 hours).');return;
    }
    if(runDraft.startDate && runDraft.endDate && runDraft.endDate<runDraft.startDate) {
      setMessage('The completion date cannot precede the start date.');return;
    }
    const original=runs.find(run=>run.id===editRunId);
    if(!original && runs.length>=LIMIT_RUNS) {setMessage('Maximum 50 playthroughs per game.');return;}
    const now=new Date().toISOString();
    const next:GamePlaythrough={
      id:original?.id??crypto.randomUUID(),title:title.slice(0,100),status:runDraft.status,
      startDate:runDraft.startDate,endDate:runDraft.endDate,hours,notes:runDraft.notes.slice(0,4000),
      createdAt:original?.createdAt??now,updatedAt:now
    };
    const update:Partial<Game>={playthroughs:original
      ? runs.map(run=>run.id===original.id?next:run)
      : [...runs,next]};
    if(!safeToSync(game,update)){
      setMessage('This game record is near the cloud sync size limit. Shorten existing notes or journal entries before saving.');
      return;
    }
    setBusy(true);setMessage('');
    try {
      const ok=await onUpdate(update);
      if(ok){setShowRunEditor(false);setMessage(original?'Playthrough updated.':'Playthrough added.');}
      else setMessage('Could not save playthrough.');
    }catch {setMessage('Could not save playthrough.');}
    finally{setBusy(false);}
  }
  async function deleteRun(run:GamePlaythrough) {
    const linked=entries.filter(e=>e.playthroughId===run.id).length;
    if(!window.confirm('Remove "'+run.title+'"?'+(linked?' '+linked+' journal entries will remain but become unlinked.':'')))return;
    setBusy(true);setMessage('');
    try {
      const updatedEntries=entries.map(e=>e.playthroughId===run.id?{...e,playthroughId:''}:e);
      const ok=await onUpdate({playthroughs:runs.filter(r=>r.id!==run.id),journal:updatedEntries});
      if(ok){setJournalFilter('');setMessage('Playthrough removed. Journal entries preserved.');}
      else setMessage('Could not remove playthrough.');
    }catch{setMessage('Could not remove playthrough.');}
    finally{setBusy(false);}
  }
  async function saveJournal(event:FormEvent) {
    event.preventDefault();
    if(busy)return;
    const body=journalDraft.body.trim();
    if(!body){setMessage('Write a note before saving.');return;}
    const original=entries.find(entry=>entry.id===editJournalId);
    if(!original&&entries.length>=LIMIT_ENTRIES){setMessage('Maximum 200 journal entries per game.');return;}
    const now=new Date().toISOString();
    const updated:GameJournalEntry={
      id:original?.id??crypto.randomUUID(),title:journalDraft.title.trim().slice(0,100),
      body:body.slice(0,6000),
      playthroughId:runs.some(r=>r.id===journalDraft.playthroughId)?journalDraft.playthroughId:'',
      createdAt:original?.createdAt??now,updatedAt:now
    };
    const update:Partial<Game>={journal:original?entries.map(e=>e.id===original.id?updated:e):[...entries,updated]};
    if(!safeToSync(game,update)){
      setMessage('This game record is near the cloud sync size limit. Shorten the entry or older notes before saving.');
      return;
    }
    setBusy(true);setMessage('');
    try{
      const ok=await onUpdate(update);
      if(ok){setShowJournalEditor(false);setMessage(original?'Journal entry updated.':'Journal entry saved.');}
      else setMessage('Could not save journal entry.');
    }catch{setMessage('Could not save journal entry.');}
    finally{setBusy(false);}
  }
  async function deleteJournal(entry:GameJournalEntry) {
    if(!window.confirm('Delete this journal entry permanently?'))return;
    setBusy(true);setMessage('');
    try{
      const ok=await onUpdate({journal:entries.filter(e=>e.id!==entry.id)});
      setMessage(ok?'Journal entry deleted.':'Could not delete journal entry.');
    }catch{setMessage('Could not delete journal entry.');}
    finally{setBusy(false);}
  }

  return <section className={'run-journal-panel'+(embedded?' run-journal-embedded':'')} aria-label={'Playthroughs and journal for '+game.title}>
    {!embedded&&<div className="run-journal-heading">
      <div><span className="eyebrow">YOUR PLAY HISTORY</span><h3>Playthroughs & journal</h3></div>
      <div className="run-journal-heading-actions">
        <div className="run-journal-summary"><span>{runs.length} runs</span><span>{entries.length} entries</span></div>
        <button className="run-journal-toggle" type="button"
          aria-expanded={expanded} aria-controls={'run-journal-content-'+game.id}
          onClick={()=>setExpanded(value=>!value)}>
          {expanded?'Collapse':'Open history'}
          <ChevronDown size={16} className={expanded?'run-journal-toggle-open':''}/>
        </button>
      </div>
    </div>}
    {(embedded||expanded)&&<div id={'run-journal-content-'+game.id} className="run-journal-content">
    {!embedded&&<div className="run-journal-tabs" role="tablist" aria-label="Game history">
      <button role="tab" aria-selected={section==='runs'} className={section==='runs'?'active':''} onClick={()=>{setSection('runs');setShowJournalEditor(false);}}>
        <Clock3 size={17}/> Playthroughs <span>{runs.length}</span>
      </button>
      <button role="tab" aria-selected={section==='journal'} className={section==='journal'?'active':''} onClick={()=>{setSection('journal');setShowRunEditor(false);}}>
        <BookOpen size={17}/> Journal <span>{entries.length}</span>
      </button>
    </div>}
    {message && <p className="run-journal-message" role="status">{message}</p>}
    {section==='runs'&&<div role="tabpanel">
      <div className="run-journal-intro">
        <p>Keep each replay separate, with its own dates, outcome and hours.</p>
        <button className="btn btn-subtle" onClick={openNewRun} disabled={busy||runs.length>=LIMIT_RUNS}><Plus size={16}/> New run</button>
      </div>
      {showRunEditor&&<form className="run-journal-editor" onSubmit={saveRun}>
        <div className="run-editor-header"><strong>{editRunId?'Edit playthrough':'New playthrough'}</strong><button className="icon-btn" type="button" onClick={()=>setShowRunEditor(false)} aria-label="Close playthrough editor"><X size={18}/></button></div>
        <div className="run-fields">
          <label>Run name <input required maxLength={100} value={runDraft.title} onChange={e=>setRunDraft(d=>({...d,title:e.target.value}))} placeholder="First playthrough, NG+, Hardcore…"/></label>
          <label>Status <select value={runDraft.status} onChange={e=>setRunDraft(d=>({...d,status:e.target.value as PlaythroughStatus}))}>
            {Object.entries(runNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Started <input type="date" value={runDraft.startDate} onChange={e=>setRunDraft(d=>({...d,startDate:e.target.value}))}/></label>
          <label>Finished <input type="date" value={runDraft.endDate} onChange={e=>setRunDraft(d=>({...d,endDate:e.target.value}))}/></label>
          <label>Hours in this run <input type="number" min={0} max={1000000} step="0.1" value={runDraft.hours} onChange={e=>setRunDraft(d=>({...d,hours:e.target.value}))}/></label>
          <label className="run-span-two">Run notes <textarea maxLength={4000} rows={3} value={runDraft.notes} onChange={e=>setRunDraft(d=>({...d,notes:e.target.value}))} placeholder="Build, choices, difficulty, ending…"/></label>
        </div>
        <div className="run-editor-actions"><button className="btn btn-ghost" type="button" onClick={()=>setShowRunEditor(false)}>Cancel</button><button className="btn btn-primary" type="submit" disabled={busy}><Save size={16}/>{busy?'Saving…':'Save run'}</button></div>
      </form>}
      {!runs.length&&!showRunEditor&&<p className="run-journal-quiet">No playthroughs recorded yet. Use New run when you're ready.</p>}
      <div className="run-list">{sortedRuns.map((run,i)=><article key={run.id} className="run-card">
        <div className="run-card-top"><div><span className="run-index">RUN {runs.length-i}</span><h4>{run.title}</h4></div><span className={'run-status run-status-'+run.status}>{runNames[run.status]}</span></div>
        <div className="run-card-data"><span><CalendarDays size={14}/> {fmtDate(run.startDate)}{run.endDate?' → '+fmtDate(run.endDate):''}</span><span><Clock3 size={14}/> {run.hours.toLocaleString('en-AU',{maximumFractionDigits:1})}h</span></div>
        {run.notes&&<p className="run-card-notes">{run.notes}</p>}
        <div className="run-card-actions"><button onClick={()=>{setSection('journal');setJournalFilter(run.id);setShowJournalEditor(false);}}><BookOpen size={14}/> Journal</button><button disabled={busy} onClick={()=>openRunEditor(run)}><Pencil size={14}/> Edit</button><button disabled={busy} onClick={()=>void deleteRun(run)}><Trash2 size={14}/> Remove</button></div>
      </article>)}</div>
      {!!runs.length&&<p className="run-journal-fineprint">Run-specific time: {logHours.toLocaleString('en-AU',{maximumFractionDigits:1})}h. Your older game-level hours remain separate to avoid double-counting in overall statistics.</p>}
    </div>}
    {section==='journal'&&<div role="tabpanel">
      <div className="run-journal-intro">
        <p>Keep your thoughts, memorable moments and review notes for each adventure.</p>
        <button className="btn btn-subtle" onClick={openNewJournal} disabled={busy||entries.length>=LIMIT_ENTRIES}><Plus size={16}/> Write entry</button>
      </div>
      {runs.length>0&&<label className="journal-filter">Show entries <select value={journalFilter} onChange={e=>setJournalFilter(e.target.value)}>
        <option value="">All entries</option>{runs.map(run=><option key={run.id} value={run.id}>{run.title}</option>)}
      </select><ChevronDown size={15}/></label>}
      {showJournalEditor&&<form className="run-journal-editor" onSubmit={saveJournal}>
        <div className="run-editor-header"><strong>{editJournalId?'Edit journal entry':'New journal entry'}</strong><button className="icon-btn" type="button" aria-label="Close journal editor" onClick={()=>setShowJournalEditor(false)}><X size={18}/></button></div>
        <div className="run-fields">
          <label className="run-span-two">Entry title <input maxLength={100} value={journalDraft.title} onChange={e=>setJournalDraft(d=>({...d,title:e.target.value}))} placeholder="A moment worth remembering… (optional)"/></label>
          {runs.length>0&&<label className="run-span-two">Related playthrough <select value={journalDraft.playthroughId} onChange={e=>setJournalDraft(d=>({...d,playthroughId:e.target.value}))}>
            <option value="">General game notes</option>{runs.map(run=><option key={run.id} value={run.id}>{run.title}</option>)}
          </select></label>}
          <label className="run-span-two">Your thoughts <textarea required maxLength={6000} rows={5} value={journalDraft.body} onChange={e=>setJournalDraft(d=>({...d,body:e.target.value}))} placeholder="Story choices, favourite scenes, thoughts after finishing…"/></label>
        </div>
        <div className="run-editor-actions"><button className="btn btn-ghost" type="button" onClick={()=>setShowJournalEditor(false)}>Cancel</button><button className="btn btn-primary" type="submit" disabled={busy}><Check size={16}/>{busy?'Saving…':'Save entry'}</button></div>
      </form>}
      {!sortedEntries.length&&!showJournalEditor&&<p className="run-journal-quiet">{journalFilter?'No notes for this run yet.':'No journal entries yet. Use Write entry to start.'}</p>}
      <div className="journal-list">{sortedEntries.map(entry=><article key={entry.id} className="journal-card">
        <div className="journal-card-heading"><div><span className="run-index">{new Date(entry.createdAt).toLocaleDateString('en-AU')}</span><h4>{entry.title||'Untitled entry'}</h4></div><div className="journal-card-actions"><button onClick={()=>openJournalEditor(entry)} disabled={busy} aria-label="Edit journal entry"><Pencil size={16}/></button><button onClick={()=>void deleteJournal(entry)} disabled={busy} aria-label="Delete journal entry"><Trash2 size={16}/></button></div></div>
        {entry.playthroughId&&<span className="journal-related">{runs.find(r=>r.id===entry.playthroughId)?.title||'Past playthrough'}</span>}
        <p className="journal-body">{entry.body}</p>
      </article>)}</div>
    </div>}
    </div>}
  </section>;
}
