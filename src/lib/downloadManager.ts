/**
 * Download Manager — IndexedDB-based offline song storage
 *
 * Stores audio blobs + track metadata in IndexedDB for offline playback.
 * Uses raw IndexedDB (no library dependency).
 */

import type { Track } from "@/context/PlayerContext";

const DB_NAME = "arsmusic-downloads";
const DB_VERSION = 1;
const STORE_AUDIO = "audio";
const STORE_META = "meta";
const LS_REGISTRY = "arsmusic.downloads.v1";

export type DownloadStatus = "idle" | "downloading" | "completed" | "error";

export type DownloadEntry = {
  id: string;
  track: Track;
  status: DownloadStatus;
  progress: number; // 0-100
  size: number; // bytes
  downloadedAt: number;
};

type DownloadListener = (entries: Record<string, DownloadEntry>) => void;

class DownloadManagerImpl {
  private db: IDBDatabase | null = null;
  private listeners: Set<DownloadListener> = new Set();
  private registry: Record<string, DownloadEntry> = {};
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    if (typeof window !== "undefined") {
      this.registry = this.loadRegistry();
    }
  }

  private loadRegistry(): Record<string, DownloadEntry> {
    try {
      const raw = localStorage.getItem(LS_REGISTRY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveRegistry() {
    try {
      localStorage.setItem(LS_REGISTRY, JSON.stringify(this.registry));
    } catch { /* quota exceeded — ignore */ }
  }

  private notify() {
    for (const fn of this.listeners) fn({ ...this.registry });
  }

  subscribe(fn: DownloadListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_AUDIO)) {
          db.createObjectStore(STORE_AUDIO);
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  private async putBlob(id: string, blob: Blob): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO, "readwrite");
      tx.objectStore(STORE_AUDIO).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async getBlob(id: string): Promise<Blob | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO, "readonly");
      const req = tx.objectStore(STORE_AUDIO).get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  private async deleteBlob(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO, "readwrite");
      tx.objectStore(STORE_AUDIO).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Download a track's audio and store it offline */
  async downloadSong(
    track: Track,
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    // Already downloaded
    if (this.registry[track.id]?.status === "completed") return;
    // Already downloading
    if (this.registry[track.id]?.status === "downloading") return;

    const controller = new AbortController();
    this.abortControllers.set(track.id, controller);

    this.registry[track.id] = {
      id: track.id,
      track,
      status: "downloading",
      progress: 0,
      size: 0,
      downloadedAt: 0,
    };
    this.saveRegistry();
    this.notify();

    try {
      const response = await fetch(
        `/api/public/stream/${encodeURIComponent(track.id)}?fmt=progressive`,
        { signal: controller.signal },
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = Number(response.headers.get("content-length") || 0);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const chunks: Uint8Array[] = [];
      let received = 0;
      let lastNotify = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;

        const pct = contentLength > 0
          ? Math.round((received / contentLength) * 100)
          : Math.min(95, Math.round(received / 1024 / 50)); // estimate for unknown size

        const now = Date.now();
        if (now - lastNotify > 100) {
          this.registry[track.id] = {
            ...this.registry[track.id]!,
            progress: pct,
            size: received,
          };
          this.saveRegistry();
          this.notify();
          onProgress?.(pct);
          lastNotify = now;
        }
      }

      const contentType = response.headers.get("content-type") || "audio/mp4";
      const blob = new Blob(chunks as any[], { type: contentType });
      await this.putBlob(track.id, blob);

      this.registry[track.id] = {
        id: track.id,
        track,
        status: "completed",
        progress: 100,
        size: received,
        downloadedAt: Date.now(),
      };
      this.saveRegistry();
      this.notify();
      onProgress?.(100);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // User cancelled — clean up
        delete this.registry[track.id];
      } else {
        this.registry[track.id] = {
          ...this.registry[track.id]!,
          status: "error",
          progress: 0,
        };
      }
      this.saveRegistry();
      this.notify();
      this.abortControllers.delete(track.id);
      if (err?.name !== "AbortError") throw err;
    } finally {
      this.abortControllers.delete(track.id);
    }
  }

  /** Cancel an in-progress download */
  cancelDownload(id: string) {
    const ctrl = this.abortControllers.get(id);
    if (ctrl) ctrl.abort();
  }

  /** Check if a song is downloaded */
  isDownloaded(id: string): boolean {
    return this.registry[id]?.status === "completed";
  }

  /** Get download status */
  getStatus(id: string): DownloadEntry | null {
    return this.registry[id] ?? null;
  }

  /** Get a blob URL for offline playback */
  async getPlaybackUrl(id: string): Promise<string | null> {
    const blob = await this.getBlob(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  /** Remove a downloaded song */
  async removeDownload(id: string): Promise<void> {
    this.cancelDownload(id);
    await this.deleteBlob(id).catch(() => { });
    delete this.registry[id];
    this.saveRegistry();
    this.notify();
  }

  /** Get all download entries */
  getAllDownloads(): DownloadEntry[] {
    return Object.values(this.registry).filter(
      (e) => e.status === "completed",
    );
  }

  /** Get total storage used in bytes */
  getTotalSize(): number {
    return Object.values(this.registry)
      .filter((e) => e.status === "completed")
      .reduce((sum, e) => sum + e.size, 0);
  }

  /** Get registry snapshot */
  getRegistry(): Record<string, DownloadEntry> {
    return { ...this.registry };
  }
}

// Singleton
export const downloadManager = new DownloadManagerImpl();
