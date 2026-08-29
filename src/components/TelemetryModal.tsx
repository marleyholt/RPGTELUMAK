import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Copy, Check, Terminal, CheckCircle2, AlertTriangle, AlertOctagon, Info, 
  Trash2, RefreshCw, Cpu, Database, User, Shield, Radio, Activity,
  BarChart3, ArrowUpRight, ArrowDownRight, HardDrive, Wifi, Sparkles, Zap, ShieldCheck,
  ChevronDown, ChevronUp, Search, Bug, Network, ShieldAlert, Globe, Clock, Users
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Character } from '../types';
import { 
  DayUsageStats, 
  CollectionUsage,
  FIREBASE_SPARK_LIMITS, 
  getTodayStats, 
  subscribeToUsageStats, 
  resetTodayUsageStats,
  trackRead,
  trackWrite,
  flushTelemetryToFirestore,
  initGlobalTelemetrySync
} from '../utils/firebaseUsageTracker';
import { 
  TelemetryLogEntry, 
  TelemetryType, 
  getTelemetryLogs, 
  clearTelemetryLogs, 
  subscribeToTelemetryLogs, 
  logTelemetry 
} from '../utils/auditTelemetry';

interface TelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: UserProfile | null;
  characters: Character[];
  currentTab: string;
}

