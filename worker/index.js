/**
 * Optional RAWG API proxy for GameVault.
 * Deploy on Cloudflare Workers and set these dashboard secrets/variables:
 * RAWG_API_KEY (secret) = your RAWG developer key
 * ALLOWED_ORIGIN (variable) = https://258t6fr4ds-create.github.io
 *
 * The worker never returns the key; the browser only receives public game data.
 */
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || 'https://258t6fr4ds-create.github.io').replace(/\/$/, '');
    const cors = {
      'Access-Control-Allow-Origin': allowed,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8',
    };
    const reply = (message, status) => new Response(JSON.stringify({ error: message }), { status, headers: cors });
    if (origin && origin !== allowed) return reply('Origin not permitted.', 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return reply('Method not permitted.', 405);
    if (!env.RAWG_API_KEY) return reply('RAWG_API_KEY secret is missing.', 503);
    const url = new URL(request.url);
    let upstream;
    if (url.pathname === '/games') {
      const search = (url.searchParams.get('search') || '').trim().slice(0,100);
      if (search.length < 2) return reply('Search must be at least 2 characters.', 400);
      upstream = new URL('https://api.rawg.io/api/games');
      upstream.searchParams.set('search', search);
      upstream.searchParams.set('page_size', '15');
      upstream.searchParams.set('search_precise', 'true');
    } else {
      const match = url.pathname.match(/^\/games\/(\d+)\/screenshots$/);
      if (!match) return reply('Not found.', 404);
      upstream = new URL('https://api.rawg.io/api/games/' + match[1] + '/screenshots');
      upstream.searchParams.set('page_size', '16');
    }
    upstream.searchParams.set('key', env.RAWG_API_KEY);
    try {
      const response = await fetch(upstream.toString(), { headers: { 'Accept': 'application/json' } });
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          ...cors,
          'Cache-Control': response.ok ? 'public, max-age=120, s-maxage=600' : 'no-store',
        }
      });
    } catch {
      return reply('RAWG is currently unavailable.', 502);
    }
  }
};
