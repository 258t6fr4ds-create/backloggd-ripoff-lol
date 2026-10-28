/**
 * Public Wikipedia lookup works directly from GitHub Pages with no account.
 * RAWG lookup requires a user-configured, secret-holding backend proxy.
 * Never commit an API key or ship one in browser code.
 */
export type CatalogueSource = 'wikipedia' | 'rawg';

export interface CatalogueGame {
  id: string;
  title: string;
  year: number | null;
  coverUrl: string;
  genres: string;
  platform: string;
  description: string;
  released?: string;
  developers?: string;
  publishers?: string;
  source: CatalogueSource;
  sourceUrl: string;
  screenshots: string[];
  popularity?: number;
}

const KEY = 'gamevault:rawgProxyUrl';

export function readRawgProxy(): string {
  try { return localStorage.getItem(KEY) ?? ''; }
  catch { return ''; }
}

export function saveRawgProxy(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) {
    try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
    return '';
  }
  let url: URL;
  try { url = new URL(trimmed); }
  catch { throw new Error('Enter a valid HTTPS Worker URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Use an HTTPS URL without credentials, parameters or fragments.');
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error('Use the Worker base URL, without /games or a path.');
  }
  try { localStorage.setItem(KEY, url.origin); }
  catch { throw new Error('Could not save Worker address in this browser.'); }
  return url.origin;
}

type WikiPage = {
  pageid?: number; title?: string; fullurl?: string; extract?: string;
  thumbnail?: { source?: string };
  index?: number;
};
export async function searchWikipedia(query: string, signal?: AbortSignal): Promise<CatalogueGame[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = new URL('https://en.wikipedia.org/w/api.php');
  const params: Record<string, string> = {
    action: 'query', format: 'json', formatversion: '2', origin: '*',
    generator: 'search', gsrsearch: q, gsrnamespace: '0', gsrlimit: '12',
    prop: 'pageimages|info|extracts', piprop: 'thumbnail', pithumbsize: '480',
    inprop: 'url', exintro: '1', explaintext: '1', exsentences: '2', redirects: '1'
  };
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Wikipedia search is temporarily unavailable (' + response.status + ').');
  const data = await response.json() as { query?: { pages?: WikiPage[] }; error?: { info?: string } };
  if (data.error) throw new Error(data.error.info ?? 'Wikipedia could not process the search.');
  return (data.query?.pages ?? []).sort((a, b) => (a.index ?? 99) - (b.index ?? 99)).map(page => ({
    id: 'wikipedia:' + page.pageid,
    title: page.title ?? 'Untitled',
    year: null,
    coverUrl: page.thumbnail?.source ?? '',
    genres: '',
    platform: '',
    description: page.extract ?? '',
    source: 'wikipedia' as const,
    sourceUrl: page.fullurl ?? ('https://en.wikipedia.org/?curid=' + page.pageid),
    screenshots: [],
  }));
}

type RawgGame = {
  id?: number; name?: string; released?: string; background_image?: string; added?: number;
  ratings_count?: number;
  slug?: string; genres?: { name?: string }[]; platforms?: { platform?: { name?: string } }[];
  short_screenshots?: { image?: string; is_deleted?: boolean }[];
};
function mapRawgGame(game: RawgGame): CatalogueGame {
  const year = game.released && /^\d{4}/.test(game.released) ? Number(game.released.slice(0, 4)) : null;
  const platform = [...new Set(game.platforms?.map(p => p.platform?.name?.trim()).filter((v): v is string => Boolean(v)) ?? [])].join(', ').slice(0,600);
  return {
    id: 'rawg:' + String(game.id),
    title: game.name ?? 'Untitled',
    year: year && year >= 1950 && year < 2200 ? year : null,
    coverUrl: game.background_image ?? '',
    genres: game.genres?.map(g => g.name).filter(Boolean).join(', ') ?? '',
    platform,
    description: '',
    released: /^\d{4}-\d{2}-\d{2}$/.test(game.released??'') ? game.released : '',
    source: 'rawg',
    sourceUrl: 'https://rawg.io/games/' + encodeURIComponent(game.slug ?? String(game.id)),
    screenshots: (game.short_screenshots ?? []).filter(i => !i.is_deleted).map(i => i.image).filter((i): i is string => !!i).slice(0, 8),
    popularity: rawgPopularity(game),
  };
}
/**
 * RAWG's /games catalogue already includes base games and additions (DLC).
 * Its search response doesn't expose a reliable media-type enum, so only
 * exclude clearly labelled peripheral material. Keep DLC, expansions, seasons,
 * episodes, editions and remasters in the default results.
 * Users can explicitly show everything RAWG returns.
 */
