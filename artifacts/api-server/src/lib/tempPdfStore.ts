/**
 * In-memory store for temporarily hosting PDF buffers so Lulu can fetch them.
 * Each entry expires after TTL_MS and is also cleaned up after first access.
 */

import { randomUUID } from "node:crypto";

const TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty of time for Lulu to fetch

interface Entry {
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
}

const store = new Map<string, Entry>();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt < now) store.delete(id);
  }
}, 60_000);

export function storeTempPdf(buffer: Buffer, contentType = "application/pdf"): string {
  const id = randomUUID();
  store.set(id, { buffer, contentType, expiresAt: Date.now() + TTL_MS });
  return id;
}

export function getTempPdf(id: string): Entry | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { store.delete(id); return null; }
  return entry;
}

export function deleteTempPdf(id: string): void {
  store.delete(id);
}
