import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

export interface UrlMapping {
  shortId: string;
  longUrl: string;
  clicks: number;
  createdAt: string;
}

const LOCAL_DB_PATH = path.join(process.cwd(), 'local-db.json');

// Check if Vercel KV is configured
const isKvConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function getLocalDB(): Record<string, UrlMapping> {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading local DB:', error);
  }
  return {};
}

function saveLocalDB(db: Record<string, UrlMapping>) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to local DB:', error);
  }
}

export async function getUrl(shortId: string): Promise<UrlMapping | null> {
  if (isKvConfigured) {
    const urlData = await kv.get<UrlMapping>(`url:${shortId}`);
    return urlData;
  } else {
    const db = getLocalDB();
    return db[shortId] || null;
  }
}

export async function saveUrl(shortId: string, longUrl: string): Promise<UrlMapping> {
  const newMapping: UrlMapping = {
    shortId,
    longUrl,
    clicks: 0,
    createdAt: new Date().toISOString(),
  };

  if (isKvConfigured) {
    await kv.set(`url:${shortId}`, newMapping);
    // Also add to a list or set to track all urls
    await kv.lpush('urls_list', shortId);
  } else {
    const db = getLocalDB();
    db[shortId] = newMapping;
    saveLocalDB(db);
  }

  return newMapping;
}

export async function incrementClicks(shortId: string): Promise<void> {
  if (isKvConfigured) {
    const urlData = await getUrl(shortId);
    if (urlData) {
      urlData.clicks += 1;
      await kv.set(`url:${shortId}`, urlData);
    }
  } else {
    const db = getLocalDB();
    if (db[shortId]) {
      db[shortId].clicks += 1;
      saveLocalDB(db);
    }
  }
}

export async function listUrls(): Promise<UrlMapping[]> {
  if (isKvConfigured) {
    try {
      const keys = await kv.lrange('urls_list', 0, 100);
      const pipe = kv.pipeline();
      keys.forEach((key) => {
        pipe.get(`url:${key}`);
      });
      const results = await pipe.exec();
      return (results.filter(Boolean) as UrlMapping[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (e) {
      console.error('Error fetching list from KV:', e);
      return [];
    }
  } else {
    const db = getLocalDB();
    return Object.values(db).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export async function deleteUrl(shortId: string): Promise<void> {
  if (isKvConfigured) {
    await kv.del(`url:${shortId}`);
    await kv.lrem('urls_list', 0, shortId);
  } else {
    const db = getLocalDB();
    delete db[shortId];
    saveLocalDB(db);
  }
}