function isPeripheralExtra(title: string): boolean {
  const cleaned = title.trim().replace(/\s*(?:\[[^\]]+\]|\([^)]*\))\s*$/, '').trim();
  return /(?:^|[\s:–—-])(?:(?:official|original|digital|bonus)\s+)?(?:soundtrack|ost|artbook|art\s+book|wallpapers?|wallpaper\s+pack|desktop\s+theme|screensaver|strategy\s+guide|game\s+guide|manual|press\s+kit|game\s+trailer|trailer|teaser|making\s+of|companion\s+app|demo|playtest|beta\s+test|benchmark)(?:\s+(?:edition|pack|bundle|dlc))?$/i.test(cleaned);
}

function searchPriority(title: string, query: string): number {
  const normal = (value: string) => value.toLocaleLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  const needle = normal(query), name = normal(title);
  if (!needle) return 0;
  if (name === needle) return 100;
  if (name.startsWith(needle + ' ')) return 85;
  if (name.startsWith(needle)) return 78;
  if (name.includes(' ' + needle + ' ')) return 68;
  if (name.endsWith(' ' + needle)) return 66;
  if (name.includes(needle)) return 60;
  const words = needle.split(' ').filter(Boolean);
  return words.every(word => name.includes(word)) ? 36 : 0;
}

/** Rank search results by title relevance band first, then RAWG popularity
 * within each band. 'added' measures user library additions; ratings_count
 * provides a modest fallback when additions are missing.
 * Keep the exact queried title at the top over unrelated popular games.
 */
function relevanceBand(score: number): number {
  if (score === 100) return 3;
  if (score >= 78) return 2;
  if (score >= 60) return 1;
  return 0;
}
function rawgPopularity(game: RawgGame): number {
  const added = typeof game.added === 'number' && Number.isFinite(game.added) ? Math.max(0, game.added) : 0;
  const ratings = typeof game.ratings_count === 'number' && Number.isFinite(game.ratings_count)
    ? Math.max(0, game.ratings_count) : 0;
  return added + ratings * 0.25;
}


