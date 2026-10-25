import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { loadGames, mergeGames, removeGame, saveGame, listPending, clearPending } from './db';
import { normalizeGame, type Game } from './types';

export type CloudStatus = 'offline' | 'signed-out' | 'synced' | 'syncing' | 'attention' | 'error';
export type Pending = { id: string; data: Game | null; deleted: boolean; baseRevision: number; queuedAt: string };
export type CloudRow = { game_id: string; data: unknown; revision: number; deleted: boolean };
export type SyncConflict = { id: string; local: Game | null; remote: Game | null; remoteVersion: number; locallyDeleted: boolean };

const CONFIG_KEY = 'gamevault:cloud:config';
const ACCOUNT_KEY = 'gamevault:cloud:account';
export type CloudConfig = { url: string; key: string };

export function readCloudConfig(): CloudConfig | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null') as CloudConfig | null;
    return parsed?.url && parsed?.key ? validateCloudConfig(parsed) : null;
  } catch { return null; }
}
export function validateCloudConfig(input: CloudConfig): CloudConfig {
  const u = new URL(input.url.trim());
  if (u.protocol !== 'https:' || !u.hostname.endsWith('.supabase.co') ||
      u.username || u.password || u.search || u.hash || !/^\/?$/.test(u.pathname)) {
    throw new Error('Enter a valid https://PROJECT.supabase.co Project URL.');
  }
  const key = input.key.trim();
  if (!(key.startsWith('sb_publishable_') || (key.startsWith('eyJ') && key.split('.').length === 3))) {
    throw new Error('Use a publishable/anon key, never a service_role or secret key.');
  }
  return { url: u.origin, key };
}
export function saveCloudConfig(input: CloudConfig): CloudConfig {
  const config = validateCloudConfig(input);
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  return config;
}
export function makeCloudClient(config: CloudConfig): SupabaseClient {
  return createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'gamevault:auth:' + new URL(config.url).hostname,
    }
  });
}
function versionKey(project: string, userId: string) {
  return 'gamevault:cloud:versions:' + new URL(project).hostname + ':' + userId;
}
export function getVersions(project: string, uid: string): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(versionKey(project, uid)) || '{}') as Record<string, number>;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
export function saveVersions(project: string, uid: string, versions: Record<string, number>) {
  localStorage.setItem(versionKey(project, uid), JSON.stringify(versions));
}
export function checkAccountIdentity(project: string, user: User) {
  const lock = localStorage.getItem(ACCOUNT_KEY);
  const identity = new URL(project).hostname + ':' + user.id;
  if (lock && lock !== identity) throw new Error(
    'This browser already contains GameVault data associated with another cloud account. Export its library before changing accounts. Use a separate browser profile for the other account.'
  );
  localStorage.setItem(ACCOUNT_KEY, identity);
}