export function TelemetryModal({
  isOpen,
  onClose,
  currentUserProfile,
  characters,
  currentTab
}: TelemetryModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ERRORS' | 'QUOTA'>('ERRORS');
  const [logs, setLogs] = useState<TelemetryLogEntry[]>([]);
  const [usageStats, setUsageStats] = useState<DayUsageStats>(getTodayStats());
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubTelemetry = subscribeToTelemetryLogs((newLogs) => {
      setLogs(newLogs);
    });
    const unsubUsage = subscribeToUsageStats((stats) => {
      setUsageStats(stats);
    });
    const unsubGlobalSync = initGlobalTelemetrySync();

    return () => {
      unsubTelemetry();
      unsubUsage();
      unsubGlobalSync();
    };
  }, []);

  // When modal is opened, trigger an immediate flush to ensure cloud stats are fresh
  useEffect(() => {
    if (isOpen) {
      flushTelemetryToFirestore();
    }
  }, [isOpen]);

  const isGM = currentUserProfile?.role === 'GM';
  const errorCount = logs.filter(l => l.type === 'error').length;
  const warnCount = logs.filter(l => l.type === 'warn').length;

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (severityFilter === 'ERROR' && l.type !== 'error') return false;
      if (severityFilter === 'WARN' && l.type !== 'warn') return false;
      if (severityFilter === 'INFO' && l.type !== 'info' && l.type !== 'network') return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchTitle = l.title.toLowerCase().includes(term);
      const matchSource = (l.source || '').toLowerCase().includes(term);
      const matchDetails = l.details ? JSON.stringify(l.details).toLowerCase().includes(term) : false;
      const matchStack = (l.stack || '').toLowerCase().includes(term);

      return matchTitle || matchSource || matchDetails || matchStack;
    });
  }, [logs, severityFilter, searchTerm]);

  if (!isOpen) return null;

  // Percentage calculations against Firebase Free Tier (Spark) limits
  const readsPercent = Math.min(100, Math.round((usageStats.totalReads / FIREBASE_SPARK_LIMITS.DAILY_READS) * 100 * 10) / 10);
  const writesPercent = Math.min(100, Math.round((usageStats.totalWrites / FIREBASE_SPARK_LIMITS.DAILY_WRITES) * 100 * 10) / 10);
  const deletesPercent = Math.min(100, Math.round((usageStats.totalDeletes / FIREBASE_SPARK_LIMITS.DAILY_DELETES) * 100 * 10) / 10);

  // Bandwidth calculation (KB / MB)
  const bandwidthKB = Math.round(usageStats.estimatedBytesTotal / 1024);
  const bandwidthMB = Math.round((bandwidthKB / 1024) * 100) / 100;
  const bandwidthPercent = Math.min(100, Math.round((bandwidthMB / FIREBASE_SPARK_LIMITS.DAILY_ESTIMATED_BANDWIDTH_MB) * 100 * 10) / 10);

  const getStatusColor = (percent: number) => {
    if (usageStats.isQuotaExhausted || percent >= 85) return 'text-rose-400 bg-rose-500/20 border-rose-500/40';
    if (percent >= 60) return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
  };

  const getBarColor = (percent: number) => {
    if (usageStats.isQuotaExhausted || percent >= 85) return 'bg-rose-500';
    if (percent >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await flushTelemetryToFirestore();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const handleTestDatabase = async () => {
    setIsTesting(true);
    const start = performance.now();
    logTelemetry('info', 'Iniciando teste de ping com o banco Firestore...', { start: new Date().toISOString() }, 'DiagnosticPing');
    try {
      const pingDoc = await addDoc(collection(db, 'system_diagnostic_pings'), {
        testerEmail: currentUserProfile?.email || 'anon',
        testerRole: currentUserProfile?.role || 'PLAYER',
        timestamp: serverTimestamp(),
        localTime: new Date().toISOString()
      });
      const durationMs = Math.round(performance.now() - start);
      trackWrite('system_diagnostic_pings', 1);
      trackRead('system_diagnostic_pings', 1);

      logTelemetry('info', `Ping Firestore Respondido (${durationMs}ms)`, {
        pingDocId: pingDoc.id,
        status: 'ONLINE',
        latencia: `${durationMs}ms`
      }, 'DiagnosticPing');
    } catch (err: any) {
      logTelemetry('error', `Falha no teste de conexão Firestore: ${err?.message || err}`, {
        code: err?.code,
        details: err?.message
      }, 'DiagnosticPing');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyReport = () => {
    const report = [
      `====================================================`,
      `       RELATÓRIO DE TELEMETRIA & ERROS TELUMAK      `,
      `====================================================`,
      `Data/Hora: ${new Date().toLocaleString()} (${new Date().toISOString()})`,
      `Usuário: ${currentUserProfile?.displayName || 'N/A'} (${currentUserProfile?.email || 'N/A'}) - ${isGM ? 'Mestre (GM)' : 'Jogador'}`,
      `Aba Atual: ${currentTab.toUpperCase()}`,
      `Total de Fichas: ${characters.length} (${characters.filter(c => c.ativo_na_mesa).length} ativas na mesa)`,
      `Modo de Telemetria: ${usageStats.isGlobalSynced ? 'SINCRONIZADO GLOBAL (Todos os Usuários)' : 'LOCAL (Cache/Offline)'}`,
      `\n--- MÉTRICAS DE TRÁFEGO & COTA FIREBASE (HOJE: ${usageStats.date}) ---`,
      `• Leituras Totais (Global): ${usageStats.totalReads.toLocaleString()} / ${FIREBASE_SPARK_LIMITS.DAILY_READS.toLocaleString()} (${readsPercent}% da cota)`,
      `• Gravações Totais (Global): ${usageStats.totalWrites.toLocaleString()} / ${FIREBASE_SPARK_LIMITS.DAILY_WRITES.toLocaleString()} (${writesPercent}% da cota)`,
      `• Exclusões Totais (Global): ${usageStats.totalDeletes.toLocaleString()} / ${FIREBASE_SPARK_LIMITS.DAILY_DELETES.toLocaleString()} (${deletesPercent}% da cota)`,
      `• Tráfego Estimado: ${bandwidthKB} KB (~${bandwidthMB} MB)`,
      `• Sua Sessão Atual: ${usageStats.sessionReads.toLocaleString()} leituras, ${usageStats.sessionWrites.toLocaleString()} gravações`,
      `\n--- DETALHES POR COLEÇÃO (GLOBAL) ---`,
      ...(Object.entries(usageStats.collections) as [string, CollectionUsage][]).map(([col, data]) => 
        `  - ${col}: ${data.reads} leituras, ${data.writes} gravações, ${data.deletes} exclusões (~${Math.round(data.estimatedBytes / 1024)} KB)`
      ),
      `\n--- HISTÓRICO DE ERROS & TELEMETRIA (${logs.length} eventos: ${errorCount} erros, ${warnCount} avisos) ---`,
      ...logs.map(l => {
        let detailsStr = '';
        if (l.details) {
          detailsStr = `\n  Detalhes: ${typeof l.details === 'object' ? JSON.stringify(l.details, null, 2) : l.details}`;
        }
        if (l.stack) {
          detailsStr += `\n  Stack: ${l.stack}`;
        }
        return `[${l.time}] [${l.type.toUpperCase()}] ${l.source ? `[${l.source}] ` : ''}${l.title}${detailsStr}`;
      }),
      `\n====================================================`
    ].join('\n');

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 animate-fadeIn">
      <div className="bg-[#0b0c0e] border border-rose-500/30 w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden font-sans text-white">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141619] border-b border-rose-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Telemetria & Monitor de Cota Global
                </h2>
                {usageStats.isGlobalSynced ? (
                  <span className="text-[9px] bg-sky-500/20 text-sky-400 border border-blue-500/40 px-2 py-0.5 font-mono font-black uppercase flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Sincronizado Global (5+ Usuários)
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 font-mono font-black uppercase flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Cache Local
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50">
                Consumo real acumulado de todos os jogadores na nuvem e diagnóstico de erros
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition"
            title="Fechar Janela"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 bg-[#08090a] border-b border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('ERRORS')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
              activeSubTab === 'ERRORS'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bug className="h-4 w-4" />
            <span>Erros & Exceções ({logs.length})</span>
            {errorCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded text-[9px] font-bold">
                {errorCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('QUOTA')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
              activeSubTab === 'QUOTA'
                ? 'border-blue-500 text-sky-400 bg-blue-500/10'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Cota & Tráfego Global Firebase</span>
            {usageStats.isQuotaExhausted && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded text-[9px] font-bold uppercase animate-pulse">
                Cota Atingida
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-5 space-y-4">
          
          {activeSubTab === 'ERRORS' && (
            <div className="space-y-3.5">
              
              {/* Actions & Filters Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-[#121417] p-3 border border-white/10">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  
                  {/* Severity buttons */}
                  <div className="flex items-center border border-white/10 bg-black/40">
                    <button
                      type="button"
                      onClick={() => setSeverityFilter('ALL')}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                        severityFilter === 'ALL' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
                      }`}
                    >
                      Todos ({logs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverityFilter('ERROR')}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                        severityFilter === 'ERROR' ? 'bg-rose-500 text-white' : 'text-rose-400/60 hover:text-rose-300'
                      }`}
                    >
                      Erros ({errorCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverityFilter('WARN')}
                      className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                        severityFilter === 'WARN' ? 'bg-amber-500 text-black font-bold' : 'text-amber-400/60 hover:text-amber-300'
                      }`}
                    >
                      Avisos ({warnCount})
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-48">
                    <Search className="h-3 w-3 text-white/40 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filtrar erros..."
                      className="w-full bg-black/60 border border-white/10 pl-7 pr-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={handleTestDatabase}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition shadow"
                    title="Testar comunicação com o Firebase Firestore"
                  >
                    <Cpu className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testando...' : 'Testar Ping'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-2.5 py-1.5 bg-[#1e2124] hover:bg-[#25282c] text-sky-300 border border-blue-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition shadow"
                    title="Copiar relatório completo de diagnóstico para suporte ou depuração"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Diagnóstico'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja limpar todos os registros de telemetria desta sessão?')) {
                        clearTelemetryLogs();
                      }
                    }}
                    className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-white/5 border border-transparent hover:border-rose-500/20 transition"
                    title="Limpar Erros"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Error list view */}
              <div className="p-3 bg-[#050607] font-mono text-xs space-y-2 border border-white/10 select-text max-h-[52vh] overflow-y-auto custom-scroll">
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center text-white/30 space-y-2">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400/40" />
                    <p className="italic">Nenhum evento correspondente encontrado na telemetria.</p>
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    let colorClass = 'text-white/80 border-white/5 bg-white/[0.02]';
                    let IconComp = Info;
                    let badge = 'INFO';
                    let badgeBg = 'bg-blue-500/20 text-sky-300 border-blue-500/30';

                    if (log.type === 'error') {
                      colorClass = 'text-rose-200 border-rose-500/30 bg-rose-950/20';
                      IconComp = AlertOctagon;
                      badge = 'ERRO';
                      badgeBg = 'bg-rose-500/30 text-rose-300 border-rose-500/40';
                    } else if (log.type === 'warn') {
                      colorClass = 'text-amber-200 border-amber-500/30 bg-amber-950/20';
                      IconComp = AlertTriangle;
                      badge = 'AVISO';
                      badgeBg = 'bg-amber-500/30 text-amber-300 border-amber-500/40';
                    } else if (log.type === 'network') {
                      colorClass = 'text-cyan-200 border-cyan-500/30 bg-cyan-950/20';
                      IconComp = Network;
                      badge = 'REDE';
                      badgeBg = 'bg-cyan-500/30 text-cyan-300 border-cyan-500/40';
                    }

                    const isExpanded = expandedLogId === log.id;
                    const hasExtra = log.details || log.stack;

                    return (
                      <div
                        key={log.id}
                        className={`p-3 border ${colorClass} transition leading-relaxed`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <IconComp className="h-4 w-4 shrink-0 mt-0.5" />
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] px-1.5 py-0.5 border font-mono font-black uppercase ${badgeBg}`}>
                                  {badge}
                                </span>
                                {log.source && (
                                  <span className="text-[10px] text-white/50 bg-black/40 px-1 border border-white/5 font-bold">
                                    [{log.source}]
                                  </span>
                                )}
                                <span className="font-bold text-white break-all">{log.title}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-white/40 font-mono">
                              {log.time}
                            </span>
                            {hasExtra && (
                              <button
                                type="button"
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="p-1 text-white/40 hover:text-rose-400 transition"
                                title="Expandir detalhes e rastreamento"
                              >
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable extra info */}
                        {isExpanded && hasExtra && (
                          <div className="mt-2.5 pt-2 border-t border-white/10 space-y-2">
                            {log.details && (
                              <div>
                                <span className="text-[9px] uppercase font-black text-white/40 tracking-wider">Payload / Dados do Erro:</span>
                                <pre className="mt-1 p-2 bg-black/80 border border-white/5 text-[11px] text-white/70 overflow-x-auto whitespace-pre-wrap font-mono">
                                  {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                                </pre>
                              </div>
                            )}

                            {log.stack && (
                              <div>
                                <span className="text-[9px] uppercase font-black text-rose-400/60 tracking-wider">Stack Trace:</span>
                                <pre className="mt-1 p-2 bg-rose-950/30 border border-rose-500/20 text-[10px] text-rose-300/80 overflow-x-auto whitespace-pre-wrap font-mono">
                                  {log.stack}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {activeSubTab === 'QUOTA' && (
            <>
              {/* Quota Exhausted Alert Banner if triggered */}
              {usageStats.isQuotaExhausted && (
                <div className="p-4 bg-rose-950/40 border-2 border-rose-500 flex items-start gap-3 shadow-lg">
                  <AlertOctagon className="h-6 w-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase text-rose-300 tracking-wider">
                      🚨 COTA DIÁRIA DO FIREBASE SPARK (50.000 LEITURAS) ATINGIDA HOJE
                    </h4>
                    <p className="text-xs text-rose-200/90 leading-relaxed">
                      O projeto atingiu o limite gratuito de 50k leituras diárias no servidor do Google Cloud.
                      O Google resetará os contadores <strong>automaticamente todos os dias às 04:00 (Horário de Brasília)</strong>.
                      Até lá, os dados continuam salvos no navegador via cache offline.
                    </p>
                  </div>
                </div>
              )}

              {/* Top Banner Status */}
              <div className="p-4 bg-[#121417] border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${usageStats.isQuotaExhausted ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'} border flex items-center justify-center shrink-0`}>
                    {usageStats.isQuotaExhausted ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-white flex items-center gap-2">
                      <span>{usageStats.isQuotaExhausted ? 'Status da Cota: Limite Diário Atingido' : 'Status da Cota Diária: Saudável & Otimizada'}</span>
                      <span className="text-[10px] text-sky-400 bg-blue-500/10 px-2 py-0.5 border border-blue-500/30">
                        {usageStats.isGlobalSynced ? 'Mesa Global (5+ Jogadores)' : 'Offline / Local'}
                      </span>
                    </h3>
                    <p className="text-xs text-white/60">
                      Plano Spark Gratuito: 50.000 leituras e 20.000 gravações por dia somando todos os participantes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleManualSync}
                    className="px-2.5 py-1 text-[11px] font-bold text-sky-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition flex items-center gap-1"
                    title="Forçar envio e sincronização das métricas pendentes para a nuvem"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetTodayUsageStats();
                      logTelemetry('info', 'Contadores de uso local foram reiniciados.');
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-white/40 hover:text-white border border-white/10 transition"
                    title="Zerar métricas salvas localmente hoje"
                  >
                    Zerar Cache
                  </button>
                </div>
              </div>

              {/* 3 Main Quota Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                
                {/* 1. Daily Reads */}
                <div className="p-4 bg-[#121417] border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                      <ArrowDownRight className="h-3.5 w-3.5 text-sky-400" /> Leituras Globais
                    </span>
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 border ${getStatusColor(readsPercent)}`}>
                      {readsPercent}%
                    </span>
                  </div>
                  
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xl font-black font-mono text-white">
                      {usageStats.totalReads.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono text-white/40">
                      limite {FIREBASE_SPARK_LIMITS.DAILY_READS.toLocaleString()}/dia
                    </span>
                  </div>

                  <div className="w-full bg-black/60 h-2 border border-white/5 overflow-hidden mb-2">
                    <div 
                      className={`h-full ${getBarColor(readsPercent)} transition-all duration-300`} 
                      style={{ width: `${Math.max(1, readsPercent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span className="text-sky-400">Sua sessão: {usageStats.sessionReads.toLocaleString()}</span>
                    <span>Restante: {Math.max(0, FIREBASE_SPARK_LIMITS.DAILY_READS - usageStats.totalReads).toLocaleString()}</span>
                  </div>
                </div>

                {/* 2. Daily Writes */}
                <div className="p-4 bg-[#121417] border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /> Gravações Globais
                    </span>
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 border ${getStatusColor(writesPercent)}`}>
                      {writesPercent}%
                    </span>
                  </div>
                  
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xl font-black font-mono text-white">
                      {usageStats.totalWrites.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono text-white/40">
                      limite {FIREBASE_SPARK_LIMITS.DAILY_WRITES.toLocaleString()}/dia
                    </span>
                  </div>

                  <div className="w-full bg-black/60 h-2 border border-white/5 overflow-hidden mb-2">
                    <div 
                      className={`h-full ${getBarColor(writesPercent)} transition-all duration-300`} 
                      style={{ width: `${Math.max(1, writesPercent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span className="text-emerald-400">Sua sessão: {usageStats.sessionWrites.toLocaleString()}</span>
                    <span>Restante: {Math.max(0, FIREBASE_SPARK_LIMITS.DAILY_WRITES - usageStats.totalWrites).toLocaleString()}</span>
                  </div>
                </div>

                {/* 3. Estimated Traffic */}
                <div className="p-4 bg-[#121417] border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                      <Wifi className="h-3.5 w-3.5 text-amber-400" /> Tráfego de Rede
                    </span>
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 border ${getStatusColor(bandwidthPercent)}`}>
                      {bandwidthPercent}%
                    </span>
                  </div>
                  
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xl font-black font-mono text-white">
                      {bandwidthMB} <span className="text-xs font-normal text-white/60">MB</span>
                    </span>
                    <span className="text-xs font-mono text-white/40">
                      cota ~{FIREBASE_SPARK_LIMITS.DAILY_ESTIMATED_BANDWIDTH_MB} MB/dia
                    </span>
                  </div>

                  <div className="w-full bg-black/60 h-2 border border-white/5 overflow-hidden mb-2">
                    <div 
                      className={`h-full ${getBarColor(bandwidthPercent)} transition-all duration-300`} 
                      style={{ width: `${Math.max(1, bandwidthPercent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>Total KB: {bandwidthKB.toLocaleString()} KB</span>
                    <span>10 GB/mês Free</span>
                  </div>
                </div>

              </div>

              {/* Per-Collection Traffic Table */}
              <div className="bg-[#121417] border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-sky-400" />
                    Consumo Global da Mesa por Coleção (Hoje)
                  </h4>
                  <span className="text-[10px] text-white/40 font-mono flex items-center gap-1">
                    <Users className="h-3 w-3 text-sky-400" /> Somatório de todos os 5+ jogadores
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase">
                        <th className="pb-2 font-bold">Coleção Firestore</th>
                        <th className="pb-2 font-bold text-right">Leituras Globais</th>
                        <th className="pb-2 font-bold text-right">Gravações</th>
                        <th className="pb-2 font-bold text-right">Exclusões</th>
                        <th className="pb-2 font-bold text-right">Tráfego Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(Object.entries(usageStats.collections) as [string, CollectionUsage][]).map(([colName, colData]) => {
                        const colKb = Math.round(colData.estimatedBytes / 1024);
                        return (
                          <tr key={colName} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 font-bold text-sky-300 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-blue-500 inline-block"></span>
                              /{colName}
                            </td>
                            <td className="py-2.5 text-right text-white">
                              {colData.reads.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-emerald-400">
                              {colData.writes.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-rose-400">
                              {colData.deletes.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-white/60">
                              {colKb > 0 ? `${colKb} KB` : '< 1 KB'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#141619] border-t border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <div className="flex items-center gap-2">
            <span>Cota Diária Gratuita: <strong>50k Leituras</strong> e <strong>20k Gravações</strong> (Reset diário às <strong>04:00 BRT</strong>).</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-[10px] tracking-wider transition"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
}
