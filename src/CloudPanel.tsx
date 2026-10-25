import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ArrowDownUp, CheckCircle, Cloud, CloudOff, LoaderCircle, LogIn, LogOut, RefreshCcw, ShieldCheck, X } from 'lucide-react';
import { listPending } from './db';
import { checkAccountIdentity, makeCloudClient, readCloudConfig, saveCloudConfig, settleConflict, syncLibrary, type CloudConfig, type CloudStatus, type SyncConflict } from './cloudSync';
import type { Game } from './types';

export default function CloudPanel({
  onClose, onRemote, onNotify
}: { onClose: () => void; onRemote: (games: Game[]) => void; onNotify: (message: string) => void }) {
  const [config, setConfig] = useState<CloudConfig | null>(readCloudConfig);
  const [project, setProject] = useState(config?.url || '');
  const [key, setKey] = useState(config?.key || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [client, setClient] = useState<SupabaseClient | null>(() => config ? makeCloudClient(config) : null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<CloudStatus>('signed-out');
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState('');
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const busy = useRef(false);
  const workingRef = useRef(false);
  const syncRef = useRef<() => void>(() => {});
  const notify = useRef(onNotify); const localChange = useRef(onRemote);
  notify.current = onNotify; localChange.current = onRemote;
  const refreshPending = useCallback(() => {listPending().then(p => setPending(p.length)).catch(()=>{});},[]);

  useEffect(() => {
    if (!client) return;
    let alive=true;
    client.auth.getUser().then(({ data, error }) => {
      if (!alive) return;
      if (error || !data.user) { setUser(null); setStatus('signed-out'); return; }
      setUser(data.user);
    }).catch(err => { if(alive)setError(String(err)); });
    const { data: { subscription } } = client.auth.onAuthStateChange((_,session) => {
      if (alive) setUser(session?.user || null);
    });
    return () => { alive=false; subscription.unsubscribe(); };
  },[client]);

  const runSync = useCallback(async () => {
    if (!client || !config || !user || busy.current) return;
    if (!navigator.onLine) {setStatus('offline');refreshPending();return;}
    busy.current=true;setStatus('syncing');setError('');
    try {
      const result=await syncLibrary(client,config.url,user,games=>localChange.current(games));
      setPending(result.pending);
      setConflicts(result.conflicts);
      setLastSync(new Date().toISOString());
      setStatus(result.conflicts.length ? 'attention' : 'synced');
      if (result.conflicts.length) setError(result.conflicts.length + ' game(s) need a sync conflict decision.');
      if (result.uploaded || result.downloaded) notify.current('Cloud sync: '+result.uploaded+' uploaded, '+result.downloaded+' downloaded.');
    } catch (err) {
      setError(err instanceof Error?err.message:String(err));setStatus('error');
      refreshPending();
    } finally {busy.current=false;}
  },[client,config,user,refreshPending]);

  useEffect(()=>{syncRef.current=()=>{void runSync()};},[runSync]);
  useEffect(()=>{
    refreshPending();
    const update=()=>{refreshPending();if(navigator.onLine && !document.hidden)syncRef.current();};
    const focus=()=>{if(!document.hidden)syncRef.current();};
    window.addEventListener('gamevault:local-change',update);
    window.addEventListener('online',update);
    document.addEventListener('visibilitychange',focus);
    const timer=window.setInterval(()=>{if(!document.hidden && navigator.onLine)syncRef.current();},30000);
    return ()=>{window.removeEventListener('gamevault:local-change',update);window.removeEventListener('online',update);document.removeEventListener('visibilitychange',focus);window.clearInterval(timer);};
  },[refreshPending]);
  useEffect(()=>{if(client && user)void runSync();},[client,user,runSync]);

  function configure() {
    try {
      const saved=saveCloudConfig({url:project,key});
      setConfig(saved);
      setClient(makeCloudClient(saved));
      setError('');setUser(null);setStatus('signed-out');
    } catch(err) {setError(err instanceof Error?err.message:String(err));}
  }
  async function signIn(e:React.FormEvent) {
    e.preventDefault();
    if(!client||!config||workingRef.current)return;
    workingRef.current=true;setError('');
    try {
      const {data,error}=await client.auth.signInWithPassword({email:email.trim(),password});
      if(error)throw error;
      if(!data.user)throw Error('No signed-in user was returned.');
      try {checkAccountIdentity(config.url,data.user);}
      catch(err) {await client.auth.signOut();throw err;}
      setPassword('');setUser(data.user);
    } catch(err) {setError(err instanceof Error?err.message:String(err));}
    finally {workingRef.current=false;}
  }
  async function signOut() {
    if(!client)return;
    const {error}=await client.auth.signOut();
    if(error) {setError(error.message);return;}
    setUser(null);setStatus('signed-out');setConflicts([]);
    onNotify('Signed out. Your device library remains available offline.');
  }
  async function resolveConflict(conflict:SyncConflict,choice:'local'|'cloud') {
    if(!client||!config||!user ||busy.current)return;
    busy.current=true;setError('');
    try {
      await settleConflict(client,config.url,user,conflict,choice);
      const rest=conflicts.filter(c=>c.id!==conflict.id);
      setConflicts(rest);
      if(!rest.length)setStatus('synced');
      const {loadGames}=await import('./db');
      localChange.current(await loadGames());
      refreshPending();
    }catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{busy.current=false;}
  }
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="modal cloud-modal" role="dialog" aria-modal="true" aria-label="Cloud sync">
      <header className="modal-heading"><div><span className="eyebrow">CROSS-DEVICE STORAGE</span><h2>Cloud sync</h2></div><button className="icon-btn" aria-label="Close cloud sync" onClick={onClose}><X size={20}/></button></header>
      <div className="cloud-body">
        <div className="settings-callout"><ShieldCheck size={22}/><div><strong>One account, your devices.</strong><p>Optional Supabase sync. Your games always remain stored on this device, even while signed out or offline. The same project and account can be used by Sidequest, but with a separate GameVault table.</p></div></div>
        <div className="cloud-status-line"><div><Cloud size={19}/><strong>{status==='syncing'?'Syncing…':!user?'Not signed in':status==='synced'?'Up to date':status==='attention'?'Needs your decision':status==='offline'?'Offline — saved locally':'Needs attention'}</strong></div><span>{pending} queued change{pending===1?'':'s'}</span></div>
        {lastSync && <p className="cloud-small">Last checked: {new Date(lastSync).toLocaleString('en-AU')}</p>}
        {error && <p className="cloud-error" role="alert">{error}</p>}
        {!config ? <div className="cloud-section">
          <h3>1. Connect Supabase</h3><p>Use your existing Sidequest project's public URL and publishable key. Before signing in, run GameVault's separate SQL setup in Supabase. Don't paste secret/service_role keys.</p>
          <label className="field">Project URL<input type="url" placeholder="https://your-project.supabase.co" value={project} onChange={e=>setProject(e.target.value)}/></label>
          <label className="field">Publishable / anon key<input type="password" placeholder="sb_publishable_..." value={key} onChange={e=>setKey(e.target.value)}/></label>
          <button className="btn btn-primary" onClick={configure}>Save public project settings</button>
          <a className="cloud-doclink" target="_blank" rel="noopener noreferrer" href="https://github.com/258t6fr4ds-create/backloggd-ripoff-lol/blob/main/SYNC_SETUP.md">Open setup guide ↗</a>
        </div> : !user ? <div className="cloud-section">
          <h3>2. Sign in</h3><p>Sign in with the same Supabase app account used for Sidequest, not your GitHub password.</p>
          <form onSubmit={signIn} className="cloud-login">
            <label className="field">Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
            <label className="field">Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
            <button type="submit" className="btn btn-primary"><LogIn size={16}/> Sign in to sync</button>
          </form>
          <button className="cloud-linkbutton" onClick={()=>{setConfig(null);setClient(null);setUser(null);setStatus('signed-out');}}>Change project configuration</button>
        </div> : <div className="cloud-section">
          <div className="cloud-account"><div><strong>{user.email ?? 'Signed in'}</strong><p>Account sync · GameVault only</p></div><button className="btn btn-subtle" onClick={signOut}><LogOut size={15}/> Sign out</button></div>
          <button className="btn btn-primary" onClick={()=>void runSync()} disabled={status==='syncing'}>{status==='syncing'?<LoaderCircle size={16} className="spin"/>:<RefreshCcw size={16}/>} Sync now</button>
          <p className="cloud-small">Checks when the app opens, returns to the foreground, reconnects and every 30 seconds while open. Background sync after closing the app is not guaranteed.</p>
        </div>}
        {conflicts.length>0 && <div className="cloud-conflicts"><h3><ArrowDownUp size={18}/> Resolve {conflicts.length} conflict{conflicts.length===1?'':'s'}</h3><p>The same game changed independently. Neither copy will be overwritten without your choice.</p>
        {conflicts.map(c=><div className="cloud-conflict" key={c.id}><strong>{c.local?.title||c.remote?.title||'Deleted game'}</strong><small>Choose which version to keep. Consider exporting your library first.</small>
        <div><button className="btn btn-subtle" onClick={()=>void resolveConflict(c,'local')}>Keep this device</button><button className="btn btn-subtle" onClick={()=>void resolveConflict(c,'cloud')}>Use cloud</button></div></div>)}</div>}
        <div className="cloud-footer"><CheckCircle size={16}/><span>GameVault's cloud table is separate from Sidequest. Export JSON backups regularly as a second safeguard.</span></div>
      </div>
    </section>
  </div>;
}