function sameData(a: Game | null, b: Game | null) {
  if (!a || !b) return a === b;
  // Ignore device-local timestamps only when records are otherwise identical.
  const stripped = (g: Game) => { const { addedAt: _added, updatedAt: _updated, ...rest } = g; void _added; void _updated; return JSON.stringify(rest); };
  return stripped(a) === stripped(b);
}
function validGame(row: CloudRow) {
  return row.deleted ? null : normalizeGame(row.data);
}
export async function cloudWrite(client: SupabaseClient, item: Pending, expected: number): Promise<number | null> {
  const { data, error } = await client.rpc('gamevault_write', {
    p_game_id: item.id,
    p_expected_revision: expected,
    p_data: item.deleted ? {} : item.data,
    p_deleted: item.deleted,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : null;
}

export async function syncLibrary(
  client: SupabaseClient,
  projectUrl: string,
  user: User,
  onLocalChange: (games: Game[]) => void,
): Promise<{ uploaded: number; downloaded: number; pending: number; conflicts: SyncConflict[] }> {
  if (!navigator.onLine) throw new Error('Offline — your changes are retained locally.');
  checkAccountIdentity(projectUrl, user);
  // Read the cloud before writing anything, so an old offline device never blindly overwrites it.
  const { data, error } = await client.from('gamevault_games')
    .select('game_id,data,revision,deleted').eq('user_id', user.id).limit(10000);
  if (error) throw error;
  const remote = new Map((data ?? []).map((row: CloudRow) => [row.game_id, row]));
  const versions = getVersions(projectUrl, user.id);
  const local = await loadGames();
  const pending = await listPending();
  const queue = new Map(pending.map(row => [row.id, row]));
  let uploaded = 0, downloaded = 0;
  const conflicts: SyncConflict[] = [];

  // First sync/import: preserve every local record that isn't in the cloud.
  // If identical IDs differ, require an explicit choice rather than a last-write-wins guess.
  for (const game of local) {
    if (queue.has(game.id)) continue;
    const fromCloud = remote.get(game.id);
    if (!fromCloud) {
      queue.set(game.id, { id: game.id, data: game, deleted: false, baseRevision: 0, queuedAt: new Date().toISOString() });
    } else if (versions[game.id] === undefined && !sameData(game, validGame(fromCloud))) {
      conflicts.push({ id: game.id, local: game, remote: validGame(fromCloud), remoteVersion: fromCloud.revision, locallyDeleted: false });
    }
  }

  for (const [id, item] of queue) {
    const cloud = remote.get(id);
    const remoteRev = cloud?.revision ?? 0;
    const expected = item.baseRevision;
    if (cloud && sameData(item.deleted ? null : item.data, validGame(cloud))) {
      await clearPending(id, item.queuedAt); versions[id] = remoteRev;
      continue;
    }
    if (remoteRev !== expected) {
      conflicts.push({ id, local: item.data, remote: cloud ? validGame(cloud) : null, remoteVersion: remoteRev, locallyDeleted: item.deleted });
      continue;
    }
    const nextRev = await cloudWrite(client, item, remoteRev);
    if (nextRev === null) {
      conflicts.push({ id, local: item.data, remote: cloud ? validGame(cloud) : null, remoteVersion: remoteRev, locallyDeleted: item.deleted });
      continue;
    }
    versions[id] = nextRev;
    await clearPending(id, item.queuedAt);
    uploaded++;
  }

  const conflictedIds = new Set(conflicts.map(c => c.id));
  // Don't apply cloud changes when a local edit is still queued or needs a conflict decision.
  const activeQueue = new Set((await listPending()).map(q => q.id));
  for (const [id, row] of remote) {
    if (activeQueue.has(id) || conflictedIds.has(id)) continue;
    const game = validGame(row);
    const localGame = local.find(g => g.id === id);
    if (versions[id] === row.revision && localGame && game && sameData(localGame, game)) continue;
    if (!game && row.deleted) {
      if (localGame) { await removeGame(id); downloaded++; }
    } else if (game) {
      await saveGame(game); downloaded++;
    }
    versions[id] = row.revision;
  }
  saveVersions(projectUrl, user.id, versions);
  onLocalChange(await loadGames());
  return { uploaded, downloaded, pending: (await listPending()).length, conflicts };
}
export async function settleConflict(
  client: SupabaseClient, projectUrl: string, user: User,
  conflict: SyncConflict, decision: 'local' | 'cloud',
) {
  checkAccountIdentity(projectUrl, user);
  if (decision === 'cloud') {
    if (conflict.remote) await saveGame(conflict.remote);
    else await removeGame(conflict.id);
    await clearPending(conflict.id);
    const versions = getVersions(projectUrl,user.id);
    versions[conflict.id] = conflict.remoteVersion;
    saveVersions(projectUrl,user.id,versions);
    return;
  }
  const { data, error } = await client.from('gamevault_games')
    .select('game_id,data,revision,deleted').eq('user_id',user.id).eq('game_id',conflict.id).maybeSingle();
  if (error) throw error;
  const latest = data as CloudRow | null;
  if ((latest?.revision ?? 0) !== conflict.remoteVersion) {
    throw new Error('Cloud changed again. Sync now to review the newer version.');
  }
  const item: Pending = { id: conflict.id, data: conflict.local, deleted: conflict.locallyDeleted, baseRevision: conflict.remoteVersion, queuedAt: new Date().toISOString() };
  const newRev = await cloudWrite(client,item,conflict.remoteVersion);
  if (newRev === null) throw new Error('Cloud changed during the update. Sync again.');
  await clearPending(conflict.id);
  const versions = getVersions(projectUrl,user.id);
  versions[conflict.id] = newRev;
  saveVersions(projectUrl,user.id,versions);
}
