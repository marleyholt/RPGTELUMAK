// Firebase Firestore Traffic & Quota Telemetry Tracker
// Tracks reads, writes, deletes, and estimated network bandwidth against the Firebase Spark (Free Tier) limits.

export interface CollectionUsage {
  reads: number;
  writes: number;
  deletes: number;
  estimatedBytes: number;
}

export interface DayUsageStats {
  date: string; // YYYY-MM-DD
  totalReads: number;
  totalWrites: number;
  totalDeletes: number;
  estimatedBytesTotal: number;
  sessionReads: number;
  sessionWrites: number;
  sessionDeletes: number;
  collections: {
    [collectionName: string]: CollectionUsage;
  };
}

export const FIREBASE_SPARK_LIMITS = {
  DAILY_READS: 50000,
  DAILY_WRITES: 20000,
  DAILY_DELETES: 20000,
  DAILY_ESTIMATED_BANDWIDTH_MB: 333, // 10 GB / 30 days
  TOTAL_STORAGE_GB: 1
};

const STORAGE_KEY_PREFIX = 'telumak_firestore_quota_';

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

let memorySessionStats: { reads: number; writes: number; deletes: number } = {
  reads: 0,
  writes: 0,
  deletes: 0
};

const listeners = new Set<(stats: DayUsageStats) => void>();

export function getTodayStats(): DayUsageStats {
  const today = getTodayString();
  const key = `${STORAGE_KEY_PREFIX}${today}`;
  
  let saved: any = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    console.warn("Erro ao ler estatísticas do localStorage:", e);
  }

  const base: DayUsageStats = {
    date: today,
    totalReads: saved?.totalReads || 0,
    totalWrites: saved?.totalWrites || 0,
    totalDeletes: saved?.totalDeletes || 0,
    estimatedBytesTotal: saved?.estimatedBytesTotal || 0,
    sessionReads: memorySessionStats.reads,
    sessionWrites: memorySessionStats.writes,
    sessionDeletes: memorySessionStats.deletes,
    collections: saved?.collections || {
      'discord_notebook_messages': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
      'discord_channels': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
      'characters': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
      'messages': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
      'statuses': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
      'battlemap': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
      'users': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 }
    }
  };

  return base;
}

function saveStats(stats: DayUsageStats) {
  const key = `${STORAGE_KEY_PREFIX}${stats.date}`;
  try {
    localStorage.setItem(key, JSON.stringify({
      date: stats.date,
      totalReads: stats.totalReads,
      totalWrites: stats.totalWrites,
      totalDeletes: stats.totalDeletes,
      estimatedBytesTotal: stats.estimatedBytesTotal,
      collections: stats.collections
    }));
  } catch (e) {
    console.warn("Erro ao salvar estatísticas no localStorage:", e);
  }

  const withSession = {
    ...stats,
    sessionReads: memorySessionStats.reads,
    sessionWrites: memorySessionStats.writes,
    sessionDeletes: memorySessionStats.deletes
  };

  listeners.forEach(fn => fn(withSession));
}

// Average doc payload size estimate (~850 bytes)
const BYTES_PER_DOC_OPERATION = 850;

export function trackRead(collectionName: string, count: number = 1) {
  if (count <= 0) return;
  memorySessionStats.reads += count;
  const current = getTodayStats();

  current.totalReads += count;
  current.estimatedBytesTotal += count * BYTES_PER_DOC_OPERATION;

  if (!current.collections[collectionName]) {
    current.collections[collectionName] = { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 };
  }
  current.collections[collectionName].reads += count;
  current.collections[collectionName].estimatedBytes += count * BYTES_PER_DOC_OPERATION;

  saveStats(current);
}

export function trackWrite(collectionName: string, count: number = 1) {
  if (count <= 0) return;
  memorySessionStats.writes += count;
  const current = getTodayStats();

  current.totalWrites += count;
  current.estimatedBytesTotal += count * BYTES_PER_DOC_OPERATION;

  if (!current.collections[collectionName]) {
    current.collections[collectionName] = { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 };
  }
  current.collections[collectionName].writes += count;
  current.collections[collectionName].estimatedBytes += count * BYTES_PER_DOC_OPERATION;

  saveStats(current);
}

export function trackDelete(collectionName: string, count: number = 1) {
  if (count <= 0) return;
  memorySessionStats.deletes += count;
  const current = getTodayStats();

  current.totalDeletes += count;
  current.estimatedBytesTotal += count * 200; // deletes are smaller payload

  if (!current.collections[collectionName]) {
    current.collections[collectionName] = { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 };
  }
  current.collections[collectionName].deletes += count;
  current.collections[collectionName].estimatedBytes += count * 200;

  saveStats(current);
}

export function resetTodayUsageStats(): DayUsageStats {
  const today = getTodayString();
  const key = `${STORAGE_KEY_PREFIX}${today}`;
  try {
    localStorage.removeItem(key);
  } catch (e) {}

  memorySessionStats = { reads: 0, writes: 0, deletes: 0 };
  const fresh = getTodayStats();
  listeners.forEach(fn => fn(fresh));
  return fresh;
}

export function subscribeToUsageStats(callback: (stats: DayUsageStats) => void) {
  listeners.add(callback);
  callback(getTodayStats());
  return () => {
    listeners.delete(callback);
  };
}