/** Common shorthand and popular games that ambiguous keywords should find. */
const ALIASES: Record<string,string> = {
  'rivals':'marvel rivals','mrivals':'marvel rivals',
  'kcd':'kingdom come deliverance','kcd1':'kingdom come deliverance',
  'kcd2':'kingdom come deliverance 2','rdr':'red dead redemption',
  'rdr2':'red dead redemption 2','gta':'grand theft auto',
  'gta5':'grand theft auto v','gta v':'grand theft auto v',
  'gta6':'grand theft auto vi','cp2077':'cyberpunk 2077',
  'cyberpunk':'cyberpunk 2077','fo4':'fallout 4','fnv':'fallout new vegas',
  'bg3':'baldurs gate 3','baldurs gate':'baldurs gate 3',
  'gow':'god of war','gowr':'god of war ragnarok',
  'got':'ghost of tsushima','sot':'sea of thieves',
  'lol':'league of legends','val':'valorant','cod':'call of duty',
  'bo6':'call of duty black ops 6','mw3':'call of duty modern warfare iii',
  'ac shadows':'assassins creed shadows','ac odyssey':'assassins creed odyssey',
  'ac origins':'assassins creed origins','tw3':'the witcher 3',
  'witcher 3':'the witcher 3 wild hunt','ds3':'dark souls iii',
  'er':'elden ring','mc':'minecraft','hl':'hogwarts legacy',
  'hzd':'horizon zero dawn','hfw':'horizon forbidden west',
  'spiderman 2':'marvels spider man 2',
};
const COMMON_WORDS = [
  'marvel','rivals','kingdom','come','deliverance','red','dead','redemption','grand',
  'theft','auto','cyberpunk','fallout','elden','ring','assassins','creed',
  'minecraft','baldurs','gate','witcher','horizon','ghost','tsushima',
  'battlefield','resident','evil','monster','hunter','spider','star','wars',
  'legacy','duty','modern','warfare','black','ops','phantom','liberty',
  'shadow','erdtree','ragnarok','fortnite','overwatch','bloodborne',
];
function normalizedSearch(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
/** Conservative correction for tiny typos in recognisable game terms. */
function editDistanceAtMostTwo(a: string, b: string): number {
  if (Math.abs(a.length-b.length)>2) return 3;
  const previous = Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const current = [i];
    for(let j=1;j<=b.length;j++)
      current[j]=Math.min(current[j-1]+1,previous[j]+1,
        previous[j-1]+(a[i-1]===b[j-1]?0:1));
    for(let j=0;j<current.length;j++)previous[j]=current[j];
  }
  return previous[b.length];
}
export function smartSearchExpansion(query: string): string {
  const needle=normalizedSearch(query);
  if(!needle)return '';
  if(ALIASES[needle])return ALIASES[needle];
  const corrected=needle.split(' ').map(word=>{
    if(word.length<5||/\d/.test(word)||COMMON_WORDS.includes(word))return word;
    const maxDist=word.length>=7?2:1;
    const candidate=COMMON_WORDS.map(term=>({term,distance:editDistanceAtMostTwo(word,term)}))
      .filter(row=>row.distance>0&&row.distance<=maxDist)
      .sort((a,b)=>a.distance-b.distance||a.term.localeCompare(b.term))[0];
    return candidate?.term??word;
  }).join(' ');
  return ALIASES[corrected]??corrected;
}

export async function searchRawg(query: string, proxy: string, signal?: AbortSignal, includeExtras = false, smartSearch = true): Promise<CatalogueGame[]> {
  if(!proxy)throw Error('Connect your RAWG Worker in Settings first.');
  const entered=query.trim().slice(0,100);
  const expanded=smartSearch?smartSearchExpansion(entered):entered;
  // At most two RAWG calls: expand abbreviations/typos, also try literal title.
  const queries=[expanded,entered].filter((q,i,all)=>q.length>=2&&all.findIndex(t=>normalizedSearch(t)===normalizedSearch(q))===i).slice(0,2);
  const fetchMatches=async(term:string):Promise<RawgGame[]>=>{
    const url=new URL(proxy+'/games');url.searchParams.set('search',term);
    const response=await fetch(url,{signal});
    if(!response.ok){
      if(response.status===503)throw Error('RAWG Worker needs its RAWG_API_KEY secret.');
      throw Error('RAWG search failed ('+response.status+'). Check the Worker connection.');
    }
    const data=await response.json() as {results?:RawgGame[]};
    return data.results??[];
  };
  const outcomes=await Promise.allSettled(queries.map(fetchMatches));
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const successes=outcomes.filter((result):result is PromiseFulfilledResult<RawgGame[]>=>result.status==='fulfilled');
  if(!successes.length){
    const failed=outcomes.find((result):result is PromiseRejectedResult=>result.status==='rejected');
    throw failed?.reason instanceof Error?failed.reason:Error('Catalogue is unavailable.');
  }
  const unique=new Map<number,RawgGame>();
  for(const group of successes)for(const game of group.value)
    if(typeof game.id==='number'&&game.id>0&&typeof game.name==='string'&&game.name.trim()){
      const previous=unique.get(game.id);
      if(!previous||rawgPopularity(game)>rawgPopularity(previous))unique.set(game.id,game);
    }
  const aliasUsed=normalizedSearch(expanded)!==normalizedSearch(entered);
  return [...unique.values()]
    .filter(g=>includeExtras||!isPeripheralExtra(g.name!))
    .sort((a,b)=>{
      const aTarget=searchPriority(a.name!,expanded),bTarget=searchPriority(b.name!,expanded);
      const aOriginal=searchPriority(a.name!,entered),bOriginal=searchPriority(b.name!,entered);
      // "rivals" resolves to Marvel Rivals, not a less popular literal "Rivals".
      if(aliasUsed){
        const aPreferred=aTarget===100?2:aTarget>=78?1:0;
        const bPreferred=bTarget===100?2:bTarget>=78?1:0;
        if(aPreferred!==bPreferred)return bPreferred-aPreferred;
      }
      const aBand=Math.max(relevanceBand(aTarget),relevanceBand(aOriginal));
      const bBand=Math.max(relevanceBand(bTarget),relevanceBand(bOriginal));
      return bBand-aBand||rawgPopularity(b)-rawgPopularity(a)
        ||Math.max(bTarget,bOriginal)-Math.max(aTarget,aOriginal)
        ||a.name!.localeCompare(b.name!);
    }).slice(0,30).map(mapRawgGame);
}


