import type { Game } from './types';

const DB_NAME = 'gamevault';
const DB_VERSION = 2;
const PENDING_STORE = 'pending_sync';
export interface PendingChange {
  id: string;
  data: Game | null;
  deleted: boolean;
  baseRevision: number;
  queuedAt: string;
}
function revisionFromKnownCloud(id: string): number {
  try {
    const lock = localStorage.getItem('gamevault:cloud:account');
    if (!lock) return 0;
    const split = lock.lastIndexOf(':');
    if (split < 0) return 0;
    const [host, uid] = [lock.slice(0,split), lock.slice(split+1)];
    const versions = JSON.parse(localStorage.getItem('gamevault:cloud:versions:'+host+':'+uid) || '{}') as Record<string, number>;
    return versions[id] ?? 0;
  } catch { return 0; }
}
const STORE = 'games';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('This browser does not support IndexedDB.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (!request.result.objectStoreNames.contains(PENDING_STORE)) {
        request.result.createObjectStore(PENDING_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

export async function loadGames(): Promise<Game[]> {
  const db = await openDatabase();
  try {
    return await new Promise<Game[]>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result as Game[]);
      request.onerror = () => reject(request.error ?? new Error('Could not read games.'));
    });
  } finally { db.close(); }
}

async function writeGames(operation: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Storage write failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Storage write was cancelled.'));
      operation(transaction.objectStore(STORE));
    });
  } finally { db.close(); }
}

export function saveGame(game: Game) {
  return writeGames(store => { store.put(game); });
}

export function removeGame(id: string) {
  return writeGames(store => { store.delete(id); });
}

export function mergeGames(games: Game[]) {
  return writeGames(store => { games.forEach(game => store.put(game)); });
}

/** Keep offline edits in a persistent queue. A prior unsynced edit retains its
 * original remote revision, even when the game is edited again offline. */
export async function recordPending(data: Game | null, id: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve,reject) => {
      const tx=db.transaction(PENDING_STORE,'readwrite');
      const store=tx.objectStore(PENDING_STORE);
      const request=store.get(id);
      request.onsuccess=()=>{
        const old=request.result as PendingChange|undefined;
        store.put({
          id, data, deleted: data===null,
          baseRevision: old?.baseRevision ?? revisionFromKnownCloud(id),
          queuedAt: new Date().toISOString(),
        } satisfies PendingChange);
      };
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error??Error('Could not queue change for cloud sync.'));
      tx.onabort=()=>reject(tx.error??Error('Could not queue change for cloud sync.'));
    });
  } finally {db.close();}
  window.dispatchEvent(new Event('gamevault:local-change'));
}
export async function listPending(): Promise<PendingChange[]> {
  const db=await openDatabase();
  try {
    return await new Promise<PendingChange[]>((resolve,reject)=>{
      const request=db.transaction(PENDING_STORE,'readonly').objectStore(PENDING_STORE).getAll();
      request.onsuccess=()=>resolve(request.result as PendingChange[]);
      request.onerror=()=>reject(request.error??Error('Could not read sync queue.'));
    });
  } finally {db.close();}
}
export async function clearPending(id:string,expectedQueuedAt?:string): Promise<void> {
  const db=await openDatabase();
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(PENDING_STORE,'readwrite');
      const store=tx.objectStore(PENDING_STORE);
      const get=store.get(id);
      get.onsuccess=()=>{
        const value=get.result as PendingChange|undefined;
        if (value && (!expectedQueuedAt || value.queuedAt===expectedQueuedAt)) store.delete(id);
      };
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error??Error('Could not acknowledge synced change.'));
    });
  } finally {db.close();}
}
