// Vercel KV persistent storage
// Replaces in-memory store — data survives cold starts & deployments
import { kv } from '@vercel/kv';

const KEY = 'ua:entries';
const MAX_ENTRIES = 1000;

export async function addEntry(entry) {
  const entries = await getEntries();
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.pop();
  await kv.set(KEY, entries);
}

export async function getEntries() {
  const data = await kv.get(KEY);
  return Array.isArray(data) ? data : [];
}

export async function clearEntries() {
  await kv.del(KEY);
}