export type RawgAdditionKind = 'expansion' | 'edition' | 'other';
export interface RawgAddition extends CatalogueGame { kind: RawgAdditionKind }
function additionKind(name: string): RawgAdditionKind {
  if (/\b(?:soundtrack|ost|art\s*book|artbook|wallpaper|wallpapers|companion\s+app|trailer|demo|beta|guide|theme)\b/i.test(name)) return 'other';
  if (/\b(?:goty|game\s+of\s+the\s+year|definitive|ultimate|complete|deluxe|gold|collector.s|premium|anniversary|bundle|edition|collection)\b/i.test(name)) return 'edition';
  return 'expansion';
}
/** RAWG supplies actual relationships, not guessed title matches.
 * Results may include editions and apps, so these are grouped separately.
 * A 404 generally means the user's old Worker hasn't been updated yet.
 */
export async function fetchRawgAdditions(gameCatalogId: string, proxy: string, signal?: AbortSignal): Promise<RawgAddition[]> {
  const id = gameCatalogId.replace(/^rawg:/,'');
  if (!proxy) throw Error('Connect your RAWG Worker in Settings first.');
  if (!/^\d+$/.test(id)) throw Error('This game has no RAWG ID. Find it via RAWG to browse related DLC.');
  const url = proxy+'/games/'+id+'/additions';
  const response = await fetch(url,{signal});
  if (response.status === 404) throw Error('The Cloudflare Worker needs the v1.4.1 DLC update. Update its code to enable related DLC.');
  if (!response.ok) throw Error('Could not load related DLC from RAWG ('+response.status+').');
  const data=await response.json() as {results?:RawgGame[]};
  const seen=new Set<number>();
  return (data.results??[])
    .filter((g): g is RawgGame & {id:number;name:string} => typeof g.id==='number' && g.id>0 && typeof g.name==='string' && g.name.trim().length>0)
    .filter(g=>{if(seen.has(g.id))return false;seen.add(g.id);return true;})
    .map(g=>({...mapRawgGame(g),kind:additionKind(g.name)}))
    .sort((a,b)=>{
      const priority={expansion:0,edition:1,other:2};
      return priority[a.kind]-priority[b.kind] || (b.popularity??0)-(a.popularity??0) || a.title.localeCompare(b.title);
    });
}


