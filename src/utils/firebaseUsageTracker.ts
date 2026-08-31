// Firebase Firestore Traffic & Quota Telemetry Tracker (Global Multi-User Synced)
// Tracks real-time reads, writes, deletes, and bandwidth against the Firebase Spark (Free Tier) limits
// Synchronizes aggregate metrics into a single Firestore document (/system_telemetry_daily/{YYYY-MM-DD})
// so all 5+ active players and the GM see the true global usage of the entire table in real-time.

import { doc, setDoc, onSnapshot, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface CollectionUsage {
  reads: number;
  writes: number;
  deletes: number;
  estimatedBytes: number;
}

export interface DayUsageStats {
  date: string; // YYYY-MM-DD
  isGlobalSynced: boolean;
  totalReads: number;
  totalWrites: number;
  totalDeletes: number;
  estimatedBytesTotal: number;
  sessionReads: number;
  sessionWrites: number;
  sessionDeletes: number;
  lastUpdated?: string;
  isQuotaExhausted?: boolean;
  collections: {
    [collectionName: string]: CollectionUsage;
  };
}

export type FirebaseUsageStats = DayUsageStats;

export const FIREBASE_SPARK_LIMITS = {
  DAILY_READS: 50000,
  DAILY_WRITES: 20000,
  DAILY_DELETES: 20000,
  DAILY_ESTIMATED_BANDWIDTH_MB: 333, // 10 GB / 30 days (~333 MB/day)
  TOTAL_STORAGE_GB: 1
};

const STORAGE_KEY_PREFIX = 'telumak_firestore_quota_';
const BLAZE_PLAN_KEY = 'telumak_firebase_blaze_plan';

export function isBlazePlanActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(BLAZE_PLAN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setBlazePlanActive(active: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (active) {
      localStorage.setItem(BLAZE_PLAN_KEY, 'true');
      isQuotaExhaustedGlobal = false;
    } else {
      localStorage.removeItem(BLAZE_PLAN_KEY);
    }
    notifyListeners();
  } catch (e) {
    console.warn("Erro ao salvar plano Blaze:", e);
  }
}

export function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Session metrics for this specific client tab
let memorySessionStats = {
  reads: 0,
  writes: 0,
  deletes: 0
};

// Global synced stats from Firestore document (/system_telemetry_daily/{today})
let globalFirestoreStats: DayUsageStats | null = null;
let isQuotaExhaustedGlobal = false;

// Pending local deltas waiting to be flushed to Firestore via atomic increment()
let pendingDeltas = {
  reads: 0,
  writes: 0,
  deletes: 0,
  collections: {} as { [key: string]: { reads: number; writes: number; deletes: number } }
};

let flushTimer: any = null;
const listeners = new Set<(stats: DayUsageStats) => void>();

// Average doc payload size estimate (~850 bytes)
const BYTES_PER_DOC_OPERATION = 850;

function getDefaultCollections(): { [key: string]: CollectionUsage } {
  return {
    'discord_notebook_messages': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
    'discord_channels': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
    'characters': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
    'messages': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
    'statuses': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
    'battlemap': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
    'users': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 },
    'config': { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 }
  };
}

export function setQuotaExhaustedState(exhausted: boolean) {
  if (isBlazePlanActive()) {
    isQuotaExhaustedGlobal = false;
  } else {
    isQuotaExhaustedGlobal = exhausted;
  }
  notifyListeners();
}

