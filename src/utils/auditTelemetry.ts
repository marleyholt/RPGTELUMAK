// Core Audit Trail & Telemetry Engine for Telumak RPG
// Manages two distinct tracks:
// 1. Audit Trail: All user/system actions, persisted and searchable.
// 2. Telemetry & Error Monitor: Real-time errors, Firestore quota, network diagnostics, and unhandled exceptions.

export type AuditCategory = 'PERSONAGEM' | 'COMBATE' | 'DADOS' | 'DISCORD' | 'MESTRE' | 'SISTEMA' | 'AUTENTICACAO';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  time: string;
  category: AuditCategory;
  action: string;
  user: string;
  userRole?: string;
  details?: any;
}

export type TelemetryType = 'error' | 'warn' | 'info' | 'network' | 'success';

export interface TelemetryLogEntry {
  id: string;
  timestamp: number;
  time: string;
  type: TelemetryType;
  title: string;
  source?: string;
  details?: any;
  stack?: string;
}

const AUDIT_STORAGE_KEY = 'telumak_audit_trail_v1';
const TELEMETRY_STORAGE_KEY = 'telumak_telemetry_logs_v1';
const MAX_AUDIT_LOGS = 500;
const MAX_TELEMETRY_LOGS = 200;

// Listeners
type AuditListener = (logs: AuditLogEntry[]) => void;
type TelemetryListener = (logs: TelemetryLogEntry[]) => void;

const auditListeners = new Set<AuditListener>();
const telemetryListeners = new Set<TelemetryListener>();

// Initial in-memory state loaded from storage
let memoryAuditLogs: AuditLogEntry[] = [];
let memoryTelemetryLogs: TelemetryLogEntry[] = [];

function loadFromStorage() {
  try {
    const rawAudit = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (rawAudit) {
      memoryAuditLogs = JSON.parse(rawAudit);
    }
  } catch (e) {
    console.warn("Falha ao ler auditoria local:", e);
  }

  try {
    const rawTelemetry = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (rawTelemetry) {
      memoryTelemetryLogs = JSON.parse(rawTelemetry);
    }
  } catch (e) {
    console.warn("Falha ao ler telemetria local:", e);
  }

  if (memoryAuditLogs.length === 0) {
    const initial: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString(),
      category: 'SISTEMA',
      action: 'Grimório RPG Telumak Inicializado',
      user: 'Sistema',
      details: 'Sessão aberta e subsistemas prontos.'
    };
    memoryAuditLogs = [initial];
  }

  if (memoryTelemetryLogs.length === 0) {
    const initial: TelemetryLogEntry = {
      id: `telem-${Date.now()}`,
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString(),
      type: 'info',
      title: 'Subsistema de Telemetria Ativo',
      source: 'AppInit',
      details: 'Monitorando erros, chamadas Firestore e requisições de API.'
    };
    memoryTelemetryLogs = [initial];
  }
}

loadFromStorage();

function saveAuditLogs() {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(memoryAuditLogs.slice(0, MAX_AUDIT_LOGS)));
  } catch (e) {
    console.warn("Falha ao salvar auditoria:", e);
  }
  auditListeners.forEach(fn => fn([...memoryAuditLogs]));
}

function saveTelemetryLogs() {
  try {
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(memoryTelemetryLogs.slice(0, MAX_TELEMETRY_LOGS)));
  } catch (e) {
    console.warn("Falha ao salvar telemetria:", e);
  }
  telemetryListeners.forEach(fn => fn([...memoryTelemetryLogs]));
}

// -------------------------------------------------------------
// PUBLIC AUDIT LOGGING API
// -------------------------------------------------------------
export function logAudit(
  category: AuditCategory,
  action: string,
  details?: any,
  user?: { displayName?: string | null; email?: string | null; role?: string | null } | string
) {
  let userName = 'Usuário';
  let userRole: string | undefined = undefined;

  if (typeof user === 'string') {
    userName = user;
  } else if (user) {
    userName = user.displayName || user.email || 'Usuário';
    userRole = user.role || undefined;
  }

  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    time: new Date().toLocaleTimeString(),
    category,
    action,
    user: userName,
    userRole,
    details
  };

  memoryAuditLogs = [entry, ...memoryAuditLogs.slice(0, MAX_AUDIT_LOGS - 1)];
  saveAuditLogs();
}

export function getAuditLogs(): AuditLogEntry[] {
  return [...memoryAuditLogs];
}

export function clearAuditLogs() {
  memoryAuditLogs = [];
  saveAuditLogs();
}

export function subscribeToAuditLogs(fn: AuditListener): () => void {
  auditListeners.add(fn);
  fn([...memoryAuditLogs]);
  return () => {
    auditListeners.delete(fn);
  };
}

// -------------------------------------------------------------
// PUBLIC TELEMETRY & ERROR MONITOR API
// -------------------------------------------------------------
export function logTelemetry(
  type: TelemetryType,
  title: string,
  details?: any,
  source?: string,
  stack?: string
) {
  const entry: TelemetryLogEntry = {
    id: `telem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    time: new Date().toLocaleTimeString(),
    type,
    title,
    source,
    details,
    stack
  };

  memoryTelemetryLogs = [entry, ...memoryTelemetryLogs.slice(0, MAX_TELEMETRY_LOGS - 1)];
  saveTelemetryLogs();
}

export function getTelemetryLogs(): TelemetryLogEntry[] {
  return [...memoryTelemetryLogs];
}

export function clearTelemetryLogs() {
  memoryTelemetryLogs = [];
  saveTelemetryLogs();
}

export function subscribeToTelemetryLogs(fn: TelemetryListener): () => void {
  telemetryListeners.add(fn);
  fn([...memoryTelemetryLogs]);
  return () => {
    telemetryListeners.delete(fn);
  };
}
