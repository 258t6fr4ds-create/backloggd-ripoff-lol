import type { Game } from './types';

/** Read-only insights. This module never changes saved games or makes network calls. */
export type RecommendationMode = 'taste' | 'recent' | 'overlooked' | 'variety';
export type Recommendation = { game: Game; score: number; reasons: string[] };
export type GenreInsight = { name: string; count: number; rated: number; meanRating: number | null; favourites: number; hours: number };
export type MonthlyCount = { key: string; label: string; count: number };
export type RatingBand = { label: string; count: number };
export type LibraryInsights = {
  total: number;
  collectionCount: number;
  completedCount: number;
  backlogCount: number;
  completionPercent: number;
  ratedCount: number;
  averageRating: number | null;
  medianRating: number | null;
  loggedHours: number;
  runHours: number;
  runs: number;
  finishedRuns: number;
  journalEntries: number;
  genreRows: GenreInsight[];
  ratingBands: RatingBand[];
  completionMonths: MonthlyCount[];
  datedCompletions: number;
  statusRows: { status: Game['status']; count: number }[];
  ratedFavourites: number;
};
const validNumber = (value: number) => Number.isFinite(value) ? value : 0;
const dayFromDate = (input: string | undefined): number | null => {
  if (!input) return null;
  const date = new Date(input);
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : null;
};
const genresOf = (game: Game): string[] => {
  const seen = new Set<string>();
  return (game.genres || '').split(/[,;/|]/).map(g => g.trim()).filter(g => {
    const key = g.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
};
const mean = (items: number[]): number | null => items.length ? items.reduce((a,b)=>a+b,0) / items.length : null;

export function buildLibraryInsights(games: Game[], today = new Date()): LibraryInsights {
  const library = games.filter(g => g.status !== 'wishlist');
  const completed = library.filter(g => g.status === 'completed');
  const ratings = library.map(g=>g.rating).filter((rating): rating is number => rating !== null && Number.isFinite(rating)).sort((a,b)=>a-b);
  const medianRating = ratings.length ? (ratings.length % 2 ? ratings[Math.floor(ratings.length/2)] : (ratings[ratings.length/2-1] + ratings[ratings.length/2])/2) : null;
  const map = new Map<string, { name:string; count:number; ratingSum:number; rated:number; favourites:number; hours:number }>();
  for (const game of library) for (const genre of genresOf(game)) {
    const key = genre.toLocaleLowerCase();
    const row = map.get(key) ?? {name:genre,count:0,ratingSum:0,rated:0,favourites:0,hours:0};
    row.count++;
    if (game.rating !== null && Number.isFinite(game.rating)) {row.rated++;row.ratingSum+=game.rating;}
    if (game.favourite) row.favourites++;
    row.hours+=Math.max(0,validNumber(game.hours));
    map.set(key,row);
  }
  const genreRows = [...map.values()].map(row=>({
    name:row.name,count:row.count,rated:row.rated,
    meanRating:row.rated ? row.ratingSum/row.rated : null,
    favourites:row.favourites,hours:row.hours
  })).sort((a,b)=>b.count-a.count || b.favourites-a.favourites || a.name.localeCompare(b.name));
  const ratingBands: RatingBand[] = [
    {label:'0–2',count:0},{label:'2.5–4',count:0},
    {label:'4.5–6',count:0},{label:'6.5–8',count:0},{label:'8.5–10',count:0}
  ];
  for(const rating of ratings) {
    const index=rating<=2?0:rating<=4?1:rating<=6?2:rating<=8?3:4;
    ratingBands[index].count++;
  }
  // Last 12 calendar months. Count dated completed game records only;
  // replay completion dates are intentionally NOT mixed with game completions.
  const timeline: MonthlyCount[] = [];
  for(let i=11;i>=0;i--) {
    const date=new Date(today.getFullYear(),today.getMonth()-i,1);
    timeline.push({key:date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0'),
      label:date.toLocaleDateString('en-AU',{month:'short',year:'2-digit'}),count:0});
  }
  let datedCompletions=0;
  for(const game of completed) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(game.completedAt))continue;
    const date=new Date(game.completedAt+'T12:00:00');
    if(Number.isNaN(date.getTime()) || date.getFullYear() !== Number(game.completedAt.slice(0,4)) ||
       date.getMonth()+1 !== Number(game.completedAt.slice(5,7)))continue;
    datedCompletions++;
    const key=game.completedAt.slice(0,7);
    const bucket=timeline.find(row=>row.key===key);
    if(bucket)bucket.count++;
  }
  const statuses:Game['status'][]=['playing','backlog','completed','paused','dropped'];
  const runRows=library.flatMap(g=>g.playthroughs??[]);
  return {
    total:games.length,collectionCount:library.length,completedCount:completed.length,
    backlogCount:library.filter(g=>g.status==='backlog'||g.status==='paused').length,
    completionPercent:library.length?Math.round(100*completed.length/library.length):0,
    ratedCount:ratings.length,averageRating:mean(ratings),medianRating,
    loggedHours:library.reduce((sum,g)=>sum+Math.max(0,validNumber(g.hours)),0),
    runHours:runRows.reduce((sum,r)=>sum+Math.max(0,validNumber(r.hours)),0),
    runs:runRows.length,finishedRuns:runRows.filter(r=>r.status==='completed').length,
    journalEntries:games.reduce((sum,g)=>sum+(g.journal?.length??0),0),
    genreRows,ratingBands,completionMonths:timeline,datedCompletions,
    statusRows:statuses.map(status=>({status,count:library.filter(g=>g.status===status).length})),
    ratedFavourites:library.filter(g=>g.favourite&&g.rating!==null).length
  };
}