export function getTodayStats(): DayUsageStats {
  const today = getTodayString();
  const key = `${STORAGE_KEY_PREFIX}${today}`;

  let localSaved: any = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) localSaved = JSON.parse(raw);
  } catch (e) {
    console.warn("Erro ao ler estatísticas do localStorage:", e);
  }

  // If we have live global stats from Firestore, merge local un-flushed deltas on top
  if (globalFirestoreStats && globalFirestoreStats.date === today) {
    const mergedCollections = { ...getDefaultCollections(), ...(globalFirestoreStats.collections || {}) };
    
    // Add pending unflushed deltas so user sees immediate local feedback
    Object.keys(pendingDeltas.collections).forEach(col => {
      if (!mergedCollections[col]) {
        mergedCollections[col] = { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 };
      }
      mergedCollections[col].reads += pendingDeltas.collections[col].reads;
      mergedCollections[col].writes += pendingDeltas.collections[col].writes;
      mergedCollections[col].deletes += pendingDeltas.collections[col].deletes;
      mergedCollections[col].estimatedBytes += (pendingDeltas.collections[col].reads + pendingDeltas.collections[col].writes) * BYTES_PER_DOC_OPERATION;
    });

    return {
      date: today,
      isGlobalSynced: true,
      totalReads: (globalFirestoreStats.totalReads || 0) + pendingDeltas.reads,
      totalWrites: (globalFirestoreStats.totalWrites || 0) + pendingDeltas.writes,
      totalDeletes: (globalFirestoreStats.totalDeletes || 0) + pendingDeltas.deletes,
      estimatedBytesTotal: (globalFirestoreStats.estimatedBytesTotal || 0) + (pendingDeltas.reads + pendingDeltas.writes) * BYTES_PER_DOC_OPERATION,
      sessionReads: memorySessionStats.reads,
      sessionWrites: memorySessionStats.writes,
      sessionDeletes: memorySessionStats.deletes,
      lastUpdated: globalFirestoreStats.lastUpdated || new Date().toISOString(),
      isQuotaExhausted: isQuotaExhaustedGlobal,
      collections: mergedCollections
    };
  }

  // Fallback to local storage
  const base: DayUsageStats = {
    date: today,
    isGlobalSynced: false,
    totalReads: localSaved?.totalReads || 0,
    totalWrites: localSaved?.totalWrites || 0,
    totalDeletes: localSaved?.totalDeletes || 0,
    estimatedBytesTotal: localSaved?.estimatedBytesTotal || 0,
    sessionReads: memorySessionStats.reads,
    sessionWrites: memorySessionStats.writes,
    sessionDeletes: memorySessionStats.deletes,
    isQuotaExhausted: isQuotaExhaustedGlobal,
    collections: localSaved?.collections || getDefaultCollections()
  };

  return base;
}

function notifyListeners() {
  const current = getTodayStats();
  listeners.forEach(fn => fn(current));
}

function saveLocalStats(stats: DayUsageStats) {
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
  } catch (e) {}

  notifyListeners();
}

// Flush pending accumulated deltas to the central Firestore doc using atomic increment()
export async function flushTelemetryToFirestore(): Promise<void> {
  const today = getTodayString();
  if (pendingDeltas.reads === 0 && pendingDeltas.writes === 0 && pendingDeltas.deletes === 0) {
    return;
  }

  const toFlush = {
    reads: pendingDeltas.reads,
    writes: pendingDeltas.writes,
    deletes: pendingDeltas.deletes,
    collections: { ...pendingDeltas.collections }
  };

  // Reset deltas
  pendingDeltas = {
    reads: 0,
    writes: 0,
    deletes: 0,
    collections: {}
  };

  try {
    const docRef = doc(db, 'system_telemetry_daily', today);
    const updatePayload: any = {
      date: today,
      totalReads: increment(toFlush.reads),
      totalWrites: increment(toFlush.writes),
      totalDeletes: increment(toFlush.deletes),
      estimatedBytesTotal: increment((toFlush.reads + toFlush.writes) * BYTES_PER_DOC_OPERATION + toFlush.deletes * 200),
      lastUpdated: new Date().toISOString(),
      serverTimestamp: serverTimestamp()
    };

    Object.entries(toFlush.collections).forEach(([col, val]) => {
      if (val.reads > 0) updatePayload[`collections.${col}.reads`] = increment(val.reads);
      if (val.writes > 0) updatePayload[`collections.${col}.writes`] = increment(val.writes);
      if (val.deletes > 0) updatePayload[`collections.${col}.deletes`] = increment(val.deletes);
      const estBytes = (val.reads + val.writes) * BYTES_PER_DOC_OPERATION + val.deletes * 200;
      if (estBytes > 0) updatePayload[`collections.${col}.estimatedBytes`] = increment(estBytes);
    });

    await setDoc(docRef, updatePayload, { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted') {
      isQuotaExhaustedGlobal = true;
    }
    // Restore un-flushed deltas if network failed
    pendingDeltas.reads += toFlush.reads;
    pendingDeltas.writes += toFlush.writes;
    pendingDeltas.deletes += toFlush.deletes;
    Object.entries(toFlush.collections).forEach(([col, val]) => {
      if (!pendingDeltas.collections[col]) {
        pendingDeltas.collections[col] = { reads: 0, writes: 0, deletes: 0 };
      }
      pendingDeltas.collections[col].reads += val.reads;
      pendingDeltas.collections[col].writes += val.writes;
      pendingDeltas.collections[col].deletes += val.deletes;
    });
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushTelemetryToFirestore();
  }, 20000); // Batches every 20 seconds
}

