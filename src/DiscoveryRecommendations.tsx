import { useMemo, useState } from 'react';
import { ArrowRight, Check, Heart, Shuffle, Sparkles } from 'lucide-react';
import type { Game } from './types';
import { recommendBacklog, type RecommendationMode } from './insights';
import { safeCover, statusLabel } from './types';

const modes:{id:RecommendationMode;title:string;description:string}[]=[
  {id:'taste',title:'For your taste',description:'Based on your ratings and favourites'},
  {id:'recent',title:'Recently added',description:'Your newest backlog entries'},
  {id:'overlooked',title:'Overlooked',description:'Games that have been waiting longest'},
  {id:'variety',title:'Something different',description:'Genres outside your usual favourites'}
];
export default function DiscoveryRecommendations({
  games,onOpen,onStart
}:{
  games:Game[];
  onOpen:(id:string)=>void;
  onStart:(game:Game)=>Promise<boolean>;
}){
  const [mode,setMode]=useState<RecommendationMode>('taste');
  const [offset,setOffset]=useState(0);
  const [count,setCount]=useState(5);
  const [startingId,setStartingId]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const results=useMemo(()=>recommendBacklog(games,mode),[games,mode]);
  const ordered=results.length?results.slice(offset%results.length).concat(results.slice(0,offset%results.length)):[];
  const shown=ordered.slice(0,count);
  const rated=games.filter(g=>g.status!=='wishlist'&&(g.rating!==null||g.favourite)).length;
  async function start(game:Game){
    if(startingId)return;
    setStartingId(game.id);setMessage('');
    try {
      const ok=await onStart(game);
      setMessage(ok?game.title+' is now marked Playing.':'Could not update this game.');
    }catch {setMessage('Could not update game status.');}
    finally {setStartingId(null);}
  }
  return <section className="panel intelligent-discovery" aria-label="Backlog recommendations">
    <div className="insights-heading">
      <div><span className="eyebrow">PERSONALISED FROM YOUR LIBRARY</span><h2>What should you play next?</h2></div>
      <div className="insights-heading-mark"><Sparkles size={21}/></div>
    </div>
    <p className="discovery-method">Only recommends games already in your Backlog or On hold. Rankings are calculated locally from your own records, never from fabricated ratings or outside accounts.</p>
    <div className="discovery-modes" aria-label="Recommendation style">
      {modes.map(item=><button key={item.id} className={mode===item.id?'active':''}
        aria-pressed={mode===item.id} onClick={()=>{setMode(item.id);setOffset(0);setCount(5);setMessage('');}}>
        <strong>{item.title}</strong><small>{item.description}</small>
      </button>)}
    </div>
    {mode==='taste'&&rated===0&&<p className="discovery-hint"><Heart size={16}/> Rate or favourite games you've played to unlock stronger taste-based matches. Until then, picks use the information already in your backlog.</p>}
    {!results.length ? <div className="discovery-no-matches"><Check size={24}/><h3>Your backlog is empty</h3><p>Add games with Backlog or On hold status to see recommendations here.</p></div> : <>
      <div className="discovery-result-heading"><strong>{results.length} candidates in your backlog</strong><button onClick={()=>setOffset(n=>(n+1)%results.length)}><Shuffle size={15}/> Rotate picks</button></div>
      <div className="discovery-cards">
        {shown.map((item,index)=><article className="discovery-card" key={item.game.id}>
          <button className="discovery-cover" onClick={()=>onOpen(item.game.id)} aria-label={'View '+item.game.title}>
            {safeCover(item.game.coverUrl)?<img loading="lazy" src={item.game.coverUrl} alt=""/>:<span className="discovery-cover-placeholder"><Sparkles size={23}/></span>}
          </button>
          <div className="discovery-card-text">
            <div className="discovery-card-badges"><span>#{index+1} PICK</span><span>{statusLabel[item.game.status]}</span></div>
            <h3>{item.game.title}</h3>
            <p className="discovery-card-meta">{[item.game.year,item.game.platform,item.game.genres.split(',')[0]?.trim()].filter(Boolean).join(' · ') || 'From your library'}</p>
            <p className="discovery-reason">{item.reasons[0]}</p>
            {item.reasons[1]&&<p className="discovery-reason subtle">{item.reasons[1]}</p>}
            <div className="discovery-card-actions">
              <button className="btn btn-subtle" onClick={()=>onOpen(item.game.id)}>View details <ArrowRight size={15}/></button>
              <button className="btn btn-primary" disabled={startingId!==null} onClick={()=>void start(item.game)}>
                <Check size={15}/>{startingId===item.game.id?'Saving…':'Start playing'}
              </button>
            </div>
          </div>
        </article>)}
      </div>
      {results.length>shown.length&&<button className="discovery-loadmore" onClick={()=>setCount(n=>Math.min(n+5,results.length))}>Show more matches ({results.length-shown.length} remaining)</button>}
    </>}
    {message&&<p className="discovery-result-message" role="status">{message}</p>}
    <p className="discovery-footnote">Why these picks? Genre overlap with games you rated highly or favourited, alongside how recently you added games. Select another mode to prioritise something else. No gameplay time or ownership is assumed.</p>
  </section>;
}