type Signal = { weight:number; count:number; favouriteCount:number; ratingSum:number; highestRating:number };
function tasteSignals(games: Game[]): Map<string,Signal> {
  const map=new Map<string,Signal>();
  for(const game of games) {
    if(game.status==='wishlist')continue;
    // Only explicit positive preference signals. Never infer tastes from
    // genre presence alone or use popular internet genre stereotypes.
    const rated=game.rating!==null && Number.isFinite(game.rating);
    const rating= rated ? game.rating! : null;
    if (!game.favourite && (rating===null || rating<7))continue;
    for(const genre of genresOf(game)) {
      const key=genre.toLocaleLowerCase();
      const prior=map.get(key)??{weight:0,count:0,favouriteCount:0,ratingSum:0,highestRating:0};
      if(rating!==null && rating>=7) {
        prior.weight += Math.max(0.2,(rating-6)/2);
        prior.count++;prior.ratingSum+=rating;
        prior.highestRating=Math.max(prior.highestRating,rating);
      }
      if(game.favourite) {prior.weight+=1.8;prior.favouriteCount++;}
      map.set(key,prior);
    }
  }
  return map;
}
export function recommendBacklog(games:Game[], mode:RecommendationMode='taste'):Recommendation[] {
  const options=games.filter(g=>g.status==='backlog'||g.status==='paused');
  const signals=tasteSignals(games);
  const availableSignal=signals.size>0;
  const now=Date.now();
  const ages=options.map(g=>dayFromDate(g.addedAt)).filter((d):d is number=>d!==null);
  const old=Math.min(...ages,now);
  const newest=Math.max(...ages,now);
  return options.map(game=>{
    const genres=genresOf(game);
    const weighted=genres.map(name=>({name, signal:signals.get(name.toLocaleLowerCase())}))
      .filter((row):row is {name:string;signal:Signal}=>row.signal!==undefined)
      .sort((a,b)=>b.signal.weight-a.signal.weight);
    // Positive genre matches have a useful, capped impact even if a user
    // rates lots of games in one genre.
    const genreFit=Math.min(16,weighted.slice(0,2).reduce((sum,x)=>sum+Math.min(9,x.signal.weight*2.2),0));
    const added=dayFromDate(game.addedAt)??now;
    const olderFirst=(newest-old)>0 ? (newest-added)/(newest-old) : 0.5;
    const newerFirst=1-olderFirst;
    const ratedMatch=weighted.find(row=>row.signal.count>0);
    const reasons:string[]=[];
    if(ratedMatch) {
      const sample=ratedMatch.signal.count;
      const approx=ratedMatch.signal.ratingSum/sample;
      reasons.push('You rated '+ratedMatch.name+' games '+approx.toFixed(1)+'/10 on average ('+sample+' rated)');
    }else if(weighted[0]?.signal.favouriteCount) {
      reasons.push('Shares a genre with games you marked as favourites');
    }
    if(game.status==='paused') reasons.push('A game you previously put on hold');
    const score=(()=>{
      if(mode==='taste')return genreFit*3.2 + (game.favourite?6:0) + olderFirst*4 + (game.status==='backlog'?1:0);
      if(mode==='recent')return newerFirst*90 + genreFit*0.7;
      if(mode==='overlooked')return olderFirst*90 + genreFit*0.7;
      // Variety deliberately reduces similarity to known favourites, but
      // rewards candidates with genre metadata over unknowns.
      return 20-genreFit*1.2 + (genres.length?4:0) + olderFirst*2;
    })();
    if(mode==='recent')reasons.unshift('One of your more recently added backlog games');
    else if(mode==='overlooked')reasons.unshift('An older entry waiting in your backlog');
    else if(mode==='variety')reasons.unshift(availableSignal&&weighted.length===0 ? 'Different genres from your rated favourites' : 'A change of pace from your usual picks');
    if(!reasons.length)reasons.push(availableSignal?'Based on your saved backlog and genre information':'From your own backlog — rate or favourite games to personalise picks');
    return {game,score,reasons:reasons.slice(0,2)};
  }).sort((a,b)=>b.score-a.score||a.game.title.localeCompare(b.game.title));
}
