import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * The installed iOS PWA can continue running older JS after a new service
 * worker activates. An explicit reload keeps in-progress edits safe.
 */
export default function UpdateNotice(){
  const [ready,setReady]=useState(false);
  const [dismissed,setDismissed]=useState(false);
  useEffect(()=>{
    if(!('serviceWorker' in navigator))return;
    let mounted=true;
    // Ignore an initial installation, but report a replacement of an
    // already-controlled app (including changes made in another tab).
    let hadController=Boolean(navigator.serviceWorker.controller);
    const controllerChanged=()=>{
      if(mounted && hadController){setReady(true);setDismissed(false);}
      hadController=true;
    };
    const check=()=>{
      if(document.visibilityState==='hidden')return;
      void navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).then(reg=>{
        if(!reg||!mounted)return;
        if(reg.waiting && navigator.serviceWorker.controller){
          setReady(true);
          setDismissed(false);
        }
        return reg.update().catch(()=>{ /* Offline users can continue normally */ });
      }).catch(()=>{});
    };
    const foreground=()=>{if(document.visibilityState==='visible')check();};
    navigator.serviceWorker.addEventListener('controllerchange',controllerChanged);
    document.addEventListener('visibilitychange',foreground);
    window.addEventListener('focus',check);
    window.addEventListener('online',check);
    check();
    return ()=>{
      mounted=false;
      navigator.serviceWorker.removeEventListener('controllerchange',controllerChanged);
      document.removeEventListener('visibilitychange',foreground);
      window.removeEventListener('focus',check);
      window.removeEventListener('online',check);
    };
  },[]);
  if(!ready||dismissed)return null;
  return <aside className="gv-update-notice" role="status" aria-label="GameVault update available">
    <RefreshCw size={19}/>
    <div><strong>GameVault update available</strong><span>Reload to use the latest version. Your saved games stay safe.</span></div>
    <button className="gv-update-reload" type="button" onClick={()=>window.location.reload()}>Reload now</button>
    <button className="gv-update-dismiss" type="button" aria-label="Dismiss update notice" onClick={()=>setDismissed(true)}><X size={18}/></button>
  </aside>;
}
