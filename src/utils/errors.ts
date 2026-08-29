import { auth } from '../firebase';
import { logTelemetry } from './auditTelemetry';
import { setQuotaExhaustedState } from './firebaseUsageTracker';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let lastQuotaErrorTime = 0;

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || 'unknown';
  const isQuota = errCode === 'resource-exhausted' || errMessage.includes('Quota exceeded') || errMessage.includes('resource-exhausted');
  
  if (isQuota) {
    setQuotaExhaustedState(true);
    // Throttle quota errors in the log window so it doesn't flood 100 times in 1 second
    const now = Date.now();
    if (now - lastQuotaErrorTime < 10000) {
      return;
    }
    lastQuotaErrorTime = now;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  // Automatically broadcast to real-time Telemetry Monitor
  logTelemetry(
    isQuota ? 'warn' : 'error',
    isQuota 
      ? `🚨 Cota Diária Firebase Atingida (50.000 leituras/dia) - Reset às 04:00 BRT`
      : `Erro Firestore (${operationType.toUpperCase()} /${path || ''}): ${errCode}`,
    errInfo,
    'FirestoreService',
    error instanceof Error ? error.stack : undefined
  );

  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