export interface RawgMetadata {
  id: string;
  title: string;
  year: number | null;
  coverUrl: string;
  genres: string;
  platform: string;
  released: string;
  description: string;
  developers: string;
  publishers: string;
  screenshots: string[];
  /** Full metadata requires the optional Worker detail endpoint. */
  full: boolean;
}
type RawgDetail = RawgGame & {
  description_raw?: string;
  developers?: {name?:string}[];
  publishers?: {name?:string}[];
};
const uniqueNames = (items: {name?:string}[] | undefined):string =>
  [...new Set((items??[]).map(x=>x.name?.trim()).filter((x):x is string=>!!x))].join(', ').slice(0,400);
/** Fetch a game's RAWG detail by exact ID. Existing /games search is a safe
 * fallback for devices whose Worker predates the detailed metadata route.
 * No user-entered information is modified here.
 */
export async function fetchRawgMetadata(catalogId:string,title:string,proxy:string,signal?:AbortSignal):Promise<RawgMetadata> {
  const id=catalogId.replace(/^rawg:/,'');
  if (!/^\d+$/.test(id))throw Error('This game does not have a RAWG catalogue ID.');
  if (!proxy)throw Error('Connect your RAWG Worker in Settings first.');
  let game:CatalogueGame | undefined;
  let description='',developers='',publishers='',full=false;
  const res=await fetch(proxy+'/games/'+id,{signal});
  if(res.ok){
    const detail=await res.json() as RawgDetail;
    if(detail.id!==Number(id))throw Error('RAWG returned an unexpected game ID. Nothing was changed.');
    game=mapRawgGame(detail);
    description=(typeof detail.description_raw==='string'?detail.description_raw:'').slice(0,5000);
    developers=uniqueNames(detail.developers);
    publishers=uniqueNames(detail.publishers);
    full=true;
  }else if(res.status===404){
    // An older Worker may support search but not /games/:id.
    const candidates=await searchRawg(title,proxy,signal,true,false);
    game=candidates.find(c=>c.id===catalogId);
    if(!game)throw Error('The old Worker does not expose game details, and RAWG search could not match the exact game ID. Update the Worker for full metadata.');
  }else{
    throw Error('RAWG details request failed ('+res.status+'). No library data was changed.');
  }
  if(!game)throw Error('RAWG game metadata was not found.');
  // Screenshot failures never block other metadata.
  let screenshots=game.screenshots;
  try {
    const fetched=await fetchRawgScreenshots(catalogId,proxy,signal);
    screenshots=[...new Set([...screenshots,...fetched])].slice(0,24);
  }catch{ /* keep available artwork */ }
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  return {id:game.id,title:game.title,year:game.year,
    coverUrl:game.coverUrl,genres:game.genres,platform:game.platform,
    released:game.released??'',description:description||game.description,
    developers,publishers,screenshots,full};
}

export async function fetchRawgSeries(catalogId:string,proxy:string,signal?:AbortSignal):Promise<CatalogueGame[]> {
  const id=catalogId.replace(/^rawg:/,'');
  if(!/^\d+$/.test(id)||!proxy)return [];
  const response=await fetch(proxy+'/games/'+id+'/game-series',{signal});
  if(response.status===404)return [];
  if(!response.ok)throw Error('RAWG series lookup failed ('+response.status+').');
  const data=await response.json() as {results?:RawgGame[]};
  return (data.results??[]).filter(g=>typeof g.id==='number'&&g.id>0&&g.id!==Number(id)&&!!g.name)
    .slice(0,12).map(mapRawgGame);
}

export async function fetchRawgScreenshots(gameId: string, proxy: string, signal?: AbortSignal): Promise<string[]> {
  const id = gameId.replace(/^rawg:/, '');
  if (!/^\d+$/.test(id) || !proxy) return [];
  const response = await fetch(proxy + '/games/' + id + '/screenshots', { signal });
  if (!response.ok) throw new Error('Screenshot request failed (' + response.status + ').');
  const data = await response.json() as { results?: { image?: string; hidden?: boolean }[] };
  return (data.results ?? []).filter(s => !s.hidden && typeof s.image === 'string').map(s => s.image!).slice(0, 16);
}
