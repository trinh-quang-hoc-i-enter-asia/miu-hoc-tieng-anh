"use client";
// Hàng đợi sự kiện học của bé: ghi vào IndexedDB trước, rồi gửi lên máy chủ theo lô.
// Mất mạng thì sự kiện nằm lại trong hàng đợi và gửi khi có mạng. Máy chủ bỏ qua sự kiện
// trùng mã, nên gửi lại bao nhiêu lần cũng an toàn.

export type QueuedEvent = {
  id: string;
  lessonId: string;
  lessonVersion: number;
  kind: string;
  stepType?: string;
  phraseSlug?: string;
  occurredAt: string;
  payload?: { seconds?: number; stars?: number; stepIndex?: number; resumed?: boolean };
};

type Row = { id: string; childId: string; event: QueuedEvent };

const DB_NAME = "miu-sync";
const STORE = "events";

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Nếu IndexedDB không dùng được (chế độ riêng tư của vài trình duyệt), giữ tạm trong bộ nhớ.
const memory = new Map<string, Row>();
let dbPromise: Promise<IDBDatabase | null> | null = null;
const getDb = () => (dbPromise ??= openDb());

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function enqueue(childId: string, event: QueuedEvent): Promise<void> {
  const row: Row = { id: event.id, childId, event };
  const db = await getDb();
  if (!db) {
    memory.set(row.id, row);
    return;
  }
  try {
    await tx(db, "readwrite", (s) => s.put(row));
  } catch {
    memory.set(row.id, row);
  }
}

async function allRows(): Promise<Row[]> {
  const db = await getDb();
  let rows: Row[] = [];
  if (db) {
    try {
      rows = await tx(db, "readonly", (s) => s.getAll() as IDBRequest<Row[]>);
    } catch {}
  }
  return [...rows, ...memory.values()];
}

async function remove(ids: string[]): Promise<void> {
  const db = await getDb();
  for (const id of ids) memory.delete(id);
  if (!db) return;
  try {
    const t = db.transaction(STORE, "readwrite");
    for (const id of ids) t.objectStore(STORE).delete(id);
    await new Promise<void>((res) => {
      t.oncomplete = () => res();
      t.onerror = () => res();
    });
  } catch {}
}

export async function pendingCount(childId?: string): Promise<number> {
  const rows = await allRows();
  return childId ? rows.filter((r) => r.childId === childId).length : rows.length;
}

let flushing: Promise<void> | null = null;

/** Gửi mọi sự kiện đang chờ. Lỗi mạng hoặc lỗi máy chủ thì giữ lại; lỗi 4xx thì bỏ để không kẹt hàng đợi. */
export function flush(opts: { keepalive?: boolean } = {}): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const rows = (await allRows()).sort((a, b) => a.event.occurredAt.localeCompare(b.event.occurredAt));
    const byChild = new Map<string, Row[]>();
    for (const r of rows) byChild.set(r.childId, [...(byChild.get(r.childId) ?? []), r]);

    for (const [childId, list] of byChild) {
      for (let i = 0; i < list.length; i += 100) {
        const chunk = list.slice(i, i + 100);
        try {
          const res = await fetch(`/api/children/${childId}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: chunk.map((r) => r.event) }),
            keepalive: opts.keepalive,
          });
          if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) {
            await remove(chunk.map((r) => r.id));
          } else {
            return; // 401, 429, 5xx: giữ lại, thử sau
          }
        } catch {
          return; // mất mạng
        }
      }
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

let started = false;
/** Bật gửi tự động: mỗi 15 giây, khi có mạng lại và khi rời trang. */
export function startAutoFlush() {
  if (started || typeof window === "undefined") return;
  started = true;
  setInterval(() => void flush(), 15_000);
  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) void flush({ keepalive: true });
  });
  window.addEventListener("pagehide", () => void flush({ keepalive: true }));
}

/** Mã sự kiện. crypto.randomUUID chỉ có trên https/localhost nên có bản dự phòng cho mạng nội bộ. */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
