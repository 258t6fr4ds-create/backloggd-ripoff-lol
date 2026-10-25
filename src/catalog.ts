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
  source: CatalogueSource;
  sourceUrl: string;
  screenshots: string[];
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
  const platform = game.platforms?.map(p => p.platform?.name).filter(Boolean).slice(0, 5).join(', ') ?? '';
  return {
    id: 'rawg:' + String(game.id),
    title: game.name ?? 'Untitled',
    year: year && year >= 1950 && year < 2200 ? year : null,
    coverUrl: game.background_image ?? '',
    genres: game.genres?.map(g => g.name).filter(Boolean).join(', ') ?? '',
    platform,
    description: '',
    source: 'rawg',
    sourceUrl: 'https://rawg.io/games/' + encodeURIComponent(game.slug ?? String(game.id)),
    screenshots: (game.short_screenshots ?? []).filter(i => !i.is_deleted).map(i => i.image).filter((i): i is string => !!i).slice(0, 8),
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

export async function searchRawg(query: string, proxy: string, signal?: AbortSignal, includeExtras = false): Promise<CatalogueGame[]> {
  if (!proxy) throw new Error('Connect your RAWG Worker in Settings first.');
  const url = new URL(proxy + '/games');
  url.searchParams.set('search', query.trim().slice(0, 100));
  const response = await fetch(url, { signal });
  if (!response.ok) {
    if (response.status === 503) throw new Error('Your RAWG Worker needs its RAWG_API_KEY secret configured.');
    throw new Error('RAWG search failed (' + response.status + '). Check your Worker URL and credentials.');
  }
  const data = await response.json() as { results?: RawgGame[] };
  return (data.results ?? [])
    .filter((game): game is RawgGame => typeof game.id === 'number' && game.id > 0 && typeof game.name === 'string' && game.name.trim().length > 0)
    .filter(game => includeExtras || !isPeripheralExtra(game.name!))
    .sort((a, b) => {
      const aRelevance = searchPriority(a.name!, query);
      const bRelevance = searchPriority(b.name!, query);
      return relevanceBand(bRelevance) - relevanceBand(aRelevance)
        || rawgPopularity(b) - rawgPopularity(a)
        || bRelevance - aRelevance
        || a.name!.localeCompare(b.name!);
    })
    .map(mapRawgGame);
}
export async function fetchRawgScreenshots(gameId: string, proxy: string, signal?: AbortSignal): Promise<string[]> {
  const id = gameId.replace(/^rawg:/, '');
  if (!/^\d+$/.test(id) || !proxy) return [];
  const response = await fetch(proxy + '/games/' + id + '/screenshots', { signal });
  if (!response.ok) throw new Error('Screenshot request failed (' + response.status + ').');
  const data = await response.json() as { results?: { image?: string; hidden?: boolean }[] };
  return (data.results ?? []).filter(s => !s.hidden && typeof s.image === 'string').map(s => s.image!).slice(0, 16);
}