export function trackRead(collectionName: string, count: number = 1) {
  if (count <= 0) return;
  memorySessionStats.reads += count;
  pendingDeltas.reads += count;

  if (!pendingDeltas.collections[collectionName]) {
    pendingDeltas.collections[collectionName] = { reads: 0, writes: 0, deletes: 0 };
  }
  pendingDeltas.collections[collectionName].reads += count;

  const current = getTodayStats();
  current.totalReads += count;
  current.estimatedBytesTotal += count * BYTES_PER_DOC_OPERATION;
  if (!current.collections[collectionName]) {
    current.collections[collectionName] = { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 };
  }
  current.collections[collectionName].reads += count;
  current.collections[collectionName].estimatedBytes += count * BYTES_PER_DOC_OPERATION;

  saveLocalStats(current);
  scheduleFlush();
}

export function trackWrite(collectionName: string, count: number = 1) {
  if (count <= 0) return;
  memorySessionStats.writes += count;
  pendingDeltas.writes += count;

  if (!pendingDeltas.collections[collectionName]) {
    pendingDeltas.collections[collectionName] = { reads: 0, writes: 0, deletes: 0 };
  }
  pendingDeltas.collections[collectionName].writes += count;

  const current = getTodayStats();
  current.totalWrites += count;
  current.estimatedBytesTotal += count * BYTES_PER_DOC_OPERATION;
  if (!current.collections[collectionName]) {
    current.collections[collectionName] = { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 };
  }
  current.collections[collectionName].writes += count;
  current.collections[collectionName].estimatedBytes += count * BYTES_PER_DOC_OPERATION;

  saveLocalStats(current);
  scheduleFlush();
}

export function trackDelete(collectionName: string, count: number = 1) {
  if (count <= 0) return;
  memorySessionStats.deletes += count;
  pendingDeltas.deletes += count;

  if (!pendingDeltas.collections[collectionName]) {
    pendingDeltas.collections[collectionName] = { reads: 0, writes: 0, deletes: 0 };
  }
  pendingDeltas.collections[collectionName].deletes += count;

  const current = getTodayStats();
  current.totalDeletes += count;
  current.estimatedBytesTotal += count * 200;
  if (!current.collections[collectionName]) {
    current.collections[collectionName] = { reads: 0, writes: 0, deletes: 0, estimatedBytes: 0 };
  }
  current.collections[collectionName].deletes += count;
  current.collections[collectionName].estimatedBytes += count * 200;

  saveLocalStats(current);
  scheduleFlush();
}

export function resetTodayUsageStats(): DayUsageStats {
  const today = getTodayString();
  const key = `${STORAGE_KEY_PREFIX}${today}`;
  try {
    localStorage.removeItem(key);
  } catch (e) {}

  memorySessionStats = { reads: 0, writes: 0, deletes: 0 };
  pendingDeltas = { reads: 0, writes: 0, deletes: 0, collections: {} };
  const fresh = getTodayStats();
  notifyListeners();
  return fresh;
}

// Initializes Global Sync with the daily Firestore document
let globalUnsubscribe: (() => void) | null = null;

export function initGlobalTelemetrySync(): () => void {
  if (globalUnsubscribe) return globalUnsubscribe;

  const today = getTodayString();
  const docRef = doc(db, 'system_telemetry_daily', today);

  try {
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        globalFirestoreStats = {
          date: today,
          isGlobalSynced: true,
          totalReads: data.totalReads || 0,
          totalWrites: data.totalWrites || 0,
          totalDeletes: data.totalDeletes || 0,
          estimatedBytesTotal: data.estimatedBytesTotal || 0,
          sessionReads: memorySessionStats.reads,
          sessionWrites: memorySessionStats.writes,
          sessionDeletes: memorySessionStats.deletes,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
          isQuotaExhausted: isQuotaExhaustedGlobal,
          collections: {
            ...getDefaultCollections(),
            ...(data.collections || {})
          }
        };
        isQuotaExhaustedGlobal = false;
        notifyListeners();
      }
    }, (err) => {
      if (err?.code === 'resource-exhausted') {
        isQuotaExhaustedGlobal = true;
        notifyListeners();
      }
      console.warn("Global Telemetry Snapshot sync status:", err?.message || err);
    });

    globalUnsubscribe = () => {
      unsub();
      globalUnsubscribe = null;
    };
  } catch (e) {
    console.warn("Falha ao inicializar Global Telemetry Listener:", e);
  }

  // Flush on page exit/refresh
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      flushTelemetryToFirestore();
    });
  }

  return globalUnsubscribe || (() => {});
}

export function subscribeToUsageStats(callback: (stats: DayUsageStats) => void) {
  listeners.add(callback);
  callback(getTodayStats());
  return () => {
    listeners.delete(callback);
  };
}
