import type { Game } from './types';

const DB_NAME = 'gamevault';
const DB_VERSION = 1;
const STORE = 'games';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('This browser does not support IndexedDB.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
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
