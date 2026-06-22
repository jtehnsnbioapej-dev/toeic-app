// 画像データはlocalStorageではなくIndexedDBに保存する（容量制限なし）

const DB_NAME = "toeic-images";
const STORE = "char-images";
const DB_VERSION = 1;

// 同期アクセス用のメモリキャッシュ（起動時にIndexedDBから読み込む）
const cache = new Map<string, string>(); // "stockId:emotion" → dataUrl

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// アクティブキャラのみ先読み（起動時の高速化用）
export async function hydrateActiveImages(stockIds: string[]): Promise<void> {
  const db = await openDB();
  const emotions = ["idle", "happy", "sad", "think", "excited"];
  const keys = stockIds.flatMap((id) => emotions.map((e) => `${id}:${e}`));
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    let pending = keys.length;
    if (pending === 0) { resolve(); return; }
    for (const key of keys) {
      const req = store.get(key);
      req.onsuccess = () => { if (req.result) cache.set(key, req.result); if (--pending === 0) resolve(); };
      req.onerror = () => { if (--pending === 0) resolve(); };
    }
  });
}

export async function hydrateImageCache(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { cache.set(cursor.key as string, cursor.value as string); cursor.continue(); }
      else resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveCharacterImages(
  stockId: string,
  images: Record<string, string>
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const [emotion, url] of Object.entries(images)) {
      const key = `${stockId}:${emotion}`;
      store.put(url, key);
      cache.set(key, url);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCharacterImages(stockId: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const e of ["idle", "happy", "sad", "think", "excited"]) {
      const key = `${stockId}:${e}`;
      store.delete(key);
      cache.delete(key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function getCachedImage(stockId: string, emotion: string): string | undefined {
  return cache.get(`${stockId}:${emotion}`);
}